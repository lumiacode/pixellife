// قوانین و مقررات سایت (views/terms.html) و متن دقیق کادر تأییدِ ثبت‌نام.
// اثر انگشت (SHA-256) متن قوانین در لحظهٔ تأیید ذخیره می‌شود؛ اگر بعداً قوانین عوض شود،
// متن همان زمان هم در پایگاه داده می‌ماند (مدل TermsVersion).
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const TERMS_FILE = path.join(__dirname, "../../views/terms.html");

// همین متن در public/js/auth-modal.js کنار کادر تیک نمایش داده می‌شود (تست tests/terms-consent.test.js یکسان‌بودنشان را بررسی می‌کند).
const CONSENT_TEXT = "قوانین و مقررات پیکسل‌لایف (شامل شرایط ارسال، لغو و مرجوعی، گارانتی و حریم خصوصی) را خوانده‌ام و می‌پذیرم.";

let cache = { mtimeMs: 0, snapshot: null };

function readSnapshot() {
  const stat = fs.statSync(TERMS_FILE);
  if (cache.snapshot && cache.mtimeMs === stat.mtimeMs) return cache.snapshot;
  const html = fs.readFileSync(TERMS_FILE, "utf8");
  const main = (html.match(/<main[\s\S]*?<\/main>/i) || [html])[0];
  const text = main.replace(/\r\n/g, "\n").trim();
  const hash = crypto.createHash("sha256").update(text, "utf8").digest("hex");
  const updated = (text.match(/آخرین به‌روزرسانی:\s*([^<]+)/) || [])[1];
  cache = { mtimeMs: stat.mtimeMs, snapshot: { hash, text, version: (updated || "").trim() || hash.slice(0, 12) } };
  return cache.snapshot;
}

module.exports = { CONSENT_TEXT, readSnapshot };
