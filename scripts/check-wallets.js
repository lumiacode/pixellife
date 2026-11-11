#!/usr/bin/env node
// ممیزی فقط‌خواندنی کیف پول‌ها. روی سرور، داخل پوشهٔ برنامه:
//   node scripts/check-wallets.js                 (همهٔ کاربران؛ فقط مغایرت‌ها)
//   node scripts/check-wallets.js 09123456789     (یک کاربر: دفتر کامل + سفارش‌هایش + مغایرت‌ها)
// هیچ دادهای نوشته یا تغییر داده نمی‌شود.
const mongoose = require("mongoose");
const env = require("../src/config/env");
const Wallet = require("../src/models/Wallet");
const WalletTransaction = require("../src/models/WalletTransaction");
const Order = require("../src/models/Order");
const User = require("../src/models/User");
const { auditWallet } = require("../src/services/walletAudit");

const fmt = (n) => Number(n).toLocaleString("en-US");
const when = (d) => new Date(d).toISOString().replace("T", " ").slice(0, 19) + "Z";

(async () => {
  await mongoose.connect(env.mongoUri);
  const mobile = process.argv[2];
  let userFilter = {};
  if (mobile) {
    const user = await User.findOne({ mobile }).select("_id mobile firstName lastName").lean();
    if (!user) { console.log("کاربری با این شماره پیدا نشد"); process.exit(1); }
    userFilter = { user: user._id };
  }
  const wallets = await Wallet.find(userFilter).lean();
  const userIds = new Set(wallets.map((w) => String(w.user)));
  // کاربری که ردیف دفتر دارد ولی کیف پولش ثبت نشده هم دیده شود
  const txUsers = await WalletTransaction.distinct("user", userFilter);
  txUsers.forEach((id) => userIds.add(String(id)));

  let bad = 0;
  for (const id of userIds) {
    const wallet = wallets.find((w) => String(w.user) === id) || { user: id, balance: 0 };
    const txs = await WalletTransaction.find({ user: id }).sort({ createdAt: 1 }).lean();
    const orders = await Order.find({ user: id }).select("orderNumber total status paymentMethod paymentStatus walletRefunded statusHistory createdAt").lean();
    const issues = auditWallet(wallet, txs, orders);
    if (mobile) {
      console.log(`\nموجودی فعلی: ${fmt(wallet.balance)} تومان`);
      console.log("\n— دفتر تراکنش‌ها (قدیمی به جدید) —");
      txs.forEach((t) => console.log(`${when(t.createdAt)}  ${String(t.type).padEnd(8)} ${String(t.amount > 0 ? "+" + fmt(t.amount) : fmt(t.amount)).padStart(12)}  موجودی بعد: ${fmt(t.balanceAfter).padStart(10)}  ${t.ref || ""}  ${t.note || ""}`));
      console.log("\n— سفارش‌ها —");
      orders.forEach((o) => {
        console.log(`${o.orderNumber}  مبلغ ${fmt(o.total)}  وضعیت ${o.status}  پرداخت ${o.paymentStatus}/${o.paymentMethod}  walletRefunded=${Boolean(o.walletRefunded)}`);
        (o.statusHistory || []).forEach((h) => console.log(`     ${when(h.changedAt || o.createdAt)}  ${h.status}  ${h.note || ""}`));
      });
    }
    if (issues.length) {
      bad += 1;
      console.log(`\n⚠️ کاربر ${id}:`);
      issues.forEach((i) => console.log(`   - [${i.code}] ${i.message}`));
    }
  }
  console.log(`\nبررسی شد: ${userIds.size} کیف پول؛ ${bad} مورد دارای مغایرت.${bad ? "" : " همه با دفتر و سفارش‌ها می‌خوانند ✅"}`);
  await mongoose.disconnect();
})().catch((error) => { console.error("خطا:", error.message); process.exit(1); });
