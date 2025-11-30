# Shortcode 리스트 테이블

O4O 플랫폼에서 사용 가능한 모든 Shortcode의 종합 가이드입니다.

**최종 업데이트**: 2025-10-30
**버전**: 1.0.0

---

## 목차

1. [Main Site - 상품(Product) Shortcodes](#1-main-site---상품product-shortcodes)
2. [Main Site - 인증(Auth) Shortcodes](#2-main-site---인증auth-shortcodes)
3. [Main Site - 폼(Form) Shortcodes](#3-main-site---폼form-shortcodes)
4. [Packages - 드롭쉬핑(Dropshipping) Shortcodes](#4-packages---드롭쉬핑dropshipping-shortcodes)
5. [Packages - 동적(Dynamic) Shortcodes](#5-packages---동적dynamic-shortcodes)
6. [사용 예제](#사용-예제)

---

## 1. Main Site - 상품(Product) Shortcodes

이커머스 상품 관련 기능을 제공하는 shortcode입니다.

### 1.1 단일 상품 표시

| 항목 | 내용 |
|------|------|
| **Shortcode 이름** | `product` |
| **기능 설명** | 특정 상품 하나를 카드 형태로 표시합니다. 썸네일, 제목, 가격, 장바구니 버튼을 포함합니다. |
| **파일 위치** | `apps/main-site/src/components/shortcodes/productShortcodes.tsx` |

#### 주요 속성(Parameters)

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | string | ✅ | - | 상품 ID (필수) |
| `show_price` | boolean | ❌ | `true` | 가격 표시 여부 |
| `show_cart` | boolean | ❌ | `true` | 장바구니 버튼 표시 여부 |
| `class` | string | ❌ | `''` | 추가 CSS 클래스 |

#### 사용 예시

```
[product id="123"]
[product id="456" show_price="true" show_cart="true"]
[product id="789" show_cart="false" class="featured-product"]
```

---

### 1.2 상품 그리드

| 항목 | 내용 |
|------|------|
| **Shortcode 이름** | `product_grid` |
| **기능 설명** | 여러 상품을 그리드 레이아웃으로 표시합니다. 카테고리 필터링, 정렬 기능을 지원합니다. |
| **파일 위치** | `apps/main-site/src/components/shortcodes/productShortcodes.tsx` |

#### 주요 속성(Parameters)

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `category` | string | ❌ | `''` | 카테고리 필터 (slug) |
| `limit` | number | ❌ | `12` | 표시할 상품 개수 |
| `columns` | number | ❌ | `4` | 그리드 열 개수 (1-6) |
| `featured` | boolean | ❌ | `false` | 추천 상품만 표시 |
| `orderby` | string | ❌ | `created_at` | 정렬 기준 (`created_at`, `price`, `name`) |
| `order` | string | ❌ | `desc` | 정렬 순서 (`asc`, `desc`) |

#### 사용 예시

```
[product_grid]
[product_grid category="electronics" limit="8" columns="4"]
[product_grid featured="true" limit="6" columns="3"]
[product_grid orderby="price" order="asc" columns="3"]
```

---

### 1.3 장바구니 버튼

| 항목 | 내용 |
|------|------|
| **Shortcode 이름** | `add_to_cart` |
| **기능 설명** | 특정 상품을 장바구니에 추가하는 버튼을 표시합니다. |
| **파일 위치** | `apps/main-site/src/components/shortcodes/productShortcodes.tsx` |

#### 주요 속성(Parameters)

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | string | ✅ | - | 상품 ID (필수) |
| `text` | string | ❌ | `장바구니에 담기` | 버튼 텍스트 |
| `class` | string | ❌ | `''` | 추가 CSS 클래스 |
| `show_price` | boolean | ❌ | `true` | 버튼에 가격 표시 여부 |

#### 사용 예시

```
[add_to_cart id="123"]
[add_to_cart id="456" text="구매하기" show_price="false"]
[add_to_cart id="789" class="btn-primary btn-lg"]
```

---

### 1.4 상품 캐러셀

| 항목 | 내용 |
|------|------|
| **Shortcode 이름** | `product_carousel` |
| **기능 설명** | 상품을 캐러셀(슬라이더) 형태로 표시합니다. 자동 재생 기능을 지원합니다. |
| **파일 위치** | `apps/main-site/src/components/shortcodes/productShortcodes.tsx` |

#### 주요 속성(Parameters)

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `category` | string | ❌ | `''` | 카테고리 필터 |
| `limit` | number | ❌ | `10` | 표시할 상품 개수 |
| `autoplay` | boolean | ❌ | `true` | 자동 재생 여부 |
| `title` | string | ❌ | `''` | 캐러셀 제목 |

#### 사용 예시

```
[product_carousel]
[product_carousel category="new-arrivals" limit="10" autoplay="true"]
[product_carousel title="신상품" category="fashion" limit="8"]
```

---

### 1.5 추천 상품

| 항목 | 내용 |
|------|------|
| **Shortcode 이름** | `featured_products` |
| **기능 설명** | 추천 상품 목록을 그리드로 표시합니다. |
| **파일 위치** | `apps/main-site/src/components/shortcodes/productShortcodes.tsx` |

#### 주요 속성(Parameters)

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `limit` | number | ❌ | `4` | 표시할 상품 개수 |
| `columns` | number | ❌ | `4` | 그리드 열 개수 |
| `title` | string | ❌ | `추천 상품` | 섹션 제목 |

#### 사용 예시

```
[featured_products]
[featured_products limit="6" columns="3"]
[featured_products title="이달의 추천" limit="4"]
```

---

### 1.6 상품 카테고리

| 항목 | 내용 |
|------|------|
| **Shortcode 이름** | `product_categories` |
| **기능 설명** | 상품 카테고리 목록을 표시합니다. (현재 개발 중) |
| **파일 위치** | `apps/main-site/src/components/shortcodes/productShortcodes.tsx` |
| **상태** | 🚧 구현 예정 |

#### 주요 속성(Parameters)

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `show_count` | boolean | ❌ | `true` | 상품 개수 표시 |
| `hide_empty` | boolean | ❌ | `true` | 빈 카테고리 숨기기 |
| `columns` | number | ❌ | `3` | 그리드 열 개수 |

#### 사용 예시

```
[product_categories]
[product_categories show_count="true" columns="4"]
```

---

## 2. Main Site - 인증(Auth) Shortcodes

사용자 인증 및 로그인 관련 기능을 제공하는 shortcode입니다.

### 2.1 소셜 로그인

| 항목 | 내용 |
|------|------|
| **Shortcode 이름** | `social_login` |
| **기능 설명** | Google, Kakao, Naver 소셜 로그인과 이메일 로그인 폼을 제공합니다. |
| **파일 위치** | `apps/main-site/src/components/shortcodes/authShortcodes.tsx` |

#### 주요 속성(Parameters)

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `redirect_url` | string | ❌ | `/dashboard` | 로그인 후 이동할 URL |
| `show_email_login` | boolean | ❌ | `true` | 이메일 로그인 폼 표시 여부 |
| `title` | string | ❌ | `로그인` | 제목 |
| `subtitle` | string | ❌ | `계정에 접속하여...` | 부제목 |

#### 사용 예시

```
[social_login]
[social_login redirect_url="/my-page" title="회원 로그인"]
[social_login show_email_login="false" title="소셜 로그인만"]
```

---

### 2.2 로그인 폼

| 항목 | 내용 |
|------|------|
| **Shortcode 이름** | `login_form` |
| **기능 설명** | `social_login`과 동일 (별칭) |
| **파일 위치** | `apps/main-site/src/components/shortcodes/authShortcodes.tsx` |

#### 주요 속성(Parameters)

`social_login`과 동일

#### 사용 예시

```
[login_form]
[login_form redirect_url="/dashboard"]
```

---

### 2.3 OAuth 전용 로그인

| 항목 | 내용 |
|------|------|
| **Shortcode 이름** | `oauth_login` |
| **기능 설명** | 소셜 로그인 버튼만 표시 (이메일 로그인 폼 제외) |
| **파일 위치** | `apps/main-site/src/components/shortcodes/authShortcodes.tsx` |

#### 주요 속성(Parameters)

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `redirect_url` | string | ❌ | `/dashboard` | 로그인 후 이동할 URL |
| `title` | string | ❌ | `소셜 로그인` | 제목 |

#### 사용 예시

```
[oauth_login]
[oauth_login redirect_url="/welcome" title="간편 로그인"]
```

---

## 3. Main Site - 폼(Form) Shortcodes

Spectra Forms와 Views를 표시하는 shortcode입니다.

### 3.1 폼 표시

| 항목 | 내용 |
|------|------|
| **Shortcode 이름** | `form` |
| **기능 설명** | Spectra Form을 페이지에 삽입합니다. |
| **파일 위치** | `apps/main-site/src/components/shortcodes/formShortcodes.tsx` |

#### 주요 속성(Parameters)

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | string | ✅ | - | Form ID (필수) |
| `name` | string | ❌ | - | Form 이름 |
| `show-title` | boolean | ❌ | `true` | 폼 제목 표시 |
| `show-description` | boolean | ❌ | `true` | 폼 설명 표시 |
| `theme` | string | ❌ | - | 테마 스타일 |
| `layout` | string | ❌ | - | 레이아웃 타입 |

#### 사용 예시

```
[form id="contact-form"]
[form id="survey-123" show-title="true"]
[form name="newsletter" show-description="false"]
```

---

### 3.2 뷰 표시

| 항목 | 내용 |
|------|------|
| **Shortcode 이름** | `view` |
| **기능 설명** | Spectra View(데이터 테이블/목록)를 페이지에 삽입합니다. |
| **파일 위치** | `apps/main-site/src/components/shortcodes/formShortcodes.tsx` |

#### 주요 속성(Parameters)

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | string | ✅ | - | View ID (필수) |
| `name` | string | ❌ | - | View 이름 |
| `show-title` | boolean | ❌ | `true` | 제목 표시 |
| `items-per-page` | number | ❌ | `25` | 페이지당 항목 수 |
| `enable-search` | boolean | ❌ | `true` | 검색 기능 활성화 |
| `enable-filters` | boolean | ❌ | `true` | 필터 기능 활성화 |
| `enable-export` | boolean | ❌ | `true` | 내보내기 기능 활성화 |

#### 사용 예시

```
[view id="products-view"]
[view id="orders-123" items-per-page="50"]
[view name="customers" enable-export="false"]
```

---

## 4. Packages - 드롭쉬핑(Dropshipping) Shortcodes

드롭쉬핑 비즈니스 모델을 위한 대시보드 shortcode입니다.

### 4.1 판매자 대시보드

| 항목 | 내용 |
|------|------|
| **Shortcode 이름** | `seller_dashboard` |
| **기능 설명** | 판매자용 대시보드 (매출, 재고 현황 표시) |
| **파일 위치** | `packages/shortcodes/src/dropshipping/SellerDashboard.tsx` |

#### 주요 속성(Parameters)

현재 별도 속성 없음 (컨텍스트 기반 동작)

#### 사용 예시

```
[seller_dashboard]
```

---

### 4.2 공급자 대시보드

| 항목 | 내용 |
|------|------|
| **Shortcode 이름** | `supplier_dashboard` |
| **기능 설명** | 공급자용 대시보드 (주문 처리, 재고 관리) |
| **파일 위치** | `packages/shortcodes/src/dropshipping/SupplierDashboard.tsx` |

#### 주요 속성(Parameters)

현재 별도 속성 없음 (컨텍스트 기반 동작)

#### 사용 예시

```
[supplier_dashboard]
```

---

### 4.3 제휴 마케터 대시보드

| 항목 | 내용 |
|------|------|
| **Shortcode 이름** | `affiliate_dashboard` |
| **기능 설명** | 제휴 마케터용 대시보드 (수익 추적, 링크 관리) |
| **파일 위치** | `packages/shortcodes/src/dropshipping/AffiliateDashboard.tsx` |

#### 주요 속성(Parameters)

현재 별도 속성 없음 (컨텍스트 기반 동작)

#### 사용 예시

```
[affiliate_dashboard]
```

---

## 5. Packages - 동적(Dynamic) Shortcodes

CPT(Custom Post Type) 데이터와 ACF 필드를 동적으로 표시하는 shortcode입니다.

### 5.1 CPT 목록

| 항목 | 내용 |
|------|------|
| **Shortcode 이름** | `cpt_list` |
| **기능 설명** | 커스텀 포스트 타입의 목록을 다양한 레이아웃으로 표시합니다. |
| **파일 위치** | `packages/shortcodes/src/dynamic/cpt-list.tsx` |

#### 주요 속성(Parameters)

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `type` | string | ✅ | - | CPT 타입 (예: `ds_product`) |
| `count` | number | ❌ | `10` | 표시할 항목 수 |
| `template` | string | ❌ | `default` | 레이아웃 (`default`, `grid`, `list`, `card`) |
| `columns` | number | ❌ | `3` | 그리드 열 개수 |
| `orderby` | string | ❌ | `date` | 정렬 기준 |
| `order` | string | ❌ | `DESC` | 정렬 순서 |
| `show_thumbnail` | boolean | ❌ | `false` | 썸네일 표시 |
| `show_excerpt` | boolean | ❌ | `false` | 요약 표시 |
| `show_meta` | boolean | ❌ | `false` | 메타 정보 표시 |

#### 사용 예시

```
[cpt_list type="ds_product" count="6"]
[cpt_list type="ds_product" count="6" template="grid" columns="3" show_thumbnail="true"]
[cpt_list type="ds_supplier" count="10" template="list" show_meta="true"]
[cpt_list type="ds_product" count="4" template="card" orderby="date" order="DESC"]
```

---

### 5.2 CPT 필드

| 항목 | 내용 |
|------|------|
| **Shortcode 이름** | `cpt_field` |
| **기능 설명** | 현재 또는 특정 CPT의 필드 값을 표시합니다. |
| **파일 위치** | `packages/shortcodes/src/dynamic/cpt-field.tsx` |

#### 주요 속성(Parameters)

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `field` | string | ✅ | - | 필드명 (`title`, `date`, `price` 등) |
| `post_id` | string | ❌ | 현재 포스트 | 특정 포스트 ID |
| `post_type` | string | ❌ | 현재 타입 | CPT 타입 |
| `format` | string | ❌ | - | 포맷 (`currency`, `date`, `number`) |
| `default` | string | ❌ | `''` | 기본값 (값이 없을 때) |
| `wrapper` | string | ❌ | `div` | HTML 래퍼 태그 |
| `class` | string | ❌ | `''` | CSS 클래스 |

#### 포맷 옵션

| 포맷 | 설명 | 예시 |
|------|------|------|
| `currency` | 통화 형식 | ₩12,000 |
| `date` | 날짜 형식 | 2025년 10월 30일 |
| `number` | 숫자 형식 | 1,234 |
| `excerpt` | 요약 (길이 제한) | 처음 100자... |

#### 사용 예시

```
[cpt_field field="title"]
[cpt_field field="price" format="currency"]
[cpt_field field="date" format="date"]
[cpt_field field="featured_image"]
[cpt_field post_id="123" field="custom_field"]
[cpt_field field="description" wrapper="span" class="text-muted"]
```

---

### 5.3 ACF 필드

| 항목 | 내용 |
|------|------|
| **Shortcode 이름** | `acf_field` |
| **기능 설명** | Advanced Custom Fields 필드 값을 표시합니다. |
| **파일 위치** | `packages/shortcodes/src/dynamic/acf-field.tsx` |

#### 주요 속성(Parameters)

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `name` | string | ✅ | - | ACF 필드명 |
| `post_id` | string | ❌ | 현재 포스트 | 포스트 ID |
| `format` | string | ❌ | - | 포맷 (`currency`, `date`) |
| `type` | string | ❌ | - | 필드 타입 (`gallery`, `image`) |
| `default` | string | ❌ | `''` | 기본값 |
| `wrapper` | string | ❌ | `div` | HTML 래퍼 태그 |
| `class` | string | ❌ | `''` | CSS 클래스 |

#### 사용 예시

```
[acf_field name="custom_price" format="currency"]
[acf_field name="product_gallery" type="gallery"]
[acf_field name="supplier_info" default="정보 없음"]
[acf_field name="stock_status" wrapper="span" class="stock-badge"]
```

---

### 5.4 메타 필드

| 항목 | 내용 |
|------|------|
| **Shortcode 이름** | `meta_field` |
| **기능 설명** | WordPress 메타 필드 값을 표시합니다. |
| **파일 위치** | `packages/shortcodes/src/dynamic/meta-field.tsx` |

#### 주요 속성(Parameters)

| 속성명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `key` | string | ✅ | - | 메타 키 (예: `_stock_status`) |
| `post_id` | string | ❌ | 현재 포스트 | 포스트 ID |
| `format` | string | ❌ | - | 포맷 (`number`) |
| `default` | string | ❌ | `''` | 기본값 |
| `wrapper` | string | ❌ | `div` | HTML 래퍼 태그 |
| `class` | string | ❌ | `''` | CSS 클래스 |

#### 사용 예시

```
[meta_field key="_stock_status" default="재고 확인 중"]
[meta_field key="_view_count" format="number"]
[meta_field key="_thumbnail_id"]
```

---

## 사용 예제

### 예제 1: 상품 랜딩 페이지

```
# 신상품 안내

[featured_products title="이번 주 베스트" limit="4" columns="4"]

## 전체 상품

[product_grid category="new-arrivals" limit="12" columns="4" orderby="date"]

## 특별 할인 상품

[product id="featured-123" show_cart="true"]
```

---

### 예제 2: 로그인 페이지

```
# 로그인

[social_login redirect_url="/my-account" title="회원 로그인"]

---

계정이 없으신가요? [회원가입](/register)
```

---

### 예제 3: CPT 상품 상세 페이지

```
# [cpt_field field="title"]

[cpt_field field="featured_image"]

## 가격
[cpt_field field="price" format="currency"]

## 상세 설명
[cpt_field field="description"]

## 공급자 정보
[acf_field name="supplier_info"]

## 재고 상태
[meta_field key="_stock_status"]
```

---

### 예제 4: 드롭쉬핑 비즈니스 페이지

```
# 판매자 센터

[seller_dashboard]

---

# 공급자 관리

[supplier_dashboard]

---

# 제휴 프로그램

[affiliate_dashboard]
```

---

### 예제 5: 동적 상품 목록

```
# 드롭쉬핑 상품

[cpt_list type="ds_product" count="6" template="grid" columns="3" show_thumbnail="true" show_excerpt="true"]

# 공급자 목록

[cpt_list type="ds_supplier" count="10" template="list" show_meta="true"]
```

---

## 카테고리별 요약

### 🛒 상품 관련 (6개)
- `product` - 단일 상품
- `product_grid` - 상품 그리드
- `add_to_cart` - 장바구니 버튼
- `product_carousel` - 상품 캐러셀
- `featured_products` - 추천 상품
- `product_categories` - 카테고리 (개발 중)

### 🔐 인증 관련 (3개)
- `social_login` - 소셜 + 이메일 로그인
- `login_form` - 로그인 폼 (별칭)
- `oauth_login` - 소셜 로그인만

### 📝 폼 관련 (2개)
- `form` - Spectra Form
- `view` - Spectra View

### 📦 드롭쉬핑 관련 (3개)
- `seller_dashboard` - 판매자 대시보드
- `supplier_dashboard` - 공급자 대시보드
- `affiliate_dashboard` - 제휴 마케터 대시보드

### 🔄 동적 데이터 관련 (4개)
- `cpt_list` - CPT 목록
- `cpt_field` - CPT 필드
- `acf_field` - ACF 필드
- `meta_field` - 메타 필드

---

## 총 Shortcode 개수: 18개

---

## 참고 사항

1. **필수 속성**: ✅ 표시된 속성은 반드시 제공해야 합니다.
2. **Boolean 값**: `true` / `false` 문자열로 입력합니다.
3. **컨텍스트**: 일부 shortcode는 현재 포스트 컨텍스트에 의존합니다 (예: `cpt_field`).
4. **캐싱**: Dynamic shortcode들은 성능을 위해 캐싱을 사용합니다.
5. **에러 처리**: 잘못된 파라미터나 데이터 없음 시 적절한 메시지를 표시합니다.

---

## 기술 스택

- **Parser**: `@o4o/shortcodes` 패키지
- **Renderer**: `ShortcodeRenderer` 컴포넌트
- **Registry**: 전역 shortcode 레지스트리
- **캐싱**: 동적 shortcode용 캐시 시스템

---

**문의 및 지원**: [GitHub Issues](https://github.com/your-repo/o4o-platform/issues)

**마지막 업데이트**: 2025-10-30
