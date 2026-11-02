// قفل رفتار ثبت موقعیت: قواعد (location-policy.js) و اتصال آن‌ها به صفحه‌ها (location-picker.js).
// تغییر ظاهر یا صفحه‌ها نباید رفتار GPS گوشی را خراب کند.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const policy = require(path.join(root, "public", "js", "location-policy.js"));
const read = (...p) => fs.readFileSync(path.join(root, ...p), "utf8");

const fix = (accuracy, extra = {}) => ({ coords: { latitude: 35.7000004, longitude: 51.4000004, accuracy }, ...extra });

// ۱) هیچ نقطه‌ای به‌خاطر زمانش رد نمی‌شود (باگ «GPS روشن است ولی ثبت نمی‌شود»)
{
  const c = policy.createFixCollector();
  const hourAgo = Date.now() - 3600 * 1000;
  assert.strictEqual(c.add(fix(40, { timestamp: hourAgo })), true, "نقطهٔ دقیق با زمان قدیمی باید پذیرفته شود");
  const r = c.result();
  assert.strictEqual(r.status, "ok");
  assert.deepStrictEqual(r.fix, { lat: 35.7, lng: 51.4, accuracy: 40 });
}
// بدون timestamp هم کار می‌کند
assert.strictEqual(policy.createFixCollector().add(fix(30)), true);

// ۲) دقیق‌ترین نقطه نگه داشته می‌شود؛ تا دقت خوب نشده تمام نمی‌شود
{
  const c = policy.createFixCollector();
  assert.strictEqual(c.add(fix(400)), false);
  assert.strictEqual(c.add(fix(120)), false);
  assert.strictEqual(c.add(fix(300)), false, "نقطهٔ بدتر جای بهتر را نمی‌گیرد");
  const r = c.result();
  assert.strictEqual(r.status, "ok");
  assert.strictEqual(r.fix.accuracy, 120);
  assert.strictEqual(c.add(fix(policy.GOOD_ACCURACY_M)), true);
}

// ۳) دقت بدتر از ۱٫۵ کیلومتر (IP/VPN) ثبت نمی‌شود؛ بدون نقطه = timeout
assert.strictEqual(policy.MAX_ACCURACY_M, 1500);
{
  const c = policy.createFixCollector();
  c.add(fix(policy.MAX_ACCURACY_M + 1));
  assert.strictEqual(c.result().status, "approx");
  const edge = policy.createFixCollector();
  edge.add(fix(policy.MAX_ACCURACY_M));
  assert.strictEqual(edge.result().status, "ok");
  assert.strictEqual(policy.createFixCollector().result().status, "timeout");
  const bad = policy.createFixCollector();
  assert.strictEqual(bad.add(null), false);
  assert.strictEqual(bad.result().status, "timeout");
}

// ۴) تنظیمات مرورگر: بدون کش، مهلت کافی برای استارت سرد GPS
assert.strictEqual(policy.GEO_OPTIONS.maximumAge, 0);
assert.strictEqual(policy.GEO_OPTIONS.enableHighAccuracy, true);
assert.ok(policy.WAIT_MS >= 15000, "حداقل ۱۵ ثانیه انتظار برای GPS");
assert.ok(policy.GEO_OPTIONS.timeout > policy.WAIT_MS, "تایمر مرورگر نباید قبل از مهلت ما خطا بدهد");

// ۵) تشخیص کامپیوتر/گوشی
const android = "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Chrome/125 Mobile Safari/537.36";
const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const windows = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36";
assert.strictEqual(policy.isDesktopEnvironment({ userAgent: android }), false);
assert.strictEqual(policy.isDesktopEnvironment({ userAgent: iphone }), false);
assert.strictEqual(policy.isDesktopEnvironment({ userAgent: windows }), true);
assert.strictEqual(policy.isDesktopEnvironment({ userAgent: android, userAgentData: { mobile: true } }), false);
assert.strictEqual(policy.isDesktopEnvironment({ userAgent: android, userAgentData: { mobile: false } }), false, "UA اندروید همیشه گوشی است");
assert.strictEqual(policy.isDesktopEnvironment({ userAgent: windows, userAgentData: { mobile: false } }), true);
assert.strictEqual(policy.isDesktopEnvironment({}), true);

// ۶) نگاشت خطا
assert.strictEqual(policy.errorKind({ code: 3 }), "timeout");
assert.strictEqual(policy.errorKind({ code: 1 }), "off");
assert.strictEqual(policy.errorKind({ code: 2 }), "off");
assert.strictEqual(policy.errorKind(undefined), "off");

// ۷) اتصال: ظاهر (picker) نباید دوباره قواعد را خودش بنویسد یا بر اساس زمان نقطه فیلتر کند
const picker = read("public", "js", "location-picker.js");
assert.ok(!/\.timestamp/.test(picker), "location-picker.js نباید بر اساس position.timestamp فیلتر کند (قاعدهٔ ۱)");
assert.ok(/PLLocationPolicy/.test(picker) && /createFixCollector/.test(picker) && /GEO_OPTIONS/.test(picker), "picker باید از policy استفاده کند");
assert.ok(!/maxAccuracy|enableHighAccuracy/.test(picker), "ثابت‌های دقت/گزینه‌ها فقط در location-policy.js");

// ۸) هر صفحه‌ای که picker دارد، policy را قبل از آن بارگذاری می‌کند
const pagesUsingPicker = fs.readdirSync(path.join(root, "views")).filter((f) => f.endsWith(".html") && /location-picker\.js/.test(read("views", f)));
assert.ok(pagesUsingPicker.length >= 2, "پروفایل و پرداخت باید picker داشته باشند");
pagesUsingPicker.forEach((file) => {
  const html = read("views", file);
  const policyAt = html.indexOf("/js/location-policy.js");
  const pickerAt = html.indexOf("/js/location-picker.js");
  assert.ok(policyAt !== -1 && policyAt < pickerAt, `${file}: location-policy.js باید قبل از location-picker.js بیاید`);
});

console.log("Location picker tests passed.");
