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
  const sectionNav = document.getElementById('sectionNav');
  function showNav(show) {
    sectionNav.style.display = show ? 'flex' : 'none';
  }
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('tab-active'));
      btn.classList.add('tab-active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('tab-active');
      // Show nav only on Projects tab, and only on wide screens
      showNav(btn.dataset.tab === 'projects' && window.innerWidth >= 1280);
    });
  });
  // ── Scroll spy for right-side nav ──
  const sections = document.querySelectorAll('.project-section');
  const navItems = document.querySelectorAll('.snav-item');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navItems.forEach(n => n.classList.remove('snav-active'));
        const active = document.querySelector(`.snav-item[data-target="${entry.target.id}"]`);
        if (active) active.classList.add('snav-active');
      }
    });
  }, { rootMargin: '-20% 0px -60% 0px', threshold: 0 });
  sections.forEach(s => spy.observe(s));
  // Smooth scroll — prevent default jump, use scrollIntoView
  navItems.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const target = document.getElementById(item.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  // Init nav state on load
  showNav(window.innerWidth >= 1280);
  window.addEventListener('resize', () => {
    const isProjects = document.querySelector('.tab-btn.tab-active')?.dataset.tab === 'projects';
    showNav(isProjects && window.innerWidth >= 1280);
  });
