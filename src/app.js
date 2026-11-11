const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const express = require("express");
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
const { seoMiddleware, robotsTxt, PAGES, SITE_URL, absoluteUrl, sitemapPaths } = require("./services/seo");
const { authSessionScript } = require("./middleware/authSessionScript");
const adminSession = require("./middleware/adminSession");

const Product = require("./models/Product");

const { securityHeaders, sanitizeInput, hideServerErrors } = require("./middleware/security");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
// هدرهای امنیتی برای همهٔ پاسخ‌ها (صفحه، API و فایل استاتیک)
app.use(securityHeaders);

// بدنهٔ JSON و کوکیِ ورود باید پیش از همهٔ APIها خوانده شوند.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// حذف کلیدهای $… از ورودی (تزریق به MongoDB) و پنهان‌کردن متن خام خطاهای ۵۰۰ از کاربر
app.use(sanitizeInput);
app.use(hideServerErrors);

app.set("etag", "strong");

// فشرده‌سازی پاسخ‌ها (HTML، JSON، CSS، JS)؛ قبلاً داخل بلوک کامنت‌شدهٔ «به‌روزرسانی» مانده بود.
app.use(compression({ threshold: 1024 }));

// یک دامنهٔ اصلی: www.pixellife.ir همیشه با ۳۰۱ به pixellife.ir می‌رود (فقط بر اساس Host؛ پروتکل را nginx کنترل می‌کند).
app.use((req, res, next) => {
  const host = String(req.headers.host || "");
  if (/^www\.pixellife\.ir(:\d+)?$/i.test(host)) return res.redirect(301, `${SITE_URL}${req.originalUrl}`);
  next();
});

// سئوی یکپارچه: عنوان/توضیح/canonical/JSON-LD برای همهٔ صفحه‌های HTML (محصول‌های جدید هم خودکار).
app.use(seoMiddleware);
app.use(authSessionScript);
// پاسخ‌های شخصی (حساب، آدرس، سفارش، پرداخت، کیف پول) و صفحه‌های پرداخت/پروفایل هرگز کش نشوند؛
// وگرنه با دکمهٔ «بازگشت» مرورگر بعد از خروج، اطلاعات قبلی دوباره دیده می‌شد.
const privateNoStore = (req, res, next) => { res.set("Cache-Control", "no-store"); next(); };
app.use(["/api/auth", "/api/addresses", "/api/orders", "/api/checkout", "/api/payments", "/api/wallet", "/checkout", "/profile"], privateNoStore);
// هر درخواستی که با نشست کاربر (کوکی یا هدر Authorization) آمده، پاسخش شخصی است: هیچ کش مشترکی (CDN، nginx، پروکسی) نباید آن را نگه دارد
// و به کاربر دیگری بدهد. Vary: Cookie هم برای همهٔ پاسخ‌های API ثبت می‌شود تا کش‌ها کوکی را در کلید کش بگیرند.
app.use("/api", (req, res, next) => {
  res.vary("Cookie");
  res.vary("Authorization");
  if (/(?:^|;\s*)token=/.test(req.headers.cookie || "") || req.headers.authorization) {
    res.set({
      "Cache-Control": "private, no-store, max-age=0",
      "CDN-Cache-Control": "no-store",
      "Cloudflare-CDN-Cache-Control": "no-store",
      "Surrogate-Control": "no-store",
    });
  }
  next();
});

if (env.nodeEnv !== "production") {
  console.warn("⚠️ NODE_ENV روی production نیست؛ کش صفحه‌ها و فایل‌های استاتیک غیرفعال است. در سرور واقعی NODE_ENV=production بگذارید.");
}

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
        // آدرسی که pl_rev دارد با تغییر محتوا عوض می‌شود (homeController)، پس کش بلندمدت امن است.
        // بدون pl_rev همچنان هر بار اعتبارسنجی می‌شود؛ ETag فقط در صورت تغییر، نسخهٔ تازه را دانلود می‌کند.
        if (res.req && res.req.query && res.req.query.pl_rev) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else {
          res.setHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");
        }
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
const checkoutRoutes = require("./routes/checkout");
const adminRoutes = require("./routes/admin");
const adminApiRoutes = require("./routes/adminApi");
const adminAiProductsRoutes = require("./routes/adminAiProducts");
const productRoutes = require("./routes/products");
const productPageRoutes = require("./routes/productPage");
const aiAssistantRoutes = require("./routes/aiAssistant");
const {
  router: balePaymentRoutes,
  configureWebhook: configureBaleWebhook,
} = require("./routes/balePayments");
const zarinpalPaymentRoutes = require("./routes/zarinpalPayments");

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
app.use("/api/checkout", checkoutRoutes);
app.use("/api/payments", balePaymentRoutes);
app.use("/api/payments/zarinpal", zarinpalPaymentRoutes);
app.use("/api/wallet", require("./routes/wallet"));

// Admin Panel
// محصولات صفحهٔ اصلی (پنل ادمین): فقط با نشست ادمین؛ قبل از adminApi سوار می‌شود.
app.use(
  "/admin/api/home-sections",
  adminSession,
  (req, res, next) => (req.session && req.session.isAdmin ? next() : res.status(401).json({ success: false, message: "ابتدا وارد شوید" })),
  require("./routes/adminHomeSections"),
);
app.use("/admin/api", adminApiRoutes);
app.use("/admin/api/ai", adminAiProductsRoutes);
app.use("/admin", adminRoutes);
// Products API
app.use("/api/products", productRoutes);
app.use("/api/analytics", analyticsRoutes);

// Product SEO Pages
app.use("/product", productPageRoutes);


// =======================
// Sitemap
// =======================

let sitemapCache = { xml: "", expiresAt: 0 };
const SITEMAP_TTL_MS = 60 * 60 * 1000;

app.get("/robots.txt", (req, res) => {
  res.type("text/plain").set("Cache-Control", "public, max-age=3600").send(robotsTxt());
});

app.get("/sitemap.xml", async (req, res) => {
  try {
    res.header("Content-Type", "application/xml");
    if (sitemapCache.xml && sitemapCache.expiresAt > Date.now()) return res.send(sitemapCache.xml);

    const sitemap = new SitemapStream({ hostname: SITE_URL });

    // صفحه‌های ثابت (خانه، دسته‌بندی‌ها، قوانین و تماس)
    // دسته‌هایی که هنوز محصولی ندارند در نقشهٔ سایت نمی‌آیند (صفحهٔ خالی = Soft 404).
    (await sitemapPaths()).forEach((url) => {
      sitemap.write({ url, changefreq: url === "/" || url === "/amazing" ? "daily" : "weekly", priority: url === "/" ? 1 : /^\/(terms|contact)$/.test(url) ? 0.3 : 0.7 });
    });

    // همهٔ محصولات (هر محصول جدید خودکار اضافه می‌شود) با تاریخ به‌روزرسانی و تصویر
    const products = await Product.find({}).select("slug updatedAt images mainImage").lean();
    products.forEach((product) => {
      if (!product.slug) return;
      const images = [product.mainImage, ...(Array.isArray(product.images) ? product.images : [])].map(absoluteUrl).filter(Boolean);
      sitemap.write({
        url: `/product/${encodeURIComponent(product.slug)}`,
        changefreq: "weekly",
        priority: 0.8,
        ...(product.updatedAt ? { lastmod: new Date(product.updatedAt).toISOString() } : {}),
        ...(images.length ? { img: [...new Set(images)].slice(0, 5).map((url) => ({ url })) } : {}),
      });
    });

    sitemap.end();

    const xml = (await streamToPromise(sitemap)).toString();
    sitemapCache = { xml, expiresAt: Date.now() + SITEMAP_TTL_MS };

    res.send(xml);
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
  const wantsHtml = req.method === "GET" && !req.path.startsWith("/api") && /text\/html/i.test(String(req.headers.accept || ""));
  if (wantsHtml) {
    // صفحهٔ ۴۰۴ ساده برای مرورگر/خزنده؛ ایندکس نمی‌شود.
    return res.status(404).set("X-Robots-Tag", "noindex, nofollow").type("html").send(
      '<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>صفحه پیدا نشد | پیکسل لایف</title></head><body style="font-family:Vazirmatn,Tahoma,sans-serif;text-align:center;padding:60px 16px"><h1>صفحهٔ مورد نظر پیدا نشد</h1><p>ممکن است آدرس تغییر کرده یا صفحه حذف شده باشد.</p><p><a href="/">بازگشت به صفحهٔ اصلی</a></p></body></html>'
    );
  }
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

// هر دقیقه سفارش‌های پرداخت‌نشدهٔ سررسیدشده (۱۰ دقیقه) لغو می‌شوند.
const { expireOverdue } = require("./services/orderExpiry");
setInterval(() => {
  expireOverdue().catch((error) => console.error("expireOverdue sweep error:", error.message));
}, 60 * 1000).unref();

app.listen(PORT, () => {
  console.log(`✅ PixelLife Server running on port ${PORT}`);
  console.log(`📱 Products API: http://localhost:${PORT}/api/products`);
  console.log(`🛒 Product Pages: http://localhost:${PORT}/product/:slug`);
});
