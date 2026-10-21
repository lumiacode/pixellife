// کیف پول: موجودی اتمیک + دفتر تراکنش‌ها. مبلغ‌ها تومان و عدد صحیح‌اند.
const Wallet = require("../models/Wallet");
const WalletTransaction = require("../models/WalletTransaction");
const Order = require("../models/Order");

const MIN_TOPUP = 10000;
const MAX_TOPUP = 50000000;

async function getBalance(userId) {
  const wallet = await Wallet.findOne({ user: userId }).lean();
  return wallet ? wallet.balance : 0;
}

async function record(userId, type, amount, balanceAfter, meta) {
  try {
    await WalletTransaction.create({ user: userId, type, amount, balanceAfter, order: meta.order || null, ref: meta.ref || "", note: meta.note || "" });
  } catch (error) {
    // موجودی درست اعمال شده؛ فقط ثبت دفتر خطا داده است.
    console.error("wallet ledger error:", error.message);
  }
}

async function credit(userId, amount, meta = {}) {
  const wallet = await Wallet.findOneAndUpdate({ user: userId }, { $inc: { balance: amount } }, { new: true, upsert: true, setDefaultsOnInsert: true });
  await record(userId, meta.type || "adjust", amount, wallet.balance, meta);
  return wallet.balance;
}

// null یعنی موجودی کافی نیست (چیزی کم نشده است).
async function debit(userId, amount, meta = {}) {
  const wallet = await Wallet.findOneAndUpdate({ user: userId, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { new: true });
  if (!wallet) return null;
  await record(userId, meta.type || "purchase", -amount, wallet.balance, meta);
  return wallet.balance;
}

// پرداخت سفارش از کیف پول: ابتدا کسر، سپس تغییر اتمیک سفارش؛ اگر سفارش دیگر قابل پرداخت نبود، مبلغ برگردانده می‌شود.
async function payOrder(order) {
  const amount = Math.round(Number(order.total));
  if (!(amount > 0)) {
    const error = new Error("مبلغ سفارش نامعتبر است");
    error.statusCode = 400;
    throw error;
  }
  const balance = await debit(order.user, amount, { type: "purchase", order: order._id, ref: order.orderNumber, note: `پرداخت سفارش ${order.orderNumber}` });
  if (balance === null) {
    const error = new Error("موجودی کیف پول برای پرداخت این سفارش کافی نیست");
    error.statusCode = 402;
    throw error;
  }
  const paid = await Order.findOneAndUpdate(
    { _id: order._id, status: "awaiting_payment", paymentStatus: { $ne: "paid" } },
    { $set: { paymentStatus: "paid", status: "processing", paymentMethod: "wallet" }, $push: { statusHistory: { status: "processing", note: "پرداخت از کیف پول انجام شد", changedAt: new Date() } } },
    { new: true },
  );
  if (!paid) {
    await credit(order.user, amount, { type: "refund", order: order._id, ref: order.orderNumber, note: `بازگشت مبلغ؛ سفارش ${order.orderNumber} دیگر قابل پرداخت نبود` });
    const error = new Error("این سفارش دیگر قابل پرداخت نیست (لغو شده یا قبلاً پرداخت شده)");
    error.statusCode = 409;
    throw error;
  }
  return { order: paid, balance };
}

// بازگشت مبلغ سفارشِ پرداخت‌شده با کیف پول (لغو/مرجوعی)؛ با claim اتمیک فقط یک‌بار.
async function refundOrder(order) {
  if (!order || order.paymentMethod !== "wallet" || order.paymentStatus !== "paid") return false;
  const claim = await Order.findOneAndUpdate({ _id: order._id, walletRefunded: { $ne: true } }, { $set: { walletRefunded: true } });
  if (!claim) return false;
  await credit(order.user, Math.round(Number(order.total)), { type: "refund", order: order._id, ref: order.orderNumber, note: `بازگشت مبلغ سفارش ${order.orderNumber}` });
  return true;
}

function parseAmount(value) {
  const normalized = String(value ?? "")
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[\s,٬،]/g, "");
  return /^\d+$/.test(normalized) ? Number(normalized) : NaN;
}

module.exports = { MIN_TOPUP, MAX_TOPUP, getBalance, credit, debit, payOrder, refundOrder, parseAmount };
