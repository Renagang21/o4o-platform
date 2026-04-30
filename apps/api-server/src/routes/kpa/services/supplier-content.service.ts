/**
 * Supplier Content Service
 *
 * WO-O4O-SUPPLIER-CONTENT-SUBMISSION-PHASE1-V1
 *
 * 공급자(supplier_staff)가 마케팅 자료를 등록하고
 * 운영자 승인 요청(hub_content_submission)을 생성한다.
 *
 * 흐름:
 *   submit() → cms_contents INSERT (authorRole='supplier', status='pending')
 *             + kpa_approval_requests INSERT (entity_type='hub_content_submission',
 *               payload.domain='cms', payload.contentId=<id>)
 *
 *   기존 ContentApprovalService.approve() 가 승인 시
 *   cms_contents.status → 'published' 로 전환한다 (재사용, 수정 없음).
 *
 * 신규 테이블 없음. RBAC 변경 없음.
 */

import type { DataSource } from 'typeorm';

export interface SupplierContentUser {
  id: string;
  name?: string;
  email?: string;
  roles?: string[];
}

export interface SubmitContentData {
  title: string;
  summary?: string;
  body?: string;
  imageUrl?: string;
  linkUrl?: string;
  contentType?: 'article' | 'image' | 'link' | 'product_info';
  organizationId?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SERVICE_KEY = 'kpa-society';

export class SupplierContentService {
  constructor(private dataSource: DataSource) {}

  /**
   * 마케팅 자료 제출.
   * 1. cms_contents 에 authorRole='supplier', status='pending' 으로 저장
   * 2. kpa_approval_requests 에 hub_content_submission 생성
   * 3. 두 레코드를 트랜잭션으로 묶음
   */
  async submit(userId: string, user: SupplierContentUser, data: SubmitContentData): Promise<any> {
    if (!data.title || data.title.trim().length < 2 || data.title.trim().length > 200) {
      return { error: { status: 400, code: 'INVALID_TITLE', message: '제목은 2~200자 필수' } };
    }

    const organizationId =
      data.organizationId && UUID_RE.test(data.organizationId) ? data.organizationId : null;

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // 1. cms_contents INSERT
      const [cms] = await qr.query(
        `INSERT INTO cms_contents
           (id, "serviceKey", "organizationId", type, title, summary, body,
            "imageUrl", "linkUrl", status, "authorRole", "visibilityScope",
            "createdBy", "createdAt", "updatedAt")
         VALUES
           (gen_random_uuid(), $1, $2, $3, $4, $5, $6,
            $7, $8, 'pending', 'supplier', 'service',
            $9, NOW(), NOW())
         RETURNING id, title, status`,
        [
          SERVICE_KEY,
          organizationId,
          data.contentType || 'article',
          data.title.trim(),
          data.summary?.trim() || null,
          data.body?.trim() || null,
          data.imageUrl?.trim() || null,
          data.linkUrl?.trim() || null,
          userId,
        ],
      );

      // 2. kpa_approval_requests INSERT
      const [ar] = await qr.query(
        `INSERT INTO kpa_approval_requests
           (id, entity_type, organization_id, payload, status,
            requester_id, requester_name, requester_email,
            submitted_at, created_at, updated_at)
         VALUES
           (gen_random_uuid(), 'hub_content_submission',
            COALESCE($1, gen_random_uuid()),
            $2, 'pending',
            $3, $4, $5,
            NOW(), NOW(), NOW())
         RETURNING id, status`,
        [
          organizationId,
          JSON.stringify({
            domain: 'cms',
            contentId: cms.id,
            title: cms.title,
            summary: data.summary?.trim() || null,
            contentType: data.contentType || 'article',
          }),
          userId,
          user.name || user.email || '알 수 없음',
          user.email || null,
        ],
      );

      await qr.commitTransaction();

      return {
        data: {
          approvalRequestId: ar.id,
          contentId: cms.id,
          title: cms.title,
          status: ar.status,
        },
      };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  /**
   * 내 제출 목록.
   * kpa_approval_requests JOIN cms_contents (payload.contentId)
   */
  async listMy(userId: string, page = 1, limit = 20): Promise<any> {
    const safeLimit = Math.min(limit, 100);
    const offset = (page - 1) * safeLimit;

    const rows = await this.dataSource.query(
      `SELECT
         ar.id                              AS approval_id,
         ar.status                          AS approval_status,
         ar.review_comment,
         ar.reviewed_at,
         ar.created_at,
         ar.payload->>'title'               AS title,
         ar.payload->>'contentType'         AS content_type,
         ar.payload->>'contentId'           AS content_id
       FROM kpa_approval_requests ar
       WHERE ar.entity_type = 'hub_content_submission'
         AND ar.requester_id = $1
       ORDER BY ar.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, safeLimit, offset],
    );

    const [countRow] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count FROM kpa_approval_requests
       WHERE entity_type = 'hub_content_submission' AND requester_id = $1`,
      [userId],
    );
    const total = countRow?.count ?? 0;

    return { data: rows, total, page, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) };
  }

  /**
   * 단건 조회 (본인 소유 확인)
   */
  async getOne(userId: string, approvalId: string): Promise<any> {
    if (!UUID_RE.test(approvalId)) {
      return { error: { status: 400, code: 'INVALID_ID', message: 'Invalid ID' } };
    }

    const [row] = await this.dataSource.query(
      `SELECT ar.*, c.body, c.summary, c."imageUrl", c."linkUrl"
       FROM kpa_approval_requests ar
       LEFT JOIN cms_contents c ON c.id = (ar.payload->>'contentId')::uuid
       WHERE ar.id = $1
         AND ar.entity_type = 'hub_content_submission'
         AND ar.requester_id = $2
       LIMIT 1`,
      [approvalId, userId],
    );

    if (!row) {
      return { error: { status: 404, code: 'NOT_FOUND', message: '자료를 찾을 수 없습니다' } };
    }

    return { data: row };
  }
}
