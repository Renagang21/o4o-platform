# PROMOTION_SERVICE_SLOT_MATRIX_V1

> 서비스별 슬롯 적용 매트릭스

---

## 1. 문서 목적

각 서비스가 어떤 슬롯을 실제로 사용하는지,
현재 구현 상태와 Core 전환 우선순위를 **서비스×슬롯 매트릭스**로 정리한다.

---

## 2. 전체 매트릭스

### 범례

| 기호 | 의미 |
|------|------|
| **CMS** | CmsContent+CmsContentSlot 기반 (Core 연동 완료) |
| **API** | 별도 테이블/API 기반 (community_ads 등) |
| **DATA** | 프론트 데이터 기반 (타입 정의 있으나 CMS 미통합) |
| **STATIC** | 하드코딩 (코드 고정) |
| **PLACEHOLDER** | UI만 존재, 데이터 미연결 |
| **—** | 해당 슬롯 미사용 |
| **P1** | Phase 1 전환 대상 |

### 매트릭스

| slotKey | Neture | GlycoPharm | KPA Society | K-Cosmetics | Phase 1 |
|---------|:------:|:----------:|:-----------:|:-----------:|:-------:|
| `home-hero` | **CMS** | — | STATIC | STATIC **P1** | K-Cos 전환 |
| `home-ads` | **CMS** | — | — | — | — |
| `home-logos` | **CMS** | — | — | STATIC **P1** | K-Cos 전환 |
| `home-featured` | **CMS** (API) | — | — | — | — |
| `home-cta` | STATIC | — | STATIC | STATIC | — |
| `home-running` | — | — | — | STATIC | Phase 2 |
| `home-notices` | — | — | — | STATIC | Phase 2 |
| `community-hero` | — | **API** | **API** | **API** | 병행 유지 |
| `community-ads` | — | **API** | **API** | **API** | 병행 유지 |
| `community-sponsors` | — | **API** | **API** | **API** | 병행 유지 |
| `dashboard-banner` | — | PLACEHOLDER **P1** | — | — | GP 활성화 |
| `dashboard-promo` | — | — | — | — | Phase 2 |
| `intranet-hero` | — | — | **DATA** | — | Phase 2 |
| `intranet-promo` | — | — | **DATA** | — | Phase 2 |
| `intranet-partners` | — | — | **DATA** | — | Phase 2 |
| `page-top-banner` | — | — | — | — | Phase 2+ |
| `page-mid-promo` | — | — | — | — | Phase 2+ |
| `page-bottom-cta` | — | — | — | — | Phase 2+ |

---

## 3. 서비스별 상세

### 3.1 Neture

| 항목 | 상태 |
|------|------|
| **Home Hero** | CMS 완전 운영 — `homepageCmsApi.getHeroSlides()` → `/neture/home/hero` |
| **Home Ads** | CMS 완전 운영 — `homepageCmsApi.getAds()` → `/neture/home/ads` |
| **Home Logos** | CMS 완전 운영 — `homepageCmsApi.getLogos()` → `/neture/home/logos` |
| **Home Featured** | API 기반 — 공급자 목록 API (CMS 아님) |
| **Home CTA** | 정적 (Supplier/Partner 진입) |
| **Admin 관리 UI** | `homepageCmsApi` Admin CRUD 존재 |
| **전환 필요** | 없음 — 이미 Core 연동. 공통 API 추출 시 래퍼 전환 |

**코드 위치:**
- Hero: [HeroSlider.tsx](services/web-neture/src/components/home/HeroSlider.tsx)
- Ads: [HomepageAds.tsx](services/web-neture/src/components/home/HomepageAds.tsx)
- Logos: [PartnerLogoCarousel.tsx](services/web-neture/src/components/home/PartnerLogoCarousel.tsx)
- API: [content.ts](services/web-neture/src/lib/api/content.ts) (`homepageCmsApi`)

### 3.2 GlycoPharm

| 항목 | 상태 |
|------|------|
| **Home** | 서비스 Home 없음 (로그인 후 바로 대시보드/약국) |
| **Community Hero** | `community_ads` (type=hero) API 기반 — `HeroBannerSection` |
| **Community Ads** | `community_ads` (type=page) API 기반 — `AdSection` |
| **Community Sponsors** | `community_sponsors` API 기반 — `SponsorBar` |
| **Dashboard Banner** | PLACEHOLDER 존재 — "광고 배너 영역" |
| **Store Hero** | Store Template 전용 `HeroManagerTab` — Core 대상 아님 |
| **Operator 관리 UI** | `CommunityManagementPage` (ads/sponsors CRUD) |
| **전환 필요** | Dashboard Banner 슬롯 활성화 (Phase 1) |

**코드 위치:**
- Community Hero: [HeroBannerSection.tsx](services/web-glycopharm/src/components/community/HeroBannerSection.tsx)
- Community Ads: [AdSection.tsx](services/web-glycopharm/src/components/community/AdSection.tsx)
- Sponsors: [SponsorBar.tsx](services/web-glycopharm/src/components/community/SponsorBar.tsx)
- Dashboard Banner: [BannerSection.tsx](services/web-glycopharm/src/components/dashboard/BannerSection.tsx)
- Store Hero: [HeroManagerTab.tsx](services/web-glycopharm/src/pages/operator/store-template/tabs/HeroManagerTab.tsx)

### 3.3 KPA Society

| 항목 | 상태 |
|------|------|
| **Platform Home Hero** | 정적 하드코딩 — `HeroSection` (platform/) |
| **Intranet Hero** | DATA 기반 — `HeroSlide[]` 타입, 조직별 관리, 편집 지원 |
| **Intranet Promo** | DATA 기반 — `PromoCard[]` 타입, 기간 필터, 운영자 반영 |
| **Intranet Partners** | DATA 기반 — `PartnerLink[]` 타입, 지부만 관리 |
| **Community Hero/Ads/Sponsors** | `community_ads`/`community_sponsors` API 기반 |
| **Dashboard Services** | 정적 `ServiceBanner` (외부 서비스 링크) |
| **Operator 관리 UI** | `CommunityManagementPage` |
| **전환 필요** | Platform Home Hero (Phase 1). Intranet 계열 (Phase 2) |

**코드 위치:**
- Platform Hero: [HeroSection.tsx](services/web-kpa-society/src/components/platform/HeroSection.tsx)
- Intranet Hero: [HeroSection.tsx](services/web-kpa-society/src/components/intranet/HeroSection.tsx)
- PromoCards: [PromoCardsSection.tsx](services/web-kpa-society/src/components/intranet/PromoCardsSection.tsx)
- 타입 정의: [mainpage.ts](services/web-kpa-society/src/types/mainpage.ts)
- Community: [HeroBannerSection.tsx](services/web-kpa-society/src/components/community/HeroBannerSection.tsx)

### 3.4 K-Cosmetics

| 항목 | 상태 |
|------|------|
| **Home Hero** | 100% 정적 — 4개 슬라이드 하드코딩 |
| **Home Quick Action** | 정적 4개 카드 — Core 대상 아님 (운영 도구 메뉴) |
| **Home Now Running** | 정적 3개 항목 — Phase 2 검토 |
| **Home Notices** | 정적 4개 공지 — Phase 2 검토 |
| **Home Partners** | 정적 5개 브랜드명 텍스트 |
| **Community Hero/Ads/Sponsors** | `community_ads`/`community_sponsors` API 기반 |
| **Operator 관리 UI** | `CommunityManagementPage`만 |
| **전환 필요** | **Home Hero + Partners가 Phase 1 최우선** |

**코드 위치:**
- Home (전체): [HomePage.tsx](services/web-k-cosmetics/src/pages/HomePage.tsx) — 단일 파일 인라인
- Community: [HeroBannerSection.tsx](services/web-k-cosmetics/src/components/community/HeroBannerSection.tsx)

---

## 4. Phase 1 우선순위 판단

| 순위 | 대상 | 이유 |
|:----:|------|------|
| **1** | K-Cosmetics `home-hero` | 100% 하드코딩 → CMS 전환 효과 최대 |
| **2** | K-Cosmetics `home-logos` | Partners 텍스트 → 로고 캐러셀 전환 |
| **3** | GlycoPharm `dashboard-banner` | PLACEHOLDER → 슬롯 연결만으로 즉시 활성화 |
| **4** | KPA `home-hero` (Platform) | 정적 → CMS 전환 |
| **5** | 공통 `useSlotContent` 훅 | 위 전환을 지탱하는 공통 인프라 |

---

## 5. Community Hub 슬롯 병행 전략

Phase 1에서 `community-hero`, `community-ads`, `community-sponsors`는
**기존 `community_ads`/`community_sponsors` 테이블을 유지**한다.

이유:
- 4개 서비스 모두 동일 패턴으로 안정 운영 중
- 마이그레이션 시 데이터 손실 리스크
- Community Hub 자체 리팩토링은 별도 WO 범위

Phase 2 검토 시점:
- 새 서비스 추가 시
- Community Hub 대규모 리팩토링 시
- community_ads와 CmsContent 이중 관리 비용이 감내 불가할 때

---

*Version: 1.0*
*Created: 2026-04-04*
*Status: Draft*
