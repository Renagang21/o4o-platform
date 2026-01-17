# LMS 계열 조사 결과 (Raw Facts)

> **조사일**: 2026-01-17
> **조사 성격**: 판단 없이 사실만 정리
> **조사 범위**: lms-core, lms-marketing, lms-yaksa

---

## 1. LMS-CORE

### 1.1 Course / Lesson / Enrollment / Progress / Certificate

| 컴포넌트 | 구현 | 사용 흐름 | 역할 | 겹침 | 비고 |
|---------|------|---------|------|------|------|
| **Course** | Entity/Service/Controller 완료 | 운영 중 (Admin /lms/courses) | 과정 기본 구조 | 없음 | 42개 필드, 8개 helper |
| **Lesson** | Entity/Service/Controller 완료 | 운영 중 | 과정 내 학습 단위 | 없음 | quizData JSONB 포함 |
| **Enrollment** | Entity/Service/Controller 완료 | 운영 중 (Admin /lms/enrollments) | 사용자-과정 연결 | 없음 | (userId, courseId) unique |
| **Progress** | Entity/Service/Controller 완료 | 운영 중 | Lesson별 진행률 | 없음 | quizAnswers JSONB 포함 |
| **Certificate** | Entity/Service/Controller 완료 | 운영 중 (Admin /lms/certificates) | 수료증 발급 | 없음 | 자동 번호 생성 |

### 1.2 ContentBundle (R1)

| 항목 | 내용 |
|------|------|
| **구현** | Entity/Service/Controller 완료 |
| **사용 흐름** | API 등록됨 (`/api/v1/lms/bundles`), **manifest에 일부만 선언** |
| **역할** | 범용 콘텐츠 래퍼 (EDUCATION/PRODUCT/CAMPAIGN/INFO/MARKETING) |
| **겹침** | Lesson.content와 기능 겹침 가능 |
| **비고** | exposes.types에 포함, backend.entities에 미포함 |

### 1.3 Quiz / QuizAttempt (R2)

| 컴포넌트 | 구현 | 사용 흐름 | 역할 | 겹침 | 비고 |
|---------|------|---------|------|------|------|
| **Quiz** | Entity/Service/Controller 완료 | **코드만** (라우팅 미등록) | 퀴즈 엔진 | Lesson.quizData와 중복 | passingScore 70% |
| **QuizAttempt** | Entity 완료 + Service 내 포함 | **코드만** | 퀴즈 응시 기록 | Progress.quizAnswers와 유사? | 시도 횟수 추적 |

### 1.4 Survey / SurveyQuestion / SurveyResponse (R2)

| 컴포넌트 | 구현 | 사용 흐름 | 역할 | 겹침 | 비고 |
|---------|------|---------|------|------|------|
| **Survey** | Entity/Service/Controller 완료 | **코드만** (라우팅 미등록) | 설문조사 엔진 | 없음 | DRAFT→ACTIVE→CLOSED |
| **SurveyQuestion** | Entity 완료 + Service 내 포함 | **코드만** | 설문 질문 관리 | 없음 | 7개 질문 타입 |
| **SurveyResponse** | Entity 완료 + Service 내 포함 | **코드만** | 설문 응답 기록 | 없음 | 익명/유명 구분 |

### 1.5 EngagementLog (R3)

| 항목 | 내용 |
|------|------|
| **구현** | Entity/Service/Controller 완료 |
| **사용 흐름** | **코드만** (라우팅 미등록) |
| **역할** | 공통 참여 로깅 (VIEW/CLICK/REACTION/QUIZ_SUBMIT/SURVEY_SUBMIT/ACKNOWLEDGE/COMPLETE) |
| **겹침** | 없음 (Progress/QuizAttempt와 다름 - 상태 관리 vs 로깅) |
| **비고** | AI-Service 연동 예상 |

### 1.6 LMSEvent / Attendance

| 컴포넌트 | 구현 | 사용 흐름 | 역할 | 겹침 | 비고 |
|---------|------|---------|------|------|------|
| **LMSEvent** | Entity/Service/Controller 완료 | 운영 중 (Admin /lms/events) | 예정된 교육 행사 | 없음 | LECTURE/WORKSHOP/EXAM/WEBINAR/LIVE_SESSION |
| **Attendance** | Entity/Service/Controller 완료 | 운영 중 | 행사 참석 기록 | 없음 | 지리적 위치 저장 가능 |

---

## 2. LMS-MARKETING

### 2.1 패키지 상태 (중요)

| 항목 | 상태 |
|------|------|
| **소스 파일** | ❌ 없음 (dist/ 폴더만 존재) |
| **package.json** | ❌ 없음 |
| **tsconfig.json** | ❌ 없음 |
| **api-server 등록** | ❌ 없음 (main.ts, dependencies, DataSource 모두 미등록) |
| **Admin Dashboard API Client** | ✅ 존재 (`lmsMarketing.ts`) |
| **Admin Dashboard UI Pages** | ✅ 존재 (`pages/marketing/`) |
| **Main Site API Client** | ✅ 존재 |
| **disabled-apps.registry.ts 코멘트** | "R7: lms-marketing 패키지 삭제됨" |

**상태**: 코드는 남아있으나 **ORPHANED** (Backend 연결 없음)

### 2.2 ProductContent (R6)

| 항목 | 내용 |
|------|------|
| **구현** | Entity/Service/Controller 완료 (dist only) |
| **사용 흐름** | Admin/Main API 클라이언트 존재, **Backend 미연결** |
| **역할** | 공급사 제품 콘텐츠 → ContentBundle 연동 |
| **겹침** | ContentBundle 의존 |
| **비고** | NOT OPERATIONAL |

### 2.3 MarketingQuizCampaign (R7)

| 항목 | 내용 |
|------|------|
| **구현** | Entity/Service/Controller 완료 (dist only) |
| **사용 흐름** | Admin/Main API 클라이언트 존재, **Backend 미연결** |
| **역할** | 마케팅 퀴즈 캠페인 (보상 포함) |
| **겹침** | lms-core Quiz와 별도 |
| **비고** | NOT OPERATIONAL |

### 2.4 SurveyCampaign (R8)

| 항목 | 내용 |
|------|------|
| **구현** | Entity/Service/Controller 완료 (dist only) |
| **사용 흐름** | Admin/Main API 클라이언트 존재, **Backend 미연결** |
| **역할** | 마케팅 설문 캠페인 |
| **겹침** | lms-core Survey와 별도 (또는 통합?) |
| **비고** | NOT OPERATIONAL |

### 2.5 SupplierOnboarding / SupplierProfile (R11)

| 항목 | 내용 |
|------|------|
| **구현** | Entity/Service/Controller 완료 (dist only) |
| **사용 흐름** | Admin UI 존재 (`pages/marketing/onboarding/`), **Backend 미연결** |
| **역할** | 공급사 온보딩 + 체크리스트 |
| **겹침** | ProductContent/Quiz/Survey에 의존 |
| **비고** | NOT OPERATIONAL |

### 2.6 CampaignAutomation

| 항목 | 내용 |
|------|------|
| **구현** | Service/Controller/Hook 완료 (dist only) |
| **사용 흐름** | Admin UI 존재 (`pages/marketing/automation/`), **Backend 미연결** |
| **역할** | 캠페인 자동화 (auto-publish, auto-expire, auto-pause) |
| **겹침** | Quiz/Survey Campaign 서비스 의존 |
| **비고** | NOT OPERATIONAL, 스케줄 작업 비활성 |

### 2.7 SupplierInsights

| 항목 | 내용 |
|------|------|
| **구현** | Service/Controller 완료 (dist only) |
| **사용 흐름** | Admin API 클라이언트 존재, **Backend 미연결** |
| **역할** | 공급사 대시보드/분석 (집계) |
| **겹침** | 읽기 전용 (ProductContent/Quiz/Survey에서 데이터 읽음) |
| **비고** | NOT OPERATIONAL |

---

## 3. LMS-YAKSA

### 3.1 YaksaLicenseProfile

| 항목 | 내용 |
|------|------|
| **구현** | Entity/Service/Controller 완료 |
| **사용 흐름** | Admin `/lms-yaksa/licenses`, Member `/member/education/license` |
| **역할** | 약사 면허 관리, 평점 누적 |
| **겹침** | 없음 (CreditRecord와 1:N 관계) |
| **비고** | 운영 중 |

### 3.2 RequiredCoursePolicy

| 항목 | 내용 |
|------|------|
| **구현** | Entity/Service/Controller 완료 |
| **사용 흐름** | Admin `/lms-yaksa/required-policy`, CourseCompletionHandler에서 참조 |
| **역할** | 필수교육 정책 정의 |
| **겹침** | YaksaCourseAssignment와 연동 |
| **비고** | Phase 1 pharmacistType 필터링 코드 준비됨 (미사용) |

### 3.3 CreditRecord

| 항목 | 내용 |
|------|------|
| **구현** | Entity/Service/Controller 완료 |
| **사용 흐름** | Admin `/lms-yaksa/credits`, Member `/member/education/credits`, **Hook 자동 기록** |
| **역할** | 평점 기록 (COURSE_COMPLETION/ATTENDANCE/EXTERNAL/MANUAL_ADJUSTMENT) |
| **겹침** | Certificate와 연동 |
| **비고** | 운영 중, Hook 활성 |

### 3.4 YaksaCourseAssignment

| 항목 | 내용 |
|------|------|
| **구현** | Entity/Service/Controller 완료 |
| **사용 흐름** | Admin `/lms-yaksa/assignments`, Member `/member/education/assignments`, **4개 Hook 연동** |
| **역할** | 과정 배정 관리 (PENDING→IN_PROGRESS→COMPLETED) |
| **겹침** | lms-core Enrollment과 양방향 동기화 |
| **비고** | 운영 중, 4개 Handler 활성 |

### 3.5 Hook Handlers

| Handler | Event | 역할 | 상태 |
|---------|-------|------|------|
| **CourseCompletionHandler** | `lms-core.course.completed` | CreditRecord 생성, Assignment 완료 처리 | ✅ 활성 |
| **CertificateIssuedHandler** | `lms-core.certificate.issued` | CreditRecord 연동, Assignment 완료 처리 | ✅ 활성 |
| **EnrollmentHandler** | `lms-core.enrollment.created` | Assignment 연동, 자동 배정 | ✅ 활성 |
| **ProgressSyncHandler** | `lms-core.enrollment.progress` | Assignment 진행률 동기화 | ✅ 활성 |

### 3.6 activate.ts 상태

```typescript
// TODO: Register event handlers
// TODO: Enable scheduled tasks
```

**상태**: Hook 등록 코드가 activate()에 **미구현** (api-server 초기화에서 수동 등록 필요)

---

## 4. 겹침/경계 의문점 목록 (판단 없이 사실만)

### 4.1 Quiz 관련

| 위치 | 내용 | 관계 불명확 |
|------|------|------------|
| lms-core Quiz | 독립형 퀴즈 Entity + Service | Lesson.quizData와 어떻게 다른가? |
| lms-core Lesson.quizData | JSONB로 퀴즈 데이터 저장 | Quiz Entity와 어떻게 다른가? |
| lms-marketing MarketingQuizCampaign | 마케팅 퀴즈 캠페인 | lms-core Quiz를 래핑하는가, 별도인가? |

### 4.2 Survey 관련

| 위치 | 내용 | 관계 불명확 |
|------|------|------------|
| lms-core Survey | 독립형 설문 Entity + Service | - |
| lms-marketing SurveyCampaign | 마케팅 설문 캠페인 | lms-core Survey를 래핑하는가, 별도인가? |

### 4.3 ContentBundle 관련

| 위치 | 내용 | 관계 불명확 |
|------|------|------------|
| lms-core ContentBundle | 범용 콘텐츠 래퍼 (type: PRODUCT 포함) | - |
| lms-core Lesson.content | JSONB로 콘텐츠 저장 | ContentBundle과 어떻게 다른가? |
| lms-marketing ProductContent | 제품 콘텐츠 Entity | ContentBundle type=PRODUCT의 특화인가, 별도인가? |

### 4.4 QuizAttempt / Progress 관련

| 위치 | 내용 | 관계 불명확 |
|------|------|------------|
| lms-core QuizAttempt | 퀴즈 응시 기록 Entity | - |
| lms-core Progress.quizAnswers | JSONB로 퀴즈 응답 저장 | QuizAttempt와 어떻게 다른가? |

---

## 5. 라우팅/통합 상태 요약

| 모듈 | API 라우팅 | Manifest 선언 | 실제 운영 |
|------|----------|--------------|----------|
| lms-core Course/Lesson/Enrollment/Progress/Certificate | ✅ | ✅ | ✅ |
| lms-core ContentBundle | ✅ | 부분 | ⚠️ |
| lms-core Quiz/Survey/EngagementLog | ❌ | ❌ | ❌ |
| lms-core LMSEvent/Attendance | ✅ | ✅ | ✅ |
| lms-marketing 전체 | ❌ | ❌ (orphaned) | ❌ |
| lms-yaksa 전체 | ✅ | ✅ | ✅ |

---

## 6. 파일 존재 여부 요약

| 패키지 | src/ | dist/ | package.json | api-server 등록 |
|--------|------|-------|--------------|----------------|
| lms-core | ✅ | ✅ | ✅ | ✅ |
| lms-marketing | ❌ | ✅ | ❌ | ❌ |
| lms-yaksa | ✅ | ✅ | ✅ | ✅ |

---

## 7. 추가조사 결과 (2026-01-17 보완)

### 7.1 lms-marketing ORPHANED 상태 확인

#### Git History 조사

| 커밋 해시 | 날짜 | 내용 |
|----------|------|------|
| `43ffcaf07` | 2025-12-25 | **"refactor: R7 Legacy 패키지 4개 삭제"** |
| | | - 삭제 대상: admin, commerce, customer, **lms-marketing** |
| | | - api-server package.json에서 lms-marketing 의존성 제거 |
| | | - appsCatalog.ts에서 lms-marketing 항목 제거 |

#### 현재 파일 시스템 상태

```
packages/lms-marketing/
├── dist/          ← ✅ 존재 (컴파일된 JS 파일)
│   ├── backend/
│   ├── lifecycle/
│   ├── index.js
│   └── manifest.js
└── node_modules/  ← ✅ 존재
```

| 항목 | 상태 |
|------|------|
| `src/` 폴더 | ❌ 삭제됨 |
| `package.json` | ❌ 삭제됨 |
| `tsconfig.json` | ❌ 삭제됨 |
| `migrations/` | ❌ 삭제됨 |
| `TODO.md` | ❌ 삭제됨 |

**결론**: Git 커밋 `43ffcaf07`에서 src 삭제됨. dist/node_modules만 잔존 (gitignore로 인한 잔재)

### 7.2 Quiz/Survey 라우팅 미등록 확인

#### lms.routes.ts 분석

**등록된 라우트 (실제 운영)**:
- `/api/v1/lms/courses/*` ← CourseController
- `/api/v1/lms/lessons/*` ← LessonController
- `/api/v1/lms/enrollments/*` ← EnrollmentController
- `/api/v1/lms/progress/*` ← ProgressController
- `/api/v1/lms/certificates/*` ← CertificateController
- `/api/v1/lms/events/*` ← EventController
- `/api/v1/lms/attendance/*` ← AttendanceController

**미등록 라우트 (코드만 존재)**:
- `/api/v1/lms/quizzes/*` ← QuizController (createQuizRoutes 함수 존재하나 미호출)
- `/api/v1/lms/surveys/*` ← SurveyController (createSurveyRoutes 함수 존재하나 미호출)

#### Controller 분석

| Controller | Factory 함수 | lms.routes.ts 등록 | 상태 |
|------------|-------------|-------------------|------|
| QuizController | `createQuizRoutes(dataSource)` | ❌ 미호출 | **DEAD CODE** |
| SurveyController | `createSurveyRoutes(dataSource)` | ❌ 미호출 | **DEAD CODE** |

### 7.3 Quiz 관련 구조 명확화

#### 두 가지 Quiz 저장 방식 비교

| 방식 | 위치 | 데이터 구조 | 사용 흐름 |
|------|------|------------|----------|
| **Lesson.quizData** | `lms_lessons.quiz_data` (JSONB) | `{questions: [], passingScore, timeLimit}` | Progress.submitQuiz()에서 사용 |
| **Quiz Entity** | `lms_quizzes` (별도 테이블) | 독립 Entity + QuizAttempt | 라우팅 미등록 |

#### Lesson.quizData 구조
```typescript
quizData?: {
  questions: Array<{
    id: string;
    question: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer';
    options?: string[];
    correctAnswer: string | string[];
    points: number;
  }>;
  passingScore: number;
  timeLimit?: number;
};
```

#### Progress.quizAnswers 구조
```typescript
quizAnswers?: Record<string, any>; // JSONB
// submitQuizAttempt()에서 저장
```

### 7.4 ContentBundle 사용처 조사

#### API 연동
| 앱 | 파일 | API 호출 |
|---|------|---------|
| main-site | `contentBundleApi.ts` | `GET /api/v1/lms/bundles/{id}` |

#### Frontend 사용처
| 파일 | 용도 |
|------|------|
| `BundleViewerPage.tsx` | Bundle 페이지 뷰어 |
| `ContentBundleViewer.tsx` | Bundle 렌더링 컴포넌트 |
| `ContentItemRenderer.tsx` | Bundle 내 아이템 렌더링 |
| `QuizRunner.tsx` | Quiz 실행 (ContentBundle 내) |
| `SurveyRunner.tsx` | Survey 실행 (ContentBundle 내) |
| `ProductContentViewerPage.tsx` | 제품 콘텐츠 뷰어 |

#### contentBundleApi.ts 분석

**선언된 API 엔드포인트**:
```
GET /api/v1/lms/bundles/{bundleId}     ← 실제 등록됨
GET /api/v1/lms/quizzes/{quizId}       ← ⚠️ 라우팅 미등록
POST /api/v1/lms/quizzes/{id}/attempts ← ⚠️ 라우팅 미등록
GET /api/v1/lms/surveys/{surveyId}     ← ⚠️ 라우팅 미등록
POST /api/v1/lms/surveys/{id}/responses ← ⚠️ 라우팅 미등록
```

**문제점**: Frontend API Client가 미등록 Backend 엔드포인트를 호출하도록 되어있음

### 7.5 Progress API 사용 추적

#### lms.routes.ts에 등록된 Progress 엔드포인트

| 메서드 | 경로 | 핸들러 |
|--------|------|--------|
| POST | `/progress` | recordProgress |
| GET | `/progress` | listProgress |
| GET | `/enrollments/:enrollmentId/progress` | getProgressByEnrollment |
| GET | `/progress/:id` | getProgress |
| PATCH | `/progress/:id` | updateProgress |
| POST | `/progress/:id/complete` | completeProgress |
| POST | `/progress/:id/submit-quiz` | submitQuiz |

#### Frontend 호출 조사

| 앱 | 파일 | Progress API 직접 호출 |
|---|------|----------------------|
| admin-dashboard | - | ❌ 검색 결과 없음 |
| main-site | - | ❌ 검색 결과 없음 |

**결론**: Progress API는 lms.routes.ts에 등록되어 있으나, Frontend에서 직접 호출하는 코드 미발견.
- **가능성 1**: 다른 서비스를 통한 간접 호출
- **가능성 2**: 아직 Frontend 연동 미구현

---

## 8. 겹침 영역 상세 분석

### 8.1 Quiz 관련 겹침

| 항목 | Lesson.quizData | Quiz Entity | QuizAttempt | Progress.quizAnswers |
|------|----------------|-------------|-------------|---------------------|
| **저장 위치** | lms_lessons.quiz_data | lms_quizzes | lms_quiz_attempts | lms_progress.quiz_answers |
| **데이터 타입** | JSONB | Entity | Entity | JSONB |
| **API 라우팅** | ✅ (via Progress) | ❌ 미등록 | ❌ 미등록 | ✅ (via Progress) |
| **실제 사용** | Progress.submitQuiz() | 코드만 | 코드만 | Progress.submitQuiz() |
| **용도** | Course 내 퀴즈 | 독립형 퀴즈 | 퀴즈 시도 기록 | 퀴즈 응답 저장 |

**사실**: Lesson 기반 퀴즈는 운영 중, Quiz Entity 기반 퀴즈는 코드만 존재

### 8.2 ContentBundle vs Lesson.content

| 항목 | ContentBundle | Lesson.content |
|------|--------------|----------------|
| **저장 위치** | lms_content_bundles | lms_lessons.content |
| **구조** | 독립 Entity + items[] | JSONB (Block Editor) |
| **API 라우팅** | ✅ `/bundles` | ✅ via `/lessons` |
| **용도** | 독립 콘텐츠 배포 | Course 내 학습 콘텐츠 |
| **포함 가능** | Quiz, Survey, 다양한 콘텐츠 타입 | Block Editor JSON |

**사실**: 두 개념은 다른 용도로 설계됨 (독립 배포 vs Course 종속)

---

## 9. Frontend-Backend 연동 불일치 목록

| Frontend | 호출 대상 | Backend 상태 |
|----------|----------|-------------|
| `contentBundleApi.quizApi` | `/api/v1/lms/quizzes/*` | ❌ 미등록 |
| `contentBundleApi.surveyApi` | `/api/v1/lms/surveys/*` | ❌ 미등록 |
| `lmsMarketing.ts` (Admin) | `/api/v1/marketing/*` | ❌ ORPHANED |
| `quizCampaignApi.ts` (Main) | `/api/v1/marketing/quiz-campaigns/*` | ❌ ORPHANED |
| `surveyCampaignApi.ts` (Main) | `/api/v1/marketing/survey-campaigns/*` | ❌ ORPHANED |
| `productContentApi.ts` (Main) | `/api/v1/marketing/product-contents/*` | ❌ ORPHANED |

---

*이 문서는 판단을 포함하지 않습니다.*
*Document Created: 2026-01-17*
*Updated: 2026-01-17 (추가조사 반영)*
