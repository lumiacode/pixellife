// اسکریپت حذف پیام‌های هویت‌تأییدنشده: پیش‌فرض فقط شمارش می‌کند؛ فقط با --confirm و فقط پیام‌های بدون حساب را حذف می‌کند.
const assert = require("assert");
const path = require("path");
const Module = require("module");
process.env.MONGO_URI = "mongodb://127.0.0.1/none"; process.env.JWT_SECRET = "x";
const rows = [
  { _id: 1, name: "sasan hedayat", phone: "09160000000", subject: "x", createdAt: new Date(), status: "new" },
  { _id: 2, name: "علی", phone: "09120000000", subject: "y", createdAt: new Date(), status: "read", user: "u1" },
  { _id: 3, name: "ناشناس", phone: "09130000000", subject: "z", createdAt: new Date(), status: "new", user: null },
];
const matches = (m, f) => ("user" in f ? (f.user === null ? m.user == null : m.user === f.user) : true);
const fake = {
  countDocuments: async () => rows.length,
  find: (f) => ({ sort: () => ({ select: () => ({ lean: async () => rows.filter((m) => matches(m, f)) }) }) }),
  deleteMany: async (f) => { const keep = rows.filter((m) => !matches(m, f)); const deleted = rows.length - keep.length; rows.splice(0, rows.length, ...keep); return { deletedCount: deleted }; },
};
const stubPath = require.resolve("../src/models/ContactMessage");
require.cache[stubPath] = { id: stubPath, filename: stubPath, loaded: true, exports: fake };
const mongoose = require("mongoose");
mongoose.connect = async () => {}; mongoose.disconnect = async () => {};
const script = path.join(__dirname, "..", "scripts", "delete-unverified-contacts.js");
const run = async (args) => {
  const logs = [];
  const origLog = console.log; console.log = (...a) => logs.push(a.join(" "));
  const origArgv = process.argv; process.argv = ["node", script, ...args];
  delete require.cache[script];
  const exit = process.exit; process.exit = () => {};
  require(script);
  await new Promise((r) => setTimeout(r, 50));
  console.log = origLog; process.argv = origArgv; process.exit = exit;
  return logs.join("\n");
};
(async () => {
  let out = await run([]);
  assert.ok(/هویت تأییدنشده: 2/.test(out) && /چیزی حذف نشد/.test(out)); assert.strictEqual(rows.length, 3, "بدون --confirm حذف نمی‌شود");
  out = await run(["--confirm"]);
  assert.ok(/حذف شد: 2 پیام/.test(out)); assert.deepStrictEqual(rows.map((m) => m._id), [2], "فقط پیام ثبت‌شده با حساب می‌ماند");
  console.log("Purge unverified contacts test passed.");
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
