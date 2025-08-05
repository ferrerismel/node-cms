const express = require('express');
const { body, validationResult } = require('express-validator');
const { Tag, Post } = require('../models');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Validaciones
const tagValidation = [
  body('name')
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('La descripción no puede superar los 200 caracteres'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('El color debe ser un código hexadecimal válido')
];

// GET /api/tags - Obtener todos los tags
router.get('/', async (req, res) => {
  try {
    const { includeEmpty = false } = req.query;

    const include = [];
    
    if (includeEmpty !== 'true') {
      include.push({
        model: Post,
        as: 'posts',
        attributes: [],
        required: true,
        where: { status: 'published' }
      });
    }

    const tags = await Tag.findAll({
      where: { isActive: true },
      include,
      attributes: {
        include: [
          [
            require('sequelize').literal(`(
              SELECT COUNT(*)
              FROM PostTags pt
              INNER JOIN posts p ON pt.postId = p.id
              WHERE pt.tagId = Tag.id
              AND p.status = 'published'
            )`),
            'postsCount'
          ]
        ]
      },
      order: [['name', 'ASC']],
      group: ['Tag.id']
    });

    res.json({
      success: true,
      data: { tags }
    });

  } catch (error) {
    console.error('Error al obtener tags:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/tags - Crear nuevo tag
router.post('/', authenticateToken, authorizeRoles('admin', 'super_admin', 'editor', 'author'), tagValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.array()
      });
    }

    const { name, description, color } = req.body;

    const tag = await Tag.create({
      name,
      description,
      color
    });

    res.status(201).json({
      success: true,
      message: 'Tag creado exitosamente',
      data: { tag }
    });

  } catch (error) {
    console.error('Error al crear tag:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/tags/:id - Actualizar tag
router.put('/:id', authenticateToken, authorizeRoles('admin', 'super_admin', 'editor'), tagValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { name, description, color, isActive } = req.body;

    const tag = await Tag.findByPk(id);
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag no encontrado'
      });
    }

    await tag.update({
      name,
      description,
      color,
      isActive
    });

    res.json({
      success: true,
      message: 'Tag actualizado exitosamente',
      data: { tag }
    });

  } catch (error) {
    console.error('Error al actualizar tag:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/tags/:id - Eliminar tag
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const tag = await Tag.findByPk(id);
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag no encontrado'
      });
    }

    await tag.destroy();

    res.json({
      success: true,
      message: 'Tag eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar tag:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;