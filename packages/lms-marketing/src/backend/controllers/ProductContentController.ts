/**
 * ProductContentController
 *
 * REST API controller for product content management.
 */

import type { Request, Response } from 'express';
import {
  ProductContentService,
  type CreateProductContentDto,
  type UpdateProductContentDto,
  type UserContext,
} from '../services/ProductContentService.js';

export class ProductContentController {
  constructor(private service: ProductContentService) {}

  /**
   * POST /api/v1/lms-marketing/product
   * Create new product content
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateProductContentDto = req.body;

      if (!dto.supplierId || !dto.bundleId || !dto.title) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: supplierId, bundleId, title',
        });
        return;
      }

      const result = await this.service.create(dto);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[ProductContentController] create error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create product content',
      });
    }
  }

  /**
   * GET /api/v1/lms-marketing/product/:id
   * Get product content by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.service.getById(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Product content not found',
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[ProductContentController] getById error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get product content',
      });
    }
  }

  /**
   * GET /api/v1/lms-marketing/product/supplier/:supplierId
   * Get all product contents for a supplier
   */
  async getBySupplier(req: Request, res: Response): Promise<void> {
    try {
      const { supplierId } = req.params;
      const { isActive, isPublished } = req.query;

      const options: { isActive?: boolean; isPublished?: boolean } = {};
      if (isActive !== undefined) {
        options.isActive = isActive === 'true';
      }
      if (isPublished !== undefined) {
        options.isPublished = isPublished === 'true';
      }

      const results = await this.service.getBySupplier(supplierId, options);
      res.json({
        success: true,
        data: results,
        total: results.length,
      });
    } catch (error) {
      console.error('[ProductContentController] getBySupplier error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get supplier product contents',
      });
    }
  }

  /**
   * GET /api/v1/lms-marketing/product/targeted
   * Get product contents targeted for the current user
   */
  async getTargeted(req: Request, res: Response): Promise<void> {
    try {
      const { role, region, sellerType, tags } = req.query;

      if (!role) {
        res.status(400).json({
          success: false,
          error: 'Missing required query parameter: role',
        });
        return;
      }

      const userContext: UserContext = {
        role: role as UserContext['role'],
        region: region as string | undefined,
        sellerType: sellerType as string | undefined,
        tags: tags ? (tags as string).split(',') : undefined,
      };

      const results = await this.service.getForUser(userContext);
      res.json({
        success: true,
        data: results,
        total: results.length,
      });
    } catch (error) {
      console.error('[ProductContentController] getTargeted error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get targeted product contents',
      });
    }
  }

  /**
   * GET /api/v1/lms-marketing/product
   * List product contents with filtering
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const { supplierId, isActive, isPublished, category, brand, limit, offset } =
        req.query;

      const options = {
        supplierId: supplierId as string | undefined,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        isPublished:
          isPublished !== undefined ? isPublished === 'true' : undefined,
        category: category as string | undefined,
        brand: brand as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      };

      const result = await this.service.list(options);
      res.json({
        success: true,
        data: result.items,
        total: result.total,
      });
    } catch (error) {
      console.error('[ProductContentController] list error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list product contents',
      });
    }
  }

  /**
   * PATCH /api/v1/lms-marketing/product/:id
   * Update product content
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateProductContentDto = req.body;

      const result = await this.service.update(id, dto);

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Product content not found',
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[ProductContentController] update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update product content',
      });
    }
  }

  /**
   * POST /api/v1/lms-marketing/product/:id/publish
   * Publish product content
   */
  async publish(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.service.publish(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Product content not found',
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[ProductContentController] publish error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to publish product content',
      });
    }
  }

  /**
   * POST /api/v1/lms-marketing/product/:id/unpublish
   * Unpublish product content
   */
  async unpublish(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.service.unpublish(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Product content not found',
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[ProductContentController] unpublish error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unpublish product content',
      });
    }
  }

  /**
   * PATCH /api/v1/lms-marketing/product/:id/deactivate
   * Deactivate product content
   */
  async deactivate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.service.deactivate(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Product content not found',
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[ProductContentController] deactivate error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to deactivate product content',
      });
    }
  }

  /**
   * PATCH /api/v1/lms-marketing/product/:id/activate
   * Reactivate product content
   */
  async activate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.service.activate(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Product content not found',
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[ProductContentController] activate error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to activate product content',
      });
    }
  }

  /**
   * DELETE /api/v1/lms-marketing/product/:id
   * Delete product content (soft delete)
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await this.service.delete(id);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Product content not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Product content deleted',
      });
    } catch (error) {
      console.error('[ProductContentController] delete error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete product content',
      });
    }
  }
}
