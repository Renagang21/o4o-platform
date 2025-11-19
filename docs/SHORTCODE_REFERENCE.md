# O4O Platform Shortcode 참조 가이드

본 문서는 O4O 플랫폼에서 사용 가능한 모든 shortcode의 상세 속성과 예제를 포함합니다.

**작성일**: 2025-11-19
**버전**: 1.0

---

## 목차

1. [인증 Shortcodes](#1-인증-shortcodes)
2. [드랍쉬핑 - 파트너 Shortcodes](#2-드랍쉬핑---파트너-shortcodes)
3. [드랍쉬핑 - 공급자 Shortcodes](#3-드랍쉬핑---공급자-shortcodes)
4. [드랍쉬핑 - 판매자 Shortcodes](#4-드랍쉬핑---판매자-shortcodes)
5. [드랍쉬핑 - 일반 Shortcodes](#5-드랍쉬핑---일반-shortcodes)
6. [동적 CPT Shortcodes](#6-동적-cpt-shortcodes)
7. [동적 ACF/Meta Shortcodes](#7-동적-acfmeta-shortcodes)

---

## 1. 인증 Shortcodes

### 1.1 `[social_login]`

소셜 로그인 버튼을 표시합니다.

**카테고리**: Authentication
**인증 필요**: ❌ (로그인 전 사용)

#### 속성

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `providers` | string | ❌ | `google,kakao,naver` | 표시할 로그인 제공자 (쉼표로 구분) |
| `redirect` | string | ❌ | - | 로그인 성공 후 이동할 URL |
| `buttonStyle` | select | ❌ | `default` | 버튼 스타일: `default`, `icon-only`, `full-width` |

#### 사용 예제

```
[social_login]
[social_login providers="google,kakao"]
[social_login providers="google" redirect="/dashboard" buttonStyle="full-width"]
```

#### 화면 예시

```
┌─────────────────────────────┐
│ Google로 로그인             │
├─────────────────────────────┤
│ Kakao로 로그인              │
├─────────────────────────────┤
│ Naver로 로그인              │
└─────────────────────────────┘
```

---

### 1.2 `[login_form]`

일반 로그인 폼을 표시합니다.

**카테고리**: Authentication
**인증 필요**: ❌

#### 속성

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `redirect` | string | ❌ | - | 로그인 성공 후 이동할 URL |

#### 사용 예제

```
[login_form]
[login_form redirect="/dashboard"]
```

---

### 1.3 `[oauth_login]`

OAuth 로그인 버튼만 표시합니다.

**카테고리**: Authentication
**인증 필요**: ❌

#### 속성

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `providers` | string | ❌ | `google,kakao,naver` | 표시할 OAuth 제공자 |

#### 사용 예제

```
[oauth_login]
[oauth_login providers="google"]
```

---

## 2. 드랍쉬핑 - 파트너 Shortcodes

### 2.1 `[partner_dashboard]`

파트너 메인 대시보드 - 총 수익, 전환율, 개인 추천 링크를 보여주는 통합 UI

**카테고리**: Partner Portal
**인증 필요**: ✅

#### 속성

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `tab` | select | ❌ | `overview` | 기본 표시 탭 |

**tab 옵션**:
- `overview`: 전체 개요
- `commissions`: 커미션 내역
- `links`: 링크 관리

#### 사용 예제

```
[partner_dashboard]
[partner_dashboard tab="overview"]
[partner_dashboard tab="commissions"]
```

#### 화면 구성

```
┌──────────────────────────────────────────┐
│ 파트너 대시보드                          │
├──────────────────────────────────────────┤
│ 📊 총 수익    💰 이번달 수익   📈 전환율 │
│ ₩1,234,567   ₩345,000         3.4%      │
├──────────────────────────────────────────┤
│ [개요] [커미션] [링크]                   │
├──────────────────────────────────────────┤
│ (선택한 탭의 내용 표시)                  │
└──────────────────────────────────────────┘
```

---

### 2.2 `[partner_products]`

파트너가 추천할 수 있는 상품 목록 및 링크 생성 기능

**카테고리**: Partner Portal
**인증 필요**: ✅

#### 속성

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `category` | string | ❌ | - | 상품 카테고리 필터 |
| `featured` | boolean | ❌ | `false` | 추천 상품만 표시 |
| `limit` | number | ❌ | `12` | 표시할 상품 수 |
| `sortBy` | select | ❌ | `commission` | 정렬 기준 |

**sortBy 옵션**:
- `commission`: 커미션 높은 순
- `performance`: 성과 좋은 순
- `price`: 가격순
- `newest`: 최신순

#### 사용 예제

```
[partner_products]
[partner_products category="electronics" limit="9"]
[partner_products featured="true" sortBy="commission"]
[partner_products category="fashion" limit="12" sortBy="performance"]
```

---

### 2.3 `[partner_commissions]`

파트너 커미션 내역 및 정산 상태

**카테고리**: Partner Portal
**인증 필요**: ✅

#### 속성

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `period` | select | ❌ | `30d` | 조회 기간 |
| `status` | select | ❌ | `all` | 커미션 상태 필터 |
| `compact` | boolean | ❌ | `false` | 간략한 레이아웃 사용 |
| `showSummary` | boolean | ❌ | `true` | 요약 카드 표시 |

**period 옵션**: `7d`, `30d`, `90d`, `1y`
**status 옵션**: `all`, `pending`, `approved`, `paid`, `cancelled`

#### 사용 예제

```
[partner_commissions]
[partner_commissions period="30d" status="all"]
[partner_commissions period="90d" status="pending" compact="true"]
[partner_commissions showSummary="false"]
```

#### 화면 구성

```
┌────────────────────────────────────────┐
│ 커미션 요약 (showSummary=true일 때)   │
│ 총 커미션: ₩456,789                   │
│ 대기 중: ₩123,456 | 승인됨: ₩333,333 │
├────────────────────────────────────────┤
│ 날짜       | 주문번호 | 금액  | 상태  │
│ 2025-11-18 | #12345  | ₩5,000| 승인됨│
│ 2025-11-17 | #12344  | ₩8,900| 대기  │
└────────────────────────────────────────┘
```

---

### 2.4 `[partner_link_generator]`

파트너 링크 생성기

**카테고리**: Partner Tools
**인증 필요**: ✅

#### 속성

없음 (속성 없이 사용)

#### 사용 예제

```
[partner_link_generator]
```

---

### 2.5 `[partner_commission_dashboard]`

상세한 커미션 대시보드

**카테고리**: Partner Analytics
**인증 필요**: ✅

#### 속성

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `dateRange` | select | ❌ | `30d` | 데이터 조회 기간 |

**dateRange 옵션**: `7d`, `30d`, `90d`, `1y`

#### 사용 예제

```
[partner_commission_dashboard]
[partner_commission_dashboard dateRange="90d"]
```

---

### 2.6 `[partner_payout_requests]`

정산 요청 관리

**카테고리**: Partner Payments
**인증 필요**: ✅

#### 속성

없음

#### 사용 예제

```
[partner_payout_requests]
```

---

## 3. 드랍쉬핑 - 공급자 Shortcodes

### 3.1 `[supplier_dashboard]`

공급자 메인 대시보드

**카테고리**: Supplier Portal
**인증 필요**: ✅

#### 속성

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `view` | select | ❌ | `overview` | 기본 뷰 |

**view 옵션**:
- `overview`: 전체 개요
- `orders`: 주문 처리
- `catalog`: 상품 카탈로그
- `settlements`: 정산 내역

#### 사용 예제

```
[supplier_dashboard]
[supplier_dashboard view="overview"]
[supplier_dashboard view="orders"]
```

#### 화면 구성

```
┌─────────────────────────────────────┐
│ 공급자 대시보드                     │
├─────────────────────────────────────┤
│ 📦 총 상품   📋 주문   💰 정산    │
│ 245개       128건    ₩2,345,678   │
├─────────────────────────────────────┤
│ [개요] [주문] [상품] [정산]        │
└─────────────────────────────────────┘
```

---

### 3.2 `[supplier_products]`

공급자 상품 목록

**카테고리**: Supplier Portal
**인증 필요**: ✅

#### 속성

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `limit` | number | ❌ | `12` | 표시할 상품 수 |
| `category` | string | ❌ | - | 카테고리 필터 |
| `status` | select | ❌ | `all` | 상품 상태 필터 |
| `showStats` | boolean | ❌ | `true` | 통계 표시 여부 |

**status 옵션**: `all`, `active`, `pending`, `rejected`

#### 사용 예제

```
[supplier_products]
[supplier_products limit="12" status="active"]
[supplier_products category="electronics" showStats="false"]
```

---

### 3.3 `[supplier_product_editor]`

공급자 상품 편집기

**카테고리**: Supplier Portal
**인증 필요**: ✅

#### 속성

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `productId` | string | ❌ | - | 편집할 상품 ID |
| `mode` | select | ❌ | `edit` | 편집 모드 |
| `autoSave` | boolean | ❌ | `false` | 자동 저장 활성화 |

**mode 옵션**: `create`, `edit`

#### 사용 예제

```
[supplier_product_editor mode="create"]
[supplier_product_editor productId="123" mode="edit"]
[supplier_product_editor productId="123" autoSave="true"]
```

---

## 4. 드랍쉬핑 - 판매자 Shortcodes

### 4.1 `[seller_dashboard]`

판매자 메인 대시보드

**카테고리**: Seller Portal
**인증 필요**: ✅

#### 속성

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `view` | select | ❌ | `overview` | 기본 뷰 |
| `period` | select | ❌ | `30d` | 데이터 조회 기간 |

**view 옵션**:
- `overview`: 전체 개요
- `orders`: 주문 관리
- `products`: 상품 관리
- `analytics`: 매출 분석

**period 옵션**: `7d`, `30d`, `90d`, `1y`

#### 사용 예제

```
[seller_dashboard]
[seller_dashboard view="overview" period="30d"]
[seller_dashboard view="analytics" period="90d"]
```

#### 화면 구성

```
┌─────────────────────────────────────┐
│ 판매자 대시보드                     │
├─────────────────────────────────────┤
│ 💰 총 마진   📊 전환율   🔗 링크  │
│ ₩567,890    2.8%        12개      │
├─────────────────────────────────────┤
│ [개요] [주문] [상품] [분석]        │
└─────────────────────────────────────┘
```

---

### 4.2 `[seller_products]`

판매자 상품 목록

**카테고리**: Seller Portal
**인증 필요**: ✅

#### 속성

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `limit` | number | ❌ | `12` | 표시할 상품 수 |
| `category` | string | ❌ | - | 카테고리 필터 |
| `featured` | boolean | ❌ | `false` | 추천 상품만 표시 |

#### 사용 예제

```
[seller_products]
[seller_products limit="9" featured="true"]
[seller_products category="fashion"]
```

---

### 4.3 `[seller_settlement]`

판매자 정산 내역

**카테고리**: Seller Portal
**인증 필요**: ✅

#### 속성

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `period` | select | ❌ | `30d` | 조회 기간 |
| `status` | select | ❌ | `all` | 정산 상태 필터 |

**period 옵션**: `7d`, `30d`, `90d`, `1y`
**status 옵션**: `all`, `pending`, `paid`

#### 사용 예제

```
[seller_settlement]
[seller_settlement period="30d" status="all"]
[seller_settlement period="90d" status="pending"]
```

---

## 5. 드랍쉬핑 - 일반 Shortcodes

### 5.1 `[user_dashboard]`

역할 기반 사용자 대시보드

**카테고리**: User Management
**인증 필요**: ✅

#### 속성

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `role` | select | ❌ | (자동 감지) | 표시할 역할 대시보드 |

**role 옵션**: `supplier`, `seller`, `affiliate`, `partner`

#### 사용 예제

```
[user_dashboard]
[user_dashboard role="partner"]
[user_dashboard role="seller"]
```

#### 동작 방식

- 속성 없이 사용 시: 현재 로그인한 사용자의 역할에 맞는 대시보드 자동 표시
- `role` 속성 지정 시: 해당 역할의 대시보드 강제 표시 (권한 체크)

---

### 5.2 `[role_verification]`

역할 인증 폼

**카테고리**: User Management
**인증 필요**: ❌

#### 속성

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `type` | select | ✅ | - | 인증할 역할 타입 |

**type 옵션**: `supplier`, `seller`, `affiliate`, `partner`

#### 사용 예제

```
[role_verification type="partner"]
[role_verification type="supplier"]
[role_verification type="seller"]
```

---

## 6. 동적 CPT Shortcodes

### 6.1 `[cpt_list]`

커스텀 포스트 타입 목록 출력

**카테고리**: CPT Data
**인증 필요**: ❌

#### 속성

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `type` | string | ✅ | - | CPT 타입 (예: `ds_product`, `ds_supplier`) |
| `count` | number | ❌ | `10` | 표시할 항목 수 |
| `template` | select | ❌ | `default` | 레이아웃 템플릿 |
| `columns` | number | ❌ | `3` | 그리드 컬럼 수 (grid 템플릿) |
| `show_thumbnail` | boolean | ❌ | `false` | 썸네일 이미지 표시 |
| `show_excerpt` | boolean | ❌ | `false` | 발췌문 표시 |
| `show_meta` | boolean | ❌ | `false` | 메타 정보 표시 (날짜, 작성자 등) |
| `orderby` | select | ❌ | `date` | 정렬 기준 |
| `order` | select | ❌ | `DESC` | 정렬 순서 |
| `category` | string | ❌ | - | 카테고리 필터 |
| `tag` | string | ❌ | - | 태그 필터 |

**template 옵션**:
- `default`: 기본 목록
- `grid`: 그리드 레이아웃
- `list`: 리스트 레이아웃
- `card`: 카드 레이아웃

**orderby 옵션**: `date`, `title`, `modified`, `random`
**order 옵션**: `ASC`, `DESC`

#### 사용 예제

**기본 사용**:
```
[cpt_list type="ds_product"]
[cpt_list type="ds_product" count="6"]
```

**그리드 레이아웃**:
```
[cpt_list type="ds_product" count="6" template="grid" columns="3" show_thumbnail="true"]
```

**리스트 레이아웃**:
```
[cpt_list type="ds_supplier" count="10" template="list" show_meta="true"]
```

**카드 레이아웃 (최신순)**:
```
[cpt_list type="ds_product" count="4" template="card" orderby="date" order="DESC"]
```

**카테고리 필터**:
```
[cpt_list type="ds_product" category="electronics" count="12" template="grid" columns="4"]
```

#### 화면 예시 (grid 템플릿, columns="3")

```
┌─────────┐ ┌─────────┐ ┌─────────┐
│ [이미지]│ │ [이미지]│ │ [이미지]│
│ 상품 A  │ │ 상품 B  │ │ 상품 C  │
│ 설명... │ │ 설명... │ │ 설명... │
└─────────┘ └─────────┘ └─────────┘
┌─────────┐ ┌─────────┐ ┌─────────┐
│ [이미지]│ │ [이미지]│ │ [이미지]│
│ 상품 D  │ │ 상품 E  │ │ 상품 F  │
└─────────┘ └─────────┘ └─────────┘
```

---

### 6.2 `[cpt_field]`

CPT 필드값 출력

**카테고리**: CPT Fields
**인증 필요**: ❌

#### 속성

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `field` | string | ✅ | - | 필드명 |
| `post_id` | string | ❌ | `current` | 포스트 ID |
| `post_type` | string | ❌ | `post` | 포스트 타입 |
| `format` | string | ❌ | - | 포맷 타입 |
| `default` | string | ❌ | - | 기본값 (값이 없을 때) |
| `before` | string | ❌ | - | 값 앞에 추가할 텍스트 |
| `after` | string | ❌ | - | 값 뒤에 추가할 텍스트 |
| `wrapper` | string | ❌ | `span` | 래퍼 HTML 태그 |
| `class` | string | ❌ | - | CSS 클래스 |

**field 옵션 (기본 필드)**:
- `title`: 제목
- `content`: 본문
- `excerpt`: 발췌문
- `date`: 작성일
- `modified`: 수정일
- `author`: 작성자
- `featured_image`: 대표 이미지
- `permalink`: 링크
- 커스텀 필드명도 가능

**format 옵션** (field 타입에 따라):
- `date`: 날짜 포맷 (`date`, `relative`)
- `currency`: 원화 표시
- `number`: 숫자 포맷 (`comma`)
- `excerpt`: 글자 수 제한 (예: `excerpt:100`)

#### 사용 예제

**기본 필드**:
```
[cpt_field field="title"]
[cpt_field field="date" format="date"]
[cpt_field field="featured_image"]
```

**가격 필드 (원화 포맷)**:
```
[cpt_field field="price" format="currency"]
[cpt_field field="price" format="currency" before="가격: " after="원"]
```

**발췌문 (100자 제한)**:
```
[cpt_field field="excerpt" format="excerpt:100"]
```

**커스텀 스타일**:
```
[cpt_field field="stock_status" wrapper="span" class="badge badge-success"]
```

**특정 포스트의 필드**:
```
[cpt_field field="title" post_id="123" post_type="ds_product"]
```

**기본값 지정**:
```
[cpt_field field="custom_field" default="정보 없음"]
```

#### 출력 예시

```html
<!-- [cpt_field field="price" format="currency"] -->
₩25,000

<!-- [cpt_field field="price" format="currency" before="가격: " after="원"] -->
가격: ₩25,000원

<!-- [cpt_field field="stock_status" wrapper="span" class="badge"] -->
<span class="badge">재고 있음</span>
```

---

## 7. 동적 ACF/Meta Shortcodes

### 7.1 `[acf_field]`

ACF (Advanced Custom Fields) 필드값 출력

**카테고리**: ACF Fields
**인증 필요**: ❌

#### 속성

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `name` | string | ✅ | - | ACF 필드명 |
| `post_id` | string | ❌ | `current` | 포스트 ID |
| `format` | string | ❌ | - | 포맷 타입 |
| `type` | string | ❌ | (자동 감지) | ACF 필드 타입 |
| `size` | string | ❌ | `full` | 이미지 크기 (image 타입) |
| `default` | string | ❌ | - | 기본값 |
| `wrapper` | string | ❌ | `span` | 래퍼 태그 |
| `class` | string | ❌ | - | CSS 클래스 |

**type 옵션** (ACF 필드 타입):
- `text`, `textarea`, `wysiwyg`: 텍스트
- `number`: 숫자
- `email`, `url`: 링크
- `image`: 이미지
- `gallery`: 갤러리
- `file`: 파일
- `select`, `radio`, `checkbox`: 선택
- `true_false`: 참/거짓
- `date_picker`, `date_time_picker`, `time_picker`: 날짜/시간
- `relationship`, `post_object`: 관계
- `taxonomy`: 분류
- `user`: 사용자

**format 옵션**:
- `currency`: 원화 표시
- `date`: 날짜 포맷
- `number`: 숫자 포맷

**size 옵션** (이미지 필드):
- `thumbnail`, `medium`, `large`, `full`

#### 사용 예제

**텍스트 필드**:
```
[acf_field name="supplier_info"]
[acf_field name="supplier_info" default="정보 없음"]
```

**가격 필드**:
```
[acf_field name="custom_price" format="currency"]
[acf_field name="wholesale_price" format="currency"]
```

**이미지 필드**:
```
[acf_field name="product_image" type="image"]
[acf_field name="product_image" type="image" size="medium"]
```

**갤러리 필드**:
```
[acf_field name="product_gallery" type="gallery"]
```

**참/거짓 필드**:
```
[acf_field name="is_featured" type="true_false"]
```

**날짜 필드**:
```
[acf_field name="launch_date" type="date_picker"]
```

**재고 상태 (뱃지)**:
```
[acf_field name="stock_status" wrapper="span" class="stock-badge"]
```

**특정 포스트의 ACF 필드**:
```
[acf_field name="custom_price" post_id="123"]
```

#### 출력 예시

```html
<!-- [acf_field name="custom_price" format="currency"] -->
₩35,000

<!-- [acf_field name="is_featured" type="true_false"] -->
예

<!-- [acf_field name="product_image" type="image" size="medium"] -->
<img src="/uploads/2025/11/product-300x300.jpg" alt="상품 이미지" class="acf-field-image" loading="lazy" />

<!-- [acf_field name="product_gallery" type="gallery"] -->
<div class="acf-field-gallery">
  <img src="/uploads/gallery-1.jpg" alt="" class="acf-gallery-image" loading="lazy" />
  <img src="/uploads/gallery-2.jpg" alt="" class="acf-gallery-image" loading="lazy" />
  <img src="/uploads/gallery-3.jpg" alt="" class="acf-gallery-image" loading="lazy" />
</div>
```

---

### 7.2 `[meta_field]`

워드프레스 메타 필드값 출력

**카테고리**: Meta Fields
**인증 필요**: ❌

#### 속성

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `key` | string | ✅ | - | 메타 키 |
| `post_id` | string | ❌ | `current` | 포스트 ID |
| `format` | string | ❌ | - | 포맷 타입 |
| `default` | string | ❌ | - | 기본값 |
| `wrapper` | string | ❌ | `span` | 래퍼 태그 |
| `class` | string | ❌ | - | CSS 클래스 |

**format 옵션**:
- `number`: 숫자 포맷
- `currency`: 원화 표시
- `date`: 날짜 포맷

#### 사용 예제

**재고 상태**:
```
[meta_field key="_stock_status"]
[meta_field key="_stock_status" default="재고 확인 중"]
```

**조회수**:
```
[meta_field key="_view_count" format="number"]
```

**가격**:
```
[meta_field key="_price" format="currency"]
```

**썸네일 ID**:
```
[meta_field key="_thumbnail_id"]
```

**특정 포스트의 메타**:
```
[meta_field key="_stock_status" post_id="123"]
```

#### 출력 예시

```html
<!-- [meta_field key="_stock_status"] -->
재고 있음

<!-- [meta_field key="_view_count" format="number"] -->
1,234

<!-- [meta_field key="_price" format="currency"] -->
₩25,000
```

---

## 8. 사용 팁 및 모범 사례

### 8.1 Shortcode 조합 사용

여러 shortcode를 조합하여 복잡한 페이지를 구성할 수 있습니다.

**예제: 상품 상세 페이지**

```
<h1>[cpt_field field="title"]</h1>

<div class="product-price">
  [acf_field name="price" format="currency"]
</div>

<div class="product-gallery">
  [acf_field name="product_gallery" type="gallery"]
</div>

<div class="product-description">
  [cpt_field field="content"]
</div>

<div class="product-meta">
  재고: [acf_field name="stock_status"]<br>
  공급자: [acf_field name="supplier_name"]
</div>
```

**예제: 상품 목록 페이지**

```
<h2>최신 상품</h2>
[cpt_list type="ds_product" count="12" template="grid" columns="4" show_thumbnail="true" orderby="date"]

<h2>추천 상품</h2>
[cpt_list type="ds_product" count="6" template="card" category="featured"]
```

---

### 8.2 조건부 표시

특정 조건에서만 shortcode를 표시하고 싶을 때는 `default` 속성을 활용합니다.

```
재고: [acf_field name="stock_quantity" default="품절"]
```

---

### 8.3 CSS 스타일링

`class` 속성을 활용하여 커스텀 스타일을 적용할 수 있습니다.

```
[acf_field name="stock_status" wrapper="span" class="badge badge-success"]
[cpt_field field="price" format="currency" class="text-primary font-bold"]
```

---

### 8.4 인증이 필요한 Shortcode

인증이 필요한 shortcode(✅ 표시)는 반드시 로그인된 사용자만 볼 수 있는 페이지에 사용해야 합니다.

로그인하지 않은 사용자가 접근할 경우:
```
┌───────────────────────────────┐
│ 로그인이 필요한 페이지입니다. │
│ [로그인 하기]                  │
└───────────────────────────────┘
```

---

### 8.5 에러 처리

Shortcode가 오류를 발생시킬 경우 다음과 같이 표시됩니다:

```
[오류: 필수 속성 'type'이 누락되었습니다.]
[오류: 포스트를 찾을 수 없습니다.]
```

---

## 9. Shortcode 별 API 의존성

### 9.1 드랍쉬핑 Shortcodes

| Shortcode | API 엔드포인트 |
|-----------|----------------|
| `partner_dashboard` | `/api/v2/partner/dashboard` |
| `partner_products` | `/api/v2/partner/products` |
| `partner_commissions` | `/api/v2/partner/commissions` |
| `supplier_dashboard` | `/api/v2/supplier/dashboard` |
| `supplier_products` | `/api/v2/supplier/products` |
| `seller_dashboard` | `/api/v2/seller/dashboard` |
| `seller_products` | `/api/v2/seller/products` |
| `seller_settlement` | `/api/v2/seller/settlements` |

### 9.2 동적 Shortcodes

| Shortcode | API 엔드포인트 |
|-----------|----------------|
| `cpt_list` | `/api/cpt-engine/content/{type}` |
| `cpt_field` | `/api/cpt-engine/content/{type}/{id}` |
| `acf_field` | `/api/acf/fields/{post_id}` |
| `meta_field` | `/api/meta/{post_id}` |

---

## 10. 자주 묻는 질문 (FAQ)

### Q1: Shortcode 속성에 공백이 들어가도 되나요?

**A**: 네, 가능합니다. 다음은 모두 정상 작동합니다:

```
[cpt_list type="ds_product"]
[cpt_list type = "ds_product"]
[cpt_list type= "ds_product"]
[cpt_list type ="ds_product"]
```

---

### Q2: 여러 shortcode를 한 줄에 사용할 수 있나요?

**A**: 네, 가능합니다. 하지만 가독성을 위해 줄 바꿈을 권장합니다.

```
<!-- 가능하지만 비권장 -->
가격: [cpt_field field="price" format="currency"] / 재고: [acf_field name="stock"]

<!-- 권장 -->
가격: [cpt_field field="price" format="currency"]
재고: [acf_field name="stock"]
```

---

### Q3: Shortcode가 작동하지 않을 때는?

**A**: 다음을 확인하세요:

1. **필수 속성 확인**: 필수 속성(`✅` 표시)을 모두 입력했는지 확인
2. **인증 상태 확인**: 인증이 필요한 shortcode는 로그인 후 사용
3. **API 엔드포인트**: 백엔드 API가 정상 작동하는지 확인
4. **오타 확인**: shortcode 이름과 속성명에 오타가 없는지 확인

---

### Q4: 커스텀 shortcode를 추가할 수 있나요?

**A**: 네, 다음 파일에서 등록할 수 있습니다:

- **패키지**: `packages/shortcodes/src/registry.ts`
- **앱**: `apps/main-site/src/components/shortcodes/`

자세한 내용은 개발 가이드를 참고하세요.

---

## 11. 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2025-11-19 | 초기 문서 작성 - 전체 shortcode 목록 및 속성 정리 |

---

**문서 끝**
