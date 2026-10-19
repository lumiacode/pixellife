(() => {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const configs = {
    "/headphones": { grid: ".iphone-grid", card: "iphone-card", name: "iphone-card-name", image: "iphone-card-image", body: "iphone-card-body", desc: "iphone-card-desc", category: "هدفون و هندزفری", title: "هدفون و هندزفری", noFallback: true },
    "/smartwatches": { grid: ".iphone-grid", card: "iphone-card", name: "iphone-card-name", image: "iphone-card-image", body: "iphone-card-body", desc: "iphone-card-desc", category: "ساعت هوشمند", title: "ساعت هوشمند", noFallback: true },
    "/mobiles": { grid: ".grid", card: "card product-card", name: "card-name", brand: "card-brand", price: "card-price", category: "موبایل", noFallback: true },
    "/iphone": { grid: ".iphone-grid", card: "iphone-card", name: "iphone-card-name", image: "iphone-card-image", body: "iphone-card-body", desc: "iphone-card-desc", brand: "اپل", category: "موبایل", noFallback: true },
    "/samsung": { grid: ".samsung-grid", card: "samsung-card", name: "samsung-card-name", image: "samsung-card-image", body: "samsung-card-body", desc: "samsung-card-desc", brand: "سامسونگ", category: "موبایل", noFallback: true },
    "/xiaomi": { grid: ".xiaomi-grid", card: "xiaomi-card", name: "xiaomi-card-name", image: "xiaomi-card-image", body: "xiaomi-card-body", desc: "xiaomi-card-desc", brand: "شیائومی", category: "موبایل", noFallback: true },
    "/accessories/chargers": { grid: ".iphone-grid", card: "iphone-card", name: "iphone-card-name", image: "iphone-card-image", body: "iphone-card-body", desc: "iphone-card-desc", category: "کابل، شارژر و آداپتور", title: "کابل، شارژر و آداپتور", noFallback: true },
    "/accessories/apple": { grid: ".iphone-grid", card: "iphone-card", name: "iphone-card-name", image: "iphone-card-image", body: "iphone-card-body", desc: "iphone-card-desc", brand: "اپل", category: "لوازم جانبی موبایل", noFallback: true },
    "/accessories/samsung": { grid: ".iphone-grid", card: "iphone-card", name: "iphone-card-name", image: "iphone-card-image", body: "iphone-card-body", desc: "iphone-card-desc", brand: "سامسونگ", category: "لوازم جانبی موبایل", noFallback: true },
    "/accessories/xiaomi": { grid: ".iphone-grid", card: "iphone-card", name: "iphone-card-name", image: "iphone-card-image", body: "iphone-card-body", desc: "iphone-card-desc", brand: "شیائومی", category: "لوازم جانبی موبایل", noFallback: true },
    "/ipad": { grid: ".prod-grid", card: "prod-card", name: "prod-card-name", image: "prod-card-image", body: "prod-card-body", desc: "prod-card-desc", brand: "اپل", category: "تبلت", noFallback: true },
    "/samsungtab": { grid: ".prod-grid", card: "prod-card", name: "prod-card-name", image: "prod-card-image", body: "prod-card-body", desc: "prod-card-desc", brand: "سامسونگ", category: "تبلت", noFallback: true },
    "/xiaomitab": { grid: ".xiaomitab-grid", card: "xiaomitab-card", name: "xiaomitab-card-name", image: "xiaomitab-card-image", body: "xiaomitab-card-body", desc: "xiaomitab-card-desc", brand: "شیائومی", category: "تبلت", noFallback: true },
    // دسته‌ای که پنل ادمین برای کنسول‌ها ذخیره می‌کند «کنسول بازی» است.
    // نبودن تطابق دقیق باعث نمایش کارت‌های نمونهٔ ناقص می‌شد.
    "/console": { grid: ".console-grid", card: "console-card", name: "console-card-name", image: "console-card-image", body: "console-card-body", desc: "console-card-desc", category: "کنسول بازی", noFallback: true },
  };

  const config = configs[path];
  if (config.title) document.title = config.title + " | پیکسل لایف";
  if (!config) return;
  const grid = document.querySelector(config.grid);
  if (!grid) return;
  const isAccessoryCatalog = path.startsWith("/accessories/");
  if (isAccessoryCatalog) document.body.classList.add("accessory-catalog-page");

  if (!document.getElementById("database-catalog-image-style")) {
    const style = document.createElement("style");
    style.id = "database-catalog-image-style";
    style.textContent = "html{scroll-behavior:auto!important}.pl-catalog-card{display:flex!important;flex-direction:column!important;align-self:start!important;box-sizing:border-box!important;height:auto!important;min-height:0!important;padding:12px!important;background:#fff!important;border:1px solid #e7edf5!important;border-radius:16px!important;box-shadow:0 4px 16px rgba(15,23,42,.045)!important;overflow:hidden!important;transition:none!important}.pl-catalog-card:hover{transform:none!important;border-color:#e7edf5!important;box-shadow:0 4px 16px rgba(15,23,42,.045)!important}.pl-catalog-media,.pl-catalog-image,.pl-catalog-card .iphone-card-image,.pl-catalog-card .samsung-card-image,.pl-catalog-card .xiaomi-card-image,.pl-catalog-card .prod-card-image,.pl-catalog-card .xiaomitab-card-image,.pl-catalog-card .console-card-image{box-sizing:border-box!important;height:250px!important;min-height:250px!important;flex:0 0 250px!important;display:flex!important;align-items:center!important;justify-content:center!important;margin:0 0 10px!important;padding:8px!important;background:#fff!important;border:0!important;border-radius:10px!important;overflow:hidden!important;position:relative!important}.pl-catalog-media img,.pl-catalog-image img,.pl-catalog-card .iphone-card-image img,.pl-catalog-card .samsung-card-image img,.pl-catalog-card .xiaomi-card-image img,.pl-catalog-card .prod-card-image img,.pl-catalog-card .xiaomitab-card-image img,.pl-catalog-card .console-card-image img{width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;object-position:center center!important;display:block!important}.pl-catalog-body{display:flex!important;flex:0 0 auto!important;min-width:0!important;flex-direction:column!important;overflow:hidden!important;padding:0 2px!important}.pl-catalog-brand{font-size:12px!important;line-height:18px!important;height:18px!important;overflow:hidden!important;color:#64748b!important;margin:0 0 3px!important}.pl-catalog-card .iphone-card-name,.pl-catalog-card .samsung-card-name,.pl-catalog-card .xiaomi-card-name,.pl-catalog-card .prod-card-name,.pl-catalog-card .xiaomitab-card-name,.pl-catalog-card .console-card-name,.pl-catalog-card .card-name{font-size:15px!important;font-weight:800!important;line-height:25px!important;height:50px!important;min-height:50px!important;color:#172033!important;overflow:hidden!important;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical!important}.pl-catalog-card .iphone-card-desc,.pl-catalog-card .samsung-card-desc,.pl-catalog-card .xiaomi-card-desc,.pl-catalog-card .prod-card-desc,.pl-catalog-card .xiaomitab-card-desc,.pl-catalog-card .console-card-desc{font-size:12px!important;line-height:20px!important;height:40px!important;min-height:40px!important;margin:4px 0!important;color:#718096!important;overflow:hidden!important;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical!important}.pl-catalog-color-dots{position:absolute!important;top:10px!important;left:10px!important;display:flex!important;flex-direction:column!important;gap:5px!important;z-index:2!important}.pl-catalog-color-dot{width:10px!important;height:10px!important;border:1px solid rgba(15,23,42,.18)!important;box-shadow:0 1px 2px rgba(15,23,42,.18)!important;border-radius:50%!important}.pl-catalog-footer{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;min-height:34px!important;margin:4px 0 0!important;padding-top:7px!important;border-top:1px solid #f0f3f7!important;overflow:hidden!important}.pl-catalog-status{display:inline-flex!important;align-items:center!important;gap:5px!important;font-size:12px!important;font-weight:700!important;white-space:nowrap!important}.pl-catalog-status.in{color:#16803a!important}.pl-catalog-status.out{color:#c2413a!important}.pl-catalog-price{font-size:14px!important;font-weight:800!important;color:#172033!important;white-space:nowrap!important}.pl-catalog-loading{grid-column:1/-1;min-height:180px;display:grid;place-items:center;color:#64748b;font:600 14px Vazirmatn,Tahoma,sans-serif;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px}@media(max-width:640px){.pl-catalog-card{height:auto!important;padding:10px!important;border-radius:14px!important}.pl-catalog-media,.pl-catalog-image,.pl-catalog-card .iphone-card-image,.pl-catalog-card .samsung-card-image,.pl-catalog-card .xiaomi-card-image,.pl-catalog-card .prod-card-image,.pl-catalog-card .xiaomitab-card-image,.pl-catalog-card .console-card-image{height:205px!important;min-height:205px!important;flex-basis:205px!important;padding:6px!important;margin-bottom:8px!important}.pl-catalog-brand{font-size:11px!important;height:16px!important;line-height:16px!important}.pl-catalog-card .iphone-card-name,.pl-catalog-card .samsung-card-name,.pl-catalog-card .xiaomi-card-name,.pl-catalog-card .prod-card-name,.pl-catalog-card .xiaomitab-card-name,.pl-catalog-card .console-card-name,.pl-catalog-card .card-name{font-size:13px!important;line-height:22px!important;height:44px!important;min-height:44px!important}.pl-catalog-card .iphone-card-desc,.pl-catalog-card .samsung-card-desc,.pl-catalog-card .xiaomi-card-desc,.pl-catalog-card .prod-card-desc,.pl-catalog-card .xiaomitab-card-desc,.pl-catalog-card .console-card-desc{font-size:11px!important;line-height:18px!important;height:36px!important;min-height:36px!important}.pl-catalog-footer{min-height:28px!important;padding-top:5px!important}.pl-catalog-price,.pl-catalog-status{font-size:11px!important}}.pl-catalog-footer{display:flex!important;flex-direction:column!important;align-items:stretch!important;justify-content:center!important;gap:4px!important;min-height:58px!important;margin-top:5px!important}.pl-catalog-stock{display:flex!important;min-width:0!important;overflow:hidden!important}.pl-catalog-status{max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important}.pl-catalog-price{display:block!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important;line-height:24px!important;text-align:start!important}.iphone-grid,.samsung-grid,.xiaomi-grid,.prod-grid,.xiaomitab-grid,.console-grid,.grid{grid-template-columns:repeat(auto-fill,minmax(280px,1fr))!important;gap:14px!important;border:0!important}.pl-catalog-card{width:100%!important;direction:rtl!important}@media(max-width:640px){.iphone-grid,.samsung-grid,.xiaomi-grid,.prod-grid,.xiaomitab-grid,.console-grid,.grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important}.pl-catalog-footer{min-height:48px!important;gap:2px!important}.pl-catalog-price{line-height:19px!important}}.pl-catalog-card .iphone-card-desc,.pl-catalog-card .samsung-card-desc,.pl-catalog-card .xiaomi-card-desc,.pl-catalog-card .prod-card-desc,.pl-catalog-card .xiaomitab-card-desc,.pl-catalog-card .console-card-desc{display:none!important}";
    document.head.appendChild(style);
  }

  if (!document.getElementById("database-catalog-amazing-timer-style")) {
    const style = document.createElement("style");
    style.id = "database-catalog-amazing-timer-style";
    style.textContent = ".pl-catalog-discount{position:absolute!important;left:10px!important;top:10px!important;z-index:9!important;background:#dc2626!important;color:#fff!important;padding:4px 7px!important;border-radius:8px!important;font:800 11px Vazirmatn,Tahoma,sans-serif!important;direction:ltr!important}.pl-amazing-timer{display:flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;margin:0!important;padding:7px 8px!important;border-radius:9px!important;background:#fff1f2!important;color:#be123c!important;font:800 12px Vazirmatn,Tahoma,sans-serif!important;line-height:1.45!important;white-space:nowrap!important}.pl-amazing-timer i{font-size:15px!important}.pl-amazing-timer-slot{height:37px!important;margin-top:8px!important}@media(max-width:640px){.pl-amazing-timer{font-size:10px!important;padding:6px 5px!important;gap:3px!important}}";
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
    style.textContent = "body.accessory-catalog-page .iphone-grid{grid-template-columns:repeat(auto-fill,minmax(210px,1fr))!important;gap:14px!important;border:0!important}body.accessory-catalog-page .pl-catalog-card{height:480px!important;border:1px solid #e7edf5!important;border-radius:16px!important}body.accessory-catalog-page .pl-catalog-card .iphone-card-image{height:250px!important;min-height:250px!important;flex-basis:250px!important}@media(max-width:640px){body.accessory-catalog-page .iphone-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important}body.accessory-catalog-page .pl-catalog-card{height:415px!important}body.accessory-catalog-page .pl-catalog-card .iphone-card-image{height:205px!important;min-height:205px!important;flex-basis:205px!important}}";
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
  const price = (product) => Number(product.price).toLocaleString("fa-IR") + " تومان";

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
      : '<span class="pl-catalog-price">' + price(product) + '</span>';
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
    const discountPercent = Math.max(0, Number(product.discountPercent || product.discount || 0));
    const discountBadge = discountPercent > 0
      ? '<span class="pl-catalog-discount">' + discountPercent + '%</span>'
      : "";
    // نام برند فقط یک‌بار، بالای مدل محصول نمایش داده می‌شود.
    return `<a href="${href}" class="${config.card} pl-catalog-card" data-stock="${outOfStock ? 0 : stock}" style="color:inherit;text-decoration:none;position:relative">${amazingRibbon}${discountBadge}${comingSoonBadge}<div class="${imageClass}">${colorDots(product, outOfStock)}${imageMarkup(product, name)}</div><div class="${bodyClass}"><div class="pl-catalog-brand">${escapeHtml(product.brand || "")}</div><div class="${config.name}">${name}</div><div class="pl-catalog-footer"><div class="pl-catalog-stock">${status}</div>${priceHtml}</div><div class="pl-amazing-timer-slot">${amazingTimer}</div></div></a>`;
  }

  const requestedParams = new URLSearchParams(window.location.search);
  const requestedCategory = requestedParams.get("category");
  const requestedBrand = requestedParams.get("brand");
  const params = new URLSearchParams({
    category: requestedCategory || config.category,
    limit: "24",
  });
  if (requestedBrand || config.brand) params.set("brand", requestedBrand || config.brand);

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
      grid.innerHTML = data.products.map(card).join("");
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
