// reports.service.js — Kika Sistema de Reportes
// Todas las queries usan la estructura real verificada de gestion_costos

const db = require('../config/db');

class ReportsService {

  // ─── REPORTE 1: Colecciones con conteo de prendas y costos ───────────────
  async getColeccionesReport({ año, temporada } = {}) {
    let where = 'WHERE 1=1';
    const params = [];

    if (año) { where += ' AND c.Año = ?'; params.push(año); }
    if (temporada) { where += ' AND c.Temporada = ?'; params.push(temporada); }

    const query = `
      SELECT
        c.idCOLECCION,
        c.NombreColeccion,
        c.Temporada,
        c.Año,
        COUNT(p.idPREND)                        AS total_prendas,
        COALESCE(SUM(p.ttl_materiales), 0)      AS suma_materiales,
        COALESCE(SUM(p.ttl_insumos_var), 0)     AS suma_insumos_var,
        COALESCE(SUM(p.ttl_insumos_fijos), 0)   AS suma_insumos_fijos,
        COALESCE(SUM(p.Costo_confeccion), 0)    AS suma_confeccion,
        COALESCE(SUM(p.Costo_total), 0)         AS suma_costo_total
      FROM coleccion c
      LEFT JOIN prenda p ON p.COLECCION_idCOLECCION = c.idCOLECCION
      ${where}
      GROUP BY c.idCOLECCION
      ORDER BY c.Año DESC, c.Temporada ASC
    `;
    return db.query(query, params);
  }

  // ─── REPORTE 2: Detalle de prendas por colección ──────────────────────────
  async getPrendasReport({ coleccion_id, referencia } = {}) {
    let where = 'WHERE 1=1';
    const params = [];

    if (coleccion_id) { where += ' AND p.COLECCION_idCOLECCION = ?'; params.push(coleccion_id); }
    if (referencia)   { where += ' AND p.Referencia LIKE ?'; params.push(`%${referencia}%`); }

    const query = `
      SELECT
        p.idPREND,
        p.Referencia,
        c.NombreColeccion,
        c.Temporada,
        c.Año,
        p.ttl_materiales,
        p.ttl_insumos_var,
        p.ttl_insumos_fijos,
        p.Costo_confeccion,
        p.Costo_total,
        cp.precio_venta_final,
        cp.trm,
        cp.kv_markup,
        cp.margen_extra
      FROM prenda p
      INNER JOIN coleccion c ON c.idCOLECCION = p.COLECCION_idCOLECCION
      LEFT JOIN costo_prenda cp ON cp.PRENDA_idPREND = p.idPREND
      ${where}
      ORDER BY c.Año DESC, c.NombreColeccion, p.Referencia
    `;
    return db.query(query, params);
  }

  // ─── REPORTE 3: Materiales — uso y costo por proveedor ───────────────────
  async getMaterialesReport({ tipo, proveedor_id } = {}) {
    let where = 'WHERE 1=1';
    const params = [];

    if (tipo)        { where += ' AND m.Tipo = ?'; params.push(tipo); }
    if (proveedor_id){ where += ' AND m.PROVEEDOR_idPROVEEDOR = ?'; params.push(proveedor_id); }

    const query = `
      SELECT
        MIN(m.idMATERIAL)                       AS idMATERIAL,
        m.Nombre                                AS material,
        MAX(m.Tipo)                             AS Tipo,
        MAX(m.Unidad)                           AS Unidad,
        AVG(m.Precio_Unitario)                  AS Precio_Unitario,
        MAX(pr.Nombre)                          AS proveedor,
        MAX(pr.Contacto)                        AS Contacto,
        MAX(pr.Telefono)                        AS Telefono,
        COUNT(DISTINCT m.idMATERIAL)            AS variantes_duplicadas,
        COUNT(DISTINCT pt.PRENDA_idPREND)       AS usado_en_telas,
        COUNT(DISTINCT piv.PRENDA_idPREND)      AS usado_en_insumos,
        COALESCE(SUM(pt.Metros), 0)             AS total_metros_usados,
        COALESCE(SUM(pt.Costo_Total), 0)        AS costo_total_telas,
        COALESCE(SUM(piv.Costo_Total), 0)       AS costo_total_insumos
      FROM material m
      LEFT JOIN proveedor pr ON pr.idPROVEEDOR = m.PROVEEDOR_idPROVEEDOR
      LEFT JOIN prenda_tela pt ON pt.MATERIAL_idMATERIAL = m.idMATERIAL
      LEFT JOIN prenda_insumos_var piv ON piv.MATERIAL_idMATERIAL = m.idMATERIAL
      ${where}
      GROUP BY m.Nombre
      ORDER BY MAX(m.Tipo), m.Nombre
    `;
    return db.query(query, params);
  }

  // ─── REPORTE 4: Precios por canal de venta ────────────────────────────────
  async getPreciosCanalReport({ coleccion_id, canal_id } = {}) {
    let where = 'WHERE 1=1';
    const params = [];

    if (coleccion_id) { where += ' AND p.COLECCION_idCOLECCION = ?'; params.push(coleccion_id); }
    if (canal_id)     { where += ' AND cv.idCanal = ?'; params.push(canal_id); }

    const query = `
      SELECT
        p.Referencia,
        c.NombreColeccion,
        c.Temporada,
        cv.Nombre                         AS canal,
        cv.Codigo                         AS canal_codigo,
        pc.Kv_markup,
        pc.Ajuste_USD,
        pc.Margen_extra,
        pc.Sub_total1,
        pc.Sub_total2,
        pc.Precio_venta_cop,
        pc.Precio_venta_USD,
        cp.trm
      FROM precio_canal pc
      INNER JOIN costo_prenda cp  ON cp.idCOSTO_PRENDA = pc.COSTO_PRENDA_idCOSTO_PRENDA
      INNER JOIN prenda p         ON p.idPREND = cp.PRENDA_idPREND
      INNER JOIN coleccion c      ON c.idCOLECCION = p.COLECCION_idCOLECCION
      LEFT  JOIN canal_venta cv   ON cv.idCanal = pc.Canal_Venta_idCanal
      ${where}
      ORDER BY c.NombreColeccion, p.Referencia, cv.Nombre
    `;
    return db.query(query, params);
  }

  // ─── REPORTE 5: Historial de auditoría ────────────────────────────────────
  async getHistorialReport({ tabla, accion, usuario_id, desde, hasta } = {}) {
    let where = 'WHERE 1=1';
    const params = [];

    if (tabla)      { where += ' AND h.Tabla_afectada = ?'; params.push(tabla); }
    if (accion)     { where += ' AND h.Accion = ?'; params.push(accion); }
    if (usuario_id) { where += ' AND h.Usuario_id = ?'; params.push(usuario_id); }
    if (desde)      { where += ' AND h.Fecha >= ?'; params.push(desde); }
    if (hasta)      { where += ' AND h.Fecha <= ?'; params.push(hasta); }

    const query = `
      SELECT
        h.idHISTORIAL,
        h.Tabla_afectada,
        h.Registro_id,
        h.Campo,
        h.Valor_anterior,
        h.Valor_nuevo,
        h.Accion,
        h.Fecha,
        u.Nombre   AS usuario,
        u.Email    AS email_usuario
      FROM historial h
      LEFT JOIN usuario u ON u.idUSUARIO = h.Usuario_id
      ${where}
      ORDER BY h.Fecha DESC
      LIMIT 500
    `;
    return db.query(query, params);
  }

  // ─── HELPERS: listas para filtros ─────────────────────────────────────────
  async getColeccionesLista() {
    return db.query('SELECT idCOLECCION, NombreColeccion, Temporada, Año FROM coleccion ORDER BY Año DESC, NombreColeccion');
  }

  async getCanalesLista() {
    return db.query('SELECT idCanal, Nombre, Codigo FROM canal_venta ORDER BY Nombre');
  }

  async getProveedoresLista() {
    return db.query('SELECT idPROVEEDOR, Nombre FROM proveedor ORDER BY Nombre');
  }

  async getAñosLista() {
    return db.query('SELECT DISTINCT Año FROM coleccion ORDER BY Año DESC');
  }

  async getTemporadasLista() {
    return db.query('SELECT DISTINCT Temporada FROM coleccion ORDER BY Temporada');
  }
}

module.exports = new ReportsService();