const assert = require("assert");
const path = require("path");

// Setting مدل را با یک ذخیره‌گاه حافظه‌ای جایگزین می‌کنیم
let stored = null;
let legacy = null;
const settingPath = require.resolve("../src/models/Setting");
require.cache[settingPath] = {
  id: settingPath, filename: settingPath, loaded: true,
  exports: {
    findOne: () => ({ lean: async () => (legacy ? { key: "shipping", value: { ...legacy } } : stored ? { key: "shipping", value: { methods: JSON.parse(JSON.stringify(stored.methods)) } } : null) }),
    updateOne: async (_q, update) => {
      // مسیر نقطه‌دار value.methods.<id>
      stored = stored || { methods: {} };
      Object.entries(update.$set).forEach(([k, v]) => { stored.methods[k.split(".")[2]] = { ...v }; });
    },
  },
};
const mongoose = require("mongoose");

const checkoutConfig = require("../src/config/checkout");
const svc = require("../src/services/shippingSettings");
const { buildQuote, shippingFee, loadShippingMethod } = require("../src/services/checkoutPricing");

// بعد از بارگذاری مدل‌ها تا mongoose سعی در ساخت collection نکند
Object.defineProperty(mongoose.connection, "readyState", { get: () => 1, configurable: true });

(async () => {
  const post = () => loadShippingMethod("post");
  // اعتبارسنجی ورودی
  assert.strictEqual(svc.normalizeShippingInput({ fee: "۲۰۰,۰۰۰", freeEnabled: false }).fee, 200000);
  assert.strictEqual(svc.normalizeShippingInput({ fee: 0, freeEnabled: false }).fee, 0);
  assert.throws(() => svc.normalizeShippingInput({ fee: "abc" }));
  assert.throws(() => svc.normalizeShippingInput({ fee: -5 }));
  assert.throws(() => svc.normalizeShippingInput({ fee: svc.MAX_FEE + 1 }));
  assert.throws(() => svc.normalizeShippingInput({ fee: 1000, freeEnabled: true, freeThreshold: 0 }));

  // بدون تنظیم ذخیره‌شده، مقدار پیش‌فرض همهٔ روش‌های تعریف‌شده
  svc.resetShippingCache();
  assert.strictEqual((await post()).fee, svc.DEFAULTS.fee);
  assert.strictEqual((await svc.getShippingMethods()).length, checkoutConfig.shippingMethods.length);

  // ذخیرهٔ تنظیم ادمین و اعمال روی محاسبهٔ سرور
  await svc.saveShippingMethod("post", { fee: 90000, freeEnabled: true, freeThreshold: 3000000, title: "پست پیشتاز" });
  let m = await post();
  assert.strictEqual(m.fee, 90000);
  assert.strictEqual(m.title, "پست پیشتاز");
  assert.strictEqual(shippingFee(m, 2999999), 90000);
  assert.strictEqual(shippingFee(m, 3000000), 0);

  // ارسال رایگان خاموش: هرگز رایگان نمی‌شود
  await svc.saveShippingMethod("post", { fee: 120000, freeEnabled: false });
  assert.strictEqual(shippingFee(await post(), 999999999), 120000);

  // هزینهٔ صفر یعنی همیشه رایگان
  await svc.saveShippingMethod("post", { fee: 0, freeEnabled: false });
  assert.strictEqual(shippingFee(await post(), 1000), 0);

  // روش ناشناخته و غیرفعال‌کردن تنها روش فعال
  await assert.rejects(() => svc.saveShippingMethod("nope", { fee: 1 }), (e) => e.statusCode === 404);
  await assert.rejects(() => svc.saveShippingMethod("post", { fee: 1, enabled: false }), (e) => e.statusCode === 400);

  // قالب قدیمی (تخت) همچنان خوانده می‌شود
  legacy = { fee: 77000, freeEnabled: false, freeThreshold: 0, title: "قدیمی", eta: "" };
  svc.resetShippingCache();
  assert.strictEqual((await post()).fee, 77000);

  console.log("Shipping settings test passed.");
})().catch((e) => { console.error(e); process.exit(1); });
