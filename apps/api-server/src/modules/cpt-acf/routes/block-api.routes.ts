import { Router, IRouter, Request, Response } from 'express';
import { blockDataService } from '../services/block-data.service';
import logger from '../../../utils/logger';

/**
 * Block API Routes - Optimized endpoints for block editor
 * Provides fast, cached access to CPT and ACF data for blocks
 */
const router: IRouter = Router();

/**
 * Get all block data for a post
 * GET /api/blocks/data/:postId
 */
router.get('/data/:postId', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { postType = 'post' } = req.query;

    const result = await blockDataService.getBlockData(
      postId,
      postType as 'post' | 'page' | 'custom'
    );

    if (!result.success) {
      return res.status(404).json(result);
    }

    // Add cache headers
    res.set({
      'Cache-Control': 'public, max-age=300', // 5 minutes
      'X-Cache-Status': result.source || 'unknown'
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Block API error - getBlockData:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch block data',
      message: error.message
    });
  }
});

/**
 * Get featured image for a post
 * GET /api/blocks/featured-image/:postId
 */
router.get('/featured-image/:postId', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { postType = 'post' } = req.query;

    const result = await blockDataService.getFeaturedImage(
      postId,
      postType as 'post' | 'page' | 'custom'
    );

    if (!result.success) {
      return res.status(404).json(result);
    }

    // Add cache headers
    res.set({
      'Cache-Control': 'public, max-age=300',
      'X-Cache-Status': result.source || 'unknown'
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Block API error - getFeaturedImage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured image',
      message: error.message
    });
  }
});

/**
 * Get specific ACF field value
 * GET /api/blocks/acf-fields/:postId/:fieldName
 */
router.get('/acf-fields/:postId/:fieldName', async (req: Request, res: Response) => {
  try {
    const { postId, fieldName } = req.params;
    const { entityType = 'post' } = req.query;

    const result = await blockDataService.getACFField(
      postId,
      fieldName,
      entityType as string
    );

    if (!result.success) {
      return res.status(404).json(result);
    }

    // Add cache headers
    res.set({
      'Cache-Control': 'public, max-age=300',
      'X-Cache-Status': result.source || 'unknown'
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Block API error - getACFField:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ACF field',
      message: error.message
    });
  }
});

/**
 * Get dynamic content for blocks
 * POST /api/blocks/dynamic-content
 */
router.post('/dynamic-content', async (req: Request, res: Response) => {
  try {
    const result = await blockDataService.getDynamicContent(req.body);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Add cache headers for GET-like POST requests
    if (req.body.postId) {
      res.set({
        'Cache-Control': 'public, max-age=300',
        'X-Cache-Status': 'dynamic'
      });
    }

    res.json(result);
  } catch (error: any) {
    logger.error('Block API error - getDynamicContent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dynamic content',
      message: error.message
    });
  }
});

/**
 * Clear cache for a post or all posts
 * POST /api/blocks/cache/clear
 */
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    const { postId } = req.body;
    const result = blockDataService.clearCache(postId);

    res.json(result);
  } catch (error: any) {
    logger.error('Block API error - clearCache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

/**
 * Health check endpoint
 * GET /api/blocks/health
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/blocks/data/:postId',
      'GET /api/blocks/featured-image/:postId',
      'GET /api/blocks/acf-fields/:postId/:fieldName',
      'POST /api/blocks/dynamic-content',
      'POST /api/blocks/cache/clear'
    ]
  });
});

export default router;