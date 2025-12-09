# 📄 **Step 18 — NextGen Design System 구축 Work Order**

## O4O Platform — Unified UI Token + Component Standard

Version: 2025-12
Author: ChatGPT PM
------------------

# 0. 목적

NextGen Frontend는 다음을 모두 포함하며 완성된 상태이다:

* ViewRenderer
* ViewGenerator
* AI Generator
* Routing 자동화
* Function/UI Component 80+
* AppStore Integration
* Legacy 전체 정리

그러나 현재 UI 컴포넌트들은 **중복되는 Tailwind class / 비일관적인 스타일 구조**로 되어 있다.
이제부터 전체 UI/Design 체계를 공식적으로 통일하여 다음을 달성한다:

### 🎯 목표

1. **UI 디자인 일관성 극대화**
2. **컴포넌트 재사용성 증가**
3. **AppStore / CMS / Dashboard / Commerce / Admin / Customer** 전체 UI 통합
4. **multi-tenant 테마 기반 확장 (yaksa / neture 등)**
5. **AI Generator가 생성하는 UI의 스타일 통일**
6. **향후 NextGen Design Kit(Figma-to-Code)** 연동 준비

---

# 1. 폴더 구조

NextGen main-site에 다음 디자인 시스템 구조를 생성한다:

```
apps/main-site/src/design/
  ├── tokens/
  │      colors.ts
  │      spacing.ts
  │      radius.ts
  │      shadows.ts
  │      typography.ts
  │      index.ts
  ├── components/
  │      Button.tsx
  │      Card.tsx
  │      Input.tsx
  │      Tag.tsx
  │      Badge.tsx
  │      Table.tsx
  │      FormField.tsx
  │      Modal.tsx
  │      Section.tsx
  │      index.ts
  ├── utils/
         classnames.ts
         merge.ts
         layout.ts
```

---

# 2. 디자인 토큰 (Design Tokens)

### 2.1 Colors (colors.ts)

```ts
export const colors = {
  primary: "#1A73E8",
  primaryDark: "#0F4EB3",
  secondary: "#F97316",
  neutral900: "#0F172A",
  neutral700: "#334155",
  neutral500: "#64748B",
  neutral200: "#E2E8F0",
  neutral50: "#F8FAFC",
  danger: "#DC2626",
  success: "#16A34A",
};
```

---

### 2.2 Spacing (spacing.ts)

```ts
export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "20px",
  xl: "32px"
};
```

---

### 2.3 Radius (radius.ts)

```ts
export const radius = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  full: "9999px",
};
```

---

### 2.4 Shadows (shadows.ts)

```ts
export const shadows = {
  sm: "0 1px 2px rgba(0,0,0,0.05)",
  md: "0 2px 4px rgba(0,0,0,0.08)",
  lg: "0 4px 12px rgba(0,0,0,0.12)"
};
```

---

### 2.5 Typography (typography.ts)

```ts
export const typography = {
  h1: "text-3xl font-bold",
  h2: "text-2xl font-semibold",
  h3: "text-xl font-semibold",
  body: "text-base text-neutral700",
  small: "text-sm text-neutral500",
};
```

---

# 3. 기본 UI 컴포넌트 (디자인 통일)

이제 NextGen 모든 UI 컴포넌트가 이 공통 UI 컴포넌트를 사용해야 한다.

## 3.1 Button.tsx

```tsx
export function Button({ children, variant = "primary", ...rest }) {
  const base = "px-4 py-2 rounded-md font-medium";
  const variants = {
    primary: "bg-primary text-white hover:bg-primaryDark",
    secondary: "bg-neutral200 text-neutral900 hover:bg-neutral300",
    danger: "bg-danger text-white hover:bg-red-700",
  };
  return <button className={`${base} ${variants[variant]}`} {...rest}>{children}</button>;
}
```

---

## 3.2 Card.tsx

```tsx
export function Card({ children }) {
  return (
    <div className="bg-white p-6 rounded-md shadow-md border border-neutral200">
      {children}
    </div>
  );
}
```

---

## 3.3 Input.tsx

```tsx
export function Input(props) {
  return (
    <input
      {...props}
      className="border border-neutral300 rounded-md px-3 py-2 w-full"
    />
  );
}
```

---

## 3.4 Badge.tsx / Tag.tsx / Table.tsx / Modal.tsx

(파일 생성 필요 - 템플릿 제공)

이후 Step 18 실행 시 자동 생성됨.

---

# 4. Tailwind Theme 확장 설정

`tailwind.config.js` 업데이트:

```js
extend: {
  colors: {
    primary: "#1A73E8",
    primaryDark: "#0F4EB3",
    neutral900: "#0F172A",
    ...
  },
  boxShadow: {
    sm: "0 1px 2px rgba(0,0,0,0.05)",
    ...
  }
}
```

---

# 5. 기존 UI 컴포넌트 대체 작업

모든 기존 NextGen UI 컴포넌트를 재사용 가능한 컴포넌트 기반으로 교체한다:

* Commerce UI 10+
* Customer UI 6+
* Admin UI 6+
* AppStore UI 전체
* Dashboard UI 일부

작업 순서:

```
Phase A — Design tokens 반영
Phase B — Core UI components 생성(Button/Card/Input/Badge)
Phase C — List/Grid/Table 공통 컴포넌트화
Phase D — Commerce/Customer/Admin UI에 적용
Phase E — AppStore UI에 적용
Phase F — 최종 디자인 QA
```

---

# 6. 성공 기준 (DoD)

* [ ] 모든 앱 UI가 공통 Button/Card/Input 기반으로 동작
* [ ] Tailwind 난잡한 inline class → 최소화
* [ ] Theme 적용 가능
* [ ] Light/Dark 모드 지원 준비 가능
* [ ] multi-tenant 디자인 확장 가능
* [ ] 전체 UI 일관성 확보
* [ ] AI Generator가 생성한 컴포넌트도 스타일 통일

---

# 7. 예상 시간

총: **약 10~14시간**

---

# ✔ Step 18 — NextGen Design System 구축 Work Order 생성 완료!
