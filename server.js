// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Config & modelos/rutas
const { testConnection, createDatabase } = require('./config/mysql');
const User = require('./models/User');
const authRoutes = require('./routes/authRoutes');
const progressRoutes = require('./routes/progressRoutes');
const trainerRoutes = require('./routes/trainerRoutes');
const routineRoutes = require('./routes/routineRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const reportRoutes = require('./routes/reportRoutes');
const caloriesRoutes = require('./routes/caloriesRoutes');

const analyticsRoutes = require('./routes/analyticsRoutes');
const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Middlewares ----------
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // maneja preflight globalmente

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ---------- Rutas  ----------
app.use('/api/auth', authRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/trainers', trainerRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/calories', caloriesRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Stay Hungry Gym API funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Bienvenida
app.get('/', (req, res) => {
  res.json({
    message: '🏋️‍♂️ Bienvenido a Stay Hungry Gym API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      profile: 'GET /api/auth/profile',
      updateProfile: 'PUT /api/auth/profile',
      users: 'GET /api/auth/users (Admin only)',
      weightHistory: 'GET /api/progress/weight-history?usuarioId=:id&days=180',
      reports:{
        churn: 'GET /api/reports/users/churn?from=YYYY-MM-DD&to=YYYY-MM-DD',
        adherence: 'GET /api/reports/adherence?days=30',
        volume: 'GET /api/reports/volume?from=YYYY-MM-DD&to=YYYY-MM-DD',
        prs: 'GET /api/reports/prs?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=100',
        trainerClients: 'GET /api/reports/trainers/clients',
      },
    },
  });
});

// 404
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// 500
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { error: error.message }),
  });
});

// ---------- Init ----------
const initializeApp = async () => {
  try {
    console.log('🚀 Iniciando Stay Hungry Gym API...');
    await createDatabase();
    await testConnection();
    await User.createTable();

    console.log('✅ Base de datos inicializada correctamente');

    app.listen(PORT, () => {
      console.log(`🏋️‍♂️ Stay Hungry Gym API ejecutándose en puerto ${PORT}`);
      console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`🌐 API Health: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Error iniciando la aplicación:', error);
    process.exit(1);
  }
};

// Señales
process.on('SIGTERM', () => { console.log('📴 Cerrando servidor...'); process.exit(0); });
process.on('SIGINT', () => { console.log('📴 Cerrando servidor...'); process.exit(0); });

initializeApp();

module.exports = app;
