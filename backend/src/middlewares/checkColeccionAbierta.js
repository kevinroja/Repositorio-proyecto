// src/middlewares/checkColeccionAbierta.js
// Bloquea cualquier modificación sobre una colección de año anterior al actual.
// La regla: coleccion.Año < YEAR_ACTUAL → bloqueada (solo lectura).
//
// Uso en rutas:
//   - Rutas de colección: idCOLECCION viene en req.params.id
//   - Rutas de prenda:    idCOLECCION se obtiene leyendo la prenda por req.params.id
//                         o desde req.body.colId / req.query.colId

const db = require('../config/db');

// ── Helper: obtiene el año de una colección por su ID ────────────────────────
async function getAñoColeccion(idCOLECCION) {
  const rows = await db.query(
    `SELECT Año FROM coleccion WHERE idCOLECCION = ?`,
    [idCOLECCION]
  );
  return rows[0]?.Año ?? null;
}

// ── Helper: obtiene el idCOLECCION de una prenda por su ID ──────────────────
async function getColeccionDeprenda(idPREND) {
  const rows = await db.query(
    `SELECT COLECCION_idCOLECCION FROM prenda WHERE idPREND = ?`,
    [idPREND]
  );
  return rows[0]?.COLECCION_idCOLECCION ?? null;
}

// ── Respuesta estándar de bloqueo ────────────────────────────────────────────
function respuestaBloqueada(res, año) {
  return res.status(403).json({
    ok: false,
    bloqueada: true,
    message: `La colección del año ${año} está cerrada y no admite modificaciones.`,
  });
}

// ── MIDDLEWARE 1: para rutas de colección (:id = idCOLECCION) ───────────────
// Usar en: PUT /api/colecciones/:id  |  DELETE /api/colecciones/:id
async function checkColeccionPorId(req, res, next) {
  try {
    const idCOLECCION = req.params.id;
    const año = await getAñoColeccion(idCOLECCION);

    if (año === null) {
      return res.status(404).json({ ok: false, message: 'Colección no encontrada.' });
    }

    const añoActual = new Date().getFullYear();
    if (año < añoActual) {
      return respuestaBloqueada(res, año);
    }

    // Adjuntar al request para no repetir la consulta en el controller
    req.coleccionAño = año;
    next();
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
}

// ── MIDDLEWARE 2: para rutas de prenda (:id = idPREND) ──────────────────────
// Usar en: PUT /api/prendas/:id
async function checkColeccionPorPrenda(req, res, next) {
  try {
    const idPREND = req.params.id;
    const idCOLECCION = await getColeccionDeprenda(idPREND);

    if (idCOLECCION === null) {
      return res.status(404).json({ ok: false, message: 'Prenda no encontrada.' });
    }

    const año = await getAñoColeccion(idCOLECCION);
    const añoActual = new Date().getFullYear();

    if (año < añoActual) {
      return respuestaBloqueada(res, año);
    }

    req.coleccionAño = año;
    next();
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
}

// ── MIDDLEWARE 3: para POST /api/prendas/guardar (colId en el body) ──────────
// Usar en: POST /api/prendas/guardar  |  POST /api/prendas/insumos-fijos
async function checkColeccionPorBody(req, res, next) {
  try {
    // El body puede traer colId (guardar prenda) — insumos fijos son globales,
    // no están ligados a una colección, así que si no hay colId se deja pasar.
    const idCOLECCION = req.body.colId;
    if (!idCOLECCION) return next();

    const año = await getAñoColeccion(idCOLECCION);
    if (año === null) {
      return res.status(404).json({ ok: false, message: 'Colección no encontrada.' });
    }

    const añoActual = new Date().getFullYear();
    if (año < añoActual) {
      return respuestaBloqueada(res, año);
    }

    req.coleccionAño = año;
    next();
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
}

module.exports = {
  checkColeccionPorId,
  checkColeccionPorPrenda,
  checkColeccionPorBody,
};
