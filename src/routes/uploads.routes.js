import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { requireAdmin } from '../middleware/authenticate.js';
import { httpError } from '../utils/httpError.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!/^image\/(jpeg|png|webp|heic|heif|avif|gif|bmp|tiff)$/.test(file.mimetype)) {
      callback(httpError(
        400,
        'INVALID_IMAGE',
        `نوع الصورة غير مدعوم: ${file.mimetype || 'غير معروف'}`,
      ));
      return;
    }
    callback(null, true);
  },
});

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
});

router.post('/item-image', requireAdmin, upload.single('image'), async (req, res, next) => {
  if (!req.file) {
    return next(httpError(400, 'IMAGE_REQUIRED', 'اختر صورة للصنف'));
  }
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    return next(httpError(503, 'CLOUDINARY_NOT_CONFIGURED', 'خدمة رفع الصور غير مهيأة'));
  }

  const stream = cloudinary.uploader.upload_stream(
    {
      folder: 'caffee/items',
      resource_type: 'image',
      transformation: [
        { width: 900, height: 900, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    },
    (error, result) => {
      if (error) {
        return next(error);
      }
      res.status(201).json({
        success: true,
        data: {
          imageUrl: result.secure_url,
          publicId: result.public_id,
        },
      });
    },
  );

  stream.end(req.file.buffer);
});

export default router;
