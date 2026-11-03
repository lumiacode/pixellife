// «محصولات صفحهٔ اصلی»: بخش‌های صفحهٔ اصلی و محصولاتِ هر بخش که ادمین انتخاب می‌کند.
// بخش‌ها = بخش‌های پیش‌فرض (src/config/homeSections.js) + بخش‌هایی که ادمین می‌سازد؛ نام همه قابل ویرایش و ترتیبشان قابل تغییر است.
// ذخیره (جدول Setting):
//   «homeSections»     : { [sectionKey]: [productId, ...] }                     ← محصولات هر بخش (به ترتیب نمایش)
//   «homeSectionsMeta» : { custom:[{key,title}], titles:{[key]:title}, order:[key] } ← بخش‌های ساخته‌شده، نام‌های ویرایش‌شده، ترتیب
// به مدل محصول و فرم محصول ربطی ندارد.
const crypto = require("crypto");
const Setting = require("../models/Setting");
const Product = require("../models/Product");
const DEFAULT_SECTIONS = require("../config/homeSections");
const { clearProductCaches } = require("./cacheBus");

const KEY = "homeSections";
const META_KEY = "homeSectionsMeta";
const MAX_PER_SECTION = 12; // صفحهٔ اصلی در هر ردیف حداکثر همین تعداد نشان می‌دهد
const MAX_SECTIONS = 20;
const TITLE_MIN = 2, TITLE_MAX = 40;
const isObjectId = (value) => /^[a-f0-9]{24}$/i.test(String(value || ""));
const isCustomKey = (value) => /^c[a-f0-9]{8}$/.test(String(value || ""));
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

function cleanTitle(value) {
  const title = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) throw fail(`نام بخش باید بین ${TITLE_MIN} تا ${TITLE_MAX} کاراکتر باشد`);
  return title;
}

async function readMeta() {
  const doc = await Setting.findOne({ key: META_KEY }).lean();
  const value = (doc && doc.value && typeof doc.value === "object") ? doc.value : {};
  const custom = (Array.isArray(value.custom) ? value.custom : []).filter((item) => item && isCustomKey(item.key) && typeof item.title === "string" && item.title.trim());
  const titles = (value.titles && typeof value.titles === "object") ? value.titles : {};
  const order = Array.isArray(value.order) ? value.order.map(String) : [];
  return { custom, titles, order };
}

// فهرست نهایی بخش‌ها به ترتیب نمایش: [{ key, title, builtin }]
async function getSections() {
  const meta = await readMeta();
  const all = [
    ...DEFAULT_SECTIONS.map((section) => ({ key: section.key, title: section.title, builtin: true })),
    ...meta.custom.map((section) => ({ key: section.key, title: section.title, builtin: false })),
  ].map((section) => ({ ...section, title: typeof meta.titles[section.key] === "string" && meta.titles[section.key].trim() ? meta.titles[section.key].trim() : section.title }));
  const position = (key) => { const i = meta.order.indexOf(key); return i === -1 ? Number.MAX_SAFE_INTEGER : i; };
  return all.map((section, index) => ({ section, index })).sort((a, b) => position(a.section.key) - position(b.section.key) || a.index - b.index).map((item) => item.section);
}

async function readSelections() {
  const sections = await getSections();
  const doc = await Setting.findOne({ key: KEY }).lean();
  const value = (doc && doc.value && typeof doc.value === "object") ? doc.value : {};
  const out = {};
  sections.forEach((section) => {
    const list = Array.isArray(value[section.key]) ? value[section.key] : [];
    out[section.key] = [...new Set(list.map(String).filter(isObjectId))];
  });
  return out;
}

async function requireSection(sectionKey) {
  const sections = await getSections();
  const found = sections.find((section) => section.key === sectionKey);
  if (!found) throw fail("بخش نامعتبر است", 404);
  return { sections, found };
}

// ذخیرهٔ محصولات یک بخش: فقط شناسهٔ معتبر و بدون تکرار؛ محصول حذف‌شده نادیده گرفته می‌شود؛ ترتیب همان ترتیب ارسالی است.
async function saveSection(sectionKey, productIds) {
  await requireSection(sectionKey);
  const requested = [...new Set((Array.isArray(productIds) ? productIds : []).map(String).filter(isObjectId))];
  if (requested.length > MAX_PER_SECTION) throw fail(`حداکثر ${MAX_PER_SECTION} محصول برای هر بخش می‌توان انتخاب کرد`);
  const existing = new Set((await Product.find({ _id: { $in: requested } }).select("_id").lean()).map((row) => String(row._id)));
  const ids = requested.filter((id) => existing.has(id));
  await Setting.updateOne({ key: KEY }, { $set: { [`value.${sectionKey}`]: ids } }, { upsert: true });
  clearProductCaches();
  return ids;
}

async function createSection(title) {
  const clean = cleanTitle(title);
  const sections = await getSections();
  if (sections.length >= MAX_SECTIONS) throw fail(`حداکثر ${MAX_SECTIONS} بخش می‌توان داشت`);
  if (sections.some((section) => section.title === clean)) throw fail("بخشی با این نام وجود دارد");
  const key = "c" + crypto.randomBytes(4).toString("hex");
  await Setting.updateOne({ key: META_KEY }, { $push: { "value.custom": { key, title: clean } } }, { upsert: true });
  clearProductCaches();
  return { key, title: clean, builtin: false };
}

async function renameSection(sectionKey, title) {
  const { sections } = await requireSection(sectionKey);
  const clean = cleanTitle(title);
  if (sections.some((section) => section.key !== sectionKey && section.title === clean)) throw fail("بخشی با این نام وجود دارد");
  await Setting.updateOne({ key: META_KEY }, { $set: { [`value.titles.${sectionKey}`]: clean } }, { upsert: true });
  clearProductCaches();
  return clean;
}

// حذف فقط برای بخش‌های ساخته‌شده؛ بخش‌های پیش‌فرض را می‌شود خالی کرد (محصولاتشان را برداشت) تا نمایش داده نشوند.
async function deleteSection(sectionKey) {
  const { found } = await requireSection(sectionKey);
  if (found.builtin) throw fail("بخش‌های پیش‌فرض حذف نمی‌شوند؛ محصولاتشان را بردارید تا در صفحهٔ اصلی نمایش داده نشوند", 400);
  await Setting.updateOne({ key: META_KEY }, { $pull: { "value.custom": { key: sectionKey }, "value.order": sectionKey }, $unset: { [`value.titles.${sectionKey}`]: "" } });
  await Setting.updateOne({ key: KEY }, { $unset: { [`value.${sectionKey}`]: "" } });
  clearProductCaches();
}

async function saveOrder(keys) {
  const sections = await getSections();
  const valid = new Set(sections.map((section) => section.key));
  const order = [...new Set((Array.isArray(keys) ? keys : []).map(String).filter((key) => valid.has(key)))];
  sections.forEach((section) => { if (!order.includes(section.key)) order.push(section.key); });
  await Setting.updateOne({ key: META_KEY }, { $set: { "value.order": order } }, { upsert: true });
  clearProductCaches();
  return order;
}

module.exports = { DEFAULT_SECTIONS, MAX_PER_SECTION, MAX_SECTIONS, getSections, readSelections, saveSection, createSection, renameSection, deleteSection, saveOrder, isObjectId };
