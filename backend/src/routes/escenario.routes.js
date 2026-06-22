const express = require('express');
const router = express.Router();
const EscenarioController = require('../controllers/EscenarioController');
const { authMiddleware, rolesMiddleware } = require('../middlewares/auth.middleware');

// Lectura — accesible para los 4 roles autenticados (incluye Consulta)
router.get('/', authMiddleware, EscenarioController.listar);
router.get('/:id', authMiddleware, EscenarioController.detalle);

// Escritura — solo Costeo (2) y Administrador (4)
router.post('/', authMiddleware, rolesMiddleware(2, 4), EscenarioController.guardar);
router.delete('/:id', authMiddleware, rolesMiddleware(2, 4), EscenarioController.eliminar);

module.exports = router;