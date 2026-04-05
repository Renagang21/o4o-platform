# IR-KPA-SOCIETY-STORE-HOME-CURRENT-STRUCTURE-AND-REDESIGN-BASE-AUDIT-V1

> **조사일**: 2026-04-05
> **범위**: `web-kpa-society` `/store` 페이지 구조 — 왜 "내 약국 매장"이 아니라 "동두천시약사회 매장"으로 보이는지

---

## 1. 라우트 구조 & 기본 랜딩 페이지

### 1.1 라우트 정의

**File**: [App.tsx:622-685](services/web-kpa-society/src/App.tsx#L622-L685)

```
/store → PharmacyGuard → KpaStoreLayoutWrapper
  ├─ index → StoreMarketingDashboardPage (기본 랜딩)
  ├─ dashboard → StoreMarketingDashboardPage
  ├─ info → PharmacyInfoPage
  ├─ operation/library → StoreLibraryPage
  ├─ marketing/qr → StoreQRPage
  ├─ marketing/pop → StorePopPage
  ├─ marketing/signage → StoreSignagePage
  ├─ commerce/products → PharmacyB2BPage
  ├─ commerce/products/b2c → PharmacySellPage
  ├─ commerce/local-products → StoreLocalProductsPage
  ├─ commerce/orders → StoreOrdersPage
  ├─ analytics/marketing → MarketingAnalyticsPage
  ├─ channels → StoreChannelsPage
  ├─ content → StoreAssetsPage
  ├─ billing → StoreBillingPage
  ├─ settings → PharmacyStorePage
  └─ (+ legacy redirects)
```

### 1.2 기본 랜딩 페이지

`/store` (index) = `StoreMarketingDashboardPage` — **마케팅 대시보드**

- 파일: [StoreMarketingDashboardPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreMarketingDashboardPage.tsx)
- 내용: QR 스캔 KPI (총 스캔, 오늘, 이번주, 활성 QR) + QR 성과 TOP 5 + 최근 스캔 활동 + 빠른 이동 링크
- 조직명/약국명 표시 없음 (순수 마케팅 데이터)

### 1.3 접근 제어

**PharmacyGuard** ([PharmacyGuard.tsx](services/web-kpa-society/src/components/auth/PharmacyGuard.tsx)):
- 미인증 → `/login`
- admin/operator → `/operator`
- `isStoreOwner === true` → 즉시 통과
- 그 외 → API로 약국 승인 상태 확인 → 미승인이면 `/pharmacy`

---

## 2. 헤더/브랜드 영역 — "동두천시약사회 매장" 표시 원인

### 2.1 이름 전달 경로 (Data Flow)

```
AuthContext (login/checkAuth)
  → user.kpaMembership.organizationName  (e.g. "동두천시약사회")
  → user.membershipOrgName

ServiceContext (URL-based)
  → /store/* → KPA_C

KpaStoreLayoutWrapper (App.tsx:282-303)
  → getDisplayOrganizationName(KPA_C, user)
  → return user.membershipOrgName  (= "동두천시약사회")
  → orgName prop → StoreDashboardLayout

StoreTopBar (line 63):
  → "{orgName} · {config.serviceName}"
  → "동두천시약사회 · 약국 경영지원"

StoreSidebar (line 108):
  → "{orgName} 매장"
  → "동두천시약사회 매장"
```

### 2.2 핵심 함수: `getDisplayOrganizationName`

**File**: [org-display.ts](services/web-kpa-society/src/lib/org-display.ts)

```typescript
switch (service) {
  case 'KPA_A': return '대한약사회';     // 커뮤니티
  case 'KPA_C': return user.membershipOrgName || null;  // 분회 서비스
  case 'KPA_B': return null;             // 데모
}
```

`/store/*`는 `KPA_C`로 매핑되므로, `user.membershipOrgName` = **"동두천시약사회"** (소속 분회/지부 이름)가 반환된다.

### 2.3 표시 위치

| 위치 | 컴포넌트 | 표시 내용 | 파일:라인 |
|------|---------|----------|----------|
| **TopBar 왼쪽 1줄** | StoreTopBar | `serviceLabel` = "약사 네트워크" | StoreTopBar.tsx:59 |
| **TopBar 왼쪽 2줄** | StoreTopBar | "{orgName} · 약국 경영지원" | StoreTopBar.tsx:63 |
| **TopBar 뱃지** | StoreTopBar | `serviceBadge` = "KPA" | StoreTopBar.tsx:73 |
| **Sidebar 헤더** | StoreSidebar | "{orgName} 매장" 또는 "내 매장 관리" | StoreSidebar.tsx:108 |

### 2.4 데이터 소스

`user.membershipOrgName`은 **`/api/v1/auth/me`** 응답의 `kpaMembership.organizationName`에서 온다.

```typescript
// AuthContext.tsx:309
userData.membershipOrgName = km.organizationName || undefined;
```

이 값은 `organizations` 테이블의 `name` 필드이며, 분회 레벨 조직(e.g. "동두천시약사회")의 이름이다. **약국 이름이 아니다.**

---

## 3. 사이드바 메뉴 구성

### 3.1 메뉴 설정

**File**: [storeMenuConfig.ts:106-150](packages/store-ui-core/src/config/storeMenuConfig.ts#L106-L150)

`KPA_SOCIETY_STORE_CONFIG`:

| 섹션 | 메뉴 항목 |
|------|----------|
| (무제) | 대시보드 |
| (무제) | 약국 정보 |
| 운영 | 자료실, 콘텐츠 관리, 블로그 |
| 마케팅 | QR 관리, POP 자료, 매장 사이니지, 마케팅 분석 |
| 상품/판매 | 상품 관리(B2B), B2C 상품 판매, 자체 상품, 공급자, 주문 관리 |
| 채널/디바이스 | 채널 관리, 태블릿 채널, 태블릿 디스플레이 |
| 설정 | 매장 설정, 레이아웃 빌더, 템플릿 관리 |
| 정산 | 정산/인보이스 |

### 3.2 Capability 필터링

[menuCapabilityMap.ts](packages/store-ui-core/src/config/menuCapabilityMap.ts)의 `resolveStoreMenu()`가 `useStoreCapabilities()` 결과로 메뉴를 동적 필터링한다.

활성화된 capability에 따라 일부 메뉴만 표시됨.

---

## 4. 약국/조직/매장 데이터 매핑

### 4.1 데이터 소스 3개

| 데이터 | 출처 | 조직 구분 |
|--------|------|----------|
| `user.membershipOrgName` | `/auth/me` → `kpaMembership.organizationName` | **분회** (e.g. "동두천시약사회") |
| `PharmacyInfoData.name` | `/pharmacy/info` → `organizations.name` | **약국** (e.g. "OO약국") |
| `StoreHubOverview.organizationName` | `/store-hub/overview` | **약국** (organizationId 기준) |

### 4.2 문제의 핵심

`/store` 레이아웃에서 사용하는 이름은 **`user.membershipOrgName`** = `kpaMembership.organizationName`이다. 이는 **분회 레벨 조직명**이지, **약국(store) 이름이 아니다**.

KPA 구조에서:
- 사용자 → 분회 멤버십 (organizationName: "동두천시약사회")
- 사용자 → 약국 소유 (pharmacy/store: "OO약국")

이 두 레벨이 **다른 entity**이며, 현재 레이아웃은 분회 멤버십 이름을 사용하고 있다.

---

## 5. 역할별 관점 분석

### 5.1 약국 경영주 (Store Owner)

현재 `/store`에 진입하면:
- TopBar: "약사 네트워크" + "동두천시약사회 · 약국 경영지원"
- Sidebar: "동두천시약사회 매장"
- 대시보드: 마케팅 KPI (QR 스캔 데이터)

**문제**: 약국 경영주가 자신의 약국(e.g. "종로OO약국")을 관리하러 왔는데, 소속 분회명("종로구약사회")이 표시된다. **자기 매장이 아닌 분회 매장으로 느껴진다.**

### 5.2 원인: `getDisplayOrganizationName`의 설계 의도

이 함수는 원래 **서비스 컨텍스트 표시용**으로 설계되었다:
- KPA_A (커뮤니티) → "대한약사회"
- KPA_C (분회 서비스) → 소속 분회명

이 로직이 Store Layout에도 동일하게 적용되면서, **매장 컨텍스트에서 분회명이 매장명으로 오인**되는 현상 발생.

---

## 6. 수정 방향 판단

### 6.1 결론: **네이밍 매핑 수정으로 충분 (구조 변경 불필요)**

구조적 문제 없음:
- 라우트 구조는 올바름 (`/store/*` → `PharmacyGuard` → `StoreLayout`)
- 사이드바 메뉴는 적절 (약국 경영지원 기능 기반)
- 데이터 API는 올바름 (pharmacyInfo, storeHub 각각 약국 데이터 반환)
- 대시보드 콘텐츠는 적절 (마케팅 KPI)

**수정이 필요한 부분**: `orgName` prop의 데이터 소스만 변경하면 됨.

### 6.2 수정 방안

#### Option A: KpaStoreLayoutWrapper에서 약국명 직접 조회 (권장)

```typescript
// KpaStoreLayoutWrapper에서:
// AS-IS: orgName = getDisplayOrganizationName(currentService, user)  → "동두천시약사회"
// TO-BE: pharmacyInfo.name 또는 storeHubOverview.organizationName → "OO약국"
```

`/pharmacy/info` 또는 `/store-hub/overview`에서 약국명을 가져와 `orgName`으로 전달.

- TopBar 2줄: "OO약국 · 약국 경영지원"
- Sidebar 헤더: "OO약국 매장"

#### Option B: `getDisplayOrganizationName`에 store 컨텍스트 분기 추가

`/store/*` 경로에서만 약국명을 반환하도록 함수 확장. 다만 이는 함수 목적(서비스 컨텍스트 표시)과 다르므로 A가 더 깔끔함.

#### Option C: Sidebar/TopBar에서 orgName 미전달 (최소)

orgName을 undefined로 두면:
- Sidebar: "내 매장 관리" (기본값, StoreSidebar.tsx:108)
- TopBar: "약국 경영지원" (config.serviceName만 표시)

분회명이 사라지는 대신 약국명도 없음. 단, 빠른 수정으로 적합.

### 6.3 권장: Option A → C 순

1. **Option C** (즉시 수정): `KpaStoreLayoutWrapper`에서 `orgName={undefined}` → "내 매장 관리"
2. **Option A** (후속 WO): pharmacyInfo에서 약국명 가져와 `orgName`으로 주입

---

## 7. 영향 범위

| 컴포넌트 | 수정 여부 | 비고 |
|---------|---------|------|
| `KpaStoreLayoutWrapper` | **수정 필요** | orgName 데이터 소스 변경 |
| `getDisplayOrganizationName` | 변경 불필요 | 서비스 컨텍스트 표시용 유지 |
| `StoreTopBar` | 변경 불필요 | prop 기반, 로직 변경 없음 |
| `StoreSidebar` | 변경 불필요 | prop 기반, 기본값 "내 매장 관리" 이미 존재 |
| `StoreMarketingDashboardPage` | 변경 불필요 | 이름 표시 없음 |
| `PharmacyInfoPage` | 변경 불필요 | `/pharmacy/info` API에서 약국명 조회 |
| `store-ui-core` (F3 Frozen) | 변경 불필요 | prop interface만 사용 |

**Frozen baseline 영향 없음**: Store Layer (F3)는 prop interface를 통한 데이터 주입이므로, 서비스 레벨 래퍼 수정으로 해결됨.

---

## 8. 요약

| 항목 | 현재 상태 | 문제 | 해결 |
|------|----------|------|------|
| **TopBar** | "동두천시약사회 · 약국 경영지원" | 분회명 표시 | 약국명 또는 미표시 |
| **Sidebar** | "동두천시약사회 매장" | 분회명 + "매장" | "내 매장 관리" 또는 약국명 |
| **랜딩 페이지** | 마케팅 대시보드 | 적절 | 변경 불필요 |
| **메뉴 구성** | 8개 섹션 24개 항목 | 적절 | 변경 불필요 |
| **Guard** | PharmacyGuard (isStoreOwner/API fallback) | 적절 | 변경 불필요 |
| **구조적 리디자인** | — | 불필요 | 네이밍 수정만 |

**핵심 원인**: `getDisplayOrganizationName(KPA_C, user)` → `user.membershipOrgName` (분회명)이 Store Layout의 orgName prop으로 전달되어, 약국 매장 관리 화면에 분회명이 표시됨.

**수정 규모**: `KpaStoreLayoutWrapper` (App.tsx 1곳, ~5줄) — 구조 변경 없이 데이터 소스만 변경.
