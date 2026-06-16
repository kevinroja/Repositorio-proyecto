// src/models/ColeccionModel.js
const db = require('../config/db');

class ColeccionModel {

  static async getAll() {
    return db.query(`
      SELECT 
        c.idCOLECCION,
        c.NombreColeccion,
        c.Temporada,
        c.Año,
        COUNT(p.idPREND) AS referencias
      FROM coleccion c
      LEFT JOIN prenda p ON p.COLECCION_idCOLECCION = c.idCOLECCION
      GROUP BY c.idCOLECCION, c.NombreColeccion, c.Temporada, c.Año
      ORDER BY c.idCOLECCION DESC
    `);
  }

  static async getById(id) {
    const rows = await db.query(
      `SELECT * FROM coleccion WHERE idCOLECCION = ?`, [id]
    );
    return rows[0] || null;
  }

  static async crear(data) {
    const { NombreColeccion, Temporada, Año } = data;
    const result = await db.execute(
      `INSERT INTO coleccion (NombreColeccion, Temporada, Año) VALUES (?, ?, ?)`,
      [NombreColeccion, Temporada, Año]
    );
    return result.insertId;
  }

  static async actualizar(id, data) {
    const { NombreColeccion, Temporada, Año } = data;
    return db.execute(
      `UPDATE coleccion SET NombreColeccion = ?, Temporada = ?, Año = ?
       WHERE idCOLECCION = ?`,
      [NombreColeccion, Temporada, Año, id]
    );
  }

  static async eliminar(id) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Contar referencias antes de borrar
      const [prendas] = await conn.execute(
        `SELECT COUNT(*) AS total FROM prenda WHERE COLECCION_idCOLECCION = ?`,
        [id]
      );
      const totalRefs = prendas[0].total;

      // Borrar colección — CASCADE elimina prenda, prenda_tela,
      // prenda_insumos_var, costo_prenda, precio_canal automáticamente
      await conn.execute(
        `DELETE FROM coleccion WHERE idCOLECCION = ?`, [id]
      );

      await conn.commit();
      return { ok: true, prendasEliminadas: totalRefs };

    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async getPrendasByColeccion(id) {
    return db.query(
      `SELECT 
         idPREND, Referencia, ttl_materiales, ttl_insumos_var,
         ttl_insumos_fijos, Costo_confeccion, Costo_total
       FROM prenda
       WHERE COLECCION_idCOLECCION = ?`,
      [id]
    );
  }
}

module.exports = ColeccionModel;