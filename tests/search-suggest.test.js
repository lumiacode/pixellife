// پیشنهاد جستجو: همهٔ کلمه‌ها باید در نام/برند باشند، نام مستعار برندها، دسته‌بندی‌های مرتبط با لینک (مدل ساختگی).
const assert = require("assert");
const path = require("path");
const src = (...parts) => path.join(__dirname, "..", "src", ...parts);
const stub = (file, exports) => { const p = require.resolve(file); require.cache[p] = { id: p, filename: p, loaded: true, exports }; };

let lastFilter = null;
let rows = [];
const query = (list) => { const q = { select: () => q, sort: () => q, limit: () => q, lean: async () => list, then: (res, rej) => Promise.resolve(list).then(res, rej) }; return q; };
stub(src("models", "Product.js"), { find: (filter) => { lastFilter = filter; return query(rows); }, updateMany: async () => ({}) });
stub(src("models", "Order.js"), {});
stub(src("services", "reviewStats.js"), { withApprovedReviewStats: async (list) => list });
stub(src("utils", "productImages.js"), { streamProductImage: () => {} });

const express = require("express");
const app = express();
app.use("/api/products", require(src("routes", "products.js")));
const names = (f) => f.$and.map((c) => c.$or[0].name.$regex);

(async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api/products`;
  const get = async (q) => (await fetch(`${base}/suggest?q=${encodeURIComponent(q)}`)).json();
  try {
    // کمتر از ۲ حرف: بدون کوئری
    lastFilter = null;
    assert.deepStrictEqual(await get("a"), { success: true, products: [], categories: [] });
    assert.strictEqual(lastFilter, null);
    // نام مستعار فارسی/انگلیسی و جدا بودن کلمه‌ها
    rows = [
      { _id: "1", name: "گوشی آیفون ۱۷ پرو", slug: "iphone-17-pro", brand: "اپل", category: "موبایل", price: 1000, discount: 10, mainImage: "/a.png", availability: "in", stock: 3 },
      { _id: "2", name: "شارژر ۲۰ وات اپل", slug: "charger-20", brand: "اپل", category: "کابل، شارژر و آداپتور", price: 200, discount: 0, images: ["/b.png"], availability: "out", stock: 0 },
    ];
    let r = await get("ایفون پرو");
    assert.deepStrictEqual(names(lastFilter), ["iphone|آیفون|ایفون", "پرو"]);
    assert.strictEqual(r.products.length, 2);
    assert.strictEqual(r.products[0].slug, "iphone-17-pro");
    assert.strictEqual(r.products[0].price, 900, "قیمت نهایی بعد از تخفیف");
    assert.strictEqual(r.products[1].unavailable, true);
    assert.strictEqual(r.products[1].image, "/b.png");
    // دسته‌بندی‌ها با لینک صفحهٔ دسته
    assert.deepStrictEqual(r.categories, [{ name: "موبایل", href: "/mobiles" }, { name: "کابل، شارژر و آداپتور", href: "/accessories/chargers" }]);
    // ی/ک عربی به فارسی نرمال می‌شود و کاراکترهای regex خنثی می‌شوند
    await get("كيف (a+");
    assert.ok(names(lastFilter)[0].includes("[کك]"));
    assert.ok(names(lastFilter)[1].includes("\\("), "پرانتز escape می‌شود");
    // نتایج کامل
    rows = rows.slice(0, 1);
    const full = await (await fetch(`${base}/search?q=${encodeURIComponent("آیفون")}`)).json();
    assert.strictEqual(full.success, true); assert.strictEqual(full.products.length, 1);
    assert.deepStrictEqual(await (await fetch(`${base}/search?q=x`)).json(), { success: true, products: [] });
    console.log("search suggest tests passed");
  } catch (error) { console.error(error); process.exitCode = 1; } finally { server.close(); }
})();
