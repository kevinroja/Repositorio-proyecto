/**
 * ============================================================
 * ARCHIVO: js/pane-telas.js
 * DESCRIPCIÓN: Módulo de Telas & Confección (Tab 1 del Excel).
 * Grilla horizontal con todas las referencias en filas y
 * hasta 4 materiales en columnas. Soporta carga desde Excel.
 * Depende de: utils.js, state.js, auth.js, calculator.js
 * ============================================================
 */


/**
 * Retorna un array de 4 materiales vacíos.
 */
function emptyMats() {
  return Array(4).fill(null).map(() => ({
    mat: '', prov: '', mts: '', precio: ''
  }));
}


/**
 * Helper centralizado para obtener token y API URL.
 */
function getAuthConfig() {
  const token = window.parent?.kikaToken
             || sessionStorage.getItem('kika_token');
  const API   = window.parent?.API_URL
             || window.location.origin + '/api';
  return { token, API };
}

function poblarSelectColecciones() {
  const sel = document.getElementById('sel-col-cargar');
  if (!sel) return;
  const current = sel.value;
  while (sel.options.length > 1) sel.remove(1);
  COLECCIONES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    opt.style.background = '#fff';
    opt.style.color = '#000';
    sel.appendChild(opt);
  });
  if (current) sel.value = current;
}

async function cargarColeccionesEnToolbar() {
  const esInsumos = !!document.getElementById('toolbar-insumos');

  if (COLECCIONES.length) {
    if (esInsumos) { poblarSelectColecciones(); return; }
    buildToolbarTelas();
    return;
  }
  try {
    const { token, API } = getAuthConfig();
    const res  = await fetch(`${API}/colecciones`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    const data = json.data ?? json;
    if (Array.isArray(data)) {
      data.forEach(c => {
        if (!COLECCIONES.find(x => x.id == c.idCOLECCION)) {
          COLECCIONES.push({
            id:          c.idCOLECCION,
            name:        c.NombreColeccion,
            season:      c.Temporada,
            year:        c.Año,
            referencias: c.referencias || 0
          });
        }
      });
    }
  } catch(e) { console.warn('No se pudo cargar colecciones:', e.message); }

  if (esInsumos) { poblarSelectColecciones(); return; }
  buildToolbarTelas();
}


function buildToolbarTelas() {
  const tbSlot = document.getElementById('module-toolbar');
  if (!tbSlot) return;
  const edit = canEdit('telas');

  tbSlot.innerHTML = `
    <div id="toolbar-telas" style="
      width:100%;box-sizing:border-box;height:40px;z-index:200;
      background:var(--g1,#1B4332);
      border-bottom:2px solid var(--g2,#2D6A4F);
      box-shadow:0 2px 8px rgba(0,0,0,.18);
      display:flex;align-items:center;gap:5px;
      padding:0 10px;overflow:hidden;
    ">
      ${edit ? `
        <button class="btn btn-g" onclick="addTelaRow()"
          style="flex-shrink:0;height:26px;font-size:11px;padding:0 10px;
                 background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.3);color:#fff">
          + Fila
        </button>
        <button class="btn btn-o" onclick="clearTelas()"
          style="flex-shrink:0;height:26px;font-size:11px;padding:0 10px;
                 background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.25);color:#fff">
          🗑
        </button>
        <div style="width:1px;height:22px;background:rgba(255,255,255,.2);flex-shrink:0;margin:0 2px"></div>
        <select id="sel-col-cargar" style="
          flex-shrink:0;height:26px;font-size:11px;padding:0 8px;min-width:170px;
          background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);
          color:#fff;border-radius:4px;cursor:pointer">
          <option value="" style="background:#1B4332">📂 Seleccionar colección...</option>
          ${COLECCIONES.map(c =>
            `<option value="${c.id}" style="background:#fff;color:#000000">${esc(c.name)}</option>`
          ).join('')}
        </select>
        <button class="btn btn-g" onclick="cargarTelasPorColeccion()"
          style="flex-shrink:0;height:26px;font-size:11px;padding:0 10px;
                 background:rgba(90,62,138,.7);border-color:rgba(255,255,255,.3);color:#fff">
          ⬇ Cargar
        </button>
        <button class="btn btn-g" onclick="actualizarTelasPorColeccion()"
          title="Recarga desde BD la colección seleccionada"
          style="flex-shrink:0;height:26px;font-size:11px;padding:0 10px;
                 background:rgba(58,110,168,.7);border-color:rgba(255,255,255,.3);color:#fff">
          ↺ Actualizar
        </button>
        <div style="width:1px;height:22px;background:rgba(255,255,255,.2);flex-shrink:0;margin:0 2px"></div>
        <input id="inp-buscar-prenda" type="text"
          placeholder="🔍 Buscar prenda..."
          onkeydown="if(event.key==='Enter') buscarPrendaIndividual()"
          style="flex-shrink:0;height:26px;font-size:11px;padding:0 8px;min-width:180px;
                 background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);
                 color:#fff;border-radius:4px">
        <button class="btn btn-g" onclick="buscarPrendaIndividual()"
          style="flex-shrink:0;height:26px;font-size:11px;padding:0 10px;
                 background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.3);color:#fff">
          + Agregar
        </button>
        <div style="flex:1"></div>
        <button class="btn btn-g" onclick="guardarTelas()"
          style="flex-shrink:0;height:26px;font-size:11px;padding:0 12px;
                 background:rgba(26,107,124,.8);border-color:rgba(255,255,255,.3);color:#fff">
          💾 Guardar en BD
        </button>
      ` : `<span style="color:#fff;font-size:11px;opacity:.7">Solo Lectura</span>`}
    </div>`;

  if (typeof syncToolbarSpacer === 'function') syncToolbarSpacer();
  if (!COLECCIONES.length) cargarColeccionesEnToolbar();
}


function buildPaneTelas() {
  const pane = document.getElementById('pane-telas');
  if (!pane) return;
  const edit = canEdit('telas');

  buildToolbarTelas();

  pane.innerHTML = `
    <div style="padding:6px 12px 0">
      <div id="drop-telas" style="
        border:1.5px dashed var(--bd2,#B5B0A6);border-radius:6px;
        padding:7px 16px;display:flex;align-items:center;gap:10px;
        background:var(--wh,#fff);cursor:${edit ? 'pointer' : 'default'};
        font-size:11px;color:var(--tx3);margin-bottom:8px;
        ${edit ? '' : 'opacity:.6;pointer-events:none'}
      "
        ondragover="event.preventDefault();this.style.borderColor='var(--g3)';this.style.background='var(--gxlt)'"
        ondragleave="this.style.borderColor='';this.style.background='var(--wh)'"
        ondrop="handleDrop(event,'telas');this.style.borderColor='';this.style.background='var(--wh)'"
        onclick="${edit ? "document.getElementById('file-telas').click()" : 'void(0)'}">
        <span style="font-size:18px;flex-shrink:0">📂</span>
        <span>
          <b style="color:var(--tx,#1A1714)">${edit ? 'Cargar hoja TELA desde fichero Excel' : 'Solo lectura'}</b>
          <span style="margin-left:8px;color:var(--tx3)">
            Columnas: Colección · Referencia · Costo Taller · Mat1 · Prov1 · Mts1 · Precio1 … (hasta Mat4)
          </span>
        </span>
        <input type="file" id="file-telas" accept=".xlsx,.xls"
               style="display:none" onchange="handleFile(this,'telas')">
        <span id="upload-status-telas" style="margin-left:auto;font-weight:600;color:var(--g1)"></span>
      </div>
    </div>

    <div style="padding:0 12px 12px">
      <div class="xgrid-wrap">
      <table class="xgrid" id="telas-grid">
        <thead>
          <tr>
            <th class="fr" style="min-width:240px;max-width:240px;position:sticky;left:0;z-index:3;background:var(--bg,#EFECE4)">Referencia</th>
            <th colspan="2" class="gh-con" style="text-align:center">CONFECCIÓN</th>
            <th colspan="4" class="gh-prod" style="text-align:center">MATERIAL 1</th>
            <th colspan="4" class="gh-prod" style="text-align:center">MATERIAL 2</th>
            <th colspan="4" class="gh-prod" style="text-align:center">MATERIAL 3</th>
            <th colspan="4" class="gh-prod" style="text-align:center">MATERIAL 4</th>
            <th class="gh-fit num">TTL MAT</th>
            <th style="width:28px"></th>
          </tr>
          <tr>
            <th class="fr" style="position:sticky;left:0;z-index:3;background:var(--bg,#EFECE4)"></th>
            <th class="gh-con">Colección</th>
            <th class="gh-con num" style="min-width:110px">Costo Taller</th>
            <th class="gh-prod" style="min-width:120px">Material</th>
            <th class="gh-prod" style="min-width:90px">Proveedor</th>
            <th class="gh-prod num" style="min-width:65px">Mts</th>
            <th class="gh-prod num" style="min-width:80px">$/Unid</th>
            <th class="gh-prod" style="min-width:120px">Material</th>
            <th class="gh-prod" style="min-width:90px">Proveedor</th>
            <th class="gh-prod num" style="min-width:65px">Mts</th>
            <th class="gh-prod num" style="min-width:80px">$/Unid</th>
            <th class="gh-prod" style="min-width:120px">Material</th>
            <th class="gh-prod" style="min-width:90px">Proveedor</th>
            <th class="gh-prod num" style="min-width:65px">Mts</th>
            <th class="gh-prod num" style="min-width:80px">$/Unid</th>
            <th class="gh-prod" style="min-width:120px">Material</th>
            <th class="gh-prod" style="min-width:90px">Proveedor</th>
            <th class="gh-prod num" style="min-width:65px">Mts</th>
            <th class="gh-prod num" style="min-width:80px">$/Unid</th>
            <th class="gh-fit num" style="min-width:100px"></th>
            <th></th>
          </tr>
        </thead>
        <tbody id="telas-body"></tbody>
      </table>
    </div>
  </div>`;

  renderTelas();
}


function addTelaRow(data) {
  const row = {
    id:     ID(),
    ref:    data?.ref    || '',
    col:    data?.col    || '',
    colId:  data?.colId  || '',
    taller: data?.taller || '',
    m:      data?.m      || emptyMats(),
    ajuste: data?.ajuste ?? 5,
    margen: data?.margen ?? 40
  };
  TELAS.push(row);
  if (!data) addHist('Agregó fila de tela', 'Telas');
  renderTelas();
  return row;
}


function renderTelas() {
  const tbody = document.getElementById('telas-body');
  if (!tbody) return;
  const edit = canEdit('telas');

  if (!TELAS.length) {
    tbody.innerHTML = `<tr><td colspan="21"
      style="text-align:center;padding:24px;color:var(--tx3);font-style:italic">
      Sin datos · agrega una fila o carga desde Excel
    </td></tr>`;
    return;
  }

  tbody.innerHTML = TELAS.map((row) => {
    const ttl = calcTtlMat(row);

    const matCols = row.m.map((m, mi) => edit
      ? `<td><input class="ci left" value="${esc(m.mat)}" placeholder="Material…"
              onchange="updateT('${row.id}','m',${mi},'mat',this.value)"
              style="min-width:110px"></td>
         <td><input class="ci left" value="${esc(m.prov)}" placeholder="Prov."
              onchange="updateT('${row.id}','m',${mi},'prov',this.value)"
              style="min-width:80px"></td>
         <td class="num"><input class="ci" type="number" step=".01" value="${m.mts}"
              onchange="updateT('${row.id}','m',${mi},'mts',this.value)"
              style="width:60px"></td>
         <td class="num"><input class="ci" type="number" value="${m.precio}"
              onchange="updateT('${row.id}','m',${mi},'precio',this.value)"
              style="width:75px"></td>`
      : `<td><span class="cell-ro" style="text-align:left">${esc(m.mat)}</span></td>
         <td><span class="cell-ro" style="text-align:left">${esc(m.prov)}</span></td>
         <td class="num ro"><span class="cell-ro">${m.mts}</span></td>
         <td class="num ro"><span class="cell-ro">$${fmt(m.precio)}</span></td>`
    ).join('');

    return `
      <tr class="xr" data-id="${row.id}">
        <td class="fr" style="position:sticky;left:0;z-index:2;background:var(--wh,#fff)">${edit
          ? `<input class="ci left" style="font-weight:600;min-width:220px"
               value="${esc(row.ref)}" placeholder="Nombre referencia…"
               onchange="updateT('${row.id}','ref',null,null,this.value)">`
          : `<span class="cell-ro" style="text-align:left;font-weight:600">${esc(row.ref)}</span>`}
        </td>
        <td>${edit && !row.colId
          ? `<select class="ci left" style="min-width:120px"
               onchange="updateTCol('${row.id}', this.value, this.options[this.selectedIndex].text)">
               <option value="">-- Colección --</option>
               ${COLECCIONES.map(c =>
                 '<option value="' + c.id + '"' + (c.id == row.colId ? ' selected' : '') + '>' + esc(c.name) + '</option>'
               ).join('')}
             </select>`
          : `<span class="cell-ro" style="text-align:left;font-weight:600;color:var(--g1)">${esc(row.col)}</span>`}
        </td>
        <td class="num">${edit
          ? `<input class="ci" type="number" value="${row.taller}"
               onchange="updateT('${row.id}','taller',null,null,this.value)"
               style="width:90px">`
          : `<span class="cell-ro">$${fmt(row.taller)}</span>`}
        </td>
        ${matCols}
        <td class="ttl num ro">
          <span class="cell-ro">$${fmt(ttl)}</span>
        </td>
        <td>${edit
          ? `<button class="btn-del" onclick="deleteTelaRow('${row.id}')">✕</button>`
          : ''}
        </td>
      </tr>`;
  }).join('');

  syncInsRefs();
}


function updateT(id, field, mi, sf, val) {
  const row = TELAS.find(r => r.id === id);
  if (!row) return;
  if (field === 'm') row.m[mi][sf] = val;
  else row[field] = val;
  renderTelas();
}


function updateTCol(id, colId, colName) {
  const r = TELAS.find(x => x.id === id);
  if (!r) return;
  r.colId = colId;
  r.col   = colName;
}


async function deleteTelaRow(id) {
  const row = TELAS.find(r => r.id === id);
  if (!row) return;

  if (row.idPREND) {
    const confirmFn = window.confirmar || window.parent?.confirmar;
    const ok = confirmFn
      ? await confirmFn(`¿Eliminar "${row.ref}" de la base de datos?`, 'danger', 'Eliminar')
      : confirm(`¿Eliminar "${row.ref}" de la base de datos?`);
    if (!ok) return;

    const { token, API } = getAuthConfig();
    try {
      const res  = await fetch(`${API}/prendas/${row.idPREND}`, {
        method:  'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (!json.ok) { window.parent.toast('❌ ' + json.message, 'error'); return; }
      window.parent.toast(`✓ "${row.ref}" eliminada de la BD`);
    } catch (e) {
      window.parent.toast('❌ Error de conexión: ' + e.message, 'error');
      return;
    }
  }

  TELAS   = TELAS.filter(r => r.id !== id);
  INSUMOS = INSUMOS.filter(i => !(i.ref === row.ref && String(i.colId) === String(row.colId)));
  renderTelas();
  renderInsumos();
}


async function clearTelas() {
  const confirmFn = window.confirmar || window.parent?.confirmar;
  const ok = await confirmFn?.('¿Borrar todas las filas de tela?', 'danger', 'Borrar todo');
  if (!ok) return;
  TELAS = [];
  renderTelas();
}


async function resolverOCrearColeccion(colNombre) {
  const encontrada = COLECCIONES.find(
    c => c.name.trim().toLowerCase() === colNombre.trim().toLowerCase()
  );
  if (encontrada) return encontrada;

  const matchAño = colNombre.match(/(\d{2})$/);
  const año      = matchAño ? 2000 + parseInt(matchAño[1]) : new Date().getFullYear();

  const upper = colNombre.toUpperCase();
  let temporada = 'PF';
  if      (upper.includes('FALL WINTER') || upper.includes('FW'))          temporada = 'FW';
  else if (upper.includes('PRE-FALL')    || upper.includes('PRE FALL'))    temporada = 'PF';
  else if (upper.includes('SPRING SUMMER') || upper.includes('SS'))        temporada = 'SS';

  try {
    const { token, API } = getAuthConfig();
    const res  = await fetch(`${API}/colecciones`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ NombreColeccion: colNombre.trim(), Temporada: temporada, Año: año })
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message);

    const nueva = {
      id:          json.data.idCOLECCION,
      name:        json.data.NombreColeccion,
      season:      json.data.Temporada,
      year:        json.data.Año,
      createdAt:   '',
      referencias: 0
    };
    COLECCIONES.push(nueva);
    window.parent.toast(`✓ Colección "${colNombre}" creada automáticamente`);
    return nueva;

  } catch (err) {
    window.parent.toast(`⚠ No se pudo crear la colección "${colNombre}": ${err.message}`, 'error');
    return null;
  }
}


async function importTelasRows(rows, sheetName, statusEl) {
  let added = 0;

  for (let index = 0; index < rows.length; index++) {
    if (index === 0) continue;

    const cols = rows[index];
    const ref  = String(cols[1] || '').trim();
    if (!ref) continue;

    const m = [0, 1, 2, 3].map(i => ({
      mat:    String(cols[3 + i * 4] || '').trim(),
      prov:   String(cols[4 + i * 4] || '').trim(),
      mts:    cleanNum(cols[5 + i * 4]),
      precio: cleanNum(cols[6 + i * 4])
    }));

    if (!m.some(x => x.mat)) continue;

    const colNombre = String(cols[0] || '').trim();
    const colObj    = await resolverOCrearColeccion(colNombre);

    TELAS.push({
      id:     ID(),
      ref,
      col:    colNombre,
      colId:  colObj?.id || '',
      taller: cleanNum(cols[2]),
      m,
      ajuste: 5,
      margen: 40
    });
    added++;
  }

  addHist(`Importó ${added} telas`, 'Telas', sheetName);

  const sub = document.getElementById('subpane-telas');
  if (sub) {
    sub.id = 'pane-telas';
    buildPaneTelas();
    sub.id = 'subpane-telas';
    const tbody = sub.querySelector('#telas-body');
    if (tbody) renderTelas();
  } else {
    buildPaneTelas();
  }

  switchSubtab('telas');

  if (statusEl) {
    statusEl.textContent = `✓ ${added} referencia(s) importadas`;
    statusEl.style.color = 'var(--g1)';
  }
  window.parent.toast(`✓ Telas: ${added} referencias cargadas`);
}


function buildPaneMateria() {
  const pane = document.getElementById('pane-materia');
  if (!pane) return;

  pane.innerHTML = `
    <div style="display:flex;gap:0;margin-bottom:16px;border-bottom:2px solid var(--g3)">
      <button id="subtab-telas"
        onclick="switchSubtab('telas')"
        style="padding:8px 20px;border:none;background:var(--g1);color:var(--bg);
               font-family:var(--sans);font-size:13px;font-weight:700;cursor:pointer;
               border-radius:6px 6px 0 0;margin-right:4px">
        📐 Telas & Confección
      </button>
      <button id="subtab-insumos"
        onclick="switchSubtab('insumos')"
        style="padding:8px 20px;border:none;background:transparent;color:var(--tx2);
               font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;
               border-radius:6px 6px 0 0">
        🪡 Insumos
      </button>
    </div>
    <div id="subpane-telas"></div>
    <div id="subpane-insumos" style="display:none"></div>
  `;

  buildSubPaneTelas();
  buildSubPaneInsumos();
  setTimeout(() => buildToolbarTelas(), 0);
}


function switchSubtab(which) {
  const showTelas = which === 'telas';
  document.getElementById('subpane-telas').style.display   = showTelas ? '' : 'none';
  document.getElementById('subpane-insumos').style.display = showTelas ? 'none' : '';

  const btnT = document.getElementById('subtab-telas');
  const btnI = document.getElementById('subtab-insumos');
  btnT.style.background = showTelas ? 'var(--g1)' : 'transparent';
  btnT.style.color      = showTelas ? 'var(--bg)' : 'var(--tx2)';
  btnI.style.background = showTelas ? 'transparent' : 'var(--g1)';
  btnI.style.color      = showTelas ? 'var(--tx2)' : 'var(--bg)';

  if (showTelas) buildToolbarTelas();
  else           buildToolbarInsumos();
}


function buildSubPaneTelas() {
  const sub = document.getElementById('subpane-telas');
  if (!sub) return;
  sub.id = 'pane-telas';
  buildPaneTelas();
  sub.id = 'subpane-telas';
}


function buildSubPaneInsumos() {
  const sub = document.getElementById('subpane-insumos');
  if (!sub) return;
  const wasHidden = sub.style.display === 'none';
  sub.id = 'pane-insumos';
  buildPaneInsumos();
  sub.id = 'subpane-insumos';
  if (wasHidden) sub.style.display = 'none';
}


/**
 * Guarda todas las filas de telas en la BD.
 * Si una referencia ya existe en la misma colección → muestra error y detiene esa fila.
 */
async function guardarTelas() {
  if (!TELAS.length) { window.parent.toast('⚠ No hay datos para guardar', 'error'); return; }

  const { token, API } = getAuthConfig();
  if (!token) { window.parent.toast('⚠ Sin sesión activa', 'error'); return; }

  const fijosTotal = calcTtlFijos();

  // Validar duplicados en la grilla ANTES de enviar — bloquea si hay ref+colId repetida
  const vistas = new Set();
  const dupEnGrilla = [];
  for (const r of TELAS) {
    const clave = `${r.ref.trim().toLowerCase()}__${r.colId}`;
    if (vistas.has(clave)) dupEnGrilla.push(r.ref);
    else vistas.add(clave);
  }
  if (dupEnGrilla.length) {
    const lista = dupEnGrilla.length <= 3
      ? dupEnGrilla.map(r => `"${r}"`).join(', ')
      : `${dupEnGrilla.slice(0, 3).map(r => `"${r}"`).join(', ')} y ${dupEnGrilla.length - 3} más`;
    window.parent.toast(
      `❌ Referencias duplicadas en la grilla: ${lista}. Elimina las filas repetidas antes de guardar.`,
      'error'
    );
    return;
  }

  const nuevas     = TELAS.filter(r => !r.idPREND);
  const existentes = TELAS.filter(r =>  r.idPREND);

  let ok = 0, err = 0, bloqueadas = 0;
  const dupRefs = []; // referencias rechazadas por duplicado en BD

  const buildBody = (row) => {
    const materiales = row.m
      .filter(m => m.mat)
      .map(m => ({ Nombre: m.mat, Mts: +m.mts || 0, Precio: +m.precio || 0 }));
    const insRow = INSUMOS.find(i => i.ref === row.ref);
    const insumos = insRow
      ? insRow.ins.filter(i => i.name).map(i => ({
          name: i.name, cant: +i.cant || 0, precio: +i.precio || 0
        }))
      : [];
    return {
      ref:         row.ref,
      colId:       row.colId || null,
      taller:      +row.taller || 0,
      ttlMat:      calcTtlMat(row),
      ttlInsVar:   insRow ? calcTtlVar(insRow) : 0,
      ttlInsFijos: fijosTotal,
      costoTotal:  calcTtlMat(row) + (insRow ? calcTtlVar(insRow) : 0) + fijosTotal,
      materiales,
      insumos,
    };
  };

  // ── 1. Prendas NUEVAS → POST ──────────────────────────────────────────────
  for (const row of nuevas) {
    try {
      const res  = await fetch(`${API}/prendas/guardar`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify(buildBody(row)),
      });
      const json = await res.json();

      if (json.ok) {
        row.idPREND = json.data?.prendaId || json.data?.idPREND || null;
        ok++;
      } else if (json.duplicado) {
        // ── CAMBIO CLAVE: mostrar error, NO hacer PUT automático ──────────
        dupRefs.push(row.ref);
        err++;
      } else if (json.bloqueada) {
        bloqueadas++;
      } else {
        err++;
        console.error(`Error POST "${row.ref}":`, json.message);
      }
    } catch (e) {
      err++;
      console.error(`Error guardando "${row.ref}":`, e.message);
    }
  }

  // ── 2. Prendas EXISTENTES → PUT directo ──────────────────────────────────
  for (const row of existentes) {
    try {
      const res  = await fetch(`${API}/prendas/${row.idPREND}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify(buildBody(row)),
      });
      const json = await res.json();
      if (json.ok) ok++;
      else if (json.bloqueada) { bloqueadas++; }
      else { err++; console.error(`Error PUT "${row.ref}":`, json.message); }
    } catch (e) {
      err++;
      console.error(`Error actualizando "${row.ref}":`, e.message);
    }
  }

  // Guardar insumos fijos
  try {
    await fetch(`${API}/prendas/insumos-fijos`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify({ fijos: FIJOS }),
    });
  } catch(e) {
    console.error('Error guardando insumos fijos:', e.message);
  }

  // ── Toast con resumen ─────────────────────────────────────────────────────
  if (dupRefs.length) {
    const lista = dupRefs.length <= 3
      ? dupRefs.map(r => `"${r}"`).join(', ')
      : `${dupRefs.slice(0, 3).map(r => `"${r}"`).join(', ')} y ${dupRefs.length - 3} más`;
    window.parent.toast(
      `❌ Referencia(s) duplicada(s) en esta colección: ${lista}. Elimínalas o cámbiales el nombre.`,
      'error'
    );
  } else if (bloqueadas && !err) {
    window.parent.toast(`⚠ ${ok} guardadas · ${bloqueadas} bloqueadas (colección de año anterior)`, 'warn');
  } else if (err) {
    window.parent.toast(`⚠ ${ok} guardadas · ${err} con error · ${bloqueadas} bloqueadas`, 'error');
  } else {
    window.parent.toast(`✓ ${ok} prenda(s) guardadas en BD`);
  }
}


async function actualizarTelasPorColeccion() {
  if (!TELAS.length) { window.parent.toast('⚠ No hay datos en la grilla', 'error'); return; }

  document.activeElement?.blur();
  await new Promise(r => setTimeout(r, 50));

  const { token, API } = getAuthConfig();
  if (!token) { window.parent.toast('⚠ Sin sesión activa', 'error'); return; }

  const existentes = TELAS.filter(r => r.idPREND);
  const nuevas     = TELAS.filter(r => !r.idPREND);

  if (!existentes.length && nuevas.length) {
    window.parent.toast('ℹ Prendas nuevas — usa 💾 Guardar en BD');
    return;
  }

  const fijosTotal = calcTtlFijos();
  let ok = 0, err = 0;

  for (const row of existentes) {
    const materiales = row.m
      .filter(m => m.mat)
      .map(m => ({ Nombre: m.mat, Mts: +m.mts || 0, Precio: +m.precio || 0 }));

    const insRow = INSUMOS.find(i =>
      i.ref === row.ref && (!i.colId || String(i.colId) === String(row.colId))
    );
    const insumos = insRow
      ? insRow.ins.filter(i => i.name).map(i => ({
          name: i.name, cant: +i.cant || 0, precio: +i.precio || 0
        }))
      : [];

    try {
      const res = await fetch(`${API}/prendas/${row.idPREND}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ref:         row.ref,
          colId:       row.colId || null,
          taller:      +row.taller || 0,
          ttlMat:      calcTtlMat(row),
          ttlInsVar:   insRow ? calcTtlVar(insRow) : 0,
          ttlInsFijos: fijosTotal,
          costoTotal:  calcTtlMat(row) + (insRow ? calcTtlVar(insRow) : 0) + fijosTotal,
          materiales,
          insumos
        })
      });
      const json = await res.json();
      if (json.ok) {
        ok++;
        if (insRow && insRow.ref !== row.ref) insRow.ref = row.ref;
      } else {
        err++;
        console.error(`Error PUT "${row.ref}":`, json.message);
      }
    } catch(e) {
      err++;
      console.error(`Error PUT "${row.ref}":`, e.message);
    }
  }

  if (err === 0) {
    window.parent.toast(`✓ ${ok} prenda(s) actualizadas correctamente`);
  } else {
    window.parent.toast(`⚠ ${ok} actualizadas, ${err} con error`, 'error');
  }
}


async function buscarPrendaIndividual() {
  const inp = document.getElementById('inp-buscar-prenda');
  const q   = inp?.value?.trim();
  if (!q || q.length < 2) { window.parent.toast('⚠ Escribe al menos 2 caracteres', 'error'); return; }

  const { token, API } = getAuthConfig();
  if (!token) { window.parent.toast('⚠ Sin sesión activa', 'error'); return; }

  window.parent.toast('🔍 Buscando…');

  try {
    const res  = await fetch(`${API}/prendas/buscar?q=${encodeURIComponent(q)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message);

    if (!json.data?.length) {
      window.parent.toast(`Sin resultados para "${q}"`, 'warn');
      return;
    }

    let agregadas = 0;
    json.data.forEach(p => {
      const yaExiste = TELAS.some(t =>
        t.ref === p.Referencia && String(t.colId) === String(p.COLECCION_idCOLECCION)
      );
      if (yaExiste) return;

      TELAS.push({
        id:      ID(),
        idPREND: p.idPREND,
        ref:     p.Referencia,
        col:     p.NombreColeccion || '',
        colId:   p.COLECCION_idCOLECCION || '',
        taller:  p.Costo_confeccion || 0,
        m:      (p.materiales || []).map(m => ({
          mat:    m.Nombre         || '',
          prov:   '',
          mts:    m.Metros         || '',
          precio: m.Precio_Unitario || ''
        })).concat(emptyMats()).slice(0, 4),
        ajuste: 5,
        margen: 40
      });

      const yaIns = INSUMOS.some(i =>
        i.ref === p.Referencia && String(i.colId) === String(p.COLECCION_idCOLECCION)
      );
      if (!yaIns) {
        const insVarBD = (p.insumosVar || []).map(i => ({
          name:   i.PRENDA_INSUMOS_VARcol || '',
          prov:   '',
          cant:   i.Cantidad        || '',
          precio: i.Precio_unitario || ''
        }));
        INSUMOS.push({
          id:    ID(),
          ref:   p.Referencia,
          colId: p.COLECCION_idCOLECCION || '',
          ins:   insVarBD.concat(emptyIns()).slice(0, 10)
        });
      }
      agregadas++;
    });

    renderTelas();
    renderInsumos();

    const msg = agregadas > 0
      ? `✓ ${agregadas} prenda(s) encontradas para "${q}"`
      : `⚠ "${q}" ya estaba cargada en la grilla`;
    window.parent.toast(msg);

  } catch (err) {
    window.parent.toast('❌ ' + err.message, 'error');
  }
}


async function cargarTelasPorColeccion() {
  const sel   = document.getElementById('sel-col-cargar');
  const colId = sel?.value;
  if (!colId) { window.parent.toast('⚠ Selecciona una colección primero', 'error'); return; }

  const colObj = COLECCIONES.find(c => c.id == colId);

  try {
    const { token, API } = getAuthConfig();

    const res  = await fetch(`${API}/prendas?colId=${colId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message);

    TELAS   = TELAS.filter(t => t.colId != colId);
    INSUMOS = INSUMOS.filter(i => !json.data.find(p => p.Referencia === i.ref));

    json.data.forEach(p => {
      TELAS.push({
        id:      ID(),
        idPREND: p.idPREND,
        ref:     p.Referencia,
        col:     colObj?.name || '',
        colId:   colId,
        taller:  p.Costo_confeccion || 0,
        m:      (p.materiales || []).map(m => ({
          mat:    m.Nombre         || '',
          prov:   '',
          mts:    m.Metros         || '',
          precio: m.Precio_Unitario || ''
        })).concat(emptyMats()).slice(0, 4),
        ajuste: 5,
        margen: 40
      });

      const insVarBD = (p.insumosVar || []).map(i => ({
        name:   i.PRENDA_INSUMOS_VARcol || '',
        prov:   '',
        cant:   i.Cantidad       || '',
        precio: i.Precio_unitario || ''
      }));
      INSUMOS.push({
        id:  ID(),
        ref: p.Referencia,
        ins: insVarBD.concat(emptyIns()).slice(0, 10)
      });
    });

    try {
      const resFijos = await fetch(`${API}/prendas/insumos-fijos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const jf = await resFijos.json();
      if (jf.ok && jf.data?.length) {
        FIJOS = jf.data.map(f => ({
          id:     ID(),
          name:   f.Nombre,
          precio: f.Precio_Unitario || f.Precio_unitario || f.Precio_unitari || 0,
          qty:    f.Cantidad       || 1
        }));
        renderFijosModal();
        renderFijosSummary();
      }
    } catch(e) { console.warn('Insumos fijos:', e.message); }

    renderTelas();
    renderInsumos();
    window.parent.toast(`✓ ${json.data.length} referencias cargadas de "${colObj.name}"`);

  } catch (err) {
    window.parent.toast('❌ ' + err.message, 'error');
  }
}
