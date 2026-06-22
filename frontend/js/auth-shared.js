/**
 * js/auth-shared.js — Permisos y registro de historial compartidos
 * entre los 6 módulos independientes de Costeo.
 *
 * NO gestiona login/logout (eso lo hace Kika).
 * Solo controla qué acciones puede hacer cada rol y registra
 * eventos en el historial en memoria de la sesión actual.
 *
 * Mapa de roles Kika → rol interno:
 *   4 (Admin)        → 'admin'         → acceso total
 *   1 (Materia Prima)→ 'materia_prima' → telas, insumos, colecciones
 *   2 (Costeo)       → 'finanzas'      → consolidado, canales, consulta
 *
 * NOTA (refactor módulos independientes): este archivo reemplaza al
 * auth.js original. Se quitaron buildUI() y goTab() — construían el
 * tabstrip y todos los panes dentro de una sola página; ya no aplican
 * porque cada módulo (Telas&Insumos, Consolidado, Canales, Colecciones,
 * Consulta, Historial) es ahora un archivo HTML independiente que se
 * carga solo a sí mismo. Cada HTML de módulo valida el acceso y llama
 * directamente a su propia función build...() en el script de inicio.
 */

// Solo para la etiqueta legible del rol que se guarda en cada registro
// de historial (reemplaza a ROLES[...].label, que vivía en state.js).
const ROLE_LABELS = {
  admin:         'Administrador',
  materia_prima: 'Jefe Materia Prima',
  finanzas:      'Costeo / Finanzas',
  consulta:      'Consulta',
};


/**
 * Registra una acción en el historial en memoria de la sesión actual.
 */
function addHist(action, module, detail = '') {
  HISTORIAL.unshift({
    id:     ID(),
    ts:     now(),
    user:   currentUser?.name || 'Sistema',
    role:   currentUser ? ROLE_LABELS[currentUser.role] : '',
    action,
    module,
    detail
  });
}


/**
 * Verifica si el usuario activo tiene permiso de edición en un módulo.
 */
function canEdit(module) {
  const r = currentUser?.role;
  if (!r) return false;
  const map = {
    telas:       ['admin', 'materia_prima'],
    insumos:     ['admin', 'materia_prima'],
    consolidado: ['admin', 'finanzas'],
    colecciones: ['admin', 'materia_prima'],
    canales:     ['admin', 'finanzas'],
    fijos:       ['admin', 'materia_prima'],
  };
  return (map[module] || []).includes(r);
}
