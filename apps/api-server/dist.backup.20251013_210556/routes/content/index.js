"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const posts_1 = __importDefault(require("./posts"));
const media_1 = __importDefault(require("./media"));
const image_editing_1 = __importDefault(require("./image-editing"));
const router = (0, express_1.Router)();
/**
 * Content Management System Routes
 *
 * All CMS-related routes are grouped under /api/cms
 * This includes posts, pages, media management, and image editing.
 */
// Mount content routes
router.use('/posts', posts_1.default);
router.use('/media', media_1.default);
router.use('/media/images', image_editing_1.default); // Image editing routes
exports.default = router;
//# sourceMappingURL=index.js.map