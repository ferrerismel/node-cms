# Configuración de Base de Datos

Este proyecto está configurado para usar diferentes bases de datos según el entorno:

## Desarrollo (SQLite)

Para desarrollo, el proyecto usa SQLite que es más simple de configurar:

### Ventajas de SQLite en desarrollo:
- No requiere instalación de servidor de base de datos
- Archivo único que se crea automáticamente
- Configuración mínima
- Ideal para desarrollo y pruebas

### Configuración:
1. No necesitas configurar variables de entorno específicas
2. El archivo `database.sqlite` se creará automáticamente en la raíz del backend
3. Ejecuta las migraciones: `npm run migrate`

## Producción (PostgreSQL)

Para producción, el proyecto usa PostgreSQL que es más robusto y escalable:

### Ventajas de PostgreSQL en producción:
- Mejor rendimiento para aplicaciones en producción
- Soporte para transacciones complejas
- Mejor concurrencia
- Características avanzadas de base de datos

### Configuración:

1. **Instalar PostgreSQL** en tu servidor de producción
2. **Crear la base de datos**:
   ```sql
   CREATE DATABASE tu_base_datos;
   CREATE USER tu_usuario WITH PASSWORD 'tu_password';
   GRANT ALL PRIVILEGES ON DATABASE tu_base_datos TO tu_usuario;
   ```

3. **Configurar variables de entorno** en producción:
   ```bash
   NODE_ENV=production
   DB_USER=tu_usuario_postgres
   DB_PASSWORD=tu_password_postgres
   DB_NAME=tu_base_datos
   DB_HOST=tu_host_postgres
   DB_PORT=5432
   ```

4. **Ejecutar migraciones**:
   ```bash
   npm run migrate
   ```

## Comandos útiles

### Desarrollo:
```bash
# Ejecutar migraciones
npm run migrate

# Revertir última migración
npm run migrate:undo

# Ejecutar seeders
npm run seed

# Crear nueva migración
npm run create:migration nombre_migracion

# Crear nuevo seeder
npm run create:seed nombre_seeder
```

### Producción:
```bash
# Ejecutar migraciones en producción
NODE_ENV=production npm run migrate

# Ejecutar seeders en producción
NODE_ENV=production npm run seed
```

## Estructura de archivos

```
backend/
├── config/
│   └── database.js          # Configuración de Sequelize
├── models/                  # Modelos de la base de datos
├── migrations/              # Archivos de migración
├── seeders/                 # Archivos de seeders
├── database.sqlite          # Archivo SQLite (se crea automáticamente)
└── .env.example            # Ejemplo de variables de entorno
```

## Notas importantes

1. **SQLite en desarrollo**: El archivo `database.sqlite` se creará automáticamente cuando ejecutes las migraciones
2. **PostgreSQL en producción**: Asegúrate de tener PostgreSQL instalado y configurado
3. **Variables de entorno**: En desarrollo no necesitas configurar variables de base de datos, en producción sí
4. **SSL**: En producción, PostgreSQL requiere SSL. La configuración ya está preparada para esto
5. **Backup**: Recuerda hacer backups regulares de tu base de datos de producción