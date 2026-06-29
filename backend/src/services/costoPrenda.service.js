/**
 * costoPrenda.service.js  v3
 * Lógica de negocio para escenarios de costeo.
 *
 * Usa las tablas dedicadas:
 *   escenario        → cabecera (parámetros globales + nombre + fecha)
 *   escenario_prenda → detalle por prenda (ajuste, margen, shopmy, etc.)
 */

const db = require('../config/db');

const CostoPrendaService = {

  /**
   * GET /api/costeo/escenarios?colId=X
   * Lista los escenarios de una colección con resumen de parámetros.
   */
  async listarEscenarios(colId) {
    const [escenarios] = await db.query(
      `SELECT
         e.idESCENARIO,
         e.nombre,
         e.fecha,
         e.trm,
         e.kv_markup,
         e.rt_markup,
         e.exportacion_pct,
         e.aranceles_pct,
         e.amerindias,
         e.factoring,
         e.pct_10eleven,
         e.imprevistos,
         e.costo_financiero_iva,
         e.iva_pct,
         e.tasa_fin_pct,
         e.seguro_anual_cop,
         e.n_prendas,
         COUNT(ep.idESCENARIO_PRENDA) AS total_prendas
       FROM escenario e
       LEFT JOIN escenario_prenda ep ON ep.ESCENARIO_idESCENARIO = e.idESCENARIO
       WHERE e.COLECCION_idCOLECCION = ?
       GROUP BY e.idESCENARIO
       ORDER BY e.fecha DESC`,
      [colId]
    );

    return escenarios.map(e => ({
      idRepresentativo: e.idESCENARIO,
      nombre:           e.nombre,
      fecha:            e.fecha,
      trm:              e.trm,
      kv_markup:        e.kv_markup,
      rt_markup:        e.rt_markup,
      exportacion_pct:  e.exportacion_pct,
      aranceles_pct:    e.aranceles_pct,
      amerindias:       e.amerindias,
      factoring:        e.factoring,
      pct_10eleven:     e.pct_10eleven,
      imprevistos:      e.imprevistos,
      costo_fin_iva:    e.costo_financiero_iva,
      iva_pct:          e.iva_pct,
      tasa_fin_pct:     e.tasa_fin_pct,
      seguro_anual_cop: e.seguro_anual_cop,
      n_prendas:        e.n_prendas,
      total_prendas:    e.total_prendas,
    }));
  },

  /**
   * POST /api/costeo/escenarios
   * Guarda un escenario completo: cabecera + detalle por prenda.
   *
   * Body esperado:
   * {
   *   colId:   number,
   *   nombre:  string,           ← nombre libre del usuario
   *   params: {
   *     trm, kvMarkup, rtMarkup,
   *     exportacionPct, arancelesPct, amerindias, factoring,
   *     pct10eleven, imprevistos, costoFinancieroIva,
   *     ivaPct, tasaFinPct, seguroAnualCop, nPrendas
   *   },
   *   prendas: [{
   *     prendaId, ajusteUsd, margenExtra, shopmy,
   *     kvMarkupRow, costoTaller, precioVentaFinal, precioSug
   *   }]
   * }
   */
  async guardarEscenario(body) {
    const { colId, nombre, params, prendas } = body;

    if (!colId)           throw new Error('colId es requerido');
    if (!nombre?.trim())  throw new Error('El nombre del escenario es requerido');
    if (!params)          throw new Error('params es requerido');
    if (!prendas?.length) throw new Error('Se requiere al menos una prenda');

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Insertar cabecera en escenario
      const [resEsc] = await conn.execute(
        `INSERT INTO escenario (
           nombre, fecha, trm, kv_markup, rt_markup,
           exportacion_pct, aranceles_pct, amerindias,
           factoring, pct_10eleven, imprevistos,
           costo_financiero_iva, iva_pct, tasa_fin_pct,
           seguro_anual_cop, n_prendas,
           COLECCION_idCOLECCION, USUARIO_idUSUARIO
         ) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nombre.trim(),
          params.trm              ?? 0,
          params.kvMarkup         ?? 0,
          params.rtMarkup         ?? 0,
          params.exportacionPct   ?? 0,
          params.arancelesPct     ?? 0,
          params.amerindias       ?? 0,
          params.factoring        ?? 0,
          params.pct10eleven      ?? 0,
          params.imprevistos      ?? 0,
          params.costoFinancieroIva ?? 0,
          params.ivaPct           ?? 0,
          params.tasaFinPct       ?? 0,
          params.seguroAnualCop   ?? 0,
          params.nPrendas         ?? 0,
          colId,
          body.usuarioId          ?? null,
        ]
      );

      const escenarioId = resEsc.insertId;

      // 2. Insertar detalle en escenario_prenda
      for (const pr of prendas) {
        await conn.execute(
          `INSERT INTO escenario_prenda (
             ESCENARIO_idESCENARIO, PRENDA_idPREND,
             ajuste_usd, margen_extra, shopmy,
             kv_markup_row, costo_taller,
             precio_venta_final, precio_sug
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            escenarioId,
            pr.prendaId,
            pr.ajusteUsd        ?? 0,
            pr.margenExtra      ?? 0,
            pr.shopmy           ?? 0,
            pr.kvMarkupRow      ?? null,
            pr.costoTaller      ?? 0,
            pr.precioVentaFinal ?? 0,
            pr.precioSug        ?? null,
          ]
        );
      }

      // 3. Registrar en historial
      await conn.execute(
        `INSERT INTO historial (
           Tabla_afectada, Registro_id, Campo,
           Valor_anterior, Valor_nuevo, Accion,
           Fecha, Usuario_id
         ) VALUES ('escenario', ?, 'nombre', NULL, ?, 'INSERT', NOW(), ?)`,
        [escenarioId, nombre.trim(), body.usuarioId ?? null]
      );

      await conn.commit();

      return {
        escenarioId,
        total: prendas.length,
      };

    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  /**
   * GET /api/costeo/escenarios/:id?colId=X
   * Carga parámetros + prendas de un escenario para restaurar en el frontend.
   */
  async cargarEscenario(escenarioId, colId) {
    const [rows] = await db.query(
      `SELECT * FROM escenario
       WHERE idESCENARIO = ? AND COLECCION_idCOLECCION = ?`,
      [escenarioId, colId]
    );
    if (!rows.length) throw new Error('Escenario no encontrado');

    const e = rows[0];

    const [prendas] = await db.query(
      `SELECT ep.*, p.Referencia
       FROM escenario_prenda ep
       JOIN prenda p ON p.idPREND = ep.PRENDA_idPREND
       WHERE ep.ESCENARIO_idESCENARIO = ?`,
      [escenarioId]
    );

    return {
      params: {
        trm:                e.trm,
        kvMarkup:           e.kv_markup,
        rtMarkup:           e.rt_markup,
        exportacionPct:     e.exportacion_pct,
        arancelesPct:       e.aranceles_pct,
        amerindias:         e.amerindias,
        factoring:          e.factoring,
        pct10eleven:        e.pct_10eleven,
        imprevistos:        e.imprevistos,
        costoFinancieroIva: e.costo_financiero_iva,
        ivaPct:             e.iva_pct,
        tasaFinPct:         e.tasa_fin_pct,
        seguroAnualCop:     e.seguro_anual_cop,
        nPrendas:           e.n_prendas,
      },
      prendas: prendas.map(p => ({
        prendaId:        p.PRENDA_idPREND,
        referencia:      p.Referencia,
        ajusteUsd:       p.ajuste_usd,
        margenExtra:     p.margen_extra,
        shopmy:          p.shopmy,
        kvMarkupRow:     p.kv_markup_row,
        costoTaller:     p.costo_taller,
        precioVentaFinal: p.precio_venta_final,
        precioSug:       p.precio_sug,
      })),
    };
  },

  /**
   * DELETE /api/costeo/escenarios/:id?colId=X
   * Elimina un escenario completo (cabecera + detalle en cascada).
   */
  async eliminarEscenario(escenarioId, colId) {
    const [rows] = await db.query(
      `SELECT idESCENARIO FROM escenario
       WHERE idESCENARIO = ? AND COLECCION_idCOLECCION = ?`,
      [escenarioId, colId]
    );
    if (!rows.length) throw new Error('Escenario no encontrado');

    // escenario_prenda se elimina en cascada por FK
    await db.query(
      'DELETE FROM escenario WHERE idESCENARIO = ?',
      [escenarioId]
    );

    return { eliminados: 1 };
  },

  /**
   * PUT /api/costeo/escenarios/:id
   * Actualiza el nombre de un escenario existente.
   */
  async actualizarNombre(escenarioId, nombre) {
    if (!nombre?.trim()) throw new Error('El nombre es requerido');

    await db.query(
      'UPDATE escenario SET nombre = ? WHERE idESCENARIO = ?',
      [nombre.trim(), escenarioId]
    );

    return { actualizado: true };
  },
};

module.exports = CostoPrendaService;
