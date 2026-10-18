const assert = require("assert");
const path = require("path");
const { normalizeDiscountInput, discountState, parseExpiry } = require("../src/services/discountAdmin");

const base = { code: " summer20 ", type: "percent", value: "۲۰", maxDiscount: "500,000", minOrderAmount: "1000000", usageLimit: "10" };
const ok = normalizeDiscountInput(base);
assert.strictEqual(ok.code, "SUMMER20");
assert.strictEqual(ok.value, 20);
assert.strictEqual(ok.maxDiscount, 500000);
assert.strictEqual(ok.expiresAt, null);
assert.strictEqual(ok.isActive, true);

assert.throws(() => normalizeDiscountInput({ ...base, code: "a b" }), /کد تخفیف/);
assert.throws(() => normalizeDiscountInput({ ...base, value: 101 }), /درصد/);
assert.throws(() => normalizeDiscountInput({ ...base, type: "x" }), /نوع/);
assert.strictEqual(normalizeDiscountInput({ ...base, type: "fixed", value: 50000 }).maxDiscount, 0);
assert.throws(() => normalizeDiscountInput({ ...base, code: "OTHER" }, { code: "SUMMER20", usedCount: 2 }), /قابل تغییر/);

// 1405/01/01 = 2026-03-21؛ پایان روز به وقت تهران = 20:29 UTC
assert.strictEqual(parseExpiry("1405/01/01").toISOString(), "2026-03-21T20:29:00.000Z");
assert.strictEqual(parseExpiry("۱۴۰۵/۰۱/۰۱ 10:00").toISOString(), "2026-03-21T06:30:00.000Z");
assert.throws(() => parseExpiry("1405/13/01"), /شمسی/);
assert.throws(() => parseExpiry("abc"), /شمسی/);

const now = new Date("2026-01-01");
assert.strictEqual(discountState({ isActive: false }, now), "inactive");
assert.strictEqual(discountState({ isActive: true, expiresAt: new Date("2025-01-01") }, now), "expired");
assert.strictEqual(discountState({ isActive: true, usageLimit: 2, usedCount: 2 }, now), "exhausted");
assert.strictEqual(discountState({ isActive: true, usageLimit: 0, usedCount: 9 }, now), "active");

// route test with stubbed model
const modelPath = require.resolve("../src/models/DiscountCode");
const store = [];
class Doc {
  constructor(d) { Object.assign(this, d); this._id = String(store.length + 1); }
  toObject() { return { ...this }; }
  async save() { return this; }
  async deleteOne() { store.splice(store.indexOf(this), 1); }
}
require.cache[modelPath] = { id: modelPath, filename: modelPath, loaded: true, exports: {
  create: async (d) => { if (store.some((x) => x.code === d.code)) { const e = new Error("dup"); e.code = 11000; throw e; } const x = new Doc(d); store.push(x); return x; },
  findById: async (id) => store.find((x) => x._id === id) || null,
  countDocuments: async () => store.length,
  find: () => ({ sort() { return this; }, skip() { return this; }, limit() { return this; }, lean: async () => store.map((x) => x.toObject()) }),
} };
const express = require("express");
const router = require("../src/routes/adminDiscounts");
const app = express(); app.use(express.json()); app.use("/d", router);
const server = app.listen(0, async () => {
  const url = `http://127.0.0.1:${server.address().port}/d`;
  const call = async (m, p, b) => { const r = await fetch(url + p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, body: await r.json() }; };
  try {
    let r = await call("POST", "/", base); assert.strictEqual(r.status, 201); const id = r.body.discount._id;
    r = await call("POST", "/", base); assert.strictEqual(r.status, 409);
    r = await call("POST", "/", { ...base, code: "X" }); assert.strictEqual(r.status, 400);
    r = await call("GET", "/"); assert.strictEqual(r.body.discounts[0].state, "active");
    r = await call("PATCH", `/${id}/status`, { isActive: false }); assert.strictEqual(r.body.discount.state, "inactive");
    r = await call("PATCH", `/${id}/status`, { isActive: "no" }); assert.strictEqual(r.status, 400);
    r = await call("PUT", `/${id}`, { ...base, value: 30 }); assert.strictEqual(r.body.discount.value, 30);
    store[0].usedCount = 1;
    r = await call("DELETE", `/${id}`); assert.strictEqual(r.status, 409);
    store[0].usedCount = 0;
    r = await call("DELETE", `/${id}`); assert.strictEqual(r.body.success, true);
    r = await call("DELETE", `/${id}`); assert.strictEqual(r.status, 404);
    console.log("discount-admin tests passed");
  } catch (e) { console.error(e); process.exitCode = 1; } finally { server.close(); }
});
