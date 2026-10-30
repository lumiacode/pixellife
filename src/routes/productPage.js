const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const homeController = require("../controllers/homeController");
const { buildProductSeo } = require("../services/seo");
const { onProductChange } = require("../services/cacheBus");

const router = express.Router();
const SEO_FIELDS = "slug legacyId name brand category price discount description specs technicalSpecs images mainImage stock variants availability comingSoon rating reviewCount";

// کش کوتاه‌مدت: خزنده‌ها و کاربران زیاد نباید هر بار دیتابیس را بزنند؛ تغییر ادمین حداکثر ۶۰ ثانیه بعد دیده می‌شود.
const cache = new Map();
const TTL_MS = 60 * 1000;
const MAX_CACHE = 500;
onProductChange(() => { cache.clear(); });

async function findProduct(key) {
  const value = String(key || "").trim();
  if (!value) return null;
  const hit = cache.get(value);
  if (hit && hit.expires > Date.now()) return hit.product;
  const conditions = [{ slug: value }, { legacyId: value }];
  if (mongoose.Types.ObjectId.isValid(value) && /^[a-f0-9]{24}$/i.test(value)) conditions.push({ _id: value });
  const product = await Product.findOne({ $or: conditions }).select(SEO_FIELDS).lean();
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(value, { product, expires: Date.now() + TTL_MS });
  return product;
}

const productUrl = (product) => `/product/${encodeURIComponent(product.slug || String(product._id))}`;

async function relatedFor(product) {
  if (!product || !product.category) return [];
  try {
    const rows = await Product.find({ category: product.category, _id: { $ne: product._id }, slug: { $exists: true, $ne: "" } }).select("slug name").limit(6).lean();
    return (rows || []).filter((r) => r && r.slug && r.name);
  } catch (e) { return []; }
}

async function renderProduct(req, res, product) {
  if (!product) {
    res.status(404);
    res.locals.seo = { title: "محصول یافت نشد | پیکسل لایف", noindex: true, follow: false };
  } else {
    res.locals.seo = buildProductSeo(product, await relatedFor(product));
  }
  return homeController.product(req, res);
}

// آدرس اصلی و ثابت هر محصول: /product/اسلاگ (بدون ریدایرکت)؛ برای هر محصول جدید خودکار کار می‌کند.
router.get("/:slug", async (req, res) => {
  try {
    const product = await findProduct(req.params.slug);
    if (product && product.slug && product.slug !== req.params.slug) return res.redirect(301, productUrl(product));
    return await renderProduct(req, res, product);
  } catch (error) {
    console.error("Product page error:", error.message);
    return res.status(500).send("خطا در بارگذاری محصول");
  }
});

// آدرس‌های قدیمی /product?id=… به آدرس اصلی منتقل می‌شوند (۳۰۱) تا اعتبار لینک‌ها یکی شود.
async function legacyProductHandler(req, res) {
  try {
    const key = req.query.id || req.query.slug;
    if (!key) return await renderProduct(req, res, null);
    const product = await findProduct(key);
    if (!product) return await renderProduct(req, res, null);
    const rest = new URLSearchParams(req.query);
    rest.delete("id"); rest.delete("slug");
    const query = rest.toString();
    return res.redirect(301, productUrl(product) + (query ? `?${query}` : ""));
  } catch (error) {
    console.error("Legacy product route error:", error.message);
    return res.status(500).send("خطا در بارگذاری محصول");
  }
}

router.legacyProductHandler = legacyProductHandler;
module.exports = router;
