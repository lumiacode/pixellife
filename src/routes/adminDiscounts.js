const express = require("express");
const router = express.Router();
const DiscountCode = require("../models/DiscountCode");
const { normalizeDiscountInput, discountState } = require("../services/discountAdmin");

// این router زیر adminApi سوار می‌شود و requireAdmin از آنجا اعمال می‌شود.
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const serialize = (doc) => {
  const item = doc.toObject ? doc.toObject() : doc;
  return { ...item, state: discountState(item) };
};
const fail = (res, error) => {
  if (error && error.code === 11000) return res.status(409).json({ success: false, message: "این کد تخفیف قبلاً ثبت شده است" });
  if (error && error.name === "CastError") return res.status(400).json({ success: false, message: "شناسه نامعتبر است" });
  return res.status(error.statusCode || 500).json({ success: false, message: error.message });
};

router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(10, Number.parseInt(req.query.limit, 10) || 20));
    const filter = {};
    const now = new Date();
    if (req.query.search) filter.code = { $regex: escapeRegex(String(req.query.search).trim().toUpperCase()) };
    if (req.query.status === "active") Object.assign(filter, { isActive: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] });
    if (req.query.status === "inactive") filter.isActive = false;
    if (req.query.status === "expired") filter.expiresAt = { $lte: now };
    const [total, items] = await Promise.all([
      DiscountCode.countDocuments(filter),
      DiscountCode.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    res.json({ success: true, discounts: items.map(serialize), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (error) { fail(res, error); }
});

router.post("/", async (req, res) => {
  try {
    const data = normalizeDiscountInput(req.body);
    const doc = await DiscountCode.create({ ...data, usedCount: 0 });
    res.status(201).json({ success: true, discount: serialize(doc) });
  } catch (error) { fail(res, error); }
});

router.put("/:id", async (req, res) => {
  try {
    const doc = await DiscountCode.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "کد تخفیف پیدا نشد" });
    Object.assign(doc, normalizeDiscountInput(req.body, doc));
    await doc.save();
    res.json({ success: true, discount: serialize(doc) });
  } catch (error) { fail(res, error); }
});

router.patch("/:id/status", async (req, res) => {
  try {
    if (typeof req.body.isActive !== "boolean") return res.status(400).json({ success: false, message: "وضعیت معتبر نیست" });
    const doc = await DiscountCode.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "کد تخفیف پیدا نشد" });
    doc.isActive = req.body.isActive;
    await doc.save();
    res.json({ success: true, discount: serialize(doc) });
  } catch (error) { fail(res, error); }
});

router.delete("/:id", async (req, res) => {
  try {
    const doc = await DiscountCode.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "کد تخفیف پیدا نشد" });
    if (doc.usedCount > 0) return res.status(409).json({ success: false, message: "این کد قبلاً استفاده شده؛ به‌جای حذف، غیرفعالش کنید" });
    await doc.deleteOne();
    res.json({ success: true });
  } catch (error) { fail(res, error); }
});

module.exports = router;
