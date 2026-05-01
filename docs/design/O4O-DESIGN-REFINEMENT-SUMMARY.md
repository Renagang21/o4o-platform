# O4O Design Refinement Summary

> **WO-O4O-DESIGN-REFINEMENT-SUMMARY-V1**
>
> 이번 O4O 디자인 정비 사이클의 결과를 문서화한다.
> 이후 디자인 작업과 새 서비스 적용의 기준으로 사용한다.

**Status:** Final
**Date:** 2026-05-01

---

## 1. 개요

이번 디자인 정비의 목적은 O4O 플랫폼 3개 서비스가
**하나의 코드베이스에서 서로 다른 느낌을 반복 생산할 수 있는 구조**를 만드는 것이다.

핵심 원칙:

```
구조는 공통, 느낌은 다르게
```

3개 계층으로 분리하여 달성한다:

| 계층 | 역할 | 위치 |
|------|------|------|
| **Theme** | CSS 변수 (색상, 간격, 타이포) | 서비스 `index.css` |
| **Template** | Tailwind className 토큰 (곡률, 그림자, 패딩) | `shared-space-ui/templates.ts` |
| **Responsive** | 브레이크포인트 기반 레이아웃 전환 | Tailwind 유틸리티 |

---

## 2. 완료된 핵심 기반 작업

| # | 작업 | WO | 내용 |
|---|------|-----|------|
| 1 | Theme Foundation | WO-O4O-THEME-* | CSS 변수 정의, Tailwind 매핑, 서비스별 primary color 분리 |
| 2 | TemplateProvider | WO-O4O-TEMPLATE-PROVIDER-V1 | `TemplateContext` + `useTemplate()` hook, 3-tier fallback |
| 3 | serviceConfig.template 연동 | WO-O4O-TEMPLATE-PRESET-DEFINITION-V1 | `serviceConfig.template` → `templates[key]` → `TemplateProvider` 자동 연결 |
| 4 | Template Preset Registry | WO-O4O-TEMPLATE-PRESET-DEFINITION-V1 | 4개 preset 등록 (kpa, glycopharm, kcosmetics, referenceA) |
| 5 | Component 표준화 | WO-O4O-TEMPLATE-* | PageHero / PageSection / Card / Button / Icon이 template을 자동 소비 |
| 6 | Responsive Layout 토큰 | WO-O4O-TEMPLATE-RESPONSIVE-LAYOUT-V1 | `LayoutTemplate` 추가 (container, grid, gap), PageContainer 연동, KPI grid 표준화, JS @media 제거 |
| 7 | Responsive List 패턴 | WO-O4O-RESPONSIVE-LIST-V1 + EXPAND-V1 | Desktop Table / Mobile Card 이중 렌더링 패턴 확립 및 확산 |

---

## 3. 서비스별 Home 디자인 결과

| 항목 | KPA Society | GlycoPharm | K-Cosmetics |
|------|-------------|------------|-------------|
| **성격** | 기관 / 전문 / 신뢰 | 관리 / 데이터 / 헬스 | 브랜드 / 감성 / 여백 |
| **Hero bg** | `bg-primary-50` | `bg-primary-50` | `bg-primary-50` |
| **Hero border** | `border border-primary-100` | `border-b border-border` | `border border-primary-100` |
| **Hero padding** | `py-16` | `py-10` | `py-20` |
| **Card radius** | `rounded-md` | `rounded-lg` | `rounded-xl` |
| **Card shadow** | `shadow-none` | `shadow-sm` | `shadow-md` |
| **Section spacing** | `mb-16` | `mb-12` | `mb-20` |
| **Button radius** | `rounded-md` | `rounded-lg` | `rounded-full` |
| **Icon wrapper** | 없음 (텍스트만) | `bg-primary-50 rounded-lg w-9 h-9` | `bg-primary-50 rounded-full w-11 h-11` |
| **Layout container** | `max-w-5xl` | `max-w-5xl` | `max-w-6xl` |
| **Layout grid** | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` | `grid-cols-2 lg:grid-cols-4` |
| **Layout gap** | `gap-4` | `gap-3` | `gap-4` |

---

## 4. 화면별 정비 완료 현황

| 화면/영역 | 상태 | 적용 범위 |
|-----------|------|----------|
| Home | 완료 | 3개 서비스 |
| StoreHub | 완료 | 3개 서비스 |
| Forum List | 완료 | KPA (reference) |
| Auth | 완료 | K-Cosmetics |
| Content List | 완료 | KPA (GlycoPharm/K-Cosmetics는 이미 카드형 또는 해당 없음) |
| Resources List | 완료 | 3개 서비스 (공유 템플릿 1회 수정) |
| Store Dashboard | 완료 | KPA, K-Cosmetics (GlycoPharm은 HubLayout 사용) |
| Responsive Layout | 완료 | PageContainer + KPI grid + Home 2-column |
| Responsive List | 완료 | Forum / Content / Resources |

---

## 5. 적용된 주요 패턴

| 기존 패턴 | 전환 패턴 | 효과 |
|-----------|----------|------|
| hardcoded hex (`#2563EB`) | `bg-primary` / `text-primary` | 서비스 분기 제거 |
| inline style (`style={{...}}`) | Tailwind className | CSS 우선순위 일관성 |
| `<div>` 카드 | `<Card>` 컴포넌트 | radius/shadow 자동 적용 |
| static grid (`grid-cols-4`) | `template.layout.grid` | 서비스별 밀도 제어 |
| desktop table only | desktop table + mobile card | 모바일 정보 밀도 최적화 |
| JS `@media` (`document.createElement('style')`) | Tailwind breakpoint (`md:flex-row`) | SSR 호환, 번들 크기 감소 |

---

## 6. Responsive List 기준

### 원칙

```
리스트 반응형은 줄이는 것이 아니라 표현을 바꾸는 것이다.
```

### 구조

| 뷰포트 | 표현 | CSS |
|--------|------|-----|
| Desktop (md 이상) | BaseTable | `hidden md:block` |
| Mobile (md 미만) | Card List | `block md:hidden` |

### 카드 설계 규칙

```
- 3줄 이내 구성: (1) 제목 (2) 메타/태그 (3) 수치/액션
- 카드 스타일은 Template/Card가 담당 (radius, shadow 자동)
- 데이터와 필터/페이지네이션은 Desktop/Mobile 공유
- 테이블 컬럼을 카드에 그대로 복사하지 않음
- 모바일에서 핵심 정보만 선택적으로 표시
```

### 적용 현황

| 리스트 | 카드 구성 | 파일 |
|--------|----------|------|
| Forum | 제목(고정+댓글), 태그, 작성자·날짜+조회·좋아요·댓글 | `web-kpa-society/.../ForumListPage.tsx` |
| Content 문서 | 제목, 작성자·날짜+조회·좋아요 | `web-kpa-society/.../ContentListPage.tsx` |
| Content 코스 | 제목, 날짜·분량+상태배지 | `web-kpa-society/.../ContentListPage.tsx` |
| Resources | 파일배지+제목, 등록자·날짜·조회, 가져가기 버튼 | `shared-space-ui/.../ResourcesHubTemplate.tsx` |

---

## 7. Template Preset 상태

| Key | 이름 | Category | 역할 | 사용 서비스 |
|-----|------|----------|------|------------|
| `kpa` | KPA Professional | professional | 전문기관형 — 절제, border 중심, 그림자 없음 | KPA Society |
| `glycopharm` | Health Dashboard | dashboard | 대시보드형 — 컴팩트, 가벼운 그림자, 정보 밀도 | GlycoPharm |
| `kcosmetics` | Beauty Brand | brand | 브랜드형 — 넉넉한 여백, 큰 곡률, pill 버튼 | K-Cosmetics |
| `referenceA` | Premium SaaS | experimental | 실험형 — gradient hero, 큰 그림자, 넓은 간격 | 미적용 (실험) |

### TemplateTokens 인터페이스

```typescript
interface TemplateTokens {
  hero:     { bg: string; border: string; padding: string };
  card:     { radius: string; shadow: string };
  section:  { spacing: string };
  button?:  { radius: string };
  icon?:    { wrapper: string; icon: string };
  layout?:  { container: string; grid: string; gap: string };
}
```

---

## 8. 보류 화면 / 후속 후보

| 화면 | 보류 이유 |
|------|----------|
| Signage modal / player | 기능 중심 화면, 별도 UX 판단 필요 |
| LMS lesson / course detail | 교육 콘텐츠 소비 화면, 일반 리스트와 구조 상이 |
| Store detail (상품 상세 등) | 복합 레이아웃, e-commerce 고유 UX |
| Operator / Admin 대시보드 | 관리 도구 특성상 별도 디자인 규칙 적용 (5-Block 표준) |
| 일부 inline style 잔존 화면 | 수정 시점에만 전환 원칙 적용 |

---

## 9. 다음 작업 기준

### 새 화면 작성

```
1. Theme / Template 기준으로 작성 (hardcoded hex, inline style 금지)
2. <Card>, <Button>, <PageHero>, <PageSection> 컴포넌트 사용
3. bg-primary / text-primary 등 CSS 변수 기반 Tailwind 클래스 사용
4. 아이콘 래퍼는 tpl?.icon?.wrapper / tpl?.icon?.icon 사용
```

### 기존 화면 수정

```
1. 수정 시점에만 전환 (일괄 전환하지 않음)
2. 하나의 요소를 먼저 전환하고 검증 → 나머지 확산
3. inline style 제거 시 className과 충돌 없는지 확인
```

### 리스트 반응형

```
1. 신규 리스트는 모바일 카드 제공 여부 우선 확인
2. Desktop Table / Mobile Card 이중 렌더링 패턴 적용
3. 카드 내용은 리스트 특성에 맞게 3줄 이내로 구성
```

### 레퍼런스 디자인 적용

```
1. 레퍼런스를 복사하지 않고 Template으로 번역
2. 레퍼런스의 시각 요소 → TemplateTokens className으로 변환
3. 구조는 O4O 컴포넌트 유지, 느낌만 토큰으로 표현
```

---

## 10. 관련 문서

| 문서 | 경로 |
|------|------|
| Design System Baseline | `docs/design/O4O-DESIGN-SYSTEM-BASELINE.md` |
| Template Presets | `docs/design/O4O-TEMPLATE-PRESETS.md` |
| Design Core Governance | `docs/rules/design-core-governance.md` |

---

## 핵심

```
이번 작업은 디자인을 한 번 고친 것이 아니라,
O4O가 디자인을 반복 생산할 수 있는 구조를 만든 작업이다.
```

---

*Created: 2026-05-01*
*Status: Final*
