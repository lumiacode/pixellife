// مهلت ۱۰ دقیقه‌ای پرداخت و لغو توسط کاربر (با مدل‌های ساختگی؛ بدون دیتابیس).
const assert = require("assert");
const path = require("path");
const src = (...parts) => path.join(__dirname, "..", "src", ...parts);
const stub = (file, exports) => { const p = require.resolve(file); require.cache[p] = { id: p, filename: p, loaded: true, exports }; };

const USER = { _id: "u1", mobile: "09120000000" };
const MIN = 60 * 1000;
const now = Date.now();
const orders = [];
const discounts = [{ code: "OFF10", usedCount: 1 }];
const make = (extra) => { const o = { _id: "o" + (orders.length + 1), orderNumber: "PL-" + (orders.length + 1), user: "u1", status: "awaiting_payment", paymentStatus: "unpaid", superseded: false, discountCode: "", items: [], statusHistory: [], createdAt: new Date(now), ...extra }; o.toObject = () => ({ ...o }); orders.push(o); return o; };
const matches = (o, q) => (!q.user || o.user === q.user) && (!q.status || o.status === q.status) &&
  (!q.paymentStatus || (q.paymentStatus.$ne ? o.paymentStatus !== q.paymentStatus.$ne : o.paymentStatus === q.paymentStatus)) &&
  (!q.superseded || o.superseded !== true) && (!q.createdAt || o.createdAt < q.createdAt.$lt) && (!q._id || o._id === q._id) &&
  (!q.$or || q.$or.some((c) => (c._id && o._id === c._id) || (c.orderNumber && o.orderNumber === c.orderNumber))) && (!q.orderNumber || o.orderNumber === q.orderNumber);
stub(src("middleware", "authMiddleware.js"), { protect: (req, res, next) => { req.user = USER; next(); } });
stub(src("services", "behaviorAnalytics.js"), { recordBehaviorEvent: async () => {} });
stub(src("services", "checkoutPricing.js"), { buildQuote: async () => ({}), findPaymentMethod: () => null });
stub(src("models", "Address.js"), {});
stub(src("models", "DiscountCode.js"), { updateOne: async (cond, update) => { const d = discounts.find((x) => x.code === cond.code && x.usedCount > cond.usedCount.$gt); if (!d) return { modifiedCount: 0 }; d.usedCount += update.$inc.usedCount; return { modifiedCount: 1 }; } });
stub(src("models", "Order.js"), {
  find: (q) => {
    const list = orders.filter((o) => matches(o, q));
    const result = Promise.resolve(list);
    result.select = async () => list;
    result.sort = () => ({ lean: async () => list.map((o) => o.toObject()) });
    return result;
  },
  findOne: (q) => { const o = orders.find((x) => matches(x, q)) || null; const p = Promise.resolve(o); p.lean = async () => (o ? o.toObject() : null); return p; },
  findOneAndUpdate: async (q, update) => {
    const o = orders.find((x) => x._id === q._id && x.status === q.status && x.paymentStatus !== q.paymentStatus.$ne);
    if (!o) return null;
    Object.assign(o, update.$set);
    o.statusHistory.push(update.$push.statusHistory);
    return o;
  },
});

const express = require("express");
const { expireOverdue, paymentDeadline, PAYMENT_WINDOW_MS } = require(src("services", "orderExpiry.js"));
const app = express();
app.use(express.json());
app.use("/api/orders", require(src("routes", "orders.js")));
app.use((err, req, res, next) => res.status(500).json({ success: false, message: err.message }));

(async () => {
  assert.strictEqual(PAYMENT_WINDOW_MS, 10 * MIN);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api/orders`;
  const call = async (method, url) => { const r = await fetch(base + url, { method }); return { status: r.status, body: await r.json() }; };
  try {
    const old = make({ createdAt: new Date(now - 11 * MIN), discountCode: "OFF10" });
    const fresh = make({ createdAt: new Date(now - 2 * MIN) });
    const paid = make({ createdAt: new Date(now - 30 * MIN), paymentStatus: "paid", status: "processing" });
    // جاروی دوره‌ای: فقط سفارش بالای ۱۰ دقیقه و پرداخت‌نشده لغو می‌شود؛ کد تخفیف آزاد می‌شود
    assert.strictEqual(await expireOverdue({}, now), 1);
    assert.strictEqual(old.status, "cancelled");
    assert.strictEqual(old.statusHistory[0].note, "مهلت ۱۰ دقیقه‌ای پرداخت تمام شد");
    assert.strictEqual(discounts[0].usedCount, 0);
    assert.strictEqual(fresh.status, "awaiting_payment");
    assert.strictEqual(paid.status, "processing");
    assert.strictEqual(await expireOverdue({}, now), 0, "لغو دوباره‌ای رخ نمی‌دهد");
    assert.strictEqual(discounts[0].usedCount, 0, "کد تخفیف دوباره آزاد نمی‌شود");

    // لیست سفارش‌ها: مهلت فقط برای سفارش در انتظار پرداخت برگردانده می‌شود
    let r = await call("GET", "/my");
    assert.strictEqual(r.status, 200);
    const byNumber = Object.fromEntries(r.body.orders.map((o) => [o.orderNumber, o]));
    assert.ok(byNumber[fresh.orderNumber].paymentDeadline);
    assert.strictEqual(new Date(byNumber[fresh.orderNumber].paymentDeadline).getTime(), paymentDeadline(fresh).getTime());
    assert.strictEqual(byNumber[paid.orderNumber].paymentDeadline, null);
    assert.strictEqual(byNumber[old.orderNumber].status, "cancelled");

    // لغو توسط کاربر
    discounts[0].usedCount = 1;
    const mine = make({ createdAt: new Date(now - MIN), discountCode: "OFF10" });
    r = await call("POST", `/${mine.orderNumber}/cancel`);
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    assert.strictEqual(mine.status, "cancelled");
    assert.strictEqual(mine.statusHistory.at(-1).note, "لغو توسط کاربر");
    assert.strictEqual(discounts[0].usedCount, 0);
    r = await call("POST", `/${mine.orderNumber}/cancel`);
    assert.strictEqual(r.status, 200, "لغو دوباره بی‌خطر است");
    assert.strictEqual(discounts[0].usedCount, 0);
    // سفارش پرداخت‌شده با این مسیر لغو نمی‌شود
    r = await call("POST", `/${paid.orderNumber}/cancel`);
    assert.strictEqual(r.status, 400);
    assert.strictEqual(paid.status, "processing");
    r = await call("POST", "/PL-404/cancel");
    assert.strictEqual(r.status, 404);
    console.log("order expiry tests passed");
  } catch (error) { console.error(error); process.exitCode = 1; } finally { server.close(); }
})();
