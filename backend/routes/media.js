const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { Media, User } = require('../models');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Configuración de multer para upload de archivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4',
    'video/webm',
    'audio/mp3',
    'audio/wav'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB por defecto
  }
});

// GET /api/media - Obtener archivos multimedia
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereConditions = {};

    // Filtro por tipo
    if (type) {
      whereConditions.type = type;
    }

    // Búsqueda
    if (search) {
      whereConditions[require('sequelize').Op.or] = [
        { originalName: { [require('sequelize').Op.like]: `%${search}%` } },
        { alt: { [require('sequelize').Op.like]: `%${search}%` } },
        { caption: { [require('sequelize').Op.like]: `%${search}%` } }
      ];
    }

    // Solo mostrar archivos del usuario si no es admin
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      whereConditions.uploadedBy = req.user.id;
    }

    const { count, rows: media } = await Media.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        media,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener archivos multimedia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/media/upload - Subir archivo
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo'
      });
    }

    const { alt, caption, description, postId } = req.body;
    const file = req.file;
    
    let width, height, duration;

    // Procesar imagen si es imagen
    if (file.mimetype.startsWith('image/')) {
      try {
        const metadata = await sharp(file.path).metadata();
        width = metadata.width;
        height = metadata.height;

        // Crear thumbnail para imágenes
        const thumbnailPath = path.join(
          path.dirname(file.path),
          'thumb_' + file.filename
        );
        
        await sharp(file.path)
          .resize(300, 300, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath);

      } catch (error) {
        console.error('Error al procesar imagen:', error);
      }
    }

    // Crear registro en base de datos
    const media = await Media.create({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      url: `/uploads/${file.filename}`,
      alt,
      caption,
      description,
      uploadedBy: req.user.id,
      postId: postId || null,
      width,
      height,
      duration,
      metadata: {
        originalPath: file.path,
        uploadDate: new Date(),
        userAgent: req.get('User-Agent')
      }
    });

    res.status(201).json({
      success: true,
      message: 'Archivo subido exitosamente',
      data: { media }
    });

  } catch (error) {
    // Limpiar archivo si hubo error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error al eliminar archivo:', unlinkError);
      }
    }

    console.error('Error al subir archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir archivo'
    });
  }
});

// POST /api/media/upload-multiple - Subir múltiples archivos
router.post('/upload-multiple', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron archivos'
      });
    }

    const { postId } = req.body;
    const uploadedMedia = [];

    for (const file of req.files) {
      let width, height;

      if (file.mimetype.startsWith('image/')) {
        try {
          const metadata = await sharp(file.path).metadata();
          width = metadata.width;
          height = metadata.height;
        } catch (error) {
          console.error('Error al procesar imagen:', error);
        }
      }

      const media = await Media.create({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        url: `/uploads/${file.filename}`,
        uploadedBy: req.user.id,
        postId: postId || null,
        width,
        height,
        metadata: {
          originalPath: file.path,
          uploadDate: new Date()
        }
      });

      uploadedMedia.push(media);
    }

    res.status(201).json({
      success: true,
      message: `${uploadedMedia.length} archivos subidos exitosamente`,
      data: { media: uploadedMedia }
    });

  } catch (error) {
    console.error('Error al subir archivos múltiples:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir archivos'
    });
  }
});

// GET /api/media/:id - Obtener archivo específico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const media = await Media.findByPk(id, {
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ]
    });

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    // Verificar permisos
    if (!['admin', 'super_admin'].includes(req.user.role) && 
        media.uploadedBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver este archivo'
      });
    }

    res.json({
      success: true,
      data: { media }
    });

  } catch (error) {
    console.error('Error al obtener archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/media/:id - Actualizar metadatos del archivo
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { alt, caption, description } = req.body;

    const media = await Media.findByPk(id);
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    // Verificar permisos
    const canEdit = 
      ['admin', 'super_admin'].includes(req.user.role) ||
      media.uploadedBy === req.user.id;

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para editar este archivo'
      });
    }

    await media.update({
      alt,
      caption,
      description
    });

    res.json({
      success: true,
      message: 'Metadatos actualizados exitosamente',
      data: { media }
    });

  } catch (error) {
    console.error('Error al actualizar archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/media/:id - Eliminar archivo
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const media = await Media.findByPk(id);
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    // Verificar permisos
    const canDelete = 
      ['admin', 'super_admin'].includes(req.user.role) ||
      media.uploadedBy === req.user.id;

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar este archivo'
      });
    }

    // Eliminar archivo físico
    try {
      await fs.unlink(media.path);
      
      // Eliminar thumbnail si existe
      const thumbnailPath = path.join(
        path.dirname(media.path),
        'thumb_' + media.filename
      );
      
      try {
        await fs.unlink(thumbnailPath);
      } catch (error) {
        // El thumbnail puede no existir
      }
    } catch (error) {
      console.error('Error al eliminar archivo físico:', error);
    }

    await media.destroy();

    res.json({
      success: true,
      message: 'Archivo eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/media/stats/overview - Estadísticas de archivos multimedia
router.get('/stats/overview', authenticateToken, authorizeRoles('admin', 'super_admin', 'editor'), async (req, res) => {
  try {
    const totalFiles = await Media.count();
    const totalSize = await Media.sum('size');
    
    const filesByType = await Media.findAll({
      attributes: [
        'type',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
        [require('sequelize').fn('SUM', require('sequelize').col('size')), 'totalSize']
      ],
      group: ['type']
    });

    const recentUploads = await Media.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalFiles,
          totalSize,
          averageSize: totalFiles > 0 ? Math.round(totalSize / totalFiles) : 0
        },
        filesByType,
        recentUploads
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;