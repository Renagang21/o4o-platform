/**
 * KPA Forum Membership Service
 *
 * WO-KPA-A-FORUM-MEMBERSHIP-TABLE-AND-JOIN-API-V1
 * WO-O4O-FORUM-MEMBER-MANAGEMENT-BACKEND-CANONICALIZATION-V1:
 *   kpa_approval_requests → forum_join_requests (canonical service-agnostic table)
 *
 * 폐쇄형 포럼(forumType='closed') 가입 신청/승인/거절/회원 관리
 * - 가입 신청: forum_join_requests
 * - 실제 멤버십: forum_category_members (role='owner'|'member')
 */

import type { DataSource } from 'typeorm';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ForumMembershipUser {
  id: string;
  name?: string;
  email?: string;
  roles?: string[];
}

export class ForumMembershipService {
  constructor(private dataSource: DataSource) {}

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Check if user is forum owner (via membership table, fallback to created_by) */
  private async isForumOwner(categoryId: string, userId: string): Promise<boolean> {
    const [row] = await this.dataSource.query(
      `SELECT id FROM forum_category_members
       WHERE forum_category_id = $1 AND user_id = $2 AND role = 'owner'
       LIMIT 1`,
      [categoryId, userId],
    );
    if (row) return true;

    // Fallback: forum_category_requests.requester_id (for forums created before membership backfill)
    const [cat] = await this.dataSource.query(
      `SELECT id FROM forum_category_requests WHERE id = $1 AND requester_id = $2 LIMIT 1`,
      [categoryId, userId],
    );
    return !!cat;
  }

  /** Get forum essential fields from forum_category_requests */
  private async getForumCategory(categoryId: string): Promise<any | null> {
    const [cat] = await this.dataSource.query(
      `SELECT id, name, slug, forum_type, requester_id, organization_id
       FROM forum_category_requests WHERE id = $1 LIMIT 1`,
      [categoryId],
    );
    return cat || null;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** 폐쇄형 포럼 가입 신청 → forum_join_requests */
  async requestJoin(
    categoryId: string,
    user: ForumMembershipUser,
  ): Promise<any> {
    if (!UUID_RE.test(categoryId)) {
      return { error: { status: 400, code: 'INVALID_ID', message: 'Invalid category ID' } };
    }

    const category = await this.getForumCategory(categoryId);
    if (!category) {
      return { error: { status: 404, code: 'NOT_FOUND', message: 'Forum not found' } };
    }
    if (category.forum_type !== 'closed') {
      return { error: { status: 400, code: 'NOT_CLOSED_FORUM', message: 'This forum does not require membership' } };
    }

    // Already a member?
    const [existing] = await this.dataSource.query(
      `SELECT id FROM forum_category_members
       WHERE forum_category_id = $1 AND user_id = $2 LIMIT 1`,
      [categoryId, user.id],
    );
    if (existing) {
      return { error: { status: 409, code: 'ALREADY_MEMBER', message: 'Already a member of this forum' } };
    }

    // Pending request exists?
    const [pendingReq] = await this.dataSource.query(
      `SELECT id FROM forum_join_requests
       WHERE forum_category_id = $1 AND user_id = $2 AND status = 'pending'
       LIMIT 1`,
      [categoryId, user.id],
    );
    if (pendingReq) {
      return { error: { status: 409, code: 'PENDING_REQUEST', message: 'Join request already pending' } };
    }

    const [saved] = await this.dataSource.query(
      `INSERT INTO forum_join_requests
        (id, forum_category_id, user_id, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'pending', NOW(), NOW())
       RETURNING *`,
      [categoryId, user.id],
    );

    return { data: saved };
  }

  /** Owner가 가입 신청 승인 → 트랜잭션: approval + membership */
  async approveJoin(
    categoryId: string,
    requestId: string,
    user: ForumMembershipUser,
  ): Promise<any> {
    if (!UUID_RE.test(categoryId) || !UUID_RE.test(requestId)) {
      return { error: { status: 400, code: 'INVALID_ID', message: 'Invalid ID' } };
    }
    if (!(await this.isForumOwner(categoryId, user.id))) {
      return { error: { status: 403, code: 'FORBIDDEN', message: 'Only the forum owner can approve members' } };
    }

    const [jr] = await this.dataSource.query(
      `SELECT id, status, user_id
       FROM forum_join_requests
       WHERE id = $1 AND forum_category_id = $2 AND status = 'pending'
       LIMIT 1`,
      [requestId, categoryId],
    );
    if (!jr) {
      return { error: { status: 404, code: 'NOT_FOUND', message: 'Join request not found or not pending' } };
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.query(
        `UPDATE forum_join_requests
         SET status = 'approved', reviewer_id = $1, reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [user.id, requestId],
      );

      await queryRunner.query(
        `INSERT INTO forum_category_members
          (forum_category_id, user_id, role, joined_at, created_at, updated_at)
         VALUES ($1, $2, 'member', NOW(), NOW(), NOW())
         ON CONFLICT (forum_category_id, user_id) DO NOTHING`,
        [categoryId, jr.user_id],
      );

      await queryRunner.commitTransaction();
      return { data: { requestId, status: 'approved', userId: jr.user_id } };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /** Owner가 가입 신청 거절 */
  async rejectJoin(
    categoryId: string,
    requestId: string,
    user: ForumMembershipUser,
    reviewComment?: string,
  ): Promise<any> {
    if (!UUID_RE.test(categoryId) || !UUID_RE.test(requestId)) {
      return { error: { status: 400, code: 'INVALID_ID', message: 'Invalid ID' } };
    }
    if (!(await this.isForumOwner(categoryId, user.id))) {
      return { error: { status: 403, code: 'FORBIDDEN', message: 'Only the forum owner can reject members' } };
    }

    const [jr] = await this.dataSource.query(
      `SELECT id FROM forum_join_requests
       WHERE id = $1 AND forum_category_id = $2 AND status = 'pending'
       LIMIT 1`,
      [requestId, categoryId],
    );
    if (!jr) {
      return { error: { status: 404, code: 'NOT_FOUND', message: 'Join request not found or not pending' } };
    }

    await this.dataSource.query(
      `UPDATE forum_join_requests
       SET status = 'rejected', reviewer_id = $1, review_comment = $2, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [user.id, reviewComment || null, requestId],
    );

    return { data: { requestId, status: 'rejected' } };
  }

  /** 포럼 회원 목록 조회 (owner only) */
  async listMembers(
    categoryId: string,
    user: ForumMembershipUser,
  ): Promise<any> {
    if (!UUID_RE.test(categoryId)) {
      return { error: { status: 400, code: 'INVALID_ID', message: 'Invalid category ID' } };
    }
    if (!(await this.isForumOwner(categoryId, user.id))) {
      return { error: { status: 403, code: 'FORBIDDEN', message: 'Only the forum owner can view members' } };
    }

    const rows = await this.dataSource.query(
      `SELECT m.id, m.user_id, m.role, m.joined_at,
              u.name as user_name, u.email as user_email
       FROM forum_category_members m
       LEFT JOIN users u ON u.id = m.user_id
       WHERE m.forum_category_id = $1
       ORDER BY
         CASE m.role WHEN 'owner' THEN 0 ELSE 1 END ASC,
         m.joined_at ASC`,
      [categoryId],
    );

    return { data: rows };
  }

  /** 대기 중 가입 신청 목록 (owner only) */
  async listPendingJoinRequests(
    categoryId: string,
    user: ForumMembershipUser,
  ): Promise<any> {
    if (!UUID_RE.test(categoryId)) {
      return { error: { status: 400, code: 'INVALID_ID', message: 'Invalid category ID' } };
    }
    if (!(await this.isForumOwner(categoryId, user.id))) {
      return { error: { status: 403, code: 'FORBIDDEN', message: 'Only the forum owner can view join requests' } };
    }

    const rows = await this.dataSource.query(
      `SELECT jr.id, jr.user_id, jr.status, jr.message, jr.created_at,
              u.name  AS user_name,
              u.email AS user_email,
              u.name  AS user_display_name,
              jr.user_id AS requester_id,
              u.name  AS requester_name,
              u.email AS requester_email
       FROM forum_join_requests jr
       LEFT JOIN users u ON u.id = jr.user_id
       WHERE jr.forum_category_id = $1 AND jr.status = 'pending'
       ORDER BY jr.created_at ASC`,
      [categoryId],
    );

    return { data: rows };
  }

  /** Owner가 일반 회원 삭제 (owner 본인은 삭제 불가) */
  async removeMember(
    categoryId: string,
    targetUserId: string,
    user: ForumMembershipUser,
  ): Promise<any> {
    if (!UUID_RE.test(categoryId) || !UUID_RE.test(targetUserId)) {
      return { error: { status: 400, code: 'INVALID_ID', message: 'Invalid ID' } };
    }
    if (!(await this.isForumOwner(categoryId, user.id))) {
      return { error: { status: 403, code: 'FORBIDDEN', message: 'Only the forum owner can remove members' } };
    }

    const [target] = await this.dataSource.query(
      `SELECT id, role FROM forum_category_members
       WHERE forum_category_id = $1 AND user_id = $2 LIMIT 1`,
      [categoryId, targetUserId],
    );
    if (!target) {
      return { error: { status: 404, code: 'NOT_FOUND', message: 'Member not found' } };
    }
    if (target.role === 'owner') {
      return { error: { status: 400, code: 'CANNOT_REMOVE_OWNER', message: 'Cannot remove the forum owner' } };
    }

    await this.dataSource.query(
      `DELETE FROM forum_category_members
       WHERE forum_category_id = $1 AND user_id = $2 AND role != 'owner'`,
      [categoryId, targetUserId],
    );

    return { data: { removed: true, userId: targetUserId } };
  }

  /** 현재 사용자의 특정 포럼 멤버십 상태 */
  async getMembershipStatus(
    categoryId: string,
    userId: string,
  ): Promise<any> {
    if (!UUID_RE.test(categoryId)) {
      return { data: { isMember: false, role: null, pendingRequest: false } };
    }

    const [member] = await this.dataSource.query(
      `SELECT role FROM forum_category_members
       WHERE forum_category_id = $1 AND user_id = $2 LIMIT 1`,
      [categoryId, userId],
    );
    if (member) {
      return { data: { isMember: true, role: member.role, pendingRequest: false } };
    }

    const [pending] = await this.dataSource.query(
      `SELECT id FROM forum_join_requests
       WHERE forum_category_id = $1 AND user_id = $2 AND status = 'pending'
       LIMIT 1`,
      [categoryId, userId],
    );

    return { data: { isMember: false, role: null, pendingRequest: !!pending } };
  }
}
