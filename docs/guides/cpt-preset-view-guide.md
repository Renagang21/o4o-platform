# View Preset 사용 가이드

**작성일:** 2025-10-31
**버전:** 1.0.0
**대상:** 관리자, 컨텐츠 제작자

---

## 📚 목차

1. [View Preset이란?](#1-view-preset이란)
2. [View Preset 관리](#2-view-preset-관리)
3. [View Preset 만들기](#3-view-preset-만들기)
4. [렌더 모드 상세](#4-렌더-모드-상세)
5. [고급 기능](#5-고급-기능)
6. [실전 예제](#6-실전-예제)
7. [FAQ](#7-faq)

---

## 1. View Preset이란?

### 1.1 개요

**View Preset**은 CPT 데이터의 **목록/그리드 표시 방식**을 정의하는 템플릿입니다.

**주요 용도:**
- 프론트엔드 포스트 목록 페이지
- 관리자 대시보드 데이터 테이블
- 위젯/블록의 CPT 목록 표시
- 검색 결과 페이지
- 아카이브 페이지

### 1.2 View Preset의 구성 요소

```
View Preset
├─ 기본 정보
│   ├─ 이름 (name)
│   ├─ CPT 슬러그 (cptSlug)
│   └─ 버전 (version)
│
├─ 렌더 모드 (renderMode)
│   ├─ list (목록)
│   ├─ grid (그리드)
│   ├─ card (카드)
│   └─ table (테이블)
│
├─ 표시 필드 (fields)
│   ├─ 필드 키 (fieldKey)
│   ├─ 라벨 (label)
│   ├─ 포맷 (format)
│   ├─ 포매터 (formatter)
│   ├─ 정렬 가능 여부 (sortable)
│   └─ 순서 (order)
│
├─ 정렬 (defaultSort)
│   ├─ 필드 (field)
│   └─ 순서 (order: ASC/DESC)
│
├─ 페이지네이션 (pagination)
│   ├─ 페이지 크기 (pageSize)
│   ├─ 표시 여부 (showPagination)
│   └─ 크기 선택 옵션 (pageSizeOptions)
│
├─ 필터 (filters)
│   ├─ 타입 (select, date-range, number-range)
│   └─ 옵션 (options)
│
├─ 검색 (search)
│   ├─ 활성화 (enabled)
│   └─ 검색 대상 필드 (fields)
│
└─ 캐싱 (cache)
    ├─ TTL (시간)
    ├─ 전략 (strategy)
    └─ 재검증 (revalidateOnFocus)
```

---

## 2. View Preset 관리

### 2.1 View Preset 페이지 접근

1. Admin 대시보드 로그인
2. 좌측 메뉴에서 **CPT Engine** 클릭
3. 하위 메뉴에서 **View Presets** 클릭

**URL:** `https://admin.neture.co.kr/cpt-engine/presets/views`

### 2.2 View Preset 목록

목록에서 확인 가능한 정보:
- 프리셋 이름 및 설명
- CPT 슬러그
- 렌더 모드 (list/grid/card/table)
- 활성 상태
- 생성/수정 날짜

---

## 3. View Preset 만들기

### 3.1 기본 정보 입력

#### 필수 필드

**1. Name**
```
예: Product Grid - Homepage
   Latest Posts - Sidebar
   Event Calendar View v2
```

**2. CPT Slug**
```
예: product, post, event
```

**3. Render Mode**
```
선택:
- list: 세로 목록
- grid: 그리드 레이아웃
- card: 카드 스타일
- table: 테이블 형식
```

### 3.2 필드 설정

#### 필드 추가

각 필드는 CPT의 데이터 중 어떤 것을 어떻게 표시할지 정의합니다.

**필드 옵션:**

| 옵션 | 설명 | 예시 |
|------|------|------|
| **fieldKey** | ACF 필드 키 | `field_product_name` |
| **label** | 표시 라벨 (없으면 필드 라벨 사용) | "상품명" |
| **format** | 데이터 포맷 | text, html, image, date, number, badge |
| **formatter** | 추가 포매팅 설정 | 통화, 날짜 형식 등 |
| **sortable** | 정렬 가능 여부 | true/false |
| **order** | 표시 순서 | 1, 2, 3... |

#### 포맷 타입

**1. text (텍스트)**
```json
{
  "fieldKey": "field_product_name",
  "format": "text",
  "sortable": true,
  "order": 1
}
```
→ 일반 텍스트로 표시

**2. html (HTML)**
```json
{
  "fieldKey": "field_product_description",
  "format": "html",
  "sortable": false,
  "order": 2
}
```
→ HTML 태그 포함 렌더링

**3. image (이미지)**
```json
{
  "fieldKey": "field_product_image",
  "format": "image",
  "sortable": false,
  "order": 1
}
```
→ `<img>` 태그로 렌더링

**4. date (날짜)**
```json
{
  "fieldKey": "field_publish_date",
  "format": "date",
  "formatter": {
    "type": "date",
    "pattern": "YYYY-MM-DD"  // 또는 "relative"
  },
  "sortable": true,
  "order": 3
}
```

**날짜 패턴:**
- `YYYY-MM-DD` → 2025-10-31
- `YYYY.MM.DD` → 2025.10.31
- `relative` → "2 days ago"

**5. number (숫자)**
```json
{
  "fieldKey": "field_product_price",
  "format": "number",
  "formatter": {
    "type": "number",
    "currency": "KRW",
    "decimals": 0
  },
  "sortable": true,
  "order": 4
}
```

**통화 코드:**
- `KRW` → ₩10,000
- `USD` → $100.00
- `EUR` → €100.00

**6. badge (뱃지)**
```json
{
  "fieldKey": "field_product_status",
  "format": "badge",
  "formatter": {
    "type": "badge",
    "colorMap": {
      "active": "green",
      "inactive": "gray",
      "pending": "yellow"
    }
  },
  "sortable": false,
  "order": 5
}
```

**뱃지 색상:**
- `green` → 녹색 배경
- `gray` → 회색 배경
- `yellow` → 노란색 배경
- `red` → 빨간색 배경
- `blue` → 파란색 배경

---

## 4. 렌더 모드 상세

### 4.1 List (목록)

**특징:**
- 세로 방향 목록
- 한 줄에 하나의 아이템
- 필드들이 가로로 나열

**적합한 용도:**
- 최신 포스트 목록
- 사이드바 위젯
- 간단한 목록

**예시 레이아웃:**
```
┌─────────────────────────────────────────┐
│ 📷 Image   Title           2025-10-31   │
│ 📷 Image   Another Post    2025-10-30   │
│ 📷 Image   Third Post      2025-10-29   │
└─────────────────────────────────────────┘
```

### 4.2 Grid (그리드)

**특징:**
- 반응형 그리드 (1/2/3 칼럼 자동 조정)
- 카드형 레이아웃
- 이미지 중심 표시

**적합한 용도:**
- 상품 목록
- 갤러리
- 포트폴리오

**예시 레이아웃:**
```
┌─────────┐ ┌─────────┐ ┌─────────┐
│  Image  │ │  Image  │ │  Image  │
│  Title  │ │  Title  │ │  Title  │
│  $100   │ │  $200   │ │  $300   │
└─────────┘ └─────────┘ └─────────┘
```

**반응형:**
- 모바일: 1 칼럼
- 태블릿: 2 칼럼
- 데스크톱: 3 칼럼

### 4.3 Card (카드)

**특징:**
- 풍부한 정보 표시
- Hero 이미지 + 여러 필드
- 그림자 효과 및 호버 애니메이션

**적합한 용도:**
- 블로그 포스트
- 이벤트 카드
- 팀 멤버 소개

**예시 레이아웃:**
```
┌───────────────────────────┐
│                           │
│    Hero Image (16:9)      │
│                           │
├───────────────────────────┤
│ Title                     │
│ Description...            │
│ Meta Info | Date          │
└───────────────────────────┘
```

### 4.4 Table (테이블)

**특징:**
- 전통적인 데이터 테이블
- 정렬 가능한 칼럼 헤더
- 많은 데이터 항목 표시

**적합한 용도:**
- 관리자 데이터 관리
- 주문 목록
- 사용자 목록

**예시 레이아웃:**
```
┌────────┬──────────┬────────┬────────┐
│ Image  │ Name     │ Price  │ Status │
├────────┼──────────┼────────┼────────┤
│ 📷     │ Product1 │ $100   │ Active │
│ 📷     │ Product2 │ $200   │ Active │
│ 📷     │ Product3 │ $150   │ Sold   │
└────────┴──────────┴────────┴────────┘
```

---

## 5. 고급 기능

### 5.1 정렬 (Sorting)

#### 기본 정렬 설정

```json
{
  "defaultSort": {
    "field": "createdAt",
    "order": "DESC"
  }
}
```

**정렬 필드 예시:**
- `createdAt` - 생성일
- `updatedAt` - 수정일
- `field_product_price` - 가격
- `field_view_count` - 조회수

**정렬 순서:**
- `ASC` - 오름차순 (1, 2, 3...)
- `DESC` - 내림차순 (3, 2, 1...)

#### 사용자 정렬

필드에 `sortable: true` 설정 시 사용자가 칼럼 헤더를 클릭하여 정렬할 수 있습니다.

### 5.2 페이지네이션

```json
{
  "pagination": {
    "pageSize": 12,
    "showPagination": true,
    "showPageSizeSelector": true,
    "pageSizeOptions": [12, 24, 48, 96]
  }
}
```

| 옵션 | 설명 | 권장값 |
|------|------|--------|
| **pageSize** | 페이지당 아이템 수 | 12 (grid), 20 (list) |
| **showPagination** | 페이지네이션 표시 | true |
| **showPageSizeSelector** | 페이지 크기 선택 드롭다운 | true (관리자), false (프론트) |
| **pageSizeOptions** | 선택 가능한 크기 | [12, 24, 48] |

### 5.3 필터 (Filters)

#### Select 필터

```json
{
  "id": "status_filter",
  "label": "상태",
  "field": "field_product_status",
  "type": "select",
  "options": [
    { "label": "전체", "value": null },
    { "label": "판매중", "value": "active" },
    { "label": "품절", "value": "sold_out" }
  ],
  "defaultValue": null
}
```

#### Date Range 필터

```json
{
  "id": "date_filter",
  "label": "게시 기간",
  "field": "field_publish_date",
  "type": "date-range",
  "defaultValue": null
}
```

#### Number Range 필터

```json
{
  "id": "price_filter",
  "label": "가격 범위",
  "field": "field_product_price",
  "type": "number-range",
  "defaultValue": { "min": 0, "max": 1000000 }
}
```

### 5.4 검색 (Search)

```json
{
  "search": {
    "enabled": true,
    "fields": [
      "field_product_name",
      "field_product_description"
    ],
    "placeholder": "상품명 또는 설명 검색..."
  }
}
```

**검색 동작:**
- 지정된 필드들을 OR 조건으로 검색
- 대소문자 구분 안 함
- 부분 일치 검색

### 5.5 캐싱 (Cache)

```json
{
  "cache": {
    "ttl": 300,                           // 5분
    "strategy": "stale-while-revalidate", // 전략
    "revalidateOnFocus": true             // 포커스 시 재검증
  }
}
```

#### 캐시 전략

**1. stale-while-revalidate (권장)**
- 캐시된 데이터 즉시 반환
- 백그라운드에서 새 데이터 가져오기
- 다음 요청 시 최신 데이터 반영

**2. cache-first**
- TTL 내에는 항상 캐시 사용
- TTL 초과 시에만 새로 가져오기

**3. no-cache**
- 캐싱 안 함 (항상 최신 데이터)

**TTL 권장값:**
- 자주 변경되는 데이터: 60초
- 일반 데이터: 300초 (5분)
- 거의 변경 안 되는 데이터: 3600초 (1시간)

---

## 6. 실전 예제

### 6.1 예제 1: 상품 그리드 (Homepage)

**목표:** 홈페이지에 최신 상품 12개를 3칼럼 그리드로 표시

```json
{
  "name": "Product Grid - Homepage v1",
  "description": "홈페이지 상단 상품 그리드",
  "cptSlug": "product",
  "version": 1,
  "roles": [],

  "config": {
    "renderMode": "grid",

    "fields": [
      {
        "fieldKey": "field_product_image",
        "label": "이미지",
        "format": "image",
        "sortable": false,
        "order": 1
      },
      {
        "fieldKey": "field_product_name",
        "label": "상품명",
        "format": "text",
        "sortable": true,
        "order": 2
      },
      {
        "fieldKey": "field_product_price",
        "label": "가격",
        "format": "number",
        "formatter": {
          "type": "number",
          "currency": "KRW",
          "decimals": 0
        },
        "sortable": true,
        "order": 3
      },
      {
        "fieldKey": "field_product_status",
        "label": "상태",
        "format": "badge",
        "formatter": {
          "type": "badge",
          "colorMap": {
            "active": "green",
            "sold_out": "gray"
          }
        },
        "sortable": false,
        "order": 4
      }
    ],

    "defaultSort": {
      "field": "createdAt",
      "order": "DESC"
    },

    "pagination": {
      "pageSize": 12,
      "showPagination": true,
      "showPageSizeSelector": false,
      "pageSizeOptions": [12, 24, 48]
    },

    "filters": [
      {
        "id": "status_filter",
        "label": "상태",
        "field": "field_product_status",
        "type": "select",
        "options": [
          { "label": "전체", "value": null },
          { "label": "판매중", "value": "active" },
          { "label": "품절", "value": "sold_out" }
        ]
      },
      {
        "id": "price_filter",
        "label": "가격 범위",
        "field": "field_product_price",
        "type": "number-range"
      }
    ],

    "search": {
      "enabled": true,
      "fields": ["field_product_name", "field_product_description"],
      "placeholder": "상품 검색..."
    },

    "cache": {
      "ttl": 300,
      "strategy": "stale-while-revalidate",
      "revalidateOnFocus": true
    }
  }
}
```

### 6.2 예제 2: 최신 포스트 목록 (Sidebar)

**목표:** 사이드바에 최신 포스트 5개 표시

```json
{
  "name": "Latest Posts - Sidebar v1",
  "description": "사이드바 최신 포스트 목록",
  "cptSlug": "post",
  "version": 1,

  "config": {
    "renderMode": "list",

    "fields": [
      {
        "fieldKey": "field_post_thumbnail",
        "format": "image",
        "sortable": false,
        "order": 1
      },
      {
        "fieldKey": "field_post_title",
        "format": "text",
        "sortable": false,
        "order": 2
      },
      {
        "fieldKey": "createdAt",
        "label": "날짜",
        "format": "date",
        "formatter": {
          "type": "date",
          "pattern": "relative"
        },
        "sortable": false,
        "order": 3
      }
    ],

    "defaultSort": {
      "field": "createdAt",
      "order": "DESC"
    },

    "pagination": {
      "pageSize": 5,
      "showPagination": false,
      "showPageSizeSelector": false,
      "pageSizeOptions": [5]
    },

    "cache": {
      "ttl": 600,
      "strategy": "stale-while-revalidate",
      "revalidateOnFocus": false
    }
  }
}
```

### 6.3 예제 3: 관리자 주문 테이블

**목표:** 관리자 페이지에서 주문 목록을 테이블로 표시

```json
{
  "name": "Order List - Admin Table v1",
  "description": "관리자용 주문 관리 테이블",
  "cptSlug": "order",
  "version": 1,
  "roles": ["admin"],

  "config": {
    "renderMode": "table",

    "fields": [
      {
        "fieldKey": "field_order_number",
        "label": "주문번호",
        "format": "text",
        "sortable": true,
        "order": 1
      },
      {
        "fieldKey": "field_customer_name",
        "label": "고객명",
        "format": "text",
        "sortable": true,
        "order": 2
      },
      {
        "fieldKey": "field_order_total",
        "label": "총액",
        "format": "number",
        "formatter": {
          "type": "number",
          "currency": "KRW",
          "decimals": 0
        },
        "sortable": true,
        "order": 3
      },
      {
        "fieldKey": "field_order_status",
        "label": "상태",
        "format": "badge",
        "formatter": {
          "type": "badge",
          "colorMap": {
            "pending": "yellow",
            "processing": "blue",
            "completed": "green",
            "cancelled": "red"
          }
        },
        "sortable": true,
        "order": 4
      },
      {
        "fieldKey": "createdAt",
        "label": "주문일",
        "format": "date",
        "formatter": {
          "type": "date",
          "pattern": "YYYY-MM-DD HH:mm"
        },
        "sortable": true,
        "order": 5
      }
    ],

    "defaultSort": {
      "field": "createdAt",
      "order": "DESC"
    },

    "pagination": {
      "pageSize": 20,
      "showPagination": true,
      "showPageSizeSelector": true,
      "pageSizeOptions": [20, 50, 100]
    },

    "filters": [
      {
        "id": "status_filter",
        "label": "상태",
        "field": "field_order_status",
        "type": "select",
        "options": [
          { "label": "전체", "value": null },
          { "label": "대기", "value": "pending" },
          { "label": "처리중", "value": "processing" },
          { "label": "완료", "value": "completed" },
          { "label": "취소", "value": "cancelled" }
        ]
      },
      {
        "id": "date_filter",
        "label": "주문 기간",
        "field": "createdAt",
        "type": "date-range"
      }
    ],

    "search": {
      "enabled": true,
      "fields": [
        "field_order_number",
        "field_customer_name",
        "field_customer_email"
      ],
      "placeholder": "주문번호, 고객명, 이메일 검색..."
    },

    "cache": {
      "ttl": 60,
      "strategy": "no-cache",
      "revalidateOnFocus": false
    }
  }
}
```

---

## 7. FAQ

### Q1: 렌더 모드를 나중에 변경할 수 있나요?

**A:** 네. 프리셋 편집 시 `renderMode`를 변경할 수 있습니다. 단, 렌더 모드에 따라 적합한 필드 구성이 다를 수 있으므로 필드 설정도 함께 조정하는 것이 좋습니다.

### Q2: 한 페이지에 여러 View Preset을 사용할 수 있나요?

**A:** 네. 예를 들어:
```tsx
<PresetRenderer presetId="view_featured_products_v1" />
<PresetRenderer presetId="view_latest_posts_v1" />
<PresetRenderer presetId="view_popular_items_v1" />
```

### Q3: PresetRenderer에 추가 데이터를 전달하려면?

**A:**
```tsx
<PresetRenderer
  preset={preset}
  data={customData}  ← 여기에 데이터 전달
  loading={false}
/>
```

### Q4: 캐시를 수동으로 삭제하려면?

**A:**
```typescript
import { clearPresetCache } from '@o4o/utils';

// 전체 캐시 삭제
clearPresetCache();

// 특정 프리셋만 삭제
clearPresetFromCache('view_product_grid_v1', 'view');
```

### Q5: 필터가 작동하지 않아요

**A:** 현재 PresetRenderer는 필터 UI만 표시하며, 실제 필터링은 데이터를 가져오는 부분에서 구현해야 합니다. (추후 usePresetData 훅에서 자동 처리 예정)

### Q6: 모바일에서 그리드 칼럼 수를 조정하려면?

**A:** PresetRenderer는 자동으로 반응형 처리합니다:
- 모바일 (< 640px): 1 칼럼
- 태블릿 (640-1024px): 2 칼럼
- 데스크톱 (> 1024px): 3 칼럼

커스텀이 필요하면 CSS 클래스를 오버라이드하세요.

### Q7: 특정 필드만 하이라이트하려면?

**A:** 첫 번째 필드는 자동으로 "hero" 스타일이 적용됩니다. 순서를 조정하여 원하는 필드를 첫 번째로 배치하세요.

---

**다음 가이드:**
- [Template Preset 사용 가이드](./cpt-preset-template-guide.md)
- [API 레퍼런스](./cpt-preset-api-reference.md)
- [개발자 가이드](./cpt-preset-developer-guide.md)

**마지막 업데이트:** 2025-10-31
