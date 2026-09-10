/**
 * WO-O4O-ADMIN-PARTNEROPS-REGISTRY-PRODUCTDB-AUTH-AND-LINT-GATE-FINAL-CLOSURE-V1 §8
 *
 * A축(PartnerOps 운영 registry 정렬)과 C축(admin-dashboard lint gate 복구)의
 * 회귀 계약을 고정한다. B축(Product DB 권한)은
 * `bootstrap/__tests__/product-db-write-authority.test.ts` 가 담당한다.
 *
 * 이 spec 은 raw-source 단언을 쓴다 — §8 이 허용하는 "부재 · 스크립트 계약 확인" 용도다.
 * 권한 자체는 위 요청 수준 테스트가 검증한다.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const API_SRC = resolve(__dirname, '..');
const REPO = resolve(__dirname, '../../../..');
const read = (p: string) => readFileSync(resolve(REPO, p), 'utf8');
/**
 * 주석을 제거한 코드 본문만 돌려준다.
 * "무엇을 하지 않았는지" 를 설명한 docblock 이 부재 단언에 걸리는 오탐을 막는다.
 */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const MIGRATION = 'apps/api-server/src/database/migrations/20270404000000-DeactivateRetiredPartnerOpsAppRegistry.ts';

describe('A축 — PartnerOps app_registry 비활성화 migration', () => {
  const src = () => read(MIGRATION);

  it('migration 파일이 존재한다', () => {
    expect(existsSync(resolve(REPO, MIGRATION))).toBe(true);
  });

  it('정확히 appId = partnerops 한 행만 대상으로 한다', () => {
    const s = src();
    expect(s).toContain("const TARGET_APP_ID = 'partnerops';");
    // appId 조건 없는 광범위 UPDATE 금지
    expect(s).toMatch(/UPDATE "app_registry"[\s\S]*?WHERE "appId" = \$1/);
  });

  it('기존 status enum 값 inactive 를 쓴다 (새 값 retired 를 만들지 않는다)', () => {
    expect(src()).toContain("const RETIRED_STATUS = 'inactive';");
    // 주석에는 "'retired' 를 만들지 않는다" 는 설명이 있으므로 코드 본문만 본다.
    expect(code(MIGRATION)).not.toMatch(/'retired'/);
  });

  it('삭제가 아니라 비활성화다', () => {
    expect(src()).not.toMatch(/DELETE\s+FROM\s+"app_registry"/i);
  });

  it('변경 행 수를 RETURNING 으로 세고 1행이 아니면 중지한다', () => {
    const s = src();
    expect(s).toContain('RETURNING "appId"');
    expect(s).toMatch(/if \(affected !== 1\)[\s\S]*?throw new Error/);
  });

  /**
   * 2026-09-10 운영 실측 회귀.
   * TypeORM pg 드라이버는 `UPDATE ... RETURNING` 을 `[rows, affectedCount]` 튜플로 돌려준다.
   * 튜플을 그대로 세면 길이가 항상 2 라서 정상 1행 변경도 거짓 ABORT 한다.
   */
  it('RETURNING 결과를 [rows, count] 튜플로 풀어서 센다', () => {
    const s = code(MIGRATION);
    expect(s).toMatch(/Array\.isArray\(updateResult\[0\]\)\s*\?\s*updateResult\[0\]/);
    expect(s).not.toMatch(/const affected = Array\.isArray\(updateResult\) \? updateResult\.length/);
  });

  it('대상 행이 2건 이상이면 중지한다', () => {
    expect(src()).toMatch(/if \(count > 1\)[\s\S]*?throw new Error/);
  });

  it('이미 inactive 거나 행이 없으면 멱등 no-op 이다', () => {
    const s = src();
    expect(s).toMatch(/if \(count === 0\) \{\s*return;/);
    expect(s).toMatch(/if \(active_count === 0\) \{\s*return;/);
  });

  it('다른 앱의 active 수 불변을 사후 검증한다', () => {
    expect(src()).toMatch(/if \(others_after !== others_before\)[\s\S]*?throw new Error/);
  });

  it('실행 완료된 seed migration 을 수정하지 않는다', () => {
    const seed = read('apps/api-server/src/database/migrations/2026012200002-SeedDefaultApps.ts');
    expect(seed).toContain("'partnerops'");
  });

  it('신규 환경 seed 이후에 실행되도록 timestamp 가 더 크다', () => {
    const files = readdirSync(resolve(API_SRC, 'database/migrations'));
    const mine = files.find((f) => f.startsWith('20270404000000'));
    expect(mine).toBeDefined();
    expect(Number('20270404000000')).toBeGreaterThan(Number('2026012200002'));
  });
});

describe('A축 — 이름이 비슷한 살아 있는 계약은 보존한다', () => {
  it('packages/partner-core 는 그대로 존재한다', () => {
    expect(existsSync(resolve(REPO, 'packages/partner-core/package.json'))).toBe(true);
    expect(existsSync(resolve(REPO, 'packages/partner-core/src'))).toBe(true);
  });

  it('appsCatalog 의 partnerops serviceGroup id 는 보존된다', () => {
    const s = read('apps/api-server/src/app-manifests/appsCatalog.ts');
    expect(s).toContain("id: 'partnerops',");
    expect(s).toContain("serviceGroups: ['platform-core', 'partnerops'],");
  });

  it('appsCatalog 에 실행 앱 partnerops 항목은 없다', () => {
    // 제거 경위를 적은 주석이 남아 있으므로 코드 본문만 본다.
    expect(code('apps/api-server/src/app-manifests/appsCatalog.ts')).not.toMatch(/appId:\s*'partnerops'/);
  });

  it('partnerops 백엔드 route mount 는 0 이다', () => {
    expect(code('apps/api-server/src/bootstrap/register-routes.ts')).not.toMatch(/\/api\/v1\/partnerops/);
  });
});

describe('C축 — admin-dashboard lint gate', () => {
  const pkg = () => JSON.parse(read('apps/admin-dashboard/package.json'));

  it('lint 스크립트가 실패를 삼키지 않는다 (|| true 부재)', () => {
    expect(pkg().scripts.lint).not.toContain('|| true');
  });

  it('warning ratchet 상한이 선언돼 있다', () => {
    expect(pkg().scripts.lint).toMatch(/--max-warnings\s+\d+/);
  });

  it('lint 대상은 쉘 확장에 흔들리지 않는 디렉터리 인자다', () => {
    // `src/**/*.{ts,tsx}` 는 쉘에 따라 100 파일/545 파일로 갈린다 — 기준선이 환경마다 달라진다.
    expect(pkg().scripts.lint).not.toContain('src/**/*');
    expect(pkg().scripts.lint).toMatch(/eslint .*\bsrc\b/);
  });

  it('CI 가 admin-dashboard lint 를 차단 단계로 실행한다', () => {
    const ci = read('.github/workflows/ci-pipeline.yml');
    expect(ci).toContain('pnpm --filter @o4o/admin-dashboard run lint');
    // continue-on-error 로 무력화하지 않는다
    const idx = ci.indexOf('pnpm --filter @o4o/admin-dashboard run lint');
    expect(ci.slice(idx, idx + 200)).not.toContain('continue-on-error');
  });

  it('저장소 전역 error ratchet 은 그대로 유지된다', () => {
    const s = read('scripts/lint-ratchet.mjs');
    expect(s).toMatch(/ERROR_BASELINE\s*=\s*\d+/);
  });
});
