(() => {
  const css = `
    html,body{background:#f4f7fb!important;color:#172033!important}
    .app-wrapper{min-height:100vh!important;background:#f4f7fb!important}
    .admin-unified-sidebar{position:fixed!important;top:0!important;right:0!important;bottom:0!important;width:270px!important;min-height:100vh!important;margin:0!important;padding:0!important;background:#fff!important;border-left:1px solid #e2e8f0!important;box-shadow:-6px 0 22px rgba(15,23,42,.05)!important;overflow-y:auto!important;z-index:1045!important;font-family:Vazirmatn,Tahoma,sans-serif!important}
    .app-main{margin-right:270px!important;min-height:100vh!important;background:#f4f7fb!important}
    .app-header{margin-right:270px!important;background:#fff!important}
    .admin-sidebar-brand{height:74px;display:flex!important;align-items:center!important;padding:0 19px!important;border-bottom:1px solid #e8edf5!important}
    .admin-sidebar-brand a{display:flex!important;align-items:center!important;gap:10px!important;color:#172033!important;text-decoration:none!important;font:800 20px Vazirmatn,Tahoma,sans-serif!important}
    .admin-sidebar-brand a>span:last-child>span{color:#2563eb!important}
    .admin-brand-mark{display:grid!important;place-items:center!important;width:35px!important;height:35px!important;border-radius:10px!important;background:linear-gradient(135deg,#2563eb,#60a5fa)!important;color:#fff!important;font-size:17px!important}
    .admin-sidebar-nav{display:block!important;padding:14px 12px 24px!important}
    .admin-nav-link,.admin-nav-toggle,.admin-submenu-link{box-sizing:border-box!important;width:100%!important;display:flex!important;align-items:center!important;text-decoration:none!important;border:0!important;color:#475569!important;font-family:Vazirmatn,Tahoma,sans-serif!important;text-align:right!important}
    .admin-nav-link,.admin-nav-toggle{min-height:44px!important;padding:0 12px!important;margin:3px 0!important;border-radius:10px!important;background:transparent!important;font-size:13px!important;font-weight:650!important;gap:10px!important}
    .admin-nav-toggle{justify-content:space-between!important;cursor:pointer!important}
    .admin-nav-toggle>span{display:flex!important;align-items:center!important;gap:10px!important}
    .admin-nav-link>i,.admin-nav-toggle>span>i{display:inline-block!important;width:20px!important;font-size:19px!important;text-align:center!important}
    .admin-nav-link:hover,.admin-nav-toggle:hover{background:#eff6ff!important;color:#2563eb!important}
    .admin-nav-link.active{background:#dbeafe!important;color:#1d4ed8!important;box-shadow:inset -3px 0 0 #2563eb!important}
    .admin-nav-divider{display:block!important;color:#94a3b8!important;font:800 10px Vazirmatn,Tahoma,sans-serif!important;margin:20px 10px 8px!important}
    .admin-submenu{display:block!important;list-style:none!important;margin:2px 11px 8px 0!important;padding:0 10px 0 0!important;border-right:1px solid #dbe4f0!important;max-height:0!important;opacity:0!important;overflow:hidden!important;transition:max-height .24s ease,opacity .18s ease!important}
    .admin-nav-group.open .admin-submenu{max-height:340px!important;opacity:1!important}
    .admin-submenu li{list-style:none!important;margin:0!important;padding:0!important}
    .admin-submenu-link{min-height:36px!important;padding:0 9px!important;gap:8px!important;border-radius:8px!important;font-size:12px!important;font-weight:550!important}
    .admin-submenu-link i{font-size:16px!important;color:#94a3b8!important}
    .admin-submenu-link:hover,.admin-submenu-link.active{background:#f1f7ff!important;color:#2563eb!important}
    .admin-chevron{transition:transform .2s ease!important}
    .admin-nav-group.open .admin-chevron{transform:rotate(180deg)!important}
    .admin-site-link{margin-top:12px!important;border:1px solid #dbe4f0!important;color:#2563eb!important}
    .admin-mobile-toggle{display:none!important;position:fixed!important;z-index:1060!important;top:14px!important;right:14px!important;width:42px!important;height:42px!important;border:1px solid #dbe4f0!important;border-radius:11px!important;background:#fff!important;color:#2563eb!important;box-shadow:0 8px 20px rgba(15,23,42,.12)!important;font-size:21px!important}
    body.admin-standalone-page{padding-right:270px!important}
    body.admin-standalone-page .shell,body.admin-standalone-page .box{max-width:1100px!important}
    @media(max-width:991.98px){
      .admin-unified-sidebar{right:-280px!important;transition:right .24s ease!important;box-shadow:-12px 0 30px rgba(15,23,42,.18)!important}
      body.admin-sidebar-visible .admin-unified-sidebar{right:0!important}
      body.admin-sidebar-visible:after{content:""!important;position:fixed!important;inset:0!important;background:rgba(15,23,42,.42)!important;z-index:1040!important}
      .app-main,.app-header{margin-right:0!important}
      .admin-mobile-toggle{display:grid!important;place-items:center!important}
      body.admin-standalone-page{padding-right:0!important;padding-top:54px!important}
      .app-header .navbar-nav:first-child{margin-right:50px!important}
    }
  `;
  const style = document.createElement("style");
  style.id = "admin-unified-sidebar-style";
  style.textContent = css;
  document.head.append(style);

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
  const categoryLinks = links.map(link => {
    const isActive = currentPath === "/admin/products" && selectedCategory === link.match;
    return '<li><a class="admin-submenu-link' + (isActive ? " active" : "") + '" href="' + link.href + '"><i class="ti ' + link.icon + '"></i><span>' + link.text + '</span></a></li>';
  }).join("");

  const sidebar = '<div class="admin-sidebar-brand"><a href="/admin/products"><span class="admin-brand-mark">P</span><span>Pixel<span>Life</span></span></a></div>' +
    '<nav class="admin-sidebar-nav" aria-label="منوی مدیریت">' +
    '<a href="/admin/products" class="admin-nav-link' + active("/admin/products") + '"><i class="ti ti-layout-dashboard"></i><span>داشبورد محصولات</span></a>' +
    '<section class="admin-nav-group' + (productOpen ? " open" : "") + '"><button type="button" class="admin-nav-toggle" aria-expanded="' + productOpen + '"><span><i class="ti ti-category-2"></i> دسته‌بندی محصولات</span><i class="ti ti-chevron-down admin-chevron"></i></button><ul class="admin-submenu">' + categoryLinks + '</ul></section>' +
    '<div class="admin-nav-divider">مدیریت فروشگاه</div>' +
    '<a href="/admin/orders" class="admin-nav-link' + active("/admin/orders") + '"><i class="ti ti-shopping-bag"></i><span>سفارش‌ها</span></a>' +
    '<a href="/admin/customers" class="admin-nav-link' + active("/admin/customers") + '"><i class="ti ti-users"></i><span>مشتریان</span></a>' +
    '<a href="/admin/discounts" class="admin-nav-link' + active("/admin/discounts") + '"><i class="ti ti-ticket"></i><span>کدهای تخفیف</span></a>' +
    '<a href="/admin/reviews" class="admin-nav-link' + active("/admin/reviews") + '"><i class="ti ti-message-star"></i><span>مدیریت نظرات</span></a>' +
    '<div class="admin-nav-divider">ابزارها</div>' +
    '<a href="/admin/ai-products" class="admin-nav-link' + active("/admin/ai-products") + '"><i class="ti ti-sparkles"></i><span>دستیار هوشمند محصولات</span></a>' +
    '<a href="/admin/analytics" class="admin-nav-link' + active("/admin/analytics") + '"><i class="ti ti-chart-bar"></i><span>تحلیل رفتار مشتریان</span></a>' +
    '<a href="/" class="admin-nav-link admin-site-link" target="_blank"><i class="ti ti-external-link"></i><span>مشاهدهٔ سایت</span></a></nav>';

  let aside = document.querySelector(".app-sidebar");
  if (!aside) {
    aside = document.createElement("aside");
    aside.className = "app-sidebar";
    document.body.prepend(aside);
    document.body.classList.add("admin-standalone-page");
  }
  aside.innerHTML = sidebar;
  aside.className = "app-sidebar admin-unified-sidebar";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "admin-mobile-toggle";
  toggle.setAttribute("aria-label", "باز و بسته کردن منوی مدیریت");
  toggle.innerHTML = '<i class="ti ti-menu-2"></i>';
  document.body.append(toggle);
  const close = () => document.body.classList.remove("admin-sidebar-visible");
  toggle.addEventListener("click", () => document.body.classList.toggle("admin-sidebar-visible"));
  document.addEventListener("click", event => {
    if (document.body.classList.contains("admin-sidebar-visible") && !aside.contains(event.target) && !toggle.contains(event.target)) close();
  });
  aside.querySelector(".admin-nav-toggle").addEventListener("click", event => {
    const group = event.currentTarget.closest(".admin-nav-group");
    const open = group.classList.toggle("open");
    event.currentTarget.setAttribute("aria-expanded", String(open));
  });
})();