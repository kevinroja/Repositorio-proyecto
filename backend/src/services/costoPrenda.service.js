/**
 * costoPrenda.service.js
 * Lógica de negocio para escenarios de costeo.
 *
 * Regla de nomenclatura automática:
 *   Una colección puede tener múltiples escenarios guardados.
 *   Cada escenario se identifica por:
 *     "{NombreColeccion} {Temporada} {Año} — Escenario N"
 *   donde N es el número correlativo dentro de esa colección.
 *
 * Estructura del "escenario":
 *   Un escenario en realidad es un conjunto de registros costo_prenda
 *   (uno por prenda de la colección) que comparten los mismos parámetros
 *   globales (TRM, KV Markup, %s, etc.).
 *
 *   Para agruparlos, usamos una convención:
 *     - Todos los costo_prenda del mismo escenario tienen el mismo
 *       valor de trm + kv_markup + exportacion_pct + aranceles_pct
 *       + amerindias + factoring + pct_10eleven + imprevistos +
 *       costo_financiero_iva guardados en el mismo bloque.
 *
 *   En la práctica el frontend envía UN objeto de parámetros globales
 *   + un array de prendas con sus valores individuales (ajuste, margen,
 *   precio_venta_final, costo_taller).
 */

const CostoPrendaModel = require('../models/costoPrenda.model');
const db               = require('../config/db');

const CostoPrendaService = {

  /**
   * Lista los escenarios guardados para una colección.
   * Agrupa los costo_prenda por "snapshot" de parámetros globales
   * y les asigna el nombre automático.
   *
   * @param {number} colId
   * @returns {Array} escenarios resumidos
   */
  async listarEscenarios(colId) {
    // Traer todos los costo_prenda de la colección
    const filas = await CostoPrendaModel.getByColeccion(colId);
    if (!filas.length) return [];

    // Agrupar por "huella" de parámetros globales
    // (mismo bloque de parámetros = mismo escenario)
    const grupos = new Map();

    for (const f of filas) {
      const huella = _huella(f);
      if (!grupos.has(huella)) {
        grupos.set(huella, {
          huella,
          trm:                  f.trm,
          kv_markup:            f.kv_markup,
          ajuste_usd:           f.ajuste_usd,
          margen_extra:         f.margen_extra,
          seguro_prenda:        f.seguro_prenda,
          costo_financiero_iva: f.costo_financiero_iva,
          imprevistos:          f.imprevistos,
          factoring:            f.factoring,
          exportacion_pct:      f.exportacion_pct,
          aranceles_pct:        f.aranceles_pct,
          amerindias:           f.amerindias,
          pct_10eleven:         f.pct_10eleven,
          // El ID representativo es el menor (primero insertado del grupo)
          idRepresentativo:     f.idCOSTO_PRENDA,
          prendas:              [],
          fecha:                f.trm_fecha,
        });
      }
      grupos.get(huella).prendas.push({
        idCOSTO_PRENDA: f.idCOSTO_PRENDA,
        prendaId:       f.PRENDA_idPREND,
        referencia:     f.Referencia,
        ajuste_usd:     f.ajuste_usd,
        margen_extra:   f.margen_extra,
        costo_taller:   f.costo_taller,
        precio_final:   f.precio_venta_final,
      });
    }

    // Obtener nombre de la colección para el label
    const colInfo = await _getColInfo(colId);

    // Convertir a array y asignar nombres correlativos
    let i = 1;
    const escenarios = [];
    for (const g of grupos.values()) {
      escenarios.push({
        nombre:               `${colInfo} — Escenario ${i++}`,
        trm:                  g.trm,
        kv_markup:            g.kv_markup,
        ajuste_usd:           g.ajuste_usd,
        margen_extra:         g.margen_extra,
        seguro_prenda:        g.seguro_prenda,
        costo_financiero_iva: g.costo_financiero_iva,
        imprevistos:          g.imprevistos,
        factoring:            g.factoring,
        exportacion_pct:      g.exportacion_pct,
        aranceles_pct:        g.aranceles_pct,
        amerindias:           g.amerindias,
        pct_10eleven:         g.pct_10eleven,
        idRepresentativo:     g.idRepresentativo,
        fecha:                g.fecha,
        total_prendas:        g.prendas.length,
        prendas:              g.prendas,
      });
    }

    return escenarios;
  },

  /**
   * Guarda un escenario completo para una colección.
   *
   * El frontend envía:
   * {
   *   colId: number,
   *   params: {                 ← parámetros globales
   *     trm, kvMarkup, exportacionPct, arancelesPct,
   *     amerindias, factoring, pct10eleven, imprevistos,
   *     costoFinancieroIva, seguroAnualCop, nPrendas
   *   },
   *   prendas: [{               ← una entrada por referencia visible
   *     prendaId, ajusteUsd, margenExtra,
   *     costoTaller, precioVentaFinal
   *   }],
   *   canales: [{               ← opcional, precios por canal
   *     prendaId, canalId, kvMarkup, ajusteUsd, margenExtra,
   *     subTotal1, subTotal2, precioCop, precioUsd
   *   }]
   * }
   *
   * Inserta un costo_prenda por cada prenda.
   * @returns {{ escenarioNum: number, ids: number[] }}
   */
  async guardarEscenario(body) {
    const { colId, params, prendas, canales = [] } = body;

    if (!colId)           throw new Error('colId es requerido');
    if (!params)          throw new Error('params es requerido');
    if (!prendas?.length) throw new Error('Se requiere al menos una prenda');

    // Calcular seguro por prenda a partir del seguro anual global
    const seguroPorPrenda = params.nPrendas
      ? (params.seguroAnualCop || 0) / params.nPrendas
      : 0;

    const ids = [];

    for (const pr of prendas) {
      const id = await CostoPrendaModel.create({
        prendaId:            pr.prendaId,
        trmValor:            params.trm,
        kvMarkup:            params.kvMarkup,
        ajusteUsd:           pr.ajusteUsd      ?? 0,
        margenExtra:         pr.margenExtra     ?? 0,
        seguroPrenda:        seguroPorPrenda,
        costoFinancieroIva:  params.costoFinancieroIva ?? 0,
        imprevistos:         params.imprevistos ?? 0,
        factoring:           params.factoring   ?? 0,
        exportacionPct:      params.exportacionPct ?? 0,
        arancelesPct:        params.arancelesPct   ?? 0,
        amerindias:          params.amerindias  ?? 0,
        pct10eleven:         params.pct10eleven ?? 0,
        costoTaller:         pr.costoTaller     ?? 0,
        precioVentaFinal:    pr.precioVentaFinal ?? 0,
      });
      ids.push(id);

      // Guardar precios de canal para esta prenda si vienen
      const canalesPrenda = canales.filter(c => c.prendaId === pr.prendaId);
      if (canalesPrenda.length) {
        await CostoPrendaModel.savePreciosCanal(id, canalesPrenda);
      }
    }

    // Calcular número de escenario resultante
    const lista = await this.listarEscenarios(colId);
    const escenarioNum = lista.length;

    return { escenarioNum, ids, total: ids.length };
  },

  /**
   * Elimina todos los costo_prenda de un escenario identificado
   * por su idRepresentativo (el menor del grupo).
   * Busca todos los registros con la misma huella de parámetros
   * y los elimina.
   */
  async eliminarEscenario(idRepresentativo, colId) {
    // Obtener parámetros del representante
    const rep = await CostoPrendaModel.getById(idRepresentativo);
    if (!rep) throw new Error('Escenario no encontrado');

    // Traer todos los costo_prenda de la colección
    const todos = await CostoPrendaModel.getByColeccion(colId);

    // Filtrar los que tienen la misma huella
    const mismaHuella = _huella(rep);
    const aEliminar = todos.filter(f => _huella(f) === mismaHuella);

    for (const f of aEliminar) {
      await CostoPrendaModel.delete(f.idCOSTO_PRENDA);
    }

    return { eliminados: aEliminar.length };
  },

  /**
   * Carga los parámetros de un escenario para restaurarlos en el frontend.
   * Devuelve los params globales + array de prendas con ajuste/margen.
   */
  async cargarEscenario(idRepresentativo, colId) {
    const todos = await CostoPrendaModel.getByColeccion(colId);
    const rep   = todos.find(f => f.idCOSTO_PRENDA === parseInt(idRepresentativo));
    if (!rep) throw new Error('Escenario no encontrado');

    const mismaHuella = _huella(rep);
    const prendas = todos.filter(f => _huella(f) === mismaHuella);

    return {
      params: {
        trm:                rep.trm,
        kvMarkup:           rep.kv_markup,
        exportacionPct:     rep.exportacion_pct,
        arancelesPct:       rep.aranceles_pct,
        amerindias:         rep.amerindias,
        factoring:          rep.factoring,
        pct10eleven:        rep.pct_10eleven,
        imprevistos:        rep.imprevistos,
        costoFinancieroIva: rep.costo_financiero_iva,
        seguroPrenda:       rep.seguro_prenda,
      },
      prendas: prendas.map(f => ({
        idCOSTO_PRENDA: f.idCOSTO_PRENDA,
        prendaId:       f.PRENDA_idPREND,
        referencia:     f.Referencia,
        ajusteUsd:      f.ajuste_usd,
        margenExtra:    f.margen_extra,
        costoTaller:    f.costo_taller,
        precioFinal:    f.precio_venta_final,
      })),
    };
  },
};

// ── helpers privados ─────────────────────────────────────────────

/**
 * Genera una "huella" (fingerprint) de los parámetros globales de un
 * registro costo_prenda, para agrupar registros del mismo escenario.
 */
function _huella(f) {
  return [
    f.trm,
    f.kv_markup,
    f.exportacion_pct,
    f.aranceles_pct,
    f.amerindias,
    f.factoring,
    f.pct_10eleven,
    f.imprevistos,
    f.costo_financiero_iva,
    f.seguro_prenda,
  ].map(v => Number(v).toFixed(4)).join('|');
}

/**
 * Obtiene el label "NombreColeccion · Temporada Año" para nombrar escenarios.
 */
async function _getColInfo(colId) {
  const rows = await db.query(
    'SELECT NombreColeccion, Temporada, Año FROM coleccion WHERE idCOLECCION = ?',
    [colId]
  );
  if (!rows.length) return `Colección ${colId}`;
  const c = rows[0];
  return `${c.NombreColeccion} · ${c.Temporada} ${c.Año}`;
}

module.exports = CostoPrendaService;
