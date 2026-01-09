import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { ForumPost, PostStatus } from '@o4o/forum-core';
import { ForumCategory } from '@o4o/forum-core';
import { ForumComment, CommentStatus } from '@o4o/forum-core';
import { normalizeContent, blocksToText, normalizeMetadata } from '@o4o/forum-core';
import type { ForumPostMetadata } from '@o4o/forum-core';
import { User } from '../../modules/auth/entities/User.js';
import { MoreThanOrEqual } from 'typeorm';
import logger from '../../utils/logger.js';

/**
 * ForumController
 *
 * Generic forum controller for /api/v1/forum/* endpoints
 * Used by admin-dashboard for forum management
 */
export class ForumController {
  private get postRepository() {
    return AppDataSource.getRepository(ForumPost);
  }

  private get categoryRepository() {
    return AppDataSource.getRepository(ForumCategory);
  }

  private get commentRepository() {
    return AppDataSource.getRepository(ForumComment);
  }

  private get userRepository() {
    return AppDataSource.getRepository(User);
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
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const skip = (page - 1) * limit;

      const categoryId = req.query.categoryId as string || req.query.category as string;
      const query = req.query.search as string || req.query.query as string;
      const status = req.query.status as PostStatus;
      const sortBy = (req.query.sortBy as string) || 'latest';

      let queryBuilder = this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.category', 'category')
        .leftJoinAndSelect('post.author', 'author');

      // Status filter
      if (status) {
        queryBuilder.where('post.status = :status', { status });
      } else {
        queryBuilder.where('post.status = :status', { status: PostStatus.PUBLISHED });
      }

      // Category filter
      if (categoryId) {
        queryBuilder.andWhere('post.categoryId = :categoryId', { categoryId });
      }

      // Search filter (search in title and excerpt, since content is JSONB)
      if (query) {
        queryBuilder.andWhere(
          '(post.title ILIKE :query OR post.excerpt ILIKE :query)',
          { query: `%${query}%` }
        );
      }

      // Sorting
      switch (sortBy) {
        case 'popular':
          queryBuilder.orderBy('post.viewCount', 'DESC');
          break;
        case 'oldest':
          queryBuilder.orderBy('post.createdAt', 'ASC');
          break;
        case 'latest':
        default:
          queryBuilder
            .orderBy('post.isPinned', 'DESC')
            .addOrderBy('post.createdAt', 'DESC');
          break;
      }

      // Pagination
      queryBuilder.skip(skip).take(limit);

      const [posts, totalCount] = await queryBuilder.getManyAndCount();

      res.json({
        success: true,
        data: posts,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
        totalCount,
      });
    } catch (error: any) {
      // Graceful fallback: return empty data if table doesn't exist
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        logger.warn('Forum tables not found - returning empty posts');
        res.json({
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, totalPages: 0 },
          totalCount: 0,
          message: 'Forum module not initialized - run migrations',
        });
        return;
      }
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

      const post = await this.postRepository.findOne({
        where: { id },
        relations: ['category', 'author'],
      });

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

      const { title, content, excerpt, categoryId, type, tags, isPinned, allowComments, metadata } = req.body;

      // Generate slug from title
      const slug = this.generateSlug(title);

      // Check if category exists
      const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
      if (!category) {
        res.status(400).json({
          success: false,
          error: 'Category not found',
        });
        return;
      }

      // Normalize content to Block[] format
      const normalizedContent = normalizeContent(content);

      // Auto-generate excerpt from content if not provided
      const postExcerpt = excerpt || blocksToText(normalizedContent).substring(0, 200);

      // Normalize metadata to structured format
      const normalizedMeta = metadata ? normalizeMetadata(metadata) : undefined;

      const post = this.postRepository.create({
        title,
        content: normalizedContent,
        excerpt: postExcerpt,
        categoryId,
        type,
        tags,
        isPinned,
        allowComments: allowComments !== false,
        metadata: normalizedMeta,
        authorId: userId,
        slug,
        status: category.requireApproval ? PostStatus.PENDING : PostStatus.PUBLISHED,
        publishedAt: category.requireApproval ? undefined : new Date(),
      });

      const savedPost = await this.postRepository.save(post);

      res.status(201).json({
        success: true,
        data: savedPost,
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

      const post = await this.postRepository.findOne({ where: { id } });
      if (!post) {
        res.status(404).json({
          success: false,
          error: 'Post not found',
        });
        return;
      }

      // Check permission
      if (!['admin', 'manager'].includes(userRole) && post.authorId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Permission denied',
        });
        return;
      }

      const { title, content, excerpt, categoryId, type, status, tags, isPinned, isLocked, allowComments, metadata } = req.body;

      // Update slug if title changed
      if (title && title !== post.title) {
        post.slug = this.generateSlug(title);
      }

      // Update fields
      if (title !== undefined) post.title = title;
      if (content !== undefined) {
        // Normalize content to Block[] format
        post.content = normalizeContent(content);
        // Auto-generate excerpt if not provided
        if (excerpt === undefined) {
          post.excerpt = blocksToText(post.content).substring(0, 200);
        }
      }
      if (excerpt !== undefined) post.excerpt = excerpt;
      if (categoryId !== undefined) post.categoryId = categoryId;
      if (type !== undefined) post.type = type;
      if (status !== undefined) post.status = status;
      if (tags !== undefined) post.tags = tags;
      if (isPinned !== undefined) post.isPinned = isPinned;
      if (isLocked !== undefined) post.isLocked = isLocked;
      if (allowComments !== undefined) post.allowComments = allowComments;
      if (metadata !== undefined) {
        // Merge existing metadata with new metadata and normalize
        const mergedMetadata = {
          ...(post.metadata || {}),
          ...metadata,
        };
        post.metadata = normalizeMetadata(mergedMetadata);
      }

      const updatedPost = await this.postRepository.save(post);

      res.json({
        success: true,
        data: updatedPost,
      });
    } catch (error: any) {
      logger.error('Error updating forum post:', error);
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

      const post = await this.postRepository.findOne({ where: { id } });
      if (!post) {
        res.status(404).json({
          success: false,
          error: 'Post not found',
        });
        return;
      }

      // Check permission
      if (!['admin', 'manager'].includes(userRole) && post.authorId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Permission denied',
        });
        return;
      }

      // Archive instead of hard delete
      post.status = PostStatus.ARCHIVED;
      await this.postRepository.save(post);

      res.json({
        success: true,
        message: 'Post deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting forum post:', error);
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

      const where = includeInactive ? {} : { isActive: true };
      const categories = await this.categoryRepository.find({
        where,
        order: { sortOrder: 'ASC', name: 'ASC' },
        relations: ['creator'],
      });

      res.json({
        success: true,
        data: categories,
        count: categories.length,
      });
    } catch (error: any) {
      // Graceful fallback: return empty data if table doesn't exist
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        logger.warn('Forum tables not found - returning empty categories');
        res.json({
          success: true,
          data: [],
          count: 0,
          message: 'Forum module not initialized - run migrations',
        });
        return;
      }
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

      // Try to find by ID
      let category = await this.categoryRepository.findOne({
        where: { id },
        relations: ['creator'],
      });

      // If not found, try by slug
      if (!category) {
        category = await this.categoryRepository.findOne({
          where: { slug: id },
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

      const { name, description, color, sortOrder, isActive, requireApproval, accessLevel } = req.body;

      const slug = this.generateSlug(name);

      const category = this.categoryRepository.create({
        name,
        description,
        slug,
        color,
        sortOrder: sortOrder || 0,
        isActive: isActive !== false,
        requireApproval: requireApproval || false,
        accessLevel: accessLevel || 'all',
        createdBy: userId,
      });

      const savedCategory = await this.categoryRepository.save(category);

      res.status(201).json({
        success: true,
        data: savedCategory,
      });
    } catch (error: any) {
      logger.error('Error creating forum category:', error);
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

      const category = await this.categoryRepository.findOne({ where: { id } });
      if (!category) {
        res.status(404).json({
          success: false,
          error: 'Category not found',
        });
        return;
      }

      const { name, description, color, sortOrder, isActive, requireApproval, accessLevel } = req.body;

      // Update slug if name changed
      if (name && name !== category.name) {
        category.slug = this.generateSlug(name);
      }

      // Update fields
      if (name !== undefined) category.name = name;
      if (description !== undefined) category.description = description;
      if (color !== undefined) category.color = color;
      if (sortOrder !== undefined) category.sortOrder = sortOrder;
      if (isActive !== undefined) category.isActive = isActive;
      if (requireApproval !== undefined) category.requireApproval = requireApproval;
      if (accessLevel !== undefined) category.accessLevel = accessLevel;

      const updatedCategory = await this.categoryRepository.save(category);

      res.json({
        success: true,
        data: updatedCategory,
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

      const category = await this.categoryRepository.findOne({ where: { id } });
      if (!category) {
        res.status(404).json({
          success: false,
          error: 'Category not found',
        });
        return;
      }

      // Deactivate instead of hard delete
      category.isActive = false;
      await this.categoryRepository.save(category);

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
      const skip = (page - 1) * limit;

      const [comments, totalCount] = await this.commentRepository.findAndCount({
        where: {
          postId,
          status: CommentStatus.PUBLISHED,
        },
        relations: ['author'],
        order: { createdAt: 'ASC' },
        skip,
        take: limit,
      });

      res.json({
        success: true,
        data: comments,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
        totalCount,
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

      const { postId, content, parentId } = req.body;

      // Check if post exists
      const post = await this.postRepository.findOne({ where: { id: postId } });
      if (!post) {
        res.status(400).json({
          success: false,
          error: 'Post not found',
        });
        return;
      }

      const comment = this.commentRepository.create({
        postId,
        content,
        parentId,
        authorId: userId,
        status: CommentStatus.PUBLISHED,
      });

      const savedComment = await this.commentRepository.save(comment);

      // Update post comment count
      post.commentCount = (post.commentCount || 0) + 1;
      post.lastCommentAt = new Date();
      post.lastCommentBy = userId;
      await this.postRepository.save(post);

      res.status(201).json({
        success: true,
        data: savedComment,
      });
    } catch (error: any) {
      logger.error('Error creating forum comment:', error);
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalPosts,
        totalComments,
        totalUsers,
        todayPosts,
        todayComments,
        activeCategories,
      ] = await Promise.all([
        this.postRepository.count({ where: { status: PostStatus.PUBLISHED } }),
        this.commentRepository.count({ where: { status: CommentStatus.PUBLISHED } }),
        this.userRepository.count(),
        this.postRepository.count({
          where: {
            status: PostStatus.PUBLISHED,
            createdAt: MoreThanOrEqual(today),
          },
        }),
        this.commentRepository.count({
          where: {
            status: CommentStatus.PUBLISHED,
            createdAt: MoreThanOrEqual(today),
          },
        }),
        this.categoryRepository.find({
          where: { isActive: true },
          order: { postCount: 'DESC' },
          take: 10,
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalPosts,
          totalComments,
          totalUsers,
          todayPosts,
          todayComments,
          activeCategories: activeCategories.map(cat => ({
            name: cat.name,
            postCount: cat.postCount,
          })),
        },
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

      // Get pending posts
      const [pendingPosts, pendingPostsCount] = await this.postRepository.findAndCount({
        where: { status: PostStatus.PENDING },
        relations: ['author', 'category'],
        order: { createdAt: 'ASC' },
        skip,
        take: limit,
      });

      // Get pending comments
      const [pendingComments, pendingCommentsCount] = await this.commentRepository.findAndCount({
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
      const { action } = req.body; // action: 'approve' | 'reject'
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
        const post = await this.postRepository.findOne({ where: { id } });
        if (!post) {
          res.status(404).json({
            success: false,
            error: 'Post not found',
          });
          return;
        }

        post.status = action === 'approve' ? PostStatus.PUBLISHED : PostStatus.REJECTED;
        if (action === 'approve') {
          post.publishedAt = new Date();
        }

        await this.postRepository.save(post);

        res.json({
          success: true,
          data: post,
          message: `Post ${action}d successfully`,
        });
      } else if (type === 'comment') {
        const comment = await this.commentRepository.findOne({ where: { id } });
        if (!comment) {
          res.status(404).json({
            success: false,
            error: 'Comment not found',
          });
          return;
        }

        comment.status = action === 'approve' ? CommentStatus.PUBLISHED : CommentStatus.DELETED;
        await this.commentRepository.save(comment);

        res.json({
          success: true,
          data: comment,
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

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateSlug(text: string): string {
    const timestamp = Date.now().toString(36);
    const baseSlug = text
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 180);

    return `${baseSlug}-${timestamp}`;
  }
}

export default ForumController;
