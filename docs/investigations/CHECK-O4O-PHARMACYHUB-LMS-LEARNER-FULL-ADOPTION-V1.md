# CHECK-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1

- **WO**: `WO-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1`
- **작업일**: 2026-08-21
- **범위**: PharmacyHub LMS **learner** capability 를 KPA-Society parity 로 채택
- **판정**: `PH_LMS_LEARNER_ADOPTION = COMPLETE`
- **상태**: ACTIVE

---

## 0. 결론 요약

PharmacyHub 의 LMS 는 이번 작업 전 `허브 → 강의 목록 → 강의 상세 → 레슨` 4개만 살아 있었고,
수강신청 이후 동선 전체가 adapter 의 `null` stub 과 `enrollmentEnabled: false` 로 닫혀 있었다.

이번 adoption 은 **PH 전용 LMS 를 만들지 않았다**. 기존 공통 자산
(`@o4o/lms-client` · `@o4o/lms-ui` · `@o4o/account-ui` · 공통 `/api/v1/lms/*`) 을 그대로 소비하고,
PH 쪽에는 adapter 배선 · thin wrapper 화면 · route/navigation 만 추가했다.

- 신규 LMS API: **0** (§21)
- 신규 LMS table / migration: **0** (§22)
- 신규 권한 모델: **0** — 기존 serviceKey scope + ownership guard 를 그대로 소비 (§19)
- PH 전용 enrollment/progress/certificate 구현: **0** (§20)

---

## 1. 완료 census (§3 · §27)

`ADOPTED` = 공통 자산을 채택해 실동작 / `EXCLUDED` = 근거 있는 제외 / `GAP` = 별도 트랙 이관.

| # | Capability | KPA route (참조 구현) | PH route (채택 결과) | 공통 View / Core | frontend client | backend endpoint | 판정 |
|---|---|---|---|---|---|---|---|
| 1 | 교육 허브 | `/lms` | `/education` | `LmsHubTemplate` (`@o4o/shared-space-ui`) | `services/web-pharmacy-hub/src/api/lms.ts` | `GET /lms/courses` | ADOPTED (기존) |
| 2 | 강의 목록 | `/lms` | `/education` | 동일 | 동일 | 동일 | ADOPTED (기존) |
| 3 | 강의 상세 | `/lms/course/:id` | `/education/course/:id` | `CourseDetailView` (`@o4o/lms-ui`) | 동일 | `GET /lms/courses/:id` | ADOPTED (기존) |
| 4 | 레슨 재생 | `/lms/course/:c/lesson/:l` | `/education/course/:c/lesson/:l` | `LessonPlayerView` | 동일 | `GET /lms/lessons/:id` | ADOPTED (기존) |
| 5 | **수강신청 (Enrollment)** | 강의 상세 내 CTA | 강의 상세 내 CTA | `CourseDetailView` (port `enroll`) | `lmsApi.enrollCourse` | `POST /lms/courses/:id/enroll` | **ADOPTED (신규)** |
| 6 | **내 수강 목록** | `/mypage/enrollments` | `/account/enrollments` | `MyEnrollmentsView` (`@o4o/account-ui`) | `lmsApi.getMyEnrollments` | `GET /lms/enrollments/my` | **ADOPTED (신규)** |
| 7 | **진도 (Progress)** | 레슨 화면 | 레슨 화면 | `LessonPlayerView` (port `updateProgress`) | `lmsApi.updateProgress` | `POST /lms/progress` | **ADOPTED (신규)** |
| 8 | **수료 (Completion)** | enrollment 상태 파생 | enrollment 상태 파생 | 공통 View 의 progress/완료 표기 | `lmsApi.getEnrollmentByCourse` | 동일 | **ADOPTED (신규)** |
| 9 | **수료증 (Certificate)** | 발급/다운로드 | 발급/다운로드 | `MyCertificatesView` | `lmsApi.getCertificate` · `downloadCertificatePdf` | `GET /lms/certificates/:id`, `/pdf` | **ADOPTED (신규)** |
| 10 | **내 수료증** | `/mypage/certificates` | `/account/certificates` | `MyCertificatesView` | `lmsApi.getMyCertificates` | `GET /lms/certificates/my` | **ADOPTED (신규)** |
| 11 | **수료증 공개 검증** | `/certificate/verify/:id` | `/certificate/verify/:certificateId` | `CertificateVerifyView` (신규 공통 추출) | 직접 fetch (인증 없음) | `GET /lms/certificates/:id/verify` | **ADOPTED (신규)** |
| 12 | **퀴즈 (Quiz)** | 레슨 화면 (adapter 배선) | 레슨 화면 (adapter 배선) | `LessonPlayerView` (port) | `lmsApi.getQuizForLesson` · `submitQuiz` | `GET /lms/lessons/:id/quiz`, `POST .../submit` | **ADOPTED (신규)** |
| 13 | **과제 (Assignment)** | 레슨 화면 (adapter 배선) | 레슨 화면 (adapter 배선) | `LessonPlayerView` (port) | `lmsApi.getAssignmentForLesson` · `submitAssignment` | `GET /lms/lessons/:id/assignment`, `POST .../submit` | **ADOPTED (신규)** |
| 14 | **이수 학점 (Credits)** | `/mypage/credits` | `/account/credits` | `MyCreditsView` | `api.get('/credits/me')` | `GET /credits/me`, `/me/transactions` | **ADOPTED (신규)** |
| 15 | 강사 프로필 (Instructor Profile) | `/courses/:id` 내 링크 1곳 | — | — | — | `GET /kpa/instructors/:id` (KPA 전용 마운트) | **EXCLUDED** (§14 · 근거 §3-1) |
| 16 | 강사/운영자 콘솔 | `/lms/instructor/*` | — | — | — | `/lms/instructor/*` | **GAP** (§16 · `PH_LMS_OPERATOR_OR_INSTRUCTOR_GAP`) |

### tally (§27)

```
총 capability            : 16
ADOPTED (기존 유지)       : 4
ADOPTED (이번 신규)       : 10
EXCLUDED (근거 있음)      : 1   (강사 프로필)
GAP (별도 트랙 이관)      : 1   (강사/운영자 콘솔 — learner flow 아님)
미조사                   : 0
PARTIAL_ADOPTION         : 0
MISSING_ADOPTION         : 0
P0                       : 0
P1                       : 0
신규 backend API          : 0
신규 table / migration    : 0
```

---

## 2. 판정 근거

### 2-1. §14 강사 프로필 — EXCLUDED

learner-facing 여부를 재확인한 결과 **KPA 에서도 learner 동선이 아니다**.

- 링크 진입점은 `services/web-kpa-society/src/pages/courses/CourseIntroPage.tsx:302` **한 곳뿐**이며,
  이 화면은 LMS learner flow(`/lms/*`)가 아니라 별도 강좌 소개 화면이다.
- backend `InstructorPublicController` 는 **`apps/api-server/src/routes/kpa/kpa.routes.ts:770` 에만 마운트**돼 있고
  **serviceKey 필터가 없다**. PH 에서 소비하면 KPA 강사 데이터를 그대로 노출하게 되어 §19 (cross-service 노출 0) 위반이다.
- 즉 "구현이 어려워서" 가 아니라 **채택 시 서비스 경계를 깨기 때문에** 제외한다.
  PH 강사 프로필이 필요해지면 공통 `/lms/instructors/*` 로 service-neutral 하게 승격하는 별도 WO 가 선행돼야 한다.

### 2-2. §15 이수 학점 — ADOPT (제외하지 않음)

WO 가 요구한 재검증 결과 **실제 user-facing capability** 이며 PH 에서 성립한다.

- KPA(`/mypage/credits`) · K-Cosmetics · GlycoPharm 모두 사용자 화면으로 노출 중이다.
- 원장 API `/api/v1/credits/me`, `/me/transactions` 는 `requireAuth` 만 걸린 **service-neutral 사용자 원장**이다
  (`modules/credit` 전체에 serviceKey 컬럼/필터 없음 — 플랫폼 전역 잔액).
- 적립 경로 `RewardPolicyService.grantRewardWithOutcome → PointService.grantPoint({serviceKey}) → CreditService.earnCredit`
  는 강좌의 `serviceKey` 를 그대로 통과시키므로, **보상이 설정된 PH 강좌는 PH learner 에게 그대로 적립**된다.
- 따라서 화면만 채택하면 성립한다 → `/account/credits` 신설.

### 2-3. §12 · §13 Quiz / Assignment — ADOPT

"backend endpoint 존재만으로 만들지 않는다 / KPA 에서 dead 면 금지" 기준으로 재확인했다.

- KPA 는 **backend 뿐 아니라 learner adapter 에서 실제로 배선**한다:
  `services/web-kpa-society/src/pages/lms/lmsViewAdapter.ts:133 / 152 / 166 / 188`.
- 공통 `LessonPlayerView` 는 `port.getQuizForLesson && port.submitQuiz` 유무로 UI 를 켜는 순수 port 배선이므로,
  PH 는 **화면을 만들지 않고 port 만 연결**하면 parity 가 성립한다.

### 2-4. §16 강사/운영자 콘솔 — `PH_LMS_OPERATOR_OR_INSTRUCTOR_GAP`

`/lms/instructor/*` 는 learner flow 와 분리된 관리 영역이다. WO §16 에 따라 **구현하지 않고 GAP 으로만 기록**한다.
이 항목은 본 WO 완료를 막지 않는다. 후속 트랙(운영자/강사 콘솔 채택)에서 다룬다.

---

## 3. 변경 내역

### 3-1. PharmacyHub (`services/web-pharmacy-hub`)

| 파일 | 변경 |
|---|---|
| `src/api/lms.ts` | `PH_SERVICE_KEY='pharmacy-hub'` 로 `createLmsLearnerClient` 구성. enrollment · progress · quiz · assignment · certificate 메서드 + `downloadCertificatePdf`(blob) |
| `src/api/ai.ts` (신규) | 퀴즈 해설 · 과제 피드백 — 공통 `POST /api/v1/ai/analyze` 소비 |
| `src/pages/education/lmsViewAdapter.ts` | `null` stub 전량 제거. learner port 12종 실배선 |
| `src/pages/education/LmsCourseDetailPage.tsx` · `LmsLessonPage.tsx` | `enrollmentEnabled:false` 제거, `isAuthenticated` · `onRequireLogin` · `certificatesPath` 연결 |
| `src/pages/account/MyEnrollmentsPage.tsx` (신규) | `MyEnrollmentsView` thin wrapper |
| `src/pages/account/MyCertificatesPage.tsx` (신규) | `MyCertificatesView` thin wrapper + PDF 다운로드 |
| `src/pages/account/MyCreditsPage.tsx` (신규) | `MyCreditsView` thin wrapper |
| `src/pages/education/CertificateVerifyPage.tsx` (신규) | `CertificateVerifyView` wrapper (18줄) |
| `src/pages/account/navItems.ts` | 내 수강 · 내 수료증 · 내 크레딧 추가 |
| `src/config/navigation.ts` | 교육 메뉴를 부모로 승격(허브/내 수강/내 수료증) + footer 링크 |
| `src/App.tsx` | route 4개 등재 (`/account/enrollments|certificates|credits`, `/certificate/verify/:certificateId`) |

### 3-2. 공통 패키지 (§20 "필요한 공통화가 부족하면 shared package 를 확장한다")

| 파일 | 변경 | 파급 |
|---|---|---|
| `packages/lms-client/src/index.ts` | enrollment · quiz read 에 `withScope()` 부착, `getAssignmentForLesson` · `getMyAssignmentSubmission` · `getMyCertificates` · `getCertificate` · `submitAssignment` 추가 | **K-Cosmetics · GlycoPharm 도 해당 read 에 serviceKey 를 함께 보낸다** — scope 를 *넓히는* 변경이 아니라 *좁히는* 변경이므로 안전. 두 서비스 typecheck 통과 확인 |
| `packages/account-ui/src/components/CertificateVerifyView.tsx` (신규) | KPA `CertificateVerifyPage` 본문을 공통 View 로 추출 | KPA 화면은 **18줄 wrapper 로 축소**(동작 동일). PH 가 같은 View 를 소비 |

### 3-3. Backend (§21 허용 범위 — 누락된 serviceKey 매핑)

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/lms/utils/certificate-verification-base.ts` | `case 'pharmacy-hub'` 추가. 이전에는 **PH 수료증 PDF 에 kpa-society 검증 URL 이 찍히는 결함**이 있었다 |
| `.../utils/__tests__/certificate-verification-base.test.ts` | PH 도메인 해석 + env override + KPA 로 새지 않음 회귀 케이스 추가 |

신규 라우터 · 신규 테이블 · PH 전용 lifecycle **없음**.

---

## 4. 검증 (§23 · §29)

| 항목 | 결과 |
|---|---|
| `pharmacy-hub-lms-learner-adoption.spec.ts` (신규 · §23) | **26 tests PASS** |
| LMS 보안·회귀 8 suite 합산 실행 | **9 suites / 188 tests PASS** |
| `certificate-verification-base.test.ts` | PASS (PH 케이스 포함) |
| `@o4o/lms-ui` type-check | PASS |
| `@o4o/lms-client` build | PASS (해당 패키지에 jest 스펙 없음) |
| `@o4o/account-ui` build | PASS |
| PharmacyHub `type-check` | PASS |
| PharmacyHub `build` (vite) | PASS (3800 modules) |
| KPA-Society · K-Cosmetics · GlycoPharm `tsc --noEmit` | PASS (공통 client 변경 파급 확인) |
| `apps/api-server` 전체 `tsc --noEmit` | **차단 — 본 WO 무관** (§4-1) |

### 4-1. 본 WO 와 무관한 선행 실패

`apps/api-server` 전체 typecheck 는 `Cannot find module '@o4o/action-log-core'` 로 약 15건 실패한다.
원인은 **다른 세션이 `packages/action-log-core` 패키지 전체를 미커밋 삭제 상태로 두고 있기 때문**이다
(`git status` 에 `D` 7건). WO §31 "다른 세션 WIP/index 무접촉" 및 CLAUDE.md 중지 조건에 따라 **접촉하지 않았다**.
대신 이번에 변경한 backend 파일은 대상 jest 스펙으로 직접 검증했다.

CI 의 `date-fns` 관련 실패(Admin Dashboard) 도 기존 선행 실패이며 lockfile 변경이 필요해 범위 밖이다.

### 4-2. 서비스 경계 (§19) 확인

- PH client 는 `/kpa/lms` · `/cosmetics/lms` · `/glycopharm/lms` 를 호출하지 않는다 (spec 고정).
- 모든 learner read 는 `serviceKey=pharmacy-hub` 를 동반한다 (`withScope`).
- enrollment / certificate 소유권은 기존 `lms-enrollment-owner-guard` · `lms-certificate-owner-guard` 를 **변경 없이** 소비한다
  (존재 → course service scope → owner → 비노출 404).
- 진도는 서버 저장이며 `localStorage` 사용 0 (spec 고정).

---

## 5. 후속 (별도 WO)

| ID | 내용 |
|---|---|
| `PH_LMS_OPERATOR_OR_INSTRUCTOR_GAP` | PH 강사/운영자 LMS 콘솔 채택 (learner flow 아님 · §16) |
| 강사 프로필 service-neutral 승격 | `/kpa/instructors/*` → 공통 `/lms/instructors/*` (serviceKey 필터 신설). 선행 없이는 PH 채택 불가 |
| `@o4o/action-log-core` 삭제건 정리 | 다른 세션 WIP. api-server 전체 typecheck 복구 선행 조건 |

---

## 6. 문서 정합

- 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건 (§5)

---

*작성: 2026-08-21 · WO-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1 §30*
