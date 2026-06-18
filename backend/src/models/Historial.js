// src/models/Historial.js
const db = require('../config/db');

class Historial {

  /**
   * Inserta un registro de auditoría en la tabla `historial`.
   * Nunca debe tumbar la operación principal: si falla, solo se loguea
   * en consola y se continúa.
   *
   * @param {Object} datos
   * @param {string} datos.tabla           - Tabla afectada ('coleccion', 'prenda', 'USUARIO', etc.)
   * @param {number|string} datos.registro_id - ID del registro afectado
   * @param {string} [datos.campo]         - Campo modificado (opcional)
   * @param {string} [datos.valor_anterior] - Valor antes del cambio (opcional)
   * @param {string} [datos.valor_nuevo]   - Valor después del cambio (opcional)
   * @param {string} datos.accion          - 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT'
   * @param {number} datos.usuario_id      - idUSUARIO que ejecutó la acción
   */
  static async registrar({
    tabla,
    registro_id,
    campo = null,
    valor_anterior = null,
    valor_nuevo = null,
    accion,
    usuario_id,
  }) {
    try {
      await db.execute(
        `INSERT INTO historial
           (Tabla_afectada, Registro_id, Campo, Valor_anterior, Valor_nuevo, Accion, Fecha, Usuario_id)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [
          tabla,
          registro_id ?? null,
          campo,
          valor_anterior,
          valor_nuevo,
          accion,
          usuario_id ?? null,
        ]
      );
    } catch (err) {
      // El historial es auxiliar: un fallo aquí no debe romper la acción principal
      console.error('Error registrando historial:', err.message);
    }
  }

  /**
   * Obtiene los registros de historial más recientes, con el nombre
   * y rol del usuario que ejecutó cada acción (vía JOIN).
   * @param {number} limit - Máximo de registros a devolver (default 500)
   */
  static async getAll(limit = 500) {
    return db.query(
      `SELECT
         h.idHISTORIAL, h.Tabla_afectada, h.Registro_id, h.Campo,
         h.Valor_anterior, h.Valor_nuevo, h.Accion, h.Fecha,
         u.idUSUARIO, u.Nombre AS UsuarioNombre,
         r.idROL, r.Nombre AS RolNombre
       FROM historial h
       LEFT JOIN usuario u ON u.idUSUARIO = h.Usuario_id
       LEFT JOIN rol r     ON r.idROL = u.ROL_idROL
       ORDER BY h.idHISTORIAL DESC
       LIMIT ?`,
      [limit]
    );
  }
}

module.exports = Historial;