import { Request, Response } from 'express';
import { AppDataSource } from '../database/connection.js';
import { View } from '../entities/View.js';
import { User } from '../entities/User.js';
import type { AuthRequest } from '../types/auth.js';
import { Like } from 'typeorm';

/**
 * NextGen CMS Controller
 * Manages View JSON entities for the ViewRenderer system
 */
export class CMSController {
  private viewRepository = AppDataSource.getRepository(View);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * GET /api/cms/views
   * List all views with pagination and filters
   */
  async listViews(req: Request, res: Response) {
    try {
      const {
        page = 1,
        pageSize = 20,
        status,
        category,
        search,
        orderBy = 'updatedAt',
        order = 'DESC'
      } = req.query;

      const queryBuilder = this.viewRepository
        .createQueryBuilder('view')
        .leftJoinAndSelect('view.author', 'author')
        .leftJoinAndSelect('view.lastModifier', 'lastModifier');

      // Apply filters
      if (status) {
        queryBuilder.andWhere('view.status = :status', { status });
      }

      if (category) {
        queryBuilder.andWhere('view.category = :category', { category });
      }

      if (search) {
        queryBuilder.andWhere(
          '(view.title ILIKE :search OR view.description ILIKE :search OR view.viewId ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Apply ordering
      const validOrderFields = ['title', 'viewId', 'createdAt', 'updatedAt', 'status'];
      const orderField = validOrderFields.includes(orderBy as string) ? orderBy as string : 'updatedAt';
      queryBuilder.orderBy(`view.${orderField}`, order === 'ASC' ? 'ASC' : 'DESC');

      // Apply pagination
      const skip = (Number(page) - 1) * Number(pageSize);
      queryBuilder.skip(skip).take(Number(pageSize));

      const [views, totalItems] = await queryBuilder.getManyAndCount();

      res.json({
        success: true,
        data: views,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          totalItems,
          totalPages: Math.ceil(totalItems / Number(pageSize))
        }
      });
    } catch (error: any) {
      console.error('Error listing views:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list views',
        message: error.message
      });
    }
  }

  /**
   * GET /api/cms/views/:id
   * Get a single view by ID
   */
  async getView(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const view = await this.viewRepository.findOne({
        where: { id },
        relations: ['author', 'lastModifier']
      });

      if (!view) {
        return res.status(404).json({
          success: false,
          error: 'View not found'
        });
      }

      res.json({
        success: true,
        data: view
      });
    } catch (error: any) {
      console.error('Error getting view:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get view',
        message: error.message
      });
    }
  }

  /**
   * GET /api/cms/views/by-view-id/:viewId
   * Get a view by its viewId (for ViewRenderer)
   */
  async getViewByViewId(req: Request, res: Response) {
    try {
      const { viewId } = req.params;

      const view = await this.viewRepository.findOne({
        where: { viewId, status: 'published' }
      });

      if (!view) {
        return res.status(404).json({
          success: false,
          error: 'View not found'
        });
      }

      res.json({
        success: true,
        data: view
      });
    } catch (error: any) {
      console.error('Error getting view by viewId:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get view',
        message: error.message
      });
    }
  }

  /**
   * POST /api/cms/views
   * Create a new view
   */
  async createView(req: AuthRequest, res: Response) {
    try {
      const { viewId, url, title, description, json, status, category, tags, metadata } = req.body;

      // Check if viewId already exists
      const existingView = await this.viewRepository.findOne({
        where: { viewId }
      });

      if (existingView) {
        return res.status(400).json({
          success: false,
          error: 'View with this viewId already exists'
        });
      }

      // Create new view
      const view = this.viewRepository.create({
        viewId,
        url,
        title,
        description,
        json,
        status: status || 'draft',
        category,
        tags,
        metadata,
        authorId: req.user?.id,
        lastModifiedBy: req.user?.id,
        version: 1
      });

      const savedView = await this.viewRepository.save(view);

      // Load relations
      const viewWithRelations = await this.viewRepository.findOne({
        where: { id: savedView.id },
        relations: ['author', 'lastModifier']
      });

      res.status(201).json({
        success: true,
        data: viewWithRelations,
        message: 'View created successfully'
      });
    } catch (error: any) {
      console.error('Error creating view:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create view',
        message: error.message
      });
    }
  }

  /**
   * PUT /api/cms/views/:id
   * Update an existing view
   */
  async updateView(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { viewId, url, title, description, json, status, category, tags, metadata } = req.body;

      const view = await this.viewRepository.findOne({
        where: { id }
      });

      if (!view) {
        return res.status(404).json({
          success: false,
          error: 'View not found'
        });
      }

      // Check if viewId is being changed and if it conflicts
      if (viewId && viewId !== view.viewId) {
        const existingView = await this.viewRepository.findOne({
          where: { viewId }
        });

        if (existingView) {
          return res.status(400).json({
            success: false,
            error: 'View with this viewId already exists'
          });
        }
      }

      // Update view
      view.viewId = viewId || view.viewId;
      view.url = url || view.url;
      view.title = title || view.title;
      view.description = description !== undefined ? description : view.description;
      view.json = json || view.json;
      view.status = status || view.status;
      view.category = category !== undefined ? category : view.category;
      view.tags = tags !== undefined ? tags : view.tags;
      view.metadata = metadata !== undefined ? metadata : view.metadata;
      view.lastModifiedBy = req.user?.id || view.lastModifiedBy;
      view.version = view.version + 1;

      const savedView = await this.viewRepository.save(view);

      // Load relations
      const viewWithRelations = await this.viewRepository.findOne({
        where: { id: savedView.id },
        relations: ['author', 'lastModifier']
      });

      res.json({
        success: true,
        data: viewWithRelations,
        message: 'View updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating view:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update view',
        message: error.message
      });
    }
  }

  /**
   * DELETE /api/cms/views/:id
   * Delete a view
   */
  async deleteView(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const view = await this.viewRepository.findOne({
        where: { id }
      });

      if (!view) {
        return res.status(404).json({
          success: false,
          error: 'View not found'
        });
      }

      await this.viewRepository.remove(view);

      res.json({
        success: true,
        message: 'View deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting view:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete view',
        message: error.message
      });
    }
  }

  /**
   * POST /api/cms/views/:id/publish
   * Publish a view
   */
  async publishView(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const view = await this.viewRepository.findOne({
        where: { id }
      });

      if (!view) {
        return res.status(404).json({
          success: false,
          error: 'View not found'
        });
      }

      view.status = 'published';
      await this.viewRepository.save(view);

      res.json({
        success: true,
        data: view,
        message: 'View published successfully'
      });
    } catch (error: any) {
      console.error('Error publishing view:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to publish view',
        message: error.message
      });
    }
  }

  /**
   * POST /api/cms/views/:id/unpublish
   * Unpublish a view (set to draft)
   */
  async unpublishView(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const view = await this.viewRepository.findOne({
        where: { id }
      });

      if (!view) {
        return res.status(404).json({
          success: false,
          error: 'View not found'
        });
      }

      view.status = 'draft';
      await this.viewRepository.save(view);

      res.json({
        success: true,
        data: view,
        message: 'View unpublished successfully'
      });
    } catch (error: any) {
      console.error('Error unpublishing view:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unpublish view',
        message: error.message
      });
    }
  }
}
