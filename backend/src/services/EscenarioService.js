const Escenario = require('../models/Escenario');

function errorConStatus(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

class EscenarioService {
  static async guardar({ colId, params = {}, prendas = [], usuarioId }) {
    if (!colId) throw errorConStatus('colId es requerido', 400);
    if (!prendas.length) throw errorConStatus('No hay prendas para guardar en el escenario', 400);

    const nombre = `Escenario ${new Date().toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })}`;

    const idEscenario = await Escenario.crearConPrendas({ nombre, params, colId, usuarioId, prendas });
    return { idEscenario, nombre };
  }

  static async listar(colId) {
    if (!colId) throw errorConStatus('colId es requerido', 400);
    const rows = await Escenario.getByColeccion(colId);
    return rows.map((r) => ({
      idRepresentativo: r.idESCENARIO,
      nombre: r.nombre,
      fecha: r.fecha,
      trm: r.trm,
      kv_markup: r.kv_markup,
      exportacion_pct: r.exportacion_pct,
      aranceles_pct: r.aranceles_pct,
      total_prendas: r.total_prendas,
    }));
  }

  static async obtenerDetalle(idEscenario, colId) {
    if (!colId) throw errorConStatus('colId es requerido', 400);
    const esc = await Escenario.getByIdAndColeccion(idEscenario, colId);
    if (!esc) throw errorConStatus('Escenario no encontrado para esta colección', 404);

    const prendasRows = await Escenario.getPrendas(idEscenario);

    return {
      params: {
        trm: esc.trm,
        kvMarkup: esc.kv_markup,
        exportacionPct: esc.exportacion_pct,
        arancelesPct: esc.aranceles_pct,
        amerindias: esc.amerindias,
        factoring: esc.factoring,
        pct10eleven: esc.pct_10eleven,
        imprevistos: esc.imprevistos,
        costoFinancieroIva: esc.costo_financiero_iva,
        seguroAnualCop: esc.seguro_anual_cop,
        nPrendas: esc.n_prendas,
      },
      prendas: prendasRows.map((p) => ({
        prendaId: p.PRENDA_idPREND,
        ajusteUsd: p.ajuste_usd,
        margenExtra: p.margen_extra,
        costoTaller: p.costo_taller,
        precioVentaFinal: p.precio_venta_final,
      })),
    };
  }

  static async eliminar(idEscenario, colId) {
    if (!colId) throw errorConStatus('colId es requerido', 400);
    const affected = await Escenario.deleteByIdAndColeccion(idEscenario, colId);
    if (!affected) throw errorConStatus('Escenario no encontrado para esta colección', 404);
    return true;
  }
}

module.exports = EscenarioService;