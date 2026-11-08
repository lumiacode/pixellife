// زیرمجموعهٔ لوازم جانبی هر برند: منو (دسکتاپ و موبایل)، مسیرها، نام دسته‌ها در ادمین و فیلتر API یک‌دست باشند.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const stub = (rel, exports) => { const p = require.resolve(rel); require.cache[p] = { id: p, filename: p, loaded: true, exports }; };

const catalog = require("../src/config/accessoryCatalog");
const BRANDS = ["apple", "samsung", "xiaomi"];
const TYPES = ["case", "glass", "charger", "bag"];

// ۱) نگاشت پایه
assert.deepStrictEqual(Object.keys(catalog.ACCESSORY_BRANDS), BRANDS);
assert.deepStrictEqual(Object.keys(catalog.ACCESSORY_TYPES), TYPES);
assert.strictEqual(catalog.allPaths().length, 12);
assert.strictEqual(catalog.resolve("apple", "case").category, "قاب و کاور");
assert.strictEqual(catalog.resolve("apple", "nope"), null);
assert.strictEqual(catalog.resolve("nokia", "case"), null);
for (const type of Object.values(catalog.ACCESSORY_TYPES)) assert.ok(!/موبایل|گوشی/.test(type.category), "نام دسته نباید «موبایل/گوشی» داشته باشد: " + type.category);

// ۲) منوی مشترک: هر سه برند چهار زیرمجموعه دارند و لینک‌ها دقیقاً همان مسیرهای ساخته‌شده‌اند
global.window = {};
eval(read("public/js/category-data.js"));
const mobile = window.PLCategories.find((c) => c.id === "mobile");
const accessoriesGroup = mobile.groups.find((g) => g.title === "لوازم جانبی موبایل");
assert.deepStrictEqual(accessoriesGroup.links.map((l) => l.href), BRANDS.map((b) => `/accessories/${b}`));
const menuPaths = [];
for (const link of accessoriesGroup.links) {
  const brandKey = link.href.split("/").pop();
  assert.deepStrictEqual(link.children.map((c) => c.label), TYPES.map((t) => catalog.ACCESSORY_TYPES[t].menu));
  assert.deepStrictEqual(link.children.map((c) => c.href), TYPES.map((t) => `/accessories/${brandKey}/${t}`));
  menuPaths.push(...link.children.map((c) => c.href));
}
assert.deepStrictEqual(menuPaths.sort(), catalog.allPaths().sort());
// بخش جدای «شارژر و کابل موبایل» حذف شده (شارژر هر برند، یکی از زیرمجموعه‌هایش است)
assert.ok(!JSON.stringify(window.PLCategories).includes("شارژر و کابل موبایل"));
assert.ok(!accessoriesGroup.groups);
// لمس نام برند زیرمجموعه‌ها را باز می‌کند (دسکتاپ و موبایل) و «همه» اول می‌آید
for (const file of ["public/js/shared-category-nav.js", "public/js/mobile-bottom-nav.js"]) {
  const src = read(file);
  assert.ok(src.includes("data-brand-toggle") && src.includes("aria-expanded") && /label: ['"]همه['"], href: link\.href/.test(src), file);
}
// منوی دسکتاپ و کشوی موبایل زیرمجموعه‌ها را نمایش می‌دهند
assert.ok(/link\.children/.test(read("public/js/shared-category-nav.js")) && /megamenu-sub-link/.test(read("public/js/shared-category-nav.js")));
assert.ok(/link\.children/.test(read("public/js/mobile-bottom-nav.js")));

// ۳) مسیرها در سرور
const routes = read("src/routes/homeRoutes.js");
assert.ok(/router\.get\("\/accessories\/:brand\/:type", homeController\.accessoriesBrandType\)/.test(routes));
assert.ok(routes.indexOf('"/accessories/xiaomi"') < routes.indexOf('"/accessories/:brand/:type"'), "مسیرهای ثابت باید قبل از مسیر پویا باشند");
const controller = read("src/controllers/homeController.js");
assert.ok(/accessoriesBrandType:/.test(controller) && /if \(!info\) return next\(\)/.test(controller));

// ۴) کاتالوگ سمت مرورگر همان دسته‌ها و برندها را می‌سازد
const script = read("public/js/database-catalog-amazing-v1.js");
const grab = (name) => new Function("return " + script.match(new RegExp("const " + name + " = (\\{[^}]*\\});"))[1])();
const scriptBrands = grab("accessoryBrands");
const scriptTypes = grab("accessoryTypes");
for (const b of BRANDS) assert.strictEqual(scriptBrands[b], catalog.ACCESSORY_BRANDS[b].fa);
for (const t of TYPES) assert.strictEqual(scriptTypes[t], catalog.ACCESSORY_TYPES[t].category);

// ۴-ب) پنل فیلتر: لینک «دسته‌بندی/برند» و کلید «تخفیف‌دار»؛ تخفیف از percent خوانده می‌شود (نه فیلد ناموجود)
assert.ok(/function navMarkup\(\)/.test(script) && /pl-nav-chip/.test(script) && script.includes("(apple|samsung|xiaomi)(?:"));
assert.ok(/data-filter-sale/.test(script) && /priceInfo\(product\)\.percent > 0/.test(script) && !/priceInfo\([a-z]+\)\.discount/.test(script));

// ۵) فیلتر API: هر زیردسته فقط نام‌های خودش را می‌پذیرد و همهٔ آن‌ها زیر «لوازم جانبی موبایل» می‌آیند
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1/none";
const { categoryPattern } = require("../src/routes/products");
const parent = categoryPattern("لوازم جانبی موبایل");
for (const t of TYPES) {
  const name = catalog.ACCESSORY_TYPES[t].category;
  assert.ok(categoryPattern(name).test(name), name);
  assert.ok(parent.test(name), name + " باید در لوازم جانبی برند دیده شود");
  assert.ok(!categoryPattern("موبایل").test(name), name + " نباید در گوشی‌ها بیاید");
  for (const other of TYPES.filter((o) => o !== t)) assert.ok(!categoryPattern(name).test(catalog.ACCESSORY_TYPES[other].category), name + " نباید " + other + " را بگیرد");
}
for (const alias of ["قاب", "کاور", "گلس", "محافظ صفحه", "کیف", "جلد"]) assert.ok(parent.test(alias), alias);
assert.ok(!parent.test("موبایل") && !parent.test("آیفون"));

// ۶) ادمین می‌تواند این دسته‌ها را برای محصول انتخاب کند
const admin = read("views/admin-products.html");
for (const t of ["قاب و کاور", "گلس و محافظ صفحه", "کیف و جلد", "کابل، شارژر و آداپتور"]) assert.ok(admin.includes(`<option value="${t}">`), t);

// ۷) سئو: متا و فیلتر کاتالوگ برای هر ۱۲ صفحه
stub("../src/config/env", { siteUrl: "https://pixellife.ir" });
delete require.cache[require.resolve("../src/services/seo")];
const seo = require("../src/services/seo");
for (const p of catalog.allPaths()) {
  assert.ok(seo.PAGES[p] && seo.PAGES[p].title && seo.PAGES[p].parent, "PAGES " + p);
  assert.ok(seo.CATALOG[p] && seo.CATALOG[p].brand && seo.CATALOG[p].category, "CATALOG " + p);
}
console.log("Accessory subcategories test passed.");
process.exit(0);
