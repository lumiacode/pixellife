(() => {
  const rail = document.getElementById("mobileCategoryRail");
  const content = document.getElementById("mobileCategoryContent");
  const search = document.getElementById("mobileCategorySearch");
  if (!rail || !content) return;

  const icons = {
    mobile: '<svg class="mobile-category-rail-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M10 18.5h4"/></svg>',
    "mobile-accessories": '<svg class="mobile-category-rail-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v6a4 4 0 0 0 8 0V3"/><path d="M8 6h8"/><path d="M12 13v8"/><path d="M9 21h6"/></svg>',
    tablet: '<svg class="mobile-category-rail-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M11 18h2"/></svg>',
    headphone: '<svg class="mobile-category-rail-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v5H5a1 1 0 0 1-1-1z"/><path d="M20 14h-3v5h2a1 1 0 0 0 1-1z"/></svg>',
    watch: '<svg class="mobile-category-rail-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="6" width="10" height="12" rx="2"/><path d="M9 6 10 3h4l1 3M9 18l1 3h4l1-3"/></svg>',
    console: '<svg class="mobile-category-rail-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9h10a4 4 0 0 1 3.8 2.8l1 3.5A2 2 0 0 1 19.9 18h-2.3l-2-2H8.4l-2 2H4.1a2 2 0 0 1-1.9-2.7l1-3.5A4 4 0 0 1 7 9z"/><path d="M7 13v3M5.5 14.5h3M16 14h.01M18 15.5h.01"/></svg>'
  };
  const chevron = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
  const enc = encodeURIComponent;

  // فقط صفحه‌هایی که در سایت وجود دارند. ستون = تیتر (با لینک اختیاری) + لینک‌ها.
  const categories = [
    {
      id: "mobile", name: "موبایل", allHref: "/mobiles",
      columns: [
        [
          {
            title: "برندهای موبایل",
            links: [
              { label: "آیفون", href: "/iphone" },
              { label: "سامسونگ", href: "/samsung" },
              { label: "شیائومی", href: "/xiaomi" }
            ]
          }
        ],
        [
          {
            title: "لوازم جانبی موبایل", href: "/accessories",
            links: [
              { label: "اپل", href: "/accessories/apple" },
              { label: "سامسونگ", href: "/accessories/samsung" },
              { label: "شیائومی", href: "/accessories/xiaomi" }
            ]
          },
          { title: "شارژر و کابل موبایل", href: "/accessories/chargers" }
        ]
      ]
    },
    {
      id: "tablet", name: "تبلت", allHref: "/tablets",
      columns: [[
        {
          title: "تبلت",
          links: [
            { label: "اپل", href: "/ipad" },
            { label: "سامسونگ", href: "/samsungtab" },
            { label: "شیائومی", href: "/xiaomitab" }
          ]
        }
      ]]
    },
    {
      id: "headphone", name: "هدفون و هندزفری", allHref: "/headphones",
      columns: [[
        {
          title: "هدفون و هندزفری", href: "/headphones",
          links: [
            { label: "اپل", href: "/headphones?brand=" + enc("اپل") },
            { label: "سامسونگ", href: "/headphones?brand=" + enc("سامسونگ") }
          ]
        }
      ]]
    },
    {
      id: "watch", name: "ساعت هوشمند", allHref: "/smartwatches",
      columns: [[
        {
          title: "ساعت هوشمند", href: "/smartwatches",
          links: [
            { label: "اپل", href: "/smartwatches?brand=" + enc("اپل") },
            { label: "سامسونگ", href: "/smartwatches?brand=" + enc("سامسونگ") }
          ]
        }
      ]]
    },
    {
      id: "console", name: "کنسول بازی", allHref: "/console",
      columns: [[
        { title: "کنسول بازی", href: "/console", links: [{ label: "کنسول سونی", href: "/console" }] }
      ]]
    }
  ];

  let activeId = categories[0].id;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const renderBlock = (block) =>
    '<div class="cat-block">' + (block.href
      ? '<a class="cat-heading" href="' + block.href + '"><span>' + esc(block.title) + '</span>' + chevron + '</a>'
      : '<h3 class="cat-heading"><span>' + esc(block.title) + '</span></h3>') +
    (block.links ? '<ul class="cat-links">' + block.links.map((l) => '<li><a href="' + l.href + '">' + esc(l.label) + '</a></li>').join("") + '</ul>' : "") +
    '</div>';

  function renderContent(category) {
    content.innerHTML =
      '<a class="cat-all" href="' + category.allHref + '"><span>همه محصولات ' + esc(category.name) + '</span>' + chevron + '</a>' +
      '<div class="cat-columns">' + category.columns.map((col) => '<div class="cat-column">' + col.map(renderBlock).join("") + '</div>').join("") + '</div>';
  }

  function activate(id) {
    activeId = id;
    rail.querySelectorAll(".mobile-category-rail-item").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.category === id);
    });
    renderContent(categories.find((category) => category.id === id));
  }

  categories.forEach((category) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "mobile-category-rail-item";
    item.dataset.category = category.id;
    item.innerHTML = icons[category.id] + "<span>" + category.name + "</span>";
    item.addEventListener("click", () => { if (search) search.value = ""; rail.querySelectorAll(".mobile-category-rail-item").forEach((i) => (i.hidden = false)); activate(category.id); });
    rail.appendChild(item);
  });

  const flatLinks = (category) =>
    category.columns.flat().flatMap((block) => [{ label: block.title, href: block.href }, ...(block.links || [])]);

  search?.addEventListener("input", () => {
    const query = search.value.trim().toLocaleLowerCase("fa");
    rail.querySelectorAll(".mobile-category-rail-item").forEach((i) => (i.hidden = false));
    if (!query) { activate(activeId); return; }
    const seen = new Set();
    const hits = categories.flatMap((category) => flatLinks(category).filter((l) => l.label.toLocaleLowerCase("fa").includes(query) || category.name.includes(query)))
      .filter((l) => (seen.has(l.href + l.label) ? false : seen.add(l.href + l.label)));
    rail.querySelectorAll(".mobile-category-rail-item").forEach((i) => i.classList.remove("is-active"));
    content.innerHTML = hits.length
      ? '<ul class="cat-links cat-results">' + hits.map((l) => '<li><a href="' + l.href + '">' + esc(l.label) + '</a></li>').join("") + "</ul>"
      : '<p class="mobile-category-empty">دسته‌بندی یا زیر‌دسته‌ای پیدا نشد.</p>';
  });

  activate(activeId);
})();
