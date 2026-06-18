/**
 * costoPrenda.model.js
 * Acceso directo a la BD para la tabla costo_prenda y precio_canal.
 * Usa db.query() para SELECTs y db.execute() para INSERT/UPDATE/DELETE.
 */

const db = require('../config/db');

const CostoPrendaModel = {

  /**
   * Trae todos los escenarios de costeo de una colección,
   * uniendo costo_prenda con prenda para filtrar por colección.
   * Incluye la TRM usada y cuántos canales tiene cada escenario.
   */
  async getByColeccion(colId) {
    const sql = `
      SELECT
        cp.idCOSTO_PRENDA,
        cp.PRENDA_idPREND,
        p.Referencia,
        cp.trm,
        cp.kv_markup,
        cp.ajuste_usd,
        cp.margen_extra,
        cp.seguro_prenda,
        cp.costo_financiero_iva,
        cp.imprevistos,
        cp.factoring,
        cp.exportacion_pct,
        cp.aranceles_pct,
        cp.amerindias,
        cp.pct_10eleven,
        cp.costo_taller,
        cp.precio_venta_final,
        cp.TMR_idTMR,
        t.Valor   AS trm_valor,
        t.Fecha   AS trm_fecha,
        COUNT(pc.idPrecio_Canal) AS total_canales
      FROM costo_prenda cp
      JOIN prenda  p  ON p.idPREND  = cp.PRENDA_idPREND
      LEFT JOIN tmr t  ON t.idTMR   = cp.TMR_idTMR
      LEFT JOIN precio_canal pc ON pc.COSTO_PRENDA_idCOSTO_PRENDA = cp.idCOSTO_PRENDA
      WHERE p.COLECCION_idCOLECCION = ?
      GROUP BY cp.idCOSTO_PRENDA
      ORDER BY cp.idCOSTO_PRENDA DESC
    `;
    return db.query(sql, [colId]);
  },

  /**
   * Trae un escenario completo (costo_prenda + precio_canal) por ID.
   */
  async getById(id) {
    const sqlCosto = `
      SELECT cp.*, t.Valor AS trm_valor, t.Fecha AS trm_fecha,
             p.Referencia, p.COLECCION_idCOLECCION
      FROM costo_prenda cp
      JOIN prenda p ON p.idPREND = cp.PRENDA_idPREND
      LEFT JOIN tmr t ON t.idTMR = cp.TMR_idTMR
      WHERE cp.idCOSTO_PRENDA = ?
    `;
    const rows = await db.query(sqlCosto, [id]);
    return rows[0] || null;
  },

  /**
   * Crea un registro de costo_prenda.
   * Primero busca o crea el registro TRM del día.
   */
  async create(data) {
    const {
      prendaId, trmValor, kvMarkup, ajusteUsd, margenExtra,
      seguroPrenda, costoFinancieroIva, imprevistos, factoring,
      exportacionPct, arancelesPct, amerindias, pct10eleven,
      costoTaller, precioVentaFinal
    } = data;

    // Buscar o insertar la TRM del día
    const trmId = await this._upsertTrm(trmValor);

    const sql = `
      INSERT INTO costo_prenda
        (PRENDA_idPREND, TMR_idTMR, trm,
         kv_markup, ajuste_usd, margen_extra,
         seguro_prenda, costo_financiero_iva, imprevistos,
         factoring, exportacion_pct, aranceles_pct,
         amerindias, pct_10eleven, costo_taller, precio_venta_final)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;
    const result = await db.execute(sql, [
      prendaId, trmId, trmValor,
      kvMarkup, ajusteUsd, margenExtra,
      seguroPrenda, costoFinancieroIva, imprevistos,
      factoring, exportacionPct, arancelesPct,
      amerindias, pct10eleven, costoTaller, precioVentaFinal
    ]);
    return result.insertId;
  },

  /**
   * Actualiza un escenario existente.
   */
  async update(id, data) {
    const {
      trmValor, kvMarkup, ajusteUsd, margenExtra,
      seguroPrenda, costoFinancieroIva, imprevistos, factoring,
      exportacionPct, arancelesPct, amerindias, pct10eleven,
      costoTaller, precioVentaFinal
    } = data;

    const trmId = await this._upsertTrm(trmValor);

    const sql = `
      UPDATE costo_prenda SET
        TMR_idTMR            = ?,
        trm                  = ?,
        kv_markup            = ?,
        ajuste_usd           = ?,
        margen_extra         = ?,
        seguro_prenda        = ?,
        costo_financiero_iva = ?,
        imprevistos          = ?,
        factoring            = ?,
        exportacion_pct      = ?,
        aranceles_pct        = ?,
        amerindias           = ?,
        pct_10eleven         = ?,
        costo_taller         = ?,
        precio_venta_final   = ?
      WHERE idCOSTO_PRENDA = ?
    `;
    await db.execute(sql, [
      trmId, trmValor, kvMarkup, ajusteUsd, margenExtra,
      seguroPrenda, costoFinancieroIva, imprevistos, factoring,
      exportacionPct, arancelesPct, amerindias, pct10eleven,
      costoTaller, precioVentaFinal, id
    ]);
  },

  /**
   * Elimina un escenario (CASCADE borra sus precio_canal).
   */
  async delete(id) {
    await db.execute('DELETE FROM costo_prenda WHERE idCOSTO_PRENDA = ?', [id]);
  },

  // ── precio_canal ──────────────────────────────────────────────

  /**
   * Trae todos los precios por canal de un escenario.
   */
  async getPreciosCanal(costoPrendaId) {
    const sql = `
      SELECT pc.*, cv.Nombre AS canal_nombre, cv.Codigo AS canal_codigo
      FROM precio_canal pc
      LEFT JOIN canal_venta cv ON cv.idCanal = pc.Canal_Venta_idCanal
      WHERE pc.COSTO_PRENDA_idCOSTO_PRENDA = ?
      ORDER BY cv.Codigo
    `;
    return db.query(sql, [costoPrendaId]);
  },

  /**
   * Guarda (replace) los precios por canal de un escenario.
   * Borra los existentes y los vuelve a insertar.
   */
  async savePreciosCanal(costoPrendaId, canales) {
    // Limpiar anteriores
    await db.execute(
      'DELETE FROM precio_canal WHERE COSTO_PRENDA_idCOSTO_PRENDA = ?',
      [costoPrendaId]
    );

    if (!canales || !canales.length) return;

    const sql = `
      INSERT INTO precio_canal
        (COSTO_PRENDA_idCOSTO_PRENDA, Canal_Venta_idCanal,
         Kv_markup, Ajuste_USD, Margen_extra,
         Sub_total1, Sub_total2,
         Precio_venta_cop, Precio_venta_USD)
      VALUES (?,?,?,?,?,?,?,?,?)
    `;
    for (const c of canales) {
      await db.execute(sql, [
        costoPrendaId,
        c.canalId,
        c.kvMarkup    ?? 0,
        c.ajusteUsd   ?? 0,
        c.margenExtra ?? 0,
        c.subTotal1   ?? 0,
        c.subTotal2   ?? 0,
        c.precioCop   ?? 0,
        c.precioUsd   ?? 0,
      ]);
    }
  },

  // ── helpers privados ─────────────────────────────────────────

  /**
   * Busca una TRM del día en la BD o la inserta si no existe.
   * @returns {number} idTMR
   */
  async _upsertTrm(valor) {
    const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const rows = await db.query(
      `SELECT idTMR FROM tmr WHERE DATE(Fecha) = ? AND Valor = ? LIMIT 1`,
      [hoy, valor]
    );
    if (rows.length) return rows[0].idTMR;

    const result = await db.execute(
      `INSERT INTO tmr (Valor, Fecha, Fuente) VALUES (?, NOW(), 'manual')`,
      [valor]
    );
    return result.insertId;
  },
};

module.exports = CostoPrendaModel;
