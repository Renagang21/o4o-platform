/**
 * Neture Supplier Offers Test Seed
 * WO-NETURE-TEST-PRODUCT-RESET-AND-RESEED-V1
 * WO-NETURE-DELETE-ALL-TEST-PRODUCTS-AND-RECREATE-SAMPLES-V1
 *
 * 공급자 승인 흐름 검증용 샘플 상품 세트 관리.
 * 공급자: sohae21@naver.com (contact_email 기준 자동 조회)
 * Protected by X-Admin-Secret header (= JWT_SECRET).
 *
 * GET    /api/v1/ops/seed-neture-offers   — 현재 상태 조회 (공급자 + offer 분포)
 * DELETE /api/v1/ops/seed-neture-offers   — f0000000% 샘플 데이터만 삭제
 * POST   /api/v1/ops/seed-neture-offers   — 샘플 6종 생성 (sohae21@naver.com 공급자)
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';

// ── 대상 공급자 이메일 ────────────────────────────────────────────────────────
const TARGET_EMAIL = 'sohae21@naver.com';

// ── 결정적 UUID (샘플 식별용 — f0000000 prefix) ──────────────────────────────
const S = {
  masterA: 'f0000000-aa01-4000-a000-000000000001',
  masterB: 'f0000000-aa01-4000-a000-000000000002',
  masterC: 'f0000000-aa01-4000-a000-000000000003',
  masterD: 'f0000000-aa01-4000-a000-000000000004',
  masterE: 'f0000000-aa01-4000-a000-000000000005',
  masterF: 'f0000000-aa01-4000-a000-000000000006',

  offerA: 'f0000000-bb01-4000-a000-000000000001',
  offerB: 'f0000000-bb01-4000-a000-000000000002',
  offerC: 'f0000000-bb01-4000-a000-000000000003',
  offerD: 'f0000000-bb01-4000-a000-000000000004',
  offerE: 'f0000000-bb01-4000-a000-000000000005',
  offerF: 'f0000000-bb01-4000-a000-000000000006',
};

// ── 인증 ────────────────────────────────────────────────────────────────────
function verify(req: Request, res: Response): boolean {
  const secret = req.headers['x-admin-secret'] as string;
  const jwt = process.env.JWT_SECRET;
  if (secret && jwt && secret === jwt) return true;
  res.status(401).json({ success: false, error: 'Invalid admin secret', code: 'ADMIN_SECRET_REQUIRED' });
  return false;
}

// ── 공급자 조회 헬퍼 ─────────────────────────────────────────────────────────
// name 컬럼은 WO-O4O-NETURE-SUPPLIER-COLUMN-REMOVAL-V1로 삭제됨 → organizations.name 사용
async function findSupplierByEmail(ds: DataSource, email: string) {
  // user.email 기준
  const rows = await ds.query(
    `SELECT ns.id, COALESCE(o.name, ns.slug) AS supplier_name, ns.status
     FROM neture_suppliers ns
     LEFT JOIN organizations o ON o.id = ns.organization_id
     JOIN users u ON u.id = ns.user_id
     WHERE u.email = $1
     LIMIT 1`,
    [email],
  );
  if (rows.length) return { id: rows[0].id, name: rows[0].supplier_name, status: rows[0].status };

  // contact_email 기준 fallback
  const rows2 = await ds.query(
    `SELECT ns.id, COALESCE(o.name, ns.slug) AS supplier_name, ns.status
     FROM neture_suppliers ns
     LEFT JOIN organizations o ON o.id = ns.organization_id
     WHERE ns.contact_email = $1
     LIMIT 1`,
    [email],
  );
  if (rows2.length) return { id: rows2[0].id, name: rows2[0].supplier_name, status: rows2[0].status };

  return null;
}

// ── 라우터 ───────────────────────────────────────────────────────────────────
export function createSeedNetureOffersRouter(ds: DataSource): Router {
  const router = Router();

  // ────────────────────────────────────────────────────────────────────────
  // GET — 현재 상태 조회
  // ────────────────────────────────────────────────────────────────────────
  router.get('/', async (req: Request, res: Response) => {
    if (!verify(req, res)) return;
    try {
      const suppliers = await ds.query(
        `SELECT ns.id, COALESCE(o.name, ns.slug) AS name, ns.status, ns.contact_email
         FROM neture_suppliers ns
         LEFT JOIN organizations o ON o.id = ns.organization_id
         ORDER BY ns.created_at`,
      );

      const offerCounts = await ds.query(`
        SELECT
          ns.id                                                      AS supplier_id,
          COALESCE(o.name, ns.slug)                                  AS supplier_name,
          COUNT(spo.id)::int                                         AS total_offers,
          COUNT(spo.id) FILTER (WHERE spo.service_keys = '{}'
            OR spo.service_keys IS NULL)::int                       AS no_service_keys,
          COUNT(spo.id) FILTER (WHERE 'glycopharm' = ANY(spo.service_keys))::int AS glycopharm,
          COUNT(spo.id) FILTER (WHERE 'kpa-society' = ANY(spo.service_keys))::int AS kpa,
          COUNT(spo.id) FILTER (WHERE spo.is_public = true)::int    AS is_public,
          COUNT(spo.id) FILTER (WHERE spo.id::text LIKE 'f0000000%')::int AS sample_offers
        FROM neture_suppliers ns
        LEFT JOIN organizations o ON o.id = ns.organization_id
        LEFT JOIN supplier_product_offers spo
          ON spo.supplier_id = ns.id AND spo.deleted_at IS NULL
        GROUP BY ns.id, o.name, ns.slug
        ORDER BY supplier_name
      `);

      const approvals = await ds.query(`
        SELECT service_key, approval_status, COUNT(*)::int AS cnt
        FROM offer_service_approvals
        GROUP BY service_key, approval_status
        ORDER BY service_key, approval_status
      `);

      res.json({ success: true, data: { suppliers, offerCounts, approvals, targetEmail: TARGET_EMAIL } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ────────────────────────────────────────────────────────────────────────
  // DELETE — f0000000% 샘플 데이터만 삭제
  // ────────────────────────────────────────────────────────────────────────
  router.delete('/', async (req: Request, res: Response) => {
    if (!verify(req, res)) return;
    try {
      // approval → listings → offers → masters 순서로 삭제 (FK 순서)
      const aprDel = await ds.query(
        `DELETE FROM offer_service_approvals WHERE offer_id::text LIKE 'f0000000%'`,
      );
      const listDel = await ds.query(
        `DELETE FROM organization_product_listings WHERE offer_id::text LIKE 'f0000000%'`,
      );
      const offDel = await ds.query(
        `DELETE FROM supplier_product_offers WHERE id::text LIKE 'f0000000%'`,
      );
      const mstDel = await ds.query(
        `DELETE FROM product_masters WHERE id::text LIKE 'f0000000%'`,
      );

      res.json({
        success: true,
        data: {
          deleted: {
            approvals: aprDel.rowCount ?? 0,
            listings:  listDel.rowCount ?? 0,
            offers:    offDel.rowCount ?? 0,
            masters:   mstDel.rowCount ?? 0,
          },
          note: 'f0000000% UUID 샘플 데이터만 삭제. 실 운영 데이터 미영향.',
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ────────────────────────────────────────────────────────────────────────
  // POST — 샘플 6종 생성 (sohae21@naver.com 공급자)
  // ────────────────────────────────────────────────────────────────────────
  router.post('/', async (req: Request, res: Response) => {
    if (!verify(req, res)) return;
    try {
      const supplier = await findSupplierByEmail(ds, TARGET_EMAIL);
      if (!supplier) {
        return res.status(404).json({
          success: false,
          error: `Supplier not found for email: ${TARGET_EMAIL}`,
        });
      }
      const { id: supplierId, name: supplierName } = supplier;

      // ── product_masters ──────────────────────────────────────────────
      const MASTERS = [
        { id: S.masterA, barcode: 'TST-PUB-A-0001', name: '[TEST] 전체공개 전용 A',        mfds: 'TST-MFDS-A-0001' },
        { id: S.masterB, barcode: 'TST-PUB-B-0002', name: '[TEST] 전체공개 전용 B',        mfds: 'TST-MFDS-B-0002' },
        { id: S.masterC, barcode: 'TST-GLC-A-0003', name: '[TEST] 승인요청 GlycoPharm A',  mfds: 'TST-MFDS-C-0003' },
        { id: S.masterD, barcode: 'TST-GLC-B-0004', name: '[TEST] 승인요청 GlycoPharm B',  mfds: 'TST-MFDS-D-0004' },
        { id: S.masterE, barcode: 'TST-KPA-A-0005', name: '[TEST] 승인요청 KPA A',         mfds: 'TST-MFDS-E-0005' },
        { id: S.masterF, barcode: 'TST-MLT-A-0006', name: '[TEST] 다중서비스 A',            mfds: 'TST-MFDS-F-0006' },
      ];

      for (const m of MASTERS) {
        await ds.query(`
          INSERT INTO product_masters
            (id, barcode, regulatory_name, marketing_name, manufacturer_name, mfds_product_id, is_mfds_verified)
          VALUES ($1,$2,$3,$3,'테스트제조사',$4,false)
          ON CONFLICT (id) DO UPDATE SET marketing_name = EXCLUDED.marketing_name, updated_at = NOW()
        `, [m.id, m.barcode, m.name, m.mfds]);
      }

      // ── supplier_product_offers ──────────────────────────────────────
      const sfx = supplierId.slice(0, 8);
      const OFFERS = [
        {
          id: S.offerA, master_id: S.masterA,
          is_public: true,  dist: 'PUBLIC',   keys: '{}',
          slug: `tst-pub-a-${sfx}-001`, price: 10000,
          purpose: '전체공개 전용 — 승인요청 불가 (NO_ELIGIBLE_SERVICE_KEYS)',
        },
        {
          id: S.offerB, master_id: S.masterB,
          is_public: true,  dist: 'PUBLIC',   keys: '{}',
          slug: `tst-pub-b-${sfx}-002`, price: 10000,
          purpose: '전체공개 전용 — 승인요청 불가 (NO_ELIGIBLE_SERVICE_KEYS)',
        },
        {
          id: S.offerC, master_id: S.masterC,
          is_public: false, dist: 'SERVICE',  keys: '{glycopharm}',
          slug: `tst-glc-a-${sfx}-003`, price: 20000,
          purpose: 'glycopharm 승인요청 가능',
        },
        {
          id: S.offerD, master_id: S.masterD,
          is_public: false, dist: 'SERVICE',  keys: '{glycopharm}',
          slug: `tst-glc-b-${sfx}-004`, price: 20000,
          purpose: 'glycopharm 승인요청 가능',
        },
        {
          id: S.offerE, master_id: S.masterE,
          is_public: false, dist: 'SERVICE',  keys: '{"kpa-society"}',
          slug: `tst-kpa-a-${sfx}-005`, price: 15000,
          purpose: 'kpa-society 승인요청 가능',
        },
        {
          id: S.offerF, master_id: S.masterF,
          is_public: false, dist: 'SERVICE',  keys: '{glycopharm,"kpa-society"}',
          slug: `tst-mlt-a-${sfx}-006`, price: 30000,
          purpose: '다중서비스 glycopharm+kpa-society 승인요청 가능',
        },
      ];

      for (const o of OFFERS) {
        await ds.query(`
          INSERT INTO supplier_product_offers
            (id, master_id, supplier_id, is_public, distribution_type, service_keys,
             price_general, is_active, slug, approval_status, stock_quantity)
          VALUES ($1,$2,$3,$4,$5,$6::TEXT[],$7,false,$8,'APPROVED',50)
          ON CONFLICT (id) DO UPDATE SET
            service_keys      = EXCLUDED.service_keys,
            is_public         = EXCLUDED.is_public,
            distribution_type = EXCLUDED.distribution_type,
            updated_at        = NOW()
        `, [o.id, o.master_id, supplierId, o.is_public, o.dist, o.keys, o.price, o.slug]);
      }

      // ── 결과 ─────────────────────────────────────────────────────────
      const created = await ds.query(`
        SELECT spo.id, pm.marketing_name AS name,
               spo.service_keys, spo.is_public, spo.distribution_type
        FROM supplier_product_offers spo
        JOIN product_masters pm ON pm.id = spo.master_id
        WHERE spo.id::text LIKE 'f0000000%'
        ORDER BY pm.marketing_name
      `);

      res.json({
        success: true,
        data: {
          supplierName,
          supplierId,
          createdOffers: created,
          purposeMap: OFFERS.map((o) => ({ id: o.id, keys: o.keys, purpose: o.purpose })),
          nextSteps: [
            '1. /supplier/products → 샘플 6개만 보이는지 확인',
            '2. [TEST] 전체공개 A/B 선택 → 승인요청 → skipped=2 토스트 확인',
            '3. [TEST] GlycoPharm A/B 선택 → 승인요청 → submitted=2 / pending 생성 확인',
            '4. 운영자 화면에서 glycopharm pending 행 확인',
          ],
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
