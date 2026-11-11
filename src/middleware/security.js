// لایهٔ امنیتی مشترک: هدرهای امنیتی، پاک‌سازی ورودی، محدودیت تعداد درخواست و پنهان‌کردن جزئیات خطا.
// عمداً بدون بستهٔ جدید نوشته شده (helmet / express-rate-limit در package.json نیستند و روال انتشار سایت npm install اجرا نمی‌کند).

// ───────── هدرهای امنیتی (معادل تنظیمات اصلی helmet) ─────────
// CSP کامل (script-src) گذاشته نشده چون صفحه‌ها اسکریپت و استایل درون‌خطی زیادی دارند و می‌شکنند؛
// سه دستورِ بی‌خطر آن اعمال می‌شود: جلوگیری از قاب‌شدن سایت در دامنهٔ دیگر، قفل <base> و حذف پلاگین‌ها.
function securityHeaders(req, res, next) {
  res.removeHeader("X-Powered-By");
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
    "Permissions-Policy": "geolocation=(self), camera=(), microphone=(), payment=(self)",
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    "X-Permitted-Cross-Domain-Policies": "none",
  });
  // HSTS فقط روی اتصال امن معنی دارد (پشت nginx با trust proxy تشخیص داده می‌شود).
  if (req.secure) res.set("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  next();
}

// ───────── پاک‌سازی ورودی در برابر تزریق به MongoDB ─────────
// کلیدهایی که با $ شروع می‌شوند (مثل {"$ne": ""} یا {"$gt": ""}) از body/query/params حذف می‌شوند؛
// کلیدهای آلوده‌کنندهٔ prototype هم همین‌طور.
const BAD_KEY = (key) => key.startsWith("$") || key === "__proto__" || key === "constructor" || key === "prototype";
function scrub(value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 8) return value;
  if (Array.isArray(value)) { value.forEach((item) => scrub(item, depth + 1)); return value; }
  for (const key of Object.keys(value)) {
    if (BAD_KEY(key)) delete value[key];
    else scrub(value[key], depth + 1);
  }
  return value;
}
function sanitizeInput(req, res, next) {
  scrub(req.body); scrub(req.query); scrub(req.params);
  next();
}

// ───────── محدودیت تعداد درخواست (حافظهٔ همین پروسه) ─────────
// key(req) کلید شمارش را می‌دهد (پیش‌فرض IP). با عبور از سقف، ۴۲۹ و هدر Retry-After برمی‌گردد.
function rateLimit({ windowMs, max, key, message }) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, entry] of hits) if (entry.reset <= now) hits.delete(k);
  }, Math.min(windowMs, 60 * 1000));
  if (timer.unref) timer.unref();
  const limiter = (req, res, next) => {
    const now = Date.now();
    const id = String((key ? key(req) : req.ip) || "unknown").slice(0, 200);
    let entry = hits.get(id);
    if (!entry || entry.reset <= now) { entry = { count: 0, reset: now + windowMs }; hits.set(id, entry); }
    entry.count += 1;
    if (hits.size > 50000) hits.clear(); // سقف حافظه در حملهٔ پرحجم
    if (entry.count > max) {
      res.set("Retry-After", String(Math.max(1, Math.ceil((entry.reset - now) / 1000))));
      return res.status(429).json({ success: false, message: message || "تعداد درخواست‌ها زیاد است؛ چند دقیقهٔ دیگر دوباره تلاش کنید" });
    }
    next();
  };
  limiter.reset = () => hits.clear();
  return limiter;
}

// ───────── پنهان‌کردن جزئیات خطای سرور ─────────
// بعضی مسیرها خطای ۵۰۰ را با error.message (پیام خام دیتابیس/کتابخانه) برمی‌گردانند. برای مسیرهای عمومی،
// متن خطا در لاگ سرور می‌ماند و کاربر فقط پیام کلی می‌بیند. پنل ادمین (پس از ورود) پیام کامل را نگه می‌دارد.
const GENERIC_ERROR = "خطای سرور؛ لطفاً دوباره تلاش کنید";
function hideServerErrors(req, res, next) {
  if (req.path.startsWith("/admin")) return next();
  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500 && body && typeof body === "object" && !Array.isArray(body)) {
      const detail = body.error || body.message;
      if (detail) console.error(`[server-error] ${req.method} ${req.path}: ${String(detail).slice(0, 500)}`);
      const safe = { ...body, message: GENERIC_ERROR };
      delete safe.stack; delete safe.raw;
      if ("error" in safe) safe.error = GENERIC_ERROR;
      return json(safe);
    }
    return json(body);
  };
  next();
}

module.exports = { securityHeaders, sanitizeInput, rateLimit, hideServerErrors, GENERIC_ERROR, scrub };
