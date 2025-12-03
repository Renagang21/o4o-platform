import { Router, RequestHandler } from 'express';
import postsRouter from './posts.js';
import mediaRouter from './media.js';

const router: Router = Router();

/**
 * Content Management System Routes
 *
 * All CMS-related routes are grouped under /api/cms
 * This includes posts, pages, and media management.
 */

// Mount content routes
router.use('/posts', postsRouter);
router.use('/media', mediaRouter);

export default router;