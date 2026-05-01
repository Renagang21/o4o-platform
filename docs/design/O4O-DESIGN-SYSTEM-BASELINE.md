# O4O Design System Baseline

> **이 문서는 O4O 플랫폼 디자인 시스템의 기준서이다.**
> 모든 UI 작업은 이 문서의 구조와 규칙을 따른다.

**Status:** Active Baseline
**Version:** 1.0
**Date:** 2026-05-01

---

## 1. 개요

O4O 디자인 시스템은 3개 서비스(KPA Society / GlycoPharm / K-Cosmetics)가
**동일한 구조** 위에서 **서로 다른 느낌**을 표현하도록 설계되었다.

핵심 원칙:

```
구조는 공통, 느낌은 다르게
```

- **구조**: 컴포넌트, 레이아웃, 간격, 타이포그래피는 하나의 코드베이스를 공유한다.
- **느낌**: 색상, 곡률, 그림자, 아이콘 표현은 서비스별 Template 토큰으로 분리한다.

---

## 2. 전체 아키텍처

```
Theme (CSS Variables)
  ↓
Template (className Tokens)
  ↓
Component (자동 소비)
  ↓
Page (조합)
```

구체적 흐름:

```
serviceConfig.template        ← 서비스 설정에서 template 키 결정
    ↓
templates[key]                ← shared-space-ui에서 토큰 객체 조회
    ↓
<TemplateProvider>            ← App root에서 Context 주입
    ↓
useTemplate()                 ← 컴포넌트가 Context에서 토큰 소비
    ↓
PageHero / PageSection / Card / Button / Icon
```

### 패키지 역할

| 패키지 | 역할 |
|--------|------|
| `@o4o/ui` | 컴포넌트 + TemplateProvider + useTemplate |
| `@o4o/shared-space-ui` | templates.ts (토큰 정의) + 공유 섹션 컴포넌트 |
| `@o4o/operator-ux-core` | serviceConfig (template 키 포함) |
| 서비스 index.css | CSS 변수 (Theme) 정의 |
| 서비스 tailwind.config.js | CSS 변수 → Tailwind 테마 연동 |

### 의존 방향

```
@o4o/ui  ←  @o4o/shared-space-ui  ←  서비스 App
              ↑
      @o4o/operator-ux-core  ←────────┘
```

`@o4o/ui`는 다른 패키지를 import하지 않는다 (순환 의존 방지).

---

## 3. Theme 정의

Theme은 CSS 변수로 정의된다. 각 서비스의 `src/index.css`에 위치한다.

### 3.1 CSS 변수 구조

```css
:root {
  /* Spacing (8px 그리드) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 16px;
  --space-4: 24px;
  --space-5: 32px;
  --space-6: 48px;
  --space-7: 64px;

  /* Typography */
  --font-primary: 'Pretendard', 'Noto Sans KR', system-ui, sans-serif;
  --text-title-xl: 1.875rem;
  --text-title-lg: 1.5rem;
  --text-title-md: 1.25rem;
  --text-body-lg: 1rem;
  --text-body-md: 0.875rem;
  --text-body-sm: 0.75rem;

  /* Primary Colors — 서비스마다 다름 */
  --color-primary: #2563EB;       /* KPA: Blue */
  --color-primary-light: #3B82F6;
  --color-primary-dark: #1D4ED8;
  --color-primary-darker: #1E3A8A;

  /* Neutral — 모든 서비스 동일 */
  --color-neutral-900: #0F172A;
  --color-neutral-50: #F8FAFC;
  /* ... 900~50 전체 스케일 */

  /* Semantic Colors — neutral 참조 */
  --color-text-primary: var(--color-neutral-900);
  --color-text-secondary: var(--color-neutral-600);
  --color-bg-primary: var(--color-white);
  --color-bg-secondary: var(--color-neutral-50);
  --color-border-default: var(--color-neutral-200);
  --color-btn-primary-bg: var(--color-primary);

  /* Shadows / Radius / Z-index / Transitions */
  --shadow-sm: 0 1px 2px 0 rgba(0,0,0,0.05);
  --radius-md: 8px;
  --z-modal: 300;
  --transition-normal: 200ms ease;
}
```

### 3.2 서비스별 Primary Color

| 서비스 | `--color-primary` | 계열 |
|--------|-------------------|------|
| KPA Society | `#2563EB` | Blue |
| GlycoPharm | `#16A34A` | Green |
| K-Cosmetics | `#E11D48` | Rose |

Neutral, Spacing, Typography, Shadow, Radius는 모든 서비스에서 동일하다.

### 3.3 Tailwind 연동

각 서비스의 `tailwind.config.js`에서 CSS 변수를 Tailwind 테마로 매핑한다.

```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: 'var(--color-primary)',
        light: 'var(--color-primary-light)',
        dark: 'var(--color-primary-dark)',
        50: '#eff6ff',   // 서비스별 hue stops
        // ...
      },
      text: {
        primary: 'var(--color-text-primary)',
        secondary: 'var(--color-text-secondary)',
      },
      bg: {
        primary: 'var(--color-bg-primary)',
        secondary: 'var(--color-bg-secondary)',
      },
      border: {
        DEFAULT: 'var(--color-border-default)',
      },
    },
  },
}
```

이 연동으로 `bg-primary`, `text-primary`, `border-border` 등의 Tailwind 클래스가
CSS 변수를 참조하여 서비스별로 다른 색상을 표현한다.

### 3.4 content 경로

Tailwind JIT가 className을 스캔하려면 content 경로에 패키지가 포함되어야 한다.

```javascript
content: [
  "./src/**/*.{js,ts,jsx,tsx}",
  "../../packages/ui/src/**/*.{ts,tsx}",
  "../../packages/shared-space-ui/src/**/*.{ts,tsx}",
  "../../packages/operator-core/src/**/*.{ts,tsx}",
  "../../packages/store-ui-core/src/**/*.{ts,tsx}",
]
```

---

## 4. Template 구조

Template은 Tailwind className 문자열의 조합이다.
`packages/shared-space-ui/src/templates.ts`에 정의된다.

### 4.1 TemplateTokens 인터페이스

```typescript
export interface TemplateTokens {
  hero: {
    bg: string;       // 배경 className (예: 'bg-bg-secondary')
    border: string;   // 테두리 className (예: 'border border-border')
    padding: string;  // 패딩 className (예: 'py-16')
  };
  card: {
    radius: string;   // 곡률 className (예: 'rounded-md')
    shadow: string;   // 그림자 className (예: 'shadow-none')
  };
  section: {
    spacing: string;  // 하단 여백 className (예: 'mb-16')
  };
  button?: {
    radius: string;   // 버튼 곡률 className (예: 'rounded-md')
  };
  icon?: {
    wrapper: string;  // 아이콘 래퍼 className (예: 'bg-primary-50 rounded-full w-11 h-11')
    icon: string;     // 아이콘 색상 className (예: 'text-primary')
  };
}
```

### 4.2 토큰 역할

| 토큰 | 역할 | 적용 대상 |
|------|------|----------|
| `hero` | Hero 영역의 배경/테두리/패딩 | PageHero |
| `card` | 카드의 곡률/그림자 | Card |
| `section` | 섹션 간 여백 | PageSection |
| `button` | 버튼 곡률 | Button |
| `icon` | 아이콘 래퍼 배경/곡률/크기 + 아이콘 색상 | AppEntry icons |

### 4.3 서비스별 토큰 값

전체 비교표는 [7. 서비스별 Template 차이](#7-서비스별-template-차이) 참조.

---

## 5. TemplateProvider

`packages/ui/src/layout/TemplateContext.tsx`에 위치한다.

### 5.1 구성 요소

```typescript
// Context 생성
const TemplateContext = createContext<TemplateTokens | null>(null);

// Provider — App root에서 template 주입
export function TemplateProvider({ template, children }: TemplateProviderProps) {
  return (
    <TemplateContext.Provider value={template}>
      {children}
    </TemplateContext.Provider>
  );
}

// Hook — 컴포넌트에서 토큰 소비
export function useTemplate(): TemplateTokens | null {
  return useContext(TemplateContext);
}
```

### 5.2 App root 연결

```typescript
// 서비스 App.tsx
import { TemplateProvider } from '@o4o/ui';
import { templates } from '@o4o/shared-space-ui';
import { kpaConfig } from '@o4o/operator-ux-core';

function App() {
  return (
    <TemplateProvider template={templates[kpaConfig.template]}>
      {/* 모든 하위 컴포넌트가 template을 자동 소비 */}
    </TemplateProvider>
  );
}
```

`serviceConfig.template` 값이 `templates` 객체의 키로 사용되어
서비스별 토큰이 자동으로 결정된다.

### 5.3 3-tier fallback

모든 template 소비 컴포넌트는 동일한 우선순위를 따른다.

```
1. 명시적 prop  (최우선)     — <PageHero template={customHero}>
2. Context      (자동)       — useTemplate()에서 가져옴
3. 기본값       (fallback)   — 컴포넌트 내부 하드코딩 기본값
```

---

## 6. Component 적용 기준

### 6.1 PageHero

**파일:** `packages/ui/src/layout/Section.tsx`

Hero 영역 래퍼. `template.hero`의 `bg`, `border`, `padding` className을 적용한다.

```typescript
export function PageHero({ children, className, template, ...props }: PageHeroProps) {
  const ctx = useTemplate();
  const resolved = template ?? ctx?.hero;
  const tpl = resolved
    ? `${resolved.bg} ${resolved.border} ${resolved.padding}`
    : '';
  return (
    <section className={['mb-16', tpl, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </section>
  );
}
```

기본 하단 여백: `mb-16` (64px).

사용법:

```tsx
// TemplateProvider 있으면 prop 없이 자동 적용
<PageHero>
  <HeroBannerSection ... />
</PageHero>
```

### 6.2 PageSection

**파일:** `packages/ui/src/layout/Section.tsx`

콘텐츠 섹션 래퍼. `template.section.spacing` className을 적용한다.

```typescript
export function PageSection({ children, className, last = false, template, ...props }) {
  const ctx = useTemplate();
  const resolved = template ?? ctx?.section;
  const base = last ? '' : 'mb-12';
  const tpl = resolved?.spacing ?? '';
  return (
    <section className={[base, tpl, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </section>
  );
}
```

- 기본 하단 여백: `mb-12` (48px).
- `last={true}`: 마지막 섹션에서 여백 제거.

### 6.3 Card

**파일:** `packages/ui/src/index.tsx`

카드 컴포넌트. `template.card`의 `radius`와 `shadow`를 자동 적용한다.

```typescript
const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const t = useTemplate();
    const radius = t?.card?.radius ?? 'rounded-lg';
    const shadow = t?.card?.shadow ?? 'shadow-sm';
    return (
      <div
        ref={ref}
        className={cn(`${radius} border bg-card text-card-foreground ${shadow}`, className)}
        {...props}
      />
    );
  }
);
```

- **기본값:** `rounded-lg`, `shadow-sm`
- **override:** `className` prop으로 추가 클래스 가능. 기본 border/bg는 항상 포함.

### 6.4 Button

**파일:** `packages/ui/src/index.tsx`

버튼 컴포넌트. `template.button.radius`를 자동 적용한다.

```typescript
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const t = useTemplate();
    const radius = t?.button?.radius ?? 'rounded-md';
    return (
      <button
        className={cn(
          `inline-flex items-center justify-center whitespace-nowrap ${radius} ...`,
          getVariantClasses(variant),
          getSizeClasses(size),
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
```

**primary variant:**

```typescript
primary: "bg-primary text-white shadow-md hover:bg-primary-700 hover:shadow-lg transform hover:-translate-y-0.5 focus-visible:ring-primary"
```

`bg-primary`는 CSS 변수 `var(--color-primary)`를 참조하므로
서비스별로 자동으로 다른 색상이 적용된다.

### 6.5 Icon

아이콘 자체(SVG)는 변경하지 않는다. **표현 방식만** template으로 관리한다.

```tsx
// template.icon.wrapper: 래퍼의 배경/곡률/크기
// template.icon.icon: 아이콘 색상

<span className={`flex items-center justify-center shrink-0 ${tpl?.icon?.wrapper ?? ''} ${tpl?.icon?.icon ?? 'text-primary'}`}>
  <ForumIcon />
</span>
```

- **base 클래스** (`flex items-center justify-center shrink-0`): 모든 서비스 공통.
- **wrapper**: 서비스별 배경/곡률/크기 (KPA: 없음, GlycoPharm: soft bg, K-Cosmetics: pill bg).
- **icon**: 아이콘 색상 (모든 서비스 `text-primary`).

---

## 7. 서비스별 Template 차이

| 토큰 | KPA Society | GlycoPharm | K-Cosmetics |
|------|-------------|------------|-------------|
| **hero.bg** | `bg-bg-secondary` | `bg-primary-50` | `bg-primary-50` |
| **hero.border** | `border border-border` | `border-b border-border` | `border border-primary-100` |
| **hero.padding** | `py-16` | `py-10` | `py-20` |
| **card.radius** | `rounded-md` | `rounded-lg` | `rounded-xl` |
| **card.shadow** | `shadow-none` | `shadow-sm` | `shadow-md` |
| **section.spacing** | `mb-16` | `mb-12` | `mb-20` |
| **button.radius** | `rounded-md` | `rounded-lg` | `rounded-full` |
| **icon.wrapper** | *(없음)* | `bg-primary-50 rounded-lg w-9 h-9` | `bg-primary-50 rounded-full w-11 h-11` |
| **icon.icon** | `text-primary` | `text-primary` | `text-primary` |

### 디자인 성격

| 서비스 | 성격 | 특징 |
|--------|------|------|
| **KPA** | 전문적 / 절제 | 곡률 작음, 그림자 없음, 아이콘 최소 |
| **GlycoPharm** | 데이터 / 관리 | 중간 곡률, 약간의 그림자, 부드러운 아이콘 배경 |
| **K-Cosmetics** | 브랜드 / 감성 | 큰 곡률, 뚜렷한 그림자, 원형 아이콘 배경 |

---

## 8. 신규 화면 작성 규칙

### 반드시 지킬 것

1. **`bg-primary` 사용** — `bg-blue-600`, `bg-green-600` 등 직접 색상 클래스 금지.
   서비스별 분기 없이 `bg-primary`가 CSS 변수를 통해 자동으로 올바른 색상을 적용한다.

2. **`Card` 컴포넌트 사용** — radius/shadow를 직접 지정하지 않는다.
   `<Card>` 컴포넌트가 template에서 자동으로 적용한다.

3. **`Button` 컴포넌트 사용** — radius를 직접 지정하지 않는다.
   서비스별 버튼 모양은 template이 결정한다.

4. **`PageHero` / `PageSection` 사용** — 섹션 간격을 수동으로 지정하지 않는다.
   template이 spacing을 결정한다.

5. **아이콘 색상: `text-primary`** — `color: '#2563EB'` 등 직접 색상 금지.

6. **아이콘 래퍼: template 사용** — 아이콘 배경/곡률은 `tpl?.icon?.wrapper` className 사용.

### 금지 패턴

```tsx
// ❌ 직접 색상
<button className="bg-blue-600">

// ✅ 테마 색상
<Button variant="primary">

// ❌ 직접 곡률/그림자
<div className="rounded-xl shadow-md border p-4">

// ✅ Card 컴포넌트
<Card className="p-4">

// ❌ 직접 아이콘 색상
<span style={{ color: '#2563EB' }}><Icon /></span>

// ✅ template 아이콘
<span className={`flex items-center justify-center shrink-0 ${tpl?.icon?.wrapper} ${tpl?.icon?.icon}`}>
  <Icon />
</span>

// ❌ 서비스 분기
{service === 'kpa' ? 'rounded-md' : 'rounded-xl'}

// ✅ template 자동 적용
// (Card가 알아서 처리)
```

---

## 9. 기존 화면 전환 원칙

기존 inline style을 한 번에 전부 template으로 바꾸지 않는다.

### 전환 절차

```
1. 수정 시점에만 전환  — 새로운 WO에서 해당 화면을 수정할 때
2. 샘플 먼저           — 하나의 요소를 먼저 전환하고 검증
3. 확산                — 검증 후 나머지 요소 전환
```

### inline style → className 전환 시 주의

CSS 우선순위: **inline style > className**.
따라서 기존 inline style이 있으면 className으로 전환할 때
**반드시 충돌하는 inline style을 제거**해야 한다.

```tsx
// ❌ className이 무시됨
<div style={{ borderRadius: 12 }} className="rounded-xl">

// ✅ inline style 제거 후 className 적용
<div className="rounded-xl">
```

---

## 10. 레퍼런스 디자인 적용 방법

외부 레퍼런스(Dribbble, 경쟁 서비스 등)를 O4O에 적용할 때:

### 절차

```
1. 레퍼런스 수집    — 스크린샷, UI 패턴 수집
2. 구조 분해        — 어떤 요소가 어떤 역할인지 분류
                     (Hero / Card / Section / Button / Icon)
3. O4O 구조에 매핑  — O4O의 어떤 컴포넌트/토큰으로 표현할 수 있는지 결정
4. template 값 변환 — 레퍼런스의 시각 요소를 Tailwind className으로 변환
```

### 매핑 예시

| 레퍼런스 요소 | O4O 대응 |
|---------------|----------|
| 큰 곡률 카드 | `card.radius: 'rounded-xl'` |
| 뚜렷한 그림자 | `card.shadow: 'shadow-md'` |
| 원형 아이콘 배경 | `icon.wrapper: 'bg-primary-50 rounded-full w-11 h-11'` |
| 서비스 주제 색상 | `--color-primary: #HEXCODE` (index.css) |

**원칙: 레퍼런스의 '느낌'을 O4O의 '구조' 안에 담는다.**
레퍼런스를 그대로 복제하지 않는다.

---

## 11. 확장 계획

### 현재 구현

```
serviceConfig.template → templates[key] → TemplateProvider → useTemplate() → Components
```

### 향후 가능한 확장

- **Template 동적 전환** — 런타임에서 template을 교체하여 테마 미리보기 지원.
- **Template 저장/재사용** — 운영자가 template 값을 DB에 저장하고 불러오기.
- **새로운 토큰 추가** — 기존 구조에 새 속성(typography, animation 등)을 추가하여
  template 제어 범위를 확대.

확장 시에도 기존 구조(TemplateTokens 인터페이스 + TemplateProvider + useTemplate)는
유지한다.

---

## 파일 참조

| 파일 | 역할 |
|------|------|
| `packages/shared-space-ui/src/templates.ts` | Template 토큰 정의 |
| `packages/ui/src/layout/TemplateContext.tsx` | TemplateProvider + useTemplate |
| `packages/ui/src/layout/Section.tsx` | PageHero / PageSection |
| `packages/ui/src/index.tsx` | Card / Button |
| `packages/operator-ux-core/src/config/serviceConfig.ts` | ServiceConfig + ServiceTemplateKey |
| `packages/operator-ux-core/src/config/services/*.ts` | 서비스별 config |
| `services/web-*/src/index.css` | CSS 변수 (Theme) |
| `services/web-*/tailwind.config.js` | Tailwind 테마 연동 |
| `services/web-*/src/App.tsx` | TemplateProvider 연결 |

---

*이 문서는 코드 기준으로 작성되었으며, 실제 구현과 불일치가 발견되면 즉시 업데이트한다.*
