/**
 * WO-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1 §23
 *
 * PharmacyHub LMS learner adoption 의 계약을 고정한다.
 *
 * 이 adoption 의 대원칙은 "PH 전용 LMS 를 만들지 않고 공통 LMS Core/View/API 를
 * 채택한다"(§1·§20·§21) 이다. 따라서 이 spec 은 세 축을 정적으로 고정한다.
 *   (1) 공통 backend 계약이 pharmacy-hub scope 를 이미 수용하는가 (신규 API 0 · migration 0)
 *   (2) PH frontend 가 공통 View/Client 를 채택했는가 (stub · fake success · 전용 구현 0)
 *   (3) 서비스 경계·소유권 계약이 그대로 소비되는가 (§19)
 */

import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.resolve(repoRoot, rel), 'utf8');

const PH_WEB = 'services/web-pharmacy-hub/src';

const phLmsApi = read(`${PH_WEB}/api/lms.ts`);
const phAdapter = read(`${PH_WEB}/pages/education/lmsViewAdapter.ts`);
const phCourseDetail = read(`${PH_WEB}/pages/education/LmsCourseDetailPage.tsx`);
const phLessonPage = read(`${PH_WEB}/pages/education/LmsLessonPage.tsx`);
const phVerifyPage = read(`${PH_WEB}/pages/education/CertificateVerifyPage.tsx`);
const phEnrollmentsPage = read(`${PH_WEB}/pages/account/MyEnrollmentsPage.tsx`);
const phCertificatesPage = read(`${PH_WEB}/pages/account/MyCertificatesPage.tsx`);
const phCreditsPage = read(`${PH_WEB}/pages/account/MyCreditsPage.tsx`);
const phNavItems = read(`${PH_WEB}/pages/account/navItems.ts`);
const phAppTsx = read(`${PH_WEB}/App.tsx`);
const phNavigation = read(`${PH_WEB}/config/navigation.ts`);

const lmsClient = read('packages/lms-client/src/index.ts');
const accountUiIndex = read('packages/account-ui/src/index.ts');
const certificateVerifyView = read('packages/account-ui/src/components/CertificateVerifyView.tsx');
const lessonPlayerView = read('packages/lms-ui/src/views/LessonPlayerView.tsx');

const lmsServiceScope = read('apps/api-server/src/modules/lms/utils/lms-service-scope.ts');
const certificateOwnerGuard = read('apps/api-server/src/modules/lms/utils/lms-certificate-owner-guard.ts');
const enrollmentOwnerGuard = read('apps/api-server/src/modules/lms/utils/lms-enrollment-owner-guard.ts');
const verificationBase = read('apps/api-server/src/modules/lms/utils/certificate-verification-base.ts');

/** 주석은 계약이 아니다 — 금지 패턴 검사는 실제 코드에만 적용한다. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

const phLmsApiCode = stripComments(phLmsApi);
const phAdapterCode = stripComments(phAdapter);

// ─────────────────────────────────────────────────────────────────────────────
// §4·§21·§22 canonical 계약 — 신규 API / 신규 table 0
// ─────────────────────────────────────────────────────────────────────────────

describe('§4·§21·§22 공통 LMS 계약 채택 — PH 전용 backend 신설 0', () => {
  it('공통 LMS scope 계약이 pharmacy-hub 를 이미 수용한다', () => {
    expect(lmsServiceScope).toContain('LMS_SCOPED_SERVICE_KEYS');
    expect(lmsServiceScope).toContain('SERVICE_KEYS.PHARMACY_HUB');
  });

  it('PH client 는 공통 `/lms/*` 만 호출한다 — PH 전용 endpoint 를 만들지 않는다', () => {
    expect(phLmsApiCode).not.toContain('/pharmacy-hub/lms');
    expect(phLmsApiCode).toContain('createLmsLearnerClient(lmsHttp, { serviceKey: PH_SERVICE_KEY })');
    expect(phLmsApiCode).toContain("export const PH_SERVICE_KEY = 'pharmacy-hub'");
  });

  it('PH client 는 다른 서비스 LMS base 를 호출하지 않는다 (§19)', () => {
    for (const other of ['/kpa/lms', '/cosmetics/lms', '/glycopharm/lms', '/neture/lms']) {
      expect(phLmsApiCode).not.toContain(other);
    }
  });

  it('공통 client 가 learner read 에 serviceKey 를 부착한다 (client-side filtering 아님)', () => {
    for (const m of [
      'getEnrollmentByCourse',
      'getMyEnrollments',
      'getQuizForLesson',
      'getAssignmentForLesson',
      'getMyAssignmentSubmission',
      'getMyCertificates',
      'getCertificate',
    ]) {
      expect(lmsClient).toContain(m);
    }
    const scoped = lmsClient.match(/withScope\(/g) ?? [];
    expect(scoped.length).toBeGreaterThanOrEqual(7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §5·§6·§8 adapter stub 제거 / enrollment / progress
// ─────────────────────────────────────────────────────────────────────────────

describe('§5·§6·§8 adapter — null stub · fake success · local-only state 0', () => {
  it('learner port 3종(getEnrollment / enroll / updateProgress)이 실제 API 를 호출한다', () => {
    expect(phAdapterCode).toContain('lmsApi.getEnrollmentByCourse(');
    expect(phAdapterCode).toContain('lmsApi.enrollCourse(');
    expect(phAdapterCode).toContain('lmsApi.updateProgress(');
  });

  it('adapter 에 `=> null` stub 이 남아 있지 않다', () => {
    expect(phAdapterCode).not.toMatch(
      /(getEnrollment|enroll|updateProgress):\s*async\s*\([^)]*\)\s*=>\s*null/,
    );
  });

  it('진도를 localStorage 로 처리하지 않는다 (§8)', () => {
    expect(phAdapterCode).not.toContain('localStorage');
    expect(stripComments(phLessonPage)).not.toContain('localStorage');
  });

  it('enrollment 상태를 하드코딩하지 않는다 (§5)', () => {
    expect(phAdapterCode).not.toMatch(/status:\s*'(enrolled|completed|approved)'/);
  });

  it('수강신청이 비활성으로 남아 있지 않다 (§6)', () => {
    expect(stripComments(phCourseDetail)).not.toContain('enrollmentEnabled: false');
    expect(stripComments(phLessonPage)).not.toContain('enrollmentEnabled: false');
    expect(phCourseDetail).toContain('isAuthenticated');
    expect(phCourseDetail).toContain('onRequireLogin');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §12·§13 Quiz / Assignment — KPA learner flow 에서 실사용되므로 parity 대상
// ─────────────────────────────────────────────────────────────────────────────

describe('§12·§13 Quiz / Assignment — 공통 View 의 port 배선만으로 성립한다', () => {
  it('공통 LessonPlayerView 는 port 유무로 quiz/assignment 를 켠다 (서비스 전용 화면 금지)', () => {
    expect(lessonPlayerView).toContain('port.getQuizForLesson');
    expect(lessonPlayerView).toContain('port.submitQuiz');
    expect(lessonPlayerView).toContain('port.getAssignmentForLesson');
    expect(lessonPlayerView).toContain('port.submitAssignment');
  });

  it('PH adapter 가 quiz·assignment port 를 모두 연결한다', () => {
    for (const m of [
      'getQuizForLesson',
      'submitQuiz',
      'getAssignmentForLesson',
      'getMyAssignmentSubmission',
      'submitAssignment',
    ]) {
      expect(phAdapterCode).toContain(`lmsApi.${m}(`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §7·§11·§15 개인 학습 화면 — 공통 View 채택
// ─────────────────────────────────────────────────────────────────────────────

describe('§7·§11·§15 개인 화면 — @o4o/account-ui 공통 View wrapper', () => {
  it('내 수강 목록은 공통 MyEnrollmentsView 다 (PH 전용 대형 JSX 금지)', () => {
    expect(phEnrollmentsPage).toContain("from '@o4o/account-ui'");
    expect(phEnrollmentsPage).toContain('MyEnrollmentsView');
    expect(phEnrollmentsPage).toContain('lmsApi.getMyEnrollments()');
  });

  it('내 수료증은 공통 MyCertificatesView 다', () => {
    expect(phCertificatesPage).toContain('MyCertificatesView');
    expect(phCertificatesPage).toContain('lmsApi.getMyCertificates(');
    expect(phCertificatesPage).toContain('lmsApi.downloadCertificatePdf(cert.id)');
  });

  it('내 크레딧은 공통 MyCreditsView + service-neutral 원장 계약이다 (§15)', () => {
    expect(phCreditsPage).toContain('MyCreditsView');
    expect(phCreditsPage).toContain("'/credits/me'");
    expect(phCreditsPage).toContain("'/credits/me/transactions'");
  });

  it('세 화면 모두 조회 실패를 빈 목록으로 삼키지 않는다 (Load-Error 계약)', () => {
    for (const src of [phEnrollmentsPage, phCertificatesPage, phCreditsPage]) {
      expect(src).toContain('setError(');
      expect(src).toContain('error={error}');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §10 Certificate — 소유권/보안 계약 재사용 · 공개 검증 화면
// ─────────────────────────────────────────────────────────────────────────────

describe('§10·§19 Certificate — 기존 ownership/security 계약 재사용', () => {
  it('backend 수료증 소유권 가드가 그대로다 (타인 수료증 = 비노출)', () => {
    expect(certificateOwnerGuard).toContain('resolveOwnedCertificateByIdOrRespond');
    expect(certificateOwnerGuard).toContain('404');
  });

  it('backend enrollment 소유권 가드가 그대로다 (§19)', () => {
    expect(enrollmentOwnerGuard).toContain('LMS_ELEVATED_MANAGER_ROLES');
    expect(enrollmentOwnerGuard).toContain('404');
  });

  it('PH 는 자기 검증 도메인을 갖는다 (§21 누락된 serviceKey 매핑 — KPA 로 새지 않는다)', () => {
    expect(verificationBase).toContain("case 'pharmacy-hub':");
    expect(verificationBase).toContain('PHARMACY_HUB_FRONTEND_URL');
  });

  it('공개 검증 화면은 공통 View 로 추출돼 PH 가 wrapper 로만 소비한다', () => {
    expect(accountUiIndex).toContain('CertificateVerifyView');
    expect(certificateVerifyView).toContain('/verify');
    expect(phVerifyPage).toContain('CertificateVerifyView');
    expect(phVerifyPage).toContain('API_BASE_URL');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §17·§18 navigation — deep-link only 금지 / 데드링크 0
// ─────────────────────────────────────────────────────────────────────────────

describe('§17·§18 navigation — 진입점 없는 기능을 남기지 않는다', () => {
  const NEW_ROUTES = [
    '/account/enrollments',
    '/account/certificates',
    '/account/credits',
    '/certificate/verify/:certificateId',
  ];

  it.each(NEW_ROUTES)('%s route 가 App.tsx 에 등재돼 있다', (route) => {
    expect(phAppTsx).toContain(`path="${route}"`);
  });

  it('개인 축은 여전히 /account 다 — /mypage 를 새로 만들지 않는다 (§18)', () => {
    expect(phNavItems).toContain("path: '/enrollments'");
    expect(phNavItems).toContain("path: '/certificates'");
    expect(phNavItems).toContain("path: '/credits'");
    for (const src of [phEnrollmentsPage, phCertificatesPage, phCreditsPage]) {
      expect(src).toContain('basePath="/account"');
      expect(src).toContain('PHARMACY_HUB_ACCOUNT_NAV_ITEMS');
    }
    expect(stripComments(phAppTsx)).not.toContain('path="/mypage"');
  });

  it('교육 메뉴에서 내 수강·내 수료증으로 바로 갈 수 있다 (§17)', () => {
    expect(phNavigation).toContain("href: '/account/enrollments'");
    expect(phNavigation).toContain("href: '/account/certificates'");
  });

  it('learner 화면은 /education 으로 되돌아간다 (다른 서비스 경로로 새지 않는다)', () => {
    for (const src of [phEnrollmentsPage, phCertificatesPage, phCreditsPage]) {
      expect(src).toContain("navigate('/education')");
      expect(src).not.toContain("navigate('/lms')");
    }
  });
});
