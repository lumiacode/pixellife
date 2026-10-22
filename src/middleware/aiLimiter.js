// محدودکنندهٔ مصرف دستیار هوشمند (حافظهٔ پردازه؛ با راه‌اندازی مجدد صفر می‌شود).
const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const hits = new Map(); // key -> timestamps

function envInt(name, fallback) {
  const n = parseInt(process.env[name], 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const LIMITS = {
  perMinute: () => envInt("AI_RATE_PER_MINUTE", 8),
  perDay: () => envInt("AI_RATE_PER_DAY", 60),
  globalPerDay: () => envInt("AI_GLOBAL_PER_DAY", 3000),
};

function count(key, windowMs, now) {
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  hits.set(key, list);
  return list.length;
}

function check(identity) {
  const now = Date.now();
  if (count("global", DAY, now) >= LIMITS.globalPerDay()) return "global";
  if (count(`m:${identity}`, MINUTE, now) >= LIMITS.perMinute()) return "minute";
  if (count(`d:${identity}`, DAY, now) >= LIMITS.perDay()) return "day";
  for (const key of [`m:${identity}`, `d:${identity}`, "global"]) hits.get(key).push(now);
  return null;
}

const MESSAGES = {
  minute: "پیام‌های شما خیلی سریع ارسال می‌شود؛ لطفاً چند لحظه صبر کنید.",
  day: "سقف پیام‌های امروز شما پر شده است. برای ادامه از صفحهٔ «تماس با ما» پیام بگذارید.",
  global: "دستیار هوشمند امروز شلوغ است. لطفاً از صفحهٔ «تماس با ما» پیام بگذارید.",
};

function aiLimiter(req, res, next) {
  const identity = req.user ? `u:${req.user._id}` : `ip:${req.ip}`;
  const blocked = check(identity);
  if (!blocked) return next();
  res.status(429).json({ success: false, limited: true, message: MESSAGES[blocked] });
}

setInterval(() => {
  const now = Date.now();
  for (const [key, list] of hits) if (!list.some((t) => now - t < DAY)) hits.delete(key);
}, 10 * MINUTE).unref();

module.exports = aiLimiter;
