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
const getPath = (obj, pathStr) => pathStr.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
const setPath = (obj, pathStr, value) => { const keys = pathStr.split("."); let o = obj; keys.slice(0, -1).forEach((k) => { if (typeof o[k] !== "object" || o[k] === null) o[k] = {}; o = o[k]; }); o[keys[keys.length - 1]] = value; };
stub(src("models", "Setting.js"), {
  findOne: ({ key }) => ({ lean: async () => (settings[key] ? { key, value: JSON.parse(JSON.stringify(settings[key])) } : null) }),
  updateOne: async ({ key }, update) => {
    settings[key] = settings[key] || {};
    Object.entries(update.$set || {}).forEach(([p, v]) => setPath(settings[key], p.replace(/^value\./, ""), v));
    Object.entries(update.$push || {}).forEach(([p, v]) => { const path = p.replace(/^value\./, ""); const cur = getPath(settings[key], path); setPath(settings[key], path, [...(Array.isArray(cur) ? cur : []), v]); });
    Object.entries(update.$pull || {}).forEach(([p, cond]) => { const path = p.replace(/^value\./, ""); const cur = getPath(settings[key], path); if (Array.isArray(cur)) setPath(settings[key], path, cur.filter((item) => (cond && typeof cond === "object" ? !Object.entries(cond).every(([k, v]) => item[k] === v) : item !== cond))); });
    Object.keys(update.$unset || {}).forEach((p) => { const keys = p.replace(/^value\./, "").split("."); const parent = keys.length > 1 ? getPath(settings[key], keys.slice(0, -1).join(".")) : settings[key]; if (parent) delete parent[keys[keys.length - 1]]; });
  },
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
  assert.deepStrictEqual((await service.getSections()).map((s) => s.key), ["mobile", "tablet", "headphone", "watch", "console", "accessories"]);
  assert.deepStrictEqual((await service.readSelections()).mobile, [], "ابتدا همهٔ بخش‌ها خالی‌اند");
  await assert.rejects(() => service.saveSection("nope", []), (e) => e.statusCode === 404, "بخش نامعتبر");
  const saved = await service.saveSection("mobile", [id(3), id(1), id(3), "bad", id(99), id(2)]);
  assert.deepStrictEqual(saved, [id(3), id(1), id(2)], "ترتیب حفظ، تکراری/نامعتبر/ناموجود حذف");
  assert.ok(cachesCleared >= 1, "کش کاتالوگ بعد از ذخیره پاک می‌شود");
  await service.saveSection("watch", [id(4)]);
  const all = await service.readSelections();
  assert.deepStrictEqual(all.mobile, [id(3), id(1), id(2)]); assert.deepStrictEqual(all.watch, [id(4)]); assert.deepStrictEqual(all.tablet, []);
  await assert.rejects(() => service.saveSection("tablet", Array.from({ length: 13 }, (_, i) => id(i + 1))), (e) => e.statusCode === 400, "سقف ۱۲ محصول");

  // ۱-ب) بخش‌های ساخته‌شده توسط ادمین: ساخت، نام تکراری/کوتاه، تغییر نام، ترتیب، حذف
  await assert.rejects(() => service.createSection(" "), (e) => e.statusCode === 400, "نام خالی");
  await assert.rejects(() => service.createSection("موبایل"), (e) => /وجود دارد/.test(e.message), "نام تکراری");
  const mine = await service.createSection("  پرفروش‌های   ماه ");
  assert.ok(/^c[a-f0-9]{8}$/.test(mine.key) && mine.title === "پرفروش‌های ماه" && mine.builtin === false, "کلید یکتا و نام تمیز");
  assert.strictEqual((await service.getSections()).length, 7);
  assert.deepStrictEqual(await service.saveSection(mine.key, [id(5), id(4)]), [id(5), id(4)], "محصول برای بخش ساخته‌شده");
  await service.renameSection("watch", "ساعت و مچ‌بند");
  assert.strictEqual((await service.getSections()).find((s) => s.key === "watch").title, "ساعت و مچ‌بند", "تغییر نام بخش پیش‌فرض");
  const order = await service.saveOrder([mine.key, "watch", "ghost"]);
  assert.deepStrictEqual(order.slice(0, 2), [mine.key, "watch"], "ترتیب جدید؛ کلید ناشناس نادیده"); assert.strictEqual(order.length, 7, "بخش‌های ذکرنشده در انتها می‌مانند");
  assert.strictEqual((await service.getSections())[0].key, mine.key);
  await assert.rejects(() => service.deleteSection("mobile"), (e) => e.statusCode === 400, "بخش پیش‌فرض حذف نمی‌شود");
  await assert.rejects(() => service.deleteSection("cffffffff"), (e) => e.statusCode === 404, "بخش ناموجود");

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
    const created = await (await fetch(base + "/admin/api/home-sections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "ویترین ویژه" }) })).json();
    assert.ok(created.success && created.section.key, "ساخت بخش از API ادمین");
    assert.strictEqual((await fetch(base + "/admin/api/home-sections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "x" }) })).status, 400, "نام کوتاه رد می‌شود");
    const renamed = await (await fetch(base + "/admin/api/home-sections/" + created.section.key, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "ویترین جدید" }) })).json();
    assert.strictEqual(renamed.title, "ویترین جدید");
    assert.strictEqual((await fetch(base + "/admin/api/home-sections/order", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keys: [created.section.key] }) })).status, 200, "مسیر order قبل از :key است");
    assert.strictEqual((await fetch(base + "/admin/api/home-sections/" + created.section.key, { method: "DELETE" })).status, 200, "حذف بخش ساخته‌شده");
    assert.strictEqual((await (await fetch(base + "/admin/api/home-sections")).json()).sections.some((s) => s.key === created.section.key), false);
    assert.strictEqual((await fetch(base + "/admin/api/home-sections/zzz", { method: "PUT", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 404);
  } finally { server.close(); }

  // ۳) API عمومی صفحهٔ اصلی: به ترتیب انتخاب، بخش خالی نمی‌آید
  ({ server, base } = await listen(publicApp));
  try {
    const json = await (await fetch(base + "/api/products/home-sections")).json();
    assert.deepStrictEqual(json.sections.map((s) => s.key).slice(1), ["watch", "mobile", "tablet"], "بخش‌ها به ترتیب تنظیم‌شده؛ بخش‌های خالی حذف");
    assert.ok(/^c[a-f0-9]{8}$/.test(json.sections[0].key) && json.sections[0].title === "پرفروش‌های ماه", "بخش ساخته‌شده هم در صفحهٔ اصلی است");
    const mobile = json.sections.find((s) => s.key === "mobile");
    assert.deepStrictEqual(mobile.products.map((p) => p._id), [id(3), id(1), id(2)], "ترتیب محصولات همان انتخاب ادمین");
    assert.strictEqual(json.sections.find((s) => s.key === "watch").title, "ساعت و مچ‌بند", "نام ویرایش‌شده");
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
