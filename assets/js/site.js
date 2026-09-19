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
  function selectTab(key) {
    document.querySelectorAll('.tab-btn').forEach(b => {
      const on = b.dataset.tab === key;
      b.classList.toggle('tab-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
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

  // Allow deep links such as .../ndeogo/#tab-analysis
  const fromHash = location.hash.replace('#tab-', '');
  if (fromHash && document.getElementById('tab-' + fromHash)) selectTab(fromHash);
