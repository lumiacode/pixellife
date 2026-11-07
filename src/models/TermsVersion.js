const mongoose = require("mongoose");

// نسخهٔ کامل متن قوانین در لحظهٔ اولین تأیید؛ کلید آن اثر انگشت متن است. فقط اضافه می‌شود، ویرایش یا حذف نمی‌شود.
const termsVersionSchema = new mongoose.Schema(
  {
    hash: { type: String, required: true, unique: true },
    version: { type: String, default: "" },
    text: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

module.exports = mongoose.model("TermsVersion", termsVersionSchema);
