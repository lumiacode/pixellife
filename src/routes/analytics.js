const express = require("express");
const crypto = require("crypto");
const AnalyticsDaily = require("../models/AnalyticsDaily");

const router = express.Router();

function dateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

// هر IP حداکثر ۱۲۰ ثبت بازدید در ۱۰ دقیقه (جلوگیری از پرکردن دیتابیس با صفحه‌های ساختگی)
const { rateLimit } = require("../middleware/security");
const trackLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 120 });

router.post("/track", trackLimiter, async (req, res) => {
  try {
    const requestedPage = typeof req.body?.page === "string" ? req.body.page : "/";
    const page = requestedPage.startsWith("/") ? requestedPage.split(/[?#]/)[0].replace(/[\u0000-\u001f]/g, "").slice(0, 180) || "/" : "/";
    const visitorId = req.cookies?.pl_visitor || crypto.randomBytes(16).toString("hex");
    const visitorHash = crypto.createHash("sha256").update(visitorId).digest("hex");

    if (!req.cookies?.pl_visitor) {
      res.cookie("pl_visitor", visitorId, {
        maxAge: 1000 * 60 * 60 * 24 * 30,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    await AnalyticsDaily.updateOne(
      { date: dateKey(), page },
      { $inc: { views: 1 }, $addToSet: { visitors: visitorHash } },
      { upsert: true },
    );

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("Client visit analytics error:", error);
    return res.status(500).json({ success: false });
  }
});


// رویدادهای رفتاری فقط با فهرست بسته‌ای از نوع رویداد و با نرخ محدود پذیرفته می‌شوند.
const { recordBehaviorEvent } = require("../services/behaviorAnalytics");
const ALLOWED_EVENTS = new Set([
  "page_view", "product_view", "product_click", "search", "filter_apply",
  "add_to_cart", "remove_from_cart", "add_to_wishlist", "remove_from_wishlist",
  "begin_checkout",
]);
const eventRateLimits = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, state] of eventRateLimits) if (now - state.startedAt > 10 * 60 * 1000) eventRateLimits.delete(key);
}, 10 * 60 * 1000).unref();

function canTrackEvent(req) {
  const key = req.ip || "unknown";
  const now = Date.now();
  const state = eventRateLimits.get(key);
  if (!state || now - state.startedAt > 10 * 60 * 1000) {
    eventRateLimits.set(key, { startedAt: now, count: 1 });
    return true;
  }
  state.count += 1;
  return state.count <= 120;
}

router.post("/events", async (req, res) => {
  try {
    const event = req.body && typeof req.body === "object" ? req.body : {};
    if (!ALLOWED_EVENTS.has(event.type) || !canTrackEvent(req)) {
      return res.status(400).json({ success: false });
    }
    await recordBehaviorEvent(req, res, event);
    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("Behavior analytics error:", error.message);
    return res.status(500).json({ success: false });
  }
});

module.exports = router;
