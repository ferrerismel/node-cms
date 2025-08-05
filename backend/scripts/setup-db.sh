#!/bin/bash

# Script para configurar la base de datos según el entorno

echo "🚀 Configurando base de datos..."

# Verificar si estamos en desarrollo o producción
if [ "$NODE_ENV" = "production" ]; then
    echo "📦 Configurando para PRODUCCIÓN (PostgreSQL)"
    
    # Verificar variables de entorno requeridas
    if [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ] || [ -z "$DB_HOST" ]; then
        echo "❌ Error: Variables de entorno de PostgreSQL no configuradas"
        echo "Por favor, configura las siguientes variables:"
        echo "  - DB_USER"
        echo "  - DB_PASSWORD" 
        echo "  - DB_NAME"
        echo "  - DB_HOST"
        exit 1
    fi
    
    echo "✅ Variables de entorno de PostgreSQL configuradas"
    
else
    echo "🔧 Configurando para DESARROLLO (SQLite)"
    echo "✅ No se requieren variables de entorno adicionales"
fi

# Ejecutar migraciones
echo "📋 Ejecutando migraciones..."
npm run migrate

if [ $? -eq 0 ]; then
    echo "✅ Migraciones ejecutadas exitosamente"
else
    echo "❌ Error ejecutando migraciones"
    exit 1
fi

# Ejecutar seeders (opcional)
read -p "¿Deseas ejecutar los seeders? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Ejecutando seeders..."
    npm run seed
    
    if [ $? -eq 0 ]; then
        echo "✅ Seeders ejecutados exitosamente"
    else
        echo "❌ Error ejecutando seeders"
        exit 1
    fi
fi

echo "🎉 Configuración de base de datos completada!"