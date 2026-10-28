// سئوی یکپارچه برای کل سایت: عنوان، توضیح، canonical، Open Graph، JSON-LD و robots.
// همهٔ صفحه‌های HTML از یک میدل‌ویر عبور می‌کنند؛ صفحه‌های محصول (که با هر محصول جدید ساخته می‌شوند)
// از روی دادهٔ دیتابیس به‌صورت خودکار متای اختصاصی می‌گیرند.
const env = require("../config/env");

const SITE_NAME = "پیکسل لایف";
const SITE_URL = String(env.siteUrl || "https://pixellife.ir").replace(/\/+$/, "");
const DEFAULT_IMAGE = "/images/brand/logo-mark-192.png";

const escapeHtml = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const absoluteUrl = (value) => {
  const v = String(value || "").trim();
  if (!v || /^data:/i.test(v)) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return SITE_URL + (v.startsWith("/") ? v : "/" + v);
};
const plain = (value) => String(value == null ? "" : value).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const truncate = (value, max) => {
  const text = plain(value);
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 25)).trim() + "…";
};
const safeJson = (data) => JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028|\u2029/g, "");

// ───────── صفحه‌های ثابت ─────────
const PAGES = {
  "/": { name: "خانه", title: "PixelLife | فروشگاه اینترنتی محصولات دیجیتال", description: "PixelLife، فروشگاه اینترنتی محصولات دیجیتال؛ خرید موبایل، تبلت، کنسول و لوازم جانبی با بررسی تخصصی و ارسال مطمئن.", site: true },
  "/iphone": { name: "خرید آیفون", title: "خرید آیفون اپل | قیمت و مشخصات iPhone | پیکسل لایف", description: "خرید انواع گوشی آیفون اپل با گارانتی اصالت و بهترین قیمت، همراه با مشخصات کامل و ارسال سریع به سراسر ایران." },
  "/samsung": { name: "گوشی سامسونگ", title: "خرید گوشی سامسونگ | قیمت گلکسی | پیکسل لایف", description: "خرید گوشی‌های سامسونگ گلکسی (سری S، A و Z) با ضمانت اصالت کالا، قیمت روز و ارسال سریع." },
  "/xiaomi": { name: "گوشی شیائومی", title: "خرید گوشی شیائومی | قیمت ردمی و پوکو | پیکسل لایف", description: "خرید گوشی‌های شیائومی، ردمی و پوکو با گارانتی معتبر، قیمت مناسب و ارسال سریع از پیکسل لایف." },
  "/mobiles": { name: "گوشی موبایل", title: "خرید گوشی موبایل | قیمت روز همهٔ برندها | پیکسل لایف", description: "خرید گوشی موبایل از برندهای اپل، سامسونگ و شیائومی با گارانتی اصالت، مقایسهٔ قیمت و ارسال سریع." },
  "/ipad": { name: "آیپد اپل", title: "خرید آیپد اپل | قیمت iPad | پیکسل لایف", description: "خرید انواع آیپد اپل (iPad Pro، Air و mini) با گارانتی اصالت، مشخصات کامل و ارسال سریع." },
  "/tablets": { name: "تبلت", title: "خرید تبلت | قیمت تبلت اپل، سامسونگ و شیائومی | پیکسل لایف", description: "خرید تبلت از برندهای اپل، سامسونگ و شیائومی با بهترین قیمت، ضمانت اصالت و ارسال سریع." },
  "/samsungtab": { name: "تبلت سامسونگ", title: "خرید تبلت سامسونگ | قیمت گلکسی تب | پیکسل لایف", description: "خرید تبلت‌های سامسونگ گلکسی تب با گارانتی معتبر و قیمت مناسب از پیکسل لایف." },
  "/xiaomitab": { name: "تبلت شیائومی", title: "خرید تبلت شیائومی | قیمت شیائومی پد | پیکسل لایف", description: "خرید تبلت‌های شیائومی پد با گارانتی معتبر، قیمت مناسب و ارسال سریع." },
  "/headphones": { name: "هدفون و هندزفری", title: "خرید هدفون و هندزفری | ایرپاد و بی‌سیم | پیکسل لایف", description: "خرید هدفون، هندزفری و ایرپاد اورجینال با ضمانت اصالت و بهترین قیمت." },
  "/smartwatches": { name: "ساعت هوشمند", title: "خرید ساعت هوشمند | اپل واچ و گلکسی واچ | پیکسل لایف", description: "خرید ساعت هوشمند اپل واچ و سامسونگ گلکسی واچ با گارانتی اصالت و ارسال سریع." },
  "/console": { name: "کنسول بازی", title: "خرید کنسول بازی | پلی‌استیشن و ایکس‌باکس | پیکسل لایف", description: "خرید کنسول بازی پلی‌استیشن و ایکس‌باکس و لوازم جانبی، با گارانتی و قیمت مناسب." },
  "/accessories": { name: "لوازم جانبی موبایل", title: "خرید لوازم جانبی موبایل | شارژر، کابل و قاب | پیکسل لایف", description: "خرید لوازم جانبی اورجینال موبایل شامل شارژر، کابل، آداپتور و قاب با ضمانت اصالت و ارسال سریع." },
  "/accessories/chargers": { name: "شارژر، کابل و آداپتور", parent: "/accessories", title: "خرید شارژر، کابل و آداپتور موبایل | اورجینال | پیکسل لایف", description: "خرید شارژر دیواری، کابل شارژ و آداپتور اورجینال اپل، سامسونگ و شیائومی با بهترین قیمت." },
  "/accessories/apple": { name: "لوازم جانبی اپل", parent: "/accessories", title: "خرید لوازم جانبی اپل | شارژر و کابل اورجینال | پیکسل لایف", description: "خرید لوازم جانبی اورجینال اپل شامل شارژر، کابل و آداپتور با ضمانت اصالت." },
  "/accessories/samsung": { name: "لوازم جانبی سامسونگ", parent: "/accessories", title: "خرید لوازم جانبی سامسونگ | شارژر و کابل اورجینال | پیکسل لایف", description: "خرید لوازم جانبی اورجینال سامسونگ شامل شارژر سریع، کابل و آداپتور با ضمانت اصالت." },
  "/accessories/xiaomi": { name: "لوازم جانبی شیائومی", parent: "/accessories", title: "خرید لوازم جانبی شیائومی | شارژر و کابل | پیکسل لایف", description: "خرید لوازم جانبی شیائومی شامل شارژر، کابل و آداپتور با بهترین قیمت." },
  "/amazing": { name: "پیشنهادهای شگفت‌انگیز", title: "پیشنهادهای شگفت‌انگیز | تخفیف ویژه | پیکسل لایف", description: "تخفیف‌های ویژه و محدود محصولات دیجیتال در پیکسل لایف؛ موبایل، تبلت و لوازم جانبی با قیمت شگفت‌انگیز." },
  "/contact": { name: "تماس با ما", title: "تماس با ما | پشتیبانی پیکسل لایف", description: "راه‌های ارتباط با پشتیبانی پیکسل لایف؛ پیگیری سفارش، مشاوره خرید و ثبت پیام." },
  "/terms": { name: "قوانین و مقررات", title: "قوانین و مقررات | پیکسل لایف", description: "قوانین و مقررات استفاده از خدمات، ارسال، مرجوعی و حریم خصوصی در فروشگاه پیکسل لایف." },
};
// صفحه‌های بدون ارزش سئو: ایندکس نمی‌شوند. اگر target داشته باشند، canonical به صفحهٔ اصلیِ مشابه اشاره می‌کند.
const NOINDEX_PREFIXES = ["/cart", "/checkout", "/profile", "/login", "/search", "/categories", "/admin", "/wallet", "/orders"];
const ALIASES = { "/mobile/apple": "/iphone", "/blog": "/", "/new": "/mobiles", "/bestsellers": "/mobiles", "/brands": "/mobiles", "/support": "/contact", "/offers": "/amazing" };

const breadcrumb = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: SITE_URL + item.path })),
});

const siteJsonLd = () => [
  { "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, alternateName: "PixelLife", url: SITE_URL + "/", logo: absoluteUrl(DEFAULT_IMAGE) },
  { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: SITE_URL + "/", inLanguage: "fa-IR", potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/search?q={search_term_string}`, "query-input": "required name=search_term_string" } },
];

function staticMeta(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (ALIASES[path]) return { canonical: SITE_URL + (ALIASES[path] === "/" ? "/" : ALIASES[path]), noindex: true, follow: true };
  if (NOINDEX_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) return { canonical: "", noindex: true, follow: path.startsWith("/search") || path === "/categories" };
  const page = PAGES[path];
  if (!page) return null;
  const crumbs = [{ name: "خانه", path: "/" }];
  if (page.parent) crumbs.push({ name: PAGES[page.parent].name, path: page.parent });
  if (path !== "/") crumbs.push({ name: page.name, path });
  return {
    title: page.title, description: page.description, canonical: SITE_URL + (path === "/" ? "/" : path),
    jsonLd: [...(page.site ? siteJsonLd() : []), ...(path !== "/" ? [breadcrumb(crumbs)] : [])],
  };
}

// ───────── محصول ─────────
const finalPriceToman = (p) => {
  const discount = Math.min(99, Math.max(0, Number(p.discount) || 0));
  return Math.round((Number(p.price) || 0) * (100 - discount) / 100);
};
const stockOf = (p) => (Array.isArray(p.variants) && p.variants.length ? p.variants.reduce((s, v) => s + Math.max(0, Number(v.stock) || 0), 0) : Math.max(0, Number(p.stock) || 0));
const isOut = (p) => String(p.availability || "").toLowerCase() === "out" || stockOf(p) <= 0;

function productSpecsText(p) {
  const groups = Array.isArray(p.technicalSpecs) ? p.technicalSpecs : [];
  const rows = [];
  groups.forEach((g) => (Array.isArray(g.items) ? g.items : []).forEach((i) => i && i.label && i.value && rows.push([plain(i.label), plain(i.value)])));
  if (!rows.length && typeof p.specs === "string") {
    p.specs.split(/\r?\n/).forEach((line) => { const [k, ...rest] = line.split(/[:：|]/); if (k && rest.length) rows.push([plain(k), plain(rest.join(":"))]); });
  }
  return rows.slice(0, 40);
}

function buildProductSeo(p) {
  const slug = p.slug || String(p._id);
  const url = `${SITE_URL}/product/${encodeURIComponent(slug)}`;
  const name = plain(p.name);
  const shortName = name.length > 62 ? truncate(name, 62) : name;
  const price = finalPriceToman(p);
  const out = isOut(p);
  const images = [p.mainImage, ...(Array.isArray(p.images) ? p.images : [])].map(absoluteUrl).filter(Boolean);
  const uniqueImages = [...new Set(images)].slice(0, 6);
  const priceText = price > 0 && !out ? ` قیمت ${price.toLocaleString("fa-IR")} تومان.` : "";
  const baseDescription = plain(p.description) || `خرید ${name} با ضمانت اصالت کالا و ارسال سریع به سراسر ایران.`;
  const description = truncate(`${baseDescription}${priceText} خرید از پیکسل لایف.`, 160);
  const brand = plain(p.brand);
  const category = plain(p.category);
  const specs = productSpecsText(p);

  const offer = {
    "@type": "Offer", url, priceCurrency: "IRR", price: String(price * 10),
    availability: p.comingSoon ? "https://schema.org/PreOrder" : out ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition", seller: { "@type": "Organization", name: SITE_NAME },
  };
  const product = {
    "@context": "https://schema.org", "@type": "Product", name, description: truncate(baseDescription, 500), sku: String(p.legacyId || slug), url,
    ...(uniqueImages.length ? { image: uniqueImages } : {}),
    ...(brand ? { brand: { "@type": "Brand", name: brand } } : {}),
    ...(category ? { category } : {}),
    ...(price > 0 ? { offers: offer } : {}),
    ...(Number(p.reviewCount) > 0 && Number(p.rating) > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(Number(p.rating).toFixed(1)), reviewCount: Number(p.reviewCount) } } : {}),
  };
  const crumbs = [{ name: "خانه", path: "/" }];
  const catPath = Object.keys(PAGES).find((k) => /^\/(mobiles|tablets|headphones|smartwatches|console|accessories)$/.test(k) && PAGES[k].name && category && (category.includes(PAGES[k].name.replace(/^خرید /, "")) || PAGES[k].name.includes(category)));
  if (catPath) crumbs.push({ name: PAGES[catPath].name, path: catPath });
  const crumbList = breadcrumb([...crumbs, { name, path: `/product/${encodeURIComponent(slug)}` }]);

  const ssr = `<article id="seoProduct" class="seo-ssr" itemscope itemtype="https://schema.org/Product">
<nav aria-label="مسیر صفحه">${crumbs.map((c) => `<a href="${escapeHtml(c.path)}">${escapeHtml(c.name)}</a>`).join(" › ")} › <span>${escapeHtml(name)}</span></nav>
<h1 itemprop="name">${escapeHtml(name)}</h1>
${brand ? `<p>برند: <span itemprop="brand">${escapeHtml(brand)}</span></p>` : ""}${category ? `<p>دسته‌بندی: ${escapeHtml(category)}</p>` : ""}
<p>${out ? "ناموجود" : price > 0 ? `قیمت: ${price.toLocaleString("fa-IR")} تومان` : ""}</p>
<div itemprop="description">${escapeHtml(truncate(p.description, 2000))}</div>
${specs.length ? `<h2>مشخصات فنی</h2><ul>${specs.map(([k, v]) => `<li>${escapeHtml(k)}: ${escapeHtml(v)}</li>`).join("")}</ul>` : ""}
${uniqueImages.slice(0, 4).map((src, i) => `<img src="${escapeHtml(src)}" alt="${escapeHtml(name)}${i ? " - تصویر " + (i + 1).toLocaleString("fa-IR") : ""}" loading="lazy" width="400" height="400">`).join("")}
</article>`;

  return {
    title: `خرید ${shortName} | ${SITE_NAME}`, description, canonical: url, image: uniqueImages[0] || absoluteUrl(DEFAULT_IMAGE), ogType: "product",
    price: price > 0 ? { amount: price * 10, currency: "IRR" } : null, jsonLd: [product, crumbList], ssr,
  };
}


// ───────── فهرست محصولات قابل‌خزش (لینک داخلی در HTML سرور) ─────────
// کارت‌های محصول با جاوااسکریپت ساخته می‌شوند؛ این فهرست متنی در انتهای هر صفحه، لینک همهٔ محصولات آن دسته را
// برای گوگل (و کاربر) در همان HTML اولیه می‌گذارد.
const T = (v) => String(v == null ? "" : v);
const RX = {
  phone: (p) => /موبایل|گوشی|mobile|phone/i.test(T(p.category)) && !/لوازم|accessor/i.test(T(p.category)),
  tablet: (p) => /تبلت|tablet|ipad/i.test(T(p.category)),
  headphone: (p) => /هدفون|هندزفری|ایرپاد|headphone|earphone|headset/i.test(T(p.category)),
  watch: (p) => /ساعت|watch/i.test(T(p.category)),
  console: (p) => /کنسول|console|playstation|xbox/i.test(T(p.category)),
  accessory: (p) => /لوازم|کابل|شارژر|آداپتور|charger|cable|adapter|accessor/i.test(T(p.category)),
  charger: (p) => /کابل|شارژر|آداپتور|charger|cable|adapter/i.test(T(p.category) + " " + T(p.name)),
  apple: (p) => /اپل|apple/i.test(T(p.brand)),
  samsung: (p) => /سامسونگ|samsung/i.test(T(p.brand)),
  xiaomi: (p) => /شیائومی|xiaomi|redmi|poco/i.test(T(p.brand)),
};
const LIST_FILTERS = {
  "/iphone": (p) => RX.phone(p) && RX.apple(p),
  "/samsung": (p) => RX.phone(p) && RX.samsung(p),
  "/xiaomi": (p) => RX.phone(p) && RX.xiaomi(p),
  "/mobiles": RX.phone,
  "/ipad": (p) => RX.tablet(p) && RX.apple(p),
  "/tablets": RX.tablet,
  "/samsungtab": (p) => RX.tablet(p) && RX.samsung(p),
  "/xiaomitab": (p) => RX.tablet(p) && RX.xiaomi(p),
  "/headphones": RX.headphone,
  "/smartwatches": RX.watch,
  "/console": RX.console,
  "/accessories": RX.accessory,
  "/accessories/chargers": RX.charger,
  "/accessories/apple": (p) => RX.accessory(p) && RX.apple(p),
  "/accessories/samsung": (p) => RX.accessory(p) && RX.samsung(p),
  "/accessories/xiaomi": (p) => RX.accessory(p) && RX.xiaomi(p),
  "/amazing": (p) => p.amazingOffer,
};
const CATEGORY_LINKS = ["/mobiles", "/iphone", "/samsung", "/xiaomi", "/tablets", "/ipad", "/samsungtab", "/xiaomitab", "/headphones", "/smartwatches", "/console", "/accessories", "/accessories/chargers", "/amazing"];

let productCache = { list: null, expires: 0 };
function resetListCache() { productCache = { list: null, expires: 0 }; }
async function loadListProducts() {
  if (productCache.list && productCache.expires > Date.now()) return productCache.list;
  let Product;
  try { Product = require("../models/Product"); } catch (_) { return []; }
  const list = await Product.find({}).select("slug name brand category price discount availability stock variants comingSoon amazingOffer featured").sort({ featured: -1, createdAt: -1 }).limit(500).lean();
  productCache = { list, expires: Date.now() + 60 * 1000 };
  return list;
}

function listItem(p) {
  const out = isOut(p);
  const price = finalPriceToman(p);
  const tail = p.comingSoon ? "به‌زودی" : out ? "ناموجود" : price > 0 ? `${price.toLocaleString("fa-IR")} تومان` : "";
  return `<li><a href="/product/${encodeURIComponent(p.slug)}">${escapeHtml(plain(p.name))}</a>${tail ? `<span>${escapeHtml(tail)}</span>` : ""}</li>`;
}

const LIST_CSS = `<style id="seo-list-style">.seo-list{margin:36px 0 12px;padding:20px 22px;background:#fff;border:1px solid #e6ebf2;border-radius:16px}.seo-list h2{margin:0 0 4px;font-size:16px;font-weight:800;color:#0f172a}.seo-list p{margin:0 0 12px;font-size:12.5px;color:#64748b}.seo-list ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2px 24px}.seo-list li{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px dashed #e8edf3;font-size:12.5px}.seo-list li a{color:#334155;text-decoration:none;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.seo-list li a:hover{color:#2563eb}.seo-list li span{flex:none;color:#64748b;font-weight:600}.seo-list .seo-cats{display:flex;flex-wrap:wrap;gap:8px}.seo-list .seo-cats a{padding:6px 14px;border:1px solid #e2e8f0;border-radius:999px;font-size:12.5px;color:#334155;text-decoration:none}.seo-list .seo-cats a:hover{border-color:#2563eb;color:#2563eb}@media(max-width:768px){.seo-list{margin:24px 0 8px;padding:16px}.seo-list ul{grid-template-columns:1fr}}</style>`;

async function buildListHtml(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  // صفحهٔ اصلی فهرست نمایشی ندارد؛ فقط صفحه‌های دسته‌بندی فهرست محصولات دارند.
  if (!LIST_FILTERS[path]) return "";
  const products = (await loadListProducts()).filter((p) => p && p.slug);
  const cats = `<div class="seo-cats">${CATEGORY_LINKS.map((c) => `<a href="${c}">${escapeHtml(PAGES[c].name)}</a>`).join("")}</div>`;
  const rows = products.filter(LIST_FILTERS[path]).slice(0, 60);
  if (!rows.length) return "";
  const name = PAGES[path] ? PAGES[path].name : "محصولات";
  return `${LIST_CSS}<section class="seo-list" aria-label="فهرست محصولات"><h2>فهرست محصولات: ${escapeHtml(name)}</h2><p>برای مشاهدهٔ مشخصات و قیمت، روی نام محصول بزنید.</p><ul>${rows.map(listItem).join("")}</ul><h2 style="margin-top:20px">دسته‌بندی‌های دیگر</h2>${cats}</section>`;
}

function insertList(html, listHtml) {
  if (!listHtml) return html;
  const index = html.lastIndexOf("</main>");
  return index === -1 ? html : html.slice(0, index) + listHtml + html.slice(index);
}

// ───────── تزریق به HTML ─────────
const SSR_CSS = `<style id="seo-ssr-style">.seo-ssr{position:absolute!important;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}</style>`;

function applySeo(html, meta) {
  if (!meta || typeof html !== "string" || !/<\/head>/i.test(html)) return html;
  let out = html;
  const hasOwn = (k) => meta[k] != null && meta[k] !== "";
  if (hasOwn("title")) out = out.replace(/<title>[\s\S]*?<\/title>/i, "");
  if (hasOwn("description")) out = out.replace(/<meta\s+name=["']description["'][^>]*>/i, "");
  if (hasOwn("canonical")) out = out.replace(/<link\s+rel=["']canonical["'][^>]*>/i, "");
  if (hasOwn("title") || hasOwn("description")) out = out.replace(/<meta\s+(?:property|name)=["'](?:og|twitter):[^"']*["'][^>]*>/gi, "");
  if (meta.noindex) out = out.replace(/<meta\s+name=["']robots["'][^>]*>/i, "");

  const tags = [];
  if (hasOwn("title")) tags.push(`<title>${escapeHtml(meta.title)}</title>`);
  if (hasOwn("description")) tags.push(`<meta name="description" content="${escapeHtml(meta.description)}" />`);
  if (hasOwn("canonical")) tags.push(`<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`);
  if (meta.noindex) tags.push(`<meta name="robots" content="noindex, ${meta.follow ? "follow" : "nofollow"}" />`);
  if (hasOwn("title") && hasOwn("description")) {
    const image = meta.image || absoluteUrl(DEFAULT_IMAGE);
    tags.push(
      `<meta property="og:type" content="${meta.ogType || "website"}" />`, `<meta property="og:site_name" content="${SITE_NAME}" />`, `<meta property="og:locale" content="fa_IR" />`,
      `<meta property="og:title" content="${escapeHtml(meta.title)}" />`, `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
      meta.canonical ? `<meta property="og:url" content="${escapeHtml(meta.canonical)}" />` : "", `<meta property="og:image" content="${escapeHtml(image)}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`, `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`, `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`, `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    );
    if (meta.price) tags.push(`<meta property="product:price:amount" content="${meta.price.amount}" />`, `<meta property="product:price:currency" content="${meta.price.currency}" />`);
  }
  (meta.jsonLd || []).forEach((data) => tags.push(`<script type="application/ld+json">${safeJson(data)}</script>`));
  if (meta.ssr) tags.push(SSR_CSS);

  out = out.replace(/<\/head>/i, `${tags.filter(Boolean).join("\n")}\n</head>`);
  if (meta.ssr) out = out.replace(/(<main[^>]*id=["']pageBody["'][^>]*>)/i, `$1\n${meta.ssr}`);
  return out;
}

async function seoMiddleware(req, res, next) {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  if (req.path.startsWith("/admin")) res.set("X-Robots-Tag", "noindex, nofollow");
  // فهرست محصولات فقط برای صفحه‌های HTML دسته‌بندی؛ از فایل‌های استاتیک و API رد می‌شود.
  let listHtml = "";
  if (!/\.[a-z0-9]{2,5}$/i.test(req.path) && !req.path.startsWith("/api/")) {
    try { listHtml = await buildListHtml(req.path); } catch (error) { console.error("SEO list error:", error.message); }
  }
  const send = res.send.bind(res);
  res.send = (body) => {
    try {
      if (typeof body === "string" && /text\/html/i.test(String(res.get("Content-Type") || ""))) {
        const meta = res.locals.seo || staticMeta(req.path);
        body = insertList(applySeo(body, meta), listHtml);
      }
    } catch (error) {
      console.error("SEO inject error:", error.message);
    }
    return send(body);
  };
  next();
}

function robotsTxt() {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /api/",
    "Disallow: /cart",
    "Disallow: /checkout",
    "Disallow: /profile",
    "Disallow: /login",
    "Disallow: /search",
    "Disallow: /*?*sort=",
    "Disallow: /*?*q=",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");
}

module.exports = { SITE_URL, PAGES, staticMeta, buildProductSeo, applySeo, buildListHtml, resetListCache, seoMiddleware, robotsTxt, absoluteUrl };
