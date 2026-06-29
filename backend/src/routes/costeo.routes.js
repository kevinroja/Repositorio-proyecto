/**
 * costeo.routes.js
 * Rutas para el módulo de Costeo (escenarios).
 *
 * Montado en app.js con authMiddleware:
 *   app.use('/api/costeo', authMiddleware, costeoRoutes);
 *
 * Endpoints:
 *   GET    /api/costeo/escenarios?colId=X     → lista escenarios
 *   POST   /api/costeo/escenarios             → guarda nuevo escenario
 *   GET    /api/costeo/escenarios/:id?colId=X → carga parámetros
 *   PUT    /api/costeo/escenarios/:id         → actualiza nombre
 *   DELETE /api/costeo/escenarios/:id?colId=X → elimina escenario
 */

console.log('🟢 COSTEO.ROUTES.JS SE CARGÓ CORRECTAMENTE');
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/costoPrenda.controller');

function soloRolCosteo(req, res, next) {
  const rol = req.usuario?.rol;
  if (rol === 2 || rol === 4) return next();
  return res.status(403).json({
    ok:      false,
    message: 'Solo Costeo y Administrador pueden acceder a este módulo',
  });
}

router.get   ('/escenarios',     soloRolCosteo, ctrl.listarEscenarios);
router.post  ('/escenarios',     soloRolCosteo, ctrl.guardarEscenario);
router.get   ('/escenarios/:id', soloRolCosteo, ctrl.cargarEscenario);
router.put   ('/escenarios/:id', soloRolCosteo, ctrl.actualizarNombre);
router.delete('/escenarios/:id', soloRolCosteo, ctrl.eliminarEscenario);
router.get   ('/ping', (req, res) => res.json({ ok: true, ping: 'pong' }));

module.exports = router;
