
const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración de conexión a MySQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'gym_user',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'stay_hungry_gym',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función para probar la conexión
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión a MySQL establecida exitosamente');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error.message);
    return false;
  }
};

// Función para ejecutar consultas
const query = async (sql, params = []) => {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Error ejecutando consulta:', error);
    throw error;
  }
};

// Función para crear la base de datos si no existe
const createDatabase = async () => {
  try {
    const tempConfig = { ...dbConfig };
    delete tempConfig.database;
    
    const tempPool = mysql.createPool(tempConfig);
    await tempPool.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    console.log(`✅ Base de datos '${process.env.DB_NAME}' creada/verificada`);
    await tempPool.end();
  } catch (error) {
    console.error('Error creando base de datos:', error);
    throw error;
  }
};

module.exports = {
  pool,
  query,
  testConnection,
  createDatabase
};
