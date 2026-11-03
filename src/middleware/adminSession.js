const crypto = require("crypto");
const session = require("express-session");

// رمز نشست فقط از محیط خوانده می‌شود. اگر SESSION_SECRET تنظیم نشده باشد، برای همین اجرا یک رمز تصادفی ساخته می‌شود
// (امن است ولی با هر ری‌استارت ادمین باید دوباره وارد شود)؛ رمز ثابت در کد هرگز استفاده نمی‌شود.
let secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 16) {
  secret = crypto.randomBytes(32).toString("hex");
  console.warn("⚠️ SESSION_SECRET تنظیم نشده (یا کوتاه است) — رمز موقت ساخته شد؛ در .env یک رشتهٔ تصادفی ۳۲+ کاراکتری بگذارید.");
}

// یک نشست مشترک برای صفحهٔ ورود ادمین و API پنل.
// با یک نمونهٔ واحد، وضعیت ورود بین /admin و /admin/api حفظ می‌شود.
module.exports = session({
  secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,
    httpOnly: true,
    sameSite: "lax",
    // پشت پروکسی (trust proxy) فقط روی اتصال https کوکی secure می‌شود؛ روی http محلی ورود همچنان کار می‌کند.
    secure: process.env.NODE_ENV === "production" ? "auto" : false,
  },
});
