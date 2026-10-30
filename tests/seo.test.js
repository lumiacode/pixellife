// سئو: متای اختصاصی هر محصول، ریدایرکت ۳۰۱ آدرس قدیمی، JSON-LD، noindex صفحه‌های خصوصی، robots (مدل و کنترلر ساختگی).
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const src = (...p) => path.join(__dirname, "..", "src", ...p);
const view = (name) => fs.readFileSync(path.join(__dirname, "..", "views", name), "utf8");
const stub = (file, exports) => { const p = require.resolve(file); require.cache[p] = { id: p, filename: p, loaded: true, exports }; };

process.env.JWT_SECRET = "s"; process.env.MONGO_URI = "mongodb://x";
const ID = "a".repeat(24);
const products = [
  { _id: ID, slug: "iphone-17", name: "گوشی موبایل اپل مدل iPhone 17 Pro Max", brand: "اپل", category: "موبایل", price: 50000000, discount: 10, description: "<p>توضیح کامل و <b>جذاب</b> محصول</p>", images: ["/uploads/a.jpg", "https://cdn.x/b.jpg"], mainImage: "/uploads/a.jpg", stock: 3, availability: "in", rating: 4.5, reviewCount: 12, technicalSpecs: [{ title: "نمایشگر", items: [{ label: "اندازه", value: "۶٫۹ اینچ" }] }] },
  { _id: "c".repeat(24), slug: "galaxy-s26", name: "گوشی سامسونگ گلکسی S26", brand: "سامسونگ", category: "موبایل", price: 40000000, discount: 0, stock: 4, availability: "in", featured: true, images: [] },
  { _id: "b".repeat(24), slug: "cable-x", name: "کابل ناموجود", brand: "اپل", category: "کابل", price: 300000, discount: 0, stock: 0, availability: "out", images: [] },
];
stub(src("models", "Product.js"), { find: () => { const q = { select: () => q, sort: () => q, limit: () => q, lean: async () => products }; return q; }, findOne: (filter) => { const or = filter.$or || []; const hit = products.find((p) => or.some((c) => (c.slug && c.slug === p.slug) || (c.legacyId && c.legacyId === p.legacyId) || (c._id && c._id === p._id))); const q = { select: () => q, lean: async () => (hit ? { ...hit } : null) }; return q; } });
stub(src("controllers", "homeController.js"), {
  product: (req, res) => res.type("html").send(view("product.html")),
});

const express = require("express");
const { seoMiddleware, robotsTxt, setCatalogLoader } = require(src("services", "seo.js"));
setCatalogLoader(async (f) => (f.brand === "اپل" ? [{ slug: "iphone-17", name: "آیفون ۱۷", mainImage: "/uploads/a.jpg" }] : []));
const productPage = require(src("routes", "productPage.js"));
const { clearProductCaches } = require(src("services", "cacheBus.js"));
const app = express();
app.use(seoMiddleware);
app.get("/product", productPage.legacyProductHandler);
app.use("/product", productPage);
app.get("/iphone", (req, res) => res.type("html").send(view("iphone.html")));
app.get("/samsung", (req, res) => res.type("html").send(view("iphone.html")));
app.get("/cart", (req, res) => res.type("html").send(view("cart.html")));
app.get("/blog", (req, res) => res.type("html").send(view("index.html")));
app.get("/", (req, res) => res.type("html").send(view("index.html")));
app.get("/api/ping", (req, res) => res.json({ ok: true }));
app.get("/admin/products", (req, res) => res.type("html").send(view("admin-products.html")));

(async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (p, opts) => fetch(base + p, { redirect: "manual", ...opts });
  const count = (html, re) => (html.match(re) || []).length;
  try {
    // صفحهٔ محصول
    let r = await get("/product/iphone-17");
    assert.strictEqual(r.status, 200);
    let html = await r.text();
    assert.strictEqual(count(html, /<title>/g), 1, "یک عنوان");
    assert.ok(/<title>خرید گوشی موبایل اپل مدل iPhone 17 Pro Max \| پیکسل لایف<\/title>/.test(html));
    assert.ok(html.includes('<link rel="canonical" href="https://pixellife.ir/product/iphone-17" />'));
    assert.ok(/<meta name="description" content="[^"]*توضیح کامل و جذاب محصول/.test(html), "توضیح بدون تگ HTML");
    assert.ok(html.includes('property="og:type" content="product"') && html.includes('property="og:image" content="https://pixellife.ir/uploads/a.jpg"'));
    const ld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const product = ld.find((d) => d["@type"] === "Product");
    assert.strictEqual(product.offers.price, "450000000", "قیمت نهایی تومان×۱۰ = ریال");
    assert.strictEqual(product.offers.priceCurrency, "IRR");
    assert.strictEqual(product.offers.availability, "https://schema.org/InStock");
    assert.strictEqual(product.aggregateRating.reviewCount, 12);
    assert.ok(ld.some((d) => d["@type"] === "BreadcrumbList"));
    assert.ok(/<main[^>]*id="pageBody"[^>]*>\s*<article id="seoProduct"[\s\S]*<h1 itemprop="name">گوشی موبایل اپل/.test(html), "متن محصول در HTML سرور");
    assert.ok(html.includes("اندازه: ۶٫۹ اینچ"), "مشخصات در HTML");

    // پاک‌کردن توضیح در ادمین: بعد از ذخیره، متن قدیمی همان لحظه ناپدید شود (کش پاک می‌شود)
    products[0].description = "";
    html = await (await get("/product/iphone-17")).text();
    assert.ok(html.includes("توضیح کامل و جذاب محصول"), "تا قبل از پاک‌شدن کش، نسخهٔ کش‌شده می‌ماند");
    clearProductCaches();
    html = await (await get("/product/iphone-17")).text();
    assert.ok(!html.includes("توضیح کامل و جذاب محصول"), "بعد از ذخیرهٔ ادمین، توضیح قدیمی نمایش داده نمی‌شود");

    // ناموجود
    html = await (await get("/product/cable-x")).text();
    assert.ok(html.includes("https://schema.org/OutOfStock"));

    // آدرس قدیمی → ۳۰۱
    r = await get(`/product?id=${ID}&color=red`);
    assert.strictEqual(r.status, 301);
    assert.strictEqual(r.headers.get("location"), "/product/iphone-17?color=red");
    r = await get("/product?id=iphone-17");
    assert.strictEqual(r.status, 301);

    // محصول نامعتبر → ۴۰۴ و noindex
    r = await get("/product/does-not-exist");
    assert.strictEqual(r.status, 404);
    html = await r.text();
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow" />'));
    assert.strictEqual(count(html, /id="seoProduct"/g), 0);

    // صفحهٔ دسته‌بندی ثابت
    html = await (await get("/iphone")).text();
    assert.strictEqual(count(html, /<title>/g), 1);
    assert.ok(html.includes("<title>خرید آیفون اپل"));
    assert.ok(html.includes('<link rel="canonical" href="https://pixellife.ir/iphone" />'));
    assert.strictEqual(count(html, /rel="canonical"/g), 1);
    assert.ok(html.includes("BreadcrumbList"));

    // فهرست نمایشی سئو در پایین صفحه‌ها وجود ندارد
    for (const path of ["/iphone", "/samsung", "/", "/cart"]) {
      html = await (await get(path)).text();
      assert.ok(!html.includes('class="seo-list"') && !html.includes("فهرست محصولات:") && !html.includes("دسته‌بندی‌های دیگر"), "فهرست سئو در " + path);
    }

    // صفحهٔ اصلی: Organization + WebSite
    html = await (await get("/")).text();
    assert.ok(html.includes('"@type":"Organization"') && html.includes('"@type":"WebSite"') && html.includes("SearchAction"));
    assert.strictEqual(count(html, /<title>/g), 1);

    // صفحه‌های خصوصی و تکراری
    html = await (await get("/cart")).text();
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow" />'));
    html = await (await get("/blog")).text();
    assert.ok(/<link rel="canonical" href="https:\/\/pixellife\.ir\/" \/>/.test(html) && html.includes("noindex, follow"));
    r = await get("/admin/products");
    assert.ok(/noindex/.test(r.headers.get("x-robots-tag") || ""));

    const robots = robotsTxt();
    assert.ok(robots.includes("Sitemap: https://pixellife.ir/sitemap.xml") && robots.includes("Disallow: /admin") && robots.includes("Disallow: /cart"));
    // صفحهٔ دسته‌بندی: لینک محصول واقعی + ItemList در HTML سرور
    r = await get("/iphone"); html = await r.text();
    assert.ok(/<section id="seoCatalog"[\s\S]*href="\/product\/iphone-17"/.test(html), "لینک محصول در صفحهٔ دسته");
    assert.ok(html.includes('"@type":"ItemList"'), "ItemList");
    assert.strictEqual(count(html, /<link rel="canonical"/g), 1);
    // دسته‌ای که محصول ندارد چیزی نمی‌سازد (بدون داده ساختگی)
    r = await get("/samsung"); html = await r.text();
    assert.ok(!html.includes("seoCatalog"), "بدون محصول، بدون بلوک");
    // هدر noindex برای API و صفحه‌های خصوصی
    r = await get("/api/ping"); assert.strictEqual(r.headers.get("x-robots-tag"), "noindex, nofollow");
    r = await get("/cart"); assert.strictEqual(r.headers.get("x-robots-tag"), "noindex, nofollow");
    r = await get("/iphone"); assert.strictEqual(r.headers.get("x-robots-tag"), null);
    console.log("SEO tests passed.");
  } finally { server.close(); }
})().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
