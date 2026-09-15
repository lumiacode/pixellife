(() => {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const configs = {
    "/headphones": { grid: ".iphone-grid", card: "iphone-card", name: "iphone-card-name", image: "iphone-card-image", body: "iphone-card-body", desc: "iphone-card-desc", category: "هدفون و هندزفری", title: "هدفون و هندزفری", noFallback: true },
    "/smartwatches": { grid: ".iphone-grid", card: "iphone-card", name: "iphone-card-name", image: "iphone-card-image", body: "iphone-card-body", desc: "iphone-card-desc", category: "ساعت هوشمند", title: "ساعت هوشمند", noFallback: true },
    // مسیر /mobiles با قالب مشترک iphone.html رندر می‌شود؛ گرید درست همان .iphone-grid است.
    "/mobiles": { grid: ".iphone-grid", card: "iphone-card", name: "iphone-card-name", image: "iphone-card-image", body: "iphone-card-body", desc: "iphone-card-desc", category: "موبایل", title: "همه محصولات موبایل", noFallback: true },
    "/iphone": { grid: ".iphone-grid", card: "iphone-card", name: "iphone-card-name", image: "iphone-card-image", body: "iphone-card-body", desc: "iphone-card-desc", brand: "اپل", category: "موبایل", noFallback: true },
    "/mobile/apple": { grid: ".iphone-grid", card: "iphone-card", name: "iphone-card-name", image: "iphone-card-image", body: "iphone-card-body", desc: "iphone-card-desc", brand: "اپل", category: "موبایل", noFallback: true },
    "/samsung": { grid: ".samsung-grid", card: "samsung-card", name: "samsung-card-name", image: "samsung-card-image", body: "samsung-card-body", desc: "samsung-card-desc", brand: "سامسونگ", category: "موبایل", noFallback: true },
    "/xiaomi": { grid: ".xiaomi-grid", card: "xiaomi-card", name: "xiaomi-card-name", image: "xiaomi-card-image", body: "xiaomi-card-body", desc: "xiaomi-card-desc", brand: "شیائومی", category: "موبایل", noFallback: true },
    "/accessories": { grid: ".iphone-grid", card: "iphone-card", name: "iphone-card-name", image: "iphone-card-image", body: "iphone-card-body", desc: "iphone-card-desc", category: "لوازم جانبی موبایل", title: "همه لوازم جانبی موبایل", noFallback: true },
    "/accessories/chargers": { grid: ".iphone-grid", card: "iphone-card", name: "iphone-card-name", image: "iphone-card-image", body: "iphone-card-body", desc: "iphone-card-desc", category: "کابل، شارژر و آداپتور", title: "کابل، شارژر و آداپتور", noFallback: true },
    "/accessories/apple": { grid: ".iphone-grid", card: "iphone-card", name: "iphone-card-name", image: "iphone-card-image", body: "iphone-card-body", desc: "iphone-card-desc", brand: "اپل", category: "لوازم جانبی موبایل", noFallback: true },
    "/accessories/samsung": { grid: ".iphone-grid", card: "iphone-card", name: "iphone-card-name", image: "iphone-card-image", body: "iphone-card-body", desc: "iphone-card-desc", brand: "سامسونگ", category: "لوازم جانبی موبایل", noFallback: true },
    "/accessories/xiaomi": { grid: ".iphone-grid", card: "iphone-card", name: "iphone-card-name", image: "iphone-card-image", body: "iphone-card-body", desc: "iphone-card-desc", brand: "شیائومی", category: "لوازم جانبی موبایل", noFallback: true },
    "/tablets": { grid: ".iphone-grid", card: "iphone-card", name: "iphone-card-name", image: "iphone-card-image", body: "iphone-card-body", desc: "iphone-card-desc", category: "تبلت", title: "همه محصولات تبلت", noFallback: true },
    "/ipad": { grid: ".prod-grid", card: "prod-card", name: "prod-card-name", image: "prod-card-image", body: "prod-card-body", desc: "prod-card-desc", brand: "اپل", category: "تبلت", noFallback: true },
    "/samsungtab": { grid: ".prod-grid", card: "prod-card", name: "prod-card-name", image: "prod-card-image", body: "prod-card-body", desc: "prod-card-desc", brand: "سامسونگ", category: "تبلت", noFallback: true },
    "/xiaomitab": { grid: ".xiaomitab-grid", card: "xiaomitab-card", name: "xiaomitab-card-name", image: "xiaomitab-card-image", body: "xiaomitab-card-body", desc: "xiaomitab-card-desc", brand: "شیائومی", category: "تبلت", noFallback: true },
    // دسته‌ای که پنل ادمین برای کنسول‌ها ذخیره می‌کند «کنسول بازی» است.
    // نبودن تطابق دقیق باعث نمایش کارت‌های نمونهٔ ناقص می‌شد.
    // مسیر /console با قالب مشترک iphone.html رندر می‌شود؛ بنابراین باید
    // همان گرید و کلاس‌های آن قالب را هدف بگیرد، نه .console-grid قدیمی.
    "/console": { grid: ".iphone-grid", card: "iphone-card", name: "iphone-card-name", image: "iphone-card-image", body: "iphone-card-body", desc: "iphone-card-desc", category: "کنسول بازی", noFallback: true },
  };

  const config = configs[path];
  if (!config) return;
  if (config.title) document.title = config.title + " | پیکسل لایف";
  const grid = document.querySelector(config.grid);
  if (!grid) return;
  const isAccessoryCatalog = path.startsWith("/accessories/");
  if (isAccessoryCatalog) document.body.classList.add("accessory-catalog-page");

  if (!document.getElementById("database-catalog-image-style")) {
    const style = document.createElement("style");
    style.id = "database-catalog-image-style";
    style.textContent = "html{scroll-behavior:auto!important}.pl-catalog-card{display:flex!important;flex-direction:column!important;align-self:stretch!important;box-sizing:border-box!important;height:auto!important;min-height:0!important;padding:12px!important;background:#fff!important;border:0!important;border-inline-end:1px solid #e5e7eb!important;border-block-end:1px solid #e5e7eb!important;border-radius:0!important;box-shadow:none!important;overflow:hidden!important;transition:none!important}.pl-catalog-card:hover{transform:none!important;border-color:#e5e7eb!important;box-shadow:none!important}.pl-catalog-media,.pl-catalog-image,.pl-catalog-card .iphone-card-image,.pl-catalog-card .samsung-card-image,.pl-catalog-card .xiaomi-card-image,.pl-catalog-card .prod-card-image,.pl-catalog-card .xiaomitab-card-image,.pl-catalog-card .console-card-image{box-sizing:border-box!important;height:250px!important;min-height:250px!important;flex:0 0 250px!important;display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;align-self:center!important;margin:44px auto 12px!important;padding:8px!important;background:#fff!important;border:0!important;border-radius:10px!important;overflow:hidden!important;position:relative!important}.pl-catalog-media img,.pl-catalog-image img,.pl-catalog-card .iphone-card-image img,.pl-catalog-card .samsung-card-image img,.pl-catalog-card .xiaomi-card-image img,.pl-catalog-card .prod-card-image img,.pl-catalog-card .xiaomitab-card-image img,.pl-catalog-card .console-card-image img{width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;object-position:center center!important;display:block!important;margin:0!important;transform:none!important;position:static!important}.pl-catalog-body{display:flex!important;flex:1 1 auto!important;min-width:0!important;min-height:0!important;flex-direction:column!important;overflow:visible!important;margin:0!important;padding:0 2px!important}.pl-catalog-brand{font-size:12px!important;line-height:18px!important;height:18px!important;overflow:hidden!important;color:#64748b!important;margin:0 0 3px!important}.pl-catalog-card .iphone-card-name,.pl-catalog-card .samsung-card-name,.pl-catalog-card .xiaomi-card-name,.pl-catalog-card .prod-card-name,.pl-catalog-card .xiaomitab-card-name,.pl-catalog-card .console-card-name,.pl-catalog-card .card-name{font-size:15px!important;font-weight:800!important;line-height:25px!important;height:50px!important;min-height:50px!important;margin:0!important;color:#172033!important;overflow:hidden!important;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical!important}.pl-catalog-card .iphone-card-desc,.pl-catalog-card .samsung-card-desc,.pl-catalog-card .xiaomi-card-desc,.pl-catalog-card .prod-card-desc,.pl-catalog-card .xiaomitab-card-desc,.pl-catalog-card .console-card-desc{font-size:12px!important;line-height:20px!important;height:40px!important;min-height:40px!important;margin:4px 0!important;color:#718096!important;overflow:hidden!important;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical!important}.pl-catalog-color-dots{position:absolute!important;top:10px!important;left:10px!important;display:flex!important;flex-direction:column!important;gap:5px!important;z-index:2!important}.pl-catalog-color-dot{width:10px!important;height:10px!important;border:1px solid rgba(15,23,42,.18)!important;box-shadow:0 1px 2px rgba(15,23,42,.18)!important;border-radius:50%!important}.pl-catalog-footer{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;min-height:34px!important;margin:4px 0 0!important;padding-top:7px!important;border-top:0!important;overflow:hidden!important}.pl-catalog-status{display:inline-flex!important;align-items:center!important;gap:5px!important;font-size:12px!important;font-weight:700!important;white-space:nowrap!important}.pl-catalog-status.in{color:#16803a!important}.pl-catalog-status.out{color:#c2413a!important}.pl-catalog-price{font-size:14px!important;font-weight:800!important;color:#172033!important;white-space:nowrap!important}.pl-catalog-loading{grid-column:1/-1;min-height:180px;display:grid;place-items:center;color:#64748b;font:600 14px Vazirmatn,Tahoma,sans-serif;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px}@media(max-width:640px){.pl-catalog-card{height:auto!important;padding:10px!important;border-radius:0!important}.pl-catalog-media,.pl-catalog-image,.pl-catalog-card .iphone-card-image,.pl-catalog-card .samsung-card-image,.pl-catalog-card .xiaomi-card-image,.pl-catalog-card .prod-card-image,.pl-catalog-card .xiaomitab-card-image,.pl-catalog-card .console-card-image{height:205px!important;min-height:205px!important;flex-basis:205px!important;padding:6px!important;margin-top:32px!important;margin-bottom:10px!important}.pl-catalog-brand{font-size:11px!important;height:16px!important;line-height:16px!important}.pl-catalog-card .iphone-card-name,.pl-catalog-card .samsung-card-name,.pl-catalog-card .xiaomi-card-name,.pl-catalog-card .prod-card-name,.pl-catalog-card .xiaomitab-card-name,.pl-catalog-card .console-card-name,.pl-catalog-card .card-name{font-size:13px!important;line-height:22px!important;height:44px!important;min-height:44px!important}.pl-catalog-card .iphone-card-desc,.pl-catalog-card .samsung-card-desc,.pl-catalog-card .xiaomi-card-desc,.pl-catalog-card .prod-card-desc,.pl-catalog-card .xiaomitab-card-desc,.pl-catalog-card .console-card-desc{font-size:11px!important;line-height:18px!important;height:36px!important;min-height:36px!important}.pl-catalog-footer{min-height:28px!important;padding-top:5px!important}.pl-catalog-price,.pl-catalog-status{font-size:11px!important}}.pl-catalog-footer{display:flex!important;flex-direction:column!important;align-items:stretch!important;justify-content:flex-end!important;gap:4px!important;min-height:48px!important;margin-top:auto!important}.pl-catalog-stock{display:flex!important;min-width:0!important;overflow:hidden!important}.pl-catalog-status{max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important}.pl-catalog-price{display:block!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important;line-height:24px!important;text-align:start!important}.iphone-grid,.samsung-grid,.xiaomi-grid,.prod-grid,.xiaomitab-grid,.console-grid,.grid{grid-template-columns:repeat(auto-fill,minmax(280px,1fr))!important;gap:0!important;border:0!important;background:#fff!important}.pl-catalog-card{width:100%!important;min-width:0!important;margin:0!important;direction:rtl!important}@media(max-width:640px){.iphone-grid,.samsung-grid,.xiaomi-grid,.prod-grid,.xiaomitab-grid,.console-grid,.grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:0!important}.pl-catalog-footer{min-height:40px!important;gap:2px!important}.pl-catalog-price{line-height:19px!important}}.pl-catalog-card .iphone-card-desc,.pl-catalog-card .samsung-card-desc,.pl-catalog-card .xiaomi-card-desc,.pl-catalog-card .prod-card-desc,.pl-catalog-card .xiaomitab-card-desc,.pl-catalog-card .console-card-desc{display:none!important}";
    document.head.appendChild(style);
  }

  if (!document.getElementById("database-catalog-amazing-timer-style")) {
    const style = document.createElement("style");
    style.id = "database-catalog-amazing-timer-style";
    style.textContent = ".pl-catalog-discount{position:absolute!important;left:10px!important;top:10px!important;z-index:9!important;background:#dc2626!important;color:#fff!important;padding:4px 7px!important;border-radius:8px!important;font:800 11px Vazirmatn,Tahoma,sans-serif!important;direction:ltr!important}.pl-amazing-timer{display:flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;margin:0!important;padding:7px 8px!important;border-radius:9px!important;background:#fff1f2!important;color:#be123c!important;font:800 12px Vazirmatn,Tahoma,sans-serif!important;line-height:1.45!important;white-space:nowrap!important}.pl-amazing-timer i{font-size:15px!important}.pl-amazing-timer-slot{display:block!important;flex:0 0 37px!important;height:37px!important;min-height:37px!important;margin-top:8px!important;overflow:visible!important}@media(max-width:640px){.pl-amazing-timer{font-size:10px!important;padding:6px 5px!important;gap:3px!important}}";
    document.head.appendChild(style);
  }

  if (!document.getElementById("database-catalog-discount-price-style")) {
    const style = document.createElement("style");
    style.id = "database-catalog-discount-price-style";
    style.textContent = ".pl-catalog-prices{display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:3px!important;max-width:100%!important}.pl-catalog-price-meta{display:flex!important;align-items:center!important;gap:7px!important;min-height:20px!important}.pl-catalog-price-badge{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:34px!important;padding:3px 7px!important;border-radius:999px!important;background:#ef4444!important;color:#fff!important;font:800 11px Vazirmatn,Tahoma,sans-serif!important;direction:ltr!important}.pl-catalog-old-price{color:#9ca3af!important;font-size:11px!important;font-weight:400!important;line-height:1.4!important;text-decoration:line-through!important;text-decoration-thickness:1px!important;white-space:nowrap!important}.pl-catalog-price{font-weight:700!important}@media(max-width:640px){.pl-catalog-prices{gap:2px!important}.pl-catalog-price-meta{gap:5px!important;min-height:18px!important}.pl-catalog-price-badge{min-width:30px!important;padding:2px 6px!important;font-size:10px!important}.pl-catalog-old-price{font-size:10px!important}}";
    document.head.appendChild(style);
  }

  if (!document.getElementById("database-catalog-coming-soon-style")) {
    const style = document.createElement("style");
    style.id = "database-catalog-coming-soon-style";
    style.textContent = ".pl-catalog-card{position:relative!important}.pl-coming-soon{position:absolute;top:12px;right:12px;z-index:6;display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:999px;background:#2563eb;color:#fff;font:700 12px Vazirmatn,Tahoma,sans-serif;line-height:1.4;box-shadow:0 4px 12px rgba(37,99,235,.18)}";
    document.head.appendChild(style);
  }

  if (isAccessoryCatalog && !document.getElementById("accessory-catalog-card-style")) {
    const style = document.createElement("style");
    style.id = "accessory-catalog-card-style";
    style.textContent = "body.accessory-catalog-page .iphone-grid{grid-template-columns:repeat(auto-fill,minmax(210px,1fr))!important;gap:0!important;border:0!important;background:#fff!important}body.accessory-catalog-page .pl-catalog-card{height:auto!important;border:0!important;border-inline-end:1px solid #e5e7eb!important;border-block-end:1px solid #e5e7eb!important;border-radius:0!important}body.accessory-catalog-page .pl-catalog-card .iphone-card-image{height:250px!important;min-height:250px!important;flex-basis:250px!important}@media(max-width:640px){body.accessory-catalog-page .iphone-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:0!important}body.accessory-catalog-page .pl-catalog-card{height:auto!important}body.accessory-catalog-page .pl-catalog-card .iphone-card-image{height:205px!important;min-height:205px!important;flex-basis:205px!important}}";
    document.head.appendChild(style);
  }

  // فیلتر مشترک همهٔ فهرست‌های محصول. داده‌ها پس از دریافت از API فیلتر می‌شوند
  // تا انتخاب کاربر بدون بارگذاری دوبارهٔ صفحه اعمال شود.
  if (!document.getElementById("pixel-catalog-filter-style")) {
    const style = document.createElement("style");
    style.id = "pixel-catalog-filter-style";
    style.textContent = `
      .pl-catalog-layout{display:grid;grid-template-columns:260px minmax(0,1fr);gap:20px;align-items:start;margin-top:18px;direction:rtl}
      .pl-catalog-results{min-width:0}.pl-filter-panel{position:sticky;top:112px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;color:#172033}
      .pl-filter-head{display:flex;align-items:center;justify-content:space-between;padding:17px 16px;border-bottom:1px solid #e2e8f0;font-size:18px;font-weight:800}.pl-filter-head-actions{display:flex;align-items:center;gap:8px}.pl-filter-reset{border:0;background:none;padding:4px;color:#2563eb;font:700 12px Vazirmatn,Tahoma,sans-serif;cursor:pointer}.pl-filter-close{display:none;width:34px;height:34px;align-items:center;justify-content:center;border:0;border-radius:9px;background:#f1f5f9;color:#475569;font-size:21px;cursor:pointer}
      .pl-filter-stock{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:15px 16px;border-bottom:1px solid #e2e8f0;font-weight:750;font-size:14px;cursor:pointer}.pl-filter-stock input{appearance:none;width:38px;height:22px;border-radius:20px;background:#cbd5e1;position:relative;cursor:pointer;transition:.18s}.pl-filter-stock input:after{content:'';position:absolute;width:16px;height:16px;right:3px;top:3px;background:#fff;border-radius:50%;transition:.18s;box-shadow:0 1px 3px #64748b}.pl-filter-stock input:checked{background:#2563eb}.pl-filter-stock input:checked:after{right:19px}
      .pl-filter-section{border-bottom:1px solid #e2e8f0}.pl-filter-section:last-child{border-bottom:0}.pl-filter-section summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:15px 16px;font-size:15px;font-weight:800}.pl-filter-section summary::-webkit-details-marker{display:none}.pl-filter-section summary:after{content:'⌄';font-size:20px;color:#64748b;line-height:1;transform:rotate(0);transition:.18s}.pl-filter-section[open] summary:after{transform:rotate(180deg)}.pl-filter-options{padding:0 16px 14px;max-height:220px;overflow:auto}.pl-filter-option{display:flex;align-items:center;gap:8px;min-height:31px;color:#475569;font-size:13px;cursor:pointer}.pl-filter-option input{accent-color:#2563eb;width:16px;height:16px;flex:0 0 auto}.pl-filter-color{width:12px;height:12px;border-radius:50%;border:1px solid #cbd5e1;flex:0 0 12px}.pl-price-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 16px 15px}.pl-price-field{min-width:0;border:1px solid #cbd5e1;border-radius:9px;padding:8px;font:600 12px Vazirmatn,Tahoma,sans-serif;outline:0;color:#172033;direction:ltr}.pl-price-field:focus{border-color:#2563eb;box-shadow:0 0 0 3px #dbeafe}.pl-catalog-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px}.pl-catalog-count{color:#64748b;font-size:13px;font-weight:650}.pl-catalog-sort{border:1px solid #e2e8f0;border-radius:9px;background:#fff;padding:8px 10px;color:#334155;font:650 12px Vazirmatn,Tahoma,sans-serif;outline:0}.pl-mobile-filter-btn{display:none;align-items:center;justify-content:center;gap:7px;border:1px solid #2563eb;background:#fff;color:#2563eb;border-radius:9px;padding:8px 12px;font:750 13px Vazirmatn,Tahoma,sans-serif;cursor:pointer}.pl-filter-backdrop{display:none}
      @media(max-width:800px){.pl-catalog-layout{display:block;margin-top:12px}.pl-catalog-toolbar{margin:0 0 10px}.pl-mobile-filter-btn{display:inline-flex}.pl-filter-panel{position:fixed;z-index:2000;right:0;top:0;bottom:0;width:min(360px,92vw);border-radius:20px 0 0 20px;transform:translateX(105%);transition:transform .25s ease;overflow:auto;touch-action:pan-y}.pl-filter-panel.is-open{transform:translateX(0)}.pl-filter-backdrop{position:fixed;z-index:1999;inset:0;background:rgba(15,23,42,.42)}.pl-filter-backdrop.is-open{display:block}.pl-filter-panel .pl-filter-head{position:sticky;top:0;background:#fff;z-index:1}.pl-filter-close{display:inline-flex}.pl-catalog-sort{max-width:175px}.pl-catalog-count{font-size:12px}.pl-catalog-layout .iphone-grid,.pl-catalog-layout .samsung-grid,.pl-catalog-layout .xiaomi-grid,.pl-catalog-layout .prod-grid,.pl-catalog-layout .xiaomitab-grid,.pl-catalog-layout .console-grid,.pl-catalog-layout .grid{width:100%}}
    `;
    document.head.appendChild(style);
  }

  const escapeHtml = (value) => {
    const element = document.createElement("div");
    element.textContent = value == null ? "" : String(value);
    return element.innerHTML;
  };
  function isOutOfStock(product) {
    return product.availability === "out" || Number(product.stock) <= 0;
  }
  function priceInfo(product) {
    const original = Math.max(0, Number(product.price) || 0);
    const percent = Math.min(99, Math.max(0, Number(product.discountPercent ?? product.discount) || 0));
    const final = percent > 0 ? Math.round(original * (100 - percent) / 100) : original;
    return { original, percent, final };
  }

  function priceMarkup(product) {
    const info = priceInfo(product);
    const current = info.final.toLocaleString("fa-IR") + " تومان";
    if (!info.percent) return '<div class="pl-catalog-prices"><span class="pl-catalog-price">' + current + '</span></div>';
    return '<div class="pl-catalog-prices"><div class="pl-catalog-price-meta"><span class="pl-catalog-price-badge">' +
      info.percent.toLocaleString("fa-IR") + '٪</span><span class="pl-catalog-old-price">' +
      info.original.toLocaleString("fa-IR") + '</span></div><span class="pl-catalog-price">' + current + '</span></div>';
  }

  function imageMarkup(product, name) {
    // mainImage اولویت دارد، ولی اگر یک فایل قدیمی/حذف‌شده باشد، تمام عکس‌های
    // همان محصول به‌ترتیب امتحان می‌شوند؛ نه این‌که فوراً placeholder نمایش داده شود.
    const rawCandidates = [
      product.mainImage,
      ...(Array.isArray(product.images) ? product.images : []),
    ].filter(Boolean);
    const version = product.updatedAt || product._id || "";
    const candidates = [...new Set(rawCandidates)].map((source) => {
      if (!version || String(source).startsWith("data:")) return source;
      return source + (String(source).includes("?") ? "&" : "?") +
        "v=" + encodeURIComponent(version);
    });
    const primary = candidates[0] || "/images/product-placeholder.svg";
    const fallbacks = candidates.slice(1).join("|");
    return `<img src="${escapeHtml(primary)}" data-fallbacks="${escapeHtml(fallbacks)}" alt="${name}" loading="lazy" decoding="async" onerror="var urls=(this.dataset.fallbacks||'').split('|').filter(Boolean);var next=urls.shift();this.dataset.fallbacks=urls.join('|');if(next){this.src=next;}else{this.onerror=null;this.src='/images/product-placeholder.svg';}">`;
  }

  function colorDots(product, outOfStock) {
    if (outOfStock || !Array.isArray(product.colors)) return "";
    const colors = product.colors
      .map((color) => (typeof color === "string" ? color : color?.hex))
      .filter((color) => /^#[0-9a-f]{3,8}$/i.test(String(color || "")))
      .slice(0, 4);
    if (!colors.length) return "";
    return '<div class="pl-catalog-color-dots" aria-label="رنگ‌های موجود">' +
      colors.map((color) => '<span class="pl-catalog-color-dot" style="background:' +
        escapeHtml(color) + '"></span>').join("") +
      '</div>';
  }

  function card(product) {
    const name = escapeHtml(product.name);
    const href = "/product?id=" + encodeURIComponent(product.slug);
    const outOfStock = isOutOfStock(product);
    const stock = Math.max(0, Number(product.stock) || 0);
    const status = outOfStock
      ? '<span class="pl-catalog-status out"><i class="ti ti-circle-x"></i> ناموجود</span>'
      : '<span class="pl-catalog-status in"><i class="ti ti-circle-check"></i> موجود' +
          (stock <= 5 ? ' · فقط ' + stock.toLocaleString("fa-IR") + ' عدد' : '') +
        '</span>';
    const priceHtml = outOfStock
      ? ""
      : priceMarkup(product);
    const imageClass = config.image || "pl-catalog-media";
    const bodyClass = config.body
      ? config.body + (config.body.includes("pl-catalog-body") ? "" : " pl-catalog-body")
      : "pl-catalog-body";
    const comingSoonBadge = product.comingSoon
      ? '<span class="pl-coming-soon"><i class="ti ti-clock"></i> به‌زودی</span>'
      : "";
    const amazingActive = product.amazingOffer && (!product.amazingOfferEndsAt || new Date(product.amazingOfferEndsAt) > new Date());
    const amazingRibbon = amazingActive
      ? '<span style="position:absolute;top:10px;right:10px;z-index:8;background:#dc2626;color:#fff;padding:5px 10px;border-radius:9px;font-size:11px;font-weight:800;box-shadow:0 3px 9px rgba(220,38,38,.22)">شگفت‌انگیز</span>'
      : "";
    const amazingTimer = amazingActive && product.amazingOfferEndsAt
      ? '<div class="pl-amazing-timer"><i class="ti ti-clock"></i><span data-amazing-end="' + escapeHtml(product.amazingOfferEndsAt) + '"></span></div>'
      : "";
    // نام برند فقط یک‌بار، بالای مدل محصول نمایش داده می‌شود.
    return `<a href="${href}" class="${config.card} pl-catalog-card" data-stock="${stock}" style="color:inherit;text-decoration:none;position:relative">${amazingRibbon}${comingSoonBadge}<div class="${imageClass}">${colorDots(product, outOfStock)}${imageMarkup(product, name)}</div><div class="${bodyClass}"><div class="pl-catalog-brand">${escapeHtml(product.brand || "")}</div><div class="${config.name}">${name}</div>${amazingTimer ? '<div class="pl-amazing-timer-slot">' + amazingTimer + '</div>' : ''}<div class="pl-catalog-footer"><div class="pl-catalog-stock">${status}</div>${priceHtml}</div></div></a>`;
  }

  function uniqueValues(products, valueFor) {
    return [...new Set(products.map(valueFor).flat().map((value) => String(value || "").trim()).filter(Boolean))];
  }

  function mountCatalogFilters() {
    const originalParent = grid.parentNode;
    const layout = document.createElement("div");
    layout.className = "pl-catalog-layout";
    const panel = document.createElement("aside");
    panel.className = "pl-filter-panel";
    panel.setAttribute("aria-label", "فیلتر محصولات");
    const results = document.createElement("div");
    results.className = "pl-catalog-results";
    const backdrop = document.createElement("div");
    backdrop.className = "pl-filter-backdrop";
    originalParent.insertBefore(layout, grid);
    layout.append(panel, results);
    results.append(grid);
    document.body.append(backdrop);

    const setPanelOpen = (open) => {
      panel.style.transform = "";
      panel.style.transition = "";
      panel.classList.toggle("is-open", open);
      backdrop.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    };
    backdrop.addEventListener("click", () => setPanelOpen(false));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") setPanelOpen(false); });

    let allProducts = [];
    const selected = { brands: new Set(), colors: new Set(), storages: new Set(), inStock: false, min: "", max: "", sort: "newest" };
    const option = (kind, value, extra = "") => `<label class="pl-filter-option">${extra}<input type="checkbox" data-filter-kind="${kind}" value="${escapeHtml(value)}"><span>${escapeHtml(value)}</span></label>`;
    const detail = (title, content, open = false) => `<details class="pl-filter-section"${open ? " open" : ""}><summary>${title}</summary><div class="pl-filter-options">${content}</div></details>`;

    panel.innerHTML = `<div class="pl-filter-head"><span>فیلترها</span><div class="pl-filter-head-actions"><button type="button" class="pl-filter-reset">حذف فیلترها</button><button type="button" class="pl-filter-close" aria-label="بستن فیلترها" title="بستن"><i class="ti ti-x"></i></button></div></div>
      <label class="pl-filter-stock"><span>فقط کالاهای موجود</span><input type="checkbox" data-filter-stock></label>
      ${detail("بازه قیمت", `<div class="pl-price-fields"><input class="pl-price-field" inputmode="numeric" data-filter-min placeholder="حداقل (تومان)"><input class="pl-price-field" inputmode="numeric" data-filter-max placeholder="حداکثر (تومان)"></div>`, true)}
      <div data-filter-dynamic></div>`;
    panel.querySelector(".pl-filter-close").addEventListener("click", () => setPanelOpen(false));
    results.insertAdjacentHTML("afterbegin", `<div class="pl-catalog-toolbar"><button type="button" class="pl-mobile-filter-btn"><i class="ti ti-adjustments-horizontal"></i> فیلترها</button><span class="pl-catalog-count"></span><select class="pl-catalog-sort" aria-label="مرتب‌سازی"><option value="newest">جدیدترین</option><option value="price-asc">ارزان‌ترین</option><option value="price-desc">گران‌ترین</option><option value="rating">بیشترین امتیاز</option></select></div>`);
    results.querySelector(".pl-mobile-filter-btn").addEventListener("click", () => setPanelOpen(true));

    let filterSwipe = null;
    const clearFilterSwipe = () => {
      panel.style.transform = "";
      panel.style.transition = "";
      filterSwipe = null;
    };
    const finishFilterSwipe = (event) => {
      if (!filterSwipe || event.pointerId !== filterSwipe.pointerId) return;
      const distance = Math.max(0, event.clientX - filterSwipe.startX);
      const shouldClose = filterSwipe.axis === "horizontal" && distance >= Math.max(72, panel.clientWidth * 0.22);
      clearFilterSwipe();
      if (shouldClose) setPanelOpen(false);
    };
    panel.addEventListener("pointerdown", (event) => {
      if (!window.matchMedia("(max-width: 800px)").matches || !panel.classList.contains("is-open") || event.pointerType === "mouse") return;
      filterSwipe = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, axis: null };
      panel.setPointerCapture?.(event.pointerId);
    });
    panel.addEventListener("pointermove", (event) => {
      if (!filterSwipe || event.pointerId !== filterSwipe.pointerId) return;
      const deltaX = event.clientX - filterSwipe.startX;
      const deltaY = event.clientY - filterSwipe.startY;
      if (!filterSwipe.axis && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 8) filterSwipe.axis = deltaX > Math.abs(deltaY) ? "horizontal" : "vertical";
      if (filterSwipe.axis !== "horizontal" || deltaX <= 0) return;
      event.preventDefault();
      panel.style.transition = "none";
      panel.style.transform = "translateX(" + Math.min(deltaX, panel.clientWidth) + "px)";
    });
    panel.addEventListener("pointerup", finishFilterSwipe);
    panel.addEventListener("pointercancel", finishFilterSwipe);

    function normalizeNumber(value) {
      return Number(String(value || "").replace(/[٬,]/g, "").replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))) || 0;
    }
    function renderOptions() {
      const brands = uniqueValues(allProducts, (p) => p.brand).sort();
      const colors = uniqueValues(allProducts, (p) => (p.colors || []).map((c) => typeof c === "string" ? c : c?.name)).sort();
      const colorHex = new Map();
      allProducts.forEach((p) => (p.colors || []).forEach((c) => { if (c?.name && c?.hex) colorHex.set(c.name, c.hex); }));
      const storages = uniqueValues(allProducts, (p) => [...(p.storages || []), ...(p.variants || []).map((v) => v?.storage)]).sort();
      const dynamic = panel.querySelector("[data-filter-dynamic]");
      dynamic.innerHTML = (brands.length > 1 ? detail("برند", brands.map((v) => option("brands", v)).join(""), true) : "") +
        (colors.length ? detail("رنگ", colors.map((v) => option("colors", v, `<span class="pl-filter-color" style="background:${escapeHtml(colorHex.get(v) || "#e2e8f0")}"></span>`)).join("")) : "") +
        (storages.length ? detail("حافظه", storages.map((v) => option("storages", v)).join("")) : "");
    }
    function matches(product) {
      const productColors = (product.colors || []).map((c) => String(typeof c === "string" ? c : c?.name || "").trim());
      const productStorages = [...(product.storages || []), ...(product.variants || []).map((v) => v?.storage)].map((v) => String(v || "").trim());
      const stock = Math.max(0, Number(product.stock) || 0);
      const productPrice = priceInfo(product).final;
      return (!selected.inStock || (!isOutOfStock(product) && stock > 0)) &&
        (!selected.min || productPrice >= normalizeNumber(selected.min)) &&
        (!selected.max || productPrice <= normalizeNumber(selected.max)) &&
        (!selected.brands.size || selected.brands.has(String(product.brand || "").trim())) &&
        (!selected.colors.size || productColors.some((v) => selected.colors.has(v))) &&
        (!selected.storages.size || productStorages.some((v) => selected.storages.has(v)));
    }
    function render() {
      const products = allProducts.filter(matches).sort((a, b) => {
        if (selected.sort === "price-asc") return priceInfo(a).final - priceInfo(b).final;
        if (selected.sort === "price-desc") return priceInfo(b).final - priceInfo(a).final;
        if (selected.sort === "rating") return Number(b.rating || 0) - Number(a.rating || 0);
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
      grid.innerHTML = products.length ? products.map(card).join("") : '<div class="pl-catalog-loading">کالایی با این فیلترها پیدا نشد.</div>';
      const count = results.querySelector(".pl-catalog-count");
      if (count) count.textContent = products.length.toLocaleString("fa-IR") + " کالا";
    }
    panel.addEventListener("change", (event) => {
      const input = event.target;
      if (input.matches("[data-filter-stock]")) selected.inStock = input.checked;
      if (input.matches("[data-filter-kind]")) selected[input.dataset.filterKind][input.checked ? "add" : "delete"](input.value);
      render();
    });
    panel.addEventListener("input", (event) => {
      if (event.target.matches("[data-filter-min]")) selected.min = event.target.value;
      if (event.target.matches("[data-filter-max]")) selected.max = event.target.value;
      render();
    });
    results.querySelector(".pl-catalog-sort").addEventListener("change", (event) => { selected.sort = event.target.value; render(); });
    panel.querySelector(".pl-filter-reset").addEventListener("click", () => {
      selected.brands.clear(); selected.colors.clear(); selected.storages.clear(); selected.inStock = false; selected.min = ""; selected.max = "";
      panel.querySelectorAll("input").forEach((input) => { input.checked = false; if (input.type !== "checkbox") input.value = ""; });
      render();
    });
    return { setProducts(products) { allProducts = products; renderOptions(); render(); } };
  }

  const catalogFilters = mountCatalogFilters();

  const requestedParams = new URLSearchParams(window.location.search);
  const requestedCategory = requestedParams.get("category");
  const requestedBrand = requestedParams.get("brand");
  const isApplePhoneCatalog = path === "/iphone" || path === "/mobile/apple";
  const isConsoleCatalog = path === "/console";
  const params = new URLSearchParams({
    // فیلتر و مرتب‌سازی در مرورگر انجام می‌شود؛ بنابراین باید کل موجودی این
    // دسته دریافت شود تا محصولات قدیمی‌تر یا تخفیف‌خورده از فهرست حذف نشوند.
    limit: "100",
  });
  const categoryForRequest = requestedCategory || config.category;
  // در داده‌های قدیمی بعضی آیفون‌ها با دستهٔ «آیفون» یا «عمومی» ثبت شده‌اند.
  // صفحهٔ اپل ابتدا همهٔ محصولات برند اپل را می‌گیرد و پایین‌تر فقط آیفون‌ها
  // را نگه می‌دارد تا محصول معتبر به‌خاطر دسته‌بندی قدیمی گم نشود.
  if (categoryForRequest && !(isApplePhoneCatalog && !requestedCategory) && !(isConsoleCatalog && !requestedCategory)) {
    params.set("category", categoryForRequest);
  }
  if ((requestedBrand || config.brand) && !(isApplePhoneCatalog && !requestedBrand)) {
    params.set("brand", requestedBrand || config.brand);
  }
  if (isApplePhoneCatalog && !requestedCategory && !requestedBrand) {
    params.set("search", "iphone");
  }
  if (isConsoleCatalog && !requestedCategory && !requestedBrand) {
    params.set("search", "console");
  }

  // دادهٔ قدیمیِ داخل HTML فقط نقش پشتیبان دارد. قبل از اولین رنگ‌کردن
  // صفحه پنهان می‌شود تا کاربر هرگز جابه‌جایی بین کارت‌های قدیمی و دیتابیس را نبیند.
  const fallbackHtml = grid.innerHTML;
  grid.dataset.databaseCatalog = "loading";
  grid.setAttribute("aria-busy", "true");
  grid.innerHTML =
    '<div class="pl-catalog-loading" role="status">در حال بارگذاری محصولات…</div>';
  grid.style.visibility = "visible";

  const catalogRequestController = new AbortController();
  const catalogRequestTimer = window.setTimeout(
    () => catalogRequestController.abort(),
    7000,
  );

  fetch("/api/products?" + params, { signal: catalogRequestController.signal, cache: "default" })
    .then((response) => {
      if (!response.ok) throw new Error("catalog request failed");
      return response.json();
    })
    .then((data) => {
      if (!data.success || !Array.isArray(data.products)) {
        throw new Error("catalog is empty");
      }

      if (!data.products.length) {
        if (config.noFallback) {
          grid.innerHTML =
            '<div class="pl-catalog-loading">هنوز محصولی برای این برند ثبت نشده است.</div>';
          grid.dataset.databaseCatalog = "empty";
          return;
        }
        throw new Error("catalog is empty");
      }

      // فقط همین مسیر اجازهٔ بازنویسی گرید را دارد؛ هیچ observer یا اسکریپت
      // موازی نباید دادهٔ قدیمی را دوباره برگرداند.
      const catalogProducts = isApplePhoneCatalog && !requestedCategory
        ? data.products.filter((product) => {
            const name = String(product.name || "").trim();
            const brand = String(product.brand || "").trim();
            const category = String(product.category || "").trim();
            // نام کامل فروشگاهی معمولاً با «گوشی موبایل اپل مدل» شروع می‌شود؛
            // وجود iPhone/آیفون در هر بخش نام برای شناسایی محصول کافی است.
            const isIphoneName = /iphone|آیفون|ایفون/i.test(name);
            const isAppleBrand = /(?:^|\s)(?:اپل|apple)(?:\s|$)/i.test(brand);
            const isMobileCategory = /^(?:موبایل|mobile|گوشی موبایل|گوشی|phone|آیفون|ایفون|iphone)$/i.test(category);
            return isIphoneName || (isAppleBrand && isMobileCategory);
          })
        : data.products;
      catalogFilters.setProducts(catalogProducts);
      grid.dataset.databaseCatalog = "ready";
      const updateAmazingTimers = () => {
        let expired = false;
        grid.querySelectorAll("[data-amazing-end]").forEach((el) => {
          const diff = new Date(el.dataset.amazingEnd).getTime() - Date.now();
          if (diff <= 0) { expired = true; return; }
          const h = Math.floor(diff / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          el.textContent = h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0") + " باقی‌مانده";
        });
        if (expired) window.location.reload();
      };
      updateAmazingTimers();
      window.setInterval(updateAmazingTimers, 1000);
    })
    .catch(() => {
      if (config.noFallback) {
        grid.innerHTML =
          '<div class="pl-catalog-loading">خطا در دریافت محصولات. دوباره تلاش کنید.</div>';
        grid.dataset.databaseCatalog = "error";
        return;
      }
      // اگر API واقعاً در دسترس نبود، صفحه همچنان قابل استفاده می‌ماند.
      grid.innerHTML = fallbackHtml;
      grid.dataset.databaseCatalog = "fallback";
    })
    .finally(() => {
      window.clearTimeout(catalogRequestTimer);
      grid.removeAttribute("aria-busy");
    });
})();

// کارت‌های فشردهٔ فهرست محصول در دسکتاپ
(() => {
  const compactCatalogStyle = document.createElement("style");
  compactCatalogStyle.id = "compact-product-list-cards";
  compactCatalogStyle.textContent = `
    @media (min-width: 769px) {
      .iphone-grid, .samsung-grid, .xiaomi-grid, .prod-grid, .xiaomitab-grid, .console-grid, .grid {
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        gap: 0 !important;
      }
      .pl-catalog-card { padding: 10px !important; }
      .pl-catalog-media, .pl-catalog-image, .pl-catalog-card .iphone-card-image, .pl-catalog-card .samsung-card-image, .pl-catalog-card .xiaomi-card-image, .pl-catalog-card .prod-card-image, .pl-catalog-card .xiaomitab-card-image, .pl-catalog-card .console-card-image {
        height: 200px !important;
        min-height: 200px !important;
        flex-basis: 200px !important;
        margin: 26px auto 8px !important;
        padding: 4px !important;
      }
      .pl-catalog-brand { font-size: 11px !important; line-height: 16px !important; height: 16px !important; }
      .pl-catalog-card .iphone-card-name, .pl-catalog-card .samsung-card-name, .pl-catalog-card .xiaomi-card-name, .pl-catalog-card .prod-card-name, .pl-catalog-card .xiaomitab-card-name, .pl-catalog-card .console-card-name, .pl-catalog-card .card-name {
        font-size: 13px !important; line-height: 22px !important; height: 44px !important; min-height: 44px !important;
      }
      .pl-catalog-footer { min-height: 42px !important; gap: 2px !important; }
      .pl-catalog-price, .pl-catalog-status { font-size: 12px !important; }
    }
  `;
  document.head.appendChild(compactCatalogStyle);
})();
