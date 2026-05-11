/**
 * js/app.js — Inicialización del módulo de Costeo (versión Kika integrada)
 * Se carga ÚLTIMO. No gestiona login/logout (eso es de Kika).
 * Incluye: carga Excel, drag-and-drop, navegación teclado estilo Excel.
 */


// ── CARGA DE ARCHIVOS EXCEL ─────────────────────────────────

function handleDrop(e, tab) {
  e.preventDefault();
  document.getElementById('drop-' + tab)?.classList.remove('drag');
  const file = e.dataTransfer.files[0];
  if (file) readExcelFile(file, tab);
}

function handleFile(input, tab) {
  const file = input.files[0];
  if (file) readExcelFile(file, tab);
  input.value = '';
}

function readExcelFile(file, tab) {
  const statusEl = document.getElementById('upload-status-' + tab);
  if (statusEl) {
    statusEl.textContent = '⏳ Leyendo fichero…';
    statusEl.style.color = 'var(--tx3)';
  }

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      if (tab === 'telas') {
        const sheetName = wb.SheetNames.find(n => /tela/i.test(n)) || wb.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
        importTelasRows(rows, sheetName, statusEl);
      } else {
        const sheetName = wb.SheetNames.find(n => /insumo/i.test(n))
                       || wb.SheetNames[1] || wb.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
        importInsumosRows(rows, sheetName, statusEl);
      }
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = '❌ Error al leer el fichero: ' + err.message;
        statusEl.style.color = 'var(--red)';
      }
    }
  };
  reader.readAsArrayBuffer(file);
}


// ── NAVEGACIÓN TECLADO ESTILO EXCEL ─────────────────────────

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
