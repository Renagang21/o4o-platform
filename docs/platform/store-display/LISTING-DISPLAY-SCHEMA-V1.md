# Listing Display Schema V1

> Phase 1: 디바이스/코너별 제품 노출 제어 스키마

---

## 1. 개요

### 1.1 목적

- 동일 판매자 내에서 **디바이스별/코너별** 다른 제품 진열
- **Config 레벨**에서 노출 제어 (Core 수정 없음)
- `SellerListing.channelSpecificData` 활용

### 1.2 적용 범위

| 구성 요소 | 적용 |
|----------|------|
| SellerListing.channelSpecificData | ✅ |
| Listings API 필터 | ✅ |
| CmsView.query | ✅ |
| dropshipping-core 엔티티 | ❌ 변경 없음 |

---

## 2. 스키마 정의

### 2.1 channelSpecificData.display 구조

```typescript
interface ListingDisplayConfig {
  deviceId?: string;           // 'kiosk_1', 'tablet_corner_a'
  corner?: string;             // 'premium_zone', 'new_arrivals'
  sortOrder?: number;          // 노출 순서 (낮을수록 먼저)
  visibility?: ListingVisibility;  // 'visible' | 'hidden' | 'featured'
  deviceType?: DeviceType;     // 'web' | 'mobile' | 'kiosk' | 'tablet' | 'signage'
}
```

### 2.2 전체 channelSpecificData 구조

```typescript
interface ChannelSpecificDataWithDisplay {
  // Phase 1 노출 제어
  display?: ListingDisplayConfig;

  // 기존/추가 채널별 데이터
  [key: string]: unknown;
}
```

### 2.3 예시

```json
{
  "display": {
    "deviceId": "kiosk_1",
    "corner": "premium_zone",
    "sortOrder": 1,
    "visibility": "featured",
    "deviceType": "kiosk"
  },
  "promotionId": "promo-123"
}
```

---

## 3. 필드 상세

### 3.1 deviceId

| 항목 | 내용 |
|------|------|
| 타입 | `string` (optional) |
| 목적 | 매장 내 개별 디바이스 식별 |
| 네이밍 규칙 | `{deviceType}_{location}` 권장 |

**예시:**
- `kiosk_entrance` - 입구 키오스크
- `tablet_corner_a` - A코너 태블릿
- `signage_main` - 메인 사이니지

### 3.2 corner

| 항목 | 내용 |
|------|------|
| 타입 | `string` (optional) |
| 목적 | 매장 내 논리적 영역/섹션 구분 |
| 네이밍 규칙 | snake_case 권장 |

**예시:**
- `premium_zone` - 프리미엄 코너
- `new_arrivals` - 신상품 코너
- `bestseller` - 베스트셀러 코너
- `promotion` - 프로모션 코너
- `seasonal` - 시즌 코너

### 3.3 sortOrder

| 항목 | 내용 |
|------|------|
| 타입 | `number` (optional) |
| 기본값 | 0 |
| 정렬 | 오름차순 (낮을수록 먼저) |

### 3.4 visibility

| 값 | 의미 |
|----|------|
| `visible` | 일반 노출 (기본) |
| `hidden` | 숨김 (API 조회에서 제외) |
| `featured` | 강조 노출 (UI에서 하이라이트) |

### 3.5 deviceType

| 값 | 화면 특성 |
|----|----------|
| `web` | 데스크톱 브라우저 |
| `mobile` | 모바일 브라우저/앱 |
| `kiosk` | 터치 키오스크 |
| `tablet` | 태블릿 |
| `signage` | 디지털 사이니지 |

---

## 4. API 사용

### 4.1 필터 파라미터

```
GET /api/v1/dropshipping/core/listings
  ?deviceId=kiosk_1
  &corner=premium_zone
  &visibility=featured
  &sortBy=sortOrder
  &sortDirection=asc
```

### 4.2 응답 예시

```json
{
  "data": [
    {
      "id": "listing-uuid-1",
      "title": "프리미엄 상품 A",
      "sellingPrice": 50000,
      "channelSpecificData": {
        "display": {
          "deviceId": "kiosk_1",
          "corner": "premium_zone",
          "sortOrder": 1,
          "visibility": "featured"
        }
      }
    }
  ]
}
```

---

## 5. CmsView 연동

### 5.1 View 설정 예시

```typescript
// 키오스크 A용 프리미엄 코너 뷰
{
  slug: 'store-kiosk-1-premium',
  type: 'product-grid',
  query: {
    display: {
      deviceId: 'kiosk_1',
      corner: 'premium_zone'
    },
    limit: 12
  }
}
```

---

## 6. 사용 시나리오

### 6.1 동일 제품, 다른 코너 진열

```typescript
// Listing 1: 프리미엄 코너 (강조)
{
  offerId: 'offer-123',
  channelSpecificData: {
    display: {
      corner: 'premium_zone',
      sortOrder: 1,
      visibility: 'featured'
    }
  }
}

// Listing 2: 신상품 코너 (일반)
{
  offerId: 'offer-123',
  channelSpecificData: {
    display: {
      corner: 'new_arrivals',
      sortOrder: 5,
      visibility: 'visible'
    }
  }
}
```

### 6.2 디바이스별 다른 진열

```typescript
// 키오스크용
{
  channelSpecificData: {
    display: {
      deviceId: 'kiosk_1',
      deviceType: 'kiosk',
      sortOrder: 1
    }
  }
}

// 태블릿용
{
  channelSpecificData: {
    display: {
      deviceId: 'tablet_corner_a',
      deviceType: 'tablet',
      sortOrder: 3
    }
  }
}
```

---

## 7. 타입 파일 위치

```
packages/types/src/listing-display.ts
```

### 7.1 내보내기

```typescript
import {
  ListingDisplayConfig,
  ListingVisibility,
  DeviceType,
  ChannelSpecificDataWithDisplay,
  ListingDisplayFilters,
  CmsViewDisplayQuery
} from '@o4o/types';
```

---

## 8. 제약 사항

### 8.1 Phase 1 제약

- Core 엔티티 구조 변경 없음
- 데이터베이스 마이그레이션 없음 (JSON 필드 활용)
- 시간대별 자동 전환 미지원

### 8.2 Phase 2 확장 예정

- `corner-display-extension` 분리
- 시간대별 노출 스케줄
- A/B 테스트 지원

---

---

## 8. CmsView 코너 디스플레이 설정

### 8.1 View 타입

| 타입 | 용도 |
|------|------|
| `corner-grid` | 그리드 형태 제품 진열 (기본) |
| `corner-carousel` | 캐러셀/슬라이드 형태 |
| `corner-featured` | 강조 아이템 중심 |
| `corner-list` | 목록 형태 |

### 8.2 슬러그 네이밍 규칙

```
corner-{코너명}-{디바이스타입 또는 디바이스ID}
```

**예시:**
- `corner-premium-kiosk` - 프리미엄 코너, 키오스크용
- `corner-new-tablet` - 신상품 코너, 태블릿용
- `corner-bestseller-kiosk_1` - 베스트셀러, 특정 키오스크

### 8.3 샘플 CmsView 레코드

```json
{
  "slug": "corner-premium-kiosk",
  "name": "프리미엄 코너 (키오스크)",
  "type": "corner-grid",
  "query": {
    "display": {
      "deviceId": "kiosk_1",
      "corner": "premium_zone",
      "visibility": "visible"
    },
    "limit": 12
  },
  "layout": {
    "columns": 4,
    "gap": "md",
    "itemSize": "lg",
    "showFeatured": true,
    "showPrice": true,
    "showAiButton": true
  },
  "isActive": true
}
```

### 8.4 디바이스별 기본 레이아웃

| 디바이스 | columns | itemSize | showAiButton |
|---------|---------|----------|--------------|
| web | 6 | md | false |
| mobile | 2 | lg | false |
| kiosk | 4 | lg | true |
| tablet | 3 | md | false |
| signage | 3 | lg | false |

### 8.5 기본값 (CmsView 없을 때)

```typescript
const CORNER_DISPLAY_DEFAULTS = {
  type: 'corner-grid',
  layout: {
    columns: 4,
    gap: 'md',
    itemSize: 'md',
    showFeatured: true,
    showPrice: true,
    showAiButton: false,
  },
  isActive: true,
};
```

---

## 9. 다중 화면 설정 시나리오

### 9.1 동일 판매자, 다중 코너

```
판매자 A
├── corner-premium-kiosk     (프리미엄 코너, 키오스크)
├── corner-premium-tablet    (프리미엄 코너, 태블릿)
├── corner-new-kiosk         (신상품 코너, 키오스크)
└── corner-bestseller-web    (베스트셀러, 웹)
```

### 9.2 화면 조회 흐름

```
1. 클라이언트: deviceId + corner 전달
2. CmsView 조회: slug 매칭 또는 query.display 매칭
3. View 없으면: CORNER_DISPLAY_DEFAULTS 사용
4. Listings API 호출: CmsView.query 기반 필터
5. 렌더링: CmsView.layout 기반 레이아웃
```

---

## 변경 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| V1 | 2026-01-22 | 초기 스키마 정의 |
| V1.1 | 2026-01-22 | CmsView 코너 디스플레이 설정 추가 |

---

*Updated: 2026-01-22*
*Status: Phase 1 Active*
