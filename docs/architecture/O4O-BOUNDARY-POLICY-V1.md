# O4O Boundary Policy v1

> **Domain-Specific Hybrid Boundary Model — Official Policy Declaration**
> WO-O4O-BOUNDARY-POLICY-DECLARATION-V1
> 2026-02-24

---

## 1. Boundary Philosophy

O4O 플랫폼은 **단일 경계 모델을 사용하지 않는다.**

전통적 SaaS는 `tenantId` 하나로 모든 데이터를 격리한다.
O4O는 도메인마다 Primary Boundary가 다르다.
이것은 설계 결함이 아니라 **의도된 아키텍처**이다.

### 근거

- Broadcast Domain(CMS, Signage)은 **서비스 단위**로 콘텐츠를 관리한다
- Community Domain(Forum)은 **조직 유무**로 공개/비공개를 구분한다
- Commerce Domain(Order, Payment)은 **매장 단위**로 거래를 처리한다

하나의 경계 키로 이 세 가지를 동시에 표현할 수 없다.
따라서 도메인별로 가장 자연스러운 Primary Boundary를 선택한다.

---

## 2. Domain Boundary Matrix

### Domain Boundary Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     O4O Platform Boundary Model                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
│  │   BROADCAST DOMAIN      │  │   COMMUNITY DOMAIN          │  │
│  │   Primary: serviceKey   │  │   Primary: organizationId   │  │
│  │                         │  │                             │  │
│  │   ┌─────────┐           │  │   ┌─────────┐              │  │
│  │   │   CMS   │           │  │   │  Forum  │              │  │
│  │   └─────────┘           │  │   └─────────┘              │  │
│  │   ┌─────────┐           │  │   orgId IS NULL = 커뮤니티  │  │
│  │   │ Signage │           │  │   orgId = X    = 조직 전용  │  │
│  │   └─────────┘           │  │                             │  │
│  └────────────┬────────────┘  └─────────────────────────────┘  │
│               │                                                 │
│               ▼                                                 │
│  ┌─────────────────────────┐                                    │
│  │         HUB             │  ← Broadcast Domain만 소비        │
│  │   Content (public)      │  ← Forum/Store/Commerce 금지     │
│  │   Signage (global)      │                                    │
│  └─────────────────────────┘                                    │
│                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
│  │   STORE OPS DOMAIN      │  │   COMMERCE DOMAIN           │  │
│  │   Primary: orgId        │  │   Primary: storeId          │  │
│  │                         │  │   Secondary: sellerOrgId    │  │
│  │   ┌───────────────┐     │  │                             │  │
│  │   │ Local Product │     │  │   ┌─────────┐              │  │
│  │   │ Asset         │     │  │   │  Order  │              │  │
│  │   │ Tablet        │     │  │   └─────────┘              │  │
│  │   │ Store Hub KPI │     │  │   ┌─────────┐              │  │
│  │   └───────────────┘     │  │   │ Payment │              │  │
│  │                         │  │   └─────────┘              │  │
│  │   Commerce JOIN 금지    │  │   ┌──────────┐             │  │
│  └─────────────────────────┘  │   │ Checkout │             │  │
│                                │   └──────────┘             │  │
│                                └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Boundary Definition Table

| Domain | 대상 | Primary Boundary | Secondary Boundary | HUB 소비 |
|--------|------|:----------------:|:------------------:|:---------:|
| **Broadcast** | CMS, Signage | `serviceKey` | `scope`, `visibility`, `source` | YES |
| **Community** | Forum | `organizationId` | `scope` (community/organization/demo) | NO |
| **Store Ops** | LocalProduct, Asset, Tablet, Store Hub KPI | `organizationId` | — | NO |
| **Commerce** | Order, Payment, Checkout | `storeId` | `sellerOrganizationId` | NO |

---

## 3. HUB Domain Policy (FROZEN)

### HUB 소비 도메인

| Domain | 소비 여부 | 조건 |
|--------|:---------:|------|
| Content (CMS) | **YES** | `visibilityScope IN ('platform','service')` AND `status = 'published'` |
| Signage | **YES** | `scope = 'global'` AND `status = 'active'` AND `source IN ('hq','supplier','community')` |
| Forum | **NO** | HUB 비대상 — 접근 경로 없음 |
| Local Product | **NO** | Display Domain — Store 내부 전용 |
| Commerce | **NO** | Transaction Domain — HUB와 무관 |
| Store Ops | **NO** | Store 운영 Domain — HUB와 무관 |

### HUB 경계 원칙

1. **HUB는 Broadcast Domain만 소비한다** — Content + Signage
2. **큐레이션 레이어는 존재하지 않는다** — 선별/배열은 운영자 책임
3. **HUB에 신규 Domain을 추가하려면 명시적 WO가 필요하다**
4. **serviceKey는 URL 경로 파라미터에서만 추출한다** — 헤더 스푸핑 금지

### 검증 근거

- `HubContentQueryService`: Forum/Store/Commerce 테이블 참조 없음 (IR-O4O-HUB-BOUNDARY-STABILIZATION-V1)
- KPA Home Routes: 각 엔드포인트에서 경계 필터 적용 확인
- SignageQueryService: `deletedAt IS NULL` 필터 보강 완료 (WO-O4O-SIGNAGE-CONSISTENCY-HARDENING-V1)

---

## 4. Guard Rules (5 Rules)

모든 신규 개발은 아래 5개 규칙을 **예외 없이** 따른다.

### Rule 1: UUID 단독 조회 금지

```
❌ WHERE id = :id
✅ WHERE id = :id AND organizationId = :orgId
✅ WHERE id = :id AND "serviceKey" = :serviceKey
✅ WHERE id = :id AND playlistId = :playlistId
```

UUID는 전역 고유하지만, **소유권 검증 없는 단독 조회는 Cross-domain 접근을 허용한다.**
반드시 해당 Domain의 Primary Boundary 조건을 함께 적용한다.

### Rule 2: Raw SQL Parameter Binding 필수

```
❌ `WHERE organization_id = '${orgId}'`     (String Interpolation)
✅ `WHERE organization_id = $1`, [orgId]     (Parameterized Query)
```

모든 Raw SQL에서 사용자 입력 또는 런타임 값은 반드시 parameter binding을 사용한다.
Template literal 삽입은 SQL Injection 취약점을 생성한다.

### Rule 3: Domain Primary Boundary 필터 필수

모든 데이터 조회/변경 쿼리에 해당 Domain의 Primary Boundary를 적용한다.

| Domain | 필수 필터 |
|--------|----------|
| Broadcast | `serviceKey = :key` |
| Community | `organizationId IS NULL` 또는 `organizationId = :orgId` |
| Store Ops | `organizationId = :orgId` |
| Commerce | `storeId = :storeId` |

### Rule 4: serviceKey 스푸핑 금지

```
❌ const serviceKey = req.params.serviceKey || req.headers['x-service-key'];
✅ const serviceKey = req.params.serviceKey;
```

serviceKey는 URL 경로 파라미터에서만 추출한다.
헤더, 쿼리 파라미터, request body에서 serviceKey를 수용하지 않는다.

### Rule 5: Cross-domain JOIN 금지

```
❌ SELECT * FROM store_local_products slp JOIN ecommerce_order_items eoi ON ...
❌ SELECT * FROM forum_post p JOIN cms_content c ON ...
✅ 각 Domain은 자체 테이블만 쿼리한다
```

서로 다른 Domain의 테이블 간 JOIN은 금지한다.
Domain 간 데이터가 필요하면 애플리케이션 레벨에서 별도 쿼리로 조합한다.

**명시적 예외**: WO를 통해 Cross-domain JOIN이 승인된 경우에 한해 허용.

---

## 5. Domain별 상세 규칙

### 5.1 Broadcast Domain (CMS + Signage)

| 항목 | 규칙 |
|------|------|
| 경계 키 | `serviceKey` (URL param) |
| Mutation 시 | `serviceKey` 복합 조건 필수 (UUID 단독 금지) |
| 상태 필터 | `status = 'active'` / `status = 'published'` |
| Soft-delete | `deletedAt IS NULL` 필수 |
| HUB 노출 | visibility/scope 조건 충족 시만 |

### 5.2 Community Domain (Forum)

| 항목 | 규칙 |
|------|------|
| 경계 키 | `organizationId` |
| Scope 분기 | `community`: `organizationId IS NULL` |
|  | `organization`: `organizationId = :orgId` |
|  | `demo`: `1 = 0` (빈 결과) |
| Context Filter | `applyContextFilter()` 모든 쿼리에 적용 |
| 단건 조회 | `getPost()`, `getCategory()` 포함 Context Filter 필수 |
| 자식 엔티티 | 부모 엔티티 scope 검증 후 조회 (e.g., comments → parent post check) |

### 5.3 Store Ops Domain (LocalProduct, Asset, Tablet)

| 항목 | 규칙 |
|------|------|
| 경계 키 | `organizationId` (인증 컨텍스트에서 추출) |
| Body 주입 | `organizationId`를 request body에서 수용 금지 |
| 모든 CRUD | `WHERE ... AND organization_id = :orgId` |
| Commerce 교차 | 금지 — FK/JOIN/공유 테이블 없음 |

### 5.4 Commerce Domain (Order, Payment, Checkout)

| 항목 | 규칙 |
|------|------|
| 경계 키 | `storeId` (Primary), `sellerOrganizationId` (Secondary) |
| 주문 생성 | `checkoutService.createOrder()` 필수 |
| 제품 조회 | 서비스별 Product 테이블만 조회 |
| KPI 집계 | `ecommerce_order_items` / `ecommerce_orders` 전용 |
| Store Ops 교차 | 금지 — LocalProduct는 Commerce에 진입 불가 |

---

## 6. Enforcement History

본 정책은 다음 Work Order들의 조사 및 수정 결과를 기반으로 선언한다:

| WO | 대상 | 수정 내용 |
|----|------|----------|
| WO-O4O-SIGNAGE-CONSISTENCY-HARDENING-V1 | Signage | `deletedAt IS NULL` 필터 추가 (6개 쿼리) |
| WO-O4O-HUB-BOUNDARY-STABILIZATION-V1 | HUB/Signage/Forum | R-1: member-home org 필터, R-3: serviceKey 스푸핑 차단, R-4: UUID 복합 조건 |
| WO-O4O-FORUM-SECURITY-HARDENING-V1 | Forum | F-1: getPost context filter, F-2: listComments parent scope, F-3: SQL Injection 차단 |
| IR-STORE-LOCAL-PRODUCT-IMPLEMENTATION-VALIDATION-V1 | StoreLocalProduct | 5-Layer 보호 아키텍처 검증 (수정 없음) |

---

## 7. 변경 정책

### 금지되는 변경 (WO 필수)

- Domain Primary Boundary 변경
- HUB 소비 도메인 추가/변경
- Guard Rule 5항목 완화
- Cross-domain JOIN 허용
- serviceKey 추출 방식 변경

### 허용되는 변경

- Guard Rule 강화 (더 엄격한 방향)
- 신규 Domain 추가 (기존 Domain에 영향 없을 때)
- Domain 내부 Secondary Boundary 추가
- 문서 보완, 검증 시나리오 추가

---

*Generated: 2026-02-24*
*WO: WO-O4O-BOUNDARY-POLICY-DECLARATION-V1*
*Status: Policy Declaration Complete*
*Classification: Architecture Policy (FROZEN)*
