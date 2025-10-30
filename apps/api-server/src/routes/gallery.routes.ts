import { Router } from 'express';
import { GalleryController } from '../controllers/GalleryController.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router: Router = Router();
const galleryController = new GalleryController();

// Public routes (for viewing images)
router.get('/', galleryController.getGalleryImages.bind(galleryController)); // Root media endpoint
router.get('/images', galleryController.getGalleryImages.bind(galleryController));

// Protected routes (require authentication)
router.post('/upload', authenticate, ...galleryController.uploadGalleryImages);
router.patch('/images/:id', authenticate, galleryController.updateGalleryImage.bind(galleryController));
router.patch('/:id', authenticate, galleryController.updateGalleryImage.bind(galleryController)); // Root update endpoint
router.delete('/images/:id', authenticate, galleryController.deleteGalleryImage.bind(galleryController));
router.delete('/:id', authenticate, galleryController.deleteGalleryImage.bind(galleryController)); // Root delete endpoint

export default router;