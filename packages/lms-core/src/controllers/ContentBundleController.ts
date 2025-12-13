import { Request, Response, Router } from 'express';
import { contentBundleService, ContentBundleSearchOptions } from '../services/ContentBundleService.js';
import { ContentBundleType } from '../entities/ContentBundle.js';

/**
 * ContentBundle Controller
 *
 * REST API endpoints for ContentBundle CRUD operations
 */
export class ContentBundleController {
  /**
   * GET /api/v1/lms/bundles
   * List all content bundles with filtering and pagination
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const options: ContentBundleSearchOptions = {
        type: req.query.type as ContentBundleType,
        organizationId: req.query.organizationId as string,
        isPublished: req.query.isPublished === 'true' ? true :
                     req.query.isPublished === 'false' ? false : undefined,
        query: req.query.q as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: req.query.sortBy as 'latest' | 'oldest' | 'title',
      };

      const result = await contentBundleService.list(options);

      res.json({
        success: true,
        data: result.bundles,
        meta: result.pagination,
        total: result.totalCount,
      });
    } catch (error) {
      console.error('[ContentBundleController] List error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch content bundles',
      });
    }
  }

  /**
   * GET /api/v1/lms/bundles/:id
   * Get a single content bundle by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const bundle = await contentBundleService.findById(id);

      if (!bundle) {
        res.status(404).json({
          success: false,
          error: 'Content bundle not found',
        });
        return;
      }

      res.json({
        success: true,
        data: bundle,
      });
    } catch (error) {
      console.error('[ContentBundleController] GetById error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch content bundle',
      });
    }
  }

  /**
   * POST /api/v1/lms/bundles
   * Create a new content bundle
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const creatorId = (req as any).user?.id;
      const data = req.body;

      if (!data.title) {
        res.status(400).json({
          success: false,
          error: 'Title is required',
        });
        return;
      }

      const bundle = await contentBundleService.create(data, creatorId);

      res.status(201).json({
        success: true,
        data: bundle,
      });
    } catch (error) {
      console.error('[ContentBundleController] Create error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create content bundle',
      });
    }
  }

  /**
   * PATCH /api/v1/lms/bundles/:id
   * Update a content bundle
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;

      const bundle = await contentBundleService.update(id, data);

      if (!bundle) {
        res.status(404).json({
          success: false,
          error: 'Content bundle not found',
        });
        return;
      }

      res.json({
        success: true,
        data: bundle,
      });
    } catch (error) {
      console.error('[ContentBundleController] Update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update content bundle',
      });
    }
  }

  /**
   * DELETE /api/v1/lms/bundles/:id
   * Delete a content bundle
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await contentBundleService.delete(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Content bundle not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Content bundle deleted successfully',
      });
    } catch (error) {
      console.error('[ContentBundleController] Delete error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete content bundle',
      });
    }
  }

  /**
   * POST /api/v1/lms/bundles/:id/publish
   * Publish a content bundle
   */
  async publish(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const bundle = await contentBundleService.publish(id);

      if (!bundle) {
        res.status(404).json({
          success: false,
          error: 'Content bundle not found',
        });
        return;
      }

      res.json({
        success: true,
        data: bundle,
        message: 'Content bundle published successfully',
      });
    } catch (error) {
      console.error('[ContentBundleController] Publish error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to publish content bundle',
      });
    }
  }

  /**
   * POST /api/v1/lms/bundles/:id/unpublish
   * Unpublish a content bundle
   */
  async unpublish(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const bundle = await contentBundleService.unpublish(id);

      if (!bundle) {
        res.status(404).json({
          success: false,
          error: 'Content bundle not found',
        });
        return;
      }

      res.json({
        success: true,
        data: bundle,
        message: 'Content bundle unpublished successfully',
      });
    } catch (error) {
      console.error('[ContentBundleController] Unpublish error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unpublish content bundle',
      });
    }
  }

  /**
   * POST /api/v1/lms/bundles/:id/items
   * Add a content item to a bundle
   */
  async addContentItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const item = req.body;

      if (!item.id || !item.type || item.content === undefined) {
        res.status(400).json({
          success: false,
          error: 'Item id, type, and content are required',
        });
        return;
      }

      const bundle = await contentBundleService.addContentItem(id, item);

      if (!bundle) {
        res.status(404).json({
          success: false,
          error: 'Content bundle not found',
        });
        return;
      }

      res.json({
        success: true,
        data: bundle,
      });
    } catch (error) {
      console.error('[ContentBundleController] AddContentItem error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add content item',
      });
    }
  }

  /**
   * DELETE /api/v1/lms/bundles/:id/items/:itemId
   * Remove a content item from a bundle
   */
  async removeContentItem(req: Request, res: Response): Promise<void> {
    try {
      const { id, itemId } = req.params;

      const bundle = await contentBundleService.removeContentItem(id, itemId);

      if (!bundle) {
        res.status(404).json({
          success: false,
          error: 'Content bundle not found',
        });
        return;
      }

      res.json({
        success: true,
        data: bundle,
      });
    } catch (error) {
      console.error('[ContentBundleController] RemoveContentItem error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove content item',
      });
    }
  }

  /**
   * PUT /api/v1/lms/bundles/:id/items/reorder
   * Reorder content items in a bundle
   */
  async reorderContentItems(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { itemIds } = req.body;

      if (!Array.isArray(itemIds)) {
        res.status(400).json({
          success: false,
          error: 'itemIds must be an array',
        });
        return;
      }

      const bundle = await contentBundleService.reorderContentItems(id, itemIds);

      if (!bundle) {
        res.status(404).json({
          success: false,
          error: 'Content bundle not found',
        });
        return;
      }

      res.json({
        success: true,
        data: bundle,
      });
    } catch (error) {
      console.error('[ContentBundleController] ReorderContentItems error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reorder content items',
      });
    }
  }
}

// Singleton instance
export const contentBundleController = new ContentBundleController();

/**
 * Create ContentBundle routes
 */
export function createContentBundleRoutes(): Router {
  const router = Router();

  // CRUD routes
  router.get('/', (req, res) => contentBundleController.list(req, res));
  router.get('/:id', (req, res) => contentBundleController.getById(req, res));
  router.post('/', (req, res) => contentBundleController.create(req, res));
  router.patch('/:id', (req, res) => contentBundleController.update(req, res));
  router.delete('/:id', (req, res) => contentBundleController.delete(req, res));

  // Publish/Unpublish
  router.post('/:id/publish', (req, res) => contentBundleController.publish(req, res));
  router.post('/:id/unpublish', (req, res) => contentBundleController.unpublish(req, res));

  // Content items management
  router.post('/:id/items', (req, res) => contentBundleController.addContentItem(req, res));
  router.delete('/:id/items/:itemId', (req, res) => contentBundleController.removeContentItem(req, res));
  router.put('/:id/items/reorder', (req, res) => contentBundleController.reorderContentItems(req, res));

  return router;
}
