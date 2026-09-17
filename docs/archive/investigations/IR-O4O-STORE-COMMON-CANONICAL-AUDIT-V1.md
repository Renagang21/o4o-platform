# IR-O4O-STORE-COMMON-CANONICAL-AUDIT-V1

> O4O 플랫폼 `/store` 영역이 **서비스별 개별 구현이 아니라 공통 Store 운영 구조**로 얼마나 정리되어 있는지 조사.
> **최종 기준은 특정 서비스가 아니라 코드상 이미 존재하는 공통 Store canonical (`@o4o/store-ui-core`)**.
> **수정 없음. 조사 전용.**

- 작성일: 2026-05-09
- 기준 브랜치: `main` (origin 동기화 완료)
- 대상
  - `packages/store-ui-core` (공통 Shell)
  - `services/web-kpa-society`
  - `services/web-k-cosmetics`
  - `services/web-neture` (`/store/*` 흔적 확인용)
- 본 IR이 그 결론을 재판정한다.

---

## 0. 결론 요약

1. **공통 Store canonical은 이미 코드상 존재한다 — 패키지 `@o4o/store-ui-core`.** Frozen 문서: [docs/architecture/STORE-LAYER-ARCHITECTURE.md](../architecture/STORE-LAYER-ARCHITECTURE.md) (`WO-O4O-STORE-ARCHITECTURE-FREEZE-V1`, 2026-02-22).
2. **`/store`의 공통 의미 — 코드 기준**: "매장 운영 홈 + StoreDashboardLayout outlet + 서비스별 config로 메뉴 구성". 인덱스 = 운영 홈, 자식 = 운영 화면들.
3. `/store-hub` 는 별개의 Hub Exploration 영역 (3 서비스 공유, 다만 서비스별 layout 각자).
4. **canonical 패턴 적용 상태 (3개 소비 서비스 중)**:
   - KPA-Society: 정렬됨 (`/store` index = 운영 홈, 단일 라우트)
   - K-Cosmetics: 정렬됨 (`/store` index = 운영 홈, 단일 라우트)
   - `path="store"` 이중 등록.
5. **Neture는 store-ui-core 미사용.** Neture의 `/store/*` 는 storefront(소비자) 영역으로 본 IR의 운영 dashboard와 다른 개념 — 본 audit 범위 밖.
6. **공통 패키지 내부에 서비스명이 박혀 있는 anti-pattern** 존재 (서비스별 config 3종 전용 SECTION_ICONS 키). 의존 방향 점검 필요.
7. 도메인 특수 메뉴(b2b-order/market-trial/funnel/management)는 canonical을 깨지 않으므로 그대로 서비스 확장으로 유지.

---

## 1. 공통 Store 구조 (코드상 정의)

### 1-1. 패키지 인벤토리 — `@o4o/store-ui-core`

위치: [packages/store-ui-core/src/](../../packages/store-ui-core/src/)

| Export | 종류 | 위치 | 역할 |
|--------|------|------|------|
| `StoreDashboardLayout` | Component | `layout/StoreDashboardLayout.tsx` | 매장 대시보드 Shell (TopBar + Sidebar + `<Outlet />`) |
| `StoreSidebar` | Component | `components/StoreSidebar.tsx` | 좌측 사이드바 (flat / sectioned 양쪽 지원, NavLink 기반) |
| `StoreTopBar` | Component | `components/StoreTopBar.tsx` | 매장 TopBar (서비스 로고 + "내 매장" 뱃지 + 햄버거 + 사용자/로그아웃) |
| `StorePlaceholderPage` | Component | `components/StorePlaceholderPage.tsx` | 메뉴 placeholder |
| `ALL_STORE_MENUS` | Constant | `config/storeMenuConfig.ts` | flat-mode 메뉴 정의 |
| `COSMETICS_STORE_CONFIG` | Constant | `config/storeMenuConfig.ts` | K-Cosmetics 서비스 config |
| `KPA_SOCIETY_STORE_CONFIG` | Constant | `config/storeMenuConfig.ts` | KPA-Society 서비스 config |
| `MENU_CAPABILITY_MAP` | Constant | `config/menuCapabilityMap.ts` | 메뉴 ↔ Capability 매핑 |
| `resolveStoreMenu` | Function | `config/menuCapabilityMap.ts` | Capability 기반 메뉴 필터링 |
| `computeStoreInsights` | Function | `engine/storeInsightEngine.ts` | Insight 계산 |
| Types (`StoreMenuKey`, `StoreDashboardConfig`, `StoreMenuItemDef`, `StoreMenuSection`, `StoreMenuSectionItem`, `StoreInsight*`) | Type | 위 파일들 | 공통 타입 |

`package.json` peerDeps만 사용 (zero-dep 원칙). 의존 방향: `web-* → store-ui-core` (역방향 금지).

### 1-2. 코드상 정의된 `/store`의 의미

#### Layout 측
`StoreDashboardLayout` 은 React Router `<Outlet />` 을 본문으로 사용한다 ([packages/store-ui-core/src/layout/StoreDashboardLayout.tsx#L111](../../packages/store-ui-core/src/layout/StoreDashboardLayout.tsx#L111)).
→ **사용 패턴은 `<Route path="store" element={<Wrapper>}>` + 자식 라우트가 outlet에 렌더되는 형태로 고정.**

#### Sidebar 측
`StoreSidebar` 는 `config.basePath + item.subPath` 로 NavLink href 를 만든다.
→ 사이드바 첫 메뉴의 `subPath = ''` 이면 `/store` 자체를 가리킨다.
→ `subPath = '/hub'` 면 `/store/hub` 를 가리킨다.

→ 따라서 코드는 **`/store` 인덱스가 운영 홈인지 / `/store/hub` 같은 자식이 운영 홈인지** 를 강제하지 않는다. **선택은 서비스 config + 라우트 정의에서 결정된다.**

#### Config 측 (3 서비스 비교, [packages/store-ui-core/src/config/storeMenuConfig.ts](../../packages/store-ui-core/src/config/storeMenuConfig.ts))

| 서비스 | 첫 섹션 첫 항목 key | label | subPath | 코드 라인 |
|--------|---------------------|-------|---------|----------|
| KPA_SOCIETY_STORE_CONFIG | `home` | `홈` | `''` | line 199 |
| COSMETICS_STORE_CONFIG | `home` | `홈` | `''` | line 84 |

→ 공통 의미를 다수결로 결정한다면 `/store` = 운영 홈 (subPath `''`).

#### 라우트 측 (3 서비스 비교)

| 서비스 | `path="store"` 정의 수 | `<Route index>` 존재 | index 페이지 | 별도 `/store/hub` 라우트 | 파일 라인 |
|--------|------------------------|----------------------|---------------|--------------------------|----------|
| KPA-Society | 1 | O | `<StoreHomePage />` | 없음 | App.tsx:826-894 |
| K-Cosmetics | 1 | O | `<StoreCockpitPage />` | 없음 | App.tsx:424-452 |

→ canonical 패턴 (`<Route path="store">` 단일 + `<Route index>` = 운영 홈) 은 **3개 중 2개에 이미 적용**.

### 1-3. `/store-hub` (별개 영역) — 3 서비스 모두 보유, 다만 서비스별 layout

| 서비스 | 라우트 | Layout 컴포넌트 | 위치 |
|--------|--------|------------------|------|
| KPA-Society | `/store-hub` | `<PharmacyHubLayout>` | `services/web-kpa-society/src/components/pharmacy/PharmacyHubLayout.tsx` |
| K-Cosmetics | `/store-hub` | `<KCosmeticsHubLayout>` | services/web-k-cosmetics/src/components/... |

- 모두 `@o4o/hub-core` 의 `HubLayout` 을 base로 한다 (`docs/architecture/STORE-LAYER-ARCHITECTURE.md` §3.5). hub-core 는 FROZEN.
- `/store-hub` 는 **공통 구조이지만 layout 인스턴스는 서비스별 별도 컴포넌트**. → 공통화 후보로 볼 수 있음 (별도 IR 영역).

---

## 2. 서비스별 `/store` 적용 현황

### 2-1. 비교표 (코드 기준 사실만)

| 항목 | KPA-Society | K-Cosmetics | Neture |
| ------ | ------------- | ------------- | -------- |
| `@o4o/store-ui-core` 사용 | O | O | **X** |
| `path="store"` 라우트 정의 수 | 1 | 1 | 0 (operating dashboard 부재) |
| `/store` index 페이지 | `<StoreHomePage>` | `<StoreCockpitPage>` | (없음) |
| StoreDashboardLayout 적용 | `KpaStoreLayoutWrapper` | `StoreLayoutWrapper` | (없음) |
| 좌측 Sidebar 사용 | O | O | (없음) |
| storeMenuConfig 사용 | `KPA_SOCIETY_STORE_CONFIG` | `COSMETICS_STORE_CONFIG` | (없음) |
| 서비스별 Header 브릿지 | `KpaGlobalHeader` | `KCosGlobalHeader` | 별개 (`@o4o/ui` GlobalHeader 직접) |
| Guard | `<PharmacyGuard>` (인증+승인 통합) | `<RoleGuard allowedRoles={['cosmetics:store_owner', 'k-cosmetics:operator', ...]}>` | n/a |
| 사이드바 첫 메뉴 subPath | `''` | `''` | n/a |
| `/store/dashboard` redirect | `→ /store` (App.tsx:830) | (없음) | n/a |
| `/pharmacy → ?` redirect | 다수 → `/store` 또는 `/store/...` | n/a | n/a |
| `useStoreCapabilities` hook | O (동일 파일 내용) | O (동일 파일 내용) | n/a |
| 서비스별 메뉴 확장 | `library/contents`, `library/resources`, `marketing/qr/pop`, `content/blog`, `marketing/product-descriptions`, `analytics/marketing`, `info` 등 | `local-products`, `tablet-displays`, `signage`, `interest-requests`, placeholders 다수 | n/a |
| `/store-hub` 라우트 존재 | O (PharmacyHubLayout) | O (KCosmeticsHubLayout) | n/a |
| storefront(소비자) 라우트 | `/store/:slug`, `/store/:slug/products/:id`, `/store/:slug/checkout`, `/store/:slug/blog` | `/tablet/:slug` (storefront 부재) | `/store/product/:offerId`, `/store/:storeSlug/product/:productSlug`, `/store/blog/...` |

### 2-2. Neture 위치 — 본 audit 범위 밖

- Neture 는 `@o4o/store-ui-core` 미사용 ([services/web-neture/](../../services/web-neture/) grep no-match)
- Neture `/store/*` 는 모두 **storefront(소비자) 영역**: `/store/product/:offerId`, `/store/:storeSlug/product/:productSlug`, `/store/blog/...`
- 본 IR 의 "공통 Store" 는 **Store-Owner 운영 dashboard** 를 의미하므로 Neture는 비교 대상이 아니다 (URL 경로만 같을 뿐 의미 다름).
- 다만 Neture 는 `@o4o/hub-core` 는 사용한다 (`docs/architecture/STORE-LAYER-ARCHITECTURE.md` §3.5 소비자 목록).

### 2-3. 공통 패키지 내부의 anti-pattern (코드 기준)

| 위치 | 내용 | 의존 방향 |
|------|------|-----------|
| `packages/store-ui-core/src/config/storeMenuConfig.ts:77-167, 192-241` | 2개 서비스의 config 가 라이브러리 안에 박혀 있음 (`KPA_SOCIETY_STORE_CONFIG`, `COSMETICS_STORE_CONFIG`) | 라이브러리가 서비스 이름을 안다 (역방향) |
| `packages/store-ui-core/src/components/StoreSidebar.tsx:62-101` | — | 동일 |
| `packages/store-ui-core/src/config/menuCapabilityMap.ts:22-28` | KPA 임시 매핑 제거 흔적 (`// library`, `// qr`, `// pop` 코멘트로 남김) | 정리 미완 |
| (선언) `STORE-LAYER-ARCHITECTURE.md` §3.1 에 `GLUCOSEVIEW_STORE_CONFIG` 가 export 목록으로 적혀 있으나 `storeMenuConfig.ts` 에 실제 정의 없음 | 문서/코드 불일치 | 문서가 앞서감 |

→ 공통화는 잘 되어 있으나, **"라이브러리에 서비스명이 박혀 있는" 것은 점진적으로 해소해야 할 영역**. (이 IR 의 다음 WO 후보)

---

## 3. 공통 Store canonical 정의 초안

> **특정 서비스를 기준으로 잡지 않고, 코드상 이미 합의된 부분만을 추출.**

### 3-1. 공통 필수 (이미 공통 — 그대로 유지)

| 항목 | 근거 |
|------|------|
| `@o4o/store-ui-core` 의 모든 export | 3 서비스 모두 `import { StoreDashboardLayout, ... STORE_CONFIG, resolveStoreMenu } from '@o4o/store-ui-core'` |
| `<Route path="store" element={<XxxStoreLayoutWrapper>}>` 패턴 | 3 서비스 공통 wrapper 존재 (KpaStoreLayoutWrapper / StoreLayoutWrapper × 2) |
| `<Route index element={<운영홈>}>` (인덱스 = 운영 홈) | KPA / K-Cosmetics 적용. |
| Service Config menu의 첫 항목 `subPath: ''` | KPA / K-Cosmetics 적용. |
| StoreDashboardLayout `hideTopBar` 옵션 + 서비스별 GlobalHeader 브릿지 | 3 서비스 공통 |
| `useStoreCapabilities()` + `resolveStoreMenu()` 조합 | 3 서비스 동일 (파일 내용까지 일치) |
| `StoreSidebar` flat / sectioned 양쪽 지원 | 라이브러리 자체 보장 |
| 서비스별 Wrapper 책임 ($\to$ thin) — auth context 변환 + onLogout + capability fetch | 3 서비스 패턴 일치 |

### 3-2. 서비스별 확장 허용

| 항목 | 사유 |
|------|------|
| 서비스별 menu sections 라벨 / subPath | 도메인별 운영 메뉴가 다를 수밖에 없음 (약사회 vs 화장품 vs 약국) |
| 서비스별 운영 홈 페이지 (KPI/카드 구성) | 서비스 KPI가 다름 |
| 서비스별 Guard (PharmacyGuard / RoleGuard 조합) | 도메인별 승인/멤버십 체계 다름 |
| 서비스별 GlobalHeader 브릿지 | 브랜드/메뉴/ServiceSwitcher 차이 |
| 도메인 특수 라우트 — KPA: `marketing/qr`, `marketing/pop`, `library/contents`, `analytics/marketing`, `info`, `content/blog`, `marketing/product-descriptions` | 서비스별 fitness — canonical 패턴을 깨지 않음 |
| 도메인 특수 라우트 — Cosmetics: `interest-requests`, `tablet-displays`, `signage` (단일 페이지) | 동일 |
| `path="apply"` (`StoreApplyPage` 등) 서비스별 가입/신청 화면 | 서비스 가입 모델 다름 |

### 3-3. Legacy / Redirect 처리 후보

| 항목 | 서비스 | 상태 |
|------|--------|------|
| `/store/hub` (운영 대시보드 의도) | — | 다른 두 서비스 미사용. `/store` 인덱스 흡수 후 redirect (`/store/hub → /store`) |
| `/store/dashboard` | KPA 만 명시적 redirect (`/store/dashboard → /store`) | 다른 서비스에는 없음. canonical 패턴이라면 모든 서비스에 일관 redirect 또는 미정의 |
| `// library`, `// qr`, `// pop` 주석 잔재 (menuCapabilityMap.ts) | 공통 패키지 | 매핑 복구 또는 코멘트 제거 |

### 3-4. 아직 공통화되지 않은 부분 (점진 공통화 후보)

| 항목 | 현재 상태 | 후보 방향 |
|------|----------|-----------|
| 서비스별 store config 가 공통 패키지 안에 박힘 | `storeMenuConfig.ts` 안에 3종 config 존재 | 서비스 측 (`services/web-*/src/config/`) 으로 분리하고 라이브러리는 타입/유틸만 제공 |
| 운영 홈 페이지 (StoreHomePage / StoreCockpitPage / StoreOverviewPage) 의 KPI 카드 / 실행 흐름 패턴 | 서비스별 별도 구현 (코드 중복) | 공통 KPI 카드 / 실행 흐름 컴포넌트로 추출 (별도 IR 권장) |
| Layout Wrapper (3종 동일 구조) | 3 서비스에 동명/동기능 wrapper 중복 | wrapper 자체를 store-ui-core에 옮기고 auth/header 를 props/render-prop 로 받기 |
| `useStoreCapabilities` (3 서비스 100% 동일) | 코드 중복 | hook을 store-ui-core 또는 별도 패키지로 추출 |
| `MENU_CAPABILITY_MAP` 의 Capability 키 정의 SSOT | 현재 string literal | `@o4o/capabilities` (peerDeps) 와 enum/타입 동기화 |
| `GLUCOSEVIEW_STORE_CONFIG` 문서 vs 코드 불일치 | 문서에 export 표기, 코드 미존재 | 코드 추가 또는 문서 업데이트 |

---

## 5. 다음 WO 제안

> 본 IR 은 수정하지 않음. 후속 작업은 별도 WO로 분리.

### 5-2. (2순위) 외부 링크 / redirect 정합성 점검

- `/pharmacy → /store/hub`, `/pharmacist/* → /store/hub` redirect를 `/store` 로 정렬
- `/store-hub` 는 별개 영역이므로 이번 WO 대상이 아님 (`/store/hub` 와 혼동 주의)

### 5-3. (3순위) 공통 패키지 anti-pattern 해소 — 의존 방향 정상화

별도 IR/WO 단위 검토 권장:

- `storeMenuConfig.ts` 내 서비스별 config 3종 → 서비스 측으로 분리, 패키지는 타입/유틸만 export
- `useStoreCapabilities` 3 서비스 동일 hook → 라이브러리/공통 hooks 패키지로 추출
- `menuCapabilityMap.ts` 임시 코멘트 (`// library`, `// qr`, `// pop`) 정리 / 매핑 복구
- `STORE-LAYER-ARCHITECTURE.md` 의 `GLUCOSEVIEW_STORE_CONFIG` export 기록 vs 코드 부재 — 문서/코드 동기화

### 5-4. (4순위) 운영 홈 KPI/실행 흐름 공통화

3개 서비스의 운영 홈 (`StoreHomePage` / `StoreCockpitPage` / `StoreOverviewPage`) 이 비슷한 KPI 카드 / 실행 흐름 패턴을 별도 구현 중. 공통 KPI 카드/3-step 실행 흐름 컴포넌트로 추출 가능성 — 별도 IR 권장 (본 IR 범위 밖).

## 6. 위험 요소 / 확인 필요한 사항

### 6-1. 공통 라이브러리에 서비스명이 박혀 있는 anti-pattern
- 단순 정렬 WO (5-1) 만으로는 해소되지 않음. 패키지 내부 서비스 의존을 풀려면 별도 WO + 회귀 위험 점검 필요.
- 단일 PR로 한꺼번에 풀려고 하면 3 서비스 회귀 위험 → 5-1 (좁은 정렬) 과 5-3 (구조 정상화) 분리 권장.

### 6-2. `/store/hub` 외부 링크 영향
- 단순 redirect 만 추가하면 동작은 유지되나, 사용자 시나리오 회귀 점검 필요.
- `/store-hub` (Hub Exploration) 와 `/store/hub` 는 다른 경로 — 코드 작업 시 혼동 주의.

### 6-3. Guard 정책 차이
- KPA `PharmacyGuard` = 인증 + 약국 승인 통합.
- 본 IR 은 layout/route 단일화에 한정 추천.

### 6-4. capability 매핑 회귀 위험
- `menuCapabilityMap.ts` 의 KPA 임시 매핑 제거 (`// library`, `// qr`, `// pop`) 코멘트는 운영 데이터 (store_capabilities row 누락) 와 묶여 있음 (코드 코멘트). 매핑을 복구하려면 row backfill 선행 필요.

### 6-5. Neture vs O4O Store 명칭 충돌
- Neture `/store/*` 는 storefront. O4O Store canonical 의 `/store` 는 운영 대시보드. 동일 path prefix 가 두 의미를 가짐. 본 IR 의 canonical 은 **store-ui-core 를 사용하는 운영 대시보드**에만 적용된다. Neture 영역은 본 IR 범위 밖.

### 6-6. 문서 vs 코드 일치
- `docs/architecture/STORE-LAYER-ARCHITECTURE.md` (Frozen) 의 export 목록에 `GLUCOSEVIEW_STORE_CONFIG` 가 있음. 코드 부재. 문서가 앞서 갔거나 코드가 뒤처짐 — 추적 필요.

---

## 7. 부록 — 핵심 파일 인벤토리

### 7-1. 공통 패키지

- [packages/store-ui-core/src/index.ts](../../packages/store-ui-core/src/index.ts) — public API
- [packages/store-ui-core/src/layout/StoreDashboardLayout.tsx](../../packages/store-ui-core/src/layout/StoreDashboardLayout.tsx) — Shell (TopBar + Sidebar + `<Outlet>`)
- [packages/store-ui-core/src/components/StoreSidebar.tsx](../../packages/store-ui-core/src/components/StoreSidebar.tsx) — flat / sectioned 사이드바
- [packages/store-ui-core/src/components/StoreTopBar.tsx](../../packages/store-ui-core/src/components/StoreTopBar.tsx) — TopBar (hideTopBar 옵션 지원)
- [packages/store-ui-core/src/config/storeMenuConfig.ts](../../packages/store-ui-core/src/config/storeMenuConfig.ts) — 메뉴 타입 + 3 서비스 config
- [packages/store-ui-core/src/config/menuCapabilityMap.ts](../../packages/store-ui-core/src/config/menuCapabilityMap.ts) — Capability 매핑 + `resolveStoreMenu`
- [packages/store-ui-core/src/engine/storeInsightEngine.ts](../../packages/store-ui-core/src/engine/storeInsightEngine.ts) — Insight 계산
- [packages/store-ui-core/package.json](../../packages/store-ui-core/package.json) — peerDeps only

### 7-2. 서비스별

KPA-Society:
- [services/web-kpa-society/src/App.tsx](../../services/web-kpa-society/src/App.tsx) (KpaStoreLayoutWrapper L368-399, `/store` route L826-894)
- [services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx](../../services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx)
- [services/web-kpa-society/src/components/auth/PharmacyGuard.tsx](../../services/web-kpa-society/src/components/auth/PharmacyGuard.tsx)
- [services/web-kpa-society/src/hooks/useStoreCapabilities.ts](../../services/web-kpa-society/src/hooks/useStoreCapabilities.ts)

K-Cosmetics:
- [services/web-k-cosmetics/src/App.tsx](../../services/web-k-cosmetics/src/App.tsx) (StoreLayoutWrapper L187-205, `/store` route L424-452)
- [services/web-k-cosmetics/src/pages/operator/StoreCockpitPage.tsx](../../services/web-k-cosmetics/src/pages/operator/StoreCockpitPage.tsx)

### 7-3. 정책 / 캐노니컬 문서

- [docs/architecture/STORE-LAYER-ARCHITECTURE.md](../architecture/STORE-LAYER-ARCHITECTURE.md) — FROZEN, store layer 5개 패키지 책임 경계
- [docs/architecture/STORE-PRODUCTS-CANONICAL-V1.md](../architecture/STORE-PRODUCTS-CANONICAL-V1.md)
- [docs/baseline/STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md](../baseline/STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md)

---

## 8. 선행 IR 와의 관계

| 선행 IR | 본 IR 에서의 위치 |
|---------|---------------------|
| `IR-O4O-STORE-APP-CORE-EXTENSION-ARCHITECTURE-AUDIT-V1` (`docs/audit/`) | 더 큰 범위의 store extension audit. 본 IR 은 `/store` 라우트/Layout 단일화 영역에 한정 |
| `IR-O4O-STORE-HUB-ARCHITECTURE-AUDIT-V1` (`docs/audit/`, `docs/investigation/`) | `/store-hub` (Hub Exploration) 영역 — 본 IR 의 `/store` (운영 dashboard) 와 별개 |

---

다음 단계는 후속 WO.*
