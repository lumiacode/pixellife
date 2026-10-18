const { toGregorian, isValidJalaaliDate } = require("jalaali-js");
const ApiError = require("../utils/ApiError");

function toEnglishDigits(value) {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));
}

function parseNumber(value, label, { min = 0, max = Infinity } = {}) {
  const normalized = toEnglishDigits(value).replace(/[\s,٬،]/g, "");
  const number = normalized === "" ? 0 : Number(normalized);
  if (!Number.isFinite(number) || !Number.isInteger(number) || number < min || number > max) {
    throw new ApiError(400, `${label} معتبر نیست`);
  }
  return number;
}

// تاریخ انقضا شمسی و به‌وقت تهران است؛ بدون ساعت، پایان همان روز (۲۳:۵۹) در نظر گرفته می‌شود.
function parseExpiry(value) {
  const raw = toEnglishDigits(value).trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})(?:\D+(\d{1,2})\D+(\d{1,2}))?$/);
  const message = "تاریخ انقضا را شمسی وارد کنید؛ نمونه: ۱۴۰۵/۰۸/۳۰ یا ۱۴۰۵/۰۸/۳۰ ۲۳:۵۹";
  if (!match) throw new ApiError(400, message);
  const [jy, jm, jd] = [match[1], match[2], match[3]].map(Number);
  const hh = match[4] === undefined ? 23 : Number(match[4]);
  const mm = match[5] === undefined ? 59 : Number(match[5]);
  if (!isValidJalaaliDate(jy, jm, jd) || hh > 23 || mm > 59) throw new ApiError(400, message);
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  // ساعت تهران (UTC+3:30) به UTC تبدیل می‌شود.
  return new Date(Date.UTC(gy, gm - 1, gd, hh - 3, mm - 30));
}

// ورودی فرم مدیریت را اعتبارسنجی و پاک‌سازی می‌کند. existing = کد فعلی هنگام ویرایش.
function normalizeDiscountInput(body, existing = null) {
  const input = body && typeof body === "object" ? body : {};

  let code = String(input.code ?? (existing ? existing.code : "")).trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    throw new ApiError(400, "کد تخفیف باید ۳ تا ۳۲ کاراکتر و فقط حروف انگلیسی، عدد، خط تیره یا زیرخط باشد");
  }
  if (existing && existing.usedCount > 0 && code !== existing.code) {
    throw new ApiError(400, "کدی که استفاده شده قابل تغییر نام نیست؛ کد جدید بسازید و این را غیرفعال کنید");
  }

  const type = String(input.type || "");
  if (!["percent", "fixed"].includes(type)) throw new ApiError(400, "نوع تخفیف معتبر نیست");

  const value = type === "percent"
    ? parseNumber(input.value, "درصد تخفیف", { min: 1, max: 100 })
    : parseNumber(input.value, "مبلغ تخفیف", { min: 1, max: 10_000_000_000 });

  return {
    code,
    title: String(input.title || "").trim().slice(0, 80),
    type,
    value,
    // سقف تخفیف فقط برای نوع درصدی معنی دارد
    maxDiscount: type === "percent" ? parseNumber(input.maxDiscount, "سقف تخفیف", { min: 0, max: 10_000_000_000 }) : 0,
    minOrderAmount: parseNumber(input.minOrderAmount, "حداقل مبلغ سفارش", { min: 0, max: 10_000_000_000 }),
    usageLimit: parseNumber(input.usageLimit, "تعداد دفعات استفاده", { min: 0, max: 10_000_000 }),
    expiresAt: parseExpiry(input.expiresAt),
    isActive: input.isActive === undefined ? (existing ? existing.isActive : true) : input.isActive === true || input.isActive === "true",
  };
}

// وضعیت نمایشی کد برای جدول مدیریت
function discountState(doc, now = new Date()) {
  if (!doc.isActive) return "inactive";
  if (doc.expiresAt && new Date(doc.expiresAt) < now) return "expired";
  if (doc.usageLimit > 0 && doc.usedCount >= doc.usageLimit) return "exhausted";
  return "active";
}

module.exports = { normalizeDiscountInput, discountState, parseExpiry };
