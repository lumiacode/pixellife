// ممیزی کیف پول: مغایرت موجودی/دفتر/سفارش پیدا می‌شود و دادهٔ سالم هشدار نمی‌دهد.
const assert = require("assert");
const { auditWallet } = require("../src/services/walletAudit");

let n = 0;
const t = (type, amount, balanceAfter, extra = {}) => ({ _id: "t" + ++n, type, amount, balanceAfter, createdAt: new Date(2026, 10, 7, 14, n), ...extra });
const order = (id, total, extra = {}) => ({ _id: id, orderNumber: "PL-" + id, total, status: "processing", paymentMethod: "wallet", paymentStatus: "paid", walletRefunded: false, ...extra });
const codes = (issues) => issues.map((i) => i.code).sort();

// همان دادهٔ تصویر کاربر: ۱۰٬۰۰۰ + ۲۰۰٬۰۰۰ − ۱۰۹٬۰۰۰ = ۱۰۱٬۰۰۰ (بدون بازگشت وجه)
const txs = [t("topup", 10000, 10000), t("topup", 200000, 210000), t("purchase", -109000, 101000, { order: "o1" })];
assert.deepStrictEqual(auditWallet({ balance: 101000 }, txs, [order("o1", 109000)]), []);

// اگر موجودی واقعی ۲۱۰٬۰۰۰ باشد (۱۰۹٬۰۰۰ بدون ردیف دفتر برگشته): دقیقاً همین مغایرت گزارش می‌شود
let issues = auditWallet({ balance: 210000 }, txs, [order("o1", 109000)]);
assert.deepStrictEqual(codes(issues), ["balance-vs-last", "balance-vs-sum"]);
assert.strictEqual(issues.find((i) => i.code === "balance-vs-sum").diff, 109000);

// بازگشت وجه مجاز: سفارش لغو شده و یک ردیف بازگشت
const refundTxs = [...txs, t("refund", 109000, 210000, { order: "o1" })];
assert.deepStrictEqual(auditWallet({ balance: 210000 }, refundTxs, [order("o1", 109000, { status: "cancelled", walletRefunded: true })]), []);
// بازگشت وجه در حالی که سفارش فعال است (خطرناک)
assert.deepStrictEqual(codes(auditWallet({ balance: 210000 }, refundTxs, [order("o1", 109000, { status: "processing", walletRefunded: true })])), ["refund-while-active"]);
// دو بار بازگشت
const double = [...refundTxs, t("refund", 109000, 319000, { order: "o1" })];
assert.ok(codes(auditWallet({ balance: 319000 }, double, [order("o1", 109000, { status: "returned", walletRefunded: true })])).includes("double-refund"));
// لغو شده ولی مبلغ برنگشته
assert.deepStrictEqual(codes(auditWallet({ balance: 101000 }, txs, [order("o1", 109000, { status: "cancelled" })])), ["closed-without-refund"]);
// کسر ردیف ولی مبلغ سفارش فرق دارد
assert.ok(codes(auditWallet({ balance: 101000 }, txs, [order("o1", 100000)])).includes("purchase-amount"));
// رقابت: کسر و بلافاصله بازگشت برای سفارش پرداخت‌نشده (خالص صفر) سالم است؛ بدون بازگشت ناسالم
const raceOk = [t("topup", 200000, 200000), t("purchase", -50000, 150000, { order: "o2" }), t("refund", 50000, 200000, { order: "o2" })];
assert.deepStrictEqual(auditWallet({ balance: 200000 }, raceOk, [order("o2", 50000, { status: "cancelled", paymentStatus: "unpaid", paymentMethod: "online" })]), []);
assert.deepStrictEqual(codes(auditWallet({ balance: 150000 }, raceOk.slice(0, 2), [order("o2", 50000, { status: "cancelled", paymentStatus: "unpaid", paymentMethod: "online" })])), ["charged-unpaid-order"]);
// شکست زنجیره و موجودی بدون دفتر
assert.ok(codes(auditWallet({ balance: 300 }, [t("topup", 100, 100), t("topup", 200, 999)], [])).includes("chain-break"));
assert.deepStrictEqual(codes(auditWallet({ balance: 5000 }, [], [])), ["balance-vs-sum", "balance-without-ledger"]);
assert.deepStrictEqual(auditWallet(null, [], []), []);
// ثبت دفتر شکست‌خورده بی‌صدا نیست
const fs = require("fs");
assert.ok(fs.readFileSync(require("path").join(__dirname, "../src/services/wallet.js"), "utf8").includes("[wallet-ledger-missing]"));

// تغییر وضعیت به لغو/مرجوع در پنل ادمین (که بازگشت خودکار پول به کیف پول را می‌زند) بدون تأیید انجام نمی‌شود
const adminOrders = fs.readFileSync(require("path").join(__dirname, "../views/admin-orders.html"), "utf8");
assert.ok(adminOrders.includes("s.value==='cancelled'||s.value==='returned'") && adminOrders.includes("خودکار به کیف پول مشتری برمی‌گردد"));
// سفارشِ برگشت‌خورده به کیف پول دوباره تحویل/ارسال نمی‌شود (باگی که هم کالا هم پول را به مشتری می‌داد)
const wallet = require("../src/services/wallet");
const refunded = { walletRefunded: true, status: "cancelled" };
for (const status of ["processing", "shipped", "delivered", "awaiting_payment"]) assert.ok(wallet.statusChangeBlocker(refunded, status), status);
assert.strictEqual(wallet.statusChangeBlocker(refunded, "returned"), null);
assert.strictEqual(wallet.statusChangeBlocker(refunded, "cancelled"), null);
assert.strictEqual(wallet.statusChangeBlocker({ walletRefunded: false, status: "processing" }, "delivered"), null);
assert.strictEqual(wallet.statusChangeBlocker({ status: "cancelled" }, "delivered"), null, "سفارش آنلاین لغوشده (بدون بازگشت به کیف پول) محدود نمی‌شود");
assert.ok(fs.readFileSync(require("path").join(__dirname, "../src/routes/adminApi.js"), "utf8").includes("walletService.statusChangeBlocker(order, status)"));
console.log("Wallet audit test passed.");
