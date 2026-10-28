const express = require("express");
const axios = require("axios");
const router = express.Router();

const Product = require("../models/Product");
const User = require("../models/User");
const Order = require("../models/Order");
const Wallet = require("../models/Wallet");
const WalletTransaction = require("../models/WalletTransaction");
const walletService = require("../services/wallet");
const { applyTrackingSteps, syncStepsWithStatus, trackingView } = require("../services/orderTracking");
const Review = require("../models/review");
const { refreshProductReviewStats, refreshAllProductReviewStats } = require("../services/reviewStats");
const mongoose = require("mongoose");
const { toGregorian, isValidJalaaliDate } = require("jalaali-js");
const AnalyticsDaily = require("../models/AnalyticsDaily");
const BehaviorEvent = require("../models/BehaviorEvent");
const upload = require("../utils/upload");
const requireAdmin = require("../middleware/adminAuth");
const adminSession = require("../middleware/adminSession");
const demoProducts = require("../data/demoProducts");
const { removeProductImage, saveProductImage } = require("../utils/productImages");
const { clearProductCaches } = require("../services/cacheBus");
const { getShippingMethods, saveShippingMethod } = require("../services/shippingSettings");

function parseList(value) {
  if (value === undefined) return undefined;
  return String(value || "")
    .split(/\r?\n|،|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// نقاط قوت و ضعف: هر خط یک مورد. ویرگول داخل جمله جدا نمی‌شود و علامت‌های اول خط (-، •، ✓ …) هنگام جایگذاری حذف می‌شوند.
function parseLines(value) {
  if (value === undefined) return undefined;
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s\-–—•*+·✓✔✅❌✗×]+/, "").replace(/^\d+\s*[.)\-]\s+/, "").trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((line) => line.slice(0, 300));
}

function parseTechnicalSpecs(value) {
  if (value === undefined) return undefined;
  if (!String(value || "").trim()) return [];
  let raw;
  try {
    raw = JSON.parse(value);
  } catch (_) {
    const error = new Error("ساختار مشخصات فنی معتبر نیست");
    error.statusCode = 400;
    throw error;
  }
  if (!Array.isArray(raw)) {
    const error = new Error("بخش‌های مشخصات فنی باید به‌صورت فهرست ارسال شوند");
    error.statusCode = 400;
    throw error;
  }
  if (raw.length > 12) {
    const error = new Error("حداکثر ۱۲ بخش مشخصات فنی مجاز است");
    error.statusCode = 400;
    throw error;
  }
  return raw.map((group, groupIndex) => {
    const title = String(group?.title || "").trim().slice(0, 80);
    // description در نسخهٔ قبلی همین عنوان جزئیات بود؛ برای داده‌های ثبت‌شده
    // قبلی به subtitle تبدیل می‌شود تا چیزی از بین نرود.
    const subtitle = String(group?.subtitle ?? group?.description ?? "").trim().slice(0, 120);
    const items = Array.isArray(group?.items) ? group.items : [];
    if (!title || !items.length || items.length > 35) {
      const error = new Error(`بخش مشخصات شماره ${groupIndex + 1} کامل نیست`);
      error.statusCode = 400;
      throw error;
    }
    const normalizedItems = items.map((item, itemIndex) => {
      const label = String(item?.label || "").trim().slice(0, 100);
      const itemValue = String(item?.value || "").trim().slice(0, 500);
      if (!label || !itemValue) {
        const error = new Error(`ویژگی شماره ${itemIndex + 1} در بخش «${title}» کامل نیست`);
        error.statusCode = 400;
        throw error;
      }
      return { label, value: itemValue };
    });
    return { title, subtitle, items: normalizedItems };
  });
}

function toEnglishDigitsLoose(value) {
  return String(value ?? "").replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit)).replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));
}
function parseMoney(value) {
  const normalized = toEnglishDigitsLoose(value).replace(/[\s,٬،]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.max(0, number) : NaN;
}
function parseDiscount(value) {
  const number = parseMoney(value);
  return Number.isFinite(number) ? Math.min(100, number) : 0;
}
function normalizeHex(raw, fallbackError) {
  const value = String(raw || "").trim();
  if (!value) return "#334155";
  const match = value.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) {
    const error = new Error(fallbackError || `کد رنگ «${value}» معتبر نیست؛ مانند #1f2937 وارد کنید`);
    error.statusCode = 400;
    throw error;
  }
  let hex = match[1];
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  return "#" + hex.toLowerCase();
}

function parseColors(value) {
  if (value === undefined) return undefined;
  if (!value || !String(value).trim()) return [];

  return String(value)
    .split(/\r?\n|،|,/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawName, rawHex] = line.split("|").map((item) => item.trim());
      return { name: rawName || "رنگ", hex: normalizeHex(rawHex) };
    });
}

function toEnglishDigits(value) {
  return String(value ?? "").replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit)).replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));
}
function parseStock(value) {
  const normalized = toEnglishDigits(value).replace(/[\s,٬،]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}
function normalizeAvailability(value, stock) {
  // محصول بدون تنوع فقط وقتی «موجود» است که تعداد واقعی آن مثبت باشد.
  return value === "out" ? "out" : parseStock(stock) > 0 ? "in" : "out";
}
function parseEnabled(value, fallback = true) {
  if (value === undefined) return fallback;
  return value === true || value === "true" || value === "on" || value === "1";
}
function parseTehranJalaliDate(value) {
  const normalized = toEnglishDigits(value).trim();
  if (!normalized) return null;
  // جداکننده‌ها می‌توانند اسلش، خط تیره، فاصله یا علائم فارسی باشند.
  const match = normalized.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!match) {
    const error = new Error("تاریخ و ساعت شمسی را وارد کنید؛ نمونه: ۱۴۰۵/۰۶/۰۶ ۱۸:۳۰");
    error.statusCode = 400;
    throw error;
  }
  const [, jy, jm, jd, hh, mm] = match.map(Number);
  if (!isValidJalaaliDate(jy, jm, jd) || hh > 23 || mm > 59) {
    const error = new Error("تاریخ یا ساعت شمسی معتبر نیست");
    error.statusCode = 400;
    throw error;
  }
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  // ساعت ثبت‌شده ساعت تهران است؛ برای ذخیرهٔ UTC، ۳:۳۰ ساعت کم می‌شود.
  return new Date(Date.UTC(gy, gm - 1, gd, hh - 3, mm - 30));
}

function parseVariantNumber(value, label, lineNumber) {
  const normalized = toEnglishDigits(value).replace(/[\s,٬،]/g, "");
  if (normalized === "" || !/^\d+(?:\.\d+)?$/.test(normalized)) {
    const error = new Error(`تعداد موجودی در ردیف ${lineNumber} معتبر نیست`);
    error.statusCode = 400;
    throw error;
  }
  return Math.max(0, Number(normalized));
}
function parseVariants(value) {
  if (value === undefined) return undefined;
  if (!String(value || "").trim()) return [];
  const seen = new Set();
  return String(value).split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const [rawStorage, rawColor, rawHex, rawStock, rawPrice] = line.split(/\||\t/).map((item) => item.trim());
    if (!rawStorage || !rawColor || rawStock === undefined) {
      const error = new Error(`ردیف ${index + 1} تنوع ناقص است؛ حافظه، رنگ و تعداد را کامل کنید`);
      error.statusCode = 400;
      throw error;
    }
    const stock = parseVariantNumber(rawStock, "موجودی", index + 1);
    const price = rawPrice === undefined || rawPrice === "" ? undefined : parseVariantNumber(rawPrice, "قیمت", index + 1);
    const hex = normalizeHex(rawHex);
    const key = rawStorage + "|" + rawColor;
    if (seen.has(key)) {
      const error = new Error(`ترکیب حافظه و رنگ در ردیف ${index + 1} تکراری است`);
      error.statusCode = 400;
      throw error;
    }
    seen.add(key);
    return { storage: rawStorage, color: { name: rawColor, hex }, stock, ...(price !== undefined ? { price } : {}) };
  });
}
function applyVariantInventory(data, variants, availability) {
  if (!Array.isArray(variants) || !variants.length) return data;
  const storages = [...new Set(variants.map((item) => item.storage).filter(Boolean))];
  const colors = [...new Map(variants.map((item) => [item.color.name, item.color])).values()];
  const stock = variants.reduce((total, item) => total + Math.max(0, Number(item.stock) || 0), 0);
  // مدیر می‌تواند کالای دارای تنوع را موقتاً ناموجود کند؛ ولی «موجود» فقط با تعداد مثبت معتبر است.
  return { ...data, variants, storages, colors, stock, availability: normalizeAvailability(availability, stock) };
}

function reconcileVariantInventory(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return false;

  const normalized = applyVariantInventory({}, variants, product.availability);
  const changed =
    Number(product.stock) !== normalized.stock ||
    product.availability !== normalized.availability ||
    JSON.stringify(product.storages || []) !== JSON.stringify(normalized.storages) ||
    JSON.stringify(product.colors || []) !== JSON.stringify(normalized.colors);

  if (!changed) return false;
  product.stock = normalized.stock;
  product.availability = normalized.availability;
  product.storages = normalized.storages;
  product.colors = normalized.colors;
  return true;
}

function normalizeImagePath(value) {
  const image = String(value || "").trim();
  if (!image) return "";
  if (/^https?:\/\//i.test(image) || image.startsWith("data:")) return image;
  return "/" + image.replace(/^\/?(?:public\/)?/, "");
}
function parseRemovedImages(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(normalizeImagePath).filter(Boolean) : [];
  } catch (_) { return []; }
}
function uploadedFiles(req, field) {
  if (Array.isArray(req.files)) return field === "images" ? req.files : [];
  return Array.isArray(req.files?.[field]) ? req.files[field] : [];
}
function parseReviewSections(value, uploadedImages = []) {
  if (!value) return [];
  try {
    const sections = JSON.parse(value);
    if (!Array.isArray(sections)) return [];
    return sections.map((section) => {
      const imageSizes = Array.isArray(section?.imageSizes) ? section.imageSizes : [];
      const images = (Array.isArray(section?.images) ? section.images : []).map((image, index) => {
        const match = String(image || "").match(/^new:(\d+)$/);
        const src = match ? uploadedImages[Number(match[1])] || "" : normalizeImagePath(image);
        const size = ["small", "medium", "large", "full"].includes(imageSizes[index]) ? imageSizes[index] : "large";
        return src ? { src, size } : null;
      }).filter(Boolean);
      return {
        enabled: section?.enabled !== false,
        title: String(section?.title || "").trim(),
        content: String(section?.content || "").trim(),
        images: images.map((image) => image.src),
        imageSizes: images.map((image) => image.size),
      };
    }).filter((section) => section.content || section.images.length); // بخشی که فقط عنوان دارد و متنی ندارد ذخیره نمی‌شود
  } catch (_) { return []; }
}
function normalizeVideoUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString();
  } catch (_) {
    return "";
  }
}

function parseVideoUrls(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || "").split(/\r?\n/);
  return [...new Set(source.map(normalizeVideoUrl).filter(Boolean))].slice(0, 5);
}

function serializeProduct(product) {
  const data = product.toObject ? product.toObject() : product;
  const images = (Array.isArray(data.images) ? data.images : []).map(normalizeImagePath).filter(Boolean);
  const mainImage = normalizeImagePath(data.mainImage);
  return { ...data, images, mainImage: mainImage || images[0] || "" };
}
function resolveMainImage(selection, existingImages = [], uploadedImages = []) {
  const current = (Array.isArray(existingImages) ? existingImages : []).map(normalizeImagePath).filter(Boolean);
  const incoming = (Array.isArray(uploadedImages) ? uploadedImages : []).map(normalizeImagePath).filter(Boolean);
  if (typeof selection === "string" && selection.startsWith("new:")) {
    const index = Number.parseInt(selection.slice(4), 10);
    if (Number.isInteger(index) && incoming[index]) return incoming[index];
  }
  const selected = normalizeImagePath(selection);
  if (selected && current.includes(selected)) return selected;
  return current[0] || incoming[0] || "";
}

// درخواست تغییر وضعیت مشتری از پنل با JSON ارسال می‌شود.
router.use(express.json({ limit: "1mb" }));
router.use(express.urlencoded({ extended: true }));
router.use(adminSession);
router.use(requireAdmin);

// محصولات قدیمیِ کابل/شارژر که پیش‌تر با دستهٔ «موبایل» ثبت شده‌اند، پیش از
// نمایش پنل ادمین به دستهٔ درست منتقل می‌شوند تا هرگز در فهرست موبایل نباشند.
router.use(async (req, res, next) => {
  try {
    await Product.updateMany(
      {
        category: /^(?:موبایل|mobile|گوشی موبایل|گوشی|phone|لوازم جانبی موبایل|mobile accessories|accessories)$/i,
        name: /(کابل|شارژر|آداپتور|تبدیل|charger|adapter|cable)/i,
      },
      { $set: { category: "کابل، شارژر و آداپتور" } },
    );
  } catch (error) {
    console.error("Admin accessory category migration error:", error);
  }
  next();
});
router.use((req, res, next) => { res.set("Cache-Control", "no-store, no-cache, must-revalidate, private"); next(); });

function analyticsDateKey(date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
// روش‌های ارسال: ادمین هزینه، ارسال رایگان، عنوان و فعال‌بودن هر روش را تعیین می‌کند؛ سبد، پرداخت و ثبت سفارش از همین تنظیم می‌خوانند.
router.get("/settings/shipping", async (req, res) => {
  try {
    res.json({ success: true, methods: await getShippingMethods() });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});
router.put("/settings/shipping/:id", async (req, res) => {
  try {
    res.json({ success: true, method: await saveShippingMethod(String(req.params.id), req.body || {}) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

router.get("/analytics/overview", async (req, res) => {
  try {
    const today = analyticsDateKey(new Date());
    const from = analyticsDateKey(new Date(Date.now() - 29 * 86400000));
    const stats = async (start) => {
      const [row] = await AnalyticsDaily.aggregate([{ $match:{date:{$gte:start,$lte:today}} },{$group:{_id:null,views:{$sum:"$views"},sets:{$push:"$visitors"}}},{$project:{_id:0,views:1,uniqueVisitors:{$size:{$reduce:{input:"$sets",initialValue:[],in:{$setUnion:["$$value","$$this"]}}}}}}]);
      return row || { views:0, uniqueVisitors:0 };
    };
    const [todayStats,week,month,topPages] = await Promise.all([stats(today),stats(analyticsDateKey(new Date(Date.now()-6*86400000))),stats(from),AnalyticsDaily.aggregate([{$match:{date:{$gte:from,$lte:today}}},{$group:{_id:"$page",views:{$sum:"$views"}}},{$sort:{views:-1}},{$limit:8}])]);
    res.json({success:true,today:todayStats,week,month,topPages:topPages.map(x=>({page:x._id,views:x.views}))});
  } catch (_) { res.status(500).json({success:false,message:"دریافت آمار بازدید ناموفق بود"}); }
});

function analyticsDays(value) {
  const parsed = Number.parseInt(value, 10);
  return [7, 30, 90].includes(parsed) ? parsed : 30;
}

async function attachProductNames(rows) {
  const ids = [...new Set(rows.map((row) => String(row._id || row.productId || "")).filter(Boolean))];
  const objectIds = ids.filter((id) => mongoose.isValidObjectId(id));
  const products = await Product.find({
    $or: [
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
      { slug: { $in: ids } },
      { legacyId: { $in: ids } },
    ],
  }).select("name slug legacyId").lean();
  const names = new Map();
  products.forEach((product) => {
    names.set(String(product._id), product.name);
    if (product.slug) names.set(String(product.slug), product.name);
    if (product.legacyId) names.set(String(product.legacyId), product.name);
  });
  return rows.map((row) => ({
    ...row,
    productId: String(row._id || row.productId || ""),
    name: names.get(String(row._id || row.productId || "")) || "محصول حذف‌شده یا نامشخص",
  }));
}

const { buildPipelines: buildTrafficPipelines, buildTraffic } = require("../services/trafficPatterns");

router.get("/analytics/behavior", async (req, res) => {
  try {
    const days = analyticsDays(req.query.days);
    const from = new Date(Date.now() - days * 86400000);
    const match = { createdAt: { $gte: from } };

    const trafficPipelines = buildTrafficPipelines(from);
    const [summaryRows, topProductRows, searchTerms, abandonedRows, filterRows, hourlyRows, dailyVisitorRows] = await Promise.all([
      BehaviorEvent.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            pageViews: { $sum: { $cond: [{ $eq: ["$type", "page_view"] }, 1, 0] } },
            productViews: { $sum: { $cond: [{ $eq: ["$type", "product_view"] }, 1, 0] } },
            cartAdds: { $sum: { $cond: [{ $eq: ["$type", "add_to_cart"] }, 1, 0] } },
            wishlistAdds: { $sum: { $cond: [{ $eq: ["$type", "add_to_wishlist"] }, 1, 0] } },
            checkoutStarts: { $sum: { $cond: [{ $eq: ["$type", "begin_checkout"] }, 1, 0] } },
            orderItems: { $sum: { $cond: [{ $eq: ["$type", "order_created"] }, 1, 0] } },
            visitors: { $addToSet: "$visitorHash" },
          },
        },
        { $project: { _id: 0, pageViews: 1, productViews: 1, cartAdds: 1, wishlistAdds: 1, checkoutStarts: 1, orderItems: 1, uniqueVisitors: { $size: "$visitors" } } },
      ]),
      BehaviorEvent.aggregate([
        { $match: { ...match, productId: { $ne: "" }, type: { $in: ["product_view", "add_to_cart", "order_created"] } } },
        {
          $group: {
            _id: "$productId",
            views: { $sum: { $cond: [{ $eq: ["$type", "product_view"] }, 1, 0] } },
            cartAdds: { $sum: { $cond: [{ $eq: ["$type", "add_to_cart"] }, 1, 0] } },
            orders: { $sum: { $cond: [{ $eq: ["$type", "order_created"] }, 1, 0] } },
          },
        },
        { $sort: { orders: -1, cartAdds: -1, views: -1 } },
        { $limit: 10 },
      ]),
      BehaviorEvent.aggregate([
        { $match: { ...match, type: "search", searchTerm: { $ne: "" } } },
        { $group: { _id: "$searchTerm", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      BehaviorEvent.aggregate([
        { $match: { ...match, productId: { $ne: "" }, type: { $in: ["add_to_cart", "order_created"] } } },
        {
          $group: {
            _id: { visitor: "$visitorHash", product: "$productId" },
            cartAdds: { $sum: { $cond: [{ $eq: ["$type", "add_to_cart"] }, 1, 0] } },
            orders: { $sum: { $cond: [{ $eq: ["$type", "order_created"] }, 1, 0] } },
          },
        },
        { $match: { cartAdds: { $gt: 0 }, orders: 0 } },
        { $group: { _id: "$_id.product", abandonedVisitors: { $sum: 1 } } },
        { $sort: { abandonedVisitors: -1 } },
        { $limit: 10 },
      ]),
      BehaviorEvent.aggregate([
        { $match: { ...match, type: "filter_apply" } },
        { $project: { label: { $ifNull: ["$filters.label", ""] }, brand: 1, category: 1 } },
        { $match: { $or: [{ label: { $ne: "" } }, { brand: { $ne: "" } }, { category: { $ne: "" } }] } },
        { $group: { _id: { label: "$label", brand: "$brand", category: "$category" }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      BehaviorEvent.aggregate(trafficPipelines.hourly),
      BehaviorEvent.aggregate(trafficPipelines.visitors),
    ]);

    const summary = summaryRows[0] || {
      pageViews: 0, productViews: 0, cartAdds: 0, wishlistAdds: 0,
      checkoutStarts: 0, orderItems: 0, uniqueVisitors: 0,
    };
    summary.cartRate = summary.productViews ? Number(((summary.cartAdds / summary.productViews) * 100).toFixed(1)) : 0;
    summary.conversionRate = summary.uniqueVisitors ? Number(((summary.orderItems / summary.uniqueVisitors) * 100).toFixed(1)) : 0;

    const [topProducts, abandonedProducts] = await Promise.all([
      attachProductNames(topProductRows),
      attachProductNames(abandonedRows),
    ]);
    res.json({
      success: true,
      days,
      from,
      summary,
      traffic: buildTraffic(hourlyRows, dailyVisitorRows, days),
      topProducts,
      abandonedProducts,
      searchTerms: searchTerms.map((row) => ({ term: row._id, count: row.count })),
      filters: filterRows.map((row) => ({
        label: row._id.label || row._id.brand || row._id.category || "فیلتر نامشخص",
        count: row.count,
      })),
    });
  } catch (error) {
    console.error("Behavior dashboard error:", error);
    res.status(500).json({ success: false, message: "دریافت گزارش رفتار کاربران ناموفق بود" });
  }
});

const analyticsAiCooldown = new Map();

router.post("/analytics/behavior/insights", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ success: false, message: "OPENAI_API_KEY در تنظیمات Render ثبت نشده است" });
    }

    const key = req.sessionID || req.ip || "admin";
    const now = Date.now();
    if (now - (analyticsAiCooldown.get(key) || 0) < 30000) {
      return res.status(429).json({ success: false, message: "لطفاً برای تحلیل بعدی ۳۰ ثانیه صبر کنید" });
    }
    analyticsAiCooldown.set(key, now);

    const days = analyticsDays(req.body?.days);
    const from = new Date(Date.now() - days * 86400000);
    const match = { createdAt: { $gte: from } };
    const [summaryRows, productRows, searchRows, abandonedRows] = await Promise.all([
      BehaviorEvent.aggregate([
        { $match: match },
        { $group: {
          _id: null,
          pageViews: { $sum: { $cond: [{ $eq: ["$type", "page_view"] }, 1, 0] } },
          productViews: { $sum: { $cond: [{ $eq: ["$type", "product_view"] }, 1, 0] } },
          cartAdds: { $sum: { $cond: [{ $eq: ["$type", "add_to_cart"] }, 1, 0] } },
          checkoutStarts: { $sum: { $cond: [{ $eq: ["$type", "begin_checkout"] }, 1, 0] } },
          orderItems: { $sum: { $cond: [{ $eq: ["$type", "order_created"] }, 1, 0] } },
          visitors: { $addToSet: "$visitorHash" },
        } },
        { $project: { _id: 0, pageViews: 1, productViews: 1, cartAdds: 1, checkoutStarts: 1, orderItems: 1, uniqueVisitors: { $size: "$visitors" } } },
      ]),
      BehaviorEvent.aggregate([
        { $match: { ...match, productId: { $ne: "" }, type: { $in: ["product_view", "add_to_cart", "order_created"] } } },
        { $group: {
          _id: "$productId",
          views: { $sum: { $cond: [{ $eq: ["$type", "product_view"] }, 1, 0] } },
          cartAdds: { $sum: { $cond: [{ $eq: ["$type", "add_to_cart"] }, 1, 0] } },
          orders: { $sum: { $cond: [{ $eq: ["$type", "order_created"] }, 1, 0] } },
        } },
        { $sort: { orders: -1, cartAdds: -1, views: -1 } }, { $limit: 6 },
      ]),
      BehaviorEvent.aggregate([
        { $match: { ...match, type: "search", searchTerm: { $ne: "" } } },
        { $group: { _id: "$searchTerm", count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 6 },
      ]),
      BehaviorEvent.aggregate([
        { $match: { ...match, productId: { $ne: "" }, type: { $in: ["add_to_cart", "order_created"] } } },
        { $group: {
          _id: { visitor: "$visitorHash", product: "$productId" },
          cartAdds: { $sum: { $cond: [{ $eq: ["$type", "add_to_cart"] }, 1, 0] } },
          orders: { $sum: { $cond: [{ $eq: ["$type", "order_created"] }, 1, 0] } },
        } },
        { $match: { cartAdds: { $gt: 0 }, orders: 0 } },
        { $group: { _id: "$_id.product", abandonedVisitors: { $sum: 1 } } },
        { $sort: { abandonedVisitors: -1 } }, { $limit: 6 },
      ]),
    ]);

    const summary = summaryRows[0] || { pageViews: 0, productViews: 0, cartAdds: 0, checkoutStarts: 0, orderItems: 0, uniqueVisitors: 0 };
    if (!summary.pageViews && !summary.productViews && !summary.cartAdds) {
      return res.json({ success: true, analysis: "هنوز دادهٔ رفتاری کافی برای تحلیل وجود ندارد. پس از ثبت بازدید و تعامل واقعی کاربران، دوباره تحلیل را اجرا کنید." });
    }

    const [products, abandonedProducts] = await Promise.all([
      attachProductNames(productRows),
      attachProductNames(abandonedRows),
    ]);
    const report = {
      periodDays: days,
      summary,
      topProducts: products.map(({ name, views, cartAdds, orders }) => ({ name, views, cartAdds, orders })),
      abandonedProducts: abandonedProducts.map(({ name, abandonedVisitors }) => ({ name, abandonedVisitors })),
      topSearches: searchRows.map((row) => ({ term: row._id, count: row.count })),
    };

    const prompt = [
      "شما تحلیل‌گر فروش فروشگاه دیجیتال PixelLife هستید.",
      "فقط بر اساس آمار تجمیعی زیر تحلیل فارسی بده و هیچ عدد، محصول یا دلیل تأییدنشده نساز.",
      "اطلاعات شخصی کاربر وجود ندارد؛ تلاش نکن هویت افراد را حدس بزنی.",
      "پاسخ کوتاه و عملی باشد و دقیقاً سه بخش داشته باشد:",
      "۱) مشاهدات کلیدی، ۲) فرصت‌ها/ریسک‌ها، ۳) حداکثر ۵ اقدام اولویت‌دار.",
      "اگر داده کم است، صریحاً محدودیت داده را بگو.",
      "گزارش داده:",
      JSON.stringify(report),
    ].join("\n");

    const response = await axios.post(
      "https://api.openai.com/v1/responses",
      {
        model: process.env.OPENAI_ANALYTICS_MODEL || process.env.OPENAI_MODEL || "gpt-5.6-terra",
        input: prompt,
        max_output_tokens: 900,
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        timeout: 60000,
      },
    );
    const analysis = String(response.data?.output_text || "").trim();
    if (!analysis) throw new Error("پاسخ قابل‌نمایش از هوش مصنوعی دریافت نشد");
    res.json({ success: true, analysis });
  } catch (error) {
    console.error("Behavior AI analysis error:", error.response?.data?.error?.message || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.error?.message || "تحلیل هوشمند فعلاً در دسترس نیست",
    });
  }
});

router.post("/products/import-demo", async (req, res) => {
  try {
    const operations = demoProducts.map((product) => {
      const seedProduct = {
        ...product,
        mainImage: product.mainImage || product.images?.[0] || "",
      };
      return {
        updateOne: {
          filter: {
            $or: [{ legacyId: seedProduct.legacyId }, { slug: seedProduct.slug }],
          },
          update: { $setOnInsert: seedProduct },
          upsert: true,
        },
      };
    });
    const result = await Product.bulkWrite(operations, { ordered: false });
    res.json({
      success: true,
      inserted: result.upsertedCount || 0,
      existing: demoProducts.length - (result.upsertedCount || 0),
      total: demoProducts.length,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

router.get("/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    // تنوع‌ها منبع قطعی موجودی‌اند. این یکسان‌سازی، محصولات قدیمی را نیز
    // هنگام باز شدن پنل اصلاح می‌کند تا عدد جدول، سبد خرید و صفحه محصول یکی باشد.
    const inventoryChanged = products.filter(reconcileVariantInventory);
    if (inventoryChanged.length) {
      await Promise.all(inventoryChanged.map((product) => product.save()));
    }
    res.json({ success: true, products: products.map(serializeProduct) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

router.post("/products", upload.fields([{ name: "images", maxCount: 5 }, { name: "reviewImages", maxCount: 20 }]), async (req, res) => {
  try {
    const {
      name,
      brand,
      category,
      price,
      discount,
      description,
      introTitle,
      reviewTitle,
      attentionNote,
      videoUrl,
      videoUrls,
      reviewVideoUrls,
      specs,
      technicalSpecs,
      showSpecs,
      featured,
      comingSoon,
      amazingOffer,
      amazingOfferEndsAt,
      stock,
      availability,
      colors,
      hideColorsWhenOutOfStock,
      storages,
      hasStorage,
      warranties,
      hasWarranty,
      variants,
      showReview,
      reviewSections,
      reviewPros,
      reviewCons,
      reviewVerdict,
      reviewVerdictScore,
      mainImage: mainImageSelection,
    } = req.body;

    const requestedAvailability = availability === "out" ? "out" : "in";
    const normalizedPrice = parseMoney(price);
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "نام محصول الزامی است" });
    }
    if (requestedAvailability === "in" && (!String(brand || "").trim() || !Number.isFinite(normalizedPrice) || normalizedPrice <= 0)) {
      return res
        .status(400)
        .json({ success: false, message: "برای کالای موجود، برند و قیمتِ بیشتر از صفر الزامی هستند" });
    }

    if (requestedAvailability === "in") {
      // «موجود» فقط با تعداد واقعی معتبر است؛ قبل از ذخیرهٔ عکس‌ها رد می‌شود تا فایل بی‌صاحب نماند.
      const variantRows = parseEnabled(hasStorage) ? parseVariants(variants) : [];
      const effectiveStock = variantRows && variantRows.length
        ? variantRows.reduce((sum, row) => sum + row.stock, 0)
        : parseStock(stock);
      if (effectiveStock <= 0) {
        return res
          .status(400)
          .json({ success: false, message: "برای کالای موجود، تعداد موجودی باید بیشتر از صفر باشد" });
      }
    }

    const uploadedImages = await Promise.all(
      uploadedFiles(req, "images").map(saveProductImage),
    );

    const storageEnabled = parseEnabled(hasStorage);
    const warrantyEnabled = parseEnabled(hasWarranty);
    const specsEnabled = parseEnabled(showSpecs);
    const parsedTechnicalSpecs = specsEnabled ? parseTechnicalSpecs(technicalSpecs) : [];
    const uploadedReviewImages = await Promise.all(uploadedFiles(req, "reviewImages").map(saveProductImage));
    const variantInventory = storageEnabled ? parseVariants(variants) : [];
    const rootStock = parseStock(stock);
    const normalizedVideoUrls = parseVideoUrls(videoUrls || videoUrl);
    const product = new Product(applyVariantInventory({
      name,
      brand: String(brand || "").trim() || "نامشخص",
      category: category || "عمومی",
      price: Number.isFinite(normalizedPrice) && normalizedPrice >= 0 ? normalizedPrice : 0,
      discount: parseDiscount(discount),
      description,
      introTitle: String(introTitle || "").trim() || "معرفی کالا",
      reviewTitle: String(reviewTitle || "").trim() || "بررسی تخصصی",
      attentionNote: String(attentionNote || "").trim(),
      videoUrl: normalizedVideoUrls[0] || "",
      videoUrls: normalizedVideoUrls,
      reviewVideoUrls: parseVideoUrls(reviewVideoUrls),
      specs: specsEnabled ? specs : "",
      technicalSpecs: parsedTechnicalSpecs,
      showSpecs: specsEnabled,
      featured: featured === "true" || featured === "on" || featured === true,
      comingSoon: parseEnabled(comingSoon, false),
      amazingOffer: parseEnabled(amazingOffer, false),
      amazingOfferEndsAt: parseTehranJalaliDate(amazingOfferEndsAt),
      stock: rootStock,
      availability: normalizeAvailability(availability, rootStock),
      images: uploadedImages,
      mainImage: resolveMainImage(mainImageSelection, [], uploadedImages),
      colors: parseColors(colors) || [],
      hideColorsWhenOutOfStock: parseEnabled(hideColorsWhenOutOfStock),
      storages: storageEnabled ? parseList(storages) || [] : [],
      hasStorage: storageEnabled,
      showReview: parseEnabled(showReview, false),
      reviewSections: parseReviewSections(reviewSections, uploadedReviewImages),
      reviewPros: parseLines(reviewPros) || [],
      reviewCons: parseLines(reviewCons) || [],
      reviewVerdict: String(reviewVerdict || "").trim(),
      reviewVerdictScore: Number.isFinite(Number(reviewVerdictScore)) ? Math.min(10, Math.max(0, Number(reviewVerdictScore))) : null,
      warranties: warrantyEnabled ? parseList(warranties) || [] : [],
      hasWarranty: warrantyEnabled,
    }, variantInventory, availability));

    await product.save();
    clearProductCaches();
    res.json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

router.put("/products/:id", upload.fields([{ name: "images", maxCount: 5 }, { name: "reviewImages", maxCount: 20 }]), async (req, res) => {
  try {
    const {
      name,
      brand,
      category,
      price,
      discount,
      description,
      introTitle,
      reviewTitle,
      attentionNote,
      videoUrl,
      videoUrls,
      reviewVideoUrls,
      specs,
      technicalSpecs,
      showSpecs,
      featured,
      comingSoon,
      amazingOffer,
      amazingOfferEndsAt,
      stock,
      availability,
      colors,
      hideColorsWhenOutOfStock,
      storages,
      hasStorage,
      warranties,
      hasWarranty,
      variants,
      showReview,
      reviewSections,
      reviewPros,
      reviewCons,
      reviewVerdict,
      reviewVerdictScore,
      mainImage: mainImageSelection,
      removeImages,
    } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "محصول پیدا نشد" });
    }

    if (name) product.name = name;
    if (brand !== undefined) product.brand = String(brand).trim();
    if (category !== undefined) product.category = String(category).trim();
    if (price !== undefined && price !== "") product.price = parseMoney(price) || 0;
    if (discount !== undefined) product.discount = parseDiscount(discount);
    if (description !== undefined) product.description = description;
    if (introTitle !== undefined) product.introTitle = String(introTitle || "").trim() || "معرفی کالا";
    if (reviewTitle !== undefined) product.reviewTitle = String(reviewTitle || "").trim() || "بررسی تخصصی";
    if (attentionNote !== undefined) product.attentionNote = String(attentionNote || "").trim();
    if (videoUrls !== undefined || videoUrl !== undefined) {
      const normalizedVideoUrls = parseVideoUrls(videoUrls !== undefined ? videoUrls : videoUrl);
      product.videoUrls = normalizedVideoUrls;
      product.videoUrl = normalizedVideoUrls[0] || "";
    }
    if (reviewVideoUrls !== undefined) {
      product.reviewVideoUrls = parseVideoUrls(reviewVideoUrls);
    }
    if (showSpecs !== undefined) product.showSpecs = parseEnabled(showSpecs);
    if (specs !== undefined && product.showSpecs !== false) product.specs = specs;
    if (technicalSpecs !== undefined && product.showSpecs !== false) product.technicalSpecs = parseTechnicalSpecs(technicalSpecs);
    if (showReview !== undefined) product.showReview = parseEnabled(showReview, false);
    if (stock !== undefined) product.stock = parseStock(stock);
    if (stock !== undefined || availability !== undefined) {
      product.availability = normalizeAvailability(
        availability !== undefined ? availability : product.availability,
        product.stock,
      );
    }
    if (colors !== undefined) product.colors = parseColors(colors);
    if (hideColorsWhenOutOfStock !== undefined) product.hideColorsWhenOutOfStock = parseEnabled(hideColorsWhenOutOfStock);
    if (hasStorage !== undefined) product.hasStorage = parseEnabled(hasStorage);
    if (storages !== undefined && product.hasStorage !== false) product.storages = parseList(storages);
    if (hasWarranty !== undefined) product.hasWarranty = parseEnabled(hasWarranty);
    if (warranties !== undefined && product.hasWarranty !== false) product.warranties = parseList(warranties);
    if (variants !== undefined && product.hasStorage !== false) {
      const variantInventory = parseVariants(variants);
      if (variantInventory.length) {
        const normalized = applyVariantInventory(
          {},
          variantInventory,
          availability !== undefined ? availability : product.availability,
        );
        product.variants = normalized.variants;
        product.storages = normalized.storages;
        product.colors = normalized.colors;
        product.stock = normalized.stock;
        product.availability = normalized.availability;
      } else {
        product.variants = [];
      }
    }
    if (product.hasStorage === false) {
      product.storages = [];
      product.variants = [];
    }
    if (product.hasWarranty === false) product.warranties = [];
    if (product.showSpecs === false) {
      product.specs = "";
      product.technicalSpecs = [];
    }
    // انتخاب صریح «موجود» فقط با قیمت و تعداد بیشتر از صفر پذیرفته می‌شود (قبل از هر تغییر در عکس‌ها).
    // «ناموجود» همیشه مجاز است، حتی اگر قیمت یا تعداد خالی یا صفر باشد.
    if (availability === "in") {
      if (!(Number(product.price) > 0)) {
        return res.status(400).json({ success: false, message: "برای کالای موجود، قیمتِ بیشتر از صفر الزامی است" });
      }
      if (!(Number(product.stock) > 0)) {
        return res.status(400).json({ success: false, message: "برای کالای موجود، تعداد موجودی باید بیشتر از صفر باشد" });
      }
    }
    product.featured =
      featured === "true" || featured === "on" || featured === true;
    if (comingSoon !== undefined) {
      product.comingSoon = parseEnabled(comingSoon, false);
    }
    if (amazingOffer !== undefined) product.amazingOffer = parseEnabled(amazingOffer, false);
    if (amazingOfferEndsAt !== undefined) product.amazingOfferEndsAt = parseTehranJalaliDate(amazingOfferEndsAt);

    const existingImages = (Array.isArray(product.images) ? product.images : []).map(normalizeImagePath).filter(Boolean);
    const removed = new Set(parseRemovedImages(removeImages));
    const remainingImages = existingImages.filter((image) => !removed.has(image));
    const newImages = await Promise.all(uploadedFiles(req, "images").map(saveProductImage));
    const uploadedReviewImages = await Promise.all(uploadedFiles(req, "reviewImages").map(saveProductImage));
    if (reviewSections !== undefined) product.reviewSections = parseReviewSections(reviewSections, uploadedReviewImages);
    if (reviewPros !== undefined) product.reviewPros = parseLines(reviewPros) || [];
    if (reviewCons !== undefined) product.reviewCons = parseLines(reviewCons) || [];
    if (reviewVerdict !== undefined) product.reviewVerdict = String(reviewVerdict || "").trim();
    if (reviewVerdictScore !== undefined) {
      const score = Number(reviewVerdictScore);
      product.reviewVerdictScore = Number.isFinite(score) ? Math.min(10, Math.max(0, score)) : null;
    }
    product.images = [...remainingImages, ...newImages];
    await Promise.all([...removed].map(removeProductImage));

    if (mainImageSelection !== undefined) {
      product.mainImage = resolveMainImage(mainImageSelection, remainingImages, newImages);
    } else {
      const currentMain = normalizeImagePath(product.mainImage);
      product.mainImage = product.images.includes(currentMain) ? currentMain : product.images[0] || "";
    }

    await product.save();
    clearProductCaches();
    res.json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "محصول پیدا نشد" });
    }
    await Promise.all((product.images || []).map(removeProductImage));
    clearProductCaches();
    res.json({ success: true });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

// Customers: only non-admin accounts are returned. Passwords, national codes and
// saved addresses are deliberately never selected for the management table.
router.get("/users", async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(10, Number.parseInt(req.query.limit, 10) || 20));
    const search = String(req.query.search || "").trim();
    const filter = { role: { $ne: "admin" } };

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { firstName: { $regex: escaped, $options: "i" } },
        { lastName: { $regex: escaped, $options: "i" } },
        { mobile: { $regex: escaped } },
        { email: { $regex: escaped, $options: "i" } },
      ];
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select("firstName lastName mobile email nationalCode birthDate isVerified isActive lastLogin createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      success: true,
      users,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/users/:id/status", async (req, res) => {
  try {
    if (typeof req.body.isActive !== "boolean") {
      return res.status(400).json({ success: false, message: "وضعیت حساب معتبر نیست" });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $ne: "admin" } },
      { $set: { isActive: req.body.isActive } },
      { returnDocument: "after" },
    ).select("firstName lastName mobile email nationalCode birthDate isVerified isActive lastLogin createdAt");

    if (!user) {
      return res.status(404).json({ success: false, message: "مشتری پیدا نشد" });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// مدیریت کدهای تخفیف (requireAdmin بالاتر روی کل router اعمال شده است)
router.use("/discounts", require("./adminDiscounts"));

router.get("/orders", async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(10, Number.parseInt(req.query.limit, 10) || 20));
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) filter.orderNumber = { $regex: String(req.query.search).trim(), $options: "i" };
    const [total, orders] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter).populate("user", "firstName lastName mobile").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    res.json({ success: true, orders: orders.map((order) => ({ ...order, tracking: trackingView(order) })), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch("/orders/:id/status", async (req, res) => {
  try {
    const allowed = ["awaiting_payment", "processing", "shipped", "delivered", "cancelled", "returned"];
    const status = String(req.body.status || "");
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: "وضعیت سفارش معتبر نیست" });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "سفارش پیدا نشد" });
    // مرجوعی فقط برای سفارشی معنا دارد که پرداخت شده است.
    if (status === "returned" && order.paymentStatus !== "paid") return res.status(400).json({ success: false, message: "فقط سفارش پرداخت‌شده را می‌توان مرجوع کرد" });
    order.status = status; order.statusHistory.push({ status, note: status === "returned" ? "سفارش مرجوع شد" : "وضعیت توسط ادمین تغییر کرد" });
    // مرحله‌های روند ارسال با وضعیت کلی هماهنگ می‌شوند.
    syncStepsWithStatus(order, status);
    await order.save();
    // سفارش پرداخت‌شده با کیف پول: با لغو یا مرجوعی، مبلغ خودکار (یک‌بار) به کیف پول برمی‌گردد.
    if (status === "cancelled" || status === "returned") await walletService.refundOrder(order).catch((error) => console.error("wallet refund error:", error.message));
    res.json({ success: true, order: { ...(order.toObject ? order.toObject() : order), tracking: trackingView(order) } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// موجودی کیف پول کاربران (فقط خواندن) + دفتر تراکنش هر کاربر
router.get("/wallets", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const filter = {};
    const search = String(req.query.search || "").trim();
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const users = await User.find({ $or: [{ mobile: { $regex: escaped, $options: "i" } }, { firstName: { $regex: escaped, $options: "i" } }, { lastName: { $regex: escaped, $options: "i" } }] }).select("_id").limit(500).lean();
      filter.user = { $in: users.map((user) => user._id) };
    }
    const [total, wallets, totals] = await Promise.all([
      Wallet.countDocuments(filter),
      Wallet.find(filter).populate("user", "firstName lastName mobile").sort({ balance: -1, updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Wallet.aggregate([{ $group: { _id: null, sum: { $sum: "$balance" }, funded: { $sum: { $cond: [{ $gt: ["$balance", 0] }, 1, 0] } } } }]),
    ]);
    res.json({
      success: true,
      wallets: wallets.map((wallet) => ({ _id: wallet._id, userId: wallet.user?._id || null, firstName: wallet.user?.firstName || "", lastName: wallet.user?.lastName || "", mobile: wallet.user?.mobile || "", balance: wallet.balance, updatedAt: wallet.updatedAt })),
      summary: { totalBalance: totals[0]?.sum || 0, fundedWallets: totals[0]?.funded || 0 },
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get("/wallets/:userId/transactions", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ success: false, message: "شناسه کاربر نامعتبر است" });
    const [transactions, wallet] = await Promise.all([
      WalletTransaction.find({ user: req.params.userId }).sort({ createdAt: -1 }).limit(100).lean(),
      Wallet.findOne({ user: req.params.userId }).lean(),
    ]);
    res.json({ success: true, balance: wallet ? wallet.balance : 0, transactions });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

async function serializeAdminReview(review) {
  const item = review.toObject ? review.toObject() : review;
  const productId = String(item.productId);
  const productFilter = mongoose.isValidObjectId(productId)
    ? { $or: [{ _id: productId }, { slug: productId }, { legacyId: productId }] }
    : { $or: [{ slug: productId }, { legacyId: productId }] };
  const product = await Product.findOne(productFilter).select("name slug brand category mainImage images").lean();
  return { ...item, product: product || null };
}

router.get("/reviews", async (req, res) => {
  try {
    // همگام‌سازی یک‌باره/ایمن آمار نظرهای قدیمی هنگام باز شدن مدیریت نظرات.
    await refreshAllProductReviewStats();
    const status = ["pending", "approved", "rejected"].includes(req.query.status) ? req.query.status : "pending";
    const filter = status === "pending"
      ? { $or: [{ status: "pending" }, { status: { $exists: false } }] }
      : { status };
    const reviews = await Review.find(filter)
      .populate("userId", "firstName lastName mobile email nationalCode birthDate isVerified isActive createdAt lastLogin")
      .sort({ date: -1 })
      .lean();
    const detailed = await Promise.all(reviews.map(serializeAdminReview));
    res.json({ success: true, reviews: detailed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// روند ارسال سفارش: ادمین مرحله‌ها را تیک می‌زند و نوار پیشرفت مشتری جلو می‌رود.
router.patch("/orders/:id/tracking", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "سفارش پیدا نشد" });
    applyTrackingSteps(order, req.body.steps);
    await order.save();
    res.json({ success: true, order: { ...(order.toObject ? order.toObject() : order), tracking: trackingView(order) } });
  } catch (error) { res.status(error.statusCode || 500).json({ success: false, message: error.message }); }
});

router.patch("/reviews/:id/status", async (req, res) => {
  try {
    const status = req.body?.status;
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ success: false, message: "وضعیت نظر معتبر نیست" });
    }
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { $set: { status, moderatedAt: status === "pending" ? null : new Date() } },
      { returnDocument: "after" },
    );
    if (!review) return res.status(404).json({ success: false, message: "نظر پیدا نشد" });
    await refreshProductReviewStats(review.productId);
    res.json({ success: true, review: await serializeAdminReview(review) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
