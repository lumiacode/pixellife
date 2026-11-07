// صفحهٔ چاپ‌پذیر «مدرک پذیرش قوانین» یک مشتری برای پنل ادمین (اگر مشتری اعتراض کند).
const User = require("../models/User");
const TermsAcceptance = require("../models/TermsAcceptance");
const TermsVersion = require("../models/TermsVersion");

const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fa = (date) => {
  try { return new Intl.DateTimeFormat("fa-IR", { dateStyle: "full", timeStyle: "medium", timeZone: "Asia/Tehran" }).format(new Date(date)); } catch (_) { return ""; }
};

async function render(userId) {
  if (!/^[a-f0-9]{24}$/i.test(String(userId))) return { status: 404, html: page("مشتری پیدا نشد", "<p>شناسهٔ مشتری معتبر نیست.</p>") };
  const user = await User.findById(userId).select("firstName lastName mobile email createdAt termsAcceptedAt termsVersion").lean();
  if (!user) return { status: 404, html: page("مشتری پیدا نشد", "<p>مشتری پیدا نشد.</p>") };
  const rows = await TermsAcceptance.find({ user: user._id }).sort({ acceptedAt: -1 }).lean();
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "—";
  const head = `<table class="kv"><tr><th>نام</th><td>${esc(name)}</td></tr><tr><th>موبایل</th><td dir="ltr">${esc(user.mobile || "—")}</td></tr><tr><th>تاریخ ساخت حساب</th><td>${esc(fa(user.createdAt))}</td></tr></table>`;
  if (!rows.length) {
    return { status: 200, html: page("مدرک پذیرش قوانین", `${head}<div class="warn">برای این مشتری مدرک پذیرش قوانین ثبت نشده است. (حساب‌هایی که قبل از فعال‌شدن این قابلیت ساخته شده‌اند مدرک تیک‌زدن ندارند.)</div>`) };
  }
  const hashes = [...new Set(rows.map((row) => row.termsHash))];
  const versions = await TermsVersion.find({ hash: { $in: hashes } }).lean();
  const byHash = new Map(versions.map((v) => [v.hash, v]));
  const body = rows.map((row) => {
    const snap = byHash.get(row.termsHash);
    return `<section class="rec"><h2>پذیرش در ${esc(fa(row.acceptedAt))}</h2>
<table class="kv">
<tr><th>زمان دقیق (UTC)</th><td dir="ltr">${esc(new Date(row.acceptedAt).toISOString())}</td></tr>
<tr><th>روش</th><td>${esc(row.method)} (تیک‌زدن کادر قوانین، سپس تأیید کد پیامکی‌شده به همین شماره)</td></tr>
<tr><th>آدرس IP</th><td dir="ltr">${esc(row.ip || "—")}</td></tr>
<tr><th>مرورگر/دستگاه</th><td dir="ltr">${esc(row.userAgent || "—")}</td></tr>
<tr><th>نسخهٔ قوانین</th><td>${esc(row.termsVersion || "—")}</td></tr>
<tr><th>اثر انگشت متن قوانین (SHA-256)</th><td dir="ltr" class="mono">${esc(row.termsHash)}</td></tr>
<tr><th>متن دقیق کادر تیک</th><td>${esc(row.consentText)}</td></tr>
</table>
<details><summary>متن کامل قوانین در همان زمان</summary><div class="terms">${snap ? snap.text : "<p>متن این نسخه ذخیره نشده است.</p>"}</div></details></section>`;
  }).join("");
  return { status: 200, html: page("مدرک پذیرش قوانین", head + body) };
}

function page(title, inner) {
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)} | پیکسل‌لایف</title><style>
body{font-family:Vazirmatn,Tahoma,sans-serif;background:#f6f8fc;color:#172033;line-height:2;margin:0;padding:24px}main{max-width:900px;margin:auto}h1{font-size:22px}h2{font-size:16px;margin:0 0 8px}
.kv{width:100%;border-collapse:collapse;background:#fff;margin-bottom:12px}.kv th,.kv td{border:1px solid #e2e8f0;padding:8px 12px;text-align:right;vertical-align:top}.kv th{width:230px;background:#f8fafc;font-weight:700}.mono{font-family:monospace;word-break:break-all;font-size:12px}
.rec{background:#fff;border:1px solid #cbd5e1;border-radius:12px;padding:16px;margin:16px 0}.warn{background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px;color:#9a3412}
.terms{border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-top:8px;max-height:520px;overflow:auto}.print{margin:0 0 16px}@media print{.print{display:none}body{background:#fff}.terms{max-height:none}}
</style></head><body><main><button class="print" onclick="window.print()">چاپ / ذخیره PDF</button><h1>${esc(title)}</h1>${inner}</main></body></html>`;
}

module.exports = { render };
