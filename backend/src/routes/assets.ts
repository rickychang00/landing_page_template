import { Router, Request, Response } from 'express';
import multer from 'multer';
import { uploadAsset } from '../lib/blob';
import { requireAuth } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /assets — admin only
router.post('/', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  try {
    const url = await uploadAsset(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.status(201).json({ url });
  } catch (err: any) {
    console.error('[Assets] Upload failed:', err.message);
    res.status(500).json({ error: 'File upload failed. Check BLOB_READ_WRITE_TOKEN in backend/.env' });
  }
});

export default router;
