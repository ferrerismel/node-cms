const express = require('express');
const { body, validationResult } = require('express-validator');
const { Comment, User, Post } = require('../models');
const { authenticateToken, authorizeRoles, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Validaciones
const commentValidation = [
  body('content')
    .isLength({ min: 1, max: 2000 })
    .withMessage('El contenido debe tener entre 1 y 2000 caracteres')
    .trim(),
  body('postId')
    .isInt()
    .withMessage('ID de post requerido'),
  body('parentId')
    .optional()
    .isInt()
    .withMessage('ID de comentario padre debe ser un número')
];

// GET /api/comments - Obtener comentarios (admin)
router.get('/', authenticateToken, authorizeRoles('admin', 'super_admin', 'editor'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, postId } = req.query;
    const offset = (page - 1) * limit;

    const whereConditions = {};
    if (status) whereConditions.status = status;
    if (postId) whereConditions.postId = postId;

    const { count, rows: comments } = await Comment.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
        },
        {
          model: Post,
          as: 'post',
          attributes: ['id', 'title', 'slug']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/comments - Crear comentario
router.post('/', optionalAuth, commentValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.array()
      });
    }

    const { content, postId, parentId, authorName, authorEmail, authorUrl } = req.body;

    // Verificar que el post existe
    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }

    if (!post.allowComments) {
      return res.status(400).json({
        success: false,
        message: 'Los comentarios están deshabilitados para este post'
      });
    }

    // Verificar comentario padre si se proporciona
    if (parentId) {
      const parentComment = await Comment.findByPk(parentId);
      if (!parentComment || parentComment.postId !== parseInt(postId)) {
        return res.status(400).json({
          success: false,
          message: 'Comentario padre no válido'
        });
      }
    }

    const commentData = {
      content,
      postId,
      parentId,
      authorIp: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'pending' // Requiere aprobación por defecto
    };

    if (req.user) {
      // Usuario autenticado
      commentData.userId = req.user.id;
      // Los usuarios autenticados pueden tener sus comentarios auto-aprobados
      if (['admin', 'super_admin', 'editor', 'author'].includes(req.user.role)) {
        commentData.status = 'approved';
      }
    } else {
      // Usuario anónimo
      if (!authorName || !authorEmail) {
        return res.status(400).json({
          success: false,
          message: 'Nombre y email son requeridos para comentarios anónimos'
        });
      }
      
      commentData.authorName = authorName;
      commentData.authorEmail = authorEmail;
      commentData.authorUrl = authorUrl;
    }

    const comment = await Comment.create(commentData);

    // Incrementar contador de comentarios del post si está aprobado
    if (comment.status === 'approved') {
      await post.increment('commentsCount');
    }

    res.status(201).json({
      success: true,
      message: comment.status === 'approved' ? 'Comentario publicado' : 'Comentario enviado para revisión',
      data: { comment }
    });

  } catch (error) {
    console.error('Error al crear comentario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/comments/:id/approve - Aprobar comentario
router.put('/:id/approve', authenticateToken, authorizeRoles('admin', 'super_admin', 'editor'), async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findByPk(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comentario no encontrado'
      });
    }

    if (comment.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'El comentario ya está aprobado'
      });
    }

    await comment.update({ status: 'approved' });

    // Incrementar contador del post
    const post = await Post.findByPk(comment.postId);
    if (post) {
      await post.increment('commentsCount');
    }

    res.json({
      success: true,
      message: 'Comentario aprobado exitosamente',
      data: { comment }
    });

  } catch (error) {
    console.error('Error al aprobar comentario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/comments/:id - Eliminar comentario
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findByPk(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comentario no encontrado'
      });
    }

    // Verificar permisos
    const canDelete = 
      ['admin', 'super_admin', 'editor'].includes(req.user.role) ||
      (comment.userId && comment.userId === req.user.id);

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar este comentario'
      });
    }

    // Decrementar contador si estaba aprobado
    if (comment.status === 'approved') {
      const post = await Post.findByPk(comment.postId);
      if (post) {
        await post.decrement('commentsCount');
      }
    }

    await comment.destroy();

    res.json({
      success: true,
      message: 'Comentario eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar comentario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;