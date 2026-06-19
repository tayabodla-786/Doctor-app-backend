// utils/gridfs.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.heic',
  '.heif',
  '.bmp',
]);

export const isProfileImageFile = (file) => {
  if (!file) return false;

  const mime = (file.mimetype || '').toLowerCase();
  if (mime.startsWith('image/')) return true;

  const ext = path.extname(file.originalname || '').toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) return true;

  if (mime === 'application/octet-stream' && ext) {
    return IMAGE_EXTENSIONS.has(ext);
  }

  return false;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `doc_${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

export const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

export const profileImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
      let ext = path.extname(file.originalname || '').toLowerCase();
      if (!ext || !IMAGE_EXTENSIONS.has(ext)) {
        ext = '.jpg';
      }
      cb(null, `profile_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isProfileImageFile(file)) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image files are allowed"));
  },
});

export const handleMulterError = (err, req, res, next) => {
  if (!err) return next();

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'Image must be 5MB or smaller',
    });
  }

  if (err.message?.includes('Only image files are allowed')) {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed',
    });
  }

  return next(err);
};
