# O4O Admin Dashboard 인증·권한 정합성 전수 감사 V1

> WO: `WO-O4O-ADMIN-AUTHORIZATION-ROLE-ROUTE-API-CONSISTENCY-AUDIT-V1`
> 성격: **read-only 감사** — 소스 변경 0 / 배포 0 / 운영 DB write 0
> 일자: 2026-08-03
> 시작 상태: branch `main`, HEAD `0cd84b7d0`(감사 시작) → `3a9dde016`(다른 세션 커밋으로 이동), `HEAD...origin/main = 0 0`
> 최종 판정: **CRITICAL_ACCESS_RISK**

---

## 0. 요약

세 계층(①메뉴 노출 ②프런트 route ③백엔드 API)은 **서로 독립적으로 동작**하며, 실질적인
접근 통제는 **백엔드 guard 하나에만** 걸려 있다. 프런트 계층의 역할·permission 선언은
대부분 **선언만 존재하고 실행되지 않는다.**

그런데 백엔드에도 **guard 가 아예 없는 관리자 mount 가 존재**하며, 이 중 일부는
프로덕션에서 **비로그인 GET 200** 으로 확인됐다. 따라서 판정은 프런트 불일치(P2) 수준이
아니라 **CRITICAL_ACCESS_RISK** 이다.

| 심각도 | 건수 | 성격 |
|:---:|:---:|---|
| **P0** | **4** | 인증 없이 접근되는 관리자 API subtree |
| P1 | 1 | 조직 경계 없는 회원 명부 endpoint (P0 와 중첩) |
| P2 | 3 | 프런트 선언과 실제 검사의 불일치 (공용 구조 결함) |
| P3 | 3 | 기능·인증 연결 결함 (개별 화면) |
| P4 | 4 | 문서·테스트·표기 기반 부족 |

---

## 1. 실제 역할 목록 (추정 아닌 코드 근거)

### 1-1. 백엔드 enum — `apps/api-server/src/types/auth.ts`

```ts
enum UserRole {
  SUPER_ADMIN = 'platform:super_admin',
  ADMIN       = 'platform:admin',
  OPERATOR    = 'operator',
  MANAGER, VENDOR, SELLER, SUPPLIER, PARTNER, AFFILIATE, BUSINESS,
  USER = 'user', CUSTOMER,
}
```

`JWTPayload` 는 **단수** `role: UserRole` 필드를 갖는다.
반면 `packages/types/src/auth.ts` 의 `UserRole` 은 `export type UserRole = string` 으로
**타입 수준의 제약이 전혀 없다.** 즉 프런트는 임의 문자열을 역할로 취급한다.

### 1-2. RBAC 단일 소스 — `role_assignments` (F9 Freeze)

`roleAssignmentService.getActiveRoles(userId)` → `isActive=true` + `isValidNow()` 통과분.
**ORDER BY 가 없다** (`role-assignment.service.ts:41-71`).

### 1-3. 관리자 판정 함수

| 함수 | 위치 | 허용 |
|---|---|---|
| `requireAdmin` | `common/middleware/auth/authorization.middleware.ts` | `platform:admin`, `platform:super_admin` **만** |
| `requireRole(roles)` | 동일 | 인자로 받은 역할 목록 실검사 |
| `requirePermission` / `requireAnyPermission` | 동일 | `user.permissions` → `roleAssignmentService.hasPermission` 실검사 |

`middleware/auth.middleware.ts` 는 `export * from '../common/middleware/auth.middleware.js'`
재수출 shim 이므로 **경로가 두 개여도 구현은 하나**다.

### 1-4. 서비스별 접두 역할

`kpa:`, `neture:`, `glycopharm:`, `glucoseview:`, `cosmetics:` + `:admin` / `:operator`.
`organization_members.role` ∈ {owner, admin, member} 은 **별도 Layer(B)** 이며 RBAC 역할이 아니다.

### 1-5. 프런트가 실제로 선언하는 값 (route 파일 14개 전수)

| requiredRoles 값 | 건수 |
|---|---:|
| `admin` | 69 |
| `super_admin` | 20 |
| `operator` | 8 |
| `seller` | 6 |
| `supplier` | 6 |
| `partner` | 2 |
| `affiliate` | 1 |
| `platform:super_admin` | 1 |
| `platform:admin` | 1 |
| **`platform_admin`** (언더스코어 — 존재하지 않는 값) | **1** |

`requiredPermissions` 는 38종 90건. 그중 **`'admin'` 5건** 은 permission 이 아니라 역할 문자열이
permission 슬롯에 잘못 들어간 것이다.

---

## 2. 역할별 기대 권한표 (현행 코드가 실제로 시행하는 것)

| 역할 | 메뉴 노출 | Admin Dashboard 진입 | 개별 화면 렌더 | 백엔드 데이터 |
|---|:---:|:---:|:---:|:---:|
| `platform:super_admin` | 전체 | O | O | O |
| `platform:admin` | `core-users` 제외 전체 | O | O | O |
| `super_admin` / `admin` (무접두, **데이터 이행으로 제거됨**) | 전체 | O | O | **X** (requireAdmin 불허) |
| `operator` | 게이트 미설정 메뉴 전부 | O | O | 라우터별 `requireRole` 에 따름 |
| `kpa:admin` / `neture:admin` / 임의 `*:admin` | 게이트 미설정 메뉴 전부 | **O** | **O** | **X (403)** |
| `*:operator` | 동일 | **O** | **O** | 라우터별 |
| `user` / `customer` | 게이트 미설정 메뉴 전부 | X | X | X |
| 비로그인 | — | X | X | **일부 O — §5 P0 참조** |

---

## 3. 세 계층의 실제 동작

### 3-1. ① 메뉴 노출

파이프라인: `admin-menu.static.tsx`(정적 트리 48 leaf) → `useAdminMenu.filterMenuItems`
→ `hasMenuPermission(userRoles, userPermissions, menuId)` (`config/rolePermissions.ts`).

```ts
const menuConfig = menuPermissions.find(m => m.menuId === menuId);
// POLICY: ALLOW BY DEFAULT (Whitelist approach)
if (!menuConfig) return true;
```

**48 leaf 중 게이트가 설정된 항목은 2건뿐**이다.

| menuId | 허용 역할 |
|---|---|
| `dashboard` | (roles 없음 = 전원 통과) |
| `core-users` | `super_admin`, `platform:super_admin` |
| `core-membership-categories` | `admin`, `super_admin`, `platform:admin`, `platform:super_admin` |

즉 **46 leaf 는 로그인해 Dashboard 에 들어온 누구에게나 노출**된다.

동적 메뉴 `GET /api/v1/navigation/admin` 은 `{ data: [], total: 0, context: { phase: 'R1' } }`
스텁이므로, 정적 트리 + 로컬 게이트가 유일 경로다(= 게이트는 실제로 적용되긴 한다).

### 3-2. ② 프런트 route — `packages/auth-context/src/AdminProtectedRoute.tsx`

```tsx
const matchesRole = (role: string): boolean => {
  if (expandedRequiredRoles.includes(role)) return true;
  if (role.includes(':') && (role.endsWith(':admin') || role.endsWith(':operator'))) return true;
  return false;
};
```

- `requiredRoles: ['admin']` 은 `super_admin`/`operator`/`platform:admin`/`platform:super_admin` 으로 자동 확장된다.
- 그리고 **`endsWith(':admin')` 규칙 때문에 `kpa:admin`, `neture:admin`, `아무개:operator` 가 모두 통과**한다.
- `App.tsx:180-210` 은 관리자 shell **전체**를 `<AdminProtectedRoute requiredRoles={['admin']}>` 로 감싼다.
  → **임의 서비스 접두 관리자/운영자는 Admin Dashboard 전 영역에 진입한다.**

`requiredPermissions` 는 permission 을 **검사하지 않는다.**

```tsx
// 권한 기반 접근 제어는 현재 User 타입에 없으므로 기본적으로 통과
if (requiredPermissions.length > 0) {
  const isDashboardRole = (role) => exactRoles.includes(role)
    || (role.includes(':') && (role.endsWith(':admin') || role.endsWith(':operator')));
  ...
}
```

즉 **`requiredPermissions` 90건은 `requiredRoles` 와 동일한 `*:admin` 허용 검사로 축약**된다.
`membership:manage`, `users:update`, `yaksa-admin.members.approve` 등은 전부 **무효 선언**이다.

### 3-3. ③ 백엔드 guard

`admin` / `operator` / `service-admin` 접두 mount 39건을 register-routes.ts → 라우터 파일로
정적·동적 import 모두 추적해 전수 확인했다.

| mount | guard | 라우터 파일 |
|---|---|---|
| `/api/v1/admin` | `requireAdmin` | `routes/admin/dashboard.routes.ts` |
| `/api/v1/admin/apps` | `requireAdmin` | `routes/admin/apps.routes.ts` |
| `/api/v1/admin/users` | `requireRole` | `routes/admin/users.routes.ts` |
| `/api/v1/admin/platform-accounts` | `requireRole` | `routes/admin/platform-accounts.routes.ts` |
| `/api/v1/admin/platform-users` | `requireRole` | `routes/admin/platform-users.routes.ts` |
| `/api/v1/admin/security` | `requireRole` | `routes/admin/security-blocked-ips.routes.ts` |
| `/api/v1/admin/platform` | `requireAuth`+`requireRole` | `routes/v1/platformInquiry.routes.ts` |
| `/api/v1/admin/physical-stores` | `requireAdmin`+`requireAuth` | `routes/platform/physical-store.routes.ts` |
| `/api/v1/admin/store-network` | `requireAdmin`+`requireAuth` | `routes/platform/store-network.routes.ts` |
| `/api/v1/admin/platform-services` | `requireAdmin`+`requireAuth` | `routes/platform-services/admin-platform-services.routes.ts` |
| `/api/v1/admin/services` (×3 컨트롤러) | `require*Scope` | `modules/contact-inquiry/*`, `modules/service-legal/*` |
| `/api/v1/admin/o4o-product-db/*` (13 컨트롤러) | `requireRole` | `modules/neture/controllers/*` |
| `/api/v1/admin/channel-playback-logs` | `requireAdmin` | `routes/admin/channel-playback-logs.routes.ts` |
| `/api/v1/admin/channels/heartbeat` | `requireAdmin` | `routes/admin/channel-heartbeat.routes.ts` |
| `/api/v1/admin/channels/ops` | `requireAdmin` | `routes/admin/channel-ops.routes.ts` |
| `/api/v1/admin/ops` | `requireAdmin` | `routes/admin/ops-metrics.routes.ts` |
| `/api/v1/operator/analytics` · `members` · `products` · `roles` · `stores` | `requireRole` | `routes/operator/*` |
| `/api/v1/operator/product-candidates` | `requireRole` | `modules/neture/controllers/product-candidate.controller.ts` |
| `/api/v1/operator/store-product-requests` | `requireRole`+`injectServiceScope` | `routes/o4o-store/controllers/store-product-request-admin.controller.ts` |
| **`/api/v1/service-admin`** | **없음** | `routes/service-admin.routes.ts` |

`app.use('/api/v1/…')` 앞에 걸린 **전역 인증 미들웨어는 존재하지 않는다** (`main.ts` 에는
`globalErrorHandler` 만 있다). 따라서 라우터 내부 guard 가 없으면 그대로 공개된다.

---

## 4. 서비스·조직 경계

| 구분 | 현황 |
|---|---|
| 메뉴 노출 | 서비스 경계 없음 (48 leaf 중 46건 무게이트) |
| route 렌더 | 서비스 경계 없음 (`*:admin` 전면 허용) |
| 목록/상세 조회 | 라우터별 `requireRole` + 일부 `injectServiceScope` — **경계 있음** |
| 생성/수정/상태변경/삭제 | 동일 guard 를 공유 — 읽기·쓰기 분리 정책 없음 |
| 타 조직 데이터 | `injectServiceScope` 를 쓰는 mount 는 `/operator/store-product-requests`, `/admin/services` 계열뿐 |

즉 **화면 계층에는 서비스 경계가 사실상 없고, 데이터 계층에만 있다.**
`kpa:admin` 이 플랫폼 화면 골격을 전부 볼 수 있다는 관측은 재현·확정됐다(코드 근거 §3-2).

---

## 5. P0 — 인증 없이 접근되는 관리자 API

> 안전 원칙에 따라 **상태 코드만** 취득했다. 응답 본문 열람 0, 쓰기 요청 0, 인증 우회 시도 0.

| # | 경로 | 코드 근거 | 비로그인 GET |
|:--:|---|---|:---:|
| P0-1 | `/api/v1/service-admin/*` | `register-routes.ts:266` mount 에 미들웨어 없음 + 라우터에 guard import 0 | **200** |
| P0-2 | `/api/v1/membership/organizations/:organizationId/members` | `membership-admin-guard.ts` 보호 목록 밖 | **200** |
| P0-3 | `/api/v1/membership/audit-logs` | 동일 | **500** (핸들러가 인증 없이 실행됨) |
| P0-4 | `/api/v1/membership/license-verification/*` | 동일 | **500** (동일) |

부가: `/api/v1/membership/affiliations` 는 404(라우팅 불일치)이나 **guard 는 역시 없다.**

### P0-1 상세

`routes/service-admin.routes.ts` 가 노출하는 8 endpoint:

| method | path | 성격 |
|---|---|---|
| GET | `/summary` | 테넌트 서비스 요약 |
| GET | `/apps` | 설치 앱·모듈 목록 |
| GET | `/theme` | 테마 설정 |
| **PUT** | **`/theme`** | **테마 설정 변경 (write)** |
| **POST** | **`/theme/reset`** | **테마 초기화 (write)** |
| GET | `/init-preview/:templateId` | 초기화 미리보기 |
| GET | `/templates` | 서비스 템플릿 목록 |
| GET | `/stats` | 서비스 통계 |

**쓰기 2개는 실측하지 않았다** (WO 금지 + 중지 조건). 코드상 인증 장벽이 없으므로
**비로그인 상태의 테넌트 테마 변조가 가능한 것으로 간주하고 P0 로 분류**한다.

### P0-2 상세

`packages/membership-yaksa/src/backend/routes/index.ts` 는 12개 subtree 를 마운트하지만
패키지 계층이라 guard 를 넣지 못한다. 보호는 `bootstrap/membership-admin-guard.ts` 가
mount 지점에서 **4개 subtree + `/members` 선택적 guard** 로만 건다
(`categories`, `export`, `stats`, `verifications`).

보호 밖 4건 — `/audit-logs`, `/affiliations`, `/organizations/:organizationId/members`,
`/license-verification` — 은 선행 WO(`…GUARD-V2`)가 테스트에 **명시적으로 기록해 둔 잔여 항목**이며,
이번 감사에서 **프로덕션 비로그인 접근이 실제로 성립함**을 확인했다.

실측은 존재하지 않는 UUID(`00000000-…`) 로만 수행했으므로 **실제 회원 개인정보는 조회하지 않았다.**
다만 유효한 organizationId 를 아는 비로그인 요청자는 회원 명부에 도달할 수 있는 구조다.

---

## 6. P1~P4

### P1 — 서비스·조직 경계 위반 가능

| # | 내용 |
|---|---|
| P1-1 | `/membership/organizations/:organizationId/members` 는 organizationId 를 **요청자가 지정**한다. 소유권·소속 검사가 없다(P0-2 와 동일 지점, 경계 관점의 재분류). |

### P2 — 프런트-백엔드 정책 불일치 (공용 구조 결함)

| # | 내용 | 위치 |
|---|---|---|
| P2-1 | `matchesRole` 의 `endsWith(':admin'\|':operator')` 규칙으로 **모든 서비스 관리자가 Admin Dashboard 전체 진입** | `AdminProtectedRoute.tsx` |
| P2-2 | `requiredPermissions` **90건이 실제 permission 을 검사하지 않음** (역할 검사로 축약) | 동일 + route 14파일 |
| P2-3 | 메뉴 게이트 **ALLOW-BY-DEFAULT** — 48 leaf 중 46건 무게이트 | `config/rolePermissions.ts` |

세 건 모두 **화면 골격만 노출되고 데이터 API 는 403** 이므로 WO 기준상 P2 다.
단 §5 의 P0 경로들과 결합하면 "메뉴로 유도되는 무인증 API" 조합이 되므로 **P0 수정이 선행**돼야 한다.

### P3 — 기능·인증 연결 결함 (개별 화면)

| # | 내용 | 위치 |
|---|---|---|
| P3-1 | `getActiveRoles` 에 `ORDER BY` 없음 → `publicData.role = roles[0]` 이 **비결정적**. 복수 역할 사용자의 대표 역할이 요청마다 달라질 수 있다 | `role-assignment.service.ts:41-71`, `auth-context.helper.ts` |
| P3-2 | `GET /membership/audit-logs/member/:id` 호출 — 백엔드 라우터에는 `/`, `/recent`, `/stats`, `/:id` 만 존재. **경로 자체가 없다**(dead call) | `MemberDetail.tsx:216` vs `auditLogRoutes.ts` |
| P3-3 | 이중 `/api` 접두 잔여 3건: `/api/membership/members/${id}`, `/api/membership/members`, `/api/organizations/${id}/members/me` | `MemberManagement.tsx:187`, `lib/api/yaksaAdmin.ts:161`, `PermissionGuard.tsx:46` |

### P4 — 기반 부족

| # | 내용 |
|---|---|
| P4-1 | `requiredRoles={['platform_admin']}` — 언더스코어 표기, **어떤 enum 에도 없는 값** (`dashboard.routes.tsx`) |
| P4-2 | `requiredPermissions={['admin']}` 5건 — 역할 문자열이 permission 슬롯에 있음 (`platform.routes.tsx`, `test.routes.tsx`) |
| P4-3 | `docs/rbac/RBAC-ROLE-CATALOG-V1.md`(2026-02-27) 가 무접두 `admin`/`super_admin` 을 플랫폼 역할로 서술 — `requireAdmin` 의 **platform 접두 전용 정책과 불일치(stale)** |
| P4-4 | `seller`/`supplier`/`partner`/`affiliate` 전용 route 15건이 **관리자 전용 shell 내부**에 중첩 — 해당 역할은 shell 진입 자체가 불가하므로 도달 불가능한 선언 |

---

## 7. 조사 E — 알려진 5경로 원인 분류

> WO 지시대로 **같은 원인으로 가정하지 않고 개별 판정**했다.

| # | 경로 | 원인 분류 | 근거 |
|:--:|---|---|---|
| E-1 | `/admin/membership/categories` (프런트) | **정상** | route·메뉴·백엔드 guard(`platform:*` 전용) 모두 연결 완료. 선행 3개 WO 로 해소됨 |
| E-2 | `/membership/me` | **API prefix·route 결함** | 백엔드에 `/api/v1/membership/me` 라우트는 없다. 실제 경로는 `/membership/members/me` 이며 **비로그인 401 정상 동작** |
| E-3 | `/members/me` | **정상** (경로 표기 오해) | `GET /api/v1/membership/members/me` → 401(비로그인). guard 예외로 설계된 본인용 경로 |
| E-4 | `/members/me/summary` | **정상** | 동일 — 401 확인 |
| E-5 | `audit-logs/member/:id` | **API prefix·route 결함 + 데이터 결함** | 프런트가 없는 경로를 호출(P3-2). 상위 `/audit-logs` 는 **guard 부재 + 비로그인 500** (P0-3) |

**공용 원인은 하나도 없다.** E-1/E-3/E-4 는 정상, E-2/E-5 는 개별 route 결함이며,
E-5 만 §5 의 공용 guard 결함과 지점을 공유한다.

---

## 8. 공용 결함 vs 개별 화면 결함

| 구분 | 항목 |
|---|---|
| **공용 구조 결함** | P0-2·3·4 (membership mount guard 설계), P2-1 (`AdminProtectedRoute.matchesRole`), P2-2 (`requiredPermissions` 미검사), P2-3 (메뉴 ALLOW-BY-DEFAULT), P3-1 (역할 정렬 부재) |
| **개별 화면·경로 결함** | P0-1 (`service-admin` 라우터 단독), P3-2 (MemberDetail audit-log 호출), P3-3 (이중 접두 3건), P4-1·P4-2 (개별 route 선언 오타) |
| **문서·운영 기반** | P4-3 (RBAC 카탈로그 stale), P4-4 (도달 불가 route), 역할별 테스트 계정 부재 |

---

## 9. 실측 범위와 미검증

### 실측한 것

- 프로덕션 **비로그인 GET 11건** — 상태 코드만 취득, 응답 본문 열람 0
- `api.neture.co.kr` 기준. Cloud Run 직접 URL(`o4o-core-api-…run.app`)은 전 경로 404 이므로
  **도메인 경유가 유일한 실측 채널**이다(이 사실 자체도 기록 대상).
- 소스 정적 추적: menu 48 leaf / route 223 선언 / admin·operator mount 39건 전수

### 미검증 (역할별 계정 부재 또는 WO 금지)

1. `platform:admin` / `platform:super_admin` 로그인 상태의 실제 화면·API 동작
2. `kpa:admin` 로그인 후 Admin Dashboard 진입 **브라우저 실측** (코드 근거로만 확정)
3. `PUT /service-admin/theme`, `POST /service-admin/theme/reset` 의 무인증 쓰기 성립 여부 (쓰기 금지)
4. 유효 organizationId 로 `/membership/organizations/:id/members` 를 호출했을 때의 실제 반환 데이터 (보호 데이터 열람 금지)
5. `role_assignments` 실 데이터상 무접두 `admin`/`super_admin` 잔존 여부 (직접 SQL 금지)

### 테스트 계정 현황

`docs/local/TEST-ACCOUNTS.local.md` **존재 확인**(파일 존재 여부와 줄 수만 확인, 내용 미출력).
`platform:admin` / `platform:super_admin` 문자열은 검색되지 않았다 →
**플랫폼 관리자 역할 테스트 계정이 문서에 등록돼 있지 않다.**
이는 코드 결함이 아니라 **검증 기반 부족(P4)** 으로 별도 기록한다.

---

## 10. 후속 WO 분할안과 권장 순서

| 순서 | WO(안) | 범위 | 근거 |
|:--:|---|---|---|
| **1** | `WO-O4O-SERVICE-ADMIN-API-GUARD-EMERGENCY-V1` | `/api/v1/service-admin` mount 에 `authenticate`+`requireRole` 부착. 기존 역할 사용, 신규 체계 없음 | P0-1 |
| **2** | `WO-O4O-MEMBERSHIP-RESIDUAL-SUBTREE-GUARD-V1` | `membership-admin-guard.ts` 의 `MEMBERSHIP_ADMIN_SUBTREES` 에 `/audit-logs`, `/affiliations`, `/organizations`, `/license-verification` 추가. 선행 WO 가 남긴 목록을 그대로 소진 | P0-2·3·4, P1-1 |
| **3** | `WO-O4O-ADMIN-API-GUARD-COVERAGE-REGRESSION-TEST-V1` | "guard 없는 admin/operator mount 0건" 을 고정하는 정적 계약 테스트 추가 | 재발 방지 |
| **4** | `WO-O4O-ADMIN-PROTECTED-ROUTE-ROLE-SEMANTICS-V1` | `matchesRole` 의 `endsWith(':admin')` 광역 허용 축소 + `requiredPermissions` 실검사 도입 **또는** 선언 제거. 둘 중 하나를 택해 90건 선언의 의미를 확정 | P2-1, P2-2 |
| **5** | `WO-O4O-ADMIN-MENU-PERMISSION-DECLARE-V1` | 메뉴 48 leaf 의 역할 게이트 명시화. ALLOW-BY-DEFAULT 유지 여부 결정 | P2-3 |
| **6** | `WO-O4O-MEMBER-DETAIL-AUDIT-LOG-ROUTE-FIX-V1` | `/audit-logs/member/:id` dead call + `yaksa_member_audit_logs` 실재 여부 | P3-2, E-5 |
| **7** | `WO-O4O-ADMIN-API-PREFIX-RESIDUAL-SWEEP-V1` (기존 추적) | 이중 `/api` 접두 잔여 | P3-3 |
| **8** | `WO-O4O-ROLE-ORDER-DETERMINISM-V1` | `getActiveRoles` 정렬 부여, `publicData.role` 결정성 확보 | P3-1 |
| **9** | `WO-O4O-ADMIN-TEST-ACCOUNT-MATRIX-V1` | 역할별 관리자 테스트 계정 정비(문서만), 이후 회원 분류 생애주기 프로덕션 검증 | P4, 미검증 1·2 |
| 10 | 문서 정정 | `RBAC-ROLE-CATALOG-V1.md` 를 platform 접두 전용 정책에 맞춰 갱신 | P4-3 |

**원칙:** 1~3 은 백엔드 보안 경계이므로 **다른 모든 항목보다 선행**한다.
4~5 는 공용 프런트 구조이므로 한 번에 바꾸되, 소비처가 admin-dashboard 외에도 존재할 수 있으므로
`docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md` 절차를 따른다.
**인증 체계 전면 교체나 신규 permission 체계 도입은 이 목록에 넣지 않는다** — 별도 구조 변경안이다.

---

## 11. 감사 수행 안전성

| 항목 | 결과 |
|---|---|
| 운영 DB write | **0건** (직접 SQL 0회) |
| 소스 코드 변경 | **0건** |
| 배포 | **0건** |
| HTTP 쓰기 요청 (POST/PUT/PATCH/DELETE) | **0건** |
| 응답 본문 열람 | **0건** (상태 코드만) |
| 계정 생성·역할 변경·permission 변경 | **0건** |
| 인증정보 출력·기록 | **0건** |
| 다른 세션 작업물 접촉 | **0건** (`apps/api-server/src/scripts/easy-drug-ko-rebuild-pilot/` untracked — 미접촉) |
| Cloud SQL Proxy | 이 세션에서 기동·종료 **0건** |

---

*Generated by WO-O4O-ADMIN-AUTHORIZATION-ROLE-ROUTE-API-CONSISTENCY-AUDIT-V1 (read-only)*
