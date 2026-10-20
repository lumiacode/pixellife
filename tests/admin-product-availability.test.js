// اعتبارسنجی «موجود/ناموجود» در API ادمین (با مدل ساختگی؛ بدون دیتابیس).
const assert = require("assert");
const path = require("path");
const stub = (rel, exports) => { const p = require.resolve(rel); require.cache[p] = { id: p, filename: p, loaded: true, exports }; };

const store = new Map();
class FakeProduct {
  constructor(data) { Object.assign(this, { images: [], variants: [], reviewSections: [], technicalSpecs: [] }, data); this._id = String(store.size + 1); store.set(this._id, this); }
  async save() { return this; }
  toObject() { return { ...this }; }
  static async findById(id) { return store.get(id) || null; }
  static async updateMany() { return {}; }
}
stub("../src/models/Product", FakeProduct);
for (const m of ["User", "Order", "review", "AnalyticsDaily", "BehaviorEvent"]) stub(`../src/models/${m}`, {});
stub("../src/services/reviewStats", { refreshProductReviewStats: async () => {}, refreshAllProductReviewStats: async () => {} });
stub("../src/middleware/adminAuth", (req, res, next) => next());
stub("../src/middleware/adminSession", (req, res, next) => next());
stub("../src/utils/productImages", { removeProductImage: async () => {}, saveProductImage: async () => "" });

const express = require("express");
const router = require("../src/routes/adminApi");
const app = express(); app.use(express.json()); app.use(express.urlencoded({ extended: true })); app.use("/a", router);

const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}/a/products`;
  const send = async (method, url, body) => { const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };
  try {
    const ok = { name: "گوشی", brand: "اپل", price: 1000, stock: 3, availability: "in" };
    // ناموجود: قیمت/تعداد خالی یا صفر مشکلی ندارد
    let r = await send("POST", base, { name: "خالی", availability: "out" }); assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    assert.strictEqual(r.body.product.availability, "out");
    // ناموجود با قیمت و تعداد مثبت: ناموجود می‌ماند
    r = await send("POST", base, { ...ok, availability: "out" }); assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.product.availability, "out");
    assert.strictEqual(r.body.product.stock, 3);
    // موجود با تعداد صفر یا خالی رد می‌شود
    r = await send("POST", base, { ...ok, stock: 0 }); assert.strictEqual(r.status, 400); assert.match(r.body.message, /تعداد/);
    r = await send("POST", base, { ...ok, stock: "" }); assert.strictEqual(r.status, 400);
    // موجود با قیمت صفر رد می‌شود
    r = await send("POST", base, { ...ok, price: 0 }); assert.strictEqual(r.status, 400); assert.match(r.body.message, /قیمت/);
    // موجود معتبر
    r = await send("POST", base, ok); assert.strictEqual(r.status, 200); assert.strictEqual(r.body.product.availability, "in");
    const id = r.body.product._id;
    // ویرایش: موجود با تعداد صفر رد؛ ناموجود قبول؛ بدون تغییر در محصول ذخیره‌شده
    r = await send("PUT", `${base}/${id}`, { availability: "in", stock: 0, price: 1000 }); assert.strictEqual(r.status, 400);
    r = await send("PUT", `${base}/${id}`, { availability: "in", stock: 2, price: 0 }); assert.strictEqual(r.status, 400);
    r = await send("PUT", `${base}/${id}`, { availability: "out", stock: 2, price: 1000 }); assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.product.availability, "out");
    r = await send("PUT", `${base}/${id}`, { availability: "in", stock: 2, price: 1000 }); assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.product.availability, "in");
    // نقاط قوت/ضعف: ویرگول داخل جمله جدا نمی‌شود و علامت اول خط حذف می‌شود؛ بخش بدون متن ذخیره نمی‌شود
    r = await send("POST", base, { ...ok, reviewPros: "باتری قوی، بادوام\n- نمایشگر روشن\n• ۲. صدای عالی\n\n", reviewCons: "1) قیمت, بالا", reviewSections: JSON.stringify([{ enabled: true, title: "طراحی", content: "متن" }, { enabled: true, title: "فقط عنوان", content: "" }]) });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    assert.deepStrictEqual(r.body.product.reviewPros, ["باتری قوی، بادوام", "نمایشگر روشن", "۲. صدای عالی"]);
    assert.deepStrictEqual(r.body.product.reviewCons, ["قیمت, بالا"]);
    assert.strictEqual(r.body.product.reviewSections.length, 1);
    assert.strictEqual(r.body.product.reviewSections[0].title, "طراحی");
    console.log("admin product availability tests passed");
  } catch (e) { console.error(e); process.exitCode = 1; } finally { server.close(); }
});
