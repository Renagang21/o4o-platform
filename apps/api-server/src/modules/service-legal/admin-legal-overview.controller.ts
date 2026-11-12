/**
 * 법적 기본 문서 통합 현황 — admin.neture.co.kr 전체 관리자 전용 (read-only)
 *
 * TODO-O4O-LEGAL-BASIC-DOCUMENTS-ADMIN-V1 4단계 (5단계 「퇴역 · 게시 대상 아님 표시」 포함)
 *
 *   GET /api/v1/admin/legal-documents/overview — platform:super_admin
 *
 * 범위(scope)별로 문서 종류 · 표식마다 「현재 게시본(버전 · 시행일 · 동의 건수)」과 「대기 중인 다음 버전 초안」을 묶는다.
 *   - account  : 계정 공통(neture) — admin 에서 편집
 *   - service  : 직영 서비스(supplier · community · funding · lecture · partner-support) — admin 에서 편집
 *   - business : 약국 협력사업(business:<id>) — 조회만. 편집은 해당 사업 관리자(사업 운영 화면) — V2 §144
 *   - other    : 그 밖(k-cosmetics 퇴역 · kpa-society 계정 v2 게시 대상 아님 등) — 보존 · 표시만
 *
 * 쓰기 없음 · 본문 미노출(메타 · 건수만). 전체 관리자가 서비스 전체를 보는 현황이라 서비스 경계 필터 대신 role 로 제한한다.
 * 사업 이름은 별도 조회로 붙인다(교차 도메인 JOIN 금지 — CLAUDE.md §7 Guard 5).
 */
import { Router, type Request, type Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import logger from '../../utils/logger.js';

export type LegalScopeTier = 'account' | 'service' | 'business' | 'other';

export interface PolicyRow {
  id: string;
  service_key: string;
  document_type: string;
  slug: string | null;
  title: string;
  version: number;
  status: string;
  effective_date: string | Date | null;
  published_at: string | Date | null;
}

const DIRECT_SERVICES = ['supplier', 'community', 'funding', 'lecture', 'partner-support'] as const;
const SCOPE_NOTES: Record<string, string> = {
  'k-cosmetics': '퇴역 서비스 — 동의 증빙 보존 대상. 새 문서를 만들지 않는다',
  'kpa-society': '계정 약관 v2 게시 대상 아님(2026-11-08). 매장 경영자 동의서(store_owner_agreement)는 결제 단계에서 사용 중',
  'pharmacy-hub': '퇴역 서비스 — 동의 증빙 보존 대상',
};
const BUSINESS_SCOPE = /^business:([0-9a-f-]{36})$/i;

export function tierOf(serviceKey: string): LegalScopeTier {
  if (serviceKey === 'neture') return 'account';
  if ((DIRECT_SERVICES as readonly string[]).includes(serviceKey)) return 'service';
  if (BUSINESS_SCOPE.test(serviceKey)) return 'business';
  return 'other';
}

const day = (v: string | Date | null) => (v ? new Date(v).toISOString().slice(0, 10) : null);

/** 순수 함수 — 문서 행 · 동의 건수 · 사업 이름으로 현황을 만든다. */
export function buildLegalOverview(
  rows: PolicyRow[],
  acceptances: Map<string, number>,
  businesses: Map<string, { key: string; name: string; status: string }>,
) {
  const scopes = new Map<string, { serviceKey: string; tier: LegalScopeTier; label: string; note: string | null; editPath: string | null; documents: Map<string, any> }>();
  for (const r of rows) {
    const tier = tierOf(r.service_key);
    if (!scopes.has(r.service_key)) {
      const business = tier === 'business' ? businesses.get(BUSINESS_SCOPE.exec(r.service_key)![1].toLowerCase()) : undefined;
      scopes.set(r.service_key, {
        serviceKey: r.service_key,
        tier,
        label: business ? `${business.name} (${business.key})` : r.service_key,
        note: tier === 'business'
          ? '해당 사업 관리자가 사업 운영 화면에서 편집합니다'
          : (SCOPE_NOTES[r.service_key] ?? null),
        editPath: tier === 'account' || tier === 'service' ? `/operations/${r.service_key}/legal` : null,
        documents: new Map(),
      });
    }
    const docs = scopes.get(r.service_key)!.documents;
    const key = `${r.document_type}|${r.slug ?? ''}`;
    if (!docs.has(key)) docs.set(key, { documentType: r.document_type, slug: r.slug, title: r.title, published: null, pendingDraft: null });
    const doc = docs.get(key);
    const version = Number(r.version);
    if (r.status === 'published' && (!doc.published || version > doc.published.version)) {
      doc.published = { id: r.id, version, effectiveDate: day(r.effective_date), publishedAt: day(r.published_at), acceptances: acceptances.get(r.id) ?? 0 };
      doc.title = r.title;
    }
    if (r.status === 'draft' && (!doc.pendingDraft || version > doc.pendingDraft.version)) {
      doc.pendingDraft = { id: r.id, version, effectiveDate: day(r.effective_date) };
    }
  }
  const order: LegalScopeTier[] = ['account', 'service', 'business', 'other'];
  return [...scopes.values()]
    .map((s) => ({
      ...s,
      documents: [...s.documents.values()]
        .map((d) => ({ ...d, pendingDraft: d.pendingDraft && (!d.published || d.pendingDraft.version > d.published.version) ? d.pendingDraft : null }))
        .sort((a, b) => a.documentType.localeCompare(b.documentType, 'en') || String(a.slug).localeCompare(String(b.slug), 'en')),
    }))
    .sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier) || a.label.localeCompare(b.label, 'ko'));
}

export function createAdminLegalOverviewController(db: DataSource): Router {
  const router = Router();
  router.get('/overview', authenticate, requireRole('platform:super_admin'), async (_req: Request, res: Response) => {
    try {
      const rows: PolicyRow[] = await db.query(
        `SELECT id, service_key, document_type, slug, title, version, status, effective_date, published_at
           FROM service_policy_documents
          WHERE status = ANY($1::text[])
          ORDER BY service_key, document_type, version DESC`,
        [['draft', 'published']],
      );
      const publishedIds = rows.filter((r) => r.status === 'published').map((r) => r.id);
      const counts: Array<{ id: string; n: number }> = publishedIds.length
        ? await db.query(
          `SELECT policy_document_id AS id, count(*)::int AS n
             FROM user_policy_acceptances
            WHERE policy_document_id = ANY($1::uuid[])
            GROUP BY policy_document_id`,
          [publishedIds],
        )
        : [];
      const businessIds = [...new Set(rows.map((r) => BUSINESS_SCOPE.exec(r.service_key)?.[1]?.toLowerCase()).filter(Boolean))] as string[];
      const businesses: Array<{ id: string; key: string; name: string; status: string }> = businessIds.length
        ? await db.query(`SELECT id, key, name, status FROM semi_franchises WHERE id = ANY($1::uuid[])`, [businessIds])
        : [];
      res.setHeader('Cache-Control', 'private, no-store');
      res.json({
        success: true,
        data: buildLegalOverview(
          rows,
          new Map(counts.map((c) => [c.id, Number(c.n)])),
          new Map(businesses.map((b) => [String(b.id).toLowerCase(), { key: b.key, name: b.name, status: b.status }])),
        ),
      });
    } catch (error) {
      logger.error('[ServiceLegal AdminOverview] overview error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '법적 문서 현황을 불러오지 못했습니다.' } });
    }
  });
  return router;
}
