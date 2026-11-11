const multer = require("multer");
const ApiError = require("./ApiError");

// فایل‌ها ابتدا در حافظه دریافت و سپس در MongoDB GridFS ذخیره می‌شوند.
// برخلاف دیسک Render، GridFS بعد از redeploy پاک نمی‌شود.

// فقط قالب‌های تصویری بی‌خطر. SVG عمداً مجاز نیست: می‌تواند اسکریپت داشته باشد و چون تصویرها از همین دامنه
// سرو می‌شوند، به XSS ذخیره‌شده تبدیل می‌شود (آواتار نظرها را هر کاربر واردشده‌ای می‌تواند آپلود کند).
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

// نوع واقعی فایل از روی بایت‌های ابتدایی (mimetype را مرورگر/مهاجم اعلام می‌کند و قابل‌اعتماد نیست).
function sniffImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return "";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  const ascii = (from, to) => buffer.toString("latin1", from, to);
  if (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a") return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && /^(avif|avis)$/.test(ascii(8, 12))) return "image/avif";
  return "";
}

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 25, fields: 200, fieldSize: 2 * 1024 * 1024, parts: 260 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_TYPES.includes(String(file.mimetype || "").toLowerCase())) {
      return cb(new ApiError(400, "فقط تصویر JPG، PNG، WebP، GIF یا AVIF مجاز است"));
    }
    cb(null, true);
  },
});

// بعد از دریافت: محتوای واقعی هر فایل بررسی و mimetype با نوع واقعی جایگزین می‌شود.
function verifyUploadedImages(req, res, next) {
  const files = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  else if (req.files && typeof req.files === "object") Object.values(req.files).forEach((list) => files.push(...(Array.isArray(list) ? list : [])));
  for (const file of files) {
    const real = sniffImageType(file.buffer);
    if (!real) return next(new ApiError(400, "یکی از فایل‌ها تصویر معتبری نیست"));
    file.mimetype = real;
    // نام فایل فقط برچسب است؛ نویسه‌های مسیر و کنترلی حذف می‌شوند.
    file.originalname = String(file.originalname || "image").replace(/[\\/\u0000-\u001f<>:"|?*]+/g, "_").slice(-120) || "image";
  }
  next();
}

const wrap = (method) => (...args) => [multerUpload[method](...args), verifyUploadedImages];

module.exports = { single: wrap("single"), array: wrap("array"), fields: wrap("fields"), any: wrap("any"), none: (...args) => multerUpload.none(...args), sniffImageType, verifyUploadedImages, ALLOWED_TYPES, MAX_FILE_BYTES };
