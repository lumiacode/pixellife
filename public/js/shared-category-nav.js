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
          <img class="nav-cats-icon-image" src="data:image/png;base64,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" alt="" aria-hidden="true" width="24" height="24"> همه دسته‌بندی‌ها
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
      logoLinks: [
        { label: 'پلی‌استیشن', href: '/console?brand=playstation', image: 'data:image/png;base64,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' },
        { label: 'ایکس‌باکس', href: '/console?brand=xbox', image: 'data:image/png;base64,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' },
      ],
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
    const groupsMarkup = Array.isArray(cat.logoLinks) && cat.logoLinks.length
      ? `<div class="megamenu-console-logo-links">${cat.logoLinks.map((link) => `<a class="megamenu-console-logo-link" href="${link.href}" aria-label="${link.label}"><img src="${link.image}" alt="${link.label}"></a>`).join('')}</div>`
      : Array.isArray(cat.groups) && cat.groups.length
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
