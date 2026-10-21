const express = require("express");
const axios = require("axios");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const env = require("../config/env");
const Order = require("../models/Order");
const WalletTransaction = require("../models/WalletTransaction");
const WalletTopup = require("../models/WalletTopup");
const walletService = require("../services/wallet");
const { applyOrderStock } = require("../services/inventory");
const { paymentDeadline, isPendingPayment, cancelPending } = require("../services/orderExpiry");

const apiBase = env.zarinpalSandbox ? "https://sandbox.zarinpal.com/pg/v4/payment" : "https://payment.zarinpal.com/pg/v4/payment";
const payBase = env.zarinpalSandbox ? "https://sandbox.zarinpal.com/pg/StartPay/" : "https://www.zarinpal.com/pg/StartPay/";

// آدرس بازگشت شارژ: همان دامنهٔ بازگشت پرداخت سفارش، با مسیر کیف پول
function topupCallbackUrl() {
  try {
    return new URL("/api/wallet/topup/callback", env.zarinpalCallbackUrl).toString();
  } catch (_) {
    return "";
  }
}

router.get("/", protect, async (req, res, next) => {
  try {
    const [balance, transactions] = await Promise.all([
      walletService.getBalance(req.user._id),
      WalletTransaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);
    res.json({ success: true, balance, minTopup: walletService.MIN_TOPUP, maxTopup: walletService.MAX_TOPUP, transactions });
  } catch (error) { next(error); }
});

// شروع شارژ: مبلغ دلخواه کاربر (تومان) → درگاه زرین‌پال
router.post("/topup", protect, async (req, res, next) => {
  try {
    if (!env.zarinpalMerchantId) return res.status(503).json({ success: false, message: "درگاه پرداخت تنظیم نشده است" });
    const amount = walletService.parseAmount(req.body.amount);
    if (!Number.isFinite(amount) || amount < walletService.MIN_TOPUP || amount > walletService.MAX_TOPUP) {
      return res.status(400).json({ success: false, message: `مبلغ شارژ باید بین ${walletService.MIN_TOPUP.toLocaleString("fa-IR")} و ${walletService.MAX_TOPUP.toLocaleString("fa-IR")} تومان باشد` });
    }
    const topup = await WalletTopup.create({ user: req.user._id, amount });
    const result = await axios.post(`${apiBase}/request.json`, {
      merchant_id: env.zarinpalMerchantId,
      amount: amount * 10,
      callback_url: topupCallbackUrl(),
      description: "شارژ کیف پول پیکسل‌لایف",
      metadata: { mobile: req.user.mobile || "", email: req.user.email || "" },
    }, { timeout: 15000 });
    const data = result.data?.data;
    if (!data || Number(data.code) !== 100 || !data.authority) {
      await WalletTopup.updateOne({ _id: topup._id }, { $set: { status: "failed" } });
      return res.status(502).json({ success: false, message: "ایجاد پرداخت در زرین‌پال ناموفق بود" });
    }
    await WalletTopup.updateOne({ _id: topup._id }, { $set: { authority: data.authority } });
    res.json({ success: true, paymentUrl: `${payBase}${data.authority}` });
  } catch (error) { next(error); }
});

router.get("/topup/callback", async (req, res, next) => {
  try {
    const authority = String(req.query.Authority || "");
    const status = String(req.query.Status || "").toUpperCase();
    const topup = authority ? await WalletTopup.findOne({ authority }) : null;
    if (!topup) return res.redirect("/profile/wallet?topup=failed");
    if (topup.status === "paid") return res.redirect("/profile/wallet?topup=success");
    if (status !== "OK") {
      await WalletTopup.updateOne({ _id: topup._id, status: "pending" }, { $set: { status: "failed" } });
      return res.redirect("/profile/wallet?topup=failed");
    }
    const result = await axios.post(`${apiBase}/verify.json`, { merchant_id: env.zarinpalMerchantId, amount: topup.amount * 10, authority }, { timeout: 15000 });
    const data = result.data?.data;
    if (![100, 101].includes(Number(data?.code))) {
      await WalletTopup.updateOne({ _id: topup._id, status: "pending" }, { $set: { status: "failed" } });
      return res.redirect("/profile/wallet?topup=failed");
    }
    // فقط اولین درخواستِ تأییدشده موجودی را اضافه می‌کند (بازگشت دوباره از درگاه شارژ دوباره نمی‌دهد).
    const claimed = await WalletTopup.findOneAndUpdate(
      { _id: topup._id, status: "pending" },
      { $set: { status: "paid", refId: Number(data.ref_id || 0) || null, cardPan: String(data.card_pan || ""), paidAt: new Date() } },
      { new: true },
    );
    if (claimed) await walletService.credit(topup.user, topup.amount, { type: "topup", ref: String(data.ref_id || authority), note: "شارژ کیف پول از درگاه" });
    res.redirect("/profile/wallet?topup=success");
  } catch (error) { next(error); }
});

// پرداخت سفارش با موجودی کیف پول
router.post("/pay", protect, async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.body.orderId, user: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: "سفارش پیدا نشد" });
    if (order.paymentStatus === "paid") return res.status(400).json({ success: false, message: "این سفارش قبلاً پرداخت شده است" });
    if (order.status === "cancelled") return res.status(400).json({ success: false, message: "این سفارش لغو شده است؛ سفارش را دوباره ثبت کنید" });
    if (isPendingPayment(order) && Date.now() > paymentDeadline(order).getTime()) {
      await cancelPending(order, "مهلت ۱۰ دقیقه‌ای پرداخت تمام شد");
      return res.status(400).json({ success: false, message: "مهلت ۱۰ دقیقه‌ای پرداخت این سفارش تمام شده و لغو شد؛ سفارش را دوباره ثبت کنید" });
    }
    const { order: paid, balance } = await walletService.payOrder(order);
    await applyOrderStock(paid).catch((error) => console.error("applyOrderStock error:", error.message));
    res.json({ success: true, balance, redirect: `/profile/orders/${encodeURIComponent(paid.orderNumber)}?payment=success` });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    next(error);
  }
});

module.exports = router;
