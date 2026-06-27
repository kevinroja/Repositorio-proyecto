const ColeccionModel = require('../models/ColeccionModel');

class ColeccionService {

    static async getAll() {
        return ColeccionModel.getAll();
    }

    static async getById(id) {
        const col = await ColeccionModel.getById(id);
        if (!col) throw new Error('Colección no encontrada');
        return col;
    }

    static async crear(data, usuarioId) {
        const { NombreColeccion, Temporada, Año } = data;

        // ── Validaciones de campos ──────────────────────────────────────────
        if (!NombreColeccion || !NombreColeccion.trim())
            throw new Error('El nombre de la colección es obligatorio');
        if (!Temporada)
            throw new Error('La temporada es obligatoria');

        const año = parseInt(Año);
        if (!Año && Año !== 0)
            throw new Error('El año es obligatorio');
        if (isNaN(año) || año < 2000 || año > 2100)
            throw new Error('El año debe ser un valor válido (2000–2100)');

        // ── Validación de nombre duplicado ──────────────────────────────────
        const duplicado = await ColeccionModel.existeNombre(NombreColeccion.trim());
        if (duplicado)
            throw new Error(`Ya existe una colección con el nombre "${NombreColeccion.trim()}"`);

        const id = await ColeccionModel.crear({
            NombreColeccion: NombreColeccion.trim(),
            Temporada,
            Año: año
        });
        return ColeccionModel.getById(id);
    }

    static async actualizar(id, data, usuarioId) {
        await ColeccionService.getById(id); // valida que existe
        const { NombreColeccion, Temporada, Año } = data;

        // ── Validaciones de campos ──────────────────────────────────────────
        if (!NombreColeccion || !NombreColeccion.trim())
            throw new Error('El nombre es obligatorio');

        const año = parseInt(Año);
        if (Año !== undefined && (isNaN(año) || año < 2000 || año > 2100))
            throw new Error('El año debe ser un valor válido (2000–2100)');

        // ── Validación de nombre duplicado (excluye la propia colección) ────
        const duplicado = await ColeccionModel.existeNombre(NombreColeccion.trim(), id);
        if (duplicado)
            throw new Error(`Ya existe otra colección con el nombre "${NombreColeccion.trim()}"`);

        await ColeccionModel.actualizar(id, {
            NombreColeccion: NombreColeccion.trim(),
            Temporada,
            Año: año
        });
        return ColeccionModel.getById(id);
    }

static async eliminar(id, usuarioId) {
    await ColeccionService.getById(id); // valida que existe
    return ColeccionModel.eliminar(id); // retorna { ok, prendasEliminadas }
    }

    static async getPrendas(id) {
        await ColeccionService.getById(id); // valida que la colección existe
        return ColeccionModel.getPrendasByColeccion(id);
    }
}

module.exports = ColeccionService;