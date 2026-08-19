import { Request, Response } from 'express';
import { CommentStatus, PostStatus } from '@o4o/forum-core/entities';
import logger from '../../utils/logger.js';
import { ForumControllerBase } from './ForumControllerBase.js';
// WO-O4O-FORUM-AUTHOR-PII-GUARD-V1 (S2): author-or-platform-admin edit/delete check
import { isPlatformAdmin } from '../../utils/role.utils.js';

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

      // WO-FORUM-NICKNAME-UNIFICATION-KPA-FIRST-V1: flatten authorName for frontend
      const flattenedComments = comments.map(c => this.flattenPostFields(c));

      res.json({
        success: true,
        data: flattenedComments,
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

      // WO-FORUM-COMMENT-ROUTE-STANDARDIZATION-V1
      // Nested route(/posts/:postId/comments)는 URL의 postId 우선, 기존 flat route(/comments)는 body.postId fallback
      const postId = (req.params.postId as string) || (req.body.postId as string);
      const { content, parentId } = req.body;

      // Validate required fields
      if (!postId) {
        res.status(400).json({ success: false, error: 'postId is required' });
        return;
      }
      if (!content || !content.trim()) {
        res.status(400).json({ success: false, error: 'content is required' });
        return;
      }

      // WO-O4O-COMMUNITY-FORUM-INTERACTION-AND-WRITE-BOUNDARY-COMMONIZATION-V1 §4:
      //   기존 구현은 postId 단독 조회였다 → 타 서비스 게시글에 댓글을 달 수 있었다.
      //   대상 post 는 반드시 현재 서비스 컨텍스트 안에서 해석한다.
      //   없음/타 서비스는 동일하게 404 (존재 비공개 — 기존 400 도 404 로 통일).
      const post = await this.resolveForumPostInServiceScope(postId, this.getForumContext(req));
      if (!post) {
        res.status(404).json({
          success: false,
          error: 'Post not found',
        });
        return;
      }

      // 보관(soft delete)된 게시글에는 댓글을 달 수 없다 — 존재를 노출하지 않는다.
      if (post.status === PostStatus.ARCHIVED) {
        res.status(404).json({
          success: false,
          error: 'Post not found',
        });
        return;
      }

      // WO-KPA-A-CLOSED-FORUM-ACCESS-CONTROL-V1
      // WO-O4O-FORUM-CATEGORY-CLEANUP-V1: use forumId (forum_category_requests)
      if (post.forumId) {
        const { userId: cuid, roles: croles } = this.getUserFromReq(req);
        const access = await this.assertForumWriteAccess(post.forumId, cuid, croles);
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

      // WO-O4O-COMMUNITY-FORUM-INTERACTION-AND-WRITE-BOUNDARY-COMMONIZATION-V1 §7:
      //   작성자가 설정한 댓글 허용/잠금 상태는 ForumPost.canUserComment 계약에 이미 있으나
      //   댓글 생성 경로에서 검사되지 않았다. 기존 필드를 그대로 강제한다(신규 정책 아님).
      if (post.isLocked || post.allowComments === false) {
        res.status(403).json({
          success: false,
          error: 'Comments are disabled for this post.',
          code: 'COMMENTS_DISABLED',
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
      // WO-KPA-A-FORUM-CREATOR-SENSITIVE-FIELDS-EXPOSURE-HOTFIX-V1
      this.sanitizeUser((commentWithAuthor as any)?.author);

      // WO-FORUM-NICKNAME-UNIFICATION-KPA-FIRST-V1: flatten authorName
      res.status(201).json({
        success: true,
        data: commentWithAuthor ? this.flattenPostFields(commentWithAuthor) : commentWithAuthor,
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
      const userRoles: string[] = (req as any).user?.roles || []; // WO-O4O-FORUM-AUTHOR-PII-GUARD-V1
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

      // WO-O4O-COMMUNITY-FORUM-INTERACTION-AND-WRITE-BOUNDARY-COMMONIZATION-V1 §5:
      //   comment → post → forum → service scope 순으로 해석한다.
      //   타 서비스 commentId 는 존재를 노출하지 않고 404 로 응답한다.
      const resolved = await this.resolveForumCommentInServiceScope(
        id,
        this.getForumContext(req),
        { relations: ['author'] },
      );
      if (!resolved) {
        res.status(404).json({ success: false, error: 'Comment not found' });
        return;
      }
      const comment = resolved.comment;

      // WO-O4O-FORUM-AUTHOR-PII-GUARD-V1 (S2): author-only; platform admin governance override
      if (comment.authorId !== userId && !isPlatformAdmin(userRoles)) {
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

      // WO-FORUM-NICKNAME-UNIFICATION-KPA-FIRST-V1: flatten authorName
      res.status(200).json({ success: true, data: updated ? this.flattenPostFields(updated) : updated });
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
      const userRoles: string[] = (req as any).user?.roles || []; // WO-O4O-FORUM-AUTHOR-PII-GUARD-V1
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      // WO-O4O-COMMUNITY-FORUM-INTERACTION-AND-WRITE-BOUNDARY-COMMONIZATION-V1 §5
      const resolved = await this.resolveForumCommentInServiceScope(id, this.getForumContext(req));
      if (!resolved) {
        res.status(404).json({ success: false, error: 'Comment not found' });
        return;
      }
      const comment = resolved.comment;

      // WO-O4O-FORUM-AUTHOR-PII-GUARD-V1 (S2): author-only; platform admin governance override
      if (comment.authorId !== userId && !isPlatformAdmin(userRoles)) {
        res.status(403).json({ success: false, error: 'Permission denied' });
        return;
      }

      // 이미 삭제된 댓글을 다시 삭제해도 commentCount 가 중복 차감되지 않게 한다
      // (WO-O4O-COMMUNITY-FORUM-INTERACTION-AND-WRITE-BOUNDARY-COMMONIZATION-V1 §5 — count 정합).
      const alreadyDeleted = comment.status === CommentStatus.DELETED;

      // Soft delete
      comment.status = CommentStatus.DELETED;
      await this.commentRepository.save(comment);

      // Decrement post comment count
      if (!alreadyDeleted) {
        const post = resolved.post;
        if (post && post.commentCount > 0) {
          post.commentCount -= 1;
          await this.postRepository.save(post);
        }
      }

      res.status(200).json({ success: true, message: 'Comment deleted successfully' });
    } catch (error: any) {
      logger.error('Error deleting forum comment:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to delete comment' });
    }
  }
}
