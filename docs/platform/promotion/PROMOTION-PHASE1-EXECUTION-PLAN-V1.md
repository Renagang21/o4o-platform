# PROMOTION_PHASE1_EXECUTION_PLAN_V1

> Phase 1 실행 순서 및 범위 정의

---

## 1. 문서 목적

프로모션/안내 관리 기능의 **Phase 1 구현 범위, 제외 범위, 실행 순서**를 정의한다.
구현 WO 작성 직전의 실행 기준 문서.

---

## 2. Phase 1 구현 범위

### 포함

| # | 항목 | 설명 |
|---|------|------|
| P1-1 | **Slot API operator 권한 추가** | 기존 `/cms/slots` API에 operator 권한 지원 |
| P1-2 | **K-Cosmetics Home CMS 전환** | 정적 Hero 4개 + Partners 5개 → `home-hero` + `home-logos` 슬롯 |
| P1-3 | **공통 `useSlotContent` 훅** | 4개 서비스에서 사용할 슬롯 데이터 조회 훅 |
| P1-4 | **공통 `SlotHeroSlider` 컴포넌트** | Hero 슬라이더 공통 렌더러 |
| P1-5 | **공통 `SlotAdGrid` 컴포넌트** | 광고/프로모션 그리드 공통 렌더러 |
| P1-6 | **공통 `SlotLogoCarousel` 컴포넌트** | 로고 캐러셀 공통 렌더러 |
| P1-7 | **KPA Platform Home Hero CMS 전환** | 정적 Hero → `home-hero` 슬롯 |
| P1-8 | **GlycoPharm Dashboard Banner 활성화** | placeholder → `dashboard-banner` 슬롯 연결 |
| P1-9 | **초기 시드 데이터** | 각 서비스 슬롯에 현재 하드코딩된 데이터를 CmsContent로 이관하는 마이그레이션 |

### 제외

| # | 항목 | 이유 | Phase |
|---|------|------|:-----:|
| X1 | community_ads/sponsors 통합 | 안정 운영 중, 마이그레이션 리스크 | 2 |
| X2 | KPA Intranet Hero/Promo/Partners | 조직별 관리 복잡도, 별도 WO | 2 |
| X3 | K-Cos Home Now Running / Notices | 비즈니스 로직 연동 필요 | 2 |
| X4 | 페이지 내부 슬롯 (`page-*`) | 우선순위 낮음 | 2+ |
| X5 | 슬롯 노출 통계 (viewCount, clickCount) | Core 확장 필요 | 2 |
| X6 | 공통 운영자 슬롯 관리 UI | 기존 서비스별 관리 UI 사용 | 2 |
| X7 | 공통 패키지 추출 (`@o4o/promotion-ui`) | 각 서비스 내 배치 후 검증 | 2 |
| X8 | GlycoPharm Store Hero 통합 | Store Template 종속, 별도 도메인 | — |

---

## 3. 실행 순서

### Step 1: 백엔드 준비 (선행 조건)

**WO 후보: WO-O4O-PROMOTION-SLOT-API-OPERATOR-V1**

| 작업 | 파일 | 설명 |
|------|------|------|
| Slot API operator 권한 추가 | `routes/cms-content/cms-content-slot.handler.ts` | `requireAdmin` → `requireAuth` + serviceKey scope 체크 |
| 슬롯 키 유효성 검증 (선택적) | 동일 파일 | 슬롯 카탈로그에 없는 slotKey 거부 |

**선행 조건:** 없음 (기존 API 수정)
**예상 영향:** 최소 — 기존 admin 동작 유지하면서 operator 추가

### Step 2: 공통 훅 + 컴포넌트 작성

**WO 후보: WO-O4O-PROMOTION-COMMON-UI-V1**

| 작업 | 위치 | 설명 |
|------|------|------|
| `useSlotContent` 훅 | 각 서비스 `hooks/` 또는 `api/` | Slot 공개 API 호출 + 캐싱 + 로딩 상태 |
| `SlotHeroSlider` | 각 서비스 `components/promotion/` | 레퍼런스: Neture HeroSlider |
| `SlotAdGrid` | 동일 | 레퍼런스: Neture HomepageAds |
| `SlotLogoCarousel` | 동일 | 레퍼런스: Neture PartnerLogoCarousel |

**선행 조건:** Step 1 (operator API)
**방식:** 먼저 K-Cosmetics에서 구현 → 다른 서비스에 복사/적용

### Step 3: K-Cosmetics Home CMS 전환

**WO 후보: WO-KCOS-HOME-CMS-CONVERSION-V1**

| 작업 | 파일 | 설명 |
|------|------|------|
| 시드 마이그레이션 | `database/migrations/` | 현재 하드코딩된 Hero 4개 → CmsContent 삽입 + `home-hero` 슬롯 배치 |
| 시드 마이그레이션 | 동일 | Partners 5개 → CmsContent 삽입 + `home-logos` 슬롯 배치 |
| HomePage 수정 | `services/web-k-cosmetics/src/pages/HomePage.tsx` | 정적 HeroSection → `useSlotContent` + `SlotHeroSlider` |
| HomePage 수정 | 동일 | 정적 PartnerTrustSection → `useSlotContent` + `SlotLogoCarousel` |

**선행 조건:** Step 2 (공통 컴포넌트)
**리스크:**
- 시드 마이그레이션 실패 시 빈 Hero → 정적 fallback으로 안전 처리
- 기존 인라인 스타일 제거 후 공통 컴포넌트 스타일로 전환

### Step 4: KPA Platform Home Hero CMS 전환

**WO 후보: WO-KPA-PLATFORM-HOME-CMS-V1**

| 작업 | 파일 | 설명 |
|------|------|------|
| 시드 마이그레이션 | `database/migrations/` | 현재 정적 Hero → CmsContent + `home-hero` 슬롯 |
| HeroSection 수정 | `services/web-kpa-society/src/components/platform/HeroSection.tsx` | 정적 → `useSlotContent` + `SlotHeroSlider` |

**선행 조건:** Step 2
**리스크:** 낮음 — 단일 Hero 전환

### Step 5: GlycoPharm Dashboard Banner 활성화

**WO 후보: WO-GP-DASHBOARD-BANNER-ACTIVATION-V1**

| 작업 | 파일 | 설명 |
|------|------|------|
| 시드 마이그레이션 (선택적) | `database/migrations/` | 초기 배너 콘텐츠 삽입 + `dashboard-banner` 슬롯 |
| BannerSection 수정 | `services/web-glycopharm/src/components/dashboard/BannerSection.tsx` | placeholder → `useSlotContent` + `SlotPromoBanner` |

**선행 조건:** Step 2
**리스크:** 낮음 — 기존 placeholder 교체

---

## 4. 우선순위 근거

| 순위 | 대상 | 근거 |
|:----:|------|------|
| 1 | K-Cosmetics Home | **효과 최대** — 4개 정적 섹션 중 2개를 CMS로 전환. 서비스 운영자가 즉시 콘텐츠 변경 가능 |
| 2 | 공통 훅/컴포넌트 | **재사용 기반** — K-Cos에서 먼저 만들고 다른 서비스에 적용 |
| 3 | KPA Platform Home | **빠른 적용** — 단일 Hero만 전환. 공통 컴포넌트 재사용 |
| 4 | GlycoPharm Dashboard | **최소 노력** — placeholder 교체만으로 즉시 활용 |
| 5 | Slot API operator 권한 | **인프라** — 나머지 모든 작업의 선행 조건 |

---

## 5. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 시드 마이그레이션 실패 | Home Hero가 빈 화면 | 모든 Hero 컴포넌트에 정적 fallback 유지 |
| CmsContentSlot 테이블 미존재 | API 500 에러 | 마이그레이션 `1736500000000-CreateCmsContentTables` 확인 |
| Slot API 권한 변경 시 기존 admin 영향 | admin 동작 깨짐 | requireAdmin 유지 + operator 경로 병렬 추가 |
| K-Cos Home 디자인 변경 | 기존 UI와 차이 | className prop으로 기존 스타일 최대 보존 |

---

## 6. 예상 산출물

### 코드

| 파일/위치 | 유형 |
|----------|------|
| `routes/cms-content/cms-content-slot.handler.ts` | 수정 (operator 권한) |
| `database/migrations/2026XXXX-SeedPromotionSlots.ts` | 신규 (시드 데이터) |
| `services/web-k-cosmetics/src/hooks/useSlotContent.ts` | 신규 |
| `services/web-k-cosmetics/src/components/promotion/SlotHeroSlider.tsx` | 신규 |
| `services/web-k-cosmetics/src/components/promotion/SlotAdGrid.tsx` | 신규 |
| `services/web-k-cosmetics/src/components/promotion/SlotLogoCarousel.tsx` | 신규 |
| `services/web-k-cosmetics/src/pages/HomePage.tsx` | 수정 (CMS 전환) |
| `services/web-kpa-society/src/components/platform/HeroSection.tsx` | 수정 (CMS 전환) |
| `services/web-glycopharm/src/components/dashboard/BannerSection.tsx` | 수정 (슬롯 연결) |

### 문서

| 문서 | 유형 |
|------|------|
| 각 WO 문서 (4~5개) | 신규 |

---

## 7. Phase 2 미리보기

Phase 1 완료 후 검토할 항목:

| 항목 | 예상 시점 |
|------|----------|
| community_ads → CmsContentSlot 마이그레이션 | Phase 1 안정화 후 |
| KPA Intranet Hero/Promo/Partners CMS 전환 | Phase 2 초반 |
| K-Cos Home Now Running / Notices CMS 전환 | Phase 2 |
| 페이지 내부 슬롯 (`page-top-banner` 등) | Phase 2+ |
| 슬롯 노출 통계 | Phase 2 |
| 공통 운영자 슬롯 관리 UI | Phase 2 |
| `@o4o/promotion-ui` 공통 패키지 추출 | Phase 2 |

---

*Version: 1.0*
*Created: 2026-04-04*
*Status: Draft*
