const MOBILE_BREAKPOINT = 760;
const sidebar = document.querySelector('.sidebar');

if (sidebar) {
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.id = 'mobileNavToggle';
  toggle.className = 'mobile-nav-toggle';
  toggle.setAttribute('aria-label', 'Abrir menu de navegação');
  toggle.setAttribute('aria-controls', 'mobilePrimaryNavigation');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span><b>Menu</b>';

  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'mobile-nav-backdrop';
  backdrop.setAttribute('aria-label', 'Fechar menu');
  backdrop.hidden = true;

  const nav = sidebar.querySelector('nav');
  if (nav) nav.id = nav.id || 'mobilePrimaryNavigation';

  document.body.append(toggle, backdrop);

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function setOpen(open) {
    if (!isMobile()) open = false;
    sidebar.classList.toggle('mobile-open', open);
    document.body.classList.toggle('mobile-nav-open', open);
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
    backdrop.hidden = !open;
    if (open) {
      const active = sidebar.querySelector('.nav.active') || sidebar.querySelector('.nav');
      window.setTimeout(() => active?.focus({ preventScroll: true }), 120);
    } else if (document.activeElement && sidebar.contains(document.activeElement)) {
      toggle.focus({ preventScroll: true });
    }
  }

  toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('mobile-open')));
  backdrop.addEventListener('click', () => setOpen(false));
  sidebar.querySelectorAll('.nav').forEach((button) => button.addEventListener('click', () => setOpen(false)));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && sidebar.classList.contains('mobile-open')) setOpen(false);
  });

  window.addEventListener('resize', () => {
    if (!isMobile()) setOpen(false);
  }, { passive: true });

  document.addEventListener('click', (event) => {
    if (!isMobile() || !sidebar.classList.contains('mobile-open')) return;
    if (sidebar.contains(event.target) || toggle.contains(event.target)) return;
    setOpen(false);
  });
}
