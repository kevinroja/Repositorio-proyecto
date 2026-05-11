/**
 * ============================================================
 * ARCHIVO: js/pane-canales.js
 * DESCRIPCIÓN: Módulo de Canal de Venta.
 *
 * ¿QUÉ ES EL CANAL DE VENTA?
 * Un canal de venta es el destino comercial de la prenda:
 *   - USA (LLC): venta mayorista a tiendas en EEUU
 *   - Latinoamérica: distribuidores regionales
 *   - E-Commerce: venta directa al consumidor por web
 *
 * Cada canal tiene sus propios porcentajes de exportación,
 * aranceles, logística y markup, porque los costos varían
 * según el país de destino y el tipo de cliente.
 *
 * ESTADO ACTUAL: Los canales se guardan y pueden editarse.
 * PRÓXIMA VERSIÓN: Al activar un canal, sus parámetros
 * reemplazarán los del panel global del Consolidado.
 *
 * Solo visible para Administrador y Jefe de Finanzas.
 * Depende de: utils.js, state.js, auth.js
 * ============================================================
 */


/**
 * Construye el HTML completo del pane de Canales.
 * Si el rol no tiene acceso muestra pantalla de acceso denegado.
 * Crea los canales por defecto si no existen aún.
 */
function buildPaneCanales() {
  const pane = document.getElementById('pane-canales');
  if (!pane) return;

  // Verificar acceso: solo Admin y Finanzas
  const canSee = ['admin', 'finanzas'].includes(currentUser?.role);
  if (!canSee) {
    pane.innerHTML = `
      <div class="access-denied">
        <div class="ad-icon">🔒</div>
        <h3>Acceso restringido</h3>
        <p>Solo Administrador y Jefe de Finanzas pueden
           gestionar los canales de venta.</p>
      </div>`;
    return;
  }

  // Crear canales predeterminados si no existen
  if (!CANALES.length) {
    CANALES = [
      {
        id: ID(), name: 'USA — LLC', activo: true,
        params: { export: 15, arancel: 10, amerindias: 3, factoring: 4, ten11: 15, rtMkup: 2.4 }
      },
      {
        id: ID(), name: 'Latinoamérica', activo: false,
        params: { export: 12, arancel: 8,  amerindias: 2, factoring: 3, ten11: 10, rtMkup: 2.2 }
      },
      {
        id: ID(), name: 'E-Commerce', activo: false,
        params: { export: 8,  arancel: 0,  amerindias: 0, factoring: 3.7, ten11: 0, rtMkup: 2.0 }
      },
    ];
  }

  const edit = canEdit('canales');

  pane.innerHTML = `
    <div class="page-title">🏪 Módulo Canal de Venta</div>
    <div class="page-sub">
      Configura los parámetros de exportación, aranceles y markup
      por canal de distribución ·
      ${edit ? 'Puedes crear y editar canales' : 'Solo consulta'}
    </div>

    <!-- Explicación del módulo -->
    <div style="background:var(--bllt);border:1px solid #BFDBFE;border-radius:var(--r2);
                padding:12px 16px;margin-bottom:16px;font-size:12px;color:var(--blue)">
      <b>¿Cómo funciona?</b> Cada canal tiene sus propios porcentajes.
      El canal marcado como <b>Activo</b> define los parámetros que se
      aplican en el Consolidado de Precios. Activa un canal para ver
      cómo cambian los precios finales según el destino de venta.
    </div>

    ${edit
      ? `<div style="margin-bottom:14px">
           <button class="btn btn-g" onclick="addCanal()">+ Nuevo Canal</button>
         </div>`
      : ''}

    <div class="canal-grid" id="canal-grid"></div>`;

  renderCanales();
}


/**
 * Renderiza las tarjetas de canales de venta.
 * Cada tarjeta muestra los parámetros del canal con inputs
 * editables (Admin/Finanzas) o texto estático (solo lectura).
 */
function renderCanales() {
  const grid = document.getElementById('canal-grid');
  if (!grid) return;
  const edit = canEdit('canales');

  // Campos configurables de cada canal
  const fields = [
    ['export',     'Exportación %',   'Costos de transporte y agente de exportación'],
    ['arancel',    'Aranceles %',      'Impuesto de importación en el país destino'],
    ['amerindias', 'Amerindias %',     'Costo de bodega y distribución Amerindias'],
    ['factoring',  'Factoring %',      'Costo financiero de cobrar la cartera'],
    ['ten11',      '10Eleven %',       'Comisión del showroom / agente comercial'],
    ['rtMkup',     'RT Markup ×',      'Multiplicador de precio mayorista a minorista'],
  ];

  grid.innerHTML = CANALES.map(c => `
    <div class="canal-card ${c.activo ? 'active-canal' : ''}">
      <div class="canal-name">
        ${esc(c.name)}
        <!-- Badge de estado: verde = activo, ámbar = inactivo -->
        <span class="badge ${c.activo ? 'bg' : 'ba'}">
          ${c.activo ? '✓ Activo' : 'Inactivo'}
        </span>
      </div>

      <!-- Parámetros del canal -->
      ${fields.map(([k, label, tooltip]) => `
        <div class="canal-field" title="${tooltip}">
          <label>${label}</label>
          ${edit
            ? `<input type="number" step=".1" value="${c.params[k]}"
                      onchange="updateCanal('${c.id}','${k}',this.value)">`
            : `<span style="font-family:var(--mono);font-size:12px">
                 ${c.params[k]}
               </span>`}
        </div>`).join('')}

      <!-- Acciones del canal -->
      ${edit ? `
        <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap">
          <!-- Activar/desactivar: solo un canal puede estar activo -->
          <button class="btn btn-o btn-sm" onclick="toggleCanal('${c.id}')">
            ${c.activo ? '⏸ Desactivar' : '▶ Activar'}
          </button>
          <!-- Aplicar al Consolidado -->
          ${c.activo
            ? `<button class="btn btn-g btn-sm"
                       onclick="aplicarCanalAlConsolidado('${c.id}')">
                 📊 Aplicar al Consolidado
               </button>`
            : ''}
          <button class="btn btn-sm"
                  style="background:var(--rdlt);color:var(--red);border:1px solid #FCA5A5"
                  onclick="deleteCanal('${c.id}')">🗑</button>
        </div>` : ''}
    </div>`).join('');
}


/**
 * Abre un prompt para crear un nuevo canal de venta.
 * En una versión con backend se reemplazaría por un modal.
 */
function addCanal() {
  const name = prompt('Nombre del nuevo canal de venta:');
  if (!name) return;

  CANALES.push({
    id: ID(), name, activo: false,
    params: {
      export: 15, arancel: 10, amerindias: 3,
      factoring: 4, ten11: 15, rtMkup: 2.4
    }
  });

  addHist('Creó canal de venta', 'Canales', name);
  renderCanales();
  toast('✓ Canal creado');
}


/**
 * Actualiza un parámetro específico de un canal.
 * @param {string} id    - ID del canal
 * @param {string} field - Parámetro a actualizar
 * @param {string} val   - Nuevo valor
 */
function updateCanal(id, field, val) {
  const c = CANALES.find(x => x.id === id);
  if (c) c.params[field] = D(val);
  addHist('Editó parámetro canal', 'Canales', `${field} = ${val}`);
  renderCanales();
}


/**
 * Activa o desactiva un canal.
 * Solo un canal puede estar activo a la vez.
 * @param {string} id - ID del canal a cambiar
 */
function toggleCanal(id) {
  // Desactivar todos primero
  CANALES.forEach(c => c.activo = false);
  // Activar el seleccionado
  const c = CANALES.find(x => x.id === id);
  if (c) c.activo = true;

  addHist('Activó canal de venta', 'Canales', c?.name);
  renderCanales();
  toast(`✓ Canal "${c?.name}" activado`);
}


/**
 * Aplica los parámetros del canal activo al Consolidado.
 * Actualiza los inputs del panel de parámetros globales y
 * recalcula todos los precios con los valores del canal.
 * @param {string} id - ID del canal a aplicar
 */
function aplicarCanalAlConsolidado(id) {
  const c = CANALES.find(x => x.id === id);
  if (!c) return;

  // Mapa de campos del canal → IDs de inputs del Consolidado
  const mapping = {
    export:     'p-exp',
    arancel:    'p-aran',
    amerindias: 'p-amer',
    factoring:  'p-fact',
    ten11:      'p-10e',
    rtMkup:     'p-rt',
  };

  // Actualizar cada input del Consolidado con el valor del canal
  let applied = 0;
  Object.entries(mapping).forEach(([cField, inputId]) => {
    const el = document.getElementById(inputId);
    if (el) {
      el.value = c.params[cField];
      applied++;
    }
  });

  if (applied > 0) {
    // Recalcular con los nuevos parámetros
    recalc();
    addHist('Aplicó canal al Consolidado', 'Canales', c.name);
    toast(`✓ Parámetros de "${c.name}" aplicados al Consolidado`);
  } else {
    toast('⚠ Abre el Tab Consolidado primero para aplicar el canal');
  }
}


/**
 * Elimina un canal de venta tras confirmación.
 * @param {string} id - ID del canal a eliminar
 */
function deleteCanal(id) {
  const c = CANALES.find(x => x.id === id);
  if (!confirm(`¿Eliminar canal "${c?.name}"?`)) return;

  CANALES = CANALES.filter(x => x.id !== id);
  addHist('Eliminó canal de venta', 'Canales', c?.name);
  renderCanales();
  toast('✓ Canal eliminado');
}
