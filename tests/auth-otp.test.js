// جریان OTP: ساخت کاربر فقط بعد از تأیید کد، محدودیت تلاش اشتباه و محدودیت ارسال (با مدل‌های ساختگی).
const assert = require("assert");
const stub = (rel, exports) => { const p = require.resolve(rel); require.cache[p] = { id: p, filename: p, loaded: true, exports }; };

const match = (doc, filter) => Object.entries(filter).every(([key, cond]) => {
  const value = doc[key];
  if (cond && typeof cond === "object" && !(cond instanceof Date)) {
    return Object.entries(cond).every(([op, arg]) => (op === "$gt" ? value > arg : op === "$gte" ? value >= arg : op === "$lt" ? value < arg : false));
  }
  return value === cond;
});
let otps = [];
const OTP = {
  async findOne(filter) { return otps.find((doc) => match(doc, filter)) || null; },
  async create(data) { const doc = { attempts: 0, isUsed: false, createdAt: new Date(), ...data }; otps.push(doc); return doc; },
  async deleteMany(filter) { otps = otps.filter((doc) => !match(doc, filter)); },
  async exists(filter) { return otps.some((doc) => match(doc, filter)) || null; },
  async updateMany(filter, update) { otps.filter((doc) => match(doc, filter)).forEach((doc) => Object.assign(doc, update.$set)); },
  async updateOne(filter, update) { const doc = otps.find((d) => match(d, filter)); if (doc) Object.assign(doc, update.$set); },
  async findOneAndUpdate(filter, update, options = {}) {
    const found = otps.filter((doc) => match(doc, filter)).sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!found) return null;
    if (update.$inc) for (const [k, v] of Object.entries(update.$inc)) found[k] += v;
    if (update.$set) Object.assign(found, update.$set);
    return found;
  },
};
let users = [];
const User = {
  async create(data) { const user = { _id: "u" + (users.length + 1), isActive: true, firstName: "", lastName: "", ...data, async save() {}, hasPassword: () => false }; users.push(user); return user; },
  findOne(filter) { const found = users.find((u) => u.mobile === filter.mobile) || null; const q = Promise.resolve(found); q.select = () => q; return q; },
};
stub("../src/models/OTP", OTP);
stub("../src/models/User", User);
stub("../src/services/smsService", { sendOTP: async () => {} });
stub("../src/services/tokenService", { generateToken: () => "token" });
stub("../src/config/env", { otpLength: 5, otpExpiryMinutes: 2 });

const controller = require("../src/controllers/authController");
const call = async (handler, body) => {
  const res = { cookie() {}, json(data) { this.data = data; return this; } };
  let error = null;
  await handler({ body }, res, (e) => { error = e; });
  return { error, data: res.data };
};
const age = () => otps.forEach((doc) => { doc.createdAt = new Date(Date.now() - 120000); });

(async () => {
  const mobile = "09120000001";
  // ارسال کد برای شمارهٔ جدید، کاربر نمی‌سازد
  let r = await call(controller.sendOtp, { identifier: mobile, type: "register" });
  assert.ifError(r.error); assert.strictEqual(users.length, 0);
  // ارسال مجدد برای کاربر هنوز ساخته‌نشده خطای ۴۰۴ نمی‌دهد
  age();
  r = await call(controller.resendOtp, { identifier: mobile, type: "register" });
  assert.ifError(r.error);
  const code = otps.find((doc) => doc.identifier === mobile && !doc.isUsed).code;
  const wrong = code === "11111" ? "22222" : "11111";
  // چهار تلاش اشتباه ۴۰۰، تلاش پنجم ۴۲۹ و کد باطل می‌شود؛ حتی کد درست بعدش رد می‌شود
  for (let i = 0; i < 4; i++) { r = await call(controller.verifyLoginOtp, { identifier: mobile, code: wrong }); assert.strictEqual(r.error.statusCode, 400); }
  r = await call(controller.verifyLoginOtp, { identifier: mobile, code: wrong }); assert.strictEqual(r.error.statusCode, 429);
  r = await call(controller.verifyLoginOtp, { identifier: mobile, code }); assert.ok(r.error); assert.strictEqual(users.length, 0);
  // کد تازه + کد درست: کاربر ساخته و تأیید می‌شود
  age();
  await call(controller.sendOtp, { identifier: mobile, type: "register" });
  const fresh = otps.find((doc) => doc.identifier === mobile && !doc.isUsed).code;
  r = await call(controller.verifyLoginOtp, { identifier: mobile, code: fresh });
  assert.ifError(r.error); assert.strictEqual(users.length, 1); assert.strictEqual(r.data.needsProfile, true); assert.strictEqual(users[0].isVerified, true);
  // مصرف‌شدن: همان کد دوباره کار نمی‌کند
  r = await call(controller.verifyLoginOtp, { identifier: mobile, code: fresh }); assert.ok(r.error);
  // حساب غیرفعال با کد درست وارد نمی‌شود
  const blocked = "09120000009";
  await User.create({ mobile: blocked }); users[users.length - 1].isActive = false;
  await call(controller.sendOtp, { identifier: blocked, type: "login" });
  r = await call(controller.verifyLoginOtp, { identifier: blocked, code: otps.find((d) => !d.isUsed && d.identifier === blocked).code });
  assert.strictEqual(r.error.statusCode, 403);
  // سقف ارسال: چهارمین کد در یک ساعت رد می‌شود
  const other = "09120000002"; let last;
  for (let i = 0; i < 4; i++) { age(); last = await call(controller.sendOtp, { identifier: other, type: "register" }); }
  assert.strictEqual(last.error.statusCode, 429);
  // نوع forgot از مسیر ورود پذیرفته نمی‌شود
  r = await call(controller.sendOtp, { identifier: "09120000003", type: "forgot" }); assert.strictEqual(r.error.statusCode, 400);
  console.log("auth otp tests passed");
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
