const crypto = require("crypto");
const express = require("express");
const axios = require("axios");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Address = require("../models/Address");
const { findShippingMethod, shippingFee } = require("../services/checkoutPricing");
const { applyOrderStock } = require("../services/inventory");

const BOT_USERNAME = (process.env.BALE_BOT_USERNAME || "pixellifepaybot").replace(/^@/, "");
const BALE_API_BASE = "https://tapi.bale.ai/bot";

function isConfigured() {
  return Boolean(process.env.BALE_BOT_TOKEN && process.env.BALE_PAYMENT_TOKEN);
}
function webhookSecret() {
  return process.env.BALE_WEBHOOK_SECRET ||
    crypto.createHash("sha256").update(process.env.BALE_BOT_TOKEN || "").digest("hex");
}
function siteUrl(req) {
  return String(process.env.SITE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
}
function baleUrl(method) {
  return `${BALE_API_BASE}${encodeURIComponent(process.env.BALE_BOT_TOKEN)}/${method}`;
}
async function baleCall(method, payload) {
  if (!isConfigured()) throw new Error("تنظیمات درگاه بله کامل نیست");
  const { data } = await axios.post(baleUrl(method), payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 20000,
    validateStatus: () => true,
  });
  if (!data || data.ok !== true) throw new Error(data?.description || "پاسخ نامعتبر از بله");
  return data.result;
}
function newLinkCode() {
  return crypto.randomBytes(15).toString("hex").toUpperCase();
}
function cleanItemId(id) {
  return String(id || "").trim();
}
async function buildOrder(user, body) {
  const requestedItems = Array.isArray(body.items) ? body.items : [];
  if (!requestedItems.length) throw new Error("سبد خرید خالی است");
  const address = await Address.findOne({ _id: body.addressId, user: user._id }).lean();
  if (!address) throw new Error("برای ثبت سفارش یک آدرس معتبر انتخاب کنید");

  const productIds = requestedItems.map((item) => cleanItemId(item.productId));
  if (new Set(productIds).size !== productIds.length) throw new Error("یک کالا بیش از یک‌بار در سفارش ارسال شده است");

  const products = await Promise.all(productIds.map((id) => {
    if (/^[a-f\\d]{24}$/i.test(id)) return Product.findById(id).lean();
    return Product.findOne({ $or: [{ slug: id }, { legacyId: id }] }).lean();
  }));

  const items = requestedItems.map((item, index) => {
    const product = products[index];
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 0));
    if (!product || product.availability === "out" || Number(product.stock) < quantity) {
      throw new Error(`محصول «${product?.name || "انتخاب‌شده"}» موجود نیست`);
    }
    const price = Math.round(Number(product.price) * (1 - Math.max(0, Number(product.discount) || 0) / 100));
    return {
      product: product._id, name: product.name, brand: product.brand || "",
      image: product.mainImage || product.images?.[0] || "", price, quantity,
      color: String(item.color || ""), storage: String(item.storage || ""), warranty: String(item.warranty || ""),
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = shippingFee(findShippingMethod(), subtotal);
  const total = subtotal + deliveryFee;
  const order = await Order.create({
    user: user._id, items,
    shippingAddress: {
      receiverName: address.receiverName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "گیرنده",
      receiverMobile: address.receiverMobile || user.mobile,
      province: address.province, city: address.city, fullAddress: address.fullAddress, postalCode: address.postalCode || "",
    },
    subtotal, deliveryFee, total, paymentMethod: "bale",
  });
  return order;
}

router.get("/bale/status", protect, (req, res) => {
  res.json({
    success: true,
    configured: isConfigured(),
    connected: Boolean(req.user.baleChatId),
    botUsername: BOT_USERNAME,
  });
});

router.post("/bale/link", protect, async (req, res, next) => {
  try {
    if (!isConfigured()) return res.status(503).json({ success: false, message: "درگاه بله هنوز پیکربندی نشده است" });
    const code = newLinkCode();
    req.user.baleLinkCode = code;
    req.user.baleLinkExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await req.user.save();
    res.json({
      success: true,
      expiresInSeconds: 600,
      connectUrl: `https://ble.ir/${BOT_USERNAME}?start=${code}`,
      message: "بازو را باز کنید و دکمه شروع را بزنید؛ سپس به سایت برگردید.",
    });
  } catch (error) { next(error); }
});

router.post("/bale/checkout", protect, async (req, res, next) => {
  try {
    if (!isConfigured()) return res.status(503).json({ success: false, message: "درگاه بله هنوز پیکربندی نشده است" });
    if (!req.user.baleChatId) {
      return res.status(409).json({ success: false, code: "BALE_NOT_CONNECTED", message: "ابتدا حساب بله خود را به سایت متصل کنید." });
    }

    const order = await buildOrder(req.user, req.body);
    const payload = `PL${String(order._id).replace(/[^a-f0-9]/gi, "")}`;
    const amountRial = Math.round(order.total * 10);
    order.balePayment = {
      payload, chatId: String(req.user.baleChatId), amountRial, status: "created",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };
    await order.save();

    try {
      await baleCall("sendInvoice", {
        chat_id: String(req.user.baleChatId),
        title: `سفارش ${order.orderNumber}`.slice(0, 32),
        description: `پرداخت سفارش پیکسل‌لایف — مهلت پرداخت ۳۰ دقیقه`.slice(0, 255),
        payload,
        provider_token: process.env.BALE_PAYMENT_TOKEN,
        start_parameter: payload.slice(0, 32),
        currency: "IRR",
        prices: [{ label: "سفارش پیکسل‌لایف", amount: amountRial }],
      });
    } catch (error) {
      order.balePayment.status = "failed";
      order.paymentStatus = "failed";
      order.statusHistory.push({ status: "awaiting_payment", note: `ارسال فاکتور بله ناموفق بود: ${error.message}` });
      await order.save();
      throw error;
    }

    order.balePayment.status = "sent";
    order.statusHistory.push({ status: "awaiting_payment", note: "فاکتور پرداخت بله ارسال شد" });
    await order.save();
    res.status(201).json({ success: true, message: "فاکتور پرداخت به بازوی بله ارسال شد.", order: { id: order._id, orderNumber: order.orderNumber, total: order.total } });
  } catch (error) { next(error); }
});

router.get("/bale/orders/:orderId/status", protect, async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId, user: req.user._id }).lean();
    if (!order) return res.status(404).json({ success: false, message: "سفارش یافت نشد" });
    res.json({ success: true, order: { id: order._id, paymentStatus: order.paymentStatus, status: order.status, orderNumber: order.orderNumber } });
  } catch (error) { next(error); }
});

router.post("/bale/webhook/:secret", async (req, res) => {
  const providedSecret = String(req.params.secret || "");
  const expectedSecret = webhookSecret();
  const secretMatches = providedSecret.length === expectedSecret.length &&
    crypto.timingSafeEqual(Buffer.from(providedSecret), Buffer.from(expectedSecret));
  if (!isConfigured() || !secretMatches) {
    return res.status(403).json({ ok: false });
  }
  const update = req.body || {};
  try {
    if (update.message?.text) {
      const match = String(update.message.text).trim().match(/^\/start(?:\s+([A-Za-z0-9]+))?$/);
      const chatId = String(update.message.chat?.id || "");
      const fromId = String(update.message.from?.id || "");
      if (match && chatId && fromId && chatId === fromId && match[1]) {
        const user = await require("../models/User").findOne({
          baleLinkCode: match[1].toUpperCase(),
          baleLinkExpiresAt: { $gt: new Date() },
        });
        if (user) {
          user.baleChatId = chatId;
          user.baleLinkCode = "";
          user.baleLinkExpiresAt = null;
          await user.save();
          await baleCall("sendMessage", { chat_id: chatId, text: "حساب بله شما با پیکسل‌لایف متصل شد ✅ اکنون به سایت برگردید و پرداخت را ادامه دهید." });
        } else {
          await baleCall("sendMessage", { chat_id: chatId, text: "کد اتصال نامعتبر یا منقضی شده است. از سایت یک اتصال جدید بسازید." });
        }
      }
    } else if (update.pre_checkout_query) {
      const query = update.pre_checkout_query;
      const order = await Order.findOne({ "balePayment.payload": String(query.invoice_payload || "") });
      const valid = Boolean(order && order.paymentStatus === "unpaid" && order.balePayment?.status === "sent" &&
        String(order.balePayment.chatId) === String(query.from?.id || "") &&
        String(query.currency || "").toUpperCase() === "IRR" &&
        Number(query.total_amount) === Number(order.balePayment.amountRial) &&
        new Date(order.balePayment.expiresAt) > new Date());
      await baleCall("answerPreCheckoutQuery", valid
        ? { pre_checkout_query_id: String(query.id), ok: true }
        : { pre_checkout_query_id: String(query.id), ok: false, error_message: "این فاکتور معتبر نیست یا مهلت آن تمام شده است." });
    } else if (update.message?.successful_payment) {
      const message = update.message;
      const payment = message.successful_payment;
      const order = await Order.findOne({ "balePayment.payload": String(payment.invoice_payload || "") });
      const chargeId = String(payment.telegram_payment_charge_id || payment.provider_payment_charge_id || "");
      const valid = Boolean(order && order.paymentStatus === "unpaid" && chargeId &&
        String(order.balePayment?.chatId) === String(message.from?.id || message.chat?.id || "") &&
        String(payment.currency || "").toUpperCase() === "IRR" &&
        Number(payment.total_amount) === Number(order.balePayment?.amountRial));
      if (valid) {
        order.paymentStatus = "paid";
        order.status = "processing";
        order.balePayment.status = "paid";
        order.balePayment.chargeId = chargeId;
        order.balePayment.paidAt = new Date();
        order.statusHistory.push({ status: "processing", note: `پرداخت بله تأیید شد. شناسه تراکنش: ${chargeId}` });
        await order.save();
        await applyOrderStock(order).catch((error) => console.error("applyOrderStock error:", error.message));
      }
    }
  } catch (error) {
    console.error("Bale webhook error:", error.message);
  }
  res.json({ ok: true });
});

async function configureWebhook() {
  if (!isConfigured() || process.env.BALE_WEBHOOK_AUTO_SETUP === "false") return;
  const base = String(process.env.SITE_URL || "https://pixellife.ir").replace(/\/$/, "");
  const url = `${base}/api/payments/bale/webhook/${webhookSecret()}`;
  try {
    await baleCall("setWebhook", { url });
    console.log("✅ Bale webhook configured");
  } catch (error) {
    console.warn("⚠️ Bale webhook not configured:", error.message);
  }
}

module.exports = { router, configureWebhook };
