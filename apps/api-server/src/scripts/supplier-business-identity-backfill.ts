/**
 * 공급자 대표자명 · 업태 · 종목 → Organization 정본 backfill (CLI)
 *
 * WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1 T9
 * (= WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1 §L 실행 · expand → migrate 단계)
 *
 * 정본은 `organizations.metadata.businessProfile`(representativeName · businessType · businessCategory)이다.
 * 기존 값은 `neture_suppliers.representative_name · business_type · business_item` 에만 있으므로,
 * 정본 쪽이 비어 있는 키만 옛 컬럼 값으로 채운다. 코드는 이미 "정본 우선, 없으면 옛 컬럼" 으로 읽으므로
 * 이 backfill 전후로 화면 값은 같다(정본이 비어 있으면 fallback 이 같은 값을 보여 준다).
 *
 * 데이터만 바꾼다(DDL 0). 그래서 migration 이 아니라 CLI 다 — CLAUDE.md §8-1 · migration contract C22.
 *
 * 안전:
 *   - UPDATE organizations 만. INSERT · DELETE · neture_suppliers 변경 없음(옛 컬럼은 그대로 — 삭제는 contract 단계 · 별도 WO).
 *   - 정본에 이미 값이 있는 키는 덮어쓰지 않는다. 다른 businessProfile 키 · 다른 metadata 키는 보존한다.
 *   - `neture_suppliers.organization_id` 는 UNIQUE 가 아니다 — 한 조직에 공급자가 1건인 경우만 대상. 여러 건이면 건수만 보고.
 *   - businessProfile 이 객체가 아닌 행은 건드리지 않고 건수만 보고.
 *   - 여러 번 실행해도 결과가 같다(두 번째 실행 대상 0). 단일 트랜잭션 · 실행 후 잔여 대상 0 확인, 아니면 롤백.
 *   - 출력은 건수만. 이름 · 사업자 정보 원문을 찍지 않는다(AGENTS.md §5).
 *
 * 운영 DB write 는 통합 담당의 명시 승인 후에만 실행한다(AGENTS.md §5). 기본은 dry-run(조회만).
 * DB write 게이트: `--apply` AND `SUPPLIER_IDENTITY_BACKFILL_CONFIRM=YES`
 *
 * Usage (데스크톱 로컬 세션 · Cloud SQL Proxy):
 *   DB_HOST=127.0.0.1 DB_PORT=<proxy> DB_USERNAME=<user> DB_PASSWORD=*** DB_NAME=o4o_platform \
 *     npx tsx src/scripts/supplier-business-identity-backfill.ts [--apply]
 */

/** 한 조직에 공급자 1건 · 정본이 빈 키에 대해 채울 값(jsonb). fill = '{}' 이면 대상 아님. */
export const PATCH_CTE = `
  WITH single AS (
    SELECT organization_id FROM neture_suppliers
    WHERE organization_id IS NOT NULL
    GROUP BY organization_id HAVING count(*) = 1
  ), src AS (
    SELECT ns.organization_id,
           NULLIF(btrim(ns.representative_name), '') AS rep,
           NULLIF(btrim(ns.business_type), '') AS btype,
           NULLIF(btrim(ns.business_item), '') AS bitem
    FROM neture_suppliers ns JOIN single USING (organization_id)
  ), patch AS (
    SELECT o.id,
           COALESCE(o.metadata->'businessProfile', '{}'::jsonb) AS cur,
           jsonb_strip_nulls(jsonb_build_object(
             'representativeName', CASE WHEN COALESCE(btrim(o.metadata->'businessProfile'->>'representativeName'), '') = '' THEN src.rep END,
             'businessType',       CASE WHEN COALESCE(btrim(o.metadata->'businessProfile'->>'businessType'), '') = '' THEN src.btype END,
             'businessCategory',   CASE WHEN COALESCE(btrim(o.metadata->'businessProfile'->>'businessCategory'), '') = '' THEN src.bitem END
           )) AS fill
    FROM organizations o JOIN src ON src.organization_id = o.id
    WHERE o.metadata IS NULL
       OR o.metadata->'businessProfile' IS NULL
       OR jsonb_typeof(o.metadata->'businessProfile') = 'object'
  )`;

export const PLAN_SQL = `${PATCH_CTE}
  SELECT count(*) FILTER (WHERE fill <> '{}'::jsonb)::int AS targets,
         count(*) FILTER (WHERE fill ? 'representativeName')::int AS representative,
         count(*) FILTER (WHERE fill ? 'businessType')::int AS business_type,
         count(*) FILTER (WHERE fill ? 'businessCategory')::int AS business_category
  FROM patch`;

export const APPLY_SQL = `${PATCH_CTE}
  UPDATE organizations o
  SET metadata = jsonb_set(COALESCE(o.metadata, '{}'::jsonb), '{businessProfile}', patch.cur || patch.fill),
      "updatedAt" = now()
  FROM patch
  WHERE patch.id = o.id AND patch.fill <> '{}'::jsonb`;

export const SKIPPED_SQL = `
  SELECT
    (SELECT count(*)::int FROM (SELECT organization_id FROM neture_suppliers WHERE organization_id IS NOT NULL
       GROUP BY organization_id HAVING count(*) > 1) m) AS multi_supplier_orgs,
    (SELECT count(*)::int FROM organizations o WHERE o.metadata->'businessProfile' IS NOT NULL
       AND jsonb_typeof(o.metadata->'businessProfile') <> 'object'
       AND EXISTS (SELECT 1 FROM neture_suppliers ns WHERE ns.organization_id = o.id)) AS non_object_profiles,
    (SELECT count(*)::int FROM neture_suppliers WHERE organization_id IS NULL
       AND (representative_name IS NOT NULL OR business_type IS NOT NULL OR business_item IS NOT NULL)) AS suppliers_without_org`;

interface Queryable {
  query(sql: string, params?: unknown[]): Promise<any>;
}

export interface BackfillPlan {
  targets: number;
  representative: number;
  business_type: number;
  business_category: number;
}

export async function planBackfill(db: Queryable): Promise<BackfillPlan> {
  const [row] = await db.query(PLAN_SQL);
  return row as BackfillPlan;
}

/** 단일 트랜잭션 안에서 호출한다. 실행 후 잔여 대상이 0 이 아니면 throw — 호출자가 롤백한다. */
export async function applyBackfill(db: Queryable): Promise<number> {
  const result = await db.query(APPLY_SQL);
  const after = await planBackfill(db);
  if (after.targets !== 0) throw new Error(`BACKFILL_RESIDUE: ${after.targets} target(s) remain after apply`);
  // pg driver via TypeORM returns [rows, affected] for UPDATE without RETURNING.
  return Array.isArray(result) && typeof result[1] === 'number' ? result[1] : -1;
}

async function main(): Promise<void> {
  const apply = process.argv.slice(2).includes('--apply') && process.env.SUPPLIER_IDENTITY_BACKFILL_CONFIRM === 'YES';
  const { DataSource } = await import('typeorm');
  if (!process.env.DB_HOST) throw new Error('DB_HOST 미설정');
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [],
    synchronize: false,
    logging: ['error'],
  });
  await ds.initialize();
  try {
    const plan = await planBackfill(ds);
    const [skipped] = await ds.query(SKIPPED_SQL);
    console.log(`MODE = ${apply ? 'APPLY' : 'dry-run'}`);
    console.log(`TARGET_ORGANIZATIONS = ${plan.targets} (representativeName ${plan.representative} · businessType ${plan.business_type} · businessCategory ${plan.business_category})`);
    console.log(`SKIPPED = multi-supplier orgs ${skipped.multi_supplier_orgs} · non-object businessProfile ${skipped.non_object_profiles} · suppliers without org ${skipped.suppliers_without_org}`);
    if (!apply) {
      console.log('dry-run: no write. Apply needs --apply and SUPPLIER_IDENTITY_BACKFILL_CONFIRM=YES (integration-owner approval).');
      return;
    }
    const updated = await ds.transaction((m) => applyBackfill(m));
    console.log(`UPDATED_ORGANIZATIONS = ${updated} · RESIDUE = 0`);
  } finally {
    await ds.destroy();
  }
}

const invokedDirectly = process.argv[1] && /supplier-business-identity-backfill\.(ts|js)$/.test(process.argv[1]);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`supplier-business-identity-backfill FAILED: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
