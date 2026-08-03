/**
 * Pharmacy-Hub 매장 주체 backfill — dry-run / apply / post-verify
 *
 * WO-PHARMACY-HUB-STORE-SUBJECT-PROVISIONING-V1
 *
 * 대상 모집단:
 *   service_memberships
 *     WHERE service_key = 'pharmacy-hub'
 *       AND status = 'active'
 *       AND role = 'pharmacy-hub:store_owner'
 *
 * 사용법:
 *   tsx src/scripts/pharmacy-hub-store-subject-provisioning.ts --mode=dry-run
 *   tsx src/scripts/pharmacy-hub-store-subject-provisioning.ts --mode=apply
 *   tsx src/scripts/pharmacy-hub-store-subject-provisioning.ts --mode=post-verify
 *
 * 안전 계약:
 *   - dry-run 은 어떤 write 도 하지 않는다.
 *   - apply 는 사용자 단위 멱등이다 (재실행 시 추가 생성 0).
 *   - 보류(held) 대상은 건너뛰고 사유를 출력한다 — 추측으로 매장을 만들지 않는다.
 *   - post-verify 는 read-only 이며 정합성 불변식을 검사한다.
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PlatformStoreSlug, PlatformStoreSlugHistory } from '@o4o/platform-core/store-identity';
import { PharmacyHubStoreProvisioningService } from '../services/pharmacy-hub/PharmacyHubStoreProvisioningService.js';
import type { ProvisionResult } from '../services/pharmacy-hub/PharmacyHubStoreProvisioningService.js';

/**
 * 경량 DataSource — 이 backfill 이 실제로 쓰는 entity 만 등록한다.
 *
 * 전역 AppDataSource 는 database/entities.ts 의 **전체 entity 그래프**를 로드한다.
 * 스크립트 실행에는 불필요할 뿐 아니라, 로컬에서 일부 공유 패키지 dist 의 순환 참조
 * (digital-signage-core MediaListItem ↔ MediaList) 때문에 import 단계에서 죽는다.
 *
 * PharmacyHubStoreProvisioningService 는 dataSource 를 주입받고 organizations /
 * organization_members / role_assignments 등은 전부 raw SQL 로 접근하므로,
 * repository 가 필요한 것은 slug 2종뿐이다. → 로직 이중화 없이 같은 서비스를 재사용한다.
 */
function createSlimDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_platform',
    ssl: false,
    synchronize: false,
    logging: false,
    entities: [PlatformStoreSlug, PlatformStoreSlugHistory],
  });
}

const AppDataSource = createSlimDataSource();

const SERVICE_KEY = 'pharmacy-hub';
const STORE_OWNER_ROLE = 'pharmacy-hub:store_owner';

type Mode = 'dry-run' | 'apply' | 'post-verify';

function parseMode(): Mode {
  const arg = process.argv.find((a) => a.startsWith('--mode='));
  const value = arg ? arg.slice('--mode='.length) : 'dry-run';
  if (value !== 'dry-run' && value !== 'apply' && value !== 'post-verify') {
    throw new Error(`invalid --mode: ${value} (dry-run | apply | post-verify)`);
  }
  return value;
}

async function loadPopulation(): Promise<Array<{ user_id: string; email: string | null; business_name: string | null }>> {
  return AppDataSource.query(
    `SELECT sm.user_id,
            u.email,
            NULLIF(TRIM(COALESCE(u."businessInfo"->>'businessName', u."businessInfo"->>'companyName', '')), '') AS business_name
     FROM service_memberships sm
     JOIN users u ON u.id = sm.user_id
     WHERE sm.service_key = $1
       AND sm.status = 'active'
       AND sm.role = $2
     ORDER BY sm.user_id`,
    [SERVICE_KEY, STORE_OWNER_ROLE],
  );
}

function summarize(results: ProvisionResult[]): void {
  const byOutcome: Record<string, number> = {};
  for (const r of results) byOutcome[r.outcome] = (byOutcome[r.outcome] ?? 0) + 1;

  const totals = results.reduce(
    (acc, r) => ({
      organization: acc.organization + (r.created.organization ? 1 : 0),
      member: acc.member + (r.created.member ? 1 : 0),
      enrollment: acc.enrollment + (r.created.enrollment ? 1 : 0),
      role: acc.role + (r.created.role ? 1 : 0),
      slug: acc.slug + (r.created.slug ? 1 : 0),
    }),
    { organization: 0, member: 0, enrollment: 0, role: 0, slug: 0 },
  );

  console.log('\n── outcome ──');
  for (const [k, v] of Object.entries(byOutcome)) console.log(`  ${k.padEnd(10)} ${v}`);
  console.log('\n── 생성량 ──');
  console.log(`  organizations                    ${totals.organization}`);
  console.log(`  organization_members             ${totals.member}`);
  console.log(`  organization_service_enrollments ${totals.enrollment}`);
  console.log(`  role_assignments                 ${totals.role}`);
  console.log(`  platform_store_slugs             ${totals.slug}`);

  const held = results.filter((r) => r.outcome === 'held');
  if (held.length > 0) {
    console.log('\n── 보류 (사람 판단 필요) ──');
    for (const h of held) {
      console.log(`  ${h.userId}  ${h.holdReason}`);
      console.log(`      ${h.detail}`);
    }
  }
}

async function runProvisioning(mode: 'dry-run' | 'apply'): Promise<void> {
  const population = await loadPopulation();
  console.log(`[${mode}] 모집단: active + ${STORE_OWNER_ROLE} = ${population.length}명`);

  if (population.length === 0) {
    console.log('대상이 없습니다. 변경 0.');
    return;
  }

  const service = new PharmacyHubStoreProvisioningService(AppDataSource);
  const results: ProvisionResult[] = [];

  for (const row of population) {
    const result = await service.provisionStoreSubject(row.user_id, null, mode === 'dry-run');
    results.push(result);
    console.log(
      `  ${row.user_id}  ${String(result.outcome).padEnd(8)} ` +
        `org=${result.organizationId ?? '-'} slug=${result.slug ?? '-'}` +
        (result.holdReason ? `  HOLD:${result.holdReason}` : ''),
    );
  }

  summarize(results);
}

async function postVerify(): Promise<void> {
  const population = await loadPopulation();
  console.log(`모집단: ${population.length}명\n`);

  // 1) 사용자별 정합 — organization / owner membership / role / slug
  const rows = await AppDataSource.query(
    `SELECT sm.user_id,
            u.email,
            (SELECT COUNT(*) FROM organization_members om
              WHERE om.user_id = sm.user_id
                AND om.role IN ('owner','admin','manager')
                AND om.left_at IS NULL)                                   AS member_orgs,
            (SELECT COUNT(*) FROM role_assignments ra
              WHERE ra.user_id = sm.user_id AND ra.role = $2 AND ra.is_active = true) AS role_cnt
     FROM service_memberships sm
     JOIN users u ON u.id = sm.user_id
     WHERE sm.service_key = $1 AND sm.status = 'active' AND sm.role = $2
     ORDER BY sm.user_id`,
    [SERVICE_KEY, STORE_OWNER_ROLE],
  );

  let ok = 0;
  const problems: string[] = [];
  for (const r of rows) {
    const memberOrgs = Number(r.member_orgs);
    const roleCnt = Number(r.role_cnt);
    if (memberOrgs === 1 && roleCnt === 1) ok++;
    else problems.push(`  ${r.user_id}  member_orgs=${memberOrgs} role=${roleCnt}`);
  }
  console.log(`정합 (매장 조직 1 + role 1): ${ok}/${rows.length}`);
  if (problems.length) {
    console.log('불일치:');
    problems.forEach((p) => console.log(p));
  }

  // 2) slug 중복 0 (platform-wide unique 이므로 구조상 0 이어야 한다)
  const [dupSlug] = await AppDataSource.query(
    `SELECT COUNT(*)::int AS c FROM (
       SELECT slug FROM platform_store_slugs GROUP BY slug HAVING COUNT(*) > 1
     ) d`,
  );
  console.log(`slug 중복: ${dupSlug.c}`);

  // 3) pharmacy-hub slug 가 store_id 당 1개 이하
  const [dupStoreSlug] = await AppDataSource.query(
    `SELECT COUNT(*)::int AS c FROM (
       SELECT store_id FROM platform_store_slugs
       WHERE service_key = $1
       GROUP BY store_id HAVING COUNT(*) > 1
     ) d`,
    [SERVICE_KEY],
  );
  console.log(`pharmacy-hub store_id 당 slug 중복: ${dupStoreSlug.c}`);

  // 4) organization_members 중복 0
  const [dupMember] = await AppDataSource.query(
    `SELECT COUNT(*)::int AS c FROM (
       SELECT organization_id, user_id FROM organization_members
       GROUP BY organization_id, user_id HAVING COUNT(*) > 1
     ) d`,
  );
  console.log(`organization_members 중복: ${dupMember.c}`);

  // 5) ph-pharm-* 조직 code 중복 0
  const [dupCode] = await AppDataSource.query(
    `SELECT COUNT(*)::int AS c FROM (
       SELECT code FROM organizations WHERE code LIKE 'ph-pharm-%'
       GROUP BY code HAVING COUNT(*) > 1
     ) d`,
  );
  console.log(`ph-pharm-* code 중복: ${dupCode.c}`);

  // 6) 이번 트랙이 만든 조직 수
  const [phOrgs] = await AppDataSource.query(
    `SELECT COUNT(*)::int AS c FROM organizations WHERE code LIKE 'ph-pharm-%'`,
  );
  const [phEnroll] = await AppDataSource.query(
    `SELECT COUNT(*)::int AS c FROM organization_service_enrollments WHERE service_code = $1`,
    [SERVICE_KEY],
  );
  const [phSlugs] = await AppDataSource.query(
    `SELECT COUNT(*)::int AS c FROM platform_store_slugs WHERE service_key = $1`,
    [SERVICE_KEY],
  );
  console.log(`\nph-pharm-* organizations: ${phOrgs.c}`);
  console.log(`pharmacy-hub enrollments: ${phEnroll.c}`);
  console.log(`pharmacy-hub slugs:       ${phSlugs.c}`);
}

async function main(): Promise<void> {
  const mode = parseMode();
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  console.log(`\n=== Pharmacy-Hub Store Subject Provisioning [${mode}] ===\n`);

  if (mode === 'post-verify') await postVerify();
  else await runProvisioning(mode);

  await AppDataSource.destroy();
  console.log('\n완료.');
}

main().catch(async (error) => {
  console.error('FAILED:', error instanceof Error ? error.message : error);
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exit(1);
});
