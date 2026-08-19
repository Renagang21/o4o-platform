# CHECK — WO-O4O-MY-STORE-UNIFIED-SCREEN-ARCHITECTURE-AND-ADOPTION-V1

- **작성일**: 2026-08-19
- **대상**: KPA-Society / K-Cosmetics / GlycoPharm / Pharmacy-Hub 의 "내 매장" 화면 전체
- **작업 기준 커밋**: `fcd837ec0` (main)
- **성격**: 화면 골격(Shell/Layout/Navigation/Home/Page structure) 재조사 + 공통 Shell 확정 + 4서비스 채택

---

## 1. 조사 범위 (§2)

| 서비스 | 내 매장 진입 | Shell wrapper | basePath |
|---|---|---|---|
| KPA-Society | `/store` | `KpaStoreLayoutWrapper` (App.tsx) | `/store` |
| K-Cosmetics | `/store` | `StoreLayoutWrapper` (App.tsx) | `/store` |
| GlycoPharm | `/store` | `StoreLayoutWrapper` (App.tsx) | `/store` |
| Pharmacy-Hub | `/store-owner` | `StoreOwnerShell` (layouts/) | `/store-owner` |

**Neture 제외 판정**: `services/web-neture` 에는 매장 경영자용 "내 매장" 영역이 없다.
`/seller/*` 는 Neture 판매자(공급 카탈로그·주문) 축이고, storefront/kiosk 는 소비자 축이다.
→ WO §2 의 "실제 매장 경영자 My Store 가 존재하는 경우에만" 조건에 해당하지 않아 **OUT_OF_SCOPE**.

---

## 2. Census 결과 (§4)

route → page component → 파일 → 공통 패키지 사용 여부를 App.tsx 라우트 트리에서 기계 산출했다
(기존 WO 목록이 아니라 **현재 코드 전체**가 모집단이다).

| 서비스 | 내 매장 route 수 | 화면(component) | 공통 View 채택 | helper 만 사용 | 서비스 로컬 |
|---|---:|---:|---:|---:|---:|
| KPA | 77 | 51 | 14 | 3 | 34 |
| K-Cosmetics | 43 | 32 | 21 | 1 | 10 |
| GlycoPharm | 47 | 38 | 22 | 0 | 16 |
| Pharmacy-Hub | 63 | 49 | 6 | 0 | 43 |

- "공통 View 채택" = `@o4o/store-ui-core` 의 View/Manager/Shell 컴포넌트를 렌더하는 adapter 화면.
- "helper 만 사용" = `GuideBackLink` 등 보조 요소만 import (구조 채택 아님) —
  KPA `StoreSignagePage`(2289L) · `StoreQRPage`(2067L) · `StorePopPage`(1085L), KCos `StoreSignagePage`(394L).
- KPA/PH 수치에는 같은 App.tsx 에 선언된 공개 landing(`/qr/:slug` 등)이 포함된다.

### 메뉴 ↔ route 정합 (§14)

`storeMenuConfig` 의 4 서비스 메뉴 항목 **92개** (KPA 25 / KCos 24 / GP 27 / PH 16) 전부에 대해
`basePath + subPath` 대응 route 존재를 기계 검증했다 → **dead link 0**.

---

## 3. 분류 (§5)

| 분류 | 건수 | 내용 |
|---|---:|---|
| FULLY_COMMON | 4 축 | Shell/Layout · Navigation(Sidebar/TopBar) · 메뉴 config · Home 파트 — 4서비스 전부 공통 |
| CORE_ONLY | 0 | 공통 Core 는 있으나 미채택인 **골격** 요소 없음 (본 WO 에서 Shell 잔여 3건 제거) |
| VIEW_DUPLICATED | 4 (기능 화면) | KPA QR/Signage/POP + KCos Signage — 공통 View 가 있으나 로컬 대형 구현 유지 |
| SERVICE_SPECIFIC | 다수 | 설정/정책·매장 프로필·채널·주문 워크테이블 등 실제 업무 차이 화면 |
| NOT_IMPLEMENTED | — | 서비스별 미구현 메뉴는 config 에서 제외되어 노출되지 않음(dead link 0) |
| OUT_OF_SCOPE | Neture 전체 | §1 판정 참조 |

---

## 4. 확정 아키텍처 (§6·§7)

**기존 공통 자산을 그대로 쓴다. 새 골격 컴포넌트를 발명하지 않는다.**

| 역할 | 정본 | 상태 |
|---|---|---|
| Shell | `@o4o/store-ui-core` **`MyStoreShell`** (신규, 본 WO) | 4서비스 채택 |
| Layout | `StoreDashboardLayout` | 기존 공통 (변경 없음) |
| Navigation | `StoreSidebar` / `StoreTopBar` + `storeMenuConfig` 단일 파일 | 기존 공통 |
| 메뉴 가시성 | `resolveStoreMenu` + `MENU_CAPABILITY_MAP` | Shell 내부로 흡수 |
| Home | `StoreHomeShell` / MetricGrid / SignalList / ActivityPanel / ShortcutGrid / StatusCard | 4서비스 채택 확인 |
| 기능 화면 | `store-ui-core` 의 View + 서비스 adapter | 위 census 표 |

### MyStoreShell 계약

```
config, fetchCapabilities?, header?, footer?, banner?, below?,
userName, userInitial?, orgName?, homeLink?, onLogout?, navItems?, serviceLabel?, serviceBadge?, topBarRight?
```

- 서비스 차이는 **slot + config** 로만 주입한다. Shell 내부에 `if (serviceKey === ...)` 분기 없음.
- `hideTopBar` 는 prop 이 아니라 `header` slot 주입 여부에서 파생 — 외부 GlobalHeader 를 쓰는 서비스는 자동으로 TopBar 미표시.
- `fetchCapabilities` 미주입 시 capability 호출을 하지 않는다 → Pharmacy-Hub 기존 동작 보존.
- `header`/`below` 가 없으면 외곽 `div` 를 만들지 않는다 → 기존 DOM 구조 보존.

---

## 5. 채택 결과 (§8~§10·§12)

| 대상 | 변경 |
|---|---|
| `packages/store-ui-core/src/layout/MyStoreShell.tsx` | 신규 — Shell + `useStoreCapabilities` |
| `packages/store-ui-core/src/index.ts` | export 추가 |
| `services/web-kpa-society/src/App.tsx` | wrapper → `MyStoreShell` (header/footer/below/orgName slot) |
| `services/web-k-cosmetics/src/App.tsx` | wrapper → `MyStoreShell` (header/footer slot) |
| `services/web-glycopharm/src/App.tsx` | wrapper → `MyStoreShell` (header/banner/footer slot) |
| `services/web-pharmacy-hub/src/layouts/StoreOwnerShell.tsx` | `StoreDashboardLayout` → `MyStoreShell` (가드 2단 불변) |
| `services/web-{kpa-society,k-cosmetics,glycopharm}/src/hooks/useStoreCapabilities.ts` | **삭제** — byte-identical 3중 복제 |

제거된 중복: 동일 골격 배선 3벌 + 동일 hook 3벌. 남은 서비스 코드는 slot·config 주입뿐이다.

Navigation(§8)·Home(§9) 은 이미 공통 정본을 4서비스가 채택하고 있어 **추가 변경 없음**(재확인만).

---

## 6. SERVICE_NEUTRAL_BACKCOMPAT 5곳 판정 (§11)

실제 frontend 소비처를 코드에서 확인한 결과다. membership 우선순위 등으로 서비스를 추정하지 않았다.

| # | 중립 mount | 실제 소비처 | 판정 |
|---|---|---|---|
| 1 | `/api/v1/store` ← `createStoreTabletRoutes` | KPA·KCos·GP 3서비스 프론트가 모두 중립 경로 호출 (PH 는 이미 자체 scoped mount) | **유지** — 실제 다중 서비스 공유. 조직 해석 축의 service-scoped 이관은 별도 WO |
| 2 | `/api/v1/store` ← `createStoreLibraryRoutes` | **frontend 호출 0건**. KCos=`/cosmetics/pharmacy/library`, GP=`/glycopharm/pharmacy/library`, KPA=`/store/assets` 사용 | **은퇴 후보** — 트래픽 확인 후 별도 WO |
| 3 | `/api/v1/store/products` ← `createStoreProductLibraryController` | KPA(`o4oStandardProducts.ts`) + Neture(`lib/api/store.ts`) 2서비스 | **유지** — 실제 공유 경로 |
| 4 | `/api/v1/products` ← `createProductAiRecommendationRouter` | **frontend 호출 0건** (`/recommend`, `/recommend/store` 소비처 없음) | **은퇴 후보** — 별도 WO |
| 5 | `seller.controller` 의 `resolveStoreAccess` | mount = `/api/v1/neture/seller` (중립 경로 아님), 소비처 = web-neture 단독 | **유지** — 서비스 컨텍스트가 이미 Neture 단일 |

본 WO 에서는 backend mount 를 변경하지 않았다(§15 "대규모 backend refactor" 회피, §16 API breaking change 회피).

---

## 7. 검증 (§17)

| 항목 | 결과 |
|---|---|
| 공통 패키지 빌드 (`pnpm run build:packages`) | PASS |
| `@o4o/web-kpa-society` production build (`tsc && vite build`) | PASS |
| `@o4o/web-k-cosmetics` production build | PASS |
| `glycopharm-web` production build | PASS |
| `pharmacy-hub-web` production build | PASS |
| frontend tests | 해당 없음 — 4서비스에 test script 없음 |
| api-server Jest | 해당 없음 — backend 무변경 |
| 메뉴 ↔ route dead link | 92/92 PASS (0건) |

브라우저 검증(§13)은 배포 후 절에 기록한다.

---

## 8. 잔여 (§18 근거 있는 잔여)

골격(Shell/Layout/Navigation/Home) 잔여는 **0** 이다. 아래는 **기능 화면** 잔여이며 본 WO 범위(화면 골격) 밖이다.

| 잔여 | 규모 | 사유 |
|---|---|---|
| KPA `StoreSignagePage`(2289L) · `StoreQRPage`(2067L) · `StorePopPage`(1085L) · `StoreTabletDisplaysPage`(1877L) · `StoreChannelsPage`(1521L) | 대형 원본 | 공통 View 대비 기능 상위집합. 채택 시 업무 의미 훼손 위험 → 화면별 별도 WO |
| PH `QrPage`(617L) · `PopPage`(458L) · `SignagePage`(420L) · `TabletsPage`(400L) · `LibraryResourcesPage`(383L) | 로컬 구현 | PH 는 계약(`/pharmacy-hub/*`)이 별도. 공통 View 채택은 API 주입 seam 선행 필요 |
| 서비스 로컬 페이지의 PageHeader/Section/상태뷰 | 4서비스 146개 파일 | 공통 View 내부는 이미 표준. 로컬 페이지는 `@o4o/ui` `AGPageHeader`/`AGSection` 채택을 별도 WO 로 권고(신규 컴포넌트 신설 금지) |

---

## 9. 후속 WO 제안

1. `WO-O4O-STORE-NEUTRAL-MOUNT-RETIREMENT-V1` — §6 표의 2·4번(소비처 0) 은퇴
2. `WO-O4O-STORE-TABLET-SERVICE-SCOPED-ORG-RESOLUTION-V1` — §6 표 1번 조직 해석 축 이관
3. `WO-O4O-MY-STORE-LOCAL-PAGE-HEADER-ADOPTION-V1` — 로컬 페이지 `AGPageHeader`/`AGSection` 채택

---

## 10. 배포 후 브라우저 검증 (§13)

- **검증 시각**: 2026-08-19 · **배포 커밋**: `69dfb6f53` (Deploy Web Services (Cloud Run) = success)
- **계정**: 매장 경영자 계정 1개 (`docs/local/TEST-ACCOUNTS.local.md`) — 자격증명은 어떤 산출물에도 기록하지 않았다.
- **방식**: Playwright chromium (headless), 실제 프로덕션 도메인 로그인 → 각 서비스 메뉴 config 의 **전 항목** 순회.

| 서비스 | 도메인 | 메뉴 항목 | desktop 1440 | mobile 390 |
|---|---|---:|:---:|:---:|
| KPA-Society | `kpa-society.co.kr` | 25 | 25/25 PASS | 25/25 PASS |
| K-Cosmetics | `k-cosmetics.site` | 24 | 24/24 PASS | 24/24 PASS |
| GlycoPharm | `glycopharm.co.kr` | 27 | 27/27 PASS | 27/27 PASS |
| Pharmacy-Hub | `pharmacyhub.co.kr` | 16 | 16/16 PASS | 16/16 PASS |
| **합계** | | **92** | **92/92** | **92/92** |

판정 기준별 결과 (4서비스 × 2뷰포트 전수):

| 기준 | 결과 |
|---|---|
| white screen (본문 텍스트 40자 미만) | **0** |
| JS exception (`pageerror`) | **0** |
| dead link (메뉴 → route 미존재) | **0** |
| 메뉴 접근 불가 (nav 미렌더) | **0** — 전 화면에서 `nav/aside` 렌더 확인 |
| horizontal overflow | 매장 화면 **0** (아래 주석 1건 예외) |
| 콘텐츠 잘림 | 관측 없음 |

**주석 — GlycoPharm 모바일 39px overflow(본 WO 원인 아님)**

`glycopharm.co.kr` 모바일 390px 에서 `scrollWidth 429` 가 관측됐다. 원인 요소는
class 없는 폭 119px `BUTTON` 이며 **로그인 전 공개 홈 `/` 에서도 동일하게 재현**된다.
같은 Shell 안의 `/store/products` 는 overflow 0 이다.
→ Shell/Layout 이 아니라 전역에 얹히는 요소(위젯)의 문제다. 본 WO 범위 밖이며 별도 확인 대상으로 보고만 한다.

**주석 — K-Cosmetics 도메인**

프로덕션 도메인은 `k-cosmetics.site` 다 (`VITE_SERVICE_URL_K_COSMETICS`, deploy-web-services.yml:47).
과거 CHECK 기록물 일부에 나오는 `k-cosmetics.co.kr` 은 현재 404 를 반환하는 별개 주소다.
기록물은 §16 정비 대상이 아니므로 수정하지 않고 여기 사실만 남긴다.
