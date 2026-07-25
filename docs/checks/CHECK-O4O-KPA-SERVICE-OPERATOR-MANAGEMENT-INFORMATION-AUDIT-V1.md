# CHECK-O4O-KPA-SERVICE-OPERATOR-MANAGEMENT-INFORMATION-AUDIT-V1

WO: `WO-O4O-KPA-SERVICE-OPERATOR-MANAGEMENT-INFORMATION-AUDIT-V1`
검증 일시: 2026-07-25 (KST) · 대상: https://kpa-society.co.kr (프로덕션)
검증 역할: KPA 관리자 테스트 계정 (`docs/local/TEST-ACCOUNTS.local.md`) — 자격정보 비기재

---

## 1. 현재 운영자 관리 화면과 API

KPA 서비스 관리자가 **운영자·관리자 계정 정보를 확인하는 canonical 경로는 `/operator/members` → `/operator/users/:id`** 이다. `/operator/roles` 는 계정 화면이 아니다.

| 화면 | route | 컴포넌트 | 실제 API | 성격 |
|------|-------|----------|----------|------|
| 회원 관리 | `/operator/members` | `MemberManagementPage` | `GET /api/v1/kpa/members` (KPA 전용 라우터) | 계정 목록 + `추가 권한` 컬럼에 역할 배지 |
| 회원 상세 | `/operator/users/:id` | `UserDetailPage`(→ `@o4o/ui` 공통) | `GET /api/v1/operator/members/:userId` | 계정 상세 + **역할 부여·해제** |
| 역할 관리 | `/operator/roles` | `RoleManagementPage`(→ `@o4o/ui` 공통) | `GET/POST/PUT/DELETE /api/v1/operator/roles` | **역할 카탈로그(roles 테이블)** — 사용자 목록 아님 |

- 메뉴 진입점: `operatorMenuGroups.ts` `system` 그룹 — `역할 관리`(adminOnly). 회원 관리는 `users` 그룹.
- `/operator/roles` 는 데드 링크가 아니다. `OperatorRoutes.tsx:236` 에 `RoleGuard([KPA_ADMIN, PLATFORM_SUPER_ADMIN])` 로 실재한다.
- **역할 카탈로그와 계정 관리는 별개 축**이다. "누가 운영자인가"는 `/operator/roles` 에서 확인할 수 없다.

## 2. operator / admin 역할 경계

| 항목 | 값 |
|------|-----|
| KPA canonical role prefix | `kpa:` — 카탈로그 실측 `kpa:admin`, `kpa:operator`, `kpa:branch_admin`, `kpa:branch_operator`, `kpa:district_admin`, `kpa:pharmacist`, `kpa:store_owner`, `kpa:student` (8개) |
| 역할 카탈로그 총량 | 39개 (platform / neture / glycopharm / cosmetics / kpa / lms / glucoseview) |
| `kpa-society:*` 역할 | **카탈로그에 0건** (§6-A 참조) |
| `scope.isPlatformAdmin` | `platform:admin` \| `platform:super_admin` 만 true — `kpa:admin` 은 **false** (`role.utils.ts:135`) |
| 화면 guard | `/operator/roles` = `KPA_ADMIN` + `PLATFORM_SUPER_ADMIN`, `/operator/members` = operator 이상 |

## 3. 표시되는 계정 정보

`GET /api/v1/operator/members` 응답 필드 (프로덕션 실측): `id, email, firstName, lastName, name, nickname, company, phone, status, isActive, roles[], memberships[{serviceKey, status, role, approvedBy, approvedAt, rejectionReason}], createdAt, updatedAt`

- **비밀번호·해시·토큰 등 인증 비밀값은 응답에 없음** — 노출 위반 0.
- 목록 화면 컬럼: 이름 / 이메일 / 유형 / 활동 유형 / **추가 권한** / 가입일 / 상태. `추가 권한` 에 `플랫폼 관리자 · 관리자 · 운영자 · 매장 운영` 배지가 표시되어 **운영자·관리자 식별이 목록에서 가능**하다.
- 상세 화면: 기본 정보 / 약국 정보 / **역할 (Role Assignments)** 표(역할·활성·범위·부여일·관리) / 서비스 멤버십 표.

### KPA 운영자·관리자 실측 (serviceKey=kpa-society)

| 항목 | 값 |
|------|-----|
| kpa-society 멤버 총원 | 5명 |
| `kpa:admin` 보유 | 1명 |
| `kpa:operator` 보유 | 1명 (동일인) |
| 해당 계정 | `platform:super_admin` **겸임** (서비스 전용 운영자 아님) |

## 4. 역할 부여·해제 가능 범위

- 부여: `POST /api/v1/operator/members/:userId/roles` · 해제: `DELETE /api/v1/operator/members/:userId/roles/:role` (`role_assignments` SSOT, soft delete)
- **자기 권한 상승 방지는 backend 에서 강제됨** — `MembershipConsoleController.assignMemberRole:1135`
  (WO-O4O-NETURE-OPERATOR-ROLE-ASSIGNMENT-AUTHORITY-LOCK-V1):

```text
!scope.isPlatformAdmin 인 경우
  - isAssignable=false → 403
  - 타 서비스 scope 역할 → 403
  - roleEntity.isAdminRole || roleEntity.roleKey === 'operator' → 403
    code: ROLE_ASSIGNMENT_PLATFORM_ADMIN_ONLY
```

| 주체 | 부여 가능 |
|------|-----------|
| `kpa:admin` / `kpa:operator` | 자기 서비스(`kpa:`) 의 **비-admin·비-operator** 역할만 (pharmacist / student / store_owner 등) |
| `platform:admin` / `platform:super_admin` | 전 서비스 · admin/operator tier 포함 |

→ **운영자·관리자 지정은 플랫폼 관리자 전용**이며, KPA 서비스 관리자는 운영자를 스스로 만들 수 없다. WO 원칙("운영자가 자신의 권한을 높일 수 없도록 유지") 은 현행 코드에서 이미 충족.

- `service_memberships.role` 로 운영 권한을 쓰는 경로는 `MembershipConsoleController:843` 에서 400 으로 차단(축 혼입 방지).

## 5. operator-only 테스트 계정 필요 여부 — **필요(실제 운영 문제)**

- 프로덕션에 **순수 `kpa:operator` / `kpa:admin` 계정이 0건**이다. 유일 보유자가 `platform:super_admin` 겸임이라 모든 service-scope 거부 분기를 우회한다.
- 그 결과 §6-A 의 guard 불일치(서비스 운영자 전면 403)가 **어떤 스모크로도 드러나지 않는다.** 실제 운영자를 채용·지정하는 순간 처음 발현된다.
- 본 WO 는 계정 생성을 금지하므로 생성하지 않았다. 후속 WO 로 `kpa:operator` 전용 검증 계정 발급을 권고한다.

## 6. 발견 사항

### 6-A. [미수정 · 후속 WO] 공통 operator 라우터 guard 가 존재하지 않는 `kpa-society:*` 역할을 요구

| 파일 | 라인 |
|------|------|
| `apps/api-server/src/routes/operator/membership.routes.ts` | 26 |
| `apps/api-server/src/routes/operator/roles.routes.ts` | 24 |

```text
requireRole([... , 'kpa-society:admin', 'kpa-society:operator'])
```

- `requireRole` 는 `roleAssignmentService.hasAnyRole` 로 **정확 문자열 매칭**하며 prefix 정규화가 없다.
- 역할 카탈로그에 `kpa-society:*` 는 **0건**(실측). KPA 실 역할은 `kpa:admin` / `kpa:operator`.
- neture / glycopharm / cosmetics 는 모두 올바른 prefix 를 쓰며 **KPA 만 canonical serviceKey(`kpa-society`) 를 role prefix 자리에 잘못 사용**.
- 영향: 순수 `kpa:admin` / `kpa:operator` 는 `/api/v1/operator/members/*`, `/api/v1/operator/roles/*` 에서 **403**
  → 회원 상세(`/operator/users/:id`)·역할 관리(`/operator/roles`) 화면이 비거나 오류. 목록(`/api/v1/kpa/members`)은 별도 라우터라 영향 없음.
- **본 WO 에서 수정하지 않음** — 중지 조건 해당:
  1) 4개 서비스가 공유하는 cross-service 라우터의 **권한 확대** 변경이다.
  2) §5 대로 순수 operator 계정이 없어 **수정 후 검증이 불가**하며, 검증하려면 WO 가 금지한 테스트 계정 생성이 필요하다.
  3) 선행 IR(`IR-O4O-SERVICE-OFFER-APPROVAL-EXPOSURE-GATE-AUDIT-V1 §3.5`)이 이미 별건 정합화 항목으로 기록.
- 권고 후속 WO: `WO-O4O-OPERATOR-ROUTER-KPA-ROLE-PREFIX-ALIGNMENT-V1` (operator 계정 발급 + guard 정합화 + 거부/허용 양방향 스모크).

### 6-B. [수정함] KPA 비밀번호 변경이 존재하지 않는 경로(404)로 호출

- `MemberManagementPage.updatePassword` 가 kpa 전용 `apiClient`(base `/api/v1/kpa`) 로 `/operator/members/:userId` 를 호출 → 실제 요청은 `/api/v1/kpa/operator/members/:userId`.
- 프로덕션 probe:

```text
GET /api/v1/kpa/operator/members/<uuid>  → 404 (Cannot GET)
GET /api/v1/operator/members/<uuid>      → 200 success
```

- KPA 라우터에는 `/operator/members` 마운트가 없다(`kpa.routes.ts`). 의도 대상은 플랫폼 공통 operator 콘솔 API.
- 수정: 동일 모듈이 이미 export 하는 `coreApiClient`(base `/api/v1`, prefix 없음) 사용. 신규 API·권한 변경 0.

### 6-C. [수정함] 역할 관리 화면의 stale role 판정 — 항상 `isAdmin=false`

- `services/web-kpa-society/src/pages/operator/RoleManagementPage.tsx` 가 prefix 없는 legacy role `['admin','super_admin']` 을 검사 → RBAC namespacing 이후 **어떤 사용자도 매칭되지 않음**.
- 프로덕션 확인: `platform:super_admin` 으로 접속해도 `새 역할 추가` 버튼·`Actions` 컬럼이 **표시되지 않음**(테이블 헤더 5개, 버튼 `새로고침` 뿐). backend 는 해당 사용자에게 CUD 를 허용하므로 **기능 은폐**.
- 같은 서비스의 `UserDetailPage.tsx:61` 은 이미 `ROLES.KPA_ADMIN`(prefixed) 을 쓰고 있어, 본 파일만 남은 drift 였다.
- 수정: backend 실권한(`scope.isPlatformAdmin` = `platform:admin` | `platform:super_admin`) 과 동일 기준으로 정정.
  `kpa:admin` 은 계속 조회 전용 — **403 을 유발하는 버튼을 노출하지 않기 위해** 형제 서비스의 `{service}:admin` 패턴을 그대로 따르지 않았다.

### 6-D. [미수정 · 범위 밖] 공통 `RoleModal` 이 operator tier 역할을 걸러내지 않음

- `packages/ui/src/operator-user-detail/UserDetailPage.tsx:193` — `isAdmin` 이 true 면 `isAdminRole` 필터를 해제하나, backend 가 함께 막는 `roleKey === 'operator'` 는 걸러내지 않는다.
- `kpa:admin` 이 `KPA Operator` 를 선택하면 항상 403(`ROLE_ASSIGNMENT_PLATFORM_ADMIN_ONLY`) — 죽은 선택지.
- 4개 서비스 공유 컴포넌트 prop 추가가 필요해 KPA 범위 밖. 후속 정리 대상으로 기록.

### 6-E. [관찰] 부여 후보 목록의 cross-service 노출

- KPA 콘솔의 `역할 추가` 드롭다운에 31개(전 서비스) 역할이 보인다. 이는 검증 계정이 `platform:super_admin` 이라 backend 가 전체 카탈로그를 반환한 결과이며, 순수 `kpa:admin` 은 scope 필터로 `kpa:*` 만 받는다(`RoleController.getRoles:36-41`). **설계상 정상**.
- 다만 카탈로그에 `glucoseview` 역할 4건이 잔존한다(코드의 서비스 필터에서는 제거됨). 데이터 잔재 — 별건.

## 7. 인증 브라우저 smoke 결과

| 항목 | 결과 |
|------|:---:|
| KPA 관리자 계정 로그인 | PASS |
| `GET /api/v1/auth/status` roles 확인 (`kpa:admin`,`kpa:operator`,`platform:super_admin` 등) | PASS |
| `/operator/roles` 렌더 (39행, 카탈로그) | PASS |
| `/operator/roles` CUD 버튼 은폐 확인 (수정 전 상태 재현) | 확인 |
| `/operator/members` 렌더 (5행, `추가 권한` 배지 표시) | PASS |
| `/operator/users/:id` 상세 렌더 (역할 표 + 역할 추가) | PASS |
| `역할 추가` 모달 후보 목록 확인 후 **취소** (write 미수행) | PASS |
| `/api/v1/kpa/operator/members/:id` 404 · `/api/v1/operator/members/:id` 200 probe | PASS |
| 비밀번호·인증 비밀값 노출 | 0 |
| 데이터 write (역할 부여/해제/상태변경/비밀번호) | **0건 — 전부 read-only** |

## 8. 변경 범위

| 항목 | 값 |
|------|-----|
| 수정 파일 | `services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx`, `services/web-kpa-society/src/pages/operator/RoleManagementPage.tsx` |
| 신규 역할·테이블·관리 시스템 | 0 |
| backend 변경 | 0 |
| DB 변경 / migration | 0 |
| 권한 정책 변경 | **0** (두 수정 모두 frontend 호출 대상·표시 판정만. backend guard 무변경) |
| typecheck (`tsc --noEmit`) | PASS (오류 0) |
| build (`pnpm --filter @o4o/web-kpa-society build`) | PASS (13.97s) |

## 8-1. 배포 및 배포 후 재검증

| 항목 | 값 |
|------|-----|
| commit | `1bf655306` |
| workflow | `Deploy Web Services (Cloud Run)` — conclusion **success** (run 30150132814) |
| job | `detect-changes` success · `deploy-kpa-society` **success** (타 3서비스 skipped) |
| Cloud Run revision | `kpa-society-web-01699-57n` |

배포 후 인증 브라우저 재검증:

| 검증 | 수정 전 | 수정 후 | 결과 |
|------|---------|---------|:---:|
| `/operator/roles` CUD UI (`platform:super_admin`) | 버튼 `새로고침` 뿐 · 헤더 5개(Actions 없음) | `새로고침` + **`새 역할 추가`** · 헤더 6개(**Actions** 포함) · 39행 | PASS |
| 비밀번호 변경 PUT 라우팅 (`not-a-uuid`, DB 접근 전 400 분기 이용 — **write 0**) | `PUT /api/v1/kpa/operator/members/…` → **404** `Cannot PUT` | `PUT /api/v1/operator/members/…` → **400** `INVALID_USER_ID` (라우트 도달) | PASS |

- 실제 비밀번호 변경은 **실행하지 않았다** — 운영 회원의 자격증명을 바꾸는 write 이므로 금지. 라우팅 도달 여부만 무해한 잘못된 id 로 검증했다.

## 9. 후속 권고

| # | 항목 | 사유 |
|---|------|------|
| 1 | `kpa:operator` 전용 검증 계정 발급 | §5 — 거부 경로 검증 불가 상태 해소 |
| 2 | `WO-O4O-OPERATOR-ROUTER-KPA-ROLE-PREFIX-ALIGNMENT-V1` | §6-A — guard 정합화(권한 확대 포함, 별도 승인 필요) |
| 3 | 공통 `RoleModal` 의 operator tier 필터 | §6-D — 4개 서비스 공통 |
| 4 | 형제 서비스 `RoleManagementPage` isAdmin 기준 재정렬 | §6-C — GP/KCos/Neture 는 `{service}:admin` 에 CUD 버튼 노출(403 유발) |
| 5 | 카탈로그 `glucoseview` 역할 잔재 정리 | §6-E |
