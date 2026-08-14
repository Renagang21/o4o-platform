# CHECK-O4O-PHARMACY-HUB-SUPPLIER-SHELL-COMMON-CORE-ADOPTION-V1

> WO: `WO-O4O-PHARMACY-HUB-SUPPLIER-SHELL-COMMON-CORE-ADOPTION-V1`
> 작업일: 2026-08-13
> worktree: `C:\tmp\o4o-agent-e-operator-common` · 브랜치: `work/operator-commonization-v1`

---

## 0. 결과 요약

| # | 완료 기준 | 결과 |
|:-:|---|:---:|
| 1 | 기존 Supplier 전용 공통 Shell 조사 선행 | PASS (§2 — **재사용 가능한 공통 Supplier Shell 없음**) |
| 2 | 가장 적합한 기존 Core 채택 / 없으면 thin wrapper | PASS (WO 작업순서 3 적용) |
| 3 | `/supplier` · `/supplier/products` nested route 정리 · URL 무변경 | PASS |
| 4 | 서비스별 supplier menu/config 추가 | PASS (`config/supplierMenu.ts`) |
| 5 | `MembershipGate` · supplier 권한 정책 보존 | PASS (§5) |
| 6 | `RoleEntryPage` · 상품 페이지 업무 로직 · API/DB 계약 무변경 | PASS |
| 7 | type-check / build | PASS |
| 8 | 브라우저 smoke (실 로그인 · 프로덕션 API) | PASS |

**종합: PASS.** API/DB 변경 0 · **공통 패키지(`packages/**`) 변경 0건** · 타 서비스 변경 0건.

---

## 1. 변경 파일 (4건 · 전부 `services/web-pharmacy-hub`)

| 파일 | 변경 |
|---|---|
| `src/layouts/SupplierShell.tsx` | 신규 — `MembershipGate` + 공급자 헤더/사이드바 + `<Outlet/>` |
| `src/components/supplier/SupplierHeader.tsx` | 신규 — h-14 sticky (operator/store 영역과 상단 높이 정렬) |
| `src/config/supplierMenu.ts` | 신규 — `SUPPLIER_MENU_SECTIONS` (레이아웃과 메뉴 분리) |
| `src/App.tsx` | `/supplier` 2개 라우트를 부모+nested 로 재배치 · 미사용 `MembershipGate` import 제거 |

---

## 2. 조사 결과 — 공통 Supplier Shell 은 존재하지 않는다

WO 작업순서 1·2 에 따라 4개 서비스와 공통 package 를 먼저 조사했다.

| 대상 | 실측 |
|---|---|
| `packages/**` | supplier layout/shell/sidebar **0건** (`find` 결과 없음) |
| KPA-Society | 공급자 영역 **없음** — `/supplier/event-offers` 단일 페이지가 공용 `Layout` 사용 |
| K-Cosmetics | `supplier/*` → `RoleNotAvailablePage` (미제공 역할) |
| Neture | `SupplierSpaceLayout` (385줄) · `SupplierOpsLayout` (234줄) — **서비스 전용**. Neture 헤더/BottomNav/role 상수 하드코딩, package 아님 |

### 2-1. 기존 Core 재사용 가능성 판정

| 후보 | 판정 | 근거 |
|---|:---:|---|
| `OperatorAreaShell` (@o4o/operator-ux-core) | **부적합** | `DomainIASidebar` + `OperatorGroupKey` / `OperatorCapability` 라는 **운영자 도메인 어휘**에 결합. 공급자 메뉴를 운영자 capability 로 위장해야 함 = WO 가 금지한 "무리한 재사용" |
| `StoreDashboardLayout` (@o4o/store-ui-core) | **부적합** | 구조는 범용이나 `StoreSidebar` 가 `내 매장 관리` / `{조직명} 매장` 을 **prop 으로 덮을 수 없게 하드코딩**(StoreSidebar.tsx:201). 공급자에게 "내 매장 관리" 노출됨. 수정하려면 4개 서비스가 소비하는 공통 패키지 변경 필요. 또한 store-ui-core 는 Store Layer(**F3 Freeze**) 자산이라 공급자 주체를 얹는 것은 계층 경계 drift |
| `AGAppLayout` (@o4o/ui) | **부적합** | 서비스 중립이지만 **실 소비처 0건**(export 만 존재). 검증되지 않은 구조를 첫 도입하는 위험 |

→ WO 작업순서 3 적용: **최소 구조만 갖춘 서비스 thin wrapper**.

### 2-2. 이후 공통화를 위한 설계

- 레이아웃 골격(container `max-w-[1400px]` · `flex-col lg:flex-row lg:gap-6` · sticky sidebar · `main flex-1 min-w-0`)은
  공통 `OperatorAreaShell` 과 **동일한 클래스 규격**을 따랐다. 공통 Supplier Shell 이 생기면 교체가 기계적이 된다.
- 메뉴를 레이아웃이 소유하지 않는다 — `config/supplierMenu.ts` 가 소유하고 Shell 은 데이터만 읽는다.
  공통 Shell 등장 시 이 config 를 주입하는 것으로 편입이 끝난다.

---

## 3. URL 보존

| URL | 이전 | 이후 |
|---|---|---|
| `/supplier` | `MembershipGate > RoleEntryPage` | `SupplierShell > index: RoleEntryPage` |
| `/supplier/products` | `MembershipGate > SupplierProductsPage` | 동일 shell 하위 `products` |

주소·화면 컴포넌트·페이지 내부 로직 무변경. redirect 신설 0.

> `App.tsx` 의 `MembershipGate` **직접 사용처가 0** 이 되어 import 를 제거했다(typecheck TS6133).
> 게이트가 사라진 것이 아니라 3개 셸(`SupplierShell` / `OperatorLayoutWrapper` / `StoreOwnerShell`)
> **내부로 이동**한 것이며, 모든 역할 영역이 셸로 편입되었다는 뜻이다 — 실측으로 커버리지 확인(§5).

---

## 4. 검증 — type-check / build

| 명령 | 결과 |
|---|---|
| `pnpm --filter pharmacy-hub-web type-check` | PASS (`tsc -b` 오류 0) |
| `pnpm --filter pharmacy-hub-web build` | PASS (`✓ built in 14.72s`) |

> **공통 package 변경 0건**이므로 타 서비스 build/type-check 는 조건부 항목(WO 검증 5번)에 해당하지 않아 수행하지 않았다.
> `git status` 로 `packages/` 변경 0건을 실측 확인했다.

---

## 5. 브라우저 smoke (실 브라우저 · 프로덕션 API)

`vite preview` (port 5173) + `https://api.neture.co.kr` 실 API.
계정: `sohae2100@gmail.com` (pharmacy-hub membership **active**, role = `pharmacy-hub:operator`).

| # | 확인 | 결과 |
|:-:|---|:---:|
| 1 | 미인증 `/supplier` → "로그인이 필요합니다" 안내, **셸 미노출** (MembershipGate 선행) | PASS |
| 2 | 로그인 후 `/supplier` → 헤더(Pharmacy-Hub · 공급자 뱃지 · 사용자명 · 홈 · 로그아웃) 렌더 | PASS |
| 3 | 사이드바 = `공급자 홈` + `상품 공급 > 상품 제공 설정` (데드링크 0) | PASS |
| 4 | `/supplier` index = 기존 `RoleEntryPage` 그대로 (역할 미부여 안내·후속 기능 목록 동일) | PASS |
| 5 | 사이드바로 `/supplier/products` 이동 · URL 유지 · 활성 하이라이트 이동 | PASS |
| 6 | `/supplier/products` **직접 URL 진입**(deep link) 정상 — 셸 안에서 렌더 | PASS |
| 7 | 상품 페이지 기존 UI(전체/제공 중/미제공 탭 · 검색 · 테이블 7컬럼) 회귀 없음 | PASS |
| 8 | desktop(1440) 좌측 컬럼 · mobile(<1024) 상단 가로 바 전환 | PASS |
| 9 | `/operator/memberships` 회귀 없음 (직전 WO 영역) | PASS |

### 5-1. supplier 권한 정책 — 회귀 없음 (중요)

`/supplier/products` 에서 상품 목록이 비어 있고 `상품 목록을 불러오지 못했습니다.` 가 표시된다.
네트워크 실측 결과 **원인은 backend 권한 경계이며 본 WO 변경과 무관**하다:

```text
GET /api/v1/auth/me                                  => 200
GET /api/v1/pharmacy-hub/supplier/products?page=1&limit=20 => 403
```

이 계정은 `pharmacy-hub:supplier` role 이 없어 backend guard 가 403 을 반환한다(설계대로).
프론트 가드(`MembershipGate`)는 membership 축만 보므로 화면 진입은 되고, **실제 권한 경계는
backend 가 강제**한다 — 기존과 동일한 구조다. 권한 체계는 변경하지 않았다.

### 5-2. 검증하지 못한 것 (명시)

- **공급자 role 을 가진 계정의 상품 목록 정상 로드는 검증하지 못했다.**
  `docs/local/TEST-ACCOUNTS.local.md` 에 Pharmacy-Hub **공급자 계정이 없다**(operator/admin/store_owner 3종만 존재).
  role 부여는 운영 데이터 write 이자 권한 체계 변경이라 본 WO 범위 밖이다.
- 상품 제공 시작/중지 등 **write 동작은 실행하지 않았다** (역할 없음 + 되돌릴 수 없는 운영 write).
- 단, 상품 페이지 컴포넌트·API 호출 코드는 **무변경**이며 셸 편입은 라우트 중첩만 바꾼다.

---

## 6. 하지 않은 것 (WO 제외 범위 준수)

신규 공급자 기능 추가 / 상품 업무 화면 자체 공통화 / 권한 체계 변경 /
Operator Shell 재사용 / KPA·K-Cosmetics·Neture 수정 / 공통 패키지 수정 — **전부 미수행**.

---

## 7. 관찰 (수정하지 않음)

- 직전 WO 의 `OperatorHeader`(h-14) 와 공통 `OperatorAreaShell` 기본 `sidebarTopOffset='top-20'` 이
  24px 어긋난다(겹침 없음 · 기능 영향 없음). 본 WO 는 `/supplier` 범위라 손대지 않았다.
  `SupplierShell` 은 자체 sidebar 라 `lg:top-14` 로 헤더 높이에 맞췄다.
- `SupplierHeader` 는 `OperatorHeader` 와 구조가 거의 같다(뱃지·아이콘·brand 링크만 다름).
  서비스 안 공통 `RoleAreaHeader` 로 합칠 여지가 있으나, 직전 WO 에서 브라우저 smoke 로 검증된
  operator 영역 파일을 이번 범위(`/supplier`) 밖에서 고치지 않기 위해 그대로 두었다.

---

## 8. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
