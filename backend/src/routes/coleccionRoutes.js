// src/routes/coleccionRoutes.js
const express             = require('express');
const router              = express.Router();
const ColeccionController = require('../controllers/ColeccionController');
const { authMiddleware, rolesMiddleware } = require('../middlewares/auth.middleware');
const { checkColeccionPorId } = require('../middlewares/checkColeccionAbierta');

// ── Lectura — todos los roles autenticados ───────────────────────────────────
router.get('/',              authMiddleware, ColeccionController.getAll);
router.get('/:id',           authMiddleware, ColeccionController.getById);
router.get('/:id/prendas',   authMiddleware, ColeccionController.getPrendas);

// ── Crear — sin restricción de año (es una colección nueva) ─────────────────
router.post('/', authMiddleware, rolesMiddleware(1, 4), ColeccionController.crear);

// ── Editar — bloqueado si la colección es de año anterior ───────────────────
router.put('/:id',
  authMiddleware,
  rolesMiddleware(1, 4),
  checkColeccionPorId,          // ← bloquea si Año < año actual
  ColeccionController.actualizar
);

// ── Eliminar — bloqueado si la colección es de año anterior ─────────────────
router.delete('/:id',
  authMiddleware,
  rolesMiddleware(1, 4),
  checkColeccionPorId,          // ← bloquea si Año < año actual
  ColeccionController.eliminar
);

module.exports = router;
