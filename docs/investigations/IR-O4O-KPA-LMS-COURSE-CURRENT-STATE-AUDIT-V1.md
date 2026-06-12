# IR-O4O-KPA-LMS-COURSE-CURRENT-STATE-AUDIT-V1

> **유형:** Read-only 현황 조사 IR (코드/UI/API/DB/route/menu 무변경)
> **목적:** KPA-Society 강의/LMS 기능을 서비스 공통화의 기준선(reference implementation)으로 삼기 전, 현재 구현 상태를 정확히 조사. 공개/회원제 접근제어, 유료 결제 흔적, 레슨·퀴즈·진도·수료, 리워드 지급, 강사/운영자 책임, LIVE/YouTube 잔재, 공통화 경계, Neture 제외를 점검.
> **상위:** CLAUDE.md §13 (O4O 공통 구조 원칙 — forum/lms/signage는 플랫폼 공통 구조, KPA = reference implementation) · §13-A (APP-LMS Baseline Phase 1)
> **작성일:** 2026-06-12

---

## 1. 목적

O4O의 강의 기능은 Neture가 아니라 **서비스 영역(KPA-Society / GlycoPharm / K-Cosmetics)**에 존재한다. KPA-Society 강의가 비교적 잘 구현된 것으로 보이나, 공통화를 시작하기 전 잘못된 구조가 GlycoPharm/K-Cosmetics로 전파되지 않도록 **KPA 기준선을 먼저 검증**한다. 본 IR은 read-only 조사이며 코드/DB/UI/route/API를 변경하지 않는다.

조사 기준: **main · HEAD `cb0277c5e`** (origin 동기화, 본 IR 신규 문서 1건만 생성).

---

## 2. 결론 요약

1. **강의 기능은 4영역(비회원 공개 / 회원 열람 / 강사 운영 / 운영자 관리)으로 분리되어 대부분 완전 구현.** 라우트·역할 가드·메뉴가 명확.
2. **공개/회원제 구분은 견고하게 구현** — `CourseVisibility(PUBLIC|MEMBERS)` × `isPaid` × `requiresApproval` 3축으로 접근을 제어하며, 백엔드 3단계(route `optionalAuth`/`requireAuth` → controller visibility 검증 → `requireEnrollment` 미들웨어)로 방어. **PASS.**
3. **유료 결제는 플랫폼 내 결제 흐름 없음(PASS)** — `isPaid`/`price`/`OrderType.LMS`는 **dormant**(필드만 존재, checkout 경로 없음). UI는 "결제 완료 후 이용 가능" 안내 배지만 노출. 정책 문서가 "강의료는 플랫폼 외부 처리"로 명시.
4. **리워드는 실제 구현됨(PASS)** — `quiz_pass`(20) / `lesson_complete`(10) / `course_complete`(50) credit 자동 지급. `referenceKey` UNIQUE + 앱 레벨 dedup으로 중복 방지, serviceKey 예산 연동, **지급 실패는 catch-warn으로 학습 흐름을 막지 않음**.
5. **LIVE / YouTube 실시간 강의는 사실상 완전 제거(F)** — `liveUrl/liveStartAt/liveEndAt/joinLive/getLiveForLesson/summarizeLive` 전수 검색 0건. lesson type enum은 `VIDEO/ARTICLE/QUIZ/ASSIGNMENT` 4종뿐. `lms-client` 주석에 "assignment, live — Phase 5+ 검토" 향후계획 1건만 잔존(미구현).
6. **공통화 가능** — CourseCard/CourseList/CourseDetail/LessonPlayer/QuizPanel/EnrollmentButton/RewardNotice/ProgressBar/VisibilityBadge 등은 추출 후보. 서비스명·카테고리·역할·문구·리워드 정책은 서비스별 유지.
7. **약점 2건(정밀화 필요):** (a) 퀴즈/레슨 완료 → progress 갱신이 일부 UI 명시 호출 의존(자동 연쇄 약함), (b) course-complete 자동 판정 기준(전 레슨 완료 조건)이 코드상 다소 불명확. 둘 다 BROKEN은 아니며 PARTIAL.

---

## 3. 현재 라우트/메뉴

### 3.1 라우트 (services/web-kpa-society)

| Route | 화면 | 접근 대상 | 인증 | 비고 |
|------|------|----------|:---:|------|
| `/lms` | 강의 허브(목록) | 회원 | 필수 | 검색·페이지네이션 |
| `/lms/course/:id` | 강의 상세 | 회원(MEMBERS는 로그인 필수) | optional | 비회원+MEMBERS → 401 `MEMBERS_ONLY` |
| `/lms/course/:courseId/lesson/:lessonId` | 레슨 학습 | 회원 | 필수 | 문서/동영상/퀴즈/과제 |
| `/lms/certificate` · `/mypage/certificates` | 수료증 | 회원 | 필수 | MyPageGuard |
| `/mypage/enrollments` | 내 수강 | 회원 | 필수 | MyPageGuard |
| `/courses` · `/courses/:courseId` | Course Hub/소개 | 회원(로그인 유도) | optional | 탐색·수강신청 CTA |
| `/certificate/verify/:certificateId` | 수료증 공개 검증 | 비회원 | 불필요 | public verification |
| `/services/lms` · `/guide/features/lms` | 서비스 소개·가이드 | 비회원 | 불필요 | 공개 |
| `/instructor`, `/instructor/courses[/new\|/:id]`, `/instructor/operations[/:courseId]`, `/instructor/courses/:courseId/lessons/:lessonId/submissions` | 강사 영역 | `lms:instructor` / `kpa:admin` / `platform:super_admin` | 필수 | RoleGuard(enforceMembership=false) |
| `/instructors/:userId` | 강사 공개 프로필 | 비회원 | 불필요 | public |
| `/operator/lms` · `/operator/qualification-requests` · `/operator/guide-contents` | 운영자 강의/강사승인/안내문구 | `kpa:operator` / `kpa:admin` / `platform:super_admin` | 필수 | operator 사이드바 LMS 그룹 |

### 3.2 메뉴 노출

- **마이페이지** `pages/mypage/navItems.ts` — 내 수강 / 학습 결과 / 내 자격
- **강사 사이드바** `components/instructor/InstructorLayout.tsx` — 대시보드 / 강의 관리 / 강의 등록 / 강의 운영 (신청·심사·프로필은 `disabled`)
- **운영자 사이드바** `config/operatorMenuGroups.ts` (lms 그룹) — 강의 관리 / 강사 승인 / 안내 문구 관리
- **글로벌 헤더 / 모바일 하단 네비** — `/lms` 진입점

### 3.3 Guard 패턴

`RoleGuard`(allowedRoles + enforceMembership) → 내부 `MembershipGate`(service_membership 활성 확인) / `MyPageGuard`(미로그인 → /login) / `optionalAuth`·`requireAuth`·`requireEnrollment`(백엔드).

---

## 4. 공개 강의/회원제 강의 상태 — **OK**

- **모델:** `CourseVisibility { PUBLIC, MEMBERS }` (기본 MEMBERS), `CourseStatus { DRAFT, PENDING_REVIEW, PUBLISHED, REJECTED, ARCHIVED }`. (`packages/interactive-content-core` Course 엔티티)
- **백엔드 접근제어 (CourseController):**
  - 목록 `GET /lms/courses` (`optionalAuth`) — 비로그인 시 `visibility=PUBLIC` 강제 주입.
  - 상세 `GET /lms/courses/:id` (`optionalAuth`) — 비로그인 + 非PUBLIC → `401 MEMBERS_ONLY`.
- **레슨 접근 (`requireEnrollment` 미들웨어, WO-O4O-LMS-VISIBILITY-ENROLLMENT-INTEGRATION-V1):**

| visibility | isPaid | requiresApproval | 레슨 접근 |
|:---:|:---:|:---:|------|
| PUBLIC | false | false | 로그인만 (enrollment 불필요) |
| PUBLIC | true | — | 승인된 enrollment 필수 |
| MEMBERS | false | false | 로그인만 |
| MEMBERS | false | true | 강사 승인된 enrollment 필수 |
| MEMBERS | true | — | 결제 완료 enrollment 필수 |

- **비회원:** 공개 강의 목록·상세 시청 가능, 레슨/진도/리워드 불가(로그인 필수). **회원 전용 강의는 401로 차단.** 의도된 동작.
- **판정: OK** — 3축 조합으로 12 유형 제어, 백엔드 3단계 방어 실동작.

---

## 5. 유료 강의/결제 흔적 — **PASS (플랫폼 내 결제 없음)**

- `price`(types/index.ts) / `isPaid` / `lms_courses.credits` 필드는 존재하나 **dormant** — `LMS-INSTRUCTOR-ROLE-V1-FREEZE.md`에 "필드 존재, UI 미노출"로 명시.
- `OrderType.LMS`, `LmsPaymentEventHandler`, `EnrollmentService.__fromPayment` 경로는 존재하나 **호출 경로(checkout) 없음** — `serviceKey='lms'` 주문 생성 경로 부재.
- UI: `LmsCourseDetailPage`는 `isPaid` 시 "유료" 배지 + "결제 완료 후 이용 가능합니다" **안내문**만 노출. **결제하기/PG/checkout 버튼 없음.**
- 정책 문서: "강의료는 플랫폼 외부 처리 · 자동 결제/환불 없음 · 결제 UI 연결 금지 · 가격 필드 사용자 노출 금지".
- **판정: PASS** — O4O 내 결제 흐름 없음, 오프라인 수납 정책과 일치. 단 **dormant payment 인프라(OrderType.LMS 등)가 코드에 남아 있어** 향후 오해/재활성 방지를 위한 명시적 표기 유지 권장.

---

## 6. 레슨 구조 — **OK** (LIVE 제외)

- **lesson type enum:** `VIDEO | ARTICLE | QUIZ | ASSIGNMENT` (`interactive-content-core/entities/Lesson.ts`). **LIVE 미정의.** 강사 편집 UI 드롭다운도 4종만.
- **순서/완료:** `Lesson.order` + `Progress.status(NOT_STARTED|IN_PROGRESS|COMPLETED)`. 타입별 완료 메트릭(VIDEO 시청률 / ARTICLE 스크롤·체류 / QUIZ·ASSIGNMENT 제출·점수) — WO-O4O-LMS-LESSON-TYPE-COMPLETION-RULES-V1.
- **본문 저장:** `Lesson.content` JSONB, **HTML string 단일 포맷**(RichTextEditor, `@o4o/content-editor`). WO-KPA-LMS-REMOVE-LEGACY-CONTENT-FORMAT-V1로 포맷 단일화 완료.
- **AI 생성:** 주제/URL → 강의 구조(`/api/ai/course-structure`) + 레슨 본문 초안(`/api/ai/lesson-body`), YouTube URL → embed iframe 자동(`toYouTubeEmbedUrl`). (CourseStructureAiModal / CourseEditPage)
- **판정: OK** — 4 타입 명확, AI 보조 완비, 임시 JSON textarea 편집 잔재 없음.

---

## 7. 퀴즈 구조 — **OK / PARTIAL**

- **UI:** 강사 `QuizBuilder`, 학습자 `LmsLessonPage` 응시. 백엔드 `QuizController` / `QuizService`.
- **채점/통과:** `QuizAttempt`(lms_quiz_attempts) — `passingScore`(기본 70), `calculateScore()` → `passed = score >= passingScore`. `maxAttempts`(null=무제한), `timeLimit`, `showResultsImmediately`/`showCorrectAnswers`.
- **이력:** `QuizAttempt`에 answers(JSONB)/status/score/earnedPoints/attemptNumber/timeSpent 전수 기록 (quizId·userId·status 인덱스).
- **레슨 완료 연결: PARTIAL** — `Quiz.lessonId`로 연결되나 progress 갱신은 일부 UI 명시 `updateProgress` 호출에 의존(자동 연쇄 약함).
- **리워드 연결: OK** — §9 참조. `quiz_pass` 이벤트로 credit 지급(재응시 중복 방지 referenceKey).

---

## 8. 진도/수료/인증서 — **OK / PARTIAL**

- **Enrollment 생성:** 수강신청 시 `EnrollmentService.enrollCourse()` — `requiresApproval` 시 PENDING, 아니면 IN_PROGRESS. progress 0 / totalLessons=발행 레슨 수.
- **Progress 저장:** `education-extension/entities/Progress.ts`(lms_progress, Unique[enrollmentId, lessonId]) — status/timeSpent/completionPercentage/score/quizAnswers/타임스탬프.
- **Course complete: PARTIAL** — `completeEnrollment()`로 status=COMPLETED·100%·completedAt 설정, 이후 `CompletionService.createCompletion()`(Unique로 1회). 다만 **"전 레슨 완료 → 자동 수료" 트리거 조건이 코드상 명시적이지 않음**(명시 호출/연쇄 혼재).
- **Certificate: OK** — `CertificateService.issueCertificate()` 자동 발급(Completion 후), Unique[userId, courseId], `verificationCode`/`verificationUrl` 공개 검증 + 만료 관리. 다운로드 `/lms/certificates/:id/download`.

---

## 9. 리워드/포인트/크레딧 — **PASS**

- **지급 이벤트(자동, QuizService):**

| 이벤트 | 지급 | referenceKey |
|------|:---:|------|
| `quiz_pass` | 20 credit | `quiz_pass:{userId}:{quizId}` |
| `lesson_complete` | 10 credit | `lesson_complete:{userId}:{lessonId}` |
| `course_complete` | 50 credit | `course_complete:{userId}:{courseId}` |

(`credit-constants.ts` 금액, `QuizService.ts` 트리거)

- **중복 방지: PASS** — `credit_transactions.referenceKey` UNIQUE + `CreditService.earnCredit()`/`PointService.grantPoint()` 동일 키 존재 시 null 반환(재응시 재지급 차단).
- **운영자 수동 지급:** `PointAdminController.grant()` — `admin_grant:{userId}:{requestId}` 멱등. (현 단계 정책상 비자동 수동 보상은 제한)
- **serviceKey 예산:** `PointService.grantPoint()` → `ServicePointBudgetService.checkBudget()/deductBudget()`(pessimistic lock + referenceKey UNIQUE). 부족 시 `INSUFFICIENT_BUDGET`. QuizService가 courseServiceKey 동적 해석, null fallback `'kpa-society'`.
- **실패 격리: PASS** — 지급은 try/catch-**warn**, 실패해도 enrollment 상태 전이/완료 반환 정상(학습 흐름 차단 없음).
- **운영자 이력:** `coursePoints(courseId)`(총액·건수·고유사용자·예산부족건수) + `PointAdminController.listTransactions()`.
- **판정: PASS** — 4가지 판정기준(이벤트 명확 / 중복방지 / 실패시 흐름유지 / 이력추적) 모두 충족.

---

## 10. 강사 기능 — **OK** (외부전문가 구분 미지원)

- **신청→승인:** `InstructorApplication`(pending→approved/rejected), `POST /instructor/apply`, `kpa:admin` 승인 시 `lms:instructor` 역할 자동 부여.
- **강의 상태머신:** DRAFT → PENDING_REVIEW(`submitForReview`) → PUBLISHED/REJECTED, `unpublishCourse`/`archiveCourse`. PENDING_REVIEW는 공개 목록 미노출.
- **레슨 CRUD + reorder**, **본인 강의만**(`isOwnerOrAdmin`: instructorId===userId or kpa:admin, 타인 403).
- **신분: 회원만 지원** — 비회원/외부 전문가 별도 구분 미구현(organizationId 조직 강사는 가능).

---

## 11. 운영자 기능 — **OK** (리워드 정책 관리 UI 부분)

- 강의 목록(전 상태) / 승인·반려(+rejectionReason) / unpublish·archive·(archived만)완전삭제 — `OperatorLmsCoursesPage`.
- 강사 신청 승인·거절(`/instructor/applications`), 수강자 목록(`participants` — 이름·이메일·진도·상태·수료·크레딧, 필터/검색), 완료자(status 필터), 퀴즈 제출 조회·채점(`listLessonSubmissions`/`gradeSubmission`).
- 포인트 지급 내역 조회(`coursePoints`). **리워드 정책(금액/조건) 생성·수정 UI는 미발견** — 금액은 `credit-constants.ts` 상수. (정책 관리가 필요한지 후속 판단)

---

## 12. LIVE/YouTube 흔적 — **F(완전 제거)**

- `liveUrl / liveStartAt / liveEndAt / joinLive / getLiveForLesson / summarizeLive` 전수 검색 **0건**.
- lesson type enum에 **LIVE 없음**, 마이그레이션 lms 테이블에 live 컬럼 없음, UI 드롭다운 4종만.
- 잔존: `packages/lms-client/src/index.ts` 주석 1건 — "assignment, live — Phase 5+ 검토"(향후계획, 미구현).
- YouTube는 **레슨 동영상 embed 용도로만** 사용(실시간 스트리밍 아님) — 제거 대상 아님.
- **분류 = F.** 사용자/강사/운영자 화면 노출 없음. 정비 작업 불요(주석 1건만 후속 정리 후보).

---

## 13. 공통화 가능 영역 (KPA 기준)

| 후보 컴포넌트 | 출처 | 공통화 난이도 |
|------|------|:---:|
| Card / HubEntityCard | `components/common/` | 낮음(이미 service-neutral) |
| CourseCard | `components/education/LectureCard.tsx` 기반 | 중(강사명·메타 분리) |
| CourseList / CourseDetail / LessonPlayer | `pages/lms/*`, `pages/courses/*` | 중 |
| QuizPanel | `QuizBuilder` + 응시 UI | 중 |
| EnrollmentButton | `CourseIntroPage` CTA 로직 | 낮음 |
| ProgressBar / CourseVisibilityBadge / RewardNotice | LectureCard 내부 | 낮음 |
| InstructorCourseList / OperatorCourseTable | 강사·운영자 테이블 | 중 |

**서비스별 유지:** 서비스명/언어, 강의 카테고리, 대상 회원 역할, 안내 문구, 리워드 정책(금액·조건), 메뉴 위치, 포인트/학점 특화.

**선행 정렬 권장(공통화 전):** (a) 퀴즈·레슨 완료 → progress 자동 갱신 일원화, (b) course-complete 자동 판정 기준 명시화, (c) dormant payment 인프라 표기 유지. 타입은 `@o4o/lms-client` 활용(WO-O4O-LMS-V2-COMMONIZATION-CLEANUP-V1 선상).

---

## 14. Neture 제외 확인

- 본 조사 범위에 Neture 강의 수강 기능은 포함하지 않으며, **Neture에는 강의 메뉴/수강 기능을 두지 않는다**(공급자·파트너·운영 기반 서비스).
- Neture 공급자가 강의 **원천 자료 제공자**가 될 수는 있으나(제품 교육 자료), **수강 기능 자체는 서비스(KPA/GP/KCos) 측 기능**이다.
- 공통화 시 **Neture는 LMS 공통화 대상에서 제외**한다(메뉴·라우트·컴포넌트 적용 금지). 후속 공통화 WO의 명시적 가드 항목으로 둔다.

---

## 15. 위험 요소

| # | 위험 | 수준 | 대응 |
|---|------|:---:|------|
| R1 | dormant payment 인프라(OrderType.LMS / `__fromPayment` / price 필드)가 코드에 잔존 → 향후 오해·우발적 재활성 | 중 | 표기·주석 유지, 공통화 시 결제 경로 금지 가드 |
| R2 | 퀴즈·레슨 완료 → progress 갱신이 UI 명시 호출 의존(자동 연쇄 약함) → 서비스 확장 시 누락 가능 | 중 | 공통화 선행으로 progress 갱신 일원화 |
| R3 | course-complete 자동 판정 기준(전 레슨 완료 조건) 코드상 불명확 | 중 | 판정 로직 명시화 후 공통 추출 |
| R4 | 리워드 금액 상수 하드코딩(`credit-constants.ts`), 정책 관리 UI 부재 → 서비스별 금액 차등 시 분기 필요 | 낮음 | 서비스별 리워드 정책을 config로 외부화 검토 |
| R5 | 강사 신분이 회원으로 한정 → 외부 전문가 강사 요구 시 구조 확장 필요 | 낮음 | 요구 발생 시 별도 WO |
| R6 | 공통화 시 Neture 오염 가능성 | 중 | §14 제외 가드 명문화 |

---

## 16. 후속 WO 제안

- **WO-1 `WO-O4O-KPA-LMS-COURSE-BASELINE-CLEANUP-V1`** (KPA-Society 한정 기준선 정비)
  - 공개/회원제 표현 정리, 유료 결제 오해 UI 점검(안내문구만 유지), 오프라인 수강료 안내 정돈
  - progress 자동 갱신 일원화(R2) + course-complete 판정 명시화(R3)
  - dormant payment 표기 유지(R1), LIVE 잔존 주석 1건 정리(§12)
  - **금지:** Neture 강의 추가 / GP·KCos 동시 수정 / 공통 패키지 추출 / DB·enum 삭제 / 결제 기능 추가

- **WO-2 `WO-O4O-LMS-COMMONIZATION-BOUNDARY-IR/EXTRACTION`** (LMS 공통 UI/Core 추출 가능성 정리)
  - §13 후보의 추출 경계 확정, 서비스별 유지 항목 분리, `@o4o/lms-client` 정렬

- **WO-3 `WO-O4O-LMS-SERVICE-EXTENSION-APPLY`** (GlycoPharm/K-Cosmetics 적용)
  - KPA 정비 완료 후 적용, 서비스별 카테고리·역할·문구·리워드 정책 주입, **Neture 제외 가드 검증(CHECK)**

---

## 최종 보고 요약

- **수정 파일 없음** (신규 IR 문서 1건만 생성)
- **생성 문서:** `docs/investigations/IR-O4O-KPA-LMS-COURSE-CURRENT-STATE-AUDIT-V1.md`
- **조사 기준 commit:** `cb0277c5e` (main, origin 동기화)
- **공개/회원제:** OK — visibility×isPaid×requiresApproval 3축, 백엔드 3단계 방어
- **유료 결제:** PASS — 플랫폼 내 결제 없음, dormant 인프라만 존재, 오프라인 안내 정책
- **레슨/퀴즈/진도/수료:** OK(일부 PARTIAL — progress 자동갱신·수료 자동판정), 본문 HTML 단일포맷 + AI 보조
- **리워드:** PASS — quiz_pass/lesson_complete/course_complete credit 지급, referenceKey 중복방지, serviceKey 예산, 실패 격리
- **강사/운영자:** OK — 신청→승인→상태머신, 본인 강의 한정, 운영자 승인·반려·수강자·채점·포인트 이력 (리워드 정책 관리 UI는 부분)
- **LIVE/YouTube:** F(완전 제거) — API/필드/enum 0건, 주석 1건 잔존
- **공통화:** 9개 컴포넌트 후보 / 서비스별 유지 항목 분리 / **Neture 제외**
- **후속 WO:** WO-1 KPA 기준선 정비 → WO-2 공통 추출 경계 → WO-3 GP·KCos 적용(Neture 제외 CHECK)
- **git status:** read-only IR, 다른 세션 WIP 미접촉
