const db = require('../config/db');

// ── CanalModel ────────────────────────────────────────────────────────
// Gestiona la tabla canal_venta.
// Según el prompt v3: idCanal, Nombre, Codigo

class CanalModel {

  static async getAll() {
    return db.query(`
      SELECT idCanal, Nombre, Codigo
      FROM canal_venta
      ORDER BY idCanal ASC
    `);
  }

  static async guardarTodos(canales) {
    if (!Array.isArray(canales)) throw new Error('canales debe ser un array');

    for (const c of canales) {
      if (!c.name) continue;
      const codigo = (c.code || c.name).substring(0, 45);

      const existing = await db.query(
        'SELECT idCanal FROM canal_venta WHERE Nombre = ?', [c.name]
      );

      if (existing.length) {
        await db.execute(
          'UPDATE canal_venta SET Codigo = ? WHERE idCanal = ?',
          [codigo, existing[0].idCanal]
        );
      } else {
        await db.execute(
          'INSERT INTO canal_venta (Nombre, Codigo) VALUES (?, ?)',
          [c.name, codigo]
        );
      }
    }

    return { ok: true };
  }

  static async crear({ Nombre, Codigo }) {
    if (!Nombre) throw new Error('El nombre del canal es obligatorio');
    const result = await db.execute(
      'INSERT INTO canal_venta (Nombre, Codigo) VALUES (?, ?)',
      [Nombre, Codigo || Nombre.substring(0, 45)]
    );
    return result.insertId;
  }

  static async actualizar(id, { Nombre, Codigo }) {
    await db.execute(
      'UPDATE canal_venta SET Nombre = ?, Codigo = ? WHERE idCanal = ?',
      [Nombre, Codigo || Nombre.substring(0, 45), id]
    );
  }

  static async eliminar(id) {
    await db.execute('DELETE FROM canal_venta WHERE idCanal = ?', [id]);
  }
}

module.exports = CanalModel;
