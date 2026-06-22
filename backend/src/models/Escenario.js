const db = require('../config/db');

class Escenario {
  /**
   * Crea un escenario y sus prendas asociadas dentro de una transacción.
   * Si falla la inserción de prendas, revierte también el escenario.
   */
  static async crearConPrendas({ nombre, params, colId, usuarioId, prendas }) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [escResult] = await conn.execute(
        `INSERT INTO escenario
           (nombre, trm, kv_markup, exportacion_pct, aranceles_pct, amerindias,
            factoring, pct_10eleven, imprevistos, costo_financiero_iva,
            seguro_anual_cop, n_prendas, COLECCION_idCOLECCION, USUARIO_idUSUARIO)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nombre,
          params.trm ?? null,
          params.kvMarkup ?? null,
          params.exportacionPct ?? null,
          params.arancelesPct ?? null,
          params.amerindias ?? null,
          params.factoring ?? null,
          params.pct10eleven ?? null,
          params.imprevistos ?? null,
          params.costoFinancieroIva ?? null,
          params.seguroAnualCop ?? null,
          params.nPrendas ?? prendas.length,
          colId,
          usuarioId ?? null,
        ]
      );
      const idEscenario = escResult.insertId;

      const values = [];
      const placeholders = prendas
        .map((p) => {
          values.push(
            idEscenario,
            p.prendaId,
            p.ajusteUsd ?? 0,
            p.margenExtra ?? 0,
            p.costoTaller ?? 0,
            p.precioVentaFinal ?? 0
          );
          return '(?, ?, ?, ?, ?, ?)';
        })
        .join(', ');

      await conn.execute(
        `INSERT INTO escenario_prenda
           (ESCENARIO_idESCENARIO, PRENDA_idPREND, ajuste_usd, margen_extra, costo_taller, precio_venta_final)
         VALUES ${placeholders}`,
        values
      );

      await conn.commit();
      return idEscenario;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async getByColeccion(colId) {
    return db.query(
      `SELECT idESCENARIO, nombre, fecha, trm, kv_markup, exportacion_pct,
              aranceles_pct, n_prendas AS total_prendas
       FROM escenario
       WHERE COLECCION_idCOLECCION = ?
       ORDER BY fecha DESC`,
      [colId]
    );
  }

  static async getByIdAndColeccion(idEscenario, colId) {
    const rows = await db.query(
      `SELECT * FROM escenario WHERE idESCENARIO = ? AND COLECCION_idCOLECCION = ?`,
      [idEscenario, colId]
    );
    return rows[0] || null;
  }

  static async getPrendas(idEscenario) {
    return db.query(
      `SELECT PRENDA_idPREND, ajuste_usd, margen_extra, costo_taller, precio_venta_final
       FROM escenario_prenda
       WHERE ESCENARIO_idESCENARIO = ?`,
      [idEscenario]
    );
  }

  static async deleteByIdAndColeccion(idEscenario, colId) {
    const result = await db.execute(
      `DELETE FROM escenario WHERE idESCENARIO = ? AND COLECCION_idCOLECCION = ?`,
      [idEscenario, colId]
    );
    return result.affectedRows;
  }
}

module.exports = Escenario;