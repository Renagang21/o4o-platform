/**
 * Partner Application 은퇴 — dead-reference guard
 *
 * WO-O4O-PARTNER-APPLICATION-ENTITY-TABLE-CONTRACT-ROOT-CAUSE-AND-PRODUCTION-CLOSURE-V1
 *
 * 판정: C. LEGACY_OR_DEAD
 *
 * 근거 (조사 시점 실측):
 *   1) route 도달 불가 — `app.use('/api/v1/partner', partnerDashboardRoutes)` 가 먼저 마운트되고
 *      partner-dashboard.routes 가 router 레벨에서 `authenticate + partnerContextGuard` 를 건다.
 *      따라서 `/api/v1/partner/applications` 는 항상 401/403('Partner role required') 로 끝났다.
 *      "파트너가 되려는 사람"에게 "파트너 역할"을 요구하는 논리적 모순.
 *   2) table 부재 — `partner_applications` 는 어떤 schema 에도 없고 migration 도 없다.
 *   3) 프로덕션 호출 0건 (90일).
 *   4) read path 0 — GET/운영자 콘솔이 없어 저장돼도 읽을 수 없는 write-only 였다.
 *   5) canonical 대체 존재 — POST /api/v1/cosmetics/stores/apply
 *      → cosmetics.cosmetics_store_applications → 운영자 검수 콘솔(/operator/applications).
 *
 * 이 guard 는 은퇴한 심볼/경로가 되살아나는 것을 막는다.
 * 되살리려면 이 spec 을 먼저 고치고, 그때 §1(마운트 순서)·§2(migration)·§4(read path)를 함께 해결해야 한다.
 */

import fs from 'fs';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf-8');
const exists = (rel: string) => fs.existsSync(path.join(REPO_ROOT, rel));

describe('WO-O4O-PARTNER-APPLICATION-...-CLOSURE-V1 — dead reference guard', () => {
  const RETIRED_FILES = [
    'apps/api-server/src/modules/partner/entities/PartnerApplication.ts',
    'apps/api-server/src/modules/partner/services/partner-application.service.ts',
    'apps/api-server/src/modules/partner/partner-application.routes.ts',
    'services/web-k-cosmetics/src/pages/partners/ApplyPage.tsx',
    'services/web-k-cosmetics/src/components/onboarding/BusinessOnboardingBanner.tsx',
  ];

  it.each(RETIRED_FILES)('은퇴 파일이 되살아나지 않는다: %s', (rel) => {
    expect(exists(rel)).toBe(false);
  });

  it('entity registry 에 PartnerApplication 이 등록되지 않는다', () => {
    const src = read('apps/api-server/src/database/entities.ts');
    // 주석의 설명 문구는 허용하고, 실제 import/배열 등록만 금지한다.
    const code = src
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    expect(code).not.toMatch(/\bPartnerApplication\b/);
  });

  it('partner 모듈이 PartnerApplication / application routes 를 export 하지 않는다', () => {
    const entIdx = read('apps/api-server/src/modules/partner/entities/index.ts');
    expect(entIdx).not.toMatch(/export .*from '\.\/PartnerApplication\.js'/);

    const modIdx = read('apps/api-server/src/modules/partner/index.ts');
    expect(modIdx).not.toMatch(/export .*partnerApplicationRoutes.*from/);
  });

  it('`/api/v1/partner/applications` 를 다시 마운트하지 않는다', () => {
    const src = read('apps/api-server/src/bootstrap/register-routes.ts');
    const code = src
      .split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');
    expect(code).not.toMatch(/app\.use\(\s*['"]\/api\/v1\/partner\/applications['"]/);
    expect(code).not.toMatch(/\bpartnerApplicationRoutes\b/);
  });

  it('K-Cosmetics 가 은퇴한 /partners/apply 로 라우팅·링크하지 않는다', () => {
    const app = read('services/web-k-cosmetics/src/App.tsx');
    const appCode = app
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    expect(appCode).not.toMatch(/path="partners\/apply"/);

    const gate = read('services/web-k-cosmetics/src/components/auth/MembershipGate.tsx');
    const gateCode = gate
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    // 동작하지 않는 CTA 재도입 방지 — canonical UI 가 생기면 그 경로로 갱신하고 이 단언을 수정한다.
    expect(gateCode).not.toMatch(/['"]\/partners\/apply['"]/);
  });

  it('canonical 대체 축은 살아 있다 (cosmetics store application)', () => {
    const ent = read('apps/api-server/src/routes/cosmetics/entities/cosmetics-store-application.entity.ts');
    expect(ent).toMatch(/@Entity\(\{\s*name:\s*'cosmetics_store_applications'/);

    const ctrl = read('apps/api-server/src/routes/cosmetics/controllers/cosmetics-store.controller.ts');
    expect(ctrl).toMatch(/'\/apply'/);
    expect(ctrl).toMatch(/'\/admin\/applications'/);
  });
});
