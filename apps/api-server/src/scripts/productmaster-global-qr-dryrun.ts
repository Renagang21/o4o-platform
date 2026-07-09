/**
 * ProductMaster Global QR Seed — Dry-run (DB, read-only, write 0)
 *
 * WO-O4O-PRODUCTMASTER-GLOBAL-QR-SEED-ENVIRONMENT-V1
 *
 * 모든 O4O 표준 상품(ProductMaster)에 O4O 고유 QR 을 부여하기 위한 **사전 현황 산출**.
 * 실제 QR 을 생성하지 않는다. **SELECT 만 수행 — DB write 0**(존재 자체가 dry-run, --apply 개념 없음).
 *
 * 사업 방향(확정): Product → Content → QR → **Product Landing**. QR 은 제품 대표 QR 1개 → 확장 가능한
 *   Product Landing(설명/공급자/운영자/매장/관련 콘텐츠·관련 제품). 설명서는 그중 하나이며, **설명이 없어도
 *   QR/Landing 은 성립**한다. 따라서 QR/Landing 대상 = **모든 ProductMaster**.
 *   - 본 dry-run 은 대상 전체 규모 + "Landing 에 실을 설명 콘텐츠 보유 현황"(콘텐츠 채움 지표) + 기존 QR/식별자
 *     중복·충돌을 산출한다. 저장/URL 방식은 Product Landing 설계 WO 에서 확정(본 dry-run 은 결론을 확정하지 않음).
 *   - store_qr_codes(계층 2·매장 스코프)는 전역 제품 QR 저장소로 부적합 — 근거는 산출값(null org 0 / master 타깃 0)으로 확인.
 *   - 참고(현행 baseline F12): QR=/r/{id}·비저장 규정이 있으나 Resource 단위 관점이라 Product Landing(제품 단위·다콘텐츠)과
 *     다르며 필요 시 개정 대상. (초안의 "QR=Resource / 설명없으면 QR없음 / /r/{id} 최종" 결론은 폐기.)
 *
 * 로컬 실행(읽기 전용): cloud-sql-proxy(127.0.0.1:15432) 기동 후
 *   DB_HOST=127.0.0.1 DB_PORT=15432 DB_USERNAME=o4o_api DB_PASSWORD=... DB_NAME=o4o_platform \
 *   npx tsx src/scripts/productmaster-global-qr-dryrun.ts [--out report.json] [--sample 10]
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as fs from 'fs';

function get(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  if (i >= 0 && i + 1 < argv.length && !argv[i + 1].startsWith('--')) return argv[i + 1];
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.split('=').slice(1).join('=') : undefined;
}

function makeDataSource(): DataSource {
  const DB_HOST = process.env.DB_HOST || '127.0.0.1';
  const DB_PORT = parseInt(process.env.DB_PORT || '15432', 10);
  const DB_USERNAME = process.env.DB_USERNAME;
  const DB_PASSWORD = process.env.DB_PASSWORD;
  const DB_NAME = process.env.DB_NAME || 'o4o_platform';
  if (!DB_USERNAME || !DB_PASSWORD) throw new Error('DB_USERNAME / DB_PASSWORD env 필수.');
  return new DataSource({
    type: 'postgres',
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_NAME,
    entities: [], // raw ds.query 만 사용
    synchronize: false,
    logging: ['error'],
  });
}

const num = (v: unknown): number => Number((v as any) ?? 0);

async function scalar(ds: DataSource, sql: string, params: unknown[] = []): Promise<number> {
  const rows = await ds.query(sql, params);
  return num(rows?.[0]?.count ?? Object.values(rows?.[0] ?? {})[0]);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const out = get(argv, 'out') ?? null;
  const sampleN = Math.min(Math.max(parseInt(get(argv, 'sample') || '10', 10) || 10, 1), 100);

  console.error(`[1/4] DataSource 연결 (host=${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || '15432'})...`);
  const ds = makeDataSource();
  await ds.initialize();

  try {
    console.error('[2/4] ProductMaster / Resource 현황 집계 (SELECT only)...');

    const totalProductMasters = await scalar(ds, `SELECT count(*)::int AS count FROM product_masters`);

    const byRegulatory: { regulatory_type: string | null; drug_category: string | null; count: number }[] =
      await ds.query(
        `SELECT regulatory_type, drug_category, count(*)::int AS count
         FROM product_masters GROUP BY 1,2 ORDER BY 3 DESC`,
      );

    // 계층 1 Resource(현재 = shared_product_descriptions DESCRIPTION) 보유 현황
    const mastersWithCanonicalResource = await scalar(
      ds,
      `SELECT count(DISTINCT master_id)::int AS count FROM shared_product_descriptions WHERE deleted_at IS NULL AND status='canonical'`,
    );
    const mastersWithAnyResource = await scalar(
      ds,
      `SELECT count(DISTINCT master_id)::int AS count FROM shared_product_descriptions WHERE deleted_at IS NULL`,
    );
    const mastersWithoutAnyResource = totalProductMasters - mastersWithAnyResource;

    console.error('[3/4] 기존 QR / identifier 충돌·중복 점검 (SELECT only)...');

    // store_qr_codes (계층 2 · 매장 스코프) 현황
    const storeQrTotal = await scalar(ds, `SELECT count(*)::int AS count FROM store_qr_codes`);
    const storeQrByLandingType: { landing_type: string; count: number; active: number }[] = await ds.query(
      `SELECT landing_type, count(*)::int AS count, count(*) FILTER (WHERE is_active)::int AS active
       FROM store_qr_codes GROUP BY 1 ORDER BY 2 DESC`,
    );
    const storeQrNullOrg = await scalar(
      ds,
      `SELECT count(*)::int AS count FROM store_qr_codes WHERE organization_id IS NULL`,
    );
    // store_qr_codes.slug 은 unique index 이므로 중복은 0 이어야 한다(무결성 확인)
    const duplicateStoreQrSlugs = await scalar(
      ds,
      `SELECT COALESCE(count(*),0)::int AS count FROM (SELECT slug FROM store_qr_codes GROUP BY slug HAVING count(*) > 1) d`,
    );
    // store_qr_codes 가 ProductMaster 를 직접 타깃하는가? (landing_target_id 가 product_masters.id 와 일치)
    const storeQrTargetingMaster = await scalar(
      ds,
      `SELECT count(*)::int AS count FROM store_qr_codes q
       WHERE q.landing_target_id IS NOT NULL
         AND q.landing_target_id ~ '^[0-9a-fA-F-]{36}$'
         AND EXISTS (SELECT 1 FROM product_masters pm WHERE pm.id = q.landing_target_id::uuid)`,
    );

    // ProductIdentifier 에 QR 계열 타입이 이미 있는가? (모델 C 기준선)
    const identifierByType: { identifier_type: string; count: number }[] = await ds.query(
      `SELECT identifier_type, count(*)::int AS count FROM product_identifiers WHERE deleted_at IS NULL GROUP BY 1 ORDER BY 2 DESC`,
    );
    const existingQrIdentifier = await scalar(
      ds,
      `SELECT count(*)::int AS count FROM product_identifiers
       WHERE deleted_at IS NULL AND identifier_type IN ('QR_CODE','O4O_QR','QR')`,
    );

    // 샘플: canonical resource 를 가진 master (모델 D 의 즉시 대상)
    const sampleEligible: any[] = await ds.query(
      `SELECT pm.id AS master_id, pm.name, pm.regulatory_type, pm.drug_category,
         (SELECT s.id FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.deleted_at IS NULL AND s.status='canonical' ORDER BY s.updated_at DESC LIMIT 1) AS canonical_resource_id
       FROM product_masters pm
       WHERE EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.deleted_at IS NULL AND s.status='canonical')
       ORDER BY pm.name ASC LIMIT ${sampleN}`,
    );
    // 샘플: resource 가 없는 master (QR 지향 대상 부재 gap)
    const sampleNoResource: any[] = await ds.query(
      `SELECT pm.id AS master_id, pm.name, pm.regulatory_type, pm.drug_category
       FROM product_masters pm
       WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.deleted_at IS NULL)
       ORDER BY pm.name ASC LIMIT ${sampleN}`,
    );

    console.error('[4/4] 리포트 조립...');

    const report = {
      generatedAtNote: 'timestamp 는 리포트 소비 측에서 스탬프(스크립트는 시간 API 미사용)',
      writeCount: 0,
      direction: {
        axis: 'Product -> Content -> QR -> Product Landing',
        qrTargetsAllMasters: true, // 설명 유무 무관, 모든 ProductMaster 가 QR/Landing 대상
        storageDecision: 'deferred to WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1',
        f12Note: 'F12 현행 baseline(QR=/r/{id}·비저장)은 Resource 단위 관점 — Product Landing 방향에서 개정 가능',
      },
      inventory: {
        totalProductMasters, // = QR/Landing 대상 전부
        byRegulatory,
        mastersWithCanonicalDescription: mastersWithCanonicalResource, // Landing 에 실을 설명 콘텐츠 有
        mastersWithAnyDescription: mastersWithAnyResource,
        mastersWithoutAnyDescription: mastersWithoutAnyResource, // Landing 설명 콘텐츠 아직 없음(대상은 유지)
        descriptionCoveragePct:
          totalProductMasters > 0 ? +((mastersWithCanonicalResource / totalProductMasters) * 100).toFixed(2) : 0,
      },
      existingQr: {
        storeQrTotal, // 계층 2 매장 QR (전역 상품 QR 아님)
        storeQrByLandingType,
        storeQrNullOrg, // 0 이어야 함(항상 매장 소유)
        storeQrTargetingProductMaster: storeQrTargetingMaster, // 0 기대(매장 QR 은 master 를 직접 타깃 안 함)
        duplicateStoreQrSlugs, // 0 기대(unique index)
      },
      identifierModelC: {
        identifierByType,
        existingQrIdentifier, // 0 기대(현재 QR_CODE identifier_type 미사용)
        candidateToCreateIfModelC: totalProductMasters - existingQrIdentifier,
      },
      candidateSummary: {
        // Product Landing 방향: QR/Landing 대상 = 모든 ProductMaster (설명 유무 무관)
        qrLandingCandidates: totalProductMasters,
        // 콘텐츠 채움 지표 (대상 배제 기준 아님)
        landingContentReadiness: {
          withCanonicalDescription: mastersWithCanonicalResource, // 설명 콘텐츠 즉시 有
          withoutAnyDescription: mastersWithoutAnyResource, // 설명 콘텐츠 채움 필요(공급자/매장 콘텐츠 등으로도 구성 가능)
        },
        // 저장 방식(스키마/URL)은 Product Landing 설계 WO 에서 확정 — 본 dry-run 은 결론 미확정
        storageDecision: 'deferred',
      },
      samples: {
        withCanonicalDescription: sampleEligible,
        withoutAnyDescription: sampleNoResource,
      },
    };

    const json = JSON.stringify(report, null, 2);
    if (out) {
      fs.writeFileSync(out, json, 'utf8');
      console.error(`리포트 저장: ${out}`);
    }
    // stdout 으로 구조화 결과 출력
    process.stdout.write(json + '\n');
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error('[productmaster-global-qr-dryrun] 실패:', err);
  process.exit(1);
});
