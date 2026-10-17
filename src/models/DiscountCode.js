const mongoose = require("mongoose");

const discountCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, trim: true, default: "" },
    type: { type: String, enum: ["percent", "fixed"], required: true, default: "percent" },
    // percent: درصد (۱ تا ۱۰۰) — fixed: مبلغ ثابت به تومان
    value: { type: Number, required: true, min: 1 },
    // سقف تخفیف برای نوع درصدی؛ صفر یعنی بدون سقف
    maxDiscount: { type: Number, default: 0, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    // صفر یعنی نامحدود
    usageLimit: { type: Number, default: 0, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("DiscountCode", discountCodeSchema);
