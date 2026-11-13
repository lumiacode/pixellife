#!/usr/bin/env node
// حذف پیام‌های «هویت تأییدنشده» صندوق تماس: پیام‌هایی که بدون حساب کاربری ثبت شده‌اند
// (پیش از الزام ورود؛ نام، شماره و ایمیل را خود فرستنده تایپ کرده بود).
// روی سرور، داخل پوشهٔ برنامه:
//   node scripts/delete-unverified-contacts.js            ← فقط شمارش و نمایش فهرست (چیزی حذف نمی‌شود)
//   node scripts/delete-unverified-contacts.js --confirm  ← حذف واقعی (برگشت‌ناپذیر)
// پیش از حذف واقعی بکاپ بگیرید: bash scripts/backup.sh
const mongoose = require("mongoose");
const env = require("../src/config/env");
const ContactMessage = require("../src/models/ContactMessage");

// پیام بدون فیلد user یا با user=null = هویت تأییدنشده
const FILTER = { user: null };

(async () => {
  await mongoose.connect(env.mongoUri);
  const confirm = process.argv.includes("--confirm");
  const total = await ContactMessage.countDocuments({});
  const rows = await ContactMessage.find(FILTER).sort({ createdAt: 1 }).select("name phone subject createdAt status").lean();
  console.log(`کل پیام‌ها: ${total} | هویت تأییدنشده: ${rows.length} | ثبت‌شده با حساب: ${total - rows.length}`);
  rows.slice(0, 50).forEach((m) => console.log(`  ${new Date(m.createdAt).toISOString().slice(0, 16)}  ${String(m.name).slice(0, 30).padEnd(30)} ${m.phone}  [${m.status}]  ${String(m.subject).slice(0, 40)}`));
  if (rows.length > 50) console.log(`  … و ${rows.length - 50} پیام دیگر`);
  if (!confirm) {
    console.log("\nچیزی حذف نشد. برای حذف واقعی همین دستور را با --confirm اجرا کنید (پیش از آن بکاپ بگیرید).");
  } else if (rows.length) {
    const result = await ContactMessage.deleteMany(FILTER);
    console.log(`\nحذف شد: ${result.deletedCount} پیام.`);
  } else {
    console.log("\nپیامی برای حذف نیست.");
  }
  await mongoose.disconnect();
})().catch((error) => { console.error("خطا:", error.message); process.exit(1); });
