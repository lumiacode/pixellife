#!/usr/bin/env node
// بررسی فقط‌خواندنی: آیا یک آدرس یا موقعیت GPS یکسان بین چند کاربر مختلف ثبت شده است؟
// اجرا روی سرور:  node scripts/check-address-isolation.js
// هیچ‌چیز تغییر نمی‌کند و آدرس کامل چاپ نمی‌شود؛ شمارهٔ موبایل‌ها هم ماسک می‌شوند.
require("dotenv").config();
const mongoose = require("mongoose");
const Address = require("../src/models/Address");
const User = require("../src/models/User");

const mask = (m) => (m ? String(m).replace(/^(\d{4})\d{3}(\d{4})$/, "$1***$2") : "—");
const norm = (s) => String(s || "").replace(/[\s،,.\-]/g, "").toLowerCase();

(async () => {
  if (!process.env.MONGO_URI) { console.error("MONGO_URI تنظیم نشده است (فایل .env را بررسی کنید)"); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const [users, addresses] = await Promise.all([User.find({}).select("mobile createdAt role").lean(), Address.find({}).lean()]);
  const byId = new Map(users.map((u) => [String(u._id), u]));
  console.log(`کاربران: ${users.length} | آدرس‌ها: ${addresses.length}`);

  const orphan = addresses.filter((a) => !byId.has(String(a.user)));
  console.log(`آدرس بدون صاحب (کاربر حذف‌شده): ${orphan.length}`);

  function report(title, keyFn) {
    const groups = new Map();
    addresses.forEach((a) => { const k = keyFn(a); if (!k) return; (groups.get(k) || groups.set(k, []).get(k)).push(a); });
    const shared = [...groups.values()].filter((list) => new Set(list.map((a) => String(a.user))).size > 1);
    console.log(`\n${title}: ${shared.length} گروه مشترک بین چند کاربر`);
    shared.slice(0, 15).forEach((list, i) => {
      const owners = [...new Set(list.map((a) => String(a.user)))].map((id) => `${mask(byId.get(id)?.mobile)}${byId.get(id)?.role === "admin" ? "(ادمین)" : ""}`);
      console.log(`  ${i + 1}) ${list.length} آدرس، ${owners.length} کاربر: ${owners.join("، ")}`);
    });
    return shared.length;
  }
  const a = report("آدرس متنیِ یکسان (کدپستی + آدرس کامل)", (x) => (x.postalCode && x.fullAddress ? `${x.postalCode}|${norm(x.fullAddress)}` : ""));
  const b = report("موقعیت GPS یکسان (تا ۴ رقم اعشار ≈ ۱۱ متر)", (x) => (x.location && Number.isFinite(x.location.lat) ? `${x.location.lat.toFixed(4)},${x.location.lng.toFixed(4)}` : ""));

  console.log("\nنتیجه:");
  if (!a && !b) console.log("هیچ آدرس یا موقعیتی بین کاربران مشترک نیست؛ پس اطلاعات روی سرور جدا نگه‌داشته می‌شود و آنچه دیده می‌شود از خود دستگاه (تکمیل خودکار مرورگر یا GPS گوشی) است.");
  else console.log("موارد مشترک بالا را بررسی کنید؛ اگر صاحبانشان همه از یک شخص/دستگاه‌اند طبیعی است، وگرنه خبر بدهید.");
  await mongoose.disconnect();
})().catch((e) => { console.error("خطا:", e.message); process.exit(1); });
