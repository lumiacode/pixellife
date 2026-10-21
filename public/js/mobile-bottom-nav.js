(() => {
  const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
  if (!isMobileViewport) return;

  // Samsung Internet و مرورگرهای سازگار، نوار رابط مرورگر را از theme-color می‌خوانند.
  // آن را با نوار ثابت پایین فروشگاه یک‌رنگ نگه می‌داریم.
  const browserChromeColor = "#1b1b1b";
  let themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeColorMeta) {
    themeColorMeta = document.createElement("meta");
    themeColorMeta.name = "theme-color";
    document.head.appendChild(themeColorMeta);
  }
  themeColorMeta.content = browserChromeColor;

  // صفحهٔ محصول نوار خرید ثابتِ خودش را دارد؛ ناوبری عمومی پایین اینجا ساخته نشود.
  const isProductPage = /^\/product(?:\/|$)/.test(window.location.pathname);
  if (isProductPage) return;

  let nav = document.querySelector(".mobile-bottom-nav");
  if (!nav) {
    document.body.insertAdjacentHTML(
      "beforeend",
      `
        <nav class="mobile-bottom-nav" aria-label="ناوبری اصلی موبایل">
          <a class="mobile-bottom-nav__item" data-nav="home" href="/" aria-label="خانه">
            <svg class="mobile-bottom-nav__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-6h6v6"/></svg>
            <span>خانه</span>
          </a>
          <button class="mobile-bottom-nav__item" data-nav="categories" type="button" aria-label="دسته‌بندی‌ها" aria-expanded="false">
            <svg class="mobile-bottom-nav__icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>
            <span>دسته‌بندی‌ها</span>
          </button>
          <a class="mobile-bottom-nav__item" data-nav="cart" href="/cart" aria-label="سبد خرید">
            <svg class="mobile-bottom-nav__icon mobile-bottom-nav__cart-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/><path d="M3 4h2l2.4 11h11l1.8-8H6.2"/></svg>
            <span class="mobile-bottom-nav__badge" data-mobile-cart-count>0</span>
            <span>سبد خرید</span>
          </a>
          <a class="mobile-bottom-nav__item" data-nav="account" href="/profile" aria-label="حساب کاربری">
            <svg class="mobile-bottom-nav__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4 3.2-6 8-6s7.3 2 8 6"/></svg>
            <span>حساب کاربری</span>
          </a>
        </nav>
      `,
    );
    nav = document.querySelector(".mobile-bottom-nav");
  }

  if (!nav) return;

  // نوار پایین با حرکت رو به پایین جمع می‌شود و با اولین اسکرول رو به بالا برمی‌گردد.
  // آستانهٔ کوچک، لرزش‌های ریزِ لمس و جهش نوار مرورگر را نادیده می‌گیرد.
  let lastScrollY = Math.max(0, window.scrollY || window.pageYOffset || 0);
  let scrollDirection = 0;
  let scrollDistance = 0;
  let scrollTicking = false;

  const showBottomNav = () => nav.classList.remove("is-scroll-hidden");
  const setBottomNavVisibilityFromScroll = () => {
    scrollTicking = false;
    const currentY = Math.max(0, window.scrollY || window.pageYOffset || 0);
    const delta = currentY - lastScrollY;

    if (
      document.body.classList.contains("mobile-category-sheet-open") ||
      currentY <= 12
    ) {
      showBottomNav();
      scrollDistance = 0;
      scrollDirection = 0;
      lastScrollY = currentY;
      return;
    }

    // تغییرات خیلی جزئی (مثل bounce یا تغییر ارتفاع chrome مرورگر) هیچ اثری ندارند.
    if (Math.abs(delta) < 2) return;

    const direction = delta > 0 ? 1 : -1;
    if (direction !== scrollDirection) {
      scrollDirection = direction;
      scrollDistance = 0;
    }
    scrollDistance += Math.abs(delta);

    if (direction === 1 && currentY > 56 && scrollDistance >= 16) {
      nav.classList.add("is-scroll-hidden");
      scrollDistance = 0;
    } else if (direction === -1 && scrollDistance >= 8) {
      showBottomNav();
      scrollDistance = 0;
    }

    lastScrollY = currentY;
  };

  window.addEventListener("scroll", () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(setBottomNavVisibilityFromScroll);
  }, { passive: true });

  // با برگشتن به تب یا تغییر اندازهٔ صفحه، نوار در دسترس باقی می‌ماند.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) showBottomNav();
  });
  window.addEventListener("resize", showBottomNav);

  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const isCategoryPath = ["/categories", "/mobiles", "/iphone", "/samsung", "/xiaomi", "/accessories", "/accessories/chargers", "/accessories/apple", "/accessories/samsung", "/accessories/xiaomi", "/ipad", "/tablets", "/samsungtab", "/xiaomitab", "/console", "/headphones", "/smartwatches"].includes(path);

  nav.querySelectorAll(".mobile-bottom-nav__item").forEach((item) => {
    const key = item.dataset.nav;
    const active =
      (key === "home" && path === "/") ||
      (key === "categories" && isCategoryPath) ||
      (key === "cart" && path === "/cart") ||
      (key === "account" && path.startsWith("/profile"));

    item.classList.toggle("is-active", active);
    if (active) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });

  const accountItem = nav.querySelector('[data-nav="account"]');
  accountItem?.addEventListener("click", (event) => {
    let hasAuthHint = false;
    try {
      hasAuthHint = Boolean(
        localStorage.getItem("user") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("token")
      );
    } catch (_) {}

    if (!hasAuthHint) {
      event.preventDefault();
      if (typeof window.openLoginModal === "function") {
        window.openLoginModal();
      } else if (document.getElementById("authPillBtn")) {
        document.getElementById("authPillBtn").click();
      } else {
        window.location.href = "/?openLogin=1";
      }
    }
  });

  // روی بعضی صفحه‌ها (به‌خصوص صفحه محصول) اسکریپت‌های داخلی لینک‌ها را
  // مدیریت می‌کنند. مسیر سبد را صریح نگه می‌داریم تا لمس نوار پایین همیشه
  // کاربر را به صفحه سبد خرید ببرد.
  const cartItem = nav.querySelector('[data-nav="cart"]');
  const openCartImmediately = (event) => {
    if (event.type === "pointerdown" && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    window.location.assign("/cart");
  };
  // روی بعضی صفحه‌ها، handlerهای داخلیِ صفحه کلیک را می‌گیرند. pointerdown
  // باعث می‌شود سبد خرید با اولین لمس باز شود؛ click فقط برای کیبورد/مرورگرهای قدیمی است.
  cartItem?.addEventListener("pointerdown", openCartImmediately, { capture: true });
  cartItem?.addEventListener("click", openCartImmediately, { capture: true });

  const categoryItem = nav.querySelector('[data-nav="categories"]');
  let categorySheet;
  let categoryBackdrop;
  let categorySheetOpenedAt = 0;
  let categorySheetCloseTimer = null;

  const finishCategorySheetClose = () => {
    if (categorySheet?.classList.contains("is-open")) return;
    categorySheet?.classList.remove("is-mounted", "is-dragging");
    categorySheet?.style.removeProperty("transform");
    categoryBackdrop?.classList.remove("is-mounted");
  };

  const closeCategorySheet = (event) => {
    // در برخی مرورگرهای اندروید، click مصنوعیِ همان لمس بعد از بازشدن روی
    // backdrop تازه‌ظاهرشده فرود می‌آید. این click نباید کشو را فوراً ببندد.
    if (
      event?.currentTarget === categoryBackdrop &&
      Date.now() - categorySheetOpenedAt < 900
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    window.clearTimeout(categorySheetCloseTimer);
    categorySheet?.classList.remove("is-open", "is-dragging");
    categorySheet?.style.removeProperty("transform");
    categoryBackdrop?.classList.remove("is-open");
    categoryItem?.classList.remove("is-expanded");
    categoryItem?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("mobile-category-sheet-open");
    categorySheetCloseTimer = window.setTimeout(finishCategorySheetClose, 430);
  };

  const openCategorySheet = () => {
    if (!categorySheet || !categoryBackdrop) return;
    showBottomNav();
    window.clearTimeout(categorySheetCloseTimer);
    categorySheetOpenedAt = Date.now();
    categorySheet.classList.remove("is-dragging");
    categorySheet.style.removeProperty("transform");
    categorySheet.classList.add("is-mounted");
    categoryBackdrop.classList.add("is-mounted");
    // حالت بسته را یک‌بار رندر می‌کنیم تا مرورگر حتماً حرکت کشویی را اجرا کند.
    void categorySheet.offsetHeight;
    categorySheet.classList.add("is-open");
    categoryBackdrop.classList.add("is-open");
    categoryItem?.classList.add("is-expanded");
    categoryItem?.setAttribute("aria-expanded", "true");
    document.body.classList.add("mobile-category-sheet-open");
  };

  if (categoryItem && window.matchMedia("(max-width: 768px)").matches) {
    categoryItem.setAttribute("aria-expanded", "false");

    const sheet = document.createElement("section");
    sheet.className = "mobile-category-sheet";
    sheet.id = "mobileCategorySheet";
    sheet.setAttribute("aria-label", "دسته‌بندی‌ها");
    sheet.innerHTML = `
      <div class="mobile-category-sheet__handle"></div>
      <div class="mobile-category-sheet__header">
        <h2 class="mobile-category-sheet__title">دسته‌بندی کالاها</h2>
        <button class="mobile-category-sheet__close" type="button" aria-label="بستن">×</button>
      </div>
      <label class="mobile-category-sheet__search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"></circle><path d="m16 16 4 4"></path></svg>
        <input type="search" autocomplete="off" placeholder="جست‌وجوی دسته یا محصول" aria-label="جست‌وجوی دسته‌ها و محصولات" enterkeyhint="search" />
      </label>
      <div class="mobile-category-sheet__layout">
        <aside class="mobile-category-sheet__rail" aria-label="دسته‌های اصلی"></aside>
        <section class="mobile-category-sheet__content" aria-live="polite"></section>
      </div>`;;
    const backdrop = document.createElement("div");
    backdrop.className = "mobile-category-backdrop";
    backdrop.setAttribute("aria-hidden", "true");

    // داده‌ها از public/js/category-data.js (منبع مشترک با مگامنوی دسکتاپ)؛ دیگر نسخهٔ جداگانه و تکراری نداریم.
    const categories = Array.isArray(window.PLCategories) ? window.PLCategories : [];
    const categoryHref = { mobile: "/mobiles", tablet: "/tablets", headphone: "/headphones", watch: "/smartwatches", console: "/console" };
    const rail = sheet.querySelector(".mobile-category-sheet__rail");
    const categoryContent = sheet.querySelector(".mobile-category-sheet__content");
    const chevron = '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>';

    const searchInput = sheet.querySelector(".mobile-category-sheet__search input");
    const renderContent = (markup) => {
      categoryContent.classList.remove("is-changing");
      void categoryContent.offsetWidth;
      categoryContent.innerHTML = markup;
      categoryContent.classList.add("is-changing");
    };
    const catIcon = (category, size) => category.image ? `<img class="mobile-category-sheet__icon-image" src="${category.image}" alt="" ${size ? `width="${size}" height="${size}"` : ""}>` : "";
    // ردیف لینک: فقط عنوان و فلش؛ زیرمجموعه‌ها (مثلاً برندها) به‌صورت چیپ‌های هم‌رنگ زیرش
    const linkMarkup = (link) => {
      const parent = `<a class="mobile-category-sheet__link" href="${link.href}"><span class="mobile-category-sheet__link-main"><span>${link.label}</span></span>${chevron}</a>`;
      const children = Array.isArray(link.children) ? link.children : [];
      if (!children.length) return parent;
      return `<section class="mobile-category-sheet__group">${parent}<div class="mobile-category-sheet__brand-links" aria-label="برندهای ${link.label}">${children.map((child) => `<a class="mobile-category-sheet__brand-link" href="${child.href}">${child.label}</a>`).join("")}</div></section>`;
    };

    const renderCategory = (id) => {
      const category = categories.find((item) => item.id === id) || categories[0];
      if (!category) return;
      rail.querySelectorAll(".mobile-category-sheet__rail-item").forEach((item) => {
        item.classList.toggle("is-active", item.dataset.category === category.id);
      });
      const allHref = categoryHref[category.id] || "";
      const groups = Array.isArray(category.groups) ? category.groups : [];
      const body = Array.isArray(category.logoLinks) && category.logoLinks.length
        ? `<div class="mobile-category-sheet__console-logo-links">${category.logoLinks.map((link) => `<a class="mobile-category-sheet__console-logo-link" href="${link.href}" aria-label="${link.label}"><img src="${link.image}" alt="${link.label}"></a>`).join("")}</div>`
        : groups.map((group) => {
            // «همه …» که همان لینک سرتیتر است حذف می‌شود تا دوبار نیاید
            const links = (group.links || []).filter((link) => link.href !== allHref);
            const title = groups.length > 1 || group.title !== category.name ? `<h3 class="mobile-category-sheet__group-title">${group.title}</h3>` : "";
            return title + links.map(linkMarkup).join("");
          }).join("");
      renderContent(`
        <div class="mobile-category-sheet__content-head">${catIcon(category)}<span>${category.name}</span></div>
        ${allHref ? `<a class="mobile-category-sheet__all-link" href="${allHref}">همه محصولات ${category.name}${chevron}</a>` : ""}
        ${body}`);
    };

    // جست‌وجوی کشو: زیردسته‌ها و برندها (محلی) + محصولات (از /api/products/suggest). دستهٔ «کنسول» لینک متنی ندارد؛ قبلاً همین باعث خطا و نتیجهٔ خالی می‌شد.
    const norm = (value) => String(value || "").toLocaleLowerCase("fa").replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/آ/g, "ا").replace(/\s+/g, " ").trim();
    const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const faNum = (value) => Number(value || 0).toLocaleString("fa-IR");
    const matchCategories = (normalized) => {
      const hits = [];
      categories.forEach((category) => {
        const before = hits.length;
        (category.groups || []).forEach((group) => (group.links || []).forEach((link) => {
          if (norm(category.name + " " + group.title + " " + link.label).includes(normalized)) hits.push({ category, link: { label: group.title === category.name ? link.label : group.title + " — " + link.label, href: link.href } });
          (link.children || []).forEach((child) => {
            if (norm(category.name + " " + link.label + " " + child.label).includes(normalized)) hits.push({ category, link: { label: link.label + " — " + child.label, href: child.href } });
          });
        }));
        (category.logoLinks || []).forEach((logo) => {
          if (norm(category.name + " " + logo.label).includes(normalized)) hits.push({ category, link: { label: logo.label, href: logo.href } });
        });
        if (hits.length === before && norm(category.name).includes(normalized) && categoryHref[category.id]) {
          hits.push({ category, link: { label: "همه محصولات " + category.name, href: categoryHref[category.id] } });
        }
      });
      return hits;
    };
    const productRow = (product) => `<a class="mobile-category-sheet__link mobile-category-sheet__product" href="/product?id=${encodeURIComponent(product.slug)}"><img src="${esc(product.image || "/images/product-placeholder.svg")}" alt="" loading="lazy" onerror="this.onerror=null;this.src='/images/product-placeholder.svg'"><span class="mobile-category-sheet__product-text"><b>${esc(product.name)}</b><small>${[product.category, product.brand].filter(Boolean).map(esc).join(" · ")}</small></span><em class="${product.unavailable ? "is-out" : ""}">${product.unavailable ? "ناموجود" : faNum(product.price) + " تومان"}</em></a>`;
    let searchSeq = 0;
    let searchTimer = null;
    const paintSearch = (query, localHits, productsState) => {
      let productsMarkup = "";
      if (productsState === "loading") productsMarkup = '<p class="mobile-category-sheet__content-desc">در حال جست‌وجوی محصولات...</p>';
      else if (productsState && productsState.length) productsMarkup = '<p class="mobile-category-sheet__content-desc">محصولات</p>' + productsState.map(productRow).join("") + `<a class="mobile-category-sheet__link mobile-category-sheet__all" href="/search?q=${encodeURIComponent(query)}"><span class="mobile-category-sheet__link-main"><span>نمایش همهٔ نتایج برای «${esc(query)}»</span></span>${chevron}</a>`;
      const empty = !localHits.length && Array.isArray(productsState) && !productsState.length;
      renderContent(`
        <div class="mobile-category-sheet__content-head"><span>نتایج جست‌وجو</span></div>
        ${localHits.length ? '<p class="mobile-category-sheet__content-desc">دسته‌ها و برندها</p>' + localHits.map(({ link }) => linkMarkup(link)).join("") : ""}
        ${productsMarkup}
        ${empty ? '<p class="mobile-category-sheet__content-desc">نتیجه‌ای پیدا نشد. نام دیگری را امتحان کنید.</p>' : ""}`);
    };
    const renderSearch = (query) => {
      const normalized = norm(query);
      clearTimeout(searchTimer);
      searchSeq += 1;
      const seq = searchSeq;
      if (!normalized) {
        renderCategory(categories[0].id);
        return;
      }
      rail.querySelectorAll(".mobile-category-sheet__rail-item").forEach((item) => item.classList.remove("is-active"));
      const localHits = matchCategories(normalized);
      if (normalized.length < 2) {
        paintSearch(query.trim(), localHits, []);
        return;
      }
      paintSearch(query.trim(), localHits, "loading");
      searchTimer = setTimeout(() => {
        fetch("/api/products/suggest?q=" + encodeURIComponent(query.trim()))
          .then((response) => (response.ok ? response.json() : null))
          .then((data) => { if (seq === searchSeq) paintSearch(query.trim(), localHits, data && data.products ? data.products : []); })
          .catch(() => { if (seq === searchSeq) paintSearch(query.trim(), localHits, []); });
      }, 250);
    };

    categories.forEach((category) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "mobile-category-sheet__rail-item";
      item.dataset.category = category.id;
      item.innerHTML = `${catIcon(category, 34)}<span>${category.name}</span>`;
      item.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        renderCategory(category.id);
      });
      rail.appendChild(item);
    });
    if (categories.length) renderCategory(categories[0].id);
    searchInput?.addEventListener("input", (event) => renderSearch(event.currentTarget.value));

    document.body.append(backdrop, sheet);
    categorySheet = sheet;
    categoryBackdrop = backdrop;

    const toggleCategorySheet = (event) => {
      if (!window.matchMedia("(max-width: 768px)").matches) return;
      event.preventDefault();
      event.stopPropagation();
      categorySheet.classList.contains("is-open")
        ? closeCategorySheet()
        : openCategorySheet();
    };

    // touchend غیرمنفعل، click مصنوعی بعد از لمس را در مرورگرهای موبایل
    // متوقف می‌کند. click فقط برای کیبورد، ماوس و مرورگرهای فاقد touch است.
    let lastCategoryTouchToggle = 0;
    categoryItem.addEventListener("touchend", (event) => {
      lastCategoryTouchToggle = Date.now();
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleCategorySheet(event);
    }, { capture: true, passive: false });

    categoryItem.addEventListener("click", (event) => {
      if (Date.now() - lastCategoryTouchToggle < 1200) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      toggleCategorySheet(event);
    }, { capture: true });

    let dragStartY = null;
    let dragDistance = 0;
    const handle = sheet.querySelector(".mobile-category-sheet__handle");

    handle?.addEventListener("pointerdown", (event) => {
      if (!sheet.classList.contains("is-open")) return;
      dragStartY = event.clientY;
      dragDistance = 0;
      sheet.classList.add("is-dragging");
      handle.setPointerCapture?.(event.pointerId);
    });

    handle?.addEventListener("pointermove", (event) => {
      if (dragStartY === null) return;
      dragDistance = Math.max(0, event.clientY - dragStartY);
      sheet.style.transform = `translate3d(0, ${dragDistance}px, 0)`;
    });

    const finishDrag = () => {
      if (dragStartY === null) return;
      const shouldClose = dragDistance > 85;
      dragStartY = null;
      dragDistance = 0;
      sheet.classList.remove("is-dragging");
      sheet.style.removeProperty("transform");
      if (shouldClose) closeCategorySheet();
    };

    handle?.addEventListener("pointerup", finishDrag);
    handle?.addEventListener("pointercancel", finishDrag);

    sheet.querySelector(".mobile-category-sheet__close")?.addEventListener("click", closeCategorySheet);
    backdrop.addEventListener("click", closeCategorySheet);
    sheet.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeCategorySheet();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeCategorySheet();
    });
  }

  const badge = nav.querySelector("[data-mobile-cart-count]");
  if (!badge) return;

  const updateCartBadge = () => {
    try {
      const cart = JSON.parse(
        localStorage.getItem("digishop_cart") ||
        localStorage.getItem("cart") ||
        "[]"
      );
      const count = Array.isArray(cart)
        ? cart.reduce((sum, item) => sum + Number(item.qty || 1), 0)
        : 0;
      badge.textContent = count > 99 ? "99+" : String(count);
      badge.style.display = count > 0 ? "block" : "none";
    } catch (_) {
      badge.style.display = "none";
    }
  };

  updateCartBadge();
  window.addEventListener("storage", updateCartBadge);
  window.addEventListener("cartUpdated", updateCartBadge);
})();
