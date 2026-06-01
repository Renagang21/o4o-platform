# IR-O4O-STORE-HOME-DASHBOARD-CONSOLIDATION-V1

**작성일:** 2026-05-11  
**조사 대상:** `/store` (StoreHomePage) 및 `/store-hub` (StoreHubPage) 의 역할 경계, KPI 구성, data source, 링크 정합성 감사  
**목적:** 현재 홈/허브 구조의 consolidation 여지와 구체적 정비 포인트 도출  
**범위:** StoreHomePage (운영 홈), StoreHubPage (탐색 허브), storeMenuConfig, storeAnalytics/storeHub API, App.tsx 라우트

---

## 1. 현재 홈/허브 구조 (AS-IS)

### 두 개의 홈 개념

| 경로 | 컴포넌트 | 역할 | WO |
|------|----------|------|-----|
| `/store` (index) | `StoreHomePage` | 운영 홈 — KPI, 실행 흐름, 성과 요약 | WO-KPA-A-STORE-HOME-AND-SIDEBAR-RESTRUCTURE-V1 |
| `/store-hub` | `StoreHubPage` | 탐색/복사 허브 — 상품·콘텐츠·사이니지 탐색 | WO-O4O-STORE-HUB-TEMPLATE-FOUNDATION-V1 |

**경계 판단: 현재 두 페이지의 역할 구분은 명확하다.**
- StoreHubPage = 플랫폼 자원 탐색·복사 (커뮤니티 → 내 매장 방향)
- StoreHomePage = 내 매장 운영 대시보드 (실행 현황 확인 + 도구 진입)

이 분리는 O4O 아키텍처 의도(HUB=공급계층, Store=실행계층)와 일치한다.  
**병합 불필요. 각자 역할 유지.**

---

## 2. StoreHomePage 현재 구조

### 2-A. KPI 섹션 (4개 카드)

| 카드 | 값 소스 | API | 실제 의미 |
|------|---------|-----|----------|
| 매장 자산 관리 | `libraryCount` | `getStoreExecutionAssets({ limit: 1 }).data.total` | `store_execution_assets` 총 수 |
| 활성 QR | `analytics.activeQrCount` | `getMarketingAnalytics()` | `store_qr_codes` where is_active |
| 진열 상품 | `productCount` | `getListings()` filter(is_active) | OPL active 수 |
| 이번주 스캔 | `analytics.weeklyScans` | `getMarketingAnalytics()` | QR 스캔 이벤트 7일 합계 |

### 2-B. 실행 흐름 (3-step)

| Step | 레이블 | 링크 | 실제 도착 페이지 |
|------|--------|------|----------------|
| 1. 상품 선택 | 상품 관리 | `/store/commerce/products` | PharmacyB2BPage (공급자 상품) |
| 2. 콘텐츠 만들기 | 매장 자산 관리 | `/store/content` | **StoreAssetsPage (채널 운영 뷰)** |
| 2. 콘텐츠 만들기 | QR 코드 | `/store/marketing/qr` | StoreQRPage ✅ |
| 2. 콘텐츠 만들기 | POP | `/store/marketing/pop` | StorePopPage ✅ |
| 2. 콘텐츠 만들기 | 블로그 | `/store/content/blog` | PharmacyBlogPage ✅ |
| 3. 매장에 적용 | 사이니지 | `/store/marketing/signage/playlist` | StoreSignagePage ✅ |
| 3. 매장에 적용 | 채널 관리 | `/store/channels` | StoreChannelsPage ✅ |

### 2-C. 하단 2열

| 섹션 | 데이터 소스 | 역할 |
|------|------------|------|
| 홍보 성과 요약 | `analytics.topQrCodes` (상위 3개) | QR 스캔 성과 요약 |
| 최근 활동 | `getRecentScans()` | 스캔 이벤트 타임라인 (최근 6개) |

---

## 3. 데이터 소스 현황 — 활용 vs 미활용

### 3-A. StoreHomePage가 사용하는 API

```
storeAnalytics.ts:
  getMarketingAnalytics() → /pharmacy/analytics/marketing
  getRecentScans()        → /pharmacy/analytics/recent-scans

storeExecutionAssets.ts:
  getStoreExecutionAssets({ limit: 1 }) → /store-execution-assets  (count only)

pharmacyProducts.ts:
  getListings() → /pharmacy/products/listings (active filter)
```

### 3-B. storeHub.ts — StoreHomePage 미사용 API

```
fetchStoreKpiSummary()  → /store-hub/kpi-summary
  반환: todayOrders, weekOrders, monthOrders,
        monthRevenue, avgOrderValue, lastMonthRevenue

fetchLiveSignals()      → /store-hub/live-signals
  반환: newOrders, pendingTabletRequests,
        pendingSalesRequests, surveyRequests

fetchChannelOverview()  → /store-hub/channels
  반환: ChannelOverview[] (B2C/KIOSK/TABLET/SIGNAGE status)

fetchStoreHubOverview() → /store-hub/overview
  반환: products/contents/signage counts
```

**판단:**
- `fetchStoreKpiSummary()`: 주문 KPI — KPA 매장의 실제 B2C 주문 발생 여부에 따라 유용성 결정. 현재 KPA는 B2B 중심 → 즉각 도입 필요도 낮음
- `fetchLiveSignals()`: 실시간 신호 (미처리 주문/상담 요청) — **운영 홈에 적합, 즉시 도입 가치 있음**
- `fetchChannelOverview()`: 채널 상태 — "채널 관리" 링크로 대체 가능, 요약 카드로 활용 여지 있음
- `fetchStoreHubOverview()`: StoreHubPage 전용 탐색 개요 — StoreHomePage에 불필요

---

## 4. 문제 및 GAP 분석

### GAP-1: Step 2 "매장 자산 관리" 링크 오류 (Critical)

**현상:**
```
StoreHomePage:171
<Link to="/store/content">매장 자산 관리</Link>
```
- `/store/content` → `StoreAssetsPage` (채널 운영 뷰: KPI 4칸 + hq_forced 관리)
- StoreAssetsPage는 **채널 운영/강제 노출 관리** 전용 화면
- 사용자가 "콘텐츠 만들기" 흐름에서 클릭 → 엉뚱한 화면 도착

**기대 경로 (제작 흐름 의도):**  
"콘텐츠 만들기" Step에서 연결되어야 할 곳 = 내 자료함  
- `/store/library/contents` (콘텐츠 라이브러리)  
- `/store/library/resources` (자료 라이브러리)  
- `/store/library/production-materials` (매장 제작 자료)

**수정 방향:**  
레이블 "매장 자산 관리" → "내 자료함", 링크 `/store/library/contents` 로 변경

---

### GAP-2: KPI 카드 1번 레이블/링크 불일치 (Medium)

**현상:**
```
StoreHomePage:121-125
<BookOpen /> → libraryCount (store_execution_assets 수)
레이블: "매장 자산 관리"
```
- 숫자는 `store_execution_assets` 총 수 (직접 업로드 파일)
- 레이블은 "매장 자산 관리" — 클릭 시 어디로 가는지 UI에 없음 (클릭 불가 카드)
- "자산 관리"는 channel management (StoreAssetsPage)와 혼동 유발

**수정 방향:**  
레이블 "매장 자산 관리" → "자료실 파일" 또는 "내 자료 수" (내용 설명)  
또는 KPI 카드를 클릭 가능으로 만들어 `/store/library/contents` 링크 추가

---

### GAP-3: Live Signals 미활용 (Medium)

**현상:**  
`fetchLiveSignals()` API 존재 (storeHub.ts:143), StoreHomePage에서 미사용.

```typescript
interface LiveSignals {
  newOrders: number;              // 미처리 신규 주문
  pendingTabletRequests: number;  // 처리 대기 상담 요청
  pendingSalesRequests: number;   // 미처리 판매 요청
  surveyRequests: number;         // 설문 요청
}
```

- `pendingTabletRequests` = 태블릿 상담 요청 대기 수 — 즉각 처리가 필요한 운영 신호
- 현재 "최근 활동" 섹션이 QR 스캔 이력만 표시 — 실제 업무 처리 신호 부재

**수정 방향:**  
홈 상단에 Live Signals 배너 또는 KPI 카드 추가  
`pendingTabletRequests > 0` 시 "상담 요청 N건 대기" → `/store/requests` 링크

---

### GAP-4: StoreHubPage → StoreHomePage 이동 CTA 표현 불일치 (Low)

**현상:**
```
StoreHubPage:34
storeCta: { label: '내 매장 관리 →', href: '/store' }

StoreHubPage:82-88
storeCtaBlock: { title: '내 매장으로 이동', buttonLabel: '내 매장 관리 →', href: '/store' }
```
- "내 매장"이 실제 `/store` (StoreHomePage)를 가리킴 — 정확
- 용어 사용은 일관됨

**판단:** 문제 없음.

---

### GAP-5: 실행 흐름 Step 1 단일 링크 (Low)

**현상:**
```
Step 1 "상품 선택" → "상품 관리" (/store/commerce/products) 1개 링크만 있음
```
- `/store/my-products` (내 매장 상품 관리) 링크 없음
- 실제 매장 운영자는 "내 매장 상품" 관리가 더 자주 필요

**수정 방향:**  
"내 매장 상품" 링크 추가 고려 (단, 리팩토링 규모 감안)

---

### GAP-6: 분석 메뉴 단일 항목 (Info)

**현상:**  
`storeMenuConfig.ts` 분석 섹션:
```
{ label: '분석', items: [
  { key: 'analytics-marketing', label: '마케팅 분석', subPath: '/analytics/marketing' },
]}
```
- 현재 마케팅(QR 스캔) 분석만 존재
- StoreHomePage의 "홍보 성과 요약" 상세 분석 링크 → `/store/analytics/marketing` ✅ 정상 연결

**판단:** 현재 상태 적절. 향후 주문 분석 등 추가 시 자연스럽게 확장.

---

## 5. 라우트 정합성

### 사이드바 메뉴 ↔ 라우트 대조

| 메뉴 항목 | subPath | App.tsx 라우트 | 상태 |
|----------|---------|---------------|------|
| 홈 | `/store` (index) | Route index | ✅ |
| 공급자 상품 | `/commerce/products` | `commerce/products` | ✅ |
| 내 매장 상품 | `/my-products` | `my-products` | ✅ |
| 주문 내역 | `/commerce/orders` | `commerce/orders` | ✅ |
| 콘텐츠 | `/library/contents` | `library/contents` | ✅ |
| 자료 | `/library/resources` | `library/resources` | ✅ |
| 매장 제작 자료 | `/library/production-materials` | `library/production-materials` | ✅ |
| 플레이리스트 | `/marketing/signage/playlist` | `marketing/signage/playlist` | ✅ |
| 채널 관리 | `/channels` | `channels` | ✅ (코드 주석 "Hidden"은 outdated) |
| 태블릿 | `/commerce/tablet-displays` | `commerce/tablet-displays` | ✅ |
| POP | `/marketing/pop` | `marketing/pop` | ✅ |
| QR 코드 | `/marketing/qr` | `marketing/qr` | ✅ |
| 블로그 | `/content/blog` | `content/blog` | ✅ |
| 상품 상세설명 | `/marketing/product-descriptions` | `marketing/product-descriptions` | ✅ |
| 상담 요청 | `/requests` | `requests` | ✅ |
| 마케팅 분석 | `/analytics/marketing` | `analytics/marketing` | ✅ |
| 약국 정보 | `/info` | `info` | ✅ |
| 매장 설정 | `/settings` | `settings` | ✅ |

**전체 라우트 정합성 양호. 미연결 항목 없음.**

### 레거시 리다이렉트 정합성

| 레거시 경로 | 현재 리다이렉트 | 상태 |
|-----------|--------------|------|
| `/store/dashboard` | `/store` | ✅ |
| `/store/qr` | `/store/marketing/qr` | ✅ |
| `/store/pop` | `/store/marketing/pop` | ✅ |
| `/store/signage` | `/store/marketing/signage/playlist` | ✅ |
| `/store/analytics` | `/store/analytics/marketing` | ✅ |
| `/pharmacy/*` | `/store/*` | ✅ |

---

## 6. 정비 포인트 요약

| # | 항목 | 위치 | 분류 | 우선순위 |
|---|------|------|------|---------|
| P1 | Step 2 링크 오류: `/store/content` → StoreAssetsPage | `StoreHomePage.tsx:171` | **버그** | High |
| P2 | KPI 카드 1번 레이블 "매장 자산 관리" 혼동 | `StoreHomePage.tsx:124` | 레이블 정비 | Medium |
| P3 | Live Signals 미활용 (`pendingTabletRequests` 등) | `storeHub.ts` 미사용 | 기능 추가 | Medium |
| P4 | Step 1 "내 매장 상품" 링크 누락 | `StoreHomePage.tsx:154-159` | UX 보완 | Low |
| P5 | App.tsx `channels` 라우트 주석 "Hidden" 아웃데이트 | `App.tsx:889` 주석 | 주석 정비 | Low |

---

## 7. 도출된 WO 후보

### WO-1: StoreHomePage Step 2 링크 오류 수정 (즉각 수정)

```
WO-O4O-KPA-STORE-HOME-CONTENT-LINK-FIX-V1
```

**변경 내용:**
```tsx
// BEFORE (App.tsx line 171)
<Link to="/store/content">매장 자산 관리</Link>

// AFTER
<Link to="/store/library/contents">내 자료함</Link>
```

**파일:** `services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx:171`  
**Risk:** Low (1 Link 변경, 부작용 없음)  
**Priority:** High (사용자 혼란 즉각 발생)

---

### WO-2: StoreHomePage KPI 카드 레이블 정비

```
WO-O4O-KPA-STORE-HOME-KPI-LABEL-FIX-V1
```

**변경 내용:**
- "매장 자산 관리" → "자료실 파일" (또는 "내 자료 수")
- KPI 카드에 `/store/library/contents` 클릭 링크 추가 고려

**파일:** `services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx:121-125`  
**Risk:** Low  
**Priority:** Medium

---

### WO-3: Live Signals 운영 배너 추가

```
WO-O4O-KPA-STORE-HOME-LIVE-SIGNALS-V1
```

**변경 내용:**
- `fetchLiveSignals()` 호출 추가
- `pendingTabletRequests > 0` 시 상단 배너: "상담 요청 N건 대기 → /store/requests"
- `newOrders > 0` 시 주문 알림 (KPA에서 실제 발생 여부 확인 후 진행)

**파일:** `services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx`  
**Risk:** Medium (API 호출 추가)  
**Priority:** Medium (미처리 요청 가시성 개선)

---

## 8. 결론

**병합/재구조화 불필요:**  
StoreHubPage(탐색) ↔ StoreHomePage(운영) 분리는 O4O 아키텍처 의도와 일치. 라우트 구조 전체 정합성 양호.

**즉각 수정 필요:**  
GAP-1 (Step 2 링크 버그) — 1줄 수정, 사용자 혼란 즉각 방지 가능.

**단기 정비:**  
GAP-2 (KPI 레이블), GAP-3 (Live Signals) — 운영 홈 완성도 향상.

**장기 defer:**  
주문 KPI (`fetchStoreKpiSummary`), Step 1 링크 추가 — KPA의 실제 B2C 주문 발생 빈도 확인 후 판단.

---

*IR 종료: 2026-05-11*
