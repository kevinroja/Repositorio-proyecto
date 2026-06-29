/**
 * costoPrenda.controller.js  v3
 * Controlador HTTP para el módulo de Costeo — escenarios.
 */

const CostoPrendaService = require('../services/costoPrenda.service');

const CostoPrendaController = {

  async listarEscenarios(req, res) {
    try {
      const { colId } = req.query;
      if (!colId) return res.status(400).json({ ok: false, message: 'colId requerido' });
      const data = await CostoPrendaService.listarEscenarios(parseInt(colId));
      return res.json({ ok: true, data });
    } catch (err) {
      console.error('[Costeo] listarEscenarios:', err);
      return res.status(500).json({ ok: false, message: err.message });
    }
  },

  async guardarEscenario(req, res) {
    try {
      if (req.usuario?.id && !req.body.usuarioId) {
        req.body.usuarioId = req.usuario.id;
      }
      const result = await CostoPrendaService.guardarEscenario(req.body);
      return res.status(201).json({
        ok:      true,
        message: `Escenario "${req.body.nombre}" guardado (${result.total} prendas)`,
        data:    result,
      });
    } catch (err) {
      console.error('[Costeo] guardarEscenario:', err);
      return res.status(400).json({ ok: false, message: err.message });
    }
  },

  async cargarEscenario(req, res) {
    try {
      const { id }    = req.params;
      const { colId } = req.query;
      if (!colId) return res.status(400).json({ ok: false, message: 'colId requerido' });
      const data = await CostoPrendaService.cargarEscenario(parseInt(id), parseInt(colId));
      return res.json({ ok: true, data });
    } catch (err) {
      console.error('[Costeo] cargarEscenario:', err);
      return res.status(404).json({ ok: false, message: err.message });
    }
  },

  async actualizarNombre(req, res) {
    try {
      const { id }     = req.params;
      const { nombre } = req.body;
      const result = await CostoPrendaService.actualizarNombre(parseInt(id), nombre);
      return res.json({ ok: true, message: 'Nombre actualizado', data: result });
    } catch (err) {
      console.error('[Costeo] actualizarNombre:', err);
      return res.status(400).json({ ok: false, message: err.message });
    }
  },

  async eliminarEscenario(req, res) {
    try {
      const { id }    = req.params;
      const { colId } = req.query;
      if (!colId) return res.status(400).json({ ok: false, message: 'colId requerido' });
      const result = await CostoPrendaService.eliminarEscenario(parseInt(id), parseInt(colId));
      return res.json({ ok: true, message: 'Escenario eliminado', data: result });
    } catch (err) {
      console.error('[Costeo] eliminarEscenario:', err);
      return res.status(404).json({ ok: false, message: err.message });
    }
  },
};

module.exports = CostoPrendaController;
