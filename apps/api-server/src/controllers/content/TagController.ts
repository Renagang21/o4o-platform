import { Request, Response } from 'express';
import { TagService } from '../../services/tag.service';
import { CreateTagDto, UpdateTagDto } from '../../types/tag.types';
import { AuthRequest } from '../../types/auth';

export class TagController {
  private tagService: TagService;

  constructor() {
    this.tagService = new TagService();
  }

  /**
   * Get all tags with optional filtering and pagination
   */
  async getTags(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        sortBy = 'name',
        sortOrder = 'ASC'
      } = req.query;

      const result = await this.tagService.getTags({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC'
      });

      res.json({
        success: true,
        data: result.tags,
        meta: {
          total: result.total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(result.total / Number(limit))
        }
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: {
          code: 'TAGS_FETCH_ERROR',
          message: 'Failed to fetch tags',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * Get a single tag by ID
   */
  async getTag(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tag = await this.tagService.getTagById(id);

      if (!tag) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TAG_NOT_FOUND',
            message: 'Tag not found'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: tag
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: {
          code: 'TAG_FETCH_ERROR',
          message: 'Failed to fetch tag',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * Create a new tag
   */
  async createTag(req: AuthRequest, res: Response): Promise<void> {
    try {
      const createTagDto: CreateTagDto = req.body;
      
      // Validate required fields
      if (!createTagDto.name) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Tag name is required'
          }
        });
        return;
      }

      // Check for duplicate
      const existingTag = await this.tagService.findBySlug(createTagDto.slug || createTagDto.name);
      if (existingTag) {
        res.status(409).json({
          success: false,
          error: {
            code: 'TAG_EXISTS',
            message: 'A tag with this name or slug already exists'
          }
        });
        return;
      }

      const tag = await this.tagService.createTag({
        ...createTagDto,
        createdBy: req.user?.id
      });

      res.status(201).json({
        success: true,
        data: tag,
        message: 'Tag created successfully'
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: {
          code: 'TAG_CREATE_ERROR',
          message: 'Failed to create tag',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * Update an existing tag
   */
  async updateTag(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateTagDto: UpdateTagDto = req.body;

      // Check if tag exists
      const existingTag = await this.tagService.getTagById(id);
      if (!existingTag) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TAG_NOT_FOUND',
            message: 'Tag not found'
          }
        });
        return;
      }

      // Check for duplicate slug if updating
      if (updateTagDto.slug && updateTagDto.slug !== existingTag.slug) {
        const duplicateTag = await this.tagService.findBySlug(updateTagDto.slug);
        if (duplicateTag) {
          res.status(409).json({
            success: false,
            error: {
              code: 'SLUG_EXISTS',
              message: 'A tag with this slug already exists'
            }
          });
          return;
        }
      }

      const updatedTag = await this.tagService.updateTag(id, {
        ...updateTagDto,
        updatedBy: req.user?.id
      });

      res.json({
        success: true,
        data: updatedTag,
        message: 'Tag updated successfully'
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: {
          code: 'TAG_UPDATE_ERROR',
          message: 'Failed to update tag',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Check if tag exists
      const existingTag = await this.tagService.getTagById(id);
      if (!existingTag) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TAG_NOT_FOUND',
            message: 'Tag not found'
          }
        });
        return;
      }

      // Check if tag is in use
      const postCount = await this.tagService.getTagPostCount(id);
      if (postCount > 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'TAG_IN_USE',
            message: `Cannot delete tag. It is used by ${postCount} post(s)`,
            details: {
              postCount
            }
          }
        });
        return;
      }

      await this.tagService.deleteTag(id);

      res.json({
        success: true,
        message: 'Tag deleted successfully'
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: {
          code: 'TAG_DELETE_ERROR',
          message: 'Failed to delete tag',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * Merge tags - combines one tag into another
   */
  async mergeTags(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { fromId, toId } = req.params;

      if (fromId === toId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_MERGE',
            message: 'Cannot merge a tag with itself'
          }
        });
        return;
      }

      const result = await this.tagService.mergeTags(fromId, toId);

      res.json({
        success: true,
        data: result,
        message: `Successfully merged tags. ${result.postsUpdated} posts updated.`
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: {
          code: 'TAG_MERGE_ERROR',
          message: 'Failed to merge tags',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * Get tag statistics
   */
  async getTagStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const stats = await this.tagService.getTagStatistics(id);

      if (!stats) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TAG_NOT_FOUND',
            message: 'Tag not found'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: {
          code: 'TAG_STATS_ERROR',
          message: 'Failed to fetch tag statistics',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * Get popular tags
   */
  async getPopularTags(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { limit = 10 } = req.query;
      const tags = await this.tagService.getPopularTags(Number(limit));

      res.json({
        success: true,
        data: tags
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: {
          code: 'POPULAR_TAGS_ERROR',
          message: 'Failed to fetch popular tags',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }
}