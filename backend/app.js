require('dotenv').config();
const express       = require('express');
const cors          = require('cors');
const path          = require('path');
const usuarioRoutes = require('./src/routes/usuario.routes');
 
const app  = express();
const PORT = process.env.PORT || 3000;
 
// ─── Middlewares globales ─────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
 
// ─── Servir frontend estático ─────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));
 
// ─── Rutas API ────────────────────────────────────────────
app.use('/api/auth',     usuarioRoutes);
app.use('/api/usuarios', usuarioRoutes);
 
// ─── Ruta de salud ────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ ok: true, message: 'Servidor corriendo', timestamp: new Date() });
});
 
// ─── Manejo de errores global ─────────────────────────────
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
});
 
// ─── Iniciar servidor ─────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
 
module.exports = app;