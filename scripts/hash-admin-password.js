// ساخت هش bcrypt برای ADMIN_PASSWORD_HASH. رمز از ورودی خوانده می‌شود (نه از آرگومان تا در تاریخچهٔ شل نماند) و نمایش داده نمی‌شود.
//   node scripts/hash-admin-password.js
// خروجی را در .env سرور بگذارید: ADMIN_PASSWORD_HASH='<hash>'  (داخل کوتیشن تک، چون هش علامت $ دارد)
const readline = require("readline");
const bcrypt = require("bcryptjs");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
rl._writeToOutput = (text) => { if (text.includes("رمز")) process.stdout.write(text); };
rl.question("رمز جدید ادمین (حداقل ۱۰ کاراکتر): ", async (password) => {
  rl.close();
  process.stdout.write("\n");
  if (!password || password.length < 10) {
    console.error("رمز باید حداقل ۱۰ کاراکتر باشد.");
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  console.log("این خط را در .env سرور بگذارید (کوتیشن تک را نگه دارید):\n");
  console.log(`ADMIN_PASSWORD_HASH='${hash}'`);
});
