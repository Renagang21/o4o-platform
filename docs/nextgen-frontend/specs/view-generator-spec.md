# O4O Platform — NextGen ViewGenerator 사양서 (최종안)

Version: 2025-12
Author: ChatGPT PM

---

## 1. 목적

ViewGenerator는 O4O Platform의 차세대 페이지 생성 엔진으로,
다음 기능을 수행한다:

* URL 또는 명령을 입력받아
* View Schema(JSON)를 생성하고
* ViewRenderer가 바로 화면을 출력할 수 있도록 구성하며
* Block Editor/Theme/Page 개념을 완전히 대체하는
* AI Native Frontend의 핵심 컴포넌트

---

## 2. 역할 정의

ViewGenerator의 핵심 역할은 다음 네 가지이다:

1. **사용자 입력(또는 AI 입력)을 View JSON Schema로 변환**
2. **기능 컴포넌트(Function Component)와 UI 컴포넌트 매핑 자동화**
3. **API 기반 fetch 규칙 자동 추가**
4. **레이아웃/페이지 구조를 LayoutRegistry 기반으로 자동 생성**

---

## 3. 입력(Input)

ViewGenerator는 다음 3가지 형태의 입력을 지원한다.

### 3.1 URL 기반 생성

예:

```
/dashboard/seller
/shop
/products/cleanser
```

ViewGenerator는 URL을 분석해 적절한 View를 생성한다.

### 3.2 명령(Command) 기반 생성

예:

```
generate view seller dashboard
generate view shop categories skincare
generate view product-list
```

### 3.3 AI 기반 생성을 위한 Prompt 기반 입력

(예: 3분 안에 상품목록 페이지를 생성하는 프롬프트)

```
"베스트셀러 8개를 보여주는 상품 목록 페이지 생성해줘."
```

---

## 4. 출력(Output)

출력은 반드시 **View JSON Schema**이다.

예:

```json
{
  "viewId": "seller-dashboard",
  "layout": { "type": "DashboardLayout" },
  "components": [
    {
      "type": "KPIGrid",
      "props": {
        "columns": 4,
        "items": [ ... ]
      }
    },
    {
      "type": "SellerProductList",
      "props": {
        "fetch": {
          "queryKey": ["seller-products"],
          "url": "/api/seller/products"
        }
      }
    }
  ]
}
```

---

## 5. 내부 구성 요소

ViewGenerator는 5개 모듈로 구성된다.

### 5.1 Router Mapper

URL → viewId 변환

### 5.2 Component Suggestion Engine

* 어떤 UI를 어떤 Function Component로 구성해야 하는지 자동 추론
* 예: seller-dashboard → KPIGrid + SellerProductList

### 5.3 Fetch Mapping Engine

* API 링크 분석하여 fetch 규칙 자동 삽입
* 예: `/api/seller/products` → fetch로 자동 정의

### 5.4 Layout Selector

* 페이지 유형에 따른 layout 자동 매핑
  예:

```
대시보드 → DashboardLayout
상품목록 → ShopLayout
로그인 → AuthLayout
```

### 5.5 View Assembler

* layout + components + fetch + 조건/반복 규칙을
  하나의 View JSON으로 조립

---

## 6. Component Mapping 규칙

ViewGenerator는 다음 규칙으로 컴포넌트를 선택한다.

### 6.1 대시보드 유형

```
SellerDashboard    → KPIGrid, SellerProductList
SupplierDashboard  → KPIGrid, SupplierProductList
PartnerDashboard   → KPIGrid, PartnerStats
```

### 6.2 쇼핑몰 유형

```
ProductList        → ProductCard (loop)
ProductDetail      → ProductDetailView
Cart               → CartItems, Summary
Checkout           → CheckoutForm
```

### 6.3 인증/계정 유형

```
Login              → LoginForm
Signup             → SignupForm
MyAccount          → AccountOverview
```

---

## 7. fetch 규칙 자동 생성

ViewGenerator가 API를 자동 분석해 다음 구조를 생성한다:

```json
{
  "fetch": {
    "queryKey": ["seller-products"],
    "url": "/api/seller/products",
    "method": "GET"
  }
}
```

규칙:

1. queryKey는 URL slug를 기반으로 자동 생성
2. 메서드 기본값은 GET
3. POST일 경우 body 자동 제공
4. ViewRenderer가 react-query로 데이터 로딩

---

## 8. 조건부 렌더링 자동 생성

예: 판매자만 접근 가능한 View

```json
{
  "if": "user.role == 'seller'",
  "then": { "type": "SellerDashboard" },
  "else": { "type": "AccessDenied" }
}
```

---

## 9. 반복(loop) 자동 생성

상품 리스트:

```json
{
  "loop": "p in data.products",
  "component": {
    "type": "ProductCard",
    "props": {
      "title": "{{p.title}}",
      "price": "{{p.price}}"
    }
  }
}
```

---

## 10. Layout 자동 선택 규칙

ViewGenerator는 LayoutRegistry를 기반으로 layout을 선택한다:

```
DashboardLayout
ShopLayout
AuthLayout
DefaultLayout
```

UI 스타일과 HTML 구조는 layout에서 담당하며
View JSON은 기능 구조만 정의.

---

## 11. 파일 출력 방식

ViewGenerator는 3가지 출력 위치를 지원한다.

### 11.1 `_generated/views/`

AI 또는 CLI가 생성하는 자동 파일

```
_generated/views/seller-dashboard.json
```

### 11.2 `apps/main-site/src/views/`

정적/수동 관리 View

```
apps/main-site/src/views/home.json
```

### 11.3 API 서버로 저장 (후속 단계)

DB 저장 시:

```
viewId
url
json
updatedAt
createdBy
```

---

## 12. AI·Antigravity 연동 규칙

Antigravity에서 UI를 생성하면:

```
UI → React/Tailwind → ViewGenerator Input → View JSON → main-site
```

이 흐름으로 자동 연결된다.

#### 절대 불가:

* HTML 그대로 사용
* CSS 그대로 사용
* React 컴포넌트 직접 생성

#### 반드시 사용:

* View JSON 구조
* Function Component
* UI Component
* fetch

---

## 13. 이 문서의 역할

이 스펙은:

* Block Editor 제거 후 유일한 페이지 생성 엔진 사양
* AI Native Frontend의 근간
* PageGenerator의 완전한 대체
* main-site의 ViewRenderer와 직접 연결
* O4O Platform NextGen의 핵심 스펙

으로 사용된다.

---

# ✔ Step E — ViewGenerator(App) 스펙 작성 완료
