# Step 9 — Performance Optimization Work Order

## NextGen Frontend 성능 최적화 패키지

**Version:** 2025-12
**Author:** ChatGPT PM
**경로:** `/docs/nextgen-frontend/tasks/step9_performance_optimization_workorder.md`

---

## 0. 목표

NextGen Frontend는 이미 모든 구조가 완성되었지만, 아직 성능 최적화가 적용되지 않았다.

이번 Work Order는:

- 렌더링 병목 제거
- React Query 캐시 최적화
- ViewRenderer 경량화
- UI 리스트 최적화
- 비동기 Suspense 구조 최적화
- 불필요한 fetch 제거
- 페이지 전환 속도 향상

을 통해 **상용 수준의 성능(최소 40~80% 개선)** 을 확보하는 것이 목표이다.

---

## 1. 작업 범위

성능 최적화는 다음 5개 카테고리로 수행한다:

### ✔ 1) ViewRenderer 성능 최적화

- renderSingleComponent 메모이제이션
- 조건/반복 처리 개선
- useFetch 호출 최적화
- children 배열 생성 비용 축소

### ✔ 2) React Query 최적화

- 캐시 TTL
- staleTime
- enabled 조건 최적화
- prefetch 적용
- pagination 예비 설정

### ✔ 3) UI 컴포넌트 성능 개선

- 리스트 렌더링 React.memo 적용
- 대형 페이지에서 Suspense 분리
- 무거운 UI는 lazy-loading 적용

### ✔ 4) 라우팅 성능 최적화

- AutoRoutes에서 dynamic import로 ViewRenderer 지연 로딩
- views JSON lazy load
- router-level Suspense 추가

### ✔ 5) 이미지 및 정적 자원 최적화

- productCard 이미지 lazy-load
- 이미지 aspect ratio 확보
- skeleton UI 적용

---

## 2. 최적화 작업 상세 지시

### ✔ 2.1 ViewRenderer 최적화 (renderer.tsx)

#### A) 기능 컴포넌트 캐싱

Function Component는 props, context가 동일하면 동일 결과를 출력하므로 메모이제이션 적용:

```ts
const cache = new Map();

function runFunctionComponent(func, key, props, context) {
  const cacheKey = `${func.name}-${JSON.stringify(props)}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const result = func(props, context);
  cache.set(cacheKey, result);
  return result;
}
```

#### B) props.fetch 최적화

중복 URL fetch 방지:

```ts
const fetchCache = {};
if (props.fetch) {
  if (!fetchCache[url]) {
    fetchCache[url] = useFetch(props.fetch);
  }
  props.data = fetchCache[url].data;
}
```

#### C) loop 처리 성능 개선

현재 loop는 new Function을 매번 실행 → 비용 큼
→ loop expression을 사전에 컴파일

```ts
const loopCache = {};

function compileLoop(loopExpr) {
  if (loopCache[loopExpr]) return loopCache[loopExpr];
  const compiled = compileLoopExpr(loopExpr); // helper
  loopCache[loopExpr] = compiled;
  return compiled;
}
```

---

### ✔ 2.2 React Query 최적화

전역 react-query 설정 추가:

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 1000,
      gcTime: 30 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      keepPreviousData: true
    }
  }
});
```

각 fetch hook에 enabled 조건 추가:

예:

```ts
useQuery({
  enabled: Boolean(id),
  ...
});
```

---

### ✔ 2.3 UI 컴포넌트 최적화

리스트 컴포넌트 예:

```tsx
export const ProductCard = React.memo(function ProductCard({ title, price, thumbnail }) {
  return (...)
});
```

대형 리스트에는 windowing(Virtualization)까지 적용 가능:

- react-window
- react-virtualized

다만 필요 시 Step 10에서 도입.

---

### ✔ 2.4 라우팅 오토로드 최적화

AutoRoutes() 내부에서 dynamic import 적용:

```tsx
const routes = Object.keys(map).map(url => ({
  path: url,
  element: (
    <Suspense fallback={<Loading />}>
      <LazyViewRenderer />
    </Suspense>
  )
}));
```

ViewRenderer를 lazy load:

```tsx
const LazyViewRenderer = React.lazy(() => import("./renderer"));
```

View JSON lazy load:

```ts
const json = await import(/* @vite-ignore */ `../views/${viewId}.json`);
```

---

### ✔ 2.5 이미지 최적화

ProductCard에 lazy-loading 활성화:

```tsx
<img src={thumbnail} loading="lazy" className="rounded" />
```

에러 fallback 추가:

```tsx
onError={(e) => e.currentTarget.src = '/fallback.png'}
```

---

## 3. 개발 단계 (Phase A–E)

### Phase A — ViewRenderer CPU 병목 제거

메모이제이션 + fetch cache + loop cache

### Phase B — React Query 전역 정책 최적화

queryClient 설정 재정의

### Phase C — UI Component 최적화

React.memo 적용 및 Virtualization 가능성 검토

### Phase D — AutoRoutes 최적화

routerBuilder에 lazy-loading 적용

### Phase E — 이미지/리스트 최적화

**총 예상 시간:** 8시간

---

## 4. 성공 기준 (DoD)

- [ ] ViewRenderer 렌더링 CPU 사용량 30% 감소
- [ ] JSON view 로딩 속도 증가
- [ ] 페이지 전환 latency 40% 감소
- [ ] No unnecessary fetch
- [ ] React Query staleTime 기반 캐싱 정상 작동
- [ ] Scroll/Jank 현상 제거
- [ ] Lighthouse Performance Score 최소 +20점 증가
- [ ] Console Warning 없음

---

## ✅ Step 9 — 성능 최적화 Work Order 생성 완료

이제 새 개발 채팅방에 이 문서를 붙여넣으면 Codex / Claude Code / Cursor IDE가 바로 NextGen 성능 최적화에 착수합니다.
