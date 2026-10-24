(() => {
  if (window.PixelLifeBehavior) return;

  const sessionKey = "pl_behavior_session";
  const sessionId = (() => {
    let value = sessionStorage.getItem(sessionKey);
    if (!value) {
      value = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
      sessionStorage.setItem(sessionKey, value);
    }
    return value;
  })();

  const clean = (value, limit) => typeof value === "string" ? value.trim().slice(0, limit) : "";
  const slugFromPath = (pathname) => { const m = String(pathname || "").match(/^\/product\/([^/]+)/); return m ? decodeURIComponent(m[1]) : ""; };
  const currentProductId = () => new URLSearchParams(window.location.search).get("id") || slugFromPath(window.location.pathname);
  const track = (type, details = {}) => {
    const event = {
      type,
      sessionId,
      page: window.location.pathname || "/",
      productId: clean(details.productId || "", 120),
      category: clean(details.category || "", 100),
      brand: clean(details.brand || "", 80),
      searchTerm: clean(details.searchTerm || "", 120),
      filters: details.filters && typeof details.filters === "object" ? details.filters : {},
    };
    fetch("/api/analytics/events", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => {});
  };

  window.PixelLifeBehavior = { track };
  track("page_view");
  if (/^\/product(?:\/|$)/.test(window.location.pathname) && currentProductId()) {
    track("product_view", { productId: currentProductId() });
  }

  document.addEventListener("click", (event) => {
    const productLink = event.target.closest('a[href*="/product"]');
    if (productLink) {
      try {
        const url = new URL(productLink.href, window.location.origin);
        track("product_click", { productId: url.searchParams.get("id") || slugFromPath(url.pathname) });
      } catch (_) {}
    }

    const target = event.target.closest("button, a");
    if (!target) return;
    const productId = target.dataset?.id || target.dataset?.productId || currentProductId();

    if (target.matches("#addCartBtn, .slider-add-btn, [data-add-to-cart]")) {
      track("add_to_cart", { productId });
    } else if (target.matches(".slider-wish-btn, [data-wishlist]")) {
      track(target.classList.contains("active") ? "remove_from_wishlist" : "add_to_wishlist", { productId });
    } else if (target.matches(".mini-remove-btn, .cart-op-btn.danger, [data-remove-from-cart]")) {
      track("remove_from_cart", { productId });
    } else if (target.matches(".btn-checkout, .mini-cart-btn-checkout, [data-checkout]")) {
      track("begin_checkout");
    } else if (target.matches(".filter, [data-filter]")) {
      track("filter_apply", {
        category: clean(target.dataset?.category || "", 100),
        brand: clean(target.dataset?.brand || target.textContent || "", 80),
        filters: { label: clean(target.textContent || "", 80) },
      });
    }
  }, { capture: true });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    const input = form.querySelector('input[type="search"], input[name="q"], input[name="search"], #searchInput');
    if (input?.value?.trim()) track("search", { searchTerm: input.value });
  }, { capture: true });
})();
