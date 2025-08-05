const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Post, User, Category, Tag, Comment, Like, Media } = require('../models');
const { 
  authenticateToken, 
  authorizeRoles,
  optionalAuth 
} = require('../middleware/auth');

const router = express.Router();

// Validaciones
const postValidation = [
  body('title')
    .isLength({ min: 3, max: 255 })
    .withMessage('El título debe tener entre 3 y 255 caracteres')
    .trim(),
  body('content')
    .isLength({ min: 10 })
    .withMessage('El contenido debe tener al menos 10 caracteres'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'private', 'pending', 'trash'])
    .withMessage('Estado inválido'),
  body('type')
    .optional()
    .isIn(['post', 'page', 'product', 'event'])
    .withMessage('Tipo inválido'),
  body('categoryId')
    .optional()
    .isInt()
    .withMessage('ID de categoría debe ser un número'),
  body('tagIds')
    .optional()
    .isArray()
    .withMessage('Los tags deben ser un array'),
  body('excerpt')
    .optional()
    .isLength({ max: 500 })
    .withMessage('El extracto no puede superar los 500 caracteres')
];

// GET /api/posts - Obtener posts con filtros y paginación
router.get('/', optionalAuth, [
  query('page').optional().isInt({ min: 1 }).withMessage('La página debe ser un número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100'),
  query('status').optional().isIn(['draft', 'published', 'private', 'pending', 'trash']),
  query('type').optional().isIn(['post', 'page', 'product', 'event']),
  query('categoryId').optional().isInt(),
  query('authorId').optional().isInt(),
  query('search').optional().isLength({ min: 2 }).withMessage('La búsqueda debe tener al menos 2 caracteres'),
  query('featured').optional().isBoolean(),
  query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'publishedAt', 'title', 'viewsCount', 'likesCount']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
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
      page = 1,
      limit = 10,
      status,
      type = 'post',
      categoryId,
      authorId,
      search,
      featured,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;

    // Construir condiciones WHERE
    const whereConditions = {
      type
    };

    // Solo mostrar posts publicados si no es admin/editor o no es el autor
    if (!req.user || !['admin', 'super_admin', 'editor'].includes(req.user.role)) {
      whereConditions.status = 'published';
      whereConditions.publishedAt = { [Op.lte]: new Date() };
    } else if (status) {
      whereConditions.status = status;
    }

    // Filtros adicionales
    if (categoryId) whereConditions.categoryId = categoryId;
    if (authorId) whereConditions.authorId = authorId;
    if (featured !== undefined) whereConditions.isFeatured = featured === 'true';

    // Búsqueda
    if (search) {
      whereConditions[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
        { excerpt: { [Op.like]: `%${search}%` } }
      ];
    }

    // Si es el autor, puede ver sus propios posts
    if (req.user && authorId && authorId == req.user.id) {
      delete whereConditions.status;
      delete whereConditions.publishedAt;
      if (status) whereConditions.status = status;
    }

    const { count, rows: posts } = await Post.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug', 'color']
        },
        {
          model: Tag,
          as: 'tags',
          attributes: ['id', 'name', 'slug', 'color'],
          through: { attributes: [] }
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener posts:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/posts/:id - Obtener un post específico
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const whereCondition = { id };
    
    // Solo mostrar posts publicados si no es admin/editor o no es el autor
    if (!req.user || !['admin', 'super_admin', 'editor'].includes(req.user.role)) {
      whereCondition.status = 'published';
      whereCondition.publishedAt = { [Op.lte]: new Date() };
    }

    const post = await Post.findOne({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'bio']
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug', 'color', 'description']
        },
        {
          model: Tag,
          as: 'tags',
          attributes: ['id', 'name', 'slug', 'color'],
          through: { attributes: [] }
        },
        {
          model: Comment,
          as: 'comments',
          where: { status: 'approved' },
          required: false,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
            }
          ],
          order: [['createdAt', 'DESC']]
        },
        {
          model: Media,
          as: 'attachments',
          attributes: ['id', 'filename', 'originalName', 'url', 'type', 'alt', 'caption']
        }
      ]
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }

    // Si es el autor, puede ver el post aunque no esté publicado
    if (req.user && post.authorId === req.user.id) {
      // El post ya se obtuvo sin restricciones de status
    }

    // Incrementar contador de vistas (solo para posts publicados)
    if (post.status === 'published') {
      await post.increment('viewsCount');
    }

    res.json({
      success: true,
      data: { post }
    });

  } catch (error) {
    console.error('Error al obtener post:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/posts/slug/:slug - Obtener post por slug
router.get('/slug/:slug', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;

    const whereCondition = { slug };
    
    if (!req.user || !['admin', 'super_admin', 'editor'].includes(req.user.role)) {
      whereCondition.status = 'published';
      whereCondition.publishedAt = { [Op.lte]: new Date() };
    }

    const post = await Post.findOne({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'bio']
        },
        {
          model: Category,
          as: 'category'
        },
        {
          model: Tag,
          as: 'tags',
          through: { attributes: [] }
        },
        {
          model: Comment,
          as: 'comments',
          where: { status: 'approved' },
          required: false,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
            }
          ]
        }
      ]
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }

    // Incrementar vistas
    if (post.status === 'published') {
      await post.increment('viewsCount');
    }

    res.json({
      success: true,
      data: { post }
    });

  } catch (error) {
    console.error('Error al obtener post por slug:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/posts - Crear nuevo post
router.post('/', authenticateToken, authorizeRoles('admin', 'super_admin', 'editor', 'author'), postValidation, async (req, res) => {
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
      title,
      content,
      excerpt,
      status = 'draft',
      type = 'post',
      categoryId,
      tagIds = [],
      featuredImage,
      allowComments = true,
      isFeatured = false,
      isSticky = false,
      seoTitle,
      seoDescription,
      seoKeywords,
      customFields
    } = req.body;

    // Verificar que la categoría existe si se proporciona
    if (categoryId) {
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }
    }

    // Crear el post
    const post = await Post.create({
      title,
      content,
      excerpt,
      status,
      type,
      categoryId,
      featuredImage,
      authorId: req.user.id,
      allowComments,
      isFeatured,
      isSticky,
      seoTitle,
      seoDescription,
      seoKeywords,
      customFields
    });

    // Asociar tags si se proporcionan
    if (tagIds.length > 0) {
      const tags = await Tag.findAll({
        where: { id: { [Op.in]: tagIds } }
      });
      await post.setTags(tags);
    }

    // Obtener el post completo con relaciones
    const createdPost = await Post.findByPk(post.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
        },
        {
          model: Category,
          as: 'category'
        },
        {
          model: Tag,
          as: 'tags',
          through: { attributes: [] }
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Post creado exitosamente',
      data: { post: createdPost }
    });

  } catch (error) {
    console.error('Error al crear post:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/posts/:id - Actualizar post
router.put('/:id', authenticateToken, postValidation, async (req, res) => {
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
    const post = await Post.findByPk(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }

    // Verificar permisos: admin/super_admin pueden editar cualquier post, 
    // editor puede editar posts de cualquier autor,
    // author solo puede editar sus propios posts
    const canEdit = 
      ['admin', 'super_admin'].includes(req.user.role) ||
      (req.user.role === 'editor') ||
      (req.user.role === 'author' && post.authorId === req.user.id);

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para editar este post'
      });
    }

    const {
      title,
      content,
      excerpt,
      status,
      type,
      categoryId,
      tagIds,
      featuredImage,
      allowComments,
      isFeatured,
      isSticky,
      seoTitle,
      seoDescription,
      seoKeywords,
      customFields
    } = req.body;

    // Verificar categoría si se proporciona
    if (categoryId && categoryId !== post.categoryId) {
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }
    }

    // Actualizar el post
    await post.update({
      title,
      content,
      excerpt,
      status,
      type,
      categoryId,
      featuredImage,
      allowComments,
      isFeatured,
      isSticky,
      seoTitle,
      seoDescription,
      seoKeywords,
      customFields
    });

    // Actualizar tags si se proporcionan
    if (tagIds && Array.isArray(tagIds)) {
      const tags = await Tag.findAll({
        where: { id: { [Op.in]: tagIds } }
      });
      await post.setTags(tags);
    }

    // Obtener el post actualizado
    const updatedPost = await Post.findByPk(post.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
        },
        {
          model: Category,
          as: 'category'
        },
        {
          model: Tag,
          as: 'tags',
          through: { attributes: [] }
        }
      ]
    });

    res.json({
      success: true,
      message: 'Post actualizado exitosamente',
      data: { post: updatedPost }
    });

  } catch (error) {
    console.error('Error al actualizar post:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/posts/:id - Eliminar post
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findByPk(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }

    // Verificar permisos
    const canDelete = 
      ['admin', 'super_admin'].includes(req.user.role) ||
      (req.user.role === 'editor') ||
      (req.user.role === 'author' && post.authorId === req.user.id);

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar este post'
      });
    }

    await post.destroy();

    res.json({
      success: true,
      message: 'Post eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar post:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/posts/:id/like - Dar like a un post
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'like' } = req.body;

    const post = await Post.findByPk(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }

    // Verificar si ya existe un like del usuario
    const existingLike = await Like.findOne({
      where: {
        userId: req.user.id,
        postId: id
      }
    });

    if (existingLike) {
      // Si es el mismo tipo, eliminar like
      if (existingLike.type === type) {
        await existingLike.destroy();
        await post.decrement('likesCount');
        
        return res.json({
          success: true,
          message: 'Like eliminado',
          data: { liked: false, likesCount: post.likesCount - 1 }
        });
      } else {
        // Cambiar tipo de like
        await existingLike.update({ type });
        
        return res.json({
          success: true,
          message: 'Like actualizado',
          data: { liked: true, likesCount: post.likesCount, likeType: type }
        });
      }
    } else {
      // Crear nuevo like
      await Like.create({
        userId: req.user.id,
        postId: id,
        type
      });
      
      await post.increment('likesCount');

      res.json({
        success: true,
        message: 'Like agregado',
        data: { liked: true, likesCount: post.likesCount + 1, likeType: type }
      });
    }

  } catch (error) {
    console.error('Error al manejar like:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/posts/:id/related - Obtener posts relacionados
router.get('/:id/related', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 5 } = req.query;

    const post = await Post.findByPk(id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id']
        },
        {
          model: Tag,
          as: 'tags',
          attributes: ['id'],
          through: { attributes: [] }
        }
      ]
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }

    const relatedPosts = await Post.findAll({
      where: {
        id: { [Op.ne]: id },
        status: 'published',
        publishedAt: { [Op.lte]: new Date() },
        [Op.or]: [
          { categoryId: post.categoryId },
          // Posts con tags similares se manejarían con una consulta más compleja
        ]
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug', 'color']
        }
      ],
      order: [['publishedAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: { posts: relatedPosts }
    });

  } catch (error) {
    console.error('Error al obtener posts relacionados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;