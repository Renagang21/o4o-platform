"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const MediaController_1 = require("../../controllers/MediaController");
const router = (0, express_1.Router)();
const mediaController = new MediaController_1.MediaController();
// Apply authentication to all routes
router.use(auth_1.authenticateToken);
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
exports.default = router;
//# sourceMappingURL=media.routes.js.map