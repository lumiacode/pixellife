const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const express = require("express");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const path = require("path");
const session = require("express-session");
const connectDB = require("./db");
const env = require("./config/env");
const errorHandler = require("./middleware/errorHandler");
const visitTracker = require("./middleware/visitTracker");
const analyticsRoutes = require("./routes/analytics");

const { SitemapStream, streamToPromise } = require("sitemap");

const Product = require("./models/Product");

const app = express();

// بدنهٔ JSON و کوکیِ ورود باید پیش از همهٔ APIها خوانده شوند.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set("etag", "strong");
app.set("trust proxy", 1);

// =======================
// Middleware
// =======================
//شروع به روز رسانی
/*
app.use(cors());
app.use(compression({ threshold: 1024 }));

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use(
  express.urlencoded({
    extended: true,
  }),
);

// فایل‌های استاتیک با کش بلندمدت برای کاهش زمان بارگذاری موبایل
app.use(
  express.static(path.join(__dirname, "../public"), {
    etag: true,
    lastModified: true,
    maxAge: process.env.NODE_ENV === "production" ? "7d" : 0,
    setHeaders(res, filePath) {
      if (/\.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?)$/i.test(filePath)) {
        res.setHeader(
          "Cache-Control",
          "public, max-age=2592000, stale-while-revalidate=86400",
        );
      } else if (/\.(?:css|js)$/i.test(filePath)) {
        res.setHeader(
          "Cache-Control",
          "public, max-age=604800, stale-while-revalidate=86400",
        );
      }
    },
  }),
);
// فایل‌های استاتیک قالب AdminLTE (فقط برای پنل ادمین)
app.use(
  "/vendor/adminlte",
  express.static(path.join(__dirname, "../node_modules/admin-lte/dist"), {
    etag: true,
    maxAge: process.env.NODE_ENV === "production" ? "7d" : 0,
  }),
);

// سشن برای ورود ادمین
app.use(
  session({
    secret: process.env.SESSION_SECRET || "pixellife-admin-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 8,
      httpOnly: true,
    },
  }),
);

// پیش از حالت تعمیرات اجرا می‌شود تا بازدید صفحات عمومی از دست نرود.
app.use(visitTracker);

// =======================
// Maintenance Mode (حالت بروزرسانی هوشمند)
// =======================

app.use((req, res, next) => {
  // ۱. اجازه دسترسی به پنل ادمین، API ها و فایل‌های استاتیک (عکس، CSS، JS)
  if (
    req.path.startsWith("/admin") ||
    req.path.startsWith("/api") ||
    req.path === "/contact" ||
    req.path === "/support" ||
    /\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2)$/.test(req.path)
  ) {
    return next();
  }

  // ۲. آدرس مخفی برای شما: اگر وارد آدرس pixellife.ir/?bypass=sasan1376 شدید
  if (req.query.bypass === "sasan1376") {
    // یک کوکی برای ۷ روز در مرورگر شما ذخیره می‌شود
    res.cookie("maintenance_bypass", "sasan1376", {
      maxAge: 604800000, // ۷ روز به میلی‌ثانیه
      httpOnly: true,
    });
    return next(); // اجازه دیدن سایت
  }

  // ۳. اگر کوکی در مرورگر وجود داشت (یعنی قبلا آدرس مخفی را زده‌اید)
  if (req.cookies && req.cookies.maintenance_bypass === "sasan1376") {
    return next(); // اجازه دیدن سایت
  }

  // ۴. برای بقیه مردم، صفحه بروزرسانی را نشان بده
  return res.send(`
    <!doctype html>
    <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>در حال بروزرسانی | پیکسل لایف</title>
        <style>body { overflow: hidden !important; height: 100vh !important; margin: 0; }</style>
      </head>
      <body>
        <div style="position: fixed; inset: 0; background: #f8fafc; z-index: 99999; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: Tahoma, sans-serif; text-align: center; padding: 20px;">
          <div style="background: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); max-width: 450px; border: 1px solid #e2e8f0;">
            <img src="/images/maintenance.png?v=4" alt="PixelLife" style="width: 120px; height: 120px; margin-bottom: 24px; object-fit: contain;">
            <h1 style="color: #3b82f6; font-size: 24px; font-weight: 800; margin-bottom: 16px;">سایت در حال بروزرسانی است</h1>
            <p style="color: #334155; font-size: 15px; line-height: 1.8; margin-bottom: 0;">
              تیم پیکسل‌لایف در حال بهبود و تکمیل فروشگاه است.<br>
              خیلی زود با تجربه‌ای بهتر برمی‌گردیم!
            </p>
          </div>
        </div>
      </body>
    </html>
  `);
});
*/
//پایان بستن کامنت  به روز رسانی

// فایل‌های عمومی سایت (اسکریپت لیست دسته‌بندی‌ها، CSS، عکس‌ها و فونت‌ها)
app.use(
  express.static(path.join(__dirname, "../public"), {
    etag: true,
    lastModified: true,
    maxAge: process.env.NODE_ENV === "production" ? "7d" : 0,
    setHeaders(res, filePath) {
      if (/\.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?)$/i.test(filePath)) {
        res.setHeader(
          "Cache-Control",
          "public, max-age=2592000, stale-while-revalidate=86400",
        );
      } else if (/\.(?:css|js)$/i.test(filePath)) {
        // تغییرات ظاهری و منطق سایت باید در همهٔ مرورگرها بلافاصله
        // اعتبارسنجی شوند؛ ETag فقط در صورت تغییر، نسخهٔ تازه را دانلود می‌کند.
        res.setHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");
      }
    },
  }),
);

// =======================
// MongoDB Connection
// =======================

connectDB();

// =======================
// Routes
// =======================

const homeRoutes = require("./routes/homeRoutes");
const authRoutes = require("./routes/authRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const addressRoutes = require("./routes/addressRoutes");
const orderRoutes = require("./routes/orders");
const adminRoutes = require("./routes/admin");
const adminApiRoutes = require("./routes/adminApi");
const adminAiProductsRoutes = require("./routes/adminAiProducts");
const productRoutes = require("./routes/products");
const productPageRoutes = require("./routes/productPage");
const testEmailRoutes = require("./routes/testEmail");
const aiAssistantRoutes = require("./routes/aiAssistant");
const {
  router: balePaymentRoutes,
  configureWebhook: configureBaleWebhook,
} = require("./routes/balePayments");

// Home Page
app.use("/", homeRoutes);
// Contact Page (تماس با ما)
app.get("/contact", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/contact.html"));
});
// Authentication
app.use("/api/auth", authRoutes);

// دستیار خرید هوشمند
app.use("/api/ai", aiAssistantRoutes);

// Reviews
app.use("/api/reviews", reviewRoutes);

// Addresses (آدرس‌های کاربر)
app.use("/api/addresses", addressRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", balePaymentRoutes);

// Admin Panel
app.use("/admin/api", adminApiRoutes);
app.use("/admin/api/ai", adminAiProductsRoutes);
app.use("/admin", adminRoutes);
// Products API
app.use("/api/products", productRoutes);
app.use("/api/analytics", analyticsRoutes);

// Product SEO Pages
app.use("/product", productPageRoutes);

// Test Email (موقت — بعد از تایید کارکرد حذف شود)
app.use("/api/test-email", testEmailRoutes);

// =======================
// Sitemap
// =======================

app.get("/sitemap.xml", async (req, res) => {
  try {
    const sitemap = new SitemapStream({
      hostname: "https://pixellife.ir",
    });

    // صفحه اصلی
    sitemap.write({
      url: "/",
      changefreq: "daily",
      priority: 1,
    });

    // محصولات MongoDB
    const products = await Product.find({});

    console.log("Sitemap Products:", products.length);

    products.forEach((product) => {
      if (product.slug) {
        sitemap.write({
          url: `/product/${product.slug}`,
          changefreq: "weekly",
          priority: 0.8,
        });
      }
    });

    sitemap.end();

    const xml = await streamToPromise(sitemap);

    res.header("Content-Type", "application/xml");

    res.send(xml.toString());
  } catch (error) {
    console.error("Sitemap Error:", error);

    res.status(500).send("Sitemap generation failed");
  }
});

// =======================
// Health Check
// =======================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "سرور PixelLife فعال است",
    timestamp: new Date().toISOString(),
  });
});

// =======================
// 404 Handler
// =======================

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "مسیر مورد نظر پیدا نشد",
  });
});

// =======================
// Error Handler
// =======================

app.use(errorHandler);

// =======================
// Start Server
// =======================

const PORT = env.port || 3000;

// پس از بالا آمدن سرویس، آدرس Webhook بله ثبت/به‌روزرسانی می‌شود.
configureBaleWebhook();

app.listen(PORT, () => {
  console.log(`✅ PixelLife Server running on port ${PORT}`);
  console.log(`📱 Products API: http://localhost:${PORT}/api/products`);
  console.log(`🛒 Product Pages: http://localhost:${PORT}/product/:slug`);
});
