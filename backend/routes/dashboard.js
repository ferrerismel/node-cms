const express = require('express');
const { Post, User, Comment, Media, Category, Tag } = require('../models');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats - Estadísticas generales del dashboard
router.get('/stats', authenticateToken, authorizeRoles('admin', 'super_admin', 'editor'), async (req, res) => {
  try {
    // Estadísticas básicas
    const totalPosts = await Post.count();
    const publishedPosts = await Post.count({ where: { status: 'published' } });
    const draftPosts = await Post.count({ where: { status: 'draft' } });
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { status: 'active' } });
    const totalComments = await Comment.count();
    const pendingComments = await Comment.count({ where: { status: 'pending' } });
    const approvedComments = await Comment.count({ where: { status: 'approved' } });
    const totalCategories = await Category.count({ where: { isActive: true } });
    const totalTags = await Tag.count({ where: { isActive: true } });
    const totalMedia = await Media.count();
    const totalMediaSize = await Media.sum('size') || 0;

    // Posts por estado
    const postsByStatus = await Post.findAll({
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['status']
    });

    // Usuarios por rol
    const usersByRole = await User.findAll({
      attributes: [
        'role',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['role']
    });

    // Posts más populares (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const popularPosts = await Post.findAll({
      where: {
        status: 'published',
        publishedAt: { [require('sequelize').Op.gte]: thirtyDaysAgo }
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ],
      order: [['viewsCount', 'DESC']],
      limit: 10
    });

    // Actividad reciente
    const recentPosts = await Post.findAll({
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    const recentComments = await Comment.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: Post,
          as: 'post',
          attributes: ['id', 'title', 'slug']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    const recentUsers = await User.findAll({
      attributes: { exclude: ['password', 'emailVerificationToken', 'passwordResetToken'] },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalPosts,
          publishedPosts,
          draftPosts,
          totalUsers,
          activeUsers,
          totalComments,
          pendingComments,
          approvedComments,
          totalCategories,
          totalTags,
          totalMedia,
          totalMediaSize: Math.round(totalMediaSize / 1024 / 1024) // MB
        },
        charts: {
          postsByStatus,
          usersByRole
        },
        popularPosts,
        recentActivity: {
          posts: recentPosts,
          comments: recentComments,
          users: recentUsers
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/dashboard/analytics - Analíticas detalladas
router.get('/analytics', authenticateToken, authorizeRoles('admin', 'super_admin'), async (req, res) => {
  try {
    const { period = '30' } = req.query; // días
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Posts publicados por día
    const postsPerDay = await Post.findAll({
      attributes: [
        [require('sequelize').fn('DATE', require('sequelize').col('publishedAt')), 'date'],
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      where: {
        status: 'published',
        publishedAt: { [require('sequelize').Op.gte]: startDate }
      },
      group: [require('sequelize').fn('DATE', require('sequelize').col('publishedAt'))],
      order: [[require('sequelize').fn('DATE', require('sequelize').col('publishedAt')), 'ASC']]
    });

    // Usuarios registrados por día
    const usersPerDay = await User.findAll({
      attributes: [
        [require('sequelize').fn('DATE', require('sequelize').col('createdAt')), 'date'],
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      where: {
        createdAt: { [require('sequelize').Op.gte]: startDate }
      },
      group: [require('sequelize').fn('DATE', require('sequelize').col('createdAt'))],
      order: [[require('sequelize').fn('DATE', require('sequelize').col('createdAt')), 'ASC']]
    });

    // Comentarios por día
    const commentsPerDay = await Comment.findAll({
      attributes: [
        [require('sequelize').fn('DATE', require('sequelize').col('createdAt')), 'date'],
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      where: {
        createdAt: { [require('sequelize').Op.gte]: startDate }
      },
      group: [require('sequelize').fn('DATE', require('sequelize').col('createdAt'))],
      order: [[require('sequelize').fn('DATE', require('sequelize').col('createdAt')), 'ASC']]
    });

    // Top categorías
    const topCategories = await Category.findAll({
      attributes: [
        'id',
        'name',
        'slug',
        [
          require('sequelize').literal(`(
            SELECT COUNT(*)
            FROM posts
            WHERE posts.categoryId = Category.id
            AND posts.status = 'published'
          )`),
          'postsCount'
        ]
      ],
      order: [[require('sequelize').literal('postsCount'), 'DESC']],
      limit: 10
    });

    // Top autores
    const topAuthors = await User.findAll({
      attributes: [
        'id',
        'username',
        'firstName',
        'lastName',
        [
          require('sequelize').literal(`(
            SELECT COUNT(*)
            FROM posts
            WHERE posts.authorId = User.id
            AND posts.status = 'published'
          )`),
          'postsCount'
        ]
      ],
      order: [[require('sequelize').literal('postsCount'), 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        timeSeriesData: {
          postsPerDay,
          usersPerDay,
          commentsPerDay
        },
        topContent: {
          categories: topCategories,
          authors: topAuthors
        },
        period: parseInt(period)
      }
    });

  } catch (error) {
    console.error('Error al obtener analíticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/dashboard/quick-actions - Acciones rápidas
router.get('/quick-actions', authenticateToken, authorizeRoles('admin', 'super_admin', 'editor'), async (req, res) => {
  try {
    const pendingCount = await Comment.count({ where: { status: 'pending' } });
    const draftCount = await Post.count({ where: { status: 'draft' } });
    const inactiveUserCount = await User.count({ where: { status: 'inactive' } });

    res.json({
      success: true,
      data: {
        actions: [
          {
            id: 'pending_comments',
            title: 'Comentarios Pendientes',
            count: pendingCount,
            action: '/admin/comments?status=pending',
            icon: 'MessageCircle',
            color: 'orange'
          },
          {
            id: 'draft_posts',
            title: 'Posts en Borrador',
            count: draftCount,
            action: '/admin/posts?status=draft',
            icon: 'FileText',
            color: 'blue'
          },
          {
            id: 'inactive_users',
            title: 'Usuarios Inactivos',
            count: inactiveUserCount,
            action: '/admin/users?status=inactive',
            icon: 'UserX',
            color: 'red'
          }
        ]
      }
    });

  } catch (error) {
    console.error('Error al obtener acciones rápidas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;