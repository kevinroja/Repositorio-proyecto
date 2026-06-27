// src/routes/prenda.routes.js
const express   = require('express');
const router    = express.Router();
const Prenda    = require('../models/PrendaModel');
const InsFijo   = require('../models/InsumoFijoModel');
const Historial = require('../models/Historial');
const { authMiddleware, rolesMiddleware } = require('../middlewares/auth.middleware');
const {
  checkColeccionPorBody,
  checkColeccionPorPrenda,
} = require('../middlewares/checkColeccionAbierta');

// ── POST /api/prendas/guardar — Guardar prenda completa ─────────────────────
// checkColeccionPorBody verifica req.body.colId antes de permitir el insert
router.post('/guardar',
  authMiddleware,
  rolesMiddleware(1, 4),
  checkColeccionPorBody,        // ← bloquea si colección es de año anterior
  async (req, res) => {
    try {
      const result = await Prenda.guardarCompleto(req.body);

      Historial.registrar({
        tabla:       'prenda',
        registro_id: result.prendaId,
        campo:       'Referencia',
        valor_nuevo: req.body.ref,
        accion:      'INSERT',
        usuario_id:  req.usuario.id,
      });

      res.json({ ok: true, data: result });
    } catch (err) {
      console.error('Error guardando prenda:', err);
      if (err.duplicado) {
        return res.status(409).json({
          ok:          false,
          duplicado:   true,
          idExistente: err.idExistente,
          message:     err.message,
        });
      }
      res.status(500).json({ ok: false, message: err.message });
    }
  }
);

// ── GET /api/prendas/buscar?q= — Buscar por nombre en todas las colecciones ─
router.get('/buscar', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2)
      return res.json({ ok: false, message: 'Escribe al menos 2 caracteres' });
    const data = await Prenda.buscarPorNombre(q.trim());
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── GET /api/prendas?colId= — Prendas de una colección con materiales ───────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { colId } = req.query;
    if (!colId) return res.json({ ok: false, message: 'colId requerido' });
    const data = await Prenda.getByColeccionConMateriales(colId);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── GET /api/prendas/coleccion/:colId — Ruta legacy sin materiales ───────────
router.get('/coleccion/:colId', authMiddleware, async (req, res) => {
  try {
    const data = await Prenda.getByColeccion(req.params.colId);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── PUT /api/prendas/:id — Actualizar prenda completa (upsert) ──────────────
// checkColeccionPorPrenda resuelve la colección a partir del idPREND
router.put('/:id',
  authMiddleware,
  rolesMiddleware(1, 4),
  checkColeccionPorPrenda,      // ← bloquea si colección de la prenda es de año anterior
  async (req, res) => {
    try {
      const result = await Prenda.actualizarCompleto(parseInt(req.params.id), req.body);

      Historial.registrar({
        tabla:       'prenda',
        registro_id: req.params.id,
        campo:       'Referencia',
        valor_nuevo: req.body.ref,
        accion:      'UPDATE',
        usuario_id:  req.usuario.id,
      });

      res.json({ ok: true, message: 'Prenda actualizada', data: result });
    } catch (err) {
      console.error('Error actualizando prenda:', err);
      res.status(500).json({ ok: false, message: err.message });
    }
  }
);

// ── POST /api/prendas/insumos-fijos — Insumos fijos son GLOBALES ─────────────
// No están ligados a una colección → no se bloquean por año
router.post('/insumos-fijos', authMiddleware, rolesMiddleware(1, 4), async (req, res) => {
  try {
    await InsFijo.guardarTodos(req.body.fijos);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── GET /api/prendas/insumos-fijos — Cargar insumos fijos desde BD ──────────
router.get('/insumos-fijos', authMiddleware, async (req, res) => {
  try {
    const data = await InsFijo.getAll();
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── DELETE /api/prendas/:id — Eliminar prenda y sus telas/insumos ───────────
router.delete('/:id',
  authMiddleware,
  rolesMiddleware(1, 4),
  async (req, res) => {
    try {
      const affected = await Prenda.eliminarPrenda(parseInt(req.params.id));
      if (!affected) return res.status(404).json({ ok: false, message: 'Prenda no encontrada' });

      Historial.registrar({
        tabla:       'prenda',
        registro_id: req.params.id,
        campo:       'Referencia',
        valor_nuevo: null,
        accion:      'DELETE',
        usuario_id:  req.usuario.id,
      });

      res.json({ ok: true, message: 'Prenda eliminada' });
    } catch (err) {
      console.error('Error eliminando prenda:', err);
      res.status(500).json({ ok: false, message: err.message });
    }
  }
);


module.exports = router;
