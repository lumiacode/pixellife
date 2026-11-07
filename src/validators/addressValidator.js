const { body, validationResult } = require("express-validator");
const { faOnly } = require("../utils/persianText");
const ApiError = require("../utils/ApiError");

const toEnglishDigits = (value) =>
  String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit))
    .replace(/\s/g, "");

// کد پستی ۱۰ رقمی؛ هنگام ایجاد اجباری است و هنگام ویرایش (اگر فرستاده شود) باید معتبر باشد.
const postalCodeValidation = (required) => {
  const chain = body("postalCode");
  return (required ? chain : chain.optional({ checkFalsy: true }))
    .customSanitizer(toEnglishDigits)
    .notEmpty()
    .withMessage("کد پستی الزامی است")
    .matches(/^\d{10}$/)
    .withMessage("کد پستی باید ۱۰ رقم باشد");
};

// موقعیت GPS اختیاری؛ اگر بیاید باید مختصات معتبر باشد (null یعنی حذف موقعیت).
const locationValidation = () => [
  body("location").optional({ nullable: true }).isObject().withMessage("موقعیت نامعتبر است"),
  body("location.lat").if(body("location").isObject()).isFloat({ min: -90, max: 90 }).withMessage("عرض جغرافیایی نامعتبر است"),
  body("location.lng").if(body("location").isObject()).isFloat({ min: -180, max: 180 }).withMessage("طول جغرافیایی نامعتبر است"),
  body("location.accuracy").optional({ nullable: true }).isFloat({ min: 0 }).withMessage("دقت موقعیت نامعتبر است"),
];

const receiverMobileValidation = () =>
  body("receiverMobile")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^09\d{9}$/)
    .withMessage("شماره موبایل گیرنده معتبر نیست");

// نام گیرنده و عنوان آدرس (اختیاری): اگر آمد فقط فارسی
const personTextValidation = () => [
  body("receiverName").optional({ checkFalsy: true }).trim().custom(faOnly).withMessage("نام گیرنده را فقط با حروف فارسی وارد کنید"),
  body("title").optional({ checkFalsy: true }).trim().custom(faOnly).withMessage("عنوان آدرس را فقط با حروف فارسی وارد کنید"),
];

// ایجاد آدرس: فیلدهای اصلی الزامی هستند
exports.createAddressValidator = [
  body("province").trim().notEmpty().withMessage("استان الزامی است").custom(faOnly).withMessage("استان را فقط با حروف فارسی وارد کنید"),
  body("city").trim().notEmpty().withMessage("شهر الزامی است").custom(faOnly).withMessage("شهر را فقط با حروف فارسی وارد کنید"),
  body("fullAddress")
    .trim()
    .notEmpty()
    .withMessage("آدرس کامل الزامی است")
    .isLength({ min: 10 })
    .withMessage("آدرس کامل باید حداقل ۱۰ کاراکتر باشد")
    .custom(faOnly)
    .withMessage("آدرس را فقط با حروف فارسی وارد کنید"),
  postalCodeValidation(true),
  ...locationValidation(),
  receiverMobileValidation(),
  ...personTextValidation(),
];

// ویرایش آدرس: فیلدها اختیاری هستند، اما در صورت ارسال باید معتبر باشند
exports.updateAddressValidator = [
  body("province")
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .withMessage("استان نامعتبر است")
    .custom(faOnly)
    .withMessage("استان را فقط با حروف فارسی وارد کنید"),
  body("city")
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .withMessage("شهر نامعتبر است")
    .custom(faOnly)
    .withMessage("شهر را فقط با حروف فارسی وارد کنید"),
  body("fullAddress")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 10 })
    .withMessage("آدرس کامل باید حداقل ۱۰ کاراکتر باشد")
    .custom(faOnly)
    .withMessage("آدرس را فقط با حروف فارسی وارد کنید"),
  postalCodeValidation(false),
  ...locationValidation(),
  receiverMobileValidation(),
  ...personTextValidation(),
];

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array()[0].msg;
    return next(new ApiError(400, message));
  }
  next();
};
