/**
 * KPA Forum Request Service
 *
 * WO-O4O-ROUTES-REFACTOR-V1: Extracted from kpa.routes.ts (F1-F8)
 * SQL logic for forum category approval requests
 */

import type { DataSource } from 'typeorm';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Branch admin 권한 검증 helper */
async function verifyBranchAdmin(
  ds: DataSource,
  userId: string,
  branchId: string,
  userRoles: string[],
): Promise<boolean> {
  // kpa:admin / kpa:district_admin → bypass
  if (userRoles.some(r => r === 'kpa:admin' || r === 'kpa:district_admin')) return true;
  // 분회 소속 admin 확인
  const [member] = await ds.query(
    `SELECT id FROM kpa_members WHERE user_id = $1 AND organization_id = $2 AND status = 'active' AND role = 'admin' LIMIT 1`,
    [userId, branchId],
  );
  return !!member;
}

/** 활성 회원 검증 helper */
async function verifyActiveMember(
  ds: DataSource,
  userId: string,
  organizationId: string,
): Promise<{ memberId: string } | null> {
  const [member] = await ds.query(
    `SELECT id FROM kpa_members WHERE user_id = $1 AND organization_id = $2 AND status = 'active' LIMIT 1`,
    [userId, organizationId],
  );
  return member ? { memberId: member.id } : null;
}

/** Forum slug 생성 */
function generateForumSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 200);
  const suffix = Date.now().toString(36);
  return `${base}-${suffix}`;
}

export interface ForumRequestUser {
  id: string;
  name?: string;
  email?: string;
  roles?: string[];
}

export interface CreateRequestData {
  organizationId: string;
  name: string;
  description: string;
  reason?: string;
  iconEmoji?: string;
}

export interface ListAllFilters {
  status?: string;
  organizationId?: string;
  page?: number;
  limit?: number;
}

export class ForumRequestService {
  constructor(private dataSource: DataSource) {}

  /** F1: 포럼 카테고리 요청 생성 */
  async createRequest(userId: string, user: ForumRequestUser, data: CreateRequestData): Promise<any> {
    const { organizationId, name, description, reason, iconEmoji } = data;

    if (!organizationId || !UUID_RE.test(organizationId)) {
      return { error: { status: 400, code: 'INVALID_ORG', message: 'Valid organizationId required' } };
    }
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return { error: { status: 400, code: 'INVALID_NAME', message: 'name은 2~100자 필수' } };
    }
    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      return { error: { status: 400, code: 'INVALID_DESC', message: 'description은 5자 이상 필수' } };
    }

    const member = await verifyActiveMember(this.dataSource, userId, organizationId);
    if (!member) {
      return { error: { status: 403, code: 'NOT_MEMBER', message: '해당 조직의 활성 회원이 아닙니다' } };
    }

    const [saved] = await this.dataSource.query(
      `INSERT INTO kpa_approval_requests
        (id, entity_type, organization_id, payload, status, requester_id, requester_name, requester_email, submitted_at, created_at, updated_at)
       VALUES (gen_random_uuid(), 'forum_category', $1, $2, 'pending', $3, $4, $5, NOW(), NOW(), NOW())
       RETURNING *`,
      [
        organizationId,
        JSON.stringify({ name: name.trim(), description: description.trim(), reason: reason || null, iconEmoji: iconEmoji || null }),
        userId,
        user.name || user.email || 'Unknown',
        user.email || null,
      ],
    );
    return { data: saved };
  }

  /** F2: 내 요청 목록 */
  async listMy(userId: string, organizationId?: string): Promise<any> {
    let sql = `SELECT * FROM kpa_approval_requests WHERE entity_type = 'forum_category' AND requester_id = $1`;
    const params: any[] = [userId];

    if (organizationId && UUID_RE.test(organizationId)) {
      sql += ` AND organization_id = $2`;
      params.push(organizationId);
    }
    sql += ` ORDER BY created_at DESC`;

    const rows = await this.dataSource.query(sql, params);
    return { data: rows, total: rows.length };
  }

  /** F3: 요청 상세 */
  async getDetail(requestId: string, user: ForumRequestUser): Promise<any> {
    if (!UUID_RE.test(requestId)) {
      return { error: { status: 400, code: 'INVALID_ID', message: 'Invalid ID' } };
    }

    const [row] = await this.dataSource.query(
      `SELECT * FROM kpa_approval_requests WHERE id = $1 AND entity_type = 'forum_category' LIMIT 1`,
      [requestId],
    );
    if (!row) {
      return { error: { status: 404, code: 'NOT_FOUND', message: 'Request not found' } };
    }

    // 소유자 또는 해당 조직 admin만 조회 가능
    const userRoles: string[] = user.roles || [];
    const isOwner = row.requester_id === user.id;
    const isKpaAdmin = userRoles.includes('kpa:admin');
    const isBranchAdmin = await verifyBranchAdmin(this.dataSource, user.id, row.organization_id, userRoles);

    if (!isOwner && !isKpaAdmin && !isBranchAdmin) {
      return { error: { status: 403, code: 'FORBIDDEN', message: 'Access denied' } };
    }

    return { data: row };
  }

  /** F4: 전체 요청 목록 (operator/admin) */
  async listAll(filters: ListAllFilters): Promise<any> {
    const { status, organizationId } = filters;
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);

    let sql = `SELECT * FROM kpa_approval_requests WHERE entity_type = 'forum_category'`;
    const params: any[] = [];
    let idx = 1;

    if (status && status !== 'all') {
      sql += ` AND status = $${idx++}`;
      params.push(status);
    }
    if (organizationId && UUID_RE.test(organizationId)) {
      sql += ` AND organization_id = $${idx++}`;
      params.push(organizationId);
    }

    // Count
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
    const [countRow] = await this.dataSource.query(countSql, params);
    const total = parseInt(countRow?.count || '0', 10);

    sql += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, (page - 1) * limit);

    const rows = await this.dataSource.query(sql, params);
    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** F5: 분회 대기 요청 */
  async listPending(branchId: string, user: ForumRequestUser): Promise<any> {
    if (!UUID_RE.test(branchId)) {
      return { error: { status: 400, code: 'INVALID_ID', message: 'Invalid branch ID' } };
    }
    if (!(await verifyBranchAdmin(this.dataSource, user.id, branchId, user.roles || []))) {
      return { error: { status: 403, code: 'FORBIDDEN', message: 'Branch admin access required' } };
    }

    const rows = await this.dataSource.query(
      `SELECT ar.*, u.name as requester_display_name, u.email as requester_display_email
       FROM kpa_approval_requests ar
       LEFT JOIN users u ON u.id = ar.requester_id
       WHERE ar.entity_type = 'forum_category' AND ar.organization_id = $1 AND ar.status = 'pending'
       ORDER BY ar.created_at ASC`,
      [branchId],
    );
    return { data: rows };
  }

  /** F6: 승인 (ForumCategory 생성) — TRANSACTION */
  async approve(branchId: string, requestId: string, user: ForumRequestUser, reviewComment?: string): Promise<any> {
    if (!UUID_RE.test(branchId) || !UUID_RE.test(requestId)) {
      return { error: { status: 400, code: 'INVALID_ID', message: 'Invalid ID' } };
    }
    if (!(await verifyBranchAdmin(this.dataSource, user.id, branchId, user.roles || []))) {
      return { error: { status: 403, code: 'FORBIDDEN', message: 'Branch admin access required' } };
    }

    const [ar] = await this.dataSource.query(
      `SELECT id, status, payload, organization_id FROM kpa_approval_requests WHERE id = $1 AND organization_id = $2 AND entity_type = 'forum_category' LIMIT 1`,
      [requestId, branchId],
    );
    if (!ar) {
      return { error: { status: 404, code: 'NOT_FOUND', message: 'Request not found' } };
    }
    if (ar.status !== 'pending') {
      return { error: { status: 400, code: 'INVALID_STATUS', message: `현재 상태(${ar.status})에서는 승인할 수 없습니다` } };
    }

    const payload = typeof ar.payload === 'string' ? JSON.parse(ar.payload) : ar.payload;
    const slug = generateForumSlug(payload.name || 'forum');

    // 트랜잭션: approval + ForumCategory 생성
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 승인 상태 업데이트
      await queryRunner.query(
        `UPDATE kpa_approval_requests SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), review_comment = $2, updated_at = NOW() WHERE id = $3`,
        [user.id, reviewComment || null, requestId],
      );

      // 2. ForumCategory 생성 (Extension → Core)
      const [category] = await queryRunner.query(
        `INSERT INTO forum_category
          (id, name, description, slug, icon_emoji, is_active, require_approval, access_level, created_by, organization_id, is_organization_exclusive, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, true, false, 'all', $5, $6, true, NOW(), NOW())
         RETURNING id, slug`,
        [payload.name, payload.description, slug, payload.iconEmoji || null, user.id, branchId],
      );

      // 3. 결과 기록
      await queryRunner.query(
        `UPDATE kpa_approval_requests SET result_entity_id = $1, result_metadata = $2, updated_at = NOW() WHERE id = $3`,
        [category.id, JSON.stringify({ slug: category.slug }), requestId],
      );

      await queryRunner.commitTransaction();
      return { data: { requestId, status: 'approved', categoryId: category.id, categorySlug: category.slug } };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /** F7: 거절 */
  async reject(branchId: string, requestId: string, user: ForumRequestUser, rejectionReason?: string): Promise<any> {
    if (!UUID_RE.test(branchId) || !UUID_RE.test(requestId)) {
      return { error: { status: 400, code: 'INVALID_ID', message: 'Invalid ID' } };
    }
    if (!(await verifyBranchAdmin(this.dataSource, user.id, branchId, user.roles || []))) {
      return { error: { status: 403, code: 'FORBIDDEN', message: 'Branch admin access required' } };
    }

    const [ar] = await this.dataSource.query(
      `SELECT id, status FROM kpa_approval_requests WHERE id = $1 AND organization_id = $2 AND entity_type = 'forum_category' LIMIT 1`,
      [requestId, branchId],
    );
    if (!ar) {
      return { error: { status: 404, code: 'NOT_FOUND', message: 'Request not found' } };
    }
    if (ar.status !== 'pending') {
      return { error: { status: 400, code: 'INVALID_STATUS', message: `현재 상태(${ar.status})에서는 거절할 수 없습니다` } };
    }

    await this.dataSource.query(
      `UPDATE kpa_approval_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_comment = $2, updated_at = NOW() WHERE id = $3`,
      [user.id, rejectionReason || '검토 결과 보류', requestId],
    );
    return { data: { requestId, status: 'rejected' } };
  }

  /** F8: 보완 요청 */
  async requestRevision(branchId: string, requestId: string, user: ForumRequestUser, revisionNote: string): Promise<any> {
    if (!UUID_RE.test(branchId) || !UUID_RE.test(requestId)) {
      return { error: { status: 400, code: 'INVALID_ID', message: 'Invalid ID' } };
    }
    if (!revisionNote) {
      return { error: { status: 400, code: 'NOTE_REQUIRED', message: 'revisionNote is required' } };
    }
    if (!(await verifyBranchAdmin(this.dataSource, user.id, branchId, user.roles || []))) {
      return { error: { status: 403, code: 'FORBIDDEN', message: 'Branch admin access required' } };
    }

    const [ar] = await this.dataSource.query(
      `SELECT id, status FROM kpa_approval_requests WHERE id = $1 AND organization_id = $2 AND entity_type = 'forum_category' LIMIT 1`,
      [requestId, branchId],
    );
    if (!ar) {
      return { error: { status: 404, code: 'NOT_FOUND', message: 'Request not found' } };
    }
    if (ar.status !== 'pending') {
      return { error: { status: 400, code: 'INVALID_STATUS', message: `현재 상태(${ar.status})에서는 보완 요청할 수 없습니다` } };
    }

    await this.dataSource.query(
      `UPDATE kpa_approval_requests SET status = 'revision_requested', reviewed_by = $1, reviewed_at = NOW(), revision_note = $2, updated_at = NOW() WHERE id = $3`,
      [user.id, revisionNote, requestId],
    );
    return { data: { requestId, status: 'revision_requested' } };
  }
}
