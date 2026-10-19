const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: [true, "شناسه (موبایل یا ایمیل) الزامی است"],
    },
    code: {
      type: String,
      required: [true, "کد تأیید الزامی است"],
    },
    type: {
      type: String,
      enum: ["register", "login", "forgot"],
      required: [true, "نوع کد تأیید الزامی است"],
    },
    channel: {
      type: String,
      enum: ["sms", "email"],
      default: "sms",
    },
    expiresAt: {
      type: Date,
      required: [true, "زمان انقضای کد الزامی است"],
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    // تعداد دفعات واردکردن کد؛ بعد از سقف مجاز، کد باطل می‌شود (جلوگیری از حدس‌زدن).
    attempts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// ایجاد ایندکس
otpSchema.index({ identifier: 1, type: 1 });

module.exports = mongoose.model("OTP", otpSchema);
