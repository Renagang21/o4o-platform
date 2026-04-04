# PROMOTION_UI_COMPONENT_STRATEGY_V1

> 프론트엔드 공통 컴포넌트와 확장앱 렌더링 전략

---

## 1. 문서 목적

프로모션 슬롯의 프론트엔드 **공통 훅, 공통 컴포넌트, 서비스별 래퍼** 전략을 정의한다.
프론트엔드 구현 WO의 기준 문서.

---

## 2. 레이어 구조

```
┌──────────────────────────────────────────────────────────┐
│  서비스별 래퍼 (확장앱)                                    │
│                                                          │
│  NetureHomePage     KCosmeticsHomePage    KPAHomePage     │
│  └ <NetureHero />   └ <KCosHero />        └ <KPAHero /> │
│    theme="neture"     theme="k-cosmetics"   theme="kpa"  │
└────────────┬─────────────────┬───────────────────┬───────┘
             │                 │                   │
┌────────────┴─────────────────┴───────────────────┴───────┐
│  공통 컴포넌트 (Core UI)                                   │
│                                                          │
│  <SlotHeroSlider />  <SlotAdGrid />  <SlotLogoCarousel />│
│  <SlotPromoBanner /> <SlotBanner />                      │
└────────────┬─────────────────────────────────────────────┘
             │
┌────────────┴─────────────────────────────────────────────┐
│  공통 훅                                                   │
│                                                          │
│  useSlotContent(slotKey, options)                         │
└────────────┬─────────────────────────────────────────────┘
             │ HTTP
             ▼
    GET /cms/slots/:slotKey
```

---

## 3. 공통 훅: useSlotContent

### 3.1 인터페이스

```typescript
interface UseSlotContentOptions {
  serviceKey: string;
  organizationId?: string;
  enabled?: boolean;          // 조건부 fetch (기본 true)
  refetchInterval?: number;   // 주기적 갱신 (ms, 기본 없음)
}

interface SlotContentItem {
  id: string;
  slotKey: string;
  sortOrder: number;
  content: {
    id: string;
    type: string;
    title: string;
    summary: string | null;
    imageUrl: string | null;
    linkUrl: string | null;
    linkText: string | null;
    metadata: Record<string, any>;
  };
}

interface UseSlotContentResult {
  contents: SlotContentItem[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

function useSlotContent(
  slotKey: string,
  options: UseSlotContentOptions
): UseSlotContentResult;
```

### 3.2 사용 예시

```typescript
// K-Cosmetics Home Hero
const { contents, loading } = useSlotContent('home-hero', {
  serviceKey: 'k-cosmetics',
});

// KPA Intranet Hero (조직별)
const { contents } = useSlotContent('intranet-hero', {
  serviceKey: 'kpa',
  organizationId: currentOrg.id,
});
```

### 3.3 구현 위치

**신규 공통 패키지 또는 기존 공유 유틸리티에 추가.**

후보:
- `packages/ui-common/hooks/useSlotContent.ts` (신규)
- 각 서비스의 `lib/api/` 또는 `hooks/`에 복사 (단순 접근)

**Phase 1 결정:** 각 서비스의 `hooks/` 또는 `api/` 폴더에 동일 훅을 배치.
공통 패키지 추출은 Phase 2에서 검토.

---

## 4. 공통 컴포넌트 후보

### 4.1 SlotHeroSlider

**역할:** Hero 슬롯의 자동 전환 슬라이더

**기능:**
- 다중 슬라이드 자동 전환 (5초)
- 좌우 네비게이션 화살표
- 하단 인디케이터 (dots)
- 배경 이미지 또는 그라데이션
- CTA 버튼 (linkUrl + linkText)
- 0건 시 fallback 렌더 또는 미표시
- 마우스 호버 시 일시 정지

**Props:**
```typescript
interface SlotHeroSliderProps {
  contents: SlotContentItem[];
  loading?: boolean;
  fallback?: React.ReactNode;          // 0건 시 대체 UI
  interval?: number;                    // 전환 간격 (기본 5000ms)
  className?: string;                   // 서비스별 스타일 오버라이드
  height?: string | number;             // 높이 (기본 320px)
  renderOverlay?: (content: SlotContentItem) => React.ReactNode;
}
```

**레퍼런스 구현:**
- Neture [HeroSlider.tsx](services/web-neture/src/components/home/HeroSlider.tsx) — CMS 기반
- K-Cosmetics [HomePage.tsx](services/web-k-cosmetics/src/pages/HomePage.tsx) L223-402 — HeroSection 인라인
- KPA [HeroSection.tsx](services/web-kpa-society/src/components/intranet/HeroSection.tsx) — 데이터 기반

**4개 서비스 공통 UX 패턴:**
- 5초 자동 전환 (4개 모두 동일)
- 좌우 화살표 (Neture, KPA, GlycoPharm 동일)
- 하단 dots 인디케이터 (4개 모두 동일)
- 배경 이미지 위 텍스트 (4개 모두 동일)

### 4.2 SlotAdGrid

**역할:** 광고/프로모션 카드 그리드

**기능:**
- 1~3열 반응형 그리드
- 이미지 + 제목 + 설명 카드
- 클릭 시 linkUrl 이동 (외부 링크 새 탭)
- 0건 시 미표시

**Props:**
```typescript
interface SlotAdGridProps {
  contents: SlotContentItem[];
  maxColumns?: 1 | 2 | 3;              // 기본 3
  className?: string;
}
```

**레퍼런스:**
- Neture [HomepageAds.tsx](services/web-neture/src/components/home/HomepageAds.tsx)
- GlycoPharm [AdSection.tsx](services/web-glycopharm/src/components/community/AdSection.tsx)

### 4.3 SlotLogoCarousel

**역할:** 파트너/브랜드 로고 무한 스크롤

**기능:**
- CSS 애니메이션 기반 무한 수평 스크롤
- 호버 시 grayscale 해제
- 클릭 시 linkUrl 이동
- 0건 시 미표시

**Props:**
```typescript
interface SlotLogoCarouselProps {
  contents: SlotContentItem[];
  speed?: number;                       // 애니메이션 속도 배수 (기본 1)
  className?: string;
  title?: string;                       // "파트너사", "협력 브랜드" 등
}
```

**레퍼런스:**
- Neture [PartnerLogoCarousel.tsx](services/web-neture/src/components/home/PartnerLogoCarousel.tsx)

### 4.4 SlotPromoBanner

**역할:** 대시보드/페이지 내부 배너

**기능:**
- 단일 또는 소수 배너
- 이미지 + 텍스트 + CTA
- 0건 시 미표시

**Props:**
```typescript
interface SlotPromoBannerProps {
  contents: SlotContentItem[];
  variant?: 'full-width' | 'card';      // 기본 'card'
  className?: string;
}
```

**레퍼런스:**
- GlycoPharm [BannerSection.tsx](services/web-glycopharm/src/components/dashboard/BannerSection.tsx) (placeholder)

---

## 5. 서비스별 래퍼가 처리하는 범위

공통 컴포넌트는 **데이터 → 렌더**만 담당.
서비스별 래퍼는 **브랜딩, 테마, 배치 결정**을 담당.

| 서비스별 래퍼 책임 | 예시 |
|-------------------|------|
| 서비스 브랜드 색상 | Neture: primary-600~800, KPA: #0f172a, K-Cos: #1e293b |
| 슬롯 조합 및 순서 | NetureHomePage에서 HeroSlider → Ads → Logos → CTA 순서 결정 |
| fallback UI | 데이터 없을 때 서비스별 다른 대체 화면 |
| 추가 섹션 | Hero 위에 알파 뱃지, 슬라이드 위에 서비스 로고 등 |
| 인증 상태 기반 분기 | 미로그인 → CTA 표시, 로그인 → 대시보드 링크 |

---

## 6. 디자인 차이 허용 범위

### 공통 컴포넌트에서 허용하는 커스텀

| 항목 | 커스텀 방식 |
|------|-----------|
| 높이 | `height` prop |
| 색상/배경 | `className` prop + 서비스 CSS |
| 전환 속도 | `interval` prop |
| 최대 열 수 | `maxColumns` prop |
| 오버레이 | `renderOverlay` prop (Hero) |

### 공통 컴포넌트에서 허용하지 않는 커스텀

| 항목 | 이유 |
|------|------|
| 슬라이드 전환 방식 변경 (fade→slide 등) | UX 일관성 |
| 인디케이터 위치/스타일 변경 | UX 일관성 |
| 0건 시 동작 변경 (미표시 → 에러 → 다른 내용) | `fallback` prop으로 대응 |

### 서비스가 완전히 다른 UI가 필요할 때

공통 컴포넌트를 **사용하지 않고** 서비스 전용 컴포넌트를 만든다.
단, `useSlotContent` 훅은 반드시 사용하여 데이터 레이어는 통일한다.

---

## 7. Phase 1 프론트엔드 구현 범위

| 항목 | Phase 1 | Phase 2 |
|------|:-------:|:-------:|
| `useSlotContent` 훅 | **YES** | 공통 패키지 추출 |
| `SlotHeroSlider` | **YES** | 애니메이션 고도화 |
| `SlotAdGrid` | **YES** | |
| `SlotLogoCarousel` | **YES** | |
| `SlotPromoBanner` | Phase 2 | **YES** |
| 공통 패키지 추출 | 각 서비스 내 배치 | 패키지 통합 |
| 운영자 슬롯 관리 UI | 기존 사용 | 공통 관리 컴포넌트 |

---

*Version: 1.0*
*Created: 2026-04-04*
*Status: Draft*
