# CMS Completo - Node.js + Next.js

Un sistema de gestión de contenido (CMS) completamente funcional construido con Node.js en el backend y Next.js en el frontend, utilizando Sequelize como ORM y Tailwind CSS para el diseño.

## 🚀 Características

### Backend (Node.js + Express)
- **Autenticación JWT** completa con refresh tokens
- **Sistema de roles** (super_admin, admin, editor, author, subscriber)
- **API RESTful** completa con todas las funcionalidades CRUD
- **Gestión de usuarios** con perfiles y permisos
- **Sistema de posts** con estados, categorías y tags
- **Gestión de medios** con upload de archivos e imágenes
- **Sistema de comentarios** con moderación
- **Dashboard administrativo** con estadísticas y analíticas
- **Configuraciones dinámicas** del sitio
- **Validación de datos** y manejo de errores
- **Seguridad** con helmet, rate limiting y CORS

### Frontend (Next.js + Tailwind CSS)
- **Server-Side Rendering (SSR)** para mejor SEO
- **Interfaz moderna** y responsive con Tailwind CSS
- **Panel de administración** completo
- **Gestión de estado** con Zustand
- **Formularios** con React Hook Form
- **Notificaciones** con React Hot Toast
- **Modo oscuro** incluido
- **Optimización de imágenes** con Next.js Image
- **TypeScript** para mejor desarrollo

### Base de Datos (SQLite + PostgreSQL + Sequelize)
- **SQLite** para desarrollo (configuración simple)
- **PostgreSQL** para producción (escalable y robusto)
- **Modelos relacionales** completos
- **Migraciones** automáticas
- **Validaciones** a nivel de base de datos
- **Índices optimizados** para mejor rendimiento
- **Hooks** para funcionalidades automáticas

## 📋 Requisitos Previos

- Node.js 18+ y npm
- Git
- **Desarrollo**: No se requiere instalación adicional (SQLite incluido)
- **Producción**: PostgreSQL instalado en el servidor

## 🛠️ Instalación

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd fullstack-cms
```

### 2. Instalar dependencias
```bash
# Instalar todas las dependencias
npm run install:all

# O instalar por separado
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configurar la base de datos

#### Para Desarrollo (SQLite):
No se requiere configuración adicional. El archivo `database.sqlite` se creará automáticamente.

#### Para Producción (PostgreSQL):
```sql
CREATE DATABASE tu_base_datos;
CREATE USER tu_usuario WITH PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE tu_base_datos TO tu_usuario;
```

### 4. Configurar variables de entorno

**Backend** (`backend/.env`):

Para Desarrollo:
```env
# Configuración de la aplicación
NODE_ENV=development
PORT=3000

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro
JWT_EXPIRES_IN=24h

# Configuración de archivos
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
```

Para Producción:
```env
# Configuración de la aplicación
NODE_ENV=production
PORT=3000

# Base de datos PostgreSQL
DB_USER=tu_usuario_postgres
DB_PASSWORD=tu_password_postgres
DB_NAME=tu_base_datos
DB_HOST=tu_host_postgres
DB_PORT=5432

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro
JWT_EXPIRES_IN=24h

# Configuración de archivos
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 5. Ejecutar migraciones

```bash
# Para desarrollo (SQLite)
cd backend
npm run migrate

# Para producción (PostgreSQL)
cd backend
NODE_ENV=production npm run migrate

# Verificar estado de migraciones
npm run db:status
```

### 6. Iniciar el desarrollo
```bash
# Desde la raíz del proyecto
npm run dev

# O por separado
npm run dev:backend  # Puerto 3001
npm run dev:frontend # Puerto 3000
```

## 📁 Estructura del Proyecto

```
fullstack-cms/
├── backend/
│   ├── config/           # Configuración de DB
│   ├── middleware/       # Middlewares de autenticación
│   ├── models/          # Modelos de Sequelize
│   ├── routes/          # Rutas de la API
│   ├── uploads/         # Archivos subidos
│   └── server.js        # Servidor principal
├── frontend/
│   ├── src/
│   │   ├── components/  # Componentes React
│   │   ├── lib/         # Utilidades y API
│   │   ├── pages/       # Páginas de Next.js
│   │   ├── stores/      # Estado global (Zustand)
│   │   └── styles/      # Estilos CSS
│   ├── next.config.js   # Configuración de Next.js
│   └── tailwind.config.js # Configuración de Tailwind
└── package.json         # Scripts principales
```

## 🎯 Funcionalidades Principales

### 🔐 Sistema de Autenticación
- Registro e inicio de sesión
- Gestión de roles y permisos
- Recuperación de contraseña
- Refresh tokens automáticos

### 📝 Gestión de Contenido
- **Posts/Artículos**: Crear, editar, publicar con editor rich text
- **Páginas estáticas**: Para contenido institucional
- **Categorías jerárquicas**: Organización del contenido
- **Tags**: Etiquetado flexible
- **Estados**: Borrador, publicado, privado, pendiente

### 🖼️ Gestión de Medios
- Upload de imágenes, documentos y videos
- Redimensionamiento automático de imágenes
- Organización en carpetas
- Metadatos y Alt text para SEO

### 💬 Sistema de Comentarios
- Comentarios anidados (respuestas)
- Moderación y aprobación
- Comentarios de usuarios registrados y anónimos
- Sistema de likes/dislikes

### 👥 Gestión de Usuarios
- Perfiles de usuario completos
- Gestión de roles y permisos
- Panel de administración de usuarios
- Histórico de actividad

### 📊 Dashboard y Analíticas
- Estadísticas del sitio en tiempo real
- Gráficos de actividad
- Posts más populares
- Gestión de contenido pendiente

### ⚙️ Configuraciones
- Configuraciones del sitio editables
- Temas y personalización
- SEO y metadatos
- Configuraciones por categorías

## 🚀 Producción

### Build del proyecto
```bash
npm run build
```

### Iniciar en producción
```bash
npm start
```

### Variables de entorno de producción
Asegúrate de configurar todas las variables de entorno para producción, especialmente:
- `NODE_ENV=production`
- URLs de producción
- Secretos JWT seguros
- Configuración de base de datos de producción

## 🔒 Seguridad

El CMS incluye múltiples capas de seguridad:
- **Autenticación JWT** con refresh tokens
- **Rate limiting** para prevenir ataques
- **Validación de datos** en backend y frontend
- **Sanitización de inputs** para prevenir XSS
- **Headers de seguridad** con Helmet
- **CORS configurado** correctamente
- **Validación de permisos** por rol

## 🎨 Personalización

### Temas y Estilos
- Modifica `frontend/tailwind.config.js` para personalizar colores y estilos
- Los estilos globales están en `frontend/src/styles/globals.css`
- Soporte completo para modo oscuro

### Configuraciones
- Las configuraciones del sitio se gestionan desde `/admin/settings`
- Configuraciones públicas disponibles en el frontend
- Sistema de configuración tipado y validado

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🛟 Soporte

Si tienes problemas o preguntas:
1. Revisa la documentación
2. Busca en los issues existentes
3. Crea un nuevo issue con detalles del problema

## 🚀 Roadmap

- [ ] Integración con servicios de email
- [ ] Sistema de plugins
- [ ] Múltiples idiomas (i18n)
- [ ] API GraphQL opcional
- [ ] Integración con CDN
- [ ] Sistema de cache avanzado
- [ ] Progressive Web App (PWA)
- [ ] Búsqueda con Elasticsearch

---

¡Disfruta construyendo con este CMS completo! 🎉
