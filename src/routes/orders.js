const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const Order = require("../models/Order");
const DiscountCode = require("../models/DiscountCode");
const { buildQuote, findPaymentMethod } = require("../services/checkoutPricing");
const Address = require("../models/Address");
const { recordBehaviorEvent } = require("../services/behaviorAnalytics");

router.post("/", protect, async (req, res, next) => {
  let reservedDiscount = null;
  try {
    const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (!requestedItems.length) return res.status(400).json({ success: false, message: "سبد خرید خالی است" });
    const address = await Address.findOne({ _id: req.body.addressId, user: req.user._id }).lean();
    if (!address) return res.status(400).json({ success: false, message: "برای ثبت سفارش یک آدرس معتبر انتخاب کنید" });
    const paymentMethod = findPaymentMethod(req.body.paymentMethod || "zarinpal");
    if (!paymentMethod) return res.status(400).json({ success: false, message: "روش پرداخت معتبر نیست" });
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
      shippingAddress: { receiverName: address.receiverName || `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || "گیرنده", receiverMobile: address.receiverMobile || req.user.mobile, province: address.province, city: address.city, fullAddress: address.fullAddress, postalCode: address.postalCode || "" },
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
  try { const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean(); res.json({ success: true, orders }); } catch (error) { next(error); }
});
module.exports = router;
