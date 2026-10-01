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

  it('Demo 는 platform 역할이나 role_assignments 를 만들지 않는다', () => {
    expect(CODE).not.toContain('role_assignments');
    expect(CODE).not.toContain('platform:');
  });

  it('Google 연결을 만들지 않는다', () => {
    expect(CODE).not.toContain('linked_accounts');
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
