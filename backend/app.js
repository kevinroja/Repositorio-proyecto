require('dotenv').config();
const express         = require('express');
const cors            = require('cors');
const path            = require('path');
const usuarioRoutes   = require('./src/routes/usuario.routes');
const coleccionRoutes = require('./src/routes/coleccionRoutes');
const prendaRoutes    = require('./src/routes/prenda.routes');
const canalRoutes     = require('./src/routes/canal.routes');
const soporteRoutes   = require('./src/routes/soporte.routes');
const reportsRoutes   = require('./src/routes/reports.routes');
const escenarioRoutes = require('./src/routes/escenario.routes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares globales ─────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Servir frontend estático ─────────────────────────────
app.use((req, res, next) => {
  if (req.path.endsWith('.css')) res.type('text/css');
  else if (req.path.endsWith('.js')) res.type('application/javascript');
  next();
});
app.use(express.static(path.resolve(__dirname, '..', 'frontend')));

// ─── Rutas API ────────────────────────────────────────────
app.use('/api/auth',        usuarioRoutes);
app.use('/api/usuarios',    usuarioRoutes);
app.use('/api/colecciones', coleccionRoutes);
app.use('/api/prendas',     prendaRoutes);
app.use('/api/canales',     canalRoutes);
app.use('/api/soporte',     soporteRoutes);
app.use('/api/reportes',    reportsRoutes);
app.use('/api/costeo/escenarios', escenarioRoutes);

app.get('/api/files', (req, res) => {
  const fs = require('fs');
  const p = require('path').resolve(__dirname, '..', 'frontend', 'css');
  try { res.json({ files: fs.readdirSync(p), path: p }); } catch(e) { res.json({ error: e.message, path: p }); }
});

// ─── Ruta de salud ────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Servidor corriendo', timestamp: new Date() });
});

// ─── Manejo de errores global ─────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ ok: false, message: 'Error interno del servidor' });
});

// ─── Iniciar servidor solo en local (no en Vercel) ────────
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;
