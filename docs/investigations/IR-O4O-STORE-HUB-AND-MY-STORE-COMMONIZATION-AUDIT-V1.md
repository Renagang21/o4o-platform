# IR-O4O-STORE-HUB-AND-MY-STORE-COMMONIZATION-AUDIT-V1

> **타입**: 조사 보고서 (Investigation Report)
> **목표**: KPA-Society를 기준으로 매장 HUB / 내 매장 구조를 조사하고 GlycoPharm · K-Cosmetics 공통화 범위와 예외를 분리한다.
> **제약**: 코드 수정 없음. 조사 전용.
> **날짜**: 2026-05-26

---

## 0. 사전 확인 — 앱 위치

실제 앱 위치는 다음과 같다 (`apps/` 아님):

| 서비스 | 실제 경로 |
|--------|-----------|
| KPA-Society | `services/web-kpa-society/` |
| GlycoPharm | `services/web-glycopharm/` |
| K-Cosmetics | `services/web-k-cosmetics/` |
| Neture | `services/web-neture/` |

---

## 1. 현재 구조 요약

### 1-A. 공통 패키지 레이어 (이미 공통화됨)

| 패키지 | 역할 | 사용 서비스 |
|--------|------|-------------|
| `@o4o/store-ui-core` | 내 매장 사이드바 레이아웃 (`StoreDashboardLayout`), 서비스별 메뉴 config (`KPA_SOCIETY_STORE_CONFIG`, `GLYCOPHARM_STORE_CONFIG`, `COSMETICS_STORE_CONFIG`), capability 기반 메뉴 필터 (`resolveStoreMenu`), AI 인사이트 엔진 (`computeStoreInsights`) | KPA, GlycoPharm, K-Cosmetics |
| `@o4o/store-asset-policy-core` | 매장 자산 정책 UI (`StoreAssetsPanel`), 상태 게이트 (`canToggleStatus`), 미디어 추출 유틸, 라이프사이클 뱃지 | KPA(풀 사용), GlycoPharm(풀 사용), K-Cosmetics(타입만 사용) |
| `@o4o/shared-space-ui` | 매장 HUB 랜딩 템플릿 (`StoreHubTemplate`), 허브별 템플릿 (LMS/Forum/Content/Resources/Signage), 홈 템플릿 (`StandardHomeTemplate`) | 전 서비스 공통 |
| `@o4o/store-products-ui` | 내 매장 상품 관리 (`StoreProductsManagerPage`) | KPA, GlycoPharm, K-Cosmetics |
| `@o4o/operator-ux-core` | 서비스별 terminology·uiText config (`kpaConfig`, `glycopharmConfig`, `kcosmeticsConfig`) | 전 서비스 |

### 1-B. API 서버 레이어 (이미 서비스 중립)

API 서버는 **serviceKey** 파라미터를 통해 동일 컨트롤러를 서비스별로 분기한다:

```
/api/v1/kpa/store-hub       → createStoreHubController(dataSource, 'kpa')
/api/v1/glycopharm/store-hub → createStoreHubController(dataSource, 'glycopharm')
/api/v1/cosmetics/store-hub  → createStoreHubController(dataSource, 'cosmetics')
```

서비스 중립 컨트롤러: `createStoreHubController`, `createStoreAssetControlController`, `createStoreContentController`, `createStoreLibraryFeedController`, `createPublishedAssetsController`

`kpa_store_contents` 테이블은 3개 서비스(KPA/GlycoPharm/Cosmetics)가 공용으로 사용 중.
→ CLAUDE.md §5에서 "legacy physical table name"으로 명시. canonical 개념은 **Store Production Material**.

### 1-C. KPA의 위치 — Canonical Reference Implementation

KPA-Society는 가장 완성도 높은 구현체다. GlycoPharm과 K-Cosmetics는 KPA의 부분 구현 상태다.

---

## 2. 서비스별 매장 HUB 구조 비교표

| 항목 | KPA-Society | GlycoPharm | K-Cosmetics |
|------|:-----------:|:----------:|:-----------:|
| **HUB 경로** | `/store-hub` | `/store-hub` | `/store-hub` |
| **레거시 redirect** | `/hub → /store-hub` ✅ | `/hub → /store-hub` ✅ | `/hub → /store-hub` ✅ |
| **랜딩 템플릿** | `StoreHubTemplate` ✅ | `StoreHubTemplate` ✅ | `StoreHubTemplate` ✅ |
| **HUB 레이아웃** | `PharmacyHubLayout` (로컬) | `GlycoPharmHubLayout` (로컬) | `KCosmeticsHubLayout` (로컬) |
| **접근 보호** | `HubGuard` + `PharmacyOwnerOnlyGuard` ✅ | 없음 ❌ (공개 라우트) | storeManager만 노출 (메뉴) |
| **홈 탭** | ✅ | ✅ | ✅ |
| **B2B 상품 탭** | ✅ `/store-hub/b2b` | ✅ `/store-hub/b2b` | ✅ `/store-hub/b2b` |
| **사이니지 탭** | ✅ `HubSignageLibraryPage` (풀 구현) | ⚠️ `/store/signage/library`로 redirect만 | ⚠️ `HubSignagePage` (플레이스홀더) |
| **콘텐츠/자료 탭** | ✅ `HubContentLibraryPage` (목록 탐색) | ✅ `HubContentListPage` | ⚠️ `HubContentPage` (버튼 1개만) |
| **이벤트/특가 탭** | ✅ `/store-hub/event-offers` | ✅ `/store-hub/event-offers` | ✅ `/store-hub/event-offers` |
| **블로그 탭** | ✅ `HubBlogLibraryPage` | ❌ 없음 | ❌ 없음 |
| **POP 탭** | ✅ `HubPopLibraryPage` | ❌ 없음 | ❌ 없음 |
| **QR 탭** | ✅ `HubQrLibraryPage` | ❌ 없음 | ❌ 없음 |
| **AI 추천 블록** | ⚠️ "준비 중" | ⚠️ "준비 중" | ⚠️ "준비 중" |
| **HUB API 네임스페이스** | `/kpa/store-hub/...` | `/glycopharm/store-hub/...` | `/cosmetics/store-hub/...` |

**핵심 차이**: KPA HUB = 8개 탭(홈+B2B+사이니지+이벤트특가+콘텐츠+블로그+POP+QR). GlycoPharm/K-Cosmetics HUB = 4~5개 탭. 블로그/POP/QR 탐색 탭 없음.

---

## 3. 서비스별 내 매장 구조 비교표

### 3-A. 레이아웃·진입 구조

| 항목 | KPA | GlycoPharm | K-Cosmetics |
|------|:---:|:----------:|:-----------:|
| **라우트 루트** | `/store` | `/store` | `/store` |
| **레이아웃** | `StoreDashboardLayout` (@o4o/store-ui-core) ✅ | `StoreDashboardLayout` ✅ | `StoreDashboardLayout` ✅ |
| **메뉴 Config** | `KPA_SOCIETY_STORE_CONFIG` | `GLYCOPHARM_STORE_CONFIG` | `COSMETICS_STORE_CONFIG` |
| **메뉴 섹션 수** | 8섹션 | 6섹션 | 5섹션 |
| **capability 기반 메뉴 필터** | `resolveStoreMenu` ✅ | `resolveStoreMenu` ✅ | `resolveStoreMenu` ✅ |

### 3-B. 핵심 기능 항목 비교

| 기능 | KPA | GlycoPharm | K-Cosmetics |
|------|:---:|:----------:|:-----------:|
| **내 매장 홈 (index)** | `StoreHomePage` ✅ | `StoreOverviewPage` ✅ | `StoreCockpitPage` ✅ |
| **약국/매장 정보 관리** | `/store/info` (`PharmacyInfoPage`) | `/store/settings`에 통합 | `/store/settings` |
| **내 매장 상품** | `StoreProductsManagerPage` ✅ | `StoreProductsManagerPage` ✅ | `StoreProductsManagerPage` ✅ |
| **자체 상품 (local-products)** | `/store/commerce/local-products` ✅ | `/store/local-products` ✅ | `/store/local-products` ✅ |
| **태블릿 진열** | `/store/commerce/tablet-displays` ✅ | `/store/tablet-displays` ✅ | `/store/tablet-displays` ✅ |
| **채널 관리** | `/store/channels` (hidden) ✅ | `/store/channels` ✅ | `/store/channels` ✅ |
| **사이니지** | `/store/marketing/signage/playlist` ✅ | `/store/signage/playlist` ✅ | `/store/signage` ✅ |
| **블로그** | `/store/content/blog` ✅ | `/store/content/blog` ✅ | `/store/content/blog` ✅ |
| **POP** | `/store/content/pop` ✅ | `/store/pop` ✅ | `/store/pop` ✅ |
| **QR 코드** | `/store/marketing/qr` ✅ | `/store/qr` ✅ | `/store/qr` ✅ |
| **매장 자산 제어 (`StoreAssetsPanel`)** | `/store/content` (`StoreAssetsPage`) ✅ | `/store/content` (`StoreAssetsPage`) ✅ | ❌ 없음 (타입만 import) |
| **내 자료함 - 콘텐츠** | `/store/library/contents` ✅ | ❌ | ❌ |
| **내 자료함 - 자료실** | `/store/library/resources` ✅ | ❌ | ❌ |
| **내 자료함 - 제작 자료** | `/store/library/production-materials` ✅ | ❌ | ❌ |
| **마케팅 분석** | `/store/analytics/marketing` ✅ | ❌ | ❌ |
| **주문 관리** | `/store/commerce/orders` ✅ | `/store/orders` ✅ | ❌ |
| **B2B 주문** | ❌ | `/store/b2b-order` ✅ | ❌ |
| **AI Copilot (내 매장 홈)** | 홈에 통합 | `StoreMainPage` (/store/identity) 별도 | 홈에 통합 |
| **스토어 설정** | `/store/settings` + `/store/settings/template` | `/store/settings` | `/store/settings` |

### 3-C. 내 매장 내 HUB 가져오기(Import) 흐름

| 기능 | KPA | GlycoPharm | K-Cosmetics |
|------|:---:|:----------:|:-----------:|
| **HUB 블로그 가져오기** | `POST /kpa/stores/:slug/blog/staff/import` ✅ | `POST /glycopharm/stores/:slug/blog/staff/import` ✅ | ❌ |
| **HUB POP 가져오기** | `POST /kpa/stores/:slug/pop/staff/import` ✅ | ❌ | ❌ |
| **HUB QR 가져오기** | `POST /kpa/stores/:slug/qr/staff/import` ✅ | ❌ | ❌ |
| **사이니지 복사** | `StoreAssetsPanel` 내에서 처리 ✅ | `StoreAssetsPanel` 내에서 처리 ✅ | ❌ |

---

## 4. 공통화 후보 목록

### 4-A. 이미 공통화됨 — 유지

1. `StoreDashboardLayout` + `resolveStoreMenu` (store-ui-core)
2. `StoreHubTemplate` (shared-space-ui) — 3서비스 동일 사용
3. `StoreAssetsPanel` + policy 함수 (store-asset-policy-core) — KPA/GlycoPharm 동일 사용
4. `StoreProductsManagerPage` (store-products-ui) — 3서비스 동일 사용
5. API 서버 서비스 중립 컨트롤러 (serviceKey 분기) — 이미 공통 구조

### 4-B. 공통화 가능 (현재 각 서비스에서 로컬 구현)

| 항목 | 현재 상태 | 공통화 방향 |
|------|-----------|-------------|
| HUB 레이아웃 (사이드바) | 서비스별 로컬 컴포넌트 3개 | `@o4o/shared-space-ui` 또는 `@o4o/store-ui-core`에 `StoreHubLayout` 공통 컴포넌트로 승격 |
| HUB 탭별 라이브러리 페이지 | KPA만 완성 (Blog/POP/QR) | KPA 구현을 기준으로 GlycoPharm/K-Cosmetics에 적용 |
| 내 자료함 (Library) | KPA만 존재 | GlycoPharm/K-Cosmetics 확장 대상 |
| StoreAssetsPanel 사용 | KPA/GlycoPharm 사용, K-Cosmetics 미사용 | K-Cosmetics에 `StoreAssetsPage` 추가 |
| HUB 접근 보호 (Guard) | KPA만 `HubGuard` 적용 | GlycoPharm/K-Cosmetics에 동일 Guard 적용 |

### 4-C. O4O 철학 기준 장기 공통화 후보

- 블로그/POP/QR Staff API 패턴 (현재 KPA 전용 `/kpa/stores/:slug/*`) → GlycoPharm·K-Cosmetics에도 동일 패턴 확장
- 마케팅 분석 (`/store/analytics/marketing`) → GlycoPharm·K-Cosmetics에도 추가

---

## 5. 서비스별 예외 목록 (공통화에서 제외)

| 서비스 | 예외 항목 | 이유 |
|--------|-----------|------|
| **KPA** | 약국 정보 페이지 (`PharmacyInfoPage`) | KPA 전용 사업자 등록 정보 구조 |
| **KPA** | HUB 공지 시스템 (admin-dashboard) | KPA 전용 관리 기능 |
| **KPA** | Force Asset 콘솔, Snapshot Browser (admin-dashboard) | 어드민 전용 KPA 운영 도구 |
| **GlycoPharm** | B2B 주문 (`/store/b2b-order`) | GlycoPharm 전용 B2B 주문 흐름 |
| **GlycoPharm** | AI Copilot 별도 페이지 (`StoreMainPage`, `/store/identity`) | GlycoPharm 전용 AI 대시보드 구조 |
| **GlycoPharm** | 판매 참여 신청 (`/store/apply`), 정산 (`/store/billing`), 전환 퍼널 (`/store/funnel`) | GlycoPharm 전용 E-commerce 흐름 |
| **K-Cosmetics** | 관심 신청 (`/store/interest-requests`) | K-Cosmetics 전용 CRM 기능 |
| **Neture** | 내 매장/Store 실행 기능 전체 | O4O 철학상 Neture는 내 매장 대상 외 (공급자 플랫폼) |

---

## 6. 삭제/정리 후보 목록

| 대상 | 위치 | 이유 |
|------|------|------|
| `OPERATOR_MENU_ITEMS` (`@deprecated`) | `services/web-kpa-society/src/config/operatorMenuGroups.ts` | `UNIFIED_MENU + filterMenuByRole`로 대체됨, 레거시 잔존 |
| hidden route `/store/content` (KPA) | `StoreAssetsPage` — 사이드바 미노출 | 메뉴 연결 여부 확인 후 정리 또는 사이드바 복원 결정 필요 |
| hidden route `/store/channels` (KPA) | `StoreChannelsPage` — 사이드바 미노출 | 동일 |
| hidden route `/store/commerce/local-products` (KPA) | 사이드바 제거됨 | 동일 |
| `/pharmacy` → `/store` 리다이렉트 (KPA) | `App.tsx` | 이미 작동 중이나, `/pharmacy` prefix API 정리 후 라우트도 제거 필요 |
| `storeLibrary.ts` `/pharmacy/library` 미등록 주석 | `services/web-kpa-society/src/api/storeLibrary.ts` | KPA 백엔드 미구현 명시 → 백엔드 구현 또는 코드 제거 결정 필요 |

---

## 7. API 수정 필요 후보

| 항목 | 현재 | 필요 작업 |
|------|------|-----------|
| KPA 내 매장 API prefix 혼재 | `pharmacyInfo.ts`, `pharmacyProducts.ts` 등이 `/pharmacy/...` 호출 | 장기적으로 `/kpa/store/...` 또는 `/kpa/pharmacy/...` 통일 (breaking change 주의) |
| GlycoPharm HUB 접근 보호 없음 | `/store-hub`가 공개 라우트 | `StoreOwnerGuard` 또는 `HubGuard` 등 동일 보호 추가 |
| GlycoPharm POP/QR Staff API 없음 | HUB POP/QR import API 미구현 | KPA의 `createStorePopStaffController`, `createStoreQrStaffController` 패턴으로 추가 |
| K-Cosmetics Blog Staff API 없음 | `/cosmetics/stores/:slug/blog/staff` 미구현 | KPA/GlycoPharm 패턴으로 추가 |
| K-Cosmetics POP/QR Staff API 없음 | 동일 | 동일 |
| `kpa_store_contents` 테이블명 | legacy physical name | CLAUDE.md §5 canonical 문서 기준 rename 판단 필요 (별도 WO) |

---

## 8. UI/메뉴 수정 필요 후보

| 항목 | 서비스 | 내용 |
|------|--------|------|
| HUB 레이아웃 공통화 | KPA/GlycoPharm/K-Cosmetics 각자 로컬 구현 | 서비스별 메뉴 config 주입 방식으로 `StoreHubLayout` 공통 컴포넌트 추출 |
| GlycoPharm HUB 사이니지 탭 | redirect만 존재 | `HubSignageLibraryPage` 추가 또는 동일 페이지 활용 |
| GlycoPharm HUB 블로그/POP/QR 탭 | 없음 | KPA 구현 기준으로 추가 |
| K-Cosmetics HUB 사이니지/콘텐츠 탭 | 플레이스홀더 수준 | 풀 구현 또는 KPA 공통 컴포넌트 연결 |
| K-Cosmetics HUB 블로그/POP/QR 탭 | 없음 | 추가 여부 결정 |
| K-Cosmetics `StoreAssetsPage` | 없음 | KPA/GlycoPharm의 `StoreAssetsPage` + `StoreAssetsPanel` 기반으로 추가 |
| KPA hidden route 3개 | 사이드바 미노출 | 사이드바 복원 또는 라우트 정리 결정 필요 |
| KPA 약국(pharmacy) 용어 파일명 | `PharmacyBlogPage`, `PharmacyPopPage` 등 | 내용은 "내 매장" 기능이므로 장기적으로 `StoreBlogPage` 등으로 리네임 (UI/기능에는 영향 없음) |

---

## 9. O4O Philosophy Conflict Check

| 항목 | 상태 | 내용 |
|------|:----:|------|
| Neture에 내 매장 기능 없음 | ✅ OK | `web-neture`는 `store-ui-core` 미사용. 공급자 플랫폼으로 올바른 분리 |
| 공급자가 콘텐츠 직접 제작 구조 없음 | ✅ OK | 운영자(Operator)가 HUB 콘텐츠 생성, 매장 경영자가 가져오기 — 흐름 정합 |
| serviceKey 기반 서비스 격리 | ✅ OK | API 서버 서비스 중립 컨트롤러 + serviceKey 분기 구현됨 |
| GlycoPharm HUB 접근 보호 없음 | ⚠️ 충돌 | O4O 철학상 매장 HUB는 매장 경영자(storeOwner) 전용 공간. GlycoPharm은 공개 라우트로 노출됨 |
| KPA hidden routes | ⚠️ 부분 충돌 | 실제로 필요한 기능(`StoreAssetsPage`, `StoreChannelsPage`)이 사이드바에서 숨겨져 있어 운영 가시성 저하 |
| `kpa_store_contents` 테이블명 | ⚠️ 명명 불일치 | CLAUDE.md §5 명시: logical canonical은 "Store Production Material". 3서비스 공용 테이블이므로 이름 불일치 |
| pharmacy → store 용어 혼재 | ⚠️ 장기 drift 위험 | 현재는 terminology config로 런타임 치환하나, API prefix·파일명·컴포넌트명에 pharmacy 잔존 |
| 매장 POP 직접 작성 미구현 | ⚠️ 미완 | `popStaff.ts` 주석에 "매장 직접 POP 작성 — 후속" 명시. HUB 가져오기만 가능 |
| K-Cosmetics StoreAssetsPanel 미사용 | ⚠️ 불일치 | KPA/GlycoPharm은 매장 자산 정책 UI 적용, K-Cosmetics는 타입만 참조하고 UI 없음 |

---

## 10. 우선순위별 후속 WO 제안

### P0 — 즉시 필요 (O4O 철학 위반)

**WO-O4O-HUB-ACCESS-GUARD-ALIGNMENT-V1**
- GlycoPharm HUB에 `HubGuard` 또는 `StoreOwnerGuard` 적용
- K-Cosmetics HUB 접근 보호 강화
- 범위: 프론트엔드 Guard만 (API 서버 변경 없음)

### P1 — 단기 필요 (기능 격차 해소)

**WO-O4O-STORE-HUB-TAB-ALIGNMENT-V1**
- GlycoPharm HUB: 사이니지 탭 풀 구현, 블로그/POP/QR 탭 추가
- K-Cosmetics HUB: 사이니지/콘텐츠 탭 풀 구현, 블로그/POP/QR 탭 추가
- KPA HUB 구현을 canonical 기준으로 사용

**WO-O4O-STORE-ASSETS-PAGE-COSMETICS-V1**
- K-Cosmetics에 `StoreAssetsPage` + `StoreAssetsPanel` 추가
- KPA/GlycoPharm 구현과 동일 패턴

### P2 — 중기 필요 (공통화 완성)

**WO-O4O-STORE-HUB-LAYOUT-EXTRACTION-V1**
- 서비스별 로컬 HUB 레이아웃 3개 → `@o4o/store-ui-core`의 `StoreHubLayout` 공통 컴포넌트로 추출
- 서비스별 메뉴 config 주입 방식 유지

**WO-O4O-STORE-LIBRARY-CROSS-SERVICE-V1**
- GlycoPharm/K-Cosmetics에 내 자료함(Library) 기능 추가
- KPA의 `/store/library/contents|resources|production-materials` 구조 참조
- API 서버 `/glycopharm/store-library`, `/cosmetics/store-library` 엔드포인트 추가 필요

**WO-O4O-HUB-IMPORT-API-ALIGNMENT-V1**
- GlycoPharm: POP/QR Staff Import API 추가 (`/glycopharm/stores/:slug/pop|qr/staff/import`)
- K-Cosmetics: Blog/POP/QR Staff API 전체 추가
- API 서버 컨트롤러는 KPA 기준 serviceKey 분기로 확장

### P3 — 장기 정리 (Drift 방지)

**WO-O4O-PHARMACY-TERMINOLOGY-CLEANUP-V1**
- KPA 내 `pharmacy` → `store` 파일명/컴포넌트명 정리 (기능 변경 없음, 리네임만)
- API 서버 `/pharmacy/...` prefix를 `/store/...` 또는 `/kpa/store/...`로 통일 (breaking change, 마이그레이션 필요)

**WO-O4O-KPA-HIDDEN-ROUTES-RESTORE-V1**
- KPA hidden route 3개 (`StoreAssetsPage`, `StoreChannelsPage`, `StoreLocalProductsPage`) 사이드바 복원 또는 정리 결정

---

## 11. 판단 요약

### A. KPA 내부 먼저 정리가 필요한가?

**부분적으로 필요**: KPA hidden routes 3개, pharmacy 용어 혼재는 정리 필요하나, 이는 P2-P3 수준이다. KPA 핵심 구조는 canonical 기준으로 사용 가능하다.

### B. KPA를 기준으로 GlycoPharm/K-Cosmetics 확장이 가능한가?

**가능**: HUB 탭 구조, 내 자료함, HUB Import API 모두 KPA 구현을 기준으로 확장 가능하다. 서비스별 예외(GlycoPharm B2B 주문, K-Cosmetics 관심 신청 등)만 분리 유지한다.

### C. 공통 패키지로 먼저 빼야 하는가?

**HUB 레이아웃만**: 현재 서비스별 로컬 HUB 레이아웃 컴포넌트 3개는 공통화 가능. 나머지 공통 패키지(store-ui-core, store-asset-policy-core, shared-space-ui)는 이미 잘 공통화되어 있다.

### D. API 계약부터 정리해야 하는가?

**Guard 추가가 우선**: GlycoPharm HUB 접근 보호(P0)는 API 변경 없이 프론트엔드만으로 해결 가능하다. API prefix 정리(pharmacy→store)는 breaking change를 수반하므로 P3으로 연기한다.

### E. 메뉴/라우트만 정리하면 되는가?

**아니다**: HUB 탭 구현이 실질적으로 누락(GlycoPharm/K-Cosmetics 블로그/POP/QR 탭)되어 있어, API 및 페이지 컴포넌트 추가가 모두 필요하다.

### F. 삭제해야 할 legacy가 먼저인가?

**아니다**: deprecated `OPERATOR_MENU_ITEMS` 등은 기능에 영향을 주지 않으므로, 신규 기능 추가 후 정리하는 순서가 맞다.

---

*조사 완료: 2026-05-26 | 코드 변경 없음 | git status 확인 필요*
