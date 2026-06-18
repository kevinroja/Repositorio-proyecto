// reports.controller.js — Kika Sistema de Reportes

const reportsService = require('../services/reports.service');
const { sendAsExcel, autoHeaders } = require('../utils/excelExport.util');

class ReportsController {

  // GET /api/reportes/colecciones
  async colecciones(req, res) {
    try {
      const { año, temporada } = req.query;
      const data = await reportsService.getColeccionesReport({ año, temporada });
      if (req.query.export === 'excel') {
        return await sendAsExcel(res, 'reporte-colecciones', autoHeaders(data), data);
      }
      res.json({ ok: true, data });
    } catch (err) {
      console.error('[REPORTE colecciones]', err);
      res.status(500).json({ ok: false, message: 'Error generando reporte de colecciones' });
    }
  }

  // GET /api/reportes/prendas
  async prendas(req, res) {
    try {
      const { coleccion_id, referencia } = req.query;
      const data = await reportsService.getPrendasReport({ coleccion_id, referencia });
      if (req.query.export === 'excel') {
        return await sendAsExcel(res, 'reporte-prendas', autoHeaders(data), data);
      }
      res.json({ ok: true, data });
    } catch (err) {
      console.error('[REPORTE prendas]', err);
      res.status(500).json({ ok: false, message: 'Error generando reporte de prendas' });
    }
  }

  // GET /api/reportes/materiales
  async materiales(req, res) {
    try {
      const { tipo, proveedor_id } = req.query;
      const data = await reportsService.getMaterialesReport({ tipo, proveedor_id });
      if (req.query.export === 'excel') {
        return await sendAsExcel(res, 'reporte-materiales', autoHeaders(data), data);
      }
      res.json({ ok: true, data });
    } catch (err) {
      console.error('[REPORTE materiales]', err);
      res.status(500).json({ ok: false, message: 'Error generando reporte de materiales' });
    }
  }

  // GET /api/reportes/precios-canal
  async preciosCanal(req, res) {
    try {
      const { coleccion_id, canal_id } = req.query;
      const data = await reportsService.getPreciosCanalReport({ coleccion_id, canal_id });
      if (req.query.export === 'excel') {
        return await sendAsExcel(res, 'reporte-precios-canal', autoHeaders(data), data);
      }
      res.json({ ok: true, data });
    } catch (err) {
      console.error('[REPORTE precios-canal]', err);
      res.status(500).json({ ok: false, message: 'Error generando reporte de precios por canal' });
    }
  }

  // GET /api/reportes/historial
  async historial(req, res) {
    try {
      const { tabla, accion, usuario_id, desde, hasta } = req.query;
      const data = await reportsService.getHistorialReport({ tabla, accion, usuario_id, desde, hasta });
      if (req.query.export === 'excel') {
        return await sendAsExcel(res, 'reporte-historial', autoHeaders(data), data);
      }
      res.json({ ok: true, data });
    } catch (err) {
      console.error('[REPORTE historial]', err);
      res.status(500).json({ ok: false, message: 'Error generando reporte de historial' });
    }
  }

  // GET /api/reportes/filtros — devuelve todas las listas para los selects
  async filtros(req, res) {
    try {
      const [colecciones, canales, proveedores, años, temporadas] = await Promise.all([
        reportsService.getColeccionesLista(),
        reportsService.getCanalesLista(),
        reportsService.getProveedoresLista(),
        reportsService.getAñosLista(),
        reportsService.getTemporadasLista(),
      ]);
      res.json({ ok: true, colecciones, canales, proveedores, años, temporadas });
    } catch (err) {
      console.error('[REPORTE filtros]', err);
      res.status(500).json({ ok: false, message: 'Error cargando filtros' });
    }
  }
}

module.exports = new ReportsController();