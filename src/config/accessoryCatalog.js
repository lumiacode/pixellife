// زیرمجموعهٔ لوازم جانبی هر برند: /accessories/<برند>/<نوع> (مثلاً /accessories/apple/case).
// نام دسته (category) همان مقداری است که در فرم محصول پنل ادمین انتخاب می‌شود؛ نام برند با brand محصول تطبیق می‌کند.
// «موبایل» و «گوشی» عمداً در نام دسته‌ها نیست تا لوازم جانبی با گوشی اشتباه گرفته نشوند.
const ACCESSORY_BRANDS = {
  apple: { fa: "اپل" },
  samsung: { fa: "سامسونگ" },
  xiaomi: { fa: "شیائومی" },
};

const ACCESSORY_TYPES = {
  case: { category: "قاب و کاور", menu: "قاب", title: "قاب و کاور", icon: "ti-device-mobile" },
  glass: { category: "گلس و محافظ صفحه", menu: "گلس", title: "گلس و محافظ صفحه", icon: "ti-shield" },
  charger: { category: "کابل، شارژر و آداپتور", menu: "شارژر", title: "کابل، شارژر و آداپتور", icon: "ti-charging-pile" },
  bag: { category: "کیف و جلد", menu: "کیف", title: "کیف و جلد", icon: "ti-briefcase" },
};

const ACCESSORY_PARENT_CATEGORY = "لوازم جانبی موبایل";

function resolve(brandKey, typeKey) {
  const brand = ACCESSORY_BRANDS[String(brandKey || "").toLowerCase()];
  const type = ACCESSORY_TYPES[String(typeKey || "").toLowerCase()];
  return brand && type ? { brandKey: String(brandKey).toLowerCase(), typeKey: String(typeKey).toLowerCase(), brand: brand.fa, ...type } : null;
}

const allPaths = () => Object.keys(ACCESSORY_BRANDS).flatMap((b) => Object.keys(ACCESSORY_TYPES).map((t) => `/accessories/${b}/${t}`));

module.exports = { ACCESSORY_BRANDS, ACCESSORY_TYPES, ACCESSORY_PARENT_CATEGORY, resolve, allPaths };
