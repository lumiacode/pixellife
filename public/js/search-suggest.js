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
    ".pl-sg{position:fixed;z-index:2000;background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 14px 40px rgba(15,23,42,.18);overflow:hidden;direction:rtl;max-height:min(70vh,520px); max-height:min(70dvh,520px);overflow-y:auto}" +
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
    ".pl-sg-empty{padding:16px 14px;text-align:center;font-size:13px;color:#64748b}" +
    ".pl-sg-headrow{display:flex;align-items:center;justify-content:space-between;padding:10px 14px 4px}" +
    ".pl-sg-headrow .pl-sg-head{padding:0}" +
    ".pl-sg-clear{border:0;background:none;color:#2563eb;font:inherit;font-size:12px;font-weight:700;cursor:pointer;padding:4px 6px;border-radius:6px}" +
    ".pl-sg-clear:hover{background:#eff6ff}" +
    ".pl-sg-recent{position:relative;display:flex;align-items:center}" +
    ".pl-sg-recent a{flex:1;min-width:0;font-size:13px;font-weight:600}" +
    ".pl-sg-recent a i{color:#94a3b8;font-size:17px}" +
    ".pl-sg-recent a span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".pl-sg-del{flex:0 0 auto;width:36px;height:36px;margin-inline-end:6px;border:0;border-radius:50%;background:none;color:#94a3b8;font-size:16px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}" +
    ".pl-sg-del:hover,.pl-sg-del:focus-visible{background:#f1f5f9;color:#dc2626}" +
    ".pl-sg-pop{display:flex;flex-wrap:wrap;gap:8px;padding:6px 14px 14px}" +
    ".pl-sg a.pl-sg-chip{display:inline-flex;padding:7px 14px;border:1px solid #e2e8f0;border-radius:999px;background:#fff;font-size:13px;font-weight:600;color:#334155}" +
    ".pl-sg a.pl-sg-chip:hover,.pl-sg a.pl-sg-chip.is-active{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}" +
    ".pl-sg a:focus-visible,.pl-sg button:focus-visible{outline:2px solid #2563eb;outline-offset:-2px}";
  document.head.appendChild(style);

  var panel = document.createElement("div");
  panel.className = "pl-sg";
  panel.hidden = true;
  panel.setAttribute("role", "listbox");
  panel.id = "plSearchPanel";
  document.body.appendChild(panel);
  input.setAttribute("aria-controls", "plSearchPanel");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-autocomplete", "list");

  /* جستجوهای اخیر: فقط در مرورگر خود کاربر (localStorage) نگه‌داری می‌شود و به سرور ارسال نمی‌شود. */
  var RECENT_KEY = "pl_recent_searches_v1", RECENT_MAX = 8, RECENT_LEN = 60;
  var cleanTerm = function (v) { return String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, RECENT_LEN); };
  function readRecents() {
    try {
      var list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      return Array.isArray(list) ? list.map(cleanTerm).filter(function (t) { return t.length >= 2; }).slice(0, RECENT_MAX) : [];
    } catch (e) { return []; }
  }
  function writeRecents(list) { try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (e) {} }
  function addRecent(term) {
    term = cleanTerm(term);
    if (term.length < 2) return;
    var key = term.toLowerCase();
    var list = readRecents().filter(function (t) { return t.toLowerCase() !== key; });
    list.unshift(term);
    writeRecents(list.slice(0, RECENT_MAX));
  }
  function removeRecent(term) {
    var key = cleanTerm(term).toLowerCase();
    writeRecents(readRecents().filter(function (t) { return t.toLowerCase() !== key; }));
  }
  // هر ورود به صفحهٔ نتایج (از هر مسیری) ثبت می‌شود
  try {
    if (/^\/search(\.html)?\/?$/.test(location.pathname)) addRecent(new URLSearchParams(location.search).get("q"));
  } catch (e) {}

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
  function hide() { panel.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); }
  function show() { panel.hidden = false; input.setAttribute("aria-expanded", "true"); }
  /* پرجستجوها: از خود فهرست کالاهای سایت ساخته می‌شود تا هر چیپ حتماً نتیجه داشته باشد (بدون فهرست دستی و فرضی). */
  var POPULAR_MAX = 8, popular = null, popularLoading = false;
  var POPULAR_WORDS = [
    { term: "آیفون", match: /آیفون|ایفون|iphone/i }, { term: "سامسونگ", match: /سامسونگ|samsung/i }, { term: "شیائومی", match: /شیائومی|xiaomi/i },
    { term: "آیپد", match: /آیپد|ایپد|ipad/i }, { term: "ایرپاد", match: /ایرپاد|airpods?/i }, { term: "ساعت هوشمند", match: /ساعت هوشمند|smart ?watch|اپل واچ/i },
    { term: "شارژر", match: /شارژر|charger/i }, { term: "پاوربانک", match: /پاوربانک|power ?bank/i }, { term: "هندزفری", match: /هندزفری|هدفون|handsfree|headphone/i },
    { term: "کابل", match: /کابل|cable/i }, { term: "قاب", match: /قاب|کاور|case/i }, { term: "گلس", match: /گلس|محافظ صفحه/i },
    { term: "تبلت", match: /تبلت|tablet/i }, { term: "کنسول", match: /کنسول|پلی ?استیشن|playstation|ps5|xbox/i }
  ];
  function ensurePopular() {
    if (popular !== null || popularLoading) return;
    popularLoading = true;
    fetch("/api/products?limit=40")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var list = data && data.success && Array.isArray(data.products) ? data.products : [];
        var texts = list.map(function (p) { return [p.name, p.brand, p.category].join(" "); });
        popular = POPULAR_WORDS.map(function (w) { return { term: w.term, n: texts.filter(function (t) { return w.match.test(t); }).length }; })
          .filter(function (w) { return w.n > 0; })
          .sort(function (a, b) { return b.n - a.n; })
          .slice(0, POPULAR_MAX).map(function (w) { return w.term; });
        popularLoading = false;
        if (!panel.hidden || document.activeElement === input) { if (input.value.trim().length < 2) renderRecents(input.value.trim()); }
      })
      .catch(function () { popular = []; popularLoading = false; });
  }
  function renderRecents(q) {
    var key = (q || "").toLowerCase();
    var list = readRecents().filter(function (t) { return !key || t.toLowerCase().indexOf(key) !== -1; });
    var pops = !key && popular ? popular : [];
    if (popular === null) ensurePopular();
    if (!list.length && !pops.length) { hide(); return false; }
    var html = "";
    if (list.length) {
      html += '<div class="pl-sg-headrow"><span class="pl-sg-head">جستجوهای اخیر</span><button type="button" class="pl-sg-clear" data-clear>پاک کردن همه</button></div>' +
        list.map(function (t) {
          return '<div class="pl-sg-recent" role="presentation"><a href="/search.html?q=' + encodeURIComponent(t) + '" data-recent="' + esc(t) + '"><i class="ti ti-history" aria-hidden="true"></i><span>' + esc(t) + '</span></a>' +
            '<button type="button" class="pl-sg-del" data-del="' + esc(t) + '" aria-label="حذف «' + esc(t) + '» از جستجوهای اخیر"><i class="ti ti-x" aria-hidden="true"></i></button></div>';
        }).join("");
    }
    if (pops.length) {
      html += '<div class="pl-sg-head">پرجستجوها</div><div class="pl-sg-pop">' + pops.map(function (t) {
        return '<a class="pl-sg-chip" href="/search.html?q=' + encodeURIComponent(t) + '" data-pop="' + esc(t) + '">' + esc(t) + "</a>";
      }).join("") + "</div>";
    }
    panel.innerHTML = html;
    place();
    show();
    active = -1;
    return true;
  }
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
    show();
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
    if (q.length < 2) { lastQuery = ""; renderRecents(q); return; }
    if (q === lastQuery) return;
    lastQuery = q;
    timer = setTimeout(function () { fetchSuggest(q); }, 200);
  });
  function openForInput() {
    var q = input.value.trim();
    if (q.length < 2) renderRecents(q);
    else if (panel.innerHTML) { place(); show(); }
  }
  input.addEventListener("focus", openForInput);
  input.addEventListener("click", function () { if (panel.hidden) openForInput(); });
  input.addEventListener("keydown", function (event) {
    if (panel.hidden) return;
    var list = links();
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(Math.min(list.length - 1, active + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(Math.max(-1, active - 1)); }
    else if (event.key === "Escape") { hide(); }
    else if (event.key === "Delete" && active >= 0 && list[active] && list[active].hasAttribute("data-recent")) {
      event.preventDefault();
      removeRecent(list[active].getAttribute("data-recent"));
      renderRecents(input.value.trim());
    }
    else if (event.key === "Enter" && active >= 0 && list[active]) {
      // Enter روی گزینهٔ انتخاب‌شده، مستقیم همان صفحه را باز می‌کند (قبل از رفتار قدیمی جستجو)
      event.preventDefault();
      event.stopImmediatePropagation();
      location.href = list[active].href;
    }
  }, true);
  panel.addEventListener("click", function (event) {
    var del = event.target.closest("[data-del]");
    if (del) {
      event.preventDefault();
      removeRecent(del.getAttribute("data-del"));
      renderRecents(input.value.trim());
      input.focus();
      return;
    }
    if (event.target.closest("[data-clear]")) {
      event.preventDefault();
      writeRecents([]);
      hide();
      input.focus();
      return;
    }
    var all = event.target.closest(".pl-sg-all, .pl-sg-item, .pl-sg-cat");
    if (all) addRecent(input.value);
    var rec = event.target.closest("[data-recent],[data-pop]");
    if (rec) addRecent(rec.getAttribute("data-recent") || rec.getAttribute("data-pop"));
  });
  // ثبت جستجو قبل از رفتن به صفحهٔ نتایج (Enter یا دکمهٔ جستجو)؛ مرحلهٔ capture تا قبل از ریدایرکت اجرا شود
  input.addEventListener("keydown", function (event) { if (event.key === "Enter" && active < 0) addRecent(input.value); }, true);
  var searchBtn = document.querySelector(".search-btn");
  if (searchBtn) searchBtn.addEventListener("click", function () { addRecent(input.value); }, true);
  document.addEventListener("click", function (event) {
    if (!panel.contains(event.target) && event.target !== input && !anchorEl.contains(event.target)) hide();
  });
  window.addEventListener("resize", function () { if (!panel.hidden) place(); });
  // همگام‌سازی بین تب‌ها
  window.addEventListener("storage", function (e) { if (e.key === RECENT_KEY && !panel.hidden && input.value.trim().length < 2) renderRecents(input.value.trim()); });
  window.addEventListener("scroll", function () { if (!panel.hidden) place(); }, { passive: true });
})();
