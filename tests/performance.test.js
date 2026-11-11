// نگهبان بهینه‌سازی‌های سرعت: تصویر اصلی سبک، بدون جابه‌جایی چیدمان در بنر و لیست‌ها، CSS کوچک درون‌خطی و پیش‌بارگذاری فونت.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const size = (file) => fs.statSync(path.join(root, "public", file)).size;

const index = read("views/index.html");
const controller = read("src/controllers/homeController.js");

// تصویر اصلی صفحه (LCP): WebP سبک، با preload و اولویت بالا؛ نسخهٔ JPG سنگین دیگر بارگذاری نمی‌شود
assert.ok(!/iphone-duo-hero-(mobile|desktop)\.jpg/.test(index), "بنر اصلی نباید JPG باشد");
assert.ok(/<link rel="preload" as="image" href="\/images\/iphone-duo-hero-mobile\.webp"[^>]*fetchpriority="high"/.test(index));
assert.ok(/<img src="\/images\/iphone-duo-hero-desktop\.webp"[^>]*fetchpriority="high"/.test(index));
assert.ok(size("images/iphone-duo-hero-mobile.webp") < 60 * 1024, "بنر موبایل زیر ۶۰ کیلوبایت");
assert.ok(size("images/iphone-duo-hero-desktop.webp") < 90 * 1024, "بنر دسکتاپ زیر ۹۰ کیلوبایت");
// بنرهای بعدی تنبل بارگذاری می‌شوند
assert.ok(/iphone-waterfall-hero-desktop\.webp"[^>]*loading="lazy"/.test(index));
// لوگوهای کوچک، فایل کوچک
assert.ok(size("images/trust/ecunion-logo.webp") < 12 * 1024 && size("images/brand-nokia.webp") < 20 * 1024);
for (const file of ["views/index.html", "views/partials/footer.html", "src/controllers/homeController.js"]) assert.ok(!read(file).includes("ecunion-logo.png"), file);

// بنر: جای اسلایدها فقط با transform عوض می‌شود (تغییر order = جابه‌جایی چیدمان در هر اسلاید خودکار)
assert.ok(index.includes('item.style.order = "0";') && /item\.style\.transform = "translateX\(calc\(\(100% \+ var\(--hero-gap, 0px\)\) \* " \+ \(rel \+ 2 - i\)/.test(index));
assert.ok(!index.includes("item.style.order = String(rel)"));
// لیست محصولات: تا رسیدن داده، جای فهرست رزرو است
assert.ok(/data-database-catalog="loading"\]\)\{min-height:110vh\}/.test(controller));

assert.ok(controller.includes(".pl-catalog-layout{min-height:100vh}"));
assert.ok(read("public/js/database-catalog-amazing-v1.js").includes("activeFilters.hidden = true;") && read("public/js/database-catalog-amazing-v1.js").includes('fetchpriority="high"'));
assert.ok(index.includes("#featuredChips[hidden] { display: flex; visibility: hidden; }"));
// CSS کوچک درون‌خطی، فونت اصلی preload، دادهٔ دسته‌ها بدون درخواست جدا
assert.ok(controller.includes("function inlineSmallCss") && controller.includes("INLINE_CSS_MAX_BYTES = 4096"));
assert.ok(controller.includes('rel="preload" as="font" type="font/woff2" href="/fonts/vazirmatn-arabic.woff2" crossorigin'));
assert.ok(controller.includes('id="pl-category-data"'));
// فونت: woff2 با font-display: swap
const fonts = read("public/css/local-fonts.css");
assert.ok((fonts.match(/font-display:\s*swap/g) || []).length === 2 && (fonts.match(/format\("woff2"\)/g) || []).length === 2);
// ایندکس مرتب‌سازی بر اساس تاریخ
assert.ok(read("src/models/Product.js").includes("productSchema.index({ createdAt: -1 })"));
// فشرده‌سازی و کش فایل‌های ثابت
const app = read("src/app.js");
assert.ok(app.includes("app.use(compression(") && app.includes("max-age=31536000, immutable") && app.includes("max-age=2592000"));
console.log("Performance guard test passed.");
