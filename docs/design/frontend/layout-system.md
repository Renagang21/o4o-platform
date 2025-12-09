# O4O Platform — NextGen Layout System / LayoutRegistry 스펙 (최종안)

Version: 2025-12
Author: ChatGPT PM

---

## 1. 목적

Layout System은 ViewRenderer가 View(JSON)를 렌더링할 때
화면의 **전체 골격(Structure)** 을 담당한다.

* Page 개념 폐기
* Theme 시스템 폐기
* Header/Footer Template 폐기
* Block Editor Layout 폐기

이후, 모든 화면은 LayoutRegistry에 등록된 **Layout Component** 하나를 상위 구조로 사용한다.

즉:

> "NextGen에서는 페이지가 레이아웃을 선택하는 것이 아니라,
> View(JSON)가 레이아웃을 지정한다."

---

## 2. Layout System의 역할

Layout System은 다음을 담당한다:

1. **Header/Navigation/Footer 출력 여부**
2. **페이지 좌우 구조(Grid 여부)**
3. **대시보드형 레이아웃 지원**
4. **Shop/Product 전용 레이아웃 지원**
5. **Auth/Login 전용 레이아웃 지원**
6. **공통 스타일을 컴포넌트화하여 분리 관리**

레이아웃은 UI Skeleton(틀)만 제공하며
세부적인 UI는 모두 View JSON의 components에 의해 결정된다.

---

## 3. LayoutRegistry 구조

ViewRenderer는 LayoutRegistry를 참조해 Layout Component를 불러온다.

경로:

```
apps/main-site/src/layouts/registry.ts
```

구조:

```ts
import {
  DefaultLayout,
  DashboardLayout,
  ShopLayout,
  AuthLayout,
  MinimalLayout,
} from "./";

export const LayoutRegistry = {
  DefaultLayout,
  DashboardLayout,
  ShopLayout,
  AuthLayout,
  MinimalLayout,
};
```

---

## 4. Layout Component 기본 스펙

모든 Layout Component는 다음 TypeScript 형태를 따른다:

```ts
export interface LayoutProps {
  view: ViewSchema;
  children: React.ReactNode;
}

export type LayoutComponent = (props: LayoutProps) => JSX.Element;
```

LayoutComponent는 반드시:

* 헤더/푸터 등의 공통 요소를 포함할 수 있음
* children을 렌더링해야 함
* 스타일/레이아웃을 Tailwind 기반으로 제공

---

## 5. Layout 구성 규칙

Layout은 다음 규칙을 지킨다:

### 5.1 Layout은 절대로 데이터 fetch를 하지 않는다

→ 기능 컴포넌트나 ViewRenderer의 역할

### 5.2 Layout은 UI 스타일, 구조만 담당한다

* 헤더/푸터
* grid/flex 컨테이너
* 좌측 메뉴
* 전체패딩/여백

### 5.3 Layout 안에 비즈니스 로직/기능은 포함할 수 없다

### 5.4 Layout은 단 하나의 children을 렌더해야 한다

---

## 6. Layout 종류 정의

NextGen Layout은 다음 5개로 시작하며
필요 시 확장 가능성을 열어둔다.

### 6.1 DefaultLayout

일반 페이지, 대부분의 View에 사용

구조:

```
Header (Optional)
Content
Footer (Optional)
```

Tailwind 예시:

```tsx
<div className="min-h-screen flex flex-col">
  <Header />
  <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
  <Footer />
</div>
```

---

### 6.2 DashboardLayout

Seller/Supplier/Partner/Account 대시보드에 사용

구조:

```
Sidebar
Content
```

예시:

```tsx
<div className="flex min-h-screen">
  <Sidebar />
  <main className="flex-1 p-6">{children}</main>
</div>
```

---

### 6.3 ShopLayout

쇼핑몰 제품 목록/Product Detail 화면에 사용

구조:

```
Header
CategoryBar
Content
Footer
```

---

### 6.4 AuthLayout

Login/Signup/ResetPassword에 사용

구조:

```
Center-aligned Card
```

---

### 6.5 MinimalLayout

레이아웃을 최소화하고 싶은 View에 사용 (공급자 승인, 단독 페이지 등)

구조:

```
Header(Optional)
Content Only
```

---

## 7. View Schema에서 Layout 지정 방식

View JSON에서 layout 필드로 Layout을 지정한다:

```json
{
  "viewId": "seller-dashboard",
  "layout": {
    "type": "DashboardLayout"
  }
}
```

또는 옵션 포함:

```json
{
  "layout": {
    "type": "DefaultLayout",
    "props": {
      "header": true,
      "footer": false
    }
  }
}
```

---

## 8. Layout 자동 선택 규칙 (ViewGenerator 연동)

ViewGenerator는 다음 규칙으로 자동 Layout을 선택한다:

| 유형            | 자동 Layout       |
| ------------- | --------------- |
| 대시보드          | DashboardLayout |
| 쇼핑몰(리스트/카테고리) | ShopLayout      |
| 로그인/회원가입      | AuthLayout      |
| 단일 페이지        | DefaultLayout   |
| 시스템 페이지       | MinimalLayout   |

사용자는 View JSON에서 layout을 덮어쓰기(override)할 수 있다.

---

## 9. Layout + Component 조합 예시

판매자 대시보드:

```json
{
  "viewId": "seller-dashboard",
  "layout": { "type": "DashboardLayout" },
  "components": [
    {
      "type": "KPIGrid",
      "props": { ... }
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

## 10. Theme 시스템과의 관계

NextGen에서는 Theme 시스템이 폐기된다.
이유:

* Block Editor 기반 구조가 제거되었으며
* Theme 설정(색상, 폰트, 스페이싱 등)이 ViewRenderer + Layout 조합으로 대체
* Tailwind Token으로 통일된 디자인 기반

따라서 ThemeCustomizer / AppearanceEditor는 더 이상 필요하지 않다.

---

## 11. 확장성

LayoutRegistry는 다음과 같은 모듈 유형을 지원할 수 있다:

* Tenant별 레이아웃
* Organization별 레이아웃
* Device별 레이아웃 (MobileLayout 등)
* Composite Layout (Nested Layout 구조)

이 확장성은 NextGen 구조의 큰 장점이다.

---

## 12. 이 문서의 역할

* NextGen 프론트엔드에서 **화면의 바깥 뼈대**를 정의
* ViewRenderer가 해석할 Layout 규약 확정
* BlockEditor/Theme/Template 구조를 완전히 대체
* AI/Antigravity 기반 ViewGenerator와 자연스럽게 연결

---

# ✔ Step F — Layout System / LayoutRegistry 스펙 작성 완료
