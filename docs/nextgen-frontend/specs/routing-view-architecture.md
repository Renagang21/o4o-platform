# O4O Platform NextGen Routing Architecture — "Page → View" 전환 스펙

Version: 2025-12
Author: ChatGPT PM

---

## 1. 목적

이 문서는 기존 WordPress-like Page 시스템을 완전히 제거하고
**URL → View → ViewRenderer** 구조로 전환하기 위한 아키텍처를 정의한다.

이는 다음 목적을 위해 사용된다:

* Page 기반 렌더링 제거
* Theme / Header / Footer 종속성 제거
* Block Editor 제거 이후의 표준 렌더링 방식
* AI 생성 View(JSON)를 즉시 화면에 출력
* shortcode 기반 기능 컴포넌트 구조에 직접 연결
* PageGenerator → ViewGenerator 파이프라인 정립

---

## 2. 기존 구조(폐기 예정)

기존 main-site는 다음 순서로 화면을 렌더링했다:

```
URL → Page.tsx → Template → Theme/Header/Footer → Content
```

문제점:

* 페이지 수 증가 시 관리 복잡도 증가
* 레이아웃/스타일 종속적 구조
* shortcode/Block Editor가 중첩
* 동적 생성 화면과 정적 페이지 간 불일치
* AI 생성 페이지를 반영하기 어려움

이 구조는 폐기한다.

---

## 3. NextGen 구조 핵심

NextGen에서는 모든 화면이 아래 구조를 따른다:

```
URL
  ↓
ViewLoader (URL ↔ viewId 매핑)
  ↓
View JSON
  ↓
ViewRenderer (ComponentRegistry 기반)
  ↓
React UI 출력
```

핵심 요소는 3가지다:

1. **ViewLoader**
   → URL과 viewId 매핑 담당
   → 파일 기반 라우팅 OR DB 기반 라우팅 모두 지원 가능

2. **View(JSON)**
   → Page 개념의 완전한 대체
   → 화면의 상태를 모두 JSON으로 표현
   → 동적/정적 데이터 모두 props로 관리

3. **ViewRenderer**
   → JSON을 실제 React DOM으로 렌더링
   → Component Registry 기반
   → layout / component / sections / fetch 모두 처리

---

## 4. ViewLoader 스펙

ViewLoader는 다음 중 하나를 사용하여 viewId를 결정한다.

### 4.1 파일 기반 라우팅 (권장)

경로 예시:

```
apps/main-site/src/views/seller-dashboard.json
apps/main-site/src/views/product-list.json
apps/main-site/src/views/home.json
```

URL → 파일 매핑:

```
/dashboard/seller → seller-dashboard.json
/products → product-list.json
/home → home.json
```

### 4.2 DB 기반 라우팅 (후속 단계)

DB의 CPT 대신 "View Registry" 테이블을 운영:

```
viewId
url
json
updatedAt
```

---

## 5. ViewRenderer 구조

Renderer는 다음 순서로 작동한다:

```
1) view.layout 렌더링
2) view.sections 또는 view.components 렌더링
3) 조건부(if) 처리
4) 반복(loop) 처리
5) fetch(props.fetch) 기반 데이터 로딩
6) Function Component 호출
7) UI Component 호출
8) DOM 출력
```

이를 통해 Page / Template / BlockEditor / shortcode 레이아웃을 모두 대체할 수 있다.

---

## 6. Component Registry 구조

Renderer는 Component Registry를 사용해 컴포넌트를 찾는다.

경로:

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

## 7. URL → View → Renderer 흐름 요약

### 기존

```
URL → Page.tsx → Template → Theme → Content
```

### NextGen (신규, 우리가 도입하는 최종 구조)

```
URL
  ↓
ViewLoader
  ↓
View(JSON)
  ↓
ViewRenderer
  ↓
React UI
```

모든 화면이 이 구조를 따른다:

* 상품 목록
* 상품 상세
* 장바구니
* 계정
* 로그인
* 판매자 대시보드
* 공급자 대시보드
* 파트너 대시보드
* 홈
* Shop
* 기타 모든 화면

---

## 8. 라우팅 정의 방식

### 8.1 React Router v7 기준

React Router에서 모든 라우트는 단일 ViewRenderer를 가리킨다:

```tsx
<Route path="*" element={<ViewRenderer />} />
```

ViewRenderer 내부에서:

```
1) useLocation()으로 현재 URL 확인
2) URL ↔ viewId 매핑
3) view JSON 로드 (파일 또는 서버)
4) ViewRenderer 실행
```

---

## 9. PageGenerator / ViewGenerator 연결

PageGenerator App은 이제 ViewGenerator App이 되며:

### View JSON 생성 경로:

```
_generated/views/
    seller-dashboard.json
    supplier-dashboard.json
    home.json
    shop.json
    product-list.json
```

main-site는 이 폴더를 자동 읽어서 렌더링 가능:

```
apps/main-site/public/views/*.json
```

또는:

```
apps/main-site/src/views/*.json
```

---

## 10. View 기반 아키텍처의 장점

* 페이지 생성 자동화 100%
* 테마/블록/헤더 구조 제거 → 단일 Layout 체계
* 유지보수 비용 절감
* 기능 컴포넌트 중심 구조로 리팩토링 용이
* URL 기준으로 AI 생성/편집 가능한 화면 구조
* Antigravity / Gemini / GPT 기반 자동 생성 최적화

---

## 11. 이 문서의 역할

* NextGen 프론트엔드의 렌더링 방식 공식 표준
* 모든 화면이 Page가 아니라 View(JSON)으로 정의됨을 명시
* PageRenderer, Theme, BlockEditor 완전 폐기 근거
* ViewGenerator, ViewRenderer의 연결 설계 기준

---

# ✔ Step B — Page → View 전환 아키텍처 정의 완료
