// روند ارسال سفارش: مرحله‌های «ثبت»، «تأیید»، «بسته‌بندی»، «تحویل به پست/پیک» و «تحویل به مشتری».
// «ثبت سفارش» با پرداخت موفق خودکار کامل می‌شود؛ بقیه را ادمین یکی‌یکی تیک می‌زند.
const TRACKING_STEPS = [
  { key: "placed", label: "ثبت و پرداخت سفارش" },
  { key: "confirmed", label: "تأیید و پردازش سفارش" },
  { key: "packed", label: "آماده‌سازی و بسته‌بندی" },
  { key: "shipped", label: "تحویل به پست / پیک" },
  { key: "delivered", label: "تحویل به مشتری" },
];
// جملهٔ وضعیت فعلی بر اساس تعداد مرحله‌های کامل‌شده (۱ تا ۵)
const STATUS_LABELS = [
  "سفارش ثبت شد؛ در انتظار تأیید",
  "در حال آماده‌سازی و بسته‌بندی",
  "آماده تحویل به پست / پیک",
  "ارسال شد؛ در مسیر تحویل به مشتری",
  "تحویل مرسوله به مشتری",
];
// مرحله‌هایی که ادمین دستی تیک می‌زند (به ترتیب)
const ADMIN_STEP_KEYS = TRACKING_STEPS.slice(1).map((step) => step.key);

function isPaid(order) {
  return order && order.paymentStatus === "paid";
}

// فقط یک پیشوندِ پیوسته از مرحله‌ها معتبر است (نمی‌شود «تحویل شد» را بدون «ارسال» تیک زد).
function normalizeStepKeys(keys) {
  const wanted = new Set(Array.isArray(keys) ? keys.map(String) : []);
  const prefix = [];
  for (const key of ADMIN_STEP_KEYS) {
    if (!wanted.has(key)) break;
    prefix.push(key);
  }
  return prefix;
}

function completedAdminKeys(order) {
  const done = new Set((order.trackingSteps || []).map((step) => step.key));
  return ADMIN_STEP_KEYS.filter((key) => done.has(key));
}

// وضعیت کلی سفارش از روی مرحله‌های تیک‌خورده
function statusForSteps(keys) {
  if (keys.includes("delivered")) return "delivered";
  if (keys.includes("shipped")) return "shipped";
  return "processing";
}

// مرحله‌های تیک‌خوردهٔ سفارش را ست می‌کند و status را هماهنگ نگه می‌دارد؛ تغییر را برمی‌گرداند.
function applyTrackingSteps(order, requestedKeys, now = new Date()) {
  if (!isPaid(order)) {
    const error = new Error("روند ارسال فقط برای سفارش پرداخت‌شده قابل تنظیم است");
    error.statusCode = 400;
    throw error;
  }
  if (order.status === "cancelled" || order.status === "returned") {
    const error = new Error("سفارش لغوشده یا مرجوع‌شده روند ارسال ندارد");
    error.statusCode = 400;
    throw error;
  }
  const keys = normalizeStepKeys(requestedKeys);
  const previous = new Map((order.trackingSteps || []).map((step) => [step.key, step.at]));
  order.trackingSteps = keys.map((key) => ({ key, at: previous.get(key) || now }));
  const status = statusForSteps(keys);
  const changedStatus = order.status !== status;
  order.status = status;
  const labels = keys.length ? TRACKING_STEPS.find((step) => step.key === keys[keys.length - 1]).label : "در انتظار تأیید";
  order.statusHistory.push({ status, note: `روند ارسال: ${labels}` });
  return { keys, status, changedStatus };
}

// وقتی ادمین وضعیت کلی را از لیست کشویی عوض می‌کند، مرحله‌ها با آن هماهنگ می‌شوند.
function syncStepsWithStatus(order, status, now = new Date()) {
  if (!isPaid(order)) return;
  let keys = completedAdminKeys(order);
  if (status === "delivered") keys = ADMIN_STEP_KEYS.slice();
  else if (status === "shipped") keys = ADMIN_STEP_KEYS.slice(0, ADMIN_STEP_KEYS.indexOf("shipped") + 1);
  else if (status === "processing") keys = keys.filter((key) => key !== "shipped" && key !== "delivered");
  else return; // لغو/در انتظار پرداخت: مرحله‌ها دست‌نخورده می‌مانند
  const previous = new Map((order.trackingSteps || []).map((step) => [step.key, step.at]));
  order.trackingSteps = keys.map((key) => ({ key, at: previous.get(key) || now }));
}

// نمایش روند برای مشتری و ادمین
function trackingView(order) {
  const done = new Map((order.trackingSteps || []).map((step) => [step.key, step.at]));
  const paid = isPaid(order);
  const cancelled = order.status === "cancelled";
  const returned = order.status === "returned";
  const steps = TRACKING_STEPS.map((step) => {
    if (step.key === "placed") return { key: step.key, label: step.label, done: paid, at: paid ? (order.zarinpal && order.zarinpal.paidAt) || (order.balePayment && order.balePayment.paidAt) || order.updatedAt || order.createdAt : null };
    return { key: step.key, label: step.label, done: paid && !cancelled && !returned && done.has(step.key), at: done.get(step.key) || null };
  });
  const completed = steps.filter((step) => step.done).length;
  const percent = Math.round((completed / steps.length) * 100);
  let currentLabel;
  if (cancelled) currentLabel = "سفارش لغو شد";
  else if (returned) currentLabel = "سفارش مرجوع شد";
  else if (!paid) currentLabel = "در انتظار پرداخت";
  else if (completed === steps.length) currentLabel = "تحویل مرسوله به مشتری";
  else currentLabel = STATUS_LABELS[Math.min(completed, STATUS_LABELS.length) - 1] || STATUS_LABELS[0];
  return { steps, completed, total: steps.length, percent, currentLabel, cancelled, returned, paid };
}

module.exports = { TRACKING_STEPS, ADMIN_STEP_KEYS, normalizeStepKeys, applyTrackingSteps, syncStepsWithStatus, trackingView, statusForSteps };
