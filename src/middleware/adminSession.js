const session = require("express-session");

// یک نشست مشترک برای صفحهٔ ورود ادمین و API پنل.
// با یک نمونهٔ واحد، وضعیت ورود بین /admin و /admin/api حفظ می‌شود.
// بدون رمز ثابت در کد: اگر SESSION_SECRET تنظیم نشده باشد، از JWT_SECRET (که الزامی است) یک کلید جدا مشتق می‌شود.
const crypto = require("crypto");
const secret = process.env.SESSION_SECRET
  || (process.env.JWT_SECRET ? crypto.createHash("sha256").update("pl-admin-session:" + process.env.JWT_SECRET).digest("hex") : crypto.randomBytes(32).toString("hex"));

module.exports = session({
  name: "pl.admin",
  secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,
    httpOnly: true,
    sameSite: "lax",
    // روی HTTPS (پشت nginx با trust proxy) کوکی فقط با اتصال امن فرستاده می‌شود
    secure: "auto",
  },
});
