const assert = require("assert");

let stored = null;
const settingPath = require.resolve("../src/models/Setting");
require.cache[settingPath] = {
  id: settingPath, filename: settingPath, loaded: true,
  exports: {
    findOne: () => ({ lean: async () => (stored ? { key: "support", value: { ...stored } } : null) }),
    updateOne: async (_q, update) => { stored = { ...update.$set.value }; },
  },
};
const mongoose = require("mongoose");
const svc = require("../src/services/supportSettings");
Object.defineProperty(mongoose.connection, "readyState", { get: () => 1, configurable: true });

(async () => {
  const n = svc.normalizeBaleUrl;
  // قالب‌های مجاز
  assert.strictEqual(n("https://ble.ir/pixellife_support"), "https://ble.ir/pixellife_support");
  assert.strictEqual(n("ble.ir/pixellife_support"), "https://ble.ir/pixellife_support");
  assert.strictEqual(n("@pixellife_support"), "https://ble.ir/pixellife_support");
  assert.strictEqual(n("pixellife_support"), "https://ble.ir/pixellife_support");
  assert.strictEqual(n("https://ble.ir/pixellife?utm=1#x"), "https://ble.ir/pixellife");
  assert.strictEqual(n("http://web.bale.ai/chat/123"), "https://web.bale.ai/chat/123");
  assert.strictEqual(n(""), "");
  // نامعتبر یا خطرناک
  assert.throws(() => n("https://evil.example/pixellife"), (e) => e.statusCode === 400);
  assert.throws(() => n("javascript:alert(1)"), (e) => e.statusCode === 400);
  assert.throws(() => n("https://ble.ir/"), (e) => e.statusCode === 400);
  assert.throws(() => n("https://ble.ir.evil.com/x1"), (e) => e.statusCode === 400);

  // بدون تنظیم: خالی؛ با متغیر محیطی: همان
  svc.resetSupportCache();
  delete process.env.BALE_SUPPORT_URL;
  assert.strictEqual((await svc.getSupportSettings()).baleUrl, "");
  process.env.BALE_SUPPORT_URL = "https://ble.ir/from_env";
  svc.resetSupportCache();
  assert.strictEqual((await svc.getSupportSettings()).baleUrl, "https://ble.ir/from_env");
  // تنظیم پنل بر متغیر محیطی مقدم است
  await svc.saveSupportSettings({ baleUrl: "@panel_user" });
  assert.strictEqual((await svc.getSupportSettings()).baleUrl, "https://ble.ir/panel_user");
  // خالی‌کردن: دکمه برداشته می‌شود (و به env برمی‌گردد اگر هست)
  delete process.env.BALE_SUPPORT_URL;
  await svc.saveSupportSettings({ baleUrl: "" });
  assert.strictEqual((await svc.getSupportSettings()).baleUrl, "");
  console.log("Support settings test passed.");
})().catch((e) => { console.error(e); process.exit(1); });
