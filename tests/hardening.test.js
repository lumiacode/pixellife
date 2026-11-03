// سخت‌سازی: رمز ادمین (هش/زمان‌ثابت)، محدودیت تعداد تلاش، escape ورودی‌های جست‌وجو، نبودن رازهای ثابت در کد، محافظت test-email.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const src = (...p) => path.join(root, "src", ...p);
const stub = (file, exports) => { const p = require.resolve(file); require.cache[p] = { id: p, filename: p, loaded: true, exports }; };

process.env.JWT_SECRET = "s"; process.env.MONGO_URI = "mongodb://x";
process.env.RATE_ADMIN_LOGIN_PER_15MIN = "3"; process.env.RATE_OTP_PER_10MIN = "2"; process.env.RATE_LOGIN_PER_15MIN = "3";
process.env.NODE_ENV = "test";

const express = require("express");
const bcrypt = require("bcryptjs");
const listen = (app) => new Promise((resolve) => { const server = app.listen(0, () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` })); });
const post = (url, body, headers = {}) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });

(async () => {
  // ۱) رمز ادمین
  const { verifyAdminPassword } = require(src("services", "adminPassword.js"));
  delete process.env.ADMIN_PASSWORD; delete process.env.ADMIN_PASSWORD_HASH;
  assert.deepStrictEqual(await verifyAdminPassword("x"), { configured: false, ok: false });
  process.env.ADMIN_PASSWORD = "plain-pass-123";
  assert.strictEqual((await verifyAdminPassword("plain-pass-123")).ok, true);
  assert.strictEqual((await verifyAdminPassword("plain-pass-124")).ok, false);
  assert.strictEqual((await verifyAdminPassword(undefined)).ok, false);
  assert.strictEqual((await verifyAdminPassword({ $ne: "" })).ok, false, "آبجکت به‌جای رشته پذیرفته نمی‌شود");
  process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash("hashed-pass-123", 4);
  assert.strictEqual((await verifyAdminPassword("hashed-pass-123")).ok, true);
  assert.strictEqual((await verifyAdminPassword("plain-pass-123")).ok, false, "با تنظیم هش، رمز ساده قدیمی کار نمی‌کند");

  // ۲) ورود ادمین + محدودیت تلاش + محافظت صفحه‌ها
  const adminApp = express();
  adminApp.use("/admin", require(src("routes", "admin.js")));
  let { server, base } = await listen(adminApp);
  try {
    let r = await post(base + "/admin/login", { password: "bad" });
    assert.strictEqual(r.status, 401);
    r = await fetch(base + "/admin/products", { redirect: "manual" });
    assert.strictEqual(r.status, 302, "بدون ورود، پنل بسته است");
    r = await post(base + "/admin/login", { password: "hashed-pass-123" });
    assert.strictEqual(r.status, 200, "رمز درست پس از تلاش‌های ناموفق، ورود موفق (موفق‌ها شمرده نمی‌شوند)");
    const cookie = (r.headers.get("set-cookie") || "").split(";")[0];
    assert.ok(cookie, "کوکی نشست");
    r = await fetch(base + "/admin/products", { redirect: "manual", headers: { cookie } });
    assert.strictEqual(r.status, 200, "بعد از ورود، پنل باز است");
    await post(base + "/admin/login", { password: "bad" }); await post(base + "/admin/login", { password: "bad" });
    r = await post(base + "/admin/login", { password: "bad" });
    assert.strictEqual(r.status, 429, "بعد از ۳ تلاش ناموفق، مسدود");
    assert.strictEqual((await r.json()).success, false);
  } finally { server.close(); }

  // ۳) محدودیت OTP برای هر شماره و محدودیت ورود برای هر IP
  const limiters = require(src("middleware", "rateLimiters.js"));
  const otpApp = express(); otpApp.use(express.json());
  otpApp.post("/otp", limiters.otpMobileLimiter, (req, res) => res.json({ ok: true }));
  otpApp.post("/login", limiters.authAttemptLimiter, (req, res) => res.json({ ok: true }));
  ({ server, base } = await listen(otpApp));
  try {
    assert.strictEqual((await post(base + "/otp", { identifier: "09120000000" })).status, 200);
    assert.strictEqual((await post(base + "/otp", { identifier: "۰۹۱۲۰۰۰۰۰۰۰" })).status, 200, "ارقام فارسی همان شماره است");
    assert.strictEqual((await post(base + "/otp", { identifier: "09120000000" })).status, 429, "سومین کد برای همان شماره مسدود");
    assert.strictEqual((await post(base + "/otp", { identifier: "09129999999" })).status, 200, "شمارهٔ دیگر آزاد است");
    for (let i = 0; i < 3; i += 1) assert.strictEqual((await post(base + "/login", {})).status, 200);
    assert.strictEqual((await post(base + "/login", {})).status, 429);
  } finally { server.close(); }

  // ۴) ورودی جست‌وجو و فیلتر: regex خام وارد کوئری نمی‌شود
  let lastFilter = null;
  const query = (list) => { const q = { select: () => q, sort: () => q, limit: () => q, lean: async () => list, then: (a, b) => Promise.resolve(list).then(a, b) }; return q; };
  stub(src("models", "Product.js"), { find: (f) => { lastFilter = f; return query([]); }, updateMany: async () => ({}) });
  stub(src("models", "Order.js"), {});
  stub(src("services", "reviewStats.js"), { withApprovedReviewStats: async (l) => l });
  stub(src("utils", "productImages.js"), { streamProductImage: () => {} });
  const prodApp = express(); prodApp.use("/api/products", require(src("routes", "products.js")));
  ({ server, base } = await listen(prodApp));
  try {
    await fetch(base + "/api/products?brand=" + encodeURIComponent("(a+)+$"));
    assert.strictEqual(lastFilter.brand.$regex, "\\(a\\+\\)\\+\\$", "برند ناشناخته escape می‌شود");
    await fetch(base + "/api/products?brand=" + encodeURIComponent("اپل"));
    assert.strictEqual(lastFilter.brand.$regex, "اپل|apple", "نام مستعار برند سالم می‌ماند");
    await fetch(base + "/api/products?search=" + encodeURIComponent("a{1,}(b"));
    assert.strictEqual(lastFilter.name.$regex, "a\\{1,\\}\\(b");
    await fetch(base + "/api/products?exclude[$ne]=x&limit=5");
    assert.strictEqual(lastFilter._id, undefined, "exclude آبجکتی نادیده گرفته می‌شود");
    await fetch(base + "/api/products?exclude=" + "a".repeat(24) + "&limit=6");
    assert.deepStrictEqual(lastFilter._id, { $ne: "a".repeat(24) });
  } finally { server.close(); }

  // ۵) رازهای ثابت در کد نیستند و test-email پشت ادمین است
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  walk(path.join(root, "src")).filter((f) => f.endsWith(".js")).forEach((f) => {
    const text = fs.readFileSync(f, "utf8");
    assert.ok(!/sasan1376/.test(text), `${path.relative(root, f)}: کلید ثابت maintenance`);
    assert.ok(!/change-me/.test(text), `${path.relative(root, f)}: رمز نشست ثابت`);
  });
  const appSource = fs.readFileSync(src("app.js"), "utf8");
  const testEmailMount = appSource.slice(appSource.indexOf('"/api/test-email"'), appSource.indexOf("testEmailRoutes,", appSource.indexOf('"/api/test-email"')));
  assert.ok(/adminSession/.test(testEmailMount) && /isAdmin/.test(testEmailMount), "/api/test-email باید پشت نشست ادمین باشد");
  assert.ok(/helmet\(/.test(appSource), "helmet فعال است");

  console.log("Hardening tests passed.");
})().catch((e) => { console.error(e); process.exit(1); }).then(() => process.exit(0));
