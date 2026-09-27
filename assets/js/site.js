// ── Theme (light/dark) toggle — initial detection runs earlier, in <head> ──
  document.getElementById('themeToggle').addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  });

  // ── Local time ──
  function tick() {
    document.getElementById('localTime').textContent = new Date().toLocaleTimeString(
      'en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true }
    );
  }
  tick(); setInterval(tick, 1000);
  // ── Tabs ──
  // The tab bar and the right-side nav are two controls over the same state,
  // so both route through selectTab() and both show the same active item.
  const tabsList = document.querySelector('.tabs-list');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // On a narrow screen the strip scrolls sideways, so fade whichever edge
  // still has tabs beyond it. Without this there is nothing telling the
  // viewer that more categories exist off to the right.
  function updateTabFades() {
    if (!tabsList) return;
    const overflow = tabsList.scrollWidth - tabsList.clientWidth;
    if (overflow <= 1) {
      tabsList.classList.remove('can-scroll-left', 'can-scroll-right');
      return;
    }
    tabsList.classList.toggle('can-scroll-left', tabsList.scrollLeft > 1);
    tabsList.classList.toggle('can-scroll-right', tabsList.scrollLeft < overflow - 1);
  }

  function selectTab(key) {
    document.querySelectorAll('.tab-btn').forEach(b => {
      const on = b.dataset.tab === key;
      b.classList.toggle('tab-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      // Keep the chosen tab on screen when the strip scrolls sideways.
      // scrollIntoView proved unreliable inside this container, so centre the
      // tab explicitly and clamp to the scrollable range.
      if (on && tabsList && tabsList.scrollWidth > tabsList.clientWidth) {
        const max = tabsList.scrollWidth - tabsList.clientWidth;
        const target = b.offsetLeft - (tabsList.clientWidth - b.offsetWidth) / 2;
        const left = Math.max(0, Math.min(target, max));
        // Assigning scrollLeft directly rather than scrollTo({behavior:'smooth'}):
        // a smooth programmatic scroll is silently dropped in some engines, which
        // left the selected tab off screen. Position first, then animate only
        // where that is known to work.
        tabsList.scrollLeft = left;
        if (!prefersReducedMotion && typeof tabsList.scrollTo === 'function') {
          tabsList.scrollTo({ left: left, behavior: 'smooth' });
        }
        // Refresh the fades here too: relying on the scroll event alone left
        // them stale after a programmatic scroll.
        updateTabFades();
      }
    });
    document.querySelectorAll('.tab-panel').forEach(p => {
      p.classList.toggle('tab-active', p.id === 'tab-' + key);
    });
    document.querySelectorAll('.snav-item').forEach(n => {
      n.classList.toggle('snav-active', n.dataset.target === key);
    });
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => selectTab(btn.dataset.tab));
  });

  document.querySelectorAll('.snav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      selectTab(item.dataset.target);
    });
  });

  if (tabsList) {
    tabsList.addEventListener('scroll', updateTabFades, { passive: true });
    window.addEventListener('resize', updateTabFades);
    updateTabFades();
  }

  // Allow deep links such as .../ndeogo/#tab-analysis
  const fromHash = location.hash.replace('#tab-', '');
  if (fromHash && document.getElementById('tab-' + fromHash)) selectTab(fromHash);

  // ── Map viewer for gallery cards ──
  // Cartography cards hold their maps in a <template class="card-maps">, so the
  // markup stays out of the flow until needed. One viewer serves every card.
  // Opt-in (data-gallery-view="grid"): the card first opens a grid of all its
  // maps; a map in the grid opens the viewer at that map, and closing the viewer
  // returns to the grid. Cards without the attribute open the viewer directly.
  (function () {
    const lb = document.getElementById('lightbox');
    if (!lb) return;
    const img = document.getElementById('lbImg');
    const cap = document.getElementById('lbCaption');
    const btnClose = document.getElementById('lbClose');
    const btnPrev = document.getElementById('lbPrev');
    const btnNext = document.getElementById('lbNext');
    const grid = document.getElementById('mapGrid');
    const gridList = grid ? grid.querySelector('.mg-list') : null;
    const gridTitle = grid ? grid.querySelector('.mg-title') : null;
    const gridClose = grid ? grid.querySelector('.mg-close') : null;

    let maps = [];
    let index = 0;
    let lastFocused = null;
    let gridOpener = null;

    function mapsOf(card) {
      const tpl = card.querySelector('template.card-maps');
      return tpl
        ? [...tpl.content.querySelectorAll('a')].map(a => ({
            src: a.getAttribute('href'),
            thumb: a.dataset.thumb || a.getAttribute('href'),
            title: a.dataset.title || '',
            caption: a.dataset.caption || '',
          }))
        : [];
    }

    function render() {
      const m = maps[index];
      if (!m) return;
      img.src = m.src;
      img.alt = m.caption || 'Map';
      cap.textContent = maps.length > 1
        ? `${m.caption || ''} (${index + 1} of ${maps.length})`.trim()
        : (m.caption || '');
      const single = maps.length < 2;
      btnPrev.hidden = single;
      btnNext.hidden = single;
    }

    function show(el, cls) {
      el.hidden = false;
      // Force a reflow so the opacity transition has a starting frame.
      // requestAnimationFrame is not guaranteed to run in a backgrounded or
      // non-painting tab, which left the viewer open but fully transparent.
      void el.offsetWidth;
      el.classList.add(cls);
    }

    function openAt(list, i, returnTo) {
      maps = list;
      index = i;
      lastFocused = returnTo || document.activeElement;
      render();
      show(lb, 'lb-open');
      document.body.style.overflow = 'hidden';
      btnClose.focus();
    }

    function open(card) {
      const list = mapsOf(card);
      if (!list.length) return;          // nothing to show, so do nothing
      openAt(list, 0, document.activeElement);
    }

    function close() {
      lb.classList.remove('lb-open');
      if (!grid || grid.hidden) document.body.style.overflow = '';
      window.setTimeout(() => { lb.hidden = true; img.src = ''; }, 220);
      // back in the grid, focus the card of the map shown last
      const inGrid = grid && !grid.hidden ? gridCards()[index] : null;
      const target = inGrid || lastFocused;
      if (target && typeof target.focus === 'function') target.focus();
    }

    function step(delta) {
      if (maps.length < 2) return;
      index = (index + delta + maps.length) % maps.length;
      render();
    }

    function gridCards() {
      return gridList ? [...gridList.querySelectorAll('.mg-card')] : [];
    }

    function openGrid(card) {
      const list = mapsOf(card);
      if (!list.length) return;
      if (!grid) { open(card); return; }
      gridOpener = document.activeElement;
      const t = card.querySelector('.card-title');
      gridTitle.textContent = t ? t.textContent.trim() : 'Map series';
      gridList.textContent = '';
      list.forEach((m, i) => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mg-card';
        b.setAttribute('aria-label', `Open map ${i + 1} of ${list.length}: ${m.title || m.caption}`);
        const head = document.createElement('span');
        head.className = 'mg-head';
        head.textContent = m.title || `Map ${i + 1}`;
        const th = document.createElement('img');
        th.src = m.thumb;
        th.alt = '';
        th.loading = 'lazy';
        b.append(head, th);
        b.addEventListener('click', () => openAt(list, i, b));
        li.append(b);
        gridList.append(li);
      });
      show(grid, 'mg-open');
      document.body.style.overflow = 'hidden';
      gridClose.focus();
    }

    function closeGrid() {
      grid.classList.remove('mg-open');
      document.body.style.overflow = '';
      window.setTimeout(() => { grid.hidden = true; gridList.textContent = ''; }, 220);
      if (gridOpener && typeof gridOpener.focus === 'function') gridOpener.focus();
    }

    function gridColumns() {
      const cols = getComputedStyle(gridList).gridTemplateColumns.split(' ').filter(Boolean);
      return Math.max(1, cols.length);
    }

    document.querySelectorAll('.project-card.is-gallery').forEach(card => {
      card.addEventListener('click', e => {
        // let the direct-link pills through if a gallery card ever gains them
        if (e.target.closest('.card-link')) return;
        e.preventDefault();
        if (card.dataset.galleryView === 'grid') openGrid(card);
        else open(card);
      });
    });

    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', e => { e.stopPropagation(); step(-1); });
    btnNext.addEventListener('click', e => { e.stopPropagation(); step(1); });
    // clicking the backdrop closes; clicking the image itself does not
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    if (grid) {
      gridClose.addEventListener('click', closeGrid);
      grid.addEventListener('click', e => { if (e.target === grid) closeGrid(); });
    }

    function trap(e, focusable) {
      const i = focusable.indexOf(document.activeElement);
      e.preventDefault();
      const next = e.shiftKey
        ? (i <= 0 ? focusable.length - 1 : i - 1)
        : (i === focusable.length - 1 ? 0 : i + 1);
      focusable[next].focus();
    }

    document.addEventListener('keydown', e => {
      if (!lb.hidden) {
        if (e.key === 'Escape') { close(); return; }
        if (e.key === 'ArrowLeft') { step(-1); return; }
        if (e.key === 'ArrowRight') { step(1); return; }
        // keep focus inside the dialog while it is open
        if (e.key === 'Tab') trap(e, [btnClose, btnPrev, btnNext].filter(b => !b.hidden));
        return;
      }
      if (!grid || grid.hidden) return;
      if (e.key === 'Escape') { closeGrid(); return; }
      const cards = gridCards();
      if (e.key === 'Tab') { trap(e, [gridClose, ...cards]); return; }
      const i = cards.indexOf(document.activeElement);
      if (i < 0) return;
      const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: gridColumns(), ArrowUp: -gridColumns() };
      if (e.key in moves) {
        e.preventDefault();
        const j = Math.min(cards.length - 1, Math.max(0, i + moves[e.key]));
        cards[j].focus();
      }
    });
  })();
