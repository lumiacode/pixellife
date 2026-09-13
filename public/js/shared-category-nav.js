(function () {
  if (window.__pixelLifeSharedCategoryNavV4) return;
  window.__pixelLifeSharedCategoryNavV4 = true;

  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  // Rebuild the ENTIRE navbar content to keep navigation consistent everywhere.
  navbar.innerHTML = `
    <div class="navbar-inner">
      <div class="nav-cats-wrap">
        <button class="nav-cats" id="catsToggle" type="button">
          <i class="ti ti-menu-2"></i> همه دسته‌بندی‌ها
          <i class="ti ti-chevron-down"></i>
        </button>
        <div class="megamenu-panel" id="megamenuPanel">
          <div class="megamenu-cats" id="megamenuCats"></div>
          <div class="megamenu-content" id="megamenuContent"></div>
        </div>
      </div>
      <a href="/amazing" class="nav-link"><i class="ti ti-bolt"></i> شگفت‌انگیز</a>
      <a href="/" class="nav-link"><i class="ti ti-home"></i> خانه</a>
      <a href="/new" class="nav-link"><i class="ti ti-sparkles"></i> تازه‌ها</a>
      <a href="/bestsellers" class="nav-link"><i class="ti ti-trending-up"></i> پرفروش‌ترین</a>
      <a href="/brands" class="nav-link"><i class="ti ti-building-store"></i> برندها</a>
      <a href="/blog" class="nav-link"><i class="ti ti-article"></i> مجله</a>
    </div>`;

  document.querySelectorAll('#megamenuBackdrop').forEach((el) => el.remove());
  const backdrop = document.createElement('div');
  backdrop.className = 'megamenu-backdrop';
  backdrop.id = 'megamenuBackdrop';
  document.body.appendChild(backdrop);

  const wrap = navbar.querySelector('.nav-cats-wrap');
  const toggle = navbar.querySelector('#catsToggle');
  const panel = navbar.querySelector('#megamenuPanel');
  const cats = navbar.querySelector('#megamenuCats');
  const content = navbar.querySelector('#megamenuContent');

  const categoriesData = [
    {
      id: 'mobile',
      name: 'موبایل',
      icon: 'ti-device-mobile',
      menuIconImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAABK0lEQVR4nO2aTU4DMQxGcw9gYbflpBSB0x6kGrGiXKits2IkflZdgcLMrCoqW5OMivie5F30WS9xdg7hPzN/2F+zaENRPzimrxKVs0j0iR/3iwklUltK4KQktYv17qq6SH6Jrqk+l2yYs1h028noJtRmGKcatzZbHW76S3oLtRlG4OwZSfcU0/H0H6QjS1qOzS+CpRGJfp771GPzp3yR5a8vEvVubH4RajdiiDiBiBGGiBOIGGGIOIGIEYaIE4gYYYg4gYgRhogTiBhhiDiBiBGGiBOIGGGIOIGIEYaIE4gYYYg4gYgRhogTiFyaCIm+50Z5leNPLwxQXnzp1iy2JWVyFkV96bObUBtaHW4pptdhBIqXpHa23s3DFPQLMJthzErUT5ZoM5nEpfINWh8NHhxFgNwAAAAASUVORK5CYII=',
      groups: [
        {
          title: 'انتخاب موبایل',
          links: [
            { label: 'خرید آیفون', href: '/iphone' },
            { label: 'خرید گوشی سامسونگ', href: '/samsung' },
            { label: 'خرید گوشی شیائومی', href: '/xiaomi' },
            { label: 'همه محصولات موبایل', href: '/mobiles' },
          ],
        },
        {
          title: 'لوازم جانبی موبایل',
          links: [
            {
              label: 'کابل، شارژر و آداپتور',
              href: '/accessories/chargers',
              children: [
                { label: 'اپل', href: '/accessories/chargers?brand=%D8%A7%D9%BE%D9%84' },
                { label: 'سامسونگ', href: '/accessories/chargers?brand=%D8%B3%D8%A7%D9%85%D8%B3%D9%88%D9%86%DA%AF' },
                { label: 'شیائومی', href: '/accessories/chargers?brand=%D8%B4%DB%8C%D8%A7%D8%A6%D9%88%D9%85%DB%8C' },
              ],
            },
            { label: 'همه لوازم جانبی موبایل', href: '/accessories' },
          ],
        },
        {
          title: 'برندهای لوازم جانبی',
          links: [
            { label: 'لوازم جانبی اپل', href: '/accessories/apple' },
            { label: 'لوازم جانبی سامسونگ', href: '/accessories/samsung' },
            { label: 'لوازم جانبی شیائومی', href: '/accessories/xiaomi' },
          ],
        },
      ],

    },
    {
      id: 'tablet',
      name: 'تبلت',
      icon: 'ti-device-tablet',
      menuIconImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAADNklEQVR4nO2aTWgTQRTHtwURVNSDWivWZl5iDwVBqODBj5soKHgQEax6ED/xol4UEYuI0ry3rUZ6KXjwIIIIgnrxIIIVRQQFoadSkWLeS1Pq50GwoCtvmw1xsdhN0t0K84eBnc28x/vNzE7my3H+oUxuaC4gnzQkrwHlO5B4cSSDPGGIh4G4x1wbbXJqUSsWlxuUN3EFD1NBEY+lqLC+KoiOfm8OIL/ynaF8NCj7mqgw34lJzV08D1zeCMhPA5iqWgZIjpUgPq/uHQUnKXV5jQEMILuR7Q3JCzVOIR+ekQCjxJLlTZOtIkPRjYm/qXHr1feL/TzK89i/D5Rn5W5WGgAigwTOwvm4kzNFPDWDODEJLEhIFuR/BDHZwg6D0m3cfJufd7kTiPuA+IyONJVlV/WONQPKFYOSS7vSUflbGnmn+nE8ryF2EENyXYdDfZdG2eaXQb4LyHcMyQ9AuVHprxXzawHlAZCM6J9sAArdnxYZknHft5cAiM59jMtbKkHKZVHuA8nb0vNRoML2cgVg4QQg/wIqLJvM80VDPJgYiAqysu6vICRvtXX0WYM0KLdL78/rvA1ILmg+c1mW+vM4klOzDiSdze8B4p+AvEHzbS4vKc8OXD7kgxEPZ3LjCwG5F1BupUj2q59MbnzhrABJkbRq/zfIl6b0W7bhnZPrjT+m608SBylN+18a5K8my+cMymktY5BvAvJZLWtQdhmUfm2xDEl72s236MwaUI6rn5bsyIpkQHpG1xjkdymSzbpW0OdyIh70QUju6dCaduWIv6YgGTLZ/MFKPymXt6qNk9Q3MpMCCxKSBamTwIKEZEHqJLAgIVmQOgksSEgWpE4CCxKSBamTwIKEZEHqJLAgIVmQOgksyDQdxZ2cKeKZtsKGup2ZAMhAHUD4ixoGG9BVqctr1BsTmip3EaOqucbj6QHf2OXOagNQgKAma/KTreHCQBrlgB8EsqyigkkMpMtrDCoViCm6A89rAJRHJQdfdHc90/1hZVQf/rki8t6oXas5uFQT9AzkYnDKFVntfcUFQPwwqRELgtZELlZ9zaksrVUs7DYoj4P7KTEFP6HfhHYnPaL7V5y/AX2hPG42cWlbAAAAAElFTkSuQmCC',
      links: [
        { label: 'خرید تبلت اپل', href: '/ipad' },
        { label: 'خرید تبلت سامسونگ', href: '/samsungtab' },
        { label: 'خرید تبلت شیائومی', href: '/xiaomitab' },
      ],
      seeAllHref: '/ipad',
    },
    {
      id: 'headphone',
      name: 'هدفون و هندزفری',
      icon: 'ti-headphones',
      menuIconImage: 'data:image/png;base64,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',
      links: [
        { label: 'خرید هدفون اپل', href: '/headphones?brand=%D8%A7%D9%BE%D9%84' },
        { label: 'خرید هدفون سامسونگ', href: '/headphones?brand=%D8%B3%D8%A7%D9%85%D8%B3%D9%88%D9%86%DA%AF' },
      ],
      seeAllHref: '/headphones',
    },
    {
      id: 'watch',
      name: 'ساعت هوشمند',
      icon: 'ti-device-watch',
      menuIconImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEiUlEQVR4nNVaTYwUVRB+EuPBPzDRrETdmfd6wYST8aYmEm/eQI560PgTEaI3D0aT8cC4M1VDwMQDngzxAgEPRgh/XoRohIscjCweWGSnapYI64qeGVM91cM49nRv9/brXit5h+meqlffe69+XnUZUwBNYe++OtBbFumgAz5ngbsOeckC/eWQ+zIs0i155pDJIZ+1SF9YpDc2NuhesxZoGnvWAV2NFM4+aL6OXKsah7HAn4cKAV+00NsdtHsvCLjp2d8ecq2l9dH/tnx2/X55FnS6T9SRn3fIOx3yT7pbB6pFYYxxQFdEmRp0n8rKG7TpaV2Ey6ZKqsH1R/V4LJtGf11W/q2N/t2h7QDdtvsXp0xVZDv0ih6N47llIJ1Qe3m1WO2yKXFclAiA3s0tA3q7FcgZUzr1+3dZpA8Gu8E3Ro06Kz3Z/v0BB7SottIQ2aYMEr/vkI7md7ep7vio99gy0+RHHNAFfyB4MIAuyFxeQIiHGYIAvhQAbZNjUZR8kRV0aLtDntOdOS9zmqJJA1gIorZvfoPxRLV98xuGYIDfLnwCi/yDeqhtxjM55B2hIwH+3oNwWhbhRR6nSTTz6Y0HdUf+KFx4ZIh5+bc0fr7HIrcdEGsGPCvPfM1nViPYtWjaAZ8O03fg0/I7emeBW//1TvxJ2nwW+deg033WlAoE+cyYsqdG3sku9EUpB/Scvqc4ObXZXn0M8CWvQGRFHdDfDrgpv/Xy1A+AX4wuU+NAQhAKRC5gcXNZ5F26G4eU57ZXINENMFI4PE7/XsmTI/yzMUerGT8X7dH/fFS4rUzYkeYADO0Z2gjyKbWRk3KJiv4rhq1gKLwKAzcnGbtTIBb4w1KA+CIH/I5G9y9LOVpJNNNaeNwBHZFjFw6gr1x7YdNKeGvjxo70i/EFJCkuDEDwzRibuLlp77XH0viFRvjmAug+Y3wBSYoLshO6kt+I4jIc0DE9JofT+EsNiElxIXLD0eoLieEruOU0/kqAxMUFC/Sn/JYjlgZkUlxxJQKZGBdCwx4oeUzAyIju93Ls0viFRp6dM0VSnLFPigu2090c3uVjjD3Ye20mjV9olM8USVmFqoEflmMWHjWgIxGILPO5qoGsWO5YvlY5kNS4MCHFH8/XKgeygrgQm+KP52uVA0mLC0kpftJ8riogE+NCQoqfAuRs2UCS40JCip9nPq/GvtL7RhHz5SYpzZRVDnKtpfXeykHDAl2Htpv/d4GOByVT5DnvJVPgy95KpmERG+l8BMYBvSQVwYKrizvugKAfvRSxy/6ssLlDDxufJB9hhmm6h2GRD5XXRDD49Paxrt7iajyZ2MSdlL/3vqmCLPC3uoq78spwSO+pYX9drHZZlIDea5o3ncgrY+Tm+HKx2mVRYv/iVPixH+lWLg/T6K+LvrtI84GpkiJ3Ke0YWXml7UN344qpmizSAfU40iCzs97mrZIgSgPNqBOQtEOeScONNN6EjQLAF9dMU00duSatSquIGVelRGrWAm2U2NLuvi7NZA7ou2HjmV6moovU4BkvhM1pSAdth94sKmb8A+NxloX4nD3UAAAAAElFTkSuQmCC',
      links: [
        { label: 'خرید ساعت اپل', href: '/smartwatches?brand=%D8%A7%D9%BE%D9%84' },
        { label: 'خرید ساعت سامسونگ', href: '/smartwatches?brand=%D8%B3%D8%A7%D9%85%D8%B3%D9%88%D9%86%DA%AF' },
      ],
      seeAllHref: '/smartwatches',
    },
    {
      id: 'console',
      name: 'کنسول بازی',
      icon: 'ti-device-gamepad-2',
      menuIconImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEwklEQVR4nO1ZS28cRRDumAgID6EcSIJEvNu9RggjDhHv8LDESwQ4cEFC4swv4IK4DJFwvNs1DhgibhApkThY4ggIuPGQSDghHF4SBCdTNTaWfAiEGCF5UHX3bPYxs/PYXexI80l76Zmqrq+r+uuaXiEqVKhQocJ2h2qu39TQ9LTUeFhq+kBqer/WpDuG9TsFNC0Bj1ufeJjn4LnEqFEHqinAkxLoHwUUdf4k4L8KaF1p+rv3WebP2qw7Hz1+eS48qZo4ORISEuheE2jRIEf3W2/4dPfwRDSe6XaModJ4oq7xZQXhY5MQysm55d23eHhdUd9sw7bsg33V2afGE2aOzuxoPDMUiduOriipacMROCt9fGnGi3bmtVcQPis1BRLovAI6lNduxot28lw8pyVCGxxLKRK3zp/bpQB/cLX8Ga9cUR+OgFtVOlfUfnJuebcC+jzOCsdU1IdQQHMuiO+mj63eUNhBCSJK0xGl8S+laTYeu721diPH4Ba0PZ4LNb26zyiKxk3e7GVImMCADjEZJsGSmvW+1PinU8ILneN1CO/nWBTQRfnWyt7cAUjA192+WIzHpr2lqyVQS2kkBYRSU5PHxAihNM1aMvhGX0waP3RZ8fJ5i6IdSuNvthyCJy47omaf1mtqjiD4vnJKGq9rfMrtlV85RpGF2vzKA+2a9qKJeJyzkKDx2GsvNX2tNH2Z5r/3eVo5yd5xL5rgmHiMSy2TiAKctynEo93j+YhwkAroi1T/Pc/TykkljHNMruQhu6yAlvnlhg4e7HyUVFqsbIPcmdW/3I6kZimrzGI0/OBgfKYNLC+jDnFZ9bxoNrslg3k3u1v9mHRqlrLKrI0o2hFLumyG94k0KI2+a9jeFFsANUC1YnBsg8vLqtXvpqz84OC4gh1WxpXGhwaWV7usgM53qlUWZCt8Tmk8bWsbT3N/NfD9YWXcM+oVpJZXrFZFysqQSGi9Gz4+n2bjMtFjg2FuIsIsxoI7U3RqWXHqcjsE/Db5GwJPpRLJKeODoHx8OLG8OtQqKFRWgBeSiKSqTkkZ74MXTcQL0tULttVK04IogDIZKSPjSZBAb/eVl9L0oz366VFRAGl7RLXoGTFm1Fs00/X1aFt23GTVKbMyrFKcAaf/p/4PEgyOldt6296He4SC4EW3kp+KKwyq/fUYvsCy+65Tq1fFFQbZwtfcnjzGm+Yrw8rHJ4s44RLiDy97udB/L5X3x7b2gMPFIhcUJgY/eLzdx7UPqPmVu/JeCEiNH5cNPAexj/JedNiLQ3dsxDeEU7N0c+YKQLhHAi454zUJ9ArfSYnF6CpREnz1wz7Yl9S05sgsmQ2cgb0QXu8W4KKI761q3tlrc5MAXGr4wX4xYjT8YH/nHFlkphZ+ucYRucQZ+dlkBGg6L4k8q1UWqivr+P2guRrN8E5H5Cc+nY8PahOMY+Nw/CSKkjGfAzb29wS3wu7O6NKUHxzYahJ5yfDFttkWHHuL7nFG9iyRGlfj7reLREaKxwWVEoNs4SMS8A97/tE7bQPe6HyyOzXa4E/NrSaRSoY/h93/NBLwE97wohNMxnSUtsyi7UAiiYzrQja5U+8j0XtiW+b4zXYgEYNj4ZgcoUIdQIUKFSpUEOPCf4tXwW8RBZEfAAAAAElFTkSuQmCC',
      links: [{ label: 'خرید کنسول سونی', href: '/console' }],
      seeAllHref: '/console',
    },
  ];

  const hoverMedia = window.matchMedia('(hover: hover) and (pointer: fine)');
  document.documentElement.classList.toggle('desktop-hover', hoverMedia.matches);

  function showCatPanel(catId) {
    content.querySelectorAll('.megamenu-content-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.catPanel === catId);
    });
  }

  function activateCat(catId) {
    cats.querySelectorAll('.megamenu-cat-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.cat === catId);
    });
    showCatPanel(catId);
  }

  function clearActiveCat() {
    cats.querySelectorAll('.megamenu-cat-btn.active').forEach((btn) => btn.classList.remove('active'));
    content.querySelectorAll('.megamenu-content-panel.active').forEach((panel) => panel.classList.remove('active'));
  }

  categoriesData.forEach((cat, idx) => {
    const catBtn = document.createElement('button');
    catBtn.type = 'button';
    catBtn.className = 'megamenu-cat-btn';
    catBtn.dataset.cat = cat.id;
    catBtn.innerHTML = `
      ${cat.menuIconImage ? `<img src="${cat.menuIconImage}" alt="" aria-hidden="true" style="width:28px;height:28px;display:block;flex:0 0 28px;object-fit:contain">` : `<i class="ti ${cat.icon} cat-ico"></i>`}
      <span>${cat.name}</span>
      <i class="ti ti-chevron-left cat-arrow"></i>`;
    cats.appendChild(catBtn);

    const catPanel = document.createElement('div');
    catPanel.className = 'megamenu-content-panel';
    catPanel.dataset.catPanel = cat.id;
    const groupsMarkup = Array.isArray(cat.groups) && cat.groups.length
      ? `<div class="megamenu-groups">${cat.groups.map((group) => `
          <section class="megamenu-group">
            <h3 class="megamenu-group-title">${group.title}</h3>
            <div class="megamenu-group-links">
              ${group.links.map((link) => {
                const parent = `<a href="${link.href}" class="megamenu-link">${link.label}<i class="ti ti-chevron-left"></i></a>`;
                if (!Array.isArray(link.children) || !link.children.length) return parent;
                return `<div class="megamenu-nested">${parent}<div class="megamenu-child-links">${link.children.map((child) => `<a href="${child.href}" class="megamenu-child-link">${child.label}</a>`).join('')}</div></div>`;
              }).join('')}
            </div>
          </section>`).join('')}</div>`
      : `<div class="megamenu-links">${cat.links.map((link) => `<a href="${link.href}" class="megamenu-link">${link.label}<i class="ti ti-chevron-left"></i></a>`).join('')}</div>`;
    catPanel.innerHTML = `
      <div class="megamenu-content-title"><i class="ti ${cat.icon}"></i>${cat.name}</div>
      ${groupsMarkup}
`;
    content.appendChild(catPanel);

    const activate = (event) => {
      if (event) event.stopPropagation();
      activateCat(cat.id);
    };
    catBtn.addEventListener('click', activate);
    if (hoverMedia.matches) catBtn.addEventListener('mouseenter', activate);
  });

  let isOpen = false;
  let closeTimer = null;

  function openMegamenu() {
    clearTimeout(closeTimer);
    isOpen = true;
    // با ورود به منو، جزئیات اولیه دیده می‌شود اما هیچ دسته‌ای هایلایت نیست.
    if (!content.querySelector('.megamenu-content-panel.active')) showCatPanel('mobile');
    panel.classList.add('open');
    backdrop.classList.add('open');
    toggle.classList.add('active');
  }

  function closeMegamenu() {
    isOpen = false;
    clearActiveCat();
    panel.classList.remove('open');
    backdrop.classList.remove('open');
    toggle.classList.remove('active');
  }

  function scheduleClose() {
    clearTimeout(closeTimer);
    // یک فرصت کوتاه برای عبور طبیعی موس میان دکمه و پنل.
    closeTimer = setTimeout(closeMegamenu, 150);
  }

  if (hoverMedia.matches) {
    const keepMegamenuOpen = () => clearTimeout(closeTimer);
    wrap.addEventListener('mouseenter', openMegamenu);
    wrap.addEventListener('mouseleave', scheduleClose);
    // محافظ اضافه برای عبور سریع موس میان دکمهٔ سه‌خط و پنل بازشده.
    toggle.addEventListener('mouseenter', keepMegamenuOpen);
    panel.addEventListener('mouseenter', keepMegamenuOpen);
    panel.addEventListener('mouseleave', scheduleClose);
  }

  function updateHeaderHeight() {
    const header = document.querySelector('.header');
    if (!header) return;
    document.documentElement.style.setProperty(
      '--header-height',
      Math.ceil(header.getBoundingClientRect().height) + 'px',
    );
  }
  updateHeaderHeight();
  window.addEventListener('resize', updateHeaderHeight);
  window.addEventListener('orientationchange', updateHeaderHeight);

  toggle.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    isOpen ? closeMegamenu() : openMegamenu();
  });

  backdrop.addEventListener('click', closeMegamenu);
  document.addEventListener('click', function (event) {
    if (isOpen && !panel.contains(event.target) && !toggle.contains(event.target)) {
      closeMegamenu();
    }
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && isOpen) closeMegamenu();
  });

  // در صفحه اصلی، خود کادر آبی شگفت‌انگیز نیز به صفحه کامل پیشنهادها متصل باشد.
  if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    const explicitSelectors = [
      '.amazing-section', '.amazing-offers', '.amazing-offers-section',
      '.amazing-box', '.special-offer-section', '[data-amazing-section]'
    ];
    let amazingBox = document.querySelector(explicitSelectors.join(','));

    if (!amazingBox) {
      const labels = Array.from(document.querySelectorAll('h1,h2,h3,h4,strong,span,div'))
        .filter((el) => /شگفت[‌\s-]*انگیز/.test((el.textContent || '').trim()))
        .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length);
      const label = labels[0];
      if (label) {
        let node = label;
        while (node && node !== document.body) {
          const style = window.getComputedStyle(node);
          const bg = style.backgroundColor || '';
          const hasBlueBackground = /rgb\(\s*(?:37|59)\s*,\s*(?:99|130)\s*,\s*(?:235|246)\s*\)/.test(bg) ||
            /linear-gradient/.test(style.backgroundImage || '');
          if ((node.tagName === 'SECTION' || node.tagName === 'DIV') && hasBlueBackground) {
            amazingBox = node;
            break;
          }
          node = node.parentElement;
        }
      }
    }

    if (amazingBox && !amazingBox.dataset.amazingLinked) {
      amazingBox.dataset.amazingLinked = 'true';
      amazingBox.style.cursor = 'pointer';
      amazingBox.setAttribute('role', 'link');
      amazingBox.setAttribute('tabindex', amazingBox.getAttribute('tabindex') || '0');
      const goAmazing = (event) => {
        if (event.target.closest('a,button,input,select,textarea')) return;
        window.location.href = '/amazing';
      };
      amazingBox.addEventListener('click', goAmazing);
      amazingBox.addEventListener('keydown', (event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('a,button,input,select,textarea')) {
          event.preventDefault();
          window.location.href = '/amazing';
        }
      });
    }
  }
})();
