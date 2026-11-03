// دودِ راه‌اندازی: خود برنامه (src/app.js) باید بدون خطا بالا بیاید و مسیرهای اصلی جواب بدهند.
// (باگ واقعی: استفادهٔ adminSession بدون import باعث ReferenceError هنگام بالا آمدن و صفحهٔ ۵۰۲ شد؛ تست‌های واحد این را نمی‌دیدند.)
const assert = require("assert");
const { spawn } = require("child_process");
const path = require("path");

const port = 20000 + Math.floor(Math.random() * 20000);
const child = spawn(process.execPath, [path.join(__dirname, "..", "src", "app.js")], {
  env: { ...process.env, PORT: String(port), NODE_ENV: "test", JWT_SECRET: "test-secret", MONGO_URI: "mongodb://127.0.0.1:1/pixellife-smoke?serverSelectionTimeoutMS=500", SESSION_SECRET: "test-session-secret-123456" },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = ""; let exited = null;
child.stdout.on("data", (d) => { output += d; }); child.stderr.on("data", (d) => { output += d; });
child.on("exit", (code) => { exited = code; });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  let ok = false;
  for (let i = 0; i < 40 && exited === null; i += 1) {
    try { const res = await fetch(`http://127.0.0.1:${port}/robots.txt`); if (res.status === 200) { ok = true; break; } } catch (_) { /* هنوز بالا نیامده */ }
    await sleep(250);
  }
  assert.strictEqual(exited, null, "برنامه هنگام راه‌اندازی از کار افتاد:\n" + output.slice(-1500));
  assert.ok(ok, "برنامه روی پورت جواب نداد:\n" + output.slice(-1500));
  const robots = await (await fetch(`http://127.0.0.1:${port}/robots.txt`)).text();
  assert.ok(/Sitemap:/.test(robots));
  // مسیرهای ادمین بدون ورود بسته‌اند (و همین‌ها بدون import درست هنگام بالا آمدن خطا می‌دادند)
  const adminApi = await fetch(`http://127.0.0.1:${port}/admin/api/home-sections`);
  assert.strictEqual(adminApi.status, 401, "API ادمین بدون ورود باید ۴۰۱ بدهد");
  const login = await fetch(`http://127.0.0.1:${port}/admin/login`);
  assert.strictEqual(login.status, 200);
  console.log("App boot smoke test passed.");
})().catch((e) => { console.error(e.message || e); process.exitCode = 1; }).finally(() => { child.kill("SIGKILL"); setTimeout(() => process.exit(process.exitCode || 0), 100); });
