// بررسی رمز ورود ادمین: هش bcrypt (ADMIN_PASSWORD_HASH) یا، تا زمان انتقال، رمز ساده (ADMIN_PASSWORD) با مقایسهٔ زمان‌ثابت.
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

let warnedPlain = false;

const digest = (value) => crypto.createHash("sha256").update(String(value)).digest();

// خروجی: { configured: boolean, ok: boolean }
async function verifyAdminPassword(input) {
  const password = typeof input === "string" ? input : "";
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash) {
    let ok = false;
    try { ok = await bcrypt.compare(password, hash); } catch (_) { ok = false; }
    return { configured: true, ok };
  }
  const plain = process.env.ADMIN_PASSWORD;
  if (plain) {
    if (!warnedPlain) {
      warnedPlain = true;
      console.warn("⚠️ ورود ادمین با ADMIN_PASSWORD (رمز ساده) انجام می‌شود؛ با «node scripts/hash-admin-password.js» هش بسازید و ADMIN_PASSWORD_HASH را تنظیم کنید.");
    }
    // هش‌کردن هر دو طرف طول را یکسان می‌کند تا timingSafeEqual خطا ندهد و طول رمز لو نرود.
    return { configured: true, ok: crypto.timingSafeEqual(digest(password), digest(plain)) };
  }
  return { configured: false, ok: false };
}

module.exports = { verifyAdminPassword };
