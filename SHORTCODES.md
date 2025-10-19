# O4O Platform Shortcode 사용자 가이드

> **빠른 시작**: `[shortcode_name attribute="value"]` 형태로 페이지에 동적 콘텐츠를 삽입

---

## 📑 목차

1. [Shortcode란?](#-shortcode란)
2. [기본 사용법](#-기본-사용법)
3. [Shortcode 목록](#-shortcode-목록)
   - [콘텐츠](#콘텐츠)
   - [미디어](#미디어)
   - [E-commerce](#e-commerce)
   - [폼](#폼)
   - [드롭쉬핑](#드롭쉬핑)
   - [동적 필드 (CPT/ACF)](#동적-필드-cptacf)
4. [고급 기능](#-고급-기능)
5. [문제 해결](#-문제-해결)

---

## 🎯 Shortcode란?

Shortcode는 페이지나 게시물에 **동적 콘텐츠를 삽입**하는 간단한 방법입니다. 복잡한 기능을 짧은 코드로 표현할 수 있습니다.

**예시:**
```
[product_grid category="전자제품" limit="8"]
```
→ 전자제품 카테고리의 상품 8개를 그리드로 표시

---

## 💡 기본 사용법

### 구조

```
[shortcode_name attribute1="value1" attribute2="value2"]
```

### 속성 규칙

1. **필수 속성**: 반드시 입력해야 하는 속성 (✅ 표시)
2. **선택 속성**: 생략 가능 (기본값 사용)
3. **따옴표**: 공백이 있는 값은 따옴표로 감싸기
   ```
   ✅ [product id="123" title="My Product"]
   ❌ [product id=123 title=My Product]
   ```

### 사용 위치

| 위치 | 방법 |
|------|------|
| 페이지/게시물 편집기 | "Shortcode" 블록 추가 → 코드 입력 |
| 텍스트 에디터 | 직접 입력 |
| 위젯 (사이드바/푸터) | "Shortcode" 위젯 추가 |
| PHP 템플릿 | `<?php echo do_shortcode('[...]'); ?>` |

---

## 📚 Shortcode 목록

### 콘텐츠

#### `[recent_posts]` - 최근 게시물

최신 게시물 목록을 표시합니다.

**속성:**
- `limit` (숫자, 기본값: 5) - 표시할 게시물 수
- `category` (문자열) - 특정 카테고리만 표시
- `show_date` (불린, 기본값: true) - 날짜 표시 여부
- `show_excerpt` (불린, 기본값: false) - 요약 표시 여부
- `show_thumbnail` (불린, 기본값: true) - 썸네일 표시 여부

**예시:**
```
[recent_posts limit="10"]
[recent_posts category="뉴스" show_excerpt="true"]
[recent_posts limit="5" show_thumbnail="false"]
```

---

#### `[author]` - 작성자 정보

작성자 프로필 정보를 표시합니다.

**속성:**
- `id` (문자열, ✅ 필수) - 작성자 ID 또는 사용자명
- `show_avatar` (불린, 기본값: true) - 아바타 표시
- `show_bio` (불린, 기본값: true) - 자기소개 표시
- `show_posts` (불린, 기본값: false) - 작성글 목록 표시

**예시:**
```
[author id="john"]
[author id="admin" show_posts="true"]
```

---

### 미디어

#### `[gallery]` - 이미지 갤러리

여러 이미지를 그리드 형태로 표시합니다.

**속성:**
- `ids` (문자열, ✅ 필수) - 쉼표로 구분된 이미지 ID
- `columns` (숫자, 기본값: 3) - 갤러리 열 개수 (1-6)
- `size` (문자열, 기본값: medium) - 이미지 크기
  - 옵션: `thumbnail`, `medium`, `large`, `full`
- `link` (문자열, 기본값: file) - 클릭 시 동작
  - 옵션: `file` (원본 보기), `none` (링크 없음)

**예시:**
```
[gallery ids="1,2,3,4,5,6"]
[gallery ids="10,11,12" columns="4" size="large"]
[gallery ids="1,2,3" link="none"]
```

---

#### `[video]` - 비디오 임베드

YouTube, Vimeo 등 외부 비디오를 삽입합니다.

**속성:**
- `url` (문자열, ✅ 필수) - 비디오 URL
- `width` (문자열, 기본값: 100%) - 비디오 너비
- `height` (문자열, 기본값: auto) - 비디오 높이
- `autoplay` (불린, 기본값: false) - 자동 재생
- `controls` (불린, 기본값: true) - 컨트롤 표시

**예시:**
```
[video url="https://youtube.com/watch?v=xxx"]
[video url="https://vimeo.com/123456" width="800" height="450"]
[video url="/uploads/demo.mp4" autoplay="true"]
```

---

### E-commerce

#### `[product]` - 단일 상품 표시

상품 상세 정보를 페이지에 삽입합니다.

**속성:**
- `id` (문자열, ✅ 필수) - 상품 ID 또는 슬러그
- `show_price` (불린, 기본값: true) - 가격 표시
- `show_cart` (불린, 기본값: true) - 장바구니 버튼 표시
- `show_description` (불린, 기본값: false) - 상품 설명 표시
- `variant` (문자열, 기본값: card) - 표시 스타일
  - 옵션: `card`, `list`, `compact`

**예시:**
```
[product id="123"]
[product id="awesome-product" show_cart="false"]
[product id="123" variant="list" show_description="true"]
```

---

#### `[product_grid]` - 상품 그리드

상품 목록을 그리드로 표시합니다.

**속성:**
- `category` (문자열) - 카테고리 필터
- `limit` (숫자, 기본값: 8) - 표시할 상품 수
- `columns` (숫자, 기본값: 4) - 그리드 열 개수 (2-6)
- `featured` (불린, 기본값: false) - 추천 상품만 표시
- `on_sale` (불린, 기본값: false) - 할인 상품만 표시
- `orderby` (문자열, 기본값: created_at) - 정렬 기준
  - 옵션: `price`, `name`, `created_at`, `popularity`
- `order` (문자열, 기본값: desc) - 정렬 순서
  - 옵션: `asc`, `desc`

**예시:**
```
[product_grid category="전자제품" limit="12"]
[product_grid featured="true" columns="3"]
[product_grid on_sale="true" orderby="price" order="asc"]
```

---

#### `[add_to_cart]` - 장바구니 추가 버튼

구매 버튼을 블로그나 페이지에 삽입합니다.

**속성:**
- `id` (문자열, ✅ 필수) - 상품 ID
- `text` (문자열, 기본값: "장바구니에 담기") - 버튼 텍스트
- `show_price` (불린, 기본값: true) - 가격 표시
- `quantity` (숫자, 기본값: 1) - 기본 수량
- `style` (문자열, 기본값: primary) - 버튼 스타일
  - 옵션: `primary`, `secondary`, `outline`
- `size` (문자열, 기본값: medium) - 버튼 크기
  - 옵션: `small`, `medium`, `large`

**예시:**
```
[add_to_cart id="123"]
[add_to_cart id="456" text="지금 구매하기" style="secondary"]
[add_to_cart id="789" quantity="2" size="large"]
```

---

#### `[featured_products]` - 추천 상품

추천 상품을 특별히 강조하여 표시합니다.

**속성:**
- `limit` (숫자, 기본값: 4) - 표시할 상품 수
- `columns` (숫자, 기본값: 4) - 그리드 열 개수
- `title` (문자열, 기본값: "추천 상품") - 섹션 제목
- `show_rating` (불린, 기본값: true) - 평점 표시
- `show_badge` (불린, 기본값: true) - 뱃지 표시 (NEW, SALE)

**예시:**
```
[featured_products]
[featured_products limit="6" columns="3"]
[featured_products title="이달의 추천"]
```

---

### 폼

#### `[form]` - 폼 표시

문의, 신청, 설문 등 커스텀 폼을 페이지에 삽입합니다.

**속성:**
- `id` (문자열, ✅ 필수) - 폼 ID
- `name` (문자열) - 폼 이름 (ID 대신 사용 가능)
- `show_title` (불린, 기본값: true) - 폼 제목 표시
- `show_description` (불린, 기본값: true) - 폼 설명 표시
- `theme` (문자열, 기본값: default) - 테마
  - 옵션: `default`, `minimal`, `modern`, `classic`
- `layout` (문자열, 기본값: vertical) - 레이아웃
  - 옵션: `vertical`, `horizontal`, `inline`
- `ajax` (불린, 기본값: true) - AJAX 제출 사용

**예시:**
```
[form id="contact-form"]
[form name="newsletter" layout="inline"]
[form id="survey" theme="modern"]
```

---

#### `[view]` - 데이터 뷰

제출된 폼 데이터나 사용자 생성 콘텐츠를 표시합니다.

**속성:**
- `id` (문자열, ✅ 필수) - 뷰 ID
- `name` (문자열) - 뷰 이름 (ID 대신 사용 가능)
- `items_per_page` (숫자, 기본값: 25) - 페이지당 항목 수
- `enable_search` (불린, 기본값: true) - 검색 기능
- `enable_filters` (불린, 기본값: true) - 필터 기능
- `layout` (문자열, 기본값: table) - 레이아웃
  - 옵션: `table`, `grid`, `list`

**예시:**
```
[view id="submissions"]
[view name="gallery" layout="grid" items_per_page="12"]
[view id="reports" enable_export="true"]
```

---

### 드롭쉬핑

#### 파트너 Shortcodes

##### `[partner_dashboard]` - 파트너 대시보드

파트너의 전체 대시보드 (통계, 수익, 활동)를 표시합니다.

**속성:**
- `tab` (문자열) - 시작 탭
  - 옵션: `overview`, `commissions`, `links`

**권한:** 파트너 로그인 필요

**예시:**
```
[partner_dashboard]
[partner_dashboard tab="commissions"]
```

---

##### `[partner_products]` - 파트너 상품 목록

파트너가 홍보할 수 있는 상품 목록 및 링크 생성 기능을 제공합니다.

**속성:**
- `category` (문자열) - 카테고리 필터
- `featured` (불린, 기본값: false) - 추천 상품만
- `limit` (숫자, 기본값: 12) - 표시 개수
- `sortBy` (문자열, 기본값: created_at) - 정렬 기준
  - 옵션: `commission`, `performance`, `price`, `newest`

**권한:** 파트너 로그인 필요

**예시:**
```
[partner_products]
[partner_products category="electronics" featured="true"]
[partner_products sortBy="commission" limit="20"]
```

---

##### `[partner_commissions]` - 파트너 수수료 내역

수수료 정산 내역, 수익 통계를 표시합니다.

**속성:**
- `period` (문자열, 기본값: 30d) - 조회 기간
  - 옵션: `7d`, `30d`, `90d`, `1y`
- `status` (문자열, 기본값: all) - 상태 필터
  - 옵션: `all`, `pending`, `approved`, `paid`, `cancelled`
- `compact` (불린, 기본값: false) - 간단한 레이아웃
- `showSummary` (불린, 기본값: true) - 요약 표시

**권한:** 파트너 로그인 필요

**예시:**
```
[partner_commissions]
[partner_commissions period="90d" status="paid"]
[partner_commissions compact="true"]
```

---

#### 공급자 Shortcodes

##### `[supplier_products]` - 공급자 상품 목록

공급자가 등록한 상품 목록 및 관리 기능을 제공합니다.

**속성:** 없음

**권한:** 공급자 로그인 필요

**예시:**
```
[supplier_products]
```

---

##### `[supplier_product_editor]` - 공급자 상품 편집기

상품을 등록하거나 수정하는 전용 편집기입니다.

**속성:** 없음

**권한:** 공급자 로그인 필요

**예시:**
```
[supplier_product_editor]
```

---

#### 판매자 Shortcodes

##### `[seller_dashboard]` - 판매자 대시보드

판매 통계, 주문 현황, 재고 상태를 표시합니다.

**속성:** 없음

**권한:** 판매자 로그인 필요

**예시:**
```
[seller_dashboard]
```

---

### 동적 필드 (CPT/ACF)

#### `[cpt_list]` - CPT 목록 표시

Custom Post Type 목록을 동적으로 표시합니다.

**속성:**
- `type` (문자열, ✅ 필수) - CPT 타입 (예: `ds_supplier`, `ds_product`)
- `limit` (숫자, 기본값: 10) - 표시 개수
- `template` (문자열) - 커스텀 템플릿
- `fields` (문자열) - 표시할 필드 (쉼표 구분)

**예시:**
```
[cpt_list type="ds_supplier" limit="20"]
[cpt_list type="ds_product" template="grid" fields="title,price,image"]
```

---

#### `[cpt_field]` - CPT 단일 필드

특정 CPT의 필드 값을 표시합니다.

**속성:**
- `post_id` (문자열, ✅ 필수) - 포스트 ID
- `field` (문자열, ✅ 필수) - 필드 이름

**예시:**
```
[cpt_field post_id="123" field="company_name"]
[cpt_field post_id="456" field="price"]
```

---

#### `[acf_field]` - ACF 필드 값

Advanced Custom Fields 값을 표시합니다.

**속성:**
- `field` (문자열, ✅ 필수) - ACF 필드 이름
- `post_id` (문자열) - 포스트 ID (생략 시 현재 포스트)
- `format` (불린, 기본값: true) - 포맷 적용 여부

**예시:**
```
[acf_field field="contact_email"]
[acf_field field="company_logo" post_id="123"]
```

---

## 🚀 고급 기능

### Shortcode 조합

여러 shortcode를 조합하여 풍부한 페이지를 만들 수 있습니다:

```html
<!-- 상품 홍보 페이지 -->
<h2>베스트셀러</h2>
[featured_products limit="4"]

<h2>전체 상품</h2>
[product_grid category="전자제품" limit="12" columns="4"]

<h3>문의하기</h3>
[form id="product-inquiry"]
```

### 조건부 표시

일부 shortcode는 로그인 상태나 권한에 따라 다르게 동작합니다:

| Shortcode 유형 | 필요 권한 | 미인증 시 동작 |
|----------------|-----------|----------------|
| 일반 콘텐츠 | 없음 | 정상 표시 |
| 파트너 | 파트너 로그인 | 로그인 안내 표시 |
| 공급자 | 공급자 로그인 | 권한 요청 안내 |
| 관리자 | 관리자 권한 | 접근 제한 메시지 |

### 블록 에디터에서 사용

1. 블록 추가 버튼 클릭 (+)
2. "Shortcode" 블록 검색
3. Shortcode 입력
4. 미리보기로 확인

---

## 🔧 문제 해결

### 문제 1: "Shortcode가 그대로 텍스트로 표시됨"

**원인:**
- Shortcode 이름 오타
- 필수 속성 누락
- Shortcode가 등록되지 않음

**해결:**
1. Shortcode 이름 철자 확인
2. 필수 속성 (✅ 표시) 모두 입력했는지 확인
3. 관리자 대시보드에서 Shortcode 플러그인 활성화 확인

---

### 문제 2: "권한이 없습니다" 메시지

**원인:** 해당 shortcode에 필요한 권한으로 로그인하지 않음

**해결:**
1. 올바른 계정으로 로그인
2. 계정에 올바른 역할이 부여되었는지 확인
3. 관리자에게 권한 요청

---

### 문제 3: "속성이 적용되지 않음"

**원인:**
- 속성 이름 오타
- 잘못된 속성 값 형식

**해결:**
1. 속성 이름 철자 확인
2. 불린 값은 `"true"` 또는 `"false"` 사용
3. 숫자는 따옴표 없이 또는 있게 모두 가능: `limit="10"` 또는 `limit=10`
4. 문자열은 따옴표로 감싸기: `category="전자제품"`

---

### 문제 4: "데이터가 표시되지 않음"

**원인:**
- 잘못된 ID/슬러그
- 데이터 없음

**해결:**
1. ID가 실제로 존재하는지 확인
2. 관리자 대시보드에서 해당 데이터 확인
3. 카테고리 슬러그 정확히 입력

---

## 📋 Shortcode 빠른 참조표

| Shortcode | 주요 사용처 | 필수 속성 | 권한 |
|-----------|-----------|----------|------|
| `[recent_posts]` | 블로그 최신글 | - | ❌ |
| `[author]` | 작성자 프로필 | `id` | ❌ |
| `[gallery]` | 이미지 갤러리 | `ids` | ❌ |
| `[video]` | 비디오 임베드 | `url` | ❌ |
| `[product]` | 단일 상품 표시 | `id` | ❌ |
| `[product_grid]` | 상품 목록 | - | ❌ |
| `[add_to_cart]` | 구매 버튼 | `id` | ❌ |
| `[featured_products]` | 추천 상품 | - | ❌ |
| `[form]` | 커스텀 폼 | `id` | ❌ |
| `[view]` | 데이터 뷰 | `id` | ❌ |
| `[partner_dashboard]` | 파트너 대시보드 | - | ✅ 파트너 |
| `[partner_products]` | 파트너 상품 | - | ✅ 파트너 |
| `[partner_commissions]` | 수수료 내역 | - | ✅ 파트너 |
| `[supplier_products]` | 공급자 상품 관리 | - | ✅ 공급자 |
| `[seller_dashboard]` | 판매자 대시보드 | - | ✅ 판매자 |
| `[cpt_list]` | CPT 목록 | `type` | ❌ |
| `[cpt_field]` | CPT 필드 | `post_id`, `field` | ❌ |
| `[acf_field]` | ACF 필드 | `field` | ❌ |

---

## 📞 지원

Shortcode 관련 문의:
- 새 shortcode 요청
- 버그 제보
- 사용법 문의

→ 개발팀에 문의하세요.

---

**문서 버전:** 2.0
**최종 업데이트:** 2025-10-19
**다음 업데이트:** 새 shortcode 추가 시
