import { Request, Response } from 'express';
import { ForumService, ForumSearchOptions } from '@o4o-apps/forum';
import { AppDataSource } from '../../database/connection.js';
import { ForumPost, PostStatus } from '@o4o-apps/forum';
import { ForumCategory } from '@o4o-apps/forum';
import { ForumComment, CommentStatus } from '@o4o-apps/forum';
import logger from '../../utils/logger.js';

/**
 * ForumController
 *
 * Generic forum controller for /api/v1/forum/* endpoints
 * Used by admin-dashboard for forum management
 */
export class ForumController {
  private forumService: ForumService;

  constructor() {
    this.forumService = new ForumService();
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  /**
   * GET /forum/health
   */
  async health(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      service: 'forum',
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================================================
  // Posts CRUD
  // ============================================================================

  /**
   * GET /forum/posts
   * List posts with filtering and pagination
   */
  async listPosts(req: Request, res: Response): Promise<void> {
    try {
      const options: ForumSearchOptions = {
        query: req.query.search as string || req.query.query as string,
        categoryId: req.query.categoryId as string || req.query.category as string,
        authorId: req.query.authorId as string,
        organizationId: req.query.organizationId as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        status: req.query.status as PostStatus,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: (req.query.sortBy as 'latest' | 'popular' | 'trending' | 'oldest') || 'latest',
      };

      const userRole = (req as any).user?.role || 'customer';
      const result = await this.forumService.searchPosts(options, userRole);

      res.json({
        success: true,
        data: result.posts,
        pagination: result.pagination,
        totalCount: result.totalCount,
      });
    } catch (error: any) {
      logger.error('Error listing forum posts:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list posts',
      });
    }
  }

  /**
   * GET /forum/posts/:id
   * Get single post by ID
   */
  async getPost(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const post = await this.forumService.getPost(id, userId);

      if (!post) {
        res.status(404).json({
          success: false,
          error: 'Post not found',
        });
        return;
      }

      res.json({
        success: true,
        data: post,
      });
    } catch (error: any) {
      logger.error('Error getting forum post:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get post',
      });
    }
  }

  /**
   * POST /forum/posts
   * Create new post
   */
  async createPost(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const postData = {
        title: req.body.title,
        content: req.body.content,
        excerpt: req.body.excerpt,
        categoryId: req.body.categoryId,
        type: req.body.type,
        tags: req.body.tags,
        organizationId: req.body.organizationId,
        isPinned: req.body.isPinned,
        allowComments: req.body.allowComments !== false,
        metadata: req.body.metadata,
      };

      const post = await this.forumService.createPost(postData, userId);

      res.status(201).json({
        success: true,
        data: post,
      });
    } catch (error: any) {
      logger.error('Error creating forum post:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create post',
      });
    }
  }

  /**
   * PUT /forum/posts/:id
   * Update existing post
   */
  async updatePost(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role || 'customer';

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const updateData = {
        title: req.body.title,
        content: req.body.content,
        excerpt: req.body.excerpt,
        categoryId: req.body.categoryId,
        type: req.body.type,
        status: req.body.status,
        tags: req.body.tags,
        isPinned: req.body.isPinned,
        isLocked: req.body.isLocked,
        allowComments: req.body.allowComments,
        metadata: req.body.metadata,
      };

      // Remove undefined fields
      Object.keys(updateData).forEach(key => {
        if ((updateData as any)[key] === undefined) {
          delete (updateData as any)[key];
        }
      });

      const post = await this.forumService.updatePost(id, updateData, userId, userRole);

      if (!post) {
        res.status(404).json({
          success: false,
          error: 'Post not found',
        });
        return;
      }

      res.json({
        success: true,
        data: post,
      });
    } catch (error: any) {
      logger.error('Error updating forum post:', error);

      if (error.message?.includes('permission') || error.message?.includes('Permission')) {
        res.status(403).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update post',
      });
    }
  }

  /**
   * DELETE /forum/posts/:id
   * Delete (archive) a post
   */
  async deletePost(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role || 'customer';

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      // Archive the post instead of hard delete
      const post = await this.forumService.updatePost(
        id,
        { status: PostStatus.ARCHIVED },
        userId,
        userRole
      );

      if (!post) {
        res.status(404).json({
          success: false,
          error: 'Post not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Post deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting forum post:', error);

      if (error.message?.includes('permission') || error.message?.includes('Permission')) {
        res.status(403).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete post',
      });
    }
  }

  // ============================================================================
  // Categories CRUD
  // ============================================================================

  /**
   * GET /forum/categories
   * List all categories
   */
  async listCategories(req: Request, res: Response): Promise<void> {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const organizationId = req.query.organizationId as string;

      const categories = await this.forumService.getCategories(includeInactive, organizationId);

      res.json({
        success: true,
        data: categories,
        count: categories.length,
      });
    } catch (error: any) {
      logger.error('Error listing forum categories:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list categories',
      });
    }
  }

  /**
   * GET /forum/categories/:id
   * Get single category by ID or slug
   */
  async getCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Try to find by slug first, then by ID
      let category = await this.forumService.getCategoryBySlug(id);

      if (!category) {
        // Try by ID using repository directly
        const categoryRepository = AppDataSource.getRepository(ForumCategory);
        category = await categoryRepository.findOne({
          where: { id },
          relations: ['creator'],
        });
      }

      if (!category) {
        res.status(404).json({
          success: false,
          error: 'Category not found',
        });
        return;
      }

      res.json({
        success: true,
        data: category,
      });
    } catch (error: any) {
      logger.error('Error getting forum category:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get category',
      });
    }
  }

  /**
   * POST /forum/categories
   * Create new category
   */
  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const categoryData = {
        name: req.body.name,
        description: req.body.description,
        color: req.body.color,
        sortOrder: req.body.sortOrder || 0,
        isActive: req.body.isActive !== false,
        requireApproval: req.body.requireApproval || false,
        accessLevel: req.body.accessLevel || 'all',
        organizationId: req.body.organizationId,
        isOrganizationExclusive: req.body.isOrganizationExclusive || false,
      };

      const category = await this.forumService.createCategory(categoryData, userId);

      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error: any) {
      logger.error('Error creating forum category:', error);

      if (error.message?.includes('permission') || error.message?.includes('Permission')) {
        res.status(403).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create category',
      });
    }
  }

  /**
   * PUT /forum/categories/:id
   * Update existing category
   */
  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const updateData = {
        name: req.body.name,
        description: req.body.description,
        color: req.body.color,
        sortOrder: req.body.sortOrder,
        isActive: req.body.isActive,
        requireApproval: req.body.requireApproval,
        accessLevel: req.body.accessLevel,
      };

      // Remove undefined fields
      Object.keys(updateData).forEach(key => {
        if ((updateData as any)[key] === undefined) {
          delete (updateData as any)[key];
        }
      });

      const category = await this.forumService.updateCategory(id, updateData);

      if (!category) {
        res.status(404).json({
          success: false,
          error: 'Category not found',
        });
        return;
      }

      res.json({
        success: true,
        data: category,
      });
    } catch (error: any) {
      logger.error('Error updating forum category:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update category',
      });
    }
  }

  /**
   * DELETE /forum/categories/:id
   * Deactivate a category
   */
  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      // Deactivate instead of hard delete
      const category = await this.forumService.updateCategory(id, { isActive: false });

      if (!category) {
        res.status(404).json({
          success: false,
          error: 'Category not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting forum category:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete category',
      });
    }
  }

  // ============================================================================
  // Comments
  // ============================================================================

  /**
   * GET /forum/posts/:postId/comments
   * Get comments for a post
   */
  async listComments(req: Request, res: Response): Promise<void> {
    try {
      const { postId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.forumService.getComments(postId, page, limit);

      res.json({
        success: true,
        data: result.comments,
        pagination: result.pagination,
        totalCount: result.totalCount,
      });
    } catch (error: any) {
      logger.error('Error listing forum comments:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list comments',
      });
    }
  }

  /**
   * POST /forum/comments
   * Create new comment
   */
  async createComment(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const commentData = {
        postId: req.body.postId,
        content: req.body.content,
        parentId: req.body.parentId,
      };

      const comment = await this.forumService.createComment(commentData, userId);

      res.status(201).json({
        success: true,
        data: comment,
      });
    } catch (error: any) {
      logger.error('Error creating forum comment:', error);

      if (error.message?.includes('permission') || error.message?.includes('Permission')) {
        res.status(403).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create comment',
      });
    }
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * GET /forum/stats
   * Get forum statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.forumService.getForumStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Error getting forum stats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get forum statistics',
      });
    }
  }

  // ============================================================================
  // Moderation
  // ============================================================================

  /**
   * GET /forum/moderation
   * Get moderation queue (pending posts and comments)
   */
  async getModerationQueue(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const postRepository = AppDataSource.getRepository(ForumPost);
      const commentRepository = AppDataSource.getRepository(ForumComment);

      // Get pending posts
      const [pendingPosts, pendingPostsCount] = await postRepository.findAndCount({
        where: { status: PostStatus.PENDING },
        relations: ['author', 'category'],
        order: { createdAt: 'ASC' },
        skip,
        take: limit,
      });

      // Get pending comments
      const [pendingComments, pendingCommentsCount] = await commentRepository.findAndCount({
        where: { status: CommentStatus.PENDING },
        relations: ['author'],
        order: { createdAt: 'ASC' },
        skip,
        take: limit,
      });

      res.json({
        success: true,
        data: {
          posts: pendingPosts,
          comments: pendingComments,
        },
        counts: {
          posts: pendingPostsCount,
          comments: pendingCommentsCount,
          total: pendingPostsCount + pendingCommentsCount,
        },
        pagination: {
          page,
          limit,
          totalPages: Math.ceil((pendingPostsCount + pendingCommentsCount) / limit),
        },
      });
    } catch (error: any) {
      logger.error('Error getting moderation queue:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get moderation queue',
      });
    }
  }

  /**
   * POST /forum/moderation/:type/:id
   * Moderate content (approve/reject)
   */
  async moderateContent(req: Request, res: Response): Promise<void> {
    try {
      const { type, id } = req.params;
      const { action, reason } = req.body; // action: 'approve' | 'reject'
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      // Only admin/manager can moderate
      if (!['admin', 'manager'].includes(userRole)) {
        res.status(403).json({
          success: false,
          error: 'Permission denied: only admins can moderate content',
        });
        return;
      }

      if (!['approve', 'reject'].includes(action)) {
        res.status(400).json({
          success: false,
          error: 'Invalid action. Must be "approve" or "reject"',
        });
        return;
      }

      if (type === 'post') {
        const newStatus = action === 'approve' ? PostStatus.PUBLISHED : PostStatus.REJECTED;
        const post = await this.forumService.updatePost(
          id,
          {
            status: newStatus,
            ...(action === 'approve' ? { publishedAt: new Date() } : {}),
          },
          userId,
          userRole
        );

        if (!post) {
          res.status(404).json({
            success: false,
            error: 'Post not found',
          });
          return;
        }

        res.json({
          success: true,
          data: post,
          message: `Post ${action}d successfully`,
        });
      } else if (type === 'comment') {
        const commentRepository = AppDataSource.getRepository(ForumComment);
        const comment = await commentRepository.findOne({ where: { id } });

        if (!comment) {
          res.status(404).json({
            success: false,
            error: 'Comment not found',
          });
          return;
        }

        const newStatus = action === 'approve' ? CommentStatus.PUBLISHED : CommentStatus.REJECTED;
        await commentRepository.update(id, { status: newStatus });

        const updatedComment = await commentRepository.findOne({
          where: { id },
          relations: ['author'],
        });

        res.json({
          success: true,
          data: updatedComment,
          message: `Comment ${action}d successfully`,
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid type. Must be "post" or "comment"',
        });
      }
    } catch (error: any) {
      logger.error('Error moderating content:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to moderate content',
      });
    }
  }
}

export default ForumController;
