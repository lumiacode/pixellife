// فیلد «مدل‌های سازگار» محصول: ذخیره در ساخت و ویرایش، پاک‌سازی ورودی، و نمایش در فیلتر کاتالوگ و فرم ادمین.
const assert = require("assert");
const fs = require("fs");
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
    const ok = { name: "قاب سیلیکونی", brand: "اپل", category: "قاب و کاور", price: 1000, stock: 3, availability: "in" };
    // ساخت: خط‌ها و «،» جدا می‌کنند؛ تکراری (بی‌توجه به حروف)، فاصلهٔ اضافه و موارد خالی حذف می‌شوند
    let r = await send("POST", base, { ...ok, compatibleModels: "آیفون ۱۵ پرو\n  آیفون   ۱۵ پرو مکس ،iPhone 15\n\nIPHONE 15\nآیفون ۱۵ پرو" });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    assert.deepStrictEqual(r.body.product.compatibleModels, ["آیفون ۱۵ پرو", "آیفون ۱۵ پرو مکس", "iPhone 15"]);
    const id = r.body.product._id;
    // محصول بدون این فیلد: آرایهٔ خالی (خطا نمی‌دهد)
    r = await send("POST", base, ok); assert.strictEqual(r.status, 200); assert.deepStrictEqual(r.body.product.compatibleModels, []);
    // ویرایشِ بدون فیلد، مقدار قبلی را نگه می‌دارد؛ با فیلد عوض می‌شود؛ با رشتهٔ خالی پاک می‌شود
    r = await send("PUT", `${base}/${id}`, { price: 1200 }); assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.product.compatibleModels.length, 3);
    r = await send("PUT", `${base}/${id}`, { compatibleModels: "گلکسی S24" }); assert.deepStrictEqual(r.body.product.compatibleModels, ["گلکسی S24"]);
    r = await send("PUT", `${base}/${id}`, { compatibleModels: "" }); assert.deepStrictEqual(r.body.product.compatibleModels, []);
    // سقف طول هر مدل (۶۰) و تعداد (۶۰)
    const many = Array.from({ length: 80 }, (_, i) => "مدل " + i).join("\n");
    r = await send("PUT", `${base}/${id}`, { compatibleModels: many + "\n" + "x".repeat(200) });
    assert.strictEqual(r.body.product.compatibleModels.length, 60);
    r = await send("PUT", `${base}/${id}`, { compatibleModels: "y".repeat(200) }); assert.strictEqual(r.body.product.compatibleModels[0].length, 60);

    const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    assert.ok(/compatibleModels: \[\{ type: String/.test(read("src/models/Product.js")));
    assert.ok(read("src/routes/products.js").includes('"storages", "compatibleModels"'), "API لیست باید فیلد را برگرداند");
    const admin = read("views/admin-products.html");
    assert.ok(admin.includes('id="fCompatibleModels"') && admin.includes('fd.append("compatibleModels"') && /fCompatibleModels"\)\.value = formatList\(p\.compatibleModels\)/.test(admin));
    const script = read("public/js/database-catalog-amazing-v1.js");
    assert.ok(script.includes('detail("سازگار با"') && script.includes("selected.models") && script.includes("compatibleModels"));
    console.log("Compatible models test passed.");
    server.close(); process.exit(0);
  } catch (error) { console.error(error); server.close(); process.exit(1); }
});
