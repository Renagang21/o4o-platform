/**
 * PharmacyHub LMS learner surface — 은퇴 계약 (Regression Test)
 *
 * 이력:
 *  - WO-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1: PH 가 공통 LMS 계약(client/ui/account-ui)을 채택한 상태를 고정했다.
 *  - WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2 §14·§15·§17:
 *    LMS runtime surface 는 독립 강의 서비스(`services/web-lecture` · study.neture.co.kr) 단일 소유로 전환.
 *    PH 의 학습자/강사/운영자 LMS 화면·client 는 삭제되고, 기존 URL 은 공개 링크(외부 이동)로만 남는다.
 *    backend 공통 LMS 계약(scope · ownership guard)은 그대로 재사용된다(§10 LMS Core 재사용).
 *
 * 프런트 web 서비스에는 test runner 가 없으므로 저장소 관례대로 api-server jest 에서 계약을 고정한다.
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
const exists = (rel: string) => fs.existsSync(path.join(REPO_ROOT, rel));

const PH_WEB = 'services/web-pharmacy-hub/src';
const phAppTsx = read(`${PH_WEB}/App.tsx`);
const phNavigation = read(`${PH_WEB}/config/navigation.ts`);
const phNavItems = read(`${PH_WEB}/pages/account/navItems.ts`);
const phCreditsPage = read(`${PH_WEB}/pages/account/MyCreditsPage.tsx`);
const phOperatorMenu = read(`${PH_WEB}/config/operatorMenuGroups.ts`);

describe('§14 PH LMS surface 0 — 화면·client 삭제', () => {
  it.each([
    `${PH_WEB}/api/lms.ts`,
    `${PH_WEB}/api/ai.ts`,
    `${PH_WEB}/pages/education`,
    `${PH_WEB}/pages/instructor`,
    `${PH_WEB}/pages/account/MyEnrollmentsPage.tsx`,
    `${PH_WEB}/pages/account/MyCertificatesPage.tsx`,
    `${PH_WEB}/pages/operator/OperatorLmsCoursesPage.tsx`,
  ])('%s 는 존재하지 않는다', (rel) => {
    expect(exists(rel)).toBe(false);
  });

  it('PH 소스에 `/lms/` API 호출 · lms-client 소비가 남아 있지 않다', () => {
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
        const p = path.join(dir, d.name);
        return d.isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(d.name) ? [p] : [];
      });
    const offenders = walk(path.join(REPO_ROOT, PH_WEB)).filter((p) => {
      const src = fs.readFileSync(p, 'utf8');
      return /['"`]\/lms\//.test(src) || src.includes("from '@o4o/lms-client'") || src.includes("from '@o4o/lms-ui'");
    });
    expect(offenders.map((p) => path.relative(REPO_ROOT, p))).toEqual([]);
  });

  it('operator 메뉴에 강의 관리(/operator/lms)가 없다 — LMS 운영은 Lecture Operator 소유', () => {
    expect(phOperatorMenu).not.toContain("'/operator/lms'");
  });
});

describe('§15·§17 기존 URL 은 공개 링크(외부 이동)로만 남는다 — cross-service 진입 0', () => {
  it('LECTURE_SERVICE_URL 은 study.neture.co.kr 이다', () => {
    expect(phNavigation).toContain("export const LECTURE_SERVICE_URL = 'https://study.neture.co.kr'");
  });

  it('/education/* · /instructor/* 는 Lecture 로 외부 이동한다', () => {
    expect(phAppTsx).toMatch(/path="\/education\/\*"[^\n]*LectureExternalRedirect/);
    expect(phAppTsx).toMatch(/path="\/instructor\/\*"[^\n]*LectureExternalRedirect/);
    expect(phAppTsx).toContain('window.location.replace(`${LECTURE_SERVICE_URL}${path}`)');
  });

  it('/account/enrollments · /account/certificates 는 Lecture /my/* 로 외부 이동한다', () => {
    expect(phAppTsx).toMatch(/path="\/account\/enrollments"[^\n]*LectureExternalRedirect path="\/my\/enrollments"/);
    expect(phAppTsx).toMatch(/path="\/account\/certificates"[^\n]*LectureExternalRedirect path="\/my\/certificates"/);
  });

  it('/certificate/verify/:id 는 Lecture 공개 검증으로 외부 이동한다 (§17 · PH 자체 검증 도메인 없음)', () => {
    expect(phAppTsx).toMatch(/path="\/certificate\/verify\/:certificateId"[^\n]*LectureCertificateVerifyRedirect/);
    expect(phAppTsx).toContain('`${LECTURE_SERVICE_URL}/certificates/verify/${encodeURIComponent(certificateId');
  });

  it('개인 축 nav · Footer 에 내 수강/내 수료증 항목이 없다 (진입점 = 외부 링크뿐)', () => {
    expect(phNavItems).not.toContain('/account/enrollments');
    expect(phNavItems).not.toContain('/account/certificates');
    expect(phNavigation).not.toContain("'/account/enrollments'");
    expect(phNavigation).not.toContain("'/account/certificates'");
    expect(phNavigation).not.toContain("'/education'");
  });

  it('내 크레딧 화면은 남되 학습 CTA 는 Lecture 외부 링크다', () => {
    expect(phCreditsPage).toContain('window.location.assign(LECTURE_SERVICE_URL)');
    expect(phCreditsPage).not.toContain("navigate('/education')");
  });
});

describe('§10 backend 공통 LMS 계약 재사용 — PH 전용 backend 0', () => {
  it('공통 scope · ownership guard 는 그대로다', () => {
    expect(exists('apps/api-server/src/modules/lms/utils/lms-service-scope.ts')).toBe(true);
    expect(exists('apps/api-server/src/modules/lms/utils/lms-certificate-owner-guard.ts')).toBe(true);
    expect(exists('apps/api-server/src/modules/lms/utils/lms-enrollment-owner-guard.ts')).toBe(true);
  });

  it('pharmacy-hub routes 에 LMS 위임 경로가 없다', () => {
    const phRoutes = read('apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts');
    expect(phRoutes).not.toMatch(/['"]\/lms['"]/);
    expect(phRoutes).not.toContain('FROM lms_courses');
  });

  it('수료증 검증 링크는 Lecture 단일 base 다 (§17 — 서비스별 도메인 분기 없음)', () => {
    const base = read('apps/api-server/src/modules/lms/utils/certificate-verification-base.ts');
    expect(base).toContain("'https://study.neture.co.kr'");
    expect(base).not.toContain('pharmacyhub.co.kr');
    expect(base).not.toContain('kpa-society.co.kr');
  });
});
