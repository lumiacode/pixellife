// فرم تماس: اعتبارسنجی سمت سرور، تله‌ی ربات (honeypot)، محدودیت نرخ و ذخیرهٔ پیام (با مدل جعلی).
const assert = require("assert");
const stub = (rel, exports) => { const p = require.resolve(rel); require.cache[p] = { id: p, filename: p, loaded: true, exports }; };

const saved = [];
stub("../src/models/ContactMessage", { create: async (doc) => { saved.push(doc); return { _id: "665f1c2ab3c4d5e6f7a8b9c0", ...doc }; } });
const { submitContact } = require("../src/controllers/homeController");

const account = { _id: "user1", firstName: "علی", lastName: "رضایی", mobile: "09123456789" };
const call = async (body, ip = "1.1.1.1", user = account) => {
  let out = { status: 200, json: null };
  const res = { status(code) { out.status = code; return this; }, json(data) { out.json = data; return this; } };
  await submitContact({ body, ip, user }, res);
  return out;
};
const good = { name: "علی رضایی", phone: "۰۹۱۲۳۴۵۶۷۸۹", email: "", subject: "پیگیری سفارش", orderNumber: "PL-1730000000000-4821", message: "سلام، سفارش من هنوز ارسال نشده است" };

(async () => {
  // موفق + نرمال‌سازی ارقام فارسی
  let r = await call(good, "10.0.0.1");
  assert.strictEqual(r.status, 201); assert.ok(r.json.success);
  assert.strictEqual(saved[0].phone, "09123456789");
  assert.strictEqual(saved[0].email, null);
  assert.strictEqual(saved[0].orderNumber, "PL-1730000000000-4821");
  // هویت فرستنده از حساب می‌آید، نه از چیزی که در فرم تایپ شده
  r = await call({ ...good, name: "sasan hedayat", phone: "09990000000" }, "10.0.0.9");
  assert.strictEqual(r.status, 201);
  assert.strictEqual(saved[1].name, "علی رضایی"); assert.strictEqual(saved[1].phone, "09123456789"); assert.strictEqual(String(saved[1].user), "user1");
  // بدون ورود: ۴۰۱ و ذخیره نمی‌شود
  const countBefore = saved.length;
  r = await call(good, "10.0.0.10", null);
  assert.strictEqual(r.status, 401); assert.strictEqual(r.json.needLogin, true); assert.strictEqual(saved.length, countBefore);
  // حساب بدون نام: ۴۰۳
  r = await call(good, "10.0.0.11", { _id: "u2", firstName: "", lastName: "", mobile: "09120000001" });
  assert.strictEqual(r.status, 403); assert.strictEqual(saved.length, countBefore);

  // اعتبارسنجی
  for (const [patch, label] of [
    [{ email: "abc" }, "ایمیل نامعتبر"],
    [{ message: "کوتاه" }, "پیام کوتاه"], [{ message: "x".repeat(1501) }, "پیام بلند"], [{ orderNumber: "سفارش من" }, "شمارهٔ سفارش نامعتبر"],
    [{ subject: "" }, "بدون موضوع"],
  ]) {
    const n = saved.length;
    r = await call({ ...good, ...patch }, "10.0.0." + (2 + Math.floor(Math.random() * 200)));
    assert.strictEqual(r.status, 400, label); assert.strictEqual(saved.length, n, label + " نباید ذخیره شود");
  }

  // honeypot: موفق ظاهر می‌شود ولی ذخیره نمی‌شود
  const before = saved.length;
  r = await call({ ...good, website: "http://spam" }, "10.0.1.1");
  assert.strictEqual(r.status, 201); assert.strictEqual(saved.length, before);

  // محدودیت نرخ: ۵ پیام موفق از یک IP، ششمی ۴۲۹
  const ip = "10.9.9.9";
  for (let i = 0; i < 5; i += 1) assert.strictEqual((await call(good, ip)).status, 201);
  assert.strictEqual((await call(good, ip)).status, 429);
  assert.strictEqual((await call(good, "10.9.9.10")).status, 201, "IP دیگر نباید محدود شود");

  console.log("contact form tests passed");
})().catch((e) => { console.error(e); process.exit(1); });
