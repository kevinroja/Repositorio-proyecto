/**
 * ============================================================
 * ARCHIVO: js/pane-consulta.js
 * DESCRIPCIÓN: Módulo de Consulta de Referencias.
 * Conectado a MySQL via API REST — endpoints:
 *   GET /api/colecciones              → lista colecciones
 *   GET /api/prendas?colId=X          → prendas con materiales
 *   GET /api/prendas/insumos-fijos    → insumos fijos globales
 *
 * NOTA: consultaQuery y consultaSelected se declaran en state.js.
 *       NO redeclarar aquí.
 * ============================================================
 */

// ── Helpers de conexión (mismo patrón que pane-colecciones.js) ──
const CQ_API      = window.parent?.API_URL || 'http://localhost:3000/api';
const cqGetToken  = () => {
  const t = window.parent?.kikaToken || sessionStorage.getItem('kika_token');
  return (t === 'consulta_guest') ? null : t;
};
// Construye los headers de autorización solo si hay token real
const cqHeaders   = () => {
  const t = cqGetToken();
  return t ? { 'Authorization': `Bearer ${t}` } : {};
};


// ═══════════════════════════════════════════════════════════════
// CONSTRUCCIÓN DEL PANE
// ═══════════════════════════════════════════════════════════════

/**
 * Construye el HTML del pane de Consulta y carga datos iniciales.
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
          <option value="">⏳ Cargando colecciones…</option>
        </select>
        <span id="consulta-col-estado"
              style="font-size:11px;color:var(--g2);font-weight:600"></span>
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
      <div style="padding:10px 14px;border-bottom:1px solid var(--bd);
                  display:flex;gap:8px;align-items:center">
        <input id="consulta-input" class="cq-search-input" type="text"
               placeholder="Escriba el nombre de la referencia o colección…"
               onkeydown="if(event.key==='Enter') ejecutarBusquedaConsulta()"
               autocomplete="off" style="flex:1">
        <button class="btn btn-g"
                style="font-size:10px;padding:3px 14px;height:34px;white-space:nowrap"
                onclick="ejecutarBusquedaConsulta()">
          🔍 Buscar
        </button>
      </div>

      <!-- DOS COLUMNAS: lista izquierda | ficha derecha -->
      <div class="cq-two-col">
        <div class="cq-list" id="consulta-results">
          <div class="cq-empty">Selecciona una colección para cargar referencias</div>
        </div>
        <div class="cq-ficha" id="consulta-ficha">
          <div class="cq-empty">Selecciona una referencia para ver su ficha técnica completa</div>
        </div>
      </div>
    </div>`;

  // Cargar colecciones desde la API y poblar el selector
  cqCargarColecciones();
}


// ═══════════════════════════════════════════════════════════════
// CARGA DE DATOS DESDE LA API
// ═══════════════════════════════════════════════════════════════

/**
 * Carga las colecciones desde la API y puebla el selector.
 * Reutiliza COLECCIONES si ya están en memoria (cargadas por otro pane).
 */
async function cqCargarColecciones() {
  const sel    = document.getElementById('sel-coleccion-consulta');
  const estado = document.getElementById('consulta-col-estado');
  if (!sel) return;

  try {
    // Si las colecciones ya están en memoria, usarlas directamente
    if (!COLECCIONES.length) {
      const res  = await fetch(`${CQ_API}/colecciones`, {
        headers: cqHeaders()
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);

      COLECCIONES = json.data.map(c => ({
        id:     c.idCOLECCION,
        name:   c.NombreColeccion,
        season: c.Temporada,
        year:   c.Año,
      }));
    }

    // Poblar el selector
    sel.innerHTML = '<option value="">— Todas las colecciones —</option>' +
      COLECCIONES.map(c =>
        `<option value="${c.id}">${esc(c.name)} · ${c.season} ${c.year}</option>`
      ).join('');

    if (estado) {
      estado.textContent = COLECCIONES.length + ' colección(es) disponibles';
      estado.style.color = 'var(--tx3)';
    }

  } catch (err) {
    sel.innerHTML = '<option value="">❌ Error cargando colecciones</option>';
    if (estado) {
      estado.textContent = '❌ ' + err.message;
      estado.style.color = 'var(--red)';
    }
  }
}


/**
 * Carga las prendas de una colección desde la API
 * y las mapea al formato interno TELAS / INSUMOS.
 * @param {string|number} colId - ID de la colección (vacío = limpiar)
 */
async function cqCargarPrendas(colId) {
  const estado = document.getElementById('consulta-col-estado');

  if (!colId) {
    // Sin colección seleccionada: limpiar datos y mostrar estado
    TELAS   = [];
    INSUMOS = [];
    if (estado) {
      estado.textContent = '';
    }
    renderConsulta();
    return;
  }

  if (estado) {
    estado.textContent = '⏳ Cargando prendas…';
    estado.style.color = 'var(--tx3)';
  }

  try {
    // ── 1. Cargar prendas con materiales ───────────────────────
    const resPrendas = await fetch(`${CQ_API}/prendas?colId=${colId}`, {
      headers: cqHeaders()
    });
    const jsonPrendas = await resPrendas.json();
    if (!jsonPrendas.ok) throw new Error(jsonPrendas.message);

    // ── 2. Cargar insumos fijos globales ───────────────────────
    const resFijos = await fetch(`${CQ_API}/prendas/insumos-fijos`, {
      headers: cqHeaders()
    });
    const jsonFijos = await resFijos.json();

    // Mapear insumos fijos al formato interno
    if (jsonFijos.ok && jsonFijos.data?.length) {
      FIJOS = jsonFijos.data.map(f => ({
        id:     f.idINSUMOS_FIJO_GLOVALES || ID(),
        name:   f.Nombre   || '',
        precio: D(f.Precio_unitari || 0),   // typo original conservado en BD
        qty:    D(f.Cantidad       || 1),
      }));
    }

    // ── 3. Mapear prendas al formato TELAS e INSUMOS ───────────
    const coleccion = COLECCIONES.find(c => String(c.id) === String(colId));
    TELAS   = [];
    INSUMOS = [];

    jsonPrendas.data.forEach(p => {
      // ── Materiales: vienen en p.materiales[] ──────────────
      // Cada elemento: { Metros, Precio_Unitario, Nombre, Tipo }
      const mats = (p.materiales || []);
      const m = [0, 1, 2, 3].map(i => ({
        mat:    mats[i]?.Nombre         || '',
        prov:   mats[i]?.Tipo           || '',   // Tipo se usa como proveedor/tipo de tela
        mts:    D(mats[i]?.Metros       || 0),
        precio: D(mats[i]?.Precio_Unitario || 0),
      }));

      TELAS.push({
        id:     String(p.idPREND || ID()),
        ref:    p.Referencia        || '',
        col:    coleccion?.name     || '',
        colId:  colId,
        taller: D(p.Costo_confeccion || 0),
        ajuste: D(p.ajuste           || 0),
        margen: D(p.margen           || 0),
        m,
      });

      // ── Insumos variables: vienen en p.insumosVar[] ───────
      // Cada elemento: { Cantidad, Precio_unitario, PRENDA_INSUMOS_VARcol }
      const insumosVar = (p.insumosVar || []);
      if (insumosVar.length) {
        const ins = insumosVar.map(i => ({
          name:   i.PRENDA_INSUMOS_VARcol || '',   // nombre del insumo
          prov:   '',
          cant:   D(i.Cantidad        || 0),
          precio: D(i.Precio_unitario || 0),
        }));

        INSUMOS.push({
          id:    ID(),
          ref:   p.Referencia || '',
          colId: colId,
          ins,
        });
      }
    });

    // ── 4. Actualizar estado y renderizar ──────────────────────
    if (estado) {
      estado.textContent = `✓ ${TELAS.length} referencia(s)`;
      estado.style.color = 'var(--g2)';
    }

    renderConsulta();

  } catch (err) {
    if (estado) {
      estado.textContent = '❌ ' + err.message;
      estado.style.color = 'var(--red)';
    }
    toast('❌ Error cargando prendas: ' + err.message, 'error');
  }
}


// ═══════════════════════════════════════════════════════════════
// FILTRADO Y NAVEGACIÓN
// ═══════════════════════════════════════════════════════════════

/**
 * Al cambiar el selector de colección: limpia la búsqueda
 * y carga las prendas correspondientes desde la API.
 */
async function filtrarConsultaPorColeccion(colId) {
  consultaSelected = null;
  consultaQuery    = '';
  const input = document.getElementById('consulta-input');
  if (input) input.value = '';

  await cqCargarPrendas(colId);
}


/**
 * Ejecuta la búsqueda al pulsar el botón Buscar o presionar Enter.
 * Si hay una colección seleccionada, filtra en memoria.
 * Si NO hay colección seleccionada, consulta la API directamente por nombre
 * y devuelve resultados de todas las colecciones.
 */
async function ejecutarBusquedaConsulta() {
  const input  = document.getElementById('consulta-input');
  const texto  = input ? input.value.trim() : '';
  const estado = document.getElementById('consulta-col-estado');
  const sel    = document.getElementById('sel-coleccion-consulta');
  const colId  = sel ? sel.value : '';

  if (!texto) return;

  // ── Con colección seleccionada: buscar en memoria (comportamiento actual) ──
  if (colId && TELAS.length) {
    consultaQuery    = texto;
    consultaSelected = null;
    renderConsulta();
    return;
  }

  // ── Sin colección: buscar directamente en la API por nombre ──
  if (estado) {
    estado.textContent = '⏳ Buscando…';
    estado.style.color = 'var(--tx3)';
  }

  try {
    const res  = await fetch(`${CQ_API}/prendas/buscar?q=${encodeURIComponent(texto)}`, {
      headers: cqHeaders()
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message);

    // Mapear resultados al formato interno (igual que cqCargarPrendas)
    TELAS   = [];
    INSUMOS = [];

    json.data.forEach(p => {
      const colName = p.NombreColeccion || '';
      const mats    = (p.materiales || []);
      const m = [0, 1, 2, 3].map(i => ({
        mat:    mats[i]?.Nombre            || '',
        prov:   mats[i]?.Tipo              || '',
        mts:    D(mats[i]?.Metros          || 0),
        precio: D(mats[i]?.Precio_Unitario || 0),
      }));

      TELAS.push({
        id:     String(p.idPREND || ID()),
        ref:    p.Referencia               || '',
        col:    colName,
        colId:  p.COLECCION_idCOLECCION   || '',
        taller: D(p.Costo_confeccion       || 0),
        ajuste: D(p.ajuste                 || 0),
        margen: D(p.margen                 || 0),
        m,
      });

      const insumosVar = (p.insumosVar || []);
      if (insumosVar.length) {
        INSUMOS.push({
          id:    ID(),
          ref:   p.Referencia              || '',
          colId: p.COLECCION_idCOLECCION  || '',
          ins:   insumosVar.map(i => ({
            name:   i.PRENDA_INSUMOS_VARcol || '',
            prov:   '',
            cant:   D(i.Cantidad            || 0),
            precio: D(i.Precio_unitario     || 0),
          })),
        });
      }
    });

    if (estado) {
      estado.textContent = `✓ ${TELAS.length} resultado(s) para "${texto}"`;
      estado.style.color = TELAS.length ? 'var(--g2)' : 'var(--am2)';
    }

    consultaQuery    = '';   // ya vienen filtrados desde la API
    consultaSelected = null;
    renderConsulta();

  } catch (err) {
    if (estado) {
      estado.textContent = '❌ ' + err.message;
      estado.style.color = 'var(--red)';
    }
    toast('❌ Error en la búsqueda: ' + err.message, 'error');
  }
}


/**
 * Selecciona o deselecciona una referencia para ver su ficha.
 */
function selectConsulta(id) {
  consultaSelected = (consultaSelected === id) ? null : id;
  addHist('Consultó referencia', 'Consulta',
    TELAS.find(t => t.id === id)?.ref || id);
  renderConsulta();
}


// ═══════════════════════════════════════════════════════════════
// RENDER DE LISTA Y FICHA
// ═══════════════════════════════════════════════════════════════

/**
 * Renderiza la lista de referencias (columna izquierda)
 * y la ficha seleccionada (columna derecha).
 */
function renderConsulta() {
  const resultsEl = document.getElementById('consulta-results');
  const fichaEl   = document.getElementById('consulta-ficha');
  if (!resultsEl) return;

  const q = (consultaQuery || '').toLowerCase().trim();

  // Sin datos cargados
  if (!TELAS.length) {
    resultsEl.innerHTML =
      '<div class="cq-empty">Sin referencias · selecciona una colección para cargar</div>';
    if (fichaEl)
      fichaEl.innerHTML =
        '<div class="cq-empty">Selecciona una referencia para ver su ficha técnica completa</div>';
    return;
  }

  // Filtrar por texto
  const filtered = TELAS.filter(t =>
    !q ||
    t.ref.toLowerCase().includes(q) ||
    (t.col || '').toLowerCase().includes(q)
  );

  if (!filtered.length) {
    resultsEl.innerHTML =
      '<div class="cq-empty">Sin resultados para "' + esc(consultaQuery) + '"</div>';
    if (fichaEl)
      fichaEl.innerHTML =
        '<div class="cq-empty">Selecciona una referencia para ver su ficha técnica completa</div>';
    return;
  }

  // Renderizar tarjetas
  resultsEl.innerHTML = filtered.map(t => {
    const mat      = calcTtlMat(t);
    const iRow     = INSUMOS.find(i => i.ref === t.ref);
    const insV     = iRow ? calcTtlVar(iRow) : 0;
    const insF     = calcTtlFijos();
    const selected = consultaSelected === t.id ? 'selected' : '';

    return (
      '<div class="cq-ref-card ' + selected + '" onclick="selectConsulta(\'' + t.id + '\')">' +
        '<div class="cq-rc-name">' + esc(t.ref) + '</div>' +
        '<div class="cq-rc-col">' + esc(t.col || 'Sin colección') + '</div>' +
        '<div class="cq-rc-badges">' +
          '<span class="cq-badge cq-bg">Mat $' + fmt(mat) + '</span>' +
          '<span class="cq-badge cq-bb">Ins $' + fmt(insV + insF) + '</span>' +
          '<span class="cq-badge cq-ba">Taller $' + fmt(t.taller) + '</span>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  // Ficha del lado derecho
  if (fichaEl) {
    if (consultaSelected) {
      const t = TELAS.find(x => x.id === consultaSelected);
      if (t) renderFichaCompleta(t, fichaEl);
      else { fichaEl.innerHTML = ''; consultaSelected = null; }
    } else {
      fichaEl.innerHTML =
        '<div class="cq-empty">Selecciona una referencia para ver su ficha técnica completa</div>';
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// FICHA TÉCNICA COMPLETA
// ═══════════════════════════════════════════════════════════════

/**
 * Renderiza la ficha técnica completa de una referencia:
 * Materiales · Confección/Insumos Variables · Insumos Fijos ·
 * Resumen de Costos · Precios (solo Admin/Finanzas)
 */
function renderFichaCompleta(t, container) {
  const iRow        = INSUMOS.find(i => i.ref === t.ref);
  const p           = getParams();
  const c           = calcRow(t, iRow, p);
  const col         = COLECCIONES.find(x => String(x.id) === String(t.colId))
                   || COLECCIONES.find(x => x.name === t.col);
  const canSeePrice = ['admin', 'finanzas', 'consulta'].includes(currentUser?.role);

  const mats    = (t.m   || []).filter(m => m.mat);
  const insVars = iRow ? (iRow.ins || []).filter(i => i.name) : [];

  // ── Sección 1: Materiales ─────────────────────────────────
  let secMats = '<div class="cq-empty-sec">Sin materiales registrados</div>';
  if (mats.length) {
    secMats =
      '<div class="ficha-mat-grid">' +
        '<div class="fg-head">Material</div>' +
        '<div class="fg-head" style="text-align:right">Mts/Cant</div>' +
        '<div class="fg-head" style="text-align:right">$/Unid</div>' +
        '<div class="fg-head" style="text-align:right">Total</div>' +
        mats.map(m =>
          '<div class="fg-cell" style="font-weight:500">' + esc(m.mat) +
            '<br><span style="font-size:10px;color:var(--tx3)">' + esc(m.prov || '—') + '</span>' +
          '</div>' +
          '<div class="fg-cell" style="text-align:right">' + m.mts + '</div>' +
          '<div class="fg-cell" style="text-align:right">$' + fmt(m.precio) + '</div>' +
          '<div class="fg-cell" style="text-align:right;background:var(--gxlt);font-weight:600">' +
            '$' + fmt(D(m.mts) * D(m.precio)) +
          '</div>'
        ).join('') +
      '</div>' +
      '<div style="text-align:right;margin-top:6px;font-family:var(--mono);' +
           'font-weight:700;font-size:13px;color:var(--g1)">' +
        'TTL Materiales: $' + fmt(c.mat) +
      '</div>';
  }

  // ── Sección 2: Insumos Variables ──────────────────────────
  let secInsV = '';
  if (insVars.length) {
    secInsV =
      insVars.map(i =>
        '<div class="ficha-row">' +
          '<span class="fr-label">' + esc(i.name) +
            ' <span style="color:var(--tx3);font-size:10px">(' + esc(i.prov || '—') + ')</span>' +
          '</span>' +
          '<span class="fr-val">' +
            i.cant + ' × $' + fmt(i.precio) + ' = $' + fmt(D(i.cant) * D(i.precio)) +
          '</span>' +
        '</div>'
      ).join('') +
      '<div style="text-align:right;margin-top:4px;font-family:var(--mono);' +
           'font-weight:600;font-size:12px;color:var(--blue)">' +
        'TTL Insumos Var: $' + fmt(iRow ? calcTtlVar(iRow) : 0) +
      '</div>';
  }

  // ── Sección 3: Insumos Fijos ──────────────────────────────
  let secFijos = '<div class="cq-empty-sec">Sin insumos fijos configurados</div>';
  if (FIJOS.length) {
    secFijos =
      FIJOS.map(f =>
        '<div class="ficha-row">' +
          '<span class="fr-label">' + esc(f.name) + '</span>' +
          '<span class="fr-val">' +
            f.qty + ' × $' + fmt(f.precio) + ' = $' + fmt(D(f.qty) * D(f.precio)) +
          '</span>' +
        '</div>'
      ).join('') +
      '<div style="text-align:right;margin-top:4px;font-family:var(--mono);' +
           'font-weight:600;font-size:12px;color:var(--blue)">' +
        'TTL Fijos: $' + fmt(calcTtlFijos()) +
      '</div>';
  }

  // ── Sección 5: Precios (solo Admin y Finanzas) ────────────
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
          'Ajuste: ' + (t.ajuste || 0) + ' USD · ' +
          'Margen: ' + (t.margen || 0) + ' USD · ' +
          'TRM: $' + fmt(p.trm) +
        '</div>' +
      '</div>';
  } else {
    secPrecios =
      '<div style="margin:0 22px 16px;background:#FFFBF0;' +
           'border:1px dashed var(--am2);border-radius:var(--r);padding:12px 16px">' +
        '<div style="display:flex;align-items:center;gap:8px;color:var(--amber)">' +
          '<span style="font-size:18px">🔒</span>' +
          '<div>' +
            '<div style="font-weight:700;font-size:12px">Precios de venta restringidos</div>' +
            '<div style="font-size:11px;color:var(--tx3)">' +
              'Solo Administrador y Jefe de Finanzas pueden ver los precios.' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  // ── Armar ficha completa ──────────────────────────────────
  container.innerHTML =
    '<div class="ficha-box">' +

      // Encabezado verde
      '<div class="ficha-header">' +
        '<div class="fh-name">' + esc(t.ref) + '</div>' +
        '<div class="fh-meta">' +
          '📁 ' + esc(t.col || 'Sin colección') +
          (col ? ' · ' + col.season + ' ' + col.year : '') +
        '</div>' +
      '</div>' +

      // 1 — Materiales
      '<div class="ficha-section"><h4>🧵 Materiales</h4>' + secMats + '</div>' +

      // 2 — Confección e Insumos Variables
      '<div class="ficha-section">' +
        '<h4>🪡 Confección e Insumos Variables</h4>' +
        '<div class="ficha-row">' +
          '<span class="fr-label" style="font-weight:600">Costo Taller</span>' +
          '<span class="fr-val">$' + fmt(t.taller) + '</span>' +
        '</div>' +
        secInsV +
      '</div>' +

      // 3 — Insumos Fijos
      '<div class="ficha-section"><h4>📦 Insumos Fijos</h4>' + secFijos + '</div>' +

      // 4 — Resumen de Costos
      '<div class="ficha-section">' +
        '<h4>📊 Resumen de Costos de Producción</h4>' +
        '<div class="ficha-row"><span class="fr-label">Materiales</span>' +
          '<span class="fr-val">$' + fmt(c.mat) + '</span></div>' +
        '<div class="ficha-row"><span class="fr-label">Insumos (var + fijos)</span>' +
          '<span class="fr-val">$' + fmt(c.ins) + '</span></div>' +
        '<div class="ficha-row"><span class="fr-label">Costo Taller</span>' +
          '<span class="fr-val">$' + fmt(c.tal) + '</span></div>' +
        '<div class="ficha-row"><span class="fr-label">Seguro por Prenda</span>' +
          '<span class="fr-val">$' + fmt(c.seg) + '</span></div>' +
        '<div class="ficha-row" style="font-weight:700;font-size:13px">' +
          '<span style="color:var(--g1)">SUB TL 1 — Producción COP</span>' +
          '<span style="font-family:var(--mono);color:var(--g1)">$' + fmt(c.sub1) + '</span>' +
        '</div>' +
        '<div class="ficha-row"><span class="fr-label">+ Costo Financiero IVA</span>' +
          '<span class="fr-val">$' + fmt(c.finIva) + '</span></div>' +
        '<div class="ficha-row"><span class="fr-label">+ Imprevistos</span>' +
          '<span class="fr-val">$' + fmt(c.imprev) + '</span></div>' +
        '<div class="ficha-row" style="font-weight:700;font-size:13px">' +
          '<span style="color:var(--g2)">SUB TL 2 — Costo Real COP</span>' +
          '<span style="font-family:var(--mono);color:var(--g2)">$' + fmt(c.sub2) + '</span>' +
        '</div>' +
      '</div>' +

      // 5 — Precios (condicionado por rol)
      secPrecios +

    '</div>';
}