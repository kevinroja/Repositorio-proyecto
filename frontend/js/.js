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
             || 'http://localhost:3000/api';
  return { token, API };
}


/**
 * Construye el HTML completo del pane de Telas.
 */
function buildPaneTelas() {
  const pane = document.getElementById('pane-telas');
  if (!pane) return;
  const edit = canEdit('telas');

  pane.innerHTML = `
    <!-- Zona de carga desde Excel -->
    <div class="upload-zone" id="drop-telas"
         ondragover="event.preventDefault();this.classList.add('drag')"
         ondragleave="this.classList.remove('drag')"
         ondrop="handleDrop(event,'telas')"
         onclick="${edit ? "document.getElementById('file-telas').click()" : 'void(0)'}"
         style="${edit ? '' : 'pointer-events:none;opacity:.6'}">
      <span class="big">📂</span>
      <b>${edit ? 'Cargar hoja TELA desde fichero Excel' : 'Solo lectura — sin permiso de carga'}</b><br>
      <span style="font-size:10px;color:var(--tx3)">
        Columnas: Colección · Referencia · Costo Taller · Mat1 · Prov1 · Mts1 · Precio1 … (hasta Mat4)
      </span>
      <input type="file" id="file-telas" accept=".xlsx,.xls"
             style="display:none" onchange="handleFile(this,'telas')">
      <div id="upload-status-telas"
           style="margin-top:8px;font-size:11px;font-weight:600"></div>
    </div>

    <!-- Barra de acciones -->
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">
      ${edit
        ? `<button class="btn btn-g" onclick="addTelaRow()">+ Agregar fila</button>
           <button class="btn btn-o" onclick="clearTelas()">🗑 Limpiar</button>
           <select id="sel-col-cargar" class="ci left" style="min-width:160px">
             <option value="">📂 Seleccionar colección...</option>
             ${COLECCIONES.map(c => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('')}
           </select>
           <button class="btn btn-g" onclick="cargarTelasPorColeccion()"
             style="background:#5a3e8a">
             ⬇ Cargar referencias
           </button>
           <button class="btn btn-g" onclick="guardarTelas()"
             style="margin-left:auto;background:#1a6b7c">
             💾 Guardar en BD
           </button>`
        : '<span class="badge ba">Solo Lectura</span>'}
      <span class="hint">Edita directo en la celda · Enter/Tab para avanzar</span>
    </div>

    <!-- Grilla estilo Excel -->
    <div class="xgrid-wrap">
      <table class="xgrid" id="telas-grid">
        <thead>
          <tr>
            <th class="fr" style="min-width:240px;max-width:240px">Referencia</th>
            <th colspan="2" class="gh-con" style="text-align:center">CONFECCIÓN</th>
            <th colspan="4" class="gh-prod" style="text-align:center">MATERIAL 1</th>
            <th colspan="4" class="gh-prod" style="text-align:center">MATERIAL 2</th>
            <th colspan="4" class="gh-prod" style="text-align:center">MATERIAL 3</th>
            <th colspan="4" class="gh-prod" style="text-align:center">MATERIAL 4</th>
            <th class="gh-fit num">TTL MAT</th>
            <th style="width:28px"></th>
          </tr>
          <tr>
            <th class="fr"></th>
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
    </div>`;

  renderTelas();
}


/**
 * Agrega una nueva fila de tela al array TELAS.
 */
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


/**
 * Renderiza el tbody de la grilla de telas.
 */
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
        <!-- Referencia -->
        <td class="fr">${edit
          ? `<input class="ci left" style="font-weight:600;min-width:220px"
               value="${esc(row.ref)}" placeholder="Nombre referencia…"
               onchange="updateT('${row.id}','ref',null,null,this.value)">`
          : `<span class="cell-ro" style="text-align:left;font-weight:600">${esc(row.ref)}</span>`}
        </td>
        <!-- Colección: fija si viene del Excel (tiene colId), seleccionable si es fila nueva -->
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
        <!-- Costo Taller -->
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
  recalc();
}


/**
 * Actualiza un campo de una fila de tela.
 */
function updateT(id, field, mi, sf, val) {
  const row = TELAS.find(r => r.id === id);
  if (!row) return;
  if (field === 'm') row.m[mi][sf] = val;
  else row[field] = val;
  renderTelas();
}


/**
 * Actualiza ajuste o margen desde el Consolidado.
 */
function updateTelaField(id, field, val) {
  const r = TELAS.find(x => x.id === id);
  if (r) { r[field] = D(val); recalc(); }
}


/**
 * Actualiza colId y col cuando el usuario elige colección manualmente.
 */
function updateTCol(id, colId, colName) {
  const r = TELAS.find(x => x.id === id);
  if (!r) return;
  r.colId = colId;
  r.col   = colName;
}


/**
 * Elimina una fila de tela.
 */
function deleteTelaRow(id) {
  TELAS = TELAS.filter(r => r.id !== id);
  renderTelas();
}


/**
 * Elimina TODAS las filas de tela tras confirmación.
 */
async function clearTelas() {
  const ok = await window.parent.confirmar('¿Borrar todas las filas de tela?', 'danger', 'Borrar todo');
  if (!ok) return;
  TELAS = [];
  renderTelas();
}


/**
 * Resuelve el ID de una colección por nombre.
 * Si no existe, la crea en la BD automáticamente.
 * Soporta: PRE-FALL 26, FALL WINTER 26, SPRING SUMMER 26
 */
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
    toast(`✓ Colección "${colNombre}" creada automáticamente`);
    return nueva;

  } catch (err) {
    toast(`⚠ No se pudo crear la colección "${colNombre}": ${err.message}`, 'error');
    return null;
  }
}


/**
 * Importa filas desde Excel.
 * Resuelve o crea la colección automáticamente desde columna A.
 */
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
  toast(`✓ Telas: ${added} referencias cargadas`);
}


/**
 * Construye el pane combinado Telas + Insumos.
 */
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
  sub.id = 'pane-insumos';
  buildPaneInsumos();
  sub.id = 'subpane-insumos';
}


/**
 * Guarda todas las filas de telas en la BD.
 * Verifica duplicados locales antes de enviar.
 */
async function guardarTelas() {
  if (!TELAS.length) { toast('⚠ No hay datos para guardar', 'error'); return; }

  const { token, API } = getAuthConfig();
  if (!token) { toast('⚠ Sin sesión activa', 'error'); return; }

  const fijosTotal = calcTtlFijos();

  // Verificar duplicados en memoria
  const refs = TELAS.map(r => r.ref.trim().toLowerCase());
  const duplicadosLocales = refs.filter((r, i) => refs.indexOf(r) !== i);
  if (duplicadosLocales.length) {
    toast(`⚠ Referencias duplicadas: ${[...new Set(duplicadosLocales)].join(', ')}`, 'error');
    return;
  }

  let ok = 0, err = 0;

  for (const row of TELAS) {
    const materiales = row.m
      .filter(m => m.mat)
      .map(m => ({ Nombre: m.mat, Mts: +m.mts || 0, Precio: +m.precio || 0 }));

    const insRow = INSUMOS.find(i => i.ref === row.ref);
    const insumos = insRow
      ? insRow.ins.filter(i => i.name).map(i => ({
          name: i.name, cant: +i.cant || 0, precio: +i.precio || 0
        }))
      : [];

    try {
      const res = await fetch(`${API}/prendas/guardar`, {
        method:  'POST',
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
      if (json.ok) ok++;
      else if (json.duplicado) {
        toast(`⚠ "${row.ref}" ya existe en BD — omitida`, 'warn');
        err++;
      } else {
        console.error(`Error en "${row.ref}":`, json.message);
        err++;
      }
    } catch (e) {
      console.error(`Error guardando "${row.ref}":`, e.message);
      err++;
    }
  }

  // Guardar insumos fijos
  try {
    await fetch(`${API}/prendas/insumos-fijos`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ fijos: FIJOS })
    });
  } catch(e) {
    console.error('Error guardando insumos fijos:', e.message);
  }

  toast(err
    ? `⚠ ${ok} guardadas, ${err} con error`
    : `✓ ${ok} prendas guardadas en BD`
  );
}


/**
 * Carga desde la BD todas las referencias de la colección seleccionada.
 */
async function cargarTelasPorColeccion() {
  const sel   = document.getElementById('sel-col-cargar');
  const colId = sel?.value;
  if (!colId) { toast('⚠ Selecciona una colección primero', 'error'); return; }

  const colObj = COLECCIONES.find(c => c.id == colId);

  try {
    const { token, API } = getAuthConfig();

    const res  = await fetch(`${API}/prendas?colId=${colId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message);

    TELAS = TELAS.filter(t => t.colId != colId);

    json.data.forEach(p => {
      TELAS.push({
        id:     ID(),
        ref:    p.Referencia,
        col:    colObj.name,
        colId:  colId,
        taller: p.CostoTaller || 0,
        m:      (p.materiales || []).map(m => ({
          mat:    m.Nombre    || '',
          prov:   m.Proveedor || '',
          mts:    m.Mts       || '',
          precio: m.Precio    || ''
        })).concat(emptyMats()).slice(0, 4),
        ajuste: 5,
        margen: 40
      });
    });

    renderTelas();
    toast(`✓ ${json.data.length} referencias cargadas de "${colObj.name}"`);

  } catch (err) {
    toast('❌ ' + err.message, 'error');
  }
}