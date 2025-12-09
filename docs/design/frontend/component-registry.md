# O4O Platform — NextGen Component Registry 스펙 (최종안)

Version: 2025-12
Author: ChatGPT PM

---

## 1. 목적

Component Registry는 ViewRenderer가 View(JSON)의 `"type"` 필드를 기반으로
올바른 Function Component 또는 UI Component를 불러오기 위한
**단일 진입점(Single Source of Truth)** 이다.

NextGen 구조에서는:

* Page 사라짐
* Block Editor 사라짐
* Theme 사라짐
* shortcode는 기능 컴포넌트로 변환됨

따라서 ViewRenderer가 화면을 렌더링하기 위해 의존할 수 있는 **유일한 이름 기반 매핑 시스템**이 바로 Component Registry다.

---

## 2. 구성 요소

Component Registry는 다음 두 종류로 구성된다.

### 2.1 Function Component Registry

(기존 shortcode → 기능 컴포넌트로 변환된 것들)

* 데이터 처리
* fetch 후 가공
* 비즈니스 로직
* UI 컴포넌트 호출을 위한 props 생성

### 2.2 UI Component Registry

(실제로 화면을 구성하는 순수 UI 요소들)

* 카드
* 리스트
* KPI
* 테이블
* 폼
* 차트

---

## 3. Registry 파일 구조

Component Registry는 main-site에서 다음 구조로 구성된다:

```
apps/main-site/src/components/
  ├── registry/
  │     ├── function.ts
  │     ├── ui.ts
  │     └── index.ts
  ├── ui/
  └── ...
```

각 레지스트리는 명확한 분리 원칙을 따른다:

---

### 3.1 Function Component Registry

경로:

```
apps/main-site/src/components/registry/function.ts
```

역할:

* Function Component (기능 컴포넌트)들을 type 이름으로 매핑
* ViewRenderer가 `"type": "SellerDashboard"` 식으로 호출할 수 있게 함

형태:

```ts
import { sellerDashboard } from "@/shortcodes/_functions/sellerDashboard";
import { supplierDashboard } from "@/shortcodes/_functions/supplierDashboard";
import { partnerDashboard } from "@/shortcodes/_functions/partnerDashboard";

export const FunctionRegistry = {
  SellerDashboard: sellerDashboard,
  SupplierDashboard: supplierDashboard,
  PartnerDashboard: partnerDashboard,
};
```

규칙:

* Key는 View JSON `"type"` 필드와 반드시 일치
* Value는 Function Component
* PascalCase / UpperCamelCase 사용

---

### 3.2 UI Component Registry

경로:

```
apps/main-site/src/components/registry/ui.ts
```

역할:

* 화면에 실제 렌더링될 UI 컴포넌트 등록

예:

```ts
import { KPIGrid } from "@/components/ui/KPIGrid";
import { ProductCard } from "@/components/ui/ProductCard";
import { ProductTable } from "@/components/ui/ProductTable";
import { ChartLine } from "@/components/ui/ChartLine";

export const UIComponentRegistry = {
  KPIGrid,
  ProductCard,
  ProductTable,
  ChartLine,
};
```

규칙:

* UI 컴포넌트는 UI용 폴더(`/ui/`)에만 둔다
* Function Component와 절대 혼합 금지
* UI는 오직 **입력된 props만** 사용
* 데이터 fetch, 비즈니스 로직 불가

---

### 3.3 Combined Registry (ViewRenderer 사용)

ViewRenderer는 두 가지 Registry를 모두 사용하므로
`index.ts`에서 결합하여 export 한다.

경로:

```
apps/main-site/src/components/registry/index.ts
```

내용:

```ts
import { FunctionRegistry } from "./function";
import { UIComponentRegistry } from "./ui";

export const ComponentRegistry = {
  ...FunctionRegistry,
  ...UIComponentRegistry,
};
```

Renderer는 이렇게 사용:

```ts
const Component = ComponentRegistry[component.type];
```

---

## 4. Registry 이름 규칙

### Function Component (기능)

* PascalCase
* 반드시 구체적인 목적이 들어가야 함
  예:
* SellerDashboard
* SupplierDashboard
* PartnerDashboard
* ProductDetailFetcher

### UI Component

* PascalCase
* 시각적 요소 중심
  예:
* KPIGrid
* ProductCard
* ChartLine
* OrderSummaryCard

### View JSON type 규칙

* Registry Key와 일치
* 케이스까지 동일해야 함

---

## 5. Function Component 호출 흐름

ViewRenderer는 다음 순서를 따른다:

```
1. View.components 배열 순회
2. component.type 값 확인
3. ComponentRegistry에서 매칭되는 항목 찾기
4. Function Component인지 확인
5. fetch 규칙을 적용해 props.data 확보
6. Function Component 실행
7. Function Component의 반환값의 type을 UI Registry에서 찾음
8. UI 컴포넌트로 렌더링
```

이 흐름은 NextGen 화면의 핵심 작동 방식이다.

---

## 6. Function Component → UI Component의 관계

### 규칙 요약

* Function Component는 "기능"
* UI Component는 "화면"
* Function → UI를 호출하지만
  UI → Function을 호출해서는 안 된다.

---

## 7. 부재 컴포넌트 대응 규칙

만약 컴포넌트가 Registry에 없을 경우:

* 개발환경에서 에러 표시
* 프로덕션에서는 fallback 컴포넌트 사용

예:

```ts
export const MissingComponent = () => (
  <div className="p-4 text-red-500">Component not found.</div>
);
```

Renderer 적용:

```ts
const Component = ComponentRegistry[type] || MissingComponent;
```

---

## 8. Component Registry 자동 생성

향후 AI/Antigravity 기반 자동화에서는:

* `_generated/functions/`
* `_generated/ui/`

두 경로의 컴포넌트를 자동 스캔하여 Registry 파일을 자동 업데이트할 수 있음.

이는 PageGenerator/AppStore 기능과 통합될 수 있다.

---

## 9. 이 문서의 역할

이 문서는 다음을 위한 기준 스펙이다:

* ViewRenderer가 Component를 정확히 찾을 수 있도록 함
* Function Component와 UI Component의 역할 분리를 명문화
* View Schema와 ViewGenerator에서 "type"을 일관되게 사용
* Frontend 전체 구조의 SSOT(Single Source of Truth) 역할

---

# ✔ Step G — Component Registry 스펙 작성 완료
