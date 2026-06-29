/**
 * ============================================================
 * ARCHIVO: js/pane-consolidado-escenarios.js  v4
 * DESCRIPCIÓN: Guardado y carga de escenarios de costeo.
 * Incluir DESPUÉS de pane-consolidado.js en producto.html.
 * ============================================================
 */


// ── VARIABLE GLOBAL PARA NOMBRE ─────────────────────────────
var _escNombreActual = '';

// ── INYECCIÓN EN EL PANE ─────────────────────────────────────

function inyectarPanelEscenarios() {
  const pane = document.getElementById('pane-consolidado');
  if (!pane) return;
  if (document.getElementById('escenarios-panel')) return;

  const selectorCard = document.getElementById('consolidado-selector-card');
  if (selectorCard) {
    const btnGuardar = document.createElement('button');
    btnGuardar.id        = 'btn-guardar-escenario';
    btnGuardar.className = 'btn btn-g btn-sm';
    btnGuardar.innerHTML = '💾 Guardar Escenario';
    btnGuardar.onclick   = guardarEscenario;
    const loading = selectorCard.querySelector('#cons-loading');
    if (loading) {
      selectorCard.querySelector('div').insertBefore(btnGuardar, loading);
    } else {
      selectorCard.querySelector('div').appendChild(btnGuardar);
    }
  }

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

    <div id="escenarios-body" style="padding:4px 4px 8px">
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

  // oninput/onchange inline en el HTML ya capturan _escNombreActual — no se necesita listener adicional
}


// ── NOMBRE ESCENARIO — input inline ─────────────────────────

function _pedirNombreEscenario() {
  // Chrome en iframes bloquea eventos de teclado nativos — .value siempre vacío.
  // Solución: usar prompt() del padre que corre fuera del iframe.
  var sugerencia = _escNombreActual.trim() || '';
  var val = (window.parent && window.parent.prompt)
    ? window.parent.prompt('Nombre del escenario:', sugerencia)
    : prompt('Nombre del escenario:', sugerencia);

  if (val === null) return Promise.resolve(null); // usuario canceló
  val = val.trim();
  if (!val) {
    var _toast = (window.parent && window.parent.toast) ? window.parent.toast : toast;
    _toast('⚠ Escribe un nombre para el escenario', 'info');
    return Promise.resolve(null);
  }
  _escNombreActual = '';
  return Promise.resolve(val);
}

function _pedirNombreEscenario_UNUSED() {
  return new Promise(resolve => {
    // Limpiar modal previo
    document.getElementById('modal-nombre-esc')?.remove();

    const hoy = new Date().toLocaleDateString('es-CO');
    const overlay = document.createElement('div');
    overlay.id = 'modal-nombre-esc';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:rgba(0,0,0,.45)',
      'z-index:9999',
      'display:flex',
      'align-items:center',
      'justify-content:center',
    ].join(';');

    // Crear contenido del modal sin template literals para evitar
    // problemas de interpolación en contexto de iframe
    const box = document.createElement('div');
    box.style.cssText = [
      'background:#fff',
      'border-radius:10px',
      'padding:24px 28px',
      'min-width:340px',
      'max-width:480px',
      'width:90%',
      'box-shadow:0 8px 32px rgba(0,0,0,.22)',
      'font-family:inherit',
    ].join(';');

    const titulo = document.createElement('h3');
    titulo.textContent = '💾 Guardar Escenario';
    titulo.style.cssText = 'margin:0 0 6px;font-size:15px;color:#1a1a1a';

    const desc = document.createElement('p');
    desc.textContent = 'Ingresa un nombre para identificar este escenario de costeo.';
    desc.style.cssText = 'margin:0 0 14px;font-size:12px;color:#888';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = 'Escenario ' + hoy;
    input.placeholder = 'Ej: PRE-FALL 26 — Canal A';
    input.style.cssText = [
      'width:100%',
      'box-sizing:border-box',
      'padding:9px 12px',
      'font-size:13px',
      'border:1.5px solid #ddd',
      'border-radius:6px',
      'outline:none',
      'font-family:inherit',
      'color:#1a1a1a',
      'background:#fafafa',
    ].join(';');

    const errorMsg = document.createElement('p');
    errorMsg.textContent = 'El nombre no puede estar vacío.';
    errorMsg.style.cssText = 'margin:6px 0 0;font-size:11px;color:#EF5350;display:none';

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:18px';

    const btnCan = document.createElement('button');
    btnCan.textContent = 'Cancelar';
    btnCan.className = 'btn btn-o btn-sm';
    btnCan.style.minWidth = '80px';

    const btnOk = document.createElement('button');
    btnOk.textContent = 'Guardar';
    btnOk.className = 'btn btn-g btn-sm';
    btnOk.style.minWidth = '100px';

    btnRow.appendChild(btnCan);
    btnRow.appendChild(btnOk);
    box.appendChild(titulo);
    box.appendChild(desc);
    box.appendChild(input);
    box.appendChild(errorMsg);
    box.appendChild(btnRow);
    overlay.appendChild(box);

    // Expandir iframe para cubrir toda la pantalla
    const iframe = window.frameElement;
    let prevStyle = '';
    if (iframe) {
      prevStyle = iframe.getAttribute('style') || '';
      iframe.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9998;border:none';
    }

    document.body.appendChild(overlay);
    setTimeout(() => { input.focus(); input.select(); }, 50);

    const restaurarIframe = () => {
      if (iframe) iframe.setAttribute('style', prevStyle);
    };

    const confirmar = () => {
      const val = input.value.trim();
      if (!val) { errorMsg.style.display = ''; input.focus(); return; }
      overlay.remove();
      restaurarIframe();
      resolve(val);
    };

    const cancelar = () => {
      overlay.remove();
      restaurarIframe();
      resolve(null);
    };

    btnOk.addEventListener('click', confirmar);
    btnCan.addEventListener('click', cancelar);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') confirmar();
      if (e.key === 'Escape') cancelar();
      errorMsg.style.display = 'none';
    });
    overlay.addEventListener('click', e => {
      if (e.target === overlay) cancelar();
    });
  });
}


// ── GUARDAR ESCENARIO ────────────────────────────────────────

async function guardarEscenario() {
  const colId = document.getElementById('cons-col-select')?.value;
  if (!colId) { toast('⚠ Selecciona una colección antes de guardar'); return; }
  if (!TELAS.length) { toast('⚠ No hay referencias cargadas'); return; }

  const nombre = await _pedirNombreEscenario();
  if (!nombre) return;

  const params = getParams();

  const prendas = TELAS.map(t => {
    const ins = INSUMOS.find(i => i.ref === t.ref) || {};
    const c   = calcRow(t, ins, params);
    return {
      prendaId:         parseInt(t.id),
      ajusteUsd:        t.ajuste    ?? 0,
      margenExtra:      t.margen    ?? 0,
      shopmy:           t.shopmy    ?? 0,
      kvMarkupRow:      t.kvMkup    ?? null,
      costoTaller:      t.taller    ?? 0,
      precioVentaFinal: c.ws        ?? 0,
      precioSug:        t.precioSug ?? null,
    };
  });

  const paramsGuardar = {
    trm:                params.trm,
    kvMarkup:           params.kvMkup,
    rtMarkup:           params.rtMkup,
    exportacionPct:     params.exp    * 100,
    arancelesPct:       params.aran   * 100,
    amerindias:         params.amer   * 100,
    factoring:          params.fact   * 100,
    pct10eleven:        params.ten11  * 100,
    imprevistos:        params.imprev * 100,
    costoFinancieroIva: params.finM   * 100,
    ivaPct:             params.iva    * 100,
    tasaFinPct:         D(document.getElementById('p-fintasa')?.value) || 0,
    seguroAnualCop:     params.seg,
    nPrendas:           params.np,
  };

  const API   = window.parent?.API_URL || 'http://localhost:3000/api';
  const token = window.parent?.kikaToken || sessionStorage.getItem('kika_token');

  const btn = document.getElementById('btn-guardar-escenario');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando…'; }

  try {
    const res = await fetch(`${API}/costeo/escenarios`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        colId:   parseInt(colId),
        nombre:  nombre,
        params:  paramsGuardar,
        prendas,
      }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message);

    toast('✓ ' + json.message);
    const ni = document.getElementById('esc-nombre-input'); if (ni) ni.value = ''; _escNombreActual = '';
    addHist('Guardó escenario de costeo', 'Costeo', 'colId=' + colId + ', prendas=' + prendas.length);
    await cargarEscenarios();

  } catch (err) {
    toast('❌ Error al guardar: ' + err.message);
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
    body.innerHTML = '<p style="font-size:12px;color:var(--tx3);padding:12px 8px">Selecciona una colección para ver sus escenarios guardados.</p>';
    _setEscenariosCount(0);
    return;
  }

  body.innerHTML = '<p style="font-size:12px;color:var(--tx3);padding:12px 8px">⏳ Cargando…</p>';

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
      body.innerHTML = '<p style="font-size:12px;color:var(--tx3);padding:12px 8px">No hay escenarios guardados para esta colección.<br>Ajusta los parámetros y presiona <strong>💾 Guardar Escenario</strong>.</p>';
      return;
    }

    let filas = '';
    escenarios.forEach(function(e, idx) {
      const bg    = idx % 2 === 0 ? 'var(--bg0)' : 'var(--bg1)';
      const fecha = e.fecha ? new Date(e.fecha).toLocaleDateString('es-CO') : '—';
      const kv    = parseFloat(e.kv_markup  || 0).toFixed(2);
      const rt    = parseFloat(e.rt_markup  || 0).toFixed(2);
      filas += '<tr style="border-bottom:1px solid var(--brd);background:' + bg + '">' +
        '<td style="padding:8px 10px;font-weight:600;color:var(--tx1)">' + esc(e.nombre) +
          '<span style="display:block;font-size:10px;color:var(--tx3);font-weight:400">' + fecha + '</span>' +
        '</td>' +
        '<td style="padding:8px;text-align:right;font-family:var(--mono)">$' + fmt(e.trm) + '</td>' +
        '<td style="padding:8px;text-align:right;font-family:var(--mono)">×' + kv + '</td>' +
        '<td style="padding:8px;text-align:right;font-family:var(--mono)">×' + rt + '</td>' +
        '<td style="padding:8px;text-align:right;font-family:var(--mono)">' + e.exportacion_pct + '%</td>' +
        '<td style="padding:8px;text-align:right;font-family:var(--mono)">' + e.aranceles_pct + '%</td>' +
        '<td style="padding:8px;text-align:right">' + e.total_prendas + '</td>' +
        '<td style="padding:6px 8px;text-align:center;white-space:nowrap">' +
          '<button class="btn btn-o btn-sm" style="margin-right:4px" onclick="restaurarEscenario(' + e.idRepresentativo + ')" title="Cargar estos parámetros en el consolidado">↩ Restaurar</button>' +
          '<button class="btn btn-sm" style="background:#FEE2E2;color:#B91C1C;border:1px solid #FECACA" onclick="eliminarEscenario(' + e.idRepresentativo + ',\'' + esc(e.nombre) + '\')" title="Eliminar este escenario">🗑</button>' +
        '</td>' +
      '</tr>';
    });

    body.innerHTML =
      '<div style="overflow-x:auto;padding:4px 4px 0">' +
        '<table style="width:100%;border-collapse:collapse;font-size:11px;min-width:600px">' +
          '<thead><tr style="background:var(--bg2)">' +
            '<th style="padding:7px 10px;text-align:left;font-weight:600;color:var(--tx2)">Nombre</th>' +
            '<th style="padding:7px 8px;text-align:right;color:var(--tx2)">TRM</th>' +
            '<th style="padding:7px 8px;text-align:right;color:var(--tx2)">KV ×</th>' +
            '<th style="padding:7px 8px;text-align:right;color:var(--tx2)">RT ×</th>' +
            '<th style="padding:7px 8px;text-align:right;color:var(--tx2)">Export %</th>' +
            '<th style="padding:7px 8px;text-align:right;color:var(--tx2)">Aran %</th>' +
            '<th style="padding:7px 8px;text-align:right;color:var(--tx2)">Prendas</th>' +
            '<th style="padding:7px 8px;text-align:center;color:var(--tx2)">Acciones</th>' +
          '</tr></thead>' +
          '<tbody>' + filas + '</tbody>' +
        '</table>' +
      '</div>';

  } catch (err) {
    body.innerHTML = '<p style="font-size:12px;color:#B91C1C;padding:12px 8px">❌ ' + err.message + '</p>';
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

    _setInput('p-trm',     params.trm);
    _setInput('p-mkup',    params.kvMarkup);
    _setInput('p-rt',      params.rtMarkup);
    _setInput('p-exp',     params.exportacionPct);
    _setInput('p-aran',    params.arancelesPct);
    _setInput('p-amer',    params.amerindias);
    _setInput('p-fact',    params.factoring);
    _setInput('p-10e',     params.pct10eleven);
    _setInput('p-imprev',  params.imprevistos);
    _setInput('p-finm',    params.costoFinancieroIva);
    _setInput('p-iva',     params.ivaPct);
    _setInput('p-fintasa', params.tasaFinPct);

    prendas.forEach(function(pr) {
      const t = TELAS.find(function(t) { return parseInt(t.id) === pr.prendaId; });
      if (t) {
        t.ajuste    = pr.ajusteUsd   ?? 0;
        t.margen    = pr.margenExtra ?? 0;
        t.shopmy    = pr.shopmy      ?? 0;
        t.taller    = pr.costoTaller ?? t.taller;
        t.precioSug = pr.precioSug   ?? null;
        if (pr.kvMarkupRow != null) t.kvMkup = pr.kvMarkupRow;
      }
    });

    onTrmChange(params.trm);
    recalc();
    toast('✓ Escenario restaurado');
    addHist('Restauró escenario de costeo', 'Costeo', 'id=' + idRepresentativo);

  } catch (err) {
    toast('❌ Error al restaurar: ' + err.message);
    console.error('[Escenarios] restaurarEscenario:', err);
  }
}


// ── ELIMINAR ESCENARIO ───────────────────────────────────────

async function eliminarEscenario(idRepresentativo, nombre) {
  const _confirmar = typeof confirmar === 'function'
    ? confirmar
    : (window.parent?.confirmar ?? null);
  if (!_confirmar) return;
  const ok = await _confirmar('¿Eliminar "' + nombre + '"? Esta acción no se puede deshacer.', 'danger', 'Eliminar');
  if (!ok) return;

  const colId = document.getElementById('cons-col-select')?.value;
  const API   = window.parent?.API_URL || 'http://localhost:3000/api';
  const token = window.parent?.kikaToken || sessionStorage.getItem('kika_token');

  try {
    const res  = await fetch(`${API}/costeo/escenarios/${idRepresentativo}?colId=${colId}`,
      { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message);

    toast('🗑 ' + json.message);
    addHist('Eliminó escenario', 'Costeo', 'id=' + idRepresentativo);
    await cargarEscenarios();
  } catch (err) {
    toast('❌ Error: ' + err.message);
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
  if (el) el.textContent = n ? '(' + n + ' escenario' + (n !== 1 ? 's' : '') + ')' : '';
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
