const ApiError = require("../utils/ApiError");
const env = require("../config/env");

/**
 * میدلور سراسری مدیریت خطا
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // خطاهای Mongoose Validation
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)[0].message;
    error = new ApiError(400, message);
  }

  // خطای تکراری بودن (duplicate key)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message =
      field === "mobile"
        ? "این شماره موبایل قبلاً ثبت شده است"
        : "این مقدار قبلاً ثبت شده است";
    error = new ApiError(400, message);
  }

  // خطای CastError (مثلاً ObjectId نامعتبر)
  if (err.name === "CastError") {
    error = new ApiError(400, "شناسه نامعتبر است");
  }

  // خطاهای آپلود فایل (multer): حجم، تعداد یا نوع نامجاز
  if (err.name === "MulterError") {
    const messages = { LIMIT_FILE_SIZE: "حجم هر تصویر حداکثر ۵ مگابایت است", LIMIT_FILE_COUNT: "تعداد فایل‌ها بیش از حد مجاز است", LIMIT_UNEXPECTED_FILE: "فایل ارسالی مجاز نیست" };
    error = new ApiError(400, messages[err.code] || "آپلود فایل ناموفق بود");
  }
  // بدنهٔ JSON خراب یا بیش از حد بزرگ
  if (err.type === "entity.parse.failed") error = new ApiError(400, "قالب درخواست معتبر نیست");
  if (err.type === "entity.too.large") error = new ApiError(413, "حجم درخواست بیش از حد مجاز است");

  // خطای JSON Web Token
  if (err.name === "JsonWebTokenError") {
    error = new ApiError(401, "توکن نامعتبر است");
  }

  // خطای انقضای توکن
  if (err.name === "TokenExpiredError") {
    error = new ApiError(401, "توکن منقضی شده است. لطفاً دوباره وارد شوید");
  }

  const status = error.statusCode || 500;
  // خطای پیش‌بینی‌نشده: متن واقعی فقط در لاگ سرور؛ کاربر پیام کلی می‌بیند (بدون stack، مسیر فایل یا پیام دیتابیس).
  if (status >= 500) console.error(`[error] ${req.method} ${req.originalUrl}:`, err && err.stack ? err.stack : err);
  res.status(status).json({
    success: false,
    message: status >= 500 ? "خطای سرور؛ لطفاً دوباره تلاش کنید" : error.message || "درخواست نامعتبر است",
    // stack فقط وقتی NODE_ENV صریحاً development باشد (نه وقتی تنظیم نشده)
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
