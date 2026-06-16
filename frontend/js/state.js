/**
 * js/state.js — Estado global del módulo de Costeo integrado en Kika
 *
 * Roles internos mapeados desde Kika:
 *   'admin'         ← Kika rol 4 (Administrador) — acceso total
 *   'materia_prima' ← Kika rol 1 (Materia Prima)  — telas, insumos, colecciones
 *   'finanzas'      ← Kika rol 2 (Costeo)          — consolidado, canales, consulta
 *   'consulta'      ← Kika rol 3 (Consulta)         — solo lectura, sin credenciales
 */

// ── Sesión y navegación ──────────────────────────────────────
var currentUser  = null;  // { name, role, token } — inyectado desde Costeo.html
var activeTab    = null;
var editingColId = null;

// ── Estado del Módulo Consulta ───────────────────────────────
var consultaSelected = null;
var consultaQuery    = '';

// ── Generador de IDs únicos en memoria ───────────────────────
var _uid = 1;
const ID = () => '_' + (_uid++);

// ── Base de datos en memoria ─────────────────────────────────
// var (no let) para que sean accesibles en window desde cualquier script
var COLECCIONES = [];
var TELAS       = [];
var INSUMOS     = [];
var FIJOS       = [];
var CANALES     = [];
var HISTORIAL   = [];

// ── Roles internos del módulo de Costeo ──────────────────────
const ROLES = {
  admin: {
    label: 'Administrador',
    color: '#FFD166',
    tabs: ['colecciones','materia','consolidado','canales','consulta','historial']
  },
  materia_prima: {
    label: 'Jefe Materia Prima',
    color: '#52B788',
    tabs: ['colecciones','materia','consulta','historial']
  },
  finanzas: {
    label: 'Costeo / Finanzas',
    color: '#93C5FD',
    tabs: ['colecciones','consolidado','canales','consulta','historial']
  },
  consulta: {
    label: 'Consulta',
    color: '#A78BFA',
    tabs: ['consulta']
  },
};

// ── Definición de tabs ───────────────────────────────────────
const TAB_DEFS = [
  { id: 'colecciones', icon: '🗂',  label: 'Colecciones'        },
  { id: 'materia',     icon: '📐',  label: 'Telas & Confección' },
  { id: 'consolidado', icon: '📊',  label: 'Consolidado'        },
  { id: 'canales',     icon: '🏪',  label: 'Canal de Venta'     },
  { id: 'consulta',    icon: '🔍',  label: 'Consulta'           },
  { id: 'historial',   icon: '📋',  label: 'Historial'          },
];