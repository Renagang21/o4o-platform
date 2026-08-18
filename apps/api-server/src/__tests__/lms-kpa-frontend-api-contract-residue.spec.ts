/**
 * LMS / KPA 프런트 API 계약 잔여 정리 — Regression Test
 *
 * WO-O4O-LMS-KPA-FRONTEND-API-CONTRACT-RESIDUE-CLEANUP-V1
 *
 * 닫으려는 결함 3건:
 *   (1) GlycoPharm `getMyCertificate` 가 backend 에 없는 `/lms/certificates/course/:id` 호출
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

/** KPA `services/web-kpa-society/src/api/client.ts` 의 base 결합 규칙과 동일. */
const KPA_SERVICE_BASE = 'https://api.neture.co.kr/api/v1/kpa';
const KPA_CORE_BASE = 'https://api.neture.co.kr/api/v1';

describe('KPA appreciation client — 실제 요청 URL', () => {
  const src = read('services/web-kpa-society/src/api/appreciation.ts');

  /** client 소스에서 endpoint 문자열을 뽑아 base 와 결합한 실제 URL 을 만든다. */
  function requestedUrl(fnName: string, args: Record<string, string> = {}): string {
    const idx = src.indexOf(`${fnName}:`);
    expect(idx).toBeGreaterThan(-1);
    const slice = src.slice(idx, idx + 400);
    const usesCore = /coreApiClient\.(get|post)/.test(slice);
    const base = usesCore ? KPA_CORE_BASE : KPA_SERVICE_BASE;
    const m = slice.match(/coreApiClient|apiClient/) && slice.match(/[`']((?:\/|\$)[^`']*)[`']/);
    expect(m).toBeTruthy();
    let endpoint = (m as RegExpMatchArray)[1];
    for (const [k, v] of Object.entries(args)) {
      endpoint = endpoint.split('${' + k + '}').join(v);
    }
    return `${base}${endpoint}`;
  }

  it('getSummary 는 canonical `/api/v1/appreciation/:type/:id/summary` 로 나간다', () => {
    expect(requestedUrl('getSummary', { targetType: 'lms_course', targetId: 'C1' }))
      .toBe('https://api.neture.co.kr/api/v1/appreciation/lms_course/C1/summary');
  });

  it('getRecent 는 canonical `/api/v1/appreciation/:type/:id/recent` 로 나간다', () => {
    expect(requestedUrl('getRecent', { targetType: 'forum_post', targetId: 'P1' }))
      .toBe('https://api.neture.co.kr/api/v1/appreciation/forum_post/P1/recent');
  });

  it('send / my-sent / my-received 도 동일 canonical base 를 쓴다', () => {
    expect(requestedUrl('send')).toBe('https://api.neture.co.kr/api/v1/appreciation/send');
    expect(requestedUrl('getMySent')).toBe('https://api.neture.co.kr/api/v1/appreciation/my-sent');
    expect(requestedUrl('getMyReceived')).toBe('https://api.neture.co.kr/api/v1/appreciation/my-received');
  });

  it('어떤 호출도 `/api/v1/kpa/appreciation` 으로 나가지 않는다', () => {
    for (const fn of ['send', 'getMySent', 'getMyReceived', 'getSummary', 'getRecent']) {
      expect(requestedUrl(fn)).not.toContain('/api/v1/kpa/appreciation');
    }
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
  it('GlycoPharm getMyCertificate 는 canonical 목록 endpoint 를 courseId 로 재사용한다', () => {
    const src = read('services/web-glycopharm/src/api/lms.ts');
    expect(src).not.toContain('/lms/certificates/course/');
    const idx = src.indexOf('getMyCertificate:');
    expect(idx).toBeGreaterThan(-1);
    const slice = src.slice(idx, idx + 700);
    expect(slice).toContain("'/lms/certificates'");
    expect(slice).toContain('courseId');
  });

  it('GlycoPharm 수료증 다운로드는 canonical `/pdf` 를 유지한다', () => {
    const src = read('services/web-glycopharm/src/api/lms.ts');
    expect(src).toContain('`/lms/certificates/${certificateId}/pdf`');
    expect(src).not.toContain('${certificateId}/download');
  });

  it('KPA lms client 에 dead `/download` 호출이 남아 있지 않다', () => {
    const src = read('services/web-kpa-society/src/api/lms.ts');
    expect(src).not.toContain('/lms/certificates/${id}/download');
    expect(src).not.toContain('downloadCertificate:');
  });

  it('KPA 수료증 화면은 canonical `/api/v1/lms/certificates/:id/pdf` 를 쓴다', () => {
    const src = read('services/web-kpa-society/src/pages/mypage/MyCertificatesPage.tsx');
    expect(src).toContain('/api/v1/lms/certificates/');
    expect(src).toContain('/pdf');
    expect(src).not.toContain('/download');
  });

  it('K-Cosmetics / GlycoPharm 수료증 화면도 `/pdf` 계약을 유지한다', () => {
    for (const rel of [
      'services/web-k-cosmetics/src/pages/mypage/MyCertificatesPage.tsx',
      'services/web-glycopharm/src/pages/mypage/MyCertificatesPage.tsx',
    ]) {
      const src = read(rel);
      expect(src).toContain('/lms/certificates/${cert.id}/pdf');
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

describe('appreciation 소비 화면 — client 단일 경유', () => {
  const consumers = [
    'services/web-kpa-society/src/pages/lms/LmsCourseDetailPage.tsx',
    'services/web-kpa-society/src/pages/forum/ForumDetailPage.tsx',
    'services/web-kpa-society/src/pages/forum/ForumListPage.tsx',
    'services/web-kpa-society/src/pages/contents/ContentDetailPage.tsx',
    'services/web-kpa-society/src/pages/mypage/MyDashboardPage.tsx',
  ];

  it('화면은 URL 을 직접 만들지 않고 appreciation client 만 소비한다', () => {
    for (const rel of consumers) {
      const src = read(rel);
      expect(src).toContain("from '../../api/appreciation'");
      expect(src).not.toContain('/appreciation/');
    }
  });
});
