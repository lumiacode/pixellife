const express = require("express");
const router = express.Router();

router.use((req, res, next) => {
  res.set("Cache-Control", req.method === "GET" ? "no-cache, max-age=0, must-revalidate" : "no-store");
  next();
});

const Product = require("../models/Product");
const Order = require("../models/Order");
const { withApprovedReviewStats } = require("../services/reviewStats");
const { streamProductImage } = require("../utils/productImages");

const { onProductChange } = require("../services/cacheBus");
const catalogResponseCache = new Map();
const CATALOG_CACHE_TTL_MS = 15_000;
// کلید کش، آدرس درخواست است؛ بدون سقف، درخواست‌های انبوه با query تصادفی حافظه را پر می‌کرد.
const CATALOG_CACHE_MAX = 400;
function rememberCatalog(key, payload) {
  if (String(key).length > 600) return;
  if (catalogResponseCache.size >= CATALOG_CACHE_MAX) catalogResponseCache.clear();
  catalogResponseCache.set(key, { expiresAt: Date.now() + CATALOG_CACHE_TTL_MS, payload });
}

// پیشنهاد شگفت‌انگیز پس از زمان پایان، در خود دیتابیس هم غیرفعال شود.
async function moveCableAndChargerProductsToAccessories() {
  const mobileCategories = /^(?:موبایل|mobile|گوشی موبایل|گوشی|phone|لوازم جانبی موبایل|mobile accessories|accessories)$/i;
  const accessoryNames = /(کابل|شارژر|آداپتور|تبدیل|charger|adapter|cable)/i;
  await Product.updateMany(
    { category: mobileCategories, name: accessoryNames },
    { $set: { category: "کابل، شارژر و آداپتور" } },
  );
}

async function expireAmazingOffers() {
  await Product.updateMany(
    { amazingOffer: true, amazingOfferEndsAt: { $type: "date", $lte: new Date() } },
    { $set: { amazingOffer: false } },
  );
}

// این نگهداری‌ها نیاز به دو درخواست دیتابیس دارند؛ بیش از یک‌بار در دقیقه لازم نیست.
// فیلتر شگفت‌انگیز در خود کوئری‌ها هم زمان پایان را چک می‌کند، پس تأخیر کوتاه مشکلی نمی‌سازد.
const MAINTENANCE_INTERVAL_MS = 60_000;
let lastMaintenanceAt = 0;
router.use(async (req, res, next) => {
  if (Date.now() - lastMaintenanceAt >= MAINTENANCE_INTERVAL_MS) {
    lastMaintenanceAt = Date.now();
    try {
      await expireAmazingOffers();
      await moveCableAndChargerProductsToAccessories();
    } catch (error) {
      console.error("Amazing offer expiry error:", error);
    }
  }
  next();
});

const PRODUCT_CARD_FIELDS = [
  "name", "slug", "legacyId", "brand", "category", "price", "discount",
  "featured", "availability", "amazingOffer", "amazingOfferEndsAt", "images", "mainImage", "colors", "variants",
  "storages", "compatibleModels", "hasStorage", "rating", "reviewCount", "comingSoon", "stock",
  "createdAt", "updatedAt",
].join(" ");

function toBoolean(value) {
  return value === true || value === "true" || value === "1";
}

function safeLimit(value, fallback = 100) {
  const parsed = Number.parseInt(value, 10);
  return !Number.isFinite(parsed) || parsed <= 0 ? fallback : Math.min(parsed, 100);
}

function normalizeText(value) {
  return String(value || "").trim().replace(/[يى]/g, "ی").replace(/[ك]/g, "ک").replace(/\s+/g, " ");
}

function categoryPattern(category) {
  const normalized = normalizeText(category);
  const aliases = {
    "موبایل": [
      "موبایل",
      "mobile",
      "گوشی موبایل",
      "گوشی",
      "phone",
      "آیفون",
      "ایفون",
      "iphone",
      "گوشی اپل",
      "apple phone",
    ],
    "تبلت": ["تبلت", "tablet", "آیپد", "ایپد", "ipad", "ipad pro", "galaxy tab", "xiaomi pad", "redmi pad"],
    "لوازم جانبی موبایل": ["لوازم جانبی موبایل", "mobile accessories", "accessories", "کابل، شارژر و آداپتور", "کابل شارژ و آداپتور", "کابل و شارژر", "chargers", "cables", "chargers and adapters", "قاب و کاور", "قاب", "کاور", "قاب موبایل", "قاب گوشی", "case", "cases", "cover", "گلس و محافظ صفحه", "گلس", "محافظ صفحه", "screen protector", "کیف و جلد", "کیف", "جلد", "کیف موبایل", "کیف گوشی"],
    // زیرمجموعه‌های لوازم جانبی (صفحه‌های /accessories/<برند>/<نوع>): هر کدام فقط نام‌های خودش را می‌گیرد.
    "قاب و کاور": ["قاب و کاور", "قاب", "کاور", "قاب موبایل", "قاب گوشی", "case", "cases", "cover", "phone case"],
    "گلس و محافظ صفحه": ["گلس و محافظ صفحه", "گلس", "محافظ صفحه", "محافظ صفحه نمایش", "screen protector", "glass"],
    "کیف و جلد": ["کیف و جلد", "کیف", "جلد", "کیف موبایل", "کیف گوشی", "bag", "pouch"],
    "کابل، شارژر و آداپتور": ["کابل، شارژر و آداپتور", "کابل شارژ و آداپتور", "کابل و شارژر", "chargers", "cables", "chargers and adapters"],
    // محصولات کنسول در پنل‌های مختلف با نام‌های متفاوتی ثبت شده‌اند. همهٔ
    // نام‌های رایج سونی/پلی‌استیشن باید در صفحهٔ «کنسول بازی» دیده شوند.
    "کنسول بازی": [
      "کنسول بازی",
      "کنسول بازی سونی",
      "کنسول",
      "پلی استیشن",
      "پلی‌استیشن",
      "سونی پلی استیشن",
      "sony playstation",
      "playstation",
      "play station",
      "ps4",
      "ps5",
      "console",
      "gaming console",
      "xbox",
      "microsoft xbox",
      "ایکس باکس",
      "ایکس‌باکس",
      "مایکروسافت ایکس‌باکس",
    ],
    "هدفون و هندزفری": ["هدفون و هندزفری", "هدفون", "هندزفری", "هدفون بلوتوثی", "هندزفری بلوتوثی", "ایرپاد", "airpods", "headphones", "earphones", "earbuds"],
    "ساعت هوشمند": ["ساعت هوشمند", "ساعت", "اپل واچ", "apple watch", "گلکسی واچ", "galaxy watch", "smartwatch", "smart watch"],
  };
  const values = aliases[normalized] || [normalized];
  const escaped = values.map((value) => value.replace(/[.*+?^$()|[\]\\]/g, "\\$&"));
  return new RegExp("^\\s*(?:" + escaped.join("|") + ")\\s*$", "i");
}

function normalizeImagePath(value) {
  const image = String(value || "").trim();
  if (!image) return "";
  if (/^https?:\/\//i.test(image) || image.startsWith("data:")) return image;
  return "/" + image.replace(/^\/?(?:public\/)?/, "");
}

function serializeProduct(product) {
  const data = product.toObject ? product.toObject() : product;
  const images = (Array.isArray(data.images) ? data.images : []).map(normalizeImagePath).filter(Boolean);
  const mainImage = normalizeImagePath(data.mainImage);
  return { ...data, images, mainImage: mainImage || images[0] || "" };
}

router.get("/image/:id", (req, res) => {
  try {
    if (!streamProductImage(req.params.id, res, { width: req.query.w })) return res.status(404).end();
  } catch (_) {
    if (!res.headersSent) res.status(404).end();
  }
});

router.get("/", async (req, res) => {
  try {
    const cacheKey = req.originalUrl;
    const cached = catalogResponseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json(cached.payload);
    }
    if (cached) catalogResponseCache.delete(cacheKey);

    const filter = {};
    const { brand, category, featured, amazing, exclude, limit, sort, search } = req.query;

    if (search) {
      const normalizedSearch = normalizeText(search);
      if (/^(?:console|کنسول|پلی[‌\s-]*استیشن|play\s*station)$/i.test(normalizedSearch)) {
        // همانند صفحهٔ آیفون، برای کنسول به یک نام ثابت در پنل وابسته نیستیم.
        // محصول ممکن است با برند سونی یا دستهٔ متفاوت ثبت شده باشد.
        filter.$and = [{
          $or: [
            { name: { $regex: "کنسول|play\\s*station|پلی[‌\\s-]*استیشن|ps\\s*[45]", $options: "i" } },
            { brand: { $regex: "سونی|sony|play\\s*station|پلی[‌\\s-]*استیشن", $options: "i" } },
            { category: categoryPattern("کنسول بازی") },
          ],
        }];
      } else {
        const searchPattern = /^(?:iphone|آیفون|ایفون)$/i.test(normalizedSearch)
          ? "iphone|آیفون|ایفون"
          : normalizedSearch.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
        filter.name = { $regex: searchPattern, $options: "i" };
      }
    }

    if (brand) {
      const brandAliases = {
        "اپل": "اپل|apple",
        "apple": "اپل|apple",
        "سامسونگ": "سامسونگ|samsung",
        "samsung": "سامسونگ|samsung",
        "شیائومی": "شیائومی|xiaomi",
        "xiaomi": "شیائومی|xiaomi",
        "سونی": "سونی|sony|play\\s*station|پلی[‌\\s-]*استیشن|ps\\s*[45]",
        "sony": "سونی|sony|play\\s*station|پلی[‌\\s-]*استیشن|ps\\s*[45]",
        "playstation": "سونی|sony|play\\s*station|پلی[‌\\s-]*استیشن|ps\\s*[45]",
        "ps": "سونی|sony|play\\s*station|پلی[‌\\s-]*استیشن|ps\\s*[45]",
        "ایکس باکس": "ایکس[‌\\s-]*باکس|xbox|microsoft",
        "ایکس‌باکس": "ایکس[‌\\s-]*باکس|xbox|microsoft",
        "xbox": "ایکس[‌\\s-]*باکس|xbox|microsoft",
        "microsoft": "ایکس[‌\\s-]*باکس|xbox|microsoft",
      };
      const requestedBrand = normalizeText(brand).toLowerCase();
      // ورودی کاربر هرگز به‌عنوان الگوی خام regex به دیتابیس نمی‌رود (ReDoS).
      filter.brand = { $regex: brandAliases[requestedBrand] || normalizeText(brand).slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }

    if (category) {
      const normalizedCategory = normalizeText(category);
      if (normalizedCategory === "کنسول بازی") {
        // برخی محصولات قدیمی با دستهٔ آزاد ثبت شده‌اند، اما نامشان به‌وضوح
        // کنسول است. آن‌ها را نیز به صفحهٔ کنسول برگردان تا محصول پنل گم نشود.
        const consoleProducts = {
          $or: [
            { category: categoryPattern(category) },
            { name: { $regex: "کنسول|play\\s*station|پلی[‌\\s-]*استیشن|ps\\s*[45]", $options: "i" } },
          ],
        };
        filter.$and = Array.isArray(filter.$and) ? [...filter.$and, consoleProducts] : [consoleProducts];
      } else if (normalizedCategory === "موبایل") {
        // نام دسته در محصولات قدیمی همیشه یکسان نیست. گوشی‌های واقعی را از
        // روی عنوان مدل هم پیدا می‌کنیم، بدون اینکه لوازم جانبی وارد این لیست شوند.
        const mobileProducts = {
          $or: [
            { category: categoryPattern(category) },
            { name: { $regex: "^(?!.*(?:ipad|آیپد|ایپد|tablet|تبلت|galaxy\\s*tab|xiaomi\\s*pad|redmi\\s*pad))(?:گوشی\\s*موبایل|iphone|آیفون|ایفون|سامسونگ\\s*galaxy|samsung\\s*galaxy|شیائومی\\s*(?:mi|redmi|poco)?|xiaomi\\s*(?:mi|redmi|poco)?|redmi|poco)", $options: "i" } },
          ],
        };
        filter.$and = Array.isArray(filter.$and) ? [...filter.$and, mobileProducts] : [mobileProducts];
      } else {
        filter.category = categoryPattern(category);
      }
    }
    if (featured !== undefined) filter.featured = toBoolean(featured);
    if (amazing !== undefined) {
      const amazingEnabled = toBoolean(amazing);
      filter.amazingOffer = amazingEnabled;
      if (amazingEnabled) {
        filter.$or = [
          { amazingOfferEndsAt: { $exists: false } },
          { amazingOfferEndsAt: null },
          { amazingOfferEndsAt: { $gt: new Date() } },
        ];
      }
    }
    if (exclude && /^[a-f0-9]{24}$/i.test(String(exclude))) filter._id = { $ne: String(exclude) };

    const order = sort === "price-asc" ? { price: 1 } : sort === "price-desc" ? { price: -1 } : { amazingOffer: -1, featured: -1, createdAt: -1 };
    const products = await Product.find(filter).select(PRODUCT_CARD_FIELDS).sort(order).limit(safeLimit(limit)).lean();

    const payload = { success: true, products: await withApprovedReviewStats(products.map(serializeProduct)) };
    rememberCatalog(cacheKey, payload);
    res.json(payload);
  } catch (error) {
    console.error("Products catalog error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// پرفروش‌ترین‌ها: از سفارش‌های پرداخت‌شدهٔ ۱۲۰ روز اخیر؛ اگر داده کافی نبود، محبوب‌ترین‌ها بر اساس نظرات.
// فقط کالای موجود و غیر «به‌زودی»؛ stock محصول همیشه با مجموع تنوع‌ها هماهنگ نگه داشته می‌شود (inventory.js).
const IN_STOCK_FILTER = { comingSoon: { $ne: true }, availability: { $ne: "out" }, stock: { $gt: 0 } };
const BESTSELLERS_TTL_MS = 2 * 60_000;
let bestsellersCache = { expiresAt: 0, payload: null };
// پیشنهاد جستجو هنگام تایپ: چند محصول مطابق نام + دسته‌بندی‌های مرتبط (برای باز شدن مستقیم صفحهٔ محصول/دسته).
const SUGGEST_CATEGORY_LINKS = [
  { test: /^(?:موبایل|گوشی)/, href: "/mobiles" },
  { test: /تبلت/, href: "/tablets" },
  { test: /هدفون|هندزفری/, href: "/headphones" },
  { test: /ساعت/, href: "/smartwatches" },
  { test: /کنسول/, href: "/console" },
  { test: /کابل|شارژر|آداپتور/, href: "/accessories/chargers" },
  { test: /لوازم جانبی/, href: "/accessories" },
];
const SUGGEST_ALIASES = {
  iphone: "iphone|آیفون|ایفون", "آیفون": "iphone|آیفون|ایفون", "ایفون": "iphone|آیفون|ایفون",
  samsung: "samsung|سامسونگ", "سامسونگ": "samsung|سامسونگ",
  xiaomi: "xiaomi|شیائومی", "شیائومی": "xiaomi|شیائومی",
  apple: "apple|اپل", "اپل": "apple|اپل",
  sony: "sony|سونی", "سونی": "sony|سونی",
};
const suggestCache = new Map();
onProductChange(() => { catalogResponseCache.clear(); suggestCache.clear(); bestsellersCache = { expiresAt: 0, payload: null }; });
// همهٔ کلمه‌های جستجو باید در نام یا برند محصول باشند (ترتیب مهم نیست).
function suggestFilter(q) {
  const tokens = normalizeText(q).split(" ").filter(Boolean).slice(0, 5);
  return { $and: tokens.map((token) => ({ $or: [{ name: { $regex: tokenPattern(token), $options: "i" } }, { brand: { $regex: tokenPattern(token), $options: "i" } }] })) };
}
function tokenPattern(token) {
  const alias = SUGGEST_ALIASES[token.toLowerCase()];
  if (alias) return alias;
  return token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ی/g, "[یيى]").replace(/ک/g, "[کك]");
}
router.get("/suggest", async (req, res) => {
  try {
    const q = normalizeText(req.query.q).slice(0, 60);
    if (q.length < 2) return res.json({ success: true, products: [], categories: [] });
    const key = q.toLowerCase();
    const hit = suggestCache.get(key);
    if (hit && hit.expiresAt > Date.now()) return res.json(hit.payload);
    const filter = suggestFilter(q);
    const rows = await Product.find(filter).select("name slug brand category price discount mainImage images availability stock comingSoon").sort({ amazingOffer: -1, featured: -1, createdAt: -1 }).limit(24).lean();
    const products = rows.slice(0, 6).map((p) => ({
      name: p.name, slug: p.slug || String(p._id), brand: p.brand || "", category: p.category || "",
      image: p.mainImage || (Array.isArray(p.images) ? p.images[0] : "") || "",
      price: Math.round((Number(p.price) || 0) * (100 - Math.min(99, Math.max(0, Number(p.discount) || 0))) / 100),
      unavailable: p.availability === "out" || Number(p.stock) <= 0 || p.comingSoon === true,
    }));
    const seen = new Set();
    const categories = [];
    for (const row of rows) {
      const name = String(row.category || "").trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const link = SUGGEST_CATEGORY_LINKS.find((item) => item.test.test(name));
      if (link) categories.push({ name, href: link.href });
      if (categories.length >= 3) break;
    }
    const payload = { success: true, products, categories };
    if (suggestCache.size > 300) suggestCache.clear();
    suggestCache.set(key, { expiresAt: Date.now() + 20_000, payload });
    res.json(payload);
  } catch (error) {
    console.error("Search suggest error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// نتایج کامل جستجو برای صفحهٔ /search
router.get("/search", async (req, res) => {
  try {
    const q = normalizeText(req.query.q).slice(0, 60);
    if (q.length < 2) return res.json({ success: true, products: [] });
    const products = await Product.find(suggestFilter(q)).select(PRODUCT_CARD_FIELDS).sort({ amazingOffer: -1, featured: -1, createdAt: -1 }).limit(60).lean();
    res.json({ success: true, products: await withApprovedReviewStats(products.map(serializeProduct)) });
  } catch (error) {
    console.error("Search results error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/bestsellers", async (req, res) => {
  try {
    if (bestsellersCache.payload && bestsellersCache.expiresAt > Date.now()) return res.json(bestsellersCache.payload);
    const since = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
    const rows = await Order.aggregate([
      { $match: { paymentStatus: "paid", status: { $nin: ["cancelled", "returned"] }, createdAt: { $gte: since } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.product", sold: { $sum: "$items.quantity" } } },
      { $sort: { sold: -1 } },
      { $limit: 24 },
    ]);
    const sold = new Map(rows.map((row) => [String(row._id), row.sold]));
    const found = rows.length
      ? await Product.find({ _id: { $in: rows.map((row) => row._id) }, ...IN_STOCK_FILTER }).select(PRODUCT_CARD_FIELDS).lean()
      : [];
    let basis = "sales";
    let list = found.sort((a, b) => (sold.get(String(b._id)) || 0) - (sold.get(String(a._id)) || 0)).slice(0, 8);
    if (list.length < 4) {
      basis = "popular";
      list = await Product.find(IN_STOCK_FILTER).select(PRODUCT_CARD_FIELDS)
        .sort({ reviewCount: -1, rating: -1, createdAt: -1 }).limit(8).lean();
    }
    const payload = { success: true, basis, products: await withApprovedReviewStats(list.map(serializeProduct)) };
    bestsellersCache = { expiresAt: Date.now() + BESTSELLERS_TTL_MS, payload };
    res.json(payload);
  } catch (error) {
    console.error("Bestsellers error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ردیف‌های صفحهٔ اصلی: برای هر بخش، محصولاتی که ادمین در «محصولات صفحهٔ اصلی» انتخاب کرده (به همان ترتیب).
// بخشِ بدون محصول در پاسخ نمی‌آید. انتخاب‌ها: src/services/homeSections.js
const { getSections: getHomeSections, readSelections: readHomeSelections } = require("../services/homeSections");
router.get("/home-sections", async (req, res) => {
  try {
    const cacheKey = req.originalUrl;
    const cached = catalogResponseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return res.json(cached.payload);
    const homeSections = await getHomeSections();
    const selections = await readHomeSelections();
    const allIds = [...new Set(Object.values(selections).flat())];
    const rows = allIds.length ? await Product.find({ _id: { $in: allIds } }).select(PRODUCT_CARD_FIELDS).lean() : [];
    const products = await withApprovedReviewStats(rows.map(serializeProduct));
    const byId = new Map(products.map((product) => [String(product._id), product]));
    const sections = homeSections
      .map((section) => ({ key: section.key, title: section.title, products: (selections[section.key] || []).map((id) => byId.get(id)).filter(Boolean) }))
      .filter((section) => section.products.length);
    const payload = { success: true, sections };
    rememberCatalog(cacheKey, payload);
    res.json(payload);
  } catch (error) {
    console.error("Home sections error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// نسخهٔ سبک برای سبد خرید (?lite=1): فقط فیلدهای لازم برای قیمت و موجودی، بدون محاسبهٔ امتیاز نظرات؛
// یک پرس‌وجوی کمتر و پاسخ کوچک‌تر، یعنی سریع‌تر و با احتمال خطای کمتر.
const LITE_FIELDS = "name brand slug legacyId price discount stock availability variants images mainImage";
const isLite = (req) => String(req.query.lite || "") === "1";

router.get("/id/:id", async (req, res) => {
  try {
    const lite = isLite(req);
    const product = await (lite ? Product.findById(req.params.id).select(LITE_FIELDS) : Product.findById(req.params.id)).lean();
    if (!product) return res.status(404).json({ success: false, message: "محصول پیدا نشد" });
    res.json({ success: true, product: lite ? serializeProduct(product) : (await withApprovedReviewStats([serializeProduct(product)]))[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const requestedSlug = String(req.params.slug || "").trim();
    const alternatives = [{ slug: requestedSlug }, { legacyId: requestedSlug }];
    if (requestedSlug === "iphone-17") alternatives.push({ name: { $regex: "^iPhone\\s*17$", $options: "i" } });

    const lite = isLite(req);
    const query = Product.findOne({ $or: alternatives }).sort({ updatedAt: -1 });
    const product = await (lite ? query.select(LITE_FIELDS) : query).lean();
    if (!product) return res.status(404).json({ success: false, message: "محصول پیدا نشد" });
    res.json({ success: true, product: lite ? serializeProduct(product) : (await withApprovedReviewStats([serializeProduct(product)]))[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.categoryPattern = categoryPattern; // برای تست
module.exports = router;
