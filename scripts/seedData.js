
const User = require('../models/User');
const { testConnection } = require('../config/mysql');

const seedData = async () => {
  try {
    console.log('🌱 Iniciando proceso de seeding...\n');

    // Verificar conexión
    await testConnection();

    console.log('📝 Creando usuarios de ejemplo...');

    // Usuarios de ejemplo para cada rol
    const usuariosEjemplo = [
      // Administradores
      {
        nombre: 'Carlos Admin',
        email: 'admin@stayhungrygym.com',
        password: 'admin123',
        edad: 35,
        peso: 80.5,
        estatura: 1.78,
        rol: 'Administrador'
      },
      {
        nombre: 'María Administradora',
        email: 'maria.admin@stayhungrygym.com',
        password: 'admin123',
        edad: 32,
        peso: 65.0,
        estatura: 1.65,
        rol: 'Administrador'
      },

      // Entrenadores
      {
        nombre: 'Roberto Trainer',
        email: 'roberto.trainer@stayhungrygym.com',
        password: 'trainer123',
        edad: 28,
        peso: 85.0,
        estatura: 1.82,
        rol: 'Entrenador'
      },
      {
        nombre: 'Ana Fitness',
        email: 'ana.fitness@stayhungrygym.com',
        password: 'trainer123',
        edad: 26,
        peso: 58.5,
        estatura: 1.68,
        rol: 'Entrenador'
      },
      {
        nombre: 'Luis Muscular',
        email: 'luis.muscular@stayhungrygym.com',
        password: 'trainer123',
        edad: 30,
        peso: 90.0,
        estatura: 1.80,
        rol: 'Entrenador'
      },

      // Clientes
      {
        nombre: 'Juan Cliente',
        email: 'juan.cliente@gmail.com',
        password: 'cliente123',
        edad: 25,
        peso: 75.5,
        estatura: 1.75,
        rol: 'Cliente'
      },
      {
        nombre: 'Sofia Pérez',
        email: 'sofia.perez@gmail.com',
        password: 'cliente123',
        edad: 22,
        peso: 55.0,
        estatura: 1.62,
        rol: 'Cliente'
      },
      {
        nombre: 'Miguel Rodriguez',
        email: 'miguel.rodriguez@gmail.com',
        password: 'cliente123',
        edad: 34,
        peso: 82.3,
        estatura: 1.77,
        rol: 'Cliente'
      },
      {
        nombre: 'Laura Martínez',
        email: 'laura.martinez@gmail.com',
        password: 'cliente123',
        edad: 29,
        peso: 62.8,
        estatura: 1.70,
        rol: 'Cliente'
      },
      {
        nombre: 'Diego Fitness',
        email: 'diego.fitness@gmail.com',
        password: 'cliente123',
        edad: 27,
        peso: 78.9,
        estatura: 1.83,
        rol: 'Cliente'
      },
      {
        nombre: 'Carmen López',
        email: 'carmen.lopez@gmail.com',
        password: 'cliente123',
        edad: 31,
        peso: 59.5,
        estatura: 1.65,
        rol: 'Cliente'
      }
    ];

    let created = 0;
    let skipped = 0;

    for (const userData of usuariosEjemplo) {
      try {
        // Verificar si el usuario ya existe
        const existingUser = await User.findByEmail(userData.email);
        if (existingUser) {
          console.log(`   ⚠️  Usuario ${userData.email} ya existe, omitiendo...`);
          skipped++;
          continue;
        }

        // Crear usuario
        const user = new User(userData);
        await user.save();
        console.log(`   ✅ Usuario creado: ${userData.nombre} (${userData.rol})`);
        created++;

      } catch (error) {
        console.error(`   ❌ Error creando usuario ${userData.email}:`, error.message);
      }
    }

    console.log('\n📊 Resumen del seeding:');
    console.log(`   ✅ Usuarios creados: ${created}`);
    console.log(`   ⚠️  Usuarios omitidos: ${skipped}`);
    console.log(`   📝 Total intentados: ${usuariosEjemplo.length}`);

    if (created > 0) {
      console.log('\n🎉 Datos de ejemplo creados exitosamente!');
      console.log('\n👥 Usuarios de prueba disponibles:');
      console.log('🔧 ADMINISTRADORES:');
      console.log('   - admin@stayhungrygym.com / admin123');
      console.log('   - maria.admin@stayhungrygym.com / admin123');
      console.log('💪 ENTRENADORES:');
      console.log('   - roberto.trainer@stayhungrygym.com / trainer123');
      console.log('   - ana.fitness@stayhungrygym.com / trainer123');
      console.log('   - luis.muscular@stayhungrygym.com / trainer123');
      console.log('👤 CLIENTES:');
      console.log('   - juan.cliente@gmail.com / cliente123');
      console.log('   - sofia.perez@gmail.com / cliente123');
      console.log('   - miguel.rodriguez@gmail.com / cliente123');
      console.log('   - Y más...');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seeding:', error);
    process.exit(1);
  }
};

seedData();
