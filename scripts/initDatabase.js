
const { createDatabase, testConnection } = require('../config/mysql');
const User = require('../models/User');

const initializeDatabase = async () => {
  try {
    console.log('🗄️ Inicializando base de datos Stay Hungry Gym...\n');

    // Crear base de datos
    console.log('1. Creando base de datos...');
    await createDatabase();

    // Probar conexión
    console.log('2. Probando conexión...');
    await testConnection();

    // Crear tablas
    console.log('3. Creando tablas...');
    await User.createTable();

    console.log('\n✅ Base de datos inicializada exitosamente!');
    console.log('📋 Próximos pasos:');
    console.log('   - Ejecutar: npm run seed (para datos de ejemplo)');
    console.log('   - Ejecutar: npm run dev (para iniciar servidor)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    process.exit(1);
  }
};

initializeDatabase();
