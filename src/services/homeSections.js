// «محصولات صفحهٔ اصلی»: برای هر بخش صفحهٔ اصلی (src/config/homeSections.js) ادمین فهرست مرتب‌شدهٔ محصولات را انتخاب می‌کند.
// ذخیره: Setting{key:"homeSections", value:{ [sectionKey]: [productId, ...] }} — به مدل محصول و فرم محصول ربطی ندارد.
const Setting = require("../models/Setting");
const Product = require("../models/Product");
const SECTIONS = require("../config/homeSections");
const { clearProductCaches } = require("./cacheBus");

const KEY = "homeSections";
const MAX_PER_SECTION = 12; // صفحهٔ اصلی در هر ردیف حداکثر همین تعداد نشان می‌دهد
const isObjectId = (value) => /^[a-f0-9]{24}$/i.test(String(value || ""));

async function readSelections() {
  const doc = await Setting.findOne({ key: KEY }).lean();
  const value = (doc && doc.value && typeof doc.value === "object") ? doc.value : {};
  const out = {};
  SECTIONS.forEach((section) => {
    const list = Array.isArray(value[section.key]) ? value[section.key] : [];
    out[section.key] = [...new Set(list.map(String).filter(isObjectId))];
  });
  return out;
}

// ذخیرهٔ یک بخش: فقط شناسهٔ معتبر و بدون تکرار؛ محصول حذف‌شده نادیده گرفته می‌شود؛ ترتیب همان ترتیب ارسالی است.
async function saveSection(sectionKey, productIds) {
  if (!SECTIONS.some((section) => section.key === sectionKey)) {
    const error = new Error("بخش نامعتبر است");
    error.statusCode = 404;
    throw error;
  }
  const requested = [...new Set((Array.isArray(productIds) ? productIds : []).map(String).filter(isObjectId))];
  if (requested.length > MAX_PER_SECTION) {
    const error = new Error(`حداکثر ${MAX_PER_SECTION} محصول برای هر بخش می‌توان انتخاب کرد`);
    error.statusCode = 400;
    throw error;
  }
  const existing = new Set((await Product.find({ _id: { $in: requested } }).select("_id").lean()).map((row) => String(row._id)));
  const ids = requested.filter((id) => existing.has(id));
  await Setting.updateOne({ key: KEY }, { $set: { [`value.${sectionKey}`]: ids } }, { upsert: true });
  clearProductCaches();
  return ids;
}

module.exports = { SECTIONS, MAX_PER_SECTION, readSelections, saveSection, isObjectId };
