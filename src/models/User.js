const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      unique: true,
      sparse: true,
      match: [/^(\+98|0098|0)?9[0-9]{9}$/, "شماره موبایل معتبر نیست"],
    },
    firstName: {
      type: String,
      trim: true,
      default: "",
    },
    lastName: {
      type: String,
      trim: true,
      default: "",
    },
    nationalCode: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: (v) => !v || /^\d{10}$/.test(v),
        message: "کد ملی باید ۱۰ رقم باشد",
      },
    },
    birthDate: {
      type: Date,
      default: null,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "ایمیل معتبر نیست"],
    },
    password: {
      type: String,
      minlength: [6, "رمز عبور باید حداقل ۶ کاراکتر باشد"],
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    // اتصال امن حساب کاربر به بازوی بله برای ارسال فاکتور
    baleChatId: { type: String, default: "", index: true },
    baleLinkCode: { type: String, default: "", select: false },
    baleLinkExpiresAt: { type: Date, default: null, select: false },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// هش رمز قبل از ذخیره
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// مقایسه رمز
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// بررسی وجود رمز عبور
userSchema.methods.hasPassword = function () {
  return !!this.password;
};

module.exports = mongoose.model("User", userSchema);
