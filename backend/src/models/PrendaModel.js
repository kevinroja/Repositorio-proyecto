const db = require('../config/db');

class PrendaModel {

  static async guardarCompleto(data, usuarioId) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Upsert prenda
      const [existing] = await conn.execute(
        `SELECT p.idPREND FROM prenda p
         INNER JOIN coleccion c ON c.PRENDA_idPRENDA = p.idPREND
         WHERE p.Referencia = ? AND c.idCOLECCION = ?`,
        [data.ref, data.colId]
      );

      let prendaId;
      if (existing.length) {
        prendaId = existing[0].idPREND;
        await conn.execute(
          `UPDATE prenda SET ttl_materiales=?, ttl_insumos_var=?, ttl_insumos_fijos=?,
           Costo_confeccion=?, Costo_total=? WHERE idPREND=?`,
          [data.ttlMat, data.ttlInsVar, data.ttlInsFijos,
           data.taller, data.costoTotal, prendaId]
        );
      } else {
        const [res] = await conn.execute(
          `INSERT INTO prenda (Referencia, ttl_materiales, ttl_insumos_var,
           ttl_insumos_fijos, Costo_confeccion, Costo_total)
           VALUES (?,?,?,?,?,?)`,
          [data.ref, data.ttlMat, data.ttlInsVar, data.ttlInsFijos,
           data.taller, data.costoTotal]
        );
        prendaId = res.insertId;
      }

      // 2. Borrar materiales anteriores y reinsertar
      await conn.execute(`DELETE FROM prenda_tela WHERE PRENDA_idPREND=?`, [prendaId]);
      for (let i = 0; i < data.materiales.length; i++) {
        const m = data.materiales[i];
        if (!m.Nombre) continue;

        const [mEx] = await conn.execute(
          `SELECT idMATERIAL FROM material WHERE Nombre=? AND PRENDA_TELA_idPREND_TELA IS NULL LIMIT 1`,
          [m.Nombre]
        );
        let matId;
        if (mEx.length) {
          matId = mEx[0].idMATERIAL;
          await conn.execute(
            `UPDATE material SET Precio=?, Unidad_de_medida=? WHERE idMATERIAL=?`,
            [m.Precio, m.Mts, matId]
          );
        } else {
          const [mr] = await conn.execute(
            `INSERT INTO material (Nombre, Tipo, Unidad_de_medida, Precio)
             VALUES (?,?,?,?)`,
            [m.Nombre, 'Tela', m.Mts, m.Precio]
          );
          matId = mr.insertId;
        }

        await conn.execute(
          `INSERT INTO prenda_tela (Metros, Precio_Unitario, Costo_Total, Orden, PRENDA_idPREND)
           VALUES (?,?,?,?,?)`,
          [m.Mts, m.Precio, m.Mts * m.Precio, i + 1, prendaId]
        );
      }

      // 3. Borrar insumos variables anteriores y reinsertar
      await conn.execute(`DELETE FROM prenda_insumos_var WHERE PRENDA_idPREND=?`, [prendaId]);
      for (let i = 0; i < data.insumos.length; i++) {
        const ins = data.insumos[i];
        if (!ins.name) continue;
        await conn.execute(
          `INSERT INTO prenda_insumos_var
           (Cantidad, Precio_unitario, Costo_Total, Orden, PRENDA_INSUMOS_VARcol, PRENDA_idPREND)
           VALUES (?,?,?,?,?,?)`,
          [ins.cant, ins.precio, ins.cant * ins.precio, i + 1, ins.name, prendaId]
        );
      }

      await conn.commit();
      return { ok: true, prendaId };

    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async getByColeccion(colId) {
    return db.query(
      `SELECT p.*, pt.Metros, pt.Precio_Unitario, pt.Orden,
              m.Nombre AS NombreMaterial, m.Tipo
       FROM prenda p
       INNER JOIN coleccion c ON c.PRENDA_idPRENDA = p.idPREND
       LEFT JOIN prenda_tela pt ON pt.PRENDA_idPREND = p.idPREND
       LEFT JOIN material m ON m.PRENDA_TELA_idPREND_TELA = pt.idPREND_TELA
       WHERE c.idCOLECCION = ?
       ORDER BY p.Referencia, pt.Orden`,
      [colId]
    );
  }
}

module.exports = PrendaModel;