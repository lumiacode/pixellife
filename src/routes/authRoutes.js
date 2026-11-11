const express = require("express");
const router = express.Router();

// این router باید مستقل از middleware سراسری، بدنهٔ درخواست‌های ورود را بخواند.
router.use(express.json({ limit: "1mb" }));
router.use(express.urlencoded({ extended: true }));
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const {
  checkUserValidator,
  sendOtpValidator,
  verifyLoginOtpValidator,
  loginValidator,
  forgotPasswordValidator,
  verifyForgotOtpValidator,
  resetPasswordValidator,
  resendOtpValidator,
  completeProfileValidator,
  validate,
} = require("../validators/authValidator");

// ----- محدودیت تعداد درخواست (جلوگیری از حدس رمز/کد، شمارش کاربران و هزینهٔ پیامک) -----
// سقف ارسال پیامک برای هر «شماره» جداگانه در otpService هست؛ این‌ها برای هر IP (و در ورود با رمز، هر حساب) است.
const { rateLimit } = require("../middleware/security");
const minutes = (n) => n * 60 * 1000;
const idOf = (req) => String((req.body && req.body.identifier) || "").trim().toLowerCase().slice(0, 80);
router.use("/check-user", rateLimit({ windowMs: minutes(10), max: 40 }));
router.use(["/send-otp", "/resend-otp", "/forgot-password"], rateLimit({ windowMs: minutes(60), max: 15, message: "درخواست کد از این دستگاه زیاد بود؛ حدود یک ساعت دیگر دوباره تلاش کنید" }));
router.use(["/verify-login-otp", "/verify-forgot-otp", "/reset-password"], rateLimit({ windowMs: minutes(10), max: 30 }));
// ورود با رمز: ۱۰ تلاش در ۱۵ دقیقه برای هر IP و ۱۰ تلاش برای هر حساب (از هر IP)
router.use("/login", rateLimit({ windowMs: minutes(15), max: 10, message: "تلاش برای ورود زیاد بود؛ ۱۵ دقیقهٔ دیگر دوباره امتحان کنید" }));
router.use("/login", rateLimit({ windowMs: minutes(15), max: 10, key: (req) => "id:" + idOf(req), message: "تلاش برای ورود به این حساب زیاد بود؛ ۱۵ دقیقهٔ دیگر دوباره امتحان کنید" }));

// ----- مرحله ۱: بررسی وجود کاربر -----
router.post(
  "/check-user",
  checkUserValidator,
  validate,
  authController.checkUser,
);

// ----- مرحله ۲: ارسال کد تأیید -----
router.post("/send-otp", sendOtpValidator, validate, authController.sendOtp);

// ----- مرحله ۳: تأیید OTP و ورود -----
router.post(
  "/verify-login-otp",
  verifyLoginOtpValidator,
  validate,
  authController.verifyLoginOtp,
);

// ----- ورود با رمز عبور -----
router.post("/login", loginValidator, validate, authController.login);

// ----- فراموشی رمز عبور -----
router.post(
  "/forgot-password",
  forgotPasswordValidator,
  validate,
  authController.forgotPassword,
);
router.post(
  "/verify-forgot-otp",
  verifyForgotOtpValidator,
  validate,
  authController.verifyForgotOtp,
);
router.post(
  "/reset-password",
  resetPasswordValidator,
  validate,
  authController.resetPassword,
);

// ----- ارسال مجدد OTP -----
router.post(
  "/resend-otp",
  resendOtpValidator,
  validate,
  authController.resendOtp,
);

// ----- تکمیل اطلاعات کاربری (نام و نام خانوادگی) -----
router.post(
  "/complete-profile",
  protect,
  completeProfileValidator,
  validate,
  authController.completeProfile,
);

// ----- دریافت اطلاعات کاربر جاری -----
router.get("/me", protect, authController.me);

// ----- خروج -----
// POST روش اصلی است؛ GET فقط برای صفحه‌های قدیمیِ کش‌شده نگه داشته شده.
router.post("/logout", authController.logout);
router.get("/logout", authController.logout);

module.exports = router;
