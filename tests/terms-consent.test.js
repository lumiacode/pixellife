// پذیرش قوانین هنگام ثبت‌نام: بدون تیک نه پیامک می‌رود نه حساب ساخته می‌شود؛ با تیک، مدرک (زمان، IP، مرورگر، متن و اثر انگشت قوانین) ذخیره می‌شود.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const stub = (rel, exports) => { const p = require.resolve(rel); require.cache[p] = { id: p, filename: p, loaded: true, exports }; };

let users = [];
let sent = [];
let verified = [];
const User = {
  async create(data) { const user = { _id: "u" + (users.length + 1), isActive: true, ...data, async save() {}, hasPassword: () => false }; users.push(user); return user; },
  async deleteOne(filter) { users = users.filter((u) => u._id !== filter._id); },
  findOne(filter) { const found = users.find((u) => u.mobile === filter.mobile) || null; const q = Promise.resolve(found); q.select = () => q; return q; },
};
const acceptances = [];
const versions = [];
stub("../src/models/User", User);
stub("../src/models/OTP", {});
stub("../src/models/Address", { countDocuments: async () => 0, findOne: () => { const q = Promise.resolve(null); q.sort = () => q; return q; } });
stub("../src/models/TermsAcceptance", { create: async (data) => { acceptances.push(data); return data; } });
stub("../src/models/TermsVersion", { updateOne: async (filter, update) => { if (!versions.some((v) => v.hash === filter.hash)) versions.push(update.$setOnInsert); } });
stub("../src/services/tokenService", { generateToken: () => "token" });
stub("../src/services/otpService", {
  createAndSend: async (identifier, type) => { sent.push({ identifier, type }); },
  verify: async (identifier, code) => { if (code !== "12345") throw Object.assign(new Error("bad"), { statusCode: 400 }); verified.push(identifier); },
});

const controller = require("../src/controllers/authController");
const { CONSENT_TEXT, readSnapshot } = require("../src/config/terms");
const call = async (handler, body, extra = {}) => {
  const res = { cookie() {}, json(data) { this.data = data; return this; } };
  let error = null;
  const req = { body, ip: "203.0.113.7", get: (h) => (h.toLowerCase() === "user-agent" ? "TestBrowser/1.0" : ""), ...extra };
  await handler(req, res, (e) => { error = e; });
  return { error, data: res.data };
};

(async () => {
  const mobile = "09120000042";
  // ارسال کد ثبت‌نام بدون تیک / با مقدار غیر دقیقاً true: ۴۰۰ و پیامکی ارسال نمی‌شود
  for (const body of [{}, { termsAccepted: false }, { termsAccepted: "true" }, { termsAccepted: 1 }]) {
    const r = await call(controller.sendOtp, { identifier: mobile, type: "register", ...body });
    assert.strictEqual(r.error && r.error.statusCode, 400, JSON.stringify(body));
  }
  assert.strictEqual(sent.length, 0);
  let r = await call(controller.resendOtp, { identifier: mobile, type: "register" });
  assert.strictEqual(r.error.statusCode, 400);
  // با تیک: ارسال می‌شود
  r = await call(controller.sendOtp, { identifier: mobile, type: "register", termsAccepted: true });
  assert.ifError(r.error); assert.strictEqual(sent.length, 1);
  // ورود کاربر موجود به تیک نیاز ندارد (login)
  r = await call(controller.sendOtp, { identifier: mobile, type: "login" });
  assert.ifError(r.error);

  // ساخت حساب جدید بدون تیک رد می‌شود و کد مصرف نمی‌شود
  r = await call(controller.verifyLoginOtp, { identifier: mobile, code: "12345" });
  assert.strictEqual(r.error.statusCode, 400); assert.strictEqual(verified.length, 0); assert.strictEqual(users.length, 0); assert.strictEqual(acceptances.length, 0);

  // با تیک: حساب ساخته و مدرک ذخیره می‌شود
  r = await call(controller.verifyLoginOtp, { identifier: mobile, code: "12345", termsAccepted: true });
  assert.ifError(r.error); assert.strictEqual(users.length, 1);
  assert.strictEqual(acceptances.length, 1);
  const record = acceptances[0];
  const snapshot = readSnapshot();
  assert.strictEqual(record.mobile, mobile);
  assert.strictEqual(record.ip, "203.0.113.7");
  assert.strictEqual(record.userAgent, "TestBrowser/1.0");
  assert.strictEqual(record.termsHash, snapshot.hash); assert.match(record.termsHash, /^[a-f0-9]{64}$/);
  assert.strictEqual(record.consentText, CONSENT_TEXT);
  assert.ok(record.acceptedAt instanceof Date);
  assert.strictEqual(versions.length, 1); assert.strictEqual(versions[0].hash, snapshot.hash); assert.ok(versions[0].text.includes("لغو و مرجوعی"), "متن قوانین (مرجوعی) همراه مدرک ذخیره می‌شود");
  assert.ok(users[0].termsAcceptedAt instanceof Date);

  // کاربر موجود دوباره وارد شود: مدرک جدیدی ساخته نمی‌شود و به تیک نیازی نیست
  r = await call(controller.verifyLoginOtp, { identifier: mobile, code: "12345" });
  assert.ifError(r.error); assert.strictEqual(acceptances.length, 1);

  // اگر ذخیرهٔ مدرک شکست بخورد، حساب بدون مدرک نمی‌ماند
  users = []; acceptances.length = 0;
  const original = require.cache[require.resolve("../src/models/TermsAcceptance")].exports.create;
  require.cache[require.resolve("../src/models/TermsAcceptance")].exports.create = async () => { throw new Error("db down"); };
  r = await call(controller.verifyLoginOtp, { identifier: "09120000043", code: "12345", termsAccepted: true });
  assert.ok(r.error); assert.strictEqual(users.length, 0);
  require.cache[require.resolve("../src/models/TermsAcceptance")].exports.create = original;

  // متن کادر تیک در هر دو پنجرهٔ ورود دقیقاً همان متن ثبت‌شده در مدرک است
  for (const file of ["public/js/auth-modal.js", "public/auth-modal.js"]) {
    assert.ok(fs.readFileSync(path.join(__dirname, "..", file), "utf8").includes(CONSENT_TEXT), file + " باید متن تأیید را داشته باشد");
  }
  console.log("Terms consent test passed.");
})().catch((error) => { console.error(error); process.exit(1); });
