import { Router } from 'express';
import { authenticateJWT } from '../../middleware/auth';
import { MediaController } from '../../controllers/MediaController';

const router = Router();
const mediaController = new MediaController();

// Apply authentication to all routes
router.use(authenticateJWT);

// Media file routes
router.post('/upload', mediaController.uploadSingle);
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