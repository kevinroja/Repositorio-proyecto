/**
 * ============================================================
 * ARCHIVO: js/pane-consolidado.js
 * DESCRIPCIÓN: Módulo del Consolidado de Precios.
 * Replica exactamente el orden de columnas del Excel COMPARATIVO
 * (hoja PF-FW 26). Solo visible para Admin y Jefe de Finanzas.
 * Incluye parámetros globales editables y exportación CSV.
 * Depende de: utils.js, state.js, auth.js, calculator.js
 *
 * CAMBIOS v2:
 *  - Selector de colección en la cabecera del pane
 *  - cargarConsolidadoDesdeDB() jalaa prendas reales de la BD
 *  - mapDBToState() convierte la respuesta de la API al formato
 *    que recalc() ya espera (TELAS / INSUMOS)
 * ============================================================
 */


/**
 * Construye el HTML completo del pane de Consolidado.
 * Si el rol no tiene acceso, muestra pantalla de acceso denegado.
 */
function buildPaneConsolidado() {
  const pane = document.getElementById('pane-consolidado');
  if (!pane) return;

  // Verificar acceso: solo Admin y Finanzas
  const canSee = ['admin', 'finanzas'].includes(currentUser?.role);
  if (!canSee) {
    pane.innerHTML = `
      <div class="access-denied">
        <div class="ad-icon">🔒</div>
        <h3>Acceso restringido</h3>
        <p>El Consolidado de Precios es accesible solo para
           Administrador y Jefe de Finanzas.</p>
      </div>`;
    return;
  }

  const edit = canEdit('consolidado');

  pane.innerHTML = `
    <!-- ── Selector de Colección ──────────────────────────── -->
    <div class="card" id="consolidado-selector-card"
         style="margin-bottom:12px;padding:14px 16px">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <label style="font-size:12px;font-weight:600;color:var(--tx2);
                      white-space:nowrap">
          📦 Colección
        </label>
        <select id="cons-col-select"
                style="flex:1;min-width:200px;max-width:360px"
                onchange="cargarConsolidadoDesdeDB(this.value)">
          <option value="">— Selecciona una colección —</option>
        </select>
        <button class="btn btn-o btn-sm" onclick="cargarColeccionesEnSelector()">
          ↺ Refrescar
        </button>
        <span id="cons-loading"
              style="font-size:11px;color:var(--tx3);display:none">
          ⏳ Cargando…
        </span>
      </div>
    </div>

    <!-- Panel de Parámetros Globales -->
    <div class="card" id="params-card">
      <div class="card-head">
        <h3>⚙ Parámetros Globales</h3>
        <button class="btn btn-o btn-sm" onclick="toggleParams()">
          ▼ Mostrar/Ocultar
        </button>
      </div>
      <div id="params-body">
        <div class="params-grid">
          <!-- Cada input tiene readonly si el rol es solo lectura -->
          <div class="pf">
            <label>TRM (COP/USD)</label>
            <input id="p-trm" type="number" value="3700"
                   ${edit ? '' : 'readonly'}
                   onchange="onTrmChange(this.value)">
          </div>
          <div class="pf">
            <label>Exportación %</label>
            <input id="p-exp" type="number" value="8"
                   ${edit ? '' : 'readonly'} onchange="recalc()">
          </div>
          <div class="pf">
            <label>Aranceles %</label>
            <input id="p-aran" type="number" value="10"
                   ${edit ? '' : 'readonly'} onchange="recalc()">
          </div>
          <div class="pf">
            <label>Amerindias %</label>
            <input id="p-amer" type="number" value="3" step=".5"
                   ${edit ? '' : 'readonly'} onchange="recalc()">
          </div>
          <div class="pf">
            <label>Factoring %</label>
            <input id="p-fact" type="number" value="4" step=".5"
                   ${edit ? '' : 'readonly'} onchange="recalc()">
          </div>
          <div class="pf">
            <label>RT Markup ×</label>
            <input id="p-rt" type="number" value="2.4" step=".1"
                   ${edit ? '' : 'readonly'} onchange="recalc()">
          </div>
          <div class="pf">
            <label>10Eleven %</label>
            <input id="p-10e" type="number" value="15"
                   ${edit ? '' : 'readonly'} onchange="recalc()">
          </div>
          <div class="pf">
            <label>IVA %</label>
            <input id="p-iva" type="number" value="19"
                   ${edit ? '' : 'readonly'} onchange="recalc()">
          </div>
          <div class="pf">
            <label>Imprevistos %</label>
            <input id="p-imprev" type="number" value="10"
                   ${edit ? '' : 'readonly'} onchange="recalc()">
          </div>
          <div class="pf">
            <label>Tasa Financiera %</label>
            <input id="p-fintasa" type="number" value="27.75" step=".25"
                   ${edit ? '' : 'readonly'} onchange="recalc()"
                   title="Tasa financiera total del periodo (IVA × tasa = costo financiero sobre SUB TL 1)">
          </div>
          <div class="pf">
            <label>Seguro Anual COP</label>
            <input id="p-seg" type="number" value="15000000"
                   ${edit ? '' : 'readonly'} onchange="recalc()">
          </div>
          <div class="pf">
            <label>N° Prendas</label>
            <input id="p-np" type="number" value="5000"
                   ${edit ? '' : 'readonly'} onchange="recalc()">
          </div>
        </div>
      </div>
    </div>

    <!-- KPIs resumen -->
    <div class="metrics">
      <div class="metric">
        <div class="ml">Referencias</div>
        <div class="mv g" id="m-refs">0</div>
      </div>
      <div class="metric">
        <div class="ml">Prod. COP Prom.</div>
        <div class="mv g" id="m-cop">$ 0</div>
      </div>
      <div class="metric">
        <div class="ml">WS USD Prom.</div>
        <div class="mv b" id="m-ws">USD 0</div>
      </div>
      <div class="metric">
        <div class="ml">RT USD Prom.</div>
        <div class="mv a" id="m-rt">USD 0</div>
      </div>
    </div>

    <!-- Tabla principal del Consolidado — orden exacto Excel NUEVA_FORMULACION -->
    <div class="xgrid-wrap">
      <table class="xgrid" id="consol-table" style="min-width:3800px">
        <thead>
          <!-- Fila 1: Grupos de columnas -->
          <tr>
            <th class="fr" style="min-width:220px;max-width:220px;
                                   background:#F4F1EB;z-index:20;
                                   box-shadow:2px 0 4px rgba(0,0,0,.08)" rowspan="2">REFERENCIA</th>
            <!-- 5 cols producción -->
            <th colspan="5" class="gh-prod" style="text-align:center">PRODUCCIÓN COP</th>
            <!-- 3 cols financiero -->
            <th colspan="3" class="gh-con"  style="text-align:center">FINANCIERO</th>
            <!-- 4 cols USD·Markup: COP→USD, KV MKUP🟡, SUB TL 3, AJUSTE🟡 -->
            <th colspan="4" class="gh-usd"  style="text-align:center">USD · MARKUP</th>
            <!-- 3 cols amerindias: SUB TL 4, AMER, SUB TL 5·AMER -->
            <th colspan="3" class="gh-amer" style="text-align:center">AMERINDIAS</th>
            <!-- 3 cols factoring: FACTORING, SUB TL 6·FACT -->
            <th colspan="2" class="gh-fact" style="text-align:center">FACTORING</th>
            <!-- 3 cols exportación: EXPORT, ARAN, SUB TL 5·EXPORT+ARAN -->
            <th colspan="3" class="gh-exp"  style="text-align:center">EXPORTACIÓN</th>
            <!-- 2 cols márgenes editables 🟡 -->
            <th colspan="2" class="gh-mrg"  style="text-align:center;background:#FFFDE7">MÁRGENES</th>
            <!-- 6 cols precios finales -->
            <th colspan="5" class="gh-fin"  style="text-align:center">PRECIOS FINALES</th>
          </tr>
          <!-- Fila 2: Columnas individuales -->
          <tr>
            <!-- PRODUCCIÓN COP (5) -->
            <th class="gh-prod num" style="min-width:110px">MAT. PRIMA</th>
            <th class="gh-prod num" style="min-width:110px">INSUMOS</th>
            <th class="gh-prod num" style="min-width:100px">TALLER</th>
            <th class="gh-prod num" style="min-width:90px">SEGURO</th>
            <th class="gh-prod sub" style="min-width:120px">SUB TL 1<br><small>PRODUCCIÓN COP</small></th>
            <!-- FINANCIERO (3) -->
            <th class="gh-con  num" style="min-width:100px">COSTO<br>FINANCIERO IVA</th>
            <th class="gh-con  num" style="min-width:100px">IMPRE<br>VISTOS</th>
            <th class="gh-con  sub" style="min-width:130px">SUB TL 2<br><small>PRODUCCIÓN COP</small></th>
            <!-- USD · MARKUP (4) -->
            <th class="gh-usd  usd" style="min-width:90px">COP A<br>USD</th>
            <th class="gh-usd  usd" style="min-width:110px;background:#FFF59D;color:#5D4037;font-weight:700">
              KV MKUP<br><small style="font-size:8px;color:#795548">▶ editable por fila</small>
            </th>
            <th class="gh-usd  usd sub" style="min-width:115px">SUB TL 3<br><small>+ MKUP</small></th>
            <th class="gh-usd  usd" style="min-width:110px;background:#FFF59D;color:#5D4037;font-weight:700">
              AJUSTE<br>USD (5)<br><small style="font-size:8px;color:#795548">▶ editable por fila</small>
            </th>
            <!-- AMERINDIAS (3) -->
            <th class="gh-amer sub" style="min-width:115px">SUB TL 4<br><small>+ AJUSTE USD</small></th>
            <th class="gh-amer num" style="min-width:100px">AMERIN<br>DIAS</th>
            <th class="gh-amer sub" style="min-width:115px">SUB TL 5<br><small>+ AMER</small></th>
            <!-- FACTORING (2) -->
            <th class="gh-fact num" style="min-width:100px">FACTO<br>RING</th>
            <th class="gh-fact sub" style="min-width:115px">SUB TL 6<br><small>+ FACTORING</small></th>
            <!-- EXPORTACIÓN (3) -->
            <th class="gh-exp  num" style="min-width:100px">EXPOR<br>TACIÓN</th>
            <th class="gh-exp  num" style="min-width:100px">10%<br>ARANCELES</th>
            <th class="gh-exp  sub" style="min-width:115px">SUB TL 5<br><small>+ EXPORT Y ARAN</small></th>
            <!-- MÁRGENES EDITABLES 🟡 (2) -->
            <th class="gh-mrg num" style="min-width:110px;background:#FFF59D;color:#5D4037;font-weight:700">
              MARGEN<br>SHOP MY<br><small style="font-size:8px;color:#795548">▶ editable por fila</small>
            </th>
            <th class="gh-mrg num" style="min-width:110px;background:#FFF59D;color:#5D4037;font-weight:700">
              MARGEN<br>EXTRA<br><small style="font-size:8px;color:#795548">▶ editable por fila</small>
            </th>
            <!-- PRECIOS FINALES (4) -->
            <th class="gh-fin  usd sub" style="min-width:110px">WS</th>
            <th class="gh-fin  usd fin" style="min-width:110px">RT</th>
            <th class="gh-fin  num" style="min-width:145px;background:#FFF9C4;font-weight:700">
              PRECIO VENTA<br>KV SAS COP
            </th>
            <th class="gh-fin  fin" style="min-width:120px;background:#A5D6A7;color:#1B5E20;font-weight:700">
              PRECIO<br>SUGERIDO
            </th>
            <th class="gh-fin  num" style="min-width:120px;background:#FFCCBC;color:#BF360C;font-weight:700">
              DIFERENCIA<br><small style="font-size:9px">SUGERIDO − RT</small>
            </th>
          </tr>
        </thead>
        <tbody id="consol-body">
          <tr>
            <td colspan="26"
                style="text-align:center;padding:32px;color:var(--tx3)">
              Selecciona una colección para cargar las referencias
            </td>
          </tr>
        </tbody>
      </table>
    </div>`;

  // Cargar colecciones en el selector al construir el pane
  cargarColeccionesEnSelector();

  // Inyectar panel de escenarios guardados y botón Guardar
  inyectarPanelEscenarios();
}


// ── INTEGRACIÓN CON BD ────────────────────────────────────────


/**
 * Obtiene las colecciones disponibles desde la API y llena
 * el dropdown del consolidado.
 */
async function cargarColeccionesEnSelector() {
  const select = document.getElementById('cons-col-select');
  if (!select) return;

  const API   = window.parent?.API_URL || 'http://localhost:3000/api';
  const token = window.parent?.kikaToken || sessionStorage.getItem('kika_token');

  try {
    const res  = await fetch(`${API}/colecciones`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message);

    const colecciones = json.data || [];

    // Preservar la opción vacía al inicio
    select.innerHTML = `<option value="">— Selecciona una colección —</option>` +
      colecciones.map(c => `
        <option value="${c.idCOLECCION}">
          ${esc(c.NombreColeccion)} · ${esc(c.Temporada)} ${c.Año}
          ${c.total_referencias ? `(${c.total_referencias} refs)` : ''}
        </option>`).join('');

    // Si el selector del pane-telas ya tenía una colección activa, pre-seleccionarla
    const colActiva = document.getElementById('col-select')?.value;
    if (colActiva) select.value = colActiva;

  } catch (err) {
    toast('❌ No se pudieron cargar las colecciones', 'error');
    console.error('[Consolidado] cargarColeccionesEnSelector:', err);
  }
}


/**
 * Carga las prendas de la colección seleccionada desde la BD,
 * las convierte al formato interno y dispara recalc().
 *
 * @param {string|number} colId - ID de la colección seleccionada
 */
async function cargarConsolidadoDesdeDB(colId) {
  if (!colId) {
    // Sin selección: limpiar tabla
    TELAS   = [];
    INSUMOS = [];
    recalc();
    return;
  }

  const loading = document.getElementById('cons-loading');
  const tbody   = document.getElementById('consol-body');

  // Mostrar indicador de carga
  if (loading) loading.style.display = 'inline';
  if (tbody) tbody.innerHTML = `
    <tr>
      <td colspan="26" style="text-align:center;padding:32px;color:var(--tx3)">
        ⏳ Cargando referencias…
      </td>
    </tr>`;

  const API   = window.parent?.API_URL || 'http://localhost:3000/api';
  const token = window.parent?.kikaToken || sessionStorage.getItem('kika_token');

  try {
    // GET /api/prendas?colId=X  →  prendas con materiales e insumosVar incluidos
    const res  = await fetch(`${API}/prendas?colId=${colId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message);

    const prendas = json.data || [];

    if (!prendas.length) {
      TELAS   = [];
      INSUMOS = [];
      recalc();
      toast('⚠ La colección no tiene referencias aún');
      return;
    }

    // Convertir respuesta de BD al formato que recalc() espera
    mapDBToState(prendas);

    // Disparar recálculo con los nuevos datos
    recalc();

    toast(`✓ ${prendas.length} referencia${prendas.length !== 1 ? 's' : ''} cargada${prendas.length !== 1 ? 's' : ''}`);
    addHist('Cargó colección en Consolidado', 'Consolidado', `colId=${colId}, refs=${prendas.length}`);

  } catch (err) {
    toast('❌ Error al cargar referencias: ' + err.message, 'error');
    console.error('[Consolidado] cargarConsolidadoDesdeDB:', err);
  } finally {
    if (loading) loading.style.display = 'none';
  }
}


/**
 * Convierte el array de prendas que devuelve la API al formato
 * que usan TELAS e INSUMOS en el estado global (state.js).
 *
 * Formato esperado por recalc() / calcRow():
 *
 * TELAS[i] = {
 *   id      : string,          // ID único (usamos idPREND como string)
 *   ref     : string,          // Nombre/referencia de la prenda
 *   telas   : [{ mat, metros, precio }],  // array de telas
 *   taller  : number,          // costo taller COP
 *   ajuste  : number,          // ajuste USD manual (default 0)
 *   margen  : number,          // margen extra USD (default 0)
 * }
 *
 * INSUMOS[i] = {
 *   ref     : string,          // debe coincidir con TELAS[i].ref
 *   vars    : [{ mat, cant, precio }],   // insumos variables
 *   fijos   : [{ nombre, precio, cant }] // insumos fijos globales
 * }
 *
 * La BD devuelve (getByColeccionConMateriales):
 *   prenda.Referencia, prenda.ValorTaller
 *   prenda.telas    → [{ NombreMaterial, Metros, PrecioUnitario }]
 *   prenda.insumosVar → [{ NombreMaterial, Cantidad, PrecioUnitario }]
 *
 * @param {Array} prendas - Array de prendas desde la API
 */
function mapDBToState(prendas) {
  // Insumos fijos globales ya cargados en state (FIJOS)
  const fijosGlobales = FIJOS || [];

  // calcTtlMat() espera row.m=[{mts,precio}] y calcTtlVar() espera row.ins=[{cant,precio}]
  // En lugar de adaptar calculator.js, mapeamos directamente al formato que espera:
  TELAS = prendas.map(p => ({
    id:        String(p.idPREND),
    ref:       p.Referencia || `Prenda ${p.idPREND}`,
    m: (p.materiales || []).map(t => ({
      mts:    parseFloat(t.Metros)                                 || 0,
      precio: parseFloat(t.Precio_Unitario) || parseFloat(t.Precio) || 0,
    })),
    taller:    parseFloat(p.Costo_confeccion) || 0,
    kvMkup:    p.kvMkup != null ? parseFloat(p.kvMkup) : 2.8,   // 🟡 default 2.8
    ajuste:    p.ajuste != null ? parseFloat(p.ajuste) : 5,     // 🟡 default 5 USD
    shopmy:    p.shopmy != null ? parseFloat(p.shopmy) : null,  // null = auto 15%
    margen:    parseFloat(p.margen)   || 0,    // 🟡 editable por fila
    precioSug: p.precioSug != null ? parseFloat(p.precioSug) : null, // null = sin precio objetivo
  }));

  INSUMOS = prendas.map(p => ({
    ref:   p.Referencia || `Prenda ${p.idPREND}`,
    // Formato que calcTtlVar() lee: row.ins = [{cant, precio}]
    ins: (p.insumosVar || []).map(i => ({
      cant:   parseFloat(i.Cantidad)        || 0,
      precio: parseFloat(i.Precio_unitario) || 0,
    })),
    fijos: fijosGlobales,
  }));
}


// ── LÓGICA DE CÁLCULO Y RENDERIZADO ──────────────────────────


/**
 * Recalcula y renderiza todas las filas del Consolidado.
 * Se llama automáticamente al:
 *   - Seleccionar una colección (cargarConsolidadoDesdeDB)
 *   - Cambiar cualquier parámetro global
 *   - Modificar ajuste o margen de una referencia
 *   - Cargar datos (demo o Excel)
 */


/**
 * Actualiza ajuste o margen de una referencia desde la grilla del Consolidado.
 * NOTA: reubicada aquí desde pane-telas.js — es el único módulo que la usa.
 */
function updateTelaField(id, field, val) {
  const r = TELAS.find(x => x.id === id);
  if (!r) return;
  if (field === 'shopmy') {
    r[field] = (val === '' || val === null || val === undefined) ? null : D(val);
  } else if (field === 'precioSug') {
    r[field] = (val === '' || val === null || val === undefined) ? null : D(val);
  } else {
    r[field] = D(val);
  }
  recalc();
}


function recalc() {
  const tbody = document.getElementById('consol-body');
  if (!tbody) return;

  if (!TELAS.length) {
    tbody.innerHTML = `<tr><td colspan="26"
      style="text-align:center;padding:32px;color:var(--tx3)">
      Selecciona una colección para ver las referencias
    </td></tr>`;
    updateMetrics([]);
    return;
  }

  const p    = getParams();
  const edit = canEdit('consolidado');

  const stMono = 'font-family:var(--mono);font-size:11px';
  const stSub  = 'font-weight:700;font-size:11px';
  const stAmar = 'background:#FFF59D;padding:0;min-width:110px';
  const stInp  = 'width:100%;background:#FFF59D;font-weight:700;font-size:11px;border:none;padding:4px 6px;text-align:right';

  const rows = TELAS.map(t => ({
    t,
    ref:    t.ref,
    tId:    t.id,
    kvMkup: t.kvMkup != null ? D(t.kvMkup) : 2.8,   // default 2.8
    ajuste: t.ajuste != null ? D(t.ajuste) : 5,       // 🟡 default 5 USD
    shopmy: t.shopmy != null ? D(t.shopmy) : null,    // null = usar 15% calculado
    margen: D(t.margen) || 0,
    c:      calcRow(t, INSUMOS.find(i => i.ref === t.ref), p)
  }));

  tbody.innerHTML = rows.map(({ t, ref, tId, kvMkup, ajuste, shopmy, margen, c }) => `
    <tr class="xr" data-id="${tId}">
      <td class="fr" style="font-weight:600;font-size:11px;z-index:10;box-shadow:2px 0 4px rgba(0,0,0,.06)" title="${esc(ref)}">${ref.length > 34 ? ref.slice(0,32)+'\u2026' : ref}</td>

      <!-- PRODUCCIÓN COP -->
      <td class="num" style="${stMono}">$${fmt(c.mat)}</td>
      <td class="num" style="${stMono}">$${fmt(c.ins)}</td>
      <td class="num" style="${stMono}">$${fmt(c.tal)}</td>
      <td class="num" style="${stMono}">$${fmt(c.seg)}</td>
      <td class="sub num" style="${stSub}">$${fmt(c.sub1)}</td>

      <!-- FINANCIERO -->
      <td class="num" style="${stMono}">$${fmt(c.finIva)}</td>
      <td class="num" style="${stMono}">$${fmt(c.imprev)}</td>
      <td class="sub num" style="${stSub}">$${fmt(c.sub2)}</td>

      <!-- COP A USD -->
      <td class="usd num" style="${stMono}">${fmtU(c.usd)}</td>

      <!-- 🟡 KV MKUP editable por fila -->
      <td style="${stAmar}">
        ${edit
          ? `<input class="ci" type="number" step="0.1" value="${kvMkup}"
               style="${stInp}" title="KV Markup por fila (ej: 2.8)"
               onchange="updateTelaField('${tId}','kvMkup',this.value)">`
          : `<span class="cell-ro" style="display:block;text-align:right;padding:4px 6px">${kvMkup}</span>`}
      </td>

      <!-- SUB TL 3 = USD × KV MKUP -->
      <td class="usd sub num" style="${stSub}">${fmtU(c.sub3)}</td>

      <!-- 🟡 AJUSTE USD (5) editable por fila -->
      <td style="${stAmar}">
        ${edit
          ? `<input class="ci" type="number" step="1" value="${ajuste}"
               style="${stInp}" title="Ajuste USD — se suma al SUB TL 3 (ej: 5)"
               onchange="updateTelaField('${tId}','ajuste',this.value)">`
          : `<span class="cell-ro" style="display:block;text-align:right;padding:4px 6px">${ajuste}</span>`}
      </td>

      <!-- AMERINDIAS -->
      <td class="usd sub num" style="${stSub}">${fmtU(c.sub4)}</td>
      <td class="usd num" style="${stMono}">${fmtU(c.amerA)}</td>
      <td class="usd sub num" style="${stSub}">${fmtU(c.sub5A)}</td>

      <!-- FACTORING -->
      <td class="usd num" style="${stMono}">${fmtU(c.factA)}</td>
      <td class="usd sub num" style="${stSub}">${fmtU(c.sub6)}</td>

      <!-- EXPORTACIÓN -->
      <td class="usd num" style="${stMono}">${fmtU(c.expA)}</td>
      <td class="usd num" style="${stMono}">${fmtU(c.araA)}</td>
      <td class="usd sub num" style="${stSub}">${fmtU(c.sub5E)}</td>

      <!-- 🟡 MARGEN SHOP MY: 15% de 10Eleven automático (azul) o valor manual (negro) -->
      <td style="${stAmar}" title="${shopmy === null ? 'AUTO: calculado al 15% de 10Eleven' : 'Valor manual — click para editar'}">
        ${edit
          ? `<input class="ci" type="number" step="0.01"
               value="${Math.round(c.shopmy)}"
               style="${stInp};${shopmy === null ? 'color:#1565C0;font-style:italic' : 'color:#5D4037'}"
               title="${shopmy === null ? 'AUTO 15% de 10Eleven — editar para fijar valor manual' : 'Valor manual fijo — borrar para volver a AUTO'}"
               onchange="updateTelaField('${tId}','shopmy',this.value)">`
          : `<span class="cell-ro" style="display:block;text-align:right;padding:4px 6px;font-size:11px;
               ${shopmy === null ? 'color:#1565C0;font-style:italic' : 'color:#5D4037;font-weight:700'}">
               ${Math.round(c.shopmy)}</span>`}
      </td>

      <!-- 🟡 MARGEN EXTRA editable por fila -->
      <td style="${stAmar}">
        ${edit
          ? `<input class="ci" type="number" step="1" value="${margen}"
               style="${stInp}" title="Margen Extra (adicional, editable por fila)"
               onchange="updateTelaField('${tId}','margen',this.value)">`
          : `<span class="cell-ro" style="display:block;text-align:right;padding:4px 6px">${margen}</span>`}
      </td>

      <!-- PRECIOS FINALES: WS · RT · PRECIO SAS COP · PRECIO SUGERIDO · DIFERENCIA -->
      <!-- WS = sub5E + shopmy + margen -->
      <td class="grn sub num" style="font-weight:700">${fmtU(c.ws)}</td>
      <!-- RT = WS × rtMkup (precio retail calculado) -->
      <td class="fin num" style="font-weight:700;background:#E3F2FD">${fmtU(c.rt)}</td>
      <!-- PRECIO VENTA KV SAS COP = WS × TRM -->
      <td style="text-align:right;${stMono};background:#FFF9C4;font-weight:700">$${fmt(c.cop)}</td>
      <!-- PRECIO SUGERIDO: precio objetivo → activa análisis de hipótesis -->
      <td style="background:#A5D6A7;padding:0;min-width:130px;position:relative">
        ${edit
          ? `<input class="ci" type="number" step="1" value="${t.precioSug != null ? t.precioSug : ''}"
               style="width:100%;background:#A5D6A7;font-weight:700;font-size:11px;
                      border:none;padding:4px 6px;text-align:right;color:#1B5E20"
               placeholder="Precio objetivo…"
               title="Escribe el precio RT objetivo y presiona Enter para ver el análisis"
               oninput="guardarPrecioSug('${tId}', this.value)"
               onblur="confirmarPrecioSug('${tId}')"
               onkeydown="if(event.key==='Enter'){this.blur()}">`
          : `<span class="cell-ro" style="display:block;text-align:right;padding:4px 6px;
               color:#1B5E20;font-weight:700">${D(t.precioSug) || '\u2014'}</span>`}
      </td>
      <!-- DIFERENCIA = PRECIO SUGERIDO − RT -->
      ${(() => {
        const ps  = t.precioSug != null ? D(t.precioSug) : null;
        const dif = ps != null ? Math.round(ps - c.rt) : null;
        const bg  = dif === null ? '#F5F5F5'
                  : dif > 0    ? '#E8F5E9'
                  : dif < 0    ? '#FFCCBC'
                  :              '#F5F5F5';
        const col = dif === null ? '#9E9E9E'
                  : dif > 0    ? '#1B5E20'
                  : dif < 0    ? '#BF360C'
                  :              '#757575';
        const txt = dif === null ? '\u2014'
                  : dif > 0    ? '+' + fmtU(dif)
                  : dif === 0  ? '0'
                  :              fmtU(dif);
        return `<td class="celda-dif" style="text-align:right;${stMono};font-weight:700;background:${bg};color:${col}">${txt}</td>`;
      })()}
    </tr>
    ${(() => {
      const ps = t.precioSug != null ? D(t.precioSug) : null;
      if (!ps || t._hipCerrada) return '';
      const h = calcHipotesis(ps, c, p);
      if (!h) return '';

      // ══════════════════════════════════════════════════════════
      // LÓGICA DE CASCADA BIDIRECCIONAL
      // Orden: SHOP MY → MARGEN EXTRA → AJUSTE USD → KV MKUP
      //
      // brechaWS < 0 → precio objetivo MENOR al actual → hay que BAJAR márgenes
      //   Cada paso baja su campo hasta 0 como máximo.
      //   Un paso "alcanza" si su campo puede absorber toda la brecha restante.
      //
      // brechaWS > 0 → precio objetivo MAYOR al actual → hay que SUBIR márgenes
      //   En este caso la cascada recorre los pasos en orden igual pero SUBIENDO.
      //   Paso 1 (SHOP MY) intenta absorber toda la brecha subiendo shopmy.
      //   Si shopmy ya es alto y el negocio prefiere subir otro campo, los pasos
      //   siguientes ofrecen la alternativa. Todos son factibles al subir.
      //   pasoActivo = '1' siempre que brechaWS > 0, porque SHOP MY puede subir sin límite.
      // ══════════════════════════════════════════════════════════

      const brechaWS     = h.brechaWS;   // wsNec − ws_actual
      const subiendo     = brechaWS > 0; // true = hay que subir precio
      const bajando      = brechaWS < 0; // true = hay que bajar precio

      // ── Paso 1: SHOP MY ───────────────────────────────────────
      const shopMyActual = h.actual.shopmy;

      // Valor sugerido para SHOP MY:
      //   Subiendo → shopMyActual + brechaWS (absorbe toda la brecha)
      //   Bajando  → shopMyActual + brechaWS, mínimo 0
      const sm1 = subiendo
        ? Math.round(shopMyActual + brechaWS)           // sube lo necesario
        : Math.max(0, Math.round(shopMyActual + brechaWS)); // baja hasta 0

      // sm1Alcanza:
      //   Subiendo → siempre alcanza (shop my puede subir sin límite operativo)
      //   Bajando  → alcanza si shopMyActual ≥ |brechaWS|
      const sm1Alcanza = subiendo || (shopMyActual + brechaWS) >= 0;

      // ── Paso 2: MARGEN EXTRA ──────────────────────────────────
      // Brecha restante tras aplicar Paso 1 al máximo posible:
      //   Subiendo: si Paso 1 ya cubre, brechaTrasSM = 0
      //   Bajando:  si ShopMy llegó a 0 y no alcanzó, queda brecha negativa
      const brechaTrasSM = sm1Alcanza ? 0 : (shopMyActual + brechaWS);
      const margenActual = h.actual.margen;

      const mg2 = subiendo
        ? Math.round(margenActual + brechaTrasSM)
        : Math.max(0, Math.round(margenActual + brechaTrasSM));

      const mg2Alcanza = sm1Alcanza || (subiendo ? true : (margenActual + brechaTrasSM) >= 0);

      // ── Paso 3: AJUSTE USD ────────────────────────────────────
      // Brecha restante tras Paso 2:
      const brechaTrasM  = mg2Alcanza ? 0 : (margenActual + brechaTrasSM);
      const factorCadena = (1 + p.amer) * (1 + p.fact) * (1 + p.exp + p.aran);
      const deltaAjuste3 = brechaTrasM / factorCadena;
      const aj3          = Math.round((h.actual.ajuste + deltaAjuste3) * 100) / 100;
      // Factible: al subir siempre es ≥ 0; al bajar, no puede quedar negativo
      const aj3Factible  = subiendo ? true : aj3 >= 0;
      const aj3Alcanza   = mg2Alcanza;

      // ── Paso 4: KV MKUP ──────────────────────────────────────
      const kv4         = h.kvMkupSug != null ? Math.round(h.kvMkupSug * 100) / 100 : null;
      const kv4Factible = kv4 != null && kv4 > 0 && kv4 < 20;

      // ── Paso activo (badge PRIMERO) ───────────────────────────
      // Al SUBIR: Paso 1 siempre es el primero recomendado (más directo)
      // Al BAJAR: el primer paso que puede absorber la brecha sin quedar negativo
      const pasoActivo  = sm1Alcanza       ? '1'
                        : mg2Alcanza       ? '2'
                        : aj3Factible      ? '3'
                        : kv4Factible      ? '4'
                        :                    null;

            // ── Helper: delta con color ───────────────────────────────
      const signo = v => {
        const r = Math.round(v * 100) / 100;
        return r > 0 ? `<span style="color:#1B5E20;font-weight:700">+${r}</span>`
             : r < 0 ? `<span style="color:#BF360C;font-weight:700">${r}</span>`
             :         `<span style="color:#757575">0</span>`;
      };

      // ── Helper: tarjeta de cada paso ─────────────────────────
      const tarjeta = (paso, label, color, actual, necesario, cambioStr, campo, valor, esPrimero, yaAlcanza, noFactible) => {
        const bg    = yaAlcanza  ? '#E8F5E9'
                    : noFactible ? '#FFCCBC'
                    : esPrimero  ? '#FFF3E0'
                    :              '#FFF9C4';
        const borde = esPrimero  ? '2px solid #E65100'
                    : yaAlcanza  ? '1px solid #A5D6A7'
                    : noFactible ? '1px solid #EF9A9A'
                    :              '1px solid #F9A825';
        const icono = yaAlcanza  ? '✔️'
                    : noFactible ? '⚠️'
                    : esPrimero  ? '🎯'
                    :              '✅';
        const badge = esPrimero
          ? `<span style="background:#E65100;color:#fff;border-radius:3px;padding:1px 5px;font-size:8px;margin-left:4px">PRIMERO</span>`
          : yaAlcanza
          ? `<span style="background:#388E3C;color:#fff;border-radius:3px;padding:1px 5px;font-size:8px;margin-left:4px">CUBIERTO</span>`
          : noFactible
          ? `<span style="background:#BF360C;color:#fff;border-radius:3px;padding:1px 5px;font-size:8px;margin-left:4px">NO FACTIBLE</span>`
          : '';
        // Botón Aplicar: solo si es editable, el paso aún es necesario y el valor es factible
        const puedeBton = edit && !yaAlcanza && !noFactible && valor != null;
        const btn = puedeBton
          ? `<button onclick="aplicarHipotesis('${tId}','${campo}',${valor})"
               style="margin-top:8px;background:${color};border:none;border-radius:5px;
               padding:5px 0;font-size:10px;font-weight:700;cursor:pointer;width:100%;
               color:${color === '#F9A825' ? '#3E2723' : '#fff'};
               ${esPrimero ? 'box-shadow:0 2px 6px rgba(230,81,0,.4)' : ''}">
               Aplicar ▶</button>`
          : '';
        const numFmt = n => typeof n === 'number' ? (Number.isInteger(n) ? n : Math.round(n*100)/100) : n;
        const esMalaSenal = typeof necesario === 'number' && necesario < 0;
        return `<div style="background:${bg};border-radius:8px;padding:10px 12px;
            min-width:160px;flex:1;border:${borde}">
          <div style="font-weight:700;color:#5D4037;margin-bottom:6px;font-size:10px">
            ${icono} Paso ${paso} &nbsp;·&nbsp; ${label} ${badge}
          </div>
          <div style="font-size:10px;line-height:2;color:#3E2723">
            Actual:&nbsp;<strong>${numFmt(actual)}</strong><br>
            Necesario:&nbsp;<strong style="color:${esMalaSenal || noFactible ? '#BF360C' : '#1B5E20'};font-size:12px">${numFmt(necesario)}</strong><br>
            Cambio:&nbsp;${cambioStr}
          </div>
          ${btn}
        </div>`;
      };

      return `<tr style="background:#FFFDE7;border-top:2px solid #F9A825;font-size:10px;height:auto">
        <td class="fr" style="background:#FFFDE7;z-index:10;padding:10px;
            border-right:3px solid #F9A825;vertical-align:top;min-width:220px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <span style="font-weight:700;color:#E65100;font-size:11px">🎯 HIPÓTESIS</span>
            <button onclick="cerrarHipotesis('${tId}')"
              style="background:#EF5350;color:#fff;border:none;border-radius:4px;
              padding:2px 8px;font-size:10px;font-weight:700;cursor:pointer">
              ✕ Cerrar
            </button>
          </div>
          <div style="font-size:10px;line-height:1.9;color:#4E342E">
            <strong>RT objetivo:</strong> ${fmtU(ps)} USD<br>
            <strong>RT actual:</strong> ${fmtU(c.rt)} USD<br>
            <strong>Brecha:</strong> ${signo(h.brecha)} USD<br>
            <strong>WS necesario:</strong> ${fmtU(h.wsNec)} USD
          </div>
          <div style="margin-top:6px;background:${subiendo ? '#E8F5E9' : '#FBE9E7'};border-radius:4px;
              padding:4px 6px;font-size:9px;color:${subiendo ? '#1B5E20' : '#BF360C'}">
            ${subiendo ? '⬆ Precio a subir' : '⬇ Precio a bajar'} — Aplica en orden: Paso 1 → 2 → 3 → 4
          </div>
        </td>
        <td colspan="26" style="padding:10px 14px;vertical-align:top;white-space:normal;height:auto">
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:stretch">

            ${tarjeta('1', 'SHOP MY', '#AB47BC',
                shopMyActual, sm1, signo(sm1 - shopMyActual),
                'shopmy', sm1,
                pasoActivo === '1',  // esPrimero
                false,               // Paso 1 nunca tiene pasos anteriores que lo cubran
                false                // sm1 siempre ≥ 0 gracias a Math.max
            )}

            ${tarjeta('2', 'MARGEN EXTRA', '#42A5F5',
                margenActual, mg2, signo(mg2 - margenActual),
                'margen', mg2,
                pasoActivo === '2',  // esPrimero
                sm1Alcanza,          // yaAlcanza: Paso 1 ya cubrió la brecha
                false                // mg2 siempre ≥ 0 gracias a Math.max
            )}

            ${tarjeta('3', 'AJUSTE USD', '#66BB6A',
                h.actual.ajuste, aj3, signo(aj3 - h.actual.ajuste),
                'ajuste', aj3,
                pasoActivo === '3',          // esPrimero
                aj3Alcanza,                  // yaAlcanza: pasos anteriores cubrieron
                !aj3Factible && !aj3Alcanza  // noFactible: ajuste resultaría negativo
            )}

            ${tarjeta('4', 'KV MKUP', '#F9A825',
                h.actual.kvMkup,
                kv4 != null ? kv4 : 'No factible',
                kv4 != null ? signo(kv4 - h.actual.kvMkup) : '—',
                'kvMkup', kv4,
                pasoActivo === '4',          // esPrimero
                mg2Alcanza,                  // yaAlcanza: pasos anteriores cubrieron
                !kv4Factible && !mg2Alcanza  // noFactible: fuera de rango 0–20
            )}

          </div>
        </td>
      </tr>`;
    })()}`).join('');

  updateMetrics(rows.map(r => r.c));
  if (typeof syncStickyRef === 'function') {
    setTimeout(syncStickyRef, 0);
    setTimeout(syncStickyRef, 100);
    setTimeout(syncStickyRef, 300);
  }
}
/**
 * Actualiza las 4 métricas de resumen del Consolidado.
 * @param {Array} cs - Array de resultados calcRow()
 */
function updateMetrics(cs) {
  const n  = cs.length;
  const el = id => document.getElementById(id);
  if (!el('m-refs')) return;

  el('m-refs').textContent = n;
  el('m-cop').textContent  = n ? '$ '   + fmt(cs.reduce((s,c) => s + c.sub2, 0) / n) : '$ 0';
  el('m-ws').textContent   = n ? 'USD ' + fmtU(cs.reduce((s,c) => s + c.ws,   0) / n) : 'USD 0';
  el('m-rt').textContent   = n ? 'USD ' + fmtU(cs.reduce((s,c) => s + c.rt,   0) / n) : 'USD 0';
}


/**
 * Guarda el precio sugerido en TELAS[] sin recalcular la tabla.
 * Recalcula solo cuando el input pierde el foco (onblur nativo del input).
 * Esto evita que recalc() destruya el input mientras el usuario escribe.
 */
function guardarPrecioSug(tId, val) {
  const r = TELAS.find(x => x.id === tId);
  if (!r) return;
  r.precioSug = (val === '' || val === null) ? null : D(val);
  // Actualizar solo la celda DIFERENCIA sin reconstruir toda la tabla
  const fila = document.querySelector(`tr[data-id="${tId}"]`);
  if (fila) {
    const tdDif = fila.querySelector('.celda-dif');
    if (tdDif && r.precioSug != null) {
      const p  = getParams();
      const c  = calcRow(r, INSUMOS.find(i => i.ref === r.ref), p);
      const dif = Math.round(r.precioSug - c.rt);
      tdDif.textContent = dif > 0 ? '+' + fmtU(dif) : dif === 0 ? '0' : fmtU(dif);
      tdDif.style.background = dif > 0 ? '#E8F5E9' : dif < 0 ? '#FFCCBC' : '#F5F5F5';
      tdDif.style.color      = dif > 0 ? '#1B5E20' : dif < 0 ? '#BF360C' : '#757575';
    }
  }
}


/**
 * Recalcula la tabla al salir del campo de precio sugerido (onblur).
 * En este punto el usuario ya terminó de escribir.
 */
function confirmarPrecioSug(tId) {
  mostrarHipotesis(tId); // abre hipótesis y recalcula
}


function cerrarHipotesis(tId) {
  const r = TELAS.find(x => x.id === tId);
  if (!r) return;
  r._hipCerrada = true;
  recalc();
}


/**
 * Fuerza recálculo al ingresar precio objetivo.
 */
function mostrarHipotesis(tId) {
  const r = TELAS.find(x => x.id === tId);
  if (r) r._hipCerrada = false; // reabre si estaba cerrada
  recalc();
}


/**
 * Aplica uno de los valores sugeridos por la hipótesis a la fila
 * y recalcula la tabla.
 * @param {string} tId   - ID de la referencia
 * @param {string} campo - 'kvMkup' | 'ajuste' | 'margen' | 'shopmy'
 * @param {number} valor - Valor sugerido a aplicar
 */
function aplicarHipotesis(tId, campo, valor) {
  const r = TELAS.find(x => x.id === tId);
  if (!r) return;
  r[campo] = valor;
  recalc();
  toast(`✓ ${campo === 'kvMkup' ? 'KV MKUP' : campo === 'ajuste' ? 'Ajuste USD' : campo === 'margen' ? 'Margen Extra' : 'Shop My'} aplicado: ${valor}`);
}


/**
 * Muestra u oculta el panel de parámetros globales.
 */
function toggleParams() {
  const b = document.getElementById('params-body');
  if (b) b.style.display = b.style.display === 'none' ? '' : 'none';
}


/**
 * Sincroniza el TRM entre la topbar y el panel de parámetros.
 * @param {string} v - Nuevo valor del TRM
 */
function onTrmChange(v) {
  const g = document.getElementById('g-trm');
  if (g) g.value = v;
  const p = document.getElementById('p-trm');
  if (p) p.value = v;
  recalc();
}


/**
 * Exporta el Consolidado completo a un archivo CSV.
 */
function exportCSV() {
  const p   = getParams();
  const hdr = 'Referencia,Mat.Prima,Insumos,Taller,Sub.TL2.COP,' +
              'WS.USD,RT.USD,Precio.SAS.COP,Precio.Retail.COP\n';

  const rows = TELAS.map(t => {
    const c = calcRow(t, INSUMOS.find(i => i.ref === t.ref), p);
    return `"${t.ref}",${Math.round(c.mat)},${Math.round(c.ins)},` +
           `${Math.round(c.tal)},${Math.round(c.sub2)},` +
           `${Math.round(c.ws)},${Math.round(c.rt)},` +
           `${Math.round(c.cop)},${Math.round(c.rtCop)}`;
  }).join('\n');

  // BOM UTF-8 para que Excel abra correctamente los caracteres especiales
  const blob = new Blob(['\ufeff' + hdr + rows], {
    type: 'text/csv;charset=utf-8'
  });
  const a = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'KV_Costeo_PF-FW26.csv';
  a.click();

  addHist('Exportó CSV del Consolidado', 'Consolidado');
  toast('✓ CSV exportado');
}
