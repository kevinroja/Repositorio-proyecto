/**
 * costoPrenda.controller.js
 * Controlador HTTP para el módulo de Costeo.
 * Maneja los escenarios de parámetros por colección.
 */

const CostoPrendaService = require('../services/costoPrenda.service');

const CostoPrendaController = {

  /**
   * GET /api/costeo/escenarios?colId=X
   * Lista todos los escenarios guardados de una colección.
   */
  async listarEscenarios(req, res) {
    try {
      const { colId } = req.query;
      if (!colId) return res.status(400).json({ ok: false, message: 'colId requerido' });

      const data = await CostoPrendaService.listarEscenarios(parseInt(colId));
      return res.json({ ok: true, data });
    } catch (err) {
      console.error('[CostoPrenda] listarEscenarios:', err);
      return res.status(500).json({ ok: false, message: err.message });
    }
  },

  /**
   * POST /api/costeo/escenarios
   * Guarda un nuevo escenario de costeo para una colección.
   *
   * Body:
   * {
   *   colId: number,
   *   params: { trm, kvMarkup, exportacionPct, arancelesPct,
   *             amerindias, factoring, pct10eleven, imprevistos,
   *             costoFinancieroIva, seguroAnualCop, nPrendas },
   *   prendas: [{ prendaId, ajusteUsd, margenExtra,
   *               costoTaller, precioVentaFinal }],
   *   canales: [{ prendaId, canalId, kvMarkup, ajusteUsd, margenExtra,
   *               subTotal1, subTotal2, precioCop, precioUsd }]  // opcional
   * }
   */
  async guardarEscenario(req, res) {
    try {
      const result = await CostoPrendaService.guardarEscenario(req.body);
      return res.status(201).json({
        ok:      true,
        message: `Escenario ${result.escenarioNum} guardado (${result.total} prendas)`,
        data:    result,
      });
    } catch (err) {
      console.error('[CostoPrenda] guardarEscenario:', err);
      return res.status(400).json({ ok: false, message: err.message });
    }
  },

  /**
   * GET /api/costeo/escenarios/:id?colId=X
   * Carga los parámetros de un escenario para restaurarlos en el frontend.
   */
  async cargarEscenario(req, res) {
    try {
      const { id }    = req.params;
      const { colId } = req.query;
      if (!colId) return res.status(400).json({ ok: false, message: 'colId requerido' });

      const data = await CostoPrendaService.cargarEscenario(parseInt(id), parseInt(colId));
      return res.json({ ok: true, data });
    } catch (err) {
      console.error('[CostoPrenda] cargarEscenario:', err);
      return res.status(404).json({ ok: false, message: err.message });
    }
  },

  /**
   * DELETE /api/costeo/escenarios/:id?colId=X
   * Elimina todos los costo_prenda del escenario identificado por :id.
   */
  async eliminarEscenario(req, res) {
    try {
      const { id }    = req.params;
      const { colId } = req.query;
      if (!colId) return res.status(400).json({ ok: false, message: 'colId requerido' });

      const result = await CostoPrendaService.eliminarEscenario(parseInt(id), parseInt(colId));
      return res.json({
        ok:      true,
        message: `${result.eliminados} registro(s) eliminado(s)`,
        data:    result,
      });
    } catch (err) {
      console.error('[CostoPrenda] eliminarEscenario:', err);
      return res.status(404).json({ ok: false, message: err.message });
    }
  },
};

module.exports = CostoPrendaController;
