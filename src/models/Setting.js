const mongoose = require("mongoose");

// تنظیمات سایت که ادمین از پنل عوض می‌کند (مثلاً هزینهٔ ارسال)؛ هر تنظیم یک سند با کلید یکتاست.
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Setting || mongoose.model("Setting", settingSchema);
