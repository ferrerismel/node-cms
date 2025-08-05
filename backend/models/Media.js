'use strict';

module.exports = (sequelize, DataTypes) => {
  const Media = sequelize.define('Media', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    path: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('image', 'video', 'audio', 'document', 'other'),
      allowNull: false
    },
    alt: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    caption: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    uploadedBy: {
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
    width: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duración en segundos para videos/audio'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    downloadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    folder: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: 'uploads'
    }
  }, {
    tableName: 'media',
    timestamps: true,
    hooks: {
      beforeCreate: (media) => {
        // Determinar el tipo basado en mimeType
        if (media.mimeType.startsWith('image/')) {
          media.type = 'image';
        } else if (media.mimeType.startsWith('video/')) {
          media.type = 'video';
        } else if (media.mimeType.startsWith('audio/')) {
          media.type = 'audio';
        } else if (media.mimeType.includes('pdf') || media.mimeType.includes('document') || media.mimeType.includes('text')) {
          media.type = 'document';
        } else {
          media.type = 'other';
        }
      }
    }
  });

  Media.associate = function(models) {
    Media.belongsTo(models.User, {
      foreignKey: 'uploadedBy',
      as: 'uploader'
    });
    
    Media.belongsTo(models.Post, {
      foreignKey: 'postId',
      as: 'post'
    });
  };

  return Media;
};