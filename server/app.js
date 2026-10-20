const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const projectRoutes = require('./routes/projectRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

/**
 * Middleware para asegurar que el esquema y los datos iniciales en Turso estén listos.
 */
app.use('/api', async (req, res, next) => {
  try {
    await initDatabase();
    next();
  } catch (error) {
    console.error('Error inicializando base de datos Turso:', error);
    res.status(500).json({
      error: 'Error de conexión con la base de datos Turso: ' + error.message
    });
  }
});

// Endpoint de estado del servidor y base de datos
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'StridePro Sports & Zapatillas API',
    database: 'Turso libSQL Connected',
    timestamp: new Date().toISOString()
  });
});

// Rutas principales de la API REST
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/feedback', feedbackRoutes);

// Servir frontend compilado (dist) cuando se ejecuta en producción local con `npm start`
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

module.exports = app;
