// نگهبان اصلاح‌های ممیزی امنیتی: XSS نظرها، توکن ورود، کد یک‌بارمصرف، اقلام سفارش، regex ورودی و تأیید اتمیک پرداخت (بدون دیتابیس).
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const Module = require("module");
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1/none";
const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const src = (...parts) => path.join(root, "src", ...parts);
const stub = (file, exportsValue) => { const id = require.resolve(file); require.cache[id] = { id, filename: id, loaded: true, exports: exportsValue, children: [], paths: [] }; };

(async () => {
  /* ۱) نظرهای صفحهٔ محصول: متن کاربر escape می‌شود و آواتار فقط از مسیر تصویر سایت */
  const product = read("views/product.html");
  assert.ok(product.includes("comment: escapeCartText(r.comment)") && product.includes("name: escapeCartText(r.userName"));
  assert.ok(product.includes(".map(escapeCartText)") && product.includes("reply: r.reply ? escapeCartText(r.reply)"));
  assert.ok(!/comment:\s*r\.comment,/.test(product) && !/avatar:\s*r\.avatar\s*\|\|/.test(product));
  const reviews = read("src/routes/reviewRoutes.js");
  assert.ok(reviews.includes("reviewLimiter") && reviews.includes("plainText(comment, 2000)") && reviews.includes('error: "محصول پیدا نشد"'));
  assert.ok(!reviews.includes("error: error.message"));

  /* ۲) توکن ورود دیگر در localStorage ذخیره نمی‌شود */
  for (const file of ["views/index.html", "views/cart.html", "views/product.html", "views/console.html", "views/iphone.html", "public/js/auth-modal.js", "public/auth-modal.js", "public/auth-modal-core.js"]) {
    assert.ok(!/localStorage\.setItem\("(?:token|authToken)",\s*(?:token|result\.token)\)/.test(read(file)), file);
  }
  assert.ok(read("public/js/auth-session.js").includes('localStorage.setItem(key, "1")'));

  /* ۳) نسخهٔ توکن: توکن صادرشده پیش از تغییر رمز پذیرفته نمی‌شود */
  const tokenService = require(src("services", "tokenService.js"));
  const oldToken = tokenService.verifyToken(tokenService.generateToken("u1", 0));
  assert.strictEqual(tokenService.isCurrent(oldToken, { tokenVersion: 0 }), true);
  assert.strictEqual(tokenService.isCurrent(oldToken, { tokenVersion: 1 }), false);
  assert.strictEqual(tokenService.isCurrent({ id: "u1" }, {}), true, "توکن‌های قدیمیِ بدون نسخه معتبر می‌مانند");
  const jwt = require("jsonwebtoken");
  assert.throws(() => tokenService.verifyToken(jwt.sign({ id: "u1" }, process.env.JWT_SECRET, { algorithm: "HS512" })), "فقط HS256");
  const users = new Map();
  stub(src("models", "User.js"), { findById: async (id) => users.get(String(id)) || null });
  const { protect } = require(src("middleware", "authMiddleware.js"));
  const run = (token) => new Promise((resolve) => { const req = { cookies: { token }, headers: {} }; protect(req, {}, (error) => resolve({ error, req })); });
  users.set("u1", { _id: "u1", isActive: true, tokenVersion: 0 });
  const live = tokenService.generateToken("u1", 0);
  assert.ok(!(await run(live)).error);
  users.get("u1").tokenVersion = 1; // رمز عوض شد
  assert.strictEqual((await run(live)).error.statusCode, 401);
  assert.ok(!(await run(tokenService.generateToken("u1", 1))).error);
  const auth = read("src/controllers/authController.js");
  assert.ok(auth.includes("user.tokenVersion = (Number(user.tokenVersion) || 0) + 1") && !auth.includes("generateToken(user._id)"));

  /* ۴) کد یک‌بارمصرف: مولد رمزنگاری، مقایسهٔ زمان‌ثابت و قفل روزانه بعد از ۲۰ کد اشتباه */
  const otpSource = read("src/services/otpService.js");
  assert.ok(otpSource.includes("crypto.randomInt(") && !otpSource.includes("Math.random()"));
  let record = null;
  stub(src("models", "OTP.js"), {
    findOneAndUpdate: async (cond, update) => { if (!record || record.isUsed || (cond.attempts && record.attempts >= cond.attempts.$lt)) return null; if (update.$inc) record.attempts += 1; if (update.$set) Object.assign(record, update.$set); return record; },
    exists: async () => Boolean(record && !record.isUsed),
    updateMany: async () => { if (record) record.isUsed = true; },
    updateOne: async () => { if (record) record.isUsed = true; },
  });
  stub(src("services", "smsService.js"), { sendOTP: async () => {} });
  const otpService = require(src("services", "otpService.js"));
  for (let i = 0; i < 200; i += 1) assert.ok(/^\d{5}$/.test(otpService.generateCode(5)));
  let lockedAt = 0;
  for (let i = 1; i <= 25 && !lockedAt; i += 1) {
    record = { code: "12345", attempts: 0, isUsed: false };
    try { await otpService.verify("09120000000", "00000", "login"); assert.fail("کد اشتباه نباید پذیرفته شود"); }
    catch (error) { if (/موقتاً بسته شد/.test(error.message)) lockedAt = i; else assert.ok([400, 429].includes(error.statusCode)); }
  }
  assert.strictEqual(lockedAt, 21, "بعد از ۲۰ کد اشتباه قفل می‌شود");
  record = { code: "12345", attempts: 0, isUsed: false };
  await assert.rejects(() => otpService.verify("09120000000", "12345", "login"), /موقتاً بسته شد/, "در زمان قفل حتی کد درست هم پذیرفته نمی‌شود");
  record = { code: "54321", attempts: 0, isUsed: false };
  assert.ok(await otpService.verify("09121111111", "54321", "login"), "شمارهٔ دیگر تحت تأثیر نیست");

  /* ۵) اقلام سفارش: سقف تعداد، جمع ردیف‌های تکراری در برابر موجودی، سقف طول متن */
  const item = { _id: "a".repeat(24), name: "کالا", brand: "ب", price: 1000, discount: 0, stock: 5, availability: "in" };
  stub(src("models", "Product.js"), { findById: (id) => ({ lean: async () => (String(id) === item._id ? item : null) }), findOne: () => ({ lean: async () => null }) });
  stub(src("models", "DiscountCode.js"), { findOne: async () => null });
  stub(src("services", "shippingSettings.js"), { loadShippingMethods: async () => [{ id: "post", title: "پست", fee: 0, enabled: true, freeThreshold: 0 }] });
  const { loadLineItems } = require(src("services", "checkoutPricing.js"));
  assert.strictEqual((await loadLineItems([{ productId: item._id, quantity: 5 }])).length, 1);
  await assert.rejects(() => loadLineItems([{ productId: item._id, quantity: 3 }, { productId: item._id, quantity: 3 }]), (e) => e.statusCode === 409, "دو ردیف از یک کالا نباید از موجودی عبور کند");
  await assert.rejects(() => loadLineItems(Array.from({ length: 51 }, () => ({ productId: item._id, quantity: 1 }))), (e) => e.statusCode === 400);
  await assert.rejects(() => loadLineItems([]), (e) => e.statusCode === 400);
  const [line] = await loadLineItems([{ productId: item._id, quantity: 1, color: "<img src=x onerror=1>" + "x".repeat(500) }]);
  assert.ok(line.color.length <= 80 && !/[<>]/.test(line.color) && line.price === 1000);

  /* ۶) ورودی کاربر به‌عنوان regex خام به دیتابیس نمی‌رود؛ کش‌ها سقف دارند؛ ثبت بازدید محدودیت نرخ دارد */
  const products = read("src/routes/products.js");
  assert.ok(!products.includes("|| normalizeText(brand), $options") && products.includes("CATALOG_CACHE_MAX"));
  assert.ok(!read("src/routes/adminApi.js").includes('{ $regex: String(req.query.search).trim(), $options: "i" }'));
  assert.ok(read("src/routes/analytics.js").includes('router.post("/track", trackLimiter'));

  /* ۷) تأیید پرداخت اتمیک است (سفارش دو بار «پرداخت‌شده» نمی‌شود) */
  const zarinpal = read("src/routes/zarinpalPayments.js");
  assert.ok(zarinpal.includes('{ _id: order._id, paymentStatus: { $ne: "paid" } }') && zarinpal.includes("[double-payment]"));
  assert.ok(read("src/routes/balePayments.js").includes('{ _id: order._id, paymentStatus: "unpaid" }') && !read("src/routes/balePayments.js").includes("[a-f\\\\d]{24}"));

  /* ۸) ورود ادمین: قفل کلی و ثبت تلاش‌ها */
  const admin = read("src/routes/admin.js");
  assert.ok(admin.includes("GLOBAL_FAIL_MAX") && admin.includes("[admin-login] failed") && admin.includes("[admin-login] success"));
  /* شمارندهٔ ورود هر حساب با تغییر شکل شماره دور نمی‌خورد */
  const routes = read("src/routes/authRoutes.js");
  assert.ok(/\(\?:\\\+98\|0098\|98\)/.test(routes));

  console.log("Security hardening tests passed.");
  process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
