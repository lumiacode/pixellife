// پیامک کد تأیید: خط آخر باید «@دامنه #کد» باشد (WebOTP)؛ حالت send از خط ارسال استفاده کند و حالت پیش‌فرض همان قالب پنل بماند.
const assert = require("assert");
const path = require("path");
process.env.JWT_SECRET = "s"; process.env.MONGO_URI = "mongodb://x"; process.env.KAVEH_NEGAR_API_KEY = "k"; process.env.KAVEH_NEGAR_OTP_TEMPLATE = "tpl";
process.env.SITE_URL = "https://www.pixellife.ir/";
const calls = [];
const kPath = require.resolve("kavenegar");
require.cache[kPath] = { id: kPath, filename: kPath, loaded: true, exports: { KavenegarApi: () => ({
  Send: (o, cb) => { calls.push(["Send", o]); cb({}, 200); },
  VerifyLookup: (o, cb) => { calls.push(["VerifyLookup", o]); cb({}, 200); },
}) } };
const smsService = require(path.join(__dirname, "..", "src", "services", "smsService.js"));
const env = require(path.join(__dirname, "..", "src", "config", "env.js"));

(async () => {
  const msg = smsService.buildOtpMessage("12345", "https://www.pixellife.ir/");
  const lines = msg.split("\n");
  assert.strictEqual(lines[lines.length - 1], "@pixellife.ir #12345", "خط آخر باید دقیقاً @دامنه #کد باشد (بدون www)");
  assert.ok(msg.includes("12345") && /پیکسل لایف/.test(lines[0]));
  assert.strictEqual(smsService.buildOtpMessage("99999", "not a url").split("\n").pop(), "@pixellife.ir #99999", "آدرس نامعتبر → دامنهٔ پیش‌فرض");

  env.kavehNegarOtpMode = "template";
  await smsService.sendOTP("09120000000", "12345");
  assert.strictEqual(calls[0][0], "VerifyLookup", "حالت پیش‌فرض: همان قالب پنل");
  assert.strictEqual(calls[0][1].template, "tpl");

  env.kavehNegarOtpMode = "send"; env.kavehNegarSender = "2000660110";
  await smsService.sendOTP("09120000000", "54321");
  assert.strictEqual(calls[1][0], "Send");
  assert.strictEqual(calls[1][1].sender, "2000660110");
  assert.ok(calls[1][1].message.endsWith("@pixellife.ir #54321"));
  console.log("SMS OTP message tests passed.");
})().catch((e) => { console.error(e); process.exit(1); });
