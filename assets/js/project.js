// ── LIGHTBOX ──
  const lb      = document.getElementById('lightbox');
  const lbImg   = document.getElementById('lbImg');
  const lbCap   = document.getElementById('lbCaption');
  const lbClose = document.getElementById('lbClose');

  function lbOpen(src, alt, caption) {
    lbImg.src = src; lbImg.alt = alt || '';
    lbCap.textContent = caption || '';
    lb.classList.add('lb-open');
    document.body.style.overflow = 'hidden';
  }
  function lbCloseF() {
    lb.classList.remove('lb-open');
    document.body.style.overflow = '';
    setTimeout(() => { lbImg.src = ''; }, 300);
  }

  document.querySelectorAll('.map-thumb').forEach(t => {
    t.addEventListener('click', () =>
      lbOpen(t.dataset.src, t.querySelector('img')?.alt, t.dataset.caption));
  });
  lbClose.addEventListener('click', lbCloseF);
  lb.addEventListener('click', e => { if (e.target === lb) lbCloseF(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') lbCloseF(); });

  // ── SCROLL SPY — right-side nav ──
  const navItems = document.querySelectorAll('.snav-item');
  const sections = document.querySelectorAll('.section-block, .links-section');

  const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navItems.forEach(n => n.classList.remove('snav-active'));
        const hit = document.querySelector(`.snav-item[data-target="${entry.target.id}"]`);
        if (hit) hit.classList.add('snav-active');
      }
    });
  }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });

  sections.forEach(s => { if (s.id) spy.observe(s); });

  // Smooth scroll on nav click
  navItems.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const target = document.getElementById(item.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
