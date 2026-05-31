const db = require('../config/db');

class SoporteModel {

  // Crear nuevo ticket
  static async crear({ modulo, descripcion, prioridad, usuarioId }) {
    const result = await db.execute(
      `INSERT INTO soporte (modulo, descripcion, prioridad, estado, USUARIO_idUSUARIO)
       VALUES (?, ?, ?, 'Pendiente', ?)`,
      [modulo || 'Sin especificar', descripcion, prioridad || 'Importante', usuarioId]
    );
    return result.insertId;
  }

  // Tickets del usuario autenticado
  static async getMisTickets(usuarioId) {
    return db.query(
      `SELECT idSOPORTE, modulo, descripcion, prioridad, estado, fecha_creacion
       FROM soporte
       WHERE USUARIO_idUSUARIO = ?
       ORDER BY fecha_creacion DESC`,
      [usuarioId]
    );
  }

  // Todos los tickets (admin) con datos del usuario
  static async getAll() {
    return db.query(
      `SELECT 
         s.idSOPORTE, s.modulo, s.descripcion,
         s.prioridad, s.estado, s.fecha_creacion,
         u.Nombre  AS NombreUsuario,
         u.Email   AS EmailUsuario
       FROM soporte s
       JOIN usuario u ON u.idUSUARIO = s.USUARIO_idUSUARIO
       WHERE s.estado != 'Resuelto'
       ORDER BY
         FIELD(s.prioridad, 'Urgente', 'Importante', 'Leve'),
         s.fecha_creacion ASC`
    );
  }

  // Cambiar estado — si es Resuelto, elimina el ticket
  static async cambiarEstado(idSOPORTE, estado) {
    if (estado === 'Resuelto') {
      await db.execute(
        'DELETE FROM soporte WHERE idSOPORTE = ?',
        [idSOPORTE]
      );
      return { eliminado: true };
    }
    await db.execute(
      'UPDATE soporte SET estado = ? WHERE idSOPORTE = ?',
      [estado, idSOPORTE]
    );
    return { eliminado: false };
  }
}

module.exports = SoporteModel;
