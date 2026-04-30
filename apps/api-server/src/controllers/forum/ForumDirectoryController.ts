import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
// ForumCategory removed — WO-O4O-FORUM-CATEGORY-TABLE-DROP-V1
import { ForumCategoryRequest } from '@o4o/forum-core/entities';
import { PostStatus } from '@o4o/forum-core/entities';
import logger from '../../utils/logger.js';
import { ForumControllerBase } from './ForumControllerBase.js';

/**
 * ForumDirectoryController
 *
 * WO-O4O-FORUM-CATEGORY-TABLE-DROP-V1: forum_category 테이블 제거.
 * WO-O4O-FORUM-NAMING-CLEANUP-V1: ForumCategoryController → ForumDirectoryController
 *
 * forum_category_requests (status='completed') = active forum SSOT.
 *
 * Handles forum listing, single forum lookup,
 * popular forums ranking, owner management, and delete requests.
 */
export class ForumDirectoryController extends ForumControllerBase {

  private get forumRequestRepo() {
    return AppDataSource.getRepository(ForumCategoryRequest);
  }

  /**
   * Apply organization/scope filter to a ForumCategoryRequest query.
   */
  private applyForumContextFilter(
    qb: any,
    alias: string,
    ctx: ReturnType<typeof this.getForumContext>,
  ): void {
    if (!ctx) return;
    if (ctx.scope === 'demo') {
      qb.andWhere('1 = 0');
      return;
    }
    if (ctx.scope === 'community') {
      qb.andWhere(`${alias}.organizationId IS NULL`);
      return;
    }
    if (ctx.scope === 'organization' && ctx.organizationId) {
      qb.andWhere(`${alias}.organizationId = :ctxOrgId`, { ctxOrgId: ctx.organizationId });
      return;
    }
    if (ctx.organizationId) {
      qb.andWhere(`${alias}.organizationId = :ctxOrgId`, { ctxOrgId: ctx.organizationId });
    }
  }

  /**
   * GET /forum/categories
   * List all active forums (status = 'completed')
   */
  async listForums(req: Request, res: Response): Promise<void> {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const ctx = this.getForumContext(req);

      const qb = this.forumRequestRepo.createQueryBuilder('forum');

      if (!includeInactive) {
        qb.where('forum.status = :status', { status: 'completed' });
      } else {
        qb.where('forum.status IN (:...statuses)', { statuses: ['completed', 'archived'] });
      }

      this.applyForumContextFilter(qb, 'forum', ctx);

      qb.orderBy('forum.createdAt', 'ASC');

      const forums = await qb.getMany();

      res.json({
        success: true,
        data: forums,
        count: forums.length,
      });
    } catch (error: any) {
      logger.warn('Error listing forums (returning empty):', error.message);
      res.json({
        success: true,
        data: [],
        count: 0,
      });
    }
  }

  /**
   * GET /forum/categories/:id
   * Get single forum by ID or slug
   */
  async getForum(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let forum = isUuid ? await this.forumRequestRepo.findOne({ where: { id } }) : null;
      if (!forum) {
        forum = await this.forumRequestRepo.findOne({ where: { slug: id } });
      }

      if (!forum) {
        res.status(404).json({
          success: false,
          error: 'Forum not found',
        });
        return;
      }

      // WO-KPA-A-CLOSED-FORUM-ACCESS-CONTROL-V1
      const { userId, roles } = this.getUserFromReq(req);
      const access = await this.checkClosedForumAccess(forum.id, userId, roles);
      if (!access.allowed) {
        res.status(403).json({
          success: false,
          error: 'This is a closed forum. Membership is required.',
          code: 'CLOSED_FORUM_ACCESS_DENIED',
          data: { forumId: forum.id },
        });
        return;
      }

      res.json({
        success: true,
        data: forum,
      });
    } catch (error: any) {
      logger.error('Error getting forum:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get forum',
      });
    }
  }

  /**
   * POST /forum/categories
   * Forum creation now goes through the request/approval flow.
   * Direct creation is no longer supported.
   */
  async createForum(req: Request, res: Response): Promise<void> {
    res.status(410).json({
      success: false,
      error: '포럼 직접 생성은 더 이상 지원되지 않습니다. 포럼 신청을 통해 생성하세요.',
      code: 'DIRECT_CREATE_REMOVED',
    });
  }

  /**
   * PUT /forum/categories/:id
   * Forum direct update is no longer supported.
   */
  async updateForum(req: Request, res: Response): Promise<void> {
    res.status(410).json({
      success: false,
      error: '포럼 직접 수정은 더 이상 지원되지 않습니다.',
      code: 'DIRECT_UPDATE_REMOVED',
    });
  }

  /**
   * DELETE /forum/categories/:id
   * Forum direct delete is no longer supported.
   */
  async deleteForum(req: Request, res: Response): Promise<void> {
    res.status(410).json({
      success: false,
      error: '포럼 직접 삭제는 더 이상 지원되지 않습니다.',
      code: 'DIRECT_DELETE_REMOVED',
    });
  }

  /**
   * GET /forum/categories/popular
   * Returns forums ranked by activity score over last 7 days
   * Score = (posts×3) + (comments×2) + (views×1) + recency_bonus
   */
  async getPopularForums(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 6, 20);
      const ctx = this.getForumContext(req);

      // Aggregate activity per forum over last 7 days (using forumId)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const activityQb = this.postRepository
        .createQueryBuilder('post')
        .select('post.forumId', 'forumId')
        .addSelect('COUNT(post.id)', 'postCount7d')
        .addSelect('COALESCE(SUM(post."commentCount"), 0)', 'commentSum7d')
        .addSelect('COALESCE(SUM(post."viewCount"), 0)', 'viewSum7d')
        .addSelect('MAX(post.createdAt)', 'lastPostAt')
        .where('post.status = :status', { status: PostStatus.PUBLISHED })
        .andWhere('post.createdAt >= :since', { since: sevenDaysAgo })
        .andWhere('post.forumId IS NOT NULL');
      this.applyContextFilter(activityQb, 'post', ctx);
      activityQb.groupBy('post.forumId');
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
          forumId: row.forumId,
          postCount7d: parseInt(row.postCount7d),
          commentSum7d: parseInt(row.commentSum7d),
          viewSum7d: parseInt(row.viewSum7d),
          popularScore: postScore + commentScore + viewScore + recencyBonus,
        };
      });

      scored.sort((a, b) => b.popularScore - a.popularScore);
      const scoreMap = new Map(scored.map((s) => [s.forumId, s]));

      const topForumIds = scored.slice(0, limit).map((s) => s.forumId);

      let forums: ForumCategoryRequest[] = [];
      if (topForumIds.length > 0) {
        const popQb = this.forumRequestRepo
          .createQueryBuilder('forum')
          .where('forum.id IN (:...ids)', { ids: topForumIds })
          .andWhere('forum.status = :status', { status: 'completed' });
        this.applyForumContextFilter(popQb, 'forum', ctx);
        forums = await popQb.getMany();
      }

      // Fallback: fill with active forums by creation date
      if (forums.length < limit) {
        const existingIds = new Set(forums.map((f) => f.id));
        const fallbackQb = this.forumRequestRepo
          .createQueryBuilder('forum')
          .where('forum.status = :status', { status: 'completed' })
          .orderBy('forum.createdAt', 'DESC')
          .take(limit);
        this.applyForumContextFilter(fallbackQb, 'forum', ctx);
        const fallback = await fallbackQb.getMany();
        for (const f of fallback) {
          if (!existingIds.has(f.id) && forums.length < limit) {
            forums.push(f);
          }
        }
      }

      const data = forums.map((forum) => {
        const s = scoreMap.get(forum.id);
        return {
          id: forum.id,
          name: forum.name,
          description: forum.description,
          slug: forum.slug,
          iconUrl: forum.iconUrl || null,
          iconEmoji: forum.iconEmoji || null,
          isPinned: false,
          popularScore: s?.popularScore || 0,
          postCount7d: s?.postCount7d || 0,
          commentSum7d: s?.commentSum7d || 0,
          viewSum7d: s?.viewSum7d || 0,
        };
      });

      res.json({
        success: true,
        data,
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
   * List forums created by the authenticated user
   */
  async listMyForums(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const ctx = this.getForumContext(req);
      const qb = this.forumRequestRepo
        .createQueryBuilder('forum')
        .where('forum.requesterId = :userId', { userId })
        .andWhere('forum.status IN (:...statuses)', { statuses: ['completed', 'archived'] });

      this.applyForumContextFilter(qb, 'forum', ctx);
      qb.orderBy('forum.createdAt', 'DESC');

      const forums = await qb.getMany();

      res.json({ success: true, data: forums, count: forums.length });
    } catch (error: any) {
      logger.error('Error listing my forums:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to list my forums' });
    }
  }

  /**
   * PATCH /forum/categories/:id/owner
   * Owner can update limited fields: name, description, iconEmoji, iconUrl
   */
  async updateMyForum(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const forum = await this.forumRequestRepo.findOne({ where: { id } });

      if (!forum) {
        res.status(404).json({ success: false, error: 'Forum not found' });
        return;
      }
      if (forum.requesterId !== userId) {
        res.status(403).json({ success: false, error: 'Only the forum owner can edit this forum' });
        return;
      }

      const ALLOWED_FIELDS = ['name', 'description', 'iconEmoji', 'iconUrl'] as const;
      for (const field of ALLOWED_FIELDS) {
        if (req.body[field] !== undefined) {
          (forum as any)[field] = req.body[field];
        }
      }

      if (req.body.name && req.body.name !== forum.name) {
        forum.slug = this.generateSlug(req.body.name);
      }

      const saved = await this.forumRequestRepo.save(forum);
      res.json({ success: true, data: saved });
    } catch (error: any) {
      logger.error('Error updating my forum:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to update forum' });
    }
  }

  // ============================================================================
  // Delete Request — WO-O4O-FORUM-DELETE-REQUEST-V1
  // ============================================================================

  /**
   * POST /forum/categories/:id/delete-request
   * Forum owner submits a delete request (stored in metadata jsonb)
   */
  async requestDeleteForum(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const forum = await this.forumRequestRepo.findOne({ where: { id } });

      if (!forum) {
        res.status(404).json({ success: false, error: 'Forum not found' });
        return;
      }
      if (forum.requesterId !== userId) {
        res.status(403).json({ success: false, error: 'Only the forum owner can request deletion' });
        return;
      }

      const meta = (forum.metadata as any) || {};
      if (meta.deleteRequestStatus === 'pending') {
        res.status(409).json({ success: false, error: 'A delete request is already pending for this forum' });
        return;
      }

      const { reason } = req.body;

      forum.metadata = {
        ...meta,
        deleteRequestStatus: 'pending',
        deleteRequestedAt: new Date().toISOString(),
        deleteRequestedBy: userId,
        deleteRequestReason: reason || null,
        deleteReviewedAt: null,
        deleteReviewedBy: null,
        deleteReviewComment: null,
      };

      const saved = await this.forumRequestRepo.save(forum);
      res.json({ success: true, data: saved });
    } catch (error: any) {
      logger.error('Error requesting forum deletion:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to request deletion' });
    }
  }
}
