const express = require('express');
const { body, validationResult } = require('express-validator');
const { Setting } = require('../models');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings - Obtener configuraciones
router.get('/', async (req, res) => {
  try {
    const { category, isPublic } = req.query;

    const whereConditions = {};
    if (category) whereConditions.category = category;
    
    // Solo mostrar configuraciones públicas si no es admin
    if (!req.user || !['admin', 'super_admin'].includes(req.user?.role)) {
      whereConditions.isPublic = true;
    } else if (isPublic !== undefined) {
      whereConditions.isPublic = isPublic === 'true';
    }

    const settings = await Setting.findAll({
      where: whereConditions,
      order: [['category', 'ASC'], ['sortOrder', 'ASC'], ['key', 'ASC']]
    });

    // Convertir a formato clave-valor y parsear valores
    const settingsObject = {};
    const settingsArray = settings.map(setting => {
      const parsedValue = setting.getParsedValue();
      settingsObject[setting.key] = parsedValue;
      
      return {
        id: setting.id,
        key: setting.key,
        value: parsedValue,
        type: setting.type,
        category: setting.category,
        description: setting.description,
        isPublic: setting.isPublic,
        isEditable: setting.isEditable
      };
    });

    res.json({
      success: true,
      data: {
        settings: settingsArray,
        settingsObject
      }
    });

  } catch (error) {
    console.error('Error al obtener configuraciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/settings/:key - Obtener configuración específica
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;

    const setting = await Setting.findOne({ where: { key } });
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Configuración no encontrada'
      });
    }

    // Verificar permisos para configuraciones privadas
    if (!setting.isPublic && (!req.user || !['admin', 'super_admin'].includes(req.user.role))) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver esta configuración'
      });
    }

    res.json({
      success: true,
      data: {
        setting: {
          key: setting.key,
          value: setting.getParsedValue(),
          type: setting.type,
          category: setting.category,
          description: setting.description
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/settings/:key - Actualizar configuración
router.put('/:key', authenticateToken, authorizeRoles('admin', 'super_admin'), [
  body('value').notEmpty().withMessage('Valor requerido'),
  body('type').optional().isIn(['string', 'number', 'boolean', 'json', 'array'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.array()
      });
    }

    const { key } = req.params;
    const { value, type, description, category, isPublic, isEditable } = req.body;

    const setting = await Setting.findOne({ where: { key } });
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Configuración no encontrada'
      });
    }

    if (!setting.isEditable) {
      return res.status(400).json({
        success: false,
        message: 'Esta configuración no es editable'
      });
    }

    // Convertir valor según el tipo
    let stringValue = value;
    const settingType = type || setting.type;

    if (settingType === 'json' || settingType === 'array') {
      try {
        stringValue = JSON.stringify(value);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Valor JSON inválido'
        });
      }
    } else if (settingType === 'boolean') {
      stringValue = value ? 'true' : 'false';
    } else if (settingType === 'number') {
      stringValue = value.toString();
    }

    await setting.update({
      value: stringValue,
      type: settingType,
      description: description || setting.description,
      category: category || setting.category,
      isPublic: isPublic !== undefined ? isPublic : setting.isPublic,
      isEditable: isEditable !== undefined ? isEditable : setting.isEditable
    });

    res.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      data: {
        setting: {
          key: setting.key,
          value: setting.getParsedValue(),
          type: setting.type,
          category: setting.category,
          description: setting.description
        }
      }
    });

  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/settings - Crear nueva configuración
router.post('/', authenticateToken, authorizeRoles('super_admin'), [
  body('key').isLength({ min: 1, max: 100 }).withMessage('Clave requerida'),
  body('value').notEmpty().withMessage('Valor requerido'),
  body('type').isIn(['string', 'number', 'boolean', 'json', 'array']).withMessage('Tipo inválido'),
  body('category').isLength({ min: 1, max: 50 }).withMessage('Categoría requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.array()
      });
    }

    const {
      key,
      value,
      type,
      category,
      description,
      isPublic = false,
      isEditable = true,
      sortOrder = 0
    } = req.body;

    // Verificar que la clave no existe
    const existingSetting = await Setting.findOne({ where: { key } });
    if (existingSetting) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una configuración con esa clave'
      });
    }

    // Convertir valor
    let stringValue = value;
    if (type === 'json' || type === 'array') {
      stringValue = JSON.stringify(value);
    } else if (type === 'boolean') {
      stringValue = value ? 'true' : 'false';
    } else if (type === 'number') {
      stringValue = value.toString();
    }

    const setting = await Setting.create({
      key,
      value: stringValue,
      type,
      category,
      description,
      isPublic,
      isEditable,
      sortOrder
    });

    res.status(201).json({
      success: true,
      message: 'Configuración creada exitosamente',
      data: { setting }
    });

  } catch (error) {
    console.error('Error al crear configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/settings/:key - Eliminar configuración
router.delete('/:key', authenticateToken, authorizeRoles('super_admin'), async (req, res) => {
  try {
    const { key } = req.params;

    const setting = await Setting.findOne({ where: { key } });
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Configuración no encontrada'
      });
    }

    if (!setting.isEditable) {
      return res.status(400).json({
        success: false,
        message: 'Esta configuración no se puede eliminar'
      });
    }

    await setting.destroy();

    res.json({
      success: true,
      message: 'Configuración eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;