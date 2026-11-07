const mongoose = require("mongoose");

// مدرک پذیرش قوانین هنگام ثبت‌نام. هر ثبت‌نام یک رکورد؛ ویرایش یا حذف از مسیرهای برنامه وجود ندارد.
const termsAcceptanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    mobile: { type: String, default: "", index: true },
    termsHash: { type: String, required: true },
    termsVersion: { type: String, default: "" },
    consentText: { type: String, required: true },
    method: { type: String, default: "checkbox+sms-otp" },
    acceptedAt: { type: Date, required: true },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

module.exports = mongoose.model("TermsAcceptance", termsAcceptanceSchema);
