# IR-KPA-C-SERVICE-AUDIT-V1

> **KPA-c (분회 독립 서비스) 구조 정밀 감사**
> 작성일: 2026-03-04
> 상태: READ-ONLY 조사 완료
> 목적: KPA-c가 "분회 독립 서비스"로 구현되어 있는지, 아니면 KPA-b와 혼합 구조인지 판별

---

## 조사 배경

KPA 3-서비스 아키텍처 설계상 KPA-c는 "분회(branch) 독립 서비스"로 정의되었다.
ChatGPT 예측: "KPA-b와 혼합 구조일 가능성이 가장 높다."

이 조사는 실제 코드가 설계 의도와 일치하는지 검증한다.

조사 대상:
- `apps/api-server/src/routes/kpa/` (백엔드)
- `services/web-kpa-society/src/` (프론트엔드)
- `apps/api-server/src/types/roles.ts` (역할 정의)
- `apps/api-server/src/database/migrations/` (역할 마이그레이션)

---

## Phase 1. KPA-c 서비스 존재 확인

### 1.1 service_key 정의

`kpa_member_services` 테이블에 `service_key = 'kpa-c'`가 스키마상 정의되어 있다.

```
kpa_member_services
├── member_id     UUID FK → kpa_members
├── service_key   VARCHAR(50)  → 'kpa-a' | 'kpa-b' | 'kpa-c'
├── status        VARCHAR(50)  → pending | approved | rejected | suspended
└── UNIQUE(member_id, service_key)
```

소스: `apps/api-server/src/routes/kpa/entities/kpa-member-service.entity.ts`

### 1.2 실제 구현 상태: TYPE DEFINITION ONLY

| 항목 | 존재 여부 | 설명 |
|------|:---------:|------|
| `kpa-c` service_key (스키마) | O | `kpa_member_services.service_key` 주석에 명시 |
| `kpa-c` service_key (코드 플로우) | **X** | 어떤 코드도 `service_key='kpa-c'` 레코드를 INSERT/조회하지 않음 |
| `kpa-c:*` role 타입 정의 | O | `types/roles.ts`에 3개 정의 (admin, operator, pharmacist) |
| `kpa-c:*` role 실제 사용 | **X → 삭제됨** | `RemoveKpaCRolesFromUsers` 마이그레이션으로 제거 |
| 독립 라우트 파일 | **X** | `kpa-c.routes.ts` 미존재 |
| 독립 컨트롤러 디렉토리 | **X** | `controllers/kpa-c/` 미존재 |

**판정: KPA-c는 독립 서비스가 아니라, KPA 내의 "분회 기능 계층(tier)"이다.**

### 1.3 kpa-c:* 역할 상태

```typescript
// types/roles.ts (정의만 존재)
'kpa-c:admin'       // ROLE_REGISTRY에 정의
'kpa-c:operator'    // ROLE_REGISTRY에 정의
'kpa-c:pharmacist'  // ROLE_REGISTRY에 정의
```

**적극적 폐기(deprecated):**

```
20260222200000-RemoveKpaCRolesFromUsers.ts
  → users.roles[]에서 kpa-c:operator, kpa-c:branch_admin, kpa-c:branch_operator 제거

20260222200000-kpa-org-role.middleware.ts
  → "User.roles[]의 kpa-c:* 의존 제거 — KpaMember.role이 SSOT"
```

**현재 권한 경로:**
```
KpaMember.role (member | operator | admin)  ← SSOT
  ↓
kpa-org-role.middleware.ts (역할 계층: admin > operator > member)
  ↓
isBranchOperator / isBranchAdmin (guard functions)
```

`kpa-c:*` prefix 역할은 어디서도 참조하지 않는다. Dead code.

---

## Phase 2. 조직 구조 (Organization Hierarchy)

### 2.1 kpa_organizations 계층

```
association (지부, 예: 서울특별시약사회)
  └── parent_id = NULL
        ↓
branch (분회, 예: 종로구약사회)
  └── parent_id → association.id
        ↓
group (기타)
  └── parent_id → branch.id 또는 association.id
```

KPA-c의 "분회"는 `type = 'branch'`인 `kpa_organizations` 레코드이다.
별도 테이블이나 별도 엔티티가 없다.

### 2.2 분회 전용 엔티티 (4개)

KPA-c 기능을 위해 생성된 엔티티:

| 엔티티 | 테이블 | WO |
|--------|--------|-----|
| `KpaBranchSettings` | `kpa_branch_settings` | WO-KPA-C-BRANCH-ADMIN-IMPLEMENTATION-V1 |
| `KpaBranchOfficer` | `kpa_branch_officers` | WO-KPA-C-BRANCH-ADMIN-IMPLEMENTATION-V1 |
| `KpaBranchNews` | `kpa_branch_news` | WO-KPA-C-BRANCH-ADMIN-IMPLEMENTATION-V1 |
| `KpaBranchDoc` | `kpa_branch_docs` | WO-KPA-C-BRANCH-ADMIN-IMPLEMENTATION-V1 |

모두 `routes/kpa/entities/`에 위치 (별도 디렉토리 없음).

### 2.3 분회 전용 컨트롤러 (1개)

| 컨트롤러 | 위치 |
|----------|------|
| `branch-admin-dashboard.controller.ts` | `routes/kpa/controllers/` |

분회 관련 기능 (News CRUD, Doc CRUD, Officer 관리, Settings)이 **단일 컨트롤러**에 통합되어 있다.

---

## Phase 3. Role / Permission 구조

### 3.1 역할 판별 경로

```
프론트엔드 라우트 진입
  ↓
BranchContext.tsx — branchId + kpaMembership 확인
  ↓
API 요청
  ↓
kpa-org-role.middleware.ts
  ├── kpa:admin bypass (kpa_members.role = 'admin')
  └── branchId 파라미터 + kpa_members.role 확인
        ↓
      admin > operator > member (계층 비교)
```

### 3.2 KPA-a vs KPA-c 역할 분리

| 구분 | KPA-a (본회) | KPA-c (분회) |
|------|:--------:|:--------:|
| 프론트엔드 라우트 | AdminRoutes / OperatorRoutes | BranchAdminRoutes / BranchOperatorRoutes |
| App.tsx 주석 | SVC-A | SVC-C |
| 접근 게이트 | ServiceContext `KPA_A` | ServiceContext `KPA_C` |
| 역할 판별 | `kpa_members.role` | `kpa_members.role` (동일 SSOT) |
| 조직 스코프 | 전체 본회 | `branchId` (특정 분회) |

**핵심 차이: URL 스코프**
```
KPA-a: /admin/*  /operator/*
KPA-c: /branch-services/:branchId/admin/*  /branch-services/:branchId/operator/*
```

### 3.3 ServiceContext 자동 판별

```typescript
// ServiceContext.tsx (line 38)
// - /branch-services/* → KPA_C (SVC-C: 분회 서비스)
```

`ServiceContext`가 URL prefix 기반으로 현재 서비스 계층을 자동 판별한다.

---

## Phase 4. Store HUB 연결

### 4.1 Store와 KPA-c 관계

| 항목 | 연결 여부 | 설명 |
|------|:---------:|------|
| BranchAdminRoutes에 store import | **X** | 분회 관리에 store 경로 없음 |
| BranchOperatorRoutes에 store import | **X** | 분회 운영에 store 경로 없음 |
| Store HUB → KPA-c 참조 | **X** | PharmacyGuard는 약국 소유자용, 분회 무관 |

**판정: Store HUB는 KPA-c와 완전히 독립이다.**

Store HUB는 약국 소유자(pharmacy_owner)를 위한 기능이며, 분회(branch) 관리와는 무관하다.
PharmacyGuard(isStoreOwner)는 `organization_members` 기반이지, `kpa_organizations.type='branch'`와는 관계없다.

---

## Phase 5. 공동구매 (Groupbuy) 구조

### 5.1 구조

공동구매는 전용 테이블 없이 기존 인프라를 재사용:

```
organization_product_listings (service_key = 'kpa-groupbuy')
  ↓
ecommerce_orders (metadata.serviceKey = 'kpa-groupbuy')
  ↓
OrderItem → ProductVariant → ProductListing
```

### 5.2 접근 권한

```
공동구매 관리: kpa:operator scope (본회 운영자)
공동구매 참여: KPA 회원 + 약국 소유자
```

공동구매는 **KPA-a/KPA-b 레벨** 기능이다. KPA-c(분회) 전용 공동구매는 없다.

### 5.3 특성

- **수량 집계 전용**: 총 주문 수량만 집계, 금전 거래(monetary aggregation) 없음
- **캠페인 기반**: `store-events` + `product-marketing` 컨트롤러 연동
- **결제 없음**: 수량 확정 → 오프라인 거래

---

## Phase 6. UI / 프론트엔드 구조

### 6.1 KPA-c 프론트엔드 라우트

```tsx
// App.tsx
{/* SVC-C: 분회 Admin 대시보드 (WO-KPA-C-BRANCH-ADMIN-IMPLEMENTATION-V1) */}
<Route path="/branch-services/:branchId/admin/*" element={<BranchAdminRoutes />} />
{/* SVC-C: 분회 Operator 대시보드 (WO-KPA-C-BRANCH-OPERATOR-IMPLEMENTATION-V1) */}
<Route path="/branch-services/:branchId/operator/*" element={<BranchOperatorRoutes />} />
```

### 6.2 SVC-C 전용 컴포넌트

| 파일 | 역할 |
|------|------|
| `BranchAdminRoutes.tsx` | 분회 관리자 대시보드 라우트 |
| `BranchOperatorRoutes.tsx` | 분회 운영자 대시보드 라우트 |
| `BranchRoutes.tsx` | 분회 서비스 공통 라우트 |
| `BranchHeader.tsx` | 분회 서비스 전용 헤더 |
| `BranchContext.tsx` | 분회 서비스 전용 컨텍스트 |
| `BranchServicesPage.tsx` | Branch Service Hub |
| `BranchDashboardPage.tsx` | 분회 서비스 홈 |

### 6.3 KPA 3-Layout 체계

| Layout | 서비스 계층 | 용도 |
|--------|-----------|------|
| `AdminLayout` | KPA-a/b | 본회 관리/운영 |
| `IntranetLayout` | KPA-c | 분회 관리/운영 |
| `DemoLayout` | KPA demo | 데모 (제거 예정) |

---

## Phase 7. Cross-Service Contamination 분석

### 7.1 KPA-c → 다른 서비스 오염

| 대상 | 오염 여부 | 설명 |
|------|:---------:|------|
| GlycoPharm | **X** | cross-import 없음 |
| Cosmetics | **X** | cross-import 없음 |
| Platform | **X** | cross-import 없음 |
| Store HUB | **X** | Store 관련 import 없음 |

### 7.2 KPA-a → KPA-c 오염

| 항목 | 상태 |
|------|------|
| 엔티티 공유 | O (kpa_members, kpa_organizations — 의도적 공유) |
| 컨트롤러 혼합 | **X** (branch-admin-dashboard만 KPA-c 전용) |
| 미들웨어 공유 | O (kpa-org-role.middleware — 의도적 공유) |
| 라우트 혼합 | **X** (App.tsx에서 SVC-A/SVC-C 명확히 구분) |

### 7.3 테스트 커버리지

KPA-c 경계를 보호하는 regression 테스트 존재:

```
kpa-role-guard.spec.ts          — isBranchOperator role matrix (KPA-c)
kpa-boundary-regression.spec.ts — Hard Delete Prevention, is_deleted Filter, Organization Isolation
kpa-branch-cms-runtime.spec.ts  — Branch CMS Runtime Regression Test
```

특히 `kpa-role-guard.spec.ts`에 **cross-service import isolation** 테스트 포함:
> "KPA-c (branch-admin-dashboard) must NOT import CmsContent"

---

## 구조 판정

### 예측 vs 실제

| 예측 | 판정 |
|------|------|
| 1: 완전 독립 서비스 | **X** |
| **2: KPA-b와 혼합 구조** | **PARTIAL** |
| 3: 미구현 | **X** |

### 최종 판정: **PARTIAL — 기능적 분리, 인프라적 통합**

```
┌─────────────────────────────────────────┐
│              web-kpa-society             │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │  SVC-A   │  │  SVC-C   │  │ Store  │ │
│  │ Admin    │  │ Branch   │  │  HUB   │ │
│  │ Operator │  │ Admin    │  │ (약국) │ │
│  │          │  │ Operator │  │        │ │
│  └──────────┘  └──────────┘  └────────┘ │
│       │              │            │      │
│       └──────────────┴────────────┘      │
│              공유 인프라                    │
│  kpa_members | kpa_organizations          │
│  kpa-org-role.middleware                  │
│  ServiceContext                           │
└─────────────────────────────────────────┘
```

### 상세 평가

| 항목 | 분리 수준 | 판정 |
|------|----------|------|
| 프론트엔드 라우트 | **완전 분리** (SVC-A ↔ SVC-C 명시적 구분) | SAFE |
| UI Layout | **완전 분리** (AdminLayout ↔ IntranetLayout) | SAFE |
| URL 스코프 | **완전 분리** (/admin/* ↔ /branch-services/:branchId/*) | SAFE |
| 백엔드 컨트롤러 | **분리** (branch-admin-dashboard = KPA-c 전용) | SAFE |
| 엔티티 | **공유** (kpa_members, kpa_organizations) | 의도적 |
| 미들웨어 | **공유** (kpa-org-role.middleware) | 의도적 |
| 역할 SSOT | **통합** (KpaMember.role — a/c 공용) | 의도적 |
| service_key | **미사용** (kpa-c 레코드 생성 코드 없음) | DEAD |
| kpa-c:* roles | **폐기** (마이그레이션으로 제거) | DEAD |
| Cross-contamination | **없음** | SAFE |
| Store HUB 연결 | **없음** (독립) | SAFE |

---

## 발견 사항 요약

### C-1: kpa-c service_key DEAD CODE

- `kpa_member_services.service_key = 'kpa-c'`는 스키마에만 존재
- 어떤 코드 플로우도 이 값을 생성/조회하지 않음
- **영향:** 없음 (사용하지 않음). 정리 시 types/roles.ts에서 주석 제거 가능

### C-2: kpa-c:* roles DEPRECATED (이미 처리됨)

- `20260222200000-RemoveKpaCRolesFromUsers.ts`로 DB에서 제거됨
- `kpa-org-role.middleware.ts`가 KpaMember.role SSOT로 전환됨
- `types/roles.ts`의 ROLE_REGISTRY 정의는 잔존 (dead definition)
- **영향:** 없음. ROLE_REGISTRY 정리는 별도 WO 가능

### C-3: 프론트엔드 SVC-C 구분 양호

- `App.tsx`에 `SVC-C` 주석으로 명확히 구분
- `ServiceContext`가 URL prefix 기반 자동 판별
- `BranchContext`가 분회 전용 컨텍스트 제공
- **영향:** 없음. 현재 구조 유지 권장

### C-4: 분회 전용 엔티티 4개는 KPA-c 경계 내에 올바르게 위치

- `kpa_branch_settings`, `kpa_branch_officers`, `kpa_branch_news`, `kpa_branch_docs`
- 모두 `routes/kpa/entities/`에 있으나, KPA-c 전용이므로 분리 불필요
- **영향:** 없음. 현재 구조 유지

### C-5: Store HUB는 KPA-c와 완전 독립

- BranchAdminRoutes, BranchOperatorRoutes에 store import 0건
- 약국 관리(Store)와 분회 관리(Branch)는 별개 도메인
- **영향:** 없음. 향후 혼합 방지를 위한 경계 테스트 존재

---

## 결론

**ChatGPT 예측 "KPA-b와 혼합 구조"는 반만 맞다.**

정확한 현실:

1. **KPA-c는 독립 서비스가 아니다** — 별도 routes 파일, service_key 코드 플로우, kpa-c:* 역할 모두 없거나 폐기됨
2. **KPA-c는 KPA의 "분회 기능 계층"이다** — 프론트엔드(SVC-C), URL(/branch-services/*), Layout(IntranetLayout), Context(BranchContext)로 명확히 구분됨
3. **인프라(엔티티, 미들웨어, 역할 SSOT)는 의도적으로 공유** — 이는 설계 결함이 아닌 의도적 선택
4. **오염 없음** — cross-service 침투 0건, regression 테스트로 경계 보호

**구조 건전성: SAFE**

KPA-c를 독립 서비스로 분리할 필요 없다. 현재의 "기능 계층(tier)" 구조가 코드베이스 복잡도를 최소화하면서 충분한 관심사 분리를 달성하고 있다.

---

*IR-KPA-C-SERVICE-AUDIT-V1 조사 완료*
*다음 WO: 없음 (구조 건전. Dead code 정리는 선택적)*
