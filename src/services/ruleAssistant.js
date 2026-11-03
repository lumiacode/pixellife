// دستیار قاعده‌محور (بدون هوش مصنوعی): تشخیص نیت پیام، پاسخ سؤال‌های پشتیبانی از داده‌های واقعی سایت،
// و جستجوی ساختارمند محصول (برند، دسته، بودجه، حافظه، رنگ، مرتب‌سازی).
// فقط از چیزهایی پاسخ می‌دهد که در کد/دیتابیس موجود است؛ برای بقیه به پشتیبان انسانی ارجاع می‌دهد.
// وابستگی‌ها (دیتابیس، سفارش، تنظیمات) از بیرون تزریق می‌شوند تا بدون اتصال به دیتابیس تست شود.

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const fa = (n) => Number(n).toLocaleString("fa-IR");

// نرمال‌سازی متن فارسی: ارقام، «ی/ک»، نیم‌فاصله، اعراب و نشانه‌ها
function normalize(text) {
  return String(text == null ? "" : text)
    .toLowerCase()
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/ة/g, "ه")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[‌‍]/g, " ")
    .replace(/پرو\s*مکس/g, "pro max").replace(/\bپرو\b/g, "pro").replace(/\bمکس\b/g, "max")
    .replace(/اولترا/g, "ultra").replace(/پلاس/g, "plus")
    .replace(/(\d),(?=\d{3})/g, "$1")
    .replace(/[،؛؟?!.:;"'()«»\[\]{}<>]/g, " ")
    .replace(/\s+/g, " ").trim();
}

// ───────── جستجوی ساختارمند ─────────
const BRANDS = [
  { re: /سامسونگ|samsung|گلکسی|galaxy/, regex: "سامسونگ|samsung", name: "سامسونگ" },
  { re: /شیائومی|شیایومی|xiaomi|ردمی|redmi|پوکو|poco/, regex: "شیائومی|xiaomi", name: "شیائومی" },
  { re: /سونی|sony|پلی ?استیشن|playstation|ps ?[45]/, regex: "سونی|sony|play ?station|پلی ?استیشن", name: "سونی" },
  { re: /ایکس ?باکس|xbox|مایکروسافت/, regex: "ایکس ?باکس|xbox|microsoft", name: "ایکس‌باکس" },
  { re: /اپل|apple|ایفون|آیفون|iphone|ایرپاد|airpods|آیپد|ایپد|ipad|مک ?بوک/, regex: "اپل|apple", name: "اپل" },
];
const CATEGORIES = [
  { re: /تبلت|آیپد|ایپد|ipad|galaxy tab|گلکسی تب/, regex: "تبلت", name: "تبلت" },
  { re: /هدفون|هندزفری|ایرپاد|airpods|هدست|earbuds|بادز/, regex: "هدفون|هندزفری", name: "هدفون و هندزفری" },
  { re: /ساعت|واچ|watch/, regex: "ساعت", name: "ساعت هوشمند" },
  { re: /کنسول|پلی ?استیشن|playstation|ps ?[45]|ایکس ?باکس|xbox/, regex: "کنسول", name: "کنسول بازی" },
  { re: /کابل|شارژر|آداپتور|پاور ?بانک|قاب|گلس|محافظ صفحه|لوازم جانبی/, regex: "لوازم جانبی|کابل|شارژر|آداپتور", name: "لوازم جانبی" },
  { re: /گوشی|موبایل|ایفون|آیفون|iphone|گلکسی|galaxy|redmi|poco|ردمی|پوکو/, regex: "موبایل|گوشی", name: "موبایل" },
];
const COLORS = ["مشکی", "سفید", "آبی", "قرمز", "طلایی", "نقره ای", "نقره‌ای", "صورتی", "سبز", "بنفش", "خاکستری", "نارنجی", "زرد", "کرم", "تیتانیوم", "بژ"];
const STOPWORDS = new Set(["گوشی", "موبایل", "میخوام", "می خوام", "میخواهم", "می خواهم", "یه", "یک", "برای", "با", "از", "به", "در", "که", "و", "را", "رو", "هست", "بهترین", "ارزان", "ارزانترین", "گران", "گرانترین", "قیمت", "خرید", "پیشنهاد", "بده", "بدید", "لطفا", "چی", "چه", "کدوم", "مدل", "تومن", "تومان", "میلیون", "هزار", "گیگ", "گیگابایت", "زیر", "بالای", "حدود", "تا", "بین", "کمتر", "بیشتر"]);

const UNIT = { "میلیون": 1e6, "ملیون": 1e6, "م": 1e6, "هزار": 1e3, "k": 1e3 };
function toToman(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (unit && UNIT[unit]) return n * UNIT[unit];
  return n >= 1e5 ? n : n * 1e6; // «۲۰» بدون واحد در قیمت گوشی یعنی ۲۰ میلیون
}

// بودجه از عبارت‌هایی مثل «زیر ۲۰ میلیون»، «بین ۱۰ تا ۲۰ میلیون»، «حدود ۳۰ میلیون»، «۱۵ میلیونی»
function parseBudget(text) {
  const num = "(\\d+(?:\\.\\d+)?)\\s*(میلیون|ملیون|هزار|م|k)?";
  let m = text.match(new RegExp("بین\\s*" + num + "\\s*(?:تا|و|الی)\\s*" + num));
  if (m) {
    const unit = m[2] || m[4];
    const a = toToman(m[1], unit), b = toToman(m[3], unit);
    if (a && b) return { min: Math.min(a, b), max: Math.max(a, b), consumed: m[0] };
  }
  m = text.match(new RegExp("(?:زیر|کمتر از|حداکثر|تا سقف|تا)\\s*" + num));
  if (m && toToman(m[1], m[2])) return { min: 0, max: toToman(m[1], m[2]), consumed: m[0] };
  m = text.match(new RegExp("(?:بالای|بیشتر از|حداقل|از)\\s*" + num));
  if (m && toToman(m[1], m[2])) return { min: toToman(m[1], m[2]), max: Infinity, consumed: m[0] };
  m = text.match(new RegExp("(?:حدود|نزدیک|در حدود|تقریبا)\\s*" + num));
  if (m && toToman(m[1], m[2])) { const v = toToman(m[1], m[2]); return { min: v * 0.8, max: v * 1.2, consumed: m[0] }; }
  m = text.match(/(\d+(?:\.\d+)?)\s*(میلیونی|میلیون|ملیون|تومن|تومان)/);
  if (m) { const v = m[2] === "تومن" || m[2] === "تومان" ? Number(m[1]) : Number(m[1]) * 1e6; if (v >= 1e5) return { min: v * 0.8, max: v * 1.2, consumed: m[0] }; }
  return null;
}

function parseSearch(message) {
  let text = normalize(message);
  const budget = parseBudget(text);
  if (budget) text = text.replace(budget.consumed, " ");
  const brand = BRANDS.find((b) => b.re.test(text)) || null;
  // «آیپد» دستهٔ تبلت است نه موبایل؛ ترتیب CATEGORIES همین را تضمین می‌کند.
  const category = CATEGORIES.find((c) => c.re.test(text)) || null;
  let storage = null;
  const gb = text.match(/(\d{2,4})\s*(?:گیگابایت|گیگ|gb|g\b)/);
  const tb = text.match(/(\d)\s*(?:ترابایت|ترا|tb)/);
  if (gb && [32, 64, 128, 256, 512, 1024].includes(Number(gb[1]))) storage = gb[1];
  else if (tb) storage = String(Number(tb[1]) * 1024);
  if (storage) text = text.replace(/(\d{2,4}|\d)\s*(?:گیگابایت|گیگ|gb|g\b|ترابایت|ترا|tb)/g, " ");
  const color = COLORS.find((c) => text.includes(normalize(c))) || null;
  let sort = null;
  if (/ارزان ?ترین|کم ?ترین قیمت|ارزون ?ترین|اقتصادی/.test(text)) sort = "asc";
  else if (/گران ?ترین|لوکس|پرچمدار|بالا ?ترین قیمت/.test(text)) sort = "desc";
  else if (/بهترین|پر ?فروش|محبوب|پر ?امتیاز/.test(text)) sort = "rating";
  // کلمه‌های مدل (لاتین/عددی مثل a56، 17، pro، max) برای تطبیق با نام محصول
  const models = [...new Set(text.split(" ").filter((t) => /[a-z]/.test(t) || /^\d{1,3}$/.test(t)).filter((t) => !STOPWORDS.has(t) && !/^(gb|tb|g)$/.test(t)))]
    .filter((t) => !(brand && brand.re.test(t)) && !(category && category.re.test(t))).slice(0, 4);
  return { brand, category, budget, storage, color, sort, models, hasSignal: Boolean(brand || category || budget || storage || color || sort || models.length) };
}

const finalPrice = (p) => Math.round((Number(p.price) || 0) * (100 - Math.min(99, Math.max(0, Number(p.discount) || 0))) / 100);
const inStock = (p) => String(p.availability || "").toLowerCase() !== "out" && p.comingSoon !== true && (Number(p.stock) > 0 || (Array.isArray(p.variants) && p.variants.some((v) => Number(v.stock) > 0)));
const escapeRegex = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function buildFilter(parsed, { relaxModels = false } = {}) {
  const and = [];
  if (parsed.brand) and.push({ brand: { $regex: parsed.brand.regex, $options: "i" } });
  if (parsed.category) and.push({ category: { $regex: parsed.category.regex, $options: "i" } });
  if (!relaxModels) parsed.models.forEach((m) => and.push({ name: { $regex: escapeRegex(m), $options: "i" } }));
  return and.length ? { $and: and } : {};
}

// فیلترهای ریزتر روی نتیجهٔ دیتابیس: قیمت نهایی، حافظه و رنگ (فقط وقتی محصول دادهٔ آن را دارد)
function refine(products, parsed, { ignoreBudget = false } = {}) {
  const { budget, storage, color } = parsed;
  return products.filter((p) => {
    if (!ignoreBudget && budget) { const price = finalPrice(p); if (price < budget.min || price > budget.max) return false; }
    if (storage) {
      const list = [...(p.storages || []), ...(Array.isArray(p.variants) ? p.variants.map((v) => v.storage) : [])].map(normalize).filter(Boolean);
      if (list.length && !list.some((s) => s.replace(/\D/g, "") === storage || (storage === "1024" && /1 ?tb|1024/.test(s)))) return false;
    }
    if (color) {
      const names = [...(p.colors || []).map((c) => (typeof c === "string" ? c : c && c.name)), ...(Array.isArray(p.variants) ? p.variants.map((v) => v.color && v.color.name) : [])].map(normalize).filter(Boolean);
      if (names.length && !names.some((n) => n.includes(normalize(color)))) return false;
    }
    return true;
  });
}

function sortProducts(products, sort) {
  const list = [...products];
  if (sort === "asc") return list.sort((a, b) => finalPrice(a) - finalPrice(b));
  if (sort === "desc") return list.sort((a, b) => finalPrice(b) - finalPrice(a));
  if (sort === "rating") return list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || (b.featured === true) - (a.featured === true));
  return list.sort((a, b) => (b.featured === true) - (a.featured === true) || (Number(b.rating) || 0) - (Number(a.rating) || 0));
}

function describeCriteria(parsed) {
  const parts = [];
  if (parsed.category) parts.push(parsed.category.name);
  if (parsed.brand) parts.push(parsed.brand.name);
  if (parsed.models.length) parts.push(parsed.models.join(" "));
  if (parsed.storage) parts.push(fa(parsed.storage === "1024" ? 1 : parsed.storage) + (parsed.storage === "1024" ? " ترابایت" : " گیگابایت"));
  if (parsed.color) parts.push("رنگ " + parsed.color);
  if (parsed.budget) {
    const { min, max } = parsed.budget;
    parts.push(max === Infinity ? `بالای ${fa(Math.round(min))} تومان` : min > 0 ? `حدود ${fa(Math.round(min))} تا ${fa(Math.round(max))} تومان` : `تا ${fa(Math.round(max))} تومان`);
  }
  return parts.join("، ");
}

function productLine(p, index) {
  const price = finalPrice(p);
  const discount = Number(p.discount) > 0 ? ` (${fa(Math.round(p.discount))}٪ تخفیف)` : "";
  const low = Number(p.stock) > 0 && Number(p.stock) <= 5 ? ` — فقط ${fa(p.stock)} عدد` : "";
  return `${fa(index + 1)}. ${String(p.name).replace(/\s+/g, " ").trim()} — ${fa(price)} تومان${discount}${low}`;
}

const toSuggestion = (p) => ({ id: String(p._id), name: p.name, brand: p.brand || "", price: finalPrice(p), slug: p.slug, url: `/product/${encodeURIComponent(p.slug || String(p._id))}` });

async function searchProducts(message, deps) {
  const parsed = parseSearch(message);
  const fetchList = async (filter) => (await deps.findProducts(filter, 60)).filter(inStock);
  let relaxed = false;
  let pool = await fetchList(buildFilter(parsed));
  if (!pool.length && parsed.models.length) { pool = await fetchList(buildFilter(parsed, { relaxModels: true })); relaxed = true; }
  let results = sortProducts(refine(pool, parsed), parsed.sort).slice(0, 5);
  let note = "";
  if (!results.length && pool.length && parsed.budget) {
    const cheapest = sortProducts(refine(pool, parsed, { ignoreBudget: true }), "asc").slice(0, 3);
    if (cheapest.length) { results = cheapest; note = `با این بودجه محصول موجودی پیدا نشد؛ ارزان‌ترین گزینه‌های موجود:`; }
  }
  return { parsed, results, relaxed, note };
}

// ───────── نیت‌ها و پاسخ‌های پشتیبانی ─────────
const INTENTS = [
  { id: "return_cancel", re: /مرجوع|برگشت (?:کالا|سفارش|وجه|پول)|پس بدم|پس دادن|لغو|کنسل|استرداد|معیوب|خراب (?:بود|شد|رسید)|شکایت|ناراضی|اشتباه (?:فرستاد|ارسال)|بازگشت وجه/ },
  { id: "order_status", re: /(?:وضعیت|پیگیری|رهگیری|کجاست|کجا رسید|چی شد|رسید ?ه|نرسید|نیومد).{0,25}(?:سفارش|مرسوله|بسته)|(?:سفارش|مرسوله|بسته).{0,25}(?:من|م|ام|کجا|وضعیت|پیگیری|رهگیری|چی شد|نرسید|نیومد|رسید)|سفارش های من|سفارشم|کد رهگیری/ },
  { id: "payment_deadline", re: /(?:مهلت|وقت|زمان|منقضی|ده دقیقه|10 دقیقه).{0,25}پرداخت|پرداخت.{0,25}(?:مهلت|منقضی|دقیقه|لغو شد)|سفارشم لغو شد/ },
  { id: "wallet", re: /کیف ?پول|شارژ (?:حساب|کیف)|اعتبار/ },
  { id: "payment_methods", re: /پرداخت|درگاه|زرین ?پال|اقساط|قسطی|کارت به کارت|نقدی|چطور بخرم|چجوری بخرم|روش خرید/ },
  { id: "shipping", re: /ارسال|پست|پیک|هزینه حمل|حمل|تحویل|کی میرسه|چند روزه|چقدر طول|رایگان|شهرستان|تهران/ },
  { id: "warranty", re: /گارانتی|ضمانت|اصالت|اصل|اورجینال|original|فاکتور/ },
  { id: "account", re: /ثبت ?نام|عضویت|ورود|لاگین|رمز|کد تایید|کد تأیید|پیامک|حساب کاربری|پروفایل|ادرس|آدرس/ },
  { id: "contact", re: /تماس|شماره (?:تلفن|پشتیبانی|تماس)|ایمیل|پشتیبان|ساعت کاری|حضوری|مغازه|فروشگاه فیزیکی|اپراتور|انسان/ },
  { id: "price_stock", re: /(?:موجود|ناموجود|موجودی|کی میاد|کی موجود).{0,20}(?:میشه|هست|دارید|دارین)?/ },
];
const GREETING = /^(?:سلام|درود|hi|hello|وقت بخیر|صبح بخیر|عصر بخیر|شب بخیر|خسته نباشید|سلام علیکم)(?: .{0,18})?$/;
const THANKS = /^(?:مرسی|ممنون|سپاس|تشکر|دمت گرم|thanks|thank you|عالی بود|ok|اوکی)(?: .{0,20})?$/;

const STATUS_FA = { awaiting_payment: "در انتظار پرداخت", processing: "در حال پردازش", shipped: "ارسال‌شده", delivered: "تحویل‌شده", cancelled: "لغو شده", returned: "مرجوع شده" };
const HELP = "می‌توانید از من بپرسید: پیشنهاد گوشی/تبلت/لوازم جانبی با بودجه (مثلاً «گوشی سامسونگ تا ۲۰ میلیون»)، وضعیت سفارش، روش‌های پرداخت و ارسال، کیف پول، گارانتی یا راه‌های تماس با پشتیبانی.";

function detectIntent(message) {
  const text = normalize(message);
  if (!text) return { intent: "empty", confidence: "low", text };
  if (GREETING.test(text)) return { intent: "greeting", confidence: "high", text };
  if (THANKS.test(text)) return { intent: "thanks", confidence: "high", text };
  const early = INTENTS.slice(0, 2).find((i) => i.re.test(text)); // لغو/مرجوعی و وضعیت سفارش همیشه مقدم‌اند
  if (early) return { intent: early.id, confidence: "high", text };
  const parsed = parseSearch(message);
  const wantsProducts = parsed.brand || parsed.category || parsed.budget || parsed.sort === "asc" || parsed.sort === "desc";
  if (wantsProducts) return { intent: "product_search", confidence: "high", text, parsed };
  const found = INTENTS.slice(2).find((i) => i.re.test(text));
  if (found) return { intent: found.id, confidence: "high", text };
  if (parsed.hasSignal) return { intent: "product_search", confidence: "low", text, parsed };
  return { intent: "unknown", confidence: "low", text };
}

async function orderStatusAnswer(deps, user, trackingLabel) {
  if (!user) return { answer: "برای دیدن وضعیت سفارش ابتدا وارد حساب کاربری شوید؛ سپس همین سؤال را دوباره بپرسید یا از «پروفایل ← سفارش‌ها» پیگیری کنید.", handoff: false };
  const orders = (await deps.userOrders(user)) || [];
  if (!orders.length) return { answer: "برای حساب شما هنوز سفارشی ثبت نشده است.", handoff: false };
  const lines = orders.slice(0, 3).map((o) => {
    const state = o.currentLabel || trackingLabel || o.status;
    return `• سفارش ${o.orderNumber}: ${o.status}${state && state !== o.status ? ` — ${state}` : ""} · ${o.paid ? "پرداخت‌شده" : "پرداخت‌نشده"} · ${fa(o.totalToman)} تومان`;
  });
  return { answer: `وضعیت آخرین سفارش‌های شما:\n${lines.join("\n")}\nجزئیات کامل مراحل را در «پروفایل ← سفارش‌ها» می‌بینید.`, handoff: false };
}

async function shippingAnswer(deps) {
  let methods = [];
  try { methods = ((await deps.shippingMethods()) || []).filter((m) => m.enabled !== false); } catch (_) { /* بدون تنظیمات */ }
  if (!methods.length) return "روش و زمان ارسال هنگام ثبت سفارش و بر اساس شهر مقصد نمایش داده می‌شود.";
  const lines = methods.map((m) => `• ${m.title}${m.eta ? ` — ${m.eta}` : ""}: ${Number(m.fee) > 0 ? fa(m.fee) + " تومان" : "رایگان"}${Number(m.freeThreshold) > 0 ? ` (برای سفارش‌های ${fa(m.freeThreshold)} تومان و بیشتر رایگان)` : ""}`);
  return `روش‌های ارسال فعال:\n${lines.join("\n")}\nهزینهٔ نهایی هنگام ثبت سفارش نمایش داده می‌شود.`;
}

async function contactAnswer(deps) {
  let bale = "";
  try { bale = (await deps.supportLink()) || ""; } catch (_) { /* اختیاری */ }
  return `راه‌های ارتباط با پشتیبانی: فرم صفحهٔ «تماس با ما»، ایمیل info@pixellife.ir${bale ? ` و پشتیبانی در بله (${bale})` : ""}. برای ارجاع همین گفتگو به پشتیبان، دکمهٔ «ارسال به پشتیبان انسانی» را بزنید.`;
}

const STATIC_ANSWERS = {
  greeting: "سلام! به پیکسل لایف خوش آمدید 🌟 چطور می‌توانم کمکتان کنم؟ " + HELP,
  thanks: "خواهش می‌کنم! اگر سؤال دیگری دارید در خدمتم.",
  payment_deadline: "سفارش پرداخت‌نشده ۱۰ دقیقه فرصت پرداخت دارد؛ بعد از آن لغو می‌شود («لغو شده») و باید دوباره ثبت شود. تا آن زمان می‌توانید از «پروفایل ← سفارش‌ها» دوباره پرداخت کنید.",
  wallet: "از «پروفایل ← کیف پول» می‌توانید هر مبلغ دلخواه را شارژ کنید و هنگام پرداخت سفارش از موجودی آن استفاده کنید. اگر سفارش پرداخت‌شده با کیف پول لغو یا مرجوع شود، مبلغ به کیف پول برمی‌گردد.",
  warranty: "اطلاعات گارانتی هر کالا در صفحهٔ همان محصول نوشته شده است. قبل از خرید رنگ، حافظه و گارانتی انتخابی را در صفحهٔ محصول بررسی کنید. اگر دربارهٔ یک مدل مشخص سؤال دارید، نام آن را بنویسید یا به پشتیبان ارجاع می‌دهم.",
  account: "ورود با شماره موبایل و کد تأیید انجام می‌شود. برای خرید، نام، نام خانوادگی، آدرس و کدپستی در «پروفایل» باید کامل باشد. اگر کد تأیید نمی‌رسد کمی صبر کنید و دوباره درخواست دهید.",
  price_stock: "قیمت و موجودی دوره‌ای به‌روز می‌شود؛ ملاک نهایی، صفحهٔ محصول و سبد خرید است. نام محصول را بنویسید تا موجودی و قیمت فعلی را بگویم.",
  return_cancel: "لغو و مرجوعی بر اساس نوع کالا، وضعیت بسته‌بندی و قوانین جاری توسط پشتیبانی بررسی می‌شود؛ سفارش پرداخت‌نشده را می‌توانید خودتان از «پروفایل ← سفارش‌ها» لغو کنید. برای ثبت درخواست، دکمهٔ «ارسال به پشتیبان انسانی» را بزنید.",
  unknown: "متوجه منظورتان نشدم. " + HELP + " اگر نیاز به بررسی انسانی دارید، دکمهٔ «ارسال به پشتیبان انسانی» را بزنید.",
};

async function paymentMethodsAnswer(deps) {
  let list = [];
  try { list = ((await deps.paymentMethods()) || []).filter((m) => m.enabled !== false); } catch (_) { /* پیش‌فرض */ }
  if (!list.length) return "پرداخت از طریق درگاه آنلاین (زرین‌پال)، بله یا کیف پول انجام می‌شود و روش‌های فعال هنگام ثبت سفارش نمایش داده می‌شود.";
  return `روش‌های پرداخت فعال: ${list.map((m) => m.title).join("، ")}. روش مورد نظر را هنگام ثبت سفارش انتخاب می‌کنید و سفارش پرداخت‌نشده ۱۰ دقیقه فرصت پرداخت دارد.`;
}

/**
 * پاسخ قاعده‌محور به یک پیام.
 * deps: { findProducts(filter, limit), userOrders(user), shippingMethods(), paymentMethods(), supportLink() }
 * خروجی: { intent, confidence: "high"|"low", answer, handoff, suggestions[], rawProducts[] }
 */
async function respond(message, { user = null, deps = {} } = {}) {
  const detected = detectIntent(message);
  const base = { intent: detected.intent, confidence: detected.confidence, suggestions: [], rawProducts: [] };
  try {
    switch (detected.intent) {
      case "order_status": { const r = await orderStatusAnswer(deps, user); return { ...base, ...r }; }
      case "shipping": return { ...base, answer: await shippingAnswer(deps), handoff: false };
      case "payment_methods": return { ...base, answer: await paymentMethodsAnswer(deps), handoff: false };
      case "contact": return { ...base, answer: await contactAnswer(deps), handoff: false };
      case "return_cancel": return { ...base, answer: STATIC_ANSWERS.return_cancel, handoff: true };
      case "product_search": {
        const { parsed, results, relaxed, note } = await searchProducts(message, deps);
        base.rawProducts = results;
        base.suggestions = results.map(toSuggestion);
        if (!results.length) {
          return { ...base, answer: `برای «${describeCriteria(parsed) || "درخواستتان"}» محصول موجودی پیدا نشد. می‌توانید بودجه یا مدل را کمی تغییر دهید، یا از پشتیبان بخواهید موجود شدن را پیگیری کند.`, handoff: true };
        }
        const head = note || (relaxed ? `مدل دقیق پیدا نشد؛ نزدیک‌ترین گزینه‌های موجود${describeCriteria(parsed) ? ` برای ${describeCriteria(parsed)}` : ""}:` : `گزینه‌های موجود${describeCriteria(parsed) ? ` برای ${describeCriteria(parsed)}` : ""}:`);
        return { ...base, answer: `${head}\n${results.map(productLine).join("\n")}\nبرای دیدن مشخصات و رنگ‌ها، محصول را در سایت باز کنید.`, handoff: false };
      }
      case "empty": return { ...base, answer: "پیام خالی است. سؤالتان را بنویسید.", handoff: false };
      default: return { ...base, answer: STATIC_ANSWERS[detected.intent] || STATIC_ANSWERS.unknown, handoff: detected.intent === "unknown" };
    }
  } catch (error) {
    return { ...base, confidence: "low", answer: STATIC_ANSWERS.unknown, handoff: true, error: error.message };
  }
}

module.exports = { normalize, parseSearch, parseBudget, detectIntent, respond, finalPrice, STATUS_FA };
