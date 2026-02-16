# IR-KPA-A-ADMIN-OPERATOR-STRUCTURE-AUDIT-V1

**KPA-a Admin / Operator 기능 구조 정렬 조사 결과 보고서**

> 조사일: 2026-02-15
> 범위: Backend API 전수 + Frontend Guard 전수 + Role/Scope 체계 전수
> 기준: KPA-a Admin/Operator 기능 분리 트리

---

## 0. Executive Summary

### 조사 규모

| 영역 | 파일 수 | 엔드포인트 수 |
|------|---------|-------------|
| KPA Backend (routes/kpa/) | 15 | 70+ |
| Forum Module | 6 controllers | 24+ |
| LMS Module | 10 controllers | 84 |
| Signage Module | 8+ files | 42 |
| Role/Scope System | 5 core files | 8 |
| Frontend Guards | 5 guard files | 50+ routes |
| **합계** | **49+ files** | **278+ endpoints** |

### 위험도 요약

| 등급 | 건수 | 핵심 문제 |
|------|------|----------|
| :red_circle: Critical | **12** | Operator가 Role 부여 가능, Guard 완전 누락 구간 |
| :orange_circle: High | **8** | 구조 생성 API가 requireAuth만 적용 |
| :yellow_circle: Medium | **6** | 정책 API가 requireOperator로 보호 |
| :green_circle: Safe | **다수** | 설계 기준 일치 |

---

## 1. API 레벨 전수 조사 (Section A)

### 1-A. KPA Core APIs

| API | 현재 Guard | 현재 Role | 구조/운영 분류 | 올바른 영역 | 문제 여부 |
|-----|-----------|----------|-------------|-----------|----------|
| `POST /kpa/organizations` | requireAuth + requireKpaScope('kpa:admin') | kpa:admin | 구조 생성 | Admin | :green_circle: Safe |
| `PATCH /kpa/organizations/:id` | requireAuth + requireKpaScope('kpa:admin') | kpa:admin | 구조 변경 | Admin | :green_circle: Safe |
| `GET /kpa/members` | requireAuth + requireKpaScope('kpa:operator') | kpa:operator | 운영 조회 | Operator | :green_circle: Safe |
| `PATCH /kpa/members/:id/status` | requireAuth + requireKpaScope('kpa:operator') | kpa:operator | 운영 실행 | Operator | :green_circle: Safe |
| **`PATCH /kpa/members/:id/role`** | requireAuth + requireKpaScope('kpa:admin') | kpa:admin | **권한 변경** | Admin | :green_circle: Safe |
| `GET /kpa/applications/admin/all` | requireAuth + requireKpaScope('kpa:operator') | kpa:operator | 운영 조회 | Operator | :green_circle: Safe |
| `PATCH /kpa/applications/:id/review` | requireAuth + requireKpaScope('kpa:operator') | kpa:operator | 운영 실행 | Operator | :yellow_circle: 논의 필요 (승인=구조?) |
| `GET /kpa/admin/dashboard/*` | requireAuth + isAdminOrOperator() | kpa:admin OR kpa:operator | 운영 조회 | Operator | :green_circle: Safe |
| `GET /kpa/operator/audit-logs` | requireAuth + requireKpaScope('kpa:admin') | kpa:admin | 감사 조회 | Admin | :green_circle: Safe |
| `POST /kpa/stewards` | requireAuth + requireKpaScope('kpa:admin') | kpa:admin | 구조 생성 | Admin | :green_circle: Safe |
| `PATCH /kpa/stewards/:id/revoke` | requireAuth + requireKpaScope('kpa:admin') | kpa:admin | 권한 변경 | Admin | :green_circle: Safe |
| `GET /kpa/join-inquiries` | requireAuth + requireKpaScope('kpa:admin') | kpa:admin | 구조 관리 | Admin | :green_circle: Safe |
| `PATCH /kpa/organization-join-requests/:id/approve` | requireAuth + isAdminOrOperator() | kpa:admin OR kpa:operator | 운영 실행 | Operator | :yellow_circle: 승인=구조 판단 필요 |

### 1-B. Forum APIs

| API | 현재 Guard | 현재 Role | 구조/운영 분류 | 올바른 영역 | 문제 여부 |
|-----|-----------|----------|-------------|-----------|----------|
| **`POST /forum/categories`** | authenticate only | **아무 인증 사용자** | **구조 생성** | **Admin** | :red_circle: **Critical** |
| **`PUT /forum/categories/:id`** | authenticate only | **아무 인증 사용자** | **구조 변경** | **Admin** | :red_circle: **Critical** |
| **`DELETE /forum/categories/:id`** | authenticate only | **아무 인증 사용자** | **구조 삭제** | **Admin** | :red_circle: **Critical** |
| `GET /forum/moderation` | authenticate + role check | admin/manager | 운영 실행 | Operator | :green_circle: Safe |
| `POST /forum/moderation/:type/:id` | authenticate + role check | admin/manager | 운영 실행 | Operator | :green_circle: Safe |
| **`PATCH /forum/category-requests/:id/approve`** | authenticate only | **아무 인증 사용자** | **구조 승인** | **Admin** | :red_circle: **Critical** |
| **`PATCH /forum/category-requests/:id/reject`** | authenticate only | **아무 인증 사용자** | **구조 거부** | **Admin** | :red_circle: **Critical** |
| `POST /forum/posts` | authenticate | 인증 사용자 | 콘텐츠 생성 | Operator/User | :green_circle: Safe |
| `PUT /forum/posts/:id` | authenticate + author check | 작성자/admin | 콘텐츠 수정 | Operator | :green_circle: Safe |
| **`GET/PUT /forum/recommendations/config`** | authenticate only | **아무 인증 사용자** | **정책 변경** | **Admin** | :orange_circle: High |

### 1-C. Forum AI APIs

| API | 현재 Guard | 현재 Role | 구조/운영 분류 | 올바른 영역 | 문제 여부 |
|-----|-----------|----------|-------------|-----------|----------|
| **`POST /forum/ai/posts/:id/ai/process`** | authenticate only | **아무 인증 사용자** | 콘텐츠 변경 | Operator | :red_circle: **Critical** (타인 포스트 수정 가능) |
| **`POST /forum/ai/posts/:id/ai/regenerate`** | authenticate only | **아무 인증 사용자** | 콘텐츠 변경 | Operator | :red_circle: **Critical** |
| **`POST /forum/ai/posts/:id/ai/apply-tags`** | authenticate only | **아무 인증 사용자** | 콘텐츠 변경 | Operator | :red_circle: **Critical** |

### 1-D. LMS APIs

| API | 현재 Guard | 현재 Role | 구조/운영 분류 | 올바른 영역 | 문제 여부 |
|-----|-----------|----------|-------------|-----------|----------|
| `POST /lms/courses` (유료) | requireAuth + instructor check | lms:instructor | 구조 생성 | Admin (승인 후) | :green_circle: Safe |
| **`PATCH /lms/courses/:id`** | requireAuth only | **아무 인증 사용자** | **구조 변경** | Admin/Instructor | :red_circle: **Critical** |
| **`DELETE /lms/courses/:id`** | requireAuth only | **아무 인증 사용자** | **구조 삭제** | Admin | :red_circle: **Critical** |
| **`POST /lms/courses/:id/publish`** | requireAuth only | **아무 인증 사용자** | **구조 변경** | Admin | :orange_circle: High |
| **`POST /lms/certificates/issue`** | requireAuth only | **아무 인증 사용자** | **권한 부여** | Admin | :red_circle: **Critical** |
| **`POST /lms/certificates/:id/revoke`** | requireAuth only | **아무 인증 사용자** | **권한 회수** | Admin | :red_circle: **Critical** |
| `POST /lms/instructor/applications/:id/approve` | requireAdmin | platform:admin | 권한 부여 | Admin | :green_circle: Safe |
| `GET /lms/instructor/courses` | requireAuth + requireInstructor | lms:instructor | 운영 조회 | Operator | :green_circle: Safe |
| **`POST /lms/courses/:courseId/lessons`** | requireAuth only | **아무 인증 사용자** | **구조 생성** | Instructor/Admin | :orange_circle: High |
| **`PATCH /lms/quizzes/:id`** | requireAuth only | **아무 인증 사용자** | **콘텐츠 변경** | Instructor | :orange_circle: High |

### 1-E. Signage APIs

| API | 현재 Guard | 현재 Role | 구조/운영 분류 | 올바른 영역 | 문제 여부 |
|-----|-----------|----------|-------------|-----------|----------|
| Store Playlist CRUD | requireSignageStore | signage:store | 운영 실행 | Operator | :green_circle: Safe |
| Template CRUD | requireSignageOperator | signage:operator | 운영 실행 | Operator | :green_circle: Safe |
| HQ Content CRUD | requireSignageOperator | signage:operator | 운영 실행 | Operator | :green_circle: Safe |
| Channel 생성 | requireSignageAdmin | signage:admin | 구조 생성 | Admin | :green_circle: Safe |

### 1-F. Role/Scope Assignment APIs

| API | 현재 Guard | 현재 Role | 구조/운영 분류 | 올바른 영역 | 문제 여부 |
|-----|-----------|----------|-------------|-----------|----------|
| **`POST /users/:userId/roles`** | requireAuth only | **아무 인증 사용자** | **Role 부여** | **Admin** | :red_circle: **Critical** |
| **`DELETE /users/:userId/roles/:roleId`** | requireAuth only | **아무 인증 사용자** | **Role 회수** | **Admin** | :red_circle: **Critical** |
| `POST /admin/dropshipping/sellers/:userId/approve-role` | requireAuth + requireAdmin + featureFlag | platform:admin | Role 부여 | Admin | :green_circle: Safe (501 stub) |
| **`PATCH /membership/verifications/:id/approve`** | **없음** | **인증 불요** | **회원 승인** | **Admin** | :red_circle: **Critical** |
| **`PATCH /membership/verifications/:id/reject`** | **없음** | **인증 불요** | **회원 거부** | **Admin** | :red_circle: **Critical** |

---

## 2. Guard 점검 (Section B)

### 2-1. requireAuth로 열려 있는 구조 변경 API

| API | 파일 | 위험 | 비고 |
|-----|------|------|------|
| `POST /forum/categories` | ForumController.ts:545 | :red_circle: Critical | 아무 사용자가 포럼 카테고리 생성 |
| `PUT /forum/categories/:id` | ForumController.ts:600 | :red_circle: Critical | 아무 사용자가 포럼 구조 변경 |
| `DELETE /forum/categories/:id` | ForumController.ts:661 | :red_circle: Critical | 아무 사용자가 포럼 카테고리 삭제 |
| `PATCH /forum/category-requests/:id/approve` | ForumCategoryRequestController.ts:210 | :red_circle: Critical | 자기 신청 자기 승인 가능 |
| `POST /lms/certificates/issue` | CertificateController | :red_circle: Critical | 위조 수료증 발급 |
| `PATCH /lms/courses/:id` | CourseController | :red_circle: Critical | 타인 강좌 수정 |
| `DELETE /lms/courses/:id` | CourseController | :red_circle: Critical | 타인 강좌 삭제 |
| `POST /users/:userId/roles` | user-role.controller.ts:91 | :red_circle: Critical | 자신에게 admin 부여 가능 |
| `DELETE /users/:userId/roles/:roleId` | user-role.controller.ts:159 | :red_circle: Critical | 타인 role 제거 |

### 2-2. requireOperator가 구조 생성 API에 적용된 경우

**해당 없음** - requireKpaScope('kpa:operator')가 구조 생성에 적용된 사례 없음.
현재 KPA 구조 생성은 모두 `kpa:admin`으로 보호됨. :green_circle:

### 2-3. requireAdmin이 누락된 구간

| 구간 | 현재 상태 | 필요한 Guard |
|------|----------|------------|
| Forum Category CRUD | authenticate only | requireKpaScope('kpa:admin') 또는 admin role check |
| Forum Category Request Approval | authenticate only | requireKpaScope('kpa:admin') |
| Forum Recommendation Config | authenticate only | requireAdmin |
| Forum AI Post Processing | authenticate only | author check + operator role |
| LMS Course Update/Delete/Publish | requireAuth only | requireInstructor + owner check |
| LMS Certificate Issue/Revoke | requireAuth only | requireAdmin |
| User Role Assignment | requireAuth only | requireAdmin |
| Membership Verification | **없음** | requireAuth + requireKpaScope('kpa:admin') |

### 2-4. ScopeGuard 사용 일관성

| 영역 | Guard 패턴 | 일관성 |
|------|-----------|--------|
| KPA Core (organizations, members, stewards) | `requireKpaScope(scope)` 미들웨어 | :green_circle: 일관됨 |
| KPA Admin Dashboard | `isAdminOrOperator()` inline 함수 | :yellow_circle: 다른 패턴 |
| KPA Branch Admin | `isBranchOperator()` inline 함수 | :yellow_circle: 다른 패턴 |
| KPA Groupbuy | `isKpaOperator()` DB 쿼리 (KpaMember.is_operator) | :orange_circle: 완전 다른 패턴 |
| KPA Org Join Requests | `isAdminOrOperator()` + legacy compat | :orange_circle: Legacy 허용 잔재 |
| Forum | `requireKpaScope('kpa:operator')` (일부만) | :red_circle: 불일관 |
| LMS | `requireAuth` / `requireAdmin` / `requireInstructor` | :yellow_circle: 별도 체계 |
| Signage | `requireSignageAdmin/Operator/Store` 계층형 | :green_circle: 일관됨 |

**결론**: KPA Core와 Signage는 일관성 높음. Forum/LMS는 Guard 패턴 불일관.

---

## 3. Role 변경 지점 추적 (Section C)

### 3-1. Instructor Role 부여 API

| API | Guard | Operator 호출 가능? | 판정 |
|-----|-------|-------------------|------|
| `POST /lms/instructor/applications/:id/approve` | requireAdmin | :no_entry: 불가 | :green_circle: Safe |
| `POST /lms/instructor/applications/:id/reject` | requireAdmin | :no_entry: 불가 | :green_circle: Safe |

### 3-2. Seller Scope 부여 API

| API | Guard | Operator 호출 가능? | 판정 |
|-----|-------|-------------------|------|
| `POST /admin/dropshipping/sellers/:userId/approve-role` | requireAdmin + featureFlag | :no_entry: 불가 | :green_circle: Safe (501 stub) |

### 3-3. Signage Scope 부여 API

Signage role은 별도의 "부여 API"가 아니라 RoleAssignment를 통해 할당됨.
Signage Guard 자체는 계층적으로 잘 구성됨. :green_circle: Safe

### 3-4. kpa:operator 부여 API

| API | Guard | Operator 호출 가능? | 판정 |
|-----|-------|-------------------|------|
| **`POST /users/:userId/roles`** | **requireAuth only** | :warning: **가능** | :red_circle: **Critical** |
| Frontend: OperatorManagementPage | checkKpaOperatorRole (kpa:operator 허용) | :warning: **가능** | :red_circle: **Critical** |

**핵심 위험**: kpa:operator 사용자가 `/operator/operators` 페이지에서 다른 사용자에게 kpa:operator, kpa-b:district 등의 role을 부여할 수 있음. Backend에 admin 검증이 없으므로 **실제로 동작함**.

---

## 4. 구조 생성 API 목록 (Section D)

### Admin 전용이어야 하는 구조 생성 API

| API | 현재 Guard | 올바른 Guard | Gap |
|-----|-----------|------------|-----|
| `POST /kpa/organizations` | requireKpaScope('kpa:admin') | kpa:admin | :green_circle: 없음 |
| `POST /kpa/stewards` | requireKpaScope('kpa:admin') | kpa:admin | :green_circle: 없음 |
| **`POST /forum/categories`** | **authenticate** | **kpa:admin** | :red_circle: **누락** |
| **`PUT /forum/categories/:id`** | **authenticate** | **kpa:admin** | :red_circle: **누락** |
| **`DELETE /forum/categories/:id`** | **authenticate** | **kpa:admin** | :red_circle: **누락** |
| **`PATCH /forum/category-requests/:id/approve`** | **authenticate** | **kpa:admin** | :red_circle: **누락** |
| `POST /lms/courses` (유료) | requireAuth + instructor check | instructor + admin approval | :green_circle: 적절 |
| **`POST /lms/courses/:id/publish`** | **requireAuth** | **instructor owner + admin** | :orange_circle: **누락** |
| **`POST /lms/certificates/issue`** | **requireAuth** | **platform:admin** | :red_circle: **누락** |
| **`POST /users/:userId/roles`** | **requireAuth** | **platform:admin** | :red_circle: **누락** |
| Signage Channel 생성 | requireSignageAdmin | signage:admin | :green_circle: 없음 |

### 정책 변경 API

| API | 현재 Guard | 올바른 Guard | Gap |
|-----|-----------|------------|-----|
| **`PUT /forum/recommendations/config`** | **authenticate** | **admin** | :orange_circle: **누락** |
| `PATCH /kpa/branch-admin/settings` | requireAuth + isBranchOperator() | branch_admin | :yellow_circle: 패턴 불일관 |

---

## 5. Frontend 접근 경로 조사 (Section E)

### 5-1. `/operator`에서 admin 기능 접근 가능 여부

| 페이지 | 경로 | Admin 기능? | 판정 |
|--------|------|-----------|------|
| **OperatorManagementPage** | `/operator/operators` | **운영자 생성/삭제/Role 부여** | :red_circle: **Critical** - Admin 전용이어야 함 |
| **MemberManagementPage** | `/operator/members` | **가입 신청 승인/거부** | :orange_circle: High - 논의 필요 |
| AuditLogPage | `/operator/audit-logs` | 감사 로그 전체 조회 | :yellow_circle: Medium - Admin 전용 권장 |
| ForumManagementPage | `/operator/forum-management` | 포럼 관리 | :green_circle: Operator 적합 |
| ContentManagementPage | `/operator/content` | 콘텐츠 CMS | :green_circle: Operator 적합 |

### 5-2. `/admin`과 `/operator` 경계 혼합

| 컴포넌트 | Admin 경로 | Operator 경로 | 동일 컴포넌트? | 문제 |
|----------|-----------|-------------|-------------|------|
| ForumManagementPage | `/admin/forum` | `/operator/forum-management` | :warning: **동일** | Role별 UI 차이 없음 |
| ContentHubPage | `/admin/signage/content` | `/operator/signage/content` | :warning: **동일** | Role별 UI 차이 없음 |
| OperatorManagementPage | 없음 | `/operator/operators` | - | :red_circle: Admin 전용이어야 함 |

### 5-3. 버튼 노출 제한 vs API 열림

| 시나리오 | Frontend | Backend API | 판정 |
|----------|---------|-------------|------|
| Operator가 Role 부여 | :warning: 버튼 노출됨 | :red_circle: Guard 없음 | **양쪽 모두 취약** |
| Operator가 가입 승인 | :warning: 버튼 노출됨 | :yellow_circle: requireKpaScope('kpa:operator') | Backend는 허용, Frontend도 허용 |
| 일반 사용자가 포럼 카테고리 생성 | :no_entry: 버튼 미노출 | :red_circle: authenticate만 | **API는 열려있음 (직접 호출 가능)** |
| 일반 사용자가 수료증 발급 | :no_entry: 버튼 미노출 | :red_circle: requireAuth만 | **API는 열려있음** |

### 5-4. Frontend Guard 추가 문제

| Guard | 위치 | 문제 |
|-------|------|------|
| AdminAuthGuard | `/admin/*` | :red_circle: **DEV 모드에서 모든 사용자 통과** (line 129-131) |
| IntranetAuthGuard | `/intranet/*` | :red_circle: **Role 체크 없음** - 인증만 확인, 모든 로그인 사용자 접근 |
| BranchAdminAuthGuard | `/branch-services/:branchId/admin/*` | :red_circle: **branchId 미검증** - 다른 분회 접근 가능 |
| BranchOperatorAuthGuard | `/branch-services/:branchId/operator/*` | :red_circle: **branchId 미검증** - 다른 분회 접근 가능 |
| OperatorRoutes inline | `/operator/*` | :green_circle: kpa:admin + kpa:operator만 허용 |

---

## 6. 혼합 구간 목록

### Operator가 구조 생성 가능 구간

| 구간 | 설명 | 위험도 |
|------|------|--------|
| `/operator/operators` → `POST /users/:userId/roles` | Operator가 다른 사용자에게 Role 부여 | :red_circle: Critical |
| `/operator/operators` → Role 삭제 | Operator가 다른 사용자 Role 제거 | :red_circle: Critical |
| Forum Category CRUD (API 직접 호출) | 인증만으로 카테고리 생성/수정/삭제 | :red_circle: Critical |
| Forum Category Request Approve (API 직접 호출) | 인증만으로 카테고리 신청 승인 | :red_circle: Critical |
| LMS Certificate Issue (API 직접 호출) | 인증만으로 수료증 발급 | :red_circle: Critical |

### Admin이 운영 기능을 직접 수행하는 구간

| 구간 | 설명 | 판정 |
|------|------|------|
| `/admin/forum` → 게시글 관리 | Admin이 Operator 운영 기능 수행 | :green_circle: 허용 (상위 권한) |
| `/admin/news` → 콘텐츠 CRUD | Admin이 직접 콘텐츠 관리 | :green_circle: 허용 (상위 권한) |
| `isAdminOrOperator()` 함수 전반 | Admin이 Operator 대시보드 접근 | :green_circle: 설계 의도 |

### Guard 누락 구간

| 구간 | 현재 | 필요 |
|------|------|------|
| Membership Verification approve/reject | **인증조차 없음** | requireAuth + requireKpaScope('kpa:admin') |
| Affiliation Management (전체) | **인증조차 없음** | requireAuth + requireKpaScope('kpa:admin') |
| User Role Assignment POST/DELETE | requireAuth만 | requireAdmin |
| Forum Category CRUD | authenticate만 | admin role check |
| LMS Course PATCH/DELETE/Publish | requireAuth만 | instructor owner + admin |
| LMS Certificate Issue/Revoke/Renew | requireAuth만 | requireAdmin |
| Forum AI Post Processing | authenticate만 | author check + admin/moderator |
| Forum Recommendation Config | authenticate만 | requireAdmin |

---

## 7. 권한 위험도 분류

### :red_circle: Critical (12건) - Operator가 Role 부여 가능 / Guard 완전 부재

| # | 항목 | 파일 | 라인 |
|---|------|------|------|
| C-01 | User Role Assignment (POST) - 아무 사용자가 admin role 부여 가능 | user-role.controller.ts | 91-153 |
| C-02 | User Role Removal (DELETE) - 아무 사용자가 role 제거 가능 | user-role.controller.ts | 159-200 |
| C-03 | Forum Category Create - 인증만으로 포럼 구조 생성 | ForumController.ts | 545-556 |
| C-04 | Forum Category Update - 인증만으로 포럼 구조 변경 | ForumController.ts | 600-620 |
| C-05 | Forum Category Delete - 인증만으로 포럼 구조 삭제 | ForumController.ts | 661-672 |
| C-06 | Forum Category Request Approve - 자기 신청 자기 승인 | ForumCategoryRequestController.ts | 210-230 |
| C-07 | Forum Category Request Reject - 타인 신청 거부 | ForumCategoryRequestController.ts | 264-285 |
| C-08 | Forum AI Process Post - 타인 포스트 수정 | ForumAIController.ts | 52-72 |
| C-09 | Forum AI Regenerate - 타인 포스트 덮어쓰기 | ForumAIController.ts | 79-108 |
| C-10 | LMS Certificate Issue - 위조 수료증 발급 | CertificateController | 133 |
| C-11 | Membership Verification Approve - 인증 없이 회원 승인 | VerificationController.ts | 65-77 |
| C-12 | Membership Verification Reject - 인증 없이 회원 거부 | VerificationController.ts | 82-94 |

### :orange_circle: High (8건) - 구조 생성 API가 requireAuth만 적용

| # | 항목 | 파일 |
|---|------|------|
| H-01 | LMS Course Update (PATCH) - 타인 강좌 수정 | CourseController |
| H-02 | LMS Course Delete - 타인 강좌 삭제 | CourseController |
| H-03 | LMS Course Publish/Unpublish/Archive - 타인 강좌 상태 변경 | CourseController |
| H-04 | LMS Lesson Create - 타인 강좌에 레슨 추가 | LessonController |
| H-05 | LMS Certificate Revoke/Renew - 타인 수료증 무효화 | CertificateController |
| H-06 | Forum Recommendation Config - 추천 알고리즘 설정 변경 | ForumRecommendationController |
| H-07 | Frontend: Operator가 운영자 생성/Role 부여 페이지 접근 | OperatorManagementPage |
| H-08 | Frontend: IntranetAuthGuard에 Role 체크 없음 | IntranetAuthGuard.tsx |

### :yellow_circle: Medium (6건) - 정책 API가 requireOperator로 보호

| # | 항목 | 비고 |
|---|------|------|
| M-01 | Application Review가 Operator 레벨 | 승인=구조 여부 논의 필요 |
| M-02 | Organization Join Request Approve가 Admin+Operator 혼합 | Legacy compat 잔재 |
| M-03 | Branch Admin Guard에 branchId 미검증 | 다른 분회 접근 가능 |
| M-04 | Branch Operator Guard에 branchId 미검증 | 다른 분회 접근 가능 |
| M-05 | AdminAuthGuard DEV 모드 bypass | 프로덕션 빌드 시 위험 |
| M-06 | Legacy role logging이 console.warn만 | DB 감사로그에 미기록 |

---

## 8. 수정 필요 항목 리스트

### Priority 1: 즉시 수정 (Critical - 1주 이내)

| # | 파일 | 함수/라인 | 현재 Guard | 변경 Guard | 변경 Role |
|---|------|----------|-----------|-----------|----------|
| 1 | user-role.controller.ts:91 | assignRole() | requireAuth | **+ requireAdmin** | platform:admin |
| 2 | user-role.controller.ts:159 | removeRole() | requireAuth | **+ requireAdmin** | platform:admin |
| 3 | ForumController.ts:545 | createCategory() | authenticate | **+ admin/manager role check** | kpa:admin |
| 4 | ForumController.ts:600 | updateCategory() | authenticate | **+ admin/manager role check** | kpa:admin |
| 5 | ForumController.ts:661 | deleteCategory() | authenticate | **+ admin/manager role check** | kpa:admin |
| 6 | ForumCategoryRequestController.ts:210 | approveRequest() | authenticate | **+ operator role check** (listRequests 패턴 복사) | kpa:admin |
| 7 | ForumCategoryRequestController.ts:264 | rejectRequest() | authenticate | **+ operator role check** | kpa:admin |
| 8 | ForumAIController.ts:52 | processPost() | authenticate | **+ author OR moderator check** | author/admin |
| 9 | ForumAIController.ts:79 | regeneratePost() | authenticate | **+ author OR moderator check** | author/admin |
| 10 | ForumAIController.ts:115 | applyTags() | authenticate | **+ author OR moderator check** | author/admin |
| 11 | VerificationController.ts:65 | approve() | **없음** | **+ authenticate + requireKpaScope('kpa:admin')** | kpa:admin |
| 12 | VerificationController.ts:82 | reject() | **없음** | **+ authenticate + requireKpaScope('kpa:admin')** | kpa:admin |

### Priority 2: 긴급 수정 (High - 2주 이내)

| # | 파일 | 함수 | 현재 Guard | 변경 Guard |
|---|------|------|-----------|-----------|
| 13 | CourseController (update) | updateCourse() | requireAuth | + instructor owner check |
| 14 | CourseController (delete) | deleteCourse() | requireAuth | + instructor owner check |
| 15 | CourseController (publish) | publishCourse() | requireAuth | + instructor owner check |
| 16 | CertificateController (issue) | issueCertificate() | requireAuth | + requireAdmin |
| 17 | CertificateController (revoke) | revokeCertificate() | requireAuth | + requireAdmin OR issuer |
| 18 | ForumRecommendationController:187 | getConfig() | authenticate | + admin role check |
| 19 | ForumRecommendationController:210 | updateConfig() | authenticate | + admin role check |
| 20 | OperatorManagementPage | 전체 | checkKpaOperatorRole | kpa:admin 전용으로 변경 |

### Priority 3: 개선 수정 (Medium - 1개월 이내)

| # | 파일 | 변경 사항 |
|---|------|----------|
| 21 | IntranetAuthGuard.tsx | Role 체크 추가 (kpa:admin/district_admin 등) |
| 22 | AdminAuthGuard.tsx:129-131 | DEV 모드 bypass 제거 |
| 23 | BranchAdminAuthGuard.tsx | branchId 검증 추가 |
| 24 | BranchOperatorAuthGuard.tsx | branchId 검증 추가 |
| 25 | role.utils.ts:252 | logLegacyRoleUsage()를 DB audit log로 변경 |
| 26 | LessonController | 강좌 소유자 검증 추가 |
| 27 | Quiz/Survey Controllers | requireInstructor 추가 |

---

## 9. 최종 산출물 요약

### Admin 전용 API 목록 (올바르게 보호됨)

| API | Guard |
|-----|-------|
| POST /kpa/organizations | requireKpaScope('kpa:admin') |
| PATCH /kpa/organizations/:id | requireKpaScope('kpa:admin') |
| PATCH /kpa/members/:id/role | requireKpaScope('kpa:admin') |
| POST /kpa/stewards | requireKpaScope('kpa:admin') |
| PATCH /kpa/stewards/:id/revoke | requireKpaScope('kpa:admin') |
| GET /kpa/join-inquiries | requireKpaScope('kpa:admin') |
| GET /kpa/operator/audit-logs | requireKpaScope('kpa:admin') |
| POST /lms/instructor/applications/:id/approve | requireAdmin |
| POST /lms/instructor/applications/:id/reject | requireAdmin |
| Signage Channel Creation | requireSignageAdmin |
| POST /admin/sellers/:userId/approve-role | requireAdmin + featureFlag (stub) |

### Operator 전용 API 목록 (올바르게 보호됨)

| API | Guard |
|-----|-------|
| GET /kpa/members | requireKpaScope('kpa:operator') |
| PATCH /kpa/members/:id/status | requireKpaScope('kpa:operator') |
| GET /kpa/applications/admin/all | requireKpaScope('kpa:operator') |
| PATCH /kpa/applications/:id/review | requireKpaScope('kpa:operator') |
| News CRUD (kpa/news) | requireKpaScope('kpa:operator') |
| Forum moderation | authenticate + admin/manager role check |
| Signage Store operations | requireSignageStore |
| Signage Template operations | requireSignageOperator |
| LMS Instructor courses/enrollments | requireInstructor |

### 혼합/위험 API 목록 (Guard 재정렬 필요)

| API | 현재 상태 | 필요 상태 | 우선순위 |
|-----|----------|----------|---------|
| POST /users/:userId/roles | 아무 인증 사용자 | platform:admin | P1 |
| DELETE /users/:userId/roles/:roleId | 아무 인증 사용자 | platform:admin | P1 |
| POST/PUT/DELETE /forum/categories | 아무 인증 사용자 | kpa:admin | P1 |
| PATCH /forum/category-requests/:id/approve,reject | 아무 인증 사용자 | kpa:admin | P1 |
| POST /forum/ai/posts/:id/* | 아무 인증 사용자 | author/admin | P1 |
| PATCH /membership/verifications/:id/* | **인증 불요** | kpa:admin | P1 |
| PATCH/DELETE /lms/courses/:id | 아무 인증 사용자 | instructor owner + admin | P2 |
| POST /lms/certificates/issue | 아무 인증 사용자 | platform:admin | P2 |
| PUT /forum/recommendations/config | 아무 인증 사용자 | admin | P2 |
| Frontend: /operator/operators | kpa:operator | kpa:admin | P2 |

---

## 10. Guard 재정렬 제안

### 원칙

```
구조 생성/삭제  → kpa:admin (또는 platform:admin)
권한 부여/회수  → kpa:admin (또는 platform:admin)
정책 변경      → kpa:admin
콘텐츠 관리    → kpa:operator (작성자/관리자)
운영 실행      → kpa:operator
운영 조회      → kpa:operator
공개 조회      → optionalAuth / 없음
```

### Guard 패턴 통일 제안

현재 6가지 패턴이 혼재:
1. `requireKpaScope(scope)` - KPA 전용 미들웨어
2. `isAdminOrOperator()` - inline 함수
3. `isBranchOperator()` - inline 함수
4. `isKpaOperator()` - DB 쿼리
5. `requireAdmin` - platform 미들웨어
6. `requireInstructor` - LMS 미들웨어

**제안**: KPA 영역은 `requireKpaScope(scope)` 하나로 통일.

---

## 11. 수정 우선순위 표

| 순위 | 건수 | 영역 | 예상 소요 | 비고 |
|------|------|------|---------|------|
| **P1** | **12** | Role 부여 Guard + Forum 구조 Guard + Membership Guard | **3일** | 즉시 실행, 패턴 복사로 해결 |
| **P2** | **8** | LMS owner check + Recommendation config + Frontend 분리 | **1주** | Owner 검증 로직 추가 |
| **P3** | **7** | Frontend Guard 강화 + Legacy logging + Quiz Guard | **2주** | 구조적 개선 |
| **합계** | **27** | | **약 4주** | |

---

## 12. 다음 단계 선택

조사 완료. 다음 중 선택:

1. **Guard 재정렬 Work Order 작성** - P1 12건 즉시 수정
2. **Role 구조 재설계 문서화** - Guard 패턴 통일 설계
3. **Scope 체계 정리** - Scope 파생 검증 강화
4. **Admin/Operator 완전 분리 구현 계획 수립** - Frontend + Backend 동시 작업

---

*Generated: 2026-02-15*
*Auditor: Claude Code Analysis*
*Classification: Internal Security Audit*
*Status: Investigation Complete*
