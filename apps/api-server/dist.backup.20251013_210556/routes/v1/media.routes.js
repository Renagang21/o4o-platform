"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const MediaController_1 = require("../../controllers/MediaController");
const mediaUploadController_1 = require("../../controllers/media/mediaUploadController");
const router = (0, express_1.Router)();
const mediaController = new MediaController_1.MediaController();
// Apply authentication to all routes
router.use(auth_middleware_1.authenticate);
// Logo/Media upload routes (for customizer)
router.post('/upload', mediaUploadController_1.upload.single('file'), mediaUploadController_1.MediaUploadController.uploadMedia);
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
exports.default = router;
//# sourceMappingURL=media.routes.js.map