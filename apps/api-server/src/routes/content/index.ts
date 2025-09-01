import { Router, RequestHandler } from 'express';
import postsRouter from './posts';
import mediaRouter from './media';
import imageEditingRouter from './image-editing';

const router: Router = Router();

/**
 * Content Management System Routes
 * 
 * All CMS-related routes are grouped under /api/cms
 * This includes posts, pages, media management, and image editing.
 */

// Mount content routes
router.use('/posts', postsRouter);
router.use('/media', mediaRouter);
router.use('/media/images', imageEditingRouter); // Image editing routes

export default router;