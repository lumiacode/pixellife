// «محصولات صفحهٔ اصلی»: ذخیرهٔ انتخاب‌ها (سرویس)، API ادمین، API عمومی صفحهٔ اصلی، و اینکه فرم/مدل محصول دست‌نخورده است.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const src = (...p) => path.join(root, "src", ...p);
const read = (...p) => fs.readFileSync(path.join(root, ...p), "utf8");
const stub = (file, exports) => { const p = require.resolve(file); require.cache[p] = { id: p, filename: p, loaded: true, exports }; };
const id = (n) => String(n).padStart(24, "0");

// دیتابیس ساختگی
const settings = {}; let cachesCleared = 0;
const products = [1, 2, 3, 4, 5].map((n) => ({ _id: id(n), name: "محصول " + n, brand: "اپل", category: "موبایل", slug: "p" + n, price: 1000000 * n, discount: 0, stock: 5, availability: "in", images: [], mainImage: "" }));
const query = (list) => { const q = { select: () => q, sort: () => q, limit: () => q, lean: async () => list, then: (a, b) => Promise.resolve(list).then(a, b) }; return q; };
stub(src("models", "Setting.js"), {
  findOne: ({ key }) => ({ lean: async () => (settings[key] ? { key, value: settings[key] } : null) }),
  updateOne: async ({ key }, update) => { settings[key] = settings[key] || {}; Object.entries(update.$set).forEach(([path, v]) => { settings[key][path.replace(/^value\./, "")] = v; }); },
});
stub(src("models", "Product.js"), { find: (filter) => { const ids = filter && filter._id && filter._id.$in; return query(ids ? products.filter((p) => ids.includes(p._id)) : products); }, updateMany: async () => ({}) });
stub(src("models", "Order.js"), {});
stub(src("services", "reviewStats.js"), { withApprovedReviewStats: async (list) => list });
stub(src("utils", "productImages.js"), { streamProductImage: () => {} });
const cacheBus = require(src("services", "cacheBus.js"));
cacheBus.onProductChange(() => { cachesCleared += 1; });
const service = require(src("services", "homeSections.js"));

(async () => {
  // ۱) سرویس
  assert.deepStrictEqual(service.SECTIONS.map((s) => s.key), ["mobile", "tablet", "headphone", "watch", "console", "accessories"]);
  assert.deepStrictEqual((await service.readSelections()).mobile, [], "ابتدا همهٔ بخش‌ها خالی‌اند");
  await assert.rejects(() => service.saveSection("nope", []), (e) => e.statusCode === 404, "بخش نامعتبر");
  const saved = await service.saveSection("mobile", [id(3), id(1), id(3), "bad", id(99), id(2)]);
  assert.deepStrictEqual(saved, [id(3), id(1), id(2)], "ترتیب حفظ، تکراری/نامعتبر/ناموجود حذف");
  assert.ok(cachesCleared >= 1, "کش کاتالوگ بعد از ذخیره پاک می‌شود");
  await service.saveSection("watch", [id(4)]);
  const all = await service.readSelections();
  assert.deepStrictEqual(all.mobile, [id(3), id(1), id(2)]); assert.deepStrictEqual(all.watch, [id(4)]); assert.deepStrictEqual(all.tablet, []);
  await assert.rejects(() => service.saveSection("tablet", Array.from({ length: 13 }, (_, i) => id(i + 1))), (e) => e.statusCode === 400, "سقف ۱۲ محصول");

  // ۲) API ادمین (روتر؛ احراز هویت در app.js)
  const express = require("express");
  const adminApp = express(); adminApp.use("/admin/api/home-sections", require(src("routes", "adminHomeSections.js")));
  const publicApp = express(); publicApp.use("/api/products", require(src("routes", "products.js")));
  const listen = (app) => new Promise((resolve) => { const server = app.listen(0, () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` })); });
  let { server, base } = await listen(adminApp);
  try {
    let json = await (await fetch(base + "/admin/api/home-sections")).json();
    assert.strictEqual(json.max, 12);
    assert.deepStrictEqual(json.sections.find((s) => s.key === "mobile").products.map((p) => p._id), [id(3), id(1), id(2)], "فهرست ادمین با همان ترتیب");
    json = await (await fetch(base + "/admin/api/home-sections/catalog")).json();
    assert.strictEqual(json.products.length, 5);
    const put = await fetch(base + "/admin/api/home-sections/tablet", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productIds: [id(5), id(4)] }) });
    assert.deepStrictEqual((await put.json()).productIds, [id(5), id(4)]);
    assert.strictEqual((await fetch(base + "/admin/api/home-sections/zzz", { method: "PUT", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 404);
  } finally { server.close(); }

  // ۳) API عمومی صفحهٔ اصلی: به ترتیب انتخاب، بخش خالی نمی‌آید
  ({ server, base } = await listen(publicApp));
  try {
    const json = await (await fetch(base + "/api/products/home-sections")).json();
    assert.deepStrictEqual(json.sections.map((s) => s.key), ["mobile", "tablet", "watch"], "ترتیب بخش‌ها از تنظیمات سایت؛ بخش‌های خالی حذف");
    assert.deepStrictEqual(json.sections[0].products.map((p) => p._id), [id(3), id(1), id(2)], "ترتیب محصولات همان انتخاب ادمین");
    assert.strictEqual(json.sections[0].title, "موبایل");
  } finally { server.close(); }

  // ۴) ثابت‌ها: صفحهٔ ادمین، منو، صفحهٔ اصلی؛ فرم و مدل محصول دست‌نخورده
  const page = read("views", "admin-home-sections.html");
  assert.ok(/محصولات صفحهٔ اصلی/.test(page) && /\/admin\/api\/home-sections/.test(page));
  assert.ok(/ti-layout-grid", "محصولات صفحهٔ اصلی"/.test(read("public", "js", "admin-sidebar.js")), "لینک در منوی ادمین");
  assert.ok(/router\.get\("\/home-sections", requireAdmin/.test(read("src", "routes", "admin.js")), "مسیر صفحهٔ ادمین پشت ورود ادمین");
  const app = read("src", "app.js");
  assert.ok(/"\/admin\/api\/home-sections",\s*adminSession,[\s\S]*isAdmin/.test(app), "API ادمین پشت نشست ادمین");
  const home = read("views", "index.html");
  assert.ok(/id="homeSections"/.test(home) && /api\/products\/home-sections/.test(home));
  const chain = home.match(/\[loadAmazingOffers,([^\]]*)\]\.forEach\(enqueueHomeRow\)/)[1];
  assert.ok(chain.indexOf("loadHomeSections") !== -1 && chain.indexOf("loadHomeSections") < chain.indexOf("loadFeaturedProducts"), "ردیف‌های انتخاب‌شدهٔ ادمین قبل از منتخب‌ها");
  ["src/models/Product.js", "src/routes/adminApi.js", "views/admin-products.html"].forEach((file) => {
    assert.ok(!/homeSections|homeMobile/.test(read(...file.split("/"))), `${file} باید از این قابلیت دست‌نخورده بماند`);
  });

  console.log("Home sections tests passed.");
})().catch((e) => { console.error(e); process.exit(1); }).then(() => process.exit(0));
