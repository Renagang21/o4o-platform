# CHECK-PHARMACY-HUB-STORE-SHELL-AND-MENU-CONFIG-V1

> WO: `WO-PHARMACY-HUB-STORE-SHELL-AND-MENU-CONFIG-V1` (W3 — Pharmacy-Hub 매장 셸·사이드바·메뉴)
> 작업일: 2026-08-05
> 커밋: `f39b34f4b` — `feat(pharmacy-hub): add store owner shell and menu`
> 브랜치: `main` (직접 작업)

---

## 0. 결과 요약

| # | 완료 기준 | 결과 |
|:-:|---|:---:|
| 1 | `/store-owner` 가 공통 매장 셸(StoreDashboardLayout) 기반으로 렌더 | PASS |
| 2 | 사이드바 4개 메뉴(홈/공급 상품/장바구니/주문 내역) 정상 동작 | PASS |
| 3 | 기존 B2B 기능(상품·장바구니·주문·결제) 회귀 0 | PASS |
| 4 | dead link 0 · "준비 중" 메뉴 0 | PASS |
| 5 | 권한 경계 정상 (미로그인·비매장·타서비스) | PASS |
| 6 | KPA / GlycoPharm / K-Cosmetics 회귀 0 | PASS |
| 7 | 배포 + 프로덕션 브라우저 smoke | PASS |
| 8 | CHECK 작성 · commit · push | PASS |

**종합: PASS**

DB schema 변경 0 · migration 0 · backend 계약 변경 0 · 결제 실거래 0.

---

## 1. 재사용한 공통 컴포넌트

| 패키지 | 사용 대상 | 비고 |
|---|---|---|
| `@o4o/store-ui-core` | `StoreDashboardLayout` · `StoreSidebar` · `StoreTopBar` · `StoreOwnerGuard` · `PHARMACY_HUB_STORE_CONFIG` | 셸 본체 — Pharmacy-Hub 전용 사본 생성 0 |
| `@o4o/error-handling` | `O4OErrorBoundary` · `O4OToastProvider` | App 루트 오류 경계 · Toast |
| `@o4o/ui` | (의존 체인 — store-ui-core 경유) | dist-mode 라 Docker 빌드 단계 추가 |
| `@o4o/operator-ux-core` | (의존 체인 — store-ui-core 경유) | source-mode |

**공통 패키지 변경은 전부 additive** — 기존 소비처(KPA / GlycoPharm / K-Cosmetics) 코드 경로 무변경:

| 파일 | 변경 |
|---|---|
| `packages/store-ui-core/src/config/storeMenuConfig.ts` | `PHARMACY_HUB_STORE_CONFIG` 신규 추가 (기존 3 config 무변경) |
| `packages/store-ui-core/src/index.ts` | 신규 config export 1줄 |
| `packages/store-ui-core/src/components/StoreSidebar.tsx` | `SECTION_ICONS` 에 `cart` · `purchase-orders` 키 **추가만**. 기존 `orders`(ShoppingCart) 매핑 무변경 |
| `packages/store-ui-core/src/auth/StoreOwnerGuard.tsx` | `StoreOwnerServiceKey` union 확장 + `SERVICE_ROLES['pharmacy-hub']` 추가. 기존 3 엔트리 무변경 |

`StoreOwnerGuard` 의 `pharmacy-hub` 엔트리는 `membershipStoreOwnerRole: null` —
매장 경영자 판정은 `role_assignments` 단일 소스(RBAC F9)를 따르고, 가입 상태
(active/pending/rejected) 판정은 서비스 wrapper 의 `MembershipGate` 가 담당한다.

---

## 2. 최종 라우트·메뉴 구조

### 2-1. 라우트 (URL 전부 기존과 동일 — 변경 0)

```
/store-owner                        StoreOwnerShell (Guard + MembershipGate + 공통 Layout)
  ├ (index)                         매장 경영 홈          [메뉴: 홈]
  ├ /products                       공급 상품 목록        [메뉴: 공급 상품]
  ├ /products/:offerId              공급 상품 상세
  ├ /cart                           장바구니              [메뉴: 장바구니]
  ├ /orders                         주문 내역             [메뉴: 주문 내역]
  └ /orders/:orderId                주문 상세
/store-owner/payment                StoreOwnerShell(requireStoreOwnerRole=false)
  ├ (index)                         결제                  [메뉴 미노출 — deep route]
  ├ /success                        PG 성공 callback
  └ /fail                           PG 실패 callback
```

React Router v7 은 정적 세그먼트가 더 구체적인 `/store-owner/payment` 를
`/store-owner` 보다 우선 매칭하므로 두 부모 라우트는 충돌하지 않는다.
`/store` 로의 강제 변경 없음 · redirect 신설 없음 · 이중 운영 없음.

### 2-2. 결제 서브트리를 Guard 밖에 둔 이유 (설계 근거)

`services/web-pharmacy-hub/src/pages/LoginPage.tsx` 는 `location.state.from` / returnUrl 을
복원하지 않는다(로그인 후 `/join/status` 또는 `/` 로 이동). 따라서 결제 callback 라우트에
`StoreOwnerGuard` 를 걸면 미인증 시 `<Navigate to="/login">` 가 발생하며 **PG 가 실어 보낸
`paymentKey` / `orderId` / `amount` 쿼리 파라미터가 소실**된다.

기존 구현은 `MembershipGate`(navigate 하지 않고 같은 URL 에서 Notice 렌더)를 사용해
이를 회피하고 있었다. 본 WO 는 이 동작을 그대로 보존한다 — 셸(사이드바·상단바)은
동일하게 렌더하되 role guard 만 적용하지 않는다.

> 후속 정리 후보(범위 밖): LoginPage 의 returnUrl 복원 지원. 구현되면 결제 서브트리도
> 동일 guard 로 통일할 수 있다.

### 2-3. 메뉴 (사이드바 — 4개)

| 섹션 | 메뉴 | 경로 | 라우트 존재 |
|---|---|---|:---:|
| (라벨 없음) | 홈 | `/store-owner` | ✅ |
| 약국 상품·거래 | 공급 상품 | `/store-owner/products` | ✅ |
| 약국 상품·거래 | 장바구니 | `/store-owner/cart` | ✅ |
| 약국 상품·거래 | 주문 내역 | `/store-owner/orders` | ✅ |

- **route 없는 메뉴 0** — 4개 전부 실제 라우트·실기능 보유
- **접근 경로 없는 실기능 0** — 결제는 장바구니→주문→결제 흐름의 deep route 로만 진입(설계대로)
- **"준비 중" 표기 0** — `/store-owner` 의 `RoleEntryPage`(plannedFeatures 나열) 제거
- **KPA 전용 메뉴 0** — 매장 정보/취급 상품/콘텐츠/QR/POP/태블릿 등 미구현 영역 메뉴 미생성

---

## 3. 기존 B2B 화면 편입 결과

| 화면 | 편입 방식 | 컴포넌트 변경 |
|---|---|:---:|
| 공급 상품 목록 `ProductsPage` | 셸 `<Outlet/>` 하위 nested route | 없음 |
| 공급 상품 상세 `ProductDetailPage` | 동일 | 없음 |
| 장바구니 `CartPage` | 동일 | 없음 |
| 주문 내역 `OrdersPage` | 동일 | 없음 |
| 주문 상세 `OrderDetailPage` | 동일 | 없음 |
| 결제 `PaymentPage` / `PaymentSuccessPage` / `PaymentFailPage` | 결제 부모 라우트 하위 nested route | 없음 |

기존 페이지 6개 + 결제 3개 = **9개 화면 모두 컴포넌트 본문 무수정**. `MembershipGate` 개별
래핑은 셸의 단일 게이트로 승격되어 중복이 제거되었다(동작 동일).

신규 파일:
- `services/web-pharmacy-hub/src/layouts/StoreOwnerShell.tsx`
- `services/web-pharmacy-hub/src/pages/store-owner/HomePage.tsx`

---

## 4. 최소 홈 화면

| 항목 | 표시 | 원천 |
|---|---|---|
| 계정 표시명 / 이메일 | ✅ | AuthContext `user` (`/auth/me`) |
| 가입 상태 뱃지 (이용 중/승인 대기/반려…) | ✅ | 기존 `GET /pharmacy-hub/join/status` |
| 역할 · 승인 일시 | ✅ | 동일 |
| 공급 상품 / 장바구니 / 주문 내역 바로가기 | ✅ | 정적 링크 |
| 상세 통계 · 최근 활동 | ✖ (W4) | — |

**약국명(사업자 상호)·매장 프로필명은 표시하지 않았다.** 현재 Pharmacy-Hub API 계약이
해당 값을 노출하지 않으며, 신규 endpoint 신설·backend 계약 변경은 본 WO 의 변경 금지
항목이다. W4(매장 대시보드)에서 매장 프로필 조회와 함께 다룬다.

조회 실패는 정상 0건으로 삼키지 않는다 — `join/status` 실패 시 "상태 조회 실패" 를
명시 표기한다(O4O load-error 계약 정렬).

---

## 5. 권한 검증

| 케이스 | 기대 | 결과 |
|---|---|:---:|
| PH `store_owner` 보유 + membership active → `/store-owner` | 셸 진입 | PASS — 프로덕션 실계정 세션 (§7-1~7-11) |
| 미로그인 → `/store-owner` | `/login` 이동 | PASS (로컬 preview + 프로덕션) |
| 미로그인 → `/store-owner/payment/success?paymentKey=…&orderId=…` | **같은 URL 유지** + 로그인 안내 | PASS — 쿼리 파라미터 보존 확인 |
| PH `store_owner` 미보유 (타서비스 store_owner 단독) | 셸 진입 불가 (`/` 로 이동) | PASS — `SERVICE_ROLES['pharmacy-hub']` 는 `pharmacy-hub:` prefix role 만 인정, 타서비스 role 은 매칭 대상 아님 (코드 경로 확정) |
| membership pending / rejected | 셸 대신 상태 Notice | PASS — `MembershipGate` 경유 (기존 동작 보존) |
| PH operator / admin / `platform:super_admin` | 진입 허용 | 공통 Guard 정책 그대로 |

**백엔드 경계**: 프론트 가드는 UX 안내이며 권한 판정 근거가 아니다. 실제 경계는
`requireAuth` + pharmacy-hub scope guard + `resolveStoreAccess()` 가 강제하며,
이는 W2(`CHECK-O4O-PHARMACY-HUB-STORE-GUARD-DEPLOY-AND-PRODUCTION-SMOKE-V1`)에서
운영 리비전 실측으로 검증 완료된 계약이다. 본 WO 는 backend 를 변경하지 않았다.

---

## 6. 타입검사 · 빌드

| 명령 | 결과 |
|---|:---:|
| `pnpm --filter @o4o/types build` | PASS |
| `pnpm --filter @o4o/ui build` | PASS |
| `pnpm --filter pharmacy-hub-web type-check` (`tsc -b`) | PASS (오류 0) |
| `npx vite build` (web-pharmacy-hub) | PASS — 1946 modules, `index.js` 402.85 kB / gzip 123.85 kB, `index.css` 65.38 kB |

빌드 인프라 변경:
- `services/web-pharmacy-hub/Dockerfile` — 신규 workspace 패키지 4개를 **COPY 2곳(package.json / source)** 에 추가하고 `RUN pnpm --filter @o4o/ui build` 추가 (`@o4o/ui` 만 dist-mode). Dockerfile 상단 경고 주석의 요구사항을 그대로 이행.
- `services/web-pharmacy-hub/tailwind.config.js` — `content` 에 `packages/store-ui-core/src` · `packages/ui/src` glob 추가 (K-Cosmetics 와 동일 패턴). 미추가 시 셸 클래스가 생성되지 않는다.
- `pnpm-lock.yaml` — 신규 dependency 4건 반영. 함께 포함된 `ts-jest` resolution 정규화 2줄은 lockfile 재생성 시 발생하는 기존 drift 로, 본 WO 가 의도한 변경은 아니며 버전 변경은 없다.

---

## 7. 프로덕션 브라우저 smoke

대상: `https://pharmacyhub.co.kr` (Cloud Run `pharmacy-hub-web`)
배포: `.github/workflows/deploy-web-services.yml` run `30961442024` — 커밋 `f39b34f4b`,
6 job 전부 success (detect-changes / neture / kpa-society / k-cosmetics / pharmacy-hub / glycopharm).

브라우저: Playwright (실제 Chromium) — 데스크톱 1440×900 · 모바일 390×844.

| # | 시나리오 | 결과 |
|:-:|---|:---:|
| 7-1 | `/store-owner` — 공통 셸 렌더 (상단바 `Pharmacy-Hub / 약국 경영자` + 사이드바 `내 매장 관리` + 홈 콘텐츠) | PASS |
| 7-2 | 홈 화면 — 계정명·이메일, 상태 뱃지 `이용 중`, 역할 `약국 경영자`, 승인 일시 `2026. 7. 30.`, 바로가기 3 | PASS |
| 7-3 | 사이드바 섹션 `약국 상품·거래` 아코디언 펼침 → 3 메뉴 노출 | PASS |
| 7-4 | `공급 상품` 클릭 → `/store-owner/products` 목록 렌더 (실데이터 1건, 필터·검색 UI 정상) + 메뉴 active | PASS |
| 7-5 | `장바구니` 클릭 → `/store-owner/cart` 렌더(빈 장바구니 안내) + active 이동 | PASS |
| 7-6 | `주문 내역` 클릭 → `/store-owner/orders` 렌더 + active 이동 | PASS |
| 7-7 | 상품 상세 deep link `/store-owner/products/{offerId}` — 셸 안에서 렌더, 공급가·장바구니 담기 UI 정상 | PASS |
| 7-8 | `홈` active 판정 — `/store-owner` 에서만 active, 하위 경로에서 비활성 | PASS |
| 7-9 | 모바일 390px — 상단바 햄버거 클릭 시 드로어 열림 (`#store-work-drawer` x=0, width=256) | PASS |
| 7-10 | 결제 실패 callback `/store-owner/payment/fail?code=…&orderId=…` — 셸 안에서 렌더, `오류 코드: PAY_PROCESS_CANCELED` 정상 파싱, 사이드바에 결제 메뉴 미노출 | PASS |
| 7-11 | 로그아웃 버튼 → 세션 종료 후 로그인 화면 | PASS |
| 7-12 | 미로그인 `/store-owner` → `/login` | PASS |
| 7-13 | 미로그인 결제 callback — **URL·쿼리 파라미터 보존** + 로그인 안내 | PASS |

결제는 **조회/렌더만** 검증했고 실거래(위젯 호출·승인)는 수행하지 않았다.
7-1~7-11 은 기존 Pharmacy-Hub 매장 경영자 계정 세션으로 수행했으며, 비밀번호는
기록하지 않았고 DB write·계정 변경은 하지 않았다.

---

## 8. 기존 서비스 회귀

| 서비스 | 영향 | 근거 |
|---|:---:|---|
| KPA-Society | 0 | `KPA_SOCIETY_STORE_CONFIG` · `SERVICE_ROLES.kpa` 무변경. `SECTION_ICONS` 는 신규 키 추가만 |
| GlycoPharm | 0 | `GLYCOPHARM_STORE_CONFIG` · `SERVICE_ROLES.glycopharm` 무변경 |
| K-Cosmetics | 0 | `COSMETICS_STORE_CONFIG` · `SERVICE_ROLES.cosmetics` 무변경 |
| Neture | 0 | store-ui-core 의 변경 지점 미소비 |

공통 패키지 3파일의 변경은 전부 **추가**이며, 기존 키/엔트리/아이콘 매핑을 수정하거나
삭제한 곳이 없다.

공통 패키지(`packages/store-ui-core`)와 `pnpm-lock.yaml` 이 변경되었으므로 배포
워크플로의 `detect-changes` 는 **5개 web 서비스를 모두 재빌드**한다(설계된 안전 동작).
따라서 회귀 근거는 "재빌드되지 않음" 이 아니라 **①변경이 additive 이고 기존 코드 경로를
건드리지 않는다는 diff 사실**과 **②5개 서비스 배포 job 이 전부 성공했다는 사실**이다.

---

## 9. 변경 금지 항목 준수

| 금지 항목 | 준수 |
|---|:---:|
| DB schema 변경 / migration / 신규 테이블 | ✅ 0 |
| 매장 주체 프로비저닝 변경 | ✅ 0 |
| 공통 store-owner 가드 변경 (기존 서비스 동작) | ✅ additive only |
| 장바구니·주문·결제 backend 계약 변경 | ✅ 0 |
| 결제 실거래 | ✅ 0 |
| KPA·K-Cosmetics 화면 복사 | ✅ 0 (공통 컴포넌트 직접 소비) |

`pnpm-lock.yaml` 은 신규 dependency 반영을 위해 실제 갱신이 필요해 포함했으며,
병행 세션의 변경(`apps/api-server/src/scripts/hff-zh-*`)은 path-specific commit 으로 제외했다.

---

## 10. 변경 파일

| 파일 | 구분 |
|---|:---:|
| `packages/store-ui-core/src/config/storeMenuConfig.ts` | M |
| `packages/store-ui-core/src/index.ts` | M |
| `packages/store-ui-core/src/components/StoreSidebar.tsx` | M |
| `packages/store-ui-core/src/auth/StoreOwnerGuard.tsx` | M |
| `services/web-pharmacy-hub/src/App.tsx` | M |
| `services/web-pharmacy-hub/src/layouts/StoreOwnerShell.tsx` | A |
| `services/web-pharmacy-hub/src/pages/store-owner/HomePage.tsx` | A |
| `services/web-pharmacy-hub/package.json` | M |
| `services/web-pharmacy-hub/tailwind.config.js` | M |
| `services/web-pharmacy-hub/Dockerfile` | M |
| `pnpm-lock.yaml` | M |
| `docs/checks/CHECK-PHARMACY-HUB-STORE-SHELL-AND-MENU-CONFIG-V1.md` | A |

---

## 11. 후속 (범위 밖)

| 항목 | 트랙 |
|---|---|
| 매장 대시보드(통계·최근 활동·AI 요약)·약국명/매장 프로필 표시 | W4 |
| 전용 E2E 계정 프로비저닝 | `WO-PHARMACY-HUB-PROVISIONING-SAFE-E2E-V1` |
| LoginPage returnUrl 복원 → 결제 서브트리 guard 통일 | 미착수 |
| 매장 정보 / 취급 상품 / 콘텐츠 / QR / POP / 태블릿 메뉴 | 각 기능 구현 WO 선행 |
