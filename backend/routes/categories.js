const express = require('express');
const { body, validationResult } = require('express-validator');
const { Category, Post } = require('../models');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Validaciones
const categoryValidation = [
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede superar los 500 caracteres'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('El color debe ser un código hexadecimal válido'),
  body('parentId')
    .optional()
    .isInt()
    .withMessage('El ID del padre debe ser un número')
];

// GET /api/categories - Obtener todas las categorías
router.get('/', async (req, res) => {
  try {
    const { includeEmpty = false, hierarchical = false } = req.query;

    let categories;
    
    if (hierarchical === 'true') {
      // Obtener categorías en estructura jerárquica
      categories = await Category.findAll({
        where: { parentId: null },
        include: [
          {
            model: Category,
            as: 'children',
            include: [
              {
                model: Category,
                as: 'children' // Hasta 2 niveles de profundidad
              }
            ]
          }
        ],
        order: [['sortOrder', 'ASC'], ['name', 'ASC']]
      });
    } else {
      // Obtener todas las categorías de forma plana
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

      categories = await Category.findAll({
        where: { isActive: true },
        include,
        attributes: {
          include: [
            // Contar posts publicados
            [
              require('sequelize').literal(`(
                SELECT COUNT(*)
                FROM posts
                WHERE posts.categoryId = Category.id
                AND posts.status = 'published'
              )`),
              'postsCount'
            ]
          ]
        },
        order: [['sortOrder', 'ASC'], ['name', 'ASC']],
        group: ['Category.id']
      });
    }

    res.json({
      success: true,
      data: { categories }
    });

  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/categories/:id - Obtener una categoría específica
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id, {
      include: [
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name', 'slug']
        },
        {
          model: Category,
          as: 'children',
          attributes: ['id', 'name', 'slug', 'description', 'color']
        }
      ]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    res.json({
      success: true,
      data: { category }
    });

  } catch (error) {
    console.error('Error al obtener categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/categories/slug/:slug - Obtener categoría por slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({
      where: { slug, isActive: true },
      include: [
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name', 'slug']
        },
        {
          model: Category,
          as: 'children',
          where: { isActive: true },
          required: false,
          attributes: ['id', 'name', 'slug', 'description', 'color']
        }
      ]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    res.json({
      success: true,
      data: { category }
    });

  } catch (error) {
    console.error('Error al obtener categoría por slug:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/categories - Crear nueva categoría
router.post('/', authenticateToken, authorizeRoles('admin', 'super_admin', 'editor'), categoryValidation, async (req, res) => {
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
      name,
      description,
      color,
      parentId,
      sortOrder = 0,
      metaTitle,
      metaDescription,
      featuredImage
    } = req.body;

    // Verificar que la categoría padre existe si se proporciona
    if (parentId) {
      const parentCategory = await Category.findByPk(parentId);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Categoría padre no encontrada'
        });
      }
    }

    const category = await Category.create({
      name,
      description,
      color,
      parentId,
      sortOrder,
      metaTitle,
      metaDescription,
      featuredImage
    });

    res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: { category }
    });

  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/categories/:id - Actualizar categoría
router.put('/:id', authenticateToken, authorizeRoles('admin', 'super_admin', 'editor'), categoryValidation, async (req, res) => {
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
    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    const {
      name,
      description,
      color,
      parentId,
      sortOrder,
      isActive,
      metaTitle,
      metaDescription,
      featuredImage
    } = req.body;

    // Verificar que no se esté asignando como padre a sí misma o a una de sus hijas
    if (parentId && parentId == id) {
      return res.status(400).json({
        success: false,
        message: 'Una categoría no puede ser su propia categoría padre'
      });
    }

    if (parentId) {
      const parentCategory = await Category.findByPk(parentId);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Categoría padre no encontrada'
        });
      }

      // Verificar que no haya referencias circulares
      if (parentCategory.parentId == id) {
        return res.status(400).json({
          success: false,
          message: 'No se puede crear una referencia circular'
        });
      }
    }

    await category.update({
      name,
      description,
      color,
      parentId,
      sortOrder,
      isActive,
      metaTitle,
      metaDescription,
      featuredImage
    });

    const updatedCategory = await Category.findByPk(id, {
      include: [
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name', 'slug']
        },
        {
          model: Category,
          as: 'children',
          attributes: ['id', 'name', 'slug']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      data: { category: updatedCategory }
    });

  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/categories/:id - Eliminar categoría
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reassignTo } = req.body;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    // Verificar si tiene posts asociados
    const postsCount = await Post.count({
      where: { categoryId: id }
    });

    if (postsCount > 0) {
      if (!reassignTo) {
        return res.status(400).json({
          success: false,
          message: 'La categoría tiene posts asociados. Proporciona una categoría de destino.',
          data: { postsCount }
        });
      }

      // Verificar que la categoría de destino existe
      const targetCategory = await Category.findByPk(reassignTo);
      if (!targetCategory) {
        return res.status(400).json({
          success: false,
          message: 'Categoría de destino no encontrada'
        });
      }

      // Reasignar posts a la nueva categoría
      await Post.update(
        { categoryId: reassignTo },
        { where: { categoryId: id } }
      );
    }

    // Verificar si tiene categorías hijas
    const childrenCount = await Category.count({
      where: { parentId: id }
    });

    if (childrenCount > 0) {
      // Mover las categorías hijas al nivel padre
      await Category.update(
        { parentId: category.parentId },
        { where: { parentId: id } }
      );
    }

    await category.destroy();

    res.json({
      success: true,
      message: 'Categoría eliminada exitosamente',
      data: { postsReassigned: postsCount }
    });

  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/categories/:id/posts - Obtener posts de una categoría
router.get('/:id/posts', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, status = 'published' } = req.query;
    const offset = (page - 1) * limit;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    const { count, rows: posts } = await Post.findAndCountAll({
      where: { 
        categoryId: id,
        status
      },
      include: [
        {
          model: require('../models').User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
        }
      ],
      order: [['publishedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        category,
        posts,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener posts de categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/categories/reorder - Reordenar categorías
router.put('/reorder', authenticateToken, authorizeRoles('admin', 'super_admin', 'editor'), async (req, res) => {
  try {
    const { categories } = req.body;

    if (!Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de categorías'
      });
    }

    // Actualizar el orden de cada categoría
    const updatePromises = categories.map((cat, index) => {
      return Category.update(
        { sortOrder: index },
        { where: { id: cat.id } }
      );
    });

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Orden de categorías actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error al reordenar categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;