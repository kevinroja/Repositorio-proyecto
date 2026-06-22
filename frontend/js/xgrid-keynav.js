/**
 * js/xgrid-keynav.js — Navegación de teclado estilo Excel para grillas .xgrid
 *
 * Extraído de app.js. Lo usan los módulos con celdas editables (clase .ci):
 * Telas & Insumos y Consolidado (ajuste/margen).
 */
document.addEventListener('keydown', e => {
  const el = e.target;
  if (el.tagName !== 'INPUT' || e.key !== 'Enter') return;
  if (!el.classList.contains('ci') && !el.closest('.xgrid')) return;
  e.preventDefault();
  const allInputs = Array.from(
    document.querySelectorAll('input.ci:not([readonly]):not([disabled])')
  );
  const idx = allInputs.indexOf(el);
  if (idx >= 0 && idx < allInputs.length - 1) {
    allInputs[idx + 1].focus();
    allInputs[idx + 1].select?.();
  }
});
