/**
 * LMS / KPA 프런트 API 계약 잔여 정리 — Regression Test
 *
 * WO-O4O-LMS-KPA-FRONTEND-API-CONTRACT-RESIDUE-CLEANUP-V1
 *
 * 닫으려는 결함 3건:
 *   (1) 서비스 프런트 `getMyCertificate` 가 backend 에 없는 `/lms/certificates/course/:id` 호출
 *   (2) KPA `downloadCertificate` 가 없는 `/lms/certificates/:id/download` 호출 (canonical=`/pdf`)
 *   (3) KPA appreciation client 가 `/api/v1/kpa/appreciation/*` 호출 (canonical=`/api/v1/appreciation/*`)
 *
 * 검증 2계층:
 *   (A) 동작 — KPA `ApiClient` 와 동일한 base 결합 규칙으로 실제 요청 URL 을 spy 로 실측한다.
 *   (B) 정적 회귀 가드 — 프런트 client 소스에서 dead path 재발을 막는다.
 *
 * 프런트 web 서비스에는 test runner 가 없으므로(package.json 에 test script 없음)
 * 저장소 관례대로 api-server jest 에서 계약을 고정한다.
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// (A) 동작 — 실제 요청 URL assert (request spy)
// ─────────────────────────────────────────────────────────────────────────────

// WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1 D7: KPA appreciation client(api/appreciation.ts)와
//   소비 화면(forum · contents · mypage)은 옛 KPA 화면 제거로 삭제됐다. 재도입 시 이 계약을 다시 세운다.
const KPA_APPRECIATION_RETIRED = [
  'services/web-kpa-society/src/api/appreciation.ts',
  'services/web-kpa-society/src/pages/forum/ForumDetailPage.tsx',
  'services/web-kpa-society/src/pages/forum/ForumListPage.tsx',
  'services/web-kpa-society/src/pages/contents/ContentDetailPage.tsx',
  'services/web-kpa-society/src/pages/mypage/MyDashboardPage.tsx',
];

describe('KPA appreciation client — 제거됨 (D7)', () => {
  it.each(KPA_APPRECIATION_RETIRED)('%s 는 존재하지 않는다', (rel) => {
    expect(fs.existsSync(path.join(REPO_ROOT, rel))).toBe(false);
  });
});

describe('backend appreciation mount — 단일 canonical', () => {
  it('`/api/v1/appreciation` 만 mount 되고 서비스 prefix mount 는 없다', () => {
    const src = read('apps/api-server/src/bootstrap/register-routes.ts');
    expect(src).toContain("app.use('/api/v1/appreciation', appreciationRoutes)");
    expect(src).not.toContain("appreciation', appreciationRoutes);\n  app.use('/api/v1/kpa/appreciation");
    expect(src).not.toContain('/api/v1/kpa/appreciation');
  });

  it('summary / recent 는 targetType 화이트리스트 검증을 거친다', () => {
    const controller = read('apps/api-server/src/modules/appreciation/controllers/AppreciationController.ts');
    const summary = controller.slice(controller.indexOf('static async getSummary'));
    const recent = controller.slice(
      controller.indexOf('static async getRecent'),
      controller.indexOf('static async getSummary'),
    );
    for (const slice of [summary, recent]) {
      expect(slice).toContain('APPRECIATION_TARGET_TYPES.includes');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (B) 정적 회귀 가드 — certificate dead path 재발 방지
// ─────────────────────────────────────────────────────────────────────────────

describe('certificate 프런트 계약 — dead path 0', () => {
  it('Lecture 수료증 화면이 `/pdf` 계약을 유지한다 (KCos 수료증 화면은 은퇴 — Lecture Phase 2 §14)', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'services/web-k-cosmetics/src/pages/mypage/MyCertificatesPage.tsx'))).toBe(false);
    for (const rel of [
      'services/web-lecture/src/pages/learner/MyCertificatesPage.tsx',
    ]) {
      const src = read(rel);
      expect(src).toContain('/lms/certificates/${c.id}/pdf');
      expect(src).not.toContain('/download');
    }
  });

  it('backend 에 `/certificates/course/:courseId` · `/certificates/:id/download` 는 존재하지 않는다', () => {
    for (const rel of [
      'apps/api-server/src/modules/lms/routes/lms.routes.ts',
      'apps/api-server/src/routes/kpa/kpa.routes.ts',
    ]) {
      const src = read(rel);
      expect(src).not.toContain('/certificates/course/');
      expect(src).not.toContain('/certificates/:id/download');
    }
  });
});
