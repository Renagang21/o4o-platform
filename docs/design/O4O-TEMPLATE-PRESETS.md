# O4O Template Presets

> WO-O4O-TEMPLATE-PRESET-DEFINITION-V1

---

## 개요

Template Preset은 O4O 플랫폼의 **선택 가능한 디자인 자산**이다.
각 서비스는 `serviceConfig.template`에 preset key를 지정하면
해당 디자인이 자동 적용된다.

```ts
// serviceConfig
template: 'kpa'

// App.tsx
<TemplateProvider template={templates[config.template]}>
```

---

## 구조

```
TemplatePreset
├── key          — 식별자 (TemplateKey)
├── name         — 표시 이름
├── description  — 설명
├── category     — 분류 (professional / dashboard / brand / experimental)
└── tokens       — TemplateTokens (실제 디자인 값)
    ├── hero     — { bg, border, padding }
    ├── card     — { radius, shadow }
    ├── section  — { spacing }
    ├── button?  — { radius }
    └── icon?    — { wrapper, icon }
```

---

## Preset 목록

### 1. KPA Professional

| 항목 | 값 |
|------|------|
| Key | `kpa` |
| Category | `professional` |
| 용도 | 약사회/전문기관형 서비스 |

**특징:**
- 절제된 색상 (`bg-bg-secondary`)
- Border 중심, 그림자 없음 (`shadow-none`)
- 각진 모서리 (`rounded-md`)
- 보통 간격 (`mb-16`)

**적합한 서비스:** 기관, 협회, 전문직 커뮤니티

---

### 2. Health Dashboard

| 항목 | 값 |
|------|------|
| Key | `glycopharm` |
| Category | `dashboard` |
| 용도 | 의료/건강 관리형 서비스 |

**특징:**
- 가벼운 primary 배경 (`bg-primary-50`)
- 가벼운 그림자 (`shadow-sm`)
- 중간 모서리 (`rounded-lg`)
- 아이콘 래퍼 사용 (`rounded-lg w-9 h-9`)
- 컴팩트 간격 (`mb-12`)

**적합한 서비스:** 대시보드, 데이터 관리, 헬스케어

---

### 3. Beauty Brand

| 항목 | 값 |
|------|------|
| Key | `kcosmetics` |
| Category | `brand` |
| 용도 | 브랜드 중심 소비자 서비스 |

**특징:**
- 부드러운 곡선 (`rounded-xl`)
- 중간 그림자 (`shadow-md`)
- pill 버튼 (`rounded-full`)
- 원형 아이콘 래퍼 (`rounded-full w-11 h-11`)
- 넉넉한 간격 (`mb-20`)

**적합한 서비스:** 뷰티, 패션, 라이프스타일 브랜드

---

### 4. Premium SaaS (experimental)

| 항목 | 값 |
|------|------|
| Key | `referenceA` |
| Category | `experimental` |
| 용도 | SaaS/스타트업형 서비스 (실험) |

**특징:**
- **그라디언트 Hero** (`bg-gradient-to-r from-primary-50 to-primary-100`)
- 테두리 없는 깔끔한 인상
- 큰 모서리 (`rounded-2xl`)
- 강한 그림자 (`shadow-lg`)
- 대형 아이콘 래퍼 (`rounded-full w-12 h-12`)
- 넓은 간격 (`mb-24`)

**적합한 서비스:** SaaS 랜딩, 스타트업, 프리미엄 서비스

**원본:** Stripe / Linear / Vercel 디자인 패턴 합성 (WO-O4O-REFERENCE-DESIGN-IMPORT-V1)

---

## Token 비교표

| Token | KPA | GlycoPharm | K-Cosmetics | Premium SaaS |
|-------|-----|------------|-------------|-------------|
| hero.bg | `bg-bg-secondary` | `bg-primary-50` | `bg-primary-50` | gradient |
| hero.border | `border` | `border-b` | `border` | none |
| hero.padding | `py-16` | `py-10` | `py-20` | `py-24` |
| card.radius | `rounded-md` | `rounded-lg` | `rounded-xl` | `rounded-2xl` |
| card.shadow | `none` | `sm` | `md` | `lg` |
| section.spacing | `mb-16` | `mb-12` | `mb-20` | `mb-24` |
| button.radius | `rounded-md` | `rounded-lg` | `rounded-full` | `rounded-full` |
| icon.wrapper | none | `lg 36px` | `full 44px` | `full 48px` |

---

## 사용 방법

### 서비스에 Preset 적용

```ts
// packages/operator-ux-core/src/config/services/myservice.ts
export const myServiceConfig: ServiceConfig = {
  key: 'my-service',
  template: 'kpa',  // ← preset key
  // ...
};
```

### App.tsx에서 TemplateProvider 래핑

```tsx
import { TemplateProvider } from '@o4o/ui';
import { templates } from '@o4o/shared-space-ui';
import { myServiceConfig } from '@o4o/operator-ux-core';

<TemplateProvider template={templates[myServiceConfig.template]}>
  <AppRoutes />
</TemplateProvider>
```

### Preset 메타데이터 조회

```ts
import { templatePresets } from '@o4o/shared-space-ui';

const preset = templatePresets.kpa;
console.log(preset.name);        // 'KPA Professional'
console.log(preset.category);    // 'professional'
console.log(preset.description); // '전문기관형 — ...'
```

---

## 확장 가이드

새 preset 추가 시:

1. `TemplateKey` union에 key 추가
2. `templatePresets`에 preset 객체 추가
3. `ServiceTemplateKey`에 key 추가 (operator-ux-core)
4. `templates`는 자동 파생 — 별도 작업 불필요

---

## 향후 확장 후보

| 토큰 | 설명 | 현재 |
|------|------|------|
| `typography` | heading size/weight, body size | 미지원 |
| `layout` | grid cols, gap, density | 미지원 |
| `animation` | transition, hover effect | 미지원 |
| `color` | primary scheme override | CSS var 의존 |

---

*Created: 2026-05-01*
*Status: Active*
