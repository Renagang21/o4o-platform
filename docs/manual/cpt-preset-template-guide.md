# Template Preset 사용 가이드

**작성일:** 2025-10-31
**버전:** 1.0.0
**대상:** 관리자, 디자이너, 프론트엔드 개발자

---

## 📚 목차

1. [Template Preset이란?](#1-template-preset이란)
2. [구조 및 스키마](#2-구조-및-스키마)
3. [레이아웃 유형](#3-레이아웃-유형)
4. [슬롯 시스템](#4-슬롯-시스템)
5. [SEO 및 Schema.org](#5-seo-및-schemaorg)
6. [권한 및 조건부 표시](#6-권한-및-조건부-표시)
7. [실전 예제](#7-실전-예제)
8. [FAQ 및 문제 해결](#8-faq-및-문제-해결)

---

## 1. Template Preset이란?

### 1.1 개요

**Template Preset**은 CPT의 **단일 포스트 상세 페이지 레이아웃**을 정의하는 템플릿입니다.

**주요 용도:**
- 블로그 포스트 상세 페이지
- 상품 상세 페이지
- 이벤트 상세 페이지
- 팀 멤버 프로필 페이지
- 포트폴리오 작품 상세 페이지

### 1.2 Form/View Preset과의 차이점

| 비교 항목 | FormPreset | ViewPreset | TemplatePreset |
|----------|-----------|-----------|----------------|
| **목적** | 데이터 입력 | 목록/그리드 표시 | 단일 항목 상세 페이지 |
| **사용처** | Admin 대시보드 | 아카이브/목록 페이지 | 단일 포스트 페이지 |
| **핵심 기능** | 필드 배치, 검증 | 렌더 모드, 필터 | 레이아웃, SEO, 블록 조합 |
| **예시** | 상품 등록 폼 | 상품 목록 그리드 | 상품 상세 페이지 |

### 1.3 Template Preset의 구성 요소

```
Template Preset
├─ 기본 정보
│   ├─ 이름 (name)
│   ├─ 설명 (description)
│   ├─ CPT 슬러그 (cptSlug)
│   └─ 버전 (version)
│
├─ 레이아웃 (layout)
│   ├─ 타입 (type: 1-column, 2-column-left, 2-column-right, 3-column)
│   ├─ 헤더 슬롯 (header)
│   ├─ 메인 슬롯 (main) ← 필수
│   ├─ 사이드바 슬롯 (sidebar)
│   └─ 푸터 슬롯 (footer)
│
├─ SEO 메타 (seoMeta)
│   ├─ 제목 템플릿 (titleTemplate)
│   ├─ 설명 필드 (descriptionField)
│   ├─ OG 이미지 필드 (ogImageField)
│   └─ 키워드 (keywords)
│
└─ Schema.org (schemaOrg)
    ├─ 타입 (type: Product, Article, Event, Organization)
    └─ 필드 매핑 (fieldMapping)
```

---

## 2. 구조 및 스키마

### 2.1 기본 스키마

Template Preset은 다음과 같은 JSON 구조를 가집니다:

```json
{
  "id": "template_product_single_v1",
  "name": "Product Single Page Template v1",
  "description": "상품 상세 페이지 표준 템플릿",
  "cptSlug": "product",
  "version": 1,
  "roles": [],
  "isActive": true,

  "config": {
    "layout": {
      "type": "2-column-right",
      "header": {
        "blocks": [...]
      },
      "main": {
        "blocks": [...]
      },
      "sidebar": {
        "blocks": [...]
      },
      "footer": {
        "blocks": [...]
      }
    },
    "seoMeta": {
      "titleTemplate": "{title} | My Shop",
      "descriptionField": "field_product_description",
      "ogImageField": "field_product_image",
      "keywords": ["product", "shop", "ecommerce"]
    },
    "schemaOrg": {
      "type": "Product",
      "fieldMapping": {
        "name": "field_product_name",
        "price": "field_product_price",
        "image": "field_product_image"
      }
    }
  }
}
```

### 2.2 필수 필드

| 필드 | 타입 | 필수 여부 | 설명 |
|------|------|----------|------|
| **name** | string | ✓ | 템플릿 이름 |
| **cptSlug** | string | ✓ | 연결된 CPT 슬러그 |
| **config.layout** | object | ✓ | 레이아웃 설정 |
| **config.layout.type** | string | ✓ | 레이아웃 타입 |
| **config.layout.main** | object | ✓ | 메인 슬롯 (최소 1개 블록 필요) |
| **config.seoMeta.titleTemplate** | string | ✓ | SEO 제목 템플릿 |

### 2.3 선택 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| **description** | string | 템플릿 설명 |
| **roles** | string[] | 접근 가능한 역할 (비어있으면 모든 역할) |
| **config.layout.header** | object | 헤더 슬롯 |
| **config.layout.sidebar** | object | 사이드바 슬롯 |
| **config.layout.footer** | object | 푸터 슬롯 |
| **config.seoMeta.descriptionField** | string | 설명에 사용할 ACF 필드 |
| **config.seoMeta.ogImageField** | string | OG 이미지에 사용할 ACF 필드 |
| **config.seoMeta.keywords** | string[] | 정적 키워드 |
| **config.seoMeta.keywordsField** | string | 동적 키워드 필드 |
| **config.schemaOrg** | object | Schema.org JSON-LD 설정 |

---

## 3. 레이아웃 유형

Template Preset은 4가지 레이아웃 타입을 지원합니다.

### 3.1 1-column (1단 레이아웃)

**특징:**
- 전체 너비 사용
- 사이드바 없음
- 콘텐츠 중심 레이아웃

**적합한 용도:**
- 블로그 포스트
- 긴 글 (Long-form content)
- 랜딩 페이지

**시각적 구조:**
```
┌──────────────────────────────────┐
│          Header (선택)            │
├──────────────────────────────────┤
│                                  │
│          Main Content            │
│                                  │
│          (Full Width)            │
│                                  │
├──────────────────────────────────┤
│          Footer (선택)            │
└──────────────────────────────────┘
```

**예시 설정:**
```json
{
  "layout": {
    "type": "1-column",
    "main": {
      "blocks": [
        {
          "blockName": "HeroImage",
          "props": { "fieldKey": "field_featured_image" },
          "order": 1
        },
        {
          "blockName": "TitleBlock",
          "props": { "fieldKey": "title", "size": "large" },
          "order": 2
        },
        {
          "blockName": "RichTextBlock",
          "props": { "fieldKey": "field_content" },
          "order": 3
        }
      ]
    }
  }
}
```

### 3.2 2-column-left (2단 레이아웃 - 왼쪽 사이드바)

**특징:**
- 왼쪽: 사이드바 (30%)
- 오른쪽: 메인 콘텐츠 (70%)
- 네비게이션 또는 목차를 강조

**적합한 용도:**
- 문서/가이드 페이지
- 카테고리 네비게이션이 필요한 콘텐츠
- 필터가 중요한 페이지

**시각적 구조:**
```
┌──────────────────────────────────┐
│          Header (선택)            │
├────────────┬─────────────────────┤
│            │                     │
│  Sidebar   │   Main Content      │
│  (30%)     │   (70%)             │
│            │                     │
├────────────┴─────────────────────┤
│          Footer (선택)            │
└──────────────────────────────────┘
```

**예시 설정:**
```json
{
  "layout": {
    "type": "2-column-left",
    "sidebar": {
      "blocks": [
        {
          "blockName": "TableOfContents",
          "props": {},
          "order": 1
        },
        {
          "blockName": "RelatedPosts",
          "props": { "limit": 5 },
          "order": 2
        }
      ]
    },
    "main": {
      "blocks": [
        {
          "blockName": "TitleBlock",
          "props": { "fieldKey": "title" },
          "order": 1
        },
        {
          "blockName": "RichTextBlock",
          "props": { "fieldKey": "field_content" },
          "order": 2
        }
      ]
    }
  }
}
```

### 3.3 2-column-right (2단 레이아웃 - 오른쪽 사이드바)

**특징:**
- 왼쪽: 메인 콘텐츠 (70%)
- 오른쪽: 사이드바 (30%)
- 가장 일반적인 블로그/상품 페이지 레이아웃

**적합한 용도:**
- 블로그 포스트 (사이드바에 관련 글)
- 상품 상세 페이지 (사이드바에 구매 버튼)
- 뉴스 기사 (사이드바에 광고/배너)

**시각적 구조:**
```
┌──────────────────────────────────┐
│          Header (선택)            │
├─────────────────────┬────────────┤
│                     │            │
│   Main Content      │  Sidebar   │
│   (70%)             │  (30%)     │
│                     │            │
├─────────────────────┴────────────┤
│          Footer (선택)            │
└──────────────────────────────────┘
```

**예시 설정:**
```json
{
  "layout": {
    "type": "2-column-right",
    "main": {
      "blocks": [
        {
          "blockName": "ProductGallery",
          "props": { "fieldKey": "field_product_images" },
          "order": 1
        },
        {
          "blockName": "ProductInfo",
          "props": { "fieldKey": "field_product_details" },
          "order": 2
        }
      ]
    },
    "sidebar": {
      "blocks": [
        {
          "blockName": "PriceBox",
          "props": { "priceField": "field_product_price" },
          "order": 1
        },
        {
          "blockName": "AddToCartButton",
          "props": {},
          "order": 2
        },
        {
          "blockName": "ShippingInfo",
          "props": {},
          "order": 3
        }
      ]
    }
  }
}
```

### 3.4 3-column (3단 레이아웃)

**특징:**
- 왼쪽: 좌측 사이드바 (20%)
- 중앙: 메인 콘텐츠 (60%)
- 오른쪽: 우측 사이드바 (20%)
- 복잡한 대시보드/포털 레이아웃

**적합한 용도:**
- 대시보드 페이지
- 포털 사이트
- 정보가 많은 페이지 (예: 통계, 메타데이터)

**시각적 구조:**
```
┌──────────────────────────────────┐
│          Header (선택)            │
├──────┬──────────────┬─────────────┤
│      │              │             │
│ Left │    Main      │    Right    │
│ Side │   Content    │    Side     │
│(20%) │   (60%)      │   (20%)     │
│      │              │             │
├──────┴──────────────┴─────────────┤
│          Footer (선택)            │
└──────────────────────────────────┘
```

**예시 설정:**
```json
{
  "layout": {
    "type": "3-column",
    "sidebar": {
      "blocks": [
        {
          "blockName": "CategoryNav",
          "props": {},
          "order": 1
        }
      ]
    },
    "main": {
      "blocks": [
        {
          "blockName": "MainContent",
          "props": { "fieldKey": "field_content" },
          "order": 1
        }
      ]
    },
    "footer": {
      "blocks": [
        {
          "blockName": "AuthorInfo",
          "props": { "fieldKey": "field_author" },
          "order": 1
        },
        {
          "blockName": "MetaInfo",
          "props": {},
          "order": 2
        }
      ]
    }
  }
}
```

**참고:**
- 3-column 레이아웃에서 `sidebar` = 좌측 사이드바, `footer` = 우측 사이드바로 사용됩니다.
- 모바일에서는 자동으로 1단 레이아웃으로 변환됩니다.

---

## 4. 슬롯 시스템

### 4.1 슬롯(Slot)이란?

**슬롯**은 블록들을 배치할 수 있는 **영역**입니다. 각 슬롯은 여러 개의 블록을 포함할 수 있습니다.

**4가지 슬롯:**
- **header**: 페이지 상단 (예: 브레드크럼, 히어로 이미지)
- **main**: 메인 콘텐츠 (필수)
- **sidebar**: 사이드바 (레이아웃에 따라 좌측 또는 우측)
- **footer**: 페이지 하단 (예: 관련 포스트, 댓글)

### 4.2 슬롯 구조

각 슬롯은 `blocks` 배열을 가지며, 각 블록은 다음 정보를 포함합니다:

```typescript
interface BlockReference {
  blockName: string;              // 블록 컴포넌트 이름
  props: Record<string, any>;     // 블록에 전달할 props
  presetId?: string;              // 중첩 프리셋 참조 (선택)
  order: number;                  // 표시 순서
}
```

### 4.3 블록 배치 예제

#### 예제 1: 메인 슬롯 (기본 블로그 포스트)

```json
{
  "main": {
    "blocks": [
      {
        "blockName": "TitleBlock",
        "props": {
          "fieldKey": "title",
          "size": "2xl",
          "className": "font-bold text-gray-900"
        },
        "order": 1
      },
      {
        "blockName": "MetaInfo",
        "props": {
          "showAuthor": true,
          "showDate": true,
          "dateFormat": "YYYY-MM-DD"
        },
        "order": 2
      },
      {
        "blockName": "FeaturedImage",
        "props": {
          "fieldKey": "field_featured_image",
          "aspectRatio": "16:9",
          "showCaption": true
        },
        "order": 3
      },
      {
        "blockName": "RichTextBlock",
        "props": {
          "fieldKey": "field_content"
        },
        "order": 4
      },
      {
        "blockName": "TagsBlock",
        "props": {
          "fieldKey": "field_tags"
        },
        "order": 5
      }
    ]
  }
}
```

#### 예제 2: 사이드바 슬롯 (상품 페이지)

```json
{
  "sidebar": {
    "blocks": [
      {
        "blockName": "PriceBox",
        "props": {
          "priceField": "field_product_price",
          "salePriceField": "field_sale_price",
          "currency": "KRW"
        },
        "order": 1
      },
      {
        "blockName": "StockStatus",
        "props": {
          "stockField": "field_stock_quantity",
          "lowStockThreshold": 10
        },
        "order": 2
      },
      {
        "blockName": "AddToCartButton",
        "props": {
          "buttonText": "장바구니 담기",
          "size": "large",
          "className": "w-full bg-blue-600 hover:bg-blue-700"
        },
        "order": 3
      },
      {
        "blockName": "ShippingInfo",
        "props": {
          "shippingFee": 3000,
          "freeShippingThreshold": 50000
        },
        "order": 4
      }
    ]
  }
}
```

#### 예제 3: 중첩 프리셋 사용

다른 프리셋을 블록으로 참조할 수 있습니다:

```json
{
  "footer": {
    "blocks": [
      {
        "blockName": "PresetRenderer",
        "props": {
          "type": "view"
        },
        "presetId": "view_related_posts_v1",
        "order": 1
      },
      {
        "blockName": "CommentSection",
        "props": {
          "showReplyButton": true,
          "maxDepth": 3
        },
        "order": 2
      }
    ]
  }
}
```

### 4.4 블록 순서 제어

`order` 필드는 블록의 표시 순서를 결정합니다:

```json
{
  "main": {
    "blocks": [
      { "blockName": "TitleBlock", "order": 1 },      // 1번째
      { "blockName": "ImageBlock", "order": 2 },      // 2번째
      { "blockName": "ContentBlock", "order": 3 }     // 3번째
    ]
  }
}
```

**권장사항:**
- `order`는 10 단위로 증가시키기 (예: 10, 20, 30...)
- 나중에 중간에 블록을 추가하기 쉬움 (예: 15를 추가)

---

## 5. SEO 및 Schema.org

### 5.1 SEO 메타 설정

Template Preset은 각 페이지의 SEO를 자동으로 최적화합니다.

#### 5.1.1 Title Template

제목 템플릿은 동적으로 제목을 생성합니다:

```json
{
  "seoMeta": {
    "titleTemplate": "{title} | My Site"
  }
}
```

**변수:**
- `{title}`: 포스트 제목
- `{cptName}`: CPT 이름
- `{siteName}`: 사이트 이름 (설정에서 가져옴)

**예시:**
```json
// 포스트 제목: "Awesome Product"
// titleTemplate: "{title} | My Shop"
// 결과: "Awesome Product | My Shop"
```

#### 5.1.2 Description Field

설명은 특정 ACF 필드에서 가져옵니다:

```json
{
  "seoMeta": {
    "descriptionField": "field_product_description"
  }
}
```

**동작:**
- `field_product_description` 값을 `<meta name="description">` 태그에 사용
- 값이 없으면 기본 설명 사용 (사이트 설정)

#### 5.1.3 OG Image (Open Graph)

소셜 미디어 공유 시 표시될 이미지:

```json
{
  "seoMeta": {
    "ogImageField": "field_featured_image"
  }
}
```

**생성되는 메타 태그:**
```html
<meta property="og:image" content="https://example.com/uploads/image.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://example.com/uploads/image.jpg" />
```

#### 5.1.4 Keywords (키워드)

**정적 키워드:**
```json
{
  "seoMeta": {
    "keywords": ["product", "shop", "ecommerce", "online store"]
  }
}
```

**동적 키워드 (ACF 필드):**
```json
{
  "seoMeta": {
    "keywords": ["product", "shop"],
    "keywordsField": "field_product_tags"
  }
}
```

**병합 동작:**
- 정적 키워드 + 동적 키워드가 결합됩니다.
- 중복 제거됩니다.

#### 5.1.5 Canonical URL

자동으로 생성됩니다:

```html
<link rel="canonical" href="https://example.com/products/awesome-product" />
```

### 5.2 Schema.org JSON-LD

Schema.org는 검색 엔진에 구조화된 데이터를 제공합니다.

#### 5.2.1 Product Schema

```json
{
  "schemaOrg": {
    "type": "Product",
    "fieldMapping": {
      "name": "field_product_name",
      "description": "field_product_description",
      "image": "field_product_image",
      "brand": "field_product_brand",
      "offers": {
        "price": "field_product_price",
        "priceCurrency": "KRW",
        "availability": "field_stock_status"
      }
    }
  }
}
```

**생성되는 JSON-LD:**
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Awesome Product",
  "description": "This is an awesome product...",
  "image": "https://example.com/uploads/product.jpg",
  "brand": {
    "@type": "Brand",
    "name": "My Brand"
  },
  "offers": {
    "@type": "Offer",
    "price": "99000",
    "priceCurrency": "KRW",
    "availability": "https://schema.org/InStock"
  }
}
```

#### 5.2.2 Article Schema

```json
{
  "schemaOrg": {
    "type": "Article",
    "fieldMapping": {
      "headline": "title",
      "description": "field_excerpt",
      "image": "field_featured_image",
      "author": {
        "name": "field_author_name"
      },
      "datePublished": "createdAt",
      "dateModified": "updatedAt"
    }
  }
}
```

**생성되는 JSON-LD:**
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "My Blog Post",
  "description": "A great article about...",
  "image": "https://example.com/uploads/post.jpg",
  "author": {
    "@type": "Person",
    "name": "John Doe"
  },
  "datePublished": "2025-10-31T10:00:00Z",
  "dateModified": "2025-10-31T15:30:00Z"
}
```

#### 5.2.3 Event Schema

```json
{
  "schemaOrg": {
    "type": "Event",
    "fieldMapping": {
      "name": "field_event_name",
      "description": "field_event_description",
      "startDate": "field_event_start_date",
      "endDate": "field_event_end_date",
      "location": {
        "name": "field_venue_name",
        "address": "field_venue_address"
      },
      "offers": {
        "price": "field_ticket_price",
        "priceCurrency": "KRW"
      }
    }
  }
}
```

#### 5.2.4 Organization Schema

```json
{
  "schemaOrg": {
    "type": "Organization",
    "fieldMapping": {
      "name": "field_company_name",
      "description": "field_company_description",
      "logo": "field_company_logo",
      "url": "field_website",
      "contactPoint": {
        "telephone": "field_phone",
        "contactType": "customer service"
      }
    }
  }
}
```

---

## 6. 권한 및 조건부 표시

### 6.1 역할 기반 접근 제어

Template Preset은 `roles` 필드로 접근을 제한할 수 있습니다:

```json
{
  "id": "template_product_premium_v1",
  "name": "Premium Product Template",
  "roles": ["admin", "premium_seller"],
  "config": { ... }
}
```

**동작:**
- `roles: null` 또는 `roles: []` → 모든 역할 접근 가능
- `roles: ["admin"]` → admin 역할만 접근 가능
- `roles: ["admin", "premium_seller"]` → 두 역할 중 하나만 있으면 접근 가능

### 6.2 블록 레벨 조건부 표시

블록의 `props`에 조건부 로직을 추가할 수 있습니다:

```json
{
  "blocks": [
    {
      "blockName": "PremiumBadge",
      "props": {
        "fieldKey": "field_is_premium",
        "visibility": {
          "condition": "field_is_premium == true"
        }
      },
      "order": 1
    }
  ]
}
```

**조건 연산자:**
- `==` (같음)
- `!=` (다름)
- `>` (크다)
- `<` (작다)
- `contains` (포함)

### 6.3 실전 예제: 조건부 블록 표시

#### 예제 1: 재고 있을 때만 구매 버튼 표시

```json
{
  "sidebar": {
    "blocks": [
      {
        "blockName": "AddToCartButton",
        "props": {
          "visibility": {
            "condition": "field_stock_quantity > 0"
          }
        },
        "order": 1
      },
      {
        "blockName": "OutOfStockMessage",
        "props": {
          "visibility": {
            "condition": "field_stock_quantity == 0"
          }
        },
        "order": 2
      }
    ]
  }
}
```

#### 예제 2: 프리미엄 회원만 할인 가격 표시

```json
{
  "main": {
    "blocks": [
      {
        "blockName": "RegularPrice",
        "props": {
          "fieldKey": "field_product_price"
        },
        "order": 1
      },
      {
        "blockName": "DiscountPrice",
        "props": {
          "fieldKey": "field_discount_price",
          "visibility": {
            "roles": ["premium_member"],
            "condition": "field_discount_price != null"
          }
        },
        "order": 2
      }
    ]
  }
}
```

---

## 7. 실전 예제

### 7.1 예제 1: 블로그 포스트 템플릿

**목표:** 표준 블로그 포스트 상세 페이지

```json
{
  "name": "Blog Post Template - Standard v1",
  "description": "표준 블로그 포스트 템플릿 (1단 레이아웃)",
  "cptSlug": "post",
  "version": 1,
  "roles": [],

  "config": {
    "layout": {
      "type": "1-column",
      "header": {
        "blocks": [
          {
            "blockName": "Breadcrumb",
            "props": {
              "showHome": true,
              "separator": "/"
            },
            "order": 1
          }
        ]
      },
      "main": {
        "blocks": [
          {
            "blockName": "CategoryBadge",
            "props": {
              "fieldKey": "field_category",
              "className": "mb-4"
            },
            "order": 1
          },
          {
            "blockName": "TitleBlock",
            "props": {
              "fieldKey": "title",
              "size": "3xl",
              "className": "font-bold text-gray-900 mb-4"
            },
            "order": 2
          },
          {
            "blockName": "PostMeta",
            "props": {
              "showAuthor": true,
              "showDate": true,
              "showReadTime": true,
              "dateFormat": "YYYY년 MM월 DD일"
            },
            "order": 3
          },
          {
            "blockName": "FeaturedImage",
            "props": {
              "fieldKey": "field_featured_image",
              "aspectRatio": "16:9",
              "showCaption": true,
              "className": "my-8"
            },
            "order": 4
          },
          {
            "blockName": "RichTextBlock",
            "props": {
              "fieldKey": "field_content",
              "className": "prose prose-lg max-w-none"
            },
            "order": 5
          },
          {
            "blockName": "TagsList",
            "props": {
              "fieldKey": "field_tags",
              "className": "mt-8"
            },
            "order": 6
          },
          {
            "blockName": "ShareButtons",
            "props": {
              "platforms": ["facebook", "twitter", "linkedin", "copy"],
              "showLabel": true
            },
            "order": 7
          }
        ]
      },
      "footer": {
        "blocks": [
          {
            "blockName": "AuthorBio",
            "props": {
              "authorField": "field_author",
              "showAvatar": true,
              "showBio": true
            },
            "order": 1
          },
          {
            "blockName": "PresetRenderer",
            "props": {
              "type": "view"
            },
            "presetId": "view_related_posts_v1",
            "order": 2
          },
          {
            "blockName": "CommentSection",
            "props": {
              "showReplyButton": true,
              "maxDepth": 3,
              "sortOrder": "newest"
            },
            "order": 3
          }
        ]
      }
    },

    "seoMeta": {
      "titleTemplate": "{title} | My Blog",
      "descriptionField": "field_excerpt",
      "ogImageField": "field_featured_image",
      "keywords": ["blog", "article"],
      "keywordsField": "field_tags"
    },

    "schemaOrg": {
      "type": "Article",
      "fieldMapping": {
        "headline": "title",
        "description": "field_excerpt",
        "image": "field_featured_image",
        "author": {
          "name": "field_author_name"
        },
        "datePublished": "createdAt",
        "dateModified": "updatedAt",
        "publisher": {
          "name": "My Blog",
          "logo": "https://myblog.com/logo.png"
        }
      }
    }
  }
}
```

### 7.2 예제 2: 상품 상세 페이지 템플릿

**목표:** 전자상거래 상품 상세 페이지 (2단 레이아웃)

```json
{
  "name": "Product Single Page Template v1",
  "description": "상품 상세 페이지 템플릿 (오른쪽 사이드바)",
  "cptSlug": "product",
  "version": 1,
  "roles": [],

  "config": {
    "layout": {
      "type": "2-column-right",
      "header": {
        "blocks": [
          {
            "blockName": "Breadcrumb",
            "props": {
              "showHome": true,
              "showCategory": true,
              "separator": ">"
            },
            "order": 1
          }
        ]
      },
      "main": {
        "blocks": [
          {
            "blockName": "ProductGallery",
            "props": {
              "imagesField": "field_product_images",
              "thumbnailField": "field_product_thumbnail",
              "zoomEnabled": true,
              "showThumbnails": true,
              "className": "mb-6"
            },
            "order": 1
          },
          {
            "blockName": "ProductTitle",
            "props": {
              "fieldKey": "field_product_name",
              "showBrand": true,
              "brandField": "field_product_brand"
            },
            "order": 2
          },
          {
            "blockName": "ProductRating",
            "props": {
              "ratingField": "field_product_rating",
              "reviewCountField": "field_review_count",
              "showStars": true
            },
            "order": 3
          },
          {
            "blockName": "ProductDescription",
            "props": {
              "fieldKey": "field_product_description",
              "className": "prose mt-6"
            },
            "order": 4
          },
          {
            "blockName": "ProductFeatures",
            "props": {
              "featuresField": "field_product_features",
              "showIcons": true
            },
            "order": 5
          },
          {
            "blockName": "ProductSpecs",
            "props": {
              "specsField": "field_product_specs",
              "layout": "table"
            },
            "order": 6
          }
        ]
      },
      "sidebar": {
        "blocks": [
          {
            "blockName": "PriceBox",
            "props": {
              "priceField": "field_product_price",
              "salePriceField": "field_sale_price",
              "currency": "KRW",
              "showDiscount": true
            },
            "order": 1
          },
          {
            "blockName": "StockStatus",
            "props": {
              "stockField": "field_stock_quantity",
              "lowStockThreshold": 10,
              "showQuantity": true
            },
            "order": 2
          },
          {
            "blockName": "QuantitySelector",
            "props": {
              "min": 1,
              "max": 99,
              "defaultValue": 1
            },
            "order": 3
          },
          {
            "blockName": "AddToCartButton",
            "props": {
              "buttonText": "장바구니 담기",
              "size": "large",
              "className": "w-full mb-2",
              "visibility": {
                "condition": "field_stock_quantity > 0"
              }
            },
            "order": 4
          },
          {
            "blockName": "BuyNowButton",
            "props": {
              "buttonText": "바로 구매",
              "size": "large",
              "className": "w-full mb-4",
              "variant": "primary",
              "visibility": {
                "condition": "field_stock_quantity > 0"
              }
            },
            "order": 5
          },
          {
            "blockName": "OutOfStockMessage",
            "props": {
              "message": "품절되었습니다",
              "showNotifyButton": true,
              "visibility": {
                "condition": "field_stock_quantity == 0"
              }
            },
            "order": 6
          },
          {
            "blockName": "ShippingInfo",
            "props": {
              "shippingFee": 3000,
              "freeShippingThreshold": 50000,
              "estimatedDays": "2-3일"
            },
            "order": 7
          },
          {
            "blockName": "WishlistButton",
            "props": {
              "icon": "heart",
              "text": "찜하기"
            },
            "order": 8
          }
        ]
      },
      "footer": {
        "blocks": [
          {
            "blockName": "ProductTabs",
            "props": {
              "tabs": [
                {
                  "id": "reviews",
                  "title": "리뷰",
                  "component": "ReviewsList"
                },
                {
                  "id": "qna",
                  "title": "Q&A",
                  "component": "QnAList"
                },
                {
                  "id": "shipping",
                  "title": "배송/교환/반품",
                  "component": "ShippingPolicy"
                }
              ]
            },
            "order": 1
          },
          {
            "blockName": "PresetRenderer",
            "props": {
              "type": "view",
              "title": "이 상품과 함께 본 상품"
            },
            "presetId": "view_related_products_v1",
            "order": 2
          }
        ]
      }
    },

    "seoMeta": {
      "titleTemplate": "{title} | My Shop",
      "descriptionField": "field_product_description",
      "ogImageField": "field_product_thumbnail",
      "keywords": ["product", "shop", "buy"],
      "keywordsField": "field_product_tags"
    },

    "schemaOrg": {
      "type": "Product",
      "fieldMapping": {
        "name": "field_product_name",
        "description": "field_product_description",
        "image": "field_product_images",
        "brand": {
          "@type": "Brand",
          "name": "field_product_brand"
        },
        "offers": {
          "@type": "Offer",
          "price": "field_product_price",
          "priceCurrency": "KRW",
          "availability": "field_stock_status",
          "url": "field_product_url"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "field_product_rating",
          "reviewCount": "field_review_count"
        }
      }
    }
  }
}
```

### 7.3 예제 3: 이벤트 상세 페이지 템플릿

**목표:** 이벤트/세미나 상세 페이지

```json
{
  "name": "Event Detail Template v1",
  "description": "이벤트 상세 페이지 템플릿",
  "cptSlug": "event",
  "version": 1,
  "roles": [],

  "config": {
    "layout": {
      "type": "2-column-right",
      "main": {
        "blocks": [
          {
            "blockName": "EventBanner",
            "props": {
              "imageField": "field_event_banner",
              "aspectRatio": "21:9"
            },
            "order": 1
          },
          {
            "blockName": "EventTitle",
            "props": {
              "fieldKey": "field_event_name",
              "size": "4xl"
            },
            "order": 2
          },
          {
            "blockName": "EventInfo",
            "props": {
              "dateField": "field_event_date",
              "timeField": "field_event_time",
              "venueField": "field_venue_name",
              "addressField": "field_venue_address",
              "showMap": true
            },
            "order": 3
          },
          {
            "blockName": "EventDescription",
            "props": {
              "fieldKey": "field_event_description",
              "className": "prose prose-lg"
            },
            "order": 4
          },
          {
            "blockName": "EventSchedule",
            "props": {
              "scheduleField": "field_event_schedule",
              "showTimeTable": true
            },
            "order": 5
          },
          {
            "blockName": "SpeakersList",
            "props": {
              "speakersField": "field_event_speakers",
              "showBio": true,
              "showPhoto": true
            },
            "order": 6
          }
        ]
      },
      "sidebar": {
        "blocks": [
          {
            "blockName": "EventStatus",
            "props": {
              "statusField": "field_event_status",
              "showBadge": true
            },
            "order": 1
          },
          {
            "blockName": "TicketInfo",
            "props": {
              "priceField": "field_ticket_price",
              "capacityField": "field_max_capacity",
              "bookedField": "field_booked_count",
              "showProgress": true
            },
            "order": 2
          },
          {
            "blockName": "RegistrationButton",
            "props": {
              "buttonText": "참가 신청",
              "size": "large",
              "className": "w-full",
              "visibility": {
                "condition": "field_event_status == 'open'"
              }
            },
            "order": 3
          },
          {
            "blockName": "EventClosedMessage",
            "props": {
              "message": "신청이 마감되었습니다",
              "visibility": {
                "condition": "field_event_status == 'closed'"
              }
            },
            "order": 4
          },
          {
            "blockName": "EventCountdown",
            "props": {
              "dateField": "field_event_date",
              "showDays": true,
              "showHours": true
            },
            "order": 5
          },
          {
            "blockName": "OrganizerInfo",
            "props": {
              "organizerField": "field_organizer",
              "showLogo": true,
              "showContact": true
            },
            "order": 6
          }
        ]
      }
    },

    "seoMeta": {
      "titleTemplate": "{title} | Events",
      "descriptionField": "field_event_description",
      "ogImageField": "field_event_banner",
      "keywords": ["event", "seminar", "conference"]
    },

    "schemaOrg": {
      "type": "Event",
      "fieldMapping": {
        "name": "field_event_name",
        "description": "field_event_description",
        "image": "field_event_banner",
        "startDate": "field_event_start_date",
        "endDate": "field_event_end_date",
        "location": {
          "@type": "Place",
          "name": "field_venue_name",
          "address": "field_venue_address"
        },
        "offers": {
          "@type": "Offer",
          "price": "field_ticket_price",
          "priceCurrency": "KRW",
          "availability": "field_event_status"
        },
        "performer": {
          "@type": "Person",
          "name": "field_speaker_names"
        }
      }
    }
  }
}
```

---

## 8. FAQ 및 문제 해결

### Q1: Template Preset과 View Preset의 차이가 무엇인가요?

**A:**

| 특징 | ViewPreset | TemplatePreset |
|------|-----------|----------------|
| 용도 | **목록** 페이지 | **단일** 페이지 |
| 데이터 | 여러 포스트 배열 | 하나의 포스트 |
| 렌더 모드 | list/grid/card/table | layout 타입 (1/2/3-column) |
| SEO | 기본 메타만 | 전체 SEO + Schema.org |
| 예시 | 상품 목록, 블로그 아카이브 | 상품 상세, 블로그 포스트 |

### Q2: 레이아웃을 나중에 변경할 수 있나요?

**A:** 네. 프리셋 편집 시 `layout.type`을 변경할 수 있습니다. 단, 레이아웃 타입에 따라 슬롯 구성이 달라지므로 블록 배치도 함께 조정해야 합니다.

**예시:**
- `1-column` → `2-column-right` 변경 시: `sidebar` 슬롯에 블록 추가 필요
- `2-column-right` → `3-column` 변경 시: `footer` 슬롯을 우측 사이드바로 사용

### Q3: OG 이미지가 소셜 미디어에 표시되지 않아요

**A:** 다음을 확인하세요:

1. **필드 값 확인:**
   ```bash
   # API로 포스트 데이터 확인
   curl https://api.neture.co.kr/api/v1/posts/{id}
   # field_featured_image 값이 있는지 확인
   ```

2. **이미지 URL이 절대 경로인지 확인:**
   - ✓ `https://example.com/uploads/image.jpg`
   - ✗ `/uploads/image.jpg` (상대 경로는 안 됨)

3. **이미지 크기 확인:**
   - 최소: 200x200px
   - 권장: 1200x630px (Facebook/Twitter OG)

4. **소셜 미디어 캐시 삭제:**
   - Facebook: <https://developers.facebook.com/tools/debug/>
   - Twitter: <https://cards-dev.twitter.com/validator>

### Q4: Schema.org JSON-LD가 생성되지 않아요

**A:** 다음을 확인하세요:

1. **config.schemaOrg 존재 여부:**
   ```json
   {
     "config": {
       "schemaOrg": {  // ← 이 부분이 있는지 확인
         "type": "Product",
         "fieldMapping": { ... }
       }
     }
   }
   ```

2. **필드 매핑 검증:**
   ```bash
   # 브라우저 개발자 도구 → Elements 탭에서 <script type="application/ld+json"> 검색
   ```

3. **JSON-LD 검증 도구 사용:**
   - Google Rich Results Test: <https://search.google.com/test/rich-results>

### Q5: 권한 조건이 작동하지 않아요

**A:**

**1. roles 필드 확인:**
```json
{
  "roles": ["admin", "seller"]  // ← 현재 사용자 역할이 포함되어 있는지
}
```

**2. visibility 조건 확인:**
```json
{
  "visibility": {
    "condition": "field_stock_quantity > 0"  // ← 필드 키와 연산자 확인
  }
}
```

**3. 디버깅:**
```typescript
// 브라우저 콘솔에서 확인
console.log('User Role:', currentUser.role);
console.log('Preset Roles:', preset.roles);
console.log('Field Value:', postData.field_stock_quantity);
```

### Q6: 중첩 프리셋(presetId)이 렌더링되지 않아요

**A:**

**1. presetId 유효성 확인:**
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://api.neture.co.kr/api/v1/presets/views/view_related_posts_v1
```

**2. 블록 설정 확인:**
```json
{
  "blockName": "PresetRenderer",  // ← 반드시 "PresetRenderer"
  "props": {
    "type": "view"  // ← 프리셋 타입 명시
  },
  "presetId": "view_related_posts_v1"  // ← presetId 필드 사용
}
```

### Q7: 모바일에서 레이아웃이 깨져요

**A:** Template Preset은 자동으로 반응형 처리됩니다:

- 모바일 (< 768px): 모든 레이아웃이 1단으로 변경
- 순서: header → main → sidebar → footer

**커스텀이 필요한 경우:**
```css
/* 모바일에서 특정 블록 숨기기 */
@media (max-width: 768px) {
  .block-desktop-only {
    display: none;
  }
}
```

### Q8: 블록 순서를 동적으로 변경할 수 있나요?

**A:** 아니요. 블록 순서는 `order` 필드로 고정됩니다. 동적 순서 변경이 필요하면:

1. **여러 템플릿 프리셋 생성:**
   - `template_product_layout_a_v1`
   - `template_product_layout_b_v1`

2. **조건에 따라 프리셋 선택:**
   ```typescript
   const presetId = product.featured
     ? 'template_product_layout_a_v1'
     : 'template_product_layout_b_v1';
   ```

### Q9: SEO 제목에 특수 문자가 깨져요

**A:**

**문제:**
```json
{
  "titleTemplate": "{title} | My Site™"  // ™ 등의 특수 문자
}
```

**해결:**
1. HTML 엔티티 사용:
   ```json
   {
     "titleTemplate": "{title} | My Site&trade;"
   }
   ```

2. 또는 유니코드 이스케이프:
   ```json
   {
     "titleTemplate": "{title} | My Site\u2122"
   }
   ```

### Q10: 프리셋을 삭제하면 기존 페이지에 영향이 있나요?

**A:**

**삭제 시:**
- ✗ 프리셋을 사용하는 페이지는 "Preset not found" 오류 표시
- ✓ 기존 포스트 데이터는 유지됨

**권장사항:**
1. **삭제 대신 비활성화:**
   ```json
   {
     "isActive": false
   }
   ```

2. **사용 중인 페이지 확인 후 삭제:**
   ```bash
   # 프리셋을 사용하는 페이지 검색
   grep -r "template_product_single_v1" /path/to/content
   ```

---

## 추가 리소스

### 관련 가이드
- **Form Preset 가이드:** [cpt-preset-form-guide.md](./cpt-preset-form-guide.md)
- **View Preset 가이드:** [cpt-preset-view-guide.md](./cpt-preset-view-guide.md)
- **API 레퍼런스:** [cpt-preset-api-reference.md](./cpt-preset-api-reference.md)
- **개발자 가이드:** [cpt-preset-developer-guide.md](./cpt-preset-developer-guide.md)
- **시스템 개요:** [cpt-preset-system.md](./cpt-preset-system.md)

### 외부 리소스
- **Schema.org 문서:** <https://schema.org/>
- **Open Graph 프로토콜:** <https://ogp.me/>
- **Google Rich Results Test:** <https://search.google.com/test/rich-results>
- **Facebook Sharing Debugger:** <https://developers.facebook.com/tools/debug/>

---

**마지막 업데이트:** 2025-10-31
**작성자:** O4O Platform Team
