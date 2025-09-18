import { Router } from 'express';
import { GalleryController } from '../controllers/GalleryController';
import { authenticateToken } from '../middleware/auth';

const router: Router = Router();
const galleryController = new GalleryController();

// Public routes (for viewing images)
router.get('/', galleryController.getGalleryImages.bind(galleryController)); // Root media endpoint
router.get('/images', galleryController.getGalleryImages.bind(galleryController));

// Protected routes (require authentication)
router.post('/upload', authenticateToken, ...galleryController.uploadGalleryImages);
router.patch('/images/:id', authenticateToken, galleryController.updateGalleryImage.bind(galleryController));
router.delete('/images/:id', authenticateToken, galleryController.deleteGalleryImage.bind(galleryController));

export default router;