/**
 * js/state.js — Estado global del módulo de Costeo integrado en Kika
 *
 * Roles internos mapeados desde Kika:
 *   'admin'         ← Kika rol 4 (Administrador) — acceso total
 *   'materia_prima' ← Kika rol 1 (Materia Prima)  — telas, insumos, colecciones
 *   'finanzas'      ← Kika rol 2 (Costeo)          — consolidado, canales, consulta
 *   'consulta'      ← Kika rol 3 (Consulta)         — solo lectura, sin credenciales
 *
 * NOTA (refactor módulos independientes): este archivo se carga igual en los
 * 6 HTML del módulo de Costeo (telas-insumos, consolidado, canales,
 * colecciones, consulta, historial). Cada uno usa solo las variables que
 * necesita; mantenerlas todas aquí evita duplicar el generador de IDs y
 * los arrays de datos en cada archivo por separado.
 *
 * Se quitaron TAB_DEFS y ROLES — existían para el tabstrip compartido y
 * buildUI()/goTab(), que ya no existen al ser cada módulo un archivo
 * independiente. El control de acceso por rol ahora vive directamente en
 * cada pane-*.js (cada uno valida su propio currentUser.role al construirse).
 */

// ── Sesión ────────────────────────────────────────────────────
var currentUser  = null;  // { name, role, token } — inyectado desde el HTML de cada módulo
var editingColId = null;  // usado por el módulo de Colecciones

// ── Estado del Módulo Consulta ───────────────────────────────
var consultaSelected = null;
var consultaQuery    = '';

// ── Generador de IDs únicos en memoria ───────────────────────
var _uid = 1;
const ID = () => '_' + (_uid++);

// ── Base de datos en memoria ─────────────────────────────────
// var (no let) para que sean accesibles desde cualquier script cargado en la página
var COLECCIONES = [];
var TELAS       = [];
var INSUMOS     = [];
var FIJOS       = [];
var CANALES     = [];
var HISTORIAL   = [];
