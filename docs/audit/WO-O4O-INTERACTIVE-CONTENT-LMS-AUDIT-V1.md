# WO-O4O-INTERACTIVE-CONTENT-LMS-AUDIT-V1

> **조사 유형**: Read-Only Code Audit (코드 변경 없음)
> **작성일**: 2026-03-11
> **목적**: LMS 시스템을 Interactive Content Core / Education Extension으로 분리 가능성 조사

---

## 1. LMS 전체 구조 요약

### 1.1 Entity 전체 목록 (14개)

| # | Entity | 테이블 | 영역 | import 의존 |
|---|--------|--------|------|------------|
| 1 | Course | lms_courses | Content | 없음 (자체완결) |
| 2 | Lesson | lms_lessons | Content | Course |
| 3 | Quiz | lms_quizzes | Content | 없음 (자체완결) |
| 4 | QuizAttempt | lms_quiz_attempts | Content | 없음 (자체완결) |
| 5 | Survey | lms_surveys | Content | 없음 (자체완결) |
| 6 | SurveyQuestion | lms_survey_questions | Content | 없음 (자체완결) |
| 7 | SurveyResponse | lms_survey_responses | Content | 없음 (자체완결) |
| 8 | ContentBundle | lms_content_bundles | Content | 없음 (자체완결) |
| 9 | Enrollment | lms_enrollments | Education | Course |
| 10 | Progress | lms_progress | Education | Enrollment + Lesson |
| 11 | Certificate | lms_certificates | Education | Course |
| 12 | LMSEvent | lms_events | Education | Course |
| 13 | Attendance | lms_attendance | Education | LMSEvent |
| 14 | InstructorApplication | lms_instructor_applications | Education | 없음 |

### 1.2 Service 전체 목록

| Service | 위치 | 의존 서비스 |
|---------|------|-----------|
| CourseService | modules/lms/services/ | 없음 |
| LessonService | modules/lms/services/ | 없음 |
| QuizService | modules/lms/services/ | 없음 |
| SurveyService | modules/lms/services/ | 없음 |
| ContentBundleService | packages/lms-core/src/ | 없음 |
| EnrollmentService | modules/lms/services/ | **CourseService** |
| ProgressService | modules/lms/services/ | **EnrollmentService** |
| CertificateService | modules/lms/services/ | **CourseService + EnrollmentService** |
| EventService | modules/lms/services/ | 없음 |
| AttendanceService | modules/lms/services/ | **EventService** |

### 1.3 Controller 전체 목록

| Controller | 위치 | Endpoints |
|------------|------|-----------|
| CourseController | modules/lms/controllers/ | 8 |
| LessonController | modules/lms/controllers/ | 6 |
| QuizController | modules/lms/controllers/ | 18 |
| SurveyController | modules/lms/controllers/ | 19 |
| EnrollmentController | modules/lms/controllers/ | 8 |
| ProgressController | modules/lms/controllers/ | 7 |
| CertificateController | modules/lms/controllers/ | 9 |
| EventController | modules/lms/controllers/ | 8 |
| AttendanceController | modules/lms/controllers/ | 6 |
| **총합** | | **89+ (+ Marketing 20+)** |

### 1.4 의존 관계 다이어그램

```
┌─────────────────────────────────────────────────┐
│               Interactive Content               │
│                                                 │
│  Course ─────── Lesson                          │
│    (자체완결)      (→ Course)                    │
│                                                 │
│  ContentBundle                                  │
│    (자체완결)                                    │
│                                                 │
│  Quiz ────── QuizAttempt                        │
│    (자체완결)   (자체완결)                        │
│                                                 │
│  Survey ──── SurveyQuestion ──── SurveyResponse │
│    (자체완결)   (자체완결)         (자체완결)      │
│                                                 │
└──────────┬──────────────────┬───────────────────┘
           │                  │
           ▼                  ▼
┌─────────────────────────────────────────────────┐
│               Education Extension               │
│                                                 │
│  Enrollment ──→ Course                          │
│       │                                         │
│       ▼                                         │
│  Progress ──→ Enrollment + Lesson               │
│                                                 │
│  Certificate ──→ Course                         │
│                                                 │
│  LMSEvent ──→ Course                            │
│       │                                         │
│       ▼                                         │
│  Attendance ──→ LMSEvent                        │
│                                                 │
│  InstructorApplication (자체완결)                │
│                                                 │
└─────────────────────────────────────────────────┘
```

**의존 방향: Education → Content (단방향)**
Content 영역은 Education 영역을 import하지 않는다.

---

## 2. Interactive Content 영역

### 2.1 Entity

#### Course.ts

```
위치: packages/lms-core/src/entities/Course.ts
테이블: lms_courses
마이그레이션: 001-create-lms-tables.ts
```

**주요 필드:**

| 필드 | 타입 | 용도 |
|------|------|------|
| id | UUID | PK |
| title, description | string | 콘텐츠 정보 |
| thumbnail | varchar(500) | 이미지 |
| level | BEGINNER/INTERMEDIATE/ADVANCED | 난이도 |
| status | DRAFT/PUBLISHED/ARCHIVED | 발행 상태 |
| duration | integer | 소요 시간(분) |
| instructorId | UUID → User | 강사 |
| organizationId | UUID → Organization | 조직 |
| isOrganizationExclusive | boolean | 조직 전용 |
| credits | decimal(5,2) | 이수 학점 |
| isPaid | boolean | 유료 여부 |
| price | decimal(10,2) | 가격 |
| tags | simple-array | 태그 |
| metadata | jsonb | 메타데이터 |

**Helper Methods:** `isActive()`, `isFull()`, `canEnroll()`, `publish()`, `archive()`

**참고:** `currentEnrollments`, `maxEnrollments`, `requiresApproval` 필드는 Education 개념이지만 Course 엔티티에 포함

---

#### Lesson.ts

```
위치: packages/lms-core/src/entities/Lesson.ts
테이블: lms_lessons
마이그레이션: 001-create-lms-tables.ts
의존: Course (import + FK)
```

**주요 필드:**

| 필드 | 타입 | 용도 |
|------|------|------|
| id | UUID | PK |
| courseId | UUID → Course | FK (CASCADE) |
| title, description | string | 콘텐츠 정보 |
| type | VIDEO/ARTICLE/QUIZ/ASSIGNMENT/LIVE | 레슨 유형 |
| content | jsonb | Block Editor JSON |
| videoUrl, videoDuration | string, int | 비디오 |
| attachments | jsonb[] | 첨부파일 |
| order | integer | 순서 |
| quizData | jsonb | 인라인 퀴즈 |
| isPublished, isFree | boolean | 발행/무료 |
| requiresCompletion | boolean | 완료 필수 |

**Helper Methods:** `hasVideo()`, `hasQuiz()`, `getEstimatedTime()`

---

#### Quiz.ts

```
위치: packages/lms-core/src/entities/Quiz.ts
테이블: lms_quizzes
마이그레이션: 없음 (synchronize:true로 생성)
의존: 없음 (자체완결)
```

**주요 필드:**

| 필드 | 타입 | 용도 |
|------|------|------|
| id | UUID | PK |
| title, description | string | 콘텐츠 정보 |
| questions | jsonb[] | QuizQuestion 배열 |
| isPublished | boolean | 발행 상태 |
| bundleId | UUID (nullable) | ContentBundle 연결 |
| courseId | UUID (nullable) | Course 연결 (선택적) |
| passingScore | integer | 합격 점수 (기본 70) |
| timeLimit | integer | 시간 제한(분) |
| maxAttempts | integer | 최대 시도 횟수 |
| createdBy | UUID | 작성자 |

**QuizQuestion 인터페이스:**
```typescript
interface QuizQuestion {
  id: string;
  question: string;
  type: 'single' | 'multi' | 'text';
  options?: string[];
  answer?: string | string[];
  points?: number;
  order: number;
}
```

**핵심:** courseId는 plain UUID (FK 없음), bundleId도 plain UUID → **완전 분리 가능**

---

#### QuizAttempt.ts

```
위치: packages/lms-core/src/entities/QuizAttempt.ts
테이블: lms_quiz_attempts
마이그레이션: 없음 (synchronize:true로 생성)
의존: 없음 (자체완결)
```

**주요 필드:**

| 필드 | 타입 | 용도 |
|------|------|------|
| id | UUID | PK |
| quizId | UUID | Quiz 연결 |
| userId | UUID | 응시자 |
| answers | jsonb[] | QuizAnswer 배열 |
| status | IN_PROGRESS/COMPLETED/TIMED_OUT/ABANDONED | 상태 |
| score | decimal(5,2) | 점수 |
| passed | boolean | 합격 여부 |
| attemptNumber | integer | 시도 번호 |

---

#### Survey.ts

```
위치: packages/lms-core/src/entities/Survey.ts
테이블: lms_surveys
마이그레이션: 없음 (synchronize:true로 생성)
의존: 없음 (자체완결)
```

**주요 필드:**

| 필드 | 타입 | 용도 |
|------|------|------|
| id | UUID | PK |
| title, description | string | 콘텐츠 정보 |
| status | DRAFT/ACTIVE/CLOSED/ARCHIVED | 상태 |
| bundleId | UUID (nullable) | ContentBundle 연결 |
| allowAnonymous | boolean | 익명 허용 |
| allowMultipleResponses | boolean | 복수 응답 |
| maxResponses | integer | 최대 응답 수 |
| createdBy | UUID | 작성자 |

---

#### SurveyQuestion.ts + SurveyResponse.ts

```
의존: 없음 (자체완결)
```

SurveyQuestion: 질문 유형 7가지 (SINGLE, MULTI, TEXT, RATING, SCALE, DATE, NUMBER)
SurveyResponse: 응답 상태 3가지 (IN_PROGRESS, COMPLETED, ABANDONED)

---

#### ContentBundle.ts

```
위치: packages/lms-core/src/entities/ContentBundle.ts
테이블: lms_content_bundles
의존: 없음 (자체완결)
```

**주요 필드:**

| 필드 | 타입 | 용도 |
|------|------|------|
| id | UUID | PK |
| type | EDUCATION/PRODUCT/CAMPAIGN/INFO/MARKETING | 번들 유형 |
| contentItems | jsonb[] | ContentItem 배열 |
| organizationId | UUID (nullable) | 조직 |

**ContentItem 인터페이스:**
```typescript
interface ContentItem {
  id: string;
  type: 'text' | 'image' | 'video' | 'quiz' | 'link' | 'file' | 'embed';
  title?: string;
  content: any;
  order: number;
  metadata?: Record<string, any>;
}
```

**핵심:** Quiz/Survey의 bundleId가 이 엔티티를 참조 → Interactive Content 그루핑 메커니즘

---

### 2.2 API

#### Course Endpoints (8)

| Method | Path | Guard |
|--------|------|-------|
| POST | /courses | requireInstructor |
| GET | /courses | requireAuth |
| GET | /courses/:id | requireAuth |
| PATCH | /courses/:id | requireInstructor |
| DELETE | /courses/:id | requireInstructor |
| POST | /courses/:id/publish | requireInstructor |
| POST | /courses/:id/unpublish | requireInstructor |
| POST | /courses/:id/archive | requireInstructor |

#### Lesson Endpoints (6)

| Method | Path | Guard |
|--------|------|-------|
| POST | /courses/:courseId/lessons | requireInstructor |
| GET | /courses/:courseId/lessons | **requireEnrollment** |
| GET | /lessons/:id | **requireEnrollment(checkLesson)** |
| PATCH | /lessons/:id | requireInstructor |
| DELETE | /lessons/:id | requireInstructor |
| POST | /courses/:courseId/lessons/reorder | requireInstructor |

**주의:** Lesson 조회에 `requireEnrollment` 미들웨어 → Education 의존

#### Quiz Endpoints (18)

| Method | Path | Guard |
|--------|------|-------|
| POST | /quizzes | requireInstructor |
| GET | /quizzes | requireAuth |
| GET | /quizzes/:id | requireAuth |
| PATCH | /quizzes/:id | requireInstructor |
| DELETE | /quizzes/:id | requireInstructor |
| POST | /quizzes/:id/publish | requireInstructor |
| POST | /quizzes/:id/unpublish | requireInstructor |
| POST | /quizzes/:id/questions | requireInstructor |
| DELETE | /quizzes/:id/questions/:qId | requireInstructor |
| POST | /quizzes/:id/questions/reorder | requireInstructor |
| POST | /quizzes/:id/attempts | requireAuth |
| GET | /quizzes/:id/attempts | requireAuth |
| GET | /quizzes/attempts/:attemptId | requireAuth |
| POST | /quizzes/attempts/:attemptId/answers | requireAuth |
| POST | /quizzes/attempts/:attemptId/complete | requireAuth |
| GET | /quizzes/bundle/:bundleId | requireAuth |
| GET | /quizzes/:id/attempts/me | requireAuth |
| GET | /quizzes/:id/stats | requireAuth |

#### Survey Endpoints (19)

| Method | Path | Guard |
|--------|------|-------|
| POST | /surveys | requireInstructor |
| GET | /surveys | requireAuth |
| GET | /surveys/:id | requireAuth |
| PATCH | /surveys/:id | requireInstructor |
| DELETE | /surveys/:id | requireInstructor |
| POST | /surveys/:id/publish | requireInstructor |
| POST | /surveys/:id/close | requireInstructor |
| POST | /surveys/:id/archive | requireInstructor |
| GET | /surveys/:id/questions | requireAuth |
| POST | /surveys/:id/questions | requireInstructor |
| PATCH | /surveys/questions/:qId | requireInstructor |
| DELETE | /surveys/questions/:qId | requireInstructor |
| POST | /surveys/:id/questions/reorder | requireInstructor |
| POST | /surveys/:id/responses | requireAuth |
| GET | /surveys/:id/responses | requireAuth |
| GET | /surveys/responses/:responseId | requireAuth |
| POST | /surveys/responses/:responseId/answers | requireAuth |
| POST | /surveys/responses/:responseId/complete | requireAuth |
| GET | /surveys/bundle/:bundleId | requireAuth |
| GET | /surveys/:id/responses/check | requireAuth |
| GET | /surveys/:id/stats | requireAuth |
| GET | /surveys/:id/question-stats | requireAuth |

### 2.3 Service

| Service | 다른 서비스 의존 | 분리 가능 |
|---------|---------------|----------|
| CourseService | 없음 | **YES** |
| LessonService | 없음 | **YES** |
| QuizService | 없음 | **YES** |
| SurveyService | 없음 | **YES** |
| ContentBundleService | 없음 | **YES** |

**Interactive Content의 모든 Service는 외부 의존 없이 자체완결.**

---

## 3. Education 영역

### 3.1 Entity

#### Enrollment.ts

```
위치: packages/lms-core/src/entities/Enrollment.ts
테이블: lms_enrollments
마이그레이션: 001-create-lms-tables.ts
의존: Course (import + FK)
```

**주요 필드:**

| 필드 | 타입 | 용도 |
|------|------|------|
| id | UUID | PK |
| userId | UUID → User | 학습자 |
| courseId | UUID → Course | **FK (CASCADE)** |
| organizationId | UUID | 조직 |
| status | PENDING/APPROVED/REJECTED/IN_PROGRESS/COMPLETED/CANCELLED/EXPIRED | 상태 |
| progressPercentage | decimal(5,2) | 진행률 (0-100) |
| completedLessons, totalLessons | integer | 레슨 진행 |
| timeSpent | integer | 소요 시간(분) |
| finalScore | decimal(5,2) | 최종 점수 |
| certificateId | UUID | 수료증 |

---

#### Progress.ts

```
위치: packages/lms-core/src/entities/Progress.ts
테이블: lms_progress
마이그레이션: 002-create-lms-additional-tables.ts
의존: Enrollment + Lesson (import + FK)
```

**핵심:** Progress는 **Content(Lesson)과 Education(Enrollment) 양쪽을 연결**하는 브릿지 엔티티

| 필드 | 타입 | 의존 영역 |
|------|------|----------|
| enrollmentId | UUID → Enrollment | Education |
| lessonId | UUID → Lesson | **Content** |

---

#### Certificate.ts

```
의존: Course (import + FK)
```

| 필드 | 타입 | 용도 |
|------|------|------|
| courseId | UUID → Course | **FK (CASCADE)** |
| credits | decimal(5,2) | Course.credits에서 복사 |

---

#### LMSEvent.ts

```
의존: Course (import + FK)
```

| 필드 | 타입 | 용도 |
|------|------|------|
| courseId | UUID → Course | **FK (CASCADE)** |

---

#### Attendance.ts

```
의존: LMSEvent (import + FK)
```

---

### 3.2 API

| 영역 | Endpoint 수 |
|------|------------|
| Enrollment | 8 |
| Progress | 7 |
| Certificate | 9 |
| Event | 8 |
| Attendance | 6 |
| **총합** | **38** |

### 3.3 Service

| Service | 다른 서비스 의존 | 분리 가능 |
|---------|---------------|----------|
| EnrollmentService | **CourseService** | Content 의존 |
| ProgressService | **EnrollmentService** | Education 내부 의존 |
| CertificateService | **CourseService + EnrollmentService** | Content + Education 의존 |
| EventService | 없음 | YES (courseId FK만) |
| AttendanceService | **EventService** | Education 내부 의존 |

### 3.4 Credits 시스템

| 위치 | 필드 | 용도 |
|------|------|------|
| Course.credits | decimal(5,2) | 강좌가 부여하는 학점 정의 |
| Certificate.credits | decimal(5,2) | 이수 시 실제 부여된 학점 (Course에서 복사) |
| lms_yaksa_credit_records | 별도 패키지 | 약사 연수 학점 집계 (lms-yaksa Extension) |

lms-yaksa는 lms-core 이벤트를 **소비**하는 Extension → 별도 분리 가능

---

## 4. 분리 가능성 평가

### 4.1 자체완결 Entity 분석

| Entity | import 0개 | FK 없음 | 판정 |
|--------|:---------:|:------:|:----:|
| Course | YES | YES | **Core 이동 가능** |
| Lesson | NO (→Course) | NO | Course와 함께 이동 |
| Quiz | YES | YES | **독립 분리 가능** |
| QuizAttempt | YES | YES | Quiz와 함께 이동 |
| Survey | YES | YES | **독립 분리 가능** |
| SurveyQuestion | YES | YES | Survey와 함께 이동 |
| SurveyResponse | YES | YES | Survey와 함께 이동 |
| ContentBundle | YES | YES | **독립 분리 가능** |
| Enrollment | NO (→Course) | NO | Course 의존 |
| Progress | NO (→Enrollment+Lesson) | NO | **양쪽 의존 (브릿지)** |
| Certificate | NO (→Course) | NO | Course 의존 |
| LMSEvent | NO (→Course) | NO | Course 의존 |
| Attendance | NO (→LMSEvent) | NO | LMSEvent 의존 |

### 4.2 Core로 이동 가능

다음은 **외부 의존 없이 Interactive Content Core로 이동 가능**:

```
확실히 가능:
  ✅ ContentBundle (완전 자체완결)
  ✅ Quiz + QuizAttempt (완전 자체완결, courseId는 plain UUID)
  ✅ Survey + SurveyQuestion + SurveyResponse (완전 자체완결)

조건부 가능:
  ⚠️ Course (자체완결이지만 currentEnrollments 등 Education 개념 포함)
  ⚠️ Lesson (Course import 제거 필요 → string-based relation으로 변경)
```

### 4.3 Extension으로 이동 필요

다음은 **Content Core 의존이 필수이며 Education Extension에 해당**:

```
확실한 Extension:
  ✅ Enrollment (→ Course FK)
  ✅ Certificate (→ Course FK + credits 복사)
  ✅ LMSEvent (→ Course FK)
  ✅ Attendance (→ LMSEvent FK)
  ✅ InstructorApplication

브릿지 (양쪽 의존):
  ⚠️ Progress (→ Enrollment FK + Lesson FK)
```

### 4.4 핵심 블로커

#### 블로커 1: Progress 브릿지 문제

```
Progress.enrollmentId → Enrollment (Education)
Progress.lessonId → Lesson (Content)
```

Progress는 Content와 Education 양쪽을 import한다. 분리 시:
- **해결안 A**: Progress를 Education에 배치, lessonId를 plain UUID로 변경 (TypeORM relation 제거)
- **해결안 B**: Progress를 Content/Education 두 엔티티로 분할

#### 블로커 2: Course 엔티티의 Education 필드

Course에 다음 Education 개념 필드가 포함되어 있다:

```
currentEnrollments, maxEnrollments  → 수강 관리
requiresApproval                   → 등록 승인
isPaid, price                      → 결제
```

분리 시:
- **해결안 A**: Course에 유지 (실용적)
- **해결안 B**: CourseOffering 엔티티를 Extension에 분리 (깔끔하지만 대규모 변경)

#### 블로커 3: Lesson 접근의 Enrollment Guard

```typescript
// lms.routes.ts
router.get('/courses/:courseId/lessons', requireAuth, requireEnrollment(), ...)
```

레슨 조회가 수강 상태(Education)에 의존한다:
- **해결안 A**: Content Core는 공개 API 제공, Education Extension이 Guard 래핑
- **해결안 B**: Content Core에 접근 제어 Hook 패턴 도입

### 4.5 분리 가능성 판정

| 구분 | 판정 | 근거 |
|------|------|------|
| Quiz/Survey → Interactive Content Core | **즉시 가능** | 완전 자체완결, FK 없음 |
| ContentBundle → Interactive Content Core | **즉시 가능** | 완전 자체완결 |
| Course/Lesson → Interactive Content Core | **조건부 가능** | Education 필드 정리 + Lesson relation 변경 필요 |
| Enrollment/Certificate/Event/Attendance → Education Extension | **가능** | Content Core 의존만 있으면 됨 |
| Progress → Education Extension | **블로커 해결 필요** | Lesson relation 정리 필요 |

---

## 5. 제안 구조

### 5.1 Phase 1: Quiz/Survey/ContentBundle 분리 (즉시 가능)

```
@o4o/interactive-content-core (신규)
├── entities/
│   ├── ContentBundle.ts     ← 이동
│   ├── Quiz.ts              ← 이동
│   ├── QuizAttempt.ts       ← 이동
│   ├── Survey.ts            ← 이동
│   ├── SurveyQuestion.ts    ← 이동
│   └── SurveyResponse.ts    ← 이동
├── services/
│   ├── ContentBundleService.ts
│   ├── QuizService.ts
│   └── SurveyService.ts
└── manifest.ts

변경 없음: @o4o/lms-core (Course, Lesson + Education 엔티티 유지)
```

### 5.2 Phase 2: Course/Lesson 이동 (리팩토링 필요)

```
@o4o/interactive-content-core (확장)
├── entities/
│   ├── Course.ts            ← 이동 (Education 필드 유지 또는 분리)
│   ├── Lesson.ts            ← 이동 (Course import → string relation)
│   ├── ContentBundle.ts
│   ├── Quiz.ts
│   ├── QuizAttempt.ts
│   ├── Survey.ts
│   ├── SurveyQuestion.ts
│   └── SurveyResponse.ts
└── ...

@o4o/education-extension (신규)
├── entities/
│   ├── Enrollment.ts        ← 이동
│   ├── Progress.ts          ← 이동 (lessonId → plain UUID)
│   ├── Certificate.ts       ← 이동
│   ├── LMSEvent.ts          ← 이동
│   └── Attendance.ts        ← 이동
├── services/
│   ├── EnrollmentService.ts
│   ├── ProgressService.ts
│   ├── CertificateService.ts
│   ├── EventService.ts
│   └── AttendanceService.ts
└── manifest.ts
  dependencies: ['interactive-content-core']
```

---

## 6. 파일 위치 맵

### Entity 파일

```
packages/lms-core/src/entities/
├── Course.ts           → Interactive Content (Phase 2)
├── Lesson.ts           → Interactive Content (Phase 2)
├── ContentBundle.ts    → Interactive Content (Phase 1)
├── Quiz.ts             → Interactive Content (Phase 1)
├── QuizAttempt.ts      → Interactive Content (Phase 1)
├── Survey.ts           → Interactive Content (Phase 1)
├── SurveyQuestion.ts   → Interactive Content (Phase 1)
├── SurveyResponse.ts   → Interactive Content (Phase 1)
├── Enrollment.ts       → Education Extension (Phase 2)
├── Progress.ts         → Education Extension (Phase 2)
├── Certificate.ts      → Education Extension (Phase 2)
├── LMSEvent.ts         → Education Extension (Phase 2)
└── Attendance.ts       → Education Extension (Phase 2)
```

### Service 파일

```
apps/api-server/src/modules/lms/services/
├── CourseService.ts      → Interactive Content
├── LessonService.ts      → Interactive Content
├── QuizService.ts        → Interactive Content
├── SurveyService.ts      → Interactive Content
├── EnrollmentService.ts  → Education Extension
├── ProgressService.ts    → Education Extension
├── CertificateService.ts → Education Extension
├── EventService.ts       → Education Extension
└── AttendanceService.ts  → Education Extension
```

### Controller 파일

```
apps/api-server/src/modules/lms/controllers/
├── CourseController.ts      → Interactive Content
├── LessonController.ts      → Interactive Content
├── QuizController.ts        → Interactive Content
├── SurveyController.ts      → Interactive Content
├── EnrollmentController.ts  → Education Extension
├── ProgressController.ts    → Education Extension
├── CertificateController.ts → Education Extension
├── EventController.ts       → Education Extension
└── AttendanceController.ts  → Education Extension
```

### Routes 파일

```
apps/api-server/src/modules/lms/routes/
└── lms.routes.ts (485줄, 인라인 라우트 정의)
    → 분리 시 interactive-content.routes.ts + education.routes.ts 로 분할
```

---

## 7. 요약

### 즉시 분리 가능 (코드 변경 최소)

| 대상 | Entity 수 | Endpoint 수 | 의존 | 판정 |
|------|----------|------------|------|------|
| Quiz 시스템 | 2 (Quiz, QuizAttempt) | 18 | 없음 | **즉시 가능** |
| Survey 시스템 | 3 (Survey, SurveyQuestion, SurveyResponse) | 19+ | 없음 | **즉시 가능** |
| ContentBundle | 1 | (Marketing routes) | 없음 | **즉시 가능** |

### 조건부 분리 가능 (리팩토링 필요)

| 대상 | 필요 작업 | 리스크 |
|------|----------|--------|
| Course → Core | Education 필드 처리 결정 | 낮음 |
| Lesson → Core | Course import → string relation 변경 | 낮음 |
| Progress → Extension | lessonId TypeORM relation → plain UUID | 중간 |

### 기대 결과

```
LMS Core → Interactive Content Core 재구성: 가능
  Phase 1 (Quiz/Survey/ContentBundle): 즉시 가능, 리스크 없음
  Phase 2 (Course/Lesson 포함): 리팩토링 필요, 리스크 낮음

Education 기능 → Extension 분리: 가능
  조건: Progress 브릿지 문제 해결 필요
  의존 방향: Education → Content (단방향, 정상)
```

---

*End of WO-O4O-INTERACTIVE-CONTENT-LMS-AUDIT-V1*
