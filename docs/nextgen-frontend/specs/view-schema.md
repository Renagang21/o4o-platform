# 📄 **view-schema.md — O4O Platform NextGen View Schema (최종안)**

Version: 2025-12
Author: ChatGPT PM
------------------

## 1. 목적(Purpose)

본 문서는 O4O Platform NextGen 프론트엔드 구조의 핵심인
**View(JSON) 기반 화면 시스템의 표준 스키마**를 정의한다.

View Schema는 다음을 위해 사용된다:

* 기존 Page 개념(WordPress 기반) 완전 대체
* Block Editor 폐기 후 자연스럽게 이어지는 AI Native 구조
* Page Generator App이 자동 생성하는 결과물(JSON)
* main-site의 ViewRenderer가 해석하여 화면을 출력
* shortcode 기능 컴포넌트와 직접 연동
* Theme/Header/Footer 제거 이후 Layout 시스템의 최소 단위 정의

---

## 2. 상위 구조(Top-Level Structure)

모든 View JSON은 아래 구조를 기본으로 한다.

```json
{
  "viewId": "string",
  "meta": { },
  "layout": { },
  "sections": [ ],
  "components": [ ]
}
```

각 필드의 목적은 다음과 같다.

### 2.1 viewId

* 고유 ID
* 라우팅 매핑 또는 생성 파이프라인 식별자
* 예: `"seller-dashboard"`, `"product-list"`, `"home"`

### 2.2 meta (선택적)

페이지 정보, SEO, 접근 조건, permissions 등을 포함

```json
{
  "title": "string",
  "description": "string",
  "cache": true,
  "authRequired": false,
  "roles": ["seller", "supplier"]
}
```

### 2.3 layout

헤더/푸터/사이드바 같은 template 구성
(테마 개념은 버림 → Layout 컴포넌트만 사용)

```json
{
  "type": "DefaultLayout",
  "props": {
    "header": true,
    "footer": true
  }
}
```

### 2.4 sections (선택적)

큰 화면 구조를 구분할 때 사용
(사용하지 않아도 무방함)

예: Hero / Content / Sidebar 등

```json
[
  { "id": "hero", "components": [ ... ] },
  { "id": "main", "components": [ ... ] }
]
```

### 2.5 components (핵심)

**View Schema의 중심**
모든 UI 구성 요소가 이 배열 안에 존재한다.

예:

```json
[
  {
    "type": "KPIGrid",
    "props": {
      "columns": 4,
      "items": [
        { "label": "승인대기", "value": 12 },
        { "label": "신규등록 가능", "value": 3 }
      ]
    }
  },
  {
    "type": "ProductList",
    "props": { "category": "skincare" }
  }
]
```

---

## 3. 컴포넌트 정의 규칙

모든 컴포넌트(type)는 아래 두 가지 중 하나다.

### ✔ 1) "기능 컴포넌트(Function Component)"

(shortcode의 최종 형태)

```ts
type FunctionComponent = {
  type: string;  // 예: "SellerDashboard"
  props: object;
}
```

### ✔ 2) "UI 컴포넌트"

(KPIGrid, Table, Chart 등)

둘 모두 동일한 구조를 따르며,
차이점은 "props를 누가 채우느냐" 뿐이다.

---

## 4. 데이터 바인딩 규칙

### 4.1 정적 데이터

View JSON 안에 직접 포함

### 4.2 동적 데이터

ViewRenderer는 다음 규칙을 지원:

```
props.fetch.queryKey
props.fetch.url
props.fetch.method
```

예:

```json
{
  "type": "SellerDashboard",
  "props": {
    "fetch": {
      "queryKey": ["seller-dashboard"],
      "url": "/api/seller/dashboard"
    }
  }
}
```

이 경우 Renderer는 다음을 수행:

* react-query 기반 useQuery 자동 호출
* data를 props로 merge
* 컴포넌트에 전달

---

## 5. 조건부 렌더링 규칙

Renderer는 다음 조건문을 지원한다:

```json
{
  "if": "user.role == 'seller'",
  "then": { "type": "SellerDashboard" },
  "else": { "type": "AccessDenied" }
}
```

이는 코드 없이 JSON으로 제어 가능하도록 설계된 규칙이다.

---

## 6. 반복 렌더링 규칙(loop)

리스트, 카드, 테이블을 JSON에서 반복해 생성할 수 있는 규칙:

```json
{
  "loop": "item in data.items",
  "component": {
    "type": "ProductCard",
    "props": {
      "title": "{{item.title}}",
      "price": "{{item.price}}"
    }
  }
}
```

---

## 7. View Schema 전체 예시

판매자 대시보드 예시:

```json
{
  "viewId": "seller-dashboard",
  "layout": {
    "type": "DashboardLayout"
  },
  "components": [
    {
      "type": "KPIGrid",
      "props": {
        "columns": 4,
        "items": [
          { "label": "승인대기 제품", "value": 12 },
          { "label": "신규 신청 가능", "value": 3 },
          { "label": "미완료 교육", "value": 1 },
          { "label": "오늘 주문", "value": 5 }
        ]
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

## 8. 확장 규칙 (AI-Generated View)

AI가 자동 생성하는 경우 다음을 반드시 따라야 함:

1. type 이름은 Component Registry 기준
2. layout은 공식 LayoutRegistry 기준
3. props는 모두 JSON friendly
4. inline HTML 불가
5. style/text는 모두 props 사용
6. 코드는 일체 포함하지 않음
7. 모든 동적 데이터는 fetch 규칙으로 연결

---

## 9. Component Registry 연동 규칙

ViewRenderer는 다음 경로에서 컴포넌트를 찾음:

```
apps/main-site/src/components/registry.ts
```

구조:

```ts
export const ComponentRegistry = {
  KPIGrid,
  SellerDashboard,
  ProductList,
  ProductCard,
  ...
};
```

---

## 10. 이 문서의 역할

이 스키마는:

* 기존 Page 개념의 완전한 대체제
* NextGen 프론트엔드의 중심 데이터 구조
* 페이지 생성·편집·렌더링을 하나로 통합
* AI Native Frontend의 기반
* o4o-platform 프론트엔드의 최종 표준

으로 사용한다.

---

# ✔ Step A — View Schema 최종안 작성 완료

---
