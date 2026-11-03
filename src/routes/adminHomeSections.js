// مدیریت «محصولات صفحهٔ اصلی» در پنل ادمین: برای هر بخش، محصولات را انتخاب و مرتب می‌کند.
// زیر /admin/api/home-sections سوار می‌شود؛ احراز هویت ادمین در app.js اعمال می‌شود.
const express = require("express");
const Product = require("../models/Product");
const { SECTIONS, MAX_PER_SECTION, readSelections, saveSection } = require("../services/homeSections");

const router = express.Router();
router.use(express.json({ limit: "100kb" }));

const light = (p) => ({
  _id: String(p._id), name: p.name, brand: p.brand || "", category: p.category || "", slug: p.slug || "",
  image: p.mainImage || (Array.isArray(p.images) && p.images[0]) || "", price: p.price || 0, discount: p.discount || 0,
  stock: p.stock || 0, availability: p.availability || "in", comingSoon: p.comingSoon === true,
});
const FIELDS = "name brand category slug mainImage images price discount stock availability comingSoon";

// بخش‌ها + محصولات انتخاب‌شدهٔ هر بخش (به ترتیب نمایش)
router.get("/", async (req, res) => {
  try {
    const selections = await readSelections();
    const allIds = [...new Set(Object.values(selections).flat())];
    const rows = allIds.length ? await Product.find({ _id: { $in: allIds } }).select(FIELDS).lean() : [];
    const byId = new Map(rows.map((row) => [String(row._id), light(row)]));
    res.json({
      success: true,
      max: MAX_PER_SECTION,
      sections: SECTIONS.map((section) => ({ key: section.key, title: section.title, products: (selections[section.key] || []).map((id) => byId.get(id)).filter(Boolean) })),
    });
  } catch (error) { res.status(error.statusCode || 500).json({ success: false, message: error.message }); }
});

// فهرست سبک همهٔ محصولات برای انتخاب (جست‌وجو سمت صفحه انجام می‌شود)
router.get("/catalog", async (req, res) => {
  try {
    const rows = await Product.find().select(FIELDS).sort({ createdAt: -1 }).limit(1000).lean();
    res.json({ success: true, products: rows.map(light) });
  } catch (error) { res.status(error.statusCode || 500).json({ success: false, message: error.message }); }
});

// ذخیرهٔ یک بخش: { productIds: [...] }
router.put("/:key", async (req, res) => {
  try {
    const ids = await saveSection(String(req.params.key || ""), req.body && req.body.productIds);
    res.json({ success: true, productIds: ids });
  } catch (error) { res.status(error.statusCode || 500).json({ success: false, message: error.message }); }
});

module.exports = router;
