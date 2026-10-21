const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: "آدرس",
    },
    province: {
      type: String,
      trim: true,
      required: [true, "استان الزامی است"],
    },
    city: {
      type: String,
      trim: true,
      required: [true, "شهر الزامی است"],
    },
    fullAddress: {
      type: String,
      trim: true,
      required: [true, "آدرس کامل الزامی است"],
    },
    postalCode: {
      type: String,
      trim: true,
      required: [true, "کد پستی الزامی است"],
      match: [/^\d{10}$/, "کد پستی باید ۱۰ رقم باشد"],
    },
    // موقعیت جغرافیایی (GPS) اختیاری است و فقط با اجازهٔ کاربر ثبت می‌شود.
    location: {
      type: new mongoose.Schema(
        {
          lat: { type: Number, min: -90, max: 90, required: true },
          lng: { type: Number, min: -180, max: 180, required: true },
          accuracy: { type: Number, min: 0 },
        },
        { _id: false },
      ),
      default: undefined,
    },
    receiverName: {
      type: String,
      trim: true,
    },
    receiverMobile: {
      type: String,
      trim: true,
      match: [/^09\d{9}$/, "شماره موبایل گیرنده معتبر نیست"],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Address", addressSchema);
