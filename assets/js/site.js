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
  // Each project category is its own tab; there is no longer a single
  // long Projects page, so the right-side jump nav and its scroll spy
  // have been removed along with it.
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('tab-active');
        b.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('tab-active'));
      btn.classList.add('tab-active');
      btn.setAttribute('aria-selected', 'true');
      const panel = document.getElementById('tab-' + btn.dataset.tab);
      if (panel) panel.classList.add('tab-active');
    });
  });
