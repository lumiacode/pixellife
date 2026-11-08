// scripts/backup.sh: با mongodump ساختگی در پوشهٔ موقت امتحان می‌شود (به دیتابیس و سرور واقعی دست نمی‌زند).
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync, execFileSync } = require("child_process");

const script = path.join(__dirname, "../scripts/backup.sh");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pl-backup-test-"));
const sub = (...p) => path.join(tmp, ...p);
fs.mkdirSync(sub("app/public/uploads"), { recursive: true });
fs.mkdirSync(sub("bin"));
fs.mkdirSync(sub("home"));
fs.writeFileSync(sub("app/.env"), 'PORT=3000\nMONGO_URI="mongodb://u:p@db.example.com/shop?x=1"\nJWT_SECRET=secret-value\n');
fs.writeFileSync(sub("app/ecosystem.config.js"), "module.exports={}\n");
fs.writeFileSync(sub("app/public/uploads/a.txt"), "uploaded-file");
fs.writeFileSync(sub("pass"), "test-passphrase-123\n");
// mongodump ساختگی: آرگومان‌ها را ثبت می‌کند و یک فایل آرشیو می‌سازد (یا اگر FAKE_DUMP_FAIL باشد خطا می‌دهد)
fs.writeFileSync(sub("bin/mongodump"), `#!/usr/bin/env bash
echo "$@" > "${sub("dump-args.txt")}"
[ -n "$FAKE_DUMP_FAIL" ] && exit 3
for a in "$@"; do case "$a" in --archive=*) echo "FAKE-DB-CONTENT" > "\${a#--archive=}";; esac; done
`, { mode: 0o755 });

const run = (extraEnv = {}, passFile = sub("pass")) => spawnSync("bash", [script], {
  env: { ...process.env, PATH: sub("bin") + ":" + process.env.PATH, HOME: sub("home"), APP_DIR: sub("app"), BACKUP_DIR: sub("backups"), BACKUP_PASSPHRASE_FILE: passFile, KEEP_DAYS: "14", ...extraEnv },
  encoding: "utf8",
});
const encFiles = () => (fs.existsSync(sub("backups")) ? fs.readdirSync(sub("backups")).filter((f) => f.endsWith(".tar.gz.enc")) : []);

try {
  // بدون فایل رمز: خطا و هیچ پشتیبانی ساخته نمی‌شود
  let r = run({}, sub("missing-pass"));
  assert.notStrictEqual(r.status, 0); assert.match(r.stderr, /رمز پشتیبان/); assert.strictEqual(encFiles().length, 0);

  // خطای mongodump: خطا، بدون خروجی ناقص و بدون پوشهٔ موقت باقی‌مانده
  r = run({ FAKE_DUMP_FAIL: "1" });
  assert.notStrictEqual(r.status, 0); assert.strictEqual(encFiles().length, 0);
  assert.deepStrictEqual(fs.readdirSync(sub("backups")).filter((f) => f.startsWith(".work-")), []);

  // پشتیبان‌های قدیمی: یکی قدیمی پشتیبان، یکی قدیمی نامربوط، یکی جدید
  fs.mkdirSync(sub("backups"), { recursive: true });
  const old = sub("backups/pixellife-2020-01-01_000000.tar.gz.enc"), unrelated = sub("backups/notes.txt");
  fs.writeFileSync(old, "x"); fs.writeFileSync(unrelated, "keep me");
  const longAgo = new Date(Date.now() - 40 * 86400000); fs.utimesSync(old, longAgo, longAgo); fs.utimesSync(unrelated, longAgo, longAgo);

  // اجرای موفق
  r = run();
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.ok(!fs.existsSync(old), "پشتیبان قدیمی‌تر از ۱۴ روز حذف می‌شود");
  assert.ok(fs.existsSync(unrelated), "فایل نامربوط حذف نمی‌شود");
  const files = encFiles(); assert.strictEqual(files.length, 1);
  assert.ok(fs.existsSync(sub("backups", files[0] + ".sha256")));
  assert.strictEqual(fs.statSync(sub("backups", files[0])).mode & 0o077, 0, "فایل پشتیبان فقط برای مالک خواندنی است");
  assert.match(fs.readFileSync(sub("dump-args.txt"), "utf8"), /--uri=mongodb:\/\/u:p@db\.example\.com\/shop\?x=1 /, "MONGO_URI بدون گیومه خوانده می‌شود");
  assert.ok(!fs.readFileSync(sub("backups", files[0])).toString("latin1").includes("secret-value"), "محتوا رمزنگاری‌شده است (JWT_SECRET دیده نمی‌شود)");

  // رمزگشایی با رمز درست: محتوای کامل برمی‌گردد
  const outDir = sub("restored"); fs.mkdirSync(outDir);
  const decrypted = execFileSync("openssl", ["enc", "-d", "-aes-256-cbc", "-pbkdf2", "-iter", "200000", "-pass", "file:" + sub("pass"), "-in", sub("backups", files[0])]);
  execFileSync("tar", ["-xzf", "-", "-C", outDir], { input: decrypted });
  const pkg = path.join(outDir, fs.readdirSync(outDir)[0]);
  assert.strictEqual(fs.readFileSync(path.join(pkg, "db.archive.gz"), "utf8").trim(), "FAKE-DB-CONTENT");
  assert.match(fs.readFileSync(path.join(pkg, "env"), "utf8"), /JWT_SECRET=secret-value/);
  assert.ok(fs.existsSync(path.join(pkg, "ecosystem.config.js")) && fs.existsSync(path.join(pkg, "uploads.tar.gz")) && fs.existsSync(path.join(pkg, "INFO.txt")));
  // رمز اشتباه، رمزگشایی نمی‌شود
  fs.writeFileSync(sub("badpass"), "wrong\n");
  const bad = spawnSync("openssl", ["enc", "-d", "-aes-256-cbc", "-pbkdf2", "-iter", "200000", "-pass", "file:" + sub("badpass"), "-in", sub("backups", files[0])]);
  assert.notStrictEqual(bad.status, 0);
  // پوشهٔ موقت باقی نمی‌ماند
  assert.deepStrictEqual(fs.readdirSync(sub("backups")).filter((f) => f.startsWith(".work-")), []);
  // مستندات
  assert.ok(fs.existsSync(path.join(__dirname, "../docs/BACKUP.md")));
  console.log("Backup script test passed.");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
