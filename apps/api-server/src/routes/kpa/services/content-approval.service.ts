/**
 * Content Approval Service
 *
 * WO-O4O-OPERATOR-CONTENT-APPROVAL-PHASE1-V1
 *
 * hub_content_submission / store_share_to_hub entity_type 승인 처리.
 * KpaApprovalRequest 재사용 — 신규 테이블 없음.
 *
 * entity_type 매핑:
 *   hub_content_submission — 공급자가 HUB 노출 요청한 CMS/Signage 콘텐츠
 *   store_share_to_hub    — 매장 경영자가 편집 후 HUB 공유 요청한 콘텐츠
 *
 * payload 구조 (hub_content_submission):
 *   { domain: 'cms'|'signage-media'|'kpa-content', contentId: uuid, title: string }
 *
 * payload 구조 (store_share_to_hub):
 *   { sourceContentId: uuid, title: string, editedContentJson?: object }
 *   → 승인 시 콘텐츠 신규 생성은 WO-O4O-STORE-CONTENT-HUB-SHARE-PHASE1-V1에서 처리
 */

import type { DataSource, QueryRunner } from 'typeorm';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const CONTENT_APPROVAL_ENTITY_TYPES = [
  'hub_content_submission',
  'store_share_to_hub',
] as const;

export type ContentApprovalEntityType = (typeof CONTENT_APPROVAL_ENTITY_TYPES)[number];

export interface ContentApprovalUser {
  id: string;
  roles?: string[];
}

export interface ListApprovalsFilters {
  entity_type?: ContentApprovalEntityType | 'all';
  status?: string;
  page?: number;
  limit?: number;
}

export class ContentApprovalService {
  constructor(private dataSource: DataSource) {}

  /** 승인 대기 목록 조회 */
  async listApprovals(filters: ListApprovalsFilters): Promise<any> {
    const { entity_type } = filters;
    const status = filters.status || 'pending';
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);

    const params: any[] = [];
    const conditions: string[] = [];
    let idx = 1;

    // entity_type 필터
    const validType =
      entity_type &&
      entity_type !== 'all' &&
      CONTENT_APPROVAL_ENTITY_TYPES.includes(entity_type as ContentApprovalEntityType)
        ? entity_type
        : null;

    if (validType) {
      conditions.push(`entity_type = $${idx++}`);
      params.push(validType);
    } else {
      conditions.push(`entity_type = ANY($${idx++})`);
      params.push([...CONTENT_APPROVAL_ENTITY_TYPES]);
    }

    // status 필터 ('all' 이면 미적용)
    if (status && status !== 'all') {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }

    const whereClause = conditions.join(' AND ');
    const baseSql = `SELECT * FROM kpa_approval_requests WHERE ${whereClause}`;

    const countSql = baseSql.replace('SELECT *', 'SELECT COUNT(*) as count');
    const [countRow] = await this.dataSource.query(countSql, params);
    const total = parseInt(countRow?.count || '0', 10);

    const sql = `${baseSql} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, (page - 1) * limit);

    const rows = await this.dataSource.query(sql, params);

    return {
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** 승인 처리 (트랜잭션) */
  async approve(requestId: string, user: ContentApprovalUser, comment?: string): Promise<any> {
    if (!UUID_RE.test(requestId)) {
      return { error: { status: 400, code: 'INVALID_ID', message: 'Invalid request ID' } };
    }

    const [ar] = await this.dataSource.query(
      `SELECT id, status, entity_type, payload FROM kpa_approval_requests
       WHERE id = $1 AND entity_type = ANY($2) LIMIT 1`,
      [requestId, [...CONTENT_APPROVAL_ENTITY_TYPES]],
    );
    if (!ar) {
      return { error: { status: 404, code: 'NOT_FOUND', message: 'Approval request not found' } };
    }
    if (ar.status !== 'pending') {
      return {
        error: {
          status: 400,
          code: 'INVALID_STATUS',
          message: `현재 상태(${ar.status})에서는 승인할 수 없습니다`,
        },
      };
    }

    const payload: Record<string, any> =
      typeof ar.payload === 'string' ? JSON.parse(ar.payload) : (ar.payload ?? {});

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // 1. 승인 상태 업데이트
      await qr.query(
        `UPDATE kpa_approval_requests
         SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), review_comment = $2, updated_at = NOW()
         WHERE id = $3`,
        [user.id, comment || null, requestId],
      );

      // 2. hub_content_submission: 대상 콘텐츠 상태 전환
      if (ar.entity_type === 'hub_content_submission') {
        const { domain, contentId } = payload;
        if (domain && contentId && UUID_RE.test(contentId)) {
          await this.publishContent(qr, domain, contentId);
        }
      }
      // store_share_to_hub: share_status='approved' + shared_at + shared_request_id 업데이트
      if (ar.entity_type === 'store_share_to_hub') {
        const { storeContentId } = payload;
        if (storeContentId && UUID_RE.test(storeContentId)) {
          await qr.query(
            `UPDATE kpa_store_contents
             SET share_status = 'approved', shared_at = NOW(), shared_request_id = $1
             WHERE id = $2`,
            [requestId, storeContentId],
          );
        }
      }

      await qr.commitTransaction();
      return { data: { requestId, status: 'approved' } };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  /** 반려 처리 */
  async reject(requestId: string, user: ContentApprovalUser, reason?: string): Promise<any> {
    if (!UUID_RE.test(requestId)) {
      return { error: { status: 400, code: 'INVALID_ID', message: 'Invalid request ID' } };
    }

    const [ar] = await this.dataSource.query(
      `SELECT id, status, entity_type, payload FROM kpa_approval_requests
       WHERE id = $1 AND entity_type = ANY($2) LIMIT 1`,
      [requestId, [...CONTENT_APPROVAL_ENTITY_TYPES]],
    );
    if (!ar) {
      return { error: { status: 404, code: 'NOT_FOUND', message: 'Approval request not found' } };
    }
    if (ar.status !== 'pending') {
      return {
        error: {
          status: 400,
          code: 'INVALID_STATUS',
          message: `현재 상태(${ar.status})에서는 반려할 수 없습니다`,
        },
      };
    }

    await this.dataSource.query(
      `UPDATE kpa_approval_requests
       SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_comment = $2, updated_at = NOW()
       WHERE id = $3`,
      [user.id, reason || null, requestId],
    );

    // store_share_to_hub: share_status='rejected' 업데이트
    if (ar.entity_type === 'store_share_to_hub') {
      const payload: Record<string, any> =
        typeof ar.payload === 'string' ? JSON.parse(ar.payload) : (ar.payload ?? {});
      const { storeContentId } = payload;
      if (storeContentId && UUID_RE.test(storeContentId)) {
        await this.dataSource.query(
          `UPDATE kpa_store_contents SET share_status = 'rejected' WHERE id = $1`,
          [storeContentId],
        );
      }
    }

    return { data: { requestId, status: 'rejected' } };
  }

  /** 단건 조회 */
  async getDetail(requestId: string): Promise<any> {
    if (!UUID_RE.test(requestId)) {
      return { error: { status: 400, code: 'INVALID_ID', message: 'Invalid request ID' } };
    }

    const [row] = await this.dataSource.query(
      `SELECT * FROM kpa_approval_requests
       WHERE id = $1 AND entity_type = ANY($2) LIMIT 1`,
      [requestId, [...CONTENT_APPROVAL_ENTITY_TYPES]],
    );
    if (!row) {
      return { error: { status: 404, code: 'NOT_FOUND', message: 'Approval request not found' } };
    }

    return { data: row };
  }

  // ── private ──────────────────────────────────────────────────────────────────

  /**
   * 도메인에 따라 콘텐츠 상태를 HUB 노출 가능 상태로 전환.
   *   cms           → status = 'published'
   *   signage-media → status = 'active'
   *   kpa-content   → status = 'published'
   */
  private async publishContent(qr: QueryRunner, domain: string, contentId: string): Promise<void> {
    if (domain === 'cms') {
      await qr.query(
        `UPDATE cms_contents SET status = 'published', updated_at = NOW() WHERE id = $1`,
        [contentId],
      );
    } else if (domain === 'signage-media') {
      await qr.query(
        `UPDATE signage_media SET status = 'active', updated_at = NOW() WHERE id = $1`,
        [contentId],
      );
    } else if (domain === 'kpa-content') {
      await qr.query(
        `UPDATE kpa_contents SET status = 'published', updated_at = NOW() WHERE id = $1`,
        [contentId],
      );
    }
    // 알 수 없는 domain은 무시 (로그만)
  }
}
