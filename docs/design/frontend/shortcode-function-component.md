# O4O Platform NextGen Function Component 통합 스펙 (최종안)

Version: 2025-12
Author: ChatGPT PM

---

## 1. 목적(Purpose)

본 문서는 O4O Platform에서 기존 shortcode 시스템을 완전히 폐기하고
**Function Component 기반의 새로운 기능 모듈 규격**을 정의한다.

Function Component는 다음을 위해 사용된다:

* View(JSON)의 "type"에 매핑되는 핵심 구성 요소
* 기존 shortcode의 로직을 분리·정리한 순수 기능 단위
* ViewRenderer가 직접 호출하는 기능 엔진
* UI 컴포넌트와 Layout에서 완전히 분리된 계층
* PageGenerator / ViewGenerator에서 자동으로 연결되는 기능

Function Component는 NextGen 아키텍처에서
**"페이지가 아니라 기능이 화면을 만든다"**는 철학을 기술적으로 구현한다.

---

## 2. Function Component 정의

Function Component는 다음 형태의 TypeScript 구조를 가진다.

```ts
export interface FunctionComponentProps {
  fetch?: {
    queryKey: string[];
    url: string;
    method?: "GET" | "POST";
    params?: Record<string, any>;
    body?: Record<string, any>;
  };
  [key: string]: any;
}

export type FunctionComponentResult = {
  type: string;               // 호출될 UI 컴포넌트 type
  props: Record<string, any>; // UI 컴포넌트가 소비할 props
};

export type FunctionComponent = (
  props: FunctionComponentProps,
  context: ViewContext
) => Promise<FunctionComponentResult> | FunctionComponentResult;
```

---

## 3. Function Component의 핵심 원칙

### 원칙 1) **레이아웃 코드 금지**

아래는 Function Component 내부에서 사용 금지:

* `<div class="container ...">`
* grid/flex 관련 Tailwind
* padding/margin
* 카드 wrapper
* columns/rows 레이아웃

모든 레이아웃은:

* ViewRenderer의 layout
* 상위 UI 컴포넌트

에서 처리한다.

---

### 원칙 2) **UI 표현 금지**

Function Component는 UI를 직접 렌더링하지 않는다.

#### ❌ 금지 예

```tsx
return (
  <div>
    <h1>{data.title}</h1>
  </div>
);
```

#### ✔ 허용 예

```ts
return {
  type: "SellerKPISection",
  props: { kpis: data.kpis }
};
```

---

### 원칙 3) **데이터만 생성 → UI 컴포넌트에 전달**

Function Component는 데이터를 가공해 UI 컴포넌트(props 형태)로 넘기는 것이 역할이다.

---

### 원칙 4) **fetch 규칙 준수**

ViewRenderer가 fetch를 미리 수행해 props.data로 전달하기 때문에
Function Component는 fetch 호출을 직접 하지 않는다.

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

ViewRenderer가:

* react-query / Axios 활용
* data를 props.data에 주입
* Function Component 호출

이 구조가 기본이다.

---

## 4. Function Component 개발 패턴

Function Component는 3가지 파일로 구성된다.

```
1) useSomethingQuery.ts  → 데이터 로딩
2) somethingFunction.ts  → 기능 로직
3) somethingView.json    → View 정의에서 호출
```

예:

```
SellerDashboard
  ├── useSellerDashboardData.ts
  ├── sellerDashboard.ts   ← Function Component
  └── (View JSON에서 type: "SellerDashboard")
```

---

## 5. Function Component 결과 구조

반환값은 반드시 UI 컴포넌트 type + props 조합이어야 한다.

### 예: KPIGrid로 전달

```ts
export function sellerDashboard(props) {
  const { data } = props;

  return {
    type: "KPIGrid",
    props: {
      columns: 4,
      items: data.kpis
    }
  };
}
```

### 예: 복합 UI 출력(여러 컴포넌트)

여러 UI 컴포넌트를 반환해야 하는 경우:

```ts
return {
  type: "Multi",
  props: {
    components: [
      { type: "KPIGrid", props: { ... } },
      { type: "ProductList", props: { ... } }
    ]
  }
};
```

Renderer는 Multi type을 확장하여 처리한다.

---

## 6. Component Registry 연동 규칙

Function Component는 반드시 Component Registry에 등록된다.

경로:

```
apps/main-site/src/components/registry.ts
```

구조:

```ts
import { sellerDashboard } from "@/shortcodes/_functions/sellerDashboard";

export const FunctionRegistry = {
  SellerDashboard: sellerDashboard,
  SupplierDashboard: supplierDashboard,
  PartnerDashboard: partnerDashboard,
};
```

UI 컴포넌트는 별도 레지스트리에 등록:

```ts
export const UIComponentRegistry = {
  KPIGrid,
  ProductList,
  ProductCard,
  Chart,
  Table,
};
```

---

## 7. ViewRenderer 호출 순서

Renderer는 Function Component 호출 시 다음 순서를 따른다:

```
1) View JSON 가져오기
2) fetch 수행 (react-query)
3) data를 props에 주입
4) Function Component 호출
5) Function Component 결과(type, props)를 UI Component에 전달
6) UI Component 렌더링
```

---

## 8. AI Generator 규칙

AI가 Function Component를 생성하는 경우 반드시 다음 규칙을 따른다:

1. type 이름은 Registry key와 정확히 일치
2. props는 JSON friendly
3. fetch는 API 기반으로 제시
4. UI 코드를 포함하지 않음
5. 스타일을 포함하지 않음
6. 데이터 구조는 실제 API 기반

---

## 9. 기존 shortcode 폐기 규칙

기존 shortcode 구조:

```
1) shortcode.tsx (Layout + Logic)
2) shortcode.scss
3) nested components
```

NextGen에서는:

### ❌ 완전 폐기

대신:

```
shortcodes/_functions/
   sellerDashboard.ts
   supplierDashboard.ts
   ...
```

이 구조로 대체한다.

---

## 10. 이 문서의 역할

이 문서는:

* shortcode → Function Component 전환의 최종 기준
* ViewRenderer와 기능 컴포넌트 연동 기준
* AI PageGenerator 출력 규칙
* 향후 모든 화면 구성의 기본 단위

으로 사용된다.

---

# ✔ Step D — Function Component 통합 스펙 작성 완료
