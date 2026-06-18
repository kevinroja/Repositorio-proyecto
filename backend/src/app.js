require('dotenv').config();
const express         = require('express');
const cors            = require('cors');
const path            = require('path');
const usuarioRoutes   = require('./src/routes/usuario.routes');
const coleccionRoutes = require('./src/routes/coleccionRoutes');
const prendaRoutes    = require('./src/routes/prenda.routes');
const soporteRoutes   = require('./src/routes/soporte.routes');
const reportsRoutes   = require('./src/routes/reports.routes');
const costeoRoutes    = require('./src/routes/costeo.routes');

// authMiddleware verifica el JWT en cada petición protegida
const { authMiddleware } = require('./src/middlewares/auth.middleware');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth',        usuarioRoutes);
app.use('/api/usuarios',    usuarioRoutes);
app.use('/api/colecciones', coleccionRoutes);
app.use('/api/prendas',     prendaRoutes);
app.use('/api/soporte',     soporteRoutes);
app.use('/api/reportes',    authMiddleware, reportsRoutes);
app.use('/api/costeo',      authMiddleware, costeoRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Servidor corriendo', timestamp: new Date() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ ok: false, message: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;