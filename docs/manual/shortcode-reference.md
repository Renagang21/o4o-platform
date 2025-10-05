# 숏코드 레퍼런스

> 마지막 업데이트: 2025-10-05

## 숏코드란?

숏코드는 페이지나 게시물에 동적 콘텐츠를 삽입하는 간단한 방법입니다. `[숏코드_이름 속성="값"]` 형태로 사용합니다.

**사용 예시:**
```
[product_grid category="전자제품" limit="8"]
```

---

## 📑 목차

- [콘텐츠 숏코드](#콘텐츠-숏코드)
- [미디어 숏코드](#미디어-숏코드)
- [E-commerce 숏코드](#e-commerce-숏코드)
- [폼 숏코드](#폼-숏코드)
- [드롭쉬핑 숏코드](#드롭쉬핑-숏코드)
  - [파트너 숏코드](#파트너-숏코드)
  - [공급사 숏코드](#공급사-숏코드)
  - [판매자 숏코드](#판매자-숏코드)
  - [관리자 숏코드](#관리자-숏코드)

---

## 콘텐츠 숏코드

### [recent_posts]

최근 게시물 목록을 표시합니다.

**속성:**
- `limit` (숫자, 기본값: 5) - 표시할 게시물 수
- `category` (문자열, 선택사항) - 특정 카테고리 필터

**사용 예시:**
```
[recent_posts limit="10"]
[recent_posts limit="5" category="뉴스"]
```

---

### [author]

작성자 정보를 표시합니다.

**속성:**
- `id` (문자열, 필수) - 작성자 ID 또는 사용자명

**사용 예시:**
```
[author id="john"]
[author id="admin"]
```

---

## 미디어 숏코드

### [gallery]

이미지 갤러리를 표시합니다.

**속성:**
- `ids` (문자열, 필수) - 쉼표로 구분된 이미지 ID 목록
- `columns` (숫자, 기본값: 3) - 갤러리 열 개수
- `size` (문자열, 기본값: medium) - 이미지 크기 (thumbnail, medium, large, full)

**사용 예시:**
```
[gallery ids="1,2,3,4,5,6"]
[gallery ids="10,11,12" columns="4" size="large"]
```

---

### [video]

YouTube, Vimeo 등 비디오를 임베드합니다.

**속성:**
- `url` (문자열, 필수) - 비디오 URL
- `width` (숫자, 기본값: 560) - 비디오 너비 (픽셀)
- `height` (숫자, 기본값: 315) - 비디오 높이 (픽셀)

**사용 예시:**
```
[video url="https://youtube.com/watch?v=dQw4w9WgXcQ"]
[video url="https://vimeo.com/123456789" width="800" height="450"]
```

---

## E-commerce 숏코드

### [product]

단일 상품을 표시합니다.

**속성:**
- `id` (문자열, 필수) - 상품 ID
- `variant` (문자열, 기본값: card) - 표시 스타일 (card, list, compact)

**사용 예시:**
```
[product id="123"]
[product id="456" variant="list"]
```

---

### [product_grid]

상품 그리드를 표시합니다.

**속성:**
- `category` (문자열, 선택사항) - 카테고리 필터
- `limit` (숫자, 기본값: 8) - 표시할 상품 수
- `columns` (숫자, 기본값: 4) - 그리드 열 개수 (2, 3, 4, 5, 6)

**사용 예시:**
```
[product_grid limit="12"]
[product_grid category="전자제품" limit="8" columns="4"]
[product_grid category="의류" columns="3"]
```

---

### [add_to_cart]

장바구니 추가 버튼을 표시합니다.

**속성:**
- `id` (문자열, 필수) - 상품 ID
- `text` (문자열, 기본값: 장바구니에 담기) - 버튼 텍스트

**사용 예시:**
```
[add_to_cart id="123"]
[add_to_cart id="456" text="지금 구매하기"]
```

---

### [featured_products]

추천 상품 목록을 표시합니다.

**속성:**
- `limit` (숫자, 기본값: 4) - 표시할 상품 수

**사용 예시:**
```
[featured_products]
[featured_products limit="8"]
```

---

## 폼 숏코드

### [form]

폼을 페이지에 삽입합니다.

**속성:**
- `id` (문자열, 필수) - 폼 ID

**사용 예시:**
```
[form id="contact-form"]
[form id="registration"]
```

---

### [view]

데이터 뷰를 표시합니다.

**속성:**
- `id` (문자열, 필수) - 뷰 ID

**사용 예시:**
```
[view id="submissions"]
[view id="survey-results"]
```

---

## 드롭쉬핑 숏코드

### 파트너 숏코드

#### [partner_dashboard]

파트너 메인 대시보드를 표시합니다.

**속성:** 없음

**사용 예시:**
```
[partner_dashboard]
```

**설명:** 파트너의 전체 대시보드를 표시합니다. 통계, 최근 활동, 빠른 작업 등을 포함합니다.

**필요 권한:** 파트너 로그인 필요

---

#### [partner_products]

파트너 상품 목록을 표시합니다.

**속성:** 없음

**사용 예시:**
```
[partner_products]
```

**설명:** 파트너가 홍보할 수 있는 상품 목록을 표시합니다. 검색, 필터, 정렬 기능 포함.

**필요 권한:** 파트너 로그인 필요

---

#### [partner_commissions]

파트너 커미션 내역을 표시합니다.

**속성:** 없음

**사용 예시:**
```
[partner_commissions]
```

**설명:** 파트너의 커미션 내역, 수익 통계, 정산 정보를 표시합니다.

**필요 권한:** 파트너 로그인 필요

---

#### [partner_link_generator]

파트너 링크 생성기를 표시합니다.

**속성:** 없음

**사용 예시:**
```
[partner_link_generator]
```

**설명:** 상품 또는 페이지에 대한 파트너 추천 링크를 생성하는 도구입니다.

**필요 권한:** 파트너 로그인 필요

---

#### [commission_dashboard]

커미션 대시보드를 표시합니다.

**속성:** 없음

**사용 예시:**
```
[commission_dashboard]
```

**설명:** 커미션 통계, 차트, 상세 분석을 제공하는 대시보드입니다.

**필요 권한:** 파트너 로그인 필요

---

#### [payout_requests]

출금 요청 관리를 표시합니다.

**속성:** 없음

**사용 예시:**
```
[payout_requests]
```

**설명:** 파트너가 수익 출금을 요청하고 내역을 확인할 수 있는 인터페이스입니다.

**필요 권한:** 파트너 로그인 필요

---

### 공급사 숏코드

#### [supplier_products]

공급사 상품 목록을 표시합니다.

**속성:** 없음

**사용 예시:**
```
[supplier_products]
```

**설명:** 공급사가 등록한 상품 목록을 관리하는 인터페이스입니다. 상품 추가, 수정, 삭제 가능.

**필요 권한:** 공급사 로그인 필요

---

#### [supplier_product_editor]

공급사 상품 편집기를 표시합니다.

**속성:** 없음

**사용 예시:**
```
[supplier_product_editor]
```

**설명:** 상품을 등록하거나 수정하는 전용 편집기입니다.

**필요 권한:** 공급사 로그인 필요

---

### 판매자 숏코드

#### [seller_dashboard]

판매자 대시보드를 표시합니다.

**속성:** 없음

**사용 예시:**
```
[seller_dashboard]
```

**설명:** 판매자의 판매 통계, 주문 현황, 재고 상태를 표시하는 대시보드입니다.

**필요 권한:** 판매자 로그인 필요

---

#### [seller_products]

판매자 상품 관리를 표시합니다.

**속성:** 없음

**사용 예시:**
```
[seller_products]
```

**설명:** 판매자가 판매 중인 상품 목록과 재고 관리 인터페이스입니다.

**필요 권한:** 판매자 로그인 필요

---

#### [seller_settlement]

판매자 정산 내역을 표시합니다.

**속성:** 없음

**사용 예시:**
```
[seller_settlement]
```

**설명:** 판매 수익, 수수료, 정산 내역을 확인할 수 있는 인터페이스입니다.

**필요 권한:** 판매자 로그인 필요

---

### 일반 사용자 숏코드

#### [user_dashboard]

사용자 역할 기반 대시보드를 표시합니다.

**속성:**
- `role` (문자열, 선택사항) - 특정 역할 대시보드 표시 (supplier, seller, affiliate)

**사용 예시:**
```
[user_dashboard]
[user_dashboard role="supplier"]
```

**설명:** 로그인한 사용자의 역할에 따라 적절한 대시보드를 자동으로 표시합니다.

**필요 권한:** 로그인 필요

---

#### [role_verification]

역할 인증 폼을 표시합니다.

**속성:**
- `type` (문자열, 필수) - 인증할 역할 (supplier, seller, affiliate)

**사용 예시:**
```
[role_verification type="supplier"]
[role_verification type="seller"]
```

**설명:** 사용자가 특정 역할로 등록하기 위한 인증 폼입니다.

---

### 관리자 숏코드

#### [admin_approval_queue]

관리자 승인 대기열을 표시합니다.

**속성:** 없음

**사용 예시:**
```
[admin_approval_queue]
```

**설명:** 파트너, 공급사, 판매자 신청을 검토하고 승인/거부하는 관리자 인터페이스입니다.

**필요 권한:** 관리자 권한 필요

---

#### [admin_platform_stats]

플랫폼 통계를 표시합니다.

**속성:** 없음

**사용 예시:**
```
[admin_platform_stats]
```

**설명:** 전체 플랫폼의 사용자 수, 거래량, 수익 등 주요 지표를 표시하는 관리자 대시보드입니다.

**필요 권한:** 관리자 권한 필요

---

## 💡 사용 팁

### 1. 숏코드 조합하기

여러 숏코드를 조합하여 풍부한 페이지를 만들 수 있습니다:

```
<!-- 상품 소개 페이지 -->
<h2>베스트 셀러</h2>
[featured_products limit="4"]

<h2>전체 상품</h2>
[product_grid category="전자제품" limit="12" columns="4"]

<h2>문의하기</h2>
[form id="product-inquiry"]
```

### 2. 블록 에디터에서 사용

블록 에디터에서 "숏코드" 블록을 추가하고 숏코드를 입력하세요.

### 3. 조건부 표시

일부 숏코드는 로그인 상태나 권한에 따라 다르게 표시됩니다:

- **파트너 숏코드**: 파트너로 로그인한 경우에만 작동
- **관리자 숏코드**: 관리자 권한이 있는 경우에만 작동
- **일반 숏코드**: 누구나 볼 수 있음

### 4. 속성 생략

속성에 기본값이 있는 경우 생략 가능합니다:

```
[product_grid]  <!-- 기본값 사용: limit=8, columns=4 -->
[product_grid limit="12"]  <!-- columns는 기본값 4 사용 -->
```

---

## 🔧 문제 해결

### 숏코드가 표시되지 않음

**증상:** `[product_grid]`가 그대로 텍스트로 표시됨

**해결:**
1. 숏코드 이름이 정확한지 확인
2. 속성 이름과 값이 올바른지 확인
3. 필수 속성이 누락되지 않았는지 확인

### 권한 오류

**증상:** "로그인이 필요합니다" 또는 "권한이 없습니다" 메시지

**해결:**
1. 해당 숏코드에 필요한 권한으로 로그인했는지 확인
2. 계정에 올바른 역할이 부여되었는지 확인
3. 관리자에게 권한 요청

### 속성이 적용되지 않음

**증상:** 숏코드는 작동하지만 속성이 무시됨

**해결:**
1. 속성 이름 철자 확인
2. 속성 값이 올바른 형식인지 확인 (숫자는 따옴표 없이: `limit="10"` 또는 `limit=10`)
3. 지원하는 속성인지 이 문서에서 확인

---

## 📞 지원

숏코드 관련 문의사항이나 새로운 숏코드 요청은 개발팀에 문의하세요.

---

## 📋 숏코드 요약표

| 숏코드 | 카테고리 | 주요 속성 | 권한 필요 |
|--------|---------|----------|----------|
| `[recent_posts]` | 콘텐츠 | limit, category | ❌ |
| `[author]` | 콘텐츠 | id | ❌ |
| `[gallery]` | 미디어 | ids, columns, size | ❌ |
| `[video]` | 미디어 | url, width, height | ❌ |
| `[product]` | E-commerce | id, variant | ❌ |
| `[product_grid]` | E-commerce | category, limit, columns | ❌ |
| `[add_to_cart]` | E-commerce | id, text | ❌ |
| `[featured_products]` | E-commerce | limit | ❌ |
| `[form]` | 폼 | id | ❌ |
| `[view]` | 폼 | id | ❌ |
| `[partner_dashboard]` | 드롭쉬핑 | - | ✅ 파트너 |
| `[partner_products]` | 드롭쉬핑 | - | ✅ 파트너 |
| `[partner_commissions]` | 드롭쉬핑 | - | ✅ 파트너 |
| `[partner_link_generator]` | 드롭쉬핑 | - | ✅ 파트너 |
| `[commission_dashboard]` | 드롭쉬핑 | - | ✅ 파트너 |
| `[payout_requests]` | 드롭쉬핑 | - | ✅ 파트너 |
| `[supplier_products]` | 드롭쉬핑 | - | ✅ 공급사 |
| `[supplier_product_editor]` | 드롭쉬핑 | - | ✅ 공급사 |
| `[seller_dashboard]` | 드롭쉬핑 | - | ✅ 판매자 |
| `[seller_products]` | 드롭쉬핑 | - | ✅ 판매자 |
| `[seller_settlement]` | 드롭쉬핑 | - | ✅ 판매자 |
| `[user_dashboard]` | 드롭쉬핑 | role | ✅ 로그인 |
| `[role_verification]` | 드롭쉬핑 | type | ❌ |
| `[admin_approval_queue]` | 관리자 | - | ✅ 관리자 |
| `[admin_platform_stats]` | 관리자 | - | ✅ 관리자 |

---

**문서 버전:** 1.0
**최종 수정:** 2025-10-05
**다음 업데이트 예정:** 새 숏코드 추가 시
