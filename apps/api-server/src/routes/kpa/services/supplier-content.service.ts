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
 *
 * WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1 (2026-09-16):
 *   `Supplier → Service Operator` 공식 경로(ROLE-WORKSPACE-ARCHITECTURE §2-1)의 수신 계약으로 재사용·정렬.
 *   - `data.serviceKey`(cms 물리 키) 를 받는다. 미지정 시 종전 'kpa' 그대로 (기존 KPA 경로 불변).
 *   - `kpa_approval_requests`(hub_content_submission) 는 KPA 운영자 콘솔(SupplierContentApprovalPage) 전용
 *     수신함이므로 cms 키가 'kpa' 일 때만 생성한다. 그 외 서비스는 cms_contents(authorRole='supplier',
 *     status='pending', serviceKey=<service>) 행 자체가 운영자 수신함이다 — 공통 CMS 목록이
 *     `?status=pending&authorRole=supplier` 로 서비스 운영자에게 보여준다 (cms-content-query.handler.ts).
 *   - 제공 이후(검토·수정·복사·발행)는 운영자 업무. 여기서 상태 기계를 만들지 않는다.
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
  /** cms_contents."serviceKey" 물리 키 (canonical→물리 매핑은 호출측 책임). 기본 'kpa'. */
  serviceKey?: string;
  /**
   * WO-O4O-SUPPLIER-DOMAIN-SCOPE-FREEZE-AND-FINAL-REALIGNMENT-V1 §7.1 — handoff 멱등성.
   *
   * 원본 자료의 출처. 주어지면 **같은 출처 + 같은 serviceKey 의 살아 있는 수신 행이
   * 1개를 넘지 않도록** 보장한다(이미 있으면 새로 만들지 않고 그 행을 돌려준다).
   * 주어지지 않으면 기존 동작 그대로 — 매 호출이 새 제출이다(KPA 직접 제출 경로 무회귀).
   *
   * 저장 위치는 `cms_contents.metadata` 로, 새 원장·새 컬럼을 만들지 않는다(migration 0).
   */
  sourceRef?: {
    /** 출처 종류. 현재 유일한 값은 Supplier Library 원장이다. */
    kind: 'supplier_library_item';
    /** `neture_supplier_library_items.id` */
    id: string;
    /** 참고용 — 소유 공급자. 멱등 키에는 넣지 않는다(같은 자료의 소유자는 하나다). */
    supplierId?: string;
  };
}

/**
 * 재제공을 허용하는 수신 상태.
 *
 * `archived` = 서비스 운영자가 내린 상태다. 이때는 공급자가 다시 제공할 수 있어야 하므로
 * 멱등 판정에서 제외한다. `draft` · `pending` · `published` 는 살아 있는 수신으로 보고
 * 중복 생성을 막는다. (상태 어휘는 migration 20260224700000 의 CHECK 제약과 같다.)
 */
const HANDOFF_REUSABLE_STATUS = 'archived';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// WO-O4O-SUPPLIER-RESOURCE-CURRENT-PUBLISH-AND-HUB-FLOW-PRESERVE-V1:
// 'kpa-society' → 'kpa'. KPA 매장 HUB 의 CMS 소비 지점(HubContentLibraryPage 'cms' 탭,
// StoreHubLatestFeed 등)은 전부 serviceKey='kpa' 정확일치로 조회하므로, 종전 값으로는
// 승인(published) 후에도 매장 HUB 목록에 영원히 나타나지 않았다(게시-미노출 단절).
// 기존 데이터 영향 0 (kpa-society 공급자 cms row 운영 0건 — migration/backfill 불필요).
const SERVICE_KEY = 'kpa';

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
    const serviceKey = data.serviceKey?.trim() || SERVICE_KEY;
    const withKpaApprovalRequest = serviceKey === SERVICE_KEY;

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // WO-O4O-SUPPLIER-DOMAIN-SCOPE-FREEZE-AND-FINAL-REALIGNMENT-V1 §7.1:
      //   출처가 주어졌으면 **같은 출처 + 같은 serviceKey 의 중복 수신을 만들지 않는다.**
      //   check-then-insert 는 그 자체로는 동시 요청에 안전하지 않다(막을 행이 아직 없어
      //   잠글 대상도 없다). 그래서 이 트랜잭션에 advisory lock 을 걸어 같은 (출처, 서비스)
      //   조합을 직렬화한다 — unique index 를 만들지 않고 migration 0 으로 해결한다.
      if (data.sourceRef?.id) {
        const lockKey = `${data.sourceRef.kind}:${data.sourceRef.id}:${serviceKey}`;
        await qr.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [lockKey]);

        const existing = await qr.query(
          `SELECT id, title, status
             FROM cms_contents
            WHERE "serviceKey" = $1
              AND metadata->'sourceRef'->>'kind' = $2
              AND metadata->'sourceRef'->>'id'   = $3
              AND status <> $4
            ORDER BY "createdAt" ASC
            LIMIT 1`,
          [serviceKey, data.sourceRef.kind, data.sourceRef.id, HANDOFF_REUSABLE_STATUS],
        );

        if (existing[0]) {
          // 아무것도 쓰지 않았다 — 열어둔 트랜잭션을 닫고 기존 수신을 그대로 돌려준다.
          await qr.rollbackTransaction();
          return {
            data: {
              approvalRequestId: null,
              contentId: existing[0].id,
              title: existing[0].title,
              status: existing[0].status,
              serviceKey,
              /** 새로 만들지 않고 기존 수신을 재사용했다 — 호출측이 사용자에게 구분해 알릴 수 있다. */
              reused: true,
            },
          };
        }
      }

      // 1. cms_contents INSERT
      const [cms] = await qr.query(
        `INSERT INTO cms_contents
           (id, "serviceKey", "organizationId", type, title, summary, body,
            "imageUrl", "linkUrl", status, "authorRole", "visibilityScope",
            "createdBy", metadata, "createdAt", "updatedAt")
         VALUES
           (gen_random_uuid(), $1, $2, $3, $4, $5, $6,
            $7, $8, 'pending', 'supplier', 'service',
            $9, $10, NOW(), NOW())
         RETURNING id, title, status`,
        [
          serviceKey,
          organizationId,
          data.contentType || 'article',
          data.title.trim(),
          data.summary?.trim() || null,
          data.body?.trim() || null,
          data.imageUrl?.trim() || null,
          data.linkUrl?.trim() || null,
          userId,
          // metadata 는 NOT NULL DEFAULT '{}' 다 — 출처가 없으면 빈 객체를 그대로 넣는다.
          // jsonb 연산자 없이 문자열 파라미터로 대입한다(컬럼 물리 타입을 코드에서 단정하지 않는다).
          JSON.stringify(data.sourceRef?.id ? { sourceRef: data.sourceRef } : {}),
        ],
      );

      // 2. kpa_approval_requests INSERT — KPA 운영자 콘솔 수신함 (cms 키 'kpa' 일 때만)
      let ar: { id: string | null; status: string } = { id: null, status: 'pending' };
      if (withKpaApprovalRequest) {
      [ar] = await qr.query(
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
      }

      await qr.commitTransaction();

      return {
        data: {
          approvalRequestId: ar.id,
          contentId: cms.id,
          title: cms.title,
          status: ar.status,
          serviceKey,
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
