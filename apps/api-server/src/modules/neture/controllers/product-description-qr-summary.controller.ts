/**
 * ProductDescriptionQrSummary Controller — 제품 리스트용 설명서/QR 상태 요약 (admin, GET only)
 *
 * WO-O4O-PRODUCT-LIST-DESCRIPTION-QR-ACTIONS-V1
 *
 * mount: /api/v1/admin/o4o-product-db/masters
 *   GET /description-qr-summary?ids=uuid,uuid,...  — master 여러 건의 ko/zh 설명서 상태 배치 조회
 *
 * 제품 리스트/상세에서 "설명서(KO/ZH) 있음/없음/검토필요" badge 와 "설명 보기" deep-link 를 위해
 * shared_product_descriptions 를 language 축으로 집계한다. **read-only** — mutation 0, migration 0.
 *
 * 경계/한계 (IR-O4O-PRODUCT-UNIT-PHOTO-TO-DESCRIPTION-QR-FLOW-AUDIT-V2):
 *   - ko/zh 는 SPD(master-scope)의 language 컬럼 기준. 매장 다국어 콘텐츠
 *     (store_multilingual_product_content_*)는 store-scope 이므로 여기 집계 대상 아님(후속 WO).
 *   - QR 은 master↔QR 직접 매핑 테이블이 없다(store-scope, notMapped: qr_direct). 따라서
 *     qr 는 상태 자리만 두고 deferred=true 로 반환한다. 실제 QR 연결/판정은 후속
 *     WO-O4O-PRODUCT-UNIT-MULTILINGUAL-DESCRIPTION-QR-LINK-V1 로 분리한다.
 *   - locale 표준(zh vs zh-CN) 혼재는 읽기 호환만 한다(zh* 접두 모두 zh 버킷). 표준화는 후속 WO.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import logger from '../../../utils/logger.js';

const ADMIN_ROLES = [
  'platform:admin',
  'platform:super_admin',
  'neture:admin',
  'neture:operator',
  'glycopharm:admin',
  'glycopharm:operator',
  'cosmetics:admin',
  'cosmetics:operator',
  'kpa-society:admin',
  'kpa-society:operator',
];

const MAX_IDS = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COUNTABLE_STATUSES = ['canonical', 'needs_review', 'candidate'] as const;
const STATUS_RANK: Record<string, number> = { canonical: 3, needs_review: 2, candidate: 1 };

type LangBucket = 'ko' | 'zh' | 'other';
function bucketOf(language: string | null): LangBucket {
  const l = (language || '').toLowerCase();
  if (l.startsWith('zh')) return 'zh';
  if (l === '' || l.startsWith('ko')) return 'ko'; // SPD 기본값 = ko
  return 'other';
}

interface LangState {
  exists: boolean;
  status: string | null;
  descriptionId: string | null;
}
interface MasterSummary {
  masterId: string;
  descriptions: { ko: LangState; zh: LangState };
  qr: { exists: false; deferred: true };
  needsReview: boolean;
}

function emptyLang(): LangState {
  return { exists: false, status: null, descriptionId: null };
}

export function createProductDescriptionQrSummaryController(dataSource: DataSource): Router {
  const router = Router();

  router.use(authenticate);
  router.use(requireRole(ADMIN_ROLES));

  router.get('/description-qr-summary', async (req: Request, res: Response) => {
    try {
      const raw = String(req.query.ids || '').trim();
      const ids = raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => UUID_RE.test(s));
      const uniqueIds = Array.from(new Set(ids)).slice(0, MAX_IDS);

      if (uniqueIds.length === 0) {
        res.json({ success: true, data: {} });
        return;
      }

      const rows: Array<{
        master_id: string;
        language: string | null;
        status: string;
        id: string;
        updated_at: string;
      }> = await dataSource.query(
        `SELECT master_id, language, status, id, updated_at
           FROM shared_product_descriptions
          WHERE master_id = ANY($1::uuid[])
            AND deleted_at IS NULL
            AND status = ANY($2::varchar[])`,
        [uniqueIds, COUNTABLE_STATUSES as unknown as string[]],
      );

      // master 별 초기화(요청한 모든 id 를 키로 보장)
      const byMaster: Record<string, MasterSummary> = {};
      for (const id of uniqueIds) {
        byMaster[id] = {
          masterId: id,
          descriptions: { ko: emptyLang(), zh: emptyLang() },
          qr: { exists: false, deferred: true },
          needsReview: false,
        };
      }

      for (const r of rows) {
        const bucket = bucketOf(r.language);
        if (bucket === 'other') continue;
        const target = byMaster[r.master_id];
        if (!target) continue;
        const cur = target.descriptions[bucket];
        const better =
          !cur.exists ||
          (STATUS_RANK[r.status] ?? 0) > (STATUS_RANK[cur.status ?? ''] ?? 0);
        if (better) {
          target.descriptions[bucket] = { exists: true, status: r.status, descriptionId: r.id };
        }
      }

      for (const s of Object.values(byMaster)) {
        s.needsReview =
          s.descriptions.ko.status === 'needs_review' || s.descriptions.zh.status === 'needs_review';
      }

      res.json({ success: true, data: byMaster });
    } catch (err) {
      logger.error('[product-description-qr-summary] failed:', err);
      res
        .status(500)
        .json({ success: false, error: '설명서/QR 상태 요약 조회에 실패했습니다', code: 'DESC_QR_SUMMARY_FAILED' });
    }
  });

  return router;
}
