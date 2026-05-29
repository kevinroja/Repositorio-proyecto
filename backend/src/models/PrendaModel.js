const db = require('../config/db');

// Nombre exacto de la FK en tabla material (25 chars, con A antes de _TELA)
const FK_MAT = 'PRENDA_TELA_idPREND_TELA'.replace('PREND_', 'PRENDA_');
// Valor real: PRENDA_TELA_idPREND_TELA → correcto es PRENDA_TELA_idPREND A _TELA
// Definido explícitamente para evitar errores de tipeo:
const FK_MATERIAL = 'PRENDA_TELA_idPREND' + 'A_TELA';  // PRENDA_TELA_idPREND A _TELA

async function obtenerOCrearColeccion(nombreColeccion, temporada = null, año = null) {
  const rows = await db.query(
    'SELECT idCOLECCION FROM coleccion WHERE NombreColeccion = ?',
    [nombreColeccion]
  );
  if (rows.length > 0) return rows[0].idCOLECCION;

  const result = await db.execute(
    'INSERT INTO coleccion (NombreColeccion, Temporada, Año) VALUES (?, ?, ?)',
    [nombreColeccion, temporada ?? null, año ?? null]
  );
  return result.insertId;
}

async function existeReferencia(ref, colId) {
  const rows = await db.query(
    'SELECT idPREND FROM prenda WHERE Referencia = ? AND COLECCION_idCOLECCION = ?',
    [ref, colId]
  );
  return rows.length > 0;
}

async function guardarCompleto(body) {
  const {
    ref, colId, nombreColeccion,
    taller = 0, ttlMat = 0, ttlInsVar = 0, ttlInsFijos = 0, costoTotal = 0,
    materiales = [], insumos = [],
  } = body;

  let coleccionId = colId ? parseInt(colId) : null;
  if (!coleccionId && nombreColeccion) {
    coleccionId = await obtenerOCrearColeccion(nombreColeccion);
  }

  const prendaResult = await db.execute(
    `INSERT INTO prenda
       (Referencia, ttl_materiales, ttl_insumos_var, ttl_insumos_fijos,
        Costo_confeccion, Costo_total, COLECCION_idCOLECCION)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [ref, ttlMat, ttlInsVar, ttlInsFijos, taller, costoTotal, coleccionId]
  );
  const prendaId = prendaResult.insertId;

  for (let i = 0; i < materiales.length; i++) {
    const mat = materiales[i];
    const telaResult = await db.execute(
      `INSERT INTO prenda_tela (Metros, Precio_Unitario, Costo_Total, Orden, PRENDA_idPREND)
       VALUES (?, ?, ?, ?, ?)`,
      [mat.Mts || 0, mat.Precio || 0, (mat.Mts || 0) * (mat.Precio || 0), i + 1, prendaId]
    );
    const telaId = telaResult.insertId;

    await db.execute(
      `INSERT INTO material (Nombre, Tipo, Precio, ${FK_MATERIAL}) VALUES (?, ?, ?, ?)`,
      [mat.Nombre || '', mat.Tipo || null, mat.Precio || 0, telaId]
    );
  }

  for (let i = 0; i < insumos.length; i++) {
    const ins = insumos[i];
    await db.execute(
      `INSERT INTO prenda_insumos_var
         (Cantidad, Precio_unitario, Costo_Total, Orden, PRENDA_INSUMOS_VARcol, PRENDA_idPREND)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ins.cant || 0, ins.precio || 0, (ins.cant || 0) * (ins.precio || 0), i + 1, ins.name || null, prendaId]
    );
  }

  return { prendaId, coleccionId };
}

async function getByColeccion(colId) {
  return db.query(
    'SELECT * FROM prenda WHERE COLECCION_idCOLECCION = ?', [colId]
  );
}

async function getByColeccionConMateriales(colId) {
  const prendas = await db.query(
    'SELECT * FROM prenda WHERE COLECCION_idCOLECCION = ?', [colId]
  );

  for (const prenda of prendas) {
    const telas = await db.query(
      `SELECT pt.*, m.Nombre, m.Tipo, m.Precio
       FROM prenda_tela pt
       LEFT JOIN material m ON m.${FK_MATERIAL} = pt.idPREND_TELA
       WHERE pt.PRENDA_idPREND = ?
       ORDER BY pt.Orden`,
      [prenda.idPREND]
    );

    const insumosVar = await db.query(
      'SELECT * FROM prenda_insumos_var WHERE PRENDA_idPREND = ? ORDER BY Orden',
      [prenda.idPREND]
    );

    prenda.materiales = telas;
    prenda.insumosVar = insumosVar;
  }

  return prendas;
}

module.exports = {
  guardarCompleto, getByColeccion, getByColeccionConMateriales,
  existeReferencia, obtenerOCrearColeccion,
};
