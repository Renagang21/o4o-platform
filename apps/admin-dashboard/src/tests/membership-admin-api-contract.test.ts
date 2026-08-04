/**
 * WO-O4O-ADMIN-INDIVIDUAL-API-ACCESS-BOUNDARY-CORRECTION-V1 — 회귀 테스트
 *
 * 이번 수정의 결함은 403(권한)이 아니라 **404(계약 불일치)** 였다.
 *   - method 불일치: 프런트 POST/PATCH ↔ 백엔드 PATCH/PUT
 *   - 접두 중복: `/api/membership/...` → authClient baseURL(`…/api/v1`)과 합쳐져 `/api/v1/api/...`
 *
 * 역할 허용·거부 행렬 자체는 백엔드에서 이미 고정돼 있다
 * (apps/api-server/src/__tests__/membership-admin-guard.spec.ts —
 *  비로그인 거부 / kpa:admin 거부 / platform:admin·platform:super_admin 허용).
 * 따라서 이 테스트는 그 guard 아래에서 **요청이 실제 handler 에 도달하는지**,
 * 즉 프런트 (method, path) 가 백엔드 라우트 정의와 일치하는지를 고정한다.
 *
 * 운영 DB·네트워크를 사용하지 않는다. 소스 파일만 읽는다.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const REPO = join(__dirname, '../../../..');
const page = (p: string) => readFileSync(join(__dirname, '../pages/membership', p), 'utf8');
const backendRoute = (f: string) =>
  readFileSync(join(REPO, 'packages/membership-yaksa/src/backend/routes', f), 'utf8');

/** 주석은 계약이 아니다 — 판정에서 제외한다. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const VERIFICATIONS = 'verifications/VerificationManagement.tsx';
const MEMBER_LIST = 'members/MemberManagement.tsx';
const MEMBER_DETAIL = 'members/MemberDetail.tsx';

/** 백엔드 router 파일에서 (METHOD, router 상대경로) 집합을 뽑는다. */
const backendRoutes = (file: string): Set<string> => {
  const src = stripComments(backendRoute(file));
  const out = new Set<string>();
  for (const [, method, path] of src.matchAll(
    /router\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g,
  )) {
    out.add(`${method.toUpperCase()} ${path}`);
  }
  return out;
};

/** 프런트 호출에서 (METHOD, 경로) 집합을 뽑는다. `${...}` 는 `:param` 으로 정규화. */
const frontendCalls = (file: string): Set<string> => {
  const src = stripComments(page(file));
  const out = new Set<string>();
  for (const [, method, path] of src.matchAll(
    /authClient\.api\.(get|post|put|patch|delete)\(\s*[`'"]([^`'"]+)[`'"]/g,
  )) {
    out.add(`${method.toUpperCase()} ${path.replace(/\$\{[^}]+\}/g, ':param')}`);
  }
  return out;
};

describe('프런트 호출 ↔ 백엔드 라우트 계약 (이번 수정 대상 6건)', () => {
  it('회원 자격 검증 승인·반려는 PATCH /verifications/:id/approve|reject 다', () => {
    const calls = frontendCalls(VERIFICATIONS);
    expect(calls.has('PATCH /membership/verifications/:param/approve')).toBe(true);
    expect(calls.has('PATCH /membership/verifications/:param/reject')).toBe(true);

    // 백엔드에 같은 method·경로가 실제로 존재한다 (문자열 검색만으로 연결 판정하지 않기 위한 대조)
    const routes = backendRoutes('verificationRoutes.ts');
    expect(routes.has('PATCH /:id/approve')).toBe(true);
    expect(routes.has('PATCH /:id/reject')).toBe(true);

    // 수정 전 형태(POST)는 백엔드에 없다 — 되돌리면 404 다
    expect(routes.has('POST /:id/approve')).toBe(false);
    expect(calls.has('POST /membership/verifications/:param/approve')).toBe(false);
  });

  it('회원 수정·검증·활성 토글은 모두 PUT /members/:id 다', () => {
    const routes = backendRoutes('memberRoutes.ts');
    expect(routes.has('PUT /:id')).toBe(true);
    // 백엔드에 PATCH /:id 는 없다. PATCH 는 /:id/verify 뿐이며
    // MemberController.verify → setVerified(id, true) 로 고정돼 검증 해제를 표현할 수 없다.
    expect(routes.has('PATCH /:id')).toBe(false);
    expect(routes.has('PATCH /:id/verify')).toBe(true);

    expect(frontendCalls(MEMBER_LIST).has('PUT /membership/members/:param')).toBe(true);

    const detail = frontendCalls(MEMBER_DETAIL);
    expect(detail.has('PUT /membership/members/:param')).toBe(true);
    expect(detail.has('PATCH /membership/members/:param')).toBe(false);
  });

  it('MemberDetail 의 세 저장 동작이 모두 PUT 으로 나간다', () => {
    const src = stripComments(page(MEMBER_DETAIL));
    const puts = [...src.matchAll(/authClient\.api\.put\(\s*`\/membership\/members\/\$\{[^}]+\}`/g)];
    expect(puts.length).toBe(3); // handleSave / handleToggleVerified / handleToggleActive
    expect(src).not.toMatch(/authClient\.api\.patch\(\s*`\/membership\/members/);
  });
});

describe('접두 중복 재도입 차단', () => {
  // 감사 로그 화면(audit-logs/AuditLogManagement.tsx)에도 같은 접두 결함이 남아 있으나
  // 이번 WO 가 감사 로그 기능을 명시적으로 범위 밖으로 두어 수정하지 않았다.
  // 여기서는 이번에 수정한 세 화면만 고정한다.
  for (const file of [VERIFICATIONS, MEMBER_LIST, MEMBER_DETAIL]) {
    it(`${file} 의 모든 호출 경로가 /membership/ 로 시작한다`, () => {
      const calls = [...frontendCalls(file)];
      expect(calls.length).toBeGreaterThan(0);
      for (const call of calls) {
        const path = call.split(' ')[1];
        expect(path.startsWith('/membership/')).toBe(true);
        expect(path.startsWith('/api/')).toBe(false);
        expect(`https://api.neture.co.kr/api/v1${path}`).not.toContain('/api/api');
      }
    });
  }
});

describe('canonical 접두 주석 — 결함의 원인 기록', () => {
  it('membership routes index 가 실제 마운트 접두를 /api/v1/membership 로 명시한다', () => {
    const src = backendRoute('index.ts');
    expect(src).toContain('/api/v1/membership');
    expect(src).toContain('WO-O4O-ADMIN-INDIVIDUAL-API-ACCESS-BOUNDARY-CORRECTION-V1');
  });

  it('실제 마운트가 /api/v1/membership 임을 register-routes 에서 확인한다', () => {
    const src = readFileSync(
      join(REPO, 'apps/api-server/src/bootstrap/register-routes.ts'),
      'utf8',
    );
    expect(src).toMatch(/app\.use\(\s*['"`]\/api\/v1\/membership['"`]/);
  });
});
