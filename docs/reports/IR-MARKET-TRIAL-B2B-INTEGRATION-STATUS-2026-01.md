# Investigation Report: Market Trial B2B Integration Status

> **Status**: COMPLETE
> **Date**: 2026-01-10
> **Scope**: Investigation Only / No Code Changes
> **Purpose**: B2B 서비스 연계 현황 사실 파악

---

## Executive Summary

Market Trial은 현재 **glycopharm, neture**에서 활발히 사용되고 있으며,
**k-cosmetics에서는 연계가 없는 상태**다.

각 서비스별로 연계 방식과 깊이가 다르며, 공통 규약 없이 개별 구현된 부분이 존재한다.

---

## 1. 서비스별 현황 표 (필수 산출물)

| 서비스 | Trial 사용 | 상품 연결 | Decision 사용 | Forum 사용 | 비고 |
|--------|------------|-----------|---------------|------------|------|
| **glycopharm** | O (UI만) | X (API 미연결) | X | X | Pharmacy/Operator UI 존재, API placeholder |
| **k-cosmetics** | **X** | X | X | X | 연계 코드 없음 |
| **neture** | **O (완전)** | O | O (설계됨) | X (placeholder) | Phase H8-FE 기준 구현 |
| **ecommerce** | O | O | O | X | 내부 앱, Seller/Partner 참여용 |

---

## 2. 조사 관점별 상세 분석

### 2.1 구조적 연결 방식

#### Market Trial App 기본 정보

| 항목 | 값 |
|------|-----|
| **위치** | `packages/market-trial` |
| **appType** | `extension` |
| **상태** | `experimental` (service template 없음) |
| **필수 의존** | `dropshipping-core` |
| **선택 의존** | `forum-core` |

#### AppStore 등록 상태

```typescript
// apps/api-server/src/app-manifests/appsCatalog.ts:575-586
{
  appId: 'market-trial',
  type: 'extension',
  dependencies: { 'dropshipping-core': '>=1.0.0' },
  serviceGroups: ['cosmetics', 'supplierops', 'sellerops']
}
```

**핵심 사실**:
- `serviceGroups`에 3개 서비스 등록: cosmetics, supplierops, sellerops
- glycopharm, k-cosmetics는 serviceGroups에 명시되어 있지 않음
- `status` 필드 미설정 (Active/Development 미명시)

#### 서비스별 연결 방식

| 서비스 | 연결 방식 | 코드 위치 |
|--------|-----------|-----------|
| **glycopharm** | 전용 Controller + 별도 타입 정의 | `services/web-glycopharm/src/pages/pharmacy/market-trial/` |
| **neture** | API Client + 공통 라우트 사용 | `services/web-neture/src/api/trial.ts` |
| **k-cosmetics** | 없음 | - |
| **ecommerce** | 공통 API 사용 | `apps/ecommerce/src/pages/market-trial/` |

---

### 2.2 데이터 흐름

#### Trial 생성 주체

| 서비스 | 생성 주체 | 현재 상태 |
|--------|-----------|-----------|
| glycopharm | Operator (추정) | API placeholder (빈 배열 반환) |
| neture | Supplier (via API) | In-memory store 기반 |
| ecommerce | Supplier (via API) | In-memory store 기반 |

#### Trial-상품 연결 방식

**packages/market-trial 기준**:
```typescript
// MarketTrial.entity.ts
productId: string (UUID)  // FK: dropshipping_product_masters.id
supplierId: string (UUID) // FK: dropshipping_suppliers.id
```

**neture/ecommerce 프론트엔드 기준**:
```typescript
// marketTrial.types.ts (ecommerce)
interface MarketTrial {
  supplierId: string;
  productRewardDescription?: string;  // 상품 정보 텍스트
}
```

**핵심 사실**:
- 백엔드: `dropshipping_product_masters` UUID 참조
- 프론트엔드: 상품 연결 정보가 일부 누락 또는 다르게 표현

#### Decision 결과 처리

| Decision | 처리 내용 | 코드 위치 |
|----------|-----------|-----------|
| CONTINUE | `SellerListing(DRAFT)` 자동 생성 | `MarketTrialDecisionService.ts:217-241` |
| STOP | 아무 처리 없음 | - |

**Dropshipping Core 반영**:
```typescript
// MarketTrialDecisionService.ts
const listing = listingRepo.create({
  sellerId: dto.participantId,
  offerId: offer.id,
  status: ListingStatus.DRAFT,
  metadata: {
    sourceType: 'market_trial',
    marketTrialId: trial.id,
  },
});
```

**핵심 사실**:
- CONTINUE 시 SellerListing이 생성됨 (Dropshipping Core에 반영)
- EcommerceOrder 생성은 **미구현** (CLAUDE.md §7 위반 가능성)

---

### 2.3 UI 노출 위치

#### glycopharm

| 역할 | 페이지 | 경로 | 기능 |
|------|--------|------|------|
| Pharmacy | MarketTrialListPage | `/pharmacy/market-trial` | Trial 목록, signage/store/forum 연결 |
| Operator | OperatorTrialSelectorPage | `/operator/market-trial` | Trial 활성화/비활성화, 순서 조정 |

**특이점**:
- **독자적 타입 정의** 존재 (`services/web-glycopharm/src/types/marketTrial.ts`)
- API 엔드포인트: `/api/v1/glycopharm/market-trials` (빈 배열 반환)
- 공통 market-trial 패키지와 **별도 구현**

#### neture

| 페이지 | 경로 | 기능 |
|--------|------|------|
| TrialListPage | `/trial` | Trial 목록, 참여 가능 여부 표시 |
| TrialDetailPage | `/trial/:id` | 상세, 참여, 보상 선택 |

**특이점**:
- 공통 API 사용 (`/api/market-trial`)
- Trial Shipping/Fulfillment 확장 기능 포함

#### k-cosmetics

- **UI 없음** - Market Trial 관련 페이지/컴포넌트 미존재

#### ecommerce (내부 앱)

| 페이지 | 기능 |
|--------|------|
| MarketTrialListPage | Seller/Partner용 Trial 목록 |
| MarketTrialDetailPage | Trial 상세 |
| MarketTrialJoinPage | 참여 플로우 |
| MarketTrialRewardSelector | 보상 유형 선택 |

---

### 2.4 Forum 연계 상태

#### Entity 구조

```typescript
// MarketTrialForum.entity.ts
@Entity('market_trial_forums')
class MarketTrialForum {
  id: string (UUID)
  marketTrialId: string (UUID)  // FK: market_trials.id
  forumId: string (UUID)        // FK: forum-core boards
}
```

#### 서비스별 Forum 사용 현황

| 서비스 | Forum 연결 | 접근 권한 | 현재 상태 |
|--------|------------|-----------|-----------|
| glycopharm | UI에 연결 버튼 존재 | 미정의 | placeholder |
| neture | 코드 없음 | - | 미구현 |
| k-cosmetics | 없음 | - | - |
| packages/market-trial | 서비스 구현됨 | 역할 기반 (Supplier/Seller/Partner) | Phase 3 예정 |

#### Forum 접근 권한 로직 (백엔드)

```typescript
// MarketTrialForumService.ts
ForumUserRole: 'supplier' | 'seller' | 'partner' | 'guest'

Read 권한: Supplier/Seller/Partner = yes, Guest = no
Write 권한:
  - Trial status = FAILED → read-only
  - Guest → no write
  - Others → can write
```

**핵심 사실**:
- 백엔드에 Forum 접근 제어 로직 구현됨
- 프론트엔드 연동은 미완성 (glycopharm UI 버튼만 존재)
- 실제 Forum 생성/연결 플로우는 **미구현**

---

### 2.5 책임 경계

#### Trial 종료 전

| 영역 | 책임 주체 | 코드 위치 |
|------|-----------|-----------|
| Trial 생성 | Market Trial App | `MarketTrialService.createTrial()` |
| 참여자 관리 | Market Trial App | `MarketTrialService.participate()` |
| 펀딩 금액 추적 | Market Trial App | `currentAmount` 필드 |
| 상태 전이 | Market Trial App | `evaluateStatusIfNeeded()` |

#### Trial 종료 후 (Decision 시점)

| 영역 | 책임 주체 | 현재 상태 |
|------|-----------|-----------|
| Decision 수집 | Market Trial App | 구현됨 |
| SellerListing 생성 | Market Trial App → Dropshipping Core | 구현됨 |
| 실제 주문 생성 | **불명확** | 미구현 |
| 정산 처리 | **불명확** | 미구현 |
| 환불 처리 | **불명확** | 미구현 |

#### 책임 경계 명확성 평가

| 항목 | 명확도 | 비고 |
|------|--------|------|
| Trial 생성 → 종료 | **명확** | Market Trial App 단독 책임 |
| Decision → SellerListing | **명확** | Market Trial → Dropshipping Core |
| SellerListing → 실제 판매 | **암묵적** | 코드 없음, 수동 처리 추정 |
| 펀딩 실패 시 처리 | **암묵적** | 환불 로직 없음 |

---

## 3. 공통점 / 차이점 요약

### 3.1 공통으로 유지되고 있는 부분

| 항목 | 내용 |
|------|------|
| **Entity 구조** | 모든 서비스가 동일한 packages/market-trial 사용 |
| **Status 체계** | OPEN → TRIAL_ACTIVE / FAILED |
| **참여자 유형** | Seller / Partner 구분 |
| **Decision 유형** | CONTINUE / STOP |

### 3.2 서비스별로 다른 해석/구현이 존재하는 부분

| 항목 | glycopharm | neture | ecommerce |
|------|------------|--------|-----------|
| **타입 정의** | 독자적 타입 | API Client 사용 | 독자적 타입 |
| **API 엔드포인트** | `/api/v1/glycopharm/market-trials` | `/api/market-trial` | `/api/market-trial` |
| **Trial 상태값** | upcoming/active/ended | 공통 Status | open/closed |
| **연결 기능** | signage/store/forum | shipping/fulfillment | reward selection |

**핵심 차이점**:
1. **glycopharm**은 독자적 타입과 API를 사용하며, 공통 market-trial과 **별도 계층**으로 동작
2. **neture**는 공통 API를 사용하되, shipping/fulfillment 확장 기능 추가
3. **ecommerce**는 공통 API를 사용하되, 독자적 UI 타입 정의

### 3.3 구조적으로 위험해 보이는 지점

| 지점 | 사실 기술 |
|------|-----------|
| **타입 불일치** | glycopharm과 ecommerce가 각각 독자적 타입 정의 사용 |
| **API 분리** | glycopharm이 공통 API와 다른 엔드포인트 사용 |
| **Status 명명** | 서비스별로 다른 Status enum 사용 (upcoming vs open) |
| **E-commerce 미연결** | CLAUDE.md §7 기준 EcommerceOrder 생성 누락 |
| **Forum 미완성** | 백엔드 구현 vs 프론트엔드 placeholder 상태 |
| **In-memory Store** | 서버 재시작 시 데이터 유실 가능 |

---

## 4. 데이터 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                    Market Trial Core                             │
│  (packages/market-trial)                                        │
│  ┌────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ MarketTrial    │  │ Participant     │  │ Decision        │  │
│  │ Entity         │→ │ Entity          │→ │ Entity          │  │
│  └───────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│          │                    │                     │           │
│          ↓                    ↓                     ↓           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              MarketTrialService                          │   │
│  │              MarketTrialDecisionService                  │   │
│  │              MarketTrialForumService                     │   │
│  └──────────────────────┬──────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ↓               ↓               ↓
   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
   │ Neture Web   │ │ Glycopharm   │ │ K-Cosmetics  │
   │              │ │ Web          │ │ Web          │
   │ ├─TrialList  │ │              │ │              │
   │ ├─TrialDetail│ │ ├─Pharmacy   │ │ (연계 없음)  │
   │ ├─Shipping   │ │ │ TrialList  │ │              │
   │ └─Fulfillment│ │ └─Operator   │ │              │
   │              │ │   Selector   │ │              │
   │ API:        │ │              │ │              │
   │ /api/       │ │ API:        │ │              │
   │ market-trial│ │ /api/v1/    │ │              │
   │ (공통)      │ │ glycopharm/ │ │              │
   │              │ │ market-trials│ │              │
   │              │ │ (별도)      │ │              │
   └──────────────┘ └──────────────┘ └──────────────┘
          │
          ↓
   ┌──────────────────────────────────────┐
   │        Dropshipping Core              │
   │  ┌─────────────────────────────────┐ │
   │  │ SellerListing (DRAFT)           │ │
   │  │ - Decision CONTINUE 시 생성     │ │
   │  │ - sourceType: 'market_trial'    │ │
   │  └─────────────────────────────────┘ │
   └──────────────────────────────────────┘
```

---

## 5. Forum 연계 상태 상세

```
                    ┌─────────────────────────────┐
                    │   Market Trial Forum        │
                    │   (market_trial_forums)     │
                    │                             │
                    │   marketTrialId ──┐         │
                    │   forumId      ───┼──→ ?    │
                    │                   │         │
                    └───────────────────┼─────────┘
                                        │
                    ┌───────────────────┼─────────┐
                    │                   ↓         │
                    │         forum-core          │
                    │         (Optional Dep)      │
                    │                             │
                    │   상태: 패키지 존재         │
                    │   연결: 실제 연동 미완성    │
                    └─────────────────────────────┘

서비스별 현황:
┌──────────────┬───────────────┬───────────────────────┐
│ 서비스       │ UI 상태       │ 실제 연동             │
├──────────────┼───────────────┼───────────────────────┤
│ glycopharm   │ 버튼 존재     │ 클릭 시 동작 없음     │
│ neture       │ UI 없음       │ 미구현                │
│ k-cosmetics  │ UI 없음       │ 미구현                │
└──────────────┴───────────────┴───────────────────────┘
```

---

## 6. 결론

### 조사 완료 항목

- [x] 모든 조사 대상 서비스가 표에 포함됨
- [x] Market Trial의 사용/미사용이 명확히 구분됨
- [x] Decision / Forum / 상품 연결 여부가 서비스별로 정리됨
- [x] "현재 이렇게 되어 있다" 수준으로 기술됨

### 향후 결정 필요 사항 (본 조사에서 판단하지 않음)

1. glycopharm 독자 API를 공통 API로 통합할 것인지
2. 각 서비스별 타입 정의를 공통화할 것인지
3. Forum 연계를 실제 구현할 것인지 / 제거할 것인지
4. E-commerce Core 연결 (CLAUDE.md §7 준수)을 언제 수행할 것인지
5. In-memory Store를 실제 DB로 전환할 시점

---

*Report Version: 1.0*
*Investigation Date: 2026-01-10*
*Status: COMPLETE - Investigation Only*
