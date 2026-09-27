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
    const guard = codeOnly(read('middleware/supplier-service-scope.middleware.ts'));
    expect(guard).toMatch(/allowedRoles: \['supplier:admin', 'supplier:operator'\]/);
    expect(guard).not.toMatch(/organization_members|neture_suppliers/);
  });
});

describe('두 guard 모두 scopeRoleMapping 을 명시한다', () => {
  // mapping 이 비면 allowedRoles 전체로 fallback 한다 — admin 전용 경로가 operator 에게 열린다.
  it.each([
    ['supplier', 'middleware/supplier-service-scope.middleware.ts'],
    ['funding', 'middleware/funding-service-scope.middleware.ts'],
  ])('%s', (key, file) => {
    const guard = codeOnly(read(file));
    // 정규식을 쓰지 않는다 — 대괄호 이스케이프가 한 겹 벗겨지면 문자 클래스로 읽혀 조용히 통과한다.
    expect(guard).toContain(`'${key}:admin': ['${key}:admin'],`);
    expect(guard).toContain(`'${key}:operator': ['${key}:operator', '${key}:admin'],`);
  });
});
