"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const GalleryController_1 = require("../controllers/GalleryController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const galleryController = new GalleryController_1.GalleryController();
// Public routes (for viewing images)
router.get('/', galleryController.getGalleryImages.bind(galleryController)); // Root media endpoint
router.get('/images', galleryController.getGalleryImages.bind(galleryController));
// Protected routes (require authentication)
router.post('/upload', auth_middleware_1.authenticate, ...galleryController.uploadGalleryImages);
router.patch('/images/:id', auth_middleware_1.authenticate, galleryController.updateGalleryImage.bind(galleryController));
router.patch('/:id', auth_middleware_1.authenticate, galleryController.updateGalleryImage.bind(galleryController)); // Root update endpoint
router.delete('/images/:id', auth_middleware_1.authenticate, galleryController.deleteGalleryImage.bind(galleryController));
router.delete('/:id', auth_middleware_1.authenticate, galleryController.deleteGalleryImage.bind(galleryController)); // Root delete endpoint
exports.default = router;
//# sourceMappingURL=gallery.routes.js.map