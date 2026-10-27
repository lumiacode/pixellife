const assert = require("assert");
const path = require("path");

// Setting مدل را با یک ذخیره‌گاه حافظه‌ای جایگزین می‌کنیم
let stored = null;
const settingPath = require.resolve("../src/models/Setting");
require.cache[settingPath] = {
  id: settingPath, filename: settingPath, loaded: true,
  exports: {
    findOne: () => ({ lean: async () => (stored ? { key: "shipping", value: { ...stored } } : null) }),
    updateOne: async (_q, update) => { stored = { ...update.$set.value }; },
  },
};
const mongoose = require("mongoose");

const svc = require("../src/services/shippingSettings");
const { buildQuote, shippingFee, loadShippingMethod } = require("../src/services/checkoutPricing");

// بعد از بارگذاری مدل‌ها تا mongoose سعی در ساخت collection نکند
Object.defineProperty(mongoose.connection, "readyState", { get: () => 1, configurable: true });

(async () => {
  // اعتبارسنجی ورودی
  assert.strictEqual(svc.normalizeShippingInput({ fee: "۲۰۰,۰۰۰", freeEnabled: false }).fee, 200000);
  assert.strictEqual(svc.normalizeShippingInput({ fee: 0, freeEnabled: false }).fee, 0);
  assert.throws(() => svc.normalizeShippingInput({ fee: "abc" }));
  assert.throws(() => svc.normalizeShippingInput({ fee: -5 }));
  assert.throws(() => svc.normalizeShippingInput({ fee: svc.MAX_FEE + 1 }));
  assert.throws(() => svc.normalizeShippingInput({ fee: 1000, freeEnabled: true, freeThreshold: 0 }));

  // بدون تنظیم ذخیره‌شده، مقدار پیش‌فرض
  svc.resetShippingCache();
  let m = await loadShippingMethod();
  assert.strictEqual(m.fee, svc.DEFAULTS.fee);

  // ذخیرهٔ تنظیم ادمین و اعمال روی محاسبهٔ سرور
  await svc.saveShippingSettings({ fee: 90000, freeEnabled: true, freeThreshold: 3000000, title: "پست پیشتاز" });
  m = await loadShippingMethod();
  assert.strictEqual(m.fee, 90000);
  assert.strictEqual(m.title, "پست پیشتاز");
  assert.strictEqual(shippingFee(m, 2999999), 90000);
  assert.strictEqual(shippingFee(m, 3000000), 0);

  // ارسال رایگان خاموش: هرگز رایگان نمی‌شود
  await svc.saveShippingSettings({ fee: 120000, freeEnabled: false });
  m = await loadShippingMethod();
  assert.strictEqual(shippingFee(m, 999999999), 120000);

  // هزینهٔ صفر یعنی همیشه رایگان
  await svc.saveShippingSettings({ fee: 0, freeEnabled: false });
  m = await loadShippingMethod();
  assert.strictEqual(shippingFee(m, 1000), 0);

  console.log("Shipping settings test passed.");
})().catch((e) => { console.error(e); process.exit(1); });
