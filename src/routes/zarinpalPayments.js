const express = require("express");
const axios = require("axios");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const Order = require("../models/Order");
const env = require("../config/env");

const apiBase = env.zarinpalSandbox
  ? "https://sandbox.zarinpal.com/pg/v4/payment"
  : "https://payment.zarinpal.com/pg/v4/payment";
const payBase = env.zarinpalSandbox
  ? "https://sandbox.zarinpal.com/pg/StartPay/"
  : "https://www.zarinpal.com/pg/StartPay/";

function rialAmount(order) {
  return Math.max(1, Math.round(Number(order.total) * 10));
}

router.post("/request", protect, async (req, res, next) => {
  try {
    if (!env.zarinpalMerchantId) return res.status(503).json({ success: false, message: "درگاه زرین‌پال تنظیم نشده است" });
    const order = await Order.findOne({ _id: req.body.orderId, user: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: "سفارش پیدا نشد" });
    if (order.paymentStatus === "paid") return res.status(400).json({ success: false, message: "این سفارش قبلاً پرداخت شده است" });
    const amount = rialAmount(order);
    const result = await axios.post(`${apiBase}/request.json`, {
      merchant_id: env.zarinpalMerchantId,
      amount,
      callback_url: env.zarinpalCallbackUrl,
      description: `پرداخت سفارش ${order.orderNumber}`,
      metadata: { mobile: req.user.mobile || "", email: req.user.email || "" },
    }, { timeout: 15000 });
    const data = result.data?.data;
    if (!data || Number(data.code) !== 100 || !data.authority) {
      order.paymentStatus = "failed";
      order.statusHistory.push({ status: order.status, note: `خطا در ایجاد پرداخت زرین‌پال: ${data?.message || "پاسخ نامعتبر"}` });
      await order.save();
      return res.status(502).json({ success: false, message: "ایجاد پرداخت در زرین‌پال ناموفق بود" });
    }
    order.zarinpal.authority = data.authority;
    order.paymentMethod = "online";
    await order.save();
    res.json({ success: true, authority: data.authority, paymentUrl: `${payBase}${data.authority}` });
  } catch (error) { next(error); }
});

router.get("/callback", async (req, res, next) => {
  try {
    const authority = String(req.query.Authority || "");
    const status = String(req.query.Status || "").toUpperCase();
    const order = await Order.findOne({ "zarinpal.authority": authority });
    if (!order) return res.status(404).send("سفارش پرداخت پیدا نشد");
    if (order.paymentStatus === "paid") return res.redirect(`/profile/orders?payment=success&order=${encodeURIComponent(order.orderNumber)}`);
    if (status !== "OK") {
      order.paymentStatus = "failed";
      await order.save();
      return res.redirect(`/profile/orders?payment=cancelled&order=${encodeURIComponent(order.orderNumber)}`);
    }
    const result = await axios.post(`${apiBase}/verify.json`, {
      merchant_id: env.zarinpalMerchantId,
      amount: rialAmount(order),
      authority,
    }, { timeout: 15000 });
    const data = result.data?.data;
    if (![100, 101].includes(Number(data?.code))) {
      order.paymentStatus = "failed";
      order.statusHistory.push({ status: order.status, note: `تأیید پرداخت زرین‌پال ناموفق بود: ${data?.message || "پاسخ نامعتبر"}` });
      await order.save();
      return res.redirect(`/profile/orders?payment=failed&order=${encodeURIComponent(order.orderNumber)}`);
    }
    order.paymentStatus = "paid";
    order.status = "processing";
    order.zarinpal.refId = Number(data.ref_id || 0) || null;
    order.zarinpal.cardPan = String(data.card_pan || "");
    order.zarinpal.paidAt = new Date();
    order.statusHistory.push({ status: "processing", note: `پرداخت زرین‌پال تأیید شد؛ کد رهگیری ${data.ref_id || ""}` });
    await order.save();
    res.redirect(`/profile/orders?payment=success&order=${encodeURIComponent(order.orderNumber)}`);
  } catch (error) { next(error); }
});

module.exports = router;
