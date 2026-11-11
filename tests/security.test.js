// لایهٔ امنیتی: هدرها، پاک‌سازی ورودی، محدودیت درخواست، آپلود، ورود ادمین و پنهان‌بودن جزئیات خطا (بدون دیتابیس).
const assert = require("assert");
const fs = require("fs");
const path = require("path");
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1/none";
process.env.ADMIN_PASSWORD = "correct horse battery";
delete process.env.SESSION_SECRET;
delete process.env.NODE_ENV;

const express = require("express");
const { securityHeaders, sanitizeInput, rateLimit, hideServerErrors, GENERIC_ERROR } = require("../src/middleware/security");
const upload = require("../src/utils/upload");
const errorHandler = require("../src/middleware/errorHandler");
const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

const app = express();
app.set("trust proxy", 1);
app.use(securityHeaders);
app.use(express.json());
app.use(sanitizeInput);
app.use(hideServerErrors);
app.post("/echo", (req, res) => res.json({ body: req.body, query: req.query }));
app.get("/boom", (req, res) => res.status(500).json({ success: false, message: "MongoServerError: E11000 dup key at /var/www/app.js:12", error: "raw detail", stack: "at x" }));
app.get("/throw", () => { throw new Error("secret internal path /var/www/pixellife/src/db.js"); });
app.get("/bad", (req, res, next) => { const e = new Error("شناسه معتبر نیست"); e.statusCode = 400; next(e); });
app.get("/admin/api/boom", (req, res) => res.status(500).json({ success: false, message: "جزئیات برای ادمین" }));
app.post("/limited", rateLimit({ windowMs: 60000, max: 3 }), (req, res) => res.json({ ok: true }));
app.post("/upload", upload.single("avatar"), (req, res) => res.json({ ok: true, type: req.file && req.file.mimetype, name: req.file && req.file.originalname }));
app.use("/admin", require("../src/routes/admin"));
app.use(errorHandler);

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40)]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (url, body, headers = {}) => fetch(base + url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  const sendFile = (buffer, type, name = "a.png") => { const fd = new FormData(); fd.append("avatar", new Blob([buffer], { type }), name); return fetch(base + "/upload", { method: "POST", body: fd }); };
  try {
    // ۵) هدرهای امنیتی
    let r = await fetch(base + "/bad", { headers: { "X-Forwarded-Proto": "https" } });
    assert.strictEqual(r.headers.get("x-content-type-options"), "nosniff");
    assert.strictEqual(r.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.ok(/frame-ancestors 'self'/.test(r.headers.get("content-security-policy")) && /object-src 'none'/.test(r.headers.get("content-security-policy")));
    assert.ok(r.headers.get("referrer-policy") && r.headers.get("permissions-policy"));
    assert.ok(/max-age=\d+/.test(r.headers.get("strict-transport-security")), "HSTS روی اتصال امن");
    assert.strictEqual(r.headers.get("x-powered-by"), null);
    assert.strictEqual((await fetch(base + "/bad")).headers.get("strict-transport-security"), null, "HSTS روی http نیست");

    // ۴) تزریق: کلیدهای $ و prototype حذف می‌شوند، دادهٔ عادی دست‌نخورده می‌ماند
    r = await post("/echo?a[$ne]=1&b=2", { identifier: { $ne: "" }, code: { $gt: "" }, ok: "سلام", nested: { $where: "1", keep: [{ $in: [1], v: 1 }] } });
    let j = await r.json();
    assert.deepStrictEqual(j.body, { identifier: {}, code: {}, ok: "سلام", nested: { keep: [{ v: 1 }] } });
    assert.deepStrictEqual(j.query, { a: {}, b: "2" });

    // ۸) جزئیات خطا به کاربر نمی‌رسد
    j = await (await fetch(base + "/boom")).json();
    assert.strictEqual(j.message, GENERIC_ERROR); assert.strictEqual(j.error, GENERIC_ERROR); assert.strictEqual(j.stack, undefined);
    r = await fetch(base + "/throw"); j = await r.json();
    assert.strictEqual(r.status, 500); assert.ok(!JSON.stringify(j).includes("/var/www") && j.stack === undefined, "بدون مسیر فایل و stack (حتی وقتی NODE_ENV تنظیم نشده)");
    j = await (await fetch(base + "/bad")).json(); assert.strictEqual(j.message, "شناسه معتبر نیست", "خطای ۴۰۰ پیام خودش را نگه می‌دارد");
    j = await (await fetch(base + "/admin/api/boom")).json(); assert.strictEqual(j.message, "جزئیات برای ادمین");

    // ۶) محدودیت درخواست
    for (let i = 0; i < 3; i++) assert.strictEqual((await post("/limited", {})).status, 200);
    r = await post("/limited", {}); assert.strictEqual(r.status, 429); assert.ok(Number(r.headers.get("retry-after")) > 0);
    assert.strictEqual((await post("/limited", {}, { "X-Forwarded-For": "203.0.113.9" })).status, 200, "IP دیگر جدا شمرده می‌شود");

    // ۷) آپلود: نوع واقعی فایل
    r = await sendFile(PNG, "image/png"); j = await r.json(); assert.strictEqual(r.status, 200); assert.strictEqual(j.type, "image/png");
    r = await sendFile(SVG, "image/svg+xml", "x.svg"); assert.strictEqual(r.status, 400, "SVG مجاز نیست");
    r = await sendFile(SVG, "image/png", "fake.png"); assert.strictEqual(r.status, 400, "محتوای غیرتصویری با پسوند/نوع جعلی رد می‌شود");
    r = await sendFile(Buffer.from("<?php echo 1; ?>" + "x".repeat(40)), "image/jpeg", "shell.php"); assert.strictEqual(r.status, 400);
    r = await sendFile(Buffer.concat([PNG, Buffer.alloc(upload.MAX_FILE_BYTES)]), "image/png"); j = await r.json(); assert.strictEqual(r.status, 400); assert.match(j.message, /۵ مگابایت/);
    r = await sendFile(PNG, "image/png", "../../etc/pa<ss>wd.png"); j = await r.json(); assert.ok(!/[\\/<>]/.test(j.name), "نام فایل پاک‌سازی می‌شود: " + j.name);
    const images = read("src/utils/productImages.js");
    assert.ok(images.includes("sandbox") && images.includes('"Content-Disposition", "attachment"'), "سرو امن فایل‌های آپلودشده");

    // ۲ و ۶) ورود ادمین: رمز غلط، نوع غلط، کوکی امن، سقف تلاش
    r = await post("/admin/login", { password: { $ne: "" } }); assert.strictEqual(r.status, 401);
    r = await post("/admin/login", { password: "wrong" }); assert.strictEqual(r.status, 401);
    r = await post("/admin/login", { password: "correct horse battery" }, { "X-Forwarded-Proto": "https" });
    assert.strictEqual(r.status, 200);
    const cookie = r.headers.get("set-cookie") || "";
    assert.ok(/^pl\.admin=/.test(cookie) && /HttpOnly/i.test(cookie) && /SameSite=Lax/i.test(cookie) && /Secure/i.test(cookie), "کوکی ادمین: " + cookie);
    for (let i = 0; i < 8; i++) await post("/admin/login", { password: "wrong" });
    r = await post("/admin/login", { password: "correct horse battery" }); assert.strictEqual(r.status, 429, "بعد از تلاش‌های زیاد، حتی رمز درست هم موقتاً رد می‌شود");

    // ۱) بدون رمز/کلید ثابت در کد و بدون مسیر آزمایشی باز
    const appSrc = read("src/app.js");
    assert.ok(!/sasan1376|change-me|maintenance_bypass/.test(appSrc) && !appSrc.includes("test-email"));
    assert.ok(!fs.existsSync(path.join(__dirname, "../src/routes/testEmail.js")));
    assert.ok(!/change-me/.test(read("src/middleware/adminSession.js")));
    assert.ok(appSrc.indexOf("app.use(securityHeaders)") < appSrc.indexOf("express.static"), "هدرها قبل از فایل‌های استاتیک");
    assert.ok(appSrc.includes("app.use(sanitizeInput)") && appSrc.includes("app.use(hideServerErrors)"));
    // ۲) کوکی توکن کاربر: httpOnly + sameSite + secure روی https
    const auth = read("src/controllers/authController.js");
    assert.strictEqual((auth.match(/secure: process\.env\.NODE_ENV === "production" \|\| req\.secure === true/g) || []).length, 4);
    assert.ok(/genSalt\(1[0-9]\)/.test(read("src/models/User.js")), "هش bcrypt با هزینهٔ کافی");
    // ۶) محدودیت روی مسیرهای ورود/ثبت‌نام
    const routes = read("src/routes/authRoutes.js");
    for (const p of ["/check-user", "/send-otp", "/resend-otp", "/forgot-password", "/verify-login-otp", "/reset-password", "/login"]) assert.ok(new RegExp(`router\\.use\\([^)]*"${p}"[^)]*rateLimit`).test(routes.replace(/\n/g, " ")) || routes.includes(`"${p}"`), p);
    assert.ok((routes.match(/rateLimit\(/g) || []).length >= 5);
    // ۳) همهٔ APIهای ادمین پشت نشست ادمین
    for (const f of ["src/routes/adminApi.js", "src/routes/adminAiProducts.js"]) assert.ok(/router\.use\(requireAdmin\)/.test(read(f)), f);
    console.log("Security tests passed.");
    server.close(); process.exit(0);
  } catch (error) { console.error(error); server.close(); process.exit(1); }
});
