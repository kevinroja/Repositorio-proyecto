const EscenarioService = require('../services/EscenarioService');

class EscenarioController {
  // POST /api/costeo/escenarios
  static async guardar(req, res) {
    try {
      const { colId, params, prendas } = req.body;
      const usuarioId = req.usuario?.id;

      const { nombre } = await EscenarioService.guardar({ colId, params, prendas, usuarioId });

      return res.status(201).json({
        ok: true,
        message: `Escenario "${nombre}" guardado correctamente (${prendas.length} prendas)`,
      });
    } catch (err) {
      return res.status(err.status || 500).json({ ok: false, message: err.message });
    }
  }

  // GET /api/costeo/escenarios?colId=
  static async listar(req, res) {
    try {
      const { colId } = req.query;
      const data = await EscenarioService.listar(colId);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      return res.status(err.status || 500).json({ ok: false, message: err.message });
    }
  }

  // GET /api/costeo/escenarios/:id?colId=
  static async detalle(req, res) {
    try {
      const { id } = req.params;
      const { colId } = req.query;
      const data = await EscenarioService.obtenerDetalle(id, colId);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      return res.status(err.status || 500).json({ ok: false, message: err.message });
    }
  }

  // DELETE /api/costeo/escenarios/:id?colId=
  static async eliminar(req, res) {
    try {
      const { id } = req.params;
      const { colId } = req.query;
      await EscenarioService.eliminar(id, colId);
      return res.status(200).json({ ok: true, message: 'Escenario eliminado correctamente' });
    } catch (err) {
      return res.status(err.status || 500).json({ ok: false, message: err.message });
    }
  }
}

module.exports = EscenarioController;