'use strict';

module.exports = (sequelize, DataTypes) => {
  const Like = sequelize.define('Like', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'posts',
        key: 'id'
      }
    },
    commentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'comments',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM('like', 'dislike', 'love', 'laugh', 'angry', 'sad'),
      defaultValue: 'like',
      allowNull: false
    }
  }, {
    tableName: 'likes',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'postId'],
        where: {
          postId: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      },
      {
        unique: true,
        fields: ['userId', 'commentId'],
        where: {
          commentId: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      }
    ],
    validate: {
      eitherPostOrComment() {
        if ((this.postId && this.commentId) || (!this.postId && !this.commentId)) {
          throw new Error('Un like debe estar asociado a un post O a un comentario, no a ambos o ninguno');
        }
      }
    }
  });

  Like.associate = function(models) {
    Like.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    Like.belongsTo(models.Post, {
      foreignKey: 'postId',
      as: 'post'
    });
    
    Like.belongsTo(models.Comment, {
      foreignKey: 'commentId',
      as: 'comment'
    });
  };

  return Like;
};