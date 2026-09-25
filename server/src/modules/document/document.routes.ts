import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { DocumentController } from './document.controller';
import { requireAuth, requireActiveSubscription } from '../../shared/middlewares/auth.middleware';

const router = Router();
router.use(requireAuth);

// Konfigurasi Multer untuk penyimpanan berkas
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Maksimal 50 MB
});

router.get('/', DocumentController.getAll);
router.post('/upload', requireActiveSubscription, upload.single('file'), DocumentController.upload);
router.put('/:id', DocumentController.update);
router.delete('/:id', DocumentController.remove);
router.patch('/:id/toggle', DocumentController.toggle);

export default router;
