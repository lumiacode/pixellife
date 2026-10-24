/* پیشنهاد جستجو هنگام تایپ در نوار جستجوی هدر (همهٔ صفحه‌ها، دسکتاپ و موبایل):
   محصولات مطابق نام + دسته‌بندی‌های مرتبط؛ کلیک مستقیم صفحهٔ محصول/دسته را باز می‌کند. */
(function () {
  const sizedImage = (src, w) => (/^\/api\/products\/image\/[a-f0-9]{24}$/i.test(String(src || "")) ? src + "?w=" + w : src);
  if (window.__plSearchSuggest) return;
  window.__plSearchSuggest = true;
  var input = document.getElementById("searchInput");
  if (!input) return;
  var anchorEl = input.closest(".search-bar") || input;

  var style = document.createElement("style");
  style.textContent =
    ".pl-sg{position:fixed;z-index:2000;background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 14px 40px rgba(15,23,42,.18);overflow:hidden;direction:rtl;max-height:min(70vh,520px);overflow-y:auto}" +
    ".pl-sg[hidden]{display:none}" +
    ".pl-sg-head{padding:10px 14px 4px;font-size:11.5px;font-weight:700;color:#94a3b8}" +
    ".pl-sg a{display:flex;align-items:center;gap:10px;padding:9px 14px;color:#0f172a;text-decoration:none}" +
    ".pl-sg a:hover,.pl-sg a.is-active{background:#eff6ff}" +
    ".pl-sg-cat{font-size:13px;font-weight:700}" +
    ".pl-sg-cat i{color:#3b82f6;font-size:18px}" +
    ".pl-sg-cat small{margin-inline-start:auto;color:#94a3b8;font-size:11.5px;font-weight:500}" +
    ".pl-sg-item img{width:44px;height:44px;flex:0 0 44px;object-fit:contain;border-radius:8px;background:#f1f5f9}" +
    ".pl-sg-text{display:flex;flex-direction:column;min-width:0;flex:1}" +
    ".pl-sg-text b{font-size:13px;font-weight:700;line-height:1.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".pl-sg-text small{font-size:11.5px;color:#64748b}" +
    ".pl-sg-price{font-size:12.5px;font-weight:800;white-space:nowrap;color:#0f172a}" +
    ".pl-sg-price.out{color:#94a3b8;font-weight:600}" +
    ".pl-sg mark{background:#fef08a;color:inherit;border-radius:3px;padding:0 1px}" +
    ".pl-sg a.pl-sg-all{justify-content:center;border-top:1px solid #e2e8f0;color:#2563eb;font-size:13px;font-weight:700}" +
    ".pl-sg-empty{padding:16px 14px;text-align:center;font-size:13px;color:#64748b}";
  document.head.appendChild(style);

  var panel = document.createElement("div");
  panel.className = "pl-sg";
  panel.hidden = true;
  panel.setAttribute("role", "listbox");
  document.body.appendChild(panel);

  var timer = null, controller = null, active = -1, lastQuery = "";
  var fa = function (n) { return Number(n || 0).toLocaleString("fa-IR"); };
  var esc = function (v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  function place() {
    var r = anchorEl.getBoundingClientRect();
    var narrow = window.innerWidth < 700;
    var width = narrow ? window.innerWidth - 16 : Math.max(r.width, 360);
    var right = narrow ? 8 : Math.max(8, window.innerWidth - r.right);
    panel.style.top = Math.round(r.bottom + 6) + "px";
    panel.style.width = Math.round(width) + "px";
    panel.style.right = Math.round(right) + "px";
    panel.style.left = "auto";
  }
  function hide() { panel.hidden = true; active = -1; }
  function links() { return Array.prototype.slice.call(panel.querySelectorAll("a")); }
  function setActive(i) {
    var list = links();
    list.forEach(function (a, idx) { a.classList.toggle("is-active", idx === i); });
    active = i;
    if (list[i]) list[i].scrollIntoView({ block: "nearest" });
  }
  function highlight(text, q) {
    var out = esc(text);
    q.split(/\s+/).filter(function (t) { return t.length > 1; }).forEach(function (t) {
      var safe = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      out = out.replace(new RegExp("(" + safe + ")", "gi"), "<mark>$1</mark>");
    });
    return out;
  }
  function render(data, q) {
    var html = "";
    if (data.categories && data.categories.length) {
      html += '<div class="pl-sg-head">دسته‌بندی‌ها</div>' + data.categories.map(function (c) {
        return '<a class="pl-sg-cat" href="' + esc(c.href) + '"><i class="ti ti-category-2"></i> ' + esc(c.name) + "<small>مشاهدهٔ دسته</small></a>";
      }).join("");
    }
    if (data.products && data.products.length) {
      html += '<div class="pl-sg-head">محصولات</div>' + data.products.map(function (p) {
        var meta = [p.category, p.brand].filter(Boolean).map(esc).join(" · ");
        return '<a class="pl-sg-item" href="/product/' + encodeURIComponent(p.slug) + '">' +
          '<img src="' + esc(sizedImage(p.image, 240) || "/images/product-placeholder.svg") + '" alt="" loading="lazy" onerror="this.onerror=null;this.src=\'/images/product-placeholder.svg\'">' +
          '<span class="pl-sg-text"><b>' + highlight(p.name, q) + "</b><small>" + meta + "</small></span>" +
          '<span class="pl-sg-price' + (p.unavailable ? " out" : "") + '">' + (p.unavailable ? "ناموجود" : fa(p.price) + " تومان") + "</span></a>";
      }).join("");
    } else {
      html += '<div class="pl-sg-empty">کالایی با این نام پیدا نشد.</div>';
    }
    html += '<a class="pl-sg-all" href="/search?q=' + encodeURIComponent(q) + '">نمایش همهٔ نتایج برای «' + esc(q) + "» ‹</a>";
    panel.innerHTML = html;
    place();
    panel.hidden = false;
    active = -1;
  }
  function fetchSuggest(q) {
    if (controller) controller.abort();
    controller = typeof AbortController === "function" ? new AbortController() : null;
    fetch("/api/products/suggest?q=" + encodeURIComponent(q), controller ? { signal: controller.signal } : undefined)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (data && q === input.value.trim()) render(data, q); })
      .catch(function () {});
  }

  input.setAttribute("autocomplete", "off");
  input.addEventListener("input", function () {
    var q = input.value.trim();
    clearTimeout(timer);
    if (q.length < 2) { lastQuery = ""; hide(); return; }
    if (q === lastQuery) return;
    lastQuery = q;
    timer = setTimeout(function () { fetchSuggest(q); }, 200);
  });
  input.addEventListener("focus", function () { if (panel.innerHTML && input.value.trim().length >= 2) { place(); panel.hidden = false; } });
  input.addEventListener("keydown", function (event) {
    if (panel.hidden) return;
    var list = links();
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(Math.min(list.length - 1, active + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(Math.max(-1, active - 1)); }
    else if (event.key === "Escape") { hide(); }
    else if (event.key === "Enter" && active >= 0 && list[active]) {
      // Enter روی گزینهٔ انتخاب‌شده، مستقیم همان صفحه را باز می‌کند (قبل از رفتار قدیمی جستجو)
      event.preventDefault();
      event.stopImmediatePropagation();
      location.href = list[active].href;
    }
  }, true);
  document.addEventListener("click", function (event) {
    if (!panel.contains(event.target) && event.target !== input && !anchorEl.contains(event.target)) hide();
  });
  window.addEventListener("resize", function () { if (!panel.hidden) place(); });
  window.addEventListener("scroll", function () { if (!panel.hidden) place(); }, { passive: true });
})();
