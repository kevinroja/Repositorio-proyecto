/**
 * navbar-mobile.js — Menú hamburguesa + fix dropdowns desktop
 * Cargar DESPUÉS del script de roles en Interfas_Admin.html
 */
(function () {
  'use strict';

  const navbar = document.querySelector('.navbar');
  const topnav = document.querySelector('.topnav');
  if (!navbar || !topnav) return;

  /* ══════════════════════════════════════════════════════════
     FIX DROPDOWNS DESKTOP
     El CSS hover falla cuando .tn-group tiene display:flex
     puesto como estilo inline por el JS de roles.
     Solución: manejamos mouseenter/mouseleave con JS y
     añadimos la clase .dd-open que sí dispara el CSS.
  ══════════════════════════════════════════════════════════ */
  topnav.querySelectorAll('.tn-group').forEach(group => {
    if (!group.querySelector('.tn-dropdown')) return;

    group.addEventListener('mouseenter', () => group.classList.add('dd-open'));
    group.addEventListener('mouseleave', () => group.classList.remove('dd-open'));
  });

  // Cerrar si el usuario hace clic fuera de cualquier grupo
  document.addEventListener('click', e => {
    if (!e.target.closest('.tn-group')) {
      topnav.querySelectorAll('.tn-group.dd-open')
            .forEach(g => g.classList.remove('dd-open'));
    }
  });

  /* ══════════════════════════════════════════════════════════
     MENÚ HAMBURGUESA (móvil ≤ 900px)
  ══════════════════════════════════════════════════════════ */

  /* 1. Botón hamburguesa */
  const hamburger = document.createElement('button');
  hamburger.className = 'btn-hamburger';
  hamburger.setAttribute('aria-label', 'Abrir menú');
  hamburger.innerHTML = '<i class="ri-menu-line"></i>';
  navbar.appendChild(hamburger);

  /* 2. Overlay */
  const overlay = document.createElement('div');
  overlay.className = 'mobile-menu-overlay';
  document.body.appendChild(overlay);

  /* 3. Panel móvil */
  const menu = document.createElement('nav');
  menu.className = 'mobile-menu';
  document.body.appendChild(menu);

  buildMenu();

  /* 4. Abrir / cerrar */
  function openMenu() {
    menu.classList.add('open');
    overlay.classList.add('open');
    hamburger.innerHTML = '<i class="ri-close-line"></i>';
  }
  function closeMenu() {
    menu.classList.remove('open');
    overlay.classList.remove('open');
    hamburger.innerHTML = '<i class="ri-menu-line"></i>';
    menu.querySelectorAll('.mm-group.open').forEach(g => g.classList.remove('open'));
  }

  hamburger.addEventListener('click', () =>
    menu.classList.contains('open') ? closeMenu() : openMenu()
  );
  overlay.addEventListener('click', closeMenu);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  menu.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });

  /* 5. Construir el menú móvil */
  function buildMenu() {
    menu.innerHTML = '';

    topnav.querySelectorAll('.tn-group').forEach(group => {
      if (group.style.display === 'none') return;

      const btn      = group.querySelector('.tn-btn');
      const dropdown = group.querySelector('.tn-dropdown');
      if (!btn) return;

      const iconEl    = btn.querySelector('i:not(.ri-arrow-down-s-line)');
      const iconClass = iconEl ? iconEl.className : 'ri-circle-line';

      const labelSpan = btn.querySelector('span');
      const label = labelSpan
        ? labelSpan.textContent.trim()
        : [...btn.childNodes]
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => n.textContent.trim())
            .filter(Boolean)
            .join(' ');

      const visibleLinks = dropdown
        ? [...dropdown.querySelectorAll('a')].filter(a => a.style.display !== 'none')
        : [];

      if (visibleLinks.length > 0) {
        const mmGroup = document.createElement('div');
        mmGroup.className = 'mm-group';

        const mmBtn = document.createElement('button');
        mmBtn.className = 'mm-group-btn';
        mmBtn.innerHTML =
          `<i class="${iconClass} mm-icon"></i>` +
          `<span>${label}</span>` +
          `<i class="ri-arrow-down-s-line mm-chevron"></i>`;

        const mmSub = document.createElement('div');
        mmSub.className = 'mm-sub';

        visibleLinks.forEach(a => {
          const clone = document.createElement('a');
          clone.href = '#';
          clone.innerHTML = a.innerHTML;
          const oc = a.getAttribute('onclick');
          if (oc) clone.setAttribute('onclick', oc);
          if (a.classList.contains('active')) clone.classList.add('active');
          mmSub.appendChild(clone);
        });

        mmBtn.addEventListener('click', () => {
          const isOpen = mmGroup.classList.contains('open');
          menu.querySelectorAll('.mm-group.open').forEach(g => g.classList.remove('open'));
          if (!isOpen) mmGroup.classList.add('open');
        });

        mmGroup.appendChild(mmBtn);
        mmGroup.appendChild(mmSub);
        menu.appendChild(mmGroup);

      } else {
        const mmItem = document.createElement('button');
        mmItem.className = 'mm-item';
        mmItem.innerHTML = `<i class="${iconClass}"></i><span>${label}</span>`;
        const oc = btn.getAttribute('onclick');
        if (oc) mmItem.setAttribute('onclick', oc);
        else mmItem.addEventListener('click', () => btn.click());
        menu.appendChild(mmItem);
      }
    });

    /* Separador + Salir */
    const btnSalir = document.getElementById('btnSalir');
    if (btnSalir) {
      const sep = document.createElement('div');
      sep.className = 'mm-sep';
      menu.appendChild(sep);

      const mmSalir = document.createElement('button');
      mmSalir.className = 'mm-item mm-item-logout';
      mmSalir.innerHTML = '<i class="ri-logout-box-line"></i><span>Salir</span>';
      mmSalir.addEventListener('click', () => btnSalir.click());
      menu.appendChild(mmSalir);
    }
  }

})();
