const express = require("express");
const router = express.Router();

// این router باید مستقل از middleware سراسری، بدنهٔ درخواست‌های ورود را بخواند.
router.use(express.json({ limit: "1mb" }));
router.use(express.urlencoded({ extended: true }));
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { authAttemptLimiter, otpMobileLimiter, otpIpLimiter } = require("../middleware/rateLimiters");
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

// ----- مرحله ۱: بررسی وجود کاربر -----
router.post(
  "/check-user",
  checkUserValidator,
  validate,
  authController.checkUser,
);

// ----- مرحله ۲: ارسال کد تأیید -----
router.post("/send-otp", otpIpLimiter, otpMobileLimiter, sendOtpValidator, validate, authController.sendOtp);

// ----- مرحله ۳: تأیید OTP و ورود -----
router.post(
  "/verify-login-otp",
  authAttemptLimiter,
  verifyLoginOtpValidator,
  validate,
  authController.verifyLoginOtp,
);

// ----- ورود با رمز عبور -----
router.post("/login", authAttemptLimiter, loginValidator, validate, authController.login);

// ----- فراموشی رمز عبور -----
router.post(
  "/forgot-password",
  otpIpLimiter,
  otpMobileLimiter,
  forgotPasswordValidator,
  validate,
  authController.forgotPassword,
);
router.post(
  "/verify-forgot-otp",
  authAttemptLimiter,
  verifyForgotOtpValidator,
  validate,
  authController.verifyForgotOtp,
);
router.post(
  "/reset-password",
  authAttemptLimiter,
  resetPasswordValidator,
  validate,
  authController.resetPassword,
);

// ----- ارسال مجدد OTP -----
router.post(
  "/resend-otp",
  otpIpLimiter,
  otpMobileLimiter,
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
