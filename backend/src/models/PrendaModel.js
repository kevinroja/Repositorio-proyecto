const db = require('../config/db');

// ── Colección ─────────────────────────────────────────────────────────
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

// ── Verificar duplicado ref+coleccion ─────────────────────────────────
async function existeReferencia(ref, colId) {
  const rows = await db.query(
    'SELECT idPREND FROM prenda WHERE Referencia = ? AND COLECCION_idCOLECCION = ?',
    [ref, colId]
  );
  return rows.length > 0;
}

// ── Buscar o crear material en el catálogo ────────────────────────────
async function obtenerOCrearMaterial(nombre, tipo = 'Tela', precio = 0) {
  if (!nombre) return null;
  const rows = await db.query(
    'SELECT idMATERIAL FROM material WHERE Nombre = ? AND Tipo = ?',
    [nombre, tipo]
  );
  if (rows.length > 0) return rows[0].idMATERIAL;

  const result = await db.execute(
    'INSERT INTO material (Nombre, Tipo, Precio_Unitario) VALUES (?, ?, ?)',
    [nombre, tipo, precio || 0]
  );
  return result.insertId;
}

// ── Guardar prenda completa (POST) ────────────────────────────────────
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

  // Verificar duplicado: misma referencia en la misma colección
  if (coleccionId) {
    const dup = await db.query(
      'SELECT idPREND FROM prenda WHERE Referencia = ? AND COLECCION_idCOLECCION = ?',
      [ref, coleccionId]
    );
    if (dup.length > 0) {
      const dupErr = new Error(`La referencia "${ref}" ya existe en esta colección`);
      dupErr.duplicado  = true;
      dupErr.idExistente = dup[0].idPREND;
      throw dupErr;
    }
  }

  // Insertar prenda
  const prendaResult = await db.execute(
    `INSERT INTO prenda
       (Referencia, ttl_materiales, ttl_insumos_var, ttl_insumos_fijos,
        Costo_confeccion, Costo_total, COLECCION_idCOLECCION)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [ref, ttlMat, ttlInsVar, ttlInsFijos, taller, costoTotal, coleccionId]
  );
  const prendaId = prendaResult.insertId;

  // Insertar telas → prenda_tela con FK a material
  for (let i = 0; i < materiales.length; i++) {
    const mat = materiales[i];
    if (!mat.Nombre && !mat.Mts && !mat.Precio) continue;

    // Buscar o crear el material en el catálogo
    const materialId = await obtenerOCrearMaterial(
      mat.Nombre || null,
      'Tela',
      mat.Precio || 0
    );

    await db.execute(
      `INSERT INTO prenda_tela
         (Metros, Precio_Unitario, Costo_Total, Orden, PRENDA_idPREND, MATERIAL_idMATERIAL)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        mat.Mts    || 0,
        mat.Precio || 0,
        (mat.Mts || 0) * (mat.Precio || 0),
        i + 1,
        prendaId,
        materialId
      ]
    );
  }

  // Insertar insumos variables → prenda_insumos_var con FK a material
  for (let i = 0; i < insumos.length; i++) {
    const ins = insumos[i];
    if (!ins.name && !ins.cant && !ins.precio) continue;

    const materialId = await obtenerOCrearMaterial(
      ins.name || null,
      'Insumo',
      ins.precio || 0
    );

    await db.execute(
      `INSERT INTO prenda_insumos_var
         (PRENDA_INSUMOS_VARcol, Cantidad, Precio_unitario, Costo_Total,
          Orden, PRENDA_idPREND, MATERIAL_idMATERIAL)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        ins.name   || null,
        ins.cant   || 0,
        ins.precio || 0,
        (ins.cant || 0) * (ins.precio || 0),
        i + 1,
        prendaId,
        materialId
      ]
    );
  }

  return { prendaId, coleccionId };
}

// ── Actualizar prenda completa (PUT) ──────────────────────────────────
async function actualizarCompleto(prendaId, body) {
  const {
    ref,
    taller = 0, ttlMat = 0, ttlInsVar = 0, ttlInsFijos = 0, costoTotal = 0,
    materiales = [], insumos = [],
  } = body;

  // Actualizar prenda incluyendo Referencia
  await db.execute(
    `UPDATE prenda SET
       Referencia        = ?,
       ttl_materiales    = ?,
       ttl_insumos_var   = ?,
       ttl_insumos_fijos = ?,
       Costo_confeccion  = ?,
       Costo_total       = ?
     WHERE idPREND = ?`,
    [ref || null, ttlMat, ttlInsVar, ttlInsFijos, taller, costoTotal, prendaId]
  );

  // Borrar telas e insumos existentes y re-insertar
  await db.execute('DELETE FROM prenda_tela WHERE PRENDA_idPREND = ?', [prendaId]);
  await db.execute('DELETE FROM prenda_insumos_var WHERE PRENDA_idPREND = ?', [prendaId]);

  for (let i = 0; i < materiales.length; i++) {
    const mat = materiales[i];
    if (!mat.Nombre && !mat.Mts && !mat.Precio) continue;

    const materialId = await obtenerOCrearMaterial(
      mat.Nombre || null, 'Tela', mat.Precio || 0
    );

    await db.execute(
      `INSERT INTO prenda_tela
         (Metros, Precio_Unitario, Costo_Total, Orden, PRENDA_idPREND, MATERIAL_idMATERIAL)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [mat.Mts || 0, mat.Precio || 0, (mat.Mts || 0) * (mat.Precio || 0), i + 1, prendaId, materialId]
    );
  }

  for (let i = 0; i < insumos.length; i++) {
    const ins = insumos[i];
    if (!ins.name && !ins.cant && !ins.precio) continue;

    const materialId = await obtenerOCrearMaterial(
      ins.name || null, 'Insumo', ins.precio || 0
    );

    await db.execute(
      `INSERT INTO prenda_insumos_var
         (PRENDA_INSUMOS_VARcol, Cantidad, Precio_unitario, Costo_Total,
          Orden, PRENDA_idPREND, MATERIAL_idMATERIAL)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [ins.name || null, ins.cant || 0, ins.precio || 0,
       (ins.cant || 0) * (ins.precio || 0), i + 1, prendaId, materialId]
    );
  }

  return { prendaId };
}

// ── Consultas ─────────────────────────────────────────────────────────
async function getByColeccion(colId) {
  return db.query(
    'SELECT * FROM prenda WHERE COLECCION_idCOLECCION = ?', [colId]
  );
}

async function getByColeccionConMateriales(colId) {
  const prendas = await db.query(
    `SELECT p.*, c.NombreColeccion, c.Temporada, c.Año
     FROM prenda p
     LEFT JOIN coleccion c ON c.idCOLECCION = p.COLECCION_idCOLECCION
     WHERE p.COLECCION_idCOLECCION = ?
     ORDER BY p.idPREND`,
    [colId]
  );

  for (const prenda of prendas) {
    // JOIN correcto: prenda_tela.MATERIAL_idMATERIAL → material.idMATERIAL
    prenda.materiales = await db.query(
      `SELECT pt.idPREND_TELA, pt.Metros, pt.Precio_Unitario AS Precio_Unitario,
              pt.Costo_Total, pt.Orden,
              m.idMATERIAL, m.Nombre, m.Tipo,
              m.Precio_Unitario AS PrecioCatalogo
       FROM prenda_tela pt
       LEFT JOIN material m ON m.idMATERIAL = pt.MATERIAL_idMATERIAL
       WHERE pt.PRENDA_idPREND = ?
       ORDER BY pt.Orden`,
      [prenda.idPREND]
    );

    prenda.insumosVar = await db.query(
      `SELECT iv.idPREND_INSUMOS_VAR, iv.PRENDA_INSUMOS_VARcol,
              iv.Cantidad, iv.Precio_unitario, iv.Costo_Total, iv.Orden,
              m.Nombre AS NombreMaterial
       FROM prenda_insumos_var iv
       LEFT JOIN material m ON m.idMATERIAL = iv.MATERIAL_idMATERIAL
       WHERE iv.PRENDA_idPREND = ?
       ORDER BY iv.Orden`,
      [prenda.idPREND]
    );
  }

  return prendas;
}

async function buscarPorNombre(q) {
  const prendas = await db.query(
    `SELECT p.*, c.NombreColeccion, c.Temporada, c.Año
     FROM prenda p
     LEFT JOIN coleccion c ON c.idCOLECCION = p.COLECCION_idCOLECCION
     WHERE p.Referencia LIKE ?
     ORDER BY p.idPREND DESC`,
    [`%${q}%`]
  );

  for (const prenda of prendas) {
    prenda.materiales = await db.query(
      `SELECT pt.idPREND_TELA, pt.Metros, pt.Precio_Unitario AS Precio_Unitario,
              pt.Costo_Total, pt.Orden,
              m.idMATERIAL, m.Nombre, m.Tipo,
              m.Precio_Unitario AS PrecioCatalogo
       FROM prenda_tela pt
       LEFT JOIN material m ON m.idMATERIAL = pt.MATERIAL_idMATERIAL
       WHERE pt.PRENDA_idPREND = ?
       ORDER BY pt.Orden`,
      [prenda.idPREND]
    );

    prenda.insumosVar = await db.query(
      `SELECT iv.idPREND_INSUMOS_VAR, iv.PRENDA_INSUMOS_VARcol,
              iv.Cantidad, iv.Precio_unitario, iv.Costo_Total, iv.Orden,
              m.Nombre AS NombreMaterial
       FROM prenda_insumos_var iv
       LEFT JOIN material m ON m.idMATERIAL = iv.MATERIAL_idMATERIAL
       WHERE iv.PRENDA_idPREND = ?
       ORDER BY iv.Orden`,
      [prenda.idPREND]
    );
  }

  return prendas;
}

// ── Eliminar prenda completa (CASCADE borra prenda_tela e prenda_insumos_var) ─
async function eliminarPrenda(id) {
  const result = await db.execute(
    'DELETE FROM prenda WHERE idPREND = ?', [id]
  );
  return result.affectedRows;
}

module.exports = {
  guardarCompleto,
  actualizarCompleto,
  getByColeccion,
  getByColeccionConMateriales,
  existeReferencia,
  obtenerOCrearColeccion,
  obtenerOCrearMaterial,
  buscarPorNombre,
  eliminarPrenda,
};