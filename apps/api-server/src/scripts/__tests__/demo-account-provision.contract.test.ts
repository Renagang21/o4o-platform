/**
 * Demo 계정 구축 CLI — 안전 성질을 **소스로** 고정한다
 *
 * WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1 Phase B
 *
 * 이 CLI 는 운영 DB 에 쓴다. 그래서 "돌려 보고 괜찮더라" 가 아니라 **되돌리면 실패하는 테스트**로
 * 성질을 묶는다. 선례: `community-catalog-promotion.contract.test.ts`.
 *
 * 고정하는 것
 *   ① 기본이 dry-run — write 는 `--apply` 분기 뒤에만 있다
 *   ② 보호 대상(실사용자 · KEEP_UNKNOWN · 기존 supplier 조직 · Sohae 약국)을 건드리지 않는다
 *   ③ 주문 테이블을 아예 읽지도 쓰지도 않는다
 *   ④ 삭제가 없다 — orphan 정리는 이 스크립트의 일이 아니다
 *   ⑤ 비밀번호는 전용 서비스로만 저장한다(평문 INSERT 0)
 *   ⑥ 멱등 — 있으면 두고 없으면 만든다
 *   ⑦ role 은 service-scoped allowlist 안에서만 — platform · admin · operator 는 Demo 대상이 아니다
 *
 * ⑦ 은 2026-10-02 에 좁혔다(WO-O4O-DEMO-ACCOUNT-ROLE-CONTRACT-UPDATE-AND-CI-RECOVERY-V1).
 * 종전 단언은 "소스에 `role_assignments` 라는 글자가 없다" 였다 — 그 때는 CLI 가 role 을 아예
 * 부여하지 않았기 때문이다. 이후 정본 정책이 **service-scoped role 허용**으로 바뀌어 CLI 가
 * `kpa:store_owner` · `neture:supplier` 를 부여하게 되자, 코드가 아니라 **이 테스트가** 틀린
 * 것이 되어 main CI 를 red 로 만들었다. 지금은 금지를 넓게 거는 대신 **허용값을 정확히** 묶는다
 * — 보호는 약해지지 않고 더 구체적이 된다.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..', 'demo-account-provision.ts');
const RAW = fs.readFileSync(SRC, 'utf-8');
/** 주석을 걷어낸 코드 — 설명 문구가 단언을 오탐시키지 않게 한다. */
const CODE = RAW.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('① 기본은 dry-run', () => {
  it('--apply 플래그가 있을 때만 write 모드다', () => {
    expect(CODE).toContain("const APPLY = process.argv.includes('--apply')");
  });

  it('모든 INSERT 가 APPLY 분기 안에 있다', () => {
    const lines = CODE.split('\n');
    const inserts = lines
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => /\bINSERT INTO\b/.test(l));
    expect(inserts.length).toBeGreaterThan(0);
    for (const { i } of inserts) {
      // INSERT 앞 8줄 안에 APPLY 가드가 있어야 한다.
      const window = lines.slice(Math.max(0, i - 8), i).join('\n');
      expect(window).toMatch(/if \(![a-zA-Z]+ && APPLY\)|if \(APPLY\)/);
    }
  });

  it('dry-run 은 쓰기 건수를 0 으로 보고한다', () => {
    expect(CODE).toContain('TOTAL writes=${APPLY ? writes : 0}');
  });
});

describe('② 보호 대상을 건드리지 않는다', () => {
  it('실사용자 · KEEP_UNKNOWN 을 금지 목록으로 들고 있다', () => {
    expect(CODE).toContain("FORBIDDEN_USER_PREFIXES");
    for (const id of ['cfd2a5e7', 'c0156a4a', '322667c8']) {
      expect(CODE).toContain(id);
    }
  });

  it('기존 supplier 조직 3개와 Sohae 약국을 금지 목록으로 들고 있다', () => {
    for (const id of ['95aad740', '69e985ae', 'a79e18fd', 'c9beb4a2']) {
      expect(CODE).toContain(id);
    }
  });

  it('실행 전에 금지 목록을 실제로 검사한다 (주석이 아니라 코드)', () => {
    expect(CODE).toMatch(/FORBIDDEN_ORG_PREFIXES\.some/);
    expect(CODE).toMatch(/FORBIDDEN_USER_PREFIXES\.some/);
  });

  it('기존 supplier 조직을 대상으로 삼지 않는다 — SUPPLIER 는 새 조직을 만든다', () => {
    expect(CODE).toMatch(/newOrganization/);
    expect(CODE).toContain("code: 'O4O-SUPPLIER-DEMO'");
  });
});

describe('③ 주문을 읽지도 쓰지도 않는다', () => {
  it('checkout_orders 를 질의하지 않는다', () => {
    expect(CODE).not.toContain('checkout_orders');
  });
});

describe('④ 삭제가 없다', () => {
  it('DELETE · DROP · TRUNCATE 가 없다', () => {
    expect(CODE).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(CODE).not.toMatch(/\bDROP\s+TABLE\b/i);
    expect(CODE).not.toMatch(/\bTRUNCATE\b/i);
  });

  it('UPDATE 가 없다 — 기존 행의 소유·상태를 바꾸지 않는다', () => {
    expect(CODE).not.toMatch(/\bUPDATE\s+[a-z_]+\s+SET\b/i);
  });
});

describe('⑤ 비밀번호 저장 경로', () => {
  it('공통 credential 서비스로만 저장한다 (해시 정책을 다시 쓰지 않는다)', () => {
    expect(CODE).toContain('passwordCredentialService');
    expect(CODE).toMatch(/passwordCredentialService\.setPassword\(/);
    // bcrypt 를 직접 부르지 않는다 — cost·72바이트 상한이 두 벌이 되면 한쪽이 뒤처진다.
    expect(CODE).not.toMatch(/\bbcrypt\b/);
  });

  it('user_password_credentials 에 직접 INSERT 하지 않는다', () => {
    expect(CODE).not.toMatch(/INSERT INTO user_password_credentials/i);
  });

  it('이미 비밀번호가 있으면 덮어쓰지 않는다', () => {
    expect(CODE).toMatch(/hasPassword\(/);
    expect(CODE).toMatch(/if \(!has && APPLY\)/);
  });
});

describe('⑥ 멱등 · 선행 조건', () => {
  it('registry · 조직 · ownership · membership 전부 존재 확인 후 생성한다', () => {
    for (const t of ['demo_accounts', 'organizations', 'organization_members', 'service_memberships', 'neture_suppliers']) {
      expect(CODE).toContain(t);
    }
    // 각 생성은 "없으면" 조건을 달고 있다.
    expect((CODE.match(/if \(!\w+ && APPLY\)/g) || []).length).toBeGreaterThanOrEqual(4);
  });

  it('demo_accounts 테이블이 없으면 중단한다 (migration 선행 확인)', () => {
    expect(CODE).toContain("table_name='demo_accounts'");
    expect(CODE).toMatch(/migration 1790940000000 선행 필요|throw new Error\('demo_accounts/);
  });

  it('조직 접두가 1건에 일치하지 않으면 중단한다', () => {
    expect(CODE).toMatch(/rows\.length !== 1/);
  });

  it('Google 연결을 만들지 않는다', () => {
    expect(CODE).not.toContain('linked_accounts');
  });
});
/**
 * ⑦ Demo role — service-scoped allowlist (정본: `O4O-CANONICAL-DEMO-ACCOUNTS-V1` §18)
 *
 * 허용: `kpa:store_owner` · `neture:supplier` — 체험 화면에 들어가려면 필요하다.
 * 금지: `platform:*` · `admin` · `operator` · 그 밖의 모든 role.
 *
 * 이 블록은 "글자가 있다/없다" 로 정책을 정의하지 않는다. 소스에서 **실제 값**(allowlist 집합 ·
 * DEMOS 가 부여하는 role)을 뽑아 비교하고, 뽑지 못하면 **실패한다** — 파서가 빈손이면 단언이
 * 통과해 버려 아무것도 지키지 못하기 때문이다.
 */
describe('⑦ Demo role — service-scoped allowlist', () => {
  /** 정본 허용값. 바뀌면 baseline §18 과 CLI 를 함께 고쳐야 한다. */
  const CANONICAL_ALLOWED = ['kpa:store_owner', 'neture:supplier'];

  /** 권한 상승 성격의 role — naming convention(`<service>:<role>`) 기준 deterministic rule. */
  const isPrivileged = (role: string) =>
    role === 'admin' ||
    role === 'operator' ||
    role.startsWith('platform:') ||
    /:(admin|operator|super_admin)$/.test(role);

  /** CLI 의 allowlist 집합 리터럴에서 값을 뽑는다. */
  const parseAllowlist = (): string[] => {
    const m = CODE.match(/ALLOWED_DEMO_ROLES[^=]*=\s*new Set\(\[([\s\S]*?)\]\)/);
    if (!m) throw new Error('ALLOWED_DEMO_ROLES 집합을 찾지 못했다 — 계약을 검증할 수 없다');
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  };

  /** DEMOS 가 실제로 부여하는 role 전부(`roles: [...]`). */
  const parseGranted = (): string[] => {
    const hits = [...CODE.matchAll(/\broles:\s*\[([\s\S]*?)\]/g)];
    if (hits.length === 0) throw new Error('DEMOS 의 roles 를 찾지 못했다 — 계약을 검증할 수 없다');
    return hits.flatMap((h) => [...h[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
  };

  it('allowlist 는 정확히 2개 — kpa:store_owner · neture:supplier', () => {
    expect([...parseAllowlist()].sort()).toEqual([...CANONICAL_ALLOWED].sort());
  });

  it('실제로 부여하는 role 이 allowlist 를 벗어나지 않는다', () => {
    const granted = parseGranted();
    expect(granted.length).toBeGreaterThan(0);
    expect([...new Set(granted)].sort()).toEqual([...CANONICAL_ALLOWED].sort());
    // 한 Demo 가 두 역할을 겸하지 않는다 — 각 1개씩이다.
    expect(granted).toHaveLength(2);
  });

  it('platform:* · admin · operator 는 어느 자리에도 없다', () => {
    const offenders = [...parseAllowlist(), ...parseGranted()].filter(isPrivileged);
    expect(offenders).toEqual([]);
    // 소스 어디에도 platform role 문자열을 쓰지 않는다(주석 제거된 CODE 기준).
    expect(CODE).not.toContain('platform:');
    // deterministic rule 자체가 동작하는지 — 규칙이 무력해지면 위 단언이 의미를 잃는다.
    for (const bad of ['platform:super_admin', 'admin', 'operator', 'kpa:admin', 'neture:operator']) {
      expect(isPrivileged(bad)).toBe(true);
    }
    for (const ok of CANONICAL_ALLOWED) expect(isPrivileged(ok)).toBe(false);
  });

  it('allowlist 밖 role 은 **실행 전에** 거절한다 — DB 를 건드리기 전이다', () => {
    // 선행 검사(assertPreconditions) 안에서 집합 조회 + throw 가 함께 있어야 한다.
    const pre = CODE.slice(CODE.indexOf('async function assertPreconditions'));
    const body = pre.slice(0, pre.indexOf('\nasync function', 1));
    expect(body).toMatch(/ALLOWED_DEMO_ROLES\.has\(/);
    expect(body).toMatch(/throw new Error\(`Demo 에 허용되지 않은 role/);
    // 그리고 그 검사가 어떤 INSERT 보다 앞에 온다.
    expect(CODE.indexOf('ALLOWED_DEMO_ROLES.has(')).toBeLessThan(CODE.indexOf('INSERT INTO'));
  });

  it('role INSERT 는 allowlist 를 통과한 상수 role 만 쓴다 — 외부 입력이 아니다', () => {
    const at = CODE.indexOf('INSERT INTO role_assignments');
    expect(at).toBeGreaterThan(-1);
    const stmt = CODE.slice(at, at + 400);
    // 파라미터는 루프 변수 둘뿐이다(문자열 보간 0 · argv/env 유래 0).
    expect(stmt).toMatch(/\[userId, role\]/);
    expect(stmt).not.toMatch(/process\.(argv|env)/);
    // role 은 DEMOS 상수를 도는 루프에서만 나온다.
    const loop = CODE.slice(Math.max(0, at - 600), at);
    expect(loop).toMatch(/for \(const role of demo\.roles\)/);
  });

  it('활성 행 확인 뒤에만 부여한다 — 이미 있으면 그대로 두고 비활성 이력은 되살리지 않는다', () => {
    const at = CODE.indexOf('INSERT INTO role_assignments');
    const before = CODE.slice(Math.max(0, at - 600), at);
    expect(before).toMatch(/SELECT id FROM role_assignments WHERE user_id = \$1 AND role = \$2 AND is_active = true/);
    expect(before).toMatch(/if \(!r && APPLY\)/);
  });

  it('role 보다 먼저 사용자 · demo_accounts · membership 이 갖춰진다', () => {
    const order = (needle: string) => {
      const i = CODE.indexOf(needle);
      expect(i).toBeGreaterThan(-1);
      return i;
    };
    const roleAt = order('INSERT INTO role_assignments');
    expect(order("table_name='demo_accounts'")).toBeLessThan(roleAt);
    expect(order('INSERT INTO demo_accounts')).toBeLessThan(roleAt);
    expect(order('INSERT INTO service_memberships')).toBeLessThan(roleAt);
    expect(order('INSERT INTO organization_members')).toBeLessThan(roleAt);
  });
});

describe('SQL 안전', () => {
  it('SQL 문자열 안에 값 보간이 없다 (파라미터 바인딩만)', () => {
    // 줄 단위로 보면 파라미터 배열의 보간(`[\`${prefix}%\`]`)까지 걸린다 — 그건 바인딩 값이라
    // 안전하다. 그래서 백틱 템플릿 **안쪽**만 본다.
    const literals = CODE.match(/`[^`]*`/g) || [];
    const sqlLiterals = literals.filter((t) => /INSERT INTO|SELECT\s|UPDATE\s|FROM\s/i.test(t));
    expect(sqlLiterals.length).toBeGreaterThan(0);
    for (const sql of sqlLiterals) {
      expect(sql).not.toMatch(/\$\{/);
    }
  });

  it('파라미터 자리표시자를 쓴다', () => {
    expect(CODE).toMatch(/\$1/);
  });
});
