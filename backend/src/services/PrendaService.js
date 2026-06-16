const PrendaModel = require('../models/PrendaModel');

// ── PrendaService ─────────────────────────────────────────────────────
// Capa de negocio entre el controller/route y el model.
// Valida datos antes de delegar al model.

class PrendaService {

  static async guardar(data) {
    const { ref, colId } = data;
    if (!ref)   throw new Error('La referencia es obligatoria');
    if (!colId) throw new Error('La colección es obligatoria');
    return PrendaModel.guardarCompleto(data);
  }

  static async actualizar(prendaId, data) {
    if (!prendaId) throw new Error('El id de la prenda es obligatorio');
    return PrendaModel.actualizarCompleto(prendaId, data);
  }

  static async getByColeccion(colId) {
    if (!colId) throw new Error('El id de colección es obligatorio');
    return PrendaModel.getByColeccion(colId);
  }

  static async getByColeccionConMateriales(colId) {
    if (!colId) throw new Error('El id de colección es obligatorio');
    return PrendaModel.getByColeccionConMateriales(colId);
  }

  static async buscarPorNombre(q) {
    if (!q || q.trim().length < 2)
      throw new Error('Escribe al menos 2 caracteres');
    return PrendaModel.buscarPorNombre(q.trim());
  }
}

module.exports = PrendaService;
