// مهلت پرداخت: سفارش پرداخت‌نشده تا ۱۰ دقیقه بعد از ثبت «در انتظار پرداخت» می‌ماند و بعد خودکار لغو می‌شود.
// لغو دستی توسط کاربر هم همین‌جا انجام می‌شود تا ظرفیت کد تخفیف دقیقاً یک‌بار آزاد شود.
const Order = require("../models/Order");
const DiscountCode = require("../models/DiscountCode");

const PAYMENT_WINDOW_MS = 10 * 60 * 1000;

function paymentDeadline(order) {
  return new Date(new Date(order.createdAt).getTime() + PAYMENT_WINDOW_MS);
}

function isPendingPayment(order) {
  return Boolean(order) && order.status === "awaiting_payment" && order.paymentStatus !== "paid" && order.superseded !== true;
}

// فقط اگر سفارش هنوز در انتظار پرداخت باشد لغو می‌شود (اتمیک؛ دو درخواست هم‌زمان یک‌بار آزادسازی می‌کنند).
async function cancelPending(order, note) {
  const cancelled = await Order.findOneAndUpdate(
    { _id: order._id, status: "awaiting_payment", paymentStatus: { $ne: "paid" } },
    { $set: { status: "cancelled" }, $push: { statusHistory: { status: "cancelled", note, changedAt: new Date() } } },
    { returnDocument: "after" },
  );
  if (!cancelled) return null;
  if (cancelled.discountCode) {
    await DiscountCode.updateOne({ code: cancelled.discountCode, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
  }
  return cancelled;
}

async function expireOverdue(extraFilter = {}, now = Date.now()) {
  const overdue = await Order.find({
    ...extraFilter,
    status: "awaiting_payment",
    paymentStatus: { $ne: "paid" },
    superseded: { $ne: true },
    createdAt: { $lt: new Date(now - PAYMENT_WINDOW_MS) },
  }).select("_id discountCode");
  let count = 0;
  for (const order of overdue) {
    if (await cancelPending(order, "مهلت ۱۰ دقیقه‌ای پرداخت تمام شد")) count += 1;
  }
  return count;
}

module.exports = { PAYMENT_WINDOW_MS, paymentDeadline, isPendingPayment, cancelPending, expireOverdue };
