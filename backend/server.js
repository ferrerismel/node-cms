require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const db = require('./models');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const categoryRoutes = require('./routes/categories');
const tagRoutes = require('./routes/tags');
const commentRoutes = require('./routes/comments');
const mediaRoutes = require('./routes/media');
const settingRoutes = require('./routes/settings');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de seguridad
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 requests por IP por ventana de tiempo
  message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
});
app.use('/api/', limiter);

// Rate limiting más estricto para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Demasiados intentos de autenticación, intenta de nuevo más tarde.'
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middlewares generales
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware para logging de requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CMS Backend funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Documentación Swagger
const { setupSwagger } = require('./swagger');
setupSwagger(app);

// Ruta por defecto
app.get('/', (req, res) => {
  res.json({
    message: 'CMS Backend API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      posts: '/api/posts',
      categories: '/api/categories',
      tags: '/api/tags',
      comments: '/api/comments',
      media: '/api/media',
      settings: '/api/settings',
      dashboard: '/api/dashboard'
    }
  });
});

// Middleware para manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Middleware global de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Error de validación de Sequelize
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }
  
  // Error de restricción única
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'El valor ya existe',
      field: err.errors[0]?.path
    });
  }
  
  // Error de token JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
  
  // Error de token expirado
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expirado'
    });
  }
  
  // Error de upload de archivos
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'El archivo es demasiado grande'
    });
  }
  
  // Error genérico
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Función para inicializar la base de datos
async function initializeDatabase() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida correctamente.');
    
    if (process.env.NODE_ENV === 'development') {
      await db.sequelize.sync({ alter: true });
      console.log('✅ Modelos sincronizados con la base de datos.');
      
      // Crear configuraciones por defecto
      await createDefaultSettings();
    }
  } catch (error) {
    console.error('❌ No se pudo conectar a la base de datos:', error);
    process.exit(1);
  }
}

// Crear configuraciones por defecto
async function createDefaultSettings() {
  const defaultSettings = [
    { key: 'site_title', value: 'Mi CMS', type: 'string', category: 'general', description: 'Título del sitio web', isPublic: true },
    { key: 'site_description', value: 'Un CMS potente y flexible', type: 'string', category: 'general', description: 'Descripción del sitio', isPublic: true },
    { key: 'posts_per_page', value: '10', type: 'number', category: 'content', description: 'Número de posts por página' },
    { key: 'allow_comments', value: 'true', type: 'boolean', category: 'content', description: 'Permitir comentarios', isPublic: true },
    { key: 'require_comment_approval', value: 'true', type: 'boolean', category: 'content', description: 'Requerir aprobación de comentarios' },
    { key: 'max_upload_size', value: '10485760', type: 'number', category: 'media', description: 'Tamaño máximo de archivo en bytes' },
    { key: 'allowed_file_types', value: '["jpg","jpeg","png","gif","pdf","doc","docx"]', type: 'array', category: 'media', description: 'Tipos de archivo permitidos' },
    { key: 'theme_primary_color', value: '#3B82F6', type: 'string', category: 'appearance', description: 'Color primario del tema', isPublic: true },
    { key: 'theme_secondary_color', value: '#64748B', type: 'string', category: 'appearance', description: 'Color secundario del tema', isPublic: true }
  ];

  for (const setting of defaultSettings) {
    await db.Setting.findOrCreate({
      where: { key: setting.key },
      defaults: setting
    });
  }
}

// Inicializar servidor
async function startServer() {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📝 API Documentation: http://localhost:${PORT}/api/docs`);
    console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  });
}

// Manejo graceful de cierre del servidor
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await db.sequelize.close();
  console.log('✅ Conexión a la base de datos cerrada.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await db.sequelize.close();
  console.log('✅ Conexión a la base de datos cerrada.');
  process.exit(0);
});

// Iniciar el servidor
startServer().catch(error => {
  console.error('❌ Error al iniciar el servidor:', error);
  process.exit(1);
});