const mongoose = require("mongoose");
const slugify = require("slugify");
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      unique: true,
      required: true,
    },
    legacyId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
      default: "نامشخص",
    },
    category: {
      type: String,
      default: "عمومی",
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
    },
    introTitle: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "معرفی کالا",
    },
    reviewTitle: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "بررسی تخصصی",
    },
    attentionNote: {
      type: String,
      trim: true,
      default: "",
    },
    specs: {
      type: String,
    },
    // مشخصات گروه‌بندی‌شده برای نمایش حرفه‌ای در صفحهٔ محصول.
    // specs قدیمی برای سازگاری با محصولاتی که قبلاً ثبت شده‌اند نگه داشته می‌شود.
    technicalSpecs: [{
      title: { type: String, trim: true, maxlength: 80 },
      subtitle: { type: String, trim: true, maxlength: 120, default: "" },
      description: { type: String, trim: true, maxlength: 1200, default: "" },
      items: [{
        label: { type: String, trim: true, maxlength: 100 },
        value: { type: String, trim: true, maxlength: 500 },
      }],
    }],
    // مشخصات فنی برای کالاهایی که جدول مشخصات ندارند، قابل غیرفعال‌کردن است.
    showSpecs: { type: Boolean, default: true },
    featured: {
      type: Boolean,
      default: false,
    },
    availability: {
      type: String,
      default: "in",
    },
    images: [
      {
        type: String,
      },
    ],
    mainImage: {
      type: String,
      default: "",
    },
    // لینک عمومی ویدیو (مثلاً از فضای ابری آروان). فایل ویدیو روی سرور فروشگاه ذخیره نمی‌شود.
    videoUrl: {
      type: String,
      trim: true,
      default: "",
    },
    // تا پنج ویدیو در گالری هر محصول؛ videoUrl برای سازگاری با محصولات قبلی نگه داشته شده است.
    videoUrls: [{
      type: String,
      trim: true,
    }],
    // تا پنج ویدیوی بررسی مستقل از گالری محصول.
    reviewVideoUrls: [{
      type: String,
      trim: true,
    }],
    colors: [
      {
        name: { type: String, trim: true },
        hex: { type: String, default: "#334155" },
      },
    ],
    // رنگ‌ها برای کالای ناموجود به‌صورت پیش‌فرض در صفحه محصول پنهان می‌شوند.
    hideColorsWhenOutOfStock: { type: Boolean, default: true },
    // هر ردیف یک ترکیب واقعیِ قابل فروش است: حافظه + رنگ + موجودی.
    // برای محصولات قدیمی که تنوع ندارند، stock اصلی همچنان معتبر می‌ماند.
    variants: [
      {
        _id: false,
        storage: { type: String, trim: true, default: "" },
        color: {
          name: { type: String, trim: true, default: "" },
          hex: { type: String, default: "#334155" },
        },
        stock: { type: Number, default: 0, min: 0 },
        price: { type: Number, min: 0 },
      },
    ],
    storages: [{ type: String }],
    // لوازم جانبی و کالاهای بدون ظرفیت انتخابی، نباید گزینهٔ حافظه در صفحهٔ محصول داشته باشند.
    hasStorage: { type: Boolean, default: true },
    warranties: [{ type: String }],
    // گارانتی هم می‌تواند برای محصولاتی مثل لوازم جانبی غیرفعال شود.
    hasWarranty: { type: Boolean, default: true },
    reviewImages: [{ type: String }],
    showReview: { type: Boolean, default: false },
    reviewSections: [{
      _id: false,
      enabled: { type: Boolean, default: true },
      title: { type: String, trim: true, default: "" },
      content: { type: String, default: "" },
      images: [{ type: String }],
      // اندازهٔ نمایش هر عکس، با همان ترتیب آرایهٔ images ذخیره می‌شود.
      imageSizes: [{ type: String, enum: ["small", "medium", "large", "full"], default: "large" }],
    }],
    // محتوای اختصاصی بخش نقاط قوت/ضعف و جمع‌بندی بررسی تخصصی.
    reviewPros: [{ type: String, trim: true }],
    reviewCons: [{ type: String, trim: true }],
    reviewVerdict: { type: String, trim: true, default: "" },
    reviewVerdictScore: { type: Number, min: 0, max: 10, default: null },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    comingSoon: { type: Boolean, default: false },
    amazingOffer: { type: Boolean, default: false },
    amazingOfferEndsAt: { type: Date, default: null },
    stock: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);
productSchema.pre("validate", function () {
  if (this.isModified("name") && !this.slug) {
    this.slug = slugify(`${this.name}-${Date.now()}`, {
      lower: true,
      strict: true,
    });
  }
});
productSchema.index({ category: 1, featured: -1, createdAt: -1 });
productSchema.index({ category: 1, price: 1 });
module.exports = mongoose.model("Product", productSchema);
