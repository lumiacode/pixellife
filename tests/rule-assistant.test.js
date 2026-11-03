// ربات قاعده‌محور: تشخیص نیت، جستجوی ساختارمند (برند/دسته/بودجه/حافظه/رنگ/مرتب‌سازی)، پاسخ‌های پشتیبانی از داده‌های واقعی.
const assert = require("assert");
const path = require("path");
const rule = require(path.join(__dirname, "..", "src", "services", "ruleAssistant.js"));

const P = (o) => ({ _id: o.slug, brand: "", category: "موبایل", discount: 0, stock: 5, availability: "in", featured: false, rating: 0, storages: [], colors: [], ...o });
const catalog = [
  P({ slug: "a56", name: "گوشی سامسونگ Galaxy A56", brand: "سامسونگ", price: 20000000, storages: ["256"], colors: [{ name: "مشکی" }] }),
  P({ slug: "s25", name: "گوشی سامسونگ Galaxy S25 Ultra", brand: "سامسونگ", price: 60000000, discount: 10, storages: ["256", "512"], colors: [{ name: "مشکی" }, { name: "سفید" }], rating: 4.8 }),
  P({ slug: "i17", name: "گوشی اپل iPhone 17 Pro Max", brand: "اپل", price: 90000000, storages: ["256"], colors: [{ name: "آبی" }] }),
  P({ slug: "gone", name: "گوشی سامسونگ ناموجود", brand: "سامسونگ", price: 10000000, stock: 0, availability: "out" }),
  P({ slug: "soon", name: "گوشی سامسونگ به‌زودی", brand: "سامسونگ", price: 15000000, comingSoon: true }),
  P({ slug: "tab", name: "تبلت سامسونگ Tab S10", brand: "سامسونگ", category: "تبلت", price: 30000000 }),
];
// دیتابیس ساختگی: فقط فیلتر برند/دسته/نام را مثل Mongo اعمال می‌کند.
const matchRegex = (value, cond) => !cond || new RegExp(cond.$regex, cond.$options).test(String(value || ""));
const findProducts = async (filter) => catalog.filter((p) => (filter.$and || []).every((c) => (c.brand ? matchRegex(p.brand, c.brand) : c.category ? matchRegex(p.category, c.category) : c.name ? matchRegex(p.name, c.name) : true)));
const orders = [{ orderNumber: "PL-1", status: "ارسال‌شده", paid: true, totalToman: 5000000, currentLabel: "تحویل به پست / پیک" }];
const deps = {
  findProducts, userOrders: async () => orders,
  shippingMethods: async () => [{ id: "post", title: "ارسال پستی", eta: "تا ۳ روز کاری", fee: 150000, freeThreshold: 5000000, enabled: true }],
  paymentMethods: async () => [{ title: "پرداخت اینترنتی", enabled: true }, { title: "کیف پول", enabled: true }, { title: "غیرفعال", enabled: false }],
  supportLink: async () => "https://ble.ir/pixellife",
};

(async () => {
  // نرمال‌سازی و بودجه
  assert.strictEqual(rule.normalize("گوشی ۲۰٬۰۰۰ ميلیون"), "گوشی 20٬000 میلیون".replace("٬", "٬"));
  assert.deepStrictEqual([rule.parseBudget("زیر 20 میلیون").min, rule.parseBudget("زیر 20 میلیون").max], [0, 20e6]);
  assert.deepStrictEqual([rule.parseBudget("بین 10 تا 20 میلیون").min, rule.parseBudget("بین 10 تا 20 میلیون").max], [10e6, 20e6]);
  assert.strictEqual(rule.parseBudget("بالای 40 میلیون").max, Infinity);
  assert.ok(Math.abs(rule.parseBudget("گوشی 15 میلیونی").max - 18e6) < 1);
  const parsed = rule.parseSearch("آیفون ۱۷ پرو مکس ۲۵۶ گیگ مشکی");
  assert.strictEqual(parsed.brand.name, "اپل"); assert.strictEqual(parsed.storage, "256"); assert.strictEqual(parsed.color, "مشکی");
  assert.deepStrictEqual(parsed.models, ["17", "pro", "max"]);
  assert.strictEqual(rule.parseSearch("آیپد").category.name, "تبلت", "آیپد تبلت است نه موبایل");

  // نیت‌ها
  const intent = (m) => rule.detectIntent(m).intent;
  assert.strictEqual(intent("سلام"), "greeting"); assert.strictEqual(intent("ممنون"), "thanks");
  assert.strictEqual(intent("سفارشم کجاست؟"), "order_status"); assert.strictEqual(intent("می‌خوام سفارشمو مرجوع کنم"), "return_cancel");
  assert.strictEqual(intent("مهلت پرداخت چقدره"), "payment_deadline"); assert.strictEqual(intent("کیف پول چطور شارژ میشه"), "wallet");
  assert.strictEqual(intent("هزینه ارسال چقدره"), "shipping"); assert.strictEqual(intent("گارانتی دارن؟"), "warranty");
  assert.strictEqual(intent("گوشی سامسونگ تا ۲۵ میلیون"), "product_search"); assert.strictEqual(intent("بلبلبل"), "unknown");

  // جستجو: بودجه، موجودی، تبلت جدا از موبایل، تخفیف در قیمت نهایی
  let r = await rule.respond("گوشی سامسونگ تا ۲۵ میلیون", { deps });
  assert.strictEqual(r.intent, "product_search");
  assert.deepStrictEqual(r.suggestions.map((s) => s.slug), ["a56"], "ناموجود، به‌زودی، تبلت و بالای بودجه حذف می‌شوند");
  assert.ok(/A56/.test(r.answer) && /تومان/.test(r.answer) && r.handoff === false);
  // کارت محصول برای چت: لینک داخلی، قیمت نهایی، بدون عکس data: و متن کوتاه intro بدون فهرست
  assert.strictEqual(r.cards.length, 1); assert.strictEqual(r.cards[0].url, "/product/a56"); assert.strictEqual(r.cards[0].price, 20000000);
  assert.ok(r.intro && !/A56/.test(r.intro) && /روی محصول بزنید/.test(r.intro));
  const withData = rule.toCard({ _id: "x", slug: "x", name: "n", price: 1000, mainImage: "data:image/png;base64,AAAA" });
  assert.strictEqual(withData.image, "", "عکس data: در کارت نیست");
  assert.strictEqual(rule.toCard({ _id: "a".repeat(24), slug: "s", name: "n", price: 1000, mainImage: "/api/products/image/" + "a".repeat(24) }).image, "/api/products/image/" + "a".repeat(24) + "?w=160");
  assert.strictEqual(rule.toCard({ _id: "y", slug: "a b", name: "n", price: 1000, discount: 10 }).url, "/product/a%20b");
  assert.strictEqual(rule.toCard({ _id: "y", slug: "s", name: "n", price: 1000, discount: 10 }).originalPrice, 1000);
  r = await rule.respond("گوشی سامسونگ تا ۶۰ میلیون", { deps });
  assert.ok(r.suggestions.some((s) => s.slug === "s25") && r.suggestions.find((s) => s.slug === "s25").price === 54e6, "قیمت نهایی با تخفیف ۱۰٪");
  r = await rule.respond("ارزان ترین گوشی سامسونگ", { deps });
  assert.strictEqual(r.suggestions[0].slug, "a56", "مرتب‌سازی ارزان‌ترین");
  r = await rule.respond("گوشی سامسونگ سفید", { deps });
  assert.deepStrictEqual(r.suggestions.map((s) => s.slug), ["s25"], "فیلتر رنگ");
  r = await rule.respond("گوشی سامسونگ 512 گیگ", { deps });
  assert.deepStrictEqual(r.suggestions.map((s) => s.slug), ["s25"], "فیلتر حافظه");
  r = await rule.respond("تبلت", { deps });
  assert.deepStrictEqual(r.suggestions.map((s) => s.slug), ["tab"]);
  // بودجه‌ای که چیزی ندارد: صادقانه می‌گوید و ارزان‌ترین موجود را نشان می‌دهد
  r = await rule.respond("گوشی سامسونگ زیر 5 میلیون", { deps });
  assert.ok(/پیدا نشد/.test(r.answer) && r.suggestions[0].slug === "a56");
  // برند/دسته‌ای که محصول ندارد: بدون اختراع محصول، ارجاع به پشتیبان
  r = await rule.respond("هدفون سونی", { deps });
  assert.strictEqual(r.suggestions.length, 0); assert.strictEqual(r.handoff, true);
  // مدل دقیق ناموجود: نزدیک‌ترین‌ها با توضیح
  r = await rule.respond("سامسونگ Z Fold 9", { deps });
  assert.ok(/نزدیک‌ترین/.test(r.answer) || r.suggestions.length === 0);

  // سفارش: فقط برای کاربر واردشده
  r = await rule.respond("سفارشم کجاست", { user: null, deps });
  assert.ok(/وارد حساب/.test(r.answer) && !/PL-1/.test(r.answer));
  r = await rule.respond("سفارشم کجاست", { user: { _id: "u" }, deps });
  assert.ok(/PL-1/.test(r.answer) && /تحویل به پست/.test(r.answer) && /پرداخت‌شده/.test(r.answer));
  r = await rule.respond("سفارشم کجاست", { user: { _id: "u" }, deps: { ...deps, userOrders: async () => [] } });
  assert.ok(/سفارشی ثبت نشده/.test(r.answer));

  // پشتیبانی از داده‌های واقعی؛ لغو/مرجوعی همیشه ارجاع انسانی
  r = await rule.respond("هزینه ارسال چقدره", { deps }); assert.ok(/ارسال پستی/.test(r.answer) && /۱۵۰٬۰۰۰|۱۵۰,۰۰۰|۱۵۰/.test(r.answer) && /رایگان/.test(r.answer));
  r = await rule.respond("چطوری پرداخت کنم", { deps }); assert.ok(/پرداخت اینترنتی/.test(r.answer) && !/غیرفعال/.test(r.answer));
  r = await rule.respond("شماره پشتیبانی", { deps }); assert.ok(/info@pixellife\.ir/.test(r.answer) && /ble\.ir/.test(r.answer));
  r = await rule.respond("می‌خوام لغو کنم", { deps }); assert.strictEqual(r.handoff, true);
  r = await rule.respond("بلبلبل", { deps }); assert.strictEqual(r.handoff, true); assert.strictEqual(r.confidence, "low");
  // خرابی دیتابیس پاسخ نمی‌شکند
  r = await rule.respond("گوشی سامسونگ", { deps: { ...deps, findProducts: async () => { throw new Error("db"); } } });
  assert.strictEqual(r.handoff, true);

  console.log("Rule assistant tests passed.");
})().catch((e) => { console.error(e); process.exit(1); });
