const express = require("express");
const router = express.Router();
const path = require("path");

const requireAdmin = require("../middleware/adminAuth");
const adminSession = require("../middleware/adminSession");

// فرم ورود ادمین ممکن است JSON یا form-urlencoded ارسال کند.
router.use(express.json({ limit: "1mb" }));
router.use(express.urlencoded({ extended: true }));
router.use(adminSession);

// فایل‌های پنل نباید از کش مرورگر یا CDN خوانده شوند؛ وگرنه تغییرات فرم
// مدیریت با نسخهٔ قدیمی نمایش داده می‌شوند.
router.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});

router.get("/", (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect("/admin/products");
  }
  return res.redirect("/admin/login");
});

router.get("/login", (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect("/admin/products");
  }
  res.sendFile(path.join(__dirname, "../../views/admin-login.html"));
});

// ورود ادمین: حداکثر ۸ تلاش در ۱۵ دقیقه از هر IP؛ مقایسهٔ رمز با زمان ثابت؛ شناسهٔ نشست پس از ورود عوض می‌شود.
const crypto = require("crypto");
const { rateLimit } = require("../middleware/security");
const adminLoginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, message: "تلاش برای ورود زیاد بود؛ ۱۵ دقیقهٔ دیگر دوباره امتحان کنید" });
const safeEqual = (a, b) => {
  const x = crypto.createHash("sha256").update(String(a)).digest();
  const y = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};

// قفل کلی: سقف IP را می‌شود با IPهای زیاد دور زد؛ بعد از ۳۰ رمز اشتباه در ۱۵ دقیقه (از هر جایی)، ورود ادمین ۱۵ دقیقه بسته می‌شود.
const GLOBAL_FAIL_MAX = 30;
const GLOBAL_FAIL_WINDOW_MS = 15 * 60 * 1000;
let globalFails = [];
const recentGlobalFails = () => (globalFails = globalFails.filter((time) => Date.now() - time < GLOBAL_FAIL_WINDOW_MS));
if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length < 12) console.warn("⚠️ ADMIN_PASSWORD کوتاه است؛ رمزی تصادفی با دست‌کم ۱۶ نویسه بگذارید.");

router.post("/login", adminLoginLimiter, (req, res) => {
  const password = typeof req.body.password === "string" ? req.body.password.slice(0, 500) : "";
  if (recentGlobalFails().length >= GLOBAL_FAIL_MAX) {
    console.warn(`[admin-login] locked ip=${req.ip}`);
    return res.status(429).json({ success: false, message: "ورود ادمین به‌دلیل تلاش‌های ناموفق زیاد موقتاً بسته است؛ ۱۵ دقیقهٔ دیگر دوباره امتحان کنید" });
  }
  if (!process.env.ADMIN_PASSWORD) {
    console.error("ADMIN_PASSWORD در .env تنظیم نشده است");
    return res.status(500).json({ success: false, message: "ورود ادمین پیکربندی نشده است" });
  }
  if (password && safeEqual(password, process.env.ADMIN_PASSWORD)) {
    // شناسهٔ نشست تازه (جلوگیری از session fixation)
    return req.session.regenerate((regenError) => {
      if (regenError) return res.status(500).json({ success: false, message: "نشست ورود ذخیره نشد؛ دوباره تلاش کنید" });
      req.session.isAdmin = true;
      return req.session.save((error) => {
        if (error) return res.status(500).json({ success: false, message: "نشست ورود ذخیره نشد؛ دوباره تلاش کنید" });
        console.log(`[admin-login] success ip=${req.ip}`);
        return res.json({ success: true });
      });
    });
  }
  globalFails.push(Date.now());
  console.warn(`[admin-login] failed ip=${req.ip} ua=${String(req.get("user-agent") || "").slice(0, 80)}`);
  return res
    .status(401)
    .json({ success: false, message: "رمز عبور اشتباه است" });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("pl.admin");
    res.json({ success: true });
  });
});

router.get("/products", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../../views/admin-products.html"));
});

router.get("/customers", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../../views/admin-customers.html"));
});

router.get("/wallets", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../../views/admin-wallets.html"));
});

router.get("/orders", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../../views/admin-orders.html"));
});

router.get("/discounts", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../../views/admin-discounts.html"));
});

router.get("/shipping", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../../views/admin-shipping.html"));
});

router.get("/ai", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../../views/admin-ai-settings.html"));
});

router.get("/home-sections", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../../views/admin-home-sections.html"));
});

router.get("/support", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../../views/admin-support.html"));
});

router.get("/contact-messages", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../../views/admin-contact-messages.html"));
});

router.get("/reviews", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../../views/admin-reviews.html"));
});

router.get("/ai-products", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../../views/admin-ai-products.html"));
});

router.get("/analytics", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../../views/admin-analytics.html"));
});

module.exports = router;
