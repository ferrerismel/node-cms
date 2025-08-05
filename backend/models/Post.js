'use strict';
const slugify = require('slugify');

module.exports = (sequelize, DataTypes) => {
  const Post = sequelize.define('Post', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [3, 255]
      }
    },
    slug: {
      type: DataTypes.STRING(300),
      allowNull: false,
      unique: true
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    },
    excerpt: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'private', 'pending', 'trash'),
      defaultValue: 'draft',
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('post', 'page', 'product', 'event'),
      defaultValue: 'post',
      allowNull: false
    },
    featuredImage: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    authorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    viewsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    likesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    commentsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    allowComments: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isSticky: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    seoTitle: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    seoDescription: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    seoKeywords: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    customFields: {
      type: DataTypes.JSON,
      allowNull: true
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    readingTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Tiempo estimado de lectura en minutos'
    }
  }, {
    tableName: 'posts',
    timestamps: true,
    hooks: {
      beforeCreate: (post) => {
        if (!post.slug && post.title) {
          post.slug = slugify(post.title, { lower: true, strict: true });
        }
        if (post.status === 'published' && !post.publishedAt) {
          post.publishedAt = new Date();
        }
        // Calcular tiempo de lectura (aprox 200 palabras por minuto)
        if (post.content) {
          const wordCount = post.content.split(/\s+/).length;
          post.readingTime = Math.ceil(wordCount / 200);
        }
      },
      beforeUpdate: (post) => {
        if (post.changed('title')) {
          post.slug = slugify(post.title, { lower: true, strict: true });
        }
        if (post.changed('status') && post.status === 'published' && !post.publishedAt) {
          post.publishedAt = new Date();
        }
        if (post.changed('content')) {
          const wordCount = post.content.split(/\s+/).length;
          post.readingTime = Math.ceil(wordCount / 200);
        }
      }
    }
  });

  Post.associate = function(models) {
    Post.belongsTo(models.User, {
      foreignKey: 'authorId',
      as: 'author'
    });
    
    Post.belongsTo(models.Category, {
      foreignKey: 'categoryId',
      as: 'category'
    });
    
    Post.hasMany(models.Comment, {
      foreignKey: 'postId',
      as: 'comments'
    });

    Post.hasMany(models.Media, {
      foreignKey: 'postId',
      as: 'attachments'
    });

    // Relación muchos a muchos con categorías
    Post.belongsToMany(models.Category, {
      through: 'PostCategories',
      foreignKey: 'postId',
      otherKey: 'categoryId',
      as: 'categories'
    });

    // Relación muchos a muchos con tags
    Post.belongsToMany(models.Tag, {
      through: 'PostTags',
      foreignKey: 'postId',
      otherKey: 'tagId',
      as: 'tags'
    });

    // Relaciones con likes (opcional)
    Post.hasMany(models.Like, {
      foreignKey: 'postId',
      as: 'likes'
    });
  };

  return Post;
};