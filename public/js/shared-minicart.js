/* سبد خرید کوچک هدر برای صفحه‌هایی که خودشان ندارند (سامسونگ، شیائومی، کنسول و …).
   شمارندهٔ سبد را به‌روز می‌کند و پنجرهٔ بازشوندهٔ آیتم‌ها را می‌سازد؛ روی صفحه‌هایی که سبد کوچک خودشان را دارند تزریق نمی‌شود. */
(function () {
  "use strict";
  var KEY = "digishop_cart";
  var wrap = document.querySelector(".cart-wrap");
  // صفحه‌هایی که رندر سبد کوچک خودشان را دارند (صفحهٔ اصلی، آیفون، سبد خرید) دست‌نخورده می‌مانند.
  if (!wrap || typeof window.renderMiniCart === "function") return;

  var badge = document.getElementById("cartCount");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "cart-badge";
    badge.id = "cartCount";
    badge.style.display = "none";
    wrap.appendChild(badge);
  }
  // اگر قالب صفحه فقط پوستهٔ پنجره (مثل آیپد) را دارد، همان را پر می‌کنیم؛ وگرنه می‌سازیم.
  var dropdown = document.getElementById("cartDropdown");
  if (!dropdown) {
    dropdown = document.createElement("div");
    dropdown.className = "cart-dropdown";
    dropdown.id = "cartDropdown";
    dropdown.innerHTML =
      '<div id="miniCartItems"></div>' +
      '<div class="mini-cart-footer" id="miniCartFooter" style="display:none">' +
      '<div class="mini-cart-total"><span>مجموع:</span><span id="miniCartTotalPrice">۰ تومان</span></div>' +
      '<a href="/cart" class="mini-cart-btn-checkout"><i class="ti ti-check"></i> مشاهده سبد و تسویه حساب</a></div>';
    wrap.appendChild(dropdown);
  }
  var itemsWrap = dropdown.querySelector("#miniCartItems");
  var footer = dropdown.querySelector("#miniCartFooter");
  var totalEl = dropdown.querySelector("#miniCartTotalPrice");

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function toman(n) { return Number(n || 0).toLocaleString("fa-IR") + " تومان"; }
  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (_) { return []; } }
  function write(cart) {
    try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (_) {}
    window.dispatchEvent(new Event("cartUpdated"));
  }
  function qty(item) {
    var q = Number(item.quantity != null ? item.quantity : item.qty);
    return Number.isFinite(q) ? Math.max(1, Math.floor(q)) : 1;
  }
  function stock(item) { var s = Number(item.stock); return Number.isFinite(s) ? Math.max(0, Math.floor(s)) : Infinity; }
  function isAvailable(item) { return item.available !== false && stock(item) > 0; }

  function render() {
    var cart = read();
    var count = cart.filter(isAvailable).reduce(function (sum, it) { return sum + qty(it); }, 0);
    badge.textContent = count > 99 ? "99+" : count;
    badge.style.display = count > 0 ? "flex" : "none";
    if (!cart.length) {
      itemsWrap.innerHTML = '<div class="mini-cart-empty"><i class="ti ti-shopping-cart-off" style="font-size:24px;display:block;margin-bottom:8px;"></i>سبد خرید شما خالی است</div>';
      footer.style.display = "none";
      return;
    }
    footer.style.display = "block";
    totalEl.textContent = toman(cart.reduce(function (s, it) { return s + (Number(it.price) || 0) * (isAvailable(it) ? qty(it) : 0); }, 0));
    itemsWrap.innerHTML = cart.map(function (it) {
      var id = esc(it.id), canInc = isAvailable(it) && qty(it) < stock(it);
      return '<div class="mini-cart-item" data-id="' + id + '">' +
        '<img class="mini-cart-img" src="' + esc(it.image || "/images/product-placeholder.svg") + '" alt="' + esc(it.name) + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'/images/product-placeholder.svg\'">' +
        '<div class="mini-cart-info"><div class="mini-cart-name">' + esc(it.name) + '</div><div class="mini-cart-price">' + toman(it.price) + "</div></div>" +
        '<div class="mini-cart-actions"><button class="mini-remove-btn" data-action="remove" data-id="' + id + '" aria-label="حذف"><i class="ti ti-trash"></i></button>' +
        '<div class="mini-qty-controls"><button class="mini-qty-btn" data-action="inc" data-id="' + id + '"' + (canInc ? "" : " disabled") + ">+</button>" +
        '<span class="mini-qty-val">' + qty(it) + "</span>" +
        '<button class="mini-qty-btn" data-action="dec" data-id="' + id + '"' + (!isAvailable(it) || qty(it) <= 1 ? " disabled" : "") + ">−</button></div></div></div>";
    }).join("");
  }

  itemsWrap.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-action]");
    if (!btn) return;
    var cart = read(), idx = cart.findIndex(function (it) { return String(it.id) === String(btn.dataset.id); });
    if (idx < 0) return;
    var item = cart[idx], action = btn.dataset.action;
    if (action === "remove") cart.splice(idx, 1);
    else if (action === "dec") { if (qty(item) <= 1) cart.splice(idx, 1); else { item.quantity = qty(item) - 1; item.qty = item.quantity; } }
    else if (action === "inc") { if (!isAvailable(item) || qty(item) >= stock(item)) return; item.quantity = qty(item) + 1; item.qty = item.quantity; }
    write(cart);
  });

  // روی موبایل با کلیک باز می‌شود (روی دسکتاپ با hover از CSS)
  var btn = wrap.querySelector("a.h-btn");
  if (btn) btn.addEventListener("click", function (event) {
    if (window.matchMedia("(max-width: 480px)").matches) { event.preventDefault(); wrap.classList.toggle("open"); }
  });
  document.addEventListener("click", function (event) { if (!wrap.contains(event.target)) wrap.classList.remove("open"); });

  window.addEventListener("cartUpdated", render);
  window.addEventListener("storage", function (event) { if (event.key === KEY) render(); });
  window.addEventListener("pageshow", render);
  render();
})();
