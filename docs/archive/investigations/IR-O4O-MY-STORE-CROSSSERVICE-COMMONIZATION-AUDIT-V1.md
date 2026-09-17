# IR-O4O-MY-STORE-CROSSSERVICE-COMMONIZATION-AUDIT-V1

> **상태**: Read-only 조사 IR. 코드/라우트/메뉴/권한 변경 없음. 커밋·푸시 없음.
> **선행 작업** (조사 시점 main HEAD 기준 반영):
> - `ac9932683` WO-O4O-KCOSMETICS-STORE-PATH-NESTED-MIGRATION-V1 — K-Cosmetics flat `/store/*` → KPA nested canonical 정렬 + flat redirect alias.
> - `5bef8f4c4` — `service_memberships`-only 사용자에 대한 `organization_service_enrollments` + `role_assignments` 백필 (직전 의 B/C 후속).
> **작성일**: 2026-05-30
> **범위**: KPA-Society / K-Cosmetics 2 서비스. "내 약국 / 내 매장" 영역. (Store HUB 와 운영자 콘솔은 명시적으로 비교 대상에서 제외 — 다만 메뉴 구분 명확성 검증 차원에서 등장.)

---

## 1. 전체 판정

**판정: PARTIAL (공통화 기반 강하나 잔여 정합 작업 필요)**

| 영역 | 상태 | 메모 |
|---|---|---|
| 라우트 구조 | ✅ **PASS** | 3 서비스 모두 nested `/store/*` canonical 로 정렬됨 (ac9932683 으로 K-Cosmetics 완료). |
| 메뉴/헤더 진입점 | ✅ **PASS** | "내 매장 / 내 약국" vs "매장 HUB" 메뉴상 명확히 분리됨 (3 서비스 공통). 순서·라벨 미세 차이만 잔존. |
| 백엔드 가드 | ✅ **PASS** | `createRequireStoreOwner(serviceKey)` factory 가 이미 3 서비스 공통 적용. cross-service leakage 차단 검증됨. |
| 프론트엔드 가드 | ⚠️ **PARTIAL** | 3 가지 다른 가드 패턴 — KPA (role+stale recovery), K-Cosmetics (role-only). 의도된 차이 vs 무계획 차이의 구분이 모호. |
| 화면 구성 (cockpit) | ⚠️ **PARTIAL** | KPA/K-Cosmetics 는 `store-hub` overview 로 대체 — 의도된 차이인지 미구현인지 확인 필요. |
| 화면 구성 (sub-menus) | ✅ **PASS** | `packages/store-ui-core/src/config/storeMenuConfig.ts` 단일 SSOT 에 3 CONFIG 객체. ~80% item 중첩. service-specific 차이만 잔존. |
| API 공통화 | ✅ **PASS** | shared controller factory (`createStoreHubController`, `createPharmacyProductsController`, store-library/pop/qr-landing) 가 3 서비스 동시 적용 중. |
| 4-tier 정합성 | ⚠️ **PARTIAL** | KPA/K-Cosmetics 는 enrollment SSOT 미사용 (legacy 모델). 신규 가입 흐름에서 4-tier 동시 생성 보장 미검증. |
| 잔여 known bug | ⚠️ **PARTIAL** | 본 IR 의 공통화 범위 외, **별도 IR/WO 후보**. |

**"내 매장 공통화 개발 WO 로 바로 진행 가능 여부": 조건부 YES.**

- **즉시 가능**: 프론트엔드 가드 패턴 정렬 + 메뉴 config 미세 차이 정리 + 용어 정합 — 단일 WO 로 묶기 충분.
- **분리 권장**: cockpit endpoint 확대 의 정책 결정 — 단일 WO 안에서 처리하기에는 정책성 판단이 무거움.
- **별도 트랙**: `ecommerce_orders` 테이블 부재 — 본 공통화와 무관, 광역 영향 있는 별도 IR.

---

## 2. 서비스별 현재 구조 요약

### 2-1. KPA-Society (canonical reference 후보)

| 항목 | 값 |
|---|---|
| 라우트 prefix | `/store/*` (nested canonical) — 레거시 `/pharmacy/*` → `/store` wildcard redirect 1건만 잔존 |
| 진입 라벨 | "내 약국" (`KPA_CONTEXTUAL_NAV[].label='내 약국'`, [services/web-kpa-society/src/config/navigation.ts](services/web-kpa-society/src/config/navigation.ts)) |
| 사용자-facing 진입점 | (1) Header contextual nav, (2) GlobalHeader user-menu dropdown "내 매장" 항목 명시 ([:195-197](services/web-kpa-society/src/components/KpaGlobalHeader.tsx#L195)) |
| 프론트 가드 | `PharmacyGuard` ([services/web-kpa-society/src/components/auth/PharmacyGuard.tsx](services/web-kpa-society/src/components/auth/PharmacyGuard.tsx)) — `isStoreOwnerDual(roles, 'kpa:store_owner', user.isStoreOwner)` + stale JWT recovery (`/pharmacy` API 검증 후 자동 재진입) |
| 백엔드 가드 | `createRequireStoreOwner('kpa')` ([apps/api-server/src/routes/kpa/kpa.routes.ts:363](apps/api-server/src/routes/kpa/kpa.routes.ts#L363)) |
| 매장 메뉴 SSOT | `KPA_SOCIETY_STORE_CONFIG` ([packages/store-ui-core/src/config/storeMenuConfig.ts:246](packages/store-ui-core/src/config/storeMenuConfig.ts#L246)) |
| 매장 layout | `KpaStoreLayoutWrapper` → `StoreDashboardLayout` (공통 shell) |
| Cockpit (대시보드) 페이지 | `KpaOperatorDashboard` 5-block (operator 영역) / 일반 매장 home 은 `storeMenuConfig` 의 "홈" 라우트 |
| Cockpit 백엔드 | **없음** — `store-hub` overview 로 대체 (`createStoreHubController('kpa')`) |
| 4-tier 정합 | role + service_memberships + organization. `organization_service_enrollments` 미사용 (legacy 모델). |
| 강점 | 다년 운영 안정. PharmacyGuard 의 stale JWT recovery 가 유일하게 명시적. |
| 잔여 결함 | 사용자-facing 용어 "내 약국" 이 service-specific (의도 — KPA 만의 약사회 정체성). 구조적 문제 아님. |

### 2-3. K-Cosmetics

| 항목 | 값 |
|---|---|
| 라우트 prefix | `/store/*` (nested canonical, ac9932683 으로 flat → nested 정렬 완료) + 11개 flat redirect alias |
| 진입 라벨 | "내 매장" (`KCOS_CONTEXTUAL_NAV[].label='내 매장'`, [services/web-k-cosmetics/src/config/navigation.ts](services/web-k-cosmetics/src/config/navigation.ts)) |
| 사용자-facing 진입점 | Header contextual nav. (GlobalHeader user-menu 에는 admin/operator 만 dashboard 링크.) |
| 프론트 가드 | `RoleGuard` + `ProtectedRoute` 인라인 `allowedRoles=['cosmetics:store_owner', 'cosmetics:operator', 'cosmetics:admin', 'platform:super_admin']` ([services/web-k-cosmetics/src/App.tsx:620-623](services/web-k-cosmetics/src/App.tsx#L620-L623)) — role-only |
| 백엔드 가드 | `createRequireStoreOwner('cosmetics')` ([apps/api-server/src/routes/cosmetics/cosmetics.routes.ts:119](apps/api-server/src/routes/cosmetics/cosmetics.routes.ts#L119)) |
| 매장 메뉴 SSOT | `COSMETICS_STORE_CONFIG` ([packages/store-ui-core/src/config/storeMenuConfig.ts:77](packages/store-ui-core/src/config/storeMenuConfig.ts#L77)) |
| 매장 layout | `StoreLayoutWrapper` → `StoreDashboardLayout` |
| Cockpit (대시보드) 페이지 | `KCosmeticsOperatorDashboard` 5-block (operator 영역). 일반 매장 home 은 menu config 의 "홈" 라우트. |
| Cockpit 백엔드 | **없음** — `store-hub` overview 로 대체 |
| 4-tier 정합 | role + service_memberships + organization. `organization_service_enrollments` 미사용 (legacy 모델). |
| 강점 | 라우트 구조가 가장 최근 정렬 — KPA canonical 과 직접 mirror. menu config 도 "WO-KCOS-KPA-CANONICAL-MENU-ALIGN-V1" 표시로 의도된 정렬 명시. |
| 잔여 결함 | (2) 메뉴 일부 항목 미구현 |

---

## 3. 공통 구조 비교표

### 3-1. 라우트

| 항목 | KPA | K-Cosmetics |
|---|---|---|
| Canonical prefix | `/store/*` (nested) | `/store/*` (nested, just migrated) |
| Layout wrapper | `KpaStoreLayoutWrapper` | `StoreLayoutWrapper` |
| Inner layout | `StoreDashboardLayout` (공통) | 동일 |
| Legacy redirect | `/pharmacy/*` → `/store` (1건) | 11개 flat alias |
| Sub-route 깊이 | flat (예: `/store/products`) | 2단 grouping (예: `/store/commerce/local-products`, `/store/marketing/signage`) |

### 3-2. 메뉴 진입점

| 항목 | KPA | K-Cosmetics |
|---|---|---|
| 라벨 | **"내 약국"** | "내 매장" |
| Header 순서 | "내 약국" → "매장 HUB" | "매장 HUB" → "내 매장" |
| Visibility 조건 | `isStoreOwner` (role-based) | `isStoreManager` (role OR operator/admin) |
| User-menu dropdown 항목 | "내 매장" 명시 ([:195](services/web-kpa-society/src/components/KpaGlobalHeader.tsx#L195)) | admin/operator 만 dashboard 링크 |
| 매장 HUB 와 분리 명확성 | ✅ 분리 | ✅ 분리 |

### 3-3. Guard / 권한

| Layer | KPA | K-Cosmetics |
|---|---|---|
| **Frontend route guard** | `PharmacyGuard` — role-dual + stale JWT recovery | `RoleGuard` — role-only (가장 엄격) |
| **JWT role check** | `kpa:store_owner` (`isStoreOwnerDual`) | `cosmetics:store_owner` |
| **Membership tolerance** | 부분적 (MembershipGate downstream) | ❌ 없음 |
| **Backend factory** | `createRequireStoreOwner('kpa')` | `createRequireStoreOwner('cosmetics')` |
| **Enrollment SSOT 사용** | ❌ | ❌ |
| **Cross-service leakage 차단** | ✅ (serviceKey 명시) | ✅ |

### 3-4. 주요 화면

| 항목 | KPA | K-Cosmetics |
|---|---|---|
| Cockpit shell | `StoreDashboardLayout` (공통) | 동일 |
| 매장 home | `storeMenuConfig` "홈" 라우트 | `storeMenuConfig` "홈" 라우트 |
| Operator dashboard | `KpaOperatorDashboard` 5-block | `KCosmeticsOperatorDashboard` 5-block |
| 공통 layout/sidebar/topbar | `@o4o/store-ui-core` `StoreDashboardLayout` + `StoreSidebar` + `StoreTopBar` (3 서비스 공통) |
| StartProductionModal | ✅ (`@o4o/store-ui-core`) | ✅ |
| 매장 상품 manager | (KPA local) | ✅ 동일 |

### 3-5. 주요 API (capability matrix)

| Capability | KPA | K-Cosmetics |
|---|---|---|
| store-hub overview | `/store-hub/overview` | `/store-hub/overview` |
| store-hub channels | `/store-hub/channels` | 동일 |
| pharmacy-products catalog | `/pharmacy/products/catalog` | 동일 |
| pharmacy-products listings | `/pharmacy/products/listings` | 동일 |
| **cockpit status** | — | — |
| **cockpit today-actions** | — | — |
| **cockpit store-kpi** | — | — |
| **cockpit store-insights** | — | — |
| **cockpit ai-summary** | — | — |
| store-library | `/pharmacy/library/*` | 동일 |
| store-pop | `/pharmacy/pop/*` | 동일 |
| store-qr | `/pharmacy/qr/*` | 동일 |
| analytics | `/pharmacy/analytics/*` | 동일 |

### 3-6. 용어

| 표현 | KPA | K-Cosmetics |
|---|---|---|
| 사용자-facing | "내 약국" | "내 매장" |
| `terminology.myStoreLabel` config | `kpaConfig` ("내 약국") | `kcosmeticsConfig` |
| URL 경로 | `/store` (구조명) | `/store` |
| 백엔드 라우트 | `/pharmacy/...` (legacy) | `/pharmacy/...` |

**관찰**: 백엔드 라우트가 모두 `/pharmacy/*` prefix 를 공유 — 이는 의도된 cross-service 공통 (shared controller factory) 이지만, K-Cosmetics 에서 `/pharmacy/*` 는 사용자 직관과 어긋남 (cosmetics 매장이 pharmacy API 호출). 구조명-라벨 mismatch.

### 3-7. 누락/차이 요약

| 차이 | 의도 vs 사고 | 영향 |
|---|---|---|
| Frontend guard 3 종 패턴 (role / role+membership / role-only) | — | — |
| K-Cosmetics 메뉴에 주문관리·경영·분석 부재 | **미구현** — capability matrix 빈칸 다수 | 매장 운영 깊이 부족 |
| `/pharmacy/*` 백엔드 prefix 가 cosmetics 에도 사용 | **사고/legacy** — shared controller factory 의 historical 이름 | 향후 별도 정렬 후보. 본 IR 범위 외. |

---

## 4. 남은 문제 목록

### 4-1. 차단 이슈 (commonization WO 진행 전 / 동시 해결 필요)

(없음. 라우트·메뉴 SSOT·shared controller factory 가 이미 정렬되어 있어 즉시 commonization 가능.)

### 4-2. 정비 필요 이슈

1. 향후 4-tier 결함 재발 시 K-Cosmetics 도 동일 사용자 차단 패턴에 노출.
2. **K-Cosmetics 매장 메뉴 항목 보강** — capability matrix 빈칸 5건 (주문관리, 경영, 분석 등).
3. 정책이 "YES" 면 shared `cockpit.controller.ts` factory 로 refactor 후 cosmetics 적용.
4. **신규 가입 흐름의 4-tier 동시 생성 보장** — 5bef8f4c4 은 백필. 신규 가입 시 `service_memberships` + `organization` + `organization_service_enrollments` + `role_assignments` 가 항상 동시 생성됨이 보장되는지 코드 검증 필요. (5bef8f4c4 의 "approval-flow-fix" 부분이 이를 담당하는 것으로 추정 — 별도 IR 후보.)

### 4-3. 단순 문구/용어 이슈

5. 약사회의 정체성. 사용자-facing 차이만이고 코드 구조는 모두 `/store` + storeMenuConfig 단일 SSOT.
6. 백엔드 prefix `/pharmacy/*` 가 cosmetics 에 사용 — historical legacy. 본 IR 범위 외. 광역 영향 평가 후 별도 WO 후보.

### 4-4. 후순위 이슈

7. **광역 영향** (KPA/K-Cos checkout/payment 도 동일 테이블 참조). 본 commonization WO 와 분리. **별도 IR 권장**: `IR-O4O-ECOMMERCE-ORDERS-TABLE-CROSSSERVICE-IMPACT-V1`.
8. KPA 의 `PharmacyGuard` stale JWT recovery 패턴을 다른 2 서비스로 확산 — JWT refresh 가 안정화된 시점부터 가치 감소. 우선순위 낮음.
9. Cockpit `cockpit.controller.ts` 의 catch 블록이 generic `INTERNAL_ERROR` 만 반환 (직전 IR W4 잔존) — 운영성 보강 후보.

---

## 5. 권장 공통화 방향

### 5-1. KPA 를 canonical 기준으로 삼아도 되는지

판정: YES (구조적 패턴 기준).

근거:
- KPA 가 가장 안정적으로 다년 운영. 라우트·메뉴 SSOT 가 가장 cleanly 정렬됨.
- K-Cosmetics 가 ac9932683 으로 KPA 기준 mirror 한 점도 이미 정착된 정책.

### 5-2. KPA 기준으로 맞출 항목

1. K-Cosmetics 의 `RoleGuard` 인라인 → 공통 `<StoreOwnerGuard serviceKey="cosmetics">` 컴포넌트로 추출.
3. K-Cosmetics 매장 메뉴에 KPA 동등 항목 (분석/경영) 도입 검토 — service-specific 차이가 의도된 것인지 미구현인지 사용자 확인 필요.

### 5-3. 공통 패키지/공통 컴포넌트 후보

| 후보 | 현 위치 | 권장 위치 | 비고 |
|---|---|---|---|
| `StoreOwnerGuard` 공통 컴포넌트 | (각 서비스 local) | `packages/store-ui-core/src/auth/StoreOwnerGuard.tsx` (신규) | `serviceKey` prop 으로 cross-service 동작. 3 서비스 모두 흡수 가능. |
| Cockpit endpoint 공통화 | — | `createCockpitController(dataSource, coreRequireAuth, serviceKey)` factory 화 | 정책 결정 필요 (5-3.2 참조). |
| `StoreProductsManagerPage` | `@o4o/store-products-ui` | 이미 KPA 만 미사용. KPA 도입 검토. | 일부 KPA 화면이 자체 manager 사용 — 정합 가능 여부 확인. |
| menu config | `@o4o/store-ui-core` storeMenuConfig.ts | 동일 (이미 공통화 완료) | factory 모델 가능 — `createServiceStoreConfig(serviceKey, terminology, capabilities)` 형태. |

### 5-4. 서비스별 확장으로 남길 항목

- 사용자-facing "내 약국" vs "내 매장" 라벨 — `terminology` config 로 분리, 변경 금지.
- KPA-Society 의 약사 / 근무약사 / 분회·지부 운영자 등 KPA-specific role 모델 — 본 commonization 의 store_owner 와 별개 layer.
- K-Cosmetics 의 `/store/commerce/*` `/store/marketing/*` 2단 grouping — 의도된 차이로 유지 (이미 storeMenuConfig 에 반영).

### 5-5. 삭제 또는 레거시 정리 후보

- 백엔드 `/pharmacy/*` prefix 가 cosmetics 에 사용 — historical legacy. **본 IR 의 즉시 범위 외**. 별도 IR/WO 권장: `IR-O4O-PHARMACY-API-PREFIX-CROSSSERVICE-RENAME-V1`.
- KPA `/pharmacy/*` → `/store` wildcard redirect — 사용 통계 확인 후 일정 시점에 제거 후보.

---

## 6. Current Structure vs O4O Philosophy Conflict Check

`docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md` 와 `docs/baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md` 의 핵심 원칙 4 개에 대해 점검:

### 6-1. "매장 실행 중심" (PHILOSOPHY §3.3)

✅ **정합**. 3 서비스 모두 "내 매장 / 내 약국" 을 `/store/*` nested 라우트로 분리. cockpit 페이지 + storeMenuConfig 의 매장 실행 capability (상품 / 블로그 / POP / QR / 사이니지 / 자료함 / 설정) 가 명확히 운영 layer 로 분리됨.

### 6-2. "Store 기준 capability" (PHILOSOPHY §5)

✅ **정합**. `packages/store-ui-core/src/config/menuCapabilityMap.ts` 가 capability → menu item 매핑을 단일 SSOT 로 보유. 3 서비스 모두 동일 capability 키 사용.

### 6-3. "매장 HUB 와 내 매장의 책임 분리" (HUB CONTENT PUBLISHING STANDARD)

✅ **정합**. 3 서비스 모두 메뉴상 "매장 HUB" (cross-store discovery/curation/operator) 와 "내 매장" (개별 매장 cockpit) 을 분리. 라우트도 `/store-hub/*` vs `/store/*` 로 명확 분리.

### 6-4. "서비스별 차이는 최소화하고 공통 capability 는 운영 흐름까지 공통화" (3-ROLE-FLOW §2)

⚠️ **부분 정합 — 잔여 차이 존재**:
- **공통화 강한 영역**: 라우트 prefix, storeMenuConfig SSOT, 백엔드 shared controller factory, layout/sidebar/topbar — 모두 단일 SSOT.
- **공통화 약한 영역**: cockpit endpoint 프론트 guard 패턴 (3 종 분기), 4-tier 정합 SSOT 사용 여부

### 6-5. "가입 흐름 4-tier 동시 생성" (3-ROLE-FLOW §2 책임 매트릭스)

⚠️ **부분 정합**:
- KPA/K-Cosmetics 는 3-tier (role + membership + organization) 만 사용.
- philosophy 가 요구하는 "가입 승인 시 4-tier 동시 생성" 이 3 서비스 모두에 적용되어야 한다면, KPA/K-Cosmetics 의 enrollment 미사용은 본질적 drift.
- 단, 운영 안정성 측면에서 KPA/K-Cosmetics 가 3-tier 로도 무문제 운영 중인 점은 "philosophy 의 strict 정의가 너무 무거운가" 라는 역방향 검토 필요. **본 IR 범위에서 결론 내리지 않음 — 별도 정책 IR 후보**.

### 6-6. 충돌 요약

| 원칙 | 충돌 여부 | 비고 |
|---|---|---|
| 매장 실행 중심 | ✅ 없음 | |
| Store 기준 capability | ✅ 없음 | |
| HUB / 내 매장 분리 | ✅ 없음 | |
| 공통화 + 운영 흐름 정합 | ⚠️ 부분 충돌 | cockpit / guard / 4-tier 잔여 |
| 4-tier 가입 흐름 동시 생성 | ⚠️ 부분 충돌 | KPA/K-Cos 의 3-tier 운영 패턴이 의도된 차이인지 정책 확정 필요 |

---

## 7. 다음 단계 제안

### 7-1. 즉시 작성 가능한 WO 후보

#### **권장 우선순위 1 — 단일 통합 WO**

**`WO-O4O-MY-STORE-CROSSSERVICE-CANONICAL-ALIGNMENT-V1`**

**목표**: KPA 를 구조 canonical 기준으로 삼되 `PharmacyStoreGuard` 의 membership-aware 가드 패턴을 K-Cosmetics 로 흡수하고, storeMenuConfig 미세 차이를 정리한다.

**범위 (단일 PR 권장)**:
1. **공통 `StoreOwnerGuard` 컴포넌트 추출** — `packages/store-ui-core/src/auth/StoreOwnerGuard.tsx` (신규). `serviceKey` prop. 3-way OR (role / membership / operator-or-above).
2. **K-Cosmetics 의 `RoleGuard` 인라인 → `StoreOwnerGuard` 흡수** (`App.tsx` line 620-623 영역).
3. **KPA `PharmacyGuard` 의 stale JWT recovery 로직 보존** — 통합 컴포넌트에 option 으로 추가하거나 KPA 만 wrapping 유지.
5. **storeMenuConfig 의 cosmetics 영역 점검** — capability matrix 빈칸 5건 (주문관리/경영/분석) 의 정책 결정 후 menu 추가 또는 영구 제외 명시.

**범위 외 (분리)**:
- cockpit endpoint 확대 정책 결정 — 정책성 판단 필요. 별도 IR/WO.
- `ecommerce_orders` 테이블 부재 — 본 commonization 과 무관. 별도 IR.
- 백엔드 `/pharmacy/*` prefix 가 cosmetics 에 사용되는 historical legacy — 별도 IR.

#### **권장 우선순위 2 — 별도 IR (분리 사유)**

**`IR-O4O-ECOMMERCE-ORDERS-TABLE-CROSSSERVICE-IMPACT-V1`** (read-only)
- `ecommerce_orders` 테이블 부재의 cross-service 영향 평가.
- 3 서비스 + checkout / payment / KPI / 분석 위젯의 의존 정도 매핑.
- CREATE TABLE 마이그레이션 추가가 광역 silent failure 복구 효과 평가.

**`IR-O4O-STORE-COCKPIT-ENDPOINT-CROSSSERVICE-POLICY-V1`** (정책 IR)

### 7-2. 사용자 판정 요청 항목

1. **KPA 를 canonical 기준으로 삼아도 되는지** → 본 IR §5-1 권장: YES (구조 기준).
2. 공통화 WO 와 분리 권장.
3. **K-Cosmetics 는 단순 이식 대상인지, 아직 미구현 영역이 많아 단계 분리가 필요한지** → 본 IR §5-2: **단순 이식 + 미구현 메뉴 정책 결정 1단계 필요.** ac9932683 이후 라우트는 정렬 완료, guard 만 즉시 흡수 가능. 메뉴 항목 추가 (주문관리/경영/분석) 는 사용자 정책 확인 후 결정.

---

## 부록 A. 조사 시점 main HEAD 기준

```
ac9932683 refactor(k-cosmetics): WO-O4O-KCOSMETICS-STORE-PATH-NESTED-MIGRATION-V1 — flat /store/* path 를 KPA nested canonical 로 정렬 + flat redirect alias
ec2bcc9c1 docs(investigation): IR-O4O-CROSSSERVICE-OPERATOR-CAPABILITY-POLICY-AUDIT-V1
07431a989 fix(operator-ux): WO-O4O-CROSSSERVICE-OPERATOR-CAPABILITY-GAP-FIX-V1
```

## 부록 B. 핵심 파일 위치 인덱스

| 항목 | 파일 |
|---|---|
| KPA Header | [services/web-kpa-society/src/components/KpaGlobalHeader.tsx](services/web-kpa-society/src/components/KpaGlobalHeader.tsx) |
| KPA PharmacyGuard | [services/web-kpa-society/src/components/auth/PharmacyGuard.tsx](services/web-kpa-society/src/components/auth/PharmacyGuard.tsx) |
| KPA store routes | [services/web-kpa-society/src/App.tsx](services/web-kpa-society/src/App.tsx) (line ~462 nested) |
| KCos Header | [services/web-k-cosmetics/src/components/KCosGlobalHeader.tsx](services/web-k-cosmetics/src/components/KCosGlobalHeader.tsx) |
| KCos store routes + inline guard | [services/web-k-cosmetics/src/App.tsx](services/web-k-cosmetics/src/App.tsx) (line ~620) |
| **공통 menu config** | [packages/store-ui-core/src/config/storeMenuConfig.ts](packages/store-ui-core/src/config/storeMenuConfig.ts) |
| **공통 capability map** | [packages/store-ui-core/src/config/menuCapabilityMap.ts](packages/store-ui-core/src/config/menuCapabilityMap.ts) |
| **공통 backend factory (가드)** | [apps/api-server/src/utils/store-owner.utils.ts](apps/api-server/src/utils/store-owner.utils.ts) |
| **공통 backend controller (hub)** | [apps/api-server/src/routes/o4o-store/controllers/store-hub.controller.ts](apps/api-server/src/routes/o4o-store/controllers/store-hub.controller.ts) |
| **공통 backend controller (products)** | [apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts](apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts) |

---

*IR 종료. 본 IR 은 read-only. 코드/라우트/메뉴/권한 변경 없음. 다음 단계는 §7-1 의 단일 통합 WO 또는 §7-2 의 분리 IR 중 사용자 정책 판정 후 진행.*
