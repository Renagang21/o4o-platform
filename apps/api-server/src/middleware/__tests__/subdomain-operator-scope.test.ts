/**
 * 서브도메인 전체 운영자 범위 — WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 테스트가 막는 것
 *
 *   ① 운영자 경로를 `neture:*` 로 되돌리는 것.
 *      주소가 독립이면 운영자 범위도 독립이어야 한다. 되돌리면 Neture 운영자 하나가
 *      supplier · funding 서브도메인까지 다시 열린다.
 *
 *   ② **공급자 사업자 본인의 접근 경계를 이 축으로 바꾸는 것.**
 *      그것은 `organization_members → organizations(type='supplier') → neture_suppliers` 이고
 *      FROZEN 이다(O4O-SUPPLIER-DOMAIN-BOUNDARY-V1 §7). 이 WO 는 건드리지 않았다.
 *      두 축이 서로 다른 질문에 답하므로 인가 축이 갈라지는 것이 아니다.
 *
 *   ③ Neture 제품 DB 경로(products · masters · categories)를 함께 옮기는 것.
 *      그것은 공급자 영역 운영이 아니라 Neture 업무다.
 *
 *   ④ rate limit 제거 (CodeQL js/missing-rate-limiting high).
 */
import * as fs from 'fs';
import { SUPPLIER_SCOPE_CONFIG } from '../supplier-service-scope.middleware.js';
import { FUNDING_SCOPE_CONFIG } from '../funding-service-scope.middleware.js';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf-8');
const codeOnly = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n');

describe('공급자 운영자 경로 = supplier 축', () => {
  const code = codeOnly(read('modules/neture/controllers/admin.controller.ts'));
  const supplierLines = code.split('\n').filter((l) => /router\.\w+\('\/suppliers/.test(l));

  it('9개 경로가 모두 supplier 축으로 판정된다', () => {
    expect(supplierLines).toHaveLength(9);
    for (const line of supplierLines) {
      expect(line).toMatch(/requireSupplierScope\('supplier:admin'\)/);
      expect(line).not.toMatch(/requireNetureScope/);
    }
  });

  it('rate limit 이 붙어 있다 (CodeQL high 9건의 대상이었다)', () => {
    for (const line of supplierLines) expect(line).toMatch(/apiLimiter/);
  });

  it('Neture 제품 DB 경로는 neture 축 그대로다 (함께 옮기지 않았다)', () => {
    const netureLines = code
      .split('\n')
      .filter((l) => /router\.\w+\('\/(products|masters|categories)/.test(l));
    expect(netureLines.length).toBeGreaterThan(0);
    for (const line of netureLines) {
      expect(line).toMatch(/requireNetureScope\('neture:admin'\)/);
      expect(line).not.toMatch(/requireSupplierScope/);
    }
  });
});

describe('공급자 승인 콘솔(/operator/suppliers) = supplier 축', () => {
  // 같은 화면 축(공급자 심사·활성화)의 두 endpoint 가 서로 다른 경계를 쓰면
  // `supplier:admin` 만 가진 계정이 목록은 보고 승인은 못 하는 상태가 된다.
  // governance(/admin/suppliers/*) 만 옮기고 이쪽을 두면 그 상태가 된다.
  const code = codeOnly(read('modules/neture/controllers/operator-supplier.controller.ts'));

  it('supplier 축으로 판정하고 neture 축을 쓰지 않는다', () => {
    expect(code).toContain("requireSupplierScope('supplier:operator')");
    expect(code).not.toContain('requireNetureScope');
  });

  it('admin 축 governance 와 같은 서비스 키를 쓴다 (두 endpoint 가 갈라지지 않는다)', () => {
    const adminCode = codeOnly(read('modules/neture/controllers/admin.controller.ts'));
    expect(adminCode).toContain('requireSupplierScope');
    expect(SUPPLIER_SCOPE_CONFIG.serviceKey).toBe('supplier');
  });

  it('deactivate 는 여기 없다 (operator scope 의 의도적 차이 유지)', () => {
    expect(code).not.toContain("'/suppliers/:id/deactivate'");
  });
});

describe('펀딩 운영자 경로 = funding 축', () => {
  const code = codeOnly(read('routes/market-trial-operator.routes.ts'));

  it('funding 축으로 판정하고 neture 축을 쓰지 않는다', () => {
    expect(code).toMatch(/router\.use\(requireFundingScope\('funding:operator'\) as any\)/);
    expect(code).not.toMatch(/requireNetureScope/);
  });

  it('rate limit 이 붙어 있다', () => {
    expect(code).toMatch(/router\.use\(apiLimiter as any\)/);
  });
});

describe('사업자 본인 축은 건드리지 않았다 (FROZEN §7)', () => {
  it('공급자 identity 미들웨어는 organization_members 관계를 그대로 본다', () => {
    const identity = read('modules/neture/middleware/neture-identity.middleware.ts');
    expect(identity).toMatch(/organization_members/);
    // 새 서비스 역할 축이 사업자 판정에 섞이지 않았다.
    expect(identity).not.toMatch(/supplier:admin|supplier:operator|requireSupplierScope/);
  });

  it('supplier scope guard 는 사업자 판정을 하지 않는다 (역할 축 전용)', () => {
    // 허용 역할은 **값으로** 본다(구성이 공통 팩토리로 옮겨졌다).
    expect(SUPPLIER_SCOPE_CONFIG.allowedRoles).toEqual(['supplier:admin', 'supplier:operator']);
    // 경계 파일과 팩토리 어디에도 조직 소유권 판정이 섞이지 않았다.
    for (const file of [
      'middleware/supplier-service-scope.middleware.ts',
      'middleware/subdomain-operator-scope.ts',
    ]) {
      expect(codeOnly(read(file))).not.toMatch(/organization_members|neture_suppliers/);
    }
  });
});

describe('두 경계가 같은 구성을 공유한다 (중복 0 · mapping 누락 0)', () => {
  /**
   * 종전에는 두 파일이 키 이름만 다른 같은 코드였다(SonarCloud 중복 + 한쪽만 고치는 실수).
   * 이제 `createSubdomainOperatorScope` 하나가 만든다 — 값으로 검사하면 두 경계가 실제로
   * 같은 규칙을 쓰는지 보증된다(소스 문자열 검사보다 강하다).
   */
  it.each([
    ['supplier', SUPPLIER_SCOPE_CONFIG],
    ['funding', FUNDING_SCOPE_CONFIG],
  ])('%s — admin ⊃ operator 매핑이 채워져 있다', (key, config) => {
    // mapping 이 비면 allowedRoles 전체로 fallback 한다 — admin 전용 경로가 operator 에게 열린다.
    expect(config.scopeRoleMapping).toEqual({
      [`${key}:admin`]: [`${key}:admin`],
      [`${key}:operator`]: [`${key}:operator`, `${key}:admin`],
    });
    expect(config.serviceKey).toBe(key);
    expect(config.allowedRoles).toEqual([`${key}:admin`, `${key}:operator`]);
    // 독립 서브도메인이므로 platform:super_admin 은 통과한다 — 역할 부여 전 전면 잠금 방지.
    expect(config.platformBypass).toBe(true);
  });

  it('자기 접두는 차단 목록에 들어가지 않는다 (자기 자신을 막으면 아무도 통과 못 한다)', () => {
    expect(SUPPLIER_SCOPE_CONFIG.blockedServicePrefixes).not.toContain('supplier');
    expect(FUNDING_SCOPE_CONFIG.blockedServicePrefixes).not.toContain('funding');
  });

  it('두 경계는 같은 팩토리를 쓴다 (소스 고정 — 다시 복제되면 실패한다)', () => {
    for (const file of [
      'middleware/supplier-service-scope.middleware.ts',
      'middleware/funding-service-scope.middleware.ts',
    ]) {
      const src = codeOnly(read(file));
      expect(src).toContain("createSubdomainOperatorScope");
      expect(src).not.toContain('createMembershipScopeGuard');
    }
  });
});
