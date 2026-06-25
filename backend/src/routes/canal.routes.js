const express = require('express');
const router  = express.Router();
const Canal   = require('../models/CanalModel');
const { authMiddleware, rolesMiddleware } = require('../middlewares/auth.middleware');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const data = await Canal.getAll();
    res.json({ ok: true, data });
  } catch (err) {
    console.error('[Canal GET] ERROR:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

router.post('/', authMiddleware, rolesMiddleware(2, 4), async (req, res) => {
  try {
    const { Nombre, Codigo } = req.body;
    console.log('[Canal POST] body:', req.body);
    if (!Nombre) return res.status(400).json({ ok: false, message: 'Nombre es requerido' });
    const insertId = await Canal.crear({ Nombre, Codigo });
    res.status(201).json({ ok: true, data: { idCanal: insertId, Nombre, Codigo } });
  } catch (err) {
    console.error('[Canal POST] ERROR:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

router.post('/guardar', authMiddleware, rolesMiddleware(2, 4), async (req, res) => {
  try {
    await Canal.guardarTodos(req.body.canales);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Canal GUARDAR] ERROR:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

router.put('/:id', authMiddleware, rolesMiddleware(2, 4), async (req, res) => {
  try {
    const { id } = req.params;
    const { Nombre, Codigo } = req.body;
    if (!Nombre) return res.status(400).json({ ok: false, message: 'Nombre es requerido' });
    await Canal.actualizar(id, { Nombre, Codigo });
    res.json({ ok: true, message: 'Canal actualizado' });
  } catch (err) {
    console.error('[Canal PUT] ERROR:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

router.delete('/:id', authMiddleware, rolesMiddleware(4), async (req, res) => {
  try {
    const { id } = req.params;
    await Canal.eliminar(id);
    res.json({ ok: true, message: 'Canal eliminado' });
  } catch (err) {
    console.error('[Canal DELETE] ERROR:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
