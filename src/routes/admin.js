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

router.post("/login", (req, res) => {
  const { password } = req.body;
  if (!process.env.ADMIN_PASSWORD) {
    return res
      .status(500)
      .json({
        success: false,
        message: "ADMIN_PASSWORD در .env تنظیم نشده است",
      });
  }
  if (password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return req.session.save((error) => {
      if (error) return res.status(500).json({ success: false, message: "نشست ورود ذخیره نشد؛ دوباره تلاش کنید" });
      return res.json({ success: true });
    });
  }
  return res
    .status(401)
    .json({ success: false, message: "رمز عبور اشتباه است" });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get("/products", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../../views/admin-products.html"));
});

router.get("/customers", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../../views/admin-customers.html"));
});

router.get("/orders", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../../views/admin-orders.html"));
});

router.get("/discounts", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../../views/admin-discounts.html"));
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
