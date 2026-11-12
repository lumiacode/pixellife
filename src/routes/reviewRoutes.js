const express = require("express");
const mongoose = require("mongoose");
const Review = require("../models/review");
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../utils/upload");
const { saveProductImage } = require("../utils/productImages");
const { refreshProductReviewStats, productReviewKeys } = require("../services/reviewStats");

const router = express.Router();

function publicReview(review) {
  return {
    id: review._id,
    userName: review.userName,
    avatar: review.avatar || "",
    rating: review.rating,
    comment: review.comment,
    pros: review.pros || [],
    cons: review.cons || [],
    verified: review.verified,
    date: review.date,
    helpful: review.helpful || 0,
    reply: review.reply || null,
  };
}

router.get("/:productId", async (req, res) => {
  try {
    const id = String(req.params.productId).trim();
    const alternatives = [{ slug: id }, { legacyId: id }];
    if (mongoose.isValidObjectId(id)) alternatives.push({ _id: id });
    const product = await Product.findOne({ $or: alternatives }).select("_id slug legacyId").lean();
    const keys = product ? productReviewKeys(product) : [id];
    const reviews = await Review.find({ productId: { $in: keys }, status: "approved" })
      .sort({ date: -1 })
      .lean();
    res.json({ success: true, reviews: reviews.map(publicReview) });
  } catch (error) {
    res.status(500).json({ success: false, error: "دریافت نظرها انجام نشد" });
  }
});

// هر کاربر حداکثر ۱۰ نظر در ساعت؛ متن‌ها بدون تگ HTML و با سقف طول ذخیره می‌شوند.
const { rateLimit } = require("../middleware/security");
const reviewLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, key: (req) => "u:" + String(req.user && req.user._id), message: "تعداد نظرهای ثبت‌شده زیاد بود؛ بعداً دوباره تلاش کنید" });
const plainText = (value, max) => String(value == null ? "" : value).replace(/<[^>]*>/g, "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
const normalizeList = (value) => {
  let list = value;
  if (typeof value === "string") { try { list = JSON.parse(value || "[]"); } catch (_) { list = []; } }
  return (Array.isArray(list) ? list : []).slice(0, 8).map((item) => plainText(item, 120)).filter(Boolean);
};

router.post("/", protect, reviewLimiter, upload.single("avatar"), async (req, res) => {
  try {
    const { productId, rating, comment, pros, cons } = req.body || {};
    const requestedProductId = String(productId || "").trim().slice(0, 200);
    const normalizedComment = plainText(comment, 2000);
    // نظر فقط برای محصول موجود ثبت می‌شود (شناسهٔ ساختگی = نظر یتیم و دورزدن «یک نظر برای هر محصول»).
    const productFilter = [{ slug: requestedProductId }, { legacyId: requestedProductId }];
    if (mongoose.isValidObjectId(requestedProductId)) productFilter.push({ _id: requestedProductId });
    const reviewedProduct = requestedProductId ? await Product.findOne({ $or: productFilter }).select("_id").lean() : null;
    if (!reviewedProduct) return res.status(404).json({ success: false, error: "محصول پیدا نشد" });
    const normalizedProductId = requestedProductId;
    const numericRating = Number(rating);

    if (!normalizedProductId || !normalizedComment || !Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, error: "اطلاعات نظر کامل و معتبر نیست" });
    }

    const userName = [req.user.firstName, req.user.lastName].filter(Boolean).join(" ").trim()
      || req.user.mobile
      || "کاربر پیکسل‌لایف";

    let avatar = req.user.avatar || "";
    if (req.file) {
      avatar = await saveProductImage(req.file);
      req.user.avatar = avatar;
      await req.user.save({ validateBeforeSave: false });
    }

    const review = await Review.create({
      productId: normalizedProductId,
      userId: req.user._id,
      userName,
      avatar,
      rating: numericRating,
      comment: normalizedComment,
      pros: normalizeList(pros),
      cons: normalizeList(cons),
      verified: false,
      status: "pending",
    });

    await refreshProductReviewStats(normalizedProductId);

    res.status(201).json({ success: true, review: publicReview(review) });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ success: false, error: "شما قبلاً برای این محصول نظر ثبت کرده‌اید" });
    }
    console.error("Review create error:", error.message);
    res.status(400).json({ success: false, error: error && error.name === "ValidationError" ? "اطلاعات نظر معتبر نیست" : "ثبت نظر انجام نشد" });
  }
});

module.exports = router;
