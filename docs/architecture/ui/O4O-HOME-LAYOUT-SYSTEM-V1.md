# O4O Home Layout System V1

> **상태:** ACTIVE — 2026-04-23 확정  
> **적용 범위:** O4O 전 서비스 Home / Hub Landing 페이지  
> **관련 WO:** WO-O4O-GLOBAL-VERTICAL-RHYTHM-SYSTEM-V1 · WO-O4O-HORIZONTAL-SPACING-AND-CONTAINER-STANDARD-V1 · WO-O4O-HOME-LAYOUT-SYSTEM-CONSOLIDATION-V1

---

## 1. 개요

O4O Home은 "정보 허브"이며 실행 UI가 아니다.
사용자는 Home에서 빠르게 원하는 서비스로 진입한다.

세 가지 원칙:

- **구조는 공통** — 모든 서비스는 동일한 레이아웃 리듬을 따른다
- **콘텐츠는 서비스별** — UI 차이는 콘텐츠 영역에서만 발생한다
- **Page 레벨이 container를 제어한다** — Section 컴포넌트는 container를 갖지 않는다

---

## 2. Core Layout Components

세 개의 컴포넌트가 O4O Home 레이아웃 시스템을 구성한다.

모두 `packages/ui/src/layout/`에 정의되며 `@o4o/ui`에서 import한다.

| 컴포넌트 | 파일 | 역할 |
|---|---|---|
| `PageHero` | `Section.tsx` | 상단 강조 영역 — 첫 vertical 리듬 시작점 |
| `PageSection` | `Section.tsx` | 세로 블록 단위 — vertical rhythm 표준 간격 |
| `PageContainer` | `Container.tsx` | 가로 정렬 기준 — 모든 콘텐츠의 width/padding 통일 |

---

## 3. 표준 사용 패턴

### 3.1 기본 구조 (Full Standard)

```tsx
import { PageHero, PageSection, PageContainer } from '@o4o/ui';

// Hero 영역
<PageHero>
  <PageContainer>
    <HeroContent />
  </PageContainer>
</PageHero>

// 일반 섹션
<PageSection>
  <PageContainer>
    <SectionContent />
  </PageContainer>
</PageSection>

// 마지막 섹션 (하단 여백 제거)
<PageSection last>
  <PageContainer>
    <LastSectionContent />
  </PageContainer>
</PageSection>
```

### 3.2 Full-width 배경 허용 패턴

배경색이 화면 전체를 채워야 하는 경우 (강조 섹션, 스폰서 띠 등):

```tsx
<PageSection>
  <div className="bg-muted">
    <PageContainer>
      <SponsorContent />
    </PageContainer>
  </div>
</PageSection>
```

배경은 full-width, 콘텐츠는 PageContainer 안에 있어야 한다.

### 3.3 Full-bleed Hero 패턴

슬라이더/캐러셀처럼 Hero가 전체폭을 채우는 경우:

```tsx
<PageHero>
  <HeroSlider />   {/* 내부에서 직접 container 처리 */}
</PageHero>
```

이 경우 Hero 컴포넌트 내부가 자체 container를 포함하거나 full-bleed로 동작한다.
단, 가능하면 Hero 내부에서도 텍스트/버튼 영역은 PageContainer 기준을 따른다.

---

## 4. Vertical Rhythm 규칙

`PageHero`와 `PageSection`이 자동으로 적용한다.

| 위치 | 클래스 | 픽셀 |
|---|---|---|
| Hero 하단 (→ 첫 Section) | `mb-16` | 64px |
| Section 하단 (→ 다음 Section) | `mb-12` | 48px |
| 마지막 Section | (없음) | `last` prop 사용 |

```tsx
// 구현 (packages/ui/src/layout/Section.tsx)
export function PageHero({ children, className, ...props }) {
  return <section className={['mb-16', className].filter(Boolean).join(' ')} {...props}>{children}</section>;
}

export function PageSection({ children, className, last = false, ...props }) {
  return <section className={[last ? '' : 'mb-12', className].filter(Boolean).join(' ')} {...props}>{children}</section>;
}
```

---

## 5. Horizontal 규칙

`PageContainer`가 자동으로 적용한다.

```tsx
// 구현 (packages/ui/src/layout/Container.tsx)
export function PageContainer({ children, className, ...props }) {
  return (
    <div
      className={['mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
```

| 항목 | 값 |
|---|---|
| 최대 폭 | `max-w-7xl` (1280px) |
| 모바일 padding | `px-4` (16px 양쪽) |
| 태블릿 padding | `sm:px-6` (24px 양쪽) |
| 데스크톱 padding | `lg:px-8` (32px 양쪽) |

모든 콘텐츠 섹션은 동일한 좌측 정렬선을 공유한다.

---

## 6. 금지 패턴

다음 패턴은 신규 개발에서 사용하지 않는다.

### 6.1 inline container 스타일

```tsx
// ❌ 금지
<div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>

// ✅ 표준
<PageContainer>
```

### 6.2 Section마다 다른 padding

```tsx
// ❌ 금지
<section style={{ padding: '40px 24px' }}>

// ✅ 표준 — vertical은 PageSection, horizontal은 PageContainer
<PageSection>
  <PageContainer>
    <section style={{ padding: '40px 0' }}>  {/* vertical만 허용 */}
```

### 6.3 margin: auto 직접 사용

```tsx
// ❌ 금지
<div style={{ maxWidth: '960px', margin: '0 auto' }}>

// ✅ 표준
<PageContainer>
```

### 6.4 Section 컴포넌트 내부의 container

```tsx
// ❌ 금지 — Section 컴포넌트가 자체 container를 가짐
function NoticeSection() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
      ...
    </div>
  );
}

// ✅ 표준 — Section은 콘텐츠만, container는 Page 레벨에서
function NoticeSection() {
  return <div>...</div>;  // 내부 container 없음
}

// Page에서:
<PageSection>
  <PageContainer>
    <NoticeSection />
  </PageContainer>
</PageSection>
```

### 6.5 container 없이 full-width 콘텐츠

```tsx
// ❌ 금지
<PageSection>
  <div style={{ width: '100%' }}>
    <SomeBigContent />  {/* 정렬선 없음 */}
  </div>
</PageSection>

// ✅ 표준
<PageSection>
  <PageContainer>
    <SomeBigContent />
  </PageContainer>
</PageSection>
```

---

## 7. Imported Section 컴포넌트 정책

### 현황

일부 shared-space-ui / 서비스 고유 컴포넌트가 내부에 자체 container를 포함할 수 있다.

### 정책

- **원칙:** Section 컴포넌트 내부에는 container(`max-width`, `margin: auto`)를 두지 않는다
- **제어 위치:** container는 Page 레벨에서만 제어한다
- **이행:** 기존 컴포넌트의 내부 container는 `WO-O4O-SECTION-INNER-CONTAINER-CLEANUP-V1`에서 단계적으로 제거한다

### 적용 기준

신규 Section 컴포넌트를 만들 때:

```tsx
// ✅ 올바른 Section 컴포넌트 구조
export function NewSection({ items }) {
  return (
    <div>                        {/* container 없음 */}
      <h2>Title</h2>
      <div className="grid ...">
        {items.map(...)}
      </div>
    </div>
  );
}

// Page에서 사용:
<PageSection>
  <PageContainer>
    <NewSection items={items} />
  </PageContainer>
</PageSection>
```

---

## 8. 서비스별 적용 현황

### KPA Society (Canonical)

KPA Society가 이 시스템의 **기준 구현(canonical implementation)**이다.

```tsx
// services/web-kpa-society/src/pages/CommunityHomePage.tsx
<PageHero>
  <HeroBannerSection ads={...} />          {/* full-bleed 캐러셀 */}
</PageHero>

<PageSection>
  <PageContainer>
    <NewsNoticesSection ... />
  </PageContainer>
</PageSection>

<PageSection last>
  <PageContainer>
    <CtaGuidanceSection ... />
  </PageContainer>
</PageSection>
```

### GlycoPharm

Hero가 full-bleed가 아닌 경우의 단순화 패턴:

```tsx
// services/web-glycopharm/src/pages/community/CommunityMainPage.tsx
<PageContainer>              {/* outer single container */}
  <PageHero>
    <HeroSummarySection ... />
  </PageHero>
  <PageSection>...</PageSection>
  ...
</PageContainer>
```

> Hero가 full-bleed 배경을 쓰지 않으면 outer PageContainer 단일 래퍼도 허용된다.

### Neture

```tsx
// services/web-neture/src/pages/NetureHomePage.tsx
<PageHero><HeroSlider /></PageHero>          {/* full-bleed slider */}
<PageSection><PlatformIntroSection /></PageSection>  {/* 내부 container 미정비 — 다음 WO */}
<PageSection><MarketTrialSection /></PageSection>    {/* PageContainer 내부 적용 완료 */}
```

### K-Cosmetics

```tsx
// services/web-k-cosmetics/src/pages/HomePage.tsx
<PageHero><HeroSection slides={...} /></PageHero>   {/* hero 내부 자체 container 잔존 */}
<PageSection>
  <PageContainer>
    <QuickActionSection ... />
  </PageContainer>
</PageSection>
```

---

## 9. 향후 확장 기준

이 시스템은 다음 화면에도 동일하게 적용한다.

| 화면 | 적용 기준 |
|---|---|
| Hub 페이지 (`/forum`, `/lms`, `/content`) | `PageSection` + `PageContainer` 동일 적용 |
| Store Home | 동일 구조, CTA 배치만 다름 |
| Landing 페이지 | full-bleed Hero 허용 + 이후 Section은 동일 |
| Operator Dashboard | 별도 레이아웃 시스템 유지 (이 문서 범위 외) |

---

## 10. 다음 작업

**WO-O4O-SECTION-INNER-CONTAINER-CLEANUP-V1**

목표:
- Neture imported Section 컴포넌트 내부 container 제거
- K-Cosmetics `HeroSection` 내부 `maxWidth` 정리
- Section 컴포넌트에서 Page 레벨 container 제어 구조 완성

발견된 정비 대상:
1. Neture: `PlatformIntroSection`, `HomepageAds`, `LatestUpdatesSection`, `CommunityPreviewSection`, `FeaturedSection`, `PartnerLogoCarousel`, `HomeCtaSection` — 7개 imported 컴포넌트, PageContainer 미적용
2. K-Cosmetics `HeroSection` 내부: `maxWidth: '1200px', margin: '0 auto', padding: '0 24px'` 잔존 (lines 73–75)

---

*Updated: 2026-04-23*  
*Version: 1.0*  
*Status: Active*
