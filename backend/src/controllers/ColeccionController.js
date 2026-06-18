const ColeccionService = require('../services/ColeccionService');
const Historial        = require('../models/Historial');

class ColeccionController {

    // GET /api/colecciones
    static async getAll(req, res) {
        try {
            const data = await ColeccionService.getAll();
            return res.status(200).json({ ok: true, data });
        } catch (err) {
            return res.status(500).json({ ok: false, message: err.message });
        }
    }

    // GET /api/colecciones/:id
    static async getById(req, res) {
        try {
            const data = await ColeccionService.getById(req.params.id);
            Historial.registrar({
                tabla:       'coleccion',
                registro_id: data.idCOLECCION,
                valor_nuevo: data.NombreColeccion,
                accion:      'SELECT',
                usuario_id:  req.usuario?.id,
            });
            return res.status(200).json({ ok: true, data });
        } catch (err) {
            return res.status(404).json({ ok: false, message: err.message });
        }
    }

    // POST /api/colecciones
    static async crear(req, res) {
        try {
            const data = await ColeccionService.crear(req.body, req.usuario.id);
            Historial.registrar({
                tabla:       'coleccion',
                registro_id: data.idCOLECCION,
                valor_nuevo: data.NombreColeccion,
                accion:      'INSERT',
                usuario_id:  req.usuario.id,
            });
            return res.status(201).json({
                ok: true, data,
                message: 'Colección creada correctamente'
            });
        } catch (err) {
            return res.status(400).json({ ok: false, message: err.message });
        }
    }

    // PUT /api/colecciones/:id
    static async actualizar(req, res) {
        try {
            const data = await ColeccionService.actualizar(
                req.params.id, req.body, req.usuario.id
            );
            Historial.registrar({
                tabla:       'coleccion',
                registro_id: data.idCOLECCION,
                valor_nuevo: data.NombreColeccion,
                accion:      'UPDATE',
                usuario_id:  req.usuario.id,
            });
            return res.status(200).json({
                ok: true, data,
                message: 'Colección actualizada'
            });
        } catch (err) {
            return res.status(400).json({ ok: false, message: err.message });
        }
    }

    // DELETE /api/colecciones/:id
    static async eliminar(req, res) {
        try {
            const id = req.params.id;

            // Capturamos el nombre ANTES de borrar (después de eliminar ya no existe)
            const col = await ColeccionService.getById(id).catch(() => null);

            const resultado = await ColeccionService.eliminar(id, req.usuario.id);

            Historial.registrar({
                tabla:          'coleccion',
                registro_id:    id,
                campo:          'prendas_eliminadas_cascada',
                valor_anterior: col?.NombreColeccion || null,
                valor_nuevo:    String(resultado.prendasEliminadas || 0),
                accion:         'DELETE',
                usuario_id:     req.usuario.id,
            });

            const msg = resultado.prendasEliminadas > 0
                ? `Colección eliminada junto con ${resultado.prendasEliminadas} referencia(s) asociada(s)`
                : 'Colección eliminada';
            return res.status(200).json({ ok: true, message: msg });
        } catch (err) {
            return res.status(400).json({ ok: false, message: err.message });
        }
    }

    // GET /api/colecciones/:id/prendas
    static async getPrendas(req, res) {
        try {
            const data = await ColeccionService.getPrendas(req.params.id);
            return res.status(200).json({ ok: true, data });
        } catch (err) {
            return res.status(404).json({ ok: false, message: err.message });
        }
    }
}

module.exports = ColeccionController;