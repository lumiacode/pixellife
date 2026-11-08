// آیکن دسته‌ها: یک خانوادهٔ بصری (کاشی گرد‌گوشه، خط یکسان، بدون رنگ‌های پاستلی متفاوت)؛ نسخهٔ خاکستری برای عادی و آبی برای فعال.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

global.window = {};
eval(fs.readFileSync(path.join(root, "public/js/category-data.js"), "utf8"));
const categories = window.PLCategories;
assert.ok(categories.length >= 5);

const ALLOWED = { normal: ["#f1f5f9", "#e2e8f0", "#475569"], active: ["#eff6ff", "#bfdbfe", "#2563eb"] };
const colorsIn = (svg) => [...svg.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase());
const strokeWidths = new Set();

for (const category of categories) {
  assert.ok(category.image && category.imageActive, category.id + " باید هر دو نسخهٔ آیکن را داشته باشد");
  for (const [kind, url] of [["normal", category.image], ["active", category.imageActive]]) {
    const file = path.join(root, "public", url.split("?")[0]);
    assert.ok(fs.existsSync(file), "فایل آیکن پیدا نشد: " + url);
    const svg = fs.readFileSync(file, "utf8");
    assert.ok(/<rect [^>]*rx="14"/.test(svg), url + ": کاشی گرد‌گوشه (rx=14)");
    assert.ok(!/<circle cx="24" cy="24" r="24"/.test(svg), url + ": دایرهٔ پاستلی قدیمی نباید باشد");
    assert.ok(!/class="f"|rgba\(/.test(svg), url + ": بدون پرشدگی نیمه‌شفاف");
    for (const color of colorsIn(svg)) assert.ok(ALLOWED[kind].includes(color), `${url}: رنگ مجاز نیست (${color})`);
    const widths = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => m[1]);
    widths.forEach((w) => strokeWidths.add(w));
  }
}
assert.deepStrictEqual([...strokeWidths].sort(), ["1", "1.4"], "ضخامت خط آیکن‌ها باید یکسان باشد (۱.۴ آیکن، ۱ کادر)");

// کشوی موبایل و مگامنوی دسکتاپ نسخهٔ فعال را برای دستهٔ باز نشان می‌دهند
for (const file of ["public/js/mobile-bottom-nav.js", "public/js/shared-category-nav.js"]) {
  assert.ok(fs.readFileSync(path.join(root, file), "utf8").includes("imageActive"), file);
}
console.log("Category icons test passed.");
