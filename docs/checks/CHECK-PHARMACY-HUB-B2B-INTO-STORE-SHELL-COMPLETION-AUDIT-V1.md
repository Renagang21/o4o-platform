# CHECK — WO-PHARMACY-HUB-B2B-INTO-STORE-SHELL-COMPLETION-AUDIT-V1

> Pharmacy-Hub B2B 기능(공급 상품·장바구니·주문·결제)이 공통 매장 셸에 **정상 편입**되었는지 최종 감사

| 항목 | 값 |
|------|------|
| WO | `WO-PHARMACY-HUB-B2B-INTO-STORE-SHELL-COMPLETION-AUDIT-V1` |
| 성격 | **조사·검증 전용** — 코드 변경 0 / DB write 0 / migration 0 / 배포 0 |
| 감사일 | 2026-08-05 |
| 환경 | 프로덕션 `https://pharmacyhub.co.kr` (리비전 `pharmacy-hub-web-00033-85b`, 2026-08-05T03:38Z) |
| 감사 기준 커밋 | `932ee4bae` (감사 범위 마지막 앱 코드 변경) · 감사 시점 HEAD `cd4451920` |
| 로그인 계정 | `renagang21@gmail.com` (PH 매장 미연결 계정 — read-only) |
| 결과 | **COMPLETE (부분 문구 결함 2건 · 후속 WO 분리)** |

---

## 0. 감사 전제 확인

| 중지 조건 | 실측 | 판단 |
|------|------|------|
| 작업 트리 clean | **not clean** — 병행 세션(HFF-ZH / easy-drug) 파일만 dirty. 감사 범위(`services/web-pharmacy-hub`, `packages/store-ui-core`, `docs/checks`)는 clean | 감사는 read-only이고 산출물은 신규 CHECK 1개뿐 → 상태를 명시 기록하고 진행 |
| 배포 리비전 ≠ main HEAD | 감사 범위 diff `932ee4bae..HEAD -- services/web-pharmacy-hub packages/store-ui-core` = **0 파일**. HEAD 이후 커밋(`5704631b8` docs, `cd4451920` easy-drug)은 PH 앱 코드 미포함 | **배포 코드 = HEAD 코드** (감사 범위) → 진행 |
| 안전한 테스트 계정 | `renagang21@gmail.com` — PH enrollment 0, write 유발 동작 미수행 | 진행 |
| callback 검증에 실거래 필요 | 불필요 (아래 §4 근거) | 진행 |
| route inventory ≠ 배포 화면 | 불일치 0 (§1) | 진행 |

병행 세션 파일은 조회·수정·이동 모두 하지 않았다. `git add .` 미사용.

---

## 1. Route Inventory (`services/web-pharmacy-hub/src/App.tsx`)

| # | route | 컴포넌트 | 셸 | 사이드바 메뉴 | 판정 |
|:--:|------|---------|:---:|------|------|
| 1 | `/store-owner` (index) | `store-owner/HomePage` | `StoreOwnerShell` | `홈` | **COMPLETE** |
| 2 | `/store-owner/products` | `store-owner/ProductsPage` | 동일 | `약국 상품·거래 > 공급 상품` | **COMPLETE** |
| 3 | `/store-owner/products/:offerId` | `ProductDetailPage` | 동일 | (부모 prefix 활성) | **EXPECTED_DEEP_ROUTE** |
| 4 | `/store-owner/cart` | `CartPage` | 동일 | `약국 상품·거래 > 장바구니` | **COMPLETE** |
| 5 | `/store-owner/orders` | `OrdersPage` | 동일 | `약국 상품·거래 > 주문 내역` | **COMPLETE** |
| 6 | `/store-owner/orders/:orderId` | `OrderDetailPage` | 동일 | (부모 prefix 활성) | **EXPECTED_DEEP_ROUTE** |
| 7 | `/store-owner/info` | `StoreInfoPage` | 동일 | `설정 > 매장 정보` | **COMPLETE** (W5) |
| 8 | `/store-owner/account` | `AccountPage` | 동일 | `설정 > 내 계정` | **COMPLETE** (W5) |
| 9 | `/store-owner/payment` | `PaymentPage` | `StoreOwnerShell requireStoreOwnerRole={false}` | 없음(의도) | **EXPECTED_DEEP_ROUTE** |
| 10 | `/store-owner/payment/success` | `PaymentSuccessPage` | 동일 | 없음(의도) | **EXPECTED_DEEP_ROUTE** |
| 11 | `/store-owner/payment/fail` | `PaymentFailPage` | 동일 | 없음(의도) | **EXPECTED_DEEP_ROUTE** |

범위 밖(감사 대상 아님, 정상 존재): `/`, `/login`, `/join`, `/join/status`, `/supplier`, `/supplier/products`, `/operator`, `/operator/memberships`, `/operator/memberships/:membershipId` → **OUT_OF_SCOPE**.
catch-all `<Route path="*" element={<Navigate to="/" replace />} />` 존재.

**중복 route 0** — `/store-owner/*` 를 정의하는 곳은 `App.tsx` 단 한 곳이며, 셸 편입 전 구 route 가 남아 병행 운영되는 흔적은 없다 → `DUPLICATE_ROUTE` 해당 없음.

---

## 2. 메뉴 ↔ route 대조 (`PHARMACY_HUB_STORE_CONFIG`)

| 메뉴 | subPath | 실 route | 판정 |
|------|---------|---------|------|
| 홈 | `` | 1 | 일치 |
| 공급 상품 | `/products` | 2 | 일치 |
| 장바구니 | `/cart` | 4 | 일치 |
| 주문 내역 | `/orders` | 5 | 일치 |
| 매장 정보 | `/info` | 7 | 일치 |
| 내 계정 | `/account` | 8 | 일치 |

- **데드링크 0** — 메뉴 6개 전부 실 route 존재, 전부 프로덕션에서 화면 렌더 확인.
- **`MISSING_MENU_ENTRY` 0** — 메뉴가 없는 route 5개는 전부 상세/결제 deep route 이며, `:id` 파라미터 또는 PG 세션이 필요해 메뉴로 만들 수 없다.
- **`ORPHAN_SCREEN` 0** — 메뉴 없는 5개 화면 모두 앱 내부 진입 경로가 실재한다.
  - `products/:offerId` ← `ProductsPage` 상품명 링크(프로덕션 확인)
  - `orders/:orderId` ← `OrdersPage` 주문 행 링크
  - `payment` ← `CartPage.tsx:107` · `OrderDetailPage.tsx:163`
  - `payment/success` · `payment/fail` ← PG 리다이렉트(`PaymentPage` 가 `successUrl`/`failUrl` 로 등록)
- 타 서비스 config(KPA / K-Cosmetics / Neture) diff 0 — PH 블록 내부에만 정의.

---

## 3. 프로덕션 화면별 셸 편입 실측

로그인 후 각 URL 직접 진입 → 상단바(`Pharmacy-Hub / 약국 경영자` + 사용자 + 로그아웃) · 사이드바(`내 매장 관리` + 3 섹션 + 로그아웃) · `<Outlet/>` 본문이 **전부 동일하게 렌더**됨을 확인.

| route | 상단바 | 사이드바 | 활성 표시 | 본문 |
|------|:---:|:---:|------|------|
| `/store-owner` | O | O | `홈` | 매장 미연결 안내 + 요약 카드 4 + 최근 주문 + 바로가기 3 |
| `/store-owner/products` | O | O | `약국 상품·거래` 자동 확장 · `공급 상품` | 필터 6 + 공급자 셀렉트 + 검색 + 상품 표 1행 |
| `/store-owner/products/3bb54519-…` | O | O | 동일 섹션 확장 | 상품 상세 + 수량 + `장바구니에 담기` (**클릭하지 않음** — write 회피) |
| `/store-owner/cart` | O | O | `장바구니` | "장바구니가 비어 있습니다." + 상품 둘러보기 |
| `/store-owner/orders` | O | O | `주문 내역` | "주문 내역이 없습니다." |
| `/store-owner/orders/000…000` | O | O | 동일 섹션 | "주문을 찾을 수 없습니다." + 주문 내역 링크 (존재하지 않는 id 로 셸 렌더만 확인) |
| `/store-owner/info` | O | O | `설정` 자동 확장 · `매장 정보` | 매장 미연결 안내 + 가입 상태 링크 |
| `/store-owner/account` | O | O | `설정` · `내 계정` | 프로필 카드 · 기본 정보 4 · 보안 설정 · 세션 |
| `/store-owner/payment` | O | O | (활성 없음) | "결제 정보가 없습니다." 안내 + 장바구니/주문 버튼 |
| `/store-owner/payment/success` | O | O | (활성 없음) | 완료 화면 (승인 호출 없음 — §4) |
| `/store-owner/payment/fail?code=…` | O | O | (활성 없음) | "결제가 완료되지 않았습니다" + 코드별 메시지 |

**SPA fallback 오인 방지** — 위 판정은 HTTP 200 이 아니라 **각 화면 고유 본문**(상품 표 · 주문 404 문구 · 결제 코드 메시지 등) 렌더로 확정했다. 존재하지 않는 `/store-owner/nonexistent-route-audit` 은 catch-all 로 `/` 리다이렉트되어 셸이 뜨지 않음을 대조 확인했다 → fallback 이 유효 route 를 흉내내지 않는다.

---

## 4. 결제 deep route 판정 (실거래 0)

| 항목 | 근거 |
|------|------|
| 사이드바 메뉴 없음 | **정상.** 결제는 장바구니/주문 상세에서만 진입하는 세션 화면이며, 메뉴 진입 시 결제 세션 준비(`preparePayment`)가 무의미하게 호출된다 (`store-owner/HomePage.tsx` 주석에 설계 근거 명시) → **EXPECTED_DEEP_ROUTE** |
| 셸 편입 | 3개 route 모두 `StoreOwnerShell` 하위 — 상단바·사이드바 동일 렌더 확인 |
| URL 불변 | `/store-owner/payment/success` · `/fail` — PG 등록 URL 그대로. `PaymentPage` 가 `window.location.origin + '/store-owner/payment/success|fail?paymentGroupId=…'` 로 생성 |
| 가드 차이 | `requireStoreOwnerRole={false}` (MembershipGate 만). 사유: `StoreOwnerGuard` 는 미인증 시 `/login` 으로 navigate 하고 `LoginPage` 는 returnUrl 을 복원하지 않아 **callback 파라미터가 소실**된다 |
| 미인증 실측 | 로그아웃 후 `/store-owner/payment/success?paymentGroupId=…&paymentKey=…&paymentId=…` 진입 → **URL·쿼리 유지된 채** "로그인이 필요합니다" 안내 렌더 (리다이렉트 없음) — 설계 의도대로 동작 |
| write 0 보장 | `PaymentPage`: `paymentGroupId` 없으면 `preparePayment` 호출 전 return · `PaymentSuccessPage`: 3개 파라미터가 모두 있어야 `confirmPayment` 호출 · `PaymentFailPage`: 순수 렌더. → 파라미터 없이 진입한 감사 동작은 **결제 API 호출 0** |
| 실거래 | **수행하지 않음** |

---

## 5. 권한 · 모바일 · 로그아웃

| 검증 | 결과 |
|------|:----:|
| 미인증 `/store-owner/orders` | `/login` 리다이렉트 (StoreOwnerGuard) |
| 미인증 `/store-owner/payment/success?…` | 같은 URL 유지 + MembershipGate 안내 |
| 모바일 390×844 초기 | 드로어 닫힘 (`translateX(-256px)`), 본문 정상, 상단바 햄버거 노출 |
| 햄버거 클릭 | 드로어 열림 (`translateX(0)`) + backdrop `fixed inset-0 bg-black/50 z-40 lg:hidden` + `body overflow:hidden` |
| 드로어 메뉴 클릭(`장바구니`) | 이동 성공 + 드로어 자동 닫힘 + backdrop 제거 + body 스크롤 잠금 해제 |
| 데스크톱 복귀(1440×900) | 사이드바 sticky 정상, 활성 항목 `장바구니` 유지 |
| 사이드바 로그아웃 | `/login` 이동, 세션 종료 (직후 보호 route 접근 시 로그인 요구) |

---

## 6. W4 · W5 회귀

| 대상 | 결과 |
|------|:----:|
| W4(셸·메뉴 config) — 6개 메뉴 · 3 섹션 · 아코디언 자동 확장 | 정상 |
| W5(`/store-owner/info`) — 미연결 안내 + 타 서비스 조직 누출 0 | 정상 (재확인) |
| W5(`/store-owner/account`) — 프로필·알림·비밀번호 모달·로그아웃 | 정상 (재확인, 모달은 열지 않고 진입점만 확인) |
| B2B(W3) URL·API·결제 계약 | **불변** — route·컴포넌트·엔드포인트 모두 셸 편입 전과 동일 |

---

## 7. 발견 결함 (이번 WO 에서 수정하지 않음)

| # | 판정 | 위치 | 내용 | 영향 |
|:--:|------|------|------|------|
| D1 | **PARTIAL** (문구) | `services/web-pharmacy-hub/src/pages/HomePage.tsx:16` | 공개 홈 역할 카드가 `/store-owner` 를 아직 `매장 운영·공급 상품 확인 (준비 중)` 로 안내. 실제로는 B2B 전 기능이 완성되어 셸에 편입됨 (프로덕션 실화면 확인) | 사용자에게 미완성으로 오인. 기능·route 영향 없음 |
| D2 | **PARTIAL** (문구) | `services/web-pharmacy-hub/src/pages/store-owner/ProductsPage.tsx:103` | 공급 상품 목록 부제가 `주문·장바구니는 후속 단계에서 연결됩니다.` — 장바구니·주문·결제가 이미 동작 중 | 동일 화면에 장바구니 담기 버튼이 있어 안내 모순 |
| D3 | **PARTIAL** (경미) | `PaymentSuccessPage.tsx:35-39` | 결제 파라미터 없이 직접 진입하면 "승인 시도 없이 안내만 한다"는 주석과 달리 **성공 화면이 그대로 렌더**된다 (전용 안내 분기 없음) | 실제 PG callback 은 항상 파라미터를 동반하므로 운영 영향은 낮으나, 직접 진입 시 결제 완료로 오인 가능 |
| D4 | 관찰 | `MembershipGate` 미인증 안내 | 결제 callback 미인증 진입 시 안내에 `가입 신청` · `처음으로` 만 있고 **로그인 링크가 없다** (로그인으로 가면 파라미터가 소실되는 기존 제약과 얽힘) | 미인증 상태에서 callback 을 받은 사용자의 복구 동선 부재 |

**후속 WO 후보:** D1·D2 는 문구 정정 1건으로 묶어 처리 가능(`WO-PHARMACY-HUB-STALE-READINESS-COPY-FIX-V1` 성격).
D3·D4 는 결제 callback 예외 동선 정리 1건(`…-PAYMENT-CALLBACK-EDGE-CASE-V1` 성격)으로 분리 권장.
**이번 WO 에서는 어떤 코드도 수정하지 않았다.**

---

## 8. 변경 금지 항목 준수

| 항목 | 준수 |
|------|:----:|
| 애플리케이션 코드 수정 | 0 |
| 메뉴 추가·삭제 | 0 |
| route 변경 | 0 |
| DB write | 0 |
| migration | 0 |
| 배포 | 0 |
| 결제 실거래 | 0 |
| 테스트 계정 정보 변경 | 0 |

산출물은 본 CHECK 문서 1개뿐이며 path-specific 으로만 커밋한다.

---

## 9. 결론

Pharmacy-Hub 의 B2B 기능(공급 상품 목록·상세, 장바구니, 주문 생성·목록·상세, 결제 진입·성공·실패 callback)은
**공통 매장 셸(`StoreDashboardLayout` + `PHARMACY_HUB_STORE_CONFIG` + `StoreOwnerGuard`/`MembershipGate`)에 완전히 편입**되었다.

- 셸 밖에서 도는 B2B 화면 **0**
- 데드링크 **0** · 중복 route **0** · orphan 화면 **0** · 누락 메뉴 **0**
- 셸 편입 전 남아 있는 `RoleEntryPage`/"준비 중" **화면** 0 (`/store-owner` 트리 기준)
- URL · API · 결제 계약 **불변**

남은 것은 **화면이 아니라 문구·예외 동선 4건**(§7)이며, WO 지시대로 수정하지 않고 후속 WO 로 분리한다.
