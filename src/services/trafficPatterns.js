// الگوی زمانی بازدید: بازدید هر روز، هر ساعت، هر روز هفته و نقشهٔ حرارتی (روز هفته × ساعت) به وقت تهران.
const TEHRAN = "Asia/Tehran";
const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

function tehranDateKey(date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TEHRAN, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const v = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return `${v.year}-${v.month}-${v.day}`;
}
// شنبه=۰ … جمعه=۶ برای یک تاریخ «YYYY-MM-DD» (مستقل از منطقهٔ زمانی سرور)
function weekdayIndex(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=یکشنبه
  return (js + 1) % 7;
}

// pipelineها: مرحلهٔ match و گروه‌بندی که در مسیر ادمین استفاده می‌شوند.
function buildPipelines(from) {
  const tz = { timezone: TEHRAN };
  return {
    hourly: [
      { $match: { createdAt: { $gte: from }, type: "page_view" } },
      { $group: { _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", ...tz } }, hour: { $hour: { date: "$createdAt", ...tz } } }, views: { $sum: 1 } } },
    ],
    visitors: [
      { $match: { createdAt: { $gte: from }, type: "page_view" } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", ...tz } }, visitors: { $addToSet: "$visitorHash" } } },
      { $project: { visitors: { $size: "$visitors" } } },
    ],
  };
}

function buildTraffic(hourlyRows, visitorRows, days, now = new Date()) {
  const keys = [];
  for (let i = days - 1; i >= 0; i -= 1) keys.push(tehranDateKey(new Date(now.getTime() - i * 86400000)));
  const dayMap = new Map(keys.map((date) => [date, { date, views: 0, visitors: 0 }]));
  const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
  const hours = Array(24).fill(0);
  const weekdays = Array(7).fill(0);

  hourlyRows.forEach((row) => {
    const { date, hour } = row._id || {};
    if (!dayMap.has(date) || !Number.isInteger(hour) || hour < 0 || hour > 23) return;
    const views = Number(row.views) || 0;
    const w = weekdayIndex(date);
    dayMap.get(date).views += views;
    heatmap[w][hour] += views;
    hours[hour] += views;
    weekdays[w] += views;
  });
  visitorRows.forEach((row) => { if (dayMap.has(row._id)) dayMap.get(row._id).visitors = Number(row.visitors) || 0; });

  const dayList = keys.map((k) => dayMap.get(k));
  const occurrences = Array(7).fill(0);
  keys.forEach((k) => { occurrences[weekdayIndex(k)] += 1; });
  const weekdayStats = weekdays.map((total, i) => ({ name: WEEKDAYS[i], total, average: occurrences[i] ? Math.round(total / occurrences[i]) : 0, days: occurrences[i] }));

  const totalViews = dayList.reduce((s, d) => s + d.views, 0);
  const argMax = (list, pick) => list.reduce((best, item, i) => (pick(item) > pick(list[best]) ? i : best), 0);
  const hasData = totalViews > 0;
  const bestHour = argMax(hours, (v) => v);
  const bestWeekday = argMax(weekdayStats, (w) => w.average);
  const bestDay = argMax(dayList, (d) => d.views);
  return {
    timezone: TEHRAN,
    totalViews,
    activeDays: dayList.filter((d) => d.views > 0).length,
    averagePerDay: Math.round(totalViews / Math.max(1, days)),
    days: dayList, hours, weekdays: weekdayStats, heatmap,
    peaks: hasData ? {
      hour: { hour: bestHour, views: hours[bestHour] },
      weekday: { name: weekdayStats[bestWeekday].name, average: weekdayStats[bestWeekday].average, total: weekdayStats[bestWeekday].total },
      day: { date: dayList[bestDay].date, views: dayList[bestDay].views },
    } : null,
  };
}

module.exports = { buildPipelines, buildTraffic, weekdayIndex, tehranDateKey, WEEKDAYS };
