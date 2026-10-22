(() => {
  const run = () => {
    if (!window.matchMedia("(max-width: 768px)").matches || document.getElementById("mobileProductDetailsSheet")) return true;
    const page = document.getElementById("pageBody");
    const productInfo = page?.querySelector(".product-info-col");
    const specs = document.getElementById("fullSpecsSection");
    const review = document.getElementById("productReviewSection");
    if (!page || !productInfo) return false;

    const sources = [
      { id: "intro", label: "معرفی کالا" },
      ...(review && review.style.display !== "none" ? [{ id: "review", label: "بررسی تخصصی" }] : []),
      ...(specs ? [{ id: "specs", label: "جدول مشخصات" }] : [])
    ];
    if (!sources.length) return false;

    const oldNav = page.querySelector(".mobile-product-section-nav");
    const triggerNav = document.createElement("nav");
    triggerNav.className = "mobile-product-section-nav mobile-product-details-trigger-nav";
    triggerNav.setAttribute("aria-label", "جزئیات محصول");
    triggerNav.innerHTML = sources.map((item, index) => '<button type="button" class="mobile-product-section-tab' + (index === 0 ? " is-active" : "") + '" data-product-sheet-tab="' + item.id + '">' + item.label + "</button>").join("");
    (oldNav || productInfo).after(triggerNav);
    oldNav?.remove();

    const backdrop = document.createElement("div");
    backdrop.className = "mobile-product-details-backdrop";
    const sheet = document.createElement("section");
    sheet.className = "mobile-product-details-sheet";
    sheet.id = "mobileProductDetailsSheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-label", "مشخصات و بررسی کالا");
    sheet.innerHTML = '<div class="mobile-product-details-sheet__handle"></div><header class="mobile-product-details-sheet__head"><h2 class="mobile-product-details-sheet__title">مشخصات و بررسی کالا</h2><button type="button" class="mobile-product-details-sheet__close" aria-label="بستن">×</button></header><nav class="mobile-product-details-sheet__tabs" aria-label="بخش‌های بررسی"></nav><div class="mobile-product-details-sheet__body"></div>';
    document.body.append(backdrop, sheet);

    const tabs = sheet.querySelector(".mobile-product-details-sheet__tabs");
    const body = sheet.querySelector(".mobile-product-details-sheet__body");
    tabs.innerHTML = sources.map((item, index) => '<button type="button" class="mobile-product-details-sheet__tab' + (index === 0 ? " is-active" : "") + '" data-product-sheet-content="' + item.id + '">' + item.label + "</button>").join("");

    const cleanClone = (node) => {
      const copy = node.cloneNode(true);
      copy.removeAttribute("id");
      copy.classList.remove("collapsible-fade", "is-collapsed"); // در پنل کشویی محتوا کامل است
      // Keep page-only expansion controls out of the full-details panel.
      // Remove them before IDs are renamed for the cloned content.
      copy.querySelectorAll("#btnMoreSpecs, #specsToggleBtn, .btn-more-specs, .specs-toggle-btn, [data-product-details-sheet='specs']").forEach((item) => item.remove());
      const sectionIds = new Map();
      copy.querySelectorAll("[id]").forEach((item) => {
        const oldId = item.id;
        const newId = "mobile-sheet-" + oldId;
        sectionIds.set(oldId, newId);
        item.id = newId;
      });
      copy.querySelectorAll('a[href^="#"]').forEach((link) => {
        const oldId = link.getAttribute("href").slice(1);
        if (sectionIds.has(oldId)) link.setAttribute("href", "#" + sectionIds.get(oldId));
      });
      copy.querySelectorAll(".hidden-spec").forEach((item) => item.classList.remove("hidden-spec"));
      copy.querySelectorAll(".review-section--more").forEach((item) => item.classList.remove("review-section--more"));
      copy.querySelectorAll(".review-section-img--collapsed").forEach((item) => item.classList.remove("review-section-img--collapsed"));
      copy.querySelectorAll(".review-article-nav--collapsed").forEach((item) => item.classList.remove("review-article-nav--collapsed"));
      copy.querySelectorAll(".review-article-toggle").forEach((item) => item.remove());
      copy.querySelectorAll('[style*="display:none"], [style*="display: none"]').forEach((item) => item.style.removeProperty("display"));
      return copy;
    };

    const render = (id) => {
      body.replaceChildren();
      const wrap = document.createElement("div");
      wrap.className = "mobile-product-details-sheet__content";
      if (id === "intro") {
        const title = document.createElement("h3");
        title.className = "mobile-product-details-sheet__intro-title";
        title.textContent = productInfo.dataset.introTitle?.trim() || "معرفی کالا";
        const text = document.createElement("p");
        text.className = "mobile-product-details-sheet__intro-text";
        text.textContent = productInfo.querySelector(".product-desc")?.textContent?.trim() || "توضیحی برای این کالا ثبت نشده است.";
        wrap.classList.add("mobile-product-details-sheet__intro");
        wrap.append(title, text);
        [".quick-specs-card", ".product-attention"].forEach((selector) => {
          const node = productInfo.querySelector(selector);
          if (node) wrap.append(cleanClone(node));
        });
      } else {
        const source = id === "review" ? review : specs;
        if (source) wrap.append(cleanClone(source));
      }
      body.append(wrap);
      tabs.querySelectorAll("[data-product-sheet-content]").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.productSheetContent === id));
    };

    let closeTimer = 0;
    const close = () => {
      window.clearTimeout(closeTimer);
      sheet.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      document.body.classList.remove("mobile-product-details-open");
      closeTimer = window.setTimeout(() => {
        sheet.classList.remove("is-mounted");
        backdrop.classList.remove("is-mounted");
      }, 410);
    };
    const open = (id) => {
      window.clearTimeout(closeTimer);
      render(id);
      sheet.classList.add("is-mounted");
      backdrop.classList.add("is-mounted");
      void sheet.offsetHeight;
      sheet.classList.add("is-open");
      backdrop.classList.add("is-open");
      document.body.classList.add("mobile-product-details-open");
      body.scrollTop = 0;
    };
    triggerNav.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-product-sheet-tab]");
      if (tab) open(tab.dataset.productSheetTab);
    });
    // نسخه‌های قبلی صفحه یک ناوبری اسکرولی با data-section-target ساخته بودند.
    // این شنونده آن ناوبری را هم به پنل مستقل هدایت می‌کند تا هیچ لمسِ «بررسی تخصصی»
    // کاربر را به دیدگاه‌ها، مزایای خرید یا فوتر نبرد.
    document.addEventListener("click", (event) => {
      const legacyReviewTab = event.target.closest(
        '.mobile-product-section-tab[data-section-target="productReviewSection"]',
      );
      if (!legacyReviewTab) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      open("review");
    }, true);
    // هر کنترل «مشخصات بیشتر/نمایش کامل مشخصات» در هر بخش از صفحه باید
    // به‌جای باز کردن ردیف‌ها در همان صفحه، پنل کشویی را روی جدول کامل باز کند.
    document.addEventListener("click", (event) => {
      const moreSpecsButton = event.target.closest(
        "#btnMoreSpecs, #specsToggleBtn, .btn-more-specs, .specs-toggle-btn, [data-product-details-sheet='specs']",
      );
      const isSpecsAction = /(?:مشخصات|ویژگی)[^]*?(?:بیشتر|کامل)|(?:نمایش)[^]*?(?:مشخصات|ویژگی)/.test(
        moreSpecsButton?.textContent || "",
      );
      if (!moreSpecsButton || !isSpecsAction || !specs) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      open("specs");
    }, true);
    // «بررسی کامل محصول» نیز ادامهٔ همان بررسی را در پنل کشویی نمایش می‌دهد.
    document.addEventListener("click", (event) => {
      const fullReviewButton = event.target.closest(
        "#reviewArticleToggle, .review-article-toggle, [data-product-details-sheet='review']",
      );
      const isReviewAction = /بررسی[^]*?(?:کامل|بیشتر)|(?:نمایش)[^]*?بررسی/.test(
        fullReviewButton?.textContent || "",
      );
      if (!fullReviewButton || !isReviewAction || !review) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      open("review");
    }, true);
    tabs.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-product-sheet-content]");
      if (tab) render(tab.dataset.productSheetContent);
    });
    body.addEventListener("click", (event) => {
      const reviewLink = event.target.closest('a[href^="#mobile-sheet-"]');
      if (!reviewLink) return;
      const target = body.querySelector(reviewLink.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    // چیپ‌های معرفی/نگاه کلی در نسخهٔ اصلی صفحه و در پنل، فقط اسکرول می‌کنند؛
    // نباید با تغییر hash برای هر لمس یک ورودی جدید در تاریخچهٔ مرورگر بسازند.
    document.addEventListener("click", (event) => {
      const reviewChip = event.target.closest(".review-nav-chip[href^='#']");
      if (!reviewChip) return;
      const targetId = reviewChip.getAttribute("href").slice(1);
      const target = document.getElementById(targetId);
      if (!target) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, true);
    sheet.querySelector(".mobile-product-details-sheet__close").addEventListener("click", close);
    backdrop.addEventListener("click", close);
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
    return true;
  };
  const start = () => {
    if (run()) return;
    let attempts = 0;
    const waitForProduct = window.setInterval(() => {
      attempts += 1;
      if (run() || attempts >= 80) window.clearInterval(waitForProduct);
    }, 125);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
