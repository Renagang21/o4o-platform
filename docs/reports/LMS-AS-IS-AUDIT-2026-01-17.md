# LMS 계열 As-Is 전수 조사 결과

> **조사일**: 2026-01-17
> **조사 목적**: 기존 구현물 파악 및 KEEP/RELOCATE/FREEZE/REFACTOR 분류
> **조사 범위**: lms-core, lms-yaksa, lms-marketing, organization-lms

---

## 1. Executive Summary

| 패키지 | 타입 | 파일 수 | 테이블 수 | 상태 | 분류 |
|--------|------|---------|-----------|------|------|
| **lms-core** | Foundation Core | 36+ | 14 | FROZEN | KEEP |
| **lms-yaksa** | Extension | 34+ | 4 | Active | KEEP |
| **lms-marketing** | Extension | Compiled | 4+ | Active | REFACTOR 후보 |
| **organization-lms** | Integration | Minimal | 0 | Active | KEEP |

---

## 2. Core 계층: lms-core

### 2.1 현황

**위치**: `packages/lms-core`

**소유 테이블 (14개)**:
- `lms_courses`, `lms_lessons`, `lms_enrollments`, `lms_progress`
- `lms_certificates`, `lms_events`, `lms_attendance`
- `lms_content_bundles`
- `lms_quizzes`, `lms_quiz_attempts`
- `lms_surveys`, `lms_survey_questions`, `lms_survey_responses`
- `lms_engagement_logs`

**핵심 서비스**:
- CourseService, LessonService, EnrollmentService, ProgressService
- CertificateService, ContentBundleService
- QuizService, SurveyService
- EngagementLoggingService

### 2.2 조사 질문 답변

| 질문 | 답변 |
|------|------|
| Q1. LMS 본질 역할인가? | ✅ YES - 콘텐츠 전달, 참여 유도, 반응 기록, 지표 누적 |
| Q2. 다른 모듈과 역할이 겹치는가? | ⚠️ 일부 - Quiz Core vs Quiz Campaign, Survey Core vs Survey Campaign |
| Q3. Extension이 Core를 흔드는가? | ❌ NO - 명확한 경계 유지 |
| Q4. 지금 안 써도 되는 기능인가? | ❌ NO - 실제 사용 중 |

### 2.3 분류: **KEEP**

**근거**:
- FROZEN Core로 명시됨
- 명확한 역할과 경계
- Extension들이 의존하는 기반
- 실제 서비스에서 사용 중

---

## 3. Extension 계층: lms-yaksa

### 3.1 현황

**위치**: `packages/lms-yaksa`

**소유 테이블 (4개)**:
- `lms_yaksa_license_profiles` - 약사 면허 관리
- `lms_yaksa_required_course_policies` - 필수교육 정책
- `lms_yaksa_credit_records` - 평점 기록
- `lms_yaksa_course_assignments` - 과정 배정

**핵심 서비스**:
- LicenseProfileService
- RequiredCoursePolicyService
- CreditRecordService
- CourseAssignmentService

**Hook 연동**:
- `course.completed` → 자동 평점 기록
- `certificate.issued` → 수료증 연동
- `enrollment.created` → 등록 추적
- `enrollment.progress` → 진도 동기화

### 3.2 조사 질문 답변

| 질문 | 답변 |
|------|------|
| Q1. LMS 본질 역할인가? | ✅ YES - 약사회 특화 교육 관리 |
| Q2. 다른 모듈과 역할이 겹치는가? | ❌ NO - Yaksa 전용 |
| Q3. Extension이 Core를 흔드는가? | ❌ NO - Hook 기반 연동만 사용 |
| Q4. 지금 안 써도 되는 기능인가? | ❌ NO - KPA Society에서 사용 |

### 3.3 분류: **KEEP**

**근거**:
- Yaksa 도메인 전용으로 명확한 역할
- Core를 오염시키지 않음 (Hook 기반)
- 실제 서비스에서 사용 중

---

## 4. Extension 계층: lms-marketing

### 4.1 현황

**위치**: `packages/lms-marketing`

**주요 Entity**:
- `ProductContent` - 제품 정보 콘텐츠
- `MarketingQuizCampaign` - 퀴즈 캠페인
- `SurveyCampaign` - 설문 캠페인
- `SupplierProfile` - 공급사 프로필

**핵심 Controller (6개)**:
- ProductContentController
- MarketingQuizCampaignController
- SurveyCampaignController
- CampaignAutomationController
- SupplierInsightsController
- SupplierOnboardingController

### 4.2 조사 질문 답변

| 질문 | 답변 |
|------|------|
| Q1. LMS 본질 역할인가? | ⚠️ 경계선 - 콘텐츠 전달은 맞지만 캠페인은 마케팅 |
| Q2. 다른 모듈과 역할이 겹치는가? | ⚠️ YES - Quiz Core vs Quiz Campaign |
| Q3. Extension이 Core를 흔드는가? | ⚠️ 잠재적 - 캠페인 로직이 Core Quiz를 래핑 |
| Q4. 지금 안 써도 되는 기능인가? | 일부 - SupplierOnboarding은 진행 중 |

### 4.3 분류: **REFACTOR 후보**

**우려 사항**:

1. **Quiz Core vs Quiz Campaign 경계 모호**
   - Core: `lms_quizzes`, `lms_quiz_attempts`
   - Campaign: `MarketingQuizCampaign`
   - 질문: Campaign이 Core Quiz를 래핑하는가, 별도인가?

2. **Survey Core vs Survey Campaign 경계 모호**
   - Core: `lms_surveys`, `lms_survey_questions`, `lms_survey_responses`
   - Campaign: `SurveyCampaign`
   - 질문: 동일한 모호성

3. **ContentBundle vs ProductContent 관계**
   - Core: `ContentBundle` (type: EDUCATION|PRODUCT|CAMPAIGN|INFO|MARKETING)
   - Marketing: `ProductContent`
   - 질문: ProductContent가 ContentBundle의 특화 버전인가?

**권장 조치**:
- Work Order 생성하여 경계 명확화
- Quiz/Survey는 "콘텐츠 타입" vs "캠페인 실행체" 구분 필요

---

## 5. Integration 계층: organization-lms

### 5.1 현황

**위치**: `packages/organization-lms`

**역할**: organization-core와 lms-core를 연결하는 브릿지

**소유 테이블**: 없음 (통합 레이어)

**서비스**:
- OrganizationLmsService

### 5.2 조사 질문 답변

| 질문 | 답변 |
|------|------|
| Q1. LMS 본질 역할인가? | ✅ YES - 조직별 LMS 스코핑 |
| Q2. 다른 모듈과 역할이 겹치는가? | ❌ NO |
| Q3. Extension이 Core를 흔드는가? | ❌ NO |
| Q4. 지금 안 써도 되는 기능인가? | ❌ NO |

### 5.3 분류: **KEEP**

---

## 6. Frontend 현황

### 6.1 Admin Dashboard

| 페이지 | 위치 | 상태 | 분류 |
|--------|------|------|------|
| Yaksa Dashboard | `pages/lms-yaksa/dashboard/` | Active | KEEP |
| Assignments | `pages/lms-yaksa/assignments/` | Active | KEEP |
| Required Policy | `pages/lms-yaksa/required-policy/` | Active | KEEP |
| Credits | `pages/lms-yaksa/credits/` | Active | KEEP |
| License Profiles | `pages/lms-yaksa/license-profiles/` | Active | KEEP |
| Quiz Campaign | `pages/marketing/publisher/quiz/` | Active | KEEP |
| Survey Campaign | `pages/marketing/publisher/survey/` | Active | KEEP |

### 6.2 Main Site (Viewer)

| 컴포넌트 | 위치 | 상태 | 분류 |
|----------|------|------|------|
| ContentBundleViewer | `components/lms-core/viewer/` | Active | KEEP |
| QuizRunner | `components/lms-core/viewer/` | Active | KEEP |
| SurveyRunner | `components/lms-core/viewer/` | Active | KEEP |
| MyCoursesPage | `pages/lms/` | Active | KEEP |
| CourseDetailPage | `pages/lms/` | Active | KEEP |
| LessonPage | `pages/lms/` | Active | KEEP |
| Member Dashboard | `pages/member/lms/` | Active | KEEP |

---

## 7. 고위험 영역 (상세 분석 필요)

### 7.1 Quiz/Survey 경계 문제

**현재 구조**:
```
lms-core
├── Quiz (Entity) - 퀴즈 콘텐츠 정의
├── QuizAttempt (Entity) - 퀴즈 응시 기록
├── Survey (Entity) - 설문 정의
├── SurveyQuestion (Entity) - 설문 문항
└── SurveyResponse (Entity) - 설문 응답

lms-marketing
├── MarketingQuizCampaign - 퀴즈 캠페인 (Core Quiz 래핑?)
└── SurveyCampaign - 설문 캠페인 (Core Survey 래핑?)
```

**명확화 필요**:
1. Campaign은 Core의 "실행 컨텍스트"인가?
2. Campaign이 별도 Quiz/Survey를 생성하는가?
3. 하나의 Quiz가 여러 Campaign에서 재사용되는가?

### 7.2 ContentBundle vs ProductContent

**현재 구조**:
```
lms-core
└── ContentBundle
    ├── type: EDUCATION (교육 콘텐츠)
    ├── type: PRODUCT (제품 정보)
    ├── type: CAMPAIGN (캠페인)
    ├── type: INFO (정보)
    └── type: MARKETING (마케팅)

lms-marketing
└── ProductContent (별도 Entity?)
```

**명확화 필요**:
1. ProductContent는 ContentBundle type=PRODUCT의 특화 버전인가?
2. 별도 테이블인가, 같은 테이블의 다른 view인가?

### 7.3 Engagement Log 성능

**현재 구조**:
- `lms_engagement_logs` 테이블에 모든 이벤트 기록
- Event types: VIEW, CLICK, REACTION, QUIZ_SUBMIT, SURVEY_SUBMIT, ACKNOWLEDGE, COMPLETE

**잠재적 이슈**:
- 대량 트래픽 시 테이블 폭증
- 인덱스 전략 검토 필요
- 파티셔닝 고려 필요

---

## 8. 최종 분류 요약

| 모듈/기능 | 분류 | 액션 |
|-----------|------|------|
| **lms-core** | KEEP | 유지 (FROZEN) |
| **lms-yaksa** | KEEP | 유지 |
| **lms-marketing** | REFACTOR | Work Order 생성 |
| **organization-lms** | KEEP | 유지 |
| Quiz Core | KEEP | 유지 |
| Survey Core | KEEP | 유지 |
| Quiz Campaign | REFACTOR | 경계 명확화 |
| Survey Campaign | REFACTOR | 경계 명확화 |
| ContentBundle | KEEP | 유지 |
| ProductContent | RELOCATE | ContentBundle과 관계 정립 |
| Engagement Log | KEEP | 성능 모니터링 |
| All Frontend | KEEP | 유지 |

---

## 9. 권장 Work Order

### WO-LMS-BOUNDARY-CLARIFICATION-V1

**목적**: Quiz/Survey Core vs Campaign 경계 명확화

**범위**:
1. Quiz Core와 Quiz Campaign의 관계 정의
2. Survey Core와 Survey Campaign의 관계 정의
3. ContentBundle과 ProductContent의 관계 정의

**예상 결과**:
- 명확한 아키텍처 문서
- 필요시 코드 리팩토링

**우선순위**: Medium (당장 문제는 아니나, 확장 시 리스크)

---

## 10. 결론

**현재 상태**: LMS 계열은 전반적으로 **건강한 상태**

**강점**:
- Core-Extension 분리 명확
- Yaksa 특화 로직 격리 성공
- Frontend 구현 완성도 높음

**개선 필요**:
- lms-marketing의 Campaign vs Core 경계 명확화
- ContentBundle 타입 시스템 정리

**즉시 조치 불필요**: 현재 운영에 문제 없음
**중기 과제**: lms-marketing 경계 정리 Work Order 진행 권장

---

*Document Created: 2026-01-17*
*Author: Claude AI (As-Is Audit)*
