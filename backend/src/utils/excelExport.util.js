/**
 * src/utils/excelExport.util.js
 * Genera y envía un archivo .xlsx REAL como respuesta HTTP.
 * Reemplaza la generación manual de CSV: evita por completo los problemas
 * de delimitador (coma vs punto y coma) según configuración regional de Excel.
 *
 * Uso en un controller:
 *
 *   const { sendAsExcel } = require('../utils/excelExport.util');
 *
 *   exports.getReportePrendas = async (req, res, next) => {
 *     try {
 *       const rows = await reportsService.getPrendas(req.query);
 *       const headers = [
 *         { key: 'referencia',   label: 'Referencia' },
 *         { key: 'coleccion',    label: 'Colección' },
 *         { key: 'temporada',    label: 'Temporada' },
 *         { key: 'anio',         label: 'Año' },
 *         { key: 'materiales',   label: 'Materiales' },
 *         { key: 'insVariable',  label: 'Ins. Variable' },
 *         { key: 'insFijos',     label: 'Ins. Fijos' },
 *         { key: 'confeccion',   label: 'Confección' },
 *         { key: 'costoTotal',   label: 'Costo Total' },
 *         { key: 'precioVenta',  label: 'Precio Venta' },
 *         { key: 'trm',          label: 'TRM' },
 *       ];
 *       await sendAsExcel(res, 'reporte-prendas', headers, rows);
 *     } catch (err) {
 *       next(err);
 *     }
 *   };
 *
 * IMPORTANTE: las keys de `headers` deben coincidir con las propiedades
 * de cada objeto en `rows` (el resultado de tu query SQL, por ejemplo
 * con alias en el SELECT que coincidan, o un .map() previo).
 */

const ExcelJS = require('exceljs');

/**
 * Convierte una key tipo "costoTotal" o "costo_total" en una etiqueta
 * legible tipo "Costo Total". Evita tener que mantener listas de
 * encabezados a mano cuando una query cambia o agrega columnas.
 */
function humanizeKey(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Genera la definición de columnas para sendAsExcel a partir de las
 * keys de la primera fila. Úsalo cuando no quieras hardcodear headers
 * por cada reporte.
 *
 * @param {Object[]} rows
 * @returns {{key: string, label: string}[]}
 */
function autoHeaders(rows) {
  if (!rows || !rows.length) return [];
  return Object.keys(rows[0]).map(key => ({ key, label: humanizeKey(key) }));
}

/**
 * @param {import('express').Response} res
 * @param {string} filename - nombre del archivo SIN extensión
 * @param {{key: string, label: string, width?: number}[]} headers
 * @param {Object[]} rows - filas de datos, cada una un objeto plano
 */
async function sendAsExcel(res, filename, headers, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Reporte');

  // Si no hay datos, evita un archivo sin columnas: muestra un mensaje claro
  if (!headers || !headers.length) {
    sheet.columns = [{ header: 'Mensaje', key: 'mensaje', width: 50 }];
    sheet.addRow({ mensaje: 'No hay resultados para los filtros seleccionados.' });
    sheet.getRow(1).font = { bold: true };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    await workbook.xlsx.write(res);
    return res.end();
  }

  sheet.columns = headers.map(h => ({
    header: h.label,
    key: h.key,
    width: h.width || Math.max(h.label.length + 4, 14),
  }));

  sheet.addRows(rows);

  // Encabezado en negrita
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: 'middle' };

  // Formato numérico para columnas que parecen montos (heurística simple,
  // opcional: ajusta los keys según tus columnas reales de costo/precio)
  const moneyKeys = ['costoTotal', 'precioVenta', 'costo', 'precio', 'trm'];
  headers.forEach((h, idx) => {
    if (moneyKeys.includes(h.key)) {
      sheet.getColumn(idx + 1).numFmt = '#,##0.00';
    }
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { sendAsExcel, autoHeaders };