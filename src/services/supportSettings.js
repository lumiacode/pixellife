// لینک گفتگوی پشتیبانی در پیام‌رسان بله؛ ادمین از پنل (/admin/support) تنظیم می‌کند.
// تا وقتی ثبت نشود، متغیر محیطی BALE_SUPPORT_URL (در صورت وجود) استفاده می‌شود و بدون هیچ‌کدام، دکمهٔ بله در سایت نمایش داده نمی‌شود.
const mongoose = require("mongoose");
const ApiError = require("../utils/ApiError");

const KEY = "support";
const CACHE_TTL_MS = 10 * 1000;
const ALLOWED_HOSTS = new Set(["ble.ir", "www.ble.ir", "bale.ai", "www.bale.ai", "web.bale.ai"]);

let cache = { value: null, expires: 0 };
const resetSupportCache = () => { cache = { value: null, expires: 0 }; };

// ورودی‌های مجاز: https://ble.ir/نام، ble.ir/نام، @نام یا فقط نام کاربری. خروجی همیشه یک آدرس https معتبر یا رشتهٔ خالی است.
function normalizeBaleUrl(input) {
  let value = String(input == null ? "" : input).trim();
  if (!value) return "";
  if (/^@?[A-Za-z][A-Za-z0-9_]{3,31}$/.test(value)) value = "https://ble.ir/" + value.replace(/^@/, "");
  else if (!/^https?:\/\//i.test(value)) value = "https://" + value;
  let url;
  try { url = new URL(value); } catch (_) { throw new ApiError(400, "آدرس معتبر نیست؛ نمونه: https://ble.ir/نام_کاربری"); }
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) throw new ApiError(400, "فقط آدرس‌های بله (ble.ir یا bale.ai) پذیرفته می‌شود");
  if (url.pathname.replace(/\//g, "").length < 2) throw new ApiError(400, "نام کاربری یا شناسهٔ گفتگو در آدرس نیست؛ نمونه: https://ble.ir/نام_کاربری");
  url.protocol = "https:";
  url.search = "";
  url.hash = "";
  return url.toString();
}

async function getSupportSettings() {
  if (cache.value && cache.expires > Date.now()) return cache.value;
  let baleUrl = "";
  if (mongoose.connection.readyState === 1) {
    try {
      const Setting = require("../models/Setting");
      const doc = await Setting.findOne({ key: KEY }).lean();
      baleUrl = normalizeBaleUrl(doc && doc.value && doc.value.baleUrl);
    } catch (_) { baleUrl = ""; }
  }
  if (!baleUrl && process.env.BALE_SUPPORT_URL) {
    try { baleUrl = normalizeBaleUrl(process.env.BALE_SUPPORT_URL); } catch (_) { baleUrl = ""; }
  }
  const value = { baleUrl };
  cache = { value, expires: Date.now() + CACHE_TTL_MS };
  return value;
}

async function saveSupportSettings(input = {}) {
  const baleUrl = normalizeBaleUrl(input.baleUrl);
  const Setting = require("../models/Setting");
  await Setting.updateOne({ key: KEY }, { $set: { value: { baleUrl } } }, { upsert: true });
  resetSupportCache();
  return { baleUrl };
}

module.exports = { normalizeBaleUrl, getSupportSettings, saveSupportSettings, resetSupportCache };
