// خروج باید کوکی نشست را از سرور پاک کند (نه فقط ظاهر صفحه)، پاسخ‌های شخصی کش نشوند و اسکریپت هم‌سازی در صفحه‌های عمومی باشد.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

process.env.JWT_SECRET = "s"; process.env.MONGO_URI = "mongodb://x";
const stub = (file, exports) => { const p = require.resolve(file); require.cache[p] = { id: p, filename: p, loaded: true, exports }; };
for (const m of ["User", "Order", "Product", "Address", "OtpCode", "Setting"]) { try { stub(path.join(root, "src/models", m + ".js"), {}); } catch (_) {} }

// ۱) کنترلر خروج
const authController = require("../src/controllers/authController");
const headers = {}; let cleared = null; let body = null;
const res = { set: (k, v) => { headers[k] = v; return res; }, clearCookie: (name, opts) => { cleared = { name, opts }; }, json: (b) => { body = b; } };
authController.logout({}, res, (e) => { throw e; });
assert.strictEqual(cleared.name, "token");
assert.strictEqual(cleared.opts.path, "/");
assert.strictEqual(cleared.opts.httpOnly, true);
assert.strictEqual(cleared.opts.sameSite, "lax");
assert.strictEqual(headers["Cache-Control"], "no-store");
assert.strictEqual(body.success, true);

// ۲) مسیر POST و GET هر دو ثبت شده‌اند
const authRoutes = require("../src/routes/authRoutes");
const logoutMethods = authRoutes.stack.filter((l) => l.route && l.route.path === "/logout").flatMap((l) => Object.keys(l.route.methods));
assert.ok(logoutMethods.includes("post") && logoutMethods.includes("get"), "POST و GET برای /logout: " + logoutMethods);

// ۳) تزریق اسکریپت هم‌سازی فقط در صفحهٔ HTML عمومی
const { authSessionScript } = require("../src/middleware/authSessionScript");
function run(reqPath, contentType, html) {
  let sent = null;
  const r = { get: () => contentType, send: (b) => { sent = b; } };
  authSessionScript({ method: "GET", path: reqPath }, r, () => {});
  r.send(html);
  return sent;
}
const page = "<html><body>x</body></html>";
assert.ok(run("/cart", "text/html; charset=utf-8", page).includes("/js/auth-session.js"), "صفحهٔ عمومی");
assert.ok(!run("/admin/products", "text/html", page).includes("auth-session"), "ادمین بدون تزریق");
assert.ok(!run("/api/x", "application/json", "{}").includes("auth-session"), "API");
assert.strictEqual((run("/cart", "text/html", run("/cart", "text/html", page)).match(/auth-session\.js/g) || []).length, 1, "تزریق دوباره نباشد");

// ۴) اسکریپت سمت مرورگر: دکمهٔ خروج و پاک‌کردن اطلاعات شخصی
const js = fs.readFileSync(path.join(root, "public/js/auth-session.js"), "utf8");
assert.ok(/#logoutBtn/.test(js) && /#headerLogoutBtn/.test(js), "هر دو دکمهٔ خروج");
assert.ok(/\/api\/auth\/logout/.test(js) && /method: "POST"/.test(js));
assert.ok(/pl_checkout/.test(js) && /removeItem/.test(js), "اطلاعات پرداخت پاک شود");

// ۵) میان‌افزار no-store برای مسیرهای شخصی
const app = fs.readFileSync(path.join(root, "src/app.js"), "utf8");
for (const p of ["/api/addresses", "/api/orders", "/api/checkout", "/checkout", "/profile"]) assert.ok(app.includes('"' + p + '"'), p + " بدون کش");

console.log("Logout session test passed.");
