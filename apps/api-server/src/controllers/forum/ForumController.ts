import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { ForumPost, PostStatus, ForumPostLike } from '@o4o/forum-core/entities';
import { ForumCategory } from '@o4o/forum-core/entities';
import { ForumComment, CommentStatus } from '@o4o/forum-core/entities';
import { normalizeContent, blocksToText, normalizeMetadata } from '@o4o/forum-core';
import type { ForumPostMetadata } from '@o4o/forum-core';
import { User } from '../../modules/auth/entities/User.js';
import { MoreThanOrEqual, type SelectQueryBuilder } from 'typeorm';
import logger from '../../utils/logger.js';
import { FORUM_ICON_SAMPLES } from './forumIconSamples.js';
import type { ForumContext } from '../../middleware/forum-context.middleware.js';

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

  private get likeRepository() {
    return AppDataSource.getRepository(ForumPostLike);
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

  /**
   * GET /forum/icon-samples
   * Returns grouped emoji icon samples for forum category creation
   */
  async getIconSamples(_req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      data: FORUM_ICON_SAMPLES,
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

      // Forum context filter (service-bound visibility)
      this.applyContextFilter(queryBuilder, 'post', this.getForumContext(req));

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

      // Support both UUID and slug-based lookup
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const where = isUuid ? { id } : { slug: id };

      const post = await this.postRepository.findOne({
        where,
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
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const { title, content, excerpt, categoryId, categorySlug, type, tags, isPinned, allowComments, metadata, showContactOnPost } = req.body;

      // Generate slug from title
      const slug = this.generateSlug(title);

      // Resolve category by ID or slug
      let category;
      if (categoryId) {
        category = await this.categoryRepository.findOne({ where: { id: categoryId } });
      } else if (categorySlug) {
        category = await this.categoryRepository.findOne({ where: { slug: categorySlug } });
      }

      if (!category) {
        // Fallback: find first active category
        category = await this.categoryRepository.findOne({ where: { isActive: true }, order: { sortOrder: 'ASC' } });
      }

      const resolvedCategoryId = category?.id || null;

      // Normalize content to Block[] format
      const normalizedContent = normalizeContent(content);

      // Auto-generate excerpt from content if not provided
      const postExcerpt = excerpt || blocksToText(normalizedContent).substring(0, 200);

      // Normalize metadata to structured format
      const normalizedMeta = metadata ? normalizeMetadata(metadata) : undefined;

      // Auto-set organizationId from forum context
      const ctx = this.getForumContext(req);

      const post = this.postRepository.create({
        title,
        content: normalizedContent,
        excerpt: postExcerpt,
        categoryId: resolvedCategoryId,
        type,
        tags,
        isPinned,
        allowComments: allowComments !== false,
        metadata: normalizedMeta,
        showContactOnPost: showContactOnPost || false,
        authorId: userId,
        slug,
        status: category?.requireApproval ? PostStatus.PENDING : PostStatus.PUBLISHED,
        publishedAt: category?.requireApproval ? undefined : new Date(),
        ...(ctx?.organizationId ? { organizationId: ctx.organizationId } : {}),
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
      const ctx = this.getForumContext(req);

      const qb = this.categoryRepository
        .createQueryBuilder('cat')
        .leftJoinAndSelect('cat.creator', 'creator');

      if (!includeInactive) {
        qb.where('cat.isActive = :isActive', { isActive: true });
      }

      this.applyContextFilter(qb, 'cat', ctx);

      qb.orderBy('cat.isPinned', 'DESC')
        .addOrderBy('cat.pinnedOrder', 'ASC')
        .addOrderBy('cat.sortOrder', 'ASC')
        .addOrderBy('cat.name', 'ASC');

      const categories = await qb.getMany();

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

      const { name, description, color, iconUrl, iconEmoji, sortOrder, isActive, isPinned, pinnedOrder, requireApproval, accessLevel } = req.body;

      const slug = this.generateSlug(name);

      // Auto-set organizationId from forum context
      const ctx = this.getForumContext(req);

      const category = this.categoryRepository.create({
        name,
        description,
        slug,
        color,
        iconUrl,
        iconEmoji,
        sortOrder: sortOrder || 0,
        isActive: isActive !== false,
        isPinned: isPinned || false,
        pinnedOrder: pinnedOrder ?? null,
        requireApproval: requireApproval || false,
        accessLevel: accessLevel || 'all',
        createdBy: userId,
        ...(ctx?.organizationId ? { organizationId: ctx.organizationId } : {}),
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

      const { name, description, color, iconUrl, iconEmoji, sortOrder, isActive, isPinned, pinnedOrder, requireApproval, accessLevel } = req.body;

      // Update slug if name changed
      if (name && name !== category.name) {
        category.slug = this.generateSlug(name);
      }

      // Update fields
      if (name !== undefined) category.name = name;
      if (description !== undefined) category.description = description;
      if (color !== undefined) category.color = color;
      if (iconUrl !== undefined) category.iconUrl = iconUrl;
      if (iconEmoji !== undefined) category.iconEmoji = iconEmoji;
      if (sortOrder !== undefined) category.sortOrder = sortOrder;
      if (isActive !== undefined) category.isActive = isActive;
      if (isPinned !== undefined) category.isPinned = isPinned;
      if (pinnedOrder !== undefined) category.pinnedOrder = pinnedOrder;
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
  // Likes
  // ============================================================================

  /**
   * POST /forum/posts/:id/like
   * Toggle like on a post (like → unlike, unlike → like)
   */
  async toggleLike(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const { id: postId } = req.params;
      const post = await this.postRepository.findOne({ where: { id: postId } });
      if (!post) {
        res.status(404).json({ success: false, error: 'Post not found' });
        return;
      }

      // Check if forum_post_like table exists (graceful fallback)
      let tableExists = true;
      try {
        const check = await AppDataSource.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'forum_post_like'
          ) AS "exists";
        `);
        tableExists = check[0]?.exists ?? false;
      } catch {
        tableExists = false;
      }

      if (!tableExists) {
        // Fallback: just increment without dedup tracking
        post.likeCount = (post.likeCount || 0) + 1;
        await this.postRepository.save(post);
        res.json({ success: true, data: { likeCount: post.likeCount, isLiked: true } });
        return;
      }

      const existingLike = await this.likeRepository.findOne({
        where: { postId, userId },
      });

      let isLiked: boolean;
      if (existingLike) {
        // Unlike
        await this.likeRepository.remove(existingLike);
        post.likeCount = Math.max(0, (post.likeCount || 0) - 1);
        isLiked = false;
      } else {
        // Like
        const like = this.likeRepository.create({ postId, userId });
        await this.likeRepository.save(like);
        post.likeCount = (post.likeCount || 0) + 1;
        isLiked = true;
      }

      await this.postRepository.save(post);

      res.json({
        success: true,
        data: { likeCount: post.likeCount, isLiked },
      });
    } catch (error: any) {
      logger.error('Error toggling like:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to toggle like',
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

      // Validate required fields
      if (!postId) {
        res.status(400).json({ success: false, error: 'postId is required' });
        return;
      }
      if (!content || !content.trim()) {
        res.status(400).json({ success: false, error: 'content is required' });
        return;
      }

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
        content: content.trim(),
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

      // Reload with author relation to match listComments response shape
      const commentWithAuthor = await this.commentRepository.findOne({
        where: { id: savedComment.id },
        relations: ['author'],
      });

      res.status(201).json({
        success: true,
        data: commentWithAuthor,
      });
    } catch (error: any) {
      logger.error('Error creating forum comment:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create comment',
      });
    }
  }

  /**
   * PUT /forum/comments/:id
   * Update comment (author only)
   */
  async updateComment(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role || 'customer';
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { content } = req.body;

      if (!content || !content.trim()) {
        res.status(400).json({ success: false, error: 'content is required' });
        return;
      }

      const comment = await this.commentRepository.findOne({
        where: { id },
        relations: ['author'],
      });

      if (!comment) {
        res.status(404).json({ success: false, error: 'Comment not found' });
        return;
      }

      // Author or admin/manager can edit
      if (!['admin', 'manager'].includes(userRole) && comment.authorId !== userId) {
        res.status(403).json({ success: false, error: 'Permission denied' });
        return;
      }

      comment.content = content.trim();
      comment.isEdited = true;
      const saved = await this.commentRepository.save(comment);

      const updated = await this.commentRepository.findOne({
        where: { id: saved.id },
        relations: ['author'],
      });

      res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      logger.error('Error updating forum comment:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to update comment' });
    }
  }

  /**
   * DELETE /forum/comments/:id
   * Delete comment (author or admin)
   */
  async deleteComment(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role || 'customer';
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      const comment = await this.commentRepository.findOne({ where: { id } });
      if (!comment) {
        res.status(404).json({ success: false, error: 'Comment not found' });
        return;
      }

      if (!['admin', 'manager'].includes(userRole) && comment.authorId !== userId) {
        res.status(403).json({ success: false, error: 'Permission denied' });
        return;
      }

      // Soft delete
      comment.status = CommentStatus.DELETED;
      await this.commentRepository.save(comment);

      // Decrement post comment count
      const post = await this.postRepository.findOne({ where: { id: comment.postId } });
      if (post && post.commentCount > 0) {
        post.commentCount -= 1;
        await this.postRepository.save(post);
      }

      res.status(200).json({ success: true, message: 'Comment deleted successfully' });
    } catch (error: any) {
      logger.error('Error deleting forum comment:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to delete comment' });
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
      const ctx = this.getForumContext(req);

      // Build context-aware count queries
      const totalPostsQb = this.postRepository
        .createQueryBuilder('post')
        .where('post.status = :s', { s: PostStatus.PUBLISHED });
      this.applyContextFilter(totalPostsQb, 'post', ctx);

      const todayPostsQb = this.postRepository
        .createQueryBuilder('post')
        .where('post.status = :s', { s: PostStatus.PUBLISHED })
        .andWhere('post."createdAt" >= :today', { today });
      this.applyContextFilter(todayPostsQb, 'post', ctx);

      const activeCatQb = this.categoryRepository
        .createQueryBuilder('cat')
        .where('cat.isActive = true')
        .orderBy('cat.postCount', 'DESC')
        .take(10);
      this.applyContextFilter(activeCatQb, 'cat', ctx);

      const [
        totalPosts,
        totalComments,
        totalUsers,
        todayPosts,
        todayComments,
        activeCategories,
      ] = await Promise.all([
        totalPostsQb.getCount(),
        this.commentRepository.count({ where: { status: CommentStatus.PUBLISHED } }),
        this.userRepository.count(),
        todayPostsQb.getCount(),
        this.commentRepository.count({
          where: {
            status: CommentStatus.PUBLISHED,
            createdAt: MoreThanOrEqual(today),
          },
        }),
        activeCatQb.getMany(),
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
  // Popular Forums
  // ============================================================================

  /**
   * GET /forum/categories/popular
   * Returns categories ranked by activity score over last 7 days
   * Score = (posts×3) + (comments×2) + (views×1) + recency_bonus
   */
  async getPopularForums(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 6, 20);
      const ctx = this.getForumContext(req);

      // 1. Fetch pinned categories first (always at top)
      const pinnedQb = this.categoryRepository
        .createQueryBuilder('cat')
        .where('cat.isActive = :isActive', { isActive: true })
        .andWhere('cat.isPinned = :isPinned', { isPinned: true })
        .orderBy('cat.pinnedOrder', 'ASC')
        .addOrderBy('cat.sortOrder', 'ASC');
      this.applyContextFilter(pinnedQb, 'cat', ctx);
      const pinnedCategories = await pinnedQb.getMany();

      const pinnedIds = new Set(pinnedCategories.map((c) => c.id));
      const remainingSlots = Math.max(0, limit - pinnedCategories.length);

      // 2. Aggregate activity per category over last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const activityQb = this.postRepository
        .createQueryBuilder('post')
        .select('post.categoryId', 'categoryId')
        .addSelect('COUNT(post.id)', 'postCount7d')
        .addSelect('COALESCE(SUM(post."commentCount"), 0)', 'commentSum7d')
        .addSelect('COALESCE(SUM(post."viewCount"), 0)', 'viewSum7d')
        .addSelect('MAX(post."createdAt")', 'lastPostAt')
        .where('post.status = :status', { status: PostStatus.PUBLISHED })
        .andWhere('post."createdAt" >= :since', { since: sevenDaysAgo })
        .andWhere('post."categoryId" IS NOT NULL');
      this.applyContextFilter(activityQb, 'post', ctx);
      activityQb.groupBy('post.categoryId');
      const result = await activityQb.getRawMany();

      // Calculate scores with recency bonus
      const now = Date.now();
      const scored = result.map((row) => {
        const postScore = parseInt(row.postCount7d) * 3;
        const commentScore = parseInt(row.commentSum7d) * 2;
        const viewScore = parseInt(row.viewSum7d) * 1;
        const lastPostTime = new Date(row.lastPostAt).getTime();
        const hoursSinceLastPost = (now - lastPostTime) / (1000 * 60 * 60);

        let recencyBonus = 0;
        if (hoursSinceLastPost <= 24) recencyBonus = 10;
        else if (hoursSinceLastPost <= 72) recencyBonus = 5;

        return {
          categoryId: row.categoryId,
          postCount7d: parseInt(row.postCount7d),
          commentSum7d: parseInt(row.commentSum7d),
          viewSum7d: parseInt(row.viewSum7d),
          popularScore: postScore + commentScore + viewScore + recencyBonus,
        };
      });

      const scoreMap = new Map(scored.map((s) => [s.categoryId, s]));

      // Helper to format category output
      const formatCategory = (cat: ForumCategory, isPinnedItem: boolean) => {
        const s = scoreMap.get(cat.id);
        return {
          id: cat.id,
          name: cat.name,
          description: cat.description,
          slug: cat.slug,
          color: cat.color,
          iconUrl: cat.iconUrl || null,
          iconEmoji: cat.iconEmoji || null,
          isPinned: isPinnedItem,
          postCount: cat.postCount,
          popularScore: s?.popularScore || 0,
          postCount7d: s?.postCount7d || 0,
          commentSum7d: s?.commentSum7d || 0,
          viewSum7d: s?.viewSum7d || 0,
        };
      };

      // 3. Build pinned results
      const pinnedResults = pinnedCategories.map((cat) => formatCategory(cat, true));

      // 4. Build popular results (exclude pinned)
      scored.sort((a, b) => b.popularScore - a.popularScore);
      const popularCategoryIds = scored
        .filter((s) => !pinnedIds.has(s.categoryId))
        .slice(0, remainingSlots)
        .map((s) => s.categoryId);

      let popularResults: ReturnType<typeof formatCategory>[] = [];

      if (popularCategoryIds.length > 0) {
        const popCatQb = this.categoryRepository
          .createQueryBuilder('cat')
          .where('cat.id IN (:...ids)', { ids: popularCategoryIds })
          .andWhere('cat.isActive = true');
        this.applyContextFilter(popCatQb, 'cat', ctx);
        const popularCategories = await popCatQb.getMany();

        popularResults = popularCategories
          .map((cat) => formatCategory(cat, false))
          .sort((a, b) => b.popularScore - a.popularScore);
      } else if (remainingSlots > 0) {
        // Fallback: fill with active categories by postCount
        const fallbackQb = this.categoryRepository
          .createQueryBuilder('cat')
          .where('cat.isActive = true')
          .orderBy('cat.postCount', 'DESC')
          .take(remainingSlots + pinnedCategories.length);
        this.applyContextFilter(fallbackQb, 'cat', ctx);
        const fallback = await fallbackQb.getMany();

        popularResults = fallback
          .filter((cat) => !pinnedIds.has(cat.id))
          .slice(0, remainingSlots)
          .map((cat) => formatCategory(cat, false));
      }

      res.json({
        success: true,
        data: [...pinnedResults, ...popularResults],
      });
    } catch (error: any) {
      logger.error('Error getting popular forums:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get popular forums',
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
  // Forum Context Helpers
  // ============================================================================

  /**
   * Extract ForumContext from req (set by forumContextMiddleware).
   * Returns undefined when no middleware is mounted (generic /api/v1/forum).
   */
  private getForumContext(req: Request): ForumContext | undefined {
    return (req as any).forumContext;
  }

  /**
   * Apply scope-aware filter to a QueryBuilder.
   *
   * WO-FORUM-SCOPE-SEPARATION-V1: scope-based filtering
   *
   * Rules:
   * - No context (admin-dashboard /api/v1/forum): no filter → see everything
   * - scope='community': only organizationId IS NULL (커뮤니티 전용)
   * - scope='organization' + organizationId: only matching org posts
   * - Legacy (no scope) + organizationId: non-exclusive + matching exclusive
   * - Legacy (no scope) + no organizationId: non-exclusive only
   */
  private applyContextFilter<T>(
    qb: SelectQueryBuilder<T>,
    alias: string,
    ctx: ForumContext | undefined,
  ): void {
    if (!ctx) return; // admin/generic route — no filter

    // WO-FORUM-SCOPE-SEPARATION-V1: explicit scope filtering
    if (ctx.scope === 'community') {
      qb.andWhere(`${alias}.organizationId IS NULL`);
      return;
    }

    if (ctx.scope === 'organization' && ctx.organizationId) {
      qb.andWhere(`${alias}.organizationId = :ctxOrgId`, { ctxOrgId: ctx.organizationId });
      return;
    }

    // Legacy behavior (no scope set — e.g. glycopharm)
    if (ctx.organizationId) {
      qb.andWhere(
        `(${alias}.isOrganizationExclusive = false OR ${alias}.organizationId = :ctxOrgId)`,
        { ctxOrgId: ctx.organizationId },
      );
    } else {
      qb.andWhere(`${alias}.isOrganizationExclusive = false`);
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
