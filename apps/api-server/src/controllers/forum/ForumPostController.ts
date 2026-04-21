import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { PostStatus } from '@o4o/forum-core/entities';
import { normalizeContent, blocksToText, normalizeMetadata } from '@o4o/forum-core';
import logger from '../../utils/logger.js';
import { ForumControllerBase } from './ForumControllerBase.js';

/**
 * ForumPostController
 *
 * Handles post CRUD and like toggle.
 */
export class ForumPostController extends ForumControllerBase {
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

      // Category filter + WO-KPA-A-CLOSED-FORUM-ACCESS-CONTROL-V1
      const { userId: uid, roles } = this.getUserFromReq(req);
      if (categoryId) {
        queryBuilder.andWhere('post.categoryId = :categoryId', { categoryId });
        const access = await this.checkClosedForumAccess(categoryId, uid, roles);
        if (!access.allowed) {
          res.status(403).json({
            success: false,
            error: 'This is a closed forum. Membership is required to view posts.',
            code: 'CLOSED_FORUM_ACCESS_DENIED',
            data: { categoryId },
          });
          return;
        }
      } else {
        // Exclude closed forum posts for non-members
        const BYPASS = ['kpa:admin', 'kpa:operator', 'platform:admin', 'platform:super_admin'];
        if (!roles.some((r) => BYPASS.includes(r))) {
          if (uid) {
            queryBuilder.andWhere(`(
              category.forumType IS NULL OR category.forumType != 'closed'
              OR category.createdBy = :closedUid
              OR EXISTS (SELECT 1 FROM forum_category_members fcm
                         WHERE fcm.forum_category_id = post."categoryId"
                         AND fcm.user_id = :closedUid)
            )`, { closedUid: uid });
          } else {
            queryBuilder.andWhere(
              `(category.forumType IS NULL OR category.forumType != 'closed')`,
            );
          }
        }
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
      // WO-KPA-A-FORUM-CREATOR-SENSITIVE-FIELDS-EXPOSURE-HOTFIX-V1
      posts.forEach(p => this.sanitizeUser((p as any).author));

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
      logger.warn('Error listing forum posts (returning empty):', error.message);
      res.json({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, totalPages: 0 },
        totalCount: 0,
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
      const ctx = this.getForumContext(req);

      // Support both UUID and slug-based lookup
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      const qb = this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.category', 'category')
        .leftJoinAndSelect('post.author', 'author');

      if (isUuid) {
        qb.where('post.id = :id', { id });
      } else {
        qb.where('post.slug = :slug', { slug: id });
      }

      // WO-FORUM-SECURITY-HARDENING-V1: scope filter prevents cross-org access via UUID
      this.applyContextFilter(qb, 'post', ctx);

      const post = await qb.getOne();

      if (!post) {
        res.status(404).json({
          success: false,
          error: 'Post not found',
        });
        return;
      }

      // WO-KPA-A-CLOSED-FORUM-ACCESS-CONTROL-V1
      if (post.categoryId) {
        const { userId: uid, roles } = this.getUserFromReq(req);
        const access = await this.checkClosedForumAccess(post.categoryId, uid, roles);
        if (!access.allowed) {
          res.status(403).json({
            success: false,
            error: 'This post belongs to a closed forum. Membership is required.',
            code: 'CLOSED_FORUM_ACCESS_DENIED',
            data: { categoryId: post.categoryId },
          });
          return;
        }
      }

      // Increment view count (fire-and-forget, non-blocking)
      this.postRepository
        .update(post.id, { viewCount: () => '"viewCount" + 1' })
        .catch((err) => logger.warn('Failed to increment view count:', err));
      post.viewCount = (post.viewCount || 0) + 1;
      // WO-KPA-A-FORUM-CREATOR-SENSITIVE-FIELDS-EXPOSURE-HOTFIX-V1
      this.sanitizeUser((post as any).author);

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

      // WO-FORUM-POST-CONTEXT-ALIGNMENT-V1: categoryId or categorySlug is required
      if (!category) {
        res.status(400).json({
          success: false,
          error: 'categoryId or categorySlug is required',
          code: 'CATEGORY_REQUIRED',
        });
        return;
      }

      const resolvedCategoryId = category.id;

      // WO-KPA-A-CLOSED-FORUM-ACCESS-CONTROL-V1
      if (category?.forumType === 'closed') {
        const { userId: cuid, roles: croles } = this.getUserFromReq(req);
        const access = await this.checkClosedForumAccess(category.id, cuid, croles);
        if (!access.allowed) {
          res.status(403).json({
            success: false,
            error: 'Membership is required to post in this closed forum.',
            code: 'CLOSED_FORUM_ACCESS_DENIED',
            data: { categoryId: category.id },
          });
          return;
        }
      }

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
      const userRole = (req as any).user?.roles?.[0] || 'user'; // Phase3-D

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
      const userRole = (req as any).user?.roles?.[0] || 'user'; // Phase3-D

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

      // Only decrement postCount if post was previously published
      const wasPuslished = post.status === PostStatus.PUBLISHED;

      // Archive instead of hard delete
      post.status = PostStatus.ARCHIVED;
      await this.postRepository.save(post);

      // Decrement category postCount
      if (wasPuslished && post.categoryId) {
        const category = await this.categoryRepository.findOne({ where: { id: post.categoryId } });
        if (category) {
          category.decrementPostCount();
          await this.categoryRepository.save(category);
        }
      }

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

  /**
   * PATCH /forum/posts/:id/pin
   * Pin or unpin a post as forum notice — forum owner only.
   * Only one pinned post is allowed per forum; pinning a new one auto-unpins the previous.
   * WO-KPA-A-FORUM-NOTICE-PIN-BY-OWNER-V1
   */
  async pinPost(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
        return;
      }

      const { id } = req.params;
      const { pin } = req.body;

      const post = await this.postRepository.findOne({ where: { id } });
      if (!post) {
        res.status(404).json({ success: false, error: 'Post not found' });
        return;
      }

      if (!post.categoryId) {
        res.status(400).json({ success: false, error: 'Post has no forum', code: 'NO_FORUM' });
        return;
      }

      // Ownership check: createdBy match OR membership role='owner'
      const category = await this.categoryRepository.findOne({
        where: { id: post.categoryId },
        select: ['id', 'createdBy'] as any,
      });
      if (!category) {
        res.status(404).json({ success: false, error: 'Forum not found' });
        return;
      }

      const isOwnerByCreatedBy = category.createdBy === userId;
      if (!isOwnerByCreatedBy) {
        const [member] = await AppDataSource.query(
          `SELECT role FROM forum_category_members WHERE forum_category_id = $1 AND user_id = $2 LIMIT 1`,
          [post.categoryId, userId],
        );
        if (!member || member.role !== 'owner') {
          res.status(403).json({ success: false, error: 'Only the forum owner can pin posts', code: 'NOT_FORUM_OWNER' });
          return;
        }
      }

      if (pin) {
        // Auto-unpin any existing pinned post in this forum
        await this.postRepository.update(
          { categoryId: post.categoryId, isPinned: true },
          { isPinned: false },
        );
        post.isPinned = true;
      } else {
        post.isPinned = false;
      }

      await this.postRepository.save(post);

      res.json({ success: true, data: { id: post.id, isPinned: post.isPinned } });
    } catch (error: any) {
      logger.error('Error pinning forum post:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to pin post' });
    }
  }

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
}
