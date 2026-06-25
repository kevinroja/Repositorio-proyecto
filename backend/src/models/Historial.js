// src/models/Historial.js
// ============================================================
// Model de auditoría.
// getAllColeccion filtra SOLO las tablas en scope de colección.
// registrar es genérico (el service ya filtra por scope antes de llamarlo).
// ============================================================

const db = require('../config/db');

// Tablas dentro del scope de trazabilidad de colección
const SCOPE = [
  'coleccion',
  'prenda',
  'prenda_tela',
  'prenda_insumos_var',
  'insumos_fijo_glovales',
  'costo_prenda',
  'precio_canal',
];

// Placeholders para el IN (?,?,?,?,?,?,?)
const SCOPE_PLACEHOLDERS = SCOPE.map(() => '?').join(',');

class Historial {

  /**
   * Inserta un registro de auditoría.
   * Si falla, solo loguea: nunca debe romper la operación principal.
   */
  static async registrar({
    tabla,
    registro_id,
    campo         = null,
    valor_anterior = null,
    valor_nuevo   = null,
    accion,
    usuario_id,
  }) {
    try {
      await db.execute(
        `INSERT INTO historial
           (Tabla_afectada, Registro_id, Campo, Valor_anterior, Valor_nuevo, Accion, Fecha, Usuario_id)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [tabla, registro_id ?? null, campo, valor_anterior, valor_nuevo, accion, usuario_id ?? null]
      );
    } catch (err) {
      console.error('Historial.registrar error:', err.message);
    }
  }

  /**
   * Trae los registros del historial SOLO para las tablas
   * dentro del scope de colecciones (excluye usuario, soporte, etc.).
   * JOIN con usuario y rol para obtener nombre y rol del actor.
   *
   * @param {number} limit - Máximo de registros (default 500)
   */
  static async getAllColeccion(limit = 500) {
    return db.query(
      `SELECT
         h.idHISTORIAL,
         h.Tabla_afectada,
         h.Registro_id,
         h.Campo,
         h.Valor_anterior,
         h.Valor_nuevo,
         h.Accion,
         h.Fecha,
         u.Nombre  AS UsuarioNombre,
         r.Nombre  AS RolNombre
       FROM historial h
       LEFT JOIN usuario u ON u.idUSUARIO = h.Usuario_id
       LEFT JOIN rol     r ON r.idROL     = u.ROL_idROL
       WHERE h.Tabla_afectada IN (${SCOPE_PLACEHOLDERS})
       ORDER BY h.idHISTORIAL DESC
       LIMIT ?`,
      [...SCOPE, limit]
    );
  }
}

module.exports = Historial;
