# Tourist Storefront Integration

> 최종 업데이트: 2025-12-10
> 관광객용 스토어프론트 및 UI 구조

---

## 1. Overview

Tourist Storefront는 관광객 전용 쇼핑 경험을 제공하는 프론트엔드 구성이다.
Cosmetics Storefront를 기반으로 관광객 특화 기능을 추가한다.

---

## 2. View Structure

### Traveler Mode Views

| View | 용도 |
|------|------|
| `TouristHomeView` | 관광객용 메인 페이지 |
| `ProductBrowseView` | 상품 탐색 (카테고리/검색) |
| `ProductDetailView` | 상품 상세 |
| `CartView` | 장바구니 |
| `CheckoutView` | 결제/픽업 위치 선택 |
| `PickupStatusView` | 픽업 상태 확인 |

### Guide Mode Views

| View | 용도 |
|------|------|
| `GuideHomeView` | 가이드용 대시보드 |
| `GroupCreateView` | 그룹 생성 |
| `GroupDetailView` | 그룹 상세/멤버 관리 |
| `GroupOrdersView` | 그룹 주문 현황 |
| `GroupPickupView` | 단체 픽업 관리 |
| `GuideCommissionView` | 수수료 현황 |

---

## 3. UI Components

### 관광객 특화 컴포넌트

| Component | 설명 |
|-----------|------|
| `LanguageSelector` | 다국어 선택 (KO/EN/CN/JP) |
| `CurrencyDisplay` | 다중 통화 표시 |
| `PickupLocationMap` | 픽업 위치 지도 |
| `PickupCodeCard` | 픽업 코드 표시/QR |
| `GroupJoinCard` | 그룹 참여 카드 |

### 가이드 전용 컴포넌트

| Component | 설명 |
|-----------|------|
| `GroupMemberList` | 그룹 멤버 목록 |
| `OrderAggregation` | 주문 취합 현황 |
| `PickupChecklist` | 픽업 체크리스트 |
| `CommissionSummary` | 수수료 요약 |

---

## 4. Multi-Language Support

### 지원 언어

| 코드 | 언어 |
|------|------|
| `ko` | 한국어 |
| `en` | English |
| `zh` | 中文 |
| `ja` | 日本語 |

### 언어별 UI 적용

```typescript
interface TouristUIConfig {
  locale: 'ko' | 'en' | 'zh' | 'ja';
  currency: 'KRW' | 'USD' | 'CNY' | 'JPY';
  dateFormat: string;
  phoneFormat: string;
}
```

---

## 5. Pickup Location System

### PickupLocation Entity

```typescript
interface PickupLocation {
  id: string;
  name: string;             // "명동점", "인천공항 T1"
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  operatingHours: string;   // "09:00-21:00"
  type: 'store' | 'airport' | 'hotel' | 'meeting_point';
  isActive: boolean;
}
```

### 픽업 위치 타입

| 타입 | 설명 |
|------|------|
| `store` | 매장 직접 방문 |
| `airport` | 공항 픽업 카운터 |
| `hotel` | 호텔 배송 |
| `meeting_point` | 가이드 지정 집결지 |

---

## 6. Cosmetics Integration

### 상품 필터링

관광객용 상품은 Cosmetics 상품 중 `touristEligible: true` 필터링:

```typescript
// 관광객용 상품 조회
GET /tourist/products?touristEligible=true&locale=en
```

### 면세 상품 표시

```typescript
interface TouristProduct extends CosmeticsProduct {
  touristEligible: boolean;
  taxFree: boolean;          // 면세 여부
  taxFreePrice?: number;     // 면세가
  maxQuantityPerPerson: number;
}
```

---

## 7. Group Join Flow

### QR 코드 방식

```
1. 가이드가 그룹 생성
2. 그룹 QR 코드 생성 (groupId 포함)
3. 멤버가 QR 스캔 → 자동 그룹 참여
4. 멤버별 개인 장바구니에서 주문
5. 가이드가 전체 주문 취합 확인
```

### 그룹 코드 방식

```
1. 가이드가 그룹 생성 → 6자리 그룹 코드 발급
2. 멤버가 코드 입력 → 그룹 참여
3. 이후 동일 플로우
```

---

## 8. Navigation Structure

### 관광객 메뉴

```typescript
menu: {
  items: [
    { label: 'Home', path: '/tourist', icon: 'Home' },
    { label: 'Products', path: '/tourist/products', icon: 'ShoppingBag' },
    { label: 'Cart', path: '/tourist/cart', icon: 'ShoppingCart' },
    { label: 'My Pickup', path: '/tourist/pickup', icon: 'Package' },
    { label: 'Language', action: 'showLanguageSelector', icon: 'Globe' },
  ]
}
```

### 가이드 메뉴

```typescript
menu: {
  items: [
    { label: 'Dashboard', path: '/tourist/guide', icon: 'Dashboard' },
    { label: 'My Groups', path: '/tourist/guide/groups', icon: 'Users' },
    { label: 'Create Group', path: '/tourist/guide/groups/new', icon: 'Plus' },
    { label: 'Commission', path: '/tourist/guide/commission', icon: 'DollarSign' },
  ]
}
```

---

## Related Documents

- [Tourist Overview](./tourist-overview.md)
- [Order Flow](./tourist-order-flow.md)
- [Cosmetics Storefront](../cosmetics/cosmetics-storefront.md)
- [Digital Signage](../signage/signage-overview.md)

---

*Phase 12-4에서 생성*
