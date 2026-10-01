/**
 * canonical Demo 계정 구축 — **기본 dry-run** (쓰기는 `--apply` 에서만)
 *
 * WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1 Phase B
 * 정책 정본: `docs/baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md`
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 CLI 인가
 *   진단·seed·repair 는 CLI 우선이고 HTTP route 로 만들지 않는다(CLAUDE.md §8).
 *   선례: `community-catalog-promotion.ts` — 기본 dry-run · `--apply` 에서만 write.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 스크립트가 **건드리지 않는 것** (Phase A census 로 확정 · 사용자 지시)
 *
 *   checkout_orders                주문 23건 — buyer 가 실제 운영자다. 읽지도 쓰지도 않는다
 *   실사용자 2명                    `cfd2a5e7…`(super_admin) · `c0156a4a…`
 *   `322667c8…` (testgm***)        KEEP_UNKNOWN — user · role · membership 전부 미접촉
 *   Sohae 약국 `c9beb4a2…`          실제 운영자 소유
 *   기존 supplier 조직 3개           `95aad740`(주문 16) · `69e985ae`(주문 6) · `a79e18fd`(PENDING)
 *                                  owner · status · 주문 어느 것도 바꾸지 않는다
 *   signage_media(org NULL) 7       의미 확인 전 relink 금지
 *   orphan organization_members 2   **이 스크립트는 삭제하지 않는다** — relink·smoke 뒤 별도 단계
 *
 * 보호는 코드 주석이 아니라 **실행 전 단언**으로 건다(아래 FORBIDDEN_* 확인).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 멱등
 *   모든 단계가 "있으면 그대로 두고 없으면 만든다". 두 번 돌려도 같은 상태가 된다.
 *   비밀번호는 **이미 credential 이 있으면 덮어쓰지 않는다**(운영 중 Demo 비밀번호를 조용히
 *   바꾸지 않기 위해서다. 교체가 필요하면 별도 지시로 한다).
 *
 * 실행
 *   cd apps/api-server
 *   npx tsx --env-file=.env src/scripts/demo-account-provision.ts            # 측정만 (write 0)
 *   npx tsx --env-file=.env src/scripts/demo-account-provision.ts --apply    # 수치 확인 후
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { normalizeLoginEmail } from '@o4o/auth-utils';
// 싱글턴을 그대로 쓴다 — 해시 정책(bcrypt cost 12 · 72바이트 상한)을 이 스크립트가 다시 쓰지 않는다.
// 기본 연결이 AppDataSource 라서, entity 를 싣지 않는 이 스크립트의 DataSource 를 manager 로 넘긴다.
import { passwordCredentialService } from '../services/auth/password-credential.service.js';

const APPLY = process.argv.includes('--apply');

/** 이 작업이 만드는 Demo 들. email·password 는 공개 식별자다(정책 §3 · §4). */
const DEMOS = [
  {
    demoType: 'STORE_OWNER' as const,
    email: 'teststoreowner@example.com',
    name: '매장 경영자 Demo',
    /** 기존 "테스트 약국" 재사용 — 샘플 콘텐츠 15 · 플레이리스트 5 가 이미 붙어 있다. */
    organizationId: '9c87f46b',
    serviceKeys: ['kpa-society', 'neture'],
  },
  {
    demoType: 'SUPPLIER' as const,
    email: 'testsupplier@example.com',
    name: '공급자 Demo',
    /** 기존 조직을 쓰지 않는다 — 셋 다 실제 주문·실제 신청과 얽혀 있다(§주석 상단). 새로 만든다. */
    organizationId: null,
    newOrganization: { name: 'O4O 공급자 Demo', code: 'O4O-SUPPLIER-DEMO', type: 'supplier' },
    serviceKeys: ['supplier', 'neture'],
  },
];

/** 절대 대상이 아닌 식별자 — 실행 전에 교차 확인한다. */
const FORBIDDEN_ORG_PREFIXES = ['95aad740', '69e985ae', 'a79e18fd', 'c9beb4a2'];
const FORBIDDEN_USER_PREFIXES = ['cfd2a5e7', 'c0156a4a', '322667c8'];

function createDataSource(): DataSource {
  const { DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST || !DB_USERNAME || !DB_PASSWORD || !DB_NAME) {
    const presence = (v?: string) => (v ? 'SET' : 'MISSING');
    throw new Error(
      `Missing required database environment variables.\n` +
        `  DB_HOST: ${presence(DB_HOST)}\n  DB_USERNAME: ${presence(DB_USERNAME)}\n` +
        `  DB_PASSWORD: ${presence(DB_PASSWORD)}\n  DB_NAME: ${presence(DB_NAME)}`,
    );
  }
  const isSocket = DB_HOST.startsWith('/cloudsql/');
  // entity 를 싣지 않는 raw SQL 전용 연결 (migrate.ts 의 createMigrationDataSource 와 같은 형태).
  return new DataSource({
    type: 'postgres',
    host: DB_HOST,
    ...(isSocket ? {} : { port: parseInt(DB_PORT || '5432', 10) }),
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_NAME,
    entities: [],
    migrations: [],
    synchronize: false,
    logging: false,
  });
}

const ds = createDataSource();

type Row = Record<string, unknown>;
const one = async (sql: string, params: unknown[] = []): Promise<Row | undefined> =>
  (await ds.query(sql, params))[0];

async function assertPreconditions(): Promise<void> {
  const demo = await one(
    `SELECT count(*)::int AS c FROM information_schema.tables WHERE table_schema='public' AND table_name='demo_accounts'`,
  );
  if ((demo?.c as number) !== 1) {
    throw new Error('demo_accounts 테이블이 없다 — migration 1790940000000 선행 필요');
  }
  // 금지 대상이 실수로 들어오지 않았는지 — 상수 자체를 검사한다.
  for (const d of DEMOS) {
    if (d.organizationId && FORBIDDEN_ORG_PREFIXES.some((p) => d.organizationId!.startsWith(p))) {
      throw new Error(`금지된 조직을 대상으로 삼았다: ${d.organizationId}`);
    }
  }
}

/** 접두 8자로 받은 조직 id 를 전체 uuid 로 확정한다(사람이 읽은 census 값을 그대로 쓰기 위해). */
async function resolveOrganization(prefix: string): Promise<{ id: string; name: string }> {
  const rows = await ds.query(`SELECT id, name FROM organizations WHERE id::text LIKE $1`, [`${prefix}%`]);
  if (rows.length !== 1) throw new Error(`조직 접두 ${prefix} 가 ${rows.length} 건에 일치한다 — 중단`);
  return rows[0];
}

async function run(): Promise<void> {
  await ds.initialize();
  console.log(`mode: ${APPLY ? 'APPLY (write)' : 'DRY-RUN (measure only)'}`);
  await assertPreconditions();

  const summary: string[] = [];
  let writes = 0;

  for (const demo of DEMOS) {
    const email = normalizeLoginEmail(demo.email);
    const existing = await one(`SELECT id, status FROM users WHERE email = $1`, [email]);
    if (existing && FORBIDDEN_USER_PREFIXES.some((p) => String(existing.id).startsWith(p))) {
      throw new Error(`Demo 이메일이 보호 대상 사용자와 겹친다: ${email}`);
    }

    let userId = existing?.id as string | undefined;
    const userAction = existing ? 'exists' : 'CREATE';
    if (!existing && APPLY) {
      // Demo 예외: 실제 수신 주소가 아니므로 확인 메일 절차를 거치지 않고
      // 로그인 가능한 상태를 명시적으로 만든다(정책 §5 · CHECK 에 Demo 예외로 기록).
      const created = await one(
        `INSERT INTO users (email, name, status, "isActive", "isEmailVerified")
         VALUES ($1, $2, 'active', true, true) RETURNING id`,
        [email, demo.name],
      );
      userId = created!.id as string;
      writes += 1;
    }

    // 비밀번호 — 이미 있으면 덮어쓰지 않는다.
    // dry-run 은 user 를 만들지 않으므로 이후 단계가 전부 skip 으로 보인다 — 그러면 계획을 읽을 수 없다.
    // 그래서 '사용자가 생길 예정' 이면 의존 단계를 CREATE(plan) 으로 보고한다(쓰기는 여전히 0).
    const willHaveUser = Boolean(userId) || (!existing && !APPLY);
    let pwAction = willHaveUser ? 'CREATE(plan)' : 'skip';
    if (userId) {
      const has = await passwordCredentialService.hasPassword(userId, ds);
      pwAction = has ? 'exists(keep)' : 'CREATE';
      if (!has && APPLY) {
        await passwordCredentialService.setPassword(userId, 'testmail1!', ds);
        writes += 1;
      }
    }

    // registry
    let regAction = willHaveUser ? 'CREATE(plan)' : 'skip';
    if (userId) {
      const reg = await one(`SELECT id FROM demo_accounts WHERE user_id = $1`, [userId]);
      regAction = reg ? 'exists' : 'CREATE';
      if (!reg && APPLY) {
        await ds.query(`INSERT INTO demo_accounts (user_id, demo_type) VALUES ($1, $2)`, [userId, demo.demoType]);
        writes += 1;
      }
    }

    // 조직 — 기존 재사용 또는 신규 생성
    let orgId: string | null = null;
    let orgAction = '-';
    if (demo.organizationId) {
      const org = await resolveOrganization(demo.organizationId);
      orgId = org.id;
      orgAction = `reuse(${org.name})`;
    } else if (demo.newOrganization) {
      const found = await one(`SELECT id FROM organizations WHERE code = $1`, [demo.newOrganization.code]);
      if (found) {
        orgId = found.id as string;
        orgAction = 'exists';
      } else {
        orgAction = 'CREATE';
        if (APPLY) {
          const created = await one(
            `INSERT INTO organizations (name, code, type, description)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [demo.newOrganization.name, demo.newOrganization.code, demo.newOrganization.type,
             'canonical Supplier Demo (WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1)'],
          );
          orgId = created!.id as string;
          writes += 1;
        }
      }
    }

    // ownership — 추가만 한다. 기존 행(삭제된 사용자의 orphan 포함)은 건드리지 않는다.
    let ownerAction = willHaveUser ? 'CREATE(plan)' : 'skip';
    if (userId && orgId) {
      const member = await one(
        `SELECT id FROM organization_members WHERE organization_id = $1 AND user_id = $2`,
        [orgId, userId],
      );
      ownerAction = member ? 'exists' : 'CREATE';
      if (!member && APPLY) {
        await ds.query(
          `INSERT INTO organization_members (organization_id, user_id, role, is_primary) VALUES ($1, $2, 'owner', true)`,
          [orgId, userId],
        );
        writes += 1;
      }
    }

    // supplier runtime record — 공급자 축은 neture_suppliers 가 조직을 가리킨다(FROZEN §7).
    // dry-run 에서는 조직이 아직 없어 orgId 가 null 이다 — 계획만 적는다.
    let supplierAction = demo.demoType === 'SUPPLIER' && !orgId ? 'CREATE(plan)' : '-';
    if (demo.demoType === 'SUPPLIER' && orgId) {
      const sup = await one(`SELECT id FROM neture_suppliers WHERE organization_id = $1`, [orgId]);
      supplierAction = sup ? 'exists' : 'CREATE';
      if (!sup && APPLY) {
        await ds.query(
          `INSERT INTO neture_suppliers (slug, status, organization_id, representative_name)
           VALUES ($1, 'ACTIVE', $2, $3)`,
          ['o4o-supplier-demo', orgId, demo.name],
        );
        writes += 1;
      }
    }

    // service membership — 화면 진입 자격. 역할(role_assignments)은 부여하지 않는다:
    // 운영자 권한 축이며 Demo 는 사업자/매장 축으로 들어간다(정책 §18 platform:* 0).
    const memberships: string[] = [];
    for (const key of demo.serviceKeys) {
      if (!userId) {
        // 사용자가 아직 없다(dry-run). 계획만 적는다 — 쓰기는 0 이다.
        memberships.push(`${key}:${willHaveUser ? 'CREATE(plan)' : 'skip'}`);
        continue;
      }
      const m = await one(`SELECT id FROM service_memberships WHERE user_id = $1 AND service_key = $2`, [userId, key]);
      memberships.push(`${key}:${m ? 'exists' : 'CREATE'}`);
      if (!m && APPLY) {
        await ds.query(
          `INSERT INTO service_memberships (user_id, service_key, status) VALUES ($1, $2, 'active')`,
          [userId, key],
        );
        writes += 1;
      }
    }

    summary.push(
      `${demo.demoType}  user=${userAction} password=${pwAction} registry=${regAction} ` +
        `org=${orgAction} owner=${ownerAction} supplier=${supplierAction} memberships=[${memberships.join(' ')}]`,
    );
  }

  console.log('');
  for (const line of summary) console.log(line);
  console.log('');
  console.log(`TOTAL writes=${APPLY ? writes : 0} (dry-run 은 항상 0)`);
  if (!APPLY) console.log('no rows written — re-run with --apply after reviewing the plan above');
  await ds.destroy();
}

run().catch(async (e) => {
  console.error(`demo-account-provision FAILED: ${e instanceof Error ? e.message : String(e)}`);
  if (ds.isInitialized) await ds.destroy();
  process.exit(1);
});
