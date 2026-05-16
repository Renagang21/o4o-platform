---
id: IR-O4O-ADMIN-USERS-SUBROUTES-REMOVAL-SAFETY-AUDIT-V1
title: "admin-dashboard `/users/roles` · `/users/statistics` 하위 라우트 제거 안전성 감사"
status: 조사 완료
date: 2026-05-16
last_updated: 2026-05-16
type: investigation
author: Claude Opus 4.7 (정적 분석, 코드/라우트 변경 없음)
scope:
  - admin-dashboard 의 `/users/roles` (RoleManagement) 라우트 제거/숨김 안전성
  - admin-dashboard 의 `/users/statistics` (UserStatistics) 라우트 제거/숨김 안전성
  - 두 라우트가 호출하는 backend endpoint 의 실제 작동/연결 여부
  - F9 RBAC SSOT / F10 O4O Core / F11 User-Operator freeze 와의 충돌 가능성
  - 외부(다른 페이지, 모바일, 스크립트) 호출자 존재 여부
  - 본체 `/users` (UsersListClean) A안(super-admin 전용 축소) 재검증
related:
  - IR-O4O-ADMIN-USERS-MENU-ROLE-REDEFINE-AUDIT-V1 (직전 IR — 본 IR 의 trigger)
  - IR-O4O-ADMIN-ROLE-LIST-SERVICE-CENTRIC-UX-AUDIT-V1 (선행 IR — user-centric → service-centric 전환 권고)
  - IR-O4O-ADMIN-MENU-TAXONOMY-AUDIT-V1 (좌측 메뉴 분류 inventory)
  - RBAC-FREEZE-DECLARATION-V1 (F9 RBAC SSOT)
  - O4O-CORE-FREEZE-V1 (F10 Approval/Auth/Membership/RBAC core 동결)
  - USER-OPERATOR-FREEZE-V1 (F11 users + service_memberships + role_assignments)
  - RBAC-ROLE-CATALOG-V1 (canonical role catalog)
  - WO-O4O-ADMIN-ASSIGNMENT-ROW-LIST-CANONICALIZATION-V1 (c85455881) — /users 본체 canonical 전환 완료
---

# IR-O4O-ADMIN-USERS-SUBROUTES-REMOVAL-SAFETY-AUDIT-V1

> 직전 IR(`IR-O4O-ADMIN-USERS-MENU-ROLE-REDEFINE-AUDIT-V1`)의 권고안 A(super-admin 전용 RBAC 콘솔로 `/users` 축소)에서 제안된 `/users/roles` 와 `/users/statistics` 두 하위 라우트의 **실제 제거/숨김 가능 여부**를 코드·라우트·backend·F9~F11 freeze 정합성 측면에서 전수 검증한다.
>
> 본 IR 은 read-only 조사이며, 코드/메뉴/라우트/API 를 **변경하지 않는다**. 결과는 후속 deprecation WO 의 근거 자료로 사용된다.

---

## 0. 한 줄 결론

| 라우트 | 판정 | 근거 |
|---|---|---|
| **`/users/roles`** (RoleManagement) | **즉시 제거 가능 (현재 dead UI)** | 호출하는 backend endpoint(`POST/PUT/DELETE /users/roles`, `GET /users/permissions`)가 **mounted router 에 존재하지 않는다**. 화면은 항상 "Failed to load…" 토스트로 끝나며 실제 작동하지 않음. F9 위반은 발생하지 않으나 위반을 의도한 dead UI 임. |
| **`/users/statistics`** (UserStatistics) | **즉시 제거 가능 (백엔드 계약 미스매치 + KPI 중복)** | UI 가 기대하는 7개 필드(loginActivity / roleDistribution / recentRegistrations / registrationTrends / topActiveUsers / emailVerified / approved-rejected-suspended) 중 backend(`UserRepository.getUserStatistics`)는 **5개 필드만 반환**(total/pending/active/rejected + 빈 byRole). 화면이 런타임 에러로 빈 상태 표시. 가치 있는 지표는 이미 `/users` 본체 KPI 와 `/active-users` 에 존재. |

본체 `/users` A안(super-admin 전용 RBAC 콘솔로 축소)은 본 조사 결과에 의해 **그대로 유효**하며, 오히려 강화된다 (두 하위 라우트가 dead UI 임이 확인되었으므로 제거 비용 0).

---

## 1. 조사 범위 & 방법

### 1-1. 조사 대상

| 항목 | 파일 |
|---|---|
| Frontend 라우트 정의 | [apps/admin-dashboard/src/routes/users.routes.tsx](../../apps/admin-dashboard/src/routes/users.routes.tsx) |
| Frontend `/users/roles` 컴포넌트 | [apps/admin-dashboard/src/pages/users/RoleManagement.tsx](../../apps/admin-dashboard/src/pages/users/RoleManagement.tsx) |
| Frontend `/users/statistics` 컴포넌트 | [apps/admin-dashboard/src/pages/users/UserStatistics.tsx](../../apps/admin-dashboard/src/pages/users/UserStatistics.tsx) |
| Frontend `/users` 본체 (KPI 비교용) | [apps/admin-dashboard/src/pages/users/UsersListClean.tsx](../../apps/admin-dashboard/src/pages/users/UsersListClean.tsx) |
| Frontend API 래퍼 | [apps/admin-dashboard/src/api/userApi.ts](../../apps/admin-dashboard/src/api/userApi.ts) |
| Frontend RBAC catalog | [apps/admin-dashboard/src/lib/rbac-catalog.ts](../../apps/admin-dashboard/src/lib/rbac-catalog.ts) |
| Backend `/api/v1/users` router (mounted) | [apps/api-server/src/routes/users.routes.ts](../../apps/api-server/src/routes/users.routes.ts) |
| Backend `/api/v1/admin/users` router | [apps/api-server/src/routes/admin/users.routes.ts](../../apps/api-server/src/routes/admin/users.routes.ts) |
| Backend NextGen user router (NOT mounted) | [apps/api-server/src/modules/user/routes/user.routes.ts](../../apps/api-server/src/modules/user/routes/user.routes.ts) |
| Backend UserManagementController | [apps/api-server/src/controllers/UserManagementController.ts](../../apps/api-server/src/controllers/UserManagementController.ts) |
| Backend UserRepository.getUserStatistics | [apps/api-server/src/repositories/UserRepository.ts](../../apps/api-server/src/repositories/UserRepository.ts) |
| Backend AdminUserController.getUserStatistics | [apps/api-server/src/controllers/admin/AdminUserController.ts](../../apps/api-server/src/controllers/admin/AdminUserController.ts) |
| Static 좌측 메뉴 | [apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx](../../apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx) |
| Permission 매트릭스 | [apps/admin-dashboard/src/config/rolePermissions.ts](../../apps/admin-dashboard/src/config/rolePermissions.ts) |
| Router 등록 | [apps/api-server/src/bootstrap/register-routes.ts](../../apps/api-server/src/bootstrap/register-routes.ts) |

### 1-2. 방법

- 라우트 정의 → 컴포넌트 파일 → 호출 API endpoint → backend 라우터/컨트롤러/리포지토리 단방향 추적
- `grep`(ripgrep) 으로 (a) 좌측 메뉴 / breadcrumb / in-page link, (b) 다른 컴포넌트에서의 호출자, (c) 외부 호출자(mobile / scripts/) 전수 검색
- F9/F10/F11 SSOT 문서 교차 확인
- Git 최근 6개월 commit log 로 dead code 여부 검증

---

## 2. `/users/roles` (RoleManagement) 판정

### 2-1. 라우트 정의 & 컴포넌트

- 라우트: [apps/admin-dashboard/src/routes/users.routes.tsx:72-78](../../apps/admin-dashboard/src/routes/users.routes.tsx#L72-L78)
  - guard: `AdminProtectedRoute` + `requiredPermissions={['users:update']}`
- 컴포넌트: [apps/admin-dashboard/src/pages/users/RoleManagement.tsx](../../apps/admin-dashboard/src/pages/users/RoleManagement.tsx) (447 lines)
- Lazy import: [users.routes.tsx:8](../../apps/admin-dashboard/src/routes/users.routes.tsx#L8)

### 2-2. 기능 전수표

| Action | 코드 위치 | 호출 API | Mounted router 에서의 실제 동작 |
|---|---|---|---|
| Role 목록 조회 | [RoleManagement.tsx:79](../../apps/admin-dashboard/src/pages/users/RoleManagement.tsx#L79) | `GET /users/roles` (→ `/api/v1/users/roles`) | ⚠️ **/api/v1/users/roles GET 핸들러 없음** — `routes/users.routes.ts` 에는 `/roles` 가 정의되지 않음. `/:id` validator(`isUUID`)에 매칭되어 **400 validation error** 반환. |
| Permission 목록 조회 | [RoleManagement.tsx:80](../../apps/admin-dashboard/src/pages/users/RoleManagement.tsx#L80) | `GET /users/permissions` | ⚠️ **/api/v1/users/permissions 엔드포인트 자체가 존재하지 않음** — backend 전수 grep 결과 `'/permissions'` 라우트 정의 0건. |
| Role 생성 | [RoleManagement.tsx:107](../../apps/admin-dashboard/src/pages/users/RoleManagement.tsx#L107) | `POST /users/roles` | ⚠️ **POST 핸들러 없음** — `routes/users.routes.ts` POST `/`(create user) 와 path 충돌 없음, `/roles` POST 정의 없음. |
| Role 수정 | [RoleManagement.tsx:104](../../apps/admin-dashboard/src/pages/users/RoleManagement.tsx#L104) | `PUT /users/roles/:id` | ⚠️ **PUT `/:id`(updateUser) 와 path 충돌** — `:id` UUID validator 에서 `roles` literal 거부 → 400. |
| Role 삭제 | [RoleManagement.tsx:145](../../apps/admin-dashboard/src/pages/users/RoleManagement.tsx#L145) | `DELETE /users/roles/:id` | ⚠️ DELETE `/:id`(deleteUser) 와 path 충돌 → 400. |
| Permission 매트릭스 편집 | [RoleManagement.tsx:299-327](../../apps/admin-dashboard/src/pages/users/RoleManagement.tsx#L299-L327) | (Role create/update 페이로드에 `permissions[]` 포함) | dead — Role create/update 자체가 동작 안 함. |

### 2-3. mounted router 실측 결과 (⚠️ 핵심)

[apps/api-server/src/bootstrap/register-routes.ts:145](../../apps/api-server/src/bootstrap/register-routes.ts#L145):
```typescript
app.use('/api/v1/users', usersRoutes);  // from routes/users.routes.ts
```

`routes/users.routes.ts` 의 정의된 routes (line 96~230 정리):

| Method | Path | Handler |
|---|---|---|
| GET | `/me/contact` | UserController.getContactSettings |
| PATCH | `/me/contact` | UserController.updateContactSettings |
| GET | `/` | userController.getUsers |
| GET | `/statistics` | userController.getUserStatistics ✅ |
| GET | `/pending` | userController.getPendingUsers |
| GET | `/new` | (inline handler) |
| GET | `/:id` | userController.getUser (`:id` isUUID) |
| POST | `/` | userController.createUser |
| PUT | `/:id` | userController.updateUser |
| DELETE | `/:id` | userController.deleteUser |
| POST | `/:id/approve` | userController.approveUser |
| POST | `/:id/reject` | userController.rejectUser |
| POST | `/bulk-approve` | userController.bulkApprove |
| POST | `/bulk-reject` | userController.bulkReject |
| PUT | `/:id/roles` | userController.updateUserRoles |
| GET | `/:id/approval-history` | userController.getUserApprovalHistory |
| GET | `/export/csv` | userController.exportUsers |

**`/roles` GET / POST 및 `/permissions` GET 은 mounted router 어디에도 정의되어 있지 않다.**

NextGen 모듈식 라우터 [modules/user/routes/user.routes.ts:204-212](../../apps/api-server/src/modules/user/routes/user.routes.ts#L204-L212) 에 `GET /roles` 가 `UserRoleController.getRoles` 로 정의되어 있으나, **이 라우터는 어디에도 `app.use()` 되지 않음** (전수 grep `modules/user/routes` mount 0건, `user.routes` 외부 import 0건). 즉 **dead code**.

→ **결과: `RoleManagement.tsx` 화면을 열면 항상 두 fetch 가 실패하여 `toast.error('Failed to load roles and permissions')` 만 표시되고 빈 카드 화면 + "No roles found" empty state 가 렌더된다.** 사용자가 "Create Role" 을 눌러도 POST 자체가 400 으로 거부됨.

### 2-4. F9 RBAC SSOT 위반/우회 평가

⚠️ **이 화면의 UX 의도는 F9 위반**:

- `RoleManagement.tsx` 가 가정하는 모델은 **동적 Role CRUD + Permission ManyToMany 편집** ([Role 인터페이스: line 22-34](../../apps/admin-dashboard/src/pages/users/RoleManagement.tsx#L22-L34))
- F9 ([RBAC-FREEZE-DECLARATION-V1.md §3](../rbac/RBAC-FREEZE-DECLARATION-V1.md)) 에서 명시:
  > Role 추가 정책: `UserRole` enum 등록 + `roleAssignmentService.assignRole()` 기반 할당만 허용 + `RBAC-ROLE-CATALOG-V1.md` 문서 갱신
  > role catalog 는 **코드(`UserRole` enum + `lib/rbac-catalog.ts`) 및 문서(`RBAC-ROLE-CATALOG-V1.md`)** 가 SSOT. DB `roles` 테이블은 catalog 의 메타데이터 캐시일 뿐 동적 추가 대상이 아님.
- 즉 RoleManagement UI 는 (구현되었더라면) **F9 위반**. 다행히 backend 가 미구현이라 실제 위반은 발생하지 않음.

| 항목 | 평가 |
|---|---|
| 동적 Role CRUD 가능성 | UI 의도는 있으나 backend 부재로 **현재 0** |
| 위반 위험도 | **낮음** (지금 상태로는 위반 불가). 단, **누군가가 이 dead UI 를 발견해 backend 를 "수리"하면 F9 위반 발생**. |
| 권장 조치 | **즉시 제거** — dead UI 가 F9 위반 백도어로 부활할 가능성을 사전 차단. |

### 2-5. `lib/rbac-catalog` / `RBAC-ROLE-CATALOG-V1.md` 와의 관계

- [lib/rbac-catalog.ts:49-66](../../apps/admin-dashboard/src/lib/rbac-catalog.ts#L49-L66) 가 frontend 의 role suffix 카탈로그 SSOT (super_admin / admin / operator / branch_admin / branch_operator / manager / moderator / vendor / seller / supplier / partner / affiliate / pharmacist / business / customer / user — 16개).
- [docs/rbac/RBAC-ROLE-CATALOG-V1.md](../rbac/RBAC-ROLE-CATALOG-V1.md) 가 문서 SSOT.
- **RoleManagement.tsx 는 위 두 SSOT 와 무관한 별도 DB 기반 동적 Role 표현을 가정** — catalog 와 정합성 없음.
- 만약 backend `GET /users/roles` 가 미래에 NextGen 모듈을 mount 하여 작동하더라도, 반환되는 DB `roles` 테이블 행이 frontend catalog 와 동기화될 보장이 없음(별도 seed 가 필요하나 그 seed 자체가 catalog 의 mirror).

→ **`RoleManagement` 화면은 RBAC catalog SSOT 와 정합 가능한 정상 경로가 아니다.** Role catalog 변경은 **코드 + 문서 + 서비스 scope config 동시 수정** 이라는 F9 §4 절차로만 허용됨.

### 2-6. `/users/roles` GET 의 다른 호출자 (간접 영향)

같은 URL 을 GET 으로 호출하는 **다른 화면들** (drop-down 옵션 채우기 목적):

| 호출자 | 코드 위치 | 영향 |
|---|---|---|
| `UserForm` (사용자 생성/편집) | [UserForm.tsx:63](../../apps/admin-dashboard/src/pages/users/UserForm.tsx#L63) | 호출 실패 시 `setRoles([])` + 토스트 — fallback 동작. 사용자는 role 선택 못함. |
| `RoleSelector` 컴포넌트 (메뉴 permission UI) | [components/menu/RoleSelector.tsx:34](../../apps/admin-dashboard/src/components/menu/RoleSelector.tsx#L34) | 동일 fallback. |
| `CategoryEdit` (게시판 카테고리) | [pages/posts/CategoryEdit.tsx:61](../../apps/admin-dashboard/src/pages/posts/CategoryEdit.tsx#L61) | 동일 fallback. |

⚠️ **즉, frontend 전체에서 `GET /users/roles` 호출이 4개소(RoleManagement + 위 3개)에서 발생하고 있고 모두 동일하게 400 으로 실패 중이다.** 본 IR 의 권고는 `/users/roles` *route*(라우트 화면) 제거이며, *API endpoint* `GET /users/roles` 의 처리(catalog 기반으로 응답을 주거나, 호출자 3개를 `lib/rbac-catalog` 직접 사용으로 전환)는 별도 후속 작업 (§6 후속 WO).

### 2-7. Link / referrer 매트릭스

좌측 메뉴, breadcrumb, in-page link 전수 검색 결과:

| 위치 | `/users/roles` 참조 |
|---|---|
| Static sidebar [admin-menu.static.tsx](../../apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx) | **없음** (Core 그룹은 /users, /operators, /admin/membership/* 만 노출) |
| Dynamic menu (Navigation API) | (기본 fallback 이 static — 별도 DB 메뉴에 등록되어 있다면 dynamic-only 노출 가능. 정적 grep 으로는 0건) |
| `config/rolePermissions.ts:60-62` | `menuId: 'users-roles'` (permission 매트릭스 entry — 메뉴 id 매핑) ⚠️ 실제 메뉴 항목이 사라지면 dead entry |
| `config/apps.config.ts:38` | `users.roles: '/users/roles'` (URL alias 정의 — 호출자 0건, dead) |
| `config/apps.config.js:42` | 컴파일 산출물 |
| in-page Link / breadcrumb | **0건** |

→ **현재 좌측 메뉴에서 `/users/roles` 로 진입할 entry 가 없다**. 라우트는 URL 직접 입력 또는 외부 즐겨찾기로만 도달 가능 — **사실상 orphan 라우트**.

### 2-8. 최근 commit 활동

```
66855f3c2  2025-10-12  fix(admin): Add array safety checks in RoleManagement
ba91c069a              fix: Remove duplicate API path prefixes in user components
4c4ca5aef              fix: Resolve all TypeScript errors and runtime map issues
ca9e5f938              refactor: 사용자 관리 코드 전체 정비 및 통합
d0e9a96f8              fix: correct users API endpoint path from /v1/users to /api/v1/users
...
d5d81f911              feat: complete user management system with advanced features  (최초)
```

- 마지막 의미 있는 수정: **2025-10-12** (7개월 전, 빈 응답에 대한 array 안전성 가드만 추가).
- F9 freeze(2026-02-27) 이후 **단 한 줄도 수정되지 않음**. F9 정책 정합 작업 0건.
- 의미 있는 기능 추가: 0건. 모두 빌드/타입 에러 수정 / API path 정정 (그 정정 자체도 mounted router 와 불일치 — 정정 의도와 실제 결과가 어긋남).

### 2-9. 판정

| 항목 | 결정 |
|---|---|
| 라우트 / 컴포넌트 | **즉시 제거** ([routes/users.routes.tsx:8 lazy import + :72-78 `<Route>`](../../apps/admin-dashboard/src/routes/users.routes.tsx#L72) + `pages/users/RoleManagement.tsx` 파일) |
| `rolePermissions.ts:60-62` 의 `users-roles` entry | **함께 제거** (참조하는 메뉴 항목이 더 이상 없음) |
| `apps.config.ts:38` 의 `users.roles` URL alias | **함께 제거** (호출자 0건) |
| `GET /users/roles` backend endpoint | **별도 정리** — `UserForm` / `RoleSelector` / `CategoryEdit` 3개 호출자를 `lib/rbac-catalog` 직접 사용으로 전환 후 endpoint 호출도 제거 (후속 WO 분리) |

근거: backend 미구현 + F9 위반 의도의 dead UI + sidebar 진입 경로 없음 + 7개월 무수정.

---

## 3. `/users/statistics` (UserStatistics) 판정

### 3-1. 라우트 정의 & 컴포넌트

- 라우트: [apps/admin-dashboard/src/routes/users.routes.tsx:79-85](../../apps/admin-dashboard/src/routes/users.routes.tsx#L79-L85)
  - guard: `AdminProtectedRoute` + `requiredPermissions={['users:read']}`
- 컴포넌트: [apps/admin-dashboard/src/pages/users/UserStatistics.tsx](../../apps/admin-dashboard/src/pages/users/UserStatistics.tsx) (364 lines)

### 3-2. 표시 metric 목록

| 카드/섹션 | UI 기대 필드 | 출처 |
|---|---|---|
| Overview (4) | total, active, pending, recentRegistrations | [:173-198](../../apps/admin-dashboard/src/pages/users/UserStatistics.tsx#L173-L198) |
| Status Breakdown (4) | approved, rejected, emailVerified (with `/total*100`), suspended | [:201-226](../../apps/admin-dashboard/src/pages/users/UserStatistics.tsx#L201-L226) |
| Login Activity | loginActivity.today / .thisWeek / .thisMonth | [:230-265](../../apps/admin-dashboard/src/pages/users/UserStatistics.tsx#L230-L265) |
| Role Distribution | roleDistribution[].role / .count / .percentage | [:268-296](../../apps/admin-dashboard/src/pages/users/UserStatistics.tsx#L268-L296) |
| Registration Trends | registrationTrends[].date / .count / .approved / .rejected | [:300-328](../../apps/admin-dashboard/src/pages/users/UserStatistics.tsx#L300-L328) |
| Top Active Users | topActiveUsers[].name / .email / .lastLogin / .loginCount | [:330-361](../../apps/admin-dashboard/src/pages/users/UserStatistics.tsx#L330-L361) |
| Time range selector | (UI 만 있음, fetch 에 query 미반영) | [:159-169](../../apps/admin-dashboard/src/pages/users/UserStatistics.tsx#L159-L169) |

### 3-3. API → backend → 테이블 추적

Frontend 호출: [userApi.ts:103-106](../../apps/admin-dashboard/src/api/userApi.ts#L103-L106) `unifiedApi.raw.get('/v1/users/statistics')` → `/api/v1/users/statistics`.

Mounted handler: [routes/users.routes.ts:97](../../apps/api-server/src/routes/users.routes.ts#L97) `router.get('/statistics', userController.getUserStatistics)`
→ [UserManagementController.ts:80-96](../../apps/api-server/src/controllers/UserManagementController.ts#L80-L96)
→ [UserRepository.getUserStatistics() :233-249](../../apps/api-server/src/repositories/UserRepository.ts#L233-L249)

Backend 실제 반환:

```typescript
{ total, pending, active, rejected, byRole: {} }  // byRole 은 항상 빈 객체
```

코멘트 [UserRepository.ts:245-246](../../apps/api-server/src/repositories/UserRepository.ts#L245-L246):
> `// Phase3-E PR3: role 컬럼 제거됨. byRole은 빈 객체 반환.`

### 3-4. UI vs Backend 계약 미스매치 (⚠️ 핵심)

| UI 기대 필드 | Backend 반환 | 상태 |
|---|---|---|
| `total` | ✅ | OK |
| `active` | ✅ | OK |
| `pending` | ✅ | OK |
| `rejected` | ✅ | OK |
| `suspended` | ❌ | undefined → `.toLocaleString()` 에서 **TypeError** |
| `approved` | ❌ | 동일 |
| `emailVerified` | ❌ | `stats.emailVerified / stats.total * 100` → NaN |
| `recentRegistrations` | ❌ | `.toLocaleString()` TypeError |
| `loginActivity.today/week/month` | ❌ | `stats.loginActivity.today` → **`Cannot read properties of undefined`** |
| `roleDistribution[]` | ❌ (`byRole: {}` 객체이며 배열도 아님) | `.map(...)` TypeError |
| `registrationTrends[]` | ❌ | 동일 |
| `topActiveUsers[]` | ❌ | 동일 |

→ **컴포넌트는 마운트 즉시 첫 번째 누락 필드에서 런타임 에러를 던지고 React error boundary 또는 toast 로 떨어진다.** [UserStatistics.tsx:103-119](../../apps/admin-dashboard/src/pages/users/UserStatistics.tsx#L103-L119) 의 try/catch 는 fetch 자체만 감싸므로, 200 응답 + 부적합 페이로드는 catch 되지 않음.

### 3-5. 동일 endpoint 의 (사용되지 않는) 두 번째 핸들러

[apps/api-server/src/routes/admin/users.routes.ts:37](../../apps/api-server/src/routes/admin/users.routes.ts#L37):
```typescript
router.get('/statistics', requireRole(ADMIN_ROLES), adminUserController.getUserStatistics);
```

⚠️ **Core-frozen** 파일 (`@core O4O_PLATFORM_CORE — Approval`, [admin/users.routes.ts:1-6](../../apps/api-server/src/routes/admin/users.routes.ts#L1-L6) + [AdminUserController.ts:1-6](../../apps/api-server/src/controllers/admin/AdminUserController.ts#L1-L6) freeze WO-O4O-CORE-FREEZE-V1, F10).

이 핸들러는 다른 path(`/api/v1/admin/users/statistics`) 로 mount되어 있고 **frontend 가 호출하지 않는다** (frontend 는 `/v1/users/statistics`). 즉 `/users/statistics` 라우트 제거가 **F10 Core 동결 영역을 건드리지 않는다.**

### 3-6. 다른 dashboard 와의 metric 중복 매트릭스

| Metric | `/users/statistics` | `/users` 본체(UsersListClean) | `/active-users` | `/operators` | UnifiedDashboard / OverviewCard |
|---|---|---|---|---|---|
| total users / assignments | ✅ | ✅ ([UsersListClean.tsx:336](../../apps/admin-dashboard/src/pages/users/UsersListClean.tsx#L336) `StatCard`) | ✅ ("총 N명") | ✅ Total | ✅ activeUsers |
| active users | ✅ | ✅ (`activeUsers: activeUsers.size` [:111-119](../../apps/admin-dashboard/src/pages/users/UsersListClean.tsx#L111-L119)) | ✅ | (의도적 제거 — [OperatorsPage.tsx:148](../../apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx#L148) 코멘트: Total 과 중복) | ✅ |
| pending / approved / rejected | ✅ (backend 가 채워줌) | (facet 필터로 대체 가능) | ❌ | ❌ | (있음, 다른 경로) |
| role distribution | ✅ (broken) | (facet UI 로 row 단위 가시화) | ❌ | (preset 자체가 operator role 만) | ❌ |
| login activity / registrations / trends | ✅ (broken) | ❌ | ❌ | ❌ | ❌ |
| top active users | ✅ (broken) | ❌ | ✅ (사실상 list view) | ❌ | ❌ |

**가치 있는(중복 아닌) 지표**: registration trends + login activity + top active users + email verified rate — 그러나 이 4개는 **backend 가 전혀 제공하지 않으며**, 제공하려면:
- `loginActivity` → AccessLog / Session 테이블 집계 신규 쿼리 필요
- `registrationTrends` → users.createdAt + RoleAssignment 일별 GROUP BY 신규 쿼리
- `emailVerified` → users.emailVerified 컬럼 집계 (존재 여부 확인 필요)
- `topActiveUsers` → loginCount/lastLogin 누적 컬럼 또는 별도 통계 테이블 신규

⚠️ **F10 O4O Core (Approval/Auth)** 영역에 신규 통계 쿼리 추가 — 명시적 WO 필요.

### 3-7. 실사용 단서

| 단서 | 결과 |
|---|---|
| 좌측 sidebar entry | **없음** (orphan) |
| Analytics tracking | 0건 |
| 다른 페이지에서의 `/users/statistics` 링크 | 0건 |
| 최근 6개월 commit | **0건** — 마지막 수정 2025-10-10 (Gutenberg unrelated commit 에 휩쓸림). 실제 기능 변경 commit 은 `ca9e5f938`(2025년 사용자 관리 정비) 이후 없음. |
| backend `getUserStatistics` 호출 다른 caller | 없음 |

### 3-8. 판정

| 옵션 | 평가 |
|---|---|
| **A. 즉시 제거** (라우트 + 컴포넌트 삭제) | **권장**. 현재 broken UI + KPI 가치 있는 부분은 `/users` 본체 + ops-metrics 로 흡수. |
| B. ops-metrics 로 이동 | UI 가 broken 이라 그대로 이동 못함. 신규 backend 통계 쿼리 (F10 영향) 필요 + 통합 metrics 페이지 [/internal/ops/metrics](../../apps/api-server/src/routes/internal/ops-metrics.controller.ts) 와의 정합 — **큰 작업**, 비용 대비 가치 미확인. |
| C. 유지 / hidden | 의미 없음 — sidebar 진입 0건이라 이미 hidden 상태이지만 dead URL 이 유지됨. 코드 위생만 손해. |

근거: backend 계약 미스매치로 화면이 작동하지 않음 + sidebar entry 없음 + 가치 있는 4개 지표는 신규 F10-touching 백엔드 작업이 필요한데 사용자 요청이 7개월간 0건.

---

## 4. Backend / API 영향

### 4-1. 함께 deprecate 할 frontend / config 항목

| 항목 | 위치 | 비고 |
|---|---|---|
| Lazy import `RoleManagement` | [users.routes.tsx:8](../../apps/admin-dashboard/src/routes/users.routes.tsx#L8) | 제거 |
| `<Route path="/users/roles">` | [users.routes.tsx:72-78](../../apps/admin-dashboard/src/routes/users.routes.tsx#L72-L78) | 제거 |
| Lazy import `UserStatistics` | [users.routes.tsx:9](../../apps/admin-dashboard/src/routes/users.routes.tsx#L9) | 제거 |
| `<Route path="/users/statistics">` | [users.routes.tsx:79-85](../../apps/admin-dashboard/src/routes/users.routes.tsx#L79-L85) | 제거 |
| `pages/users/RoleManagement.tsx` (447 lines) | 파일 | 삭제 |
| `pages/users/UserStatistics.tsx` (364 lines) | 파일 | 삭제 |
| `rolePermissions.ts` `users-roles` / `users-permissions` entries | [rolePermissions.ts:60-67](../../apps/admin-dashboard/src/config/rolePermissions.ts#L60-L67) | 제거 |
| `apps.config.ts:38` `users.roles` alias | [apps.config.ts:38](../../apps/admin-dashboard/src/config/apps.config.ts#L38) | 제거 |
| `UserApi.getUserStats()` | [userApi.ts:103-106](../../apps/admin-dashboard/src/api/userApi.ts#L103-L106) | 호출자 사라지므로 제거 |

### 4-2. Backend endpoint 의 외부 호출자

| Endpoint | 호출자 |
|---|---|
| `GET /api/v1/users/statistics` (mounted) | frontend `UserApi.getUserStats()` — **유일 호출자** ([userApi.ts:104](../../apps/admin-dashboard/src/api/userApi.ts#L104)) |
| `GET /api/v1/admin/users/statistics` (Core-frozen, 별도 mount) | 전수 grep 결과 frontend 호출자 0건 — **dead endpoint** (그러나 Core freeze 영역이므로 본 IR 권고 범위 밖) |
| `GET /api/v1/users/roles` (mounted users.routes.ts) | **존재하지 않음** — handler 자체가 없음. frontend 4개 호출자(RoleManagement / UserForm / RoleSelector / CategoryEdit) 가 모두 400 으로 실패 중. |
| `POST /api/v1/users/roles` / `PUT /:id` / `DELETE /:id` (Role CRUD) | **존재하지 않음** + 호출자는 dead RoleManagement 뿐. |
| `GET /api/v1/users/permissions` | **존재하지 않음** + 호출자는 dead RoleManagement 뿐. |

| Backend 정리 항목 | 위치 | 비고 |
|---|---|---|
| `userController.getUserStatistics` | [routes/users.routes.ts:97](../../apps/api-server/src/routes/users.routes.ts#L97) + [UserManagementController.ts:80-96](../../apps/api-server/src/controllers/UserManagementController.ts#L80-L96) + [UserRepository.getUserStatistics :233-249](../../apps/api-server/src/repositories/UserRepository.ts#L233-L249) | UserStatistics 페이지 제거 후 호출자 0 → 함께 제거 가능. |
| NextGen `modules/user/routes/user.routes.ts` 전체 | (NOT mounted) | Dead module — `UserRoleController` + 전체 router 파일이 mount 되지 않음. 본 IR 범위 외이지만 별도 cleanup 후보 (위 4-3 참조). |

### 4-3. F10 O4O Core (Approval/Auth/Membership/RBAC) 영향 평가

| 변경 항목 | F10 영역? | 명시적 WO 필요? |
|---|---|---|
| `/users/roles` frontend route 제거 | ❌ frontend 라우트만 | 일반 WO |
| `/users/statistics` frontend route 제거 | ❌ frontend 라우트만 | 일반 WO |
| `pages/users/RoleManagement.tsx` 삭제 | ❌ | 일반 WO |
| `pages/users/UserStatistics.tsx` 삭제 | ❌ | 일반 WO |
| `routes/users.routes.ts:97 /statistics` handler 제거 | ⚠️ **경계 모호** — 이 파일 헤더에는 `@core` 표식이 없음. [admin/users.routes.ts](../../apps/api-server/src/routes/admin/users.routes.ts) 만 Core-frozen. → frontend 라우트와 함께 제거 가능. | 명시적 WO 권장 (F10 인접 영역) |
| `UserRepository.getUserStatistics()` 메서드 삭제 | ⚠️ Repository 는 Core 와 무관하나 호출자(`/admin/users/statistics` Core 핸들러)가 별도 `userRepo.count(...)` 직접 사용이므로 무영향. | 일반 WO |
| `admin/users.routes.ts` Core handler 변경 | ✅ **F10 영역** — 본 IR 권고는 이 endpoint **건드리지 않음** (dead 이지만 frozen). | 본 IR 범위 외 |
| RBAC catalog 코드 변경 (lib/rbac-catalog.ts) | ⚠️ F9 RBAC SSOT 의 frontend mirror. 본 IR 권고는 변경 0. | 본 IR 범위 외 |

⚠️ **F9 충돌 가능성 (사전 차단 목적)**: `RoleManagement` 화면이 그대로 유지되고 누군가 backend `POST /users/roles` 등을 "수리" 한다면 F9 위반 (동적 Role CRUD) 가 발생함. **본 IR 의 제거 권고는 F9 위반 백도어 사전 차단의 의미를 가짐.**

---

## 5. `/users` 본체 A안 재검증

직전 IR(`IR-O4O-ADMIN-USERS-MENU-ROLE-REDEFINE-AUDIT-V1`) 의 권고안 A — "super-admin 전용 RBAC 콘솔로 `/users` 본체를 축소" — 는 본 조사 결과로 **그대로 유효하며, 오히려 강화된다**.

근거:
1. `/users` 본체([UsersListClean.tsx](../../apps/admin-dashboard/src/pages/users/UsersListClean.tsx))는 이미 `WO-O4O-ADMIN-ASSIGNMENT-ROW-LIST-CANONICALIZATION-V1` 으로 assignment-row(`role_assignments` SSOT) 기반으로 캐노니컬화됨.
2. 본체의 KPI(total/users/activeUsers/visible — [UsersListClean.tsx:108-122](../../apps/admin-dashboard/src/pages/users/UsersListClean.tsx#L108-L122))가 UserStatistics 의 가치 있는 지표 중 작동하는 부분(total/active/role 분포 — facet 으로) 를 이미 흡수.
3. 본 IR 결과로 두 하위 라우트가 dead 임이 확인되었으므로, 권고안 A 의 "두 하위 라우트 제거" 가 사실상 무비용 (메뉴 항목 없음 + 작동 안 함 + 외부 호출자 0).
4. ⚠️ B/C 옵션 (UserStatistics 를 ops-metrics 로 이동 / 유지) 은 F10 영역 backend 신규 쿼리가 필요하므로 권고안 A 의 "축소" 방향과 충돌하지 않으며, 별개 비용으로 별도 평가.

**권고안 A 수정 없음.**

---

## 6. 권장안

### 6-1. 라우트별 최종 권장

| 라우트 | 권장 조치 |
|---|---|
| `/users/roles` (RoleManagement) | **즉시 제거** — frontend 라우트/컴포넌트/permission entry/URL alias 동시 제거. backend endpoint(`GET /users/roles`) 는 4개 외부 호출자가 있으므로 별도 WO 에서 catalog 직접 사용으로 전환 후 제거. |
| `/users/statistics` (UserStatistics) | **즉시 제거** — frontend 라우트/컴포넌트/`UserApi.getUserStats()` 동시 제거. backend `routes/users.routes.ts:97 /statistics` handler + `UserRepository.getUserStatistics()` 도 함께 제거 (`/admin/users/statistics` Core handler 는 건드리지 않음). |

### 6-2. 통합 권장

1. **Phase 1 (단일 WO, 본 IR 직속)**: 두 하위 라우트 + 컴포넌트 + 메뉴/config entry + frontend `UserApi.getUserStats()` + backend `routes/users.routes.ts:97 /statistics` + `UserRepository.getUserStatistics()` 동시 제거. F10 Core 영역 미접촉.
2. **Phase 2 (별도 WO)**: `GET /users/roles` 의 4개 호출자(UserForm / RoleSelector / CategoryEdit / [제거된] RoleManagement) 를 `lib/rbac-catalog` 직접 사용으로 전환 후 endpoint 제거. NextGen `modules/user/routes/user.routes.ts` dead module 정리 동반.
3. **Phase 3 (선택)**: `/admin/users/statistics` Core-frozen endpoint 가 호출자 0인 상태이므로, Core 영역 정리 WO 에서 함께 검토 (본 IR 범위 외).

### 6-3. F9 / F10 / F11 정합성 결론

| Freeze | 본 권고와의 관계 |
|---|---|
| F9 RBAC SSOT | ✅ **강화** — 동적 Role CRUD 의도의 dead UI 제거로 F9 위반 백도어 사전 차단 |
| F10 O4O Core | ✅ **무영향** — `routes/users.routes.ts` 는 Core 표식 없음, `admin/users.routes.ts` Core handler 는 건드리지 않음 |
| F11 User/Operator | ✅ **무영향** — users + service_memberships + role_assignments 3테이블 스키마 무변경 |

---

## 7. 후속 WO 초안

> 실제 WO 문서 작성은 사용자가 수행. 본 IR 은 초안 title + 1~3문장 요지만 제공.

### WO-1 (필수, 본 IR 직속)

**`WO-O4O-ADMIN-USERS-SUBROUTES-DEPRECATION-V1` — `/users/roles` · `/users/statistics` 라우트 + 컴포넌트 + 미사용 backend handler 동시 제거**

`/users/roles` (RoleManagement) 는 F9 위반 의도의 동적 Role CRUD UI 인데 backend 가 미구현이라 작동 안 함. `/users/statistics` (UserStatistics) 는 backend 가 5개 필드만 반환하고 UI 는 12개를 기대해 런타임 에러. 둘 다 sidebar 진입 entry 없음 · 7개월 무수정. 본 WO 에서 두 라우트/컴포넌트 + 관련 frontend config(`rolePermissions.users-roles`, `apps.config.users.roles`) + `userApi.getUserStats()` + backend `routes/users.routes.ts:97 /statistics` handler + `UserRepository.getUserStatistics()` 메서드를 일괄 제거한다. F10 Core 영역(`admin/users.routes.ts`)은 건드리지 않는다.

### WO-2 (선택, 별도 WO)

**`WO-O4O-ADMIN-USERS-ROLES-ENDPOINT-CATALOG-TRANSITION-V1` — `GET /users/roles` endpoint 의 catalog 직접 사용 전환**

frontend 4개 화면(`UserForm`, `RoleSelector`, `CategoryEdit` + 제거된 RoleManagement)이 호출하는 `GET /users/roles` 가 mounted router 에서 미구현 상태로 400 에러를 일으키고 있음. F9 RBAC SSOT 가 `lib/rbac-catalog.ts` + `RBAC-ROLE-CATALOG-V1.md` 로 확정되어 있으므로 4개 호출자를 catalog 직접 import 로 전환하고 endpoint 호출을 제거. 부수적으로 NextGen `modules/user/routes/user.routes.ts` dead module 정리.

---

*Investigation completed: 2026-05-16*
*Files inspected: ~14 (frontend) + ~7 (backend) + 3 (config) + 3 (docs)*
*Code changes: 0 — read-only investigation*
