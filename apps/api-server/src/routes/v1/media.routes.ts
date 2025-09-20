import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { MediaController } from '../../controllers/MediaController';
import { MediaUploadController, upload } from '../../controllers/media/mediaUploadController';

const router: Router = Router();
const mediaController = new MediaController();

// Apply authentication to all routes
router.use(authenticateToken);

// Logo/Media upload routes (for customizer)
router.post('/upload', upload.single('file') as any, MediaUploadController.uploadMedia);
router.post('/upload-multiple', mediaController.uploadMultiple);
router.get('/', mediaController.getMedia);
router.get('/:id', mediaController.getMediaById);
router.put('/:id', mediaController.updateMedia);
router.delete('/:id', mediaController.deleteMedia);

// Folder routes  
router.get('/folders', mediaController.getFolders);
router.post('/folders', mediaController.createFolder);
router.delete('/folders/:id', mediaController.deleteFolder);

export default router;