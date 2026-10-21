const path = require("path");
const fs = require("fs");
const ContactMessage = require("../models/ContactMessage");
const Product = require("../models/Product");

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const viewCache = new Map();

// با هر انتشار، URL فایل‌های CSS و JS عوض می‌شود تا مرورگری که نسخهٔ
// قدیمی را با قانون کش قبلی نگه داشته نیز ناچار به دریافت نسخهٔ تازه باشد.
// نسخهٔ فایل‌های CSS/JS از روی محتوای واقعی public/css و public/js ساخته می‌شود؛ با هر تغییر فایل، آدرس عوض می‌شود
// و می‌شود بدون ریسک کهنه‌ماندن، کش بلندمدت داد. (می‌توان با ASSET_REVISION در .env هم ثابتش کرد.)
const ASSET_REVISION = process.env.ASSET_REVISION || (() => {
  try {
    const hash = require("crypto").createHash("md5");
    for (const dir of ["css", "js"]) {
      const base = path.join(__dirname, "../../public", dir);
      for (const name of fs.readdirSync(base).sort()) {
        const file = path.join(base, name);
        if (fs.statSync(file).isFile()) hash.update(name).update(fs.readFileSync(file));
      }
    }
    return hash.digest("hex").slice(0, 10);
  } catch (error) {
    return String(Date.now());
  }
})();

function injectAssetRevision(html) {
  return html.replace(
    /((?:src|href)=["']\/(?:css|js)\/[^"']+)(["'])/gi,
    (match, url, quote) => {
      if (url.includes("pl_rev=")) return match;
      return url + (url.includes("?") ? "&" : "?") + "pl_rev=" + ASSET_REVISION + quote;
    },
  );
}

function readView(filePath) {
  if (IS_PRODUCTION && viewCache.has(filePath)) return viewCache.get(filePath);
  const html = fs.readFileSync(filePath, "utf8");
  if (IS_PRODUCTION) viewCache.set(filePath, html);
  return html;
}

function sendCachedHtml(res, cacheKey, render) {
  res.set("Cache-Control", "no-cache, max-age=0, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  cacheKey = `${cacheKey}:${ASSET_REVISION}`;
  if (IS_PRODUCTION && viewCache.has(cacheKey)) {
    return res.type("html").send(viewCache.get(cacheKey));
  }
  const html = injectAssetRevision(injectPageLoader(injectBehaviorTracker(injectShoppingAssistant(injectHideSeeAll(render())))));
  if (IS_PRODUCTION) viewCache.set(cacheKey, html);
  return res.type("html").send(html);
}

const ENAMAD_URL =
  "https://trustseal.enamad.ir/?id=8068827&Code=0B0VgW3sROcQLgvl70GMahis42xHXryh";
const ENAMAD_LOGO =
  "https://trustseal.enamad.ir/logo.aspx?id=8068827&Code=0B0VgW3sROcQLgvl70GMahis42xHXryh";

const ENAMAD_STYLE = `
<style id="shared-enamad-style">
  /* clip (نه hidden): hidden روی html و body هم‌زمان، body را به ظرف اسکرول تبدیل می‌کند و position: sticky (کادر خرید، هدر) از کار می‌افتد. */
  html, body {
    max-width: 100%;
  }
  body {
    overflow-x: clip;
  }
  .footer-trust {
    display: flex;
    flex-wrap: wrap;
    max-width: 100%;
  }
  .ftrust-enamad {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 60px;
    min-width: 120px;
    padding: 6px;
    border: 1px solid var(--border, #e2e8f0);
    border-radius: var(--radius-sm, 8px);
    background: var(--bg, #f8fafc);
    box-sizing: border-box;
  }
  .ftrust-enamad img {
    max-width: 100%;
    max-height: 48px;
    height: auto;
    width: auto;
    object-fit: contain;
    display: block;
  }
  .ftrust-ecunion {
    display: flex;
    flex: 0 0 92px;
    align-items: center;
    justify-content: center;
    width: 92px;
    max-width: 92px;
    min-width: 0;
    height: 60px;
    padding: 5px;
    border: 1px solid var(--border, #e2e8f0);
    border-radius: var(--radius-sm, 8px);
    background: #fff;
    box-sizing: border-box;
    overflow: hidden;
    contain: layout paint;
  }
  .ftrust-ecunion img {
    display: block;
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .standalone-enamad-wrap {
    display: flex;
    justify-content: center;
    max-width: 1200px;
    margin: 22px auto;
    padding: 0 20px;
  }
</style>`;

// نماد اعتماد زرین‌پال (کد رسمی زرین‌پال؛ اسکریپت همان‌جا یک تصویر می‌نویسد، پس باید همین‌جا و هم‌زمان با پارس صفحه اجرا شود).
const ZARINPAL_BADGE_HTML = `<div class="ftrust-zarinpal" title="نماد اعتماد زرین‌پال">
<div id="zarinpal">
<script src="https://www.zarinpal.com/webservice/TrustCode" type="text/javascript"></script>
</div>
</div>`;

// چیدمان یکسان نمادهای اعتماد (اینماد، اتحادیه، زرین‌پال) در همهٔ صفحه‌ها؛ بعد از CSS هر صفحه می‌آید تا جایگزین استایل‌های پراکنده شود.
const TRUST_BADGES_STYLE = `
<style id="trust-badges-style">
  /* جلوگیری از اسکرول افقی؛ این قانون قبلاً فقط همراه استایل اینماد می‌آمد و صفحه‌هایی که اینماد را در خودشان دارند (فوتر مشترک) نمی‌گرفتند. */
  /* clip (نه hidden): hidden روی html و body هم‌زمان، body را به ظرف اسکرول تبدیل می‌کند و position: sticky (کادر خرید، هدر) از کار می‌افتد. */
  html, body {
    max-width: 100%;
  }
  body {
    overflow-x: clip;
  }
  .footer-trust,
  .standalone-enamad-wrap {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    max-width: 100%;
  }
  .standalone-enamad-wrap { justify-content: center; }
  .footer-trust .ftrust-enamad,
  .footer-trust .ftrust-ecunion,
  .footer-trust .ftrust-zarinpal,
  .standalone-enamad-wrap .ftrust-enamad,
  .standalone-enamad-wrap .ftrust-ecunion,
  .standalone-enamad-wrap .ftrust-zarinpal {
    order: -1;
    display: flex;
    flex: 0 1 112px;
    align-items: center;
    justify-content: center;
    width: 112px;
    min-width: 0;
    max-width: 112px;
    height: 64px;
    padding: 6px;
    margin: 0;
    border: 1px solid var(--border, #e2e8f0);
    border-radius: var(--radius-sm, 8px);
    background: #fff;
    box-sizing: border-box;
    overflow: hidden;
    contain: none;
  }
  .footer-trust .ftrust-zarinpal #zarinpal,
  .standalone-enamad-wrap .ftrust-zarinpal #zarinpal {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    margin: 0;
  }
  .footer-trust .ftrust-zarinpal a,
  .standalone-enamad-wrap .ftrust-zarinpal a {
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: 100%;
    max-height: 100%;
  }
  .footer-trust .ftrust-enamad img,
  .footer-trust .ftrust-ecunion img,
  .footer-trust .ftrust-zarinpal img,
  .standalone-enamad-wrap .ftrust-enamad img,
  .standalone-enamad-wrap .ftrust-ecunion img,
  .standalone-enamad-wrap .ftrust-zarinpal img {
    display: block;
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 50px;
    object-fit: contain;
  }
  @media (max-width: 640px) {
    .footer-bottom {
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 14px;
    }
    .footer-trust,
    .standalone-enamad-wrap { gap: 8px; }
    .standalone-enamad-wrap { padding: 0; }
    .footer-trust { justify-content: center; width: 100%; }
    .footer-trust .ftrust-enamad,
    .footer-trust .ftrust-ecunion,
    .footer-trust .ftrust-zarinpal,
    .standalone-enamad-wrap .ftrust-enamad,
    .standalone-enamad-wrap .ftrust-ecunion,
    .standalone-enamad-wrap .ftrust-zarinpal {
      flex: 0 0 auto;
      width: 92px;
      max-width: 92px;
      height: 60px;
      padding: 4px;
    }
  }
  /* متن زیر نمادهای اعتماد (تأمین و ضمانت کالا)؛ روی یک ردیف جدا و بعد از همهٔ نمادها */
  .footer-trust .footer-trust-text {
    order: 99;
    flex: 0 0 100%;
    margin: 12px 0 0;
    font-size: 12.5px;
    line-height: 2;
    color: inherit;
    opacity: .8;
    text-align: right;
  }
  @media (max-width: 640px) {
    .footer-trust .footer-trust-text { text-align: center; }
  }
</style>`;

const ENAMAD_HTML = `
<a
  referrerpolicy="origin"
  target="_blank"
  rel="noopener"
  href="${ENAMAD_URL}"
  class="ftrust-enamad"
  title="نماد اعتماد الکترونیکی"
>
  <img
    referrerpolicy="origin"
    src="${ENAMAD_LOGO}"
    alt=""
    width="120"
    height="50"
    style="cursor: pointer; display: block; max-height: 48px; width: auto;"
  />
</a>
<span
  class="ftrust-ecunion"
  title="مجوز اتحادیه کشوری کسب‌وکارهای مجازی"
>
  <img src="/images/trust/ecunion-logo.png" alt="مجوز اتحادیه کشوری کسب‌وکارهای مجازی" width="82" height="52" loading="lazy" decoding="async" />
</span>
${ZARINPAL_BADGE_HTML}`;

const MOBILE_HERO_FIX = `
<style id="mobile-hero-fit-fix">
  @media (max-width: 768px) {
    .hero-section {
      margin-bottom: 22px !important;
    }

    .hero-slider-container {
      height: auto !important;
      /* نسبت بلندتر برای موبایل؛ نزدیک به اسلایدر خانومی */
      aspect-ratio: 1.65 / 1;
      min-height: 0 !important;
      border-radius: 14px !important;
    }

    .hero-slider-track {
      height: 100% !important;
    }

    .hero-slide {
      height: 100% !important;
      min-height: 0 !important;
      padding: 0 !important;
      align-items: stretch !important;
    }

    .hero-slide img {
      width: 100% !important;
      height: 100% !important;
      display: block !important;
      object-fit: cover !important;
      object-position: center !important;
    }

    /* تصویر عمودی قبلیِ آیفون ۱۷ در قاب افقی اسلایدر بریده می‌شد.
       نسخهٔ عریض بنر فضای لازم برای گوشی و متن را در موبایل حفظ می‌کند. */
    .hero-slide.iphone-waterfall-hero img {
      object-position: 36% center !important;
    }

    .hero-nav-btn {
      width: 32px !important;
      height: 32px !important;
    }

    .hero-nav-btn.prev {
      right: 8px !important;
    }

    .hero-nav-btn.next {
      left: 8px !important;
    }

    .hero-dots {
      bottom: 8px !important;
    }

    .hero-dot {
      width: 7px !important;
      height: 7px !important;
    }

    .hero-dot.active {
      width: 20px !important;
    }
  }
</style>`;

const PROFILE_DROPDOWN_LAYER_FIX = `
<style id="profile-dropdown-layer-fix">
  .header {
    z-index: 1400 !important;
  }

  .profile-wrapper {
    z-index: 1500 !important;
  }

  .profile-dropdown {
    z-index: 1600 !important;
  }

  .navbar {
    z-index: 700 !important;
  }
</style>`;

const SHARED_CATEGORY_HEAD = `
<link rel="stylesheet" href="/css/shared-category-nav.css?v=3" />`;
const SHARED_CATEGORY_SCRIPT = `
<script src="/js/shared-category-nav.js?v=5"></script>`;

const MOBILE_BOTTOM_NAV_HEAD = `
<link rel="stylesheet" href="/css/mobile-bottom-nav.css?v=14" />`;
const MOBILE_BOTTOM_NAV_SCRIPT = `
<script src="/js/mobile-bottom-nav.js?v=16"></script>`;
const MOBILE_PRODUCT_DETAILS_HEAD = `
<link rel="stylesheet" href="/css/mobile-product-details-sheet.css?v=1" />`;
const MOBILE_PRODUCT_DETAILS_SCRIPT = `
<script src="/js/mobile-product-details-sheet.js?v=20260906-specs-panel"></script>`;
const HISTORY_SAFE_ANCHORS_SCRIPT = `
<script src="/js/history-safe-anchors.js?v=1"></script>`;
const BEHAVIOR_TRACKER_SCRIPT = `
<script src="/js/behavior-tracker.js?v=1" defer></script>`;
const CATALOG_NO_FLASH_HEAD = `
<style id="database-catalog-no-flash">.grid,.iphone-grid,.samsung-grid,.xiaomi-grid,.prod-grid,.xiaomitab-grid,.console-grid{visibility:hidden}</style>`;
const HIDE_SEE_ALL_HEAD = `
<style id="hide-see-all-links">
  a.see-all-btn,
  a.megamenu-link.see-all,
  a.mobile-category-all,
  a.brand-list-link.see-all,
  a.flyout-see-all {
    display: none !important;
  }
</style>`;
const LOCAL_FONT_HEAD = `\n<link rel="stylesheet" href="/css/local-fonts.css?v=1" />`;
const LOCAL_ICON_HEAD = `<link rel="stylesheet" href="/css/tabler-icons.min.css?v=perf-2" />`;
const PIXEL_LOADER_HEAD = "<style id=\"pixel-page-loader-style\">\n#pixel-page-loader{position:fixed;inset:0;z-index:20000;display:grid;place-items:center;background:#f8fafc;opacity:1;visibility:visible;transition:opacity .22s ease,visibility .22s ease}\n#pixel-page-loader.is-hidden{opacity:0;visibility:hidden;pointer-events:none}\n#pixel-page-loader .pixel-loader-mark{display:block;width:96px;height:104px;overflow:visible}\n#pixel-page-loader .pixel-loader-pixel{animation:pixel-loader-pulse 1.35s ease-in-out infinite}\n#pixel-page-loader .pixel-loader-pixel-0{fill:#60a5fa;animation-delay:0s}\n#pixel-page-loader .pixel-loader-pixel-1{fill:#2563eb;animation-delay:.16s}\n#pixel-page-loader .pixel-loader-pixel-2{fill:#1d4ed8;animation-delay:.32s}\n#pixel-page-loader .pixel-loader-pixel-3{fill:#3b82f6;animation-delay:.48s}\n@keyframes pixel-loader-pulse{0%,100%{opacity:.35;transform:scale(.78);transform-origin:center}50%{opacity:1;transform:scale(1)}}\n@media(prefers-reduced-motion:reduce){#pixel-page-loader .pixel-loader-pixel{animation:none;opacity:1}}\n</style>";
const PIXEL_LOADER_HTML = "<div id=\"pixel-page-loader\" role=\"status\" aria-label=\"در حال بارگذاری\"><svg class=\"pixel-loader-mark\" viewBox=\"0 0 96 104\" xmlns=\"http://www.w3.org/2000/svg\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"34\" y=\"16\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"30\" y=\"20\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"34\" y=\"20\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"38\" y=\"20\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"26\" y=\"24\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"30\" y=\"24\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"34\" y=\"24\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"38\" y=\"24\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"42\" y=\"24\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"22\" y=\"28\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"26\" y=\"28\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"30\" y=\"28\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"34\" y=\"28\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"38\" y=\"28\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"42\" y=\"28\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"46\" y=\"28\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"26\" y=\"32\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"30\" y=\"32\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"34\" y=\"32\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"38\" y=\"32\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"42\" y=\"32\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"30\" y=\"36\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"34\" y=\"36\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"38\" y=\"36\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-0\" x=\"34\" y=\"40\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"58\" y=\"30\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"54\" y=\"34\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"58\" y=\"34\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"62\" y=\"34\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"50\" y=\"38\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"54\" y=\"38\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"58\" y=\"38\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"62\" y=\"38\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"66\" y=\"38\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"46\" y=\"42\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"50\" y=\"42\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"54\" y=\"42\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"58\" y=\"42\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"62\" y=\"42\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"66\" y=\"42\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"70\" y=\"42\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"50\" y=\"46\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"54\" y=\"46\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"58\" y=\"46\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"62\" y=\"46\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"66\" y=\"46\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"54\" y=\"50\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"58\" y=\"50\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"62\" y=\"50\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-1\" x=\"58\" y=\"54\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"42\" y=\"46\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"38\" y=\"50\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"42\" y=\"50\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"46\" y=\"50\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"34\" y=\"54\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"38\" y=\"54\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"42\" y=\"54\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"46\" y=\"54\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"50\" y=\"54\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"30\" y=\"58\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"34\" y=\"58\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"38\" y=\"58\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"42\" y=\"58\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"46\" y=\"58\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"50\" y=\"58\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"54\" y=\"58\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"34\" y=\"62\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"38\" y=\"62\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"42\" y=\"62\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"46\" y=\"62\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"50\" y=\"62\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"38\" y=\"66\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"42\" y=\"66\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"46\" y=\"66\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-2\" x=\"42\" y=\"70\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"66\" y=\"60\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"62\" y=\"64\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"66\" y=\"64\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"70\" y=\"64\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"58\" y=\"68\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"62\" y=\"68\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"66\" y=\"68\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"70\" y=\"68\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"74\" y=\"68\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"54\" y=\"72\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"58\" y=\"72\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"62\" y=\"72\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"66\" y=\"72\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"70\" y=\"72\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"74\" y=\"72\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"78\" y=\"72\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"58\" y=\"76\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"62\" y=\"76\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"66\" y=\"76\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"70\" y=\"76\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"74\" y=\"76\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"62\" y=\"80\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"66\" y=\"80\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"70\" y=\"80\" width=\"3.2\" height=\"3.2\"/><rect class=\"pixel-loader-pixel pixel-loader-pixel-3\" x=\"66\" y=\"84\" width=\"3.2\" height=\"3.2\"/></svg></div>";
const PIXEL_LOADER_SCRIPT = "<script id=\"pixel-page-loader-script\">(function(){var loader=document.getElementById(\"pixel-page-loader\");if(!loader)return;var hidden=false;function hide(){if(hidden)return;hidden=true;loader.classList.add(\"is-hidden\");window.setTimeout(function(){if(loader.parentNode)loader.parentNode.removeChild(loader)},260)}function show(){hidden=false;loader.classList.remove(\"is-hidden\")}window.addEventListener(\"load\",function(){window.setTimeout(hide,80)},{once:true});window.addEventListener(\"pageshow\",hide);window.addEventListener(\"beforeunload\",show);document.addEventListener(\"click\",function(event){var link=event.target.closest&&event.target.closest(\"a\");if(!link||event.defaultPrevented||link.target===\"_blank\"||link.hasAttribute(\"download\"))return;var href=link.getAttribute(\"href\")||\"\";if(!href||href.charAt(0)===\"#\"||href.indexOf(\"javascript:\")===0)return;try{if(new URL(link.href,location.href).origin===location.origin)show()}catch(_){}} ,true);window.setTimeout(hide,2500)})();</script>";

function injectHideSeeAll(html) {
  if (!html || html.includes("hide-see-all-links")) return html;
  return html.includes("</head>")
    ? html.replace("</head>", `${HIDE_SEE_ALL_HEAD}\n</head>`)
    : html;
}

function injectLocalFonts(html) {
  if (!html) return html;
  html = html.replace(
    /<link[^>]+href=["\x27]https:\/\/fonts\.googleapis\.com\/css2[^"\x27]*["\x27][^>]*>/gi,
    "",
  );
  html = html.replace(
    /<link[^>]+href=["\x27]https:\/\/cdn\.jsdelivr\.net\/npm\/@tabler\/icons-webfont[^"\x27]*["\x27][^>]*>/gi,
    LOCAL_ICON_HEAD,
  );
  if (html.includes("</head>") && !html.includes("/css/local-fonts.css")) {
    html = html.replace("</head>", `${LOCAL_FONT_HEAD}\n</head>`);
  }
  if (html.includes("</head>") && html.includes("ti ti-") && !html.includes("/css/tabler-icons.min.css")) {
    html = html.replace("</head>", `${LOCAL_ICON_HEAD}\n</head>`);
  }
  return html;
}
function injectPageLoader(html) {
  if (!html || html.includes("pixel-page-loader-style")) return html;
  if (html.includes("</head>")) html = html.replace("</head>", PIXEL_LOADER_HEAD + "\n</head>");
  if (html.includes("<body") && html.includes("</body>")) {
    html = html.replace(/(<body[^>]*>)/i, "$1" + PIXEL_LOADER_HTML);
    html = html.replace("</body>", PIXEL_LOADER_SCRIPT + "\n</body>");
  }
  return html;
}

function injectBehaviorTracker(html) {
  if (!html || html.includes("/js/behavior-tracker.js")) return html;
  return html.includes("</body>")
    ? html.replace("</body>", `${BEHAVIOR_TRACKER_SCRIPT}\n</body>`)
    : html + BEHAVIOR_TRACKER_SCRIPT;
}

// دستیار خرید در تمام صفحه‌های عمومی فروشگاه درج می‌شود. صفحهٔ محصول از قبل
// این اسکریپت را دارد؛ شرط زیر از درج دوبارهٔ آن جلوگیری می‌کند.
const SHOPPING_ASSISTANT_SCRIPT = '<script src="/js/shopping-assistant.js?v=15" defer></script>';
function injectShoppingAssistant(html) {
  if (!html || html.includes("/js/shopping-assistant.js")) return html;
  return html.includes("</body>")
    ? html.replace("</body>", `${SHOPPING_ASSISTANT_SCRIPT}\n</body>`)
    : html + SHOPPING_ASSISTANT_SCRIPT;
}

function injectMobileBottomNav(html) {
  if (!html) return html;
  html = injectLocalFonts(html);

  if (html.includes("</head>") && !html.includes("/css/mobile-bottom-nav.css")) {
    html = html.replace("</head>", `${MOBILE_BOTTOM_NAV_HEAD}\n</head>`);
  }

  if (html.includes("</body>") && !html.includes("/js/mobile-bottom-nav.js")) {
    html = html.replace("</body>", `${MOBILE_BOTTOM_NAV_SCRIPT}\n</body>`);
  }

  return html;
}

function injectMobileProductDetailsSheet(html) {
  if (!html || html.includes("/js/mobile-product-details-sheet.js")) return html;
  if (html.includes("</head>")) html = html.replace("</head>", `${MOBILE_PRODUCT_DETAILS_HEAD}\n</head>`);
  return html.includes("</body>")
    ? html.replace("</body>", `${MOBILE_PRODUCT_DETAILS_SCRIPT}\n</body>`)
    : html;
}

function injectHistorySafeAnchors(html) {
  if (!html || html.includes("/js/history-safe-anchors.js")) return html;
  return html.includes("</body>")
    ? html.replace("</body>", `${HISTORY_SAFE_ANCHORS_SCRIPT}\n</body>`)
    : html;
}

// توکن‌های طراحی مشترک (public/css/tokens.css) به‌صورت <style> داخل صفحه‌ها می‌آیند؛ فقط نام‌های جدید --pl-* دارند و ظاهر را تغییر نمی‌دهند.
const DESIGN_TOKENS_STYLE = (() => {
  try {
    const css = fs
      .readFileSync(path.join(__dirname, "../../public/css/tokens.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ")
      .trim();
    return `<style id="pl-design-tokens">${css}</style>`;
  } catch (error) {
    console.error("Design tokens load error:", error.message);
    return "";
  }
})();

// ظاهر نسخهٔ ۲ صفحهٔ اصلی (public/css/home-v2.css)؛ فقط روی صفحهٔ اصلی و بعد از همهٔ CSSهای دیگر تزریق می‌شود.
const HOME_V2_STYLE = (() => {
  try {
    const css = fs
      .readFileSync(path.join(__dirname, "../../public/css/home-v2.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ")
      .trim();
    return `<style id="pl-home-v2">${css}</style>`;
  } catch (error) {
    console.error("Home v2 style load error:", error.message);
    return "";
  }
})();

function injectHomeV2(html) {
  if (!html || !HOME_V2_STYLE || html.includes('id="pl-home-v2"')) return html;
  return html.includes("</head>") ? html.replace("</head>", `${HOME_V2_STYLE}\n</head>`) : html;
}

// فوتر مشترک (views/partials/footer.html): همهٔ صفحه‌هایی که فوتر ندارند یا نسخهٔ قدیمی دارند، همین را می‌گیرند.
const SHARED_FOOTER_HTML = (() => {
  try {
    return fs.readFileSync(path.join(__dirname, "../../views/partials/footer.html"), "utf8").trim();
  } catch (error) {
    console.error("Shared footer load error:", error.message);
    return "";
  }
})();
const SHARED_FOOTER_PAGES = new Set(["index.html", "iphone.html", "samsung.html", "samsungtab.html", "xiaomi.html", "xiaomitab.html", "ipad.html", "console.html", "cart.html", "profile.html", "amazing.html", "search.html"]);
const FOOTER_PATTERN = /<footer\b[^>]*class="[^"]*\bfooter\b[^"]*"[^>]*>[\s\S]*?<\/footer>/i;

// ظاهر تیرهٔ فوتر (public/css/footer-v2.css) و بخش اختیاری پشتیبانی (views/partials/footer-support.html).
const FOOTER_V2_STYLE = (() => {
  try {
    const css = fs.readFileSync(path.join(__dirname, "../../public/css/footer-v2.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
    return `<style id="pl-footer-v2">${css}</style>`;
  } catch (error) {
    console.error("Footer v2 style load error:", error.message);
    return "";
  }
})();
const FOOTER_SUPPORT_HTML = (() => {
  try {
    return fs.readFileSync(path.join(__dirname, "../../views/partials/footer-support.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "").trim();
  } catch (error) {
    return "";
  }
})();

function injectSharedFooter(html, fileName) {
  if (!html || !SHARED_FOOTER_HTML || !SHARED_FOOTER_PAGES.has(fileName) || !FOOTER_PATTERN.test(html)) return html;
  const footer = SHARED_FOOTER_HTML.replace(
    "<!--FOOTER_SUPPORT-->",
    FOOTER_SUPPORT_HTML ? `<div class="pl-footer-support">${FOOTER_SUPPORT_HTML}</div>` : "",
  );
  html = html.replace(FOOTER_PATTERN, () => footer);
  if (FOOTER_V2_STYLE && !html.includes('id="pl-footer-v2"') && html.includes("</head>")) {
    html = html.replace("</head>", `${FOOTER_V2_STYLE}\n</head>`);
  }
  return html;
}

// سبد کوچک هدر برای صفحه‌هایی که خودشان ندارند (public/js/shared-minicart.js + CSS)
const SHARED_MINICART_STYLE = (() => {
  try {
    const css = fs.readFileSync(path.join(__dirname, "../../public/css/shared-minicart.css"), "utf8").replace(/\s+/g, " ").trim();
    return `<style id="pl-shared-minicart">${css}</style>`;
  } catch (error) {
    console.error("Shared minicart style load error:", error.message);
    return "";
  }
})();

const SHARED_MINICART_PAGES = new Set(["samsung.html", "samsungtab.html", "xiaomi.html", "xiaomitab.html", "ipad.html", "profile.html", "amazing.html", "search.html"]);

function injectSharedMiniCart(html, fileName) {
  if (!html || !SHARED_MINICART_STYLE || !SHARED_MINICART_PAGES.has(fileName) || !html.includes('class="cart-wrap"') || html.includes("shared-minicart.js")) return html;
  // قالب‌هایی که پوستهٔ پنجره را دارند (آیپد) استایلش را هم دارند؛ بقیه استایل را از اینجا می‌گیرند.
  if (!html.includes('id="cartDropdown"') && html.includes("</head>")) html = html.replace("</head>", `${SHARED_MINICART_STYLE}\n</head>`);
  return html.includes("</body>") ? html.replace("</body>", '<script src="/js/shared-minicart.js" defer></script>\n</body>') : html;
}

// استایل مخصوص هر صفحه (public/css/<name>-v2.css) به‌صورت <style id="pl-page-<name>"> بعد از CSSهای دیگر تزریق می‌شود.
const PAGE_STYLE_FILES = { "cart.html": "cart-v2.css", "profile.html": "profile-v2.css", "product.html": "product-v2.css" };
const PAGE_STYLES = {};
for (const [page, file] of Object.entries(PAGE_STYLE_FILES)) {
  try {
    const css = fs
      .readFileSync(path.join(__dirname, "../../public/css", file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ")
      .trim();
    PAGE_STYLES[page] = `<style id="pl-page-${page.replace(".html", "")}">${css}</style>`;
  } catch (error) {
    console.error("Page style load error:", file, error.message);
  }
}

function injectPageStyle(html, fileName) {
  const tag = PAGE_STYLES[fileName];
  if (!html || !tag || html.includes(tag.slice(0, tag.indexOf(">") + 1))) return html;
  return html.includes("</head>") ? html.replace("</head>", `${tag}\n</head>`) : html;
}

function injectDesignTokens(html) {
  if (!html || !DESIGN_TOKENS_STYLE || html.includes('id="pl-design-tokens"') || html.includes("pl-tokens:off")) return html;
  return html.includes("</head>") ? html.replace("</head>", `${DESIGN_TOKENS_STYLE}\n</head>`) : html;
}

function injectEnamadBadges(html) {
  if (!html || html.includes("trustseal.enamad.ir")) return html;

  if (html.includes("</head>")) {
    html = html.replace("</head>", `${ENAMAD_STYLE}\n</head>`);
  }

  const footerTrustPattern =
    /(<div[^>]*class=["'][^"']*\bfooter-trust\b[^"']*["'][^>]*>)/i;

  if (footerTrustPattern.test(html)) {
    return html.replace(footerTrustPattern, `$1\n${ENAMAD_HTML}`);
  }

  const wrappedBadge = `<div class="standalone-enamad-wrap">${ENAMAD_HTML}</div>`;

  if (html.includes("</footer>")) {
    return html.replace("</footer>", `${wrappedBadge}\n</footer>`);
  }

  if (html.includes("</body>")) {
    return html.replace("</body>", `${wrappedBadge}\n</body>`);
  }

  return `${html}\n${wrappedBadge}`;
}

// متن «نحوهٔ تأمین و ضمانت محصولات» زیر نمادهای اعتماد فوتر؛ از views/partials/footer-trust-text.html خوانده می‌شود.
// تا وقتی این فایل خالی باشد (فقط کامنت)، هیچ متنی نمایش داده نمی‌شود.
const FOOTER_TRUST_TEXT = (() => {
  try {
    return fs
      .readFileSync(path.join(__dirname, "../../views/partials/footer-trust-text.html"), "utf8")
      .replace(/<!--[\s\S]*?-->/g, "")
      .trim();
  } catch (error) {
    return "";
  }
})();
// بلوک «دربارهٔ پیکسل لایف» زیر فوتر تیره؛ متن از views/partials/about-site.html (هر پاراگراف با یک خط خالی جدا می‌شود).
const ABOUT_SITE_PARAGRAPHS = (() => {
  try {
    return fs
      .readFileSync(path.join(__dirname, "../../views/partials/about-site.html"), "utf8")
      .replace(/<!--[\s\S]*?-->/g, "")
      .split(/\r?\n\s*\r?\n/)
      .map((part) => part.trim())
      .filter(Boolean);
  } catch (error) {
    return [];
  }
})();
const ABOUT_SITE_STYLE = `<style id="pl-about-site-style">
.pl-about-site{background:#f6f7f9;border-top:1px solid #e5e7eb;padding:22px 16px;direction:rtl}
.pl-about-site__inner{max-width:1200px;margin:0 auto}
.pl-about-site h2{margin:0 0 8px;font-size:15px;font-weight:800;color:#1e293b}
.pl-about-site__text{position:relative;font-size:13px;line-height:2;color:#475569;max-height:6.2em;overflow:hidden;transition:max-height .3s ease}
.pl-about-site__text p{margin:0 0 8px}
.pl-about-site:not(.is-open) .pl-about-site__text::after{content:"";position:absolute;inset:auto 0 0 0;height:2.2em;background:linear-gradient(to bottom,rgba(246,247,249,0),#f6f7f9)}
.pl-about-site__toggle{margin-top:6px;padding:0;border:0;background:none;color:#2563eb;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.pl-about-site__toggle:hover{text-decoration:underline;text-underline-offset:4px}
@media(max-width:768px){.pl-about-site{padding:18px 16px 84px}}
</style>`;
const ABOUT_SITE_SCRIPT = `<script>(function(){var s=document.getElementById("plAboutSite");if(!s)return;var t=s.querySelector(".pl-about-site__text"),b=s.querySelector(".pl-about-site__toggle");if(!t||!b)return;b.addEventListener("click",function(){var o=s.classList.toggle("is-open");t.style.maxHeight=o?t.scrollHeight+"px":"";b.textContent=o?"بستن":"مشاهده بیشتر";b.setAttribute("aria-expanded",o?"true":"false");});})();</script>`;

// نوار بالای سایت با اسکرول به پایین پنهان و با اسکرول به بالا نمایان می‌شود (public/js/header-autohide.js).
const HEADER_AUTOHIDE_STYLE = `<style id="pl-header-autohide-style">
.header,.navbar{transition:transform .28s ease}
html.pl-hdr-hidden .header{transform:translateY(-100%);box-shadow:none}
html.pl-hdr-hidden .navbar{transform:translateY(calc(-1 * var(--pl-hide-y,120px)));pointer-events:none}
html.pl-hdr-hidden .header{pointer-events:none}
html.pl-hdr-hidden .desktop-purchase-card{top:16px!important}
html.pl-hdr-hidden body.mobile-product-flow-active .product-gallery,html.pl-hdr-hidden body.mobile-product-flow-active .mobile-product-section-nav{top:0!important}
.desktop-purchase-card,body.mobile-product-flow-active .product-gallery,body.mobile-product-flow-active .mobile-product-section-nav{transition:top .28s ease}
@media (max-width:768px){html,body{overflow-x:clip!important}}
@media (prefers-reduced-motion:reduce){.header,.navbar{transition:none}}
</style>`;

// تکمیل پروفایل اجباری (نام، نام خانوادگی، آدرس) پیش از خرید: public/js/profile-gate.js
// پیشنهاد جستجو هنگام تایپ در نوار جستجوی هدر: public/js/search-suggest.js
function injectSearchSuggest(html) {
  if (!html || html.includes("search-suggest.js") || !html.includes('id="searchInput"') || !html.includes("</body>")) return html;
  return html.replace("</body>", '<script src="/js/search-suggest.js" defer></script>\n</body>');
}

function injectProfileGate(html) {
  if (!html || html.includes("profile-gate.js") || !html.includes("</body>")) return html;
  return html.replace("</body>", '<script src="/js/profile-gate.js" defer></script>\n</body>');
}

function injectHeaderAutohide(html) {
  if (!html || html.includes("header-autohide.js") || !/<header\b[^>]*class=["'][^"']*\bheader\b/i.test(html)) return html;
  if (html.includes("</head>")) html = html.replace("</head>", `${HEADER_AUTOHIDE_STYLE}\n</head>`);
  return html.includes("</body>") ? html.replace("</body>", '<script src="/js/header-autohide.js" defer></script>\n</body>') : html;
}

function injectAboutSite(html) {
  if (!html || !ABOUT_SITE_PARAGRAPHS.length || html.includes('id="plAboutSite"')) return html;
  // صفحه‌هایی که فوتر تیره ندارند، بلوک را انتهای صفحه (بعد از نمادهای اعتماد) می‌گیرند.
  let end = html.lastIndexOf("</footer>");
  const hasFooter = end !== -1;
  if (!hasFooter) {
    end = html.lastIndexOf("</body>");
    if (end === -1) return html;
  }
  const block = `<section class="pl-about-site" id="plAboutSite" aria-label="درباره پیکسل لایف"><div class="pl-about-site__inner"><h2>درباره پیکسل لایف</h2><div class="pl-about-site__text">${ABOUT_SITE_PARAGRAPHS.map((part) => `<p>${part}</p>`).join("")}</div><button type="button" class="pl-about-site__toggle" aria-expanded="false">مشاهده بیشتر</button></div></section>${ABOUT_SITE_SCRIPT}`;
  const at = hasFooter ? end + "</footer>".length : end;
  html = html.slice(0, at) + "\n" + block + html.slice(at);
  return html.includes("</head>") ? html.replace("</head>", `${ABOUT_SITE_STYLE}\n</head>`) : html;
}
const TRUST_ICON_PLACEHOLDERS = /<div\s+class=["']ftrust["']\s*>\s*<i\s+class=["']ti ti-(?:certificate|shield-check|star)["']\s*><\/i>\s*<\/div>\s*/gi;

// نمادهای اعتماد: چیدمان یکسان + افزودن نماد زرین‌پال به صفحه‌هایی که اینماد را از قبل در خود فایل دارند (مثل index.html).
function injectEnamad(html) {
  if (!html) return html;
  html = injectEnamadBadges(html);
  if (!html.includes("trust-badges-style") && html.includes("</head>")) {
    html = html.replace("</head>", `${TRUST_BADGES_STYLE}\n</head>`);
  }
  if (!html.includes("webservice/TrustCode")) {
    const ecunionPattern = /(<span[^>]*class=["']ftrust-ecunion["'][^>]*>[\s\S]*?<\/span>)/i;
    if (ecunionPattern.test(html)) html = html.replace(ecunionPattern, `$1\n${ZARINPAL_BADGE_HTML}`);
  }
  // سه آیکن تزئینی کنار نمادهای اصلی حذف می‌شوند.
  html = html.replace(TRUST_ICON_PLACEHOLDERS, "");
  if (FOOTER_TRUST_TEXT && !html.includes('class="footer-trust-text"')) {
    const trustOpen = /(<div[^>]*class=["'][^"']*\bfooter-trust\b[^"']*["'][^>]*>)/i;
    html = html.replace(trustOpen, `$1\n<p class="footer-trust-text">${FOOTER_TRUST_TEXT}</p>`);
  }
  return injectSearchSuggest(injectProfileGate(injectHeaderAutohide(injectAboutSite(html))));
}

function injectSharedCategoryNav(html) {
  if (!html || !html.includes('class="nav-cats-wrap"')) return html;

  if (!html.includes("/css/shared-category-nav.css")) {
    html = html.replace("</head>", `${SHARED_CATEGORY_HEAD}\n</head>`);
  }

  if (!html.includes("/js/shared-category-nav.js")) {
    html = html.replace("</body>", `${SHARED_CATEGORY_SCRIPT}\n</body>`);
  }

  return html;
}

function injectDatabaseCatalog(html) {
  const catalogGrids = [
    'class="grid"', 'class="iphone-grid"', 'class="samsung-grid"',
    'class="xiaomi-grid"', 'class="prod-grid"', 'class="xiaomitab-grid"',
    'class="console-grid"',
  ];
  if (!html || !catalogGrids.some((marker) => html.includes(marker))) return html;

  if (html.includes("</head>") && !html.includes("database-catalog-no-flash")) {
    html = html.replace("</head>", `${CATALOG_NO_FLASH_HEAD}\n</head>`);
  }

  // فقط یک رندرکنندهٔ کارت بارگذاری شود؛ نسخهٔ قدیمی بعد از نسخهٔ جدید
  // کارت‌ها را بازنویسی می‌کرد و تایمر/درصد پیشنهاد شگفت‌انگیز را حذف می‌کرد.
  html = html.replace(
    /<script[^>]+src=["']\/js\/database-catalog\.js(?:\?v=[^"'\s>]*)?["'][^>]*><\/script>\s*/g,
    "",
  );

  // نسخهٔ اسکریپت را همیشه یکسان‌سازی می‌کنیم تا HTML قدیمیِ قالب یا کش
  // مرورگر نتواند فایل کاتالوگ قبلی را دوباره اجرا کند.
  const catalogScript = '<script src="/js/database-catalog-amazing-v1.js?v=5"></script>';
  if (html.includes("/js/database-catalog-amazing-v1.js")) {
    return html.replace(
      /<script[^>]+src=["']\/js\/database-catalog-amazing-v1\.js(?:\?[^"']*)?["'][^>]*><\/script>/i,
      catalogScript,
    );
  }
  return html.replace("</body>", catalogScript + "\n</body>");
}

function sendViewWithEnamad(res, fileName) {
  const filePath = path.join(__dirname, `../../views/${fileName}`);

  try {
    sendCachedHtml(res, `rendered:${fileName}`, () => {
      let html = readView(filePath);
      html = injectPageStyle(injectDesignTokens(injectEnamad(injectSharedMiniCart(injectSharedFooter(html, fileName), fileName))), fileName);
      html = injectSharedCategoryNav(html);
      html = injectMobileBottomNav(html);
    html = injectHistorySafeAnchors(html);
      if (fileName === "product.html") html = injectMobileProductDetailsSheet(html);
      return injectAssetRevision(injectDatabaseCatalog(html));
    });
  } catch (error) {
    console.error(`View render error (${fileName}):`, error);
    res.status(500).send("خطا در بارگذاری صفحه");
  }
}

function escapeCatalogText(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeCatalogImage(value) {
  const image = String(value || "").trim();
  if (!image) return "/images/product-placeholder.svg";
  if (/^(?:https?:\/\/|data:)/i.test(image)) return image;
  return "/" + image.replace(/^\/?(?:public\/)?/, "");
}

function renderServerCatalogCard(product) {
  const name = escapeCatalogText(product.name);
  const brand = escapeCatalogText(product.brand);
  const slug = encodeURIComponent(String(product.slug || ""));
  const stock = Math.max(0, Number(product.stock) || 0);
  const outOfStock = product.availability === "out" || stock <= 0;
  const image = normalizeCatalogImage(product.mainImage || (Array.isArray(product.images) && product.images[0]));
  const originalPrice = Math.max(0, Number(product.price) || 0);
  const discount = Math.min(99, Math.max(0, Number(product.discount) || 0));
  const finalPrice = discount > 0 ? Math.round(originalPrice * (100 - discount) / 100) : originalPrice;
  const status = outOfStock
    ? '<span class="pl-catalog-status out"><i class="ti ti-circle-x"></i> ناموجود</span>'
    : '<span class="pl-catalog-status in"><i class="ti ti-circle-check"></i> موجود</span>';
  const price = outOfStock
    ? ""
    : '<div class="pl-catalog-prices"><span class="pl-catalog-price">' +
      finalPrice.toLocaleString("fa-IR") + " تومان</span></div>";
  return '<a href="/product?id=' + slug + '" class="iphone-card pl-catalog-card" data-stock="' +
    (outOfStock ? 0 : stock) + '" style="color:inherit;text-decoration:none;position:relative">' +
    '<div class="iphone-card-image"><img src="' + escapeCatalogText(image) + '" alt="' + name +
    '" loading="lazy" decoding="async"></div><div class="iphone-card-body pl-catalog-body">' +
    '<div class="pl-catalog-brand">' + brand + '</div><div class="iphone-card-name">' + name +
    '</div><div class="pl-catalog-footer"><div class="pl-catalog-stock">' + status +
    "</div>" + price + "</div></div></a>";
}

async function loadMobileCatalogFallback() {
  try {
    const category = /^\s*(?:موبایل|mobile|گوشی موبایل|گوشی|phone|آیفون|ایفون|iphone|گوشی اپل|apple phone)\s*$/i;
    const name = /^(?!.*(?:ipad|آیپد|ایپد|tablet|تبلت|galaxy\s*tab|xiaomi\s*pad|redmi\s*pad))(?:گوشی\s*موبایل|iphone|آیفون|ایفون|سامسونگ\s*galaxy|samsung\s*galaxy|شیائومی\s*(?:mi|redmi|poco)?|xiaomi\s*(?:mi|redmi|poco)?|redmi|poco)/i;
    const products = await Product.find({ $or: [{ category }, { name }] })
      .select("name slug brand price discount availability images mainImage stock createdAt")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return products.map(renderServerCatalogCard).join("");
  } catch (error) {
    console.error("Mobile catalog server fallback error:", error);
    return "";
  }
}

async function sendSpecialCatalogView(res, options) {
  // صفحهٔ هدفون و ساعت با همان قالب کامل آیفون رندر می‌شود: هدر، ورود،
  // سبد خرید و کارت‌ها دقیقاً با صفحات اصلی فروشگاه هم‌ظاهر هستند.
  const filePath = path.join(__dirname, "../../views/iphone.html");
  const key = `special-catalog:${options.slug}:${ASSET_REVISION}`;

  try {
    res.set("Cache-Control", "no-cache, max-age=0, must-revalidate");
    if (IS_PRODUCTION && viewCache.has(key)) {
      return res.type("html").send(viewCache.get(key));
    }

    let html = readView(filePath);
    const gridStart = html.indexOf('<div class="iphone-grid">');
    const gridEnd = html.indexOf(
      "<!-- End of iphone-grid — nothing else follows -->",
    );
    if (gridStart !== -1 && gridEnd !== -1) {
      html =
        html.slice(0, gridStart) +
        '<div class="iphone-grid" aria-live="polite"></div>\n      ' +
        html.slice(gridEnd);
    }

    // صفحهٔ موبایل از ابتدا کارت‌های دیتابیس را داخل HTML دارد. اسکریپت
    // مرورگر آن‌ها را ارتقا می‌دهد، اما شکست یا کش قدیمی دیگر صفحه را خالی نمی‌کند.
    if (options.slug === "mobiles") {
      const serverCards = await loadMobileCatalogFallback();
      if (serverCards) {
        html = html.replace(
          '<div class="iphone-grid" aria-live="polite"></div>',
          '<div class="iphone-grid" aria-live="polite" style="visibility:visible">' + serverCards + "</div>",
        );
      }
    }

    html = html
      .replace(
        /<title>[\s\S]*?<\/title>/,
        `<title>${options.title} | PixelLife</title>`,
      )
      .replace(
        /<div class="iphone-page-title">[\s\S]*?<\/div>/,
        `<div class="iphone-page-title">${options.heading}</div>`,
      )
      .replace(
        /<div class="iphone-page-subtitle">[\s\S]*?<\/div>/,
        `<div class="iphone-page-subtitle">${options.description}</div>`,
      )
      .replace(
        /<svg width="32" height="32" viewBox="0 0 24 24" fill="none">[\s\S]*?<\/svg>\s*<div>/,
        `<i class="ti ${options.icon}" style="font-size:32px;color:var(--text-2)"></i><div>`,
      );

    html = injectDesignTokens(injectEnamad(injectSharedMiniCart(injectSharedFooter(html, "iphone.html"), "iphone.html")));
    html = injectSharedCategoryNav(html);
    html = injectMobileBottomNav(html);
    html = injectHistorySafeAnchors(html);
    html = injectAssetRevision(injectPageLoader(injectBehaviorTracker(injectShoppingAssistant(injectHideSeeAll(injectDatabaseCatalog(html))))));
    if (IS_PRODUCTION) viewCache.set(key, html);
    res.type("html").send(html);
  } catch (error) {
    console.error(`Special catalog view render error (${options.slug}):`, error);
    res.status(500).send("خطا در بارگذاری صفحه");
  }
}

function sendAccessoryBrandView(res, brand) {
  const filePath = path.join(__dirname, "../../views/iphone.html");
  const brandName = String(brand || "").trim();

  try {
    res.set("Cache-Control", "no-cache, max-age=0, must-revalidate");
    if (IS_PRODUCTION && viewCache.has(`accessory:${brandName}`)) {
      return res.type("html").send(viewCache.get(`accessory:${brandName}`));
    }
    let html = readView(filePath);
    const pageTitle = `لوازم جانبی ${brandName}`;

    // کارت‌های نمونهٔ آیفون فقط برای طراحی اولیهٔ قالب هستند. در صفحهٔ لوازم
    // جانبی نباید حتی برای یک لحظه نمایش داده شوند.
    const gridStart = html.indexOf('<div class="iphone-grid">');
    const gridEnd = html.indexOf('<!-- End of iphone-grid — nothing else follows -->');
    if (gridStart !== -1 && gridEnd !== -1) {
      html =
        html.slice(0, gridStart) +
        '<div class="iphone-grid" aria-live="polite"></div>\n      ' +
        html.slice(gridEnd);
    }

    // صفحهٔ فهرست آیفون، ساختار کارت و ریسپانسیو استاندارد فروشگاه را دارد؛
    // با تغییر عنوان و داده‌های کاتالوگ، برای هر برند لوازم جانبی بازاستفاده می‌شود.
    html = html
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${pageTitle} | PixelLife</title>`)
      .replace(
        /<div class="iphone-page-title">[\s\S]*?<\/div>/,
        `<div class="iphone-page-title">${pageTitle}</div>`,
      )
      .replace(
        /<div class="iphone-page-subtitle">[\s\S]*?<\/div>/,
        `<div class="iphone-page-subtitle">جدیدترین لوازم جانبی موبایل ${brandName}</div>`,
      )
      .replace(
        /<svg width="32" height="32" viewBox="0 0 24 24" fill="none">[\s\S]*?<\/svg>\s*<div>/,
        '<i class="ti ti-headphones" style="font-size:32px;color:var(--text-2)"></i><div>',
      )
      .replace(
        "/js/database-catalog.js?v=20260820-card-design-10",
        "/js/database-catalog.js?v=20260821-accessories-4",
      );
    html = injectDesignTokens(injectEnamad(injectSharedMiniCart(injectSharedFooter(html, "iphone.html"), "iphone.html")));
    html = injectSharedCategoryNav(html);
    html = injectMobileBottomNav(html);
    html = injectHistorySafeAnchors(html);
    html = injectAssetRevision(injectPageLoader(injectShoppingAssistant(injectHideSeeAll(injectDatabaseCatalog(html)))));
    if (IS_PRODUCTION) viewCache.set(`accessory:${brandName}`, html);
    res.type("html").send(html);
  } catch (error) {
    console.error(`Accessory view render error (${brandName}):`, error);
    res.status(500).send("خطا در بارگذاری صفحه");
  }
}

const homeController = {
  index: (req, res) => {
    const indexPath = path.join(__dirname, "../../views/index.html");

    try {
      res.set("Cache-Control", "no-cache, max-age=0, must-revalidate");
      if (IS_PRODUCTION && viewCache.has("rendered:index")) {
        return res.type("html").send(viewCache.get("rendered:index"));
      }
      let html = readView(indexPath);

      if (html.includes("</head>")) {
        html = html.replace(
          "</head>",
          `${MOBILE_HERO_FIX}\n${PROFILE_DROPDOWN_LAYER_FIX}\n${SHARED_CATEGORY_HEAD}\n</head>`,
        );
      }

      if (!html.includes("/js/shared-category-nav.js")) {
        html = html.replace("</body>", `${SHARED_CATEGORY_SCRIPT}\n</body>`);
      }

      html = injectHomeV2(html);

      html = injectAssetRevision(injectPageLoader(injectBehaviorTracker(injectShoppingAssistant(injectHideSeeAll(injectHistorySafeAnchors(injectMobileBottomNav(injectDesignTokens(injectEnamad(injectSharedFooter(html, "index.html"))))))))));
      if (IS_PRODUCTION) viewCache.set("rendered:index", html);
      res.type("html").send(html);
    } catch (error) {
      console.error("Homepage render error:", error);
      res.status(500).send("خطا در بارگذاری صفحه اصلی");
    }
  },
  contact: (req, res) => sendViewWithEnamad(res, "contact.html"),
  terms: (req, res) => sendViewWithEnamad(res, "terms.html"),
  submitContact: async (req, res) => {
    const { name, phone, email, subject, message } = req.body || {};

    if (!name || !phone || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "لطفا همه فیلدهای ضروری را تکمیل کنید.",
      });
    }

    try {
      const savedMessage = await ContactMessage.create({
        name,
        phone,
        email: email || null,
        subject,
        message,
      });

      return res.status(201).json({
        success: true,
        message: "پیام شما با موفقیت ثبت شد.",
        data: {
          id: savedMessage._id,
        },
      });
    } catch (error) {
      console.error("Contact form save error:", error);

      return res.status(500).json({
        success: false,
        message: "خطا در ثبت پیام. دوباره تلاش کنید.",
      });
    }
  },
  mobiles: (req, res) =>
    sendSpecialCatalogView(res, {
      slug: "mobiles",
      title: "همه محصولات موبایل",
      heading: "همه محصولات موبایل",
      description: "تمام گوشی‌های موبایل را یک‌جا بررسی و مقایسه کنید.",
      icon: "ti-device-mobile",
    }),
  categories: (req, res) => sendViewWithEnamad(res, "categories.html"),
  // صفحهٔ قدیمی login.html فقط نمایشی بود (کد تأیید نمی‌فرستاد)؛ ورود واقعی با مودال مشترک سایت انجام می‌شود.
  login: (req, res) => res.redirect(302, "/?openLogin=1"),
  cart: (req, res) => {
    // منطق پرداخت نباید هرگز با نسخهٔ قبلی مرورگر یا CDN اجرا شود.
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    sendViewWithEnamad(res, "cart.html");
  },
  checkout: (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    sendViewWithEnamad(res, "checkout.html");
  },
  iphone: (req, res) => sendViewWithEnamad(res, "iphone.html"),
  product: (req, res) => sendViewWithEnamad(res, "product.html"),
  samsung: (req, res) => sendViewWithEnamad(res, "samsung.html"),
  xiaomi: (req, res) => sendViewWithEnamad(res, "xiaomi.html"),
  accessoriesAll: (req, res) =>
    sendSpecialCatalogView(res, {
      slug: "accessories",
      title: "همه لوازم جانبی موبایل",
      heading: "همه لوازم جانبی موبایل",
      description: "تمام لوازم جانبی موبایل، از کابل و شارژر تا محصولات جدید، یک‌جا.",
      icon: "ti-devices",
    }),
  accessoriesChargers: (req, res) =>
    sendSpecialCatalogView(res, {
      slug: "accessories-chargers",
      title: "کابل، شارژر و آداپتور",
      heading: "کابل، شارژر و آداپتور",
      description: "کابل، شارژر و آداپتورهای موبایل را یک‌جا بررسی و انتخاب کنید.",
      icon: "ti-charging-pile",
    }),
  accessoriesApple: (req, res) => sendAccessoryBrandView(res, "اپل"),
  accessoriesSamsung: (req, res) => sendAccessoryBrandView(res, "سامسونگ"),
  accessoriesXiaomi: (req, res) => sendAccessoryBrandView(res, "شیائومی"),
  samsungtab: (req, res) => sendViewWithEnamad(res, "samsungtab.html"),
  ipad: (req, res) => sendViewWithEnamad(res, "ipad.html"),
  tablets: (req, res) =>
    sendSpecialCatalogView(res, {
      slug: "tablets",
      title: "همه تبلت‌ها",
      heading: "همه محصولات تبلت",
      description: "تبلت‌های تمام برندها را یک‌جا بررسی و مقایسه کنید.",
      icon: "ti-device-tablet",
    }),
  xiaomitab: (req, res) => sendViewWithEnamad(res, "xiaomitab.html"),
  // این دو دسته از قالب فهرست مشترک استفاده می‌کنند، اما عنوان، فیلترها و
  // تصویر کارت مخصوص خودشان را دارند.
  headphones: (req, res) =>
    sendSpecialCatalogView(res, {
      slug: "headphones",
      title: "هدفون و هندزفری",
      heading: "خرید هدفون و هندزفری",
      description: "مدل‌های اپل و سامسونگ را یک‌جا مقایسه و انتخاب کنید.",
      icon: "ti-headphones",
      filters:
        '<div class="filters"><a class="filter active" href="/headphones">همه هدفون‌ها</a><a class="filter" href="/headphones?brand=%D8%A7%D9%BE%D9%84">اپل</a><a class="filter" href="/headphones?brand=%D8%B3%D8%A7%D9%85%D8%B3%D9%88%D9%86%DA%AF">سامسونگ</a></div>',
    }),
  smartwatches: (req, res) =>
    sendSpecialCatalogView(res, {
      slug: "smartwatches",
      title: "ساعت هوشمند",
      heading: "خرید ساعت هوشمند",
      description: "جدیدترین ساعت‌های هوشمند اپل و سامسونگ را بررسی کنید.",
      icon: "ti-device-watch",
      filters:
        '<div class="filters"><a class="filter active" href="/smartwatches">همه ساعت‌ها</a><a class="filter" href="/smartwatches?brand=%D8%A7%D9%BE%D9%84">اپل</a><a class="filter" href="/smartwatches?brand=%D8%B3%D8%A7%D9%85%D8%B3%D9%88%D9%86%DA%AF">سامسونگ</a></div>',
    }),
  console: (req, res) =>
    sendSpecialCatalogView(res, {
      slug: "console",
      title: "همه کنسول‌های بازی",
      heading: "همه محصولات کنسول بازی",
      description: "کنسول‌های بازی تمام برندها را یک‌جا بررسی و مقایسه کنید.",
      icon: "ti-device-gamepad-2",
    }),
  amazing: (req, res) => sendViewWithEnamad(res, "amazing.html"),
  search: (req, res) => sendViewWithEnamad(res, "search.html"),
  profile: (req, res) => sendViewWithEnamad(res, "profile.html"),
};

module.exports = homeController;
