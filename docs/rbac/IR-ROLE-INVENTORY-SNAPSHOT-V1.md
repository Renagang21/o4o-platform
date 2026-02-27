# IR-ROLE-INVENTORY-SNAPSHOT-V1

> **목적**: WO-ROLE-PHILOSOPHY-STEPWISE-V1 Phase 0 산출물
> **기준일**: 2026-02-27
> **작성**: WO-ROLE-PHILOSOPHY-STEPWISE-V1 Phase 0 자동 코드 스캔
> **상태**: SNAPSHOT (변경 전 현황 기록)

---

## 0. 요약

현재 플랫폼에는 **3개의 병렬 Role 레이어**가 존재한다.

| 레이어 | 저장소 | 책임 | 현황 |
|--------|--------|------|------|
| **Platform Role** | `role_assignments` | 플랫폼 전체 권한 | ✅ Phase3-E 완료 (단일 소스) |
| **Organization Role** | `organization_members.role` | 조직 내 역할 | ✅ 별도 운영 중 |
| **Prefixed Service Role** | `role_assignments` (plan) | 서비스별 역할 | ⚠️ 코드에 정의되나 DB 미확정 |

**핵심 문제**: `operator`라는 단어가 7개의 다른 의미로 혼용됨 (§4 참조).

---

## 1. Platform Role (role_assignments SSOT)

### 1-1. BackfillMigration이 처리한 역할 값 (현 DB 실존 가능 목록)

```sql
-- 20260228000000-BackfillRoleAssignmentsFromLegacyRole.ts 기준
users.role IN ('admin','super_admin','operator','vendor','seller','supplier','partner','manager')
```

이 값들이 프로덕션 DB의 `role_assignments.role`에 존재할 수 있는 값이다.

### 1-2. `UserRole` enum (types/auth.ts:5)

```typescript
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN       = 'admin',
  VENDOR      = 'vendor',
  SELLER      = 'seller',
  USER        = 'user',        // (previously CUSTOMER)
  BUSINESS    = 'business',
  PARTNER     = 'partner',     // 제휴 마케팅, 커미션
  SUPPLIER    = 'supplier',    // 공급자: 상품 제공, 재고 관리
  MANAGER     = 'manager',     // Legacy
  CUSTOMER    = 'customer'     // Deprecated → USER
}
// ⚠️ OPERATOR 값 없음 — UserRole enum에 누락
```

### 1-3. `LegacyRole` type (types/roles.ts:105)

```typescript
export type LegacyRole =
  // Platform roles (legacy)
  | 'super_admin' | 'admin' | 'operator' | 'manager' | 'administrator'
  | 'vendor' | 'member' | 'contributor'
  // KPA roles (legacy)
  | 'district_admin' | 'branch_admin' | 'branch_operator' | 'pharmacist'
  // Commerce roles (legacy)
  | 'seller' | 'supplier' | 'partner' | 'business'
  // Base user roles (legacy)
  | 'user' | 'customer'
  // Service-specific (legacy)
  | 'pharmacy' | 'consumer';
```

### 1-4. Guard에서 실제로 체크하는 역할 목록

| Guard/미들웨어 | 체크하는 역할 | 파일 |
|----------------|--------------|------|
| `requireAdmin` | `['admin','super_admin','operator']` | `common/middleware/auth.middleware.ts:163-165` |
| `requireRole(['admin','super_admin'])` | `admin, super_admin` | `routes/v1/platformInquiry.routes.ts:33` |
| `requireRole(['admin','super_admin','operator','staff'])` | 알림 조회 | `routes/operator-notification.routes.ts:23` |
| `requireRole(['admin','super_admin','operator'])` | 알림 발송 | `routes/operator-notification.routes.ts:30` |
| `requireRole(['admin','staff'])` | SMTP | `routes/v1/smtp.routes.ts:13,31,37` |
| `requireRole(['partner','affiliate','seller','supplier'])` | 콘텐츠 자산 | `routes/content/content-assets.routes.ts:459` |
| `requireAnyRole([ADMIN,SUPER_ADMIN,MANAGER])` | 관리자 사용자/공급자 | `routes/admin/users.routes.ts:15-17` |
| `roles.some(r => ['admin','operator'].includes(r))` | 주문 관리 | `controllers/admin/adminOrderController.ts:22` |
| `roles.some(r => ['admin','operator'].includes(r))` | 체크아웃 | `controllers/checkout/checkoutController.ts:274,389` |
| `roles.some(r => ['admin','manager'].includes(r))` | 분류/포럼 | `controllers/cpt/TaxonomiesController.ts:358,430,491` |
| `roles.some(r => ['admin','manager','business'].includes(r))` | 폼/분류 쓰기 | `controllers/cpt/FormsController.ts:183` |
| `!['admin','manager'].includes(userRole)` | 포럼 게시물/댓글 삭제 | `controllers/forum/ForumController.ts:332,417,955,997` |
| `userRole !== 'admin' && userRole !== 'super_admin'` | 공급자 접근 | `controllers/entity/SupplierEntityController.ts:55,117,295,421,457,505` |

### 1-5. admin 라우트에서 허용하는 역할 전체 목록 (routes/admin/users.routes.ts:28-29,45-46)

```typescript
const ALL_ASSIGNABLE_ROLES = [
  'super_admin', 'admin', 'manager', 'moderator',
  'vendor', 'vendor_manager', 'seller', 'customer',
  'business', 'partner', 'supplier', 'affiliate', 'beta_user'
];
```

### 1-6. auth.controller.ts VALID_ROLES (modules/auth/controllers/auth.controller.ts:251)

```typescript
const VALID_ROLES = [
  'super_admin', 'admin', 'vendor', 'seller',
  'user', 'business', 'partner', 'supplier', 'manager', 'customer'
];
```

---

## 2. Prefixed Service Role (types/roles.ts — ROLE_REGISTRY)

서비스별 역할은 아직 완전히 DB에 정착되지 않은 상태. 타입만 정의됨.

### 2-1. Platform Prefixed Roles

```
platform:super_admin   최상위 권한, 서비스 간 접근
platform:admin         플랫폼 관리자
platform:operator      플랫폼 운영자
platform:manager       플랫폼 매니저
platform:vendor        플랫폼 벤더
platform:member        플랫폼 회원
platform:contributor   플랫폼 기여자
```

### 2-2. KPA Service Prefixed Roles

```
kpa:admin              KPA 서비스 관리자
kpa:operator           KPA 서비스 운영자
kpa:district_admin     지구 관리자
kpa:branch_admin       분회 관리자
kpa:branch_operator    분회 운영자
kpa:pharmacist         약사 (일반 회원)
```

### 2-3. Other Services

```
neture:admin / neture:supplier / neture:partner / neture:user
glycopharm:admin / glycopharm:operator / glycopharm:pharmacy / glycopharm:supplier / glycopharm:partner / glycopharm:consumer
cosmetics:admin / cosmetics:operator / cosmetics:supplier / cosmetics:seller / cosmetics:partner
glucoseview:admin / glucoseview:operator
```

---

## 3. Organization Role (organization_members.role)

### 3-1. KPA Member Role (routes/kpa/entities/kpa-member.entity.ts:18)

```typescript
export type KpaMemberRole = 'member' | 'operator' | 'admin';
```

- 저장소: `organization_members.role` (BusinessRole SSOT)
- 의미: KPA 조직 내 역할 (약사회 지부/분회 소속)
- Guard: `requireOrgRole(dataSource, 'operator')` (routes/kpa/middleware/kpa-org-role.middleware.ts)

### 3-2. KPA Join Request Roles

```typescript
export type RequestedRole = 'admin' | 'manager' | 'member' | 'moderator';
export type JoinRequestType = 'join' | 'promotion' | 'operator';
```

### 3-3. Cosmetics Store Member Role (routes/cosmetics/entities/cosmetics-store-member.entity.ts:27)

```typescript
export enum CosmeticsStoreMemberRole {
  MANAGER = 'manager',
  STAFF   = 'staff',
}
// + 'owner' (별도 체크)
```

---

## 4. "operator" 다중 의미 분석 (핵심 문제)

> 이 섹션이 WO-ROLE-PHILOSOPHY-STEPWISE-V1의 핵심 분석 대상이다.

| # | 문맥 | 값 | 의미 | 저장소 | 파일 예시 |
|---|------|----|------|--------|-----------|
| A | Platform Role | `'operator'` | 플랫폼 운영자 (=중간 관리자) | role_assignments | auth.middleware.ts:165 |
| B | KPA org role | `'operator'` | KPA 조직 내 운영 담당 | organization_members | kpa-member.entity.ts:18 |
| C | Signage extensionRole | `'operator'` | 사이니지 관리 권한 레벨 | req.extensionRole (런타임) | extension.guards.ts:176 |
| D | Content creator type | `'operator'` | 콘텐츠 생성자 분류 | hub_contents.metadata | hub-content.service.ts:37 |
| E | PharmacistRole | `'operator'` | 약사 프로필 내 역할 레벨 | kpa_pharmacist_profiles | scope-assignment.utils.ts:28 |
| F | ScopeLevel | `'operator'` | 서비스 접근 레벨 계층 | config 객체 (런타임) | service-scopes.ts:17 |
| G | Prefixed role | `kpa:operator` | KPA 서비스 운영자 (prefixed) | role_assignments (planned) | roles.ts:42 |
| H | Glycopharm legacyRoles | `'operator'` | 레거시 관리자 체크 | 코드 내 배열 리터럴 | glycopharm/controllers/*.ts |

**핵심 혼재**:
- A와 B가 같은 문자열 `'operator'`를 사용하지만 완전히 다른 테이블/의미
- G(`kpa:operator`)는 A+B를 대체할 prefixed 형태이나 미구현
- H는 레거시 체크 패턴으로 제거 예정

---

## 5. Admin Dashboard UI 역할 참조

### 5-1. AdminProtectedRoute requiredRoles 사용처

```typescript
// App.tsx:671 — 고급 관리자 라우트
requiredRoles={['admin', 'super_admin', 'platform_admin']}

// App.tsx:733 — 인프라/배포 라우트
requiredRoles={['admin', 'super_admin']}

// App.tsx:1692,1699 — 운영자 전용 라우트
requiredRoles={['admin', 'operator']}
```

### 5-2. Auth Settings UI 레이블 (pages/settings/AuthSettings.tsx:31)

```typescript
{ role: 'operator', label: '운영자', defaultPath: '/admin' }
```

### 5-3. rolePermissions.ts (config/rolePermissions.ts)

```typescript
roles: ['admin', 'super_admin', 'pharmacist']   // KPA 특정 기능
roles: ['super_admin', 'admin', 'manager']       // 일반 관리자 기능
```

### 5-4. OperatorsPage (pages/operators/OperatorsPage.tsx)

```typescript
// 운영자 페이지는 prefixed role 기반으로 표시
if (role.includes('operator')) return 'bg-blue-100 text-blue-800';
// 통계: admin vs operator 구분 표시
operators.filter(o => o.roles.some(r => r.includes('admin'))).length
operators.filter(o => o.roles.some(r => r.includes('operator') && !r.includes('admin'))).length
```

---

## 6. 역할 분류 정리 (현황)

### 6-1. requireAdmin 에서 실제 인정하는 역할

```typescript
// common/middleware/auth.middleware.ts (Phase3-E 기준)
roleAssignmentService.hasAnyRole(userId, ['admin', 'super_admin', 'operator'])
```

→ `operator`는 관리자 권한을 가진다.

### 6-2. 역할 계층 (비공식 현황)

```
super_admin > admin > operator > manager > [seller/vendor/supplier/partner] > user/customer
```

### 6-3. 비즈니스 역할 (organization_members)

```
owner > admin > operator > member
```

---

## 7. 레거시 체크 패턴 (제거 예정)

다음 파일들은 `legacyRoles` 배열을 로컬로 정의해서 체크한다. Phase3 이후 RA 직접 쿼리로 교체 대상.

```typescript
const legacyRoles = ['admin', 'operator', 'administrator', 'super_admin'];
```

해당 파일:
- `routes/cosmetics/cosmetics.routes.ts:56`
- `routes/glycopharm/controllers/admin.controller.ts:56`
- `routes/glycopharm/controllers/billing-preview.controller.ts:29`
- `routes/glycopharm/controllers/invoice-dispatch.controller.ts:31`
- `routes/glycopharm/controllers/invoice.controller.ts:32`
- `routes/glycopharm/controllers/operator.controller.ts:104`
- `routes/glycopharm/controllers/report.controller.ts:31`
- `routes/glucoseview/glucoseview.routes.ts:55`
- `routes/glucoseview/controllers/application.controller.ts:55`

---

## 8. 미해결 불일치 목록

| # | 불일치 | 위치 | 심각도 |
|---|--------|------|--------|
| 1 | `UserRole` enum에 `OPERATOR` 없음 | `types/auth.ts` | 중 |
| 2 | `operator`가 requireAdmin에 포함되나 일반 역할 할당 메커니즘 불명확 | `auth.middleware.ts:163-165` | 중 |
| 3 | `vendor_manager`, `beta_user`, `moderator`, `affiliate`가 assignable 목록에는 있으나 UserRole enum 미존재 | `routes/admin/users.routes.ts:28` | 중 |
| 4 | `superadmin` (typo)가 sites.routes.ts에 존재 | `modules/sites/sites.routes.ts:36` | 저 |
| 5 | KPA member `operator`와 platform `operator`의 의미가 혼용될 위험 | 전역 | 고 |
| 6 | prefixed role (`kpa:operator`)이 ROLE_REGISTRY에 정의되나 실제 DB에 있는지 미확인 | `types/roles.ts` | 중 |
| 7 | Glycopharm routes에 `administrator` (오타?) 가 legacyRoles에 포함 | glycopharm/controllers | 저 |

---

## 9. DB 현황 (Production — 직접 접근 불가)

프로덕션 DB는 방화벽으로 로컬 접근 차단. 실제 역할 분포는 배포 후 아래 SQL로 확인:

```sql
-- role_assignments 실존 역할 분포
SELECT role, COUNT(*)::int AS cnt, is_active
FROM role_assignments
GROUP BY role, is_active
ORDER BY cnt DESC;

-- prefixed role 존재 여부
SELECT COUNT(*) FROM role_assignments WHERE role LIKE '%:%';

-- operator 역할 소유자 수
SELECT COUNT(*) FROM role_assignments WHERE role = 'operator' AND is_active = true;
```

---

## 10. Phase 1 결정이 필요한 항목

다음 항목들에 대해 Phase 1에서 철학적 결정이 필요하다:

1. **`operator` 역할의 공식 의미**: 플랫폼 운영자인가, 서비스 운영자인가?
2. **prefixed vs unprefixed 공존 기간**: role_assignments에서 언제 prefixed만 허용할 것인가?
3. **`UserRole` enum 정리**: `OPERATOR`, `MODERATOR`, `AFFILIATE`, `VENDOR_MANAGER`, `BETA_USER` 추가 여부
4. **KPA `operator` (org role) vs platform `operator` 명칭 충돌 해소**: 분리할 것인가, 통합할 것인가?
5. **레거시 `legacyRoles` 배열 체크 패턴**: requireRole 미들웨어로 교체하는 표준 시점
6. **`administrator` (오타 또는 의도)**: `admin`의 별칭인가, 제거 대상인가?
7. **`vendor_manager`**: 별도 역할인가, `vendor`의 sub-role인가?

---

*Generated by WO-ROLE-PHILOSOPHY-STEPWISE-V1 Phase 0*
*Next: Phase 1 — Role Philosophy Document*
