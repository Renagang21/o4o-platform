import { Request, Response } from 'express';
import { ForumCategory } from '@o4o/forum-core/entities';
import { PostStatus } from '@o4o/forum-core/entities';
import logger from '../../utils/logger.js';
import { ForumControllerBase } from './ForumControllerBase.js';

/**
 * ForumCategoryController
 *
 * Handles category CRUD, popular forums ranking,
 * owner category management, and delete requests.
 */
export class ForumCategoryController extends ForumControllerBase {
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
      logger.warn('Error listing forum categories (returning empty):', error.message);
      res.json({
        success: true,
        data: [],
        count: 0,
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
        .addSelect('MAX(post.createdAt)', 'lastPostAt')
        .where('post.status = :status', { status: PostStatus.PUBLISHED })
        .andWhere('post.createdAt >= :since', { since: sevenDaysAgo })
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
  // Owner APIs — WO-MY-CATEGORIES-API-V1 + WO-FORUM-OWNER-BASIC-EDIT-V1
  // ============================================================================

  /**
   * GET /forum/categories/mine
   * List categories created by the authenticated user
   */
  async listMyCategories(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const ctx = this.getForumContext(req);
      const qb = this.categoryRepository
        .createQueryBuilder('cat')
        .where('cat.createdBy = :userId', { userId });

      this.applyContextFilter(qb, 'cat', ctx);
      qb.orderBy('cat.createdAt', 'DESC');

      const categories = await qb.getMany();

      res.json({ success: true, data: categories, count: categories.length });
    } catch (error: any) {
      logger.error('Error listing my categories:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to list my categories' });
    }
  }

  /**
   * PATCH /forum/categories/:id/owner
   * Owner can update limited fields: name, description, iconEmoji, iconUrl
   */
  async updateMyCategory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const category = await this.categoryRepository.findOne({ where: { id } });

      if (!category) {
        res.status(404).json({ success: false, error: 'Category not found' });
        return;
      }
      if (category.createdBy !== userId) {
        res.status(403).json({ success: false, error: 'Only the forum owner can edit this forum' });
        return;
      }

      const ALLOWED_FIELDS = ['name', 'description', 'iconEmoji', 'iconUrl'] as const;
      for (const field of ALLOWED_FIELDS) {
        if (req.body[field] !== undefined) {
          (category as any)[field] = req.body[field];
        }
      }

      if (req.body.name && req.body.name !== category.name) {
        category.slug = this.generateSlug(req.body.name);
      }

      const saved = await this.categoryRepository.save(category);
      res.json({ success: true, data: saved });
    } catch (error: any) {
      logger.error('Error updating my category:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to update category' });
    }
  }

  // ============================================================================
  // Delete Request — WO-O4O-FORUM-DELETE-REQUEST-V1
  // ============================================================================

  /**
   * POST /forum/categories/:id/delete-request
   * Forum owner submits a delete request (stored in metadata jsonb)
   */
  async requestDeleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const category = await this.categoryRepository.findOne({ where: { id } });

      if (!category) {
        res.status(404).json({ success: false, error: 'Category not found' });
        return;
      }
      if (category.createdBy !== userId) {
        res.status(403).json({ success: false, error: 'Only the forum owner can request deletion' });
        return;
      }

      // Check for existing pending request
      const meta = (category.metadata as any) || {};
      if (meta.deleteRequestStatus === 'pending') {
        res.status(409).json({ success: false, error: 'A delete request is already pending for this forum' });
        return;
      }

      const { reason } = req.body;

      category.metadata = {
        ...meta,
        deleteRequestStatus: 'pending',
        deleteRequestedAt: new Date().toISOString(),
        deleteRequestedBy: userId,
        deleteRequestReason: reason || null,
        deleteReviewedAt: null,
        deleteReviewedBy: null,
        deleteReviewComment: null,
      };

      const saved = await this.categoryRepository.save(category);
      res.json({ success: true, data: saved });
    } catch (error: any) {
      logger.error('Error requesting category deletion:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to request deletion' });
    }
  }
}
