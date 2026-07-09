/**
 * ProductMaster Global QR Seed — Dry-run (DB, read-only, write 0)
 *
 * WO-O4O-PRODUCTMASTER-GLOBAL-QR-SEED-ENVIRONMENT-V1
 *
 * 모든 O4O 표준 상품(ProductMaster)에 O4O 고유 QR 을 부여하기 위한 **사전 현황 산출**.
 * 실제 QR 을 생성하지 않는다. **SELECT 만 수행 — DB write 0**(존재 자체가 dry-run, --apply 개념 없음).
 *
 * ⚠️ 아키텍처 전제(Frozen F12 — O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1):
 *   - Freeze #4: "QR = /r/{resourceId} 인코딩, **비저장·동적생성**" — QR row 를 자산으로 저장하지 않는다.
 *   - Freeze #3: 공개 permalink = /r/{resourceId} (Resource 단위, ProductMaster 단위가 아님).
 *   - Freeze #6: ProductMaster 는 Resource 를 모른다(FK 신설 금지, Resource→ProductMaster 단방향).
 *   따라서 "제품별 QR row 저장"은 F12 와 충돌하며 baseline 개정 WO 가 선행되어야 한다.
 *   본 dry-run 은 **두 후보 모델**의 현황을 모두 산출해 정책 결정을 돕는다:
 *     - 모델 D(F12 정합·권장): QR 대상 = ProductMaster 의 canonical Resource(/r/{id}). 저장 QR row 0.
 *     - 모델 C(대안·baseline 개정 필요): ProductIdentifier 에 QR_CODE identifier_type 로 per-master 토큰 저장.
 *   store_qr_codes(계층 2·매장 스코프) 재사용은 부적합(모델 A 기각) — 근거는 산출값으로 확인.
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
      architectureGate: {
        baseline: 'O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1 (F12, Frozen)',
        freeze4: 'QR = /r/{resourceId} 인코딩, 비저장·동적생성',
        implication:
          '제품별 QR row 저장(모델 A/C)은 baseline 개정 WO 선행 필요. 모델 D(/r/{id} 동적 QR)가 정합.',
        rRoutePublicImplemented: false, // 조사 결과 /r/{id} 공개 라우트 미구현(F12 roadmap step 4)
      },
      inventory: {
        totalProductMasters,
        byRegulatory,
        mastersWithCanonicalResource, // 모델 D 즉시 QR 대상
        mastersWithAnyResource,
        mastersWithoutAnyResource, // QR 지향 대상 부재 gap
        canonicalResourceCoveragePct:
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
        // 모델 D (권장·F12 정합): 저장 QR row 0, 대상 = canonical resource 보유 master
        modelD_dynamicResourceQr: {
          eligibleNow: mastersWithCanonicalResource,
          blockedNoResource: mastersWithoutAnyResource,
          estimatedStoredQrRows: 0,
        },
        // 모델 C (baseline 개정 필요): per-master QR_CODE identifier
        modelC_storedIdentifier: {
          candidateToCreate: totalProductMasters - existingQrIdentifier,
          estimatedCreateCount: totalProductMasters - existingQrIdentifier,
          duplicateTargets: 0, // (product_master_id, identifier_type) 유니크로 방지
        },
      },
      samples: {
        eligibleWithCanonicalResource: sampleEligible,
        noResourceGap: sampleNoResource,
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
