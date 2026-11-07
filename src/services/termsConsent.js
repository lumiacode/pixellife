const ApiError = require("../utils/ApiError");
const { CONSENT_TEXT, readSnapshot } = require("../config/terms");

const MESSAGE = "برای ثبت‌نام باید قوانین و مقررات سایت را مطالعه و تأیید کنید";

// فقط مقدار دقیقاً true پذیرفته می‌شود ("true" متنی، ۱ و … معتبر نیستند).
function assertAccepted(body) {
  if (!body || body.termsAccepted !== true) throw new ApiError(400, MESSAGE);
}

// ثبت مدرک پذیرش برای کاربر تازه‌ساخته‌شده. اگر ذخیرهٔ مدرک شکست بخورد خطا به بالا می‌رود تا حساب بدون مدرک نماند.
async function record({ user, req }) {
  const TermsAcceptance = require("../models/TermsAcceptance");
  const TermsVersion = require("../models/TermsVersion");
  const snapshot = readSnapshot();
  await TermsVersion.updateOne(
    { hash: snapshot.hash },
    { $setOnInsert: { hash: snapshot.hash, version: snapshot.version, text: snapshot.text } },
    { upsert: true },
  );
  const acceptedAt = new Date();
  const doc = await TermsAcceptance.create({
    user: user._id,
    mobile: user.mobile || "",
    termsHash: snapshot.hash,
    termsVersion: snapshot.version,
    consentText: CONSENT_TEXT,
    acceptedAt,
    ip: String((req && req.ip) || "").slice(0, 64),
    userAgent: String((req && req.get && req.get("user-agent")) || "").slice(0, 400),
  });
  user.termsAcceptedAt = acceptedAt;
  user.termsVersion = snapshot.version;
  return doc;
}

module.exports = { assertAccepted, record, MESSAGE };
