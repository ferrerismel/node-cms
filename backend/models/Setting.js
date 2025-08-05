'use strict';

module.exports = (sequelize, DataTypes) => {
  const Setting = sequelize.define('Setting', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('string', 'number', 'boolean', 'json', 'array'),
      defaultValue: 'string',
      allowNull: false
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'general'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si es público, se puede acceder desde el frontend'
    },
    isEditable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si es editable desde el panel de administración'
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'settings',
    timestamps: true
  });

  Setting.prototype.getParsedValue = function() {
    if (!this.value) return null;
    
    switch (this.type) {
      case 'number':
        return parseFloat(this.value);
      case 'boolean':
        return this.value === 'true' || this.value === '1';
      case 'json':
      case 'array':
        try {
          return JSON.parse(this.value);
        } catch (e) {
          return null;
        }
      default:
        return this.value;
    }
  };

  Setting.setValue = function(key, value, type = 'string') {
    let stringValue = value;
    if (type === 'json' || type === 'array') {
      stringValue = JSON.stringify(value);
    } else if (type === 'boolean') {
      stringValue = value ? 'true' : 'false';
    } else if (type === 'number') {
      stringValue = value.toString();
    }

    return this.upsert({
      key,
      value: stringValue,
      type
    });
  };

  Setting.getValue = async function(key, defaultValue = null) {
    const setting = await this.findOne({ where: { key } });
    if (!setting) return defaultValue;
    return setting.getParsedValue();
  };

  return Setting;
};