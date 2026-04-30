import { Request, Response } from 'express';
import { CommentStatus } from '@o4o/forum-core/entities';
import logger from '../../utils/logger.js';
import { ForumControllerBase } from './ForumControllerBase.js';

/**
 * ForumCommentController
 *
 * Handles comment CRUD operations.
 */
export class ForumCommentController extends ForumControllerBase {
  /**
   * GET /forum/posts/:postId/comments
   * Get comments for a post
   */
  async listComments(req: Request, res: Response): Promise<void> {
    try {
      const { postId } = req.params;
      const ctx = this.getForumContext(req);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      // WO-FORUM-SECURITY-HARDENING-V1: verify parent post is within scope
      const postQb = this.postRepository
        .createQueryBuilder('post')
        .where('post.id = :postId', { postId });
      this.applyContextFilter(postQb, 'post', ctx);
      const parentPost = await postQb.getOne();

      if (!parentPost) {
        res.status(404).json({
          success: false,
          error: 'Post not found',
        });
        return;
      }

      // WO-KPA-A-CLOSED-FORUM-ACCESS-CONTROL-V1
      // WO-O4O-FORUM-CATEGORY-CLEANUP-V1: use forumId (forum_category_requests)
      if (parentPost.forumId) {
        const { userId: uid, roles } = this.getUserFromReq(req);
        const access = await this.checkClosedForumAccess(parentPost.forumId, uid, roles);
        if (!access.allowed) {
          res.status(403).json({
            success: false,
            error: 'This post belongs to a closed forum. Membership is required.',
            code: 'CLOSED_FORUM_ACCESS_DENIED',
            data: { forumId: parentPost.forumId },
          });
          return;
        }
      }

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
      // WO-KPA-A-FORUM-CREATOR-SENSITIVE-FIELDS-EXPOSURE-HOTFIX-V1
      comments.forEach(c => this.sanitizeUser((c as any).author));

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

      // WO-KPA-A-CLOSED-FORUM-ACCESS-CONTROL-V1
      // WO-O4O-FORUM-CATEGORY-CLEANUP-V1: use forumId (forum_category_requests)
      if (post.forumId) {
        const { userId: cuid, roles: croles } = this.getUserFromReq(req);
        const access = await this.checkClosedForumAccess(post.forumId, cuid, croles);
        if (!access.allowed) {
          res.status(403).json({
            success: false,
            error: 'Membership is required to comment in this closed forum.',
            code: 'CLOSED_FORUM_ACCESS_DENIED',
            data: { forumId: post.forumId },
          });
          return;
        }
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
      // WO-KPA-A-FORUM-CREATOR-SENSITIVE-FIELDS-EXPOSURE-HOTFIX-V1
      this.sanitizeUser((commentWithAuthor as any)?.author);

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
      const userRole = (req as any).user?.roles?.[0] || 'user'; // Phase3-D
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
      // WO-KPA-A-FORUM-CREATOR-SENSITIVE-FIELDS-EXPOSURE-HOTFIX-V1
      this.sanitizeUser((updated as any)?.author);

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
      const userRole = (req as any).user?.roles?.[0] || 'user'; // Phase3-D
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
}
