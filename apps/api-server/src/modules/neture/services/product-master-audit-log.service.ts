/**
 * ProductMasterAuditLogService — ProductMaster 작업 이력 조회 (read-only)
 *
 * WO-O4O-ADMIN-O4O-PRODUCT-MASTER-AUDIT-LOG-VIEW-V1
 *
 * master 관련 **확실한 이벤트 source** 만 타임라인으로 합친다(추론 없음). **read-only** SELECT.
 * 현재 확실한 source:
 *   - product_master_notes : note_created(created_at) / note_hidden(deleted_at, soft delete)
 *   - shared_product_descriptions : description_curated(curated_at, canonical 지정)
 *   - product_images : image_added(created_at, 작성자 없음)
 * gap(미매핑) — 억지로 표시하지 않고 gaps 로 반환:
 *   - 공통 audit_logs 테이블은 존재하나 ProductMaster 이벤트가 기록되지 않음(commission/partner 도메인용)
 *   - product_candidates 상태변경 이력(operator 큐, 별도 트랙)
 *   - 기본정보 수정 / 이미지 교체·삭제 / archive 는 후속 write WO 에서 이력 생성
 */

import type { DataSource } from 'typeorm';

export type AuditSource = 'product_master_notes' | 'shared_product_descriptions' | 'image';
export type AuditAction = 'note_created' | 'note_hidden' | 'description_curated' | 'image_added';

export interface AuditLogItem {
  id: string;
  source: AuditSource;
  action: AuditAction;
  summary: string;
  actorId: string | null;
  actorName: string | null;
  occurredAt: string;
}

export interface AuditLogGap {
  area: string;
  reason: string;
}

export interface ProductMasterAuditLog {
  masterId: string;
  items: AuditLogItem[];
  gaps: AuditLogGap[];
}

const GAPS: AuditLogGap[] = [
  { area: 'common_audit_log', reason: 'audit_logs 테이블은 존재하나 ProductMaster 이벤트는 기록되지 않음 — action-log-core 연결 필요(후속)' },
  { area: 'candidate_lifecycle', reason: 'ProductCandidate 상태변경 이력은 operator 리뷰 큐 소관(별도 트랙)' },
  { area: 'basic_edit_archive', reason: '기본정보 수정 / 이미지 교체·삭제 / archive 는 후속 write WO 에서 이력 생성' },
];

export class ProductMasterAuditLogService {
  constructor(private dataSource: DataSource) {}

  async getAuditLog(masterId: string): Promise<ProductMasterAuditLog | null> {
    const exists: { exists: boolean }[] = await this.dataSource.query(
      `SELECT EXISTS(SELECT 1 FROM product_masters WHERE id = $1) AS exists`,
      [masterId],
    );
    if (!exists[0]?.exists) return null;

    const rows: Array<{
      id: string; source: string; action: string; summary: string;
      actor_id: string | null; actor_name: string | null; occurred_at: string;
    }> = await this.dataSource.query(
      `WITH events AS (
         SELECT n.id::text AS id, 'product_master_notes' AS source, 'note_created' AS action,
                LEFT(n.note, 80) AS summary, n.created_by AS actor_id, n.created_at AS occurred_at
           FROM product_master_notes n WHERE n.product_master_id = $1
         UNION ALL
         SELECT n.id::text || ':hidden', 'product_master_notes', 'note_hidden',
                LEFT(n.note, 80), n.deleted_by, n.deleted_at
           FROM product_master_notes n WHERE n.product_master_id = $1 AND n.deleted_at IS NOT NULL
         UNION ALL
         SELECT s.id::text || ':cur', 'shared_product_descriptions', 'description_curated',
                'canonical 설명 지정 (' || COALESCE(s.source_type, '') || ')', s.curated_by, s.curated_at
           FROM shared_product_descriptions s
          WHERE s.master_id = $1 AND s.curated_at IS NOT NULL AND s.deleted_at IS NULL
         UNION ALL
         SELECT i.id::text || ':img', 'image', 'image_added',
                COALESCE(i.type, 'image') || (CASE WHEN i.is_primary THEN ' (대표)' ELSE '' END),
                NULL::uuid, i.created_at
           FROM product_images i WHERE i.master_id = $1
       )
       SELECT e.id, e.source, e.action, e.summary, e.actor_id,
              COALESCE(u.name, u.email) AS actor_name, e.occurred_at
         FROM events e LEFT JOIN users u ON u.id = e.actor_id
        ORDER BY e.occurred_at DESC NULLS LAST
        LIMIT 200`,
      [masterId],
    );

    return {
      masterId,
      items: rows.map((r) => ({
        id: r.id,
        source: r.source as AuditSource,
        action: r.action as AuditAction,
        summary: r.summary,
        actorId: r.actor_id,
        actorName: r.actor_name,
        occurredAt: r.occurred_at,
      })),
      gaps: GAPS,
    };
  }
}
