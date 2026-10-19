(() => {
  // سایدبار تیرهٔ انیمیشنی پنل ادمین («شب»): جمع‌شونده، با جست‌وجو، راهنمای شناور در حالت جمع و پشتیبانی از موبایل.
  const css = `
    :root{--adm-sb-w:292px;--adm-ease:cubic-bezier(.22,.8,.22,1)}
    html.adm-sb-collapsed{--adm-sb-w:88px}
    html,body{background:#f4f7fb!important;color:#172033!important}
    .app-wrapper{min-height:100vh!important;background:#f4f7fb!important}
    .app-main{margin-right:calc(var(--adm-sb-w) + 24px)!important;min-height:100vh!important;background:#f4f7fb!important;transition:margin .65s var(--adm-ease)}
    .app-header{margin-right:calc(var(--adm-sb-w) + 24px)!important;background:#fff!important;transition:margin .65s var(--adm-ease)}
    body.admin-standalone-page{padding-right:calc(var(--adm-sb-w) + 24px)!important;transition:padding .65s var(--adm-ease)}
    body.admin-standalone-page .shell,body.admin-standalone-page .box{max-width:1100px!important}

    .admin-unified-sidebar{position:fixed!important;top:12px!important;right:12px!important;bottom:12px!important;left:auto!important;width:var(--adm-sb-w)!important;min-height:0!important;margin:0!important;padding:22px 16px 16px!important;display:flex!important;flex-direction:column!important;border-radius:28px!important;border:1px solid #4b4c58!important;background:linear-gradient(150deg,#2a2b33 0%,#1d1e26 38%,#10121b 88%)!important;box-shadow:inset 1px 1px 2px #ffffff1f,0 24px 50px #0f172a40!important;color:#9a9ba7!important;z-index:1050!important;visibility:visible!important;transition:width .65s var(--adm-ease),right .3s ease!important;isolation:isolate;overflow:visible!important;font-family:Vazirmatn,Tahoma,sans-serif!important;direction:rtl}
    .admin-unified-sidebar:before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(45deg,transparent 55%,#ffffff05 60%,transparent 70%)}
    .adm-collapse{position:absolute;left:-17px;top:42px;width:34px;height:34px;display:grid;place-items:center;padding:0;border-radius:50%;border:1px solid #62616d;background:#24252e;color:#e5e7eb;box-shadow:0 4px 15px #0006;cursor:pointer;z-index:5;transition:background .3s,box-shadow .3s}
    .adm-collapse:hover{background:#44245d;box-shadow:0 0 0 5px #b34eff14,0 0 22px #bc42ff80}
    .adm-collapse i{font-size:18px;transition:transform .65s var(--adm-ease)}
    .adm-sb-collapsed .adm-collapse i{transform:rotate(180deg)}

    .admin-sidebar-brand{display:flex!important;align-items:center!important;height:60px;margin:0 2px 18px!important;padding:0!important;border:0!important}
    .admin-sidebar-brand a{display:flex!important;align-items:center!important;gap:13px!important;color:#fff!important;text-decoration:none!important;white-space:nowrap}
    .admin-brand-mark{display:grid!important;place-items:center!important;flex:0 0 46px;width:46px!important;height:46px!important;border-radius:15px!important;background:linear-gradient(135deg,#8b3dd4,#c05cff)!important;color:#fff!important;font:800 22px Vazirmatn,Tahoma,sans-serif;box-shadow:0 6px 18px #b34eff55}
    .admin-brand-name{font:800 21px Vazirmatn,Tahoma,sans-serif;overflow:hidden;max-width:190px;transition:opacity .25s,max-width .6s var(--adm-ease),transform .5s var(--adm-ease)}
    .admin-brand-name span{color:#cf8aff}
    .admin-brand-name small{display:block;font:400 10px Vazirmatn,Tahoma,sans-serif;color:#8e8d99;margin-top:1px}

    .adm-search{display:flex;align-items:center;gap:12px;height:48px;padding:0 16px;margin:0;border-radius:16px;background:#101219bd;border:1px solid #ffffff06;box-shadow:inset 0 2px 5px #0002;flex-shrink:0;transition:border-color .3s,box-shadow .3s,padding .6s var(--adm-ease)}
    .adm-search:focus-within{border-color:#be5dff66;box-shadow:0 0 20px #b24bff14}
    .adm-search i{font-size:20px;color:#81818c;flex:0 0 auto}
    .adm-search input{min-width:0;width:100%;background:none!important;border:0!important;outline:0!important;box-shadow:none!important;color:#e5dfed!important;font:400 14px Vazirmatn,Tahoma,sans-serif!important;padding:0!important;height:auto!important}
    .adm-search input::placeholder{color:#73747f}
    .adm-search kbd{white-space:nowrap;direction:ltr;font:10px Arial;color:#60616d;border:1px solid #35353d;padding:3px 5px;border-radius:5px;background:transparent;box-shadow:none;transition:opacity .2s}
    .admin-nav-divider{display:block!important;color:#858591!important;font:500 12px Vazirmatn,Tahoma,sans-serif!important;margin:14px 8px 6px!important;height:18px;white-space:nowrap;overflow:hidden;transition:opacity .3s}

    .admin-sidebar-nav{display:block!important;position:relative;flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;padding:0!important;margin:0 -4px;scrollbar-width:thin;scrollbar-color:#3a3b46 transparent}
    .admin-nav-link,.admin-nav-toggle{position:relative;box-sizing:border-box!important;width:100%!important;height:46px;min-height:0!important;display:flex!important;align-items:center!important;gap:18px!important;padding:0 16px!important;margin:2px 0!important;border:0!important;border-radius:15px!important;background:transparent!important;color:#93949f!important;font:500 15px Vazirmatn,Tahoma,sans-serif!important;text-decoration:none!important;white-space:nowrap;cursor:pointer;text-align:right;transition:color .3s,background .3s,transform .25s,padding .6s var(--adm-ease)!important}
    .admin-nav-toggle{justify-content:space-between!important}
    .admin-nav-toggle>span{display:flex!important;align-items:center!important;gap:18px!important}
    .admin-nav-link:hover,.admin-nav-toggle:hover{color:#e5d8f1!important;background:#ffffff08!important}
    .admin-nav-link:active,.admin-nav-toggle:active{transform:scale(.97)}
    .admin-nav-link>i,.admin-nav-toggle>span>i{display:inline-block!important;flex:0 0 24px;width:24px!important;font-size:22px!important;text-align:center!important;transition:transform .45s var(--adm-ease),filter .3s}
    .admin-nav-link:hover>i,.admin-nav-toggle:hover>span>i{transform:translateY(-2px)}
    .admin-nav-link.active{color:#fff!important;font-weight:650!important;background:linear-gradient(270deg,#8e3bb14d,#50236122 70%,transparent)!important;box-shadow:none!important}
    .admin-nav-link.active>i{filter:drop-shadow(0 0 9px #c859ff66)}
    .admin-nav-link.active:after{content:"";position:absolute;right:-16px;top:8px;width:4px;height:30px;border-radius:8px;background:#c44fff;box-shadow:0 0 8px #c44fff,0 0 22px 6px #b62dff55;animation:adm-breathe 3s ease-in-out infinite}
    .adm-label{overflow:hidden;max-width:200px;opacity:1;transition:opacity .25s,max-width .65s var(--adm-ease),transform .45s var(--adm-ease)}
    .adm-badge{position:absolute;left:14px;display:none;place-items:center;min-width:24px;height:24px;padding:0 6px;border-radius:12px;background:#b14bef;color:#fff;font-size:12px;box-shadow:0 0 10px #b04aff44}
    .adm-badge.show{display:grid}
    .admin-chevron{font-size:16px!important;width:auto!important;flex:0 0 auto!important;transition:transform .25s ease!important}
    .admin-nav-group.open .admin-chevron{transform:rotate(180deg)!important}
    .admin-submenu{display:block!important;list-style:none!important;margin:0 22px 6px 0!important;padding:0 12px 0 0!important;border-right:1px solid #ffffff12!important;max-height:0!important;opacity:0!important;overflow:hidden!important;transition:max-height .45s var(--adm-ease),opacity .25s!important}
    .admin-nav-group.open .admin-submenu{max-height:360px!important;opacity:1!important}
    .admin-submenu li{list-style:none!important;margin:0!important;padding:0!important}
    .admin-submenu-link{box-sizing:border-box!important;width:100%!important;display:flex!important;align-items:center!important;gap:10px!important;min-height:38px!important;padding:0 10px!important;border-radius:11px!important;color:#8f909b!important;font:500 13px Vazirmatn,Tahoma,sans-serif!important;text-decoration:none!important;transition:color .25s,background .25s}
    .admin-submenu-link i{font-size:17px!important;color:#6e6f7b!important}
    .admin-submenu-link:hover,.admin-submenu-link.active{color:#fff!important;background:#ffffff0a!important}
    .admin-submenu-link.active i{color:#cf8aff!important}
    .adm-empty{display:none;text-align:center;color:#92909f;font-size:13px;margin:14px 0}

    .adm-footer{flex:0 0 auto;margin-top:12px;padding-top:14px;border-top:1px solid #ffffff10;display:flex;flex-direction:column;gap:6px}
    .adm-foot-link{position:relative;box-sizing:border-box;width:100%;height:42px;display:flex;align-items:center;gap:16px;padding:0 15px;border:0;border-radius:13px;background:transparent;color:#9697a3;font:500 14px Vazirmatn,Tahoma,sans-serif;text-decoration:none;text-align:right;white-space:nowrap;cursor:pointer;transition:color .3s,background .3s,padding .6s var(--adm-ease)}
    .adm-foot-link:hover{color:#fff;background:#ffffff08}
    .adm-foot-link i{font-size:21px;flex:0 0 24px;width:24px;text-align:center}
    .adm-foot-link.exit:hover{color:#ff8fa3}

    .adm-tip{position:absolute;right:calc(100% + 26px);top:50%;transform:translate(8px,-50%);background:#25212f;border:1px solid #ffffff14;box-shadow:0 8px 30px #0006;padding:7px 13px;border-radius:10px;font:500 12px Vazirmatn,Tahoma,sans-serif;color:#eee;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .2s,transform .2s;z-index:20;display:none}

    .adm-sb-collapsed .admin-unified-sidebar{padding-right:12px!important;padding-left:12px!important}
    .adm-sb-collapsed .admin-brand-name{opacity:0;max-width:0;transform:translateX(-10px)}
    .adm-sb-collapsed .admin-sidebar-brand a{gap:0}
    .adm-sb-collapsed .admin-sidebar-brand{margin-right:4px!important}
    .adm-sb-collapsed .adm-search{padding:0 17px;cursor:pointer}
    .adm-sb-collapsed .adm-search input,.adm-sb-collapsed .adm-search kbd{width:0;opacity:0;position:absolute;pointer-events:none}
    .adm-sb-collapsed .admin-nav-divider{opacity:0}
    .adm-sb-collapsed .admin-sidebar-nav{overflow:visible;margin:0}
    .adm-sb-collapsed .admin-nav-link,.adm-sb-collapsed .admin-nav-toggle{padding:0 22px!important;gap:0!important}
    .adm-sb-collapsed .adm-label,.adm-sb-collapsed .admin-chevron{opacity:0;max-width:0;transform:translateX(-10px)}
    .adm-sb-collapsed .admin-nav-toggle>span{gap:0!important}
    .adm-sb-collapsed .admin-nav-link.active:after{right:-12px}
    .adm-sb-collapsed .admin-submenu,.adm-sb-collapsed .admin-nav-group.open .admin-submenu{max-height:0!important;opacity:0!important}
    .adm-sb-collapsed .adm-foot-link{padding:0 21px;gap:0}
    .adm-sb-collapsed .adm-foot-link .adm-label{max-width:0}
    .adm-sb-collapsed .adm-tip{display:block}
    .adm-sb-collapsed .admin-nav-link:hover .adm-tip,.adm-sb-collapsed .admin-nav-toggle:hover .adm-tip,.adm-sb-collapsed .adm-foot-link:hover .adm-tip,.adm-sb-collapsed .admin-nav-link:focus-visible .adm-tip,.adm-sb-collapsed .adm-foot-link:focus-visible .adm-tip{opacity:1;transform:translate(0,-50%)}
    .adm-sb-collapsed .adm-badge{min-width:9px;width:9px;height:9px;padding:0;font-size:0;left:14px;top:9px}

    .admin-nav-link:focus-visible,.admin-nav-toggle:focus-visible,.adm-foot-link:focus-visible,.adm-collapse:focus-visible{outline:2px solid #cf8aff;outline-offset:3px}
    .admin-mobile-toggle{display:none!important;position:fixed!important;z-index:1060!important;top:14px!important;right:14px!important;width:44px!important;height:44px!important;border:1px solid #4b4c58!important;border-radius:14px!important;background:#1d1e26!important;color:#fff!important;font-size:22px!important;box-shadow:0 8px 24px #0f172a40!important;cursor:pointer}
    @keyframes adm-breathe{50%{box-shadow:0 0 11px #c44fff,0 0 26px 7px #b62dff70}}
    @media(max-height:760px){.admin-nav-link,.admin-nav-toggle{height:44px}.adm-search{height:44px}.admin-sidebar-brand{height:52px;margin-bottom:12px!important}.admin-nav-divider{margin-top:12px!important}}
    @media(max-width:991.98px){
      :root,html.adm-sb-collapsed{--adm-sb-w:292px}
      .admin-unified-sidebar{right:-320px!important;top:0!important;bottom:0!important;border-radius:28px 0 0 28px!important;box-shadow:-12px 0 30px rgba(15,23,42,.35)!important}
      body.admin-sidebar-visible .admin-unified-sidebar{right:0!important}
      body.admin-sidebar-visible:after{content:""!important;position:fixed!important;inset:0!important;background:rgba(15,23,42,.5)!important;z-index:1040!important}
      .app-main,.app-header{margin-right:0!important}
      .adm-collapse{display:none}
      body.admin-sidebar-visible .admin-mobile-toggle{opacity:0!important;pointer-events:none!important}
      .admin-mobile-toggle{display:grid!important;place-items:center!important}
      body.admin-standalone-page{padding-right:0!important;padding-top:58px!important}
      .app-header .navbar-nav:first-child{margin-right:50px!important}
    }
    @media(prefers-reduced-motion:reduce){.admin-unified-sidebar *,.admin-unified-sidebar,.app-main,.app-header{animation:none!important;transition:none!important}}
  `;
  const style = document.createElement("style");
  style.id = "admin-unified-sidebar-style";
  style.textContent = css;
  document.head.append(style);

  const root = document.documentElement;
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (_) { /* حافظه در دسترس نیست */ } },
  };
  // وضعیت جمع‌شدن قبل از ساخت منو اعمال می‌شود تا پرش دیده نشود.
  if (storage.get("adm-sb-collapsed") === "true") root.classList.add("adm-sb-collapsed");

  const currentPath = location.pathname;
  const selectedCategory = new URLSearchParams(location.search).get("category") || "";
  const productOpen = currentPath === "/admin/products";
  // ترتیب و نام‌ها دقیقاً با منوی دسته‌بندی صفحهٔ اصلی یکسان هستند.
  const links = [
    { href: "/admin/products", icon: "ti-package", text: "همهٔ محصولات", match: "" },
    { href: "/admin/products?category=mobile", icon: "ti-device-mobile", text: "موبایل", match: "mobile" },
    { href: "/admin/products?category=accessories", icon: "ti-charging-pile", text: "لوازم جانبی موبایل", match: "accessories" },
    { href: "/admin/products?category=tablet", icon: "ti-tablet", text: "تبلت", match: "tablet" },
    { href: "/admin/products?category=headphones", icon: "ti-headphones", text: "هدفون و هندزفری", match: "headphones" },
    { href: "/admin/products?category=watch", icon: "ti-watch", text: "ساعت هوشمند", match: "watch" },
    { href: "/admin/products?category=console", icon: "ti-device-gamepad-2", text: "کنسول بازی", match: "console" }
  ];
  const active = (path) => currentPath === path ? " active" : "";
  const item = (href, icon, text, extra = "") =>
    '<a href="' + href + '" class="admin-nav-link' + active(href) + '" data-title="' + text + '"' + extra + '><i class="ti ' + icon + '"></i><span class="adm-label">' + text + '</span><span class="adm-tip">' + text + '</span></a>';
  const categoryLinks = links.map(link => {
    const isActive = currentPath === "/admin/products" && selectedCategory === link.match;
    return '<li><a class="admin-submenu-link' + (isActive ? " active" : "") + '" data-title="' + link.text + '" href="' + link.href + '"><i class="ti ' + link.icon + '"></i><span>' + link.text + '</span></a></li>';
  }).join("");

  const sidebar =
    '<button type="button" class="adm-collapse" aria-label="جمع کردن منو" aria-expanded="true" title="جمع کردن منو"><i class="ti ti-chevron-right"></i></button>' +
    '<div class="admin-sidebar-brand"><a href="/admin/products"><span class="admin-brand-mark">P</span><span class="admin-brand-name">Pixel<span>Life</span><small>پنل مدیریت</small></span></a></div>' +
    '<label class="adm-search"><i class="ti ti-search"></i><input type="search" placeholder="جست‌وجو در منو" aria-label="جست‌وجو در منو" autocomplete="off"><kbd>Ctrl K</kbd></label>' +
    '<nav class="admin-sidebar-nav" aria-label="منوی مدیریت">' +
    item("/admin/products", "ti-layout-dashboard", "داشبورد محصولات") +
    '<section class="admin-nav-group' + (productOpen ? " open" : "") + '" data-title="دسته‌بندی محصولات"><button type="button" class="admin-nav-toggle" aria-expanded="' + productOpen + '"><span><i class="ti ti-category-2"></i><span class="adm-label">دسته‌بندی محصولات</span></span><i class="ti ti-chevron-down admin-chevron"></i><span class="adm-tip">دسته‌بندی محصولات</span></button><ul class="admin-submenu">' + categoryLinks + '</ul></section>' +
    '<div class="admin-nav-divider">مدیریت فروشگاه</div>' +
    item("/admin/orders", "ti-shopping-bag", "سفارش‌ها") +
    item("/admin/customers", "ti-users", "مشتریان") +
    item("/admin/discounts", "ti-ticket", "کدهای تخفیف") +
    item("/admin/reviews", "ti-message-star", "مدیریت نظرات") +
    '<div class="admin-nav-divider">ابزارها</div>' +
    item("/admin/ai-products", "ti-sparkles", "دستیار هوشمند محصولات") +
    item("/admin/analytics", "ti-chart-bar", "تحلیل رفتار مشتریان") +
    '<p class="adm-empty">موردی پیدا نشد</p></nav>' +
    '<div class="adm-footer">' +
    '<a href="/" target="_blank" rel="noopener" class="adm-foot-link"><i class="ti ti-external-link"></i><span class="adm-label">مشاهدهٔ سایت</span><span class="adm-tip">مشاهدهٔ سایت</span></a>' +
    '<button type="button" class="adm-foot-link exit"><i class="ti ti-logout"></i><span class="adm-label">خروج از پنل</span><span class="adm-tip">خروج از پنل</span></button>' +
    '</div>';

  let aside = document.querySelector(".app-sidebar");
  if (!aside) {
    aside = document.createElement("aside");
    aside.className = "app-sidebar";
    document.body.prepend(aside);
    document.body.classList.add("admin-standalone-page");
  }
  aside.innerHTML = sidebar;
  aside.className = "app-sidebar admin-unified-sidebar";

  // ─── موبایل: کشوی کناری ───
  const mobileToggle = document.createElement("button");
  mobileToggle.type = "button";
  mobileToggle.className = "admin-mobile-toggle";
  mobileToggle.setAttribute("aria-label", "باز و بسته کردن منوی مدیریت");
  mobileToggle.innerHTML = '<i class="ti ti-menu-2"></i>';
  document.body.append(mobileToggle);
  const closeDrawer = () => document.body.classList.remove("admin-sidebar-visible");
  mobileToggle.addEventListener("click", () => document.body.classList.toggle("admin-sidebar-visible"));
  document.addEventListener("click", event => {
    if (document.body.classList.contains("admin-sidebar-visible") && !aside.contains(event.target) && !mobileToggle.contains(event.target)) closeDrawer();
  });

  // ─── جمع‌شدن / باز شدن (دسکتاپ) ───
  const collapseBtn = aside.querySelector(".adm-collapse");
  const search = aside.querySelector('input[type="search"]');
  const group = aside.querySelector(".admin-nav-group");
  const groupToggle = aside.querySelector(".admin-nav-toggle");
  const filterable = [...aside.querySelectorAll(".admin-nav-link[data-title]")];
  const submenuItems = [...aside.querySelectorAll(".admin-submenu li")];
  const dividers = [...aside.querySelectorAll(".admin-nav-divider")];
  const normalize = text => String(text).replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/‌/g, "").toLowerCase();

  function filterMenu() {
    const query = normalize(search.value.trim());
    let shown = 0;
    filterable.forEach(link => {
      const match = !query || normalize(link.dataset.title).includes(query);
      link.style.display = match ? "" : "none";
      if (match) shown++;
    });
    let submenuMatches = 0;
    submenuItems.forEach(li => {
      const match = !query || normalize(li.firstElementChild.dataset.title).includes(query);
      li.style.display = match ? "" : "none";
      if (match) submenuMatches++;
    });
    const groupMatch = !query || normalize(group.dataset.title).includes(query) || submenuMatches > 0;
    group.style.display = groupMatch ? "" : "none";
    if (query && submenuMatches > 0) { group.classList.add("open"); groupToggle.setAttribute("aria-expanded", "true"); }
    if (groupMatch) shown++;
    dividers.forEach(divider => { divider.style.display = query ? "none" : ""; });
    aside.querySelector(".adm-empty").style.display = shown ? "none" : "block";
  }

  function setCollapsed(collapsed) {
    root.classList.toggle("adm-sb-collapsed", collapsed);
    collapseBtn.setAttribute("aria-expanded", String(!collapsed));
    collapseBtn.setAttribute("aria-label", collapsed ? "باز کردن منو" : "جمع کردن منو");
    collapseBtn.title = collapsed ? "باز کردن منو" : "جمع کردن منو";
    storage.set("adm-sb-collapsed", String(collapsed));
    if (collapsed) { search.value = ""; filterMenu(); search.blur(); }
  }
  setCollapsed(root.classList.contains("adm-sb-collapsed"));
  collapseBtn.addEventListener("click", () => setCollapsed(!root.classList.contains("adm-sb-collapsed")));

  groupToggle.addEventListener("click", () => {
    // در حالت جمع، زیرمنو جا ندارد؛ منو را باز می‌کنیم.
    if (root.classList.contains("adm-sb-collapsed") && matchMedia("(min-width: 992px)").matches) { setCollapsed(false); group.classList.add("open"); groupToggle.setAttribute("aria-expanded", "true"); return; }
    const open = group.classList.toggle("open");
    groupToggle.setAttribute("aria-expanded", String(open));
  });

  search.addEventListener("input", filterMenu);
  aside.querySelector(".adm-search").addEventListener("click", () => {
    if (root.classList.contains("adm-sb-collapsed")) { setCollapsed(false); setTimeout(() => search.focus(), 350); }
  });
  document.addEventListener("keydown", event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (matchMedia("(max-width: 991.98px)").matches) document.body.classList.add("admin-sidebar-visible");
      else setCollapsed(false);
      search.focus();
    }
    if (event.key === "Escape") {
      if (document.activeElement === search) { search.value = ""; filterMenu(); search.blur(); }
      closeDrawer();
    }
  });

  // ─── خروج از پنل ───
  aside.querySelector(".adm-foot-link.exit").addEventListener("click", async () => {
    try { await fetch("/admin/logout", { method: "POST" }); } catch (_) { /* به هر حال به صفحهٔ ورود می‌رویم */ }
    location.href = "/admin/login";
  });
})();
