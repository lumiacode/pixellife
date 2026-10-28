// روش‌های ارسال و تنظیمات قابل‌ویرایش آن‌ها در پنل ادمین.
// فهرست روش‌ها (id، عنوان و مقدار پیش‌فرض) در src/config/checkout.js تعریف می‌شود؛ هر روش جدیدی که
// آنجا اضافه شود خودکار در صفحهٔ «روش ارسال» ادمین و در پرداخت مشتری ظاهر می‌شود.
// تنظیمات ذخیره‌شده: Setting{key:"shipping", value:{methods:{[id]:{...}}}} (قالب قدیمیِ تک‌روشی هم خوانده می‌شود).
const mongoose = require("mongoose");
const checkoutConfig = require("../config/checkout");
const ApiError = require("../utils/ApiError");

const KEY = "shipping";
const CACHE_TTL_MS = 10 * 1000;
const MAX_FEE = 50_000_000; // سقف منطقی برای جلوگیری از اشتباه تایپی

const registry = () => checkoutConfig.shippingMethods;
const defaultsFor = (method) => ({
  id: method.id,
  fee: Number(method.fee) || 0,
  freeEnabled: (method.freeThreshold !== undefined ? Number(method.freeThreshold) : Number(checkoutConfig.freeShippingThreshold)) > 0,
  freeThreshold: (method.freeThreshold !== undefined ? Number(method.freeThreshold) : Number(checkoutConfig.freeShippingThreshold)) || 0,
  title: method.title,
  eta: method.eta || "",
  enabled: method.enabled !== false,
});
const DEFAULTS = Object.freeze(defaultsFor(registry()[0] || { id: "post", title: "ارسال پستی", eta: "", fee: 0 }));

let cache = { value: null, expires: 0 };
const resetShippingCache = () => { cache = { value: null, expires: 0 }; };

const toInt = (value) => {
  const digits = String(value == null ? "" : value).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[,،٬\s]/g, "");
  return /^\d+$/.test(digits) ? Number.parseInt(digits, 10) : NaN;
};

function normalizeShippingInput(input = {}, base = DEFAULTS) {
  const fee = toInt(input.fee);
  if (!Number.isFinite(fee) || fee > MAX_FEE) throw new ApiError(400, `هزینهٔ ارسال باید عددی بین ۰ تا ${MAX_FEE.toLocaleString("fa-IR")} تومان باشد`);
  const freeEnabled = input.freeEnabled === true || input.freeEnabled === "true";
  let freeThreshold = 0;
  if (freeEnabled) {
    freeThreshold = toInt(input.freeThreshold);
    if (!Number.isFinite(freeThreshold) || freeThreshold <= 0) throw new ApiError(400, "حداقل مبلغ ارسال رایگان را به تومان (بیشتر از صفر) وارد کنید");
  }
  const title = String(input.title || "").trim().slice(0, 60) || base.title;
  const eta = String(input.eta || "").trim().slice(0, 120);
  const enabled = input.enabled === undefined ? base.enabled !== false : input.enabled === true || input.enabled === "true";
  return { fee, freeEnabled, freeThreshold, title, eta, enabled };
}

async function readStored() {
  // بدون اتصال دیتابیس (مثلاً در آزمون) از دیتابیس پرسیده نمی‌شود تا درخواست معلق نماند.
  if (mongoose.connection.readyState !== 1) return {};
  try {
    const Setting = require("../models/Setting");
    const doc = await Setting.findOne({ key: KEY }).lean();
    const value = (doc && doc.value) || {};
    if (value.methods && typeof value.methods === "object") return value.methods;
    // قالب قدیمی: یک آبجکت تخت که فقط برای اولین روش بود
    return Object.keys(value).length && registry()[0] ? { [registry()[0].id]: value } : {};
  } catch (_) { return {}; }
}

// همهٔ روش‌های ارسال (فعال و غیرفعال) با تنظیمات نهایی
async function getShippingMethods() {
  if (cache.value && cache.expires > Date.now()) return cache.value;
  const stored = await readStored();
  const list = registry().map((method) => {
    const base = defaultsFor(method);
    const saved = stored[method.id];
    if (!saved) return base;
    try { return { id: method.id, ...normalizeShippingInput({ ...base, ...saved }, base) }; } catch (_) { return base; }
  });
  cache = { value: list, expires: Date.now() + CACHE_TTL_MS };
  return list;
}

async function saveShippingMethod(id, input) {
  const method = registry().find((m) => m.id === id);
  if (!method) throw new ApiError(404, "روش ارسال پیدا نشد");
  const current = await getShippingMethods();
  const value = normalizeShippingInput(input, current.find((m) => m.id === id) || defaultsFor(method));
  if (!value.enabled && !current.some((m) => m.id !== id && m.enabled)) throw new ApiError(400, "حداقل یک روش ارسال باید فعال بماند");
  const Setting = require("../models/Setting");
  await Setting.updateOne({ key: KEY }, { $set: { [`value.methods.${id}`]: value } }, { upsert: true });
  resetShippingCache();
  return { id, ...value };
}

// روش‌های قابل‌انتخاب برای مشتری؛ freeThreshold = ۰ یعنی ارسال رایگان نداریم.
async function loadShippingMethods() {
  return (await getShippingMethods()).map((s) => ({ id: s.id, title: s.title, eta: s.eta, fee: s.fee, freeThreshold: s.freeEnabled ? s.freeThreshold : 0, enabled: s.enabled }));
}

module.exports = { DEFAULTS, MAX_FEE, normalizeShippingInput, getShippingMethods, saveShippingMethod, loadShippingMethods, resetShippingCache };
