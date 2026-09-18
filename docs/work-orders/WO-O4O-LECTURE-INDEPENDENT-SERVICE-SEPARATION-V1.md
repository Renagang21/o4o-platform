# WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1

> **종류**: Service Separation / Runtime Ownership Migration / LMS Adoption
> **상태**: READY FOR EXECUTION (핸드오프 전용 · 명시 지시 전 실행 금지)
> **도메인 확정**: `LECTURE_DOMAIN = study.neture.co.kr` (2026-09-18 확정)
> **실행 전제**: [`IR-O4O-LECTURE-INDEPENDENT-SERVICE-PRODUCTION-DATA-CENSUS-V1`](../investigations/IR-O4O-LECTURE-INDEPENDENT-SERVICE-PRODUCTION-DATA-CENSUS-V1.md) `= PASS` (2026-09-18 · `5ba9481af`)
> **작성 기준일**: 2026-09-18
> **본 문서 성격**: 구현 지시용 WO. 본 문서 작성 자체로 코드·DB·배포를 변경하지 않는다.
> **관련 정본**: [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) · [`O4O-CORE-FREEZE-V1`](../architecture/O4O-CORE-FREEZE-V1.md) · [`RBAC-FREEZE-DECLARATION-V1`](../rbac/RBAC-FREEZE-DECLARATION-V1.md) · [`APP-LMS-BASELINE`](../architecture/APP-LMS-BASELINE.md) · [`PRODUCTION-MIGRATION-STANDARD`](../baseline/operations/PRODUCTION-MIGRATION-STANDARD.md)
> **serviceKey SSOT**: `apps/api-server/src/config/service-catalog.ts` `O4O_SERVICES[]` · Cloud Run 명명 규칙 `{serviceKey}-web` (`.github/workflows/deploy-web-services.yml`)

---

# 1. 목적 · 목표 상태 · 확정 Identity

## 1.1 목적

현재 KPA-Society · K-Cosmetics · PharmacyHub에 분산되어 있는 강의/LMS 사용자·강사·운영 기능을 제거하고, 기존 O4O 공통 LMS Core를 사용하는 **독립 강의 서비스 하나로 강의 도메인의 소유권을 수렴**한다.

이번 작업은 LMS를 새로 만드는 작업이 아니다.

```text
기존

KPA-Society ───┐
K-Cosmetics ───┼── LMS Core
PharmacyHub ───┘
Platform Admin ─┘


목표

KPA-Society       LMS runtime consumer 0
K-Cosmetics       LMS runtime consumer 0
PharmacyHub       LMS runtime consumer 0
Platform Admin    LMS instructor 업무 surface 0

                     │
                     ▼
               O4O 강의 서비스
                     │
                     ▼
                  LMS Core
```

공통 Identity/Auth Core와 LMS Core는 유지한다.

---

## 1.2 확정 Service Identity

본 WO에서 다음 값을 canonical로 사용한다.

```text
SERVICE_DISPLAY_NAME = O4O 강의

LECTURE_SERVICE_KEY = lecture
LECTURE_ROLE_PREFIX = lecture

LECTURE_WEB_APP_DIRECTORY = services/web-lecture
LECTURE_CLOUD_RUN_SERVICE = lecture-web
LECTURE_DOMAIN = study.neture.co.kr
```

Role:

```text
lecture:instructor
lecture:operator
lecture:admin
```

일반 학습자용 `lecture:member` role은 만들지 않는다.

일반 사용자의 강의 서비스 가입 여부는 다음이 SSOT다.

```text
service_memberships
  service_key = 'lecture'
  status = 'active'
```

따라서 불변식은 다음과 같다.

```text
Identity
≠ Service Membership
≠ Service Role
≠ Enrollment
```

---

## 1.3 Domain

`LECTURE_DOMAIN`은 다음으로 확정한다 (2026-09-18).

```text
LECTURE_DOMAIN = study.neture.co.kr
```

* 호스트명이 `neture.co.kr` 하위라는 사실은 DNS 배치일 뿐이다. Lecture 는 Neture 의 하위 기능이 아니며 Neture membership · role · runtime 에 의존하지 않는다 (§3.4 · §7.3).
* canonical domain은 `O4O_SERVICES[]`의 `domain`을 정본으로 한다. 값은 이 한 곳에서만 바꾼다.
* workflow의 `VITE_SERVICE_URL_*` 값은 이 정본을 mirror한다.
* certificate verification host · notification targetUrl 은 이 값을 기준으로 한다 (§4.8 · §5.3).

---

## 1.4 매우 중요한 명칭 주의

본 구조에서는 같은 문자열 `lecture`가 서로 다른 두 축에 존재한다.

```text
lms_courses.content_kind = 'lecture'
```

은 **콘텐츠 종류**이고,

```text
lms_courses.service_key = 'lecture'
```

는 **Service Identity**다.

둘은 전혀 다른 컬럼·의미다.

따라서 SQL, 로그, DTO, 테스트, CHECK에서 반드시:

```text
contentKind
serviceKey
```

를 명시적으로 구분한다.

`lecture='lecture'`처럼 축을 생략한 표현을 새 코드에 사용하지 않는다.

---

# 2. 기준선 · 운영 데이터 · 핵심 설계 원칙

## 2.1 작업 시작 기준

실행 시 반드시 최신 main에서 시작한다.

```text
git fetch origin
git status -sb
git pull --ff-only
```

과거 특정 commit을 기준점으로 고정하지 않는다.

다른 세션의 dirty/WIP 파일을 발견하면:

* 수정하지 않는다.
* stash하지 않는다.
* 삭제하지 않는다.
* 동일 파일이 본 WO 대상과 겹치면 즉시 보고하고 해당 경로 작업을 중단한다.

---

## 2.2 Production 데이터 기준

2026-09-18 read-only census를 기준선으로 한다.

### Course

```text
lms_courses = 11
content_kind='lecture' = 11
content_resource = 0
NULL service_key = 0
```

귀속:

```text
kpa-society = 8
  published = 5
  pending_review = 1
  archived = 2

pharmacy-hub = 3
  archived = 3

k-cosmetics = 0
```

추가:

```text
paid course = 0
organization scoped course = 0
rewardPolicy course = 0
```

### 하위 데이터

```text
lessons       = 10
enrollments   = 3
quizzes       = 6
assignments   = 1

progress      = 0
certificates  = 0
completions   = 0
quiz attempts = 0
submissions   = 0
```

### 사용자 / 권한

```text
distinct LMS users = 1
course instructors = 1
active lms:instructor = 0
강사 승인 이력 = 0
```

유일한 LMS user는 WO-2C cleanup user다.

기존 실제 사용자/강사/학습자 migration 모집단은 사실상 없다.

### Integrity

```text
orphan paths = 0
certificate compatibility required = NO
reward migration required = NO
paid course migration required = NO
organization scope migration required = NO
```

---

## 2.3 데이터 보존 원칙

새 LMS 테이블을 만들지 않는다.

다음 ID를 유지한다.

```text
Course ID
Lesson ID
Enrollment ID
Quiz ID
Assignment ID
userId
instructorId
```

강의 데이터를 복제해서 새 서비스 데이터로 만들지 않는다.

기존 DB row를 유지한 채 **Course ownership만 변경**한다.

하위 데이터는 Course/Lesson/Enrollment FK를 그대로 따라간다.

---

## 2.4 기존 사용자 membership/role migration

자동 migration은 하지 않는다.

```text
Lecture membership migration = 0
Lecture role migration = 0
lms:instructor migration = 0
```

cleanup user가 기존 course의 `instructorId`, enrollment의 `userId`라는 이유만으로:

```text
lecture membership
lecture:instructor
lecture:operator
lecture:admin
```

을 자동 생성하지 않는다.

향후 실제 사용자는 강의 서비스 최초 진입 시:

```text
Identity
→ Lecture 가입
→ Lecture 약관 동의
→ Lecture membership
→ 필요 역할 부여
```

순서로 들어온다.

---

# 3. 구현 범위 · 제거 범위 · 비범위

## 3.1 신규 Lecture Service Foundation

다음 축을 신규 서비스로 등록한다.

```text
SERVICE_KEYS
O4O_SERVICES
platform_services
security scope
legal service scope
membership
role catalog
frontend app
Dockerfile
deploy-web-services
CORS/service origins
footer legal
terms/privacy
certificate domain
```

Workspace metadata는 실제 업무에 맞게 결정하되, **강의 서비스를 Store Workspace로 취급하지 않는다.**

운영자 workspace는 존재한다.

---

## 3.2 LMS Core 유지

다음 Core는 삭제하거나 복제하지 않는다.

```text
apps/api-server/src/modules/lms

packages/lms-core
packages/lms-client
packages/lms-ui
```

핵심 도메인:

```text
Course
Lesson
Enrollment
Progress
Quiz
QuizAttempt
Assignment
Submission
CourseCompletion
Certificate
```

Lecture 서비스는 이 Core의 유일한 사용자-facing 강의 애플리케이션이 된다.

---

## 3.3 LMS Core에서 제거할 서비스 종속성

반드시 제거하거나 서비스 중립 구조로 교체한다.

```text
kpaLmsScopeGuard

kpa:admin course ownership bypass
kpa:admin instructor bypass
kpa:admin quiz bypass
kpa:admin assignment bypass
kpa:admin enrollment elevated-manager bypass

KPA-only certificate admin guard
KPA-only instructor application admin guard

NULL serviceKey → kpa-society fallback
first active service_membership → Course serviceKey 추론
```

특히 현재:

```text
app.use('/api/v1/lms', kpaLmsScopeGuard);
app.use('/api/v1/lms', lmsRoutes);
```

에서 KPA 전용 선행 middleware를 제거한다.

완료 후:

```text
KPA_LMS_SCOPE_GUARD = 0
```

이어야 한다.

---

## 3.4 Lecture 접근 경계

Lecture의 회원제 강의는 단순 로그인 여부로 판정하지 않는다.

```text
PUBLIC
→ 공개 강의 정책

MEMBERS
→ authenticated
→ active Lecture membership
→ requiresApproval / enrollment 정책
```

KPA/KCos/PH 회원이라는 이유만으로 Lecture `members` course에 접근할 수 없어야 한다.

---

## 3.5 Course 생성

Lecture에서 생성하는 Course의 serviceKey는 서버가 강제한다.

```text
course.serviceKey = 'lecture'
```

클라이언트가 arbitrary serviceKey를 전달하여 다른 서비스 Course를 만들게 하지 않는다.

사용자의 첫 service membership을 보고 serviceKey를 추론하지 않는다.

---

## 3.6 Lecture Frontend

### Learner

최소 제공:

```text
강의 목록
강의 상세
레슨 플레이어
수강 신청
내 수강
퀴즈
과제
진도
수료
내 수료증
수료증 공개 검증
```

### Instructor

최소 제공:

```text
강사 홈
내 강의
강의 생성
강의 편집
레슨 구성
퀴즈
과제
수강자 관리
승인제 수강 승인/거절
과제 채점
진행 현황
강의 승인 요청
```

권한:

```text
lecture:instructor
```

### Operator

최소 제공:

```text
강의 검토
승인
반려
비공개
archive
필요 시 hard delete
강사 운영
```

권한:

```text
lecture:operator
lecture:admin
```

KPA/KCos/PH operator/admin role은 Lecture 권한 근거가 아니다.

---

## 3.7 강사 신청

현재 운영 DB에는 다음 데이터가 모두 0이다.

```text
lms_instructor_applications
qualification_requests(lms_creator/instructor)
member_qualifications
KPA instructor qualification
```

따라서 강사 승인 이력 migration은 없다.

KPA의:

```text
kpa_approval_requests
kpa_instructor_qualifications
kpa:operator
```

를 Lecture 강사 자격 체계로 가져오지 않는다.

기존 `lms_instructor_applications`가 Lecture service scope를 안전하게 수용할 수 있는지 먼저 확인하고:

* 재사용 가능 → service-scoped 구조로 정리
* 재사용 부적합 → Lecture 전용 최소 신청 구조 도입

으로 한다.

데이터가 0이므로 backward compatibility를 위해 잘못된 구조를 유지하지 않는다.

---

## 3.8 AI First

신규 서비스의 기본 저작 흐름:

```text
ChatGPT / 외부 AI
→ 강의 구조·레슨 초안
→ Lecture Import
→ Preview
→ Lecture Editor
→ 저장
→ 승인
```

최소 기능:

```text
강의 제작 Prompt
외부 AI 이용 가이드
Course Import
Import Preview
편집 후 저장
```

Import format은 특정 AI vendor에 종속하지 않는다.

기존:

```text
CourseStructureAiModal
/api/ai/course-structure
/api/ai/lesson-body
```

는 Lecture 흐름 구축 후 consumer 0을 확인하고 제거한다.

공통 `/api/ai/content`, `AiContentModal` 등 다른 업무 consumer가 있는 공통 기능은 삭제하지 않는다.

---

## 3.9 본 WO 비범위

다음은 신규 설계하지 않는다.

```text
유료 강의
Lecture reward budget
KPA point budget 정합 수정
Marketplace
결제
새 LMS engine
새 Course/Enrollment 테이블
KPA 자격 정책의 Lecture 이전
WebMCP write
```

WebMCP는 향후:

```text
Lecture-owned data read-only
```

원칙만 유지한다.

---

# 4. Cutover · 데이터 Migration · 기존 서비스 제거

## 4.1 Pre-Cutover 소비자 제거

Course `service_key`를 바꾸기 전에 세 서비스의 raw LMS 소비를 제거한다.

### KPA-Society

최소 대상:

```text
Home latest course
Home 강의 카드
강의 바로가기
/lms*
/instructor*
/operator/lms*
/operator/qualification-requests
/mypage/enrollments
/mypage/certificates
/certificate/verify/*
/guide/features/lms
/services/lms
Footer 강의 링크
User Menu 강사 링크
```

KPA Home의 unscoped `lms_courses` query는 migration 전에 반드시 제거한다.

### K-Cosmetics

최소 대상:

```text
Home latest course
Home 강의 카드
/lms*
/instructor*
/operator/lms*
/mypage/enrollments
/mypage/certificates
LMS API adapter
Guide 강의 copy
lms_course Appreciation consumer
```

K-Cosmetics의 unscoped/stale Home course query는 고쳐서 유지하지 않고 제거한다.

### PharmacyHub

최소 대상:

```text
Home latest course
Home 교육 카드
Header 교육
Footer 교육
/education*
/instructor*
/operator/lms*
/account/enrollments
/account/certificates
/certificate/verify/*
교육 관련 Guide
LMS API adapter
InstructorGate
```

---

## 4.2 Platform Admin

현재:

```text
/admin/lms-instructor
/admin/lms-instructor/dashboard
```

가 공통 LMS Instructor API를 소비한다.

Lecture 서비스 구축 후 제거한다.

강의 운영 업무를 Platform Admin에 두지 않는다.

---

## 4.3 기존 서비스 LMS Write Freeze

migration 직전에 세 기존 서비스에서 새로운 LMS 데이터가 생기지 않도록 write entry를 닫는다.

대상:

```text
course create/update
lesson create/update
quiz create/update
assignment create/update
operator approve/reject
instructor enrollment approve/reject
```

Read surface와 write surface 제거 순서는 데이터 migration 안전성을 기준으로 한다.

---

## 4.4 Migration 직전 Re-Census

실제 UPDATE 직전에 production read-only census를 재실행한다.

다음 중 하나라도 기준선과 다르면 STOP한다.

```text
course total != 11
content_resource != 0
NULL serviceKey != 0

certificate != 0
rewardPolicy != 0
paid course != 0
organization scoped != 0

orphan != 0
lms:instructor assignment != 0

실제 신규 강사/수강생 데이터 발생
```

변화가 있으면 데이터 migration을 실행하지 않는다.

---

## 4.5 Course Ownership Migration

대상:

```sql
content_kind = 'lecture'
AND service_key IN ('kpa-society', 'pharmacy-hub')
```

예상:

```text
11 rows
```

변경:

```text
service_key
  kpa-society / pharmacy-hub
        ↓
      lecture
```

변경하지 않는 값:

```text
id
instructorId
organizationId
createdAt
publishedAt
course content
lesson IDs
enrollment IDs
quiz IDs
assignment IDs
user IDs
```

UPDATE count가 정확히 예상값과 일치하지 않으면 rollback한다.

---

## 4.6 하위 데이터

별도 copy/update를 기본으로 하지 않는다.

기존 FK:

```text
Lesson → Course
Enrollment → Course
Quiz → Course/Lesson
Assignment → Lesson
```

를 그대로 보존한다.

Migration 후 expected:

```text
courses       11 / 11
lessons       10 / 10
enrollments    3 / 3
quizzes        6 / 6
assignments    1 / 1
```

나머지 현재 0 row 테이블도 schema/runtime은 Lecture에서 계속 사용한다.

---

## 4.7 currentEnrollments 정합 복구

현재 production에서:

```text
7 / 11 course
currentEnrollments != 실제 enrollment 수
```

이다.

WO-2C의 사용자 정리 후 counter가 stale해진 결과다.

Course ownership migration 시 또는 직후, canonical Enrollment 정책에 맞춰 11개 Course의 `currentEnrollments`를 실 enrollment 수로 재계산한다.

완료 조건:

```text
currentEnrollments integrity = PASS
```

---

## 4.8 Certificate

현존 certificate:

```text
0
```

이므로 과거 KPA/KCos/PH certificate URL redirect는 만들지 않는다.

신규 certificate만:

```text
serviceKey = lecture
verification host = LECTURE_DOMAIN
```

을 사용한다.

unknown/null을 KPA domain으로 보내는 fallback은 Lecture에 적용하지 않는다.

---

## 4.9 Point / Reward

현재:

```text
course rewardPolicy = 0
lesson rewardPolicy = 0
quiz rewardPolicy = 0
LMS credit tx = 0
```

따라서 초기 Lecture 정책:

```text
reward = OFF
Lecture budget auto-create = NO
KPA budget inheritance = NO
```

KPA 기존:

```text
allocated = 10000
used = 680
```

은 이번 WO에서 건드리지 않는다.

`used_amount`와 남아 있는 credit tx의 불일치는 별도 Point 정합 문제다.

---

# 5. Legacy Role · KPA Coupling · Notification 정리

## 5.1 `lms:instructor`

현재 production assignment:

```text
0
```

그러나 repository consumer는 다수 존재한다.

전수 census 기준 약 33 파일의 코드 소비를 재확인하고 실제 runtime/legacy/history로 분류한다.

주요 대상:

```text
requireInstructor
CourseController
Enrollment elevated manager
QuizController
AssignmentController

KPA Header/UserMenu
K-Cosmetics route/header
PharmacyHub InstructorGate

KPA qualification role assignment
types/roles.ts
tests
migration compatibility
```

순서:

```text
신규 lecture:instructor 동작 확보
→ 기존 서비스 runtime consumer 제거
→ lms:instructor 신규 부여 경로 0
→ runtime consumer 0
→ DB active assignment 0 재확인
→ legacy role 은퇴
```

과거 migration 이력은 삭제하지 않는다.

---

## 5.2 KPA Qualification

다음 결합을 제거한다.

```text
kpaLmsScopeGuard
KPA qualification → LMS write permission
KPA qualification → lms:instructor assignment
KPA operator qualification request의 LMS 강사 의미
```

KPA의 강의와 무관한 다른 자격 기능까지 같이 제거하지 않는다.

---

## 5.3 Notification

LMS lifecycle notification:

```text
lms.course_submitted
lms.course_approved
lms.course_rejected
```

을 Lecture-owned notification으로 정리한다.

필수:

```text
serviceKey = lecture
targetUrl = LECTURE_DOMAIN 기반 route
```

KPA/KCos/PH URL을 추론하지 않는다.

---

## 5.4 LMS Core Manifest

LMS Core manifest에 남은 application route/menu metadata:

```text
/admin/lms/*
/lms/*
```

를 Core ownership과 분리한다.

목표:

```text
LMS Core
= domain/entity/service/API capability

Lecture Service
= frontend/routes/navigation/application ownership
```

Core 패키지 자체는 유지한다.

---

# 6. 실행 순서 · 중지 조건

## 6.1 실행 순서

다음 순서를 기본으로 한다.

```text
01. 최신 origin/main 동기화 / parallel WIP 확인

02. Lecture Identity 확정값 반영
    serviceKey = lecture
    role prefix = lecture
    web app = services/web-lecture
    Cloud Run = lecture-web
    domain = study.neture.co.kr

03. Lecture Service Foundation
    catalog / service key / roles / legal / deploy / CORS

04. Lecture membership + terms boundary

05. LMS Core KPA hardcode 제거

06. Lecture learner surface 구축

07. Lecture instructor surface 구축

08. Lecture operator surface 구축

09. 외부 LLM Prompt + Course Import 최소 흐름

10. KPA/KCos/PH Home/latest course 직접 소비 제거

11. 기존 세 서비스 LMS write freeze

12. migration 직전 production read-only re-census

13. 11 course service_key → lecture transactional migration

14. currentEnrollments integrity 복구

15. Lecture production E2E

16. KPA LMS surface 완전 제거

17. K-Cosmetics LMS surface 완전 제거

18. PharmacyHub LMS surface 완전 제거

19. Platform Admin LMS instructor surface 제거

20. lms:instructor runtime consumer 제거 및 은퇴

21. KPA LMS qualification / guard residue 제거

22. legacy course AI endpoint consumer 0 확인 후 cleanup

23. repository-wide dependency-zero census

24. cross-service regression

25. CHECK 작성

26. path-specific commit / push
```

필요하면 위 단계를 여러 commit으로 나눌 수 있으나 최종 완료 판정은 본 WO 하나에서 한다.

---

## 6.2 강제 STOP 조건

다음 중 하나면 임의 판단으로 계속 진행하지 않는다.

### Git / 병렬작업

```text
본 WO 대상 파일에 다른 세션의 수정 발견
merge/rebase 충돌
origin/main과 예상치 못한 drift
```

### Production data

```text
course != 11
content_resource > 0
NULL serviceKey > 0
certificate > 0
rewardPolicy > 0
paid > 0
organization scoped > 0
orphan > 0
lms:instructor assignment > 0
새 실제 LMS 사용자 발생
```

### Architecture

```text
Lecture가 KPA/KCos/PH membership을 필요로 함
기존 서비스 role을 Lecture permission으로 재사용해야 함
Course ID/FK를 유지할 수 없음
LMS Core 복제가 필요해짐
```

### Legal/Auth

```text
Lecture membership 생성이 다른 서비스의 terms gate에 영향을 줌
Lecture terms/privacy/public legal이 준비되지 않음
Identity 전환 세션과 동일 핵심 파일 충돌
```

### Deployment

```text
certificate verification URL 미확정
Cloud Run / CORS / handoff route 불완전
```

---

# 7. 검증 · 완료 기준 · 산출물

## 7.1 Lecture Production E2E

최소 다음을 실 production에서 검증한다.

```text
공개 강의 목록
회원제 강의 membership 차단
로그인
가입
약관 동의

강의 상세
수강
레슨
quiz
assignment
progress

강사 강의 생성
강사 강의 편집
레슨 구성
승인 요청

operator 승인
operator 반려
수강 승인제

certificate 신규 발급
certificate 공개 검증
notification target

desktop
mobile
```

테스트 fixture를 만들 경우 최소 범위로 하고 정리 결과를 CHECK에 남긴다.

---

## 7.2 Cross-Service Regression

### KPA-Society

```text
Community
Forum
Content
Resources
Survey
Store
Operator
```

### K-Cosmetics

```text
Community
Forum
Content
Resources
Store
Operator
```

### PharmacyHub

```text
Community
Forum
Content
Resources
Store
B2B order/payment
Operator
```

강의 삭제 때문에 다른 기능의 route/menu/home가 손상되지 않아야 한다.

---

## 7.3 Dependency-Zero Census

KPA/KCos/PH 각각에서 다음 runtime 소비를 검색한다.

```text
/lms
/education
/instructor
lms:instructor
lms_courses
@o4o/lms-client
@o4o/lms-ui
kpaLmsScopeGuard
```

단순 역사 문서/과거 migration 주석과 실제 runtime consumer를 구분한다.

Lecture 쪽에서는:

```text
kpa:
kpa-society
cosmetics:
k-cosmetics
pharmacy-hub:
pharmacy-hub
```

를 검색한다.

허용:

```text
역사 기록
migration 설명
회귀 테스트의 과거값
일반 public URL 링크
```

금지:

```text
authorization
membership lookup
role inheritance
runtime API dependency
```

---

## 7.4 최종 완료 조건

```text
LECTURE_INDEPENDENT_SERVICE = PASS

LECTURE_SERVICE_KEY = lecture
LECTURE_ROLE_PREFIX = lecture

LECTURE_MEMBER_ROLE = NONE
LECTURE_MEMBERSHIP_SSOT = service_memberships

KPA_LMS_RUNTIME_CONSUMER = 0
KCOS_LMS_RUNTIME_CONSUMER = 0
PHARMACYHUB_LMS_RUNTIME_CONSUMER = 0
PLATFORM_ADMIN_LMS_WORK_SURFACE = 0

KPA_ROLE_TO_LECTURE_PERMISSION = 0
KCOS_ROLE_TO_LECTURE_PERMISSION = 0
PH_ROLE_TO_LECTURE_PERMISSION = 0

KPA_LMS_SCOPE_GUARD = 0

LEGACY_LMS_INSTRUCTOR_RUNTIME_CONSUMER = 0
LEGACY_LMS_INSTRUCTOR_ASSIGNMENTS = 0
LEGACY_LMS_INSTRUCTOR_NEW_GRANT_PATH = 0

LECTURE_SERVICE_MEMBERSHIP_BOUNDARY = PASS
LECTURE_ROLE_BOUNDARY = PASS

COURSE_MIGRATION = 11 / 11
LESSON_PRESERVED = 10 / 10
ENROLLMENT_PRESERVED = 3 / 3
QUIZ_PRESERVED = 6 / 6
ASSIGNMENT_PRESERVED = 1 / 1

CONTENT_KIND_LECTURE_PRESERVED = 11 / 11
SERVICE_KEY_LECTURE = 11 / 11

ID_PRESERVATION = PASS
ORPHANS_AFTER_MIGRATION = 0

CURRENT_ENROLLMENT_COUNTER_INTEGRITY = PASS

CERTIFICATE_LEGACY_REDIRECT_REQUIRED = NO
LECTURE_CERTIFICATE_HOST = PASS

LECTURE_REWARD_INITIAL_STATE = OFF
REWARD_INHERITANCE = 0
KPA_POINT_BUDGET_MUTATION = 0

LECTURE_TO_KPA_RUNTIME_DEPENDENCY = 0
LECTURE_TO_KCOS_RUNTIME_DEPENDENCY = 0
LECTURE_TO_PH_RUNTIME_DEPENDENCY = 0

KPA_TO_LECTURE_RUNTIME_DEPENDENCY = 0
KCOS_TO_LECTURE_RUNTIME_DEPENDENCY = 0
PH_TO_LECTURE_RUNTIME_DEPENDENCY = 0

PRODUCTION_E2E = PASS
CROSSSERVICE_REGRESSION = PASS
```

---

## 7.5 Git 규칙

본 WO의 커밋은 작업 파일만 명시적으로 staging한다.

금지:

```text
git add .
git add -A
```

공통 Core와 서비스 파일이 함께 변경되므로 commit을 논리적 단계별로 나누되, 다른 세션 파일을 포함하지 않는다.

최종 CHECK에는:

* 시작 HEAD
* 종료 HEAD
* 주요 commit
* migration 결과
* production re-census
* E2E
* cross-service regression
* dependency-zero census
* 다른 세션 WIP 미접촉 여부

를 기록한다.

---

# 최종 목표

본 WO의 완료 상태는 단순히 신규 `web-lecture`가 동작하는 것이 아니다.

완료 상태는 다음이다.

> **강의 도메인의 membership · role · 사용자 화면 · 강사 화면 · 운영자 화면 · Course ownership · 인증서 · 알림의 런타임 소유자가 `lecture` 서비스 하나로 수렴하고, KPA-Society · K-Cosmetics · PharmacyHub는 LMS Core를 사용자-facing 서비스 기능으로 더 이상 소비하지 않는다.**

LMS Core는 O4O 공통 플랫폼 자산으로 유지한다.

강의 서비스는 이를 사용하는 독립 애플리케이션이다.
