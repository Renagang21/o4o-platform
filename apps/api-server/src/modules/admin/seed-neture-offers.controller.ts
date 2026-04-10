/**
 * Neture Supplier Offers Test Seed — WO-NETURE-TEST-PRODUCT-RESET-AND-RESEED-V1
 *
 * 공급자 승인 흐름 검증용 표준 테스트 상품 세트 생성/정리.
 * Protected by X-Admin-Secret header (= JWT_SECRET).
 *
 * GET    /api/v1/ops/seed-neture-offers          — 현재 상태 조회 (삭제 전 확인용)
 * DELETE /api/v1/ops/seed-neture-offers          — 테스트 데이터 정리
 * POST   /api/v1/ops/seed-neture-offers          — 표준 테스트 세트 생성
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';

// ── 결정적 UUID (테스트 데이터 식별용) ──────────────────────────────────────

const T = {
  // product_masters (테스트용 — INTB1M9P 접두어 사용)
  masterA: 'f0000000-aa01-4000-a000-000000000001', // [TEST] 전체공개 A
  masterB: 'f0000000-aa01-4000-a000-000000000002', // [TEST] 전체공개 B
  masterC: 'f0000000-aa01-4000-a000-000000000003', // [TEST] GlycoPharm 승인요청 A
  masterD: 'f0000000-aa01-4000-a000-000000000004', // [TEST] GlycoPharm 승인요청 B
  masterE: 'f0000000-aa01-4000-a000-000000000005', // [TEST] KPA 승인요청 A
  masterF: 'f0000000-aa01-4000-a000-000000000006', // [TEST] 다중서비스 A
  masterG: 'f0000000-aa01-4000-a000-000000000007', // [TEST] 승인완료 A
  masterH: 'f0000000-aa01-4000-a000-000000000008', // [TEST] 반려 A

  // supplier_product_offers
  offerA: 'f0000000-bb01-4000-a000-000000000001',
  offerB: 'f0000000-bb01-4000-a000-000000000002',
  offerC: 'f0000000-bb01-4000-a000-000000000003',
  offerD: 'f0000000-bb01-4000-a000-000000000004',
  offerE: 'f0000000-bb01-4000-a000-000000000005',
  offerF: 'f0000000-bb01-4000-a000-000000000006',
  offerG: 'f0000000-bb01-4000-a000-000000000007',
  offerH: 'f0000000-bb01-4000-a000-000000000008',

  // offer_service_approvals
  approvalG1: 'f0000000-cc01-4000-a000-000000000001', // offerG + glycopharm → approved
  approvalH1: 'f0000000-cc01-4000-a000-000000000002', // offerH + glycopharm → rejected
};

// ── 인증 ────────────────────────────────────────────────────────────────────

function verify(req: Request, res: Response): boolean {
  const secret = req.headers['x-admin-secret'] as string;
  const jwt = process.env.JWT_SECRET;
  if (secret && jwt && secret === jwt) return true;
  res.status(401).json({ success: false, error: 'Invalid admin secret', code: 'ADMIN_SECRET_REQUIRED' });
  return false;
}

// ── 라우터 팩토리 ─────────────────────────────────────────────────────────────

export function createSeedNetureOffersRouter(ds: DataSource): Router {
  const router = Router();

  // ─────────────────────────────────────────────────────────────────────────
  // GET — 현재 상태 조회 (삭제 전 확인용)
  // ─────────────────────────────────────────────────────────────────────────

  router.get('/', async (req: Request, res: Response) => {
    if (!verify(req, res)) return;
    try {
      const [suppliers] = await Promise.all([
        ds.query(`SELECT id, name, status, contact_email FROM neture_suppliers ORDER BY created_at`),
      ]);

      const offerStats = await ds.query(`
        SELECT
          ns.name AS supplier_name,
          COUNT(spo.id)::int AS total_offers,
          COUNT(CASE WHEN spo.service_keys = '{}' OR spo.service_keys IS NULL THEN 1 END)::int AS no_service_keys,
          COUNT(CASE WHEN 'glycopharm' = ANY(spo.service_keys) THEN 1 END)::int AS has_glycopharm,
          COUNT(CASE WHEN 'kpa-society' = ANY(spo.service_keys) THEN 1 END)::int AS has_kpa,
          COUNT(CASE WHEN 'k-cosmetics' = ANY(spo.service_keys) THEN 1 END)::int AS has_kcosmetics,
          COUNT(CASE WHEN spo.is_public = true THEN 1 END)::int AS is_public_count,
          COUNT(CASE WHEN spo.id LIKE 'f0000000%' THEN 1 END)::int AS test_seed_offers
        FROM neture_suppliers ns
        LEFT JOIN supplier_product_offers spo ON spo.supplier_id = ns.id AND spo.deleted_at IS NULL
        GROUP BY ns.id, ns.name
        ORDER BY ns.name
      `);

      const approvalStats = await ds.query(`
        SELECT
          osa.service_key,
          osa.approval_status,
          COUNT(*)::int AS cnt
        FROM offer_service_approvals osa
        GROUP BY osa.service_key, osa.approval_status
        ORDER BY osa.service_key, osa.approval_status
      `);

      const testOffers = await ds.query(`
        SELECT spo.id, pm.marketing_name AS name, spo.service_keys, spo.is_public, spo.distribution_type
        FROM supplier_product_offers spo
        JOIN product_masters pm ON pm.id = spo.master_id
        WHERE spo.id LIKE 'f0000000%'
        ORDER BY pm.marketing_name
      `);

      res.json({
        success: true,
        data: {
          suppliers,
          offerStats,
          approvalStats,
          testOffers,
          note: 'testOffers = UUID prefix f0000000%로 식별된 이번 시드 테스트 데이터',
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE — 테스트 시드 데이터 정리
  // 대상: UUID 접두어 f0000000% 로 식별되는 offer/master/approval만 삭제
  // ─────────────────────────────────────────────────────────────────────────

  router.delete('/', async (req: Request, res: Response) => {
    if (!verify(req, res)) return;
    try {
      // offer_service_approvals → supplier_product_offers → product_masters 순서로 삭제
      const [approvalDel] = await Promise.all([
        ds.query(`DELETE FROM offer_service_approvals WHERE offer_id LIKE 'f0000000%'`),
      ]);
      const offerDel = await ds.query(`DELETE FROM supplier_product_offers WHERE id LIKE 'f0000000%'`);
      const masterDel = await ds.query(`DELETE FROM product_masters WHERE id LIKE 'f0000000%'`);

      res.json({
        success: true,
        data: {
          deletedApprovals: approvalDel.rowCount ?? approvalDel,
          deletedOffers: offerDel.rowCount ?? offerDel,
          deletedMasters: masterDel.rowCount ?? masterDel,
          note: 'UUID prefix f0000000% 테스트 데이터만 삭제됨. 실 운영 데이터 미영향.',
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST — 표준 테스트 세트 생성
  // supplierId 쿼리 파라미터 필수: ?supplierId=<uuid>
  // ─────────────────────────────────────────────────────────────────────────

  router.post('/', async (req: Request, res: Response) => {
    if (!verify(req, res)) return;

    const supplierId = req.query.supplierId as string;
    if (!supplierId) {
      return res.status(400).json({
        success: false,
        error: 'supplierId query parameter required',
        hint: 'GET /api/v1/ops/seed-neture-offers 로 현재 공급자 목록을 확인하세요',
      });
    }

    // 공급자 존재 확인
    const supplierRows = await ds.query(
      `SELECT id, name FROM neture_suppliers WHERE id = $1 AND status = 'ACTIVE'`,
      [supplierId],
    );
    if (!supplierRows.length) {
      return res.status(404).json({ success: false, error: 'Active supplier not found' });
    }
    const supplierName = supplierRows[0].name;

    try {
      // ── product_masters 생성 ───────────────────────────────────────────

      const MASTERS = [
        { id: T.masterA, barcode: 'TST-PUB-A-0001', marketing_name: '[TEST] 전체공개 전용 A', regulatory_name: '[TEST] 전체공개 전용 A', manufacturer_name: '테스트제조사', mfds_product_id: 'TST-MFDS-A-0001' },
        { id: T.masterB, barcode: 'TST-PUB-B-0002', marketing_name: '[TEST] 전체공개 전용 B', regulatory_name: '[TEST] 전체공개 전용 B', manufacturer_name: '테스트제조사', mfds_product_id: 'TST-MFDS-B-0002' },
        { id: T.masterC, barcode: 'TST-GLC-A-0003', marketing_name: '[TEST] GlycoPharm 승인요청 A', regulatory_name: '[TEST] GlycoPharm 승인요청 A', manufacturer_name: '테스트제조사', mfds_product_id: 'TST-MFDS-C-0003' },
        { id: T.masterD, barcode: 'TST-GLC-B-0004', marketing_name: '[TEST] GlycoPharm 승인요청 B', regulatory_name: '[TEST] GlycoPharm 승인요청 B', manufacturer_name: '테스트제조사', mfds_product_id: 'TST-MFDS-D-0004' },
        { id: T.masterE, barcode: 'TST-KPA-A-0005', marketing_name: '[TEST] KPA 승인요청 A', regulatory_name: '[TEST] KPA 승인요청 A', manufacturer_name: '테스트제조사', mfds_product_id: 'TST-MFDS-E-0005' },
        { id: T.masterF, barcode: 'TST-MLT-A-0006', marketing_name: '[TEST] 다중서비스 A', regulatory_name: '[TEST] 다중서비스 A', manufacturer_name: '테스트제조사', mfds_product_id: 'TST-MFDS-F-0006' },
        { id: T.masterG, barcode: 'TST-APR-A-0007', marketing_name: '[TEST] 승인완료 A', regulatory_name: '[TEST] 승인완료 A', manufacturer_name: '테스트제조사', mfds_product_id: 'TST-MFDS-G-0007' },
        { id: T.masterH, barcode: 'TST-REJ-A-0008', marketing_name: '[TEST] 반려 A', regulatory_name: '[TEST] 반려 A', manufacturer_name: '테스트제조사', mfds_product_id: 'TST-MFDS-H-0008' },
      ];

      for (const m of MASTERS) {
        await ds.query(`
          INSERT INTO product_masters (id, barcode, regulatory_name, marketing_name, manufacturer_name, mfds_product_id, is_mfds_verified)
          VALUES ($1,$2,$3,$4,$5,$6,false)
          ON CONFLICT (id) DO UPDATE SET marketing_name=EXCLUDED.marketing_name, updated_at=NOW()
        `, [m.id, m.barcode, m.regulatory_name, m.marketing_name, m.manufacturer_name, m.mfds_product_id]);
      }

      // ── supplier_product_offers 생성 ──────────────────────────────────

      /**
       * 테스트 상품 정의 (WO §5 기준):
       * A,B: 전체공개, service_keys=[], 승인요청 불가
       * C,D: glycopharm only, 승인요청 가능
       * E:   kpa-society only, 승인요청 가능
       * F:   glycopharm+kpa-society, 승인요청 가능
       * G:   glycopharm, approved 상태
       * H:   glycopharm, rejected 상태
       */
      const OFFERS = [
        {
          id: T.offerA, master_id: T.masterA,
          is_public: true, distribution_type: 'PUBLIC', service_keys: '{}',
          price_general: 10000, is_active: false,
          slug: `tst-pub-a-${supplierId.slice(0, 8)}-001`,
          purpose: '전체공개 전용 — 승인요청 불가',
        },
        {
          id: T.offerB, master_id: T.masterB,
          is_public: true, distribution_type: 'PUBLIC', service_keys: '{}',
          price_general: 10000, is_active: false,
          slug: `tst-pub-b-${supplierId.slice(0, 8)}-002`,
          purpose: '전체공개 전용 — 승인요청 불가',
        },
        {
          id: T.offerC, master_id: T.masterC,
          is_public: false, distribution_type: 'SERVICE', service_keys: '{glycopharm}',
          price_general: 20000, is_active: false,
          slug: `tst-glc-a-${supplierId.slice(0, 8)}-003`,
          purpose: 'glycopharm 승인요청 가능',
        },
        {
          id: T.offerD, master_id: T.masterD,
          is_public: false, distribution_type: 'SERVICE', service_keys: '{glycopharm}',
          price_general: 20000, is_active: false,
          slug: `tst-glc-b-${supplierId.slice(0, 8)}-004`,
          purpose: 'glycopharm 승인요청 가능',
        },
        {
          id: T.offerE, master_id: T.masterE,
          is_public: false, distribution_type: 'SERVICE', service_keys: '{kpa-society}',
          price_general: 15000, is_active: false,
          slug: `tst-kpa-a-${supplierId.slice(0, 8)}-005`,
          purpose: 'kpa-society 승인요청 가능',
        },
        {
          id: T.offerF, master_id: T.masterF,
          is_public: false, distribution_type: 'SERVICE', service_keys: '{glycopharm,"kpa-society"}',
          price_general: 30000, is_active: false,
          slug: `tst-mlt-a-${supplierId.slice(0, 8)}-006`,
          purpose: '다중서비스 glycopharm+kpa-society',
        },
        {
          id: T.offerG, master_id: T.masterG,
          is_public: false, distribution_type: 'SERVICE', service_keys: '{glycopharm}',
          price_general: 25000, is_active: true,
          slug: `tst-apr-a-${supplierId.slice(0, 8)}-007`,
          purpose: 'glycopharm 승인완료',
        },
        {
          id: T.offerH, master_id: T.masterH,
          is_public: false, distribution_type: 'SERVICE', service_keys: '{glycopharm}',
          price_general: 25000, is_active: false,
          slug: `tst-rej-a-${supplierId.slice(0, 8)}-008`,
          purpose: 'glycopharm 반려',
        },
      ];

      for (const o of OFFERS) {
        await ds.query(`
          INSERT INTO supplier_product_offers
            (id, master_id, supplier_id, is_public, distribution_type, service_keys,
             price_general, is_active, slug, approval_status, stock_quantity)
          VALUES ($1,$2,$3,$4,$5,$6::TEXT[],$7,$8,$9,'APPROVED',100)
          ON CONFLICT (id) DO UPDATE SET
            service_keys=EXCLUDED.service_keys,
            is_public=EXCLUDED.is_public,
            distribution_type=EXCLUDED.distribution_type,
            is_active=EXCLUDED.is_active,
            updated_at=NOW()
        `, [o.id, o.master_id, supplierId, o.is_public, o.distribution_type, o.service_keys, o.price_general, o.is_active, o.slug]);
      }

      // ── offer_service_approvals 생성 ──────────────────────────────────

      // G: glycopharm approved
      await ds.query(`
        INSERT INTO offer_service_approvals (id, offer_id, service_key, approval_status, decided_at)
        VALUES ($1,$2,'glycopharm','approved',NOW())
        ON CONFLICT (offer_id, service_key) DO UPDATE SET approval_status='approved', updated_at=NOW()
      `, [T.approvalG1, T.offerG]);

      // H: glycopharm rejected
      await ds.query(`
        INSERT INTO offer_service_approvals (id, offer_id, service_key, approval_status, reason, decided_at)
        VALUES ($1,$2,'glycopharm','rejected','테스트 반려 사유',NOW())
        ON CONFLICT (offer_id, service_key) DO UPDATE SET approval_status='rejected', reason='테스트 반려 사유', updated_at=NOW()
      `, [T.approvalH1, T.offerH]);

      // ── 결과 조회 ─────────────────────────────────────────────────────

      const created = await ds.query(`
        SELECT spo.id, pm.marketing_name AS name, spo.service_keys, spo.is_public, spo.distribution_type,
               COALESCE(
                 json_agg(json_build_object('service_key', osa.service_key, 'status', osa.approval_status))
                 FILTER (WHERE osa.id IS NOT NULL), '[]'
               ) AS approvals
        FROM supplier_product_offers spo
        JOIN product_masters pm ON pm.id = spo.master_id
        LEFT JOIN offer_service_approvals osa ON osa.offer_id = spo.id
        WHERE spo.id LIKE 'f0000000%'
        GROUP BY spo.id, pm.marketing_name, spo.service_keys, spo.is_public, spo.distribution_type
        ORDER BY pm.marketing_name
      `);

      res.json({
        success: true,
        data: {
          supplierName,
          supplierId,
          createdOffers: created,
          summary: {
            total: created.length,
            noServiceKeys: created.filter((o: any) => !o.service_keys?.length).length,
            withGlycopharm: created.filter((o: any) => o.service_keys?.includes('glycopharm')).length,
            withKpa: created.filter((o: any) => o.service_keys?.includes('kpa-society')).length,
            withApprovalRows: created.filter((o: any) => o.approvals?.length > 0).length,
          },
          nextSteps: [
            '1. /supplier/products 화면에서 승인요청 전 탭 확인 (전체공개 A,B 포함 여부)',
            '2. [TEST] GlycoPharm 승인요청 A,B 선택 → 승인요청 → submitted=2 확인',
            '3. [TEST] 전체공개 A,B 선택 → 승인요청 → skipped=2(NO_ELIGIBLE_SERVICE_KEYS) 확인',
            '4. 운영자 화면에서 pending 행 확인',
            '5. [TEST] 승인완료 A 상태 확인 (approved)',
            '6. [TEST] 반려 A 상태 확인 (rejected)',
          ],
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
