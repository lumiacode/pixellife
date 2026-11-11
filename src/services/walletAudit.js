// ممیزی «فقط خواندنی» کیف پول: موجودی هر کاربر باید دقیقاً با دفتر تراکنش‌ها و وضعیت سفارش‌ها بخواند.
// هیچ‌چیز را تغییر نمی‌دهد؛ فقط مغایرت‌ها را گزارش می‌کند (اجرا: node scripts/check-wallets.js).

const same = (a, b) => String(a) === String(b);

// wallet: { user, balance }؛ txs: ردیف‌های دفتر همان کاربر؛ orders: سفارش‌های همان کاربر
function auditWallet(wallet, txs, orders) {
  const issues = [];
  const add = (code, message, extra = {}) => issues.push({ code, message, ...extra });
  const list = [...txs].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || 0);
  const balance = Number(wallet ? wallet.balance : 0);

  // ۱) موجودی نهایی با آخرین ردیف و با جمع همهٔ ردیف‌ها
  const sum = list.reduce((s, t) => s + Number(t.amount), 0);
  const last = list.length ? Number(list[list.length - 1].balanceAfter) : 0;
  if (balance !== sum) add("balance-vs-sum", `موجودی ${balance.toLocaleString("en-US")} با جمع دفتر (${sum.toLocaleString("en-US")}) نمی‌خواند؛ اختلاف ${(balance - sum).toLocaleString("en-US")} (مثبت = پولی بدون ردیف دفتر اضافه شده)`, { diff: balance - sum });
  if (list.length && balance !== last) add("balance-vs-last", `موجودی ${balance.toLocaleString("en-US")} با آخرین ردیف دفتر (${last.toLocaleString("en-US")}) نمی‌خواند`, { diff: balance - last });
  if (!list.length && balance !== 0) add("balance-without-ledger", `موجودی ${balance.toLocaleString("en-US")} است ولی هیچ ردیف دفتری وجود ندارد`);

  // ۲) زنجیرهٔ ردیف‌ها: هر ردیف باید از ردیف قبلی ادامه پیدا کند
  let running = 0;
  list.forEach((t, i) => {
    running += Number(t.amount);
    if (running !== Number(t.balanceAfter)) add("chain-break", `ردیف ${i + 1} (${t.type} ${t.amount}) موجودی بعد را ${t.balanceAfter} نوشته ولی باید ${running} باشد`, { tx: String(t._id || "") });
    running = Number(t.balanceAfter);
  });

  // ۳) سفارش‌های پرداخت‌شده با کیف پول
  for (const order of orders) {
    const mine = list.filter((t) => t.order && same(t.order, order._id));
    const purchases = mine.filter((t) => t.type === "purchase");
    const refunds = mine.filter((t) => t.type === "refund");
    const walletPaid = order.paymentMethod === "wallet" && order.paymentStatus === "paid";
    const closed = order.status === "cancelled" || order.status === "returned";
    const label = order.orderNumber || String(order._id);
    if (walletPaid) {
      if (purchases.length !== 1) add("purchase-count", `سفارش ${label}: ${purchases.length} ردیف «پرداخت» (باید دقیقاً ۱ باشد)`, { order: label });
      else if (Number(purchases[0].amount) !== -Math.round(Number(order.total))) add("purchase-amount", `سفارش ${label}: مبلغ کسرشده ${-purchases[0].amount} با مبلغ سفارش ${order.total} فرق دارد`, { order: label });
      if (refunds.length > 1) add("double-refund", `سفارش ${label}: ${refunds.length} بار مبلغ برگشته است`, { order: label });
      if (refunds.length && !closed) add("refund-while-active", `سفارش ${label}: مبلغ به کیف پول برگشته در حالی که وضعیت سفارش «${order.status}» است (نه لغو/مرجوع) — خطرناک`, { order: label });
      if (order.walletRefunded && !refunds.length) add("flag-without-row", `سفارش ${label}: علامت بازگشت وجه خورده ولی ردیفی در دفتر نیست`, { order: label });
    } else if (purchases.length && order.paymentStatus !== "paid") {
      // کسر انجام شده ولی سفارش پرداخت‌شده نیست: باید با یک ردیف «بازگشت» خنثی شده باشد
      const net = mine.reduce((s, t) => s + Number(t.amount), 0);
      if (net !== 0) add("charged-unpaid-order", `سفارش ${label}: مبلغ کسر شده ولی سفارش پرداخت‌نشده است و جبران نشده (خالص ${net})`, { order: label });
    }
  }
  return issues;
}

module.exports = { auditWallet };
