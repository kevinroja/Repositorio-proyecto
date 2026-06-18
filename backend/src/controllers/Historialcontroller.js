const Historial = require('../models/Historial');

// ── Mapas de traducción ────────────────────────────────────────────────
// Convierten Tabla_afectada + Accion (datos crudos de BD) en el texto
// que ya espera el frontend (pane-historial.js): module, action, etc.

const MODULOS_POR_TABLA = {
  coleccion: 'Colecciones',
  prenda:    'Colecciones',
  USUARIO:   'Sistema',
};

const ACCIONES_POR_TABLA = {
  coleccion: {
    INSERT: 'Creó la colección',
    SELECT: 'Cargó la colección',
    UPDATE: 'Actualizó la colección',
    DELETE: 'Eliminó la colección',
  },
  prenda: {
    INSERT: 'Creó la referencia',
    SELECT: 'Cargó la referencia',
    UPDATE: 'Actualizó la referencia',
    DELETE: 'Eliminó la referencia',
  },
  USUARIO: {
    INSERT: 'Creó un usuario',
    UPDATE: 'Actualizó un usuario',
    DELETE: 'Eliminó un usuario',
  },
};

/**
 * Traduce una fila cruda de `historial` (+ JOIN usuario/rol) al formato
 * { module, action, detail, role, user, ts } que consume pane-historial.js.
 */
function mapearRegistro(row) {
  const tabla  = row.Tabla_afectada;
  const modulo = MODULOS_POR_TABLA[tabla] || 'Sistema';
  const accion = (ACCIONES_POR_TABLA[tabla] && ACCIONES_POR_TABLA[tabla][row.Accion])
    || `${row.Accion} en ${tabla}`;

  let detail = row.Valor_nuevo || row.Valor_anterior || '';
  // Para usuarios, el campo modificado aporta contexto útil (ej. "Activo: 0")
  if (tabla === 'USUARIO' && row.Campo) {
    detail = `${row.Campo}: ${detail}`;
  }

  return {
    module: modulo,
    action: accion,
    detail,
    role:   row.RolNombre || '',
    user:   row.UsuarioNombre || 'Usuario eliminado',
    ts:     row.Fecha,
  };
}

class HistorialController {
  // GET /api/historial
  static async getAll(req, res) {
    try {
      const rows = await Historial.getAll();
      const data = rows.map(mapearRegistro);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      return res.status(500).json({ ok: false, message: err.message });
    }
  }
}

module.exports = HistorialController;