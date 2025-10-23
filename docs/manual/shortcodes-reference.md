# O4O Platform Shortcode 완벽 가이드

> **버전**: v0.5.9 (O4O v1.0.0)
> **최종 업데이트**: 2025-10-22
> **대상**: 콘텐츠 에디터, 마케터, 운영자, 개발자

---

## 📋 목차

1. [Shortcode란?](#shortcode란)
2. [기본 사용법](#기본-사용법)
3. [콘텐츠 Shortcodes](#콘텐츠-shortcodes)
4. [미디어 Shortcodes](#미디어-shortcodes)
5. [E-commerce Shortcodes](#e-commerce-shortcodes)
6. [폼 Shortcodes](#폼-shortcodes)
7. [드롭쉬핑 Shortcodes](#드롭쉬핑-shortcodes)
   - [파트너 Shortcodes](#파트너-shortcodes)
   - [공급자 Shortcodes](#공급자-shortcodes)
   - [판매자 Shortcodes](#판매자-shortcodes)
8. [동적 필드 Shortcodes](#동적-필드-shortcodes)
9. [고급 사용법](#고급-사용법)
10. [문제 해결](#문제-해결)

---

## Shortcode란?

**Shortcode**는 WordPress 기반 O4O 플랫폼에서 복잡한 기능을 간단한 코드로 페이지에 삽입하는 방법입니다.

### 장점
✅ **간편성**: 코드 작성 없이 동적 콘텐츠 추가
✅ **재사용성**: 여러 페이지에서 동일한 기능 활용
✅ **유연성**: 속성 변경만으로 다양한 스타일/기능 구현
✅ **관리 편의성**: 중앙에서 관리되는 컴포넌트

### 예시
```
[product_grid category="전자제품" limit="8"]
```
→ 전자제품 카테고리의 상품 8개를 그리드로 표시

---

## 기본 사용법

### 구조

```
[shortcode_name attribute1="value1" attribute2="value2"]
```

### 속성 규칙

| 규칙 | 설명 | 예시 |
|------|------|------|
| **필수 속성** | ✅ 표시, 반드시 입력 | `id="123"` |
| **선택 속성** | 생략 가능 (기본값 사용) | `limit="10"` |
| **따옴표** | 공백 포함 시 반드시 사용 | `title="My Product"` |
| **불린 값** | `"true"` 또는 `"false"` | `featured="true"` |
| **숫자** | 따옴표 유무 무관 | `limit="10"` 또는 `limit=10` |

### 사용 위치

| 위치 | 사용 방법 |
|------|----------|
| **페이지/게시물 편집기** | "Shortcode" 블록 추가 → 코드 입력 |
| **텍스트 에디터** | 직접 입력 |
| **위젯** | "Shortcode" 위젯 추가 |
| **PHP 템플릿** | `<?php echo do_shortcode('[...]'); ?>` |

---

## 콘텐츠 Shortcodes

### `[recent_posts]` - 최근 게시물

최신 게시물 목록을 표시합니다.

#### 속성

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `limit` | 숫자 | 5 | 표시할 게시물 수 |
| `category` | 문자열 | - | 특정 카테고리만 표시 |
| `show_date` | 불린 | true | 날짜 표시 여부 |
| `show_excerpt` | 불린 | false | 요약 표시 여부 |
| `show_thumbnail` | 불린 | true | 썸네일 표시 여부 |

#### 예시

```
[recent_posts limit="10"]
[recent_posts category="뉴스" show_excerpt="true"]
[recent_posts limit="5" show_thumbnail="false"]
```

---

### `[author]` - 작성자 정보

작성자 프로필 정보를 표시합니다.

#### 속성

| 속성 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `id` | 문자열 | ✅ | - | 작성자 ID 또는 사용자명 |
| `show_avatar` | 불린 | | true | 아바타 표시 |
| `show_bio` | 불린 | | true | 자기소개 표시 |
| `show_posts` | 불린 | | false | 작성글 목록 표시 |

#### 예시

```
[author id="john"]
[author id="admin" show_posts="true"]
```

---

## 미디어 Shortcodes

### `[gallery]` - 이미지 갤러리

여러 이미지를 그리드 형태로 표시합니다.

#### 속성

| 속성 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `ids` | 문자열 | ✅ | - | 쉼표로 구분된 이미지 ID |
| `columns` | 숫자 | | 3 | 갤러리 열 개수 (1-6) |
| `size` | 문자열 | | medium | 이미지 크기 (thumbnail/medium/large/full) |
| `link` | 문자열 | | file | 클릭 동작 (file/none) |

#### 예시

```
[gallery ids="1,2,3,4,5,6"]
[gallery ids="10,11,12" columns="4" size="large"]
[gallery ids="1,2,3" link="none"]
```

---

### `[video]` - 비디오 임베드

YouTube, Vimeo 등 외부 비디오를 삽입합니다.

#### 속성

| 속성 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `url` | 문자열 | ✅ | - | 비디오 URL |
| `width` | 문자열 | | 100% | 비디오 너비 |
| `height` | 문자열 | | auto | 비디오 높이 |
| `autoplay` | 불린 | | false | 자동 재생 |
| `controls` | 불린 | | true | 컨트롤 표시 |

#### 예시

```
[video url="https://youtube.com/watch?v=xxx"]
[video url="https://vimeo.com/123456" width="800" height="450"]
[video url="/uploads/demo.mp4" autoplay="true"]
```

---

## E-commerce Shortcodes

### `[product]` - 단일 상품 표시

상품 상세 정보를 페이지에 삽입합니다.

#### 속성

| 속성 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `id` | 문자열 | ✅ | - | 상품 ID 또는 슬러그 |
| `show_price` | 불린 | | true | 가격 표시 |
| `show_cart` | 불린 | | true | 장바구니 버튼 표시 |
| `show_description` | 불린 | | false | 상품 설명 표시 |
| `variant` | 문자열 | | card | 표시 스타일 (card/list/compact) |

#### 예시

```
[product id="123"]
[product id="awesome-product" show_cart="false"]
[product id="123" variant="list" show_description="true"]
```

---

### `[product_grid]` - 상품 그리드

상품 목록을 그리드로 표시합니다.

#### 속성

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `category` | 문자열 | - | 카테고리 필터 |
| `limit` | 숫자 | 8 | 표시할 상품 수 |
| `columns` | 숫자 | 4 | 그리드 열 개수 (2-6) |
| `featured` | 불린 | false | 추천 상품만 표시 |
| `on_sale` | 불린 | false | 할인 상품만 표시 |
| `orderby` | 문자열 | created_at | 정렬 기준 (price/name/created_at/popularity) |
| `order` | 문자열 | desc | 정렬 순서 (asc/desc) |

#### 예시

```
[product_grid category="전자제품" limit="12"]
[product_grid featured="true" columns="3"]
[product_grid on_sale="true" orderby="price" order="asc"]
```

---

### `[add_to_cart]` - 장바구니 추가 버튼

구매 버튼을 블로그나 페이지에 삽입합니다.

#### 속성

| 속성 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `id` | 문자열 | ✅ | - | 상품 ID |
| `text` | 문자열 | | "장바구니에 담기" | 버튼 텍스트 |
| `show_price` | 불린 | | true | 가격 표시 |
| `quantity` | 숫자 | | 1 | 기본 수량 |
| `style` | 문자열 | | primary | 버튼 스타일 (primary/secondary/outline) |
| `size` | 문자열 | | medium | 버튼 크기 (small/medium/large) |

#### 예시

```
[add_to_cart id="123"]
[add_to_cart id="456" text="지금 구매하기" style="secondary"]
[add_to_cart id="789" quantity="2" size="large"]
```

---

### `[featured_products]` - 추천 상품

추천 상품을 특별히 강조하여 표시합니다.

#### 속성

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `limit` | 숫자 | 4 | 표시할 상품 수 |
| `columns` | 숫자 | 4 | 그리드 열 개수 |
| `title` | 문자열 | "추천 상품" | 섹션 제목 |
| `show_rating` | 불린 | true | 평점 표시 |
| `show_badge` | 불린 | true | 뱃지 표시 (NEW, SALE) |

#### 예시

```
[featured_products]
[featured_products limit="6" columns="3"]
[featured_products title="이달의 추천"]
```

---

## 폼 Shortcodes

### `[form]` - 폼 표시

문의, 신청, 설문 등 커스텀 폼을 페이지에 삽입합니다.

#### 속성

| 속성 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `id` | 문자열 | ✅ | - | 폼 ID |
| `name` | 문자열 | | - | 폼 이름 (ID 대신 사용 가능) |
| `show_title` | 불린 | | true | 폼 제목 표시 |
| `show_description` | 불린 | | true | 폼 설명 표시 |
| `theme` | 문자열 | | default | 테마 (default/minimal/modern/classic) |
| `layout` | 문자열 | | vertical | 레이아웃 (vertical/horizontal/inline) |
| `ajax` | 불린 | | true | AJAX 제출 사용 |

#### 예시

```
[form id="contact-form"]
[form name="newsletter" layout="inline"]
[form id="survey" theme="modern"]
```

---

### `[view]` - 데이터 뷰

제출된 폼 데이터나 사용자 생성 콘텐츠를 표시합니다.

#### 속성

| 속성 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `id` | 문자열 | ✅ | - | 뷰 ID |
| `name` | 문자열 | | - | 뷰 이름 (ID 대신 사용 가능) |
| `items_per_page` | 숫자 | | 25 | 페이지당 항목 수 |
| `enable_search` | 불린 | | true | 검색 기능 |
| `enable_filters` | 불린 | | true | 필터 기능 |
| `layout` | 문자열 | | table | 레이아웃 (table/grid/list) |

#### 예시

```
[view id="submissions"]
[view name="gallery" layout="grid" items_per_page="12"]
[view id="reports" enable_export="true"]
```

---

## 드롭쉬핑 Shortcodes

O4O 플랫폼의 드롭쉬핑 기능을 페이지에 통합하는 shortcodes입니다. 역할별로 다른 shortcode를 사용합니다.

### 파트너 Shortcodes

파트너(Partner)는 제휴 마케팅을 통해 수수료를 받는 역할입니다.

#### `[partner_dashboard]` - 파트너 메인 대시보드

파트너의 전체 성과를 한눈에 볼 수 있는 통합 대시보드입니다.

**속성:**

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `tab` | 문자열 | overview | 시작 탭 (overview/commissions/links) |

**권한:** 파트너 로그인 필요 ✅

**예시:**
```
[partner_dashboard]
[partner_dashboard tab="commissions"]
```

**표시 내용:**
- 총 수익 및 전환율
- 개인 추천 링크
- 최근 클릭 및 전환 통계
- 월별 수익 차트

---

#### `[partner_products]` - 홍보 상품 목록

파트너가 홍보할 수 있는 상품 목록과 링크 생성 기능을 제공합니다.

**속성:**

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `category` | 문자열 | - | 카테고리 필터 |
| `featured` | 불린 | false | 추천 상품만 표시 |
| `limit` | 숫자 | 12 | 표시 개수 |
| `sortBy` | 문자열 | commission | 정렬 기준 (commission/performance/price/newest) |

**권한:** 파트너 로그인 필요 ✅

**예시:**
```
[partner_products]
[partner_products category="electronics" featured="true"]
[partner_products sortBy="commission" limit="20"]
```

**주요 기능:**
- 상품별 수수료율 표시
- 원클릭 링크 생성
- 성과 데이터 실시간 확인
- 마케팅 소재 다운로드

---

#### `[partner_commissions]` - 정산 내역

수수료 정산 내역과 지급 상태를 투명하게 보여줍니다.

**속성:**

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `period` | 문자열 | 30d | 조회 기간 (7d/30d/90d/1y) |
| `status` | 문자열 | all | 상태 필터 (all/pending/approved/paid/cancelled) |
| `compact` | 불린 | false | 간단한 레이아웃 사용 |
| `showSummary` | 불린 | true | 요약 카드 표시 |

**권한:** 파트너 로그인 필요 ✅

**예시:**
```
[partner_commissions]
[partner_commissions period="90d" status="paid"]
[partner_commissions compact="true"]
```

**표시 내용:**
- 총 수익, 대기 중, 지급 완료 금액
- 거래별 상세 내역
- 정산 일정
- 지급 방법 관리

---

#### `[partner_link_generator]` - 링크 생성기

개인화된 추천 링크를 생성하고 관리합니다.

**속성:** 없음

**권한:** 파트너 로그인 필요 ✅

**예시:**
```
[partner_link_generator]
```

**주요 기능:**
- 상품별 링크 생성
- 캠페인 태그 추가
- 링크 성과 추적
- QR 코드 생성

---

#### `[partner_performance_chart]` - 성과 차트

시각화된 성과 분석을 제공합니다.

**속성:**

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `chartType` | 문자열 | line | 차트 유형 (line/bar/area/pie) |

**권한:** 파트너 로그인 필요 ✅

**예시:**
```
[partner_performance_chart]
[partner_performance_chart chartType="bar"]
```

---

### 공급자 Shortcodes

공급자(Supplier)는 상품을 등록하고 드롭쉬핑 네트워크에 공급하는 역할입니다.

#### `[supplier_dashboard]` - 공급자 대시보드

공급자의 상품 현황, 정산, 승인 대기 등을 표시합니다.

**속성:**

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `period` | 문자열 | 30d | 데이터 조회 기간 (7d/30d/90d/1y) |

**권한:** 공급자 로그인 필요 ✅

**예시:**
```
[supplier_dashboard]
[supplier_dashboard period="90d"]
```

**표시 내용:**
- 등록 상품 현황
- 총 판매액 및 정산 금액
- 승인 대기 상품
- 파트너별 판매 통계

---

#### `[supplier_products]` - 공급자 상품 목록

공급자가 등록/관리하는 상품 목록을 표시합니다.

**속성:**

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `limit` | 숫자 | 12 | 표시할 상품 수 |
| `category` | 문자열 | - | 카테고리별 필터링 |
| `status` | 문자열 | all | 상품 상태 필터 (all/active/pending/rejected) |
| `showStats` | 불린 | true | 통계 표시 여부 |

**권한:** 공급자 로그인 필요 ✅

**예시:**
```
[supplier_products]
[supplier_products status="active" limit="20"]
[supplier_products category="electronics"]
```

**주요 기능:**
- 상품 편집/삭제
- 재고 관리
- 가격 일괄 수정
- 판매 통계 확인

---

#### `[supplier_product_editor]` - 상품 편집기

상품의 공급가, MSRP, 수수료율을 편집하고 승인 요청하는 UI입니다.

**속성:**

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `productId` | 문자열 | - | 편집할 상품 ID (없으면 신규 등록) |
| `mode` | 문자열 | edit | 편집 모드 (create/edit) |
| `autoSave` | 불린 | false | 자동 저장 활성화 |

**권한:** 공급자 로그인 필요 ✅

**예시:**
```
[supplier_product_editor]
[supplier_product_editor productId="123"]
[supplier_product_editor mode="create"]
```

**편집 가능 항목:**
- 상품명, 설명, 이미지
- 공급가, MSRP
- 파트너 수수료율
- 재고 수량
- 배송 정보

---

#### `[supplier_analytics]` - 공급자 분석

판매 분석 및 통계를 제공합니다.

**속성:**

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `type` | 문자열 | overview | 분석 유형 (overview/products/partners/revenue) |

**권한:** 공급자 로그인 필요 ✅

**예시:**
```
[supplier_analytics]
[supplier_analytics type="products"]
```

---

### 판매자 Shortcodes

판매자(Seller)는 공급자의 상품을 자신의 가격으로 재판매하는 역할입니다.

#### `[seller_dashboard]` - 판매자 대시보드

판매자의 총 마진, 전환율, 핵심 성과 지표를 표시합니다.

**속성:**

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `period` | 문자열 | 30d | 데이터 조회 기간 (7d/30d/90d/1y) |

**권한:** 판매자 로그인 필요 ✅

**예시:**
```
[seller_dashboard]
[seller_dashboard period="7d"]
```

**표시 내용:**
- 총 판매액 및 순이익
- 마진율 통계
- 베스트셀러 상품
- 주문 현황

---

#### `[seller_products]` - 판매자 상품 목록

판매자가 판매하는 상품 목록과 가격 관리 기능을 제공합니다.

**속성:**

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `limit` | 숫자 | 12 | 표시할 상품 수 |
| `category` | 문자열 | - | 카테고리별 필터링 |
| `featured` | 불린 | false | 추천 상품만 표시 |

**권한:** 판매자 로그인 필요 ✅

**예시:**
```
[seller_products]
[seller_products category="electronics" limit="20"]
[seller_products featured="true"]
```

**주요 기능:**
- 판매가 자율 설정
- 마진율 계산기
- 재고 연동 확인
- 판매 통계

---

#### `[seller_settlement]` - 판매자 정산

마진 정산 내역과 지급 상태를 표시합니다.

**속성:**

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `period` | 문자열 | 30d | 조회 기간 (7d/30d/90d/1y) |
| `status` | 문자열 | all | 정산 상태 필터 (all/pending/scheduled/paid) |

**권한:** 판매자 로그인 필요 ✅

**예시:**
```
[seller_settlement]
[seller_settlement period="90d" status="paid"]
```

**표시 내용:**
- 정산 예정 금액
- 정산 완료 내역
- 거래별 수수료
- 지급 일정

---

#### `[seller_pricing_manager]` - 가격 일괄 관리

판매자가 여러 상품의 가격을 한 번에 관리합니다.

**속성:**

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `category` | 문자열 | - | 카테고리별 필터 |

**권한:** 판매자 로그인 필요 ✅

**예시:**
```
[seller_pricing_manager]
[seller_pricing_manager category="electronics"]
```

**주요 기능:**
- 일괄 가격 조정
- 마진율 일괄 설정
- 할인 이벤트 적용
- 가격 히스토리

---

### 드롭쉬핑 공통 Shortcodes

#### `[user_dashboard]` - 사용자 통합 대시보드

사용자의 역할에 따라 자동으로 적절한 대시보드를 표시합니다.

**속성:**

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `role` | 문자열 | - | 특정 역할 대시보드 강제 표시 (supplier/seller/partner) |

**권한:** 로그인 필요 ✅

**예시:**
```
[user_dashboard]
[user_dashboard role="partner"]
```

---

#### `[role_verification]` - 역할 인증 폼

드롭쉬핑 역할(공급자/판매자/파트너) 신청 및 인증 폼입니다.

**속성:**

| 속성 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `type` | 문자열 | ✅ | 역할 유형 (supplier/seller/partner) |

**권한:** 로그인 필요 ✅

**예시:**
```
[role_verification type="supplier"]
[role_verification type="partner"]
```

---

## 동적 필드 Shortcodes

Custom Post Type과 Advanced Custom Fields의 데이터를 동적으로 표시합니다.

### `[cpt_list]` - CPT 목록 표시

Custom Post Type 목록을 동적으로 표시합니다.

#### 속성

| 속성 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `type` | 문자열 | ✅ | - | CPT 타입 (예: ds_supplier, ds_product) |
| `limit` | 숫자 | | 10 | 표시 개수 |
| `template` | 문자열 | | - | 커스텀 템플릿 |
| `fields` | 문자열 | | - | 표시할 필드 (쉼표 구분) |

#### 예시

```
[cpt_list type="ds_supplier" limit="20"]
[cpt_list type="ds_product" template="grid" fields="title,price,image"]
```

---

### `[cpt_field]` - CPT 단일 필드

특정 CPT의 필드 값을 표시합니다.

#### 속성

| 속성 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `post_id` | 문자열 | ✅ | 포스트 ID |
| `field` | 문자열 | ✅ | 필드 이름 |

#### 예시

```
[cpt_field post_id="123" field="company_name"]
[cpt_field post_id="456" field="price"]
```

---

### `[acf_field]` - ACF 필드 값

Advanced Custom Fields 값을 표시합니다.

#### 속성

| 속성 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `field` | 문자열 | ✅ | - | ACF 필드 이름 |
| `post_id` | 문자열 | | - | 포스트 ID (생략 시 현재 포스트) |
| `format` | 불린 | | true | 포맷 적용 여부 |

#### 예시

```
[acf_field field="contact_email"]
[acf_field field="company_logo" post_id="123"]
```

---

## 고급 사용법

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
| 판매자 | 판매자 로그인 | 권한 요청 안내 |
| 관리자 | 관리자 권한 | 접근 제한 메시지 |

### 블록 에디터에서 사용

1. 블록 추가 버튼 클릭 (+)
2. "Shortcode" 블록 검색
3. Shortcode 입력
4. 미리보기로 확인

### 페이지 템플릿에서 사용

```php
<?php
// 파트너 홍보 페이지 템플릿
?>
<div class="partner-page">
  <?php echo do_shortcode('[partner_dashboard]'); ?>

  <section class="products-section">
    <h2>홍보 가능한 상품</h2>
    <?php echo do_shortcode('[partner_products limit="12"]'); ?>
  </section>

  <section class="commission-section">
    <h2>수수료 내역</h2>
    <?php echo do_shortcode('[partner_commissions period="30d"]'); ?>
  </section>
</div>
```

---

## 문제 해결

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
3. 숫자는 따옴표 유무 무관: `limit="10"` 또는 `limit=10`
4. 문자열은 따옴표로 감싸기: `category="전자제품"`

---

### 문제 4: "데이터가 표시되지 않음"

**원인:**
- 잘못된 ID/슬러그
- 데이터 없음
- 권한 부족

**해결:**
1. ID가 실제로 존재하는지 확인
2. 관리자 대시보드에서 해당 데이터 확인
3. 카테고리 슬러그 정확히 입력
4. 데이터 접근 권한 확인

---

## 📋 Shortcode 빠른 참조표

| Shortcode | 주요 사용처 | 필수 속성 | 권한 |
|-----------|-----------|----------|------|
| **콘텐츠** |
| `[recent_posts]` | 블로그 최신글 | - | ❌ |
| `[author]` | 작성자 프로필 | `id` | ❌ |
| **미디어** |
| `[gallery]` | 이미지 갤러리 | `ids` | ❌ |
| `[video]` | 비디오 임베드 | `url` | ❌ |
| **E-commerce** |
| `[product]` | 단일 상품 표시 | `id` | ❌ |
| `[product_grid]` | 상품 목록 | - | ❌ |
| `[add_to_cart]` | 구매 버튼 | `id` | ❌ |
| `[featured_products]` | 추천 상품 | - | ❌ |
| **폼** |
| `[form]` | 커스텀 폼 | `id` | ❌ |
| `[view]` | 데이터 뷰 | `id` | ❌ |
| **파트너** |
| `[partner_dashboard]` | 파트너 대시보드 | - | ✅ 파트너 |
| `[partner_products]` | 파트너 상품 | - | ✅ 파트너 |
| `[partner_commissions]` | 수수료 내역 | - | ✅ 파트너 |
| `[partner_link_generator]` | 링크 생성기 | - | ✅ 파트너 |
| **공급자** |
| `[supplier_dashboard]` | 공급자 대시보드 | - | ✅ 공급자 |
| `[supplier_products]` | 공급자 상품 관리 | - | ✅ 공급자 |
| `[supplier_product_editor]` | 상품 편집기 | - | ✅ 공급자 |
| `[supplier_analytics]` | 공급자 분석 | - | ✅ 공급자 |
| **판매자** |
| `[seller_dashboard]` | 판매자 대시보드 | - | ✅ 판매자 |
| `[seller_products]` | 판매자 상품 관리 | - | ✅ 판매자 |
| `[seller_settlement]` | 판매자 정산 | - | ✅ 판매자 |
| `[seller_pricing_manager]` | 가격 일괄 관리 | - | ✅ 판매자 |
| **동적 필드** |
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

**문서 버전:** v0.5.9
**최종 업데이트:** 2025-10-22
**다음 업데이트:** 새 shortcode 추가 시
