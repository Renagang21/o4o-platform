/**
 * Neture Supplier Offers Test Seed
 * WO-NETURE-TEST-PRODUCT-RESET-AND-RESEED-V1
 * WO-NETURE-DELETE-ALL-TEST-PRODUCTS-AND-RECREATE-SAMPLES-V1
 *
 * 공급자 승인 흐름 검증용 테스트 상품 전면 리셋 + 샘플 세트 재생성.
 * Protected by X-Admin-Secret header (= JWT_SECRET).
 *
 * GET    /api/v1/ops/seed-neture-offers                       — 현재 상태 조회
 * DELETE /api/v1/ops/seed-neture-offers?supplierId=<uuid>     — 공급자 전체 offer 삭제
 * POST   /api/v1/ops/seed-neture-offers?supplierId=<uuid>     — 샘플 6종 생성
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';

// ── 결정적 UUID (샘플 식별용) ────────────────────────────────────────────────

const S = {
  masterA: 'f0000000-aa01-4000-a000-000000000001', // 전체공개 A
  masterB: 'f0000000-aa01-4000-a000-000000000002', // 전체공개 B
  masterC: 'f0000000-aa01-4000-a000-000000000003', // GlycoPharm A
  masterD: 'f0000000-aa01-4000-a000-000000000004', // GlycoPharm B
  masterE: 'f0000000-aa01-4000-a000-000000000005', // KPA A
  masterF: 'f0000000-aa01-4000-a000-000000000006', // 다중서비스 A

  offerA:  'f0000000-bb01-4000-a000-000000000001',
  offerB:  'f0000000-bb01-4000-a000-000000000002',
  offerC:  'f0000000-bb01-4000-a000-000000000003',
  offerD:  'f0000000-bb01-4000-a000-000000000004',
  offerE:  'f0000000-bb01-4000-a000-000000000005',
  offerF:  'f0000000-bb01-4000-a000-000000000006',
};

// ── 인증 ────────────────────────────────────────────────────────────────────

function verify(req: Request, res: Response): boolean {
  const secret = req.headers['x-admin-secret'] as string;
  const jwt = process.env.JWT_SECRET;
  if (secret && jwt && secret === jwt) return true;
  res.status(401).json({ success: false, error: 'Invalid admin secret', code: 'ADMIN_SECRET_REQUIRED' });
  return false;
}

// ── 라우터 ───────────────────────────────────────────────────────────────────

export function createSeedNetureOffersRouter(ds: DataSource): Router {
  const router = Router();

  // ────────────────────────────────────────────────────────────────────────
  // GET — 현재 상태 조회 (공급자 목록 + offer 분포)
  // ────────────────────────────────────────────────────────────────────────

  router.get('/', async (req: Request, res: Response) => {
    if (!verify(req, res)) return;
    try {
      const suppliers = await ds.query(
        `SELECT id, name, status, contact_email FROM neture_suppliers ORDER BY created_at`,
      );

      const offerStats = await ds.query(`
        SELECT
          ns.id AS supplier_id,
          ns.name AS supplier_name,
          COUNT(spo.id)::int                                                            AS total_offers,
          COUNT(CASE WHEN spo.service_keys = '{}' OR spo.service_keys IS NULL THEN 1 END)::int AS no_service_keys,
          COUNT(CASE WHEN 'glycopharm'  = ANY(spo.service_keys) THEN 1 END)::int       AS has_glycopharm,
          COUNT(CASE WHEN 'kpa-society' = ANY(spo.service_keys) THEN 1 END)::int       AS has_kpa,
          COUNT(CASE WHEN spo.is_public = true THEN 1 END)::int                        AS is_public_count,
          COUNT(CASE WHEN spo.id LIKE 'f0000000%' THEN 1 END)::int                     AS sample_seed_offers
        FROM neture_suppliers ns
        LEFT JOIN supplier_product_offers spo ON spo.supplier_id = ns.id AND spo.deleted_at IS NULL
        GROUP BY ns.id, ns.name
        ORDER BY ns.name
      `);

      const approvalStats = await ds.query(`
        SELECT service_key, approval_status, COUNT(*)::int AS cnt
        FROM offer_service_approvals
        GROUP BY service_key, approval_status
        ORDER BY service_key, approval_status
      `);

      res.json({ success: true, data: { suppliers, offerStats, approvalStats } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ────────────────────────────────────────────────────────────────────────
  // DELETE — 공급자의 모든 offer + 연결 approval 삭제
  // ?supplierId=<uuid> 필수
  // ────────────────────────────────────────────────────────────────────────

  router.delete('/', async (req: Request, res: Response) => {
    if (!verify(req, res)) return;

    const supplierId = req.query.supplierId as string;
    if (!supplierId) {
      return res.status(400).json({
        success: false,
        error: 'supplierId query parameter required',
        hint: 'GET /api/v1/ops/seed-neture-offers 로 공급자 목록을 먼저 확인하세요',
      });
    }

    try {
      // 공급자 확인
      const rows = await ds.query(
        `SELECT id, name FROM neture_suppliers WHERE id = $1`,
        [supplierId],
      );
      if (!rows.length) {
        return res.status(404).json({ success: false, error: 'Supplier not found' });
      }
      const supplierName = rows[0].name;

      // 삭제 전 카운트
      const [offerCountRows] = await ds.query(
        `SELECT COUNT(*)::int AS cnt FROM supplier_product_offers WHERE supplier_id = $1 AND deleted_at IS NULL`,
        [supplierId],
      );
      const offerCount = offerCountRows?.cnt ?? 0;

      // 연결된 offer IDs
      const offerIds: Array<{ id: string }> = await ds.query(
        `SELECT id FROM supplier_product_offers WHERE supplier_id = $1`,
        [supplierId],
      );
      const ids = offerIds.map((r) => r.id);

      let deletedApprovals = 0;
      let deletedListings = 0;
      if (ids.length > 0) {
        // offer_service_approvals 삭제
        const aprDel = await ds.query(
          `DELETE FROM offer_service_approvals WHERE offer_id = ANY($1)`,
          [ids],
        );
        deletedApprovals = aprDel.rowCount ?? 0;

        // organization_product_listings의 offer 참조 정리 (FK 보호)
        const listDel = await ds.query(
          `DELETE FROM organization_product_listings WHERE offer_id = ANY($1)`,
          [ids],
        );
        deletedListings = listDel.rowCount ?? 0;
      }

      // supplier_product_offers 삭제
      const offerDel = await ds.query(
        `DELETE FROM supplier_product_offers WHERE supplier_id = $1`,
        [supplierId],
      );
      const deletedOffers = offerDel.rowCount ?? 0;

      // f0000000% product_masters 삭제 (샘플 전용 master)
      const masterDel = await ds.query(
        `DELETE FROM product_masters WHERE id LIKE 'f0000000%'`,
      );
      const deletedMasters = masterDel.rowCount ?? 0;

      res.json({
        success: true,
        data: {
          supplierName,
          supplierId,
          before: { offers: offerCount },
          deleted: {
            approvals: deletedApprovals,
            listings: deletedListings,
            offers: deletedOffers,
            sampleMasters: deletedMasters,
          },
          note: `공급자 "${supplierName}"의 모든 offer 및 관련 approval/listing 삭제 완료.`,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ────────────────────────────────────────────────────────────────────────
  // POST — 샘플 6종 생성
  // ?supplierId=<uuid> 필수
  // ────────────────────────────────────────────────────────────────────────

  router.post('/', async (req: Request, res: Response) => {
    if (!verify(req, res)) return;

    const supplierId = req.query.supplierId as string;
    if (!supplierId) {
      return res.status(400).json({
        success: false,
        error: 'supplierId query parameter required',
        hint: 'GET /api/v1/ops/seed-neture-offers 로 공급자 목록을 먼저 확인하세요',
      });
    }

    const supplierRows = await ds.query(
      `SELECT id, name FROM neture_suppliers WHERE id = $1 AND status = 'ACTIVE'`,
      [supplierId],
    );
    if (!supplierRows.length) {
      return res.status(404).json({ success: false, error: 'Active supplier not found' });
    }
    const supplierName = supplierRows[0].name;

    try {
      // ── product_masters 생성 (ON CONFLICT UPDATE) ─────────────────────

      const MASTERS = [
        { id: S.masterA, barcode: 'TST-PUB-A-0001', name: '[TEST] 전체공개 전용 A',       mfds: 'TST-MFDS-A-0001' },
        { id: S.masterB, barcode: 'TST-PUB-B-0002', name: '[TEST] 전체공개 전용 B',       mfds: 'TST-MFDS-B-0002' },
        { id: S.masterC, barcode: 'TST-GLC-A-0003', name: '[TEST] 승인요청 GlycoPharm A', mfds: 'TST-MFDS-C-0003' },
        { id: S.masterD, barcode: 'TST-GLC-B-0004', name: '[TEST] 승인요청 GlycoPharm B', mfds: 'TST-MFDS-D-0004' },
        { id: S.masterE, barcode: 'TST-KPA-A-0005', name: '[TEST] 승인요청 KPA A',        mfds: 'TST-MFDS-E-0005' },
        { id: S.masterF, barcode: 'TST-MLT-A-0006', name: '[TEST] 다중서비스 A',           mfds: 'TST-MFDS-F-0006' },
      ];

      for (const m of MASTERS) {
        await ds.query(`
          INSERT INTO product_masters
            (id, barcode, regulatory_name, marketing_name, manufacturer_name, mfds_product_id, is_mfds_verified)
          VALUES ($1,$2,$3,$3,'테스트제조사',$4,false)
          ON CONFLICT (id) DO UPDATE SET marketing_name=EXCLUDED.marketing_name, updated_at=NOW()
        `, [m.id, m.barcode, m.name, m.mfds]);
      }

      // ── supplier_product_offers 생성 ──────────────────────────────────

      const sfx = supplierId.slice(0, 8);
      const OFFERS = [
        // A — 전체공개, service_keys=[], 승인요청 불가
        {
          id: S.offerA, master_id: S.masterA,
          is_public: true,  distribution_type: 'PUBLIC',   service_keys: '{}',
          slug: `tst-pub-a-${sfx}-001`, price: 10000, active: false,
          purpose: '전체공개 전용 — 승인요청 불가 (NO_ELIGIBLE_SERVICE_KEYS)',
        },
        // B — 전체공개, service_keys=[], 승인요청 불가
        {
          id: S.offerB, master_id: S.masterB,
          is_public: true,  distribution_type: 'PUBLIC',   service_keys: '{}',
          slug: `tst-pub-b-${sfx}-002`, price: 10000, active: false,
          purpose: '전체공개 전용 — 승인요청 불가 (NO_ELIGIBLE_SERVICE_KEYS)',
        },
        // C — glycopharm, 승인요청 가능
        {
          id: S.offerC, master_id: S.masterC,
          is_public: false, distribution_type: 'SERVICE',  service_keys: '{glycopharm}',
          slug: `tst-glc-a-${sfx}-003`, price: 20000, active: false,
          purpose: 'glycopharm 승인요청 가능',
        },
        // D — glycopharm, 승인요청 가능
        {
          id: S.offerD, master_id: S.masterD,
          is_public: false, distribution_type: 'SERVICE',  service_keys: '{glycopharm}',
          slug: `tst-glc-b-${sfx}-004`, price: 20000, active: false,
          purpose: 'glycopharm 승인요청 가능',
        },
        // E — kpa-society, 승인요청 가능
        {
          id: S.offerE, master_id: S.masterE,
          is_public: false, distribution_type: 'SERVICE',  service_keys: '{"kpa-society"}',
          slug: `tst-kpa-a-${sfx}-005`, price: 15000, active: false,
          purpose: 'kpa-society 승인요청 가능',
        },
        // F — glycopharm+kpa-society
        {
          id: S.offerF, master_id: S.masterF,
          is_public: false, distribution_type: 'SERVICE',  service_keys: '{glycopharm,"kpa-society"}',
          slug: `tst-mlt-a-${sfx}-006`, price: 30000, active: false,
          purpose: '다중서비스 glycopharm+kpa-society 승인요청 가능',
        },
      ];

      for (const o of OFFERS) {
        await ds.query(`
          INSERT INTO supplier_product_offers
            (id, master_id, supplier_id, is_public, distribution_type, service_keys,
             price_general, is_active, slug, approval_status, stock_quantity)
          VALUES ($1,$2,$3,$4,$5,$6::TEXT[],$7,$8,$9,'APPROVED',50)
          ON CONFLICT (id) DO UPDATE SET
            service_keys=EXCLUDED.service_keys,
            is_public=EXCLUDED.is_public,
            distribution_type=EXCLUDED.distribution_type,
            updated_at=NOW()
        `, [o.id, o.master_id, supplierId, o.is_public, o.distribution_type,
            o.service_keys, o.price, o.active, o.slug]);
      }

      // ── 결과 조회 ─────────────────────────────────────────────────────

      const created = await ds.query(`
        SELECT spo.id, pm.marketing_name AS name,
               spo.service_keys, spo.is_public, spo.distribution_type, spo.is_active
        FROM supplier_product_offers spo
        JOIN product_masters pm ON pm.id = spo.master_id
        WHERE spo.id LIKE 'f0000000%'
        ORDER BY pm.marketing_name
      `);

      const offerWithPurpose = OFFERS.map((o) => ({
        id: o.id,
        slug: o.slug,
        service_keys: o.service_keys,
        is_public: o.is_public,
        purpose: o.purpose,
      }));

      res.json({
        success: true,
        data: {
          supplierName,
          supplierId,
          createdOffers: created,
          purposeMap: offerWithPurpose,
          nextSteps: [
            '1. GET /api/v1/ops/seed-neture-offers 로 현재 상태 재확인',
            '2. 공급자 화면 /supplier/products → 승인요청 전 탭: 샘플 6개만 보이는지 확인',
            '3. [TEST] 전체공개 A/B 선택 → 승인요청 → skipped=2(NO_ELIGIBLE) 토스트 확인',
            '4. [TEST] GlycoPharm A/B 선택 → 승인요청 → submitted=2 / pending 생성 확인',
            '5. 운영자 화면에서 glycopharm pending 행 확인',
          ],
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
