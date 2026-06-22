/**
 * js/telas-insumos-excel.js — Carga de hojas Excel para Telas & Insumos
 *
 * Extraído de app.js (que antes era compartido por todos los módulos).
 * Solo se usa aquí porque las zonas de carga de Excel ("Cargar hoja TELA…",
 * "Cargar hoja INSUMOS…") viven únicamente en este módulo.
 *
 * Depende de: utils.js (cleanNum, toast), state.js (FIJOS, ID),
 * pane-telas.js (importTelasRows), pane-insumos.js (importInsumosRows, renderFijosModal, renderFijosSummary),
 * y de la librería SheetJS (XLSX) cargada vía CDN en telas-insumos.html.
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
  reader.onload = async e => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });

      // ── Hoja TELA ──────────────────────────────────────────
      const sheetTela = wb.SheetNames.find(n => /^tela/i.test(n.trim()))
                     || wb.SheetNames[0];
      if (wb.Sheets[sheetTela]) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetTela], { header: 1, defval: '' });
        await importTelasRows(rows, sheetTela, tab === 'telas' ? statusEl : null);
      }

      // ── Hoja INSUMOS variables ─────────────────────────────
      const sheetIns = wb.SheetNames.find(n => /^insumos?$/i.test(n.trim()))
                    || wb.SheetNames.find(n => /insumo/i.test(n) && !/fijo/i.test(n));
      if (sheetIns && wb.Sheets[sheetIns]) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetIns], { header: 1, defval: '' });
        importInsumosRows(rows, sheetIns, tab === 'insumos' ? statusEl : null);
      }

      // ── Hoja INSUMOS FIJOS ─────────────────────────────────
      const sheetFijos = wb.SheetNames.find(n => /fijo/i.test(n));
      if (sheetFijos && wb.Sheets[sheetFijos]) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetFijos], { header: 1, defval: '' });
        importFijosRows(rows, sheetFijos);
      }

      const hojasCargadas = [sheetTela, sheetIns, sheetFijos].filter(Boolean).length;
      toast(`✓ ${hojasCargadas} hoja(s) importadas del Excel`);

    } catch (err) {
      if (statusEl) {
        statusEl.textContent = '❌ Error al leer el fichero: ' + err.message;
        statusEl.style.color = 'var(--red)';
      }
    }
  };
  reader.readAsArrayBuffer(file);
}


// ── IMPORTAR INSUMOS FIJOS DESDE EXCEL ──────────────────────

function importFijosRows(rows, sheetName) {
  // Formato HORIZONTAL: Nombre | Cantidad | Precio  (repetido por cada fijo)
  // Todos los datos están en la fila 2 (índice 1), la fila 1 son encabezados
  const dataRow = rows[1];
  if (!dataRow) return;

  FIJOS = [];
  let added = 0;

  for (let i = 0; i + 2 < dataRow.length; i += 3) {
    const name   = String(dataRow[i]     || '').trim();
    const qty    = parseFloat(dataRow[i + 1]) || 1;
    const precio = parseFloat(dataRow[i + 2]) || 0;
    if (!name) break;
    FIJOS.push({ id: ID(), name, precio, qty });
    added++;
  }

  if (added) {
    renderFijosModal();
    renderFijosSummary();
  }
}
