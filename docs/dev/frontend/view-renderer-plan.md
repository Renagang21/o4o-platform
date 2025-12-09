# O4O Platform — NextGen ViewRenderer 구현 계획서 (최종안)

Version: 2025-12
Author: ChatGPT PM

---

## 1. 목적

ViewRenderer는 O4O Platform NextGen 프론트엔드의 핵심 엔진으로,
**View Schema(JSON)를 받아 실제 화면(React UI)을 출력하는 역할**을 수행한다.

기존 Page/Template/Theme/BlockEditor 시스템을 완전히 대체하며:

* View Schema 해석
* fetch 규칙 처리
* Function Component 실행
* UI Component 렌더링
* Layout 시스템 적용

모든 화면은 이 Renderer를 통해 구성된다.

---

## 2. 전체 구조 개요

ViewRenderer는 다음 순서대로 작동한다:

```
1. URL 확인 (React Router v7)
2. ViewLoader(viewId, JSON) 로드
3. fetch 규칙 처리 (react-query)
4. Function Component 실행
5. UI Component 매핑
6. Layout 적용
7. React DOM 렌더링
```

이를 코드 흐름으로 표현하면:

```tsx
<ViewRenderer />
  ↓
loadView(url)
  ↓
resolveComponent(component.type)
  ↓
injectData(props.fetch)
  ↓
executeFunctionComponent()
  ↓
renderUIComponent()
  ↓
wrapLayout()
```

---

## 3. 필요한 폴더 구조

main-site는 다음 구조로 정리한다:

```
apps/main-site/src/
  ├── view/
  │    ├── loader.ts
  │    ├── renderer.tsx
  │    └── types.ts
  ├── components/
  │    └── registry/
  │         ├── function.ts
  │         ├── ui.ts
  │         └── index.ts
  ├── layouts/
  │    ├── DefaultLayout.tsx
  │    ├── DashboardLayout.tsx
  │    ├── ShopLayout.tsx
  │    ├── AuthLayout.tsx
  │    ├── MinimalLayout.tsx
  │    └── registry.ts
  └── views/
       └── *.json  (Generated Views)
```

---

## 4. 타입 정의 (TypeScript)

경로:
`apps/main-site/src/view/types.ts`

### 4.1 ViewSchema

```ts
export interface ViewSchema {
  viewId: string;
  meta?: Record<string, any>;
  layout: {
    type: string;
    props?: Record<string, any>;
  };
  components: ViewComponentSchema[];
}
```

### 4.2 ViewComponentSchema

```ts
export interface ViewComponentSchema {
  type: string;
  props?: Record<string, any>;
  if?: string;
  loop?: string;
}
```

### 4.3 Renderer Context

```ts
export interface ViewContext {
  user: any;
  router: any;
  params: Record<string, string>;
  query: Record<string, string>;
}
```

---

## 5. ViewLoader 설계

경로:
`apps/main-site/src/view/loader.ts`

### 5.1 목적

* URL → viewId 매핑
* viewId → JSON 파일 로드
* 향후 DB/Server 기반 ViewRegistry도 지원

### 5.2 기본 로직

```ts
export async function loadView(url: string): Promise<ViewSchema> {
  const map = {
    "/dashboard/seller": "seller-dashboard",
    "/products": "product-list",
    "/": "home",
  };

  const viewId = map[url] || "not-found";
  const json = await import(`../views/${viewId}.json`);
  return json.default;
}
```

※ 실제 구현 시 자동 라우팅 테이블 생성 가능.

---

## 6. fetch 규칙 처리

ViewRenderer는 각 component의 props.fetch를 자동 처리해야 한다.

### 6.1 React Query 기반

```ts
const query = useQuery({
  queryKey: fetch.queryKey,
  queryFn: () => axios.get(fetch.url).then(r => r.data)
});
```

### 6.2 Renderer 내부에서 자동 주입

```tsx
if (component.props?.fetch) {
  const data = useFetch(component.props.fetch);
  componentProps.data = data;
}
```

---

## 7. 조건(if) 처리 로직

```ts
function checkCondition(expr: string, context: ViewContext): boolean {
  return new Function("context", `return ${expr}`)(context);
}
```

예:

```json
{
  "if": "context.user.role === 'seller'",
  "type": "SellerDashboard"
}
```

---

## 8. 반복(loop) 처리 로직

```ts
function executeLoop(loopExpr: string, data: any) {
  const [varName, , listExpr] = loopExpr.split(" ");
  const list = new Function("data", `return ${listExpr}`)(data);

  return list.map(item => {
    const local = { [varName]: item };
    return { local };
  });
}
```

예:

```json
{
  "loop": "p in data.products",
  "component": {
    "type": "ProductCard",
    "props": {
      "title": "{{p.title}}"
    }
  }
}
```

---

## 9. Function Component 실행

Function Component는 FunctionRegistry에서 찾는다.

```ts
const func = FunctionRegistry[component.type];

const result = await func(componentProps, context);
// result = { type: "UIComponentName", props: {...} }
```

Function Component의 반환값이 곧 UI Component의 정의이다.

---

## 10. UI Component 렌더링

UI Component는 UIComponentRegistry에서 찾는다.

```tsx
const UI = UIComponentRegistry[result.type];
return <UI {...result.props} />;
```

---

## 11. Layout Wrapping

ViewRenderer는 최종 UI를 Layout 적용 후 렌더링한다.

```tsx
const Layout = LayoutRegistry[view.layout.type];
return <Layout view={view}>{renderedComponents}</Layout>;
```

---

## 12. ViewRenderer 전체 구현 예시 (개략 코드)

경로:
`apps/main-site/src/view/renderer.tsx`

```tsx
export function ViewRenderer() {
  const url = useLocation().pathname;
  const view = useLoadView(url);
  const context = useViewContext();

  const rendered = view.components.map((component) => {
    // 1. 조건
    if (component.if && !checkCondition(component.if, context)) return null;

    // 2. fetch 처리
    const compProps = { ...component.props };
    if (component.props?.fetch) {
      const data = useFetch(compProps.fetch);
      compProps.data = data;
    }

    // 3. Function Component 호출
    const func = FunctionRegistry[component.type];
    const result = func
      ? func(compProps, context)
      : { type: component.type, props: compProps };

    // 4. UI Component 호출
    const UI = UIComponentRegistry[result.type];
    return <UI key={component.type} {...result.props} />;
  });

  // 5. Layout wrapping
  const Layout = LayoutRegistry[view.layout.type];
  return <Layout view={view}>{rendered}</Layout>;
}
```

※ 실제 구현 시:

* Suspense
* ErrorBoundary
* 로딩 상태
* Prefetch
  을 추가한다.

---

## 13. 오류 처리

### 컴포넌트 없음

* MissingComponent 출력

### fetch 실패

* ErrorBoundary로 감싸기
* 기본 fallback UI 제공

### layout 없음

* DefaultLayout 적용

### view JSON 파싱 실패

* "View Loading Error" 페이지 출력

---

## 14. React 19 고려사항

React 19의 변화에 따라:

* Suspense SSR 개선점 포함
* useEffect 최소화
* createRoot 및 concurrent rendering 지원
* Server Action은 사용하지 않음(NextGen 구조와 충돌)

---

## 15. 구현 체크리스트

### 필수

* [ ] ViewLoader 완성
* [ ] ViewRenderer 로직 완성
* [ ] FunctionRegistry 연결
* [ ] UIComponentRegistry 연결
* [ ] LayoutRegistry 연결
* [ ] fetch/useQuery 통합
* [ ] 조건/반복 처리 구현
* [ ] ErrorBoundary 추가

### 선택

* [ ] Prefetch 기능
* [ ] View Cache 기능
* [ ] SSR 모드 추가(후속 단계)

---

## 16. 이 문서의 역할

이 문서는 NextGen 프론트엔드 개발자가 바로 ViewRenderer 구현에 사용할 수 있는
**실전 개발 사양서**이며,

* View Schema
* LayoutRegistry
* Component Registry
* Function Component
* ViewGenerator

모두를 연결하는 **최종 실행 단계의 핵심 문서**이다.

---

# ✔ Step I — ViewRenderer 구현 계획서 작성 완료
