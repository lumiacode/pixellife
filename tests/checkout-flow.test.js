// تست یکپارچهٔ مسیر خرید: سبد → قیمت‌گذاری → ثبت سفارش → درگاه زرین‌پال → تأیید پرداخت.
// روت‌ها، سرویس قیمت‌گذاری، schema واقعی Order و روت واقعی زرین‌پال اجرا می‌شوند؛
// فقط MongoDB (مدل‌های Product/Address/DiscountCode/Order.create) و axios جایگزین شده‌اند.
process.env.MONGO_URI = "mongodb://stub/none";
process.env.JWT_SECRET = "test-secret";
process.env.ZARINPAL_MERCHANT_ID = "00000000-0000-0000-0000-000000000000";
process.env.ZARINPAL_SANDBOX = "true";
process.env.ZARINPAL_CALLBACK_URL = "https://example.test/api/payments/zarinpal/callback";

const assert = require("assert");
const http = require("http");
const path = require("path");
const Module = require("module");

const src = (...p) => path.join(__dirname, "..", "src", ...p);
const stub = (file, exports) => {
  const resolved = require.resolve(file);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
};

/* ───────── داده‌های ساختگی ───────── */
const USER = { _id: "64b000000000000000000001", mobile: "09120000000", firstName: "علی", lastName: "رضایی" };
const products = [
  { _id: "64a000000000000000000001", slug: "charger-20w", legacyId: "p-charger", name: "شارژر ۲۰ وات", brand: "Hiska", category: "accessories", price: 2099000, discount: 33, stock: 5, availability: "in", mainImage: "/img/c.png" },
  { _id: "64a000000000000000000002", slug: "phone-x", name: "گوشی X", brand: "X", category: "mobile", price: 10000000, discount: 0, stock: 1, availability: "in", images: ["/img/p.png"] },
  { _id: "64a000000000000000000003", slug: "gone", name: "ناموجود", price: 1000, stock: 0, availability: "out" },
];
const address = { _id: "64c000000000000000000001", user: USER._id, receiverName: "علی رضایی", receiverMobile: "09123456789", province: "تهران", city: "تهران", fullAddress: "خیابان شاهد پلاک ۳۴۴", postalCode: "1234567890" };
const discountDocs = [{ _id: "d1", code: "OFF10", type: "percent", value: 10, maxDiscount: 100000, minOrderAmount: 0, usageLimit: 1, usedCount: 0, isActive: true, expiresAt: null }];
const orders = [];
const lean = (value) => ({ lean: async () => value });

/* ───────── جایگزین‌ها ───────── */
stub(src("middleware", "authMiddleware.js"), { protect: (req, res, next) => { req.user = USER; next(); } });
stub(src("services", "behaviorAnalytics.js"), { recordBehaviorEvent: async () => {} });
stub(src("models", "Product.js"), {
  findById: (id) => lean(products.find((p) => String(p._id) === String(id)) || null),
  findOne: (q) => lean(products.find((p) => (q.$or || []).some((c) => Object.entries(c).every(([k, v]) => p[k] === v))) || null),
});
stub(src("models", "Address.js"), { findOne: (q) => lean(String(q._id) === String(address._id) && String(q.user) === String(USER._id) ? address : null) });
stub(src("models", "DiscountCode.js"), {
  findOne: async (q) => discountDocs.find((d) => d.code === q.code) || null,
  findOneAndUpdate: async (cond, update) => {
    const doc = discountDocs.find((d) => d._id === String(cond._id));
    if (!doc || (doc.usageLimit > 0 && doc.usedCount >= doc.usageLimit)) return null;
    const before = { ...doc };
    doc.usedCount += update.$inc.usedCount;
    return before;
  },
  updateOne: async (cond, update) => {
    const doc = discountDocs.find((d) => (cond._id ? d._id === String(cond._id) : d.code === cond.code));
    if (doc && (!cond.usedCount || doc.usedCount > cond.usedCount.$gt)) doc.usedCount += update.$inc.usedCount;
    return {};
  },
});

// Order: schema واقعی برای اعتبارسنجی، ذخیره‌سازی در حافظه
const realOrderPath = require.resolve(src("models", "Order.js"));
const RealOrder = require(realOrderPath);
const attach = (doc) => { doc.save = async () => { await doc.validate(); }; return doc; };
stub(src("models", "Order.js"), {
  create: async (data) => { const doc = attach(new RealOrder(data)); await doc.validate(); orders.push(doc); return doc; },
  find: (q) => {
    const matches = orders.filter((o) => String(o.user) === String(q.user) && (!q.paymentStatus || o.paymentStatus === q.paymentStatus) && (!q.status || o.status === q.status) && !(q.superseded && q.superseded.$ne === true && o.superseded === true));
    const result = Promise.resolve(matches);
    result.sort = () => ({ lean: async () => matches.map((o) => o.toObject()) });
    return result;
  },
  findOne: async (q) => orders.find((o) => (q._id ? String(o._id) === String(q._id) : true) && (q.user ? String(o.user) === String(q.user) : true) && (q["zarinpal.authority"] ? o.zarinpal.authority === q["zarinpal.authority"] : true)) || null,
});

const zarinpalCalls = [];
const axiosStub = {
  post: async (url, body) => {
    zarinpalCalls.push({ url, body });
    if (url.endsWith("/request.json")) return { data: { data: { code: 100, authority: "A00000000000000000000000000000001" } } };
    if (url.endsWith("/verify.json")) return { data: { data: { code: 100, ref_id: 987654, card_pan: "6037****1234" } } };
    throw new Error("unexpected url " + url);
  },
};
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "axios") return axiosStub;
  return originalLoad.apply(this, arguments);
};

const express = require("express");
const app = express();
app.use(express.json());
app.use("/api/checkout", require(src("routes", "checkout.js")));
app.use("/api/orders", require(src("routes", "orders.js")));
app.use("/api/payments/zarinpal", require(src("routes", "zarinpalPayments.js")));
app.use((err, req, res, next) => res.status(err.statusCode || 500).json({ success: false, message: err.message }));

async function call(base, method, url, body) {
  const res = await fetch(base + url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return { status: res.status, json, location: res.headers.get("location") };
}

(async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const discountedCharger = Math.round(2099000 * (1 - 0.33)); // 1,406,330

  /* ۱) قیمت از دیتابیس خوانده می‌شود، نه از مرورگر؛ شناسهٔ سبد می‌تواند slug / legacyId / ObjectId باشد */
  for (const id of ["charger-20w", "p-charger", products[0]._id]) {
    const q = await call(base, "POST", "/api/checkout/quote", { items: [{ productId: id, quantity: 1, price: 1 }], shippingMethod: "post" });
    assert.strictEqual(q.status, 200, `quote با شناسهٔ ${id}`);
    assert.strictEqual(q.json.pricing.subtotal, discountedCharger);
    assert.strictEqual(q.json.pricing.shipping, 150000);
    assert.strictEqual(q.json.pricing.total, discountedCharger + 150000);
  }

  /* ۲) موجودی ناکافی / ناموجود */
  assert.strictEqual((await call(base, "POST", "/api/checkout/quote", { items: [{ productId: "charger-20w", quantity: 6 }] })).status, 409);
  assert.strictEqual((await call(base, "POST", "/api/checkout/quote", { items: [{ productId: "gone", quantity: 1 }] })).status, 409);
  assert.strictEqual((await call(base, "POST", "/api/checkout/quote", { items: [] })).status, 400);

  /* ۳) ارسال بالای آستانه رایگان */
  const big = await call(base, "POST", "/api/checkout/quote", { items: [{ productId: "phone-x", quantity: 1 }] });
  assert.strictEqual(big.json.pricing.shipping, 0);

  /* ۴) کد تخفیف نامعتبر / معتبر در quote */
  const bad = await call(base, "POST", "/api/checkout/quote", { items: [{ productId: "charger-20w", quantity: 1 }], discountCode: "NOPE" });
  assert.ok(bad.json.discountError && bad.json.pricing.codeDiscount === 0);
  const good = await call(base, "POST", "/api/checkout/quote", { items: [{ productId: "charger-20w", quantity: 1 }], discountCode: "off10" });
  assert.strictEqual(good.json.discount.code, "OFF10");
  assert.strictEqual(good.json.pricing.codeDiscount, 100000);
  assert.strictEqual(discountDocs[0].usedCount, 0, "quote نباید ظرفیت کد را مصرف کند");

  /* ۵) ثبت سفارش: مبلغ‌ها، schema واقعی Order، مصرف ظرفیت کد */
  const orderBody = { addressId: address._id, items: [{ productId: "charger-20w", quantity: 2, color: "مشکی", storage: "", warranty: "" }], shippingMethod: "post", paymentMethod: "zarinpal", discountCode: "OFF10" };
  const created = await call(base, "POST", "/api/orders", orderBody);
  assert.strictEqual(created.status, 201, JSON.stringify(created.json));
  let order = orders[0];
  const subtotal = discountedCharger * 2;
  assert.strictEqual(order.subtotal, subtotal);
  assert.strictEqual(order.deliveryFee, 150000);
  assert.strictEqual(order.discount, 100000);
  assert.strictEqual(order.total, subtotal + 150000 - 100000);
  assert.strictEqual(order.discountCode, "OFF10");
  assert.strictEqual(order.shippingMethod.id, "post");
  assert.strictEqual(order.paymentMethod, "online");
  assert.strictEqual(order.paymentStatus, "unpaid");
  assert.strictEqual(order.status, "awaiting_payment");
  assert.strictEqual(String(order.items[0].product), products[0]._id);
  assert.strictEqual(order.items[0].price, discountedCharger);
  assert.strictEqual(discountDocs[0].usedCount, 1);

  /* ۶) ظرفیت کد را کاربر دیگری مصرف کرده: سفارش جدید ساخته نمی‌شود و سفارش پرداخت‌نشدهٔ قبلی لغو می‌ماند */
  discountDocs[0].usedCount = 2; // ۱ تا سفارش همین کاربر + ۱ تا کاربر دیگر
  const second = await call(base, "POST", "/api/orders", orderBody);
  assert.strictEqual(second.status, 400);
  assert.strictEqual(orders.length, 1);
  assert.strictEqual(orders[0].status, "cancelled");
  assert.strictEqual(discountDocs[0].usedCount, 1, "ظرفیت سفارش لغوشده آزاد شود");
  const baseline = async () => {
    orders.length = 0;
    discountDocs[0].usedCount = 0;
    discountDocs[0].usageLimit = 5;
    assert.strictEqual((await call(base, "POST", "/api/orders", orderBody)).status, 201);
    assert.strictEqual(orders.length, 1);
    assert.strictEqual(discountDocs[0].usedCount, 1);
  };
  await baseline();

  /* ۷) خطای موجودی: سفارش جدیدی ساخته نمی‌شود و ظرفیت کد مصرف نمی‌شود */
  const noStock = await call(base, "POST", "/api/orders", { ...orderBody, items: [{ productId: "phone-x", quantity: 3 }] });
  assert.strictEqual(noStock.status, 409);
  assert.strictEqual(orders.length, 1);
  assert.strictEqual(discountDocs[0].usedCount, 0);
  await baseline();

  /* ۸) آدرس دیگران / روش پرداخت نامعتبر: سفارش فعلی دست‌نخورده می‌ماند */
  assert.strictEqual((await call(base, "POST", "/api/orders", { ...orderBody, addressId: "64c0000000000000000000ff" })).status, 400);
  assert.strictEqual((await call(base, "POST", "/api/orders", { ...orderBody, paymentMethod: "nope" })).status, 400);
  assert.strictEqual(orders.length, 1);
  assert.strictEqual(orders[0].status, "awaiting_payment");

  /* ۸-ب) ثبت سفارش دوباره: سفارش پرداخت‌نشدهٔ قبلی لغو و پنهان می‌شود و کد تخفیف دوباره قابل استفاده است */
  const retry = await call(base, "POST", "/api/orders", orderBody);
  assert.strictEqual(retry.status, 201, JSON.stringify(retry.json));
  assert.strictEqual(orders.length, 2);
  assert.strictEqual(orders[0].status, "cancelled");
  assert.strictEqual(orders[0].superseded, true);
  assert.strictEqual(orders[1].status, "awaiting_payment");
  assert.strictEqual(discountDocs[0].usedCount, 1, "ظرفیت کد سفارش قبلی آزاد و برای سفارش جدید مصرف شود");
  const mine = await call(base, "GET", "/api/orders/my");
  assert.strictEqual(mine.json.orders.length, 1, "سفارش جایگزین‌شده نباید در لیست کاربر باشد");
  assert.strictEqual(String(mine.json.orders[0]._id), String(orders[1]._id));
  // سفارش لغوشده دیگر پرداخت جدید نمی‌گیرد
  assert.strictEqual((await call(base, "POST", "/api/payments/zarinpal/request", { orderId: String(orders[0]._id) })).status, 400);
  assert.strictEqual(zarinpalCalls.length, 0);
  orders.splice(0, 1); // ادامهٔ تست روی سفارش فعال

  order = orders[0];
  /* ۹) درخواست پرداخت زرین‌پال: مبلغ به ریال برابر total سفارش × ۱۰ */
  const pay = await call(base, "POST", "/api/payments/zarinpal/request", { orderId: String(order._id) });
  assert.strictEqual(pay.status, 200, JSON.stringify(pay.json));
  const requestCall = zarinpalCalls.find((c) => c.url.endsWith("/request.json"));
  assert.strictEqual(requestCall.body.amount, order.total * 10);
  assert.strictEqual(requestCall.body.callback_url, process.env.ZARINPAL_CALLBACK_URL);
  assert.ok(pay.json.paymentUrl.endsWith("A00000000000000000000000000000001"));
  assert.strictEqual(order.zarinpal.authority, "A00000000000000000000000000000001");

  /* ۱۰) بازگشت از درگاه: تأیید با همان مبلغ و تغییر وضعیت سفارش */
  const callback = await call(base, "GET", "/api/payments/zarinpal/callback?Authority=A00000000000000000000000000000001&Status=OK");
  assert.strictEqual(callback.status, 302);
  assert.ok(callback.location.startsWith("/profile/orders?payment=success"));
  const verifyCall = zarinpalCalls.find((c) => c.url.endsWith("/verify.json"));
  assert.strictEqual(verifyCall.body.amount, order.total * 10);
  assert.strictEqual(order.paymentStatus, "paid");
  assert.strictEqual(order.status, "processing");
  assert.strictEqual(order.zarinpal.refId, 987654);

  /* ۱۱) پرداخت دوباره سفارش پرداخت‌شده ممکن نیست */
  assert.strictEqual((await call(base, "POST", "/api/payments/zarinpal/request", { orderId: String(order._id) })).status, 400);

  server.close();
  console.log("Checkout flow test passed.");
})().catch((error) => { console.error(error); process.exit(1); });
