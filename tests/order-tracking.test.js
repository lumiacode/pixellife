// روند ارسال سفارش: منطق مرحله‌ها، API ادمین و API جزئیات سفارش مشتری (با مدل‌های ساختگی).
const assert = require("assert");
const stub = (rel, exports) => { const p = require.resolve(rel); require.cache[p] = { id: p, filename: p, loaded: true, exports }; };
const tracking = require("../src/services/orderTracking");

const mkOrder = (extra = {}) => ({ _id: "o1", orderNumber: "PL-1", user: "u1", paymentStatus: "paid", status: "processing", trackingSteps: [], statusHistory: [], items: [], ...extra });

// ── منطق خالص ──
assert.deepStrictEqual(tracking.normalizeStepKeys(["packed", "confirmed"]), ["confirmed", "packed"]);
assert.deepStrictEqual(tracking.normalizeStepKeys(["shipped"]), [], "بدون مرحلهٔ قبلی معتبر نیست");
assert.deepStrictEqual(tracking.normalizeStepKeys(["confirmed", "shipped"]), ["confirmed"]);
assert.deepStrictEqual(tracking.normalizeStepKeys("x"), []);

let o = mkOrder();
let view = tracking.trackingView(o);
assert.strictEqual(view.completed, 1); assert.strictEqual(view.percent, 20);
tracking.applyTrackingSteps(o, ["confirmed", "packed"]);
assert.strictEqual(o.status, "processing"); assert.strictEqual(tracking.trackingView(o).percent, 60);
tracking.applyTrackingSteps(o, ["confirmed", "packed", "shipped"]);
assert.strictEqual(o.status, "shipped");
tracking.applyTrackingSteps(o, ["confirmed", "packed", "shipped", "delivered"]);
assert.strictEqual(o.status, "delivered"); assert.strictEqual(tracking.trackingView(o).percent, 100);
assert.strictEqual(tracking.trackingView(o).currentLabel, "تحویل مرسوله به مشتری");
const firstAt = o.trackingSteps[0].at;
tracking.applyTrackingSteps(o, ["confirmed"]);
assert.strictEqual(o.status, "processing"); assert.strictEqual(o.trackingSteps.length, 1); assert.strictEqual(o.trackingSteps[0].at, firstAt, "زمان مرحلهٔ باقی‌مانده حفظ می‌شود");

assert.throws(() => tracking.applyTrackingSteps(mkOrder({ paymentStatus: "unpaid", status: "awaiting_payment" }), ["confirmed"]), /پرداخت/);
assert.throws(() => tracking.applyTrackingSteps(mkOrder({ status: "cancelled" }), ["confirmed"]), /لغو/);
const unpaid = tracking.trackingView(mkOrder({ paymentStatus: "unpaid", status: "awaiting_payment" }));
assert.strictEqual(unpaid.completed, 0); assert.strictEqual(unpaid.currentLabel, "در انتظار پرداخت");
assert.strictEqual(tracking.trackingView(mkOrder({ status: "cancelled" })).currentLabel, "سفارش لغو شد");

// هماهنگی با لیست کشویی وضعیت
o = mkOrder();
tracking.syncStepsWithStatus(o, "delivered"); assert.strictEqual(o.trackingSteps.length, 4);
tracking.syncStepsWithStatus(o, "shipped"); assert.deepStrictEqual(o.trackingSteps.map((s) => s.key), ["confirmed", "packed", "shipped"]);
tracking.syncStepsWithStatus(o, "processing"); assert.deepStrictEqual(o.trackingSteps.map((s) => s.key), ["confirmed", "packed"]);
tracking.syncStepsWithStatus(o, "cancelled"); assert.strictEqual(o.trackingSteps.length, 2, "لغو مرحله‌ها را دست نمی‌زند");

// ── API ──
const store = new Map();
const mkDoc = (data) => { const doc = { ...data, async save() {}, toObject() { const { save, toObject, ...rest } = this; return rest; } }; store.set(doc._id, doc); return doc; };
mkDoc(mkOrder()); mkDoc(mkOrder({ _id: "o2", orderNumber: "PL-2", paymentStatus: "unpaid", status: "awaiting_payment" })); mkDoc(mkOrder({ _id: "o3", orderNumber: "PL-3", user: "other" }));
const Order = {
  async findById(id) { return store.get(id) || null; },
  findOne(filter) {
    const q = Promise.resolve([...store.values()].find((d) => (filter.$or ? filter.$or.some((c) => Object.entries(c).every(([k, v]) => d[k] === v)) : d.orderNumber === filter.orderNumber) && d.user === filter.user) || null);
    q.lean = () => q.then((d) => d && d.toObject());
    return q;
  },
  find() { const q = Promise.resolve([...store.values()].filter((d) => d.user === "u1")); q.sort = () => q; q.lean = () => q.then((arr) => arr.map((d) => d.toObject())); return q; },
};
stub("../src/models/Order", Order);
for (const m of ["Product", "User", "review", "AnalyticsDaily", "BehaviorEvent", "DiscountCode", "Address"]) stub(`../src/models/${m}`, { updateMany: async () => ({}) });
stub("../src/services/reviewStats", { refreshProductReviewStats: async () => {}, refreshAllProductReviewStats: async () => {} });
stub("../src/middleware/adminAuth", (req, res, next) => next());
stub("../src/middleware/adminSession", (req, res, next) => next());
stub("../src/middleware/authMiddleware", { protect: (req, res, next) => { req.user = { _id: "u1" }; next(); } });
stub("../src/services/checkoutPricing", { buildQuote: async () => ({}), findPaymentMethod: () => ({}) });
stub("../src/services/behaviorAnalytics", { recordBehaviorEvent: async () => {} });
stub("../src/utils/productImages", { removeProductImage: async () => {}, saveProductImage: async () => "" });

const express = require("express");
const app = express(); app.use(express.json());
app.use("/a", require("../src/routes/adminApi"));
app.use("/api/orders", require("../src/routes/orders"));
const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const send = async (method, url, body) => { const r = await fetch(base + url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json() }; };
  try {
    let r = await send("PATCH", "/a/orders/o1/tracking", { steps: ["confirmed", "packed", "shipped"] });
    assert.strictEqual(r.status, 200); assert.strictEqual(r.body.order.status, "shipped"); assert.strictEqual(r.body.order.tracking.percent, 80);
    r = await send("PATCH", "/a/orders/o2/tracking", { steps: ["confirmed"] }); assert.strictEqual(r.status, 400);
    r = await send("PATCH", "/a/orders/zzz/tracking", { steps: [] }); assert.strictEqual(r.status, 404);
    r = await send("PATCH", "/a/orders/o1/status", { status: "delivered" });
    assert.strictEqual(r.body.order.tracking.percent, 100);
    r = await send("GET", "/api/orders/PL-1"); assert.strictEqual(r.status, 200); assert.strictEqual(r.body.order.tracking.completed, 5);
    r = await send("GET", "/api/orders/PL-3"); assert.strictEqual(r.status, 404, "سفارش دیگران دیده نمی‌شود");
    r = await send("GET", "/api/orders/my"); assert.strictEqual(r.status, 200); assert.ok(r.body.orders.every((x) => x.tracking));
    console.log("order tracking tests passed");
  } catch (e) { console.error(e); process.exitCode = 1; } finally { server.close(); }
});
