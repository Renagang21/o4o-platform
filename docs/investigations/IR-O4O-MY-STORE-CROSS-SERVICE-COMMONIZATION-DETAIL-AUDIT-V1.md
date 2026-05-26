# IR-O4O-MY-STORE-CROSS-SERVICE-COMMONIZATION-DETAIL-AUDIT-V1

> **조사 전용 — 코드 변경 없음**
>
> 목적: WO-O4O-STORE-HUB-CROSS-SERVICE-COMMONIZATION-PHASE1-V1 이후,
> KPA 기준 내 매장 구조를 GlycoPharm / K-Cosmetics에 어느 범위까지 공통화할 수 있는지 조사.
>
> 날짜: 2026-05-26

---

## 1. KPA 내 매장 현재 구조 요약

### 1-1. 라우트 트리 (`/store/*`)

| 경로 | 페이지 | 메뉴 표시 |
|------|--------|----------|
| `/store` (index) | `StoreHomePage` | ✅ 홈 |
| `/store/commerce/products` | `PharmacyB2BPage` | ✅ 공급자 상품 |
| `/store/my-products` | `StoreProductsManagerPage` | ✅ 내 매장 상품 |
| `/store/commerce/orders` | `StoreOrdersPage` | ✅ 주문 내역 |
| `/store/library/contents` | `StoreLibraryContentsPage` | ✅ 콘텐츠 (내 자료함) |
| `/store/library/resources` | `StoreLibraryResourcesPage` | ✅ 자료 (내 자료함) |
| `/store/library/production-materials` | `StoreProductionMaterialsPage` | ✅ 매장 제작 자료 (내 자료함) |
| `/store/marketing/signage/playlist` | `StoreSignagePage` | ✅ 플레이리스트 |
| `/store/marketing/signage/videos` | — | ✅ 동영상 |
| `/store/marketing/signage/schedules` | — | ✅ 스케줄 |
| `/store/marketing/signage/play/:id` | `SignagePlaybackPage` | — |
| `/store/channels` | `StoreChannelsPage` | ✅ 채널 관리 |
| `/store/commerce/tablet-displays` | `StoreTabletDisplaysPage` | ✅ 태블릿 |
| `/store/requests` | `TabletRequestsPage` | ✅ 상담 요청 |
| `/store/content/blog` | `PharmacyBlogPage` | ✅ 블로그 |
| `/store/marketing/pop` | `StorePopPage` | ✅ POP |
| `/store/marketing/qr` | `StoreQRPage` | ✅ QR 코드 |
| `/store/analytics/marketing` | `MarketingAnalyticsPage` | ✅ 마케팅 분석 |
| `/store/info` | `PharmacyInfoPage` | ✅ 약국 정보 |
| `/store/settings` | `PharmacyStorePage` | ✅ 매장 설정 |
| `/store/content` | `StoreAssetsPage` | 사이드바 미표시 |
| `/store/content/:id/edit` | `StoreContentEditPage` | — |

### 1-2. 메뉴 섹션 구조 (KPA_SOCIETY_STORE_CONFIG)

```
홈
상품 관리 → 공급자 상품 / 내 매장 상품 / 주문 내역
내 자료함 → 콘텐츠 / 자료 / 매장 제작 자료
디지털 사이니지 → 플레이리스트 / 동영상 / 스케줄 / TV 재생
채널 → 채널 관리 / 태블릿 / 상담 요청
매장 실행 → 블로그 / POP / QR-code
분석 → 마케팅 분석
설정 → 약국 정보 / 매장 설정
```

---

## 2. GlycoPharm 내 매장 현재 구조 요약

### 2-1. 라우트 트리 (`/store/*`)

| 경로 | 페이지 | 메뉴 표시 |
|------|--------|----------|
| `/store` (index) | `StoreOverviewPage` | ✅ 대시보드 |
| `/store/products` | `StoreProductsPage` | ✅ 상품 관리 |
| `/store/my-products` | `StoreProductsManagerPage` | ✅ 내 매장 상품 |
| `/store/local-products` | `StoreLocalProductsPage` | ✅ 자체 상품 |
| `/store/b2b-order` | `B2BOrderPage` | ✅ B2B 주문 |
| `/store/orders` | `PharmacyOrders` | ✅ 주문 내역 |
| `/store/tablet-displays` | `StoreTabletDisplaysPage` | ✅ 태블릿 |
| `/store/requests` | `CustomerRequestsPage` | ✅ 고객 요청 |
| `/store/signage/playlist` | `StoreSignageMainPage` | ✅ 플레이리스트 |
| `/store/signage/videos` | `StoreSignageMainPage` | ✅ 동영상 |
| `/store/signage/schedules` | `StoreSignageMainPage` | ✅ 스케줄 |
| `/store/signage/player` | `SignagePlayerSelectPage` | ✅ TV 재생 |
| `/store/market-trial` | — | ✅ 유통 참여형 펀딩 |
| `/store/funnel` | `FunnelPage` | ✅ 전환 퍼널 |
| `/store/content` | `StoreAssetsPage` | ✅ 콘텐츠 가져오기 |
| `/store/content/blog` | `PharmacyBlogPage` | ✅ 블로그 |
| `/store/channels` | `StoreChannelsPage` | ✅ 채널 관리 |
| `/store/management` | `PharmacyManagement` | ✅ 약국 경영 |
| `/store/billing` | `StoreBillingPage` | ✅ 정산/인보이스 |
| `/store/identity` | `StoreMainPage` | ✅ 설정 |

**❌ 누락 라우트:**
- `/store/pop` — `StorePopPage.tsx` 파일은 `pages/store-management/`에 존재하나 App.tsx 미연결
- `/store/qr` — 파일 자체 없음
- `/store/library/*` — 파일 없음, 라우트 없음

### 2-2. 메뉴 섹션 구조 (GLYCOPHARM_STORE_CONFIG)

```
대시보드
운영 → 상품 관리 / 내 매장 상품 / 자체 상품 / B2B 주문 / 주문 내역 / 태블릿 / 고객 요청
디지털 사이니지 → 플레이리스트 / 동영상 / 스케줄 / TV 재생
마케팅·콘텐츠 → 유통 참여형 펀딩 / 전환 퍼널 / 콘텐츠 가져오기 / 블로그 / 채널 관리
경영 → 약국 경영 / 정산/인보이스
설정 → 설정
```

**❌ 메뉴 미포함:** POP, QR

---

## 3. K-Cosmetics 내 매장 현재 구조 요약

### 3-1. 라우트 트리 (`/store/*`)

| 경로 | 페이지 | 메뉴 표시 |
|------|--------|----------|
| `/store` (index) | `StoreCockpitPage` | ✅ 홈 |
| `/store/my-products` | `StoreProductsManagerPage` | ✅ 내 매장 상품 |
| `/store/local-products` | `StoreLocalProductsPage` | ✅ 자체 상품 |
| `/store/channels` | `StoreChannelsPage` | ✅ 채널 관리 |
| `/store/tablet-displays` | `StoreTabletDisplaysPage` | ✅ 태블릿 |
| `/store/interest-requests` | `InterestRequestsPage` | — |
| `/store/signage` | `StoreSignagePage` | ✅ 사이니지 |
| `/store/orders` | `StorePlaceholderPage` | — |
| `/store/billing` | `StorePlaceholderPage` | — |
| `/store/content` | `StoreAssetsPage` | — (사이드바 미노출) |
| `/store/content/blog` | `StoreBlogManagePage` | ✅ 블로그 |
| `/store/pop` | `StorePopPage` | ✅ POP |
| `/store/qr` | `StoreQrPage` | ✅ QR 코드 |
| `/store/settings` | `StoreSettingsPage` | ✅ 매장 설정 |

**❌ 누락 라우트:**
- `/store/library/*` — 파일 없음, 라우트 없음

### 3-2. 메뉴 섹션 구조 (COSMETICS_STORE_CONFIG)

```
홈 / 채널 관리
상품 → 내 매장 상품 / 자체 상품
디지털 사이니지 → 사이니지
매장 실행 → 태블릿 / 블로그 / POP / QR 코드
설정 → 매장 설정
```

**✅ 매장 실행 항목은 이미 포함됨 (Blog/POP/QR)**

---

## 4. 서비스별 내 매장 메뉴 비교표

| 메뉴 항목 | KPA | GlycoPharm | K-Cosmetics |
|----------|:---:|:----------:|:-----------:|
| 대시보드/홈 | ✅ | ✅ | ✅ |
| 공급자 상품 | ✅ | ✅ | ❌ (HUB에만 있음) |
| 내 매장 상품 | ✅ | ✅ | ✅ |
| 자체 상품 | ✅ | ✅ | ✅ |
| 주문 내역 | ✅ | ✅ | ❌ (Placeholder) |
| 채널 관리 | ✅ | ✅ | ✅ |
| 태블릿 | ✅ | ✅ | ✅ |
| 상담/고객 요청 | ✅ | ✅ | ❌ (별도 `/interest-requests`) |
| 사이니지 | ✅ (4탭) | ✅ (4탭) | ✅ (단일 페이지) |
| **블로그** | ✅ | ✅ | ✅ |
| **POP** | ✅ | ⚠️ 파일 있음, 라우트 미연결 | ✅ |
| **QR 코드** | ✅ | ❌ 파일 없음 | ✅ |
| **내 자료함 > 콘텐츠** | ✅ | ❌ | ❌ |
| **내 자료함 > 자료** | ✅ | ❌ | ❌ |
| **내 자료함 > 매장 제작 자료** | ✅ | ❌ | ❌ |
| 마케팅 분석 | ✅ | ✅ | ❌ |
| 매장 설정 | ✅ | ✅ | ✅ |

---

## 5. 서비스별 내 자료함/콘텐츠/실행 자산 비교표

| 항목 | KPA | GlycoPharm | K-Cosmetics |
|------|:---:|:----------:|:-----------:|
| **내 자료함 콘텐츠** (HUB에서 가져온 콘텐츠 보관) | ✅ StoreLibraryContentsPage | ❌ | ❌ |
| **내 자료함 자료** (다운로드 자료 보관) | ✅ StoreLibraryResourcesPage | ❌ | ❌ |
| **매장 제작 자료** (생산 자료 관리) | ✅ StoreProductionMaterialsPage | ❌ | ❌ |
| **콘텐츠 가져오기** (StoreAssetsPanel) | ✅ /store/content | ✅ /store/content | ✅ /store/content |
| **블로그 관리** | ✅ PharmacyBlogPage | ✅ PharmacyBlogPage | ✅ StoreBlogManagePage |
| **POP 관리** | ✅ StorePopPage | ⚠️ 파일 있음, 라우트 미연결 | ✅ StorePopPage |
| **QR 관리** | ✅ StoreQRPage | ❌ | ✅ StoreQrPage |
| **사이니지 실행** | ✅ | ✅ | ✅ |

---

## 6. 공통화 가능 항목 (API 변경 없이 즉시 가능)

### 6-A. GlycoPharm POP 라우트 연결

- **상태**: `pages/store-management/StorePopPage.tsx` 파일 존재
- **백엔드**: `createStorePopController` 이미 등록됨 (`glycopharm.routes.ts` 라인 383)
- **작업**: App.tsx에 `/store/pop` 라우트 추가 + `GLYCOPHARM_STORE_CONFIG` 메뉴 항목 추가
- **난이도**: 낮음 (파일·API 모두 존재, 연결만 필요)

### 6-B. K-Cosmetics 내 자료함 추가

- **상태**: 페이지·라우트 없음
- **백엔드**: `createStoreLibraryController` 이미 등록됨 (`cosmetics.routes.ts` 라인 135)
- **작업**: `StoreLibraryContentsPage`, `StoreLibraryResourcesPage` 신규 작성 또는 KPA 패턴 적용 + App.tsx 라우트 + `COSMETICS_STORE_CONFIG` 메뉴 추가
- **난이도**: 중간 (KPA 패턴 참조 가능하나 페이지 신규 작성 필요)

### 6-C. GlycoPharm 내 자료함 추가

- **상태**: 페이지·라우트 없음
- **백엔드**: `createStoreLibraryController` 이미 등록됨 (`glycopharm.routes.ts` 라인 375)
- **작업**: C-B와 동일 (KPA 패턴 적용)
- **난이도**: 중간

---

## 7. API 추가 등록이 필요한 항목

### 7-A. GlycoPharm QR 관리

- **상태**: 프론트엔드 파일 없음, 백엔드는 `createStoreQrLandingController` 등록됨
- **주의**: `createStoreQrLandingController`는 QR 착지 페이지용 (공개 엔드포인트). 매장 staff용 QR 관리 API(생성/수정/삭제)는 별도 확인 필요
- **작업**: QR staff API 여부 확인 후 페이지 작성 결정

### 7-B. HUB → Store POP/QR 가져오기

- **상태**: `importOperatorPop`, `importOperatorQr` API 없음 (Phase 1 WO에서 확인됨)
- **등록 필요**: `/stores/:slug/pop/staff/import`, `/stores/:slug/qr/staff/import` 엔드포인트
- **우선순위**: 낮음 (Store HUB 탭은 이미 "준비 중" 배지로 처리됨)

---

## 8. 삭제/정리 후보

| 항목 | 서비스 | 근거 |
|------|--------|------|
| `StorePlaceholderPage` 사용처 | K-Cosmetics `/store/orders`, `/store/billing` | Phase 2 이후 실제 구현으로 대체 |
| GlycoPharm `StorePopPage` 중복 파일 | GlycoPharm `pages/store-management/` | 라우트 연결 후 정리 |
| pharmacy/store 용어 혼재 | GlycoPharm `pages/store-management/Pharmacy*.tsx` | Phase 3 용어 통일 WO 대상 |

---

## 9. Phase 2 실제 WO 권장 범위

### 우선순위 A — 즉시 가능 (API 없이, 파일 연결만)

```
GlycoPharm POP 라우트 연결
- App.tsx: /store/pop → StorePopPage 라우트 추가 (pages/store-management/StorePopPage.tsx)
- GLYCOPHARM_STORE_CONFIG: 마케팅·콘텐츠 섹션에 'pop' 메뉴 항목 추가
```

**예상 공수**: 30분 이내

### 우선순위 B — 표면 정렬 (KPA 패턴 이식)

```
GlycoPharm QR 페이지 신규 작성
- StoreQrPage.tsx 작성 (K-Cosmetics 패턴 참조)
- App.tsx: /store/qr 라우트 추가
- GLYCOPHARM_STORE_CONFIG: 'qr' 메뉴 항목 추가
```

**예상 공수**: 1~2시간 (K-Cosmetics StoreQrPage 패턴 확인 후 결정)

### 우선순위 C — 내 자료함 cross-service 확장

```
GlycoPharm + K-Cosmetics 내 자료함 (내 자료함 섹션 추가)
- /store/library/contents → StoreLibraryContentsPage
- /store/library/resources → StoreLibraryResourcesPage
- 서비스별 menu config에 '내 자료함' 섹션 추가
```

**예상 공수**: 4~8시간 (페이지 신규 작성 + API 경로 확인 필요)

> **권고**: Phase 2 WO 범위는 우선순위 A + B로 잡는 것이 안전.
> 내 자료함은 별도 WO(Phase 2-B)로 분리하는 것이 좋음.

---

## 10. Current Structure vs O4O Philosophy Conflict Check

### ✅ 정합 확인 항목

- **StoreAssetsPanel**: KPA/GlycoPharm/K-Cosmetics 모두 `@o4o/store-asset-policy-core` 사용
- **StoreDashboardLayout**: 3개 서비스 모두 `@o4o/store-ui-core` 사용
- **서비스별 Config**: `KPA_SOCIETY_STORE_CONFIG`, `GLYCOPHARM_STORE_CONFIG`, `COSMETICS_STORE_CONFIG` 공통 패키지에서 관리
- **Neture**: `/store` 매장 경영자 대시보드 없음 — O4O 철학상 Neture는 공급자/플랫폼 레이어, Store Owner 대시보드 노출 위험 없음

### ⚠️ 불일치 항목

| 항목 | 현상 | 철학 기준 | 심각도 |
|------|------|----------|--------|
| GlycoPharm POP 미연결 | 파일 있음, 라우트 없음 | Store Menu Canonical 정합 누락 | 중간 |
| GlycoPharm QR 없음 | 파일·라우트 없음 | Store Menu Canonical 누락 | 중간 |
| 내 자료함 GlycoPharm/K-Cosmetics 없음 | 3개 섹션 모두 누락 | 실행 자산 보관 흐름 미완 | 낮음 (기능 선택적) |
| K-Cosmetics `/store/orders` Placeholder | 실 데이터 없음 | 주문 관리 동선 미완 | 낮음 (주문 흐름 미도달) |
| pharmacy/store 용어 혼재 | GlycoPharm `pages/store-management/Pharmacy*.tsx` | 서비스 중립 명명 미이행 | 낮음 (Phase 3 대상) |

### ❌ 금지 위반 사항

- **없음** — Neture Store HUB/매장 경영자 기능 미노출 확인됨

---

## 결론

**Phase 2 WO 권장 명칭:**

```
WO-O4O-STORE-EXECUTION-ASSETS-CROSSSERVICE-PHASE2-A-V1
```

**범위:**
1. GlycoPharm `/store/pop` 라우트 연결 + 메뉴 추가 (파일·API 존재)
2. GlycoPharm `/store/qr` 페이지 신규 + 라우트 + 메뉴 추가
3. `GLYCOPHARM_STORE_CONFIG`에 POP/QR 메뉴 항목 추가

**Phase 2-B (별도 WO):**

```
WO-O4O-STORE-LIBRARY-CROSSSERVICE-PHASE2-B-V1
```

**범위:**
1. GlycoPharm 내 자료함 섹션 신규 (콘텐츠/자료)
2. K-Cosmetics 내 자료함 섹션 신규 (콘텐츠/자료)
3. 서비스별 menu config `내 자료함` 섹션 추가

> **내 자료함 매장 제작 자료**는 `StoreProductionMaterialsPage` + 편집기 포함으로
> 별도 WO로 분리 권고 (범위가 넓고 편집기 컴포넌트 공통화 필요).

---

*작성: Claude Code (조사 전용 — 코드 변경 없음)*
*검증: git status 확인 — `services/web-neture/src/pages/mypage/MyPageHub.tsx` (사용자 편집 중) 외 WO 관련 코드 변경 없음*
