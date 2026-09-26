/**
 * 플랫폼 최고 관리자 **부여** 정식 경로 계약
 *   WO-O4O-SINGLE-GOOGLE-ACCOUNT-ADMIN-OPERATOR-ENROLLMENT-V1 (B1)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 이 경로를 새로 만들었나
 *
 *   `platform:super_admin` 을 **부여**하는 경로가 저장소 어디에도 없었다.
 *     · `/admin/platform-accounts` — 목록 조회 · 활성 토글뿐
 *     · `/admin/operator-assignments` — allowlist 가 `platform:*` 을 **의도적으로 제외**
 *     · `POST /operator/members/:id/roles` — platform admin 요청자에게 assignability 검사를
 *       건너뛰는 틈. 이 틈으로 주는 것은 위 allowlist 경계를 **우회**하는 것이라 채택하지 않았다.
 *
 *   그래서 "플랫폼 계정은 `/settings/admin-accounts` 소관" 이라는 기존 선언에 맞춰
 *   **관리자 전용 부여 경로**를 명시적으로 신설했다.
 *
 * 이 spec 이 고정하는 것
 *   G1 super_admin 이 아니면 부여할 수 없다 (라우터 가드)
 *   G2 대상이 없거나 비활성이면 거절
 *   G3 **Google 연결이 없으면 거절** — Identity 가 Google sub 이므로 로그인 자체가 불가능하다
 *   G4 **멱등** — 이미 보유하면 아무 것도 바꾸지 않는다
 *   G5 부여는 RBAC SSOT(`roleAssignmentService.assignRole`) 한 경로로만
 *   G6 감사 로그를 남긴다
 *   G7 **회수 경로를 만들지 않았다** — 이 WO 는 기존 관리자 역할을 건드리지 않는다
 */
import * as fs from 'fs';
import * as path from 'path';

const ROUTES = path.resolve(__dirname, '..', 'platform-accounts.routes.ts');
const src = fs.readFileSync(ROUTES, 'utf-8');

/** 주석은 계약이 아니다 — 경위를 적은 문장까지 잡으면 가드가 무력화된다. */
const codeOnly = src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !l.trim().startsWith('//'))
  .join('\n');

/** POST /:id/super-admin 핸들러 본문만 잘라낸다 */
function grantHandler(): string {
  const start = codeOnly.indexOf("router.post('/:id/super-admin'");
  expect(start).toBeGreaterThan(-1);
  const next = codeOnly.indexOf('export default router', start);
  return codeOnly.slice(start, next === -1 ? undefined : next);
}

describe('platform:super_admin 부여 — 정식 경로 계약', () => {
  it('가드가 빈 집합으로 통과하지 않는다 (라우트가 실재한다)', () => {
    expect(codeOnly).toContain("router.post('/:id/super-admin'");
  });

  it('G1 super_admin 전용 — requireRole(ADMIN_ACCESS_ROLES) 를 건다', () => {
    expect(grantHandler()).toMatch(/requireRole\(ADMIN_ACCESS_ROLES\)/);
    // ADMIN_ACCESS_ROLES 자체가 super_admin 하나인지도 함께 고정한다.
    expect(codeOnly).toMatch(/const ADMIN_ACCESS_ROLES = \['platform:super_admin'\]/);
  });

  it('G2 대상 부재 404 · 비활성 400 으로 거절한다', () => {
    const h = grantHandler();
    expect(h).toMatch(/code: 'NOT_FOUND'/);
    expect(h).toMatch(/code: 'TARGET_INACTIVE'/);
    expect(h).toMatch(/!target\.isActive/);
  });

  it('G3 Google 연결이 없으면 거절한다 (Identity = Google sub)', () => {
    const h = grantHandler();
    expect(h).toMatch(/LinkedAccount/);
    expect(h).toMatch(/provider: 'google'/);
    expect(h).toMatch(/code: 'GOOGLE_LINK_REQUIRED'/);
  });

  it('G4 멱등 — 이미 보유하면 assignRole 을 부르지 않는다', () => {
    const h = grantHandler();
    const hasCheck = h.indexOf('hasRole(id, SUPER_ADMIN_ROLE)');
    const assign = h.indexOf('assignRole(');
    expect(hasCheck).toBeGreaterThan(-1);
    expect(assign).toBeGreaterThan(-1);
    // 보유 검사가 부여보다 **앞**이고, 그 분기에서 return 한다.
    expect(hasCheck).toBeLessThan(assign);
    expect(h).toMatch(/changed: false/);
    expect(h).toMatch(/changed: true/);
  });

  it('G5 부여는 RBAC SSOT 한 경로로만 한다 (직접 SQL·repository save 없음)', () => {
    const h = grantHandler();
    expect(h).toMatch(/roleAssignmentService\.assignRole\(\{\s*userId: id,\s*role: SUPER_ADMIN_ROLE/);
    expect(h).not.toMatch(/INSERT INTO role_assignments/i);
    expect(h).not.toMatch(/getRepository\(RoleAssignment\)/);
  });

  it('G6 감사 로그를 남긴다 (대상·행위자)', () => {
    const h = grantHandler();
    expect(h).toMatch(/SUPER_ADMIN_GRANTED/);
    expect(h).toMatch(/targetUserId: id/);
    expect(h).toMatch(/actorId/);
  });

  it('G7 회수 경로를 만들지 않았다 (이번 WO 범위 밖)', () => {
    expect(codeOnly).not.toMatch(/router\.delete\([^)]*super-admin/);
    expect(codeOnly).not.toMatch(/removeRole\(/);
  });

  it('기존 계약 회귀 — 목록·상태 토글과 기존 보호가 그대로다', () => {
    expect(codeOnly).toMatch(/router\.get\('\/'/);
    expect(codeOnly).toMatch(/router\.patch\('\/:id\/status'/);
    for (const code of ['SELF_LOCK', 'LAST_SUPER_ADMIN', 'SUPER_ADMIN_ONLY']) {
      expect({ code, kept: codeOnly.includes(code) }).toEqual({ code, kept: true });
    }
  });

  it('operator-assignments allowlist 는 여전히 platform:* 을 제외한다 (우회하지 않았다)', () => {
    const catalog = fs.readFileSync(
      path.resolve(__dirname, '..', '..', '..', 'config', 'operator-role-catalog.ts'),
      'utf-8',
    );
    expect(catalog).not.toMatch(/'platform:[a-z_]+'/);
  });
});
