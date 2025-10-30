import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { MediaController } from '../../controllers/MediaController.js';
import { MediaUploadController, upload } from '../../controllers/media/mediaUploadController.js';

const router: Router = Router();
const mediaController = new MediaController();

// Apply authentication to all routes
router.use(authenticate);

// Logo/Media upload routes (for customizer)
router.post('/upload', upload.single('file') as any, MediaUploadController.uploadMedia);
router.post('/upload-multiple', mediaController.uploadMultiple);

// Folder routes (must come before specific ID routes)
router.get('/folders', mediaController.getFolders);
router.post('/folders', mediaController.createFolder);
router.delete('/folders/:id', mediaController.deleteFolder);

// Media item routes
router.get('/', mediaController.getMedia);
router.get('/:id', mediaController.getMediaById);
router.put('/:id', mediaController.updateMedia);
router.put('/:id/replace', mediaController.replaceMedia);
router.delete('/:id', mediaController.deleteMedia);

export default router;
