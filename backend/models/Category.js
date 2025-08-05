'use strict';
const slugify = require('slugify');

module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [2, 100]
      }
    },
    slug: {
      type: DataTypes.STRING(120),
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
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    metaTitle: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    metaDescription: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    featuredImage: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'categories',
    timestamps: true,
    hooks: {
      beforeCreate: (category) => {
        if (!category.slug && category.name) {
          category.slug = slugify(category.name, { lower: true, strict: true });
        }
      },
      beforeUpdate: (category) => {
        if (category.changed('name')) {
          category.slug = slugify(category.name, { lower: true, strict: true });
        }
      }
    }
  });

  Category.associate = function(models) {
    Category.hasMany(models.Post, {
      foreignKey: 'categoryId',
      as: 'posts'
    });
    
    // Relación jerárquica
    Category.hasMany(models.Category, {
      foreignKey: 'parentId',
      as: 'children'
    });
    
    Category.belongsTo(models.Category, {
      foreignKey: 'parentId',
      as: 'parent'
    });

    // Relación muchos a muchos con posts
    Category.belongsToMany(models.Post, {
      through: 'PostCategories',
      foreignKey: 'categoryId',
      otherKey: 'postId',
      as: 'categoryPosts'
    });
  };

  return Category;
};