
# 🔧 Stay Hungry Gym - Backend

API REST desarrollada con Node.js + Express + MySQL para el sistema de gestión de Stay Hungry Gym.

## 🚀 Inicio Rápido

```bash
# Instalar dependencias (ya instaladas)
npm install

# Configurar variables de entorno
cp .env .env.local  # Opcional

# Inicializar base de datos
npm run init-db

# Poblar datos de ejemplo
npm run seed

# Iniciar servidor de desarrollo
npm run dev
```

## 📋 Variables de Entorno

Archivo `.env`:

```env
# Base de datos
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=stay_hungry_gym
DB_PORT=3306

# JWT
JWT_SECRET=stay_hungry_gym_jwt_secret_key_2024
JWT_EXPIRE=30d

# Servidor
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## 🗄️ Base de Datos

### Modelo de Usuario

```sql
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  edad INT NOT NULL,
  peso DECIMAL(5,2) NOT NULL,
  estatura DECIMAL(5,2) NOT NULL,
  rol ENUM('Cliente', 'Entrenador', 'Administrador') DEFAULT 'Cliente',
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  activo BOOLEAN DEFAULT TRUE
);
```

## 🔌 API Endpoints

### Autenticación (`/api/auth`)

#### POST `/api/auth/register`
Registrar nuevo usuario.

**Body:**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@email.com",
  "password": "password123",
  "edad": 25,
  "peso": 75.5,
  "estatura": 1.75,
  "rol": "Cliente"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "data": {
    "user": {
      "id": 1,
      "nombre": "Juan Pérez",
      "email": "juan@email.com",
      "edad": 25,
      "peso": 75.5,
      "estatura": 1.75,
      "rol": "Cliente",
      "fecha_registro": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### POST `/api/auth/login`
Iniciar sesión.

**Body:**
```json
{
  "email": "juan@email.com",
  "password": "password123"
}
```

#### GET `/api/auth/profile`
Obtener perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

#### PUT `/api/auth/profile`
Actualizar perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "nombre": "Juan Carlos Pérez",
  "edad": 26,
  "peso": 78.0,
  "estatura": 1.76
}
```

#### GET `/api/auth/users`
Obtener todos los usuarios (solo administradores).

**Headers:**
```
Authorization: Bearer <admin_token>
```

### Utilidades

#### GET `/api/health`
Verificar estado de la API.

#### GET `/`
Información de la API y endpoints disponibles.

## 🔒 Middleware de Autenticación

### `authenticate`
Verifica el token JWT en todas las rutas protegidas.

```javascript
// Uso
router.get('/profile', authenticate, getProfile);
```

### `authorize(roles)`
Verifica que el usuario tenga los permisos necesarios.

```javascript
// Uso
router.get('/users', authenticate, authorize('Administrador'), getAllUsers);
```

## 🛡️ Validaciones

Usando `express-validator` para validar datos de entrada:

### Registro
- **nombre**: 2-100 caracteres
- **email**: formato válido, único
- **password**: mínimo 6 caracteres
- **edad**: 16-100 años
- **peso**: 30-300 kg
- **estatura**: 1.0-2.5 metros
- **rol**: Cliente/Entrenador/Administrador

### Login
- **email**: formato válido
- **password**: requerida

### Actualizar Perfil
- Todos los campos son opcionales
- Mismas validaciones que registro (excepto email/password)

## 📊 Manejo de Errores

### Códigos de Estado

- **200**: Éxito
- **201**: Recurso creado
- **400**: Datos inválidos
- **401**: No autorizado
- **403**: Permisos insuficientes
- **404**: No encontrado
- **500**: Error interno del servidor

### Formato de Respuesta de Error

```json
{
  "success": false,
  "message": "Descripción del error",
  "errors": [
    {
      "field": "email",
      "message": "El email ya está registrado"
    }
  ]
}
```

## 🏗️ Arquitectura

```
backend/
├── config/
│   └── mysql.js          # Configuración de BD
├── controllers/
│   └── authController.js # Lógica de negocio
├── middleware/
│   └── auth.js           # Autenticación/Autorización
├── models/
│   └── User.js           # Modelo de datos
├── routes/
│   └── authRoutes.js     # Definición de rutas
├── scripts/
│   ├── initDatabase.js   # Inicializar BD
│   └── seedData.js       # Datos de ejemplo
├── .env                  # Variables de entorno
├── package.json          # Dependencias
└── server.js             # Punto de entrada
```

## 🔧 Scripts

```bash
# Desarrollo
npm run dev          # Servidor con auto-reload (nodemon)

# Producción
npm start            # Servidor de producción

# Base de datos
npm run init-db      # Crear BD y tablas
npm run seed         # Poblar con datos de ejemplo
```

## 📝 Logs

El servidor registra todas las requests:

```
2024-01-01T12:00:00.000Z - POST /api/auth/login
2024-01-01T12:00:01.000Z - GET /api/auth/profile
```

## 🧪 Testing

```bash
# Ejecutar tests (cuando estén implementados)
npm test

# Verificar salud de la API
curl http://localhost:5000/api/health
```

## 🔄 Desarrollo

### Agregar Nuevos Endpoints

1. **Crear controlador** en `controllers/`
2. **Agregar validaciones** con `express-validator`
3. **Definir rutas** en `routes/`
4. **Registrar rutas** en `server.js`

### Ejemplo de Nuevo Endpoint

```javascript
// controllers/gymController.js
const getRoutines = async (req, res) => {
  try {
    // Lógica aquí
    res.json({ success: true, data: routines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// routes/gymRoutes.js
router.get('/routines', authenticate, getRoutines);

// server.js
app.use('/api/gym', require('./routes/gymRoutes'));
```

## 🚨 Troubleshooting

### Error de Conexión a MySQL
```bash
# Verificar que MySQL esté ejecutándose
sudo systemctl status mysql

# Verificar conexión
mysql -u root -p
```

### Error de Puerto en Uso
```bash
# Encontrar proceso usando puerto 5000
lsof -ti:5000

# Terminar proceso
kill -9 <PID>
```

### Token JWT Inválido
- Verificar que `JWT_SECRET` esté configurado
- Verificar formato del token en headers
- Verificar que el token no haya expirado

---

**¿Necesitas ayuda?** Revisa los logs del servidor o contacta al equipo de desarrollo.
