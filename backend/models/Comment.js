'use strict';

module.exports = (sequelize, DataTypes) => {
  const Comment = sequelize.define('Comment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [1, 2000]
      }
    },
    authorName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    authorEmail: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    authorUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    authorIp: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'posts',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'comments',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'spam', 'trash'),
      defaultValue: 'pending',
      allowNull: false
    },
    likesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isReply: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    tableName: 'comments',
    timestamps: true,
    hooks: {
      beforeCreate: (comment) => {
        comment.isReply = comment.parentId ? true : false;
      },
      beforeUpdate: (comment) => {
        if (comment.changed('parentId')) {
          comment.isReply = comment.parentId ? true : false;
        }
      }
    }
  });

  Comment.associate = function(models) {
    Comment.belongsTo(models.Post, {
      foreignKey: 'postId',
      as: 'post'
    });
    
    Comment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    // Relación jerárquica para respuestas
    Comment.hasMany(models.Comment, {
      foreignKey: 'parentId',
      as: 'replies'
    });
    
    Comment.belongsTo(models.Comment, {
      foreignKey: 'parentId',
      as: 'parent'
    });

    // Relación con likes
    Comment.hasMany(models.Like, {
      foreignKey: 'commentId',
      as: 'likes'
    });
  };

  return Comment;
};