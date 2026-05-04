# IR-O4O-LMS-CORE-FLOW-CURRENT-STATE-V1

> 조사 전용. 코드/마이그레이션/UI 수정 없음.
> 기준일: 2026-05-03
> 기준 코드: `main` (커밋 `7fd6b8040`)
> 기준 서비스: KPA-Society (LMS reference implementation)

---

## 1. 전체 구조 요약

### 핵심 흐름 (실제 코드 기준)

```
강사 신청 (apply) → 관리자 승인 → lms:instructor 부여
  ↓
강의 생성 (DRAFT)
  ↓ submitForReview
PENDING_REVIEW
  ↓ operator approve / reject
PUBLISHED ↔ REJECTED → (재요청) PENDING_REVIEW
  ↓ unpublish / archive (또는 콘텐츠 수정 시 PUBLISHED → PENDING_REVIEW 자동 회귀)
ARCHIVED / DRAFT
  ↓
수강 신청 (enrollCourse)
  ↓ requiresApproval=false → IN_PROGRESS 즉시
  ↓ requiresApproval=true → PENDING → 강사 approve → APPROVED
학습 진행 (updateLessonProgress)
  ↓ completedLessonIds[] 누적, totalLessons 매번 동적 조회로 progressPercentage 재계산
  ↓ Quiz/Assignment/Live 제출 시 자동 completeLessonProgress 호출
  ↓ 100% 도달 시 자동 status=COMPLETED 전이 (EnrollmentController:247-265)
COMPLETED
  ↓ EnrollmentService.completeEnrollment 자동 체인
CompletionService.createCompletion (CourseCompletion row)
  ↓ 자동 체인
CertificateService.issueCertificate
  ↓ 별도 자동 트리거 (Quiz/Lesson/Course)
PointService.grantPoint → CreditService.earnCredit (referenceKey 중복 방지)
```

### 전체 판정

```
LMS Core 흐름은 대부분 CONNECTED 상태.
2026-04-16 IR(P1 2건)은 WO-O4O-LMS-INTEGRITY-PATCH-V1 로 모두 해결됨.
2026-04-16 ~ 5월 사이에 WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1 도 추가되어
강사 submit-review → 운영자 approve/reject 가 실제 라우트(kpa.routes.ts:556) + 운영자 UI까지 닿아 있음.
가장 큰 문제: Lesson type 별 "완료 조건"이 코드상 미정의 — 모든 lesson이 동일하게 "한 번 호출 = 완료"로 처리됨.
```

판정: **PARTIAL** (Critical 1건, 기능적 흐름은 모두 동작)

---

## 2. 영역별 상태

### 2.1 Course Lifecycle

상태 enum: `DRAFT / PENDING_REVIEW / PUBLISHED / REJECTED / ARCHIVED`
정의: [packages/interactive-content-core/src/entities/Course.ts:28-34](packages/interactive-content-core/src/entities/Course.ts#L28-L34)

현재 동작:
- `createCourse` → DRAFT ([CourseService.ts:111](apps/api-server/src/modules/lms/services/CourseService.ts#L111))
- `submitForReview`: DRAFT/REJECTED → PENDING_REVIEW (강사 권한, [CourseService.ts:329-379](apps/api-server/src/modules/lms/services/CourseService.ts#L329-L379))
- `approveCourse`: PENDING_REVIEW → PUBLISHED (운영자 권한, [CourseService.ts:385](apps/api-server/src/modules/lms/services/CourseService.ts#L385))
- `rejectCourse`: PENDING_REVIEW → REJECTED + reason ([CourseService.ts:438](apps/api-server/src/modules/lms/services/CourseService.ts#L438))
- `unpublishCourse`: PUBLISHED → DRAFT
- `archiveCourse`: any → ARCHIVED
- 콘텐츠 수정 시 PUBLISHED → PENDING_REVIEW 자동 회귀 ([CourseService.ts:248-263, 282-294](apps/api-server/src/modules/lms/services/CourseService.ts#L248-L263))
- 운영자 approve/reject 엔드포인트: [kpa.routes.ts:556, :579](apps/api-server/src/routes/kpa/kpa.routes.ts#L556-L579) — `requireKpaScope('kpa:operator')`
- 운영자 UI: [OperatorLmsCoursesPage.tsx](services/web-kpa-society/src/pages/operator/OperatorLmsCoursesPage.tsx) — approve/reject/unpublish/archive 모두 동작

문제:
- `deleteCourse` = soft delete (ARCHIVED 전이) — 의도된 설계
- ARCHIVED → DRAFT 복구 메서드 부재 — 복구 채널 없음 (실무 영향 낮음)

판정: **OK**

---

### 2.2 Enrollment

상태 enum: `PENDING / APPROVED / REJECTED / IN_PROGRESS / COMPLETED / CANCELLED / EXPIRED`
정의: [packages/education-extension/src/entities/Enrollment.ts:18-26](packages/education-extension/src/entities/Enrollment.ts#L18-L26)

현재 동작:
- 신규 등록: `requiresApproval=false` → 즉시 IN_PROGRESS / `=true` → PENDING ([EnrollmentService.ts:134](apps/api-server/src/modules/lms/services/EnrollmentService.ts#L134))
- 재활성화 (CANCELLED/REJECTED/EXPIRED → IN_PROGRESS): `progressPercentage`, `completedLessons`, `metadata.completedLessonIds[]` 모두 0/[]로 초기화 ([EnrollmentService.ts:84-100](apps/api-server/src/modules/lms/services/EnrollmentService.ts#L84-L100)) — **2026-04-16 IR P1 이슈 해결 확인** (주석: WO-O4O-LMS-INTEGRITY-PATCH-V1)
- 강사 승인: [InstructorController.approveEnrollment:787](apps/api-server/src/modules/lms/controllers/InstructorController.ts#L787) — ownership 체크 후 status=APPROVED
- 강사 거절: [InstructorController.rejectEnrollment:839](apps/api-server/src/modules/lms/controllers/InstructorController.ts#L839)
- 자동 수료: 마지막 lesson 100% 완료 시 자동 COMPLETED ([EnrollmentController.ts:247-265](apps/api-server/src/modules/lms/controllers/EnrollmentController.ts#L247-L265))

문제:
- **APPROVED → IN_PROGRESS 전이 메서드 부재**: `approveEnrollment`이 status=APPROVED로 전이하지만, 이후 학생이 학습을 시작하는 시점에 IN_PROGRESS로 바꿔주는 코드가 명시적이지 않음. `requireEnrollment` 미들웨어는 APPROVED/IN_PROGRESS/COMPLETED 모두 통과시키므로 학습은 가능하지만, 첫 진도 갱신 시 status가 자동 IN_PROGRESS로 가는지가 코드상 모호. 실측 필요.
- `startEnrollment`는 PENDING → IN_PROGRESS만 정의되어 APPROVED 상태와의 관계가 명시되지 않음

판정: **PARTIAL** (등록/완료/재활성화는 정상 동작, APPROVED 단계의 의미가 모호)

---

### 2.3 Progress

저장 구조 (Source of Truth):
- `enrollment.progressPercentage`, `enrollment.completedLessons` (count)
- `enrollment.metadata.completedLessonIds[]` (JSONB 배열, 어떤 lesson을 완료했는지)
- `enrollment.totalLessons` (저장값, 단 매번 갱신은 안 됨)

현재 동작:
- `updateLessonProgress`: `totalLessons`를 매번 DB에서 동적 조회(`isPublished=true` 레슨 수)하여 progressPercentage 재계산 ([EnrollmentController.ts:224-234](apps/api-server/src/modules/lms/controllers/EnrollmentController.ts#L224-L234)) — **2026-04-16 IR P1 totalLessons 동기화 이슈 해결 확인** (주석: WO-O4O-LMS-INTEGRITY-PATCH-V1)
- 100% 도달 시 자동 COMPLETED 전이 → 자동 CompletionService → CertificateService 체인
- `Progress` 엔티티(education-extension)는 lesson 단위 추적용으로 정의되어 있고 Quiz/Assignment/Live 서비스가 write 하지만, **클라이언트가 직접 read 하는 엔드포인트는 없음** — 사실상 dead-write에 가까움 (집계 시 enrollment 메타가 사용됨)

문제:
- 없음 (P1 2건 모두 패치됨)
- 단, lesson 단위 Progress 엔티티가 SOT가 아니라 보조용으로만 쓰이는 것은 향후 dashboard 분석 정밀도(레슨별 이탈 등)에 제약

판정: **OK**

---

### 2.4 Evaluation (Quiz / Assignment / Live)

현재 동작:
- **Quiz**: `submitQuiz` → 자동 채점 → QuizAttempt 저장 → passed=true 시 `completeLessonProgress` 자동 호출 + Credit 지급 (referenceKey `quiz_pass:{userId}:{quizId}`) ([QuizService.ts:162-182](apps/api-server/src/modules/lms/services/QuizService.ts#L162-L182))
- **Assignment**: `upsertAssignment` (1:1 lesson) → `submitAssignment` 호출 시점에 즉시 `completeLessonProgress` 자동 호출 ([AssignmentService.ts:154-158](apps/api-server/src/modules/lms/services/AssignmentService.ts#L154-L158))
- **Live**: `upsertLive` (lesson에 직접 컬럼 저장) → `joinLive` 호출 시점에 즉시 `completeLessonProgress` ([LiveService.ts:138-141](apps/api-server/src/modules/lms/services/LiveService.ts#L138-L141))
- Quiz/Assignment/Live 서비스 모두 Credit 트리거 + Completion 체인까지 연결됨

문제:
- **Lesson type 무시**: `Lesson.type` (`video / article / quiz / assignment / live`) 정의는 있으나 [`updateLessonProgress`](apps/api-server/src/modules/lms/controllers/EnrollmentController.ts#L205-L275)가 type을 참조하지 않음. video/article lesson은 클라이언트가 `updateProgress(lessonId, true)`만 호출하면 완료 처리됨 (콘텐츠 시청 검증 없음)
- **Assignment 채점 미지원**: `submission.status='submitted'`만 존재, `graded`/`returned`/`scored` 등의 상태/점수 컬럼 없음 — 강사가 제출물을 채점/피드백할 채널 없음
- **Video 진도 추적 없음**: 비디오 시청률(예: 80% 이상 시청 시 완료) 추적 메커니즘 부재

판정: **PARTIAL** (3종 평가 모두 흐름은 연결됨, 단 Lesson type별 완료 정책 + Assignment 채점 미정의)

---

### 2.5 Completion / Certificate

현재 동작:
- `completeEnrollment` 호출 시 자동 `CompletionService.createCompletion()` → 자동 `CertificateService.issueCertificate()` ([CompletionService.ts:76](apps/api-server/src/modules/lms/services/CompletionService.ts#L76))
- 중복 방지 이중 (DB `@Unique([userId, courseId])` + 서비스 사전 체크)
- `revoke()` / `renew()` 실제 구현됨 ([CertificateService.ts:246-272](apps/api-server/src/modules/lms/services/CertificateService.ts#L246-L272))
- `CourseCompletion`(완료 사실 기록) 과 `Certificate`(발급 문서) 별개 엔티티
- Certificate 발급 라우트는 `requireKpaAdmin` (operator 수동 발급은 admin만, 자동 발급은 별개 — completion 체인에서 자동 호출)

문제:
- 없음

판정: **OK**

---

### 2.6 Point / Credit

현재 동작:
- 자동 발행 트리거 3종 (모두 referenceKey UNIQUE 중복 방지):
  - Quiz 통과: `quiz_pass:{userId}:{quizId}` ([QuizService.ts:175](apps/api-server/src/modules/lms/services/QuizService.ts#L175))
  - Lesson 완료: `lesson_complete:{userId}:{lessonId}` ([QuizService.ts:294](apps/api-server/src/modules/lms/services/QuizService.ts#L294))
  - Course 완료: `course_complete:{userId}:{courseId}` ([QuizService.ts:348](apps/api-server/src/modules/lms/services/QuizService.ts#L348))
- `Credit` ↔ `Point` 동일 시스템 (PointService = facade, 내부 저장소 `credit_*` 테이블)
- 강사 대시보드에서 수강생별 지급 상태 표시 가능 ([InstructorController.ts:534-546](apps/api-server/src/modules/lms/controllers/InstructorController.ts#L534-L546))
- 운영자 수동 지급 API는 LMS 모듈 외부 (point-operator UI, 별도 commit `9e3b40931`)

문제:
- 없음 (LMS 자동 흐름 기준)

판정: **OK**

---

### 2.7 Instructor Scope

현재 동작 — `InstructorController.ts` 13개 액션 모두 구현:

| # | 액션 | 권한 | 비고 |
|---|------|------|------|
| 1 | `apply` | requireAuth | 강사 신청, 중복 방지 |
| 2 | `listApplications` | requireKpaAdmin | 신청 목록 |
| 3 | `approveApplication` | requireKpaAdmin | 역할 부여(`lms:instructor`) |
| 4 | `rejectApplication` | requireKpaAdmin | |
| 5 | `myCourses` | requireInstructor | |
| 6 | `pendingEnrollments` | requireInstructor | |
| 7 | `dashboardStats(:courseId)` | requireInstructor | KPI 8종, ownership 체크 |
| 8 | `dashboardCourses` | requireInstructor | 강의 요약 통계 N+1 최적화 |
| 9 | `participants(:courseId)` | requireInstructor | 상태/credit 필터, 페이지네이션 |
| 10 | `participantsSummary(:courseId)` | requireInstructor | 보상 운영 요약 |
| 11 | `participantsExport(:courseId)` | requireInstructor | CSV |
| 12 | `approveEnrollment(:id)` | requireInstructor | ownership 체크 |
| 13 | `rejectEnrollment(:id)` | requireInstructor | ownership 체크 |

권한 경계:
- 강사는 `course.instructorId === userId` 인 강의만 접근 (모든 ownership-required 액션에서 일관 체크)
- `kpa:admin`은 모든 강사 강의 우회 접근 가능

문제:
- 없음

판정: **OK**

---

### 2.8 UI 상태

조사 대상: `services/web-kpa-society/src/pages/{lms,instructor,operator}/`

**실제 API 연결된 화면 (전부 lmsApi/lmsInstructorApi/lmsApi.operator* 호출 확인):**

Learner (`/lms/*`):
- `EducationPage` — `lmsApi.getCourses`
- `LmsCoursesPage` — `lmsApi.getCourses`
- `LmsCourseDetailPage` — `getCourse / getLessons / getEnrollmentByCourse / enrollCourse`
- `LmsLessonPage` — `getCourse / getLessons / getLesson / getEnrollmentByCourse / getQuizForLesson / getLiveForLesson / getAssignmentForLesson / getMyAssignmentSubmission / updateProgress / submitQuiz / submitAssignment / joinLive`
- `LmsCertificatesPage` — `getMyCertificates`
- `CertificateVerifyPage` — public verify

Instructor (`/instructor/*`):
- `InstructorDashboardPage` — `instructorApi.getMe / updateProfile`
- `InstructorCourseDashboardPage` — `dashboardCourses / dashboardStats`
- `CourseListPage` — `myCourses`
- `CourseNewPage` — `createCourse`
- `CourseEditPage` — `getCourse / getLessons / updateCourse / submitForReview / archiveCourse / createLesson / updateLesson / deleteLesson / reorderLessons`
- `ContentParticipantsPage` — `participants / participantsSummary / participantsExportUrl`
- `QuizBuilder / AssignmentEditor / LiveEditor` — 각각 upsert/get

Operator (`/operator/lms`):
- `OperatorLmsCoursesPage` — `lmsApi.operatorApprove / operatorReject / operatorUnpublish / operatorArchive`

**더미/placeholder/미구현 UI:**
- `InstructorDashboardPage`의 `FuturePlaceholderCard` ([InstructorDashboardPage.tsx:207](services/web-kpa-society/src/pages/instructor/InstructorDashboardPage.tsx#L207)) — 의도된 "향후 제공 예정" 안내 카드 (콘텐츠 제공 / 설문/퀴즈 항목)
- `InstructorLayout` 사이드바의 "신청/심사 정보", "프로필 관리" 항목 — 의도된 disabled 표시 ([InstructorLayout.tsx:48-60](services/web-kpa-society/src/components/instructor/InstructorLayout.tsx#L48-L60))
- 그 외 mock/dummy data 페이지: **없음** — 모든 instructor/learner/operator LMS 페이지가 실제 API를 호출

판정: **OK** (UI는 이미 Core에 충실히 연결되어 있음)

---

## 3. Critical Issues (3건 이내)

### Critical 1 — Lesson type별 완료 조건 미정의

- 현상: `Lesson.type` 필드(video/article/quiz/assignment/live)는 정의되어 있으나, [`updateLessonProgress`](apps/api-server/src/modules/lms/controllers/EnrollmentController.ts#L205-L275)가 type을 참조하지 않음. 모든 lesson이 동일하게 "한 번 호출 = 완료" 처리됨.
- 영향: video/article lesson은 클라이언트가 임의로 완료 트리거 가능. Quiz/Assignment/Live는 백엔드에서 트리거하므로 안전하지만, 일반 lesson은 콘텐츠 시청 여부와 무관하게 통과됨. 진도/완료/Credit 모두 신뢰성 낮음.
- 영향 범위: 모든 LMS 강의의 video/article lesson 진도 신뢰도

### Critical 2 — Assignment 채점 모델 부재

- 현상: `submission.status`가 `'submitted'`만 존재. 강사 채점/점수/피드백 스키마/엔드포인트가 없음 ([AssignmentService.ts](apps/api-server/src/modules/lms/services/AssignmentService.ts), [Submission.ts](packages/interactive-content-core/src/entities/Submission.ts))
- 영향: Assignment lesson은 사실상 "제출=완료" — 강사가 평가/피드백을 줄 채널이 없음. Quiz는 자동 채점, Live는 출석 트리거로 의미가 있지만 Assignment만 의미 약함.
- 영향 범위: Assignment를 활용한 강의 운영 (현재 KPA-Society 활성 강의 수에 비례)

### Critical 3 — Enrollment APPROVED 상태의 운영 의미 모호

- 현상: `InstructorController.approveEnrollment`가 `status=APPROVED`로 전이하지만, APPROVED → IN_PROGRESS 전이 메서드가 명시되지 않음. `startEnrollment`는 PENDING만 처리. `requireEnrollment` 미들웨어는 APPROVED도 통과시키므로 학습은 가능.
- 영향: 강사가 "승인 대기" 강의를 운영할 때, 승인 후 학생이 어떤 status로 나타나는지 dashboard가 일관되지 않을 수 있음 (APPROVED vs IN_PROGRESS 혼재). 첫 진도 갱신 시 자동 IN_PROGRESS 전이가 들어가는지 코드 미확인 — 실측 필요.
- 영향 범위: `course.requiresApproval=true`로 운영하는 강의 (현재 대부분 false로 추정)

---

## 4. 우선 정비 대상

**우선순위 1 — Lesson type별 완료 조건 정의 (Critical 1 해결)**
- 이유: 모든 강의의 진도/완료/Credit 신뢰도와 직결. 현재는 video/article이 통과되는 구조이므로 시청률 검증 또는 최소 진도 임계값(예: 70%)을 백엔드에서 강제해야 함.

**우선순위 2 — Assignment 채점 모델 도입 (Critical 2 해결)**
- 이유: 운영 의미를 갖는 평가 도구가 되려면 graded 상태/점수/피드백 필요. 현재는 "제출만 받고 끝"인 구조.

**우선순위 3 — Enrollment APPROVED 운영 의미 명확화 (Critical 3 해결)**
- 이유: `requiresApproval=true` 강의의 dashboard 일관성 보장. APPROVED → IN_PROGRESS 자동 전이 보강 또는 dashboard에서 두 상태 통합 표시 정책 결정.

**우선순위 4 (낮음) — Progress 엔티티 활용 또는 정리**
- 이유: education-extension의 `Progress` 엔티티는 write되지만 read되지 않는 dead-write 상태. lesson별 이탈 분석에 활용하거나 제거 필요.

---

## 5. 강사 대시보드와 바로 연결 가능한 항목

### 현재 즉시 연결 가능 (이미 동작 중인 백엔드 API)

| 항목 | API | 현재 화면 연결 |
|------|-----|---------------|
| 강의별 KPI (수강생/완료율/평균 진도/퀴즈 통과율/인증서) | `GET /lms/instructor/dashboard/stats/:courseId` | ✅ `InstructorCourseDashboardPage` |
| 강의 목록 + 요약 통계 (N+1 최적화) | `GET /lms/instructor/dashboard/courses` | ✅ `InstructorCourseDashboardPage` |
| 수강생별 진도/지급 상태 + 필터/검색/CSV | `GET /lms/instructor/participants/:courseId{,/summary,/export}` | ✅ `ContentParticipantsPage` |
| 수강 승인/거절 | `POST /lms/instructor/enrollments/:id/{approve,reject}` | ⚠️ 현재 InstructorCourseDashboardPage에 트리거 UI 없음 — `pendingEnrollments` API는 있으나 화면 미사용 |
| 강사 강의 CRUD + 발행 요청 + 아카이브 | `/lms/courses/*` | ✅ `CourseListPage`, `CourseEditPage`, `CourseNewPage` |
| 퀴즈/과제/라이브 강사 측 CRUD | `/lms/{quizzes,assignments,lessons/:lessonId/live}` | ✅ `QuizBuilder`, `AssignmentEditor`, `LiveEditor` |
| 강사 자격/프로필 | `/instructor` (별도 instructorApi) | ✅ `InstructorDashboardPage` |

### 현재 연결 불가능 / 미구현 백엔드

- **Assignment 채점/피드백**: 백엔드 모델 부재 (Critical 2)
- **레슨별 이탈 분석**: `metadata.completedLessonIds` JSONB 기반이라 인덱스 없음 — 수강자 500명 이상 시 성능 우려 (이전 IR-INSTRUCTOR-DASHBOARD-AUDIT-V1)
- **다강의 통합 대시보드 (강사 전체 합산)**: `dashboardCourses`가 강의별 요약은 주지만 강사 전체 KPI (총 수강생/총 완료/누적 Credit) 단일 응답 없음 — 프론트가 합산
- **강사 ↔ 수강생 메시징**: 메커니즘 없음

---

## 6. 다음 작업 제안 (WO 초안)

### WO-1 — `WO-O4O-LMS-LESSON-TYPE-COMPLETION-RULES-V1`

목적: Lesson type별 완료 조건을 백엔드에서 강제.

범위:
- `EnrollmentController.updateLessonProgress`에서 `lesson.type` 분기 추가
- video: 클라이언트가 보낸 `watchedSeconds`가 `lesson.duration * 0.7` 이상이어야 완료 인정 (또는 type별 정책 테이블)
- article: 클라이언트가 보낸 `dwellTime` 또는 `scrolledRatio` 임계값
- quiz/assignment/live: 기존 흐름 유지 (이미 백엔드 트리거)
- DTO 확장 + 마이그레이션 없음 (메타데이터만 추가)

### WO-2 — `WO-O4O-LMS-ASSIGNMENT-GRADING-V1`

목적: Assignment 강사 채점 모델 도입.

범위:
- `Submission` 엔티티에 `status: 'submitted' | 'graded' | 'returned'`, `score: int | null`, `feedback: text | null`, `gradedAt`, `gradedBy` 컬럼 추가 (마이그레이션 1건)
- `AssignmentController` 에 `gradeSubmission(submissionId)` (instructor) 추가
- 강사 UI: `ContentParticipantsPage` 에 제출물 보기 + 채점 모달 또는 별도 `AssignmentGradingPage` 추가 (선택)
- `submitAssignment` 시 자동 `completeLessonProgress` 호출은 유지 (즉시 진도 인정), 단 Credit은 graded 시점으로 이동(정책 결정 필요)

### WO-3 — `WO-O4O-LMS-INSTRUCTOR-DASHBOARD-CONNECT-V1`

목적: 현재 `/instructor` (강사 대시보드 entry)와 `/instructor/dashboard` (강의 운영 대시보드)의 데이터 연결을 명확히 통합.

범위:
- `/instructor` 메인 페이지에 **강사 전체 합산 카드** 추가 (`dashboardCourses` 응답 합산):
  - 총 강의 수 / 총 수강생 / 평균 완료율 / 누적 Credit
- `pendingEnrollments` 활용한 "승인 대기 수강 신청" 카드 추가 (현재 API는 있으나 UI 없음)
- "강의 운영 대시보드"는 그대로 `/instructor/dashboard`에 유지, 메인에서 진입 버튼만 강조
- 백엔드 변경 없음 (기존 API 조합)

---

## 7. 부록 — 이전 IR과의 관계

| IR | 일자 | 주요 결과 | 현재 상태 |
|----|------|----------|----------|
| `IR-O4O-LMS-END-TO-END-VERIFY-V1` | 2026-04-16 | P0 2건 / P1 3건 → WO-O4O-LMS-ROUTING-INTEGRATION-FIX-V1 으로 해결 | ✅ 본 IR에서 재확인 |
| `IR-O4O-LMS-OPERATIONAL-VALIDATION-V1` | 2026-04-16 | P1 2건 (totalLessons 동기화, 재등록 metadata 미초기화) | ✅ WO-O4O-LMS-INTEGRITY-PATCH-V1 으로 해결 (코드에서 직접 확인) |
| `IR-O4O-LMS-INSTRUCTOR-DASHBOARD-AUDIT-V1` | 2026-04-16 | MVP 즉시 구현 가능 판정 | ✅ MVP 이미 구현 + 운영 중 |
| `WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1` | 2026-04~ | submit-review/approve/reject 흐름 도입 | ✅ 라우트 + 운영자 UI 모두 동작 |

본 IR 결론: **2026-04-16 이후 추가된 패치/Flow WO들이 모두 적용되어, Core 흐름은 거의 정상 상태.**
"UI > Core" 라는 사전 가정과 달리, **Core는 이미 운영 가능한 수준**이며, 강사 대시보드 추가 작업은 완전히 새로운 기능 (Lesson type rules / Assignment grading / 합산 KPI)에 집중하는 것이 효율적.

---

*Status: COMPLETE — Investigation only. No code/DB changes made.*
*Next: 본 IR 결과를 바탕으로 WO-1/2/3 중 우선순위 결정.*
