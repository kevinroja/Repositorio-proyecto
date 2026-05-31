/**
 * ============================================================
 * ARCHIVO: js/pane-consulta.js
 * DESCRIPCIÓN: Módulo de Consulta de Referencias.
 * Permite a todos los roles buscar cualquier referencia y ver
 * su ficha técnica completa: materiales, insumos y precios.
 * Los precios solo son visibles para Admin y Finanzas.
 * Depende de: utils.js, state.js, auth.js, calculator.js
 *
 * NOTA: consultaQuery y consultaSelected se declaran en state.js.
 *       NO redeclarar aquí.
 * ============================================================
 */


/**
 * Construye el HTML del pane de Consulta.
 * Layout: selector de colección → buscador → dos columnas (lista | ficha)
 */
function buildPaneConsulta() {
  const pane = document.getElementById('pane-consulta');
  if (!pane) return;

  pane.innerHTML = `
    <div class="page-title">🔍 Módulo de Consulta</div>
    <div class="page-sub">
      Busca cualquier referencia y consulta su ficha técnica completa.
      Los precios de venta solo son visibles para Admin y Finanzas.
    </div>

    <!-- SELECTOR DE COLECCIÓN -->
    <div class="cq-card" style="margin-bottom:12px">
      <div class="cq-card-head"><h3>SELECCIONAR COLECCIÓN</h3></div>
      <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;flex-wrap:wrap">
        <label style="font-size:12px;font-weight:600;color:var(--tx2)">Colección</label>
        <select id="sel-coleccion-consulta" class="cq-select"
          onchange="filtrarConsultaPorColeccion(this.value)">
          <option value="">— Todas las colecciones —</option>
        </select>
        <span id="consulta-col-estado" style="font-size:11px;color:var(--g2);font-weight:600"></span>
      </div>
    </div>

    <!-- BUSCADOR + LAYOUT DOS COLUMNAS -->
    <div class="cq-card">
      <div class="cq-card-head">
        <h3>BUSCAR REFERENCIA</h3>
        <button class="btn btn-o" style="font-size:10px;padding:3px 10px"
          onclick="document.getElementById('consulta-input').value='';
                   consultaQuery=''; consultaSelected=null; renderConsulta();">
          ✕ Limpiar
        </button>
      </div>
      <div style="padding:10px 14px;border-bottom:1px solid var(--bd);display:flex;gap:8px;align-items:center">
        <input id="consulta-input" class="cq-search-input" type="text"
               placeholder="Escriba el nombre de la referencia o colección…"
               onkeydown="if(event.key==='Enter') ejecutarBusquedaConsulta()"
               autocomplete="off"
               style="flex:1">
        <button class="btn btn-g" style="font-size:10px;padding:3px 14px;height:34px;white-space:nowrap"
                onclick="ejecutarBusquedaConsulta()">
          🔍 Buscar
        </button>
      </div>

      <!-- DOS COLUMNAS: lista izquierda | ficha derecha -->
      <div class="cq-two-col">
        <div class="cq-list" id="consulta-results"></div>
        <div class="cq-ficha" id="consulta-ficha">
          <div class="cq-empty">
            Selecciona una referencia para ver su ficha técnica completa
          </div>
        </div>
      </div>
    </div>`;

  poblarSelectorConsulta();
  renderConsulta();
}


/**
 * Ejecuta la búsqueda al pulsar el botón o presionar Enter.
 * Lee el valor del input, actualiza consultaQuery y re-renderiza.
 */
function ejecutarBusquedaConsulta() {
  const input = document.getElementById('consulta-input');
  consultaQuery    = input ? input.value : '';
  consultaSelected = null;
  renderConsulta();
}


/**
 * Renderiza la lista de referencias y la ficha seleccionada.
 * Se llama cada vez que el usuario escribe en el buscador,
 * selecciona una colección o selecciona una tarjeta.
 */
function renderConsulta() {
  const resultsEl = document.getElementById('consulta-results');
  const fichaEl   = document.getElementById('consulta-ficha');
  if (!resultsEl) return;

  const q = (consultaQuery || '').toLowerCase().trim();

  // Sin datos cargados
  if (!TELAS.length) {
    resultsEl.innerHTML = '<div class="cq-empty">Sin referencias · selecciona una colección para cargar</div>';
    if (fichaEl) fichaEl.innerHTML = '<div class="cq-empty">Selecciona una referencia para ver su ficha técnica completa</div>';
    return;
  }

  // Filtrar por texto de búsqueda
  const filtered = TELAS.filter(t =>
    !q ||
    t.ref.toLowerCase().includes(q) ||
    (t.col || '').toLowerCase().includes(q)
  );

  if (!filtered.length) {
    resultsEl.innerHTML = '<div class="cq-empty">Sin resultados para "' + esc(consultaQuery) + '"</div>';
    if (fichaEl) fichaEl.innerHTML = '<div class="cq-empty">Selecciona una referencia para ver su ficha técnica completa</div>';
    return;
  }

  // Renderizar tarjetas en lista vertical
  resultsEl.innerHTML = filtered.map(t => {
    const mat      = calcTtlMat(t);
    const iRow     = INSUMOS.find(i => i.ref === t.ref && (i.colId === t.colId || i.col === t.col));
    const insV     = iRow ? calcTtlVar(iRow) : 0;
    const insF     = calcTtlFijos();
    const selected = consultaSelected === t.id ? 'selected' : '';

    return '<div class="cq-ref-card ' + selected + '" onclick="selectConsulta(\'' + t.id + '\')">' +
           '<div class="cq-rc-name">' + esc(t.ref) + '</div>' +
           '<div class="cq-rc-col">' + esc(t.col || 'Sin colección') + '</div>' +
           '<div class="cq-rc-badges">' +
             '<span class="cq-badge cq-bg">Mat $' + fmt(mat) + '</span>' +
             '<span class="cq-badge cq-bb">Ins $' + fmt(insV + insF) + '</span>' +
             '<span class="cq-badge cq-ba">Taller $' + fmt(t.taller) + '</span>' +
           '</div>' +
           '</div>';
  }).join('');

  // Mostrar ficha si hay una referencia seleccionada
  if (fichaEl) {
    if (consultaSelected) {
      const t = TELAS.find(x => x.id === consultaSelected)
             || TELAS.find(x => x.ref === consultaSelected);
      if (t) renderFichaCompleta(t, fichaEl);
      else   { fichaEl.innerHTML = ''; consultaSelected = null; }
    } else {
      fichaEl.innerHTML = '<div class="cq-empty">Selecciona una referencia para ver su ficha técnica completa</div>';
    }
  }
}


/**
 * Selecciona o deselecciona una referencia.
 * Si se hace clic en la ya seleccionada, se cierra la ficha.
 * @param {string} id - ID de la referencia
 */
function selectConsulta(id) {
  consultaSelected = (consultaSelected === id) ? null : id;
  addHist('Consultó referencia', 'Consulta',
    TELAS.find(t => t.id === id)?.ref || id);
  renderConsulta();
}


/**
 * Renderiza la ficha técnica completa de una referencia.
 * Secciones: Materiales · Confección/Insumos · Fijos · Costos · Precios
 *
 * FIX: usa currentUser?.role (string) en lugar de currentUser?.rol (número)
 * para ser compatible con la definición de state.js.
 */
function renderFichaCompleta(t, container) {
  const iRow        = INSUMOS.find(i => i.ref === t.ref && (i.colId === t.colId || i.col === t.col))
                   || INSUMOS.find(i => i.ref === t.ref);
  const p           = getParams();
  const c           = calcRow(t, iRow, p);
  const col         = COLECCIONES.find(x => x.name === t.col);

  // FIX: comparar con role (string) tal como lo define state.js
  const canSeePrice = ['admin', 'finanzas'].includes(currentUser?.role);

  const mats    = (t.m   || []).filter(m => m.mat);
  const insVars = iRow ? (iRow.ins || []).filter(i => i.name) : [];

  // ── Sección materiales ────────────────────────────────────
  let secMats = '<div class="cq-empty-sec">Sin materiales registrados</div>';
  if (mats.length) {
    secMats =
      '<div class="ficha-mat-grid">' +
        '<div class="fg-head">Material</div>' +
        '<div class="fg-head" style="text-align:right">Mts/Cant</div>' +
        '<div class="fg-head" style="text-align:right">$/Unid</div>' +
        '<div class="fg-head" style="text-align:right">Total</div>' +
        mats.map(m =>
          '<div class="fg-cell" style="font-weight:500">' + esc(m.mat) + '<br>' +
            '<span style="font-size:10px;color:var(--tx3)">' + esc(m.prov || '—') + '</span>' +
          '</div>' +
          '<div class="fg-cell" style="text-align:right">' + m.mts + '</div>' +
          '<div class="fg-cell" style="text-align:right">$' + fmt(m.precio) + '</div>' +
          '<div class="fg-cell" style="text-align:right;background:var(--gxlt);font-weight:600">$' + fmt(D(m.mts) * D(m.precio)) + '</div>'
        ).join('') +
      '</div>' +
      '<div style="text-align:right;margin-top:6px;font-family:var(--mono);font-weight:700;font-size:13px;color:var(--g1)">' +
        'TTL Materiales: $' + fmt(c.mat) +
      '</div>';
  }

  // ── Sección insumos variables ─────────────────────────────
  let secInsV = '';
  if (insVars.length) {
    secInsV = insVars.map(i =>
      '<div class="ficha-row">' +
        '<span class="fr-label">' + esc(i.name) +
          ' <span style="color:var(--tx3);font-size:10px">(' + esc(i.prov || '—') + ')</span>' +
        '</span>' +
        '<span class="fr-val">' + i.cant + ' × $' + fmt(i.precio) + ' = $' + fmt(D(i.cant) * D(i.precio)) + '</span>' +
      '</div>'
    ).join('') +
    '<div style="text-align:right;margin-top:4px;font-family:var(--mono);font-weight:600;font-size:12px;color:var(--blue)">' +
      'TTL Insumos Var: $' + fmt(iRow ? calcTtlVar(iRow) : 0) +
    '</div>';
  }

  // ── Sección insumos fijos ─────────────────────────────────
  let secFijos = '<div class="cq-empty-sec">Sin insumos fijos configurados</div>';
  if (FIJOS.length) {
    secFijos = FIJOS.map(f =>
      '<div class="ficha-row">' +
        '<span class="fr-label">' + esc(f.name) + '</span>' +
        '<span class="fr-val">' + f.qty + ' × $' + fmt(f.precio) + ' = $' + fmt(D(f.qty) * D(f.precio)) + '</span>' +
      '</div>'
    ).join('') +
    '<div style="text-align:right;margin-top:4px;font-family:var(--mono);font-weight:600;font-size:12px;color:var(--blue)">' +
      'TTL Fijos: $' + fmt(calcTtlFijos()) +
    '</div>';
  }

  // ── Sección precios (solo roles autorizados) ──────────────
  let secPrecios = '';
  if (canSeePrice) {
    secPrecios =
      '<div class="ficha-section">' +
        '<h4>💲 Precios de Venta (USD / COP)</h4>' +
        '<div class="price-band">' +
          '<div class="price-chip" style="background:var(--bllt)">' +
            '<div class="pc-label" style="color:var(--blue)">USD Base</div>' +
            '<div class="pc-value" style="color:var(--blue)">' + fmtU(c.usd) + '</div>' +
          '</div>' +
          '<div class="price-chip" style="background:var(--glt)">' +
            '<div class="pc-label" style="color:var(--g1)">WS USD</div>' +
            '<div class="pc-value" style="color:var(--g1)">' + fmtU(c.ws) + '</div>' +
          '</div>' +
          '<div class="price-chip" style="background:var(--amlt)">' +
            '<div class="pc-label" style="color:var(--amber)">RT USD</div>' +
            '<div class="pc-value" style="color:var(--amber)">' + fmtU(c.rt) + '</div>' +
          '</div>' +
          '<div class="price-chip" style="background:#FFF9C4">' +
            '<div class="pc-label" style="color:#7B6500">Precio SAS COP</div>' +
            '<div class="pc-value" style="color:#7B6500;font-size:13px">$' + fmt(c.cop) + '</div>' +
          '</div>' +
          '<div class="price-chip" style="background:#FFE0B2">' +
            '<div class="pc-label" style="color:#6D3A00">Precio Retail COP</div>' +
            '<div class="pc-value" style="color:#6D3A00;font-size:13px">$' + fmt(c.rtCop) + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="margin-top:10px;font-size:10px;color:var(--tx3)">' +
          'Ajuste: ' + t.ajuste + ' USD · Margen: ' + t.margen + ' USD · TRM: $' + fmt(p.trm) +
        '</div>' +
      '</div>';
  } else {
    secPrecios =
      '<div style="margin:0 22px 16px;background:#FFFBF0;border:1px dashed var(--am2);border-radius:var(--r);padding:12px 16px">' +
        '<div style="display:flex;align-items:center;gap:8px;color:var(--amber)">' +
          '<span style="font-size:18px">🔒</span>' +
          '<div>' +
            '<div style="font-weight:700;font-size:12px">Precios de venta restringidos</div>' +
            '<div style="font-size:11px;color:var(--tx3)">Solo Administrador y Jefe de Finanzas pueden ver los precios.</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  // ── Armar ficha completa ──────────────────────────────────
  container.innerHTML =
    '<div class="ficha-box">' +

      // Encabezado
      '<div class="ficha-header">' +
        '<div class="fh-name">' + esc(t.ref) + '</div>' +
        '<div class="fh-meta">' +
          '📁 ' + esc(t.col || 'Sin colección') +
          (col ? ' · ' + col.season + ' ' + col.year : '') +
        '</div>' +
      '</div>' +

      // Sección 1 — Materiales
      '<div class="ficha-section">' +
        '<h4>🧵 Materiales</h4>' +
        secMats +
      '</div>' +

      // Sección 2 — Confección e Insumos Variables
      '<div class="ficha-section">' +
        '<h4>🪡 Confección e Insumos Variables</h4>' +
        '<div class="ficha-row">' +
          '<span class="fr-label" style="font-weight:600">Costo Taller</span>' +
          '<span class="fr-val">$' + fmt(t.taller) + '</span>' +
        '</div>' +
        secInsV +
      '</div>' +

      // Sección 3 — Insumos Fijos
      '<div class="ficha-section">' +
        '<h4>📦 Insumos Fijos</h4>' +
        secFijos +
      '</div>' +

      // Sección 4 — Resumen de Costos
      '<div class="ficha-section">' +
        '<h4>📊 Resumen de Costos de Producción</h4>' +
        '<div class="ficha-row"><span class="fr-label">Materiales</span><span class="fr-val">$' + fmt(c.mat) + '</span></div>' +
        '<div class="ficha-row"><span class="fr-label">Insumos (var + fijos)</span><span class="fr-val">$' + fmt(c.ins) + '</span></div>' +
        '<div class="ficha-row"><span class="fr-label">Costo Taller</span><span class="fr-val">$' + fmt(c.tal) + '</span></div>' +
        '<div class="ficha-row"><span class="fr-label">Seguro por Prenda</span><span class="fr-val">$' + fmt(c.seg) + '</span></div>' +
        '<div class="ficha-row" style="font-weight:700;font-size:13px">' +
          '<span style="color:var(--g1)">SUB TL 1 — Producción COP</span>' +
          '<span style="font-family:var(--mono);color:var(--g1)">$' + fmt(c.sub1) + '</span>' +
        '</div>' +
        '<div class="ficha-row"><span class="fr-label">+ Costo Financiero IVA</span><span class="fr-val">$' + fmt(c.finIva) + '</span></div>' +
        '<div class="ficha-row"><span class="fr-label">+ Imprevistos</span><span class="fr-val">$' + fmt(c.imprev) + '</span></div>' +
        '<div class="ficha-row" style="font-weight:700;font-size:13px">' +
          '<span style="color:var(--g2)">SUB TL 2 — Costo Real COP</span>' +
          '<span style="font-family:var(--mono);color:var(--g2)">$' + fmt(c.sub2) + '</span>' +
        '</div>' +
      '</div>' +

      // Sección 5 — Precios (condicionada por rol)
      secPrecios +

    '</div>';
}


// ── SELECTOR DE COLECCIÓN ────────────────────────────────────

/**
 * Rellena el <select> de colecciones en el pane de Consulta.
 * Se llama desde buildPaneConsulta() y puede llamarse desde cargarDesdeDB().
 */
function poblarSelectorConsulta() {
  const sel = document.getElementById('sel-coleccion-consulta');
  if (!sel) return;

  const actual = sel.value;
  sel.innerHTML = '<option value="">— Todas las colecciones —</option>' +
    COLECCIONES.map(c =>
      '<option value="' + c.id + '"' + (String(c.id) === String(actual) ? ' selected' : '') + '>' +
        esc(c.name) + ' · ' + c.season + ' ' + c.year +
      '</option>'
    ).join('');
}

/**
 * Filtra las referencias por colección al cambiar el selector.
 * Llama a cargarDesdeDB(colId) y luego re-renderiza.
 */
async function filtrarConsultaPorColeccion(colId) {
  const estado = document.getElementById('consulta-col-estado');

  if (estado) {
    estado.textContent = '⏳ Cargando...';
    estado.style.color = 'var(--tx3)';
  }

  // Limpiar búsqueda y selección actual
  consultaSelected = null;
  const input = document.getElementById('consulta-input');
  if (input) { input.value = ''; consultaQuery = ''; }

  await cargarDesdeDB(colId || null);

  if (estado) {
    estado.textContent = colId
      ? '✓ ' + TELAS.length + ' referencia(s)'
      : '✓ ' + TELAS.length + ' en total';
    estado.style.color = 'var(--g2)';
  }

  renderConsulta();
}