// الگوی زمانی بازدید: روز هفته (شنبه=۰)، ساعت، پیک‌ها و پرکردن روزهای بدون بازدید.
const assert = require("assert");
const { buildTraffic, weekdayIndex, buildPipelines } = require("../src/services/trafficPatterns");

// ۱۴۰۵-۰۸-۰۲ میلادی: 2026-10-24 شنبه است.
assert.strictEqual(weekdayIndex("2026-10-24"), 0, "شنبه");
assert.strictEqual(weekdayIndex("2026-10-25"), 1, "یکشنبه");
assert.strictEqual(weekdayIndex("2026-10-30"), 6, "جمعه");

const now = new Date("2026-10-24T09:00:00Z"); // 12:30 تهران
const rows = [
  { _id: { date: "2026-10-24", hour: 12 }, views: 10 },
  { _id: { date: "2026-10-24", hour: 21 }, views: 30 },
  { _id: { date: "2026-10-23", hour: 21 }, views: 20 }, // جمعه
  { _id: { date: "2026-10-01", hour: 3 }, views: 99 },  // بیرون از بازه
  { _id: { date: "2026-10-22", hour: 30 }, views: 5 },  // ساعت نامعتبر
];
const visitors = [{ _id: "2026-10-24", visitors: 17 }, { _id: "2026-10-23", visitors: 9 }];
const t = buildTraffic(rows, visitors, 7, now);

assert.strictEqual(t.days.length, 7);
assert.strictEqual(t.days[6].date, "2026-10-24");
assert.strictEqual(t.days[6].views, 40);
assert.strictEqual(t.days[6].visitors, 17);
assert.strictEqual(t.days[0].views, 0, "روز بدون بازدید صفر می‌ماند");
assert.strictEqual(t.totalViews, 60, "بیرون از بازه و ساعت نامعتبر شمرده نمی‌شود");
assert.strictEqual(t.hours[21], 50);
assert.strictEqual(t.heatmap[0][21], 30, "شنبه ساعت ۲۱");
assert.strictEqual(t.heatmap[6][21], 20, "جمعه ساعت ۲۱");
assert.strictEqual(t.peaks.hour.hour, 21);
assert.strictEqual(t.peaks.day.date, "2026-10-24");
assert.strictEqual(t.peaks.weekday.name, "شنبه");
assert.strictEqual(t.activeDays, 2);
assert.strictEqual(buildTraffic([], [], 7, now).peaks, null, "بدون داده پیک نداریم");

const p = buildPipelines(new Date());
assert.ok(JSON.stringify(p.hourly).includes("Asia/Tehran") && JSON.stringify(p.visitors).includes("Asia/Tehran"));
console.log("Traffic pattern tests passed.");
