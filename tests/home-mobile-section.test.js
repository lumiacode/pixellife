// ردیف «موبایل» صفحهٔ اصلی: فیلد محصول، فرم ادمین، API ذخیره، فیلتر عمومی و بارگذاری در صفحهٔ اصلی.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const src = (...p) => path.join(root, "src", ...p);
const read = (...p) => fs.readFileSync(path.join(root, ...p), "utf8");
const stub = (file, exports) => { const p = require.resolve(file); require.cache[p] = { id: p, filename: p, loaded: true, exports }; };

// مدل و ادمین
assert.ok(/homeMobile:\s*\{\s*type:\s*Boolean,\s*default:\s*false\s*\}/.test(read("src", "models", "Product.js")), "فیلد homeMobile در مدل");
const api = read("src", "routes", "adminApi.js");
assert.ok(/homeMobile: parseEnabled\(homeMobile, false\)/.test(api), "ایجاد محصول homeMobile را ذخیره می‌کند");
assert.ok(/if \(homeMobile !== undefined\) product\.homeMobile = parseEnabled\(homeMobile, false\)/.test(api), "ویرایش فقط وقتی فیلد فرستاده شده تغییرش می‌دهد (ویرایش‌های دیگر آن را پاک نمی‌کنند)");
const form = read("views", "admin-products.html");
assert.ok(/id="fHomeMobile"/.test(form) && /fd\.append\("homeMobile", document\.getElementById\("fHomeMobile"\)\.checked\)/.test(form) && /fHomeMobile"\)\.checked = p\.homeMobile === true/.test(form), "چک‌باکس در فرم ادمین (ایجاد، ویرایش، ارسال)");

// صفحهٔ اصلی: بخش و ترتیب بارگذاری (انتخاب ادمین قبل از ردیف‌های دیگر)
const home = read("views", "index.html");
assert.ok(/id="mobileSection"[^>]*hidden/.test(home) && /id="mobileGrid"/.test(home) && />موبایل<\/h2>/.test(home), "بخش موبایل (پنهان تا وقتی محصولی انتخاب شده)");
assert.ok(/api\/products\?homeMobile=true/.test(home));
const chain = home.match(/\[loadAmazingOffers,([^\]]*)\]\.forEach\(enqueueHomeRow\)/)[1];
assert.ok(chain.indexOf("loadMobileRail") !== -1 && chain.indexOf("loadMobileRail") < chain.indexOf("loadFeaturedProducts"), "loadMobileRail قبل از منتخب‌ها");

// API عمومی: فیلتر homeMobile
let lastFilter = null;
const query = (list) => { const q = { select: () => q, sort: () => q, limit: () => q, lean: async () => list, then: (a, b) => Promise.resolve(list).then(a, b) }; return q; };
stub(src("models", "Product.js"), { find: (f) => { lastFilter = f; return query([]); }, updateMany: async () => ({}) });
stub(src("models", "Order.js"), {});
stub(src("services", "reviewStats.js"), { withApprovedReviewStats: async (l) => l });
stub(src("utils", "productImages.js"), { streamProductImage: () => {} });
const express = require("express");
const app = express(); app.use("/api/products", require(src("routes", "products.js")));
(async () => {
  const server = app.listen(0); const base = `http://127.0.0.1:${server.address().port}/api/products`;
  try {
    await fetch(base + "?homeMobile=true&limit=12");
    assert.strictEqual(lastFilter.homeMobile, true, "فیلتر homeMobile=true");
    await fetch(base + "?limit=12");
    assert.strictEqual(lastFilter.homeMobile, undefined, "بدون پارامتر، فیلتر اعمال نمی‌شود");
    assert.ok(/"homeMobile"/.test(read("src", "routes", "products.js")), "فیلد در کارت‌های API هست");
    console.log("Home mobile section tests passed.");
  } finally { server.close(); }
})().catch((e) => { console.error(e); process.exit(1); }).then(() => process.exit(0));
