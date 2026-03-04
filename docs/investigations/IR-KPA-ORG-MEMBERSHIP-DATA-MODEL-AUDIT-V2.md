# IR-KPA-ORG-MEMBERSHIP-DATA-MODEL-AUDIT-V2

> **KPA 지부/분회/회원 데이터 모델·가드·라우팅 전면 재감사**
> 작성일: 2026-03-04
> 상태: READ-ONLY 조사 완료
> 전제: "현재 구조가 잘못되어 있을 수 있다" — 기존 IR 결론을 그대로 신뢰하지 않음

---

## Phase 0. KPA-a/b/c 스코프 재정의

### 기존 라벨 vs 실제

| 기존 라벨 | 실제 의미 | 주요 화면 | 주요 API | 가드 | 핵심 엔티티 |
|-----------|-----------|-----------|----------|------|------------|
| **KPA-a** (커뮤니티) | 포럼·콘텐츠·LMS·공동구매 | 포럼, 뉴스, LMS 과정, 공동구매 카탈로그 | `/forum/*`, `/news/*`, `/lms/*`, `/groupbuy/*` | `optionalAuth` / `requireKpaScope('kpa:operator')` | forum_posts, kpa_news, lms_courses |
| **KPA-b** (분회 서비스) | 분회 운영: 회원·임원·뉴스·공동구매 현황 | Branch Admin/Operator Dashboard | `/branches/:branchId/*`, `/branch-admin/*` | `BranchAdminAuthGuard`, `BranchOperatorAuthGuard`, `verifyBranchAdmin()` | kpa_members, kpa_branch_officers, kpa_branch_settings |
| **KPA-c** | **매장이 아님.** 지부/본부 관리자 티어 (조직·회원 전체 관리) | Admin Dashboard, Operator Dashboard | `/admin/*`, `/operator/*`, `/organizations/*`, `/members/*` | `requireKpaScope('kpa:admin')`, `RoleGuard(PLATFORM_ROLES)` | kpa_organizations, kpa_members, kpa_stewards |

### 핵심 발견: "KPA-c = Store"는 잘못된 라벨

이전 IR에서 KPA-c를 "Store Operations"로 분류했으나 이는 **오류**.
- KPA-c는 지부/본부 관리 계층 (조직 구조 CRUD, 전체 회원 관리, 감사 로그)
- 매장(Store) 기능은 KPA 라우트 네임스페이스에 **오염으로 섞여 들어온 것** (Phase 4에서 상세)

---

## Phase 1. DB 실체 조사

### 1.1 핵심 테이블 구조

#### 분회(Branch) 구현

**별도 테이블이 아님.** `kpa_organizations.type` 값으로 구분:

```
kpa_organizations
├── type = 'association' → 지부 (예: 서울특별시약사회)
├── type = 'branch'      → 분회 (예: 강남분회)
└── type = 'group'       → 기타 그룹
```

**계층 구조:** `parent_id` FK로 연결

```
지부 (association)
  └── parent_id = NULL (또는 상위 조직)
        ↓
분회 (branch)
  └── parent_id → 지부.id
```

#### 회원(Member) 소속

```sql
kpa_members
  id              UUID PRIMARY KEY
  user_id         UUID NOT NULL  → users.id
  organization_id UUID NOT NULL  → kpa_organizations.id (type='branch')
  role            VARCHAR(50)    → 'member' | 'operator' | 'admin'
  status          VARCHAR(50)    → 'pending' | 'active' | 'suspended' | 'withdrawn'
  membership_type VARCHAR(50)    → (약사/학생 등)
  activity_type   VARCHAR(50)
  fee_category    VARCHAR(50)
  license_number  VARCHAR(100)
```

**FK 경로 (district_id 중복 없음):**

```
member.organization_id → branch.id → branch.parent_id → district.id
```

- ✅ 회원 레코드는 반드시 `organization_id`(분회 FK) 보유
- ✅ 회원에 `district_id` 직접 참조 없음 (중복/불일치 위험 제거)
- ✅ 분회 이동 시 `organization_id`만 변경하면 됨

### 1.2 관련 테이블 전체 목록

| 테이블 | 용도 | 핵심 FK |
|--------|------|---------|
| `kpa_organizations` | 조직 계층 (지부/분회/그룹) | `parent_id` → self |
| `kpa_members` | KPA 회원 (1 user → 1 org) | `user_id`, `organization_id` |
| `kpa_member_services` | 서비스별 가입 상태 (kpa-a/b/c) | `member_id` → kpa_members |
| `kpa_branch_settings` | 분회 설정 (회비/기한) | `organization_id` (UNIQUE) |
| `kpa_branch_officers` | 분회 임원 | `organization_id`, `member_id` |
| `kpa_branch_news` | 분회 공지 | `organization_id` |
| `kpa_branch_docs` | 분회 자료 | `organization_id` |
| `kpa_stewards` | 운영 위임 (스코프: org/forum/education) | `organization_id`, `member_id` |
| `kpa_pharmacist_profiles` | 약사 자격 (user 1:1, 조직 무관) | `user_id` (UNIQUE) |
| `kpa_approval_requests` | 통합 승인 요청 | `organization_id`, `requester_id` |
| `organization_members` | **범용 조직 멤버십 (organization-core)** | `organizationId`, `userId` |

### 1.3 `organization_members` vs `kpa_members`

| 항목 | `organization_members` | `kpa_members` |
|------|----------------------|---------------|
| 소속 | organization-core (FROZEN) | KPA 도메인 |
| 용도 | 매장 소유권 (`role='owner'`) | KPA 분회 회원 |
| KPA에서의 역할 | Store Owner 판별용 | 회원 관리의 SSOT |
| 가드 사용 | `requireStoreOwner` | `requireOrgRole`, `verifyBranchAdmin` |

**결론:** 두 테이블은 서로 다른 도메인 — 혼용되면 안 됨.

### 1.4 ERD 요약 (3줄)

```
users ─(1:1)─ kpa_pharmacist_profiles     (자격)
users ─(1:1)─ kpa_members ─(N:1)─ kpa_organizations(branch) ─(N:1)─ kpa_organizations(district)
users ─(1:N)─ organization_members ─(N:1)─ organizations     (매장 소유)
```

---

## Phase 2. 이중 권한 구조 재검증

### 2.1 3개 레이어 확정

| 레이어 | 저장소 | JWT 포함 | DB 쿼리 | 용도 |
|--------|--------|:--------:|:-------:|------|
| **Platform Role** | `role_assignments` | ✅ `user.roles[]` | ❌ | 서비스 접근 제어 (kpa:admin, kpa:operator 등) |
| **Membership Role** | `kpa_members.role` | ❌ | ✅ 실시간 | 분회 내 조직 역할 (admin/operator/member) |
| **Store Ownership** | `organization_members.role` | ❌ | ✅ 실시간 | 매장 소유 판별 (informational) |

### 2.2 권한 판단 흐름

```
요청 → requireAuth(JWT 검증)
        ↓
     requireKpaScope(최소역할)
        │
        ├─ user.roles[] 에 allowedRoles 있음? → PASS
        │     ↓
        │  requireOrgRole(최소멤버십역할) [선택적]
        │     │
        │     ├─ user.roles[] 에 bypass 있음? (kpa:admin, kpa:district_admin) → BYPASS
        │     │
        │     └─ kpa_members.role >= 최소레벨? → PASS / DENY(403)
        │
        └─ user.roles[] 에 없음 → DENY(403, 여기서 중단)
```

### 2.3 우선순위 규칙

**Platform Role이 항상 먼저 검사됨.** Membership Role은 Platform Role 통과 후에만 검사.

| Platform Role | Membership Role 검사 | 결과 |
|---------------|:-------------------:|------|
| `kpa:admin` | bypass (검사 안 함) | 모든 분회 접근 가능 |
| `kpa:district_admin` | bypass | 모든 분회 접근 가능 |
| `kpa:operator` | **검사함** (bypass 아님) | 분회별 멤버십 필요 |
| `kpa:branch_admin` | **검사함** | 분회별 멤버십 필요 |
| `kpa:pharmacist` | **서비스 스코프 불통과** | 403 (Membership 미검사) |

### 2.4 시나리오 검증

| 시나리오 | Platform Role Guard | Membership Role Guard | 결과 |
|----------|:-------------------:|:---------------------:|:----:|
| kpa:admin → `/operator/members` | ✅ PASS | bypass | ✅ 접근 |
| Branch admin (kpa_members.role='admin') → `/branch-admin/dashboard` | ❌ `kpa:pharmacist`만 있으면 FAIL | 미검사 | ❌ 403 |
| kpa:operator → `/branch-admin/members` | ✅ PASS (allowedRoles에 포함) | ❌ bypass 아님 + 멤버십 없음 | ❌ 403 |
| 일반 약사 → `/pharmacy/store` | ✅ requireAuth만 | 없음 | ✅ 접근 |

**핵심 발견:** `kpa:operator`는 서비스 스코프를 통과하지만, 분회 레벨 가드는 bypass 하지 **않음**. `kpa:admin`과 `kpa:district_admin`만 bypass.

---

## Phase 3. UI/API 가드 정합성 전수 조사

### 3.1 CRITICAL 불일치 (🔴)

| # | 위치 | 메뉴 | Frontend Guard | API 엔드포인트 | Server Guard | 문제 |
|---|------|------|---------------|---------------|-------------|------|
| 1 | `/operator/audit-logs` | 감사 로그 | `PLATFORM_ROLES` (admin+operator) | `GET /operator/audit-logs` | `requireKpaScope('kpa:admin')` | Operator가 메뉴 접근 가능하나 API 403 |
| 2 | `/operator/operators` | 운영자 관리 | `RoleGuard(KPA_ADMIN)` | `GET /admin/users` | 인증만 (KPA 스코프 없음) | **글로벌 Admin API**를 KPA에서 호출 — 권한 상승 위험 |
| 3 | Branch `/operator/operators` | 운영자 관리 | `BranchOperatorAuthGuard` | `GET /admin/users` | 인증만 (분회 필터 없음) | 전체 사용자 반환 → 클라이언트 필터링만 |
| 4 | `/operator` (index) | 대시보드 | `PLATFORM_ROLES` | `GET /operator/summary` | `requireKpaScope('kpa:operator')` | Frontend가 더 넓은 역할 허용 |

### 3.2 BOUNDARY 우려 (⚠️)

| # | 위치 | 문제 |
|---|------|------|
| 5 | Branch Operator → news/forum/docs | Frontend는 branchId 스코프, API는 글로벌 `requireKpaScope('kpa:operator')` — 서버에서 분회 필터 없음 |
| 6 | Branch Operator → signage/content | API에 `requireKpaScope` 없이 `authenticate`만 — 크로스 테넌트 누출 가능 |
| 7 | Admin → members | `AdminAuthGuard`(kpa:admin OR membershipRole=admin) vs API `requireKpaScope('kpa:admin')` — membershipRole=admin인 분회 관리자가 접근 시 API에서 membership role 무시 가능 |

### 3.3 정상 (✅)

| 위치 | 항목 |
|------|------|
| Admin Dashboard 전체 (9개 메뉴) | kpa:admin guard 일관 |
| Branch Admin (4개 메뉴) | verifyBranchAdmin() 일관 |
| Operator → news, docs, forum, pharmacy-requests, product-applications | kpa:operator guard 일치 |

---

## Phase 4. "KPA-b/c는 매장과 무관" — 범위 오염 점검

### 4.1 오염 규모

| 분류 | Backend 파일/엔드포인트 | Frontend 페이지 |
|------|:---------------------:|:--------------:|
| **CONTAMINATION** (매장 기능 오염) | 13개 엔드포인트 그룹 | 40+ 페이지 (`/store/*`) |
| **MIXED** (판단 필요) | 3개 | 3개 |
| **ALLOWED** (정상 KPA) | 나머지 전부 | 나머지 전부 |

### 4.2 오염 목록 (Backend — `/api/v1/kpa/*` 아래)

| 경로 | 기능 | 분류 | 이유 |
|------|------|:----:|------|
| `/pharmacy/store` | 매장 설정 (GET/PUT) | 🔴 오염 | 매장 설정 관리. `/api/v1/store`에 있어야 함 |
| `/pharmacy/products` | 상품 리스팅 CRUD | 🔴 오염 | 커머스 상품 관리. ecommerce-core 영역 |
| `/store-hub` | 매장 KPI 집계 | ⚠️ 혼합 | 읽기 전용 집계. 오염이지만 위험 낮음 |
| `/store-hub/channel-products` | 채널 상품 관리 | 🔴 오염 | 매장 채널 운영 |
| `/store-assets` | 자산 발행/해제 | 🔴 오염 | 매장 자산 수명주기 |
| `/store-contents` | 매장 콘텐츠 오버라이드 | 🔴 오염 | 매장 콘텐츠 커스터마이징 |
| `/store-playlists` | 사이니지 재생목록 CRUD | ⚠️ 혼합 | 사이니지 인프라이나 KPA에 마운트됨 |
| `/pharmacy/library` | 매장 자료실 CRUD | 🔴 오염 | 매장 마케팅 자료 |
| `/pharmacy/events` | 매장 이벤트 CRUD | 🔴 오염 | 매장 프로모션 이벤트 |
| `/pharmacy/qr` | QR 코드 관리 | 🔴 오염 | 매장 운영 도구 |
| `/pharmacy/pop` | POP PDF 생성 | 🔴 오염 | 매장 마케팅 도구 |
| `/stores/:slug/tablet` | 태블릿 채널 | 🔴 오염 | GlycoPharm 레거시 채널 |
| `/stores/:slug/blog` | 블로그 채널 | 🔴 오염 | 매장 콘텐츠 |
| `/stores/:slug/template` | 매장 템플릿 | 🔴 오염 | 매장 스토어프론트 설정 |

### 4.3 오염 원인 분석

1. **조직 모델 재사용:** `organization_members`가 KPA 회원 + 매장 소유 양쪽에 사용됨
2. **별도 Store API 부재:** `/api/v1/store` 도메인 라우터가 없어 모든 매장 기능이 `/api/v1/kpa`에 마운트
3. **프론트엔드 앱 통합:** `web-kpa-society`가 KPA + Store 페이지를 모두 포함
4. **미들웨어 혼합:** `createRequireStoreOwner`가 KPA 역할과 매장 소유권을 동시에 검사

### 4.4 오염 가드 패턴

```typescript
// createRequireStoreOwner — 두 가지 인가 패턴 혼합
// Path 1: KPA 역할 (kpa:admin/operator/branch_admin/branch_operator)
if (hasAnyServiceRole(userRoles, KPA_STORE_ACCESS_ROLES)) {
  const orgId = await getKpaOrganizationId(dataSource, user.id);
  // → KPA 운영자가 임의 조직의 매장 관리 가능
}
// Path 2: organization_members 소유권
const { isOwner, organizationId } = await isStoreOwner(dataSource, user.id);
```

**문제:** KPA operator가 매장 소유자가 아닌데도 모든 매장 기능에 접근 가능.

---

## Phase 5. 결론

### 5.1 현재 모델 판정

| 질문 | 답변 |
|------|------|
| **분회(branch)는 DB에서 정확히 무엇인가?** | `kpa_organizations` 테이블의 `type='branch'` 행. `parent_id`로 지부에 연결. 별도 테이블 없음. |
| **회원은 분회에 어떻게 소속되는가?** | `kpa_members.organization_id` FK → `kpa_organizations(type='branch')`. 필수 FK. 이동 시 이 값만 변경. |
| **지부는 회원을 직접 관리하지 않는 구조가 보장되는가?** | ✅ 부분 보장. member에 district_id 없음(좋음). 단, `kpa:admin`/`kpa:district_admin`이 모든 분회 bypass 가능(의도된 설계). |
| **"회원=분회 소속"이 구조적으로 성립하는가?** | **YES** — FK 경로 정상, district_id 중복 없음. |
| **KPA-b와 KPA-c의 경계는 무엇인가?** | KPA-b = 분회 운영 (회원·임원·콘텐츠), KPA-c = 플랫폼 관리 (조직 구조·전체 회원·감사). **매장은 양쪽 모두에 해당하지 않음.** |
| **매장 기능이 섞인 오염이 있는가?** | **YES — SEVERE.** 13개 API 엔드포인트 그룹 + 40+ 프론트엔드 페이지가 KPA 네임스페이스에 오염됨. |
| **UI와 API 가드가 전면적으로 일치하는가?** | **NO.** 4건 CRITICAL 불일치 + 3건 BOUNDARY 우려 발견. |

### 5.2 문제 리스트

| # | Severity | 분류 | 문제 | 영향 | 근거 |
|---|:--------:|------|------|------|------|
| P0-1 | **P0** | 가드 오류 | `/operator/operators` → 글로벌 `/admin/users` API 호출 (KPA 스코프 없음) | 권한 상승 위험 | OperatorManagementPage.tsx → `/admin/users` |
| P0-2 | **P0** | 가드 오류 | Branch Operator `/operators` → 전체 사용자 반환 (서버 분회 필터 없음) | 데이터 누출 | BranchOperatorRoutes → `/admin/users` (client-side filter only) |
| P1-1 | **P1** | UI/API 불일치 | `/operator/audit-logs` — UI는 operator 허용, API는 admin 전용 | Operator 403 경험 | OperatorRoutes.tsx vs kpa.routes.ts:2282 |
| P1-2 | **P1** | 범위 오염 | 13개 매장 API 엔드포인트가 `/api/v1/kpa/*`에 마운트 | 도메인 경계 위반 | Phase 4 오염 목록 |
| P1-3 | **P1** | 범위 오염 | `createRequireStoreOwner`가 KPA 역할 + 매장 소유권 혼합 | KPA operator가 비소유 매장 접근 가능 | store-owner.utils.ts |
| P1-4 | **P1** | 가드 불일치 | Branch Operator → news/forum/docs — 서버에 분회 필터 없음 | 크로스 분회 콘텐츠 접근 가능 | kpa.routes.ts (operator scope guard only) |
| P2-1 | **P2** | 범위 오염 | 40+ 프론트엔드 `/store/*` 페이지가 `web-kpa-society`에 포함 | 앱 경계 불명확 | services/web-kpa-society/src/routes/ |
| P2-2 | **P2** | 설계 | `AdminAuthGuard` dual check (platform role + membershipRole) | membershipRole 동기화 의존 | AdminAuthGuard.tsx:91 |
| P2-3 | **P2** | 설계 | Signage 엔드포인트에 KPA scope guard 없음 (`authenticate`만) | 크로스 테넌트 콘텐츠 누출 가능 | kpa.routes.ts signage routes |

### 5.3 후속 WO 제안

| WO | 우선순위 | 범위 | 수정 대상 |
|----|:--------:|------|-----------|
| **WO-KPA-OPERATOR-MGMT-GUARD-FIX-V1** | **P0** | `/operator/operators` + Branch `/operators` — KPA 스코프 전용 API 생성 또는 기존 API에 KPA 스코프 가드 추가 | `OperatorManagementPage.tsx`, `kpa.routes.ts`에 `/operators` 엔드포인트 신설, `/admin/users` 호출 제거 |
| **WO-KPA-AUDIT-LOG-GUARD-ALIGN-V1** | **P1** | `/operator/audit-logs` UI/API 가드 정렬 | `OperatorRoutes.tsx` (메뉴 숨김 또는 kpa:admin 전용 가드) 또는 `kpa.routes.ts` (operator 허용으로 완화) |
| **WO-KPA-BRANCH-BOUNDARY-ENFORCEMENT-V1** | **P1** | Branch Operator 콘텐츠 CRUD에 서버 분회 필터 추가 | `kpa.routes.ts` news/forum/docs 라우트에 `organization_id` 필터 추가 |
| **WO-KPA-STORE-SCOPE-SEPARATION-V1** | **P1** | KPA 네임스페이스에서 매장 API 분리 설계 | `/api/v1/store` 라우터 신설, 매장 컨트롤러 이관 계획 |
| **WO-KPA-STORE-OWNER-GUARD-SEPARATION-V1** | **P1** | `createRequireStoreOwner`에서 KPA 역할 분리 | `store-owner.utils.ts` 리팩토링 — KPA 역할은 매장 접근 불가 |
| **WO-KPA-FRONTEND-STORE-EXTRACTION-V1** | **P2** | `web-kpa-society` 내 `/store/*` 페이지 분리 | `web-store` 앱 또는 `@o4o/store-ui-core` 활용 |
| **WO-KPA-SIGNAGE-SCOPE-GUARD-V1** | **P2** | Signage 엔드포인트에 KPA scope guard 추가 | `kpa.routes.ts` signage routes |
| **WO-KPA-ADMIN-AUTH-GUARD-SIMPLIFICATION-V1** | **P2** | `AdminAuthGuard` dual check를 단일 소스로 정리 | `AdminAuthGuard.tsx` |

---

## 주요 파일 참조

### DB 엔티티
- `apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts` — KpaMember
- `apps/api-server/src/routes/kpa/entities/kpa-organization.entity.ts` — KpaOrganization
- `packages/organization-core/src/entities/OrganizationMember.ts` — OrganizationMember
- `apps/api-server/src/routes/kpa/entities/kpa-pharmacist-profile.entity.ts` — KpaPharmacistProfile

### 마이그레이션
- `apps/api-server/src/database/migrations/20260206190000-CreateKpaFoundationTables.ts`
- `apps/api-server/src/database/migrations/20260226200002-BackfillOrganizationMembersOwner.ts`

### 가드/미들웨어
- `packages/security-core/src/service-scope-guard.ts` — createServiceScopeGuard
- `packages/security-core/src/service-configs.ts` — KPA_SCOPE_CONFIG
- `apps/api-server/src/routes/kpa/middleware/kpa-org-role.middleware.ts` — requireOrgRole
- `apps/api-server/src/routes/kpa/middleware/branch-scope.middleware.ts` — createBranchScopeGuard
- `apps/api-server/src/utils/store-owner.utils.ts` — createRequireStoreOwner (오염 원인)

### 라우트
- `apps/api-server/src/routes/kpa/kpa.routes.ts` — KPA 전체 API 라우트
- `services/web-kpa-society/src/routes/OperatorRoutes.tsx` — Operator Dashboard
- `services/web-kpa-society/src/routes/AdminRoutes.tsx` — Admin Dashboard
- `services/web-kpa-society/src/routes/BranchAdminRoutes.tsx` — Branch Admin
- `services/web-kpa-society/src/routes/BranchOperatorRoutes.tsx` — Branch Operator

### 프론트엔드 가드
- `services/web-kpa-society/src/components/auth/RoleGuard.tsx`
- `services/web-kpa-society/src/components/admin/AdminAuthGuard.tsx`
- `services/web-kpa-society/src/components/branch-admin/BranchAdminAuthGuard.tsx`
- `services/web-kpa-society/src/components/branch-operator/BranchOperatorAuthGuard.tsx`
- `services/web-kpa-society/src/lib/role-constants.ts` — 역할 상수 SSOT

---

*IR-KPA-ORG-MEMBERSHIP-DATA-MODEL-AUDIT-V2 완료*
*조사자: Claude Code*
*일자: 2026-03-04*
