// صندوق پیام‌های تماس در پنل ادمین: فهرست/فیلتر/جست‌وجو، شمارندهٔ خوانده‌نشده، تغییر وضعیت و حذف (با مدل جعلی).
const assert = require("assert");
const http = require("http");
const express = require("express");
const stub = (rel, exports) => { const p = require.resolve(rel); require.cache[p] = { id: p, filename: p, loaded: true, exports }; };

const ids = ["a".repeat(24), "b".repeat(24), "c".repeat(24)];
let docs = [
  { _id: ids[0], name: "علی رضایی", phone: "09123456789", email: null, subject: "پیگیری سفارش", orderNumber: "PL-1", message: "سفارشم کجاست", status: "new", createdAt: new Date("2026-11-03") },
  { _id: ids[1], name: "مریم احمدی", phone: "09351112233", email: "m@x.ir", subject: "مشاوره خرید", orderNumber: "", message: "کدام گوشی بهتر است", status: "read", createdAt: new Date("2026-11-02") },
  { _id: ids[2], name: "رضا کریمی", phone: "09120000000", email: null, subject: "سایر", orderNumber: "", message: "پیشنهاد دارم", status: "replied", createdAt: new Date("2026-11-01") },
];
const matches = (d, f) => (!f.status || d.status === f.status) && (!f.$or || f.$or.some((c) => Object.values(c).some((rx) => new RegExp(rx.$regex, rx.$options).test(String(Object.keys(c)[0] && d[Object.keys(c)[0]] || "")))));
const chain = (rows) => { const q = { sort() { return q; }, skip(n) { rows = rows.slice(n); return q; }, limit(n) { rows = rows.slice(0, n); return q; }, lean: async () => rows }; return q; };
const ContactMessage = {
  countDocuments: async (f) => docs.filter((d) => matches(d, f)).length,
  aggregate: async () => ["new", "read", "replied"].map((s) => ({ _id: s, n: docs.filter((d) => d.status === s).length })),
  find: (f) => chain(docs.filter((d) => matches(d, f))),
  findByIdAndUpdate: (id, upd) => ({ lean: async () => { const d = docs.find((x) => x._id === id); if (!d) return null; Object.assign(d, upd); return { ...d }; } }),
  findByIdAndDelete: (id) => ({ lean: async () => { const i = docs.findIndex((x) => x._id === id); if (i < 0) return null; return docs.splice(i, 1)[0]; } }),
};
stub("../src/models/ContactMessage", ContactMessage);
stub("../src/middleware/adminSession", (req, res, next) => next());
stub("../src/middleware/adminAuth", (req, res, next) => next());
const adminApi = require("../src/routes/adminApi");

const app = express();
app.use(express.json());
app.use("/admin/api", adminApi);
const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}/admin/api`;
  const send = async (method, path, body) => {
    const res = await fetch(base + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, json: await res.json() };
  };
  try {
    let r = await send("GET", "/contact-messages");
    assert.strictEqual(r.status, 200); assert.strictEqual(r.json.messages.length, 3);
    assert.deepStrictEqual(r.json.counts, { new: 1, read: 1, replied: 1 });
    assert.strictEqual(r.json.messages[0].phone, "09123456789", "شماره تماس برای ادمین نمایش داده می‌شود");

    r = await send("GET", "/contact-messages?status=new");
    assert.strictEqual(r.json.messages.length, 1); assert.strictEqual(r.json.messages[0].name, "علی رضایی");

    r = await send("GET", "/contact-messages/unread-count");
    assert.strictEqual(r.json.count, 1);

    r = await send("PATCH", `/contact-messages/${ids[0]}`, { status: "replied" });
    assert.strictEqual(r.status, 200); assert.strictEqual(r.json.message.status, "replied");
    assert.strictEqual((await send("GET", "/contact-messages/unread-count")).json.count, 0);

    assert.strictEqual((await send("PATCH", `/contact-messages/${ids[0]}`, { status: "bogus" })).status, 400);
    assert.strictEqual((await send("PATCH", "/contact-messages/not-an-id", { status: "read" })).status, 400);
    assert.strictEqual((await send("PATCH", `/contact-messages/${"d".repeat(24)}`, { status: "read" })).status, 404);

    assert.strictEqual((await send("DELETE", `/contact-messages/${ids[2]}`)).status, 200);
    assert.strictEqual((await send("DELETE", `/contact-messages/${ids[2]}`)).status, 404);
    assert.strictEqual((await send("GET", "/contact-messages")).json.messages.length, 2);
    console.log("contact admin tests passed");
  } catch (e) { console.error(e); process.exitCode = 1; } finally { server.close(); }
});
