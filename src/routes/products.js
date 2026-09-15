const express = require("express");
const router = express.Router();

router.use((req, res, next) => {
  res.set("Cache-Control", req.method === "GET" ? "no-cache, max-age=0, must-revalidate" : "no-store");
  next();
});

const Product = require("../models/Product");
const { withApprovedReviewStats } = require("../services/reviewStats");
const { streamProductImage } = require("../utils/productImages");

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

router.use(async (req, res, next) => {
  try {
    await expireAmazingOffers();
    await moveCableAndChargerProductsToAccessories();
  } catch (error) {
    console.error("Amazing offer expiry error:", error);
  }
  next();
});

const PRODUCT_CARD_FIELDS = [
  "name", "slug", "legacyId", "brand", "category", "price", "discount",
  "featured", "availability", "amazingOffer", "amazingOfferEndsAt", "images", "mainImage", "colors", "variants",
  "storages", "hasStorage", "rating", "reviewCount", "comingSoon", "stock",
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
    "لوازم جانبی موبایل": ["لوازم جانبی موبایل", "mobile accessories", "accessories", "کابل، شارژر و آداپتور", "کابل شارژ و آداپتور", "کابل و شارژر", "chargers", "cables", "chargers and adapters"],
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
    if (!streamProductImage(req.params.id, res)) return res.status(404).end();
  } catch (_) {
    if (!res.headersSent) res.status(404).end();
  }
});

router.get("/", async (req, res) => {
  try {
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
      filter.brand = { $regex: brandAliases[requestedBrand] || normalizeText(brand), $options: "i" };
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
    if (exclude) filter._id = { $ne: exclude };

    const order = sort === "price-asc" ? { price: 1 } : sort === "price-desc" ? { price: -1 } : { amazingOffer: -1, featured: -1, createdAt: -1 };
    const products = await Product.find(filter).select(PRODUCT_CARD_FIELDS).sort(order).limit(safeLimit(limit)).lean();

    res.json({ success: true, products: await withApprovedReviewStats(products.map(serializeProduct)) });
  } catch (error) {
    console.error("Products catalog error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/id/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ success: false, message: "محصول پیدا نشد" });
    res.json({ success: true, product: (await withApprovedReviewStats([serializeProduct(product)]))[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const requestedSlug = String(req.params.slug || "").trim();
    const alternatives = [{ slug: requestedSlug }, { legacyId: requestedSlug }];
    if (requestedSlug === "iphone-17") alternatives.push({ name: { $regex: "^iPhone\\s*17$", $options: "i" } });

    const product = await Product.findOne({ $or: alternatives }).sort({ updatedAt: -1 }).lean();
    if (!product) return res.status(404).json({ success: false, message: "محصول پیدا نشد" });
    res.json({ success: true, product: (await withApprovedReviewStats([serializeProduct(product)]))[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
