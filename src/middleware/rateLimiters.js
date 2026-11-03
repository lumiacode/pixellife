// محدودیت تعداد تلاش برای ورود ادمین، ورود کاربران و ارسال کد (OTP). حافظهٔ پروسه‌ای (برای pm2 تک‌نمونه کافی است).
// مقدارها با متغیرهای RATE_* در .env قابل تغییرند. پشت nginx باید X-Forwarded-For درست ارسال شود (app.set("trust proxy", 1) فعال است).
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const num = (name, fallback) => {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};
const MESSAGE = { success: false, message: "تعداد تلاش‌ها زیاد است؛ چند دقیقه بعد دوباره امتحان کنید." };
const ipKey = (req) => ipKeyGenerator(req.ip || "");

function limiter({ windowMs, max, keyGenerator = ipKey, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs, limit: max, keyGenerator, skipSuccessfulRequests,
    standardHeaders: "draft-7", legacyHeaders: false,
    handler: (req, res) => res.status(429).json(MESSAGE),
  });
}

const mobileKey = (req) => {
  const raw = String((req.body && (req.body.identifier || req.body.mobile || req.body.phone)) || "").replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/\D/g, "");
  return raw ? `m:${raw.slice(-10)}` : `ip:${ipKey(req)}`;
};

module.exports = {
  // ورود با رمز/کد و بازنشانی رمز: برای هر IP
  authAttemptLimiter: limiter({ windowMs: 15 * 60 * 1000, max: num("RATE_LOGIN_PER_15MIN", 20) }),
  // ارسال کد پیامکی: برای هر شمارهٔ موبایل (جلوگیری از بمباران پیامکی و هزینهٔ پیامک) و برای هر IP
  otpMobileLimiter: limiter({ windowMs: 10 * 60 * 1000, max: num("RATE_OTP_PER_10MIN", 5), keyGenerator: mobileKey }),
  otpIpLimiter: limiter({ windowMs: 10 * 60 * 1000, max: num("RATE_OTP_IP_PER_10MIN", 20) }),
  // ورود ادمین: فقط تلاش‌های ناموفق شمرده می‌شوند
  adminLoginLimiter: limiter({ windowMs: 15 * 60 * 1000, max: num("RATE_ADMIN_LOGIN_PER_15MIN", 8), skipSuccessfulRequests: true }),
};
