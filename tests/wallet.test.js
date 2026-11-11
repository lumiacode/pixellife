// کیف پول: شارژ از درگاه (یک‌بار)، پرداخت سفارش، کمبود موجودی، بازگشت مبلغ (با مدل‌های ساختگی؛ بدون دیتابیس).
const assert = require("assert");
const path = require("path");
const src = (...parts) => path.join(__dirname, "..", "src", ...parts);
const stub = (file, exports) => { const p = require.resolve(file); require.cache[p] = { id: p, filename: p, loaded: true, exports }; };

const USER = { _id: "u1", mobile: "09120000000" };
const wallets = [];
const ledger = [];
const topups = [];
const orders = [];
let n = 0;
const same = (a, b) => String(a) === String(b);

stub(src("middleware", "authMiddleware.js"), { protect: (req, res, next) => { req.user = USER; next(); } });
stub(src("config", "env.js"), { zarinpalMerchantId: "m", zarinpalSandbox: true, zarinpalCallbackUrl: "https://shop.test/api/payments/zarinpal/callback" });
stub(src("services", "inventory.js"), { applyOrderStock: async (order) => { order.stockApplied = true; return true; } });
stub(src("models", "Wallet.js"), {
  findOne: (q) => { const w = wallets.find((x) => same(x.user, q.user)) || null; const p = Promise.resolve(w); p.lean = async () => w; return p; },
  findOneAndUpdate: async (q, u, o = {}) => {
    let w = wallets.find((x) => same(x.user, q.user) && (!q.balance || x.balance >= q.balance.$gte));
    if (!w && o.upsert && !wallets.find((x) => same(x.user, q.user))) { w = { user: q.user, balance: 0 }; wallets.push(w); }
    if (!w) return null;
    w.balance += u.$inc.balance;
    return { ...w };
  },
});
stub(src("models", "WalletTransaction.js"), { create: async (d) => { ledger.push(d); return d; }, findOne: (q) => { const row = ledger.find((t) => same(t.user, q.user) && same(t.order, q.order) && t.type === q.type) || null; const p = Promise.resolve(row); p.lean = async () => row; return p; }, find: () => ({ sort: () => ({ limit: () => ({ lean: async () => ledger.slice().reverse() }) }) }) });
stub(src("models", "WalletTopup.js"), {
  create: async (d) => { const t = { _id: "t" + ++n, status: "pending", authority: "", ...d, save: async () => {} }; topups.push(t); return t; },
  updateOne: async (q, u) => { const t = topups.find((x) => same(x._id, q._id) && (!q.status || x.status === q.status)); if (t) Object.assign(t, u.$set); return { modifiedCount: t ? 1 : 0 }; },
  findOne: async (q) => topups.find((x) => x.authority === q.authority) || null,
  findOneAndUpdate: async (q, u) => { const t = topups.find((x) => same(x._id, q._id) && x.status === q.status); if (!t) return null; Object.assign(t, u.$set); return t; },
});
const orderMatches = (x, q) => same(x._id, q._id) && (!q.status || x.status === q.status)
  && (!q.paymentStatus || (q.paymentStatus.$ne ? x.paymentStatus !== q.paymentStatus.$ne : x.paymentStatus === q.paymentStatus))
  && (!q.walletRefunded || (q.walletRefunded.$ne === true ? x.walletRefunded !== true : x.walletRefunded === q.walletRefunded))
  && (q.walletPaying === undefined || x.walletPaying === q.walletPaying);
const applyUpdate = (o, u) => {
  if (u.$set) Object.assign(o, u.$set);
  if (u.$unset) Object.keys(u.$unset).forEach((k) => delete o[k]);
  if (u.$push && u.$push.statusHistory) o.statusHistory.push(u.$push.statusHistory);
};
stub(src("models", "Order.js"), {
  findOne: async (q) => orders.find((o) => same(o._id, q._id) && same(o.user, q.user)) || null,
  findOneAndUpdate: async (q, u) => { const o = orders.find((x) => orderMatches(x, q)); if (!o) return null; applyUpdate(o, u); return o; },
  updateOne: async (q, u) => { const o = orders.find((x) => orderMatches(x, q)); if (o) applyUpdate(o, u); return { modifiedCount: o ? 1 : 0 }; },
});
stub(src("services", "orderExpiry.js"), { paymentDeadline: (o) => new Date(new Date(o.createdAt).getTime() + 600000), isPendingPayment: (o) => o.status === "awaiting_payment" && o.paymentStatus !== "paid", cancelPending: async () => null });

const posts = [];
const axiosStub = { post: async (url, body) => {
  posts.push({ url, body });
  if (url.endsWith("/request.json")) return { data: { data: { code: 100, authority: "A" + String(posts.length).padStart(10, "0") } } };
  if (url.endsWith("/verify.json")) return { data: { data: { code: 100, ref_id: 555, card_pan: "6037****1234" } } };
  throw new Error("unexpected " + url);
} };
const Module = require("module");
const originalLoad = Module._load;
Module._load = function (request) { if (request === "axios") return axiosStub; return originalLoad.apply(this, arguments); };

const express = require("express");
const walletService = require(src("services", "wallet.js"));
const app = express();
app.use(express.json());
app.use("/api/wallet", require(src("routes", "wallet.js")));
app.use((err, req, res, next) => res.status(500).json({ success: false, message: err.message }));

const mkOrder = (total, extra = {}) => { const o = { _id: "o" + ++n, orderNumber: "PL-" + n, user: "u1", total, status: "awaiting_payment", paymentStatus: "unpaid", paymentMethod: "wallet", createdAt: new Date(), statusHistory: [], items: [], ...extra }; orders.push(o); return o; };

(async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api/wallet`;
  const call = async (method, url, body) => { const r = await fetch(base + url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" }); let json = null; try { json = await r.json(); } catch (_) {} return { status: r.status, json, location: r.headers.get("location") }; };
  try {
    // مبلغ شارژ: کمتر از حداقل، بیشتر از سقف و غیرعددی رد می‌شود
    for (const bad of [5000, "abc", 99999999999, ""]) assert.strictEqual((await call("POST", "/topup", { amount: bad })).status, 400, String(bad));
    // شارژ ۱٬۰۰۰٬۰۰۰ تومان با رقم فارسی: به درگاه ۱۰ میلیون ریال می‌رود
    let r = await call("POST", "/topup", { amount: "۱٬۰۰۰٬۰۰۰" });
    assert.strictEqual(r.status, 200, JSON.stringify(r.json));
    assert.strictEqual(posts[0].body.amount, 10000000);
    assert.ok(posts[0].body.callback_url.endsWith("/api/wallet/topup/callback"));
    const authority = topups[0].authority;
    assert.ok(r.json.paymentUrl.includes(authority));
    r = await call("GET", `/topup/callback?Authority=${authority}&Status=OK`);
    assert.strictEqual(r.status, 302); assert.ok(r.location.includes("topup=success"));
    assert.strictEqual(wallets[0].balance, 1000000);
    assert.strictEqual(ledger[0].type, "topup"); assert.strictEqual(ledger[0].balanceAfter, 1000000);
    // بازگشت دوباره از درگاه دوباره شارژ نمی‌دهد
    await call("GET", `/topup/callback?Authority=${authority}&Status=OK`);
    assert.strictEqual(wallets[0].balance, 1000000);
    // انصراف در درگاه: بدون شارژ
    await call("POST", "/topup", { amount: 50000 });
    const t2 = topups[1].authority;
    r = await call("GET", `/topup/callback?Authority=${t2}&Status=NOK`);
    assert.ok(r.location.includes("topup=failed")); assert.strictEqual(topups[1].status, "failed"); assert.strictEqual(wallets[0].balance, 1000000);

    // پرداخت سفارش با کیف پول
    const o1 = mkOrder(600000);
    r = await call("POST", "/pay", { orderId: o1._id });
    assert.strictEqual(r.status, 200, JSON.stringify(r.json));
    assert.strictEqual(o1.paymentStatus, "paid"); assert.strictEqual(o1.status, "processing"); assert.strictEqual(o1.stockApplied, true);
    assert.strictEqual(wallets[0].balance, 400000);
    assert.ok(r.json.redirect.includes("status=success") && r.json.redirect.startsWith("/checkout/result?order="));
    // موجودی کافی نیست: چیزی کم نمی‌شود
    const o2 = mkOrder(700000);
    r = await call("POST", "/pay", { orderId: o2._id });
    assert.strictEqual(r.status, 402); assert.strictEqual(wallets[0].balance, 400000); assert.strictEqual(o2.paymentStatus, "unpaid");
    // سفارش پرداخت‌شده یا لغوشده
    assert.strictEqual((await call("POST", "/pay", { orderId: o1._id })).status, 400);
    const o3 = mkOrder(1000, { status: "cancelled" });
    assert.strictEqual((await call("POST", "/pay", { orderId: o3._id })).status, 400); assert.strictEqual(wallets[0].balance, 400000);
    // رقابت: سفارش بین بررسی و پرداخت لغو می‌شود → هیچ پولی کم نمی‌شود و هیچ پولی هم «برنمی‌گردد»
    const o4 = mkOrder(100000);
    const stale = { ...o4 }; o4.status = "cancelled";
    const rowsBefore = ledger.length;
    await assert.rejects(() => walletService.payOrder(stale), (e) => e.statusCode === 409);
    assert.strictEqual(wallets[0].balance, 400000); assert.strictEqual(ledger.length, rowsBefore, "هیچ ردیف دفتری نباید ساخته شود");
    // دو پرداخت هم‌زمان از یک سفارش: فقط یکی موفق می‌شود، فقط یک‌بار کسر می‌شود
    const o5 = mkOrder(50000);
    const results = await Promise.allSettled([walletService.payOrder(o5), walletService.payOrder(o5)]);
    assert.deepStrictEqual(results.map((x) => x.status).sort(), ["fulfilled", "rejected"]);
    assert.strictEqual(wallets[0].balance, 350000); assert.strictEqual(ledger.filter((t) => t.type === "purchase" && String(t.order) === String(o5._id)).length, 1);
    // کمبود موجودی در میانهٔ کار (بعد از ثبت پرداخت): فقط وضعیت سفارش برمی‌گردد، بدون هیچ ردیف «بازگشت»
    const o6 = mkOrder(900000);
    await assert.rejects(() => walletService.payOrder(o6), (e) => e.statusCode === 402);
    assert.strictEqual(o6.status, "awaiting_payment"); assert.strictEqual(o6.paymentStatus, "unpaid"); assert.strictEqual(o6.walletPaying, undefined);
    assert.strictEqual(ledger.filter((t) => t.type === "refund").length, 0, "تا اینجا هیچ بازگشت وجهی ثبت نشده");

    // هیچ تغییر وضعیتی پول برنمی‌گرداند؛ حتی اگر سفارش لغو/مرجوع/تحویل شود (ادمین از مسیر جدا همین کار را نمی‌کند)
    assert.ok(!require("fs").readFileSync(src("routes", "adminApi.js"), "utf8").includes("walletService.refundOrder"));
    // بازگشت وجه فقط با دستور صریح ادمین: شرایط
    await assert.rejects(() => walletService.adminRefundToWallet(o1), (e) => e.statusCode === 400, "سفارش فعال بازگشت وجه ندارد");
    o1.status = "delivered";
    await assert.rejects(() => walletService.adminRefundToWallet(o1), (e) => e.statusCode === 400, "سفارش تحویل‌شده بازگشت وجه ندارد");
    o1.status = "cancelled";
    const before = wallets[0].balance;
    const refund = await walletService.adminRefundToWallet(o1);
    assert.strictEqual(refund.amount, 600000); assert.strictEqual(wallets[0].balance, before + 600000);
    const row = ledger[ledger.length - 1]; assert.strictEqual(row.type, "refund"); assert.ok(row.note.includes("ادمین"));
    // دوباره نه (یک‌بار)، و سفارش آنلاین/بدون ردیف پرداخت هم نه
    await assert.rejects(() => walletService.adminRefundToWallet(o1), (e) => e.statusCode === 409);
    assert.strictEqual(wallets[0].balance, before + 600000);
    await assert.rejects(() => walletService.adminRefundToWallet(mkOrder(5, { paymentMethod: "online", paymentStatus: "paid", status: "cancelled" })), (e) => e.statusCode === 400);
    await assert.rejects(() => walletService.adminRefundToWallet(mkOrder(7, { paymentMethod: "wallet", paymentStatus: "paid", status: "cancelled" })), (e) => e.statusCode === 409, "بدون ردیف پرداخت، پولی برنمی‌گردد");
    // سفارشِ برگشت‌خورده دوباره فعال/تحویل نمی‌شود
    assert.ok(walletService.statusChangeBlocker(o1, "delivered"));
    // هیچ کدی جز «شارژ از درگاه» و «بازگشت وجه با دستور ادمین» به کیف پول پول اضافه نمی‌کند
    const fs = require("fs");
    const callers = [];
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => { const f = path.join(dir, e.name); if (e.isDirectory()) walk(f); else if (/\.js$/.test(e.name)) { const t = fs.readFileSync(f, "utf8"); (t.match(/\bcredit\(/g) || []).forEach(() => callers.push(path.relative(src(), f))); if (/\$inc:\s*\{\s*balance:\s*(?!-)/.test(t) && !f.endsWith("services/wallet.js")) callers.push("DIRECT:" + f); } });
    walk(src());
    assert.deepStrictEqual(callers.sort(), ["routes/wallet.js", "services/wallet.js", "services/wallet.js"].sort(), "فقط شارژ درگاه (routes/wallet.js) و بازگشت وجه ادمین (+ تعریف تابع) credit را صدا می‌زنند: " + callers);
    // کیف پول: موجودی و دفتر
    r = await call("GET", "/");
    assert.strictEqual(r.json.balance, wallets[0].balance); assert.ok(r.json.transactions.length >= 3);
    console.log("wallet tests passed");
  } catch (error) { console.error(error); process.exitCode = 1; } finally { server.close(); }
})();
