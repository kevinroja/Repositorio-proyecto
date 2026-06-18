const express = require('express');
const router  = express.Router();
const HistorialController = require('../controllers/HistorialController');
const { authMiddleware }  = require('../middlewares/auth.middleware');

// Solo lectura — accesible para los 4 roles autenticados
router.get('/', authMiddleware, HistorialController.getAll);

module.exports = router;