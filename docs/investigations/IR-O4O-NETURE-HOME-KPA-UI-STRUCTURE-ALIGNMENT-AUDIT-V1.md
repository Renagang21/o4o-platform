# IR-O4O-NETURE-HOME-KPA-UI-STRUCTURE-ALIGNMENT-AUDIT-V1

**조사 일시:** 2026-05-29
**조사자:** Claude Sonnet 4.6
**작업 성격:** 읽기 전용 조사 (코드 수정 없음)

---

## 1. 전체 판정

| 항목 | 판정 |
|------|------|
| KPA-Society Home → Neture 이식 가능 여부 | **가능** — `StandardHomeTemplate` 기반 공통 구조 존재 |
| Neture 현재 Home 상태 | **CommunityPage** (포럼 중심) — 사업 정체성과 불일치 |
| `StandardHomeTemplate` 적용 여부 | **미적용** — Neture는 자체 구성 사용 중 |
| Backend API 신규 개발 필요 | **최소** — 포럼·공지·Market Trial API 기존 존재 |
| 구현 난이도 | **낮음~중간** — UI 재구성 + props 조정 위주 |
| 즉시 WO 진행 가능 여부 | **YES** — 조사 완료, WO 설계 가능 |

---

## 2. 조사한 파일

### KPA-Society
- `services/web-kpa-society/src/pages/CommunityHomePage.tsx` — 메인 Home
- `services/web-kpa-society/src/pages/HomeLatestPage.tsx` — 최신글 전체 페이지
- `services/web-kpa-society/src/api/home.ts` — Home API
- `services/web-kpa-society/src/App.tsx` — 라우팅

### Neture
- `services/web-neture/src/pages/CommunityPage.tsx` — 현재 Home (커뮤니티 중심)
- `services/web-neture/src/pages/NetureHomePage.tsx` — 구 Home (미사용, 보존 중)
- `services/web-neture/src/components/home/HeroSlider.tsx`
- `services/web-neture/src/components/home/PlatformIntroSection.tsx`
- `services/web-neture/src/components/home/HomepageAds.tsx`
- `services/web-neture/src/components/home/MarketTrialSection.tsx` (구 Home 내)
- `services/web-neture/src/components/home/LatestUpdatesSection.tsx`
- `services/web-neture/src/components/home/CommunityPreviewSection.tsx`
- `services/web-neture/src/components/home/FeaturedSection.tsx`
- `services/web-neture/src/components/home/PartnerLogoCarousel.tsx`
- `services/web-neture/src/components/home/HomeCtaSection.tsx`
- `services/web-neture/src/App.tsx` — 라우팅 (16개 guide 라우트 포함)

### 공통 패키지
- `packages/shared-space-ui/src/StandardHomeTemplate.tsx`
- `packages/shared-space-ui/src/HeroBannerSection.tsx`
- `packages/shared-space-ui/src/NewsNoticesSection.tsx`
- `packages/shared-space-ui/src/AppEntrySection.tsx`
- `packages/shared-space-ui/src/CtaGuidanceSection.tsx`
- `packages/shared-space-ui/src/O4OHelpSection.tsx`

---

## 3. KPA-Society Home 구조 요약

**파일:** `CommunityHomePage.tsx`
**템플릿:** `StandardHomeTemplate` (`@o4o/shared-space-ui`)

### 섹션 순서 (상→하)

| 순서 | 섹션 | 컴포넌트 | 데이터 소스 |
|------|------|---------|------------|
| 1 | Hero | `HeroBannerSection` | `/home/hero-ads` + 정적 fallback |
| 2 | 공지 + 외부뉴스 | `NewsNoticesSection` | `/home/notices` (limit 5) + 약사공론 placeholder |
| 3 | 최신 활동 | `LatestActivitySection` (커스텀) | `/home/latest?type=&limit=6` |
| 4 | 역할별 시작 | `AppEntrySection` | 정적 (3 cards: 매장경영자 / 운영자 / 커뮤니티 참여자) |
| 5 | 서비스 바로가기 | `AppEntrySection` | 정적 (5 cards: 포럼 / 강의 / 콘텐츠 / 사이니지 / 자료실) |
| 6 | Market Trial CTA | `CtaGuidanceSection` | 정적 (Neture 외부 링크) |
| 7 | 이용 안내 + 다른 서비스 | `O4OHelpSection` | 정적 (guide routes + 외부 서비스 링크) |

### 핵심 API
- `GET /home/notices?limit=5` — 공지 5개
- `GET /home/hero-ads` — Hero 광고
- `GET /home/latest?type={tab}&limit=6` — 최신 활동 탭별

### 인증 처리
- Home 공개 접근 가능
- 카드 클릭 시 비로그인 → 로그인 모달 인터셉트
- 로그인 후 원래 href로 이동

---

## 4. Neture 현재 Home 구조 요약

### 현재 라우트 상태

| 상태 | 컴포넌트 | 파일 |
|------|---------|------|
| **현재 `/` 라우트** | `CommunityPage` | `src/pages/CommunityPage.tsx` |
| **구 Home (보존)** | `NetureHomePage` | `src/pages/NetureHomePage.tsx` |

### CommunityPage 섹션 (현재 Home)

| 순서 | 섹션 | 데이터 소스 |
|------|------|------------|
| 1 | Hero (정적 그라디언트) | 정적 |
| 2 | 공지 | CMS API (`type=notice`, max 5) |
| 3 | Hub 콘텐츠 | Hub API (`sourceDomain=cms`, limit 50) |
| 4 | Knowledge/자료 | CMS API (`type=knowledge`, max 5) |
| 5 | 포럼 Articles | Forum API (`category=article`, max 5) |
| 6 | 최근 포럼 글 | Forum API (limit 10) |
| 7 | 인기 포럼 카테고리 | Forum API (집계) |
| 8 | 커뮤니티 통계 | Forum API (집계) |
| 9 | 디지털 사이니지 홍보 | 정적 |

**문제점:** 포럼/커뮤니티 중심 — 공급자·Market Trial·파트너 진입점 없음. 사업 정체성과 불일치.

### NetureHomePage 섹션 (구 Home, 미사용)

| 순서 | 섹션 | 컴포넌트 | 데이터 소스 |
|------|------|---------|------------|
| 1 | Hero Slider | `HeroSlider` | `/neture/home/hero` + 정적 fallback |
| 2 | 플랫폼 구조 소개 | `PlatformIntroSection` | 정적 |
| 3 | 광고 | `HomepageAds` | `/neture/home/ads` |
| 4 | Market Trial | `MarketTrialSection` | `/api/market-trial?status=recruiting` |
| 5 | 최신 활동 | `LatestUpdatesSection` | `/neture/suppliers` + `/neture/partnership/requests?status=OPEN` |
| 6 | 커뮤니티 미리보기 | `CommunityPreviewSection` | Forum API (latest 5) + 정적 Knowledge |
| 7 | Featured | `FeaturedSection` | `/neture/suppliers` (max 3) + 정적 파트너 |
| 8 | 파트너 로고 | `PartnerLogoCarousel` | `/neture/home/logos` |
| 9 | CTA | `HomeCtaSection` | 정적 (공급자/파트너 진입) |

**문제점:** 미사용 상태지만 핵심 섹션 API·컴포넌트 다수 구현됨. 재활용 가능.

### Neture 라우트 구조 (App.tsx)

| 영역 | 경로 | 상태 |
|------|------|------|
| Home | `/` | CommunityPage (포럼 중심) |
| 공급자 | `/supplier` | `SupplierLandingPage` |
| 파트너 | `/partner` | `PartnerLandingPage` |
| Market Trial | `/market-trial`, `/market-trial/:id` | 구현됨 (lazy) |
| 가이드 | `/guide` ~ `/guide/features/copilot-dashboard` | 16개 라우트 구현됨 |
| 포럼 | `/forum`, `/forum/posts`, `/forum/post/:slug` | 구현됨 |
| 공지 | `/notices`, `/notices/:id` | 구현됨 |
| 콘텐츠 | `/content`, `/resources` | 구현됨 |
| 마이페이지 | `/mypage`, `/mypage/*` | 구현됨 |

**dead link:** `StaticHero` fallback에 `/suppliers`, `/partners/requests` 링크 존재 → 404 (수정 필요)

---

## 5. KPA → Neture 이식 가능 항목

### 즉시 이식 가능 (props 변경만)

| KPA 구성 요소 | Neture 적용 방식 | 비고 |
|-------------|----------------|------|
| `StandardHomeTemplate` | Neture Home 래퍼로 사용 | 미적용 → 적용 |
| `HeroBannerSection` | Hero 섹션 → 정적 fallback 교체 | `/neture/home/hero` API 존재 |
| `NewsNoticesSection` (Left) | 공지 섹션 | `/notices` 라우트 + `/home/notices` API 존재 |
| `AppEntrySection` | 서비스 바로가기 카드 | props만 변경 |
| `CtaGuidanceSection` | 공급자/Market Trial CTA | props 변경 |
| `O4OHelpSection` | 이용 안내 + 다른 서비스 | `/guide/*` 라우트 16개 존재 |

### 구조 이식 + Neture 데이터 연결 필요

| KPA 섹션 | Neture 대응 | 데이터 연결 |
|---------|-----------|------------|
| 최신 활동 탭 (포럼 only) | 포럼 최신글 섹션 | `/forum/posts` API 존재 |
| 공지 섹션 | 공지용 포럼 글 노출 | `/notices` 또는 Forum API |
| Market Trial CTA (KPA는 외부 링크) | 내부 Market Trial 섹션 | `/api/market-trial?status=recruiting` |

### Neture 도메인 특화 (KPA에 없음 → 신규 구성)

| 섹션 | 설명 | 구현 상태 |
|------|------|---------|
| 공급자 참여 진입 | `/supplier` 랜딩 진입 CTA | 컴포넌트 있음 (NetureHomePage 내) |
| Market Trial 섹션 | 진행 중인 Market Trial 카드 | 컴포넌트 있음 (MarketTrialSection) |
| 파트너 협력 안내 | `/partner` 랜딩 진입 | `HomeCtaSection` 내 존재 |

---

## 6. Neture에서 제외/변형해야 할 KPA 항목

| KPA 항목 | 처리 방식 | 이유 |
|---------|---------|------|
| 약사공론 뉴스 섹션 (우측 컬럼) | **제거** | Neture에 협력 언론사 없음 |
| 역할별 시작 카드 (약사/약대생/경영자) | **변형** — 공급자/파트너/일반 참여자 | 역할 용어 교체 |
| 강의(LMS) 탭 | **제거** | Neture에 LMS 없음 |
| 강의 바로가기 카드 | **제거** | Neture에 LMS 없음 |
| 사이니지 탭/카드 | **현재 제외** | 공개 기능 여부 확인 필요 |
| 자료실 탭 (KPA 공통) | **검토** | Neture `/resources` 존재 — 포함 가능 |
| O4OHelpSection "다른 서비스" | **변형** — Neture 제외, 나머지 서비스 | 자기 서비스 제외 로직 적용 |

---

## 7. 권장 Neture Home 섹션 순서

KPA 기준을 따르되 Neture 사업 특성을 반영한 권장 구성:

| 순서 | 섹션 | 설명 |
|------|------|------|
| 1 | **Hero** | 브랜드 + 핵심 가치 메시지 + 공급자/Market Trial CTA |
| 2 | **공지** | 공지용 포럼 최근 글 3~5개 |
| 3 | **포럼 최신글** | 최근 포럼 활동 5~6개 (탭: 전체 / 포럼) |
| 4 | **공급자 참여** | 공급자 진입 CTA + 역할 안내 |
| 5 | **Market Trial** | 진행 중인 Market Trial 카드 (최대 3개) |
| 6 | **파트너 협력** | "단계적 활성화" 안내 + `/partner` 링크 |
| 7 | **이용 안내** | `/guide/*` 진입 + 역할별 가이드 카드 |

---

## 8. 각 섹션별 현재 구현 여부 및 필요 작업

### 섹션 1: Hero

| 항목 | 상태 |
|------|------|
| 컴포넌트 | `HeroSlider` (src/components/home) — **구현됨** (구 Home에서 미사용) |
| 공통 컴포넌트 | `HeroBannerSection` (`@o4o/shared-space-ui`) — KPA와 동일 |
| API | `GET /neture/home/hero` — **존재** |
| 정적 fallback | `StaticHero` — **존재** (dead link 수정 필요) |
| 필요 작업 | StaticHero의 dead link 수정 (`/suppliers` → `/supplier`) |

### 섹션 2: 공지

| 항목 | 상태 |
|------|------|
| 라우트 | `/notices`, `/notices/:id` — **존재** |
| API | CMS `type=notice` 또는 공지용 포럼 API — 검토 필요 |
| 공통 컴포넌트 | `NewsNoticesSection` (`@o4o/shared-space-ui`) — 이식 가능 |
| 우측 컬럼 | KPA: 약사공론 → Neture: **제거 또는 Market Trial CTA** |
| 필요 작업 | 공지 API 경로 확인 + 공통 컴포넌트 props 설정 |

### 섹션 3: 포럼 최신글

| 항목 | 상태 |
|------|------|
| 라우트 | `/forum`, `/forum/post/:slug` — **존재** |
| API | `GET /forum/posts?limit=6` — **존재** |
| 컴포넌트 | `CommunityPreviewSection` — **존재** (NetureHomePage 내) |
| 필요 작업 | 탭 구조를 KPA `LatestActivitySection` 패턴으로 정비 |

### 섹션 4: 공급자 참여

| 항목 | 상태 |
|------|------|
| 라우트 | `/supplier` — **존재** |
| 컴포넌트 | `HomeCtaSection` — **존재** (NetureHomePage 내) |
| 공통 컴포넌트 | `AppEntrySection` or `CtaGuidanceSection` — 재사용 가능 |
| 인증 분기 | SupplierLandingPage에 구현됨 (비로그인 / pending / active 분기) |
| 필요 작업 | Home에서 공급자 CTA 섹션으로 재구성 |

### 섹션 5: Market Trial

| 항목 | 상태 |
|------|------|
| 라우트 | `/market-trial` — **존재** |
| API | `GET /api/market-trial?status=recruiting` — **존재** |
| 컴포넌트 | `MarketTrialSection` — **존재** (NetureHomePage 내) |
| 필요 작업 | Home에 복원 + 빈 상태 처리 확인 |

### 섹션 6: 파트너 협력

| 항목 | 상태 |
|------|------|
| 라우트 | `/partner` — **존재** |
| 컴포넌트 | `HomeCtaSection` 내 파트너 블록 — **존재** |
| 기능 완성도 | 미완성 (단계적 활성화 예정) |
| 필요 작업 | 문구: "플랫폼 성장 이후 단계적 활성화" 안내로 교체 |

### 섹션 7: 이용 안내

| 항목 | 상태 |
|------|------|
| 라우트 | `/guide`, `/guide/intro`, `/guide/features/*` — **16개 존재** |
| 공통 컴포넌트 | `O4OHelpSection` (`@o4o/shared-space-ui`) — 재사용 가능 |
| 역할별 가이드 카드 | `/guide/for/supplier`, `/guide/for/operator`, `/guide/for/partner` 필요 |
| 필요 작업 | `/guide/for/*` 라우트 신설 또는 기존 `/guide/features/*` 연결 |

---

## 9. 공지용 포럼 구현 가능성

### 현황

- Neture에 `/notices`, `/notices/:id` 라우트 존재 (`CommunityAnnouncementsPage`)
- CMS `type=notice` API로 공지 데이터 조회 중 (`CommunityPage` 내)
- 별도 공지 CMS 테이블 또는 포럼 카테고리 방식 중 하나

### 권장 방향

KPA Home의 `NewsNoticesSection`은 `GET /home/notices` 전용 API 사용.
Neture는 기존 CMS `type=notice` 또는 공지 전용 포럼 카테고리를 사용:

```
Option A: CMS type=notice API 그대로 사용 → 즉시 가능
Option B: 공지 전용 포럼 카테고리 생성 → 운영자가 포럼에서 관리
```

**권장: Option A** — 이미 구현된 CMS 공지 API 사용, Home에 `NewsNoticesSection` props 연결.
공지용 포럼 카테고리는 별도 운영 정책 결정 후 Option B로 전환 가능.

---

## 10. 포럼 최신글 Home 노출 가능성

**가능 — API 존재, 컴포넌트 존재**

- `GET /forum/posts?limit=5` → `CommunityPreviewSection`에서 사용 중
- KPA `homeApi.getLatest({type:'forum', limit:6})` 방식으로 통일 가능
- `LatestActivitySection` 탭 구조에서 Neture는 LMS/사이니지 탭 제거 → 포럼만 또는 포럼+자료실

---

## 11. 공급자 섹션 구성안

```
[공급자 참여]
비로그인:   "공급자로 참여하기" → /supplier (신청 진입)
pending:   "승인 대기 중입니다" (안내)
active:    "공급자 대시보드" → /supplier/dashboard
operator:  (admin 링크 노출 불필요, operator sidebar에서 접근)
```

- `useAuth()` + membership status 체크 필요
- `SupplierLandingPage`의 조건 분기 로직 참조

---

## 12. Market Trial 섹션 구성안

```
[Market Trial]
- 진행 중인 Trial 카드 최대 3개 (API: /api/market-trial?status=recruiting)
- 빈 상태: "현재 진행 중인 Market Trial이 없습니다" + /market-trial 전체 링크
- 전체 보기 → /market-trial
- 공급자용 CTA → /market-trial/new (공급자 역할 시에만 노출)
```

---

## 13. 파트너 협력 섹션 구성안

```
[파트너 협력]
- 제목: "파트너 협력"
- 설명: "O4O 플랫폼이 일정 수준의 공급자·매장·시장 반응 데이터를 확보한 뒤 단계적으로 활성화되는 협력 영역입니다."
- CTA: "파트너 협력 알아보기" → /partner
- 파트너 권한자: "파트너 대시보드" → /partner/dashboard
```

현재 과도한 강조 없이, 플랫폼 성장 이후 단계임을 명확히 안내.

---

## 14. 이용 안내/매뉴얼 진입 구성안

```
[이용 안내]
Block 1: "Neture 이용 가이드"
  - O4O 개요 → /guide/intro
  - 공급자 시작 → /guide/features/supplier-onboarding
  - Market Trial → /guide/features/market-trial

Block 2: "다른 서비스 보기"
  - GlycoPharm, K-Cosmetics, KPA-Society (외부 링크)
```

`O4OHelpSection` (`@o4o/shared-space-ui`) 재사용 — `currentServiceKey='neture'` 자동 필터.

---

## 15. UI/UX 스타일 차이 및 이식 기준

| 항목 | KPA-Society | Neture | 이식 방향 |
|------|------------|--------|---------|
| 템플릿 | `StandardHomeTemplate` | 자체 구성 | Neture도 `StandardHomeTemplate` 적용 |
| Hero | 카루셀 (`HeroBannerSection`) | 정적 그라디언트 (CommunityPage) / 카루셀 (NetureHomePage) | 카루셀 + 정적 fallback |
| 섹션 width | 공통 (`PageSection`, `PageContainer`) | 혼합 | 공통 컴포넌트 통일 |
| 카드 스타일 | white bg, border, rounded 12px, hover shadow | 유사 패턴 (NetureHomePage) | 통일 가능 |
| 색상 토큰 | `--color-primary` (KPA blue) | Neture 브랜드 색상 (`teal`/`emerald` 계열) | Neture 색상 유지 |
| 배지/칩 | type별 색상 배지 | 유사 패턴 | 이식 가능 |
| 모바일 | 1col → 2col → 3col 반응형 | 유사 패턴 | 이식 가능 |
| 로그인 게이트 | 카드 클릭 → 로그인 모달 | 일부 구현 | KPA 패턴 적용 |
| 비로그인 문구 | "강의 바로가기" 같은 탭 label | 유사 패턴 | Neture 용어로 교체 |

**Neture 브랜드 유지 항목:**
- 색상: primary는 Neture 테마 색상(`teal`/`emerald` 계열)
- Hero 문구: 공급자·Market Trial·협업 중심 메시지
- 섹션 레이블: 약사/약국 용어 제거

---

## 16. 수정 필요 파일 목록

### Frontend (필수 수정)

| 파일 | 수정 내용 |
|------|---------|
| `services/web-neture/src/pages/CommunityPage.tsx` | Home 재구성 (또는 새 파일로 교체) |
| `services/web-neture/src/App.tsx` | `/` 라우트를 새 Home 컴포넌트로 전환 |
| `services/web-neture/src/components/home/StaticHero.tsx` | dead link 수정 (`/suppliers` → `/supplier`) |

### Frontend (재활용 — 구 Home에서 복원)

| 파일 | 용도 |
|------|------|
| `src/components/home/HeroSlider.tsx` | Hero 섹션 |
| `src/components/home/MarketTrialSection.tsx` | Market Trial 섹션 |
| `src/components/home/CommunityPreviewSection.tsx` | 포럼 미리보기 |
| `src/components/home/HomeCtaSection.tsx` | 공급자/파트너 CTA |

### 공통 패키지 (props만 변경)

| 패키지 컴포넌트 | Neture 적용 props |
|--------------|----------------|
| `StandardHomeTemplate` | Neture용 섹션 구성 |
| `HeroBannerSection` | fallbackContent: Neture 문구 |
| `NewsNoticesSection` | noticesHref: '/notices', viewAllHref: '/notices' |
| `AppEntrySection` | cards: 공급자/Market Trial/포럼/자료실 |
| `CtaGuidanceSection` | Market Trial 내부 링크 (`/market-trial`) |
| `O4OHelpSection` | usageItems: Neture guide links, currentServiceKey: 'neture' |

---

## 17. Backend 수정 필요 여부

**불필요** — 기존 API 전부 활용 가능:

| 필요 API | 엔드포인트 | 상태 |
|---------|-----------|------|
| 공지 | CMS `type=notice` 또는 `/home/notices` | **존재** |
| Hero | `GET /neture/home/hero` | **존재** |
| 포럼 최신글 | `GET /forum/posts?limit=6` | **존재** |
| Market Trial | `GET /api/market-trial?status=recruiting` | **존재** |
| 공급자 목록 | `GET /neture/suppliers` | **존재** |

단, 공지용 포럼 카테고리 방식(Option B) 선택 시 포럼 카테고리 생성 필요 (운영 작업, DB 마이그레이션 아님).

---

## 18. 권장 후속 WO 제안

### WO-O4O-NETURE-HOME-KPA-UI-STRUCTURE-ALIGNMENT-V1 (즉시 가능)

**목적:** Neture Home을 KPA-Society 기준 구조로 재편

**범위:**
1. `CommunityPage.tsx` → 7섹션 구조로 재구성
2. `StandardHomeTemplate` 적용 (미적용 → 적용)
3. `HeroBannerSection`, `NewsNoticesSection`, `AppEntrySection`, `CtaGuidanceSection`, `O4OHelpSection` props 연결
4. `MarketTrialSection`, `CommunityPreviewSection` 구 Home에서 복원
5. `StaticHero` dead link 수정
6. 파트너 섹션 문구: "단계적 활성화" 안내
7. 공급자 인증 분기 CTA

**Backend 수정:** 없음
**예상 공수:** 중 (3~5일)
**위험도:** 낮음

---

## 19. Current Structure vs O4O Philosophy Conflict Check

| 항목 | 현재 상태 | O4O 철학 정합 |
|------|---------|-------------|
| Home = CommunityPage (포럼 중심) | ❌ | 공급자·Market Trial 진입 없음 → 사업 정체성 미반영 |
| 공급자 직접 콘텐츠 제작 오해 가능성 | ⚠️ | "공급자 → 운영자 → 매장" 3자 흐름 안내 부족 |
| 파트너 섹션 미완성 기능 과장 없음 | ✅ | 단계적 활성화 안내 방향과 일치 |
| Market Trial 내부 진입 없음 | ❌ | Market Trial이 Neture 핵심 기능인데 Home 미노출 |
| 이용 안내 `/guide/*` 16개 라우트 존재 | ✅ | 매뉴얼 구조 준비됨 |
| Hero 메시지 공급자·협업 중심 아님 | ❌ | 현재 정적 그라디언트, 가치 메시지 없음 |

**결론:** 현재 `CommunityPage` 기반 Home은 O4O 사업 철학과 불일치.
KPA 구조를 기준으로 Neture 도메인 특성(공급자·Market Trial·파트너)을 반영한 재편 필요.

---

**작성일:** 2026-05-29
**조사 범위:** `services/web-kpa-society`, `services/web-neture`, `packages/shared-space-ui`
**상태:** ✅ 완료
**다음 단계:** `WO-O4O-NETURE-HOME-KPA-UI-STRUCTURE-ALIGNMENT-V1` 착수 가능
