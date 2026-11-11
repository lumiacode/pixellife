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
  const row = { user: userId, type, amount, balanceAfter, order: meta.order || null, ref: meta.ref || "", note: meta.note || "" };
  // موجودی همین حالا اعمال شده؛ اگر ثبت دفتر شکست بخورد، موجودی و دفتر مغایرت پیدا می‌کنند. برای همین یک بار دوباره تلاش می‌شود و
  // در صورت شکست، همهٔ مشخصات ردیف با برچسب ثابت در لاگ سرور می‌ماند (و scripts/check-wallets.js مغایرت را نشان می‌دهد).
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await WalletTransaction.create(row);
      return;
    } catch (error) {
      if (attempt === 2) console.error("[wallet-ledger-missing]", JSON.stringify({ ...row, user: String(row.user), order: row.order ? String(row.order) : null, error: error.message }));
    }
  }
}

async function credit(userId, amount, meta = {}) {
  const wallet = await Wallet.findOneAndUpdate({ user: userId }, { $inc: { balance: amount } }, { returnDocument: "after", upsert: true, setDefaultsOnInsert: true });
  await record(userId, meta.type || "adjust", amount, wallet.balance, meta);
  return wallet.balance;
}

// null یعنی موجودی کافی نیست (چیزی کم نشده است).
async function debit(userId, amount, meta = {}) {
  const wallet = await Wallet.findOneAndUpdate({ user: userId, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { returnDocument: "after" });
  if (!wallet) return null;
  await record(userId, meta.type || "purchase", -amount, wallet.balance, meta);
  return wallet.balance;
}

// پرداخت سفارش از کیف پول. هیچ مسیر خودکاری پولی به کیف پول برنمی‌گرداند:
//   ۱) ابتدا سفارش اتمیک «پرداخت‌شده» می‌شود (فقط اگر هنوز در انتظار پرداخت باشد؛ دو درخواست هم‌زمان فقط یکی موفق می‌شود)
//   ۲) سپس موجودی کم می‌شود. اگر موجودی کافی نبود، فقط «وضعیت سفارش» به حالت قبل برمی‌گردد (پولی جابه‌جا نشده بود).
// بنابراین هیچ لحظه‌ای نیست که پول کم شده باشد و بعد خودکار برگردد.
async function payOrder(order) {
  const amount = Math.round(Number(order.total));
  if (!(amount > 0)) {
    const error = new Error("مبلغ سفارش نامعتبر است");
    error.statusCode = 400;
    throw error;
  }
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, status: "awaiting_payment", paymentStatus: { $ne: "paid" } },
    { $set: { paymentStatus: "paid", status: "processing", paymentMethod: "wallet", walletPaying: true } },
    { returnDocument: "after" },
  );
  if (!claimed) {
    const error = new Error("این سفارش دیگر قابل پرداخت نیست (لغو شده یا قبلاً پرداخت شده)");
    error.statusCode = 409;
    throw error;
  }
  const balance = await debit(order.user, amount, { type: "purchase", order: order._id, ref: order.orderNumber, note: `پرداخت سفارش ${order.orderNumber}` });
  if (balance === null) {
    // پولی کم نشده؛ فقط سفارش به «در انتظار پرداخت» برمی‌گردد تا کاربر بعد از شارژ دوباره پرداخت کند.
    await Order.updateOne({ _id: order._id, walletPaying: true }, { $set: { paymentStatus: "unpaid", status: "awaiting_payment" }, $unset: { walletPaying: 1 } });
    const error = new Error("موجودی کیف پول برای پرداخت این سفارش کافی نیست");
    error.statusCode = 402;
    throw error;
  }
  const paid = await Order.findOneAndUpdate(
    { _id: order._id },
    { $unset: { walletPaying: 1 }, $push: { statusHistory: { status: "processing", note: "پرداخت از کیف پول انجام شد", changedAt: new Date() } } },
    { returnDocument: "after" },
  );
  return { order: paid || claimed, balance };
}

// بازگشت پول سفارشِ پرداخت‌شده با کیف پول به کیف پول مشتری: «فقط» با دستور صریح ادمین (دکمهٔ بازگشت وجه در لیست سفارش‌ها).
// هیچ تغییر وضعیتی (لغو، مرجوع، تحویل، …) خودش پولی برنمی‌گرداند. مبلغ برگشتی دقیقاً همان مبلغ ردیف «پرداخت» همان سفارش
// در دفتر است، و با claim اتمیک فقط یک‌بار انجام می‌شود.
async function adminRefundToWallet(order) {
  const fail = (statusCode, message) => { const error = new Error(message); error.statusCode = statusCode; throw error; };
  if (!order || order.paymentMethod !== "wallet" || order.paymentStatus !== "paid") fail(400, "بازگشت وجه فقط برای سفارش پرداخت‌شده با کیف پول ممکن است");
  if (order.status !== "cancelled" && order.status !== "returned") fail(400, "ابتدا وضعیت سفارش را «لغوشده» یا «مرجوع‌شده» کنید");
  const purchase = await WalletTransaction.findOne({ user: order.user, order: order._id, type: "purchase" }).lean();
  if (!purchase || !(Number(purchase.amount) < 0)) fail(409, "ردیف پرداخت این سفارش در دفتر کیف پول پیدا نشد؛ از این سفارش پولی کسر نشده بوده");
  const amount = -Math.round(Number(purchase.amount));
  const claim = await Order.findOneAndUpdate({ _id: order._id, walletRefunded: { $ne: true } }, { $set: { walletRefunded: true } });
  if (!claim) fail(409, "مبلغ این سفارش قبلاً به کیف پول برگشته است");
  try {
    const balance = await credit(order.user, amount, { type: "refund", order: order._id, ref: order.orderNumber, note: `بازگشت مبلغ سفارش ${order.orderNumber} (با دستور ادمین)` });
    return { amount, balance };
  } catch (error) {
    await Order.updateOne({ _id: order._id }, { $set: { walletRefunded: false } }).catch(() => {});
    throw error;
  }
}

// سفارشی که پولش به کیف پول برگشته (لغو/مرجوع) دوباره «فعال» نمی‌شود؛ وگرنه مشتری هم کالا می‌گیرد هم پولش را.
// بین دو وضعیت بسته (لغو ↔ مرجوع) جابه‌جایی مجاز است. null یعنی تغییر وضعیت مشکلی ندارد.
function statusChangeBlocker(order, nextStatus) {
  if (!order || order.walletRefunded !== true) return null;
  if (nextStatus === "cancelled" || nextStatus === "returned") return null;
  return "مبلغ این سفارش قبلاً به کیف پول مشتری برگشته است؛ آن را نمی‌توان دوباره در حال پردازش/ارسال/تحویل کرد. اگر باید ارسال شود، سفارش جدید ثبت شود.";
}

function parseAmount(value) {
  const normalized = String(value ?? "")
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[\s,٬،]/g, "");
  return /^\d+$/.test(normalized) ? Number(normalized) : NaN;
}

module.exports = { MIN_TOPUP, MAX_TOPUP, getBalance, credit, debit, payOrder, adminRefundToWallet, statusChangeBlocker, parseAmount };
