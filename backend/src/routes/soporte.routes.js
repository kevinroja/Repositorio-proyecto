const express  = require('express');
const router   = express.Router();
const Soporte  = require('../models/SoporteModel');
const { authMiddleware, rolesMiddleware } = require('../middlewares/auth.middleware');

// Crear ticket (cualquier usuario autenticado)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { modulo, descripcion, prioridad } = req.body;
    if (!descripcion?.trim())
      return res.status(400).json({ ok: false, message: 'La descripción es requerida' });

    const id = await Soporte.crear({
      modulo, descripcion, prioridad,
      usuarioId: req.usuario.id
    });
    res.json({ ok: true, data: { idSOPORTE: id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Mis tickets (usuario autenticado)
router.get('/mis-tickets', authMiddleware, async (req, res) => {
  try {
    const data = await Soporte.getMisTickets(req.usuario.id);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Todos los tickets (solo admin)
router.get('/', authMiddleware, rolesMiddleware(4), async (req, res) => {
  try {
    const data = await Soporte.getAll();
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Cambiar estado — Resuelto elimina el ticket
router.put('/:id/estado', authMiddleware, rolesMiddleware(4), async (req, res) => {
  try {
    const { estado } = req.body;
    const validos = ['Pendiente', 'En proceso', 'Resuelto'];
    if (!validos.includes(estado))
      return res.status(400).json({ ok: false, message: 'Estado inválido' });

    const result = await Soporte.cambiarEstado(+req.params.id, estado);
    res.json({
      ok: true,
      message: result.eliminado
        ? 'Ticket resuelto y eliminado'
        : `Estado actualizado a "${estado}"`
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
