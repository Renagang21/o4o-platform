# CHECK-O4O-KPA-OPERATOR-ORDER-VIEW-FRONTEND-WIRING-V1

> **작업명:** WO-O4O-KPA-OPERATOR-ORDER-VIEW-FRONTEND-WIRING-V1
> **유형:** KPA operator '주문 현황' frontend wiring (route/menu/page). backend/operator-core-ui 무변경.
> **판정: PASS** — KPA '주문 현황' 도입 완료. **KPA parity(상품 현황 + 주문 현황) 완성.**
> 선행: `WO-O4O-OPERATOR-PRODUCT-ORDER-VIEW-COMMONIZE-V1`, `WO-O4O-KPA-OPERATOR-PRODUCT-ORDER-VIEW-INTRODUCE-V1`, `WO-O4O-KPA-OPERATOR-ORDER-VIEW-BACKEND-ENABLE-V1`
> 작성일: 2026-06-16

---

## 1. 변경 파일 목록 (이번 WO에서 수정/추가한 파일만)

- `services/web-kpa-society/src/pages/operator/OrdersPage.tsx` (신규 thin wrapper)
- `services/web-kpa-society/src/pages/operator/index.ts` — barrel export `OperatorOrdersPage`
- `services/web-kpa-society/src/routes/OperatorRoutes.tsx` — import + `<Route path="orders">`
- `services/web-kpa-society/src/config/operatorMenuGroups.ts` — `orders` 그룹 `주문 현황` 추가(UNIFIED_MENU)
- `docs/investigations/CHECK-O4O-KPA-OPERATOR-ORDER-VIEW-FRONTEND-WIRING-V1.md`

> backend / operator-core-ui / GP / KCos / Neture / store측 라우트 **미접촉**. path-specific staging, `git add .` 미사용.

## 2. KPA OrdersPage wrapper 구조

- `OperatorOrderStatusPage`(@o4o/operator-core-ui)에 주입:
  - `fetchOrders`: `apiClient.get('/operator/orders', { page, limit, status, paymentStatus, search })`.
    - **`apiClient` base = `/api/v1/kpa`** → 최종 `GET /api/v1/kpa/operator/orders` (backend WO 에서 추가한 경로).
    - `ApiClient.get` 은 JSON body 직접 반환 → `body.data.orders / body.data.stats / body.data.pagination.total` 매핑.
  - `config`: description `KPA-Society 서비스 전체 주문 현황을 조회합니다.`, accent primary/blue(KPA 테마), "주문 조회 전용" 안내는 공통 컴포넌트 기본값 유지.

## 3. route 추가 내용

- `OperatorRoutes.tsx`: `<Route path="orders" element={<OperatorOrdersPage />} />` → `/operator/orders` (operator 블록 내, products 다음).
- store측 `/store/commerce/orders` 및 store 블록 redirect(App.tsx) **미변경**.

## 4. menu 추가 내용

- `operatorMenuGroups.ts` UNIFIED_MENU 에 `orders: [{ label: '주문 현황', path: '/operator/orders' }]` 추가(products 그룹 다음). GP/KCos 와 동일 group key `orders` → 공유 domain IA 매핑 재사용으로 노출.
- capability: 기존 `STORE_MANAGEMENT`(ENABLED) 사용 — **신규 capability 없음**.

## 5. endpoint / base path 확인

- endpoint: `GET /api/v1/kpa/operator/orders`
- client: `apiClient`(base `/api/v1/kpa`) — `coreApiClient`(base `/api/v1`) 아님. (상품 현황은 플랫폼 extension `/operator/products` → coreApiClient, 주문은 KPA-prefixed → apiClient. 경로 성격에 맞게 분리.)
- auth: backend `authenticate` + `requireKpaScope('kpa:operator')` (frontend 는 apiClient 가 Bearer 토큰 자동 첨부).

## 6. response shape 매핑

- backend: `{ success, data: { orders[], stats, pagination{total} } }`
- wrapper → `OperatorOrderStatusPage` 가 기대하는 `{ orders, stats, total }`:
  - `orders = body.data.orders`
  - `stats = body.data.stats`
  - `total = body.data.pagination.total`
- 실패/비-success 시 빈 목록 + 0 stats(공통 컴포넌트 error 상태와 함께 안전).

## 7. view-only 정책 확인

- 공통 `OperatorOrderStatusPage` 사용 — 상태변경/배송/취소/환불/송장/정산/bulk/selectable/onRowClick **없음**. "주문 조회 전용" 안내 배너 유지.
- 목록/검색/상태·결제 필터/새로고침/pagination/loading·error·empty 만 제공.

## 8. store측 주문 화면 미변경 확인

- KPA `/store/commerce/orders`(StoreOrdersPage, 단일 매장 scope) 및 store 블록 redirect **미접촉**.

## 9. GP/KCos/Neture 미변경 확인

- 이번 WO 는 KPA frontend 파일만 수정. operator-core-ui/GP/KCos/Neture 파일 **0 변경** → 무영향.

## 10. TypeScript 결과

| 대상 | 결과 |
|---|---|
| `services/web-kpa-society` | 제 파일(OrdersPage/OperatorRoutes/operatorMenuGroups) error **0** |
| `packages/operator-core-ui` | error **0** (미변경) |

> ⚠️ KPA tsc 전체에서 `packages/store-ui-core/.../StoreRecruitmentApplicationsView.tsx` TS6133(미사용 React import) 1건 관측 — **다른 세션이 main 에 커밋한 기존 오류**로 본 WO 범위 밖. vite build(esbuild)는 영향 없이 통과. (별도 정리 권장.)

## 11. build 결과

| 대상 | 결과 |
|---|---|
| `web-kpa-society` (`vite build`) | ✅ built in 14.12s |

> GP/KCos 는 미변경 → 재빌드 불요(무영향). operator-core-ui 소스 소비.

## 12. smoke 결과 / 보류 사유

- 브라우저 smoke(KPA `/operator/orders` 렌더·"주문 현황" 메뉴·목록/empty·검색·상태/결제 필터·새로고침·처리 버튼 부재·console error 0)는 **프로덕션 배포 후** 권장(로컬 prod DB/Cloud Run 의존). typecheck + production build 통과로 정적 정합성 확보. 요청 시 배포 후 Playwright 검증.

## 13. KPA 상품 현황 + 주문 현황 parity 완료 여부

- ✅ **완성.** KPA operator 도 GP/KCos 와 동일하게:
  - **상품 현황** (`/operator/products`, view-only) — INTRODUCE WO
  - **주문 현황** (`/operator/orders`, view-only) — 본 WO
  - 승인 업무는 Approvals 에서 처리(불변).

---

## 보고 요약

| 항목 | 결과 |
|---|---|
| 사전 git 상태 | 작업 트리 clean(untracked asset 만), 동시 세션 modified 없음 |
| OrdersPage | ✅ 신규(공통 OperatorOrderStatusPage 사용) |
| route | `/operator/orders` 추가(OperatorRoutes) |
| menu | `orders` 그룹 `주문 현황` 추가 |
| endpoint | `GET /api/v1/kpa/operator/orders` (apiClient base /api/v1/kpa) |
| view-only | 유지(액션 0) |
| store/GP/KCos/Neture | 미변경 |
| TypeScript / build | 제 파일 0 / KPA vite build PASS |
| KPA parity | **완성**(상품 현황 + 주문 현황) |

*Date: 2026-06-16 · KPA operator '주문 현황' frontend wiring(OperatorOrderStatusPage + apiClient `/operator/orders` → /api/v1/kpa/operator/orders) · view-only · backend/operator-core-ui/GP/KCos 무변경 · KPA parity(상품·주문 현황) 완성 · KPA tsc 의 store-ui-core TS6133 은 타 세션 기존 오류(범위 밖, vite build 무영향).*
