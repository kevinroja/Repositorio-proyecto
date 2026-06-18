/**
 * costeo.routes.js
 * Rutas para el módulo de Costeo (escenarios de costo_prenda).
 *
 * Ya montado en app.js con authMiddleware:
 *   app.use('/api/costeo', authMiddleware, costeoRoutes);
 *
 * Endpoints:
 *   GET    /api/costeo/escenarios?colId=X     → lista escenarios
 *   POST   /api/costeo/escenarios             → guarda nuevo escenario
 *   GET    /api/costeo/escenarios/:id?colId=X → carga parámetros
 *   DELETE /api/costeo/escenarios/:id?colId=X → elimina escenario
 */

console.log('🟢 COSTEO.ROUTES.JS SE CARGÓ CORRECTAMENTE');
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/costoPrenda.controller');

// Solo roles 2 (Costeo) y 4 (Administrador) pueden operar escenarios.
// El middleware auth.middleware guarda el usuario decodificado en req.usuario
function soloRolCosteo(req, res, next) {
  const rol = req.usuario?.rol;   // ← req.usuario (no req.user)
  if (rol === 2 || rol === 4) return next();
  return res.status(403).json({
    ok:      false,
    message: 'Solo Costeo y Administrador pueden acceder a este módulo',
  });
}

router.get   ('/escenarios',     soloRolCosteo, ctrl.listarEscenarios);
router.post  ('/escenarios',     soloRolCosteo, ctrl.guardarEscenario);
router.get   ('/escenarios/:id', soloRolCosteo, ctrl.cargarEscenario);
router.delete('/escenarios/:id', soloRolCosteo, ctrl.eliminarEscenario);
router.get('/ping', (req, res) => res.json({ ok: true, ping: 'pong' }));

module.exports = router;