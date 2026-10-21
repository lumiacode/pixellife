const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const Order = require("../models/Order");
const DiscountCode = require("../models/DiscountCode");
const { buildQuote, findPaymentMethod } = require("../services/checkoutPricing");
const Address = require("../models/Address");
const { recordBehaviorEvent } = require("../services/behaviorAnalytics");
const { trackingView } = require("../services/orderTracking");
const { hasFullName } = require("../services/profileStatus");
const { paymentDeadline, isPendingPayment, cancelPending, expireOverdue } = require("../services/orderExpiry");

const withPayload = (order) => ({ ...order, tracking: trackingView(order), paymentDeadline: isPendingPayment(order) ? paymentDeadline(order) : null });
// لغوی سفارش‌های سررسیدشده نباید جواب را خراب کند؛ جاروی دوره‌ای هم همین کار را می‌کند.
const expireQuietly = (userId) => expireOverdue({ user: userId }).catch((error) => console.error("expireOverdue error:", error.message));

// هر کاربر در هر زمان فقط یک سفارش در انتظار پرداخت دارد: با ثبت سفارش جدید،
// سفارش‌های پرداخت‌نشدهٔ قبلی لغو می‌شوند و ظرفیت کد تخفیفشان آزاد می‌شود.
async function supersedePendingOrders(userId) {
  const pending = await Order.find({ user: userId, paymentStatus: "unpaid", status: "awaiting_payment", superseded: { $ne: true } });
  for (const old of pending) {
    old.status = "cancelled";
    old.superseded = true;
    old.statusHistory.push({ status: "cancelled", note: "با ثبت سفارش جدید جایگزین شد" });
    await old.save();
    if (old.discountCode) await DiscountCode.updateOne({ code: old.discountCode, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
  }
}

router.post("/", protect, async (req, res, next) => {
  let reservedDiscount = null;
  try {
    if (!hasFullName(req.user)) return res.status(403).json({ success: false, code: "PROFILE_INCOMPLETE", message: "برای خرید ابتدا نام، نام خانوادگی و آدرس خود را در پروفایل تکمیل کنید" });
    const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (!requestedItems.length) return res.status(400).json({ success: false, message: "سبد خرید خالی است" });
    const address = await Address.findOne({ _id: req.body.addressId, user: req.user._id }).lean();
    if (!address) return res.status(400).json({ success: false, code: "PROFILE_INCOMPLETE", message: "برای ثبت سفارش یک آدرس معتبر انتخاب کنید" });
    // آدرس‌های قدیمیِ بدون کد پستی باید پیش از خرید تکمیل شوند.
    if (!/^\d{10}$/.test(String(address.postalCode || ""))) return res.status(400).json({ success: false, code: "PROFILE_INCOMPLETE", message: "کد پستی آدرس انتخاب‌شده ثبت نشده است؛ آدرس را ویرایش و کد پستی را وارد کنید" });
    const paymentMethod = findPaymentMethod(req.body.paymentMethod || "zarinpal");
    if (!paymentMethod) return res.status(400).json({ success: false, message: "روش پرداخت معتبر نیست" });
    await supersedePendingOrders(req.user._id);
    const quote = await buildQuote({ items: requestedItems, shippingMethodId: req.body.shippingMethod, discountCode: req.body.discountCode });
    if (quote.discountError) return res.status(400).json({ success: false, message: quote.discountError });
    if (quote.discount) {
      // ظرفیت کد تخفیف به‌صورت اتمیک رزرو می‌شود تا دو سفارش هم‌زمان از سقف عبور نکنند.
      reservedDiscount = await DiscountCode.findOneAndUpdate(
        { _id: quote.discount.doc._id, $or: [{ usageLimit: 0 }, { $expr: { $lt: ["$usedCount", "$usageLimit"] } }] },
        { $inc: { usedCount: 1 } },
      );
      if (!reservedDiscount) return res.status(400).json({ success: false, message: "ظرفیت استفاده از این کد تخفیف تمام شده است" });
    }
    const { pricing } = quote;
    const items = quote.lines.map(({ originalPrice, category, ...item }) => item);
    const order = await Order.create({
      user: req.user._id,
      items,
      shippingAddress: { receiverName: address.receiverName || `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || "گیرنده", receiverMobile: address.receiverMobile || req.user.mobile, province: address.province, city: address.city, fullAddress: address.fullAddress, postalCode: address.postalCode || "", ...(address.location ? { location: address.location } : {}) },
      shippingMethod: { id: quote.shippingMethod.id, title: quote.shippingMethod.title },
      discountCode: quote.discount ? quote.discount.doc.code : "",
      paymentMethod: paymentMethod.orderPaymentMethod,
      subtotal: pricing.subtotal,
      deliveryFee: pricing.shipping,
      discount: pricing.codeDiscount,
      total: pricing.total,
    });
    await Promise.all(quote.lines.map((line) => recordBehaviorEvent(req, res, { type: "order_created", page: "/checkout", productId: String(line.product), brand: line.brand || "", category: line.category }, "server")));
    res.status(201).json({ success: true, message: "سفارش ثبت شد", order: { id: order._id, orderNumber: order.orderNumber, total: order.total, status: order.status } });
  } catch (error) {
    if (reservedDiscount) await DiscountCode.updateOne({ _id: reservedDiscount._id }, { $inc: { usedCount: -1 } }).catch(() => {});
    next(error);
  }
});

router.get("/my", protect, async (req, res, next) => {
  try {
    await expireQuietly(req.user._id);
    const orders = await Order.find({ user: req.user._id, superseded: { $ne: true } }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, orders: orders.map(withPayload) });
  } catch (error) { next(error); }
});

// جزئیات یک سفارش با شمارهٔ سفارش یا شناسه؛ فقط برای صاحب سفارش.
router.get("/:ref", protect, async (req, res, next) => {
  try {
    const ref = String(req.params.ref || "").trim();
    const filter = /^[a-f0-9]{24}$/i.test(ref) ? { $or: [{ _id: ref }, { orderNumber: ref }] } : { orderNumber: ref };
    await expireQuietly(req.user._id);
    const order = await Order.findOne({ ...filter, user: req.user._id, superseded: { $ne: true } }).lean();
    if (!order) return res.status(404).json({ success: false, message: "سفارش پیدا نشد" });
    res.json({ success: true, order: withPayload(order) });
  } catch (error) { next(error); }
});

// لغو توسط خود کاربر: فقط تا وقتی پرداخت نشده؛ سفارش پرداخت‌شده با پشتیبانی/ادمین لغو می‌شود.
router.post("/:ref/cancel", protect, async (req, res, next) => {
  try {
    const ref = String(req.params.ref || "").trim();
    const filter = /^[a-f0-9]{24}$/i.test(ref) ? { $or: [{ _id: ref }, { orderNumber: ref }] } : { orderNumber: ref };
    const order = await Order.findOne({ ...filter, user: req.user._id, superseded: { $ne: true } });
    if (!order) return res.status(404).json({ success: false, message: "سفارش پیدا نشد" });
    if (order.status === "cancelled") return res.json({ success: true, message: "این سفارش قبلاً لغو شده است", order: withPayload(order.toObject ? order.toObject() : order) });
    if (!isPendingPayment(order)) return res.status(400).json({ success: false, message: "فقط سفارش پرداخت‌نشده را می‌توان لغو کرد" });
    const cancelled = await cancelPending(order, "لغو توسط کاربر");
    if (!cancelled) return res.status(409).json({ success: false, message: "وضعیت سفارش تغییر کرده است؛ صفحه را دوباره بارگذاری کنید" });
    res.json({ success: true, message: "سفارش لغو شد", order: withPayload(cancelled.toObject ? cancelled.toObject() : cancelled) });
  } catch (error) { next(error); }
});
module.exports = router;
