'use strict';
const slugify = require('slugify');

module.exports = (sequelize, DataTypes) => {
  const Tag = sequelize.define('Tag', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [2, 50]
      }
    },
    slug: {
      type: DataTypes.STRING(60),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: true,
      validate: {
        is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
      }
    },
    postsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'tags',
    timestamps: true,
    hooks: {
      beforeCreate: (tag) => {
        if (!tag.slug && tag.name) {
          tag.slug = slugify(tag.name, { lower: true, strict: true });
        }
      },
      beforeUpdate: (tag) => {
        if (tag.changed('name')) {
          tag.slug = slugify(tag.name, { lower: true, strict: true });
        }
      }
    }
  });

  Tag.associate = function(models) {
    Tag.belongsToMany(models.Post, {
      through: 'PostTags',
      foreignKey: 'tagId',
      otherKey: 'postId',
      as: 'posts'
    });
  };

  return Tag;
};