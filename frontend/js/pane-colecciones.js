/**
 * ============================================================
 * ARCHIVO: js/pane-colecciones.js
 * DESCRIPCIÓN: Módulo de gestión de colecciones.
 * Permite crear, editar y eliminar colecciones según el rol.
 * Caso de uso: Módulo Colección del diagrama UML.
 * Depende de: utils.js, state.js, auth.js
 * ============================================================
 */


/**
 * Construye el HTML completo del pane de Colecciones.
 * Muestra el botón "+ Nueva Colección" solo si el rol puede editar.
 */
function buildPaneColecciones() {
  const pane = document.getElementById('pane-colecciones');
  if (!pane) return;
  const edit = canEdit('colecciones');

  pane.innerHTML = `
    <div class="page-title">🗂 Módulo Colecciones</div>
    <div class="page-sub">
      Gestión de colecciones ·
      ${edit ? 'Puedes crear, editar y eliminar' : 'Solo consulta'}
    </div>
    ${edit ? `<div style="margin-bottom:14px">
      <button class="btn btn-g" onclick="openColModal()">+ Nueva Colección</button>
    </div>` : ''}
    <div id="col-cards-wrap" class="col-cards"></div>`;

  renderColecciones();
}


/**
 * Renderiza las tarjetas de colecciones en el grid.
 * Muestra acciones de editar/eliminar solo si el rol lo permite.
 */
function renderColecciones() {
  const wrap = document.getElementById('col-cards-wrap');
  if (!wrap) return;
  const edit = canEdit('colecciones');

  if (!COLECCIONES.length) {
    wrap.innerHTML = '<div style="color:var(--tx3);font-style:italic;padding:20px">Sin colecciones registradas</div>';
    return;
  }

  wrap.innerHTML = COLECCIONES.map(c => {
    // Contar cuántas referencias pertenecen a esta colección
    const refs = TELAS.filter(t => t.col === c.name).length;
    return `
      <div class="col-card">
        <div class="cc-name">${esc(c.name)}</div>
        <div class="cc-meta">
          ${c.season} ${c.year}${c.desc ? ' · ' + c.desc : ''}
        </div>
        <div class="cc-stat">
          <span class="stat-chip">${refs} referencia(s)</span>
          <span class="stat-chip">${c.createdAt || ''}</span>
        </div>
        <div style="margin-top:12px;display:flex;gap:6px">
          ${edit
            ? `<button class="btn btn-o btn-sm" onclick="openColModal('${c.id}')">✏ Editar</button>
               <button class="btn btn-sm"
                 style="background:var(--rdlt);color:var(--red);border:1px solid #FCA5A5"
                 onclick="deleteCollection('${c.id}')">🗑</button>`
            : `<span class="badge bg">Solo lectura</span>`}
        </div>
      </div>`;
  }).join('');
}


/**
 * Abre el modal para crear o editar una colección.
 * Si se pasa un ID, precarga los datos de esa colección.
 * @param {string|null} id - ID de colección a editar, null para nueva
 */
function openColModal(id = null) {
  editingColId = id;
  const c = id ? COLECCIONES.find(x => x.id === id) : null;

  // Cambiar título del modal según la acción
  document.getElementById('col-modal-title').textContent =
    id ? 'Editar Colección' : 'Nueva Colección';

  // Precargar valores si es edición
  document.getElementById('cm-name').value   = c?.name   || '';
  document.getElementById('cm-season').value = c?.season || 'PF';
  document.getElementById('cm-year').value   = c?.year   || 2026;
  document.getElementById('cm-desc').value   = c?.desc   || '';

  document.getElementById('col-modal').style.display = 'flex';
}


/**
 * Cierra el modal de colección sin guardar cambios.
 */
function closeColModal() {
  document.getElementById('col-modal').style.display = 'none';
}


/**
 * Guarda la colección nueva o actualiza la existente.
 * Reconstruye el pane para mostrar los cambios inmediatamente.
 */
function saveCollection() {
  const name = document.getElementById('cm-name').value.trim();
  if (!name) { alert('Ingresa el nombre de la colección'); return; }

  if (editingColId) {
    // ── EDITAR colección existente ──────────────────────────
    const c = COLECCIONES.find(x => x.id === editingColId);
    const old = c.name;
    c.name   = name;
    c.season = document.getElementById('cm-season').value;
    c.year   = +document.getElementById('cm-year').value;
    c.desc   = document.getElementById('cm-desc').value;
    addHist('Editó colección', 'Colecciones', `${old} → ${name}`);
    toast('✓ Colección actualizada');
  } else {
    // ── CREAR colección nueva ───────────────────────────────
    COLECCIONES.push({
      id:        ID(),
      name,
      season:    document.getElementById('cm-season').value,
      year:      +document.getElementById('cm-year').value,
      desc:      document.getElementById('cm-desc').value,
      createdBy: currentUser.name,
      createdAt: now()
    });
    addHist('Creó colección', 'Colecciones', name);
    toast('✓ Colección creada');
  }

  closeColModal();

  // Reconstruir el pane para mostrar los datos actualizados
  buildPaneColecciones();

  // Si ya estamos en este tab, re-activarlo para que se vea el cambio
  if (activeTab === 'colecciones')
    goTab('colecciones', document.getElementById('tab-colecciones'));
}


/**
 * Elimina una colección tras confirmación del usuario.
 * @param {string} id - ID de la colección a eliminar
 */
function deleteCollection(id) {
  const c = COLECCIONES.find(x => x.id === id);
  if (!confirm(`¿Eliminar colección "${c?.name}"?`)) return;

  addHist('Eliminó colección', 'Colecciones', c?.name);
  COLECCIONES = COLECCIONES.filter(x => x.id !== id);

  buildPaneColecciones();
  if (activeTab === 'colecciones')
    goTab('colecciones', document.getElementById('tab-colecciones'));

  toast('✓ Colección eliminada');
}
