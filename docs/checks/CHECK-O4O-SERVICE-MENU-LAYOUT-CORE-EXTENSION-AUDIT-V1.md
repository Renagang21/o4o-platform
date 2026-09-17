# CHECK-O4O-SERVICE-MENU-LAYOUT-CORE-EXTENSION-AUDIT-V1

- **WO**: `WO-O4O-SERVICE-MENU-LAYOUT-CORE-EXTENSION-AUDIT-V1`
- **작성일**: 2026-08-10
- **성격**: 조사 전용 (read-only) — 제품 코드 변경 0 · 리팩터링 0 · route/UI/권한 변경 0 · migration/DB write/배포 0
- **기준 HEAD**: `8750e090f` (worktree clean, `HEAD == origin/main`)
- **판정**: **공통화 착수 가능.** 단, 착수 지점은 Operator/Store 계층이 아니라 **공개 Header · Mobile Bottom Nav 계층**이다.

선행: [`CHECK-O4O-PHARMACY-HUB-ADMIN-ROLE-CATALOG-SEED-V1`](CHECK-O4O-PHARMACY-HUB-ADMIN-ROLE-CATALOG-SEED-V1.md) §11 에서
"선행 정비로 넘긴 항목" 이 본 조사의 입력이다.

---

## 1. 요약 — 이번 조사의 핵심 결론 3가지

1. **Operator 계층과 Store 계층은 이미 공통화가 끝나 있다.** `@o4o/operator-ux-core`(OperatorAreaShell · DomainIASidebar · operatorDomainIA) ·
   `@o4o/ui`(operator-shell STANDARD_GROUPS) · `@o4o/store-ui-core`(StoreDashboardLayout · storeMenuConfig) 가 이미 Core 다.
   서비스에 남은 것은 **순수 데이터(Config)** 와 **12줄짜리 함수 1개의 4중 복제**뿐이다. → **여기를 다시 건드리는 것은 이득이 거의 없다.**
2. **실제 중복은 "공개 화면 계층"에 남아 있다.** GlobalHeader 어댑터 4개(684줄)와 MobileBottomNav 4개(969줄)가
   서비스별 사본으로 존재하며, 이 중 상당량이 **바이트 동일 또는 값만 다른 코드**다.
3. **Pharmacy-Hub 가 정답 형태를 이미 보여주고 있다.** `StoreOwnerShell.tsx`(84줄)는 Core(`StoreDashboardLayout`) + Config(`PHARMACY_HUB_STORE_CONFIG`)
   조합만으로 셸을 구성한다. 나머지 4서비스의 공개 계층을 이 형태로 수렴시키는 것이 이번 공통화의 목표 형태다.

---

## 2. 5개 서비스 현행 구조 비교표 (kpa-society 기준)

### 2-1. 진입 · 레이아웃 골격

| 축 | kpa-society (기준) | k-cosmetics | neture | pharmacy-hub |
|---|---|---|---|---|
| `App.tsx` 줄수 | 1,206 | 907 | 1,252 | **227** |
| lazy + Suspense | ✅ | ✅ | ✅ | ❌ (전량 eager) |
| 로딩 컴포넌트 | `PageLoader` (inline style + `LoadingSpinner`) | `PageLoading` (Tailwind, pink-600) | `PageLoading` (`Loading...` 텍스트) | 없음 |
| ErrorBoundary | `O4OErrorBoundary` | 동일 | 동일 | 동일 |
| Toast | `O4OToastProvider` | 동일 | 동일 | 동일 |
| 로그인 UX | 모달 (`LoginModalContext`) | 모달 (`LoginModalContext`) | 페이지 | 페이지 |
| 레이아웃 파일 수 | 1 (`layouts/MyPageLayout`) + `components/Layout.tsx` | 4 | **9** (Partner/Supplier 축 추가) | **1** (`StoreOwnerShell`) |

> `O4OErrorBoundary` · `O4OToastProvider` 는 이미 `@o4o/error-handling` 공용이다. **오류 UX 는 공통화 대상이 아니다(완료 상태).**

### 2-2. 메뉴 정의 위치 · 줄수

| 파일 | kpa | kcos || neture | pharmacy-hub |
|---|--:|--:|--:|--:|--:|
| `config/navigation.ts` (공개 헤더 메뉴) | 64 | 58 | 63 | 66 | **없음** |
| `config/operatorMenuGroups.ts` | 218 | 131 | 206 | 287 | **없음** |
| `config/operatorCapabilities.ts` | 18 | 25 | 31 | 16 | **없음** |
| `config/dashboard.ts` (로그인 후 진입) | 88 | 38 | 41 | 73 | **없음** (`config/service.ts` 로 대체) |
| `config/seoRegistry.ts` | ✅ | ❌ | ❌ | ✅ | ❌ |
| `config/productionTemplates.ts` | ❌ | ✅ | ✅ | ❌ | ❌ |
| GlobalHeader 어댑터 | 187 | 179 | 184 | 134 | **없음** |
| MobileBottomNav | 371 | 161 | 163 | 274 | **없음** |
| operator 레이아웃 wrapper | 47 | 40 | 40 | 39 | **없음** |
| MainLayout / Layout | 49 | 36 | 26 | 50 | 84 (`StoreOwnerShell`) |

### 2-3. 활성 메뉴 판정

| 계층 | 판정 주체 | 상태 |
|---|---|---|
| 공개 헤더 | `@o4o/ui` `GlobalHeader` 내부 `isActive(href, pathname)` — `href==='/'` 는 완전 일치, 그 외 `startsWith` | **이미 Core 단일 구현** |
| Operator 사이드바 | `@o4o/operator-ux-core` `DomainIASidebar` | **이미 Core 단일 구현** |
| Store 사이드바 | `@o4o/store-ui-core` `StoreSidebar` | **이미 Core 단일 구현** |
| Mobile bottom nav | **서비스별 사본** — `isStoreActive` / `isPharmacyActive` 등 이름만 다른 동일 로직 | **미공통 (유일한 잔여 축)** |

### 2-4. 브랜드 값 (순수 데이터)

| 서비스 | icon | name | subtitle | primaryColor |
|---|---|---|---|---|
| kpa-society | 💊 | KPA-Society | 약사 전문 플랫폼 | `#2563eb` |
| k-cosmetics | `<Sparkles/>` | K-Cosmetics | K-Beauty 전문 플랫폼 | `#db2777` |
| neture | 🌿 | Neture | 공급자·파트너 협업 플랫폼 | `#059669` |
| pharmacy-hub | `config/service.ts` `BRAND` | Pharmacy-Hub | — | — |

---

## 3. 발견한 중복의 실체 (근거)

### 3-1. `getUserDisplayName` — **4개 서비스 바이트 동일**

`KpaGlobalHeader` · `KCosGlobalHeader` · `NetureGlobalHeader` 에 같은 함수가 들어 있다
(차이는 인자 타입 `UserType` vs `any` 뿐).

```ts
function getUserDisplayName(user: any): string {
  if (!user) return '사용자';
  if (user.displayName) return user.displayName;
  if (user.lastName || user.firstName) { ... }
  if (user.name && user.name !== user.email) return user.name;
  if (user.email) return user.email.split('@')[0];
  return '사용자';
}
```

### 3-2. `filterContextualNav` — 4개 동일 본문, **KPA 만 분기 1개 누락**

kcos · neture 는 `if (vis.isAdminOrOperator) return items.map(...)` 단축 분기를 갖지만
**kpa 에는 없다.** 즉 동일 계약을 의도한 함수가 서비스마다 미세하게 어긋나 있다 — 공통화의 전형적 근거다.

### 3-3. `filterMenuByRole` — 4개 완전 동일 (각 ~12줄)

`operatorMenuGroups.ts` 안에 `interface UnifiedMenuItem extends OperatorMenuItem { adminOnly?: boolean }` 와 함께 4중 복제.

### 3-4. MobileBottomNav — **최대 중복**

- kpa(371) 과 neture(274) 는 더 풍부한 동일 구조를 공유한다 — `formatRelative`,
  `useState<'none'|'profile'|'notif'>` 시트 상태머신, ESC keydown, `useEffect(..., [pathname])` 자동 닫기,
  backdrop, 알림 시트, 프로필 시트 슬롯, 그리고 동일한 스타일 상수(`NAV_CLASS` · `navSafeArea` · `tabStyle` · `activeStyle` · `loginStyle` · `labelStyle` · `badgeStyle`).

### 3-5. 알림 배선 블록 — 4개 반복

`useNotifications(notificationsApi, { enabled, serviceKey })` + `<NotificationBell/>` (동일 7 props) + `handleNotificationClick`.

### 3-6. 미사용 공용 헬퍼

`@o4o/operator-ux-core` 의 `isAdminOrOperator(roles, prefix)` 가 존재하지만
**헤더 어댑터 4개 중 사용처 0**.
→ 신규 패키지가 아니라 **기존 헬퍼 채택**만으로 해소되는 중복이다.

---

## 4. 5축 분류

### 4-1. Core (동작·계약이 같아 그대로 공유 가능)

| 항목 | 현재 위치 | 이동 대상 | 근거 |
|---|---|---|---|
| `getUserDisplayName` | 4서비스 헤더 | **`@o4o/auth-utils`** | 4중 바이트 동일. auth-utils 가 이미 `normalizeUser` · `extractRoles` 를 보유 |
| Mobile bottom nav 셸 (safe-area · 시트 상태머신 · ESC · pathname 자동닫기 · backdrop · 스타일 상수 · `formatRelative`) | 4서비스 | **`@o4o/ui` layout** | `ResponsiveTabBar` 선례와 동일 성격(동작만 강제, 디자인 미강제). `MobileSafeArea` 도 이미 여기 있음 |
| `filterContextualNav` | 4서비스 `navigation.ts` | **`@o4o/ui` layout (GlobalHeader 인접)** | 본문 동일. 차이는 술어 키 이름뿐 → `visibility: Record<string, boolean>` 로 일반화 가능 |
| `filterMenuByRole` + `UnifiedMenuItem` | 4서비스 `operatorMenuGroups.ts` | **`@o4o/ui` operator-shell** | `OperatorMenuItem` · `OperatorGroupKey` 가 이미 거기 있음 |
| 알림 배선(`useNotifications` + `NotificationBell` props 세트) | 4서비스 헤더 | Core 후보이나 **§4-5 선행 정비 이후** | — |

### 4-2. Config (값만 다른 항목 — 서비스에 남기되 형식만 표준화)

브랜드(icon/name/subtitle/primaryColor) · `PUBLIC_NAV` / `CONTEXTUAL_NAV` 배열 · bottom nav 탭 정의 ·
`UNIFIED_MENU` · `ENABLED_CAPABILITIES` · `ROLE_LABELS` / `*_ROLE_PRIORITY` / `*_DASHBOARD_MAP` · 용어(매장/약국) · basePath.

> `config/dashboard.ts` 4개는 이미 `@o4o/auth-utils` `getPrimaryDashboardRoute` 를 감싸는 **순수 데이터**다.
> **추가 공통화 불필요 — 현재 형태가 정답이다.**

### 4-3. Extension (업무·권한·화면 구조가 실제로 다른 고유 기능)

| 항목 | 서비스 | 왜 Extension 인가 |
|---|---|---|
| 공급자·파트너 축 (`SupplierOpsLayout` · `PartnerSpaceLayout` 등 5) | neture | store-hub 축 자체가 없다 |
| 크레딧 잔액 뱃지 | kpa | 고유 도메인 |
| `productionTemplates.ts` | kcos | 제작 자산 도메인 (kpa/neture 무관) |
| `seoRegistry.ts` | kpa · neture | 공개 SEO 축 보유 서비스만 |

### 4-4. Local (불안정하거나 공통화 가치 낮음 — 그대로 둔다)

| 항목 | 이유 |
|---|---|
| `MainLayout` / `Layout` (26~50줄) | 3개 서로 다른 Footer(`common/Footer` · default import · `PublicLegalFooterInfo`), `children` vs `<Outlet/>` 차이. 합치면 줄어드는 코드보다 분기가 늘어난다 |
| operator 레이아웃 wrapper 4개 (39~47줄) | 이미 `OperatorAreaShell` 위의 얇은 껍질. 남은 차이가 곧 서비스 정체성 |
| `PageLoader` / `PageLoading` (5~7줄) | 디자인 토큰이 서비스별로 다름. 공통화 이득 < 토큰 주입 복잡성 |
| pharmacy-hub 의 eager 라우팅 | 규모가 작아 현재는 문제 아님. 라우트 증가 시 재판단 |

### 4-5. 선행 정비 (계약 불일치 — 공통화 전 또는 병행 정리 필요)

| # | 항목 | 상태 | 공통화 차단 여부 |
|---|---|---|:--:|
| S1 | — | 실 결함 | **차단 아님** (백엔드 축) — 단 독립 WO 필수 |
| S3 | 알림 targetUrl 해석 계약 2종 (SSOT 위임 vs 인라인) | 계약 불일치 | 알림 Core 화만 차단 |
| S4 | KPA `filterContextualNav` 의 `isAdminOrOperator` 단축 분기 누락 | 동작 미세 불일치 | 차단 아님 (Core 화 시 자동 수렴) |
| S5 | neture `OperatorLayoutWrapper` 가 `filterMenuByRole(UNIFIED_MENU, **false**)` 하드코딩 → `adminOnly: true` **21개 항목이 operator 화면에서 항상 숨겨짐** | 관찰 (의도일 수 있음) | 차단 아님 — 범위 밖, 보고만 |

---

## 6. 재사용 가능한 기존 공용 패키지 (신규 패키지 만들지 않는다)

| 패키지 | 이미 제공 중 | 이번에 확장할 부분 |
|---|---|---|
| `@o4o/ui` (`layout/`) | `GlobalHeader`(4슬롯·`isActive`) · `MobileSafeArea` · `ResponsiveTabBar` | **`ServiceBottomNav` 신규 컴포넌트** + `filterContextualNav` |
| `@o4o/ui` (`operator-shell`) | `OperatorMenuItem` · `OperatorGroupKey` · `STANDARD_GROUPS` | `filterMenuByRole` + `UnifiedMenuItem` |
| `@o4o/auth-utils` | `normalizeUser` · `extractRoles` · `getPrimaryDashboardRoute` · `hasAnyRole` | **`getUserDisplayName`** |
| `@o4o/operator-ux-core` | `OperatorAreaShell` · `DomainIASidebar` · `operatorDomainIA` · `isAdminOrOperator` | (S2) `ServiceKey` union 에 `neture` · `pharmacy-hub` 추가 |
| `@o4o/store-ui-core` | `StoreDashboardLayout` · `StoreSidebar` · `storeMenuConfig` 4서비스 | 변경 없음 (완료 상태) |
| `@o4o/error-handling` | `O4OErrorBoundary` · `O4OToastProvider` | 변경 없음 (완료 상태) |

**신규 패키지 필요성: 없음.** 4개 항목 전부 기존 패키지 확장으로 수용된다.

> ⚠️ 배포 함정 (기존 사례): `services/web-kpa-society/Dockerfile` 은 패키지를 **선별 COPY** 한다.
> 신규 패키지를 만들면 COPY 2줄 누락으로 빌드가 깨진다. **기존 패키지 확장 방식은 이 위험이 없다** —
> 이것도 신규 패키지를 만들지 않는 실무적 근거다.

---

## 7. 공통화하지 말아야 할 항목 (명시)

1. `MainLayout` / `Layout` 4종 — Footer 3종 차이가 곧 서비스 정체성. 통합 시 분기 증가.
2. operator 레이아웃 wrapper 4종 — 이미 얇다.
3. `PageLoading` / `PageLoader` — 디자인 토큰 차이.
4. userMenuItems 트리 — 역할·업무 의미가 다름 (Extension).
6. `UNIFIED_MENU` · `ENABLED_CAPABILITIES` — 이미 Config 로 올바르게 분리돼 있다. **Core 로 올리면 안 된다.**
7. **전 서비스를 한 번에 바꾸는 셸 프레임워크** — 만들지 않는다. 항목 단위로 옮긴다.

---

## 8. 첫 구현 권장 범위

### 권장: **G1 — `getUserDisplayName` → `@o4o/auth-utils` (최소 위험 착수점)**

| 항목 | 값 |
|---|---|
| 대상 | `@o4o/auth-utils` 1파일 추가 + 헤더 어댑터 4파일 import 교체 |
| 삭제 | 4×9줄 = **36줄** |
| 추가 | ~12줄 (Core 1곳) |
| 순감 | **-24줄**, 중복 정의 4 → 1 |
| 위험 | 거의 없음 — 순수 함수, UI/권한/route 무변경 |
| 검증 | typecheck + 4서비스 build + 로그인 후 헤더 표시명 실브라우저 확인 |

### 이어서: **G2 — `ServiceBottomNav` → `@o4o/ui` layout (최대 이득)**

| 항목 | 값 |
|---|---|
| 대상 | `@o4o/ui/layout/ServiceBottomNav.tsx` 신규 + 4서비스 사본 축소 |
| 현재 | 371 + 274 + 163 + 161 = **969줄** |
| 예상 후 | Core ~230줄 + 서비스별 탭/색/용어 Config 40~60줄 × 4 = **약 430~470줄** |
| 순감 | **약 -500줄** |
| 위험 | 중간 — 모바일 실기기 회귀 검증 필요 (safe-area · 시트 · ESC · 활성 판정) |
| 착수 순서 | — |

### 그다음: **G3 — `filterMenuByRole` · `filterContextualNav` 흡수**

- `filterMenuByRole`: 4×12줄 → Core 1곳. 순감 약 **-36줄**.
- `filterContextualNav`: 4×20줄 → Core 1곳 + 서비스는 술어 맵만 전달. 순감 약 **-50줄**. **KPA 의 누락 분기(S4)가 자동 수렴한다.**

### 합산 예상 (G1~G3)

| 지표 | 전 | 후 | 변화 |
|---|--:|--:|---|
| 중복 코드 총량 | 약 1,090줄 | 약 480줄 | **-610줄** |
| 동일 로직 정의 개수 | 함수 4종 × 4서비스 = 16 | 4 | **-12** |
| 서비스별 파일 수 | 변화 없음 (파일은 유지, 내용이 Config 로 축소) | | |
| 신규 패키지 | 0 | 0 | — |
| 신규 Core 파일 | — | 4 (`ServiceBottomNav` · `filterContextualNav` · `filterMenuByRole` · `getUserDisplayName`) | +4 |
| 공용 컴포넌트 내 서비스 분기(`if service ===`) | — | **0 (목표 · 초과 시 해당 항목 중단)** | |

**중단 기준(명문화):** 어느 항목이든 Core 안에 서비스 이름 분기가 1개라도 필요해지면 그 항목은 공통화하지 않고 Local 로 되돌린다.

---

## 9. 다음 구현 WO 제안

| 순위 | WO(안) | 성격 | 비고 |
|:--:|---|---|---|
| 1 | — | 인가 결함 수정 | F1 Frozen 패키지 + 권한 변경 → **명시 승인 필요**. §5-3 의 3단계 |
| 2 | `WO-O4O-SERVICE-HEADER-DISPLAYNAME-CORE-V1` | 공통화 G1 | 최소 위험 착수 |
| 3 | `WO-O4O-SERVICE-BOTTOM-NAV-CORE-V1` | 공통화 G2 | — |
| 4 | `WO-O4O-SERVICE-NAV-FILTER-CORE-V1` | 공통화 G3 | S4 동시 해소 |
| 5 | `WO-O4O-OPERATOR-UX-CORE-SERVICEKEY-EXTENSION-V1` | 선행 정비 S2 | 5서비스 공용 config 계층을 쓸 때 필요 |
| — | (보고만) S3 알림 targetUrl 계약 · S5 neture adminOnly 21건 | 관찰 | 별도 판단 필요 |

---

## 10. 중지 조건 점검

| 조건 | 해당 |
|---|:--:|
| WO 범위 밖 파일 수정 필요 | ❌ — 본 작업은 read-only, 수정 0 |
| DB schema · migration · 데이터 변경 필요 | ❌ |
| dependency · lockfile 변경 필요 | ❌ |
| Core · Frozen Baseline 변경 필요 | — |
| 권한 · route · API contract 변경 필요 | ⚠️ — 동일. 조사만 하고 분리 |

---

## 11. Git 상태

| 항목 | 값 |
|---|---|
| 시작 HEAD | `8750e090f` (clean, `HEAD == origin/main`) |
| 제품 코드 변경 | **0 파일** |
| 신규 파일 | 본 CHECK 문서 1개 |

---

## 12. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 5건 (§9)
