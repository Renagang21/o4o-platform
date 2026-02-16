# IR-PHARMACY-HUB-TREE-INTEGRITY-VALIDATION-V1

> **목적**: 약국 허브가 "설계된 트리 구조"와 정확히 일치하는지 계층 구조 관점에서 전면 검증
> **일시**: 2026-02-15
> **유형**: 읽기 전용 조사 (코드 수정 금지)

---

## Executive Summary

| Phase | 항목 | 결과 |
|-------|------|------|
| **A** | 계층 완결성 | **PARTIAL** — Level 0, 2에 FK 누락 |
| **B** | UI-트리 일치 | **OK** — 3개 Level 모두 올바른 위치 |
| **C** | 종속성 안정성 | **OK** — 4개 레이어 모두 올바른 방향 |
| **D** | 데이터 무결성 | **PARTIAL** — 4개 시나리오 중 3개 보호 |
| **E** | 구조 왜곡 위험 | **CONDITIONAL** — HIGH 1건, MEDIUM 4건 |

### 총평

```
트리 구조 완성도:  75%
구조적 위험 개수:  8건 (HIGH 1, MEDIUM 4, LOW 3)
Core 연결 준비:    CONDITIONAL — pharmacy-org ID 동치 전제 명시 필요
```

---

## Phase A — 트리 계층 완결성

### 의도된 트리 구조

```
Level 0: users → kpa_members → kpa_organizations
Level 1: kpa_organizations → organization_channels
Level 2: kpa_organizations → organization_product_listings
Level 3: organization_channels → organization_product_channels ← organization_product_listings
Level 4: EcommerceOrder.sellerId = organization_id (논리적 연결)
```

### Level별 검증 결과

#### Level 0 — Pharmacy Ownership: **PARTIAL**

| 항목 | 상태 |
|------|------|
| 테이블 존재 | `users`, `kpa_members`, `kpa_organizations` — 모두 존재 |
| FK: kpa_members.user_id → users.id | **Entity 레벨만** (@JoinColumn). DB FK 미생성 |
| FK: kpa_members.organization_id → kpa_organizations.id | **Entity 레벨만**. DB FK 미생성 |
| UNIQUE | `UQ_kpa_members_user_id` (1:1), partial UNIQUE on `license_number` |
| INDEX | `IDX_kpa_members_license_number_unique` |

**Issue**: DB 레벨 FK 제약조건 없음. TypeORM entity 정의에만 의존.

#### Level 1 — Channel Ownership: **COMPLETE**

| 항목 | 상태 |
|------|------|
| 테이블 존재 | `organization_channels` |
| FK: organization_id → kpa_organizations.id | **DB FK** `FK_org_channel_organization` ON DELETE RESTRICT |
| UNIQUE | `UQ_org_channel_type` (organization_id, channel_type) |
| INDEX | `IDX_org_channel_org_id` |

**Status**: 완전함. FK + UNIQUE + INDEX 모두 올바름.

#### Level 2 — Product Ownership: **BROKEN**

| 항목 | 상태 |
|------|------|
| 테이블 존재 | `organization_product_listings` |
| FK: organization_id → kpa_organizations.id | **MISSING** — 컬럼 존재, FK 미생성, Entity @ManyToOne 없음 |
| UNIQUE | `UQ_org_product_listing_unique` (organization_id, service_key, external_product_id) |
| INDEX | `IDX_org_product_listing_org_id`, `IDX_org_product_listing_active` |

**CRITICAL Issue**: `organization_product_listings.organization_id`에 DB FK 제약조건 없음. Organization 삭제 시 orphan 가능.

#### Level 3 — Product-Channel Binding: **COMPLETE**

| 항목 | 상태 |
|------|------|
| 테이블 존재 | `organization_product_channels` |
| FK: channel_id → organization_channels.id | **DB FK** `FK_product_channel_channel` ON DELETE CASCADE |
| FK: product_listing_id → organization_product_listings.id | **DB FK** `FK_product_channel_listing` ON DELETE CASCADE |
| UNIQUE | `UQ_channel_product` (channel_id, product_listing_id) |
| INDEX | `IDX_product_channel_channel_id`, `IDX_product_channel_listing_id`, `IDX_product_channel_active` |

**Status**: 완전함. 양쪽 FK 모두 CASCADE 적용.

#### Level 4 — Commerce Core: **INTENTIONAL (no FK)**

| 항목 | 상태 |
|------|------|
| 테이블 | `ecommerce_orders` |
| sellerId | UUID 컬럼 + INDEX. **FK 없음** (설계 의도 — SellerType이 다양) |
| metadata | channelType, channelId 저장 (스냅샷) |

**Status**: 설계 의도. sellerId는 INDIVIDUAL/ORGANIZATION 모두 가능하므로 FK 불가.

### 역방향 탐색 체인 점검

```
EcommerceOrder.sellerId (NO FK)
  → [응용 로직] kpa_organizations.id
    → organization_channels (FK ✓)
      → organization_product_channels (FK ✓)
        → organization_product_listings (FK ✓)
          → kpa_organizations.organization_id (NO FK ❌)
            → kpa_members.organization_id (Entity FK only)
              → users.user_id (Entity FK only)
```

**결론**: Level 2의 FK 누락으로 완전한 역방향 탐색 불가.

---

## Phase B — UI-트리 일치 여부

### 화면-트리 매핑

| 화면/컴포넌트 | 트리 Level | 올바른 위치? | 비고 |
|---------------|------------|-------------|------|
| **ChannelLayerSection** (허브 최상단) | Level 1 | **YES** | `organization_channels` 데이터 표시 |
| **PharmacySellPage** (Tab 1: 신청, Tab 2: 진열) | Level 2 | **YES** | `organization_product_listings` 관리 |
| **ChannelSettingsPanel** (상품 내 확장) | Level 3 | **YES** | `organization_product_channels` 설정 |

### PharmacyDashboardPage 섹션 순서

```
0. ChannelLayerSection          ← Level 1 (Channel Ownership) ✅
1. StoreOverviewSection         ← 대시보드 위젯
2. StoreManagementSection       ← 네비게이션 링크
3. ActiveServicesSection        ← 외부 서비스
4. QuickActionsSection          ← 신청/액션
5. MyRequestsSection            ← 진행 상태
6. RecommendedServicesSection   ← 추천
```

### 네비게이션 흐름

```
/pharmacy/hub → 허브 진입
  └─ ChannelLayerSection 클릭 → /pharmacy/sell?channel={type}
      └─ ListingsTab → 상품 확장 → ChannelSettingsPanel
```

### 판정

- Level 건너뛰기: **없음**
- 데이터 혼재: **없음** (각 Level 전용 API 사용)
- 트리 순서 반영: **정확함** (L1 → L2 → L3)

**Phase B: OK**

---

## Phase C — 서비스 종속성 점검

### 종속성 방향 검증

의도된 방향: `L1 ← L2 ← L3 ← L4` (상위가 하위에 의존하지 않음)

| 질문 | 결과 | 근거 |
|------|------|------|
| Channel(L1)이 Product(L2)에 독립적인가? | **YES** | `store-hub.controller.ts` L269: LEFT JOIN으로 상품 통계 조회 (optional) |
| Product(L2)가 Channel(L1) 없이 존재 가능한가? | **YES** | `pharmacy-products.controller.ts` POST /apply: 채널 없이 상품 신청 가능 |
| Order(L4)가 Hub 데이터를 READ만 하는가? | **YES** | `checkout.controller.ts`: SELECT만 사용, INSERT/UPDATE/DELETE 없음 |
| Hub 코드가 Order 테이블을 참조하는가? | **NO** | `/routes/kpa/` 전체에 EcommerceOrder 참조 0건 |

### Import 분석

| 파일 | 계층 | 타 계층 Import | 위반? |
|------|------|---------------|-------|
| `store-hub.controller.ts` | L1 | 없음 | NO |
| `pharmacy-products.controller.ts` | L2 | OrganizationProductChannel (L3) — READ 전용 | NO |
| `checkout.controller.ts` | L4 | 없음 (raw SQL로 hub 테이블 조회) | NO |

**Phase C: OK** — 역방향 종속성 0건.

---

## Phase D — 데이터 무결성 시나리오

| 시나리오 | 기대 결과 | 실제 메커니즘 | 상태 |
|----------|----------|-------------|------|
| **채널 삭제** | 하위 product_channel CASCADE | DB FK `ON DELETE CASCADE` (Migration 20260215200002) | **PROTECTED** |
| **listing 비활성화** | KPI 반영 | SQL `FILTER (WHERE is_active = true)` (store-hub.controller.ts L284) | **PROTECTED** |
| **채널 승인 취소** | 상품 노출 차단 | `status = 'APPROVED'` 게이트 체크 (checkout.controller.ts L279) | **PROTECTED** |
| **org 삭제** | 전체 트리 정리 | **MIXED** — Channel: ON DELETE RESTRICT, Listing: **FK 없음** | **UNPROTECTED** |

### 시나리오 4 상세 분석

```
organization 삭제 시:
  ├─ organization_channels: RESTRICT → 삭제 차단 (안전)
  ├─ organization_product_listings: FK 없음 → orphan 발생 가능 (위험)
  └─ organization_product_channels: listing CASCADE 통해 간접 정리 (listing 삭제 시만)
```

**Phase D: PARTIAL** — 3/4 보호, 1건 미보호 (org 삭제 시 listing orphan)

---

## Phase E — 트리 왜곡 위험 탐지

### 위험 목록

| # | 위험 | 심각도 | 현재 완화 | 권장 조치 |
|---|------|--------|----------|----------|
| **E1** | GlycopharmPharmacy.id ≡ KpaOrganization.id 전제 미명시 | **HIGH** | 운영 데이터가 일치하는 상태 | DB FK 또는 문서화 |
| **E2** | organization_product_listings.organization_id FK 누락 | **MEDIUM** | INDEX 존재, 앱 레벨 검증 | Migration으로 FK 추가 |
| **E3** | organization_id 이중 저장 (channels + listings) | **MEDIUM** | UNIQUE 제약으로 부분 방어 | CHECK 제약 또는 트리거 |
| **E4** | EcommerceOrder.sellerId → org 연결 FK 없음 | **MEDIUM** | 주문 생성 시 검증 (스냅샷) | 문서화 (설계 의도) |
| **E5** | metadata.channelId FK 미보장 | **MEDIUM** | 생성 시점 검증으로 방어 | audit용 FK 컬럼 고려 |
| **E6** | EcommerceOrder.channel vs organization_channels.channel_type 의미 충돌 | LOW | Order.channel = null 유지 + 코드 주석 | 필드명 명확화 |
| **E7** | 비승인 채널의 product_channel 잔존 | LOW | CASCADE 삭제 동작, 조회 시 필터 | 정리 Job (선택) |
| **E8** | sales_limit 검증 시 mapping 재검증 없음 | LOW | Soft check 패턴, 매핑 존재 시만 적용 | 문서화 |

### 순환 참조: **없음**

모든 entity 관계가 단방향. CLAUDE.md §4 string-based relation 규칙 준수로 import cycle 방지.

### 핵심 위험 상세: E1 (pharmacy-org ID 동치)

```
checkout.controller.ts:280
  → pharmacy.id를 organization_id로 직접 사용
  → organization_channels WHERE organization_id = pharmacy.id

전제: glycopharm_pharmacies.id == kpa_organizations.id
보장: 없음 (FK 없음, 문서 없음)
```

만약 스키마가 다음으로 진화하면 전체 트리 붕괴:
- 1 organization : N pharmacies
- pharmacy.id ≠ organization.id

**Phase E: CONDITIONAL** — 구조적으로 건전하나, pharmacy-org 동치 전제가 미명시.

---

## 종합 판정

### 트리 Level별 상태

| Level | 이름 | 물리적 존재 | FK 제약 | 판정 |
|-------|------|-----------|---------|------|
| 0 | Pharmacy Ownership | YES | Entity only | **PARTIAL** |
| 1 | Channel Ownership | YES | DB FK (RESTRICT) | **COMPLETE** |
| 2 | Product Ownership | YES | **MISSING** | **BROKEN** |
| 3 | Product-Channel Binding | YES | DB FK (CASCADE x2) | **COMPLETE** |
| 4 | Commerce Core | YES | Intentional (no FK) | **ACCEPTABLE** |

### 필요 조치 우선순위

| 순위 | 조치 | 대상 |
|------|------|------|
| **P0** | pharmacy.id ≡ organization.id 전제 명시 (FK 또는 문서) | E1 |
| **P1** | `organization_product_listings.organization_id` FK 추가 Migration | A-Level2, E2 |
| **P2** | org 삭제 시 cascade 정책 확정 | D-시나리오4 |
| **P3** | organization_product_channels cross-org 검증 | E3 |
| **P4** | EcommerceOrder.channel / channel_type 의미 명확화 | E6 |

### 결론

> **트리의 논리적 설계는 올바르다.**
>
> L1 → L2 → L3 → L4 계층이 의도대로 구성되었고,
> UI가 이 트리를 정확히 반영하며,
> 종속성 방향도 올바르다.
>
> **그러나 물리적 보장이 불완전하다.**
>
> Level 2의 FK 누락과 pharmacy-org ID 동치 전제 미명시로 인해
> "운영 시 우연히 맞는 상태"와 "설계 의도에 의해 보장되는 상태" 사이에 간극이 있다.
>
> P0, P1 조치를 통해 이 간극을 좁히면 트리 완성도 90%+ 달성 가능.

---

## 관련 문서

- [IR-PHARMACY-HUB-STRUCTURE-VALIDATION-V1](./IR-PHARMACY-HUB-STRUCTURE-VALIDATION-V1.md) — 이전 부분 검증
- [IR-PHARMACY-B2C-COMMERCE-CORE-ANALYSIS-V1](./IR-PHARMACY-B2C-COMMERCE-CORE-ANALYSIS-V1.md) — Commerce Core 구조 분석

## 참조 파일

| 구분 | 파일 |
|------|------|
| Entity L0 | `apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts` |
| Entity L0 | `apps/api-server/src/routes/kpa/entities/kpa-organization.entity.ts` |
| Entity L1 | `apps/api-server/src/routes/kpa/entities/organization-channel.entity.ts` |
| Entity L2 | `apps/api-server/src/routes/kpa/entities/organization-product-listing.entity.ts` |
| Entity L3 | `apps/api-server/src/routes/kpa/entities/organization-product-channel.entity.ts` |
| Entity L4 | `packages/ecommerce-core/src/entities/EcommerceOrder.entity.ts` |
| Migration L0 | `20260206190000-CreateKpaFoundationTables.ts` |
| Migration L1 | `20260215200001-CreateOrganizationChannels.ts` |
| Migration L2 | `20260215000021-CreateOrganizationProductListings.ts` |
| Migration L3 | `20260215200002-CreateOrganizationProductChannels.ts` |
| Controller L1 | `apps/api-server/src/routes/kpa/controllers/store-hub.controller.ts` |
| Controller L2 | `apps/api-server/src/routes/kpa/controllers/pharmacy-products.controller.ts` |
| Controller L4 | `apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts` |
| UI L1 | `services/web-kpa-society/src/pages/pharmacy/sections/ChannelLayerSection.tsx` |
| UI L2 | `services/web-kpa-society/src/pages/pharmacy/PharmacySellPage.tsx` |
| UI L3 | `services/web-kpa-society/src/pages/pharmacy/PharmacySellPage.tsx` (ChannelSettingsPanel) |
| Hub | `services/web-kpa-society/src/pages/pharmacy/PharmacyDashboardPage.tsx` |
