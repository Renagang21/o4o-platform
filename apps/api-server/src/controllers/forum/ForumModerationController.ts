import { Request, Response } from 'express';
import { PostStatus, CommentStatus } from '@o4o/forum-core/entities';
import { MoreThanOrEqual } from 'typeorm';
import logger from '../../utils/logger.js';
import { FORUM_ICON_SAMPLES } from './forumIconSamples.js';
import { ForumControllerBase } from './ForumControllerBase.js';

/**
 * ForumModerationController
 *
 * Handles health check, icon samples, statistics,
 * moderation queue, and content moderation actions.
 */
export class ForumModerationController extends ForumControllerBase {
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
        .andWhere('post.createdAt >= :today', { today });
      this.applyContextFilter(todayPostsQb, 'post', ctx);

      // WO-O4O-FORUM-CATEGORY-TABLE-DROP-V1: forum_category removed; use forum_category_requests
      const activeCatQb = this.categoryRepository
        .createQueryBuilder('cat')
        .where('cat.status = :status', { status: 'completed' })
        .orderBy('cat.createdAt', 'DESC')
        .take(10);

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
      // WO-KPA-A-FORUM-CREATOR-SENSITIVE-FIELDS-EXPOSURE-HOTFIX-V1
      pendingPosts.forEach(p => this.sanitizeUser((p as any).author));
      pendingComments.forEach(c => this.sanitizeUser((c as any).author));

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
      const userRole = (req as any).user?.roles?.[0]; // Phase3-D

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      // WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: KPA prefixed roles only
      const userRoles: string[] = (req as any).user?.roles || [];
      if (!userRoles.includes('kpa:admin') && !userRoles.includes('kpa:operator')) {
        res.status(403).json({
          success: false,
          error: 'KPA operator role required for content moderation',
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
}
