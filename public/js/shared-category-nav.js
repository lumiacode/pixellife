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
          <img class="nav-cats-icon-image" src="/images/categories/menu-all.png" alt="" aria-hidden="true" width="24" height="24"> همه دسته‌بندی‌ها
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

  const categoriesData = Array.isArray(window.PLCategories) ? window.PLCategories : [];

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
      ${cat.image ? `<img src="${cat.image}" alt="" aria-hidden="true" style="width:28px;height:28px;display:block;flex:0 0 28px;object-fit:contain">` : `<i class="ti ${cat.icon} cat-ico"></i>`}
      <span>${cat.name}</span>
      <i class="ti ti-chevron-left cat-arrow"></i>`;
    cats.appendChild(catBtn);

    const catPanel = document.createElement('div');
    catPanel.className = 'megamenu-content-panel';
    catPanel.dataset.catPanel = cat.id;
    const allHref = cat.allHref || ({ mobile: '/mobiles', tablet: '/tablets', headphone: '/headphones', watch: '/smartwatches', console: '/console' })[cat.id] || '';
    const dropAll = (links) => (links || []).filter((link) => link.href !== allHref);
    const groupsMarkup = Array.isArray(cat.logoLinks) && cat.logoLinks.length
      ? `<div class="megamenu-console-logo-links">${cat.logoLinks.map((link) => `<a class="megamenu-console-logo-link" href="${link.href}" aria-label="${link.label}"><img src="${link.image}" alt="${link.label}"></a>`).join('')}</div>`
      : Array.isArray(cat.groups) && cat.groups.length
        ? `<div class="megamenu-groups">${cat.groups.map((group) => `
          <section class="megamenu-group">${[group, ...(group.groups || [])].map((block) => `
            <div class="megamenu-block">
              ${block.href ? `<a class="megamenu-group-title" href="${block.href}"><span>${block.title}</span><i class="ti ti-chevron-left"></i></a>` : `<h3 class="megamenu-group-title"><span>${block.title}</span></h3>`}
              ${(block.links || []).length ? `<div class="megamenu-group-links">${dropAll(block.links).map((link) => `<a href="${link.href}" class="megamenu-link">${link.label}</a>`).join('')}</div>` : ''}
            </div>`).join('')}
          </section>`).join('')}</div>`
        : `<div class="megamenu-links">${cat.links.map((link) => `<a href="${link.href}" class="megamenu-link">${link.label}<i class="ti ti-chevron-left"></i></a>`).join('')}</div>`;
    catPanel.innerHTML = `
      ${allHref ? `<a class="megamenu-all-link" href="${allHref}">همه محصولات ${cat.name}<i class="ti ti-chevron-left"></i></a>` : `<div class="megamenu-content-title">${cat.name}</div>`}
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
    if (!content.querySelector('.megamenu-content-panel.active')) activateCat('mobile');
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
