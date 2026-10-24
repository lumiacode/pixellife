const mongoose = require("mongoose");
const { GridFSBucket, ObjectId } = require("mongodb");

const ROUTE_PREFIX = "/api/products/image/";

// sharp برای بهینه‌سازی تصویر است؛ اگر روی سرور نصب نباشد، رفتار قبلی (ذخیره/ارسال فایل اصلی) حفظ می‌شود.
let sharp = null;
try { sharp = require("sharp"); } catch (_) { sharp = null; }
const MAX_UPLOAD_SIDE = 1600;
const ALLOWED_WIDTHS = [240, 480, 800, 1200];
const resizeCache = new Map(); // "id:width" → { buffer }
const RESIZE_CACHE_MAX_BYTES = 40 * 1024 * 1024;
let resizeCacheBytes = 0;

async function optimizeUpload(file) {
  if (!sharp || !file || !file.buffer || /svg|gif/i.test(file.mimetype || "")) return file;
  try {
    const buffer = await sharp(file.buffer, { failOn: "none" })
      .rotate()
      .resize({ width: MAX_UPLOAD_SIDE, height: MAX_UPLOAD_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    if (buffer.length >= file.buffer.length && /webp/i.test(file.mimetype || "")) return file;
    const baseName = String(file.originalname || "product-image").replace(/\.[^.]+$/, "") || "product-image";
    return { ...file, buffer, mimetype: "image/webp", originalname: baseName + ".webp" };
  } catch (_) {
    return file;
  }
}

function bucket() {
  if (!mongoose.connection.db) {
    throw new Error("اتصال پایدار دیتابیس برای ذخیرهٔ تصویر آماده نیست");
  }
  return new GridFSBucket(mongoose.connection.db, { bucketName: "product_images" });
}

function mediaPath(id) {
  return ROUTE_PREFIX + String(id);
}

function idFromPath(value) {
  const match = String(value || "").match(/\/api\/products\/image\/([a-f0-9]{24})/i);
  return match ? new ObjectId(match[1]) : null;
}

async function saveProductImage(originalFile) {
  if (!originalFile || !originalFile.buffer) return "";
  const file = await optimizeUpload(originalFile);
  return new Promise((resolve, reject) => {
    const stream = bucket().openUploadStream(file.originalname || "product-image", {
      contentType: file.mimetype || "application/octet-stream",
      metadata: { kind: "product-image" },
    });
    stream.on("error", reject);
    stream.on("finish", () => resolve(mediaPath(stream.id)));
    stream.end(file.buffer);
  });
}

async function removeProductImage(value) {
  const id = idFromPath(value);
  if (!id) return;
  try {
    await bucket().delete(id);
  } catch (error) {
    if (error?.code !== 26) throw error;
  }
}

function pickWidth(value) {
  const requested = Number.parseInt(value, 10);
  if (!Number.isFinite(requested) || requested <= 0) return 0;
  return ALLOWED_WIDTHS.find((w) => w >= requested) || ALLOWED_WIDTHS[ALLOWED_WIDTHS.length - 1];
}

function readAll(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (c) => chunks.push(c));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function remember(key, buffer) {
  while (resizeCacheBytes + buffer.length > RESIZE_CACHE_MAX_BYTES && resizeCache.size) {
    const oldestKey = resizeCache.keys().next().value;
    resizeCacheBytes -= resizeCache.get(oldestKey).length;
    resizeCache.delete(oldestKey);
  }
  resizeCache.set(key, buffer);
  resizeCacheBytes += buffer.length;
}

async function streamResized(id, width, res) {
  const key = `${id}:${width}`;
  let buffer = resizeCache.get(key);
  if (buffer) {
    resizeCache.delete(key); resizeCache.set(key, buffer); // تازه‌ترین استفاده
  } else {
    const original = await readAll(bucket().openDownloadStream(new ObjectId(String(id))));
    buffer = await sharp(original, { failOn: "none" }).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    remember(key, buffer);
  }
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  res.type("image/webp").send(buffer);
}

// width: اندازهٔ دلخواه کارت (۲۴۰/۴۸۰/۸۰۰/۱۲۰۰)؛ برای تصویرهای قدیمیِ بزرگ هم حجم را کم می‌کند.
function streamProductImage(idValue, res, options = {}) {
  if (!ObjectId.isValid(idValue)) return false;
  const width = sharp ? pickWidth(options.width) : 0;
  if (width) {
    streamResized(idValue, width, res).catch(() => { if (!res.headersSent) res.status(404).end(); });
    return true;
  }
  const stream = bucket().openDownloadStream(new ObjectId(idValue));
  stream.on("file", (file) => {
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.type(file.contentType || "application/octet-stream");
  });
  stream.on("error", () => {
    if (!res.headersSent) res.status(404).end();
  });
  stream.pipe(res);
  return true;
}

module.exports = {
  optimizeUpload,
  pickWidth,
  removeProductImage,
  saveProductImage,
  streamProductImage,
};
