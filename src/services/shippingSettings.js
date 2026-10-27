// هزینهٔ ارسال قابل‌تنظیم از پنل ادمین. بدون ثبت تنظیم، مقادیر پیش‌فرض src/config/checkout.js اعمال می‌شود.
const mongoose = require("mongoose");
const checkoutConfig = require("../config/checkout");
const ApiError = require("../utils/ApiError");

const KEY = "shipping";
const CACHE_TTL_MS = 10 * 1000;
const MAX_FEE = 50_000_000; // سقف منطقی برای جلوگیری از اشتباه تایپی

const baseMethod = checkoutConfig.shippingMethods[0] || { id: "post", title: "ارسال پستی", eta: "", fee: 0 };
const DEFAULTS = Object.freeze({
  fee: baseMethod.fee,
  freeEnabled: Number(checkoutConfig.freeShippingThreshold) > 0,
  freeThreshold: Number(checkoutConfig.freeShippingThreshold) || 0,
  title: baseMethod.title,
  eta: baseMethod.eta,
});

let cache = { value: null, expires: 0 };
const resetShippingCache = () => { cache = { value: null, expires: 0 }; };

const toInt = (value) => {
  const digits = String(value == null ? "" : value).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[,،٬\s]/g, "");
  return /^\d+$/.test(digits) ? Number.parseInt(digits, 10) : NaN;
};

function normalizeShippingInput(input = {}) {
  const fee = toInt(input.fee);
  if (!Number.isFinite(fee) || fee > MAX_FEE) throw new ApiError(400, `هزینهٔ ارسال باید عددی بین ۰ تا ${MAX_FEE.toLocaleString("fa-IR")} تومان باشد`);
  const freeEnabled = input.freeEnabled === true || input.freeEnabled === "true";
  let freeThreshold = 0;
  if (freeEnabled) {
    freeThreshold = toInt(input.freeThreshold);
    if (!Number.isFinite(freeThreshold) || freeThreshold <= 0) throw new ApiError(400, "حداقل مبلغ ارسال رایگان را به تومان (بیشتر از صفر) وارد کنید");
  }
  const title = String(input.title || "").trim().slice(0, 60) || DEFAULTS.title;
  const eta = String(input.eta || "").trim().slice(0, 120);
  return { fee, freeEnabled, freeThreshold, title, eta };
}

async function getShippingSettings() {
  if (cache.value && cache.expires > Date.now()) return cache.value;
  let value = { ...DEFAULTS };
  // بدون اتصال دیتابیس (مثلاً در آزمون) از دیتابیس پرسیده نمی‌شود تا درخواست معلق نماند.
  if (mongoose.connection.readyState === 1) {
    try {
      const Setting = require("../models/Setting");
      const doc = await Setting.findOne({ key: KEY }).lean();
      if (doc && doc.value) value = { ...DEFAULTS, ...normalizeShippingInput({ ...DEFAULTS, ...doc.value }) };
    } catch (_) { /* در خطا مقدار پیش‌فرض/قبلی استفاده می‌شود */ }
  }
  cache = { value, expires: Date.now() + CACHE_TTL_MS };
  return value;
}

async function saveShippingSettings(input) {
  const value = normalizeShippingInput(input);
  const Setting = require("../models/Setting");
  await Setting.updateOne({ key: KEY }, { $set: { value } }, { upsert: true });
  resetShippingCache();
  return value;
}

// روش ارسال با همهٔ ویژگی‌ها؛ freeThreshold = ۰ یعنی ارسال رایگان نداریم.
async function loadShippingMethods() {
  const s = await getShippingSettings();
  return [{ id: baseMethod.id, title: s.title, eta: s.eta, fee: s.fee, freeThreshold: s.freeEnabled ? s.freeThreshold : 0, enabled: true }];
}

module.exports = { DEFAULTS, MAX_FEE, normalizeShippingInput, getShippingSettings, saveShippingSettings, loadShippingMethods, resetShippingCache };
