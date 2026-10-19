const { body, validationResult } = require("express-validator");
const ApiError = require("../utils/ApiError");

const MOBILE_REGEX = /^(\+98|0098|0)?9[0-9]{9}$/;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

/**
 * اعتبارسنجی شناسه کاربر (موبایل ایرانی یا ایمیل)
 */
const identifierValidation = () =>
  body("identifier")
    .trim()
    .notEmpty()
    .withMessage("شماره موبایل یا ایمیل الزامی است")
    .custom((value) => {
      const isMobile = MOBILE_REGEX.test(value);
      const isEmail = EMAIL_REGEX.test(value);
      if (!isMobile && !isEmail) {
        throw new Error("شماره موبایل یا ایمیل معتبر نیست");
      }
      return true;
    })
    .customSanitizer((value) => {
      // نرمال‌سازی شماره موبایل به فرمت استاندارد 09xx
      if (MOBILE_REGEX.test(value)) {
        return value.replace(/(\+98|0098)/, "0");
      }
      return value.toLowerCase().trim();
    });

/**
 * اعتبارسنجی رمز عبور
 */
const passwordValidation = () =>
  body("password")
    .trim()
    .notEmpty()
    .withMessage("رمز عبور الزامی است")
    .isLength({ min: 6 })
    .withMessage("رمز عبور باید حداقل ۶ کاراکتر باشد");

/**
 * اعتبارسنجی کد OTP
 */
const otpCodeValidation = () =>
  body("code")
    .trim()
    .notEmpty()
    .withMessage("کد تأیید الزامی است")
    .isNumeric()
    .withMessage("کد تأیید فقط باید شامل اعداد باشد");

/**
 * اعتبارسنجی نوع OTP
 */
const otpTypeValidation = () =>
  body("type")
    .trim()
    .notEmpty()
    .withMessage("نوع کد تأیید الزامی است")
    .isIn(["register", "login", "forgot"])
    .withMessage("نوع کد تأیید نامعتبر است");

/**
 * اعتبارسنجی تکمیل اطلاعات کاربری (نام و نام خانوادگی)
 */
const firstNameValidation = () =>
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("نام الزامی است")
    .isLength({ min: 2, max: 50 })
    .withMessage("نام باید بین ۲ تا ۵۰ کاراکتر باشد");

const lastNameValidation = () =>
  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("نام خانوادگی الزامی است")
    .isLength({ min: 2, max: 50 })
    .withMessage("نام خانوادگی باید بین ۲ تا ۵۰ کاراکتر باشد");

// --- Validators برای هر Endpoint ---

exports.checkUserValidator = [identifierValidation()];

exports.sendOtpValidator = [identifierValidation(), otpTypeValidation()];

exports.verifyLoginOtpValidator = [identifierValidation(), otpCodeValidation()];

exports.loginValidator = [identifierValidation(), passwordValidation()];

exports.forgotPasswordValidator = [identifierValidation()];

exports.verifyForgotOtpValidator = [
  identifierValidation(),
  otpCodeValidation(),
];

exports.resetPasswordValidator = [
  identifierValidation(),
  otpCodeValidation(),
  passwordValidation(),
];

// کد ملی و تاریخ تولد اختیاری‌اند؛ اگر پر شوند باید معتبر باشند.
const nationalCodeValidation = () =>
  body("nationalCode")
    .optional({ checkFalsy: true })
    .trim()
    .customSanitizer((value) =>
      String(value)
        .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
        .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit)),
    )
    .matches(/^\d{10}$/)
    .withMessage("کد ملی باید ۱۰ رقم باشد");

const birthDateValidation = () =>
  body("birthDate")
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("تاریخ تولد معتبر نیست");

exports.resendOtpValidator = [identifierValidation(), otpTypeValidation()];

exports.completeProfileValidator = [
  firstNameValidation(),
  lastNameValidation(),
  nationalCodeValidation(),
  birthDateValidation(),
];

/**
 * میدلور بررسی نتایج Validation
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array()[0].msg;
    return next(new ApiError(400, message));
  }
  next();
};
