# PROMOTION_CORE_EXTENSION_BOUNDARY_V1

> 프로모션/안내 기능의 Core vs 확장앱 책임 경계 정의

---

## 1. 문서 목적

O4O 플랫폼에서 **프로모션/안내/광고/이벤트/파트너 링크** 관리 기능을
Core 엔진과 확장앱으로 나누어 개발하기 위한 **책임 경계**를 정의한다.

이 문서는 전체 프로모션 문서 세트의 **최상위 기준 문서**이며,
나머지 문서(슬롯 카탈로그, 매트릭스, 데이터 모델, UI 전략, 실행 계획)는
이 문서의 경계 정의를 따른다.

---

## 2. 용어 정의

| 용어 | 정의 |
|------|------|
| **Promotion Content** | Hero 슬라이드, 광고 카드, 이벤트 배너, 파트너 로고, 안내 블��� 등 운영자가 관리하는 노출용 콘텐츠의 총칭 |
| **Slot** | 화면에서 Promotion Content가 배치되는 위치. `slotKey`로 식별 |
| **Core** | `cms-core` 패키지의 `CmsContent` + `CmsContentSlot` 엔티티 및 ���통 API |
| **확장앱** | 각 서비스(`neture`, `glycopharm`, `kpa`, `k-cosmetics`)가 Core 위에 추가하는 서비스별 로직/UI |

---

## 3. 아키텍처 개요

```
┌─────────────────────────────────────────────────────┐
│                    프론트엔드                         │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  │ neture   │  │glycopharm│  │  kpa     │  │ k-cos    │
│  │ (확장앱) │  │ (확장앱) │  │ (확장앱) │  │ (확장앱) │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
│       │              │              │              │
│  ┌────┴──────────────┴──────────────┴──────────────┴───┐
│  │        공통 훅/컴포넌트 레이어 (Core UI)             │
│  │  useSlotContent() / SlotHeroSlider / SlotAdGrid    │
│  └─────────────────────┬���──────────────────────────────┘
└────────────────────────┼────────────────────────────────┘
                         │ HTTP
┌────────────────────────┼────────────────────────────────┐
│                    백엔드                                │
│                                                         │
│  ┌─────────────────────┴───────────────────────────────┐
│  │            CMS Slot API (Core)                      │
│  │  GET /cms/slots/:slotKey (공개)                     │
│  │  GET/POST/PUT/DELETE /cms/slots (admin/operator)    │
│  └──────────────────────┬─���────────────────────────────┘
│                         │
│  ┌──────────────────────┴──────────────────────────────┐
│  │         CmsContentSlot + CmsContent                 │
│  │         (cms-core 패키지)                            │
│  │                                                     │
│  │  slotKey · serviceKey · organizationId              │
│  │  sortOrder · isActive · startsAt · endsAt           │
│  │  isLocked · lockedBy · lockedReason                 │
│  └─────────────────────────────────────────────────────┘
│                                                         │
│  ┌─────────────────────────────────────────────────────┐
│  │        서비스별 확장 API (확장앱)                     │
│  │  /neture/admin/homepage-contents (Neture 전용)      │
│  │  /glycopharm/community/manage/ads (GP 전용)         │
│  │  /kpa/community/manage/ads (KPA 전용)               │
│  └─────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────┘
```

---

## 4. Core 책임

Core는 **모든 서비스가 공유하는 공통 기반**만 제공한다.

| # | 책임 | 구현 위치 |
|---|------|----------|
| C1 | `CmsContent` 엔티티: 콘텐츠 저��소 (title, summary, imageUrl, linkUrl, linkText, metadata, status, type) | `packages/cms-core/` |
| C2 | `CmsContentSlot` 엔티티: 배치 관리 (slotKey, serviceKey, organizationId, sortOrder, isActive, startsAt/endsAt, lock) | `packages/cms-core/` |
| C3 | Slot 공개 조회 API: `GET /cms/slots/:slotKey` (서비스/조직 필터, 시간 기반 자동 노출) | `routes/cms-content/` |
| C4 | Slot 관리 API: CRUD + 콘텐츠 할당 (admin/operator 권한) | `routes/cms-content/` |
| C5 | 프론트엔드 공통 훅: `useSlotContent(slotKey, options)` | 공통 패키지 (신��) |
| C6 | 프론트엔드 공통 렌더 컴포넌트: `SlotHeroSlider`, `SlotAdGrid`, `SlotLogoCarousel` | 공통 패키지 (신규) |

---

## 5. 확장앱 책임

확장앱은 **서비스별 특수 요구사항과 UI 커스텀**을 담당한다.

| # | 책임 | 예시 |
|---|------|------|
| E1 | 서비스별 slotKey 등록 및 초기 콘텐츠 시딩 | Neture: `home-hero`, `home-ads`, `home-logos` |
| E2 | 운영자 관리 화면 (슬롯 콘텐츠 CRUD UI) | Neture Admin Homepage Manager |
| E3 | 서비스별 Hero 디자인 변형 (색상, 그라데이션, 레이아웃) | KPA: 네이비 ��경, K-Cos: 슬레���트 배경 |
| E4 | 서비스별 비즈니스 로직이 필요한 섹션 | GlycoPharm Store Hero (Store Template 종속) |
| E5 | 기존 `community_ads`/`community_sponsors` 테이블 유지 관리 | Phase 1에서 병행 운영, 향후 마이그레이션 판단 |

---

## 6. Core에 두면 안 되는 것

| # | 금지 | 이유 |
|---|------|------|
| X1 | 서비스별 디자인 테마/색상 | 서비스 정체성은 확장앱 영역 |
| X2 | 서비스별 비즈니스 로직 (Store Template, 공급자 연동 등) | Core는 데이터 저장/조회만 |
| X3 | `community_ads`/`community_sponsors` 직접 마이그레이션 코드 | 기존 데이터 처리는 별도 마이그레이션 WO |
| X4 | 특정 서비스만 쓰는 슬롯 UI 컴포넌트 | KPA PromoCardsSection 같은 특수 렌더러는 확장앱 |
| X5 | 콘텐츠 생성 자동화 (AI 생성, 스케줄 기반 등) | 향후 별도 Core/Extension 검토 |

---

## 7. 확장앱에 두면 안 되는 것

| # | 금지 | 이유 |
|---|------|------|
| Y1 | 독자적 프로모션 테이블 신규 생성 | `CmsContent` + `CmsContentSlot` 사용 필수 |
| Y2 | 슬롯 조회 로직 재구현 | Core API 사용 필수 |
| Y3 | 시간 기반 노출 로직 자체 구현 | `startsAt`/`endsAt`는 Core가 처리 |
| Y4 | 슬롯 Lock 우회 | `isLocked` 체크는 Core API가 강제 |

---

## 8. 기존 자산 활용 원칙

### 8.1 CmsContent 활용

- `type` 필드에 이미 `'hero' | 'promo' | 'event' | 'featured' | 'notice'` 등이 정의됨
- 새 type 추가는 가능하나, 기존 type의 의미 변경 금지
- `metadata` (JSONB) 필드에 서비스별 추가 데이터 저장 가능

### 8.2 CmsContentSlot 활용

- `slotKey`는 슬롯 카탈로그(문서 2)에서 정의한 ��만 사용
- `serviceKey`로 서비스 격��, `organizationId`로 조직 격리
- `sortOrder`로 같은 슬롯 내 순서, `isActive` + `startsAt/endsAt`로 노출 제어
- `isLocked`로 계약/정책 보호

### 8.3 community_ads/community_sponsors

- **Phase 1에서는 병행 유지**
- Community Hub의 기존 API(`/community/ads`, `/community/sponsors`)를 유지하면서
  CmsContentSlot 기반 새 API를 병렬로 제공
- 향후 Phase 2에서 데이터 마이그레이션 검토

### 8.4 Neture homepageCmsApi

- Neture의 `/neture/home/hero`, `/neture/home/ads`, `/neture/home/logos`는
  CmsContent + CmsContentSlot 기반으로 이미 운영 중
- **다른 서비스의 레퍼런스 구현으로 활���**
- 공통 API로 추출 시 Neture 기존 API는 공통 API의 래퍼로 전환

---

## 9. ���비스별 예외 처리 원칙

| 서비스 | 예외 | ��응 |
|--------|------|------|
| GlycoPharm | Store Hero는 Store Template 시스템에 종속 | CmsContentSlot과 ��도 유지. Store 영역은 Core 대상 아님 |
| KPA | Intranet Hero/PromoCard는 조직별 자율 관리 | `organizationId`로 격리. 기존 타입(`HeroSlide`, `PromoCard`)은 CmsContent로 점진 전환 |
| KPA | PartnerLink는 지부만 관리 가능 | `organizationId` + metadata에 `managedBy: 'branch'` 저장 |
| K-Cosmetics | Home 전면 하드코딩 | Phase 1 우선 전환 대상 |
| 전체 | Community Hub 별도 테이블 | Phase 1 병행, Phase 2 마이그레이션 검토 |

---

## 10. 관련 문서

| 문서 | 역할 |
|------|------|
| `PROMOTION_SLOT_CATALOG_V1.md` | 슬롯 키 정의 |
| `PROMOTION_SERVICE_SLOT_MATRIX_V1.md` | 서비스별 적용 매트릭스 |
| `PROMOTION_DATA_MODEL_AND_API_SCOPE_V1.md` | 데이터 모델/API 범위 |
| `PROMOTION_UI_COMPONENT_STRATEGY_V1.md` | 프론트엔드 전략 |
| `PROMOTION_PHASE1_EXECUTION_PLAN_V1.md` | 실행 계획 |

---

*Version: 1.0*
*Created: 2026-04-04*
*Status: Draft*
