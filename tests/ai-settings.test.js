const assert = require("assert");

let stored = null;
const settingPath = require.resolve("../src/models/Setting");
require.cache[settingPath] = {
  id: settingPath, filename: settingPath, loaded: true,
  exports: {
    findOne: () => ({ lean: async () => (stored ? { key: "ai", value: JSON.parse(JSON.stringify(stored)) } : null) }),
    updateOne: async (_q, update) => { stored = JSON.parse(JSON.stringify(update.$set.value)); },
  },
};
process.env.JWT_SECRET = "test-secret-1";
delete process.env.OPENAI_API_KEY; delete process.env.OPENAI_MODEL; delete process.env.AI_SETTINGS_SECRET;
const mongoose = require("mongoose");
const svc = require("../src/services/aiSettings");
Object.defineProperty(mongoose.connection, "readyState", { get: () => 1, configurable: true });

const KEY = "sk-proj-AbCdEf1234567890XyZ_wxyz";

(async () => {
  // رمزنگاری رفت‌وبرگشتی و تصادفی‌بودن (iv متفاوت)
  const a = svc.encrypt(KEY), b = svc.encrypt(KEY);
  assert.notStrictEqual(a, b);
  assert.ok(!a.includes("AbCdEf"));
  assert.strictEqual(svc.decrypt(a), KEY);
  assert.strictEqual(svc.mask(KEY), "sk-…wxyz");

  // بدون هیچ تنظیمی
  svc.resetAiCache();
  let cfg = await svc.getAiConfig();
  assert.deepStrictEqual([cfg.apiKey, cfg.source, cfg.model], ["", "none", "gpt-4o-mini"]);

  // کلید محیطی
  process.env.OPENAI_API_KEY = "sk-env-1234567890abcdefgh"; process.env.OPENAI_MODEL = "gpt-env";
  svc.resetAiCache();
  cfg = await svc.getAiConfig();
  assert.deepStrictEqual([cfg.source, cfg.model], ["env", "gpt-env"]);

  // اعتبارسنجی ورودی
  for (const bad of ["abc", "sk-short", "sk-has space 1234567890123456", "Bearer sk-1234567890123456789", "sk-" + "a".repeat(400)]) {
    await assert.rejects(() => svc.saveAiSettings({ apiKey: bad }), (e) => e.statusCode === 400, bad.slice(0, 20));
  }
  await assert.rejects(() => svc.saveAiSettings({ model: "bad model!" }), (e) => e.statusCode === 400);

  // ذخیرهٔ کلید پنل: رمزنگاری‌شده در دیتابیس، اولویت بر env، نمای عمومی بدون کلید
  const view = await svc.saveAiSettings({ apiKey: "  " + KEY + "  ", model: "gpt-4o" });
  assert.ok(stored.apiKeyEnc && !JSON.stringify(stored).includes("AbCdEf"), "کلید خام در دیتابیس نباشد");
  assert.deepStrictEqual([view.hasKey, view.masked, view.source, view.model], [true, "sk-…wxyz", "panel", "gpt-4o"]);
  assert.ok(!JSON.stringify(view).includes("AbCdEf1234"), "نمای عمومی کلید را نشان ندهد");
  cfg = await svc.getAiConfig();
  assert.strictEqual(cfg.apiKey, KEY);

  // ذخیرهٔ فقط مدل، کلید را نگه می‌دارد
  await svc.saveAiSettings({ model: "gpt-4o-mini" });
  assert.strictEqual((await svc.getAiConfig()).apiKey, KEY);
  // ارسال کلید خالی = بدون تغییر
  await svc.saveAiSettings({ apiKey: "", model: "gpt-4o-mini" });
  assert.strictEqual((await svc.getAiConfig()).apiKey, KEY);

  // عوض شدن JWT_SECRET: کلید پنل خوانا نیست و به env برمی‌گردد (بدون خطا)
  process.env.JWT_SECRET = "another-secret"; svc.resetAiCache();
  cfg = await svc.getAiConfig();
  assert.deepStrictEqual([cfg.source, cfg.apiKey], ["env", process.env.OPENAI_API_KEY]);
  process.env.JWT_SECRET = "test-secret-1"; svc.resetAiCache();
  assert.strictEqual((await svc.getAiConfig()).source, "panel");

  // حذف کلید پنل: به env برمی‌گردد؛ بدون env هیچ
  await svc.saveAiSettings({ clearKey: true });
  assert.strictEqual((await svc.getAiConfig()).source, "env");
  delete process.env.OPENAI_API_KEY;
  svc.resetAiCache();
  assert.strictEqual((await svc.getAiConfig()).source, "none");
  await assert.rejects(() => svc.testAiConnection(), (e) => e.statusCode === 400);

  // آزمایش اتصال: پاسخ‌های ۲۰۰/۴۰۱/۴۲۹ و قطع شبکه
  await svc.saveAiSettings({ apiKey: KEY });
  const real = global.fetch; let status = 200, calledWith = null;
  global.fetch = async (url, opts) => { calledWith = { url, auth: opts.headers.Authorization }; if (status === 0) throw new Error("ENOTFOUND"); return { ok: status === 200, status }; };
  assert.deepStrictEqual(await svc.testAiConnection(), { ok: true });
  assert.ok(calledWith.url.startsWith("https://api.openai.com/") && calledWith.auth === "Bearer " + KEY);
  status = 401; await assert.rejects(() => svc.testAiConnection(), (e) => e.statusCode === 400 && /۴۰۱/.test(e.message));
  status = 429; await assert.rejects(() => svc.testAiConnection(), (e) => e.statusCode === 400 && /۴۲۹/.test(e.message));
  status = 0; await assert.rejects(() => svc.testAiConnection(), (e) => e.statusCode === 502);
  global.fetch = real;

  console.log("AI settings test passed.");
})().catch((e) => { console.error(e); process.exit(1); });
