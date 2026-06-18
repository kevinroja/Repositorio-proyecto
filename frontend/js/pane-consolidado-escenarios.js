/**
 * ============================================================
 * ARCHIVO: js/pane-consolidado-escenarios.js  v2
 * DESCRIPCIÓN: Guardado y carga de escenarios de costeo.
 * Incluir DESPUÉS de pane-consolidado.js en producto.html.
 * ============================================================
 */


// ── INYECCIÓN EN EL PANE ─────────────────────────────────────

/**
 * Inyecta el panel de escenarios y el botón Guardar.
 * Llamar al FINAL de buildPaneConsolidado().
 */
function inyectarPanelEscenarios() {
  const pane = document.getElementById('pane-consolidado');
  if (!pane) return;
  if (document.getElementById('escenarios-panel')) return; // evitar duplicados

  // ── 1. Botón "Guardar Escenario" dentro del card selector ──
  // Lo insertamos como último hijo del div flex que ya existe en el selector-card
  const selectorCard = document.getElementById('consolidado-selector-card');
  if (selectorCard) {
    const btnGuardar = document.createElement('button');
    btnGuardar.id        = 'btn-guardar-escenario';
    btnGuardar.className = 'btn btn-g btn-sm';
    btnGuardar.innerHTML = '💾 Guardar Escenario';
    btnGuardar.onclick   = guardarEscenario;
    // Insertar antes del span de loading para que quede junto a Refrescar
    const loading = selectorCard.querySelector('#cons-loading');
    if (loading) {
      selectorCard.querySelector('div').insertBefore(btnGuardar, loading);
    } else {
      selectorCard.querySelector('div').appendChild(btnGuardar);
    }
  }

  // ── 2. Panel de escenarios — se inserta ANTES del params-card ──
  const panel = document.createElement('div');
  panel.id        = 'escenarios-panel';
  panel.className = 'card';
  panel.style.cssText = 'margin-bottom:12px';
  panel.innerHTML = `
    <div class="card-head" style="cursor:pointer" onclick="toggleEscenariosPanel()">
      <h3>📂 Escenarios Guardados
        <span id="escenarios-count"
              style="font-size:11px;color:var(--tx3);font-weight:400;margin-left:6px"></span>
      </h3>
      <button class="btn btn-o btn-sm" style="margin-left:auto"
              onclick="event.stopPropagation();cargarEscenarios()">
        ↺ Actualizar
      </button>
      <span id="esc-arrow" style="font-size:11px;margin-left:8px;color:var(--tx3)">▼</span>
    </div>
    <div id="escenarios-body" style="padding:0 4px 8px">
      <p style="font-size:12px;color:var(--tx3);padding:12px 8px">
        Selecciona una colección para ver sus escenarios guardados.
      </p>
    </div>`;

  const paramsCard = document.getElementById('params-card');
  if (paramsCard) {
    pane.insertBefore(panel, paramsCard);
  } else {
    pane.appendChild(panel);
  }
}


// ── GUARDAR ESCENARIO ────────────────────────────────────────

async function guardarEscenario() {
  const colId = document.getElementById('cons-col-select')?.value;
  if (!colId) { toast('⚠ Selecciona una colección antes de guardar', 'warn'); return; }
  if (!TELAS.length) { toast('⚠ No hay referencias cargadas', 'warn'); return; }

  const params = getParams();

  const prendas = TELAS.map(t => {
    const ins = INSUMOS.find(i => i.ref === t.ref) || {};
    const c   = calcRow(t, ins, params);
    return {
      prendaId:        parseInt(t.id),
      ajusteUsd:       t.ajuste  ?? 0,
      margenExtra:     t.margen  ?? 0,
      costoTaller:     t.taller  ?? 0,
      precioVentaFinal: c.ws     ?? 0,
    };
  });

  const paramsGuardar = {
    trm:                params.trm,
    kvMarkup:           params.mkup,
    exportacionPct:     params.exp,
    arancelesPct:       params.aran,
    amerindias:         params.amer,
    factoring:          params.fact,
    pct10eleven:        params.ten,
    imprevistos:        params.imprev,
    costoFinancieroIva: params.fin,
    seguroAnualCop:     params.seg,
    nPrendas:           params.np,
  };

  const API   = window.parent?.API_URL || 'http://localhost:3000/api';
  const token = window.parent?.kikaToken || sessionStorage.getItem('kika_token');

  const btn = document.getElementById('btn-guardar-escenario');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando…'; }

  try {
    const res  = await fetch(`${API}/costeo/escenarios`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ colId: parseInt(colId), params: paramsGuardar, prendas }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message);

    toast(`✓ ${json.message}`);
    addHist('Guardó escenario de costeo', 'Costeo', `colId=${colId}, prendas=${prendas.length}`);
    await cargarEscenarios();

  } catch (err) {
    toast('❌ Error al guardar: ' + err.message, 'error');
    console.error('[Escenarios] guardarEscenario:', err);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '💾 Guardar Escenario'; }
  }
}


// ── LISTAR ESCENARIOS ────────────────────────────────────────

async function cargarEscenarios() {
  const colId = document.getElementById('cons-col-select')?.value;
  const body  = document.getElementById('escenarios-body');
  if (!body) return;

  if (!colId) {
    body.innerHTML = `<p style="font-size:12px;color:var(--tx3);padding:12px 8px">
      Selecciona una colección para ver sus escenarios guardados.</p>`;
    _setEscenariosCount(0);
    return;
  }

  body.innerHTML = `<p style="font-size:12px;color:var(--tx3);padding:12px 8px">⏳ Cargando…</p>`;

  const API   = window.parent?.API_URL || 'http://localhost:3000/api';
  const token = window.parent?.kikaToken || sessionStorage.getItem('kika_token');

  try {
    const res  = await fetch(`${API}/costeo/escenarios?colId=${colId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message);

    const escenarios = json.data || [];
    _setEscenariosCount(escenarios.length);

    if (!escenarios.length) {
      body.innerHTML = `
        <p style="font-size:12px;color:var(--tx3);padding:12px 8px">
          No hay escenarios guardados para esta colección.<br>
          Ajusta los parámetros y presiona <strong>💾 Guardar Escenario</strong>.
        </p>`;
      return;
    }

    body.innerHTML = `
      <div style="overflow-x:auto;padding:4px 4px 0">
        <table style="width:100%;border-collapse:collapse;font-size:11px;min-width:600px">
          <thead>
            <tr style="background:var(--bg2)">
              <th style="padding:7px 10px;text-align:left;font-weight:600;color:var(--tx2)">Nombre</th>
              <th style="padding:7px 8px;text-align:right;color:var(--tx2)">TRM</th>
              <th style="padding:7px 8px;text-align:right;color:var(--tx2)">KV ×</th>
              <th style="padding:7px 8px;text-align:right;color:var(--tx2)">Export %</th>
              <th style="padding:7px 8px;text-align:right;color:var(--tx2)">Aran %</th>
              <th style="padding:7px 8px;text-align:right;color:var(--tx2)">Prendas</th>
              <th style="padding:7px 8px;text-align:center;color:var(--tx2)">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${escenarios.map((e, idx) => `
              <tr style="border-bottom:1px solid var(--brd);
                         background:${idx % 2 === 0 ? 'var(--bg0)' : 'var(--bg1)'}">
                <td style="padding:8px 10px;font-weight:600;color:var(--tx1)">
                  ${esc(e.nombre)}
                  <span style="display:block;font-size:10px;color:var(--tx3);font-weight:400">
                    ${e.fecha ? new Date(e.fecha).toLocaleDateString('es-CO') : '—'}
                  </span>
                </td>
                <td style="padding:8px;text-align:right;font-family:var(--mono)">$${fmt(e.trm)}</td>
                <td style="padding:8px;text-align:right;font-family:var(--mono)">×${e.kv_markup}</td>
                <td style="padding:8px;text-align:right;font-family:var(--mono)">${e.exportacion_pct}%</td>
                <td style="padding:8px;text-align:right;font-family:var(--mono)">${e.aranceles_pct}%</td>
                <td style="padding:8px;text-align:right">${e.total_prendas}</td>
                <td style="padding:6px 8px;text-align:center;white-space:nowrap">
                  <button class="btn btn-o btn-sm" style="margin-right:4px"
                          onclick="restaurarEscenario(${e.idRepresentativo})"
                          title="Cargar estos parámetros en el consolidado">
                    ↩ Restaurar
                  </button>
                  <button class="btn btn-sm"
                          style="background:#FEE2E2;color:#B91C1C;border:1px solid #FECACA"
                          onclick="eliminarEscenario(${e.idRepresentativo},'${esc(e.nombre)}')"
                          title="Eliminar este escenario">
                    🗑
                  </button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

  } catch (err) {
    body.innerHTML = `<p style="font-size:12px;color:#B91C1C;padding:12px 8px">
      ❌ ${err.message}</p>`;
    console.error('[Escenarios] cargarEscenarios:', err);
  }
}


// ── RESTAURAR ESCENARIO ──────────────────────────────────────

async function restaurarEscenario(idRepresentativo) {
  const colId = document.getElementById('cons-col-select')?.value;
  if (!colId) return;

  const API   = window.parent?.API_URL || 'http://localhost:3000/api';
  const token = window.parent?.kikaToken || sessionStorage.getItem('kika_token');

  try {
    const res  = await fetch(`${API}/costeo/escenarios/${idRepresentativo}?colId=${colId}`,
      { headers: { 'Authorization': `Bearer ${token}` } });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message);

    const { params, prendas } = json.data;

    _setInput('p-trm',    params.trm);
    _setInput('p-mkup',   params.kvMarkup);
    _setInput('p-exp',    params.exportacionPct);
    _setInput('p-aran',   params.arancelesPct);
    _setInput('p-amer',   params.amerindias);
    _setInput('p-fact',   params.factoring);
    _setInput('p-10e',    params.pct10eleven);
    _setInput('p-imprev', params.imprevistos);
    _setInput('p-finm',   params.costoFinancieroIva);

    prendas.forEach(pr => {
      const t = TELAS.find(t => parseInt(t.id) === pr.prendaId);
      if (t) {
        t.ajuste = pr.ajusteUsd   ?? 0;
        t.margen = pr.margenExtra ?? 0;
        t.taller = pr.costoTaller ?? t.taller;
      }
    });

    onTrmChange(params.trm);
    recalc();
    toast(`✓ Escenario restaurado`);
    addHist('Restauró escenario de costeo', 'Costeo', `id=${idRepresentativo}`);

  } catch (err) {
    toast('❌ Error al restaurar: ' + err.message, 'error');
    console.error('[Escenarios] restaurarEscenario:', err);
  }
}


// ── ELIMINAR ESCENARIO ───────────────────────────────────────

async function eliminarEscenario(idRepresentativo, nombre) {
  const ok = typeof confirmar === 'function'
    ? await confirmar(`¿Eliminar "${nombre}"?\nNo se puede deshacer.`, 'danger', 'Eliminar')
    : window.confirm(`¿Eliminar "${nombre}"?`);
  if (!ok) return;

  const colId = document.getElementById('cons-col-select')?.value;
  const API   = window.parent?.API_URL || 'http://localhost:3000/api';
  const token = window.parent?.kikaToken || sessionStorage.getItem('kika_token');

  try {
    const res  = await fetch(`${API}/costeo/escenarios/${idRepresentativo}?colId=${colId}`,
      { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message);

    toast(`🗑 ${json.message}`);
    addHist('Eliminó escenario', 'Costeo', `id=${idRepresentativo}`);
    await cargarEscenarios();
  } catch (err) {
    toast('❌ Error: ' + err.message, 'error');
  }
}


// ── UI HELPERS ───────────────────────────────────────────────

function toggleEscenariosPanel() {
  const body  = document.getElementById('escenarios-body');
  const arrow = document.getElementById('esc-arrow');
  if (!body) return;
  const hidden = body.style.display === 'none';
  body.style.display = hidden ? '' : 'none';
  if (arrow) arrow.textContent = hidden ? '▼' : '▶';
}

function _setInput(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) el.value = value;
}

function _setEscenariosCount(n) {
  const el = document.getElementById('escenarios-count');
  if (el) el.textContent = n ? `(${n} escenario${n !== 1 ? 's' : ''})` : '';
}


// ── PATCH: cargarConsolidadoDesdeDB también recarga escenarios ──
(function patchCargarConsolidado() {
  const _original = window.cargarConsolidadoDesdeDB;
  if (typeof _original !== 'function') return;
  window.cargarConsolidadoDesdeDB = async function(colId) {
    await _original(colId);
    await cargarEscenarios();
  };
})();