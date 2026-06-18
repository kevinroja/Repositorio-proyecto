// reports.routes.js — Kika Sistema de Reportes
// Agregar en app.js: const reportsRoutes = require('./src/routes/reports.routes');
//                    app.use('/api/reportes', authMiddleware, reportsRoutes);

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/reports.controller');

// Filtros para los selects del frontend
router.get('/filtros',        (req, res) => ctrl.filtros(req, res));

// Reportes principales
router.get('/colecciones',    (req, res) => ctrl.colecciones(req, res));
router.get('/prendas',        (req, res) => ctrl.prendas(req, res));
router.get('/materiales',     (req, res) => ctrl.materiales(req, res));
router.get('/precios-canal',  (req, res) => ctrl.preciosCanal(req, res));
router.get('/historial',      (req, res) => ctrl.historial(req, res));

module.exports = router;
