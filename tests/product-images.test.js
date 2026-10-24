// بهینه‌سازی تصویر محصول: آپلود به WebP و حداکثر ۱۶۰۰ پیکسل؛ اندازه‌های مجاز کارت.
const assert = require("assert");
const sharp = require("sharp");
const { optimizeUpload, pickWidth } = require("../src/utils/productImages");

(async () => {
  const big = await sharp({ create: { width: 3200, height: 2400, channels: 3, background: { r: 30, g: 90, b: 200 } } }).png().toBuffer();
  const out = await optimizeUpload({ buffer: big, mimetype: "image/png", originalname: "photo.final.png" });
  assert.strictEqual(out.mimetype, "image/webp");
  assert.strictEqual(out.originalname, "photo.final.webp");
  const meta = await sharp(out.buffer).metadata();
  assert.strictEqual(meta.format, "webp");
  assert.strictEqual(meta.width, 1600, "حداکثر ضلع ۱۶۰۰");
  assert.strictEqual(meta.height, 1200, "نسبت حفظ شود");
  assert.ok(out.buffer.length < big.length);

  const small = await sharp({ create: { width: 300, height: 300, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } } }).png().toBuffer();
  const smallOut = await optimizeUpload({ buffer: small, mimetype: "image/png", originalname: "a.png" });
  assert.strictEqual((await sharp(smallOut.buffer).metadata()).width, 300, "بزرگ نمی‌شود");

  const svg = { buffer: Buffer.from("<svg/>"), mimetype: "image/svg+xml", originalname: "x.svg" };
  assert.strictEqual(await optimizeUpload(svg), svg, "SVG دست نمی‌خورد");
  const broken = { buffer: Buffer.from("not an image"), mimetype: "image/png", originalname: "b.png" };
  assert.strictEqual(await optimizeUpload(broken), broken, "فایل خراب بدون خطا ذخیره می‌شود");

  assert.strictEqual(pickWidth("300"), 480);
  assert.strictEqual(pickWidth("240"), 240);
  assert.strictEqual(pickWidth("5000"), 1200);
  assert.strictEqual(pickWidth("abc"), 0);
  assert.strictEqual(pickWidth(undefined), 0);
  console.log("Product image tests passed.");
})().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
