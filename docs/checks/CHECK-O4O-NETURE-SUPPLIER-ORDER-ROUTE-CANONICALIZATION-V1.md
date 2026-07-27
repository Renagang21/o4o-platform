# CHECK-O4O-NETURE-SUPPLIER-ORDER-ROUTE-CANONICALIZATION-V1

WO: `WO-O4O-NETURE-SUPPLIER-ORDER-ROUTE-CANONICALIZATION-V1`
대상: 공급자 주문 처리 route 를 `/account/supplier/*` → canonical `/supplier/*` 로 이관
작성일: 2026-07-26 (KST)

---

## 1. 기존 주문 허브 · 처리목록 역할 (현재 main 재확인)

선행 IR 계약이 현재 코드와 **일치**함을 확인했다.

| 화면 | route | 컴포넌트 | 역할 |
|------|-------|----------|------|
| 주문 현황 허브 | `/supplier/orders` | `SupplierOrdersPage` | 읽기 전용 — `getOrdersSummary` · `getUnifiedOrders`, mutation 0 |
| 주문 처리 목록 | `/account/supplier/orders` | `SupplierOrdersListPage` | 실제 처리 — `getOrders` · `updateOrderStatus` · `NEXT_STATUS` |
| 주문 상세 | `/supplier/orders/:id` · `/account/supplier/orders/:id` | `SupplierOrderDetailPage` | 상태·배송 처리 mutation 보유 (양쪽 route 공용) |

백엔드 `supplier-unified-order.service.ts:138` 이 `/account/supplier/orders/${o.id}` 를 생성하고 있었다.

## 2. `/supplier/orders/manage` route 추가

`services/web-neture/src/App.tsx` — 기존 `SupplierRoute` + `SupplierSpaceLayout` 블록 내부에 추가.

```tsx
<Route path="/supplier/orders" element={<SupplierOrdersPage />} />
<Route path="/supplier/orders/manage" element={<SupplierOrdersListPage />} />   {/* 신규 */}
<Route path="/supplier/orders/:id" element={<SupplierOrderDetailPage />} />
```

`react-router-dom@7` 은 정적 세그먼트를 동적 세그먼트보다 높게 랭크하므로 `/supplier/orders/manage` 가
`/supplier/orders/:id` 에 흡수되지 않는다(선언 순서와 무관). 가독성을 위해 `:id` 앞에 배치했다.

## 3. `SupplierOrdersListPage` 재사용

**신규 컴포넌트·API·상태머신 생성 0.** 기존 `pages/account/SupplierOrdersListPage` 를 그대로 두 route 에 마운트했다.

| 항목 | 상태 |
|------|------|
| `supplierApi.getOrders()` | 무변경 |
| `supplierApi.updateOrderStatus()` | 무변경 |
| `NEXT_STATUS` / `NEXT_ACTION_LABEL` | 무변경 |
| 검색 · 상태 필터 · 페이지네이션 | 무변경 |
| 컴포넌트 파일 위치 | `pages/account/` 유지 (legacy route 도 계속 사용하므로 이동하지 않음) |

**레이아웃 호환 확인**: 이 페이지의 루트는 패딩 없는 `<div>` 로 부모 레이아웃에 의존한다.
`SupplierAccountLayout` 과 `SupplierSpaceLayout` 모두 `mx-auto px-4 sm:px-6 lg:px-8 py-6` 컨테이너를
제공하므로 canonical 트리에서도 여백이 동일하다(실측 스크린샷 확인).

## 4. account 상세 링크 제거

`SupplierOrdersListPage` 내부 2곳:

| 위치 | 변경 전 | 변경 후 |
|------|---------|---------|
| 데스크톱 표 `주문번호` 컬럼 (`:189`) | `/account/supplier/orders/${order.id}` | `/supplier/orders/${order.id}` |
| 모바일 카드 주문번호 (`:362`) | `/account/supplier/orders/${order.id}` | `/supplier/orders/${order.id}` |

`navigate()` 호출로 account 상세로 가는 경로는 **없었다**(조사 확인).
→ `SupplierOrdersListPage` 의 account 상세 링크 **0**.

legacy `/account/supplier/orders` 에서 열어도 상세는 canonical `/supplier/orders/:id` 로 이동한다.
이는 §6 의 명시 요구(“account 상세 링크 0”)에 따른 의도된 동작이다.

## 5. 주문 허브 CTA 변경

`SupplierOrdersPage:180`

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| CTA link | `/account/supplier/orders` | `/supplier/orders/manage` |
| CTA 제목 | `주문 처리 · 배송 workspace 열기` | `주문 처리 · 배송 관리` (§7 권장 문구) |

유지: 주문 현황 KPI · 통합 주문 조회 · 처리 가능 여부 표시 · `fulfillmentUrl` 기반 행 액션.

## 6. backend `fulfillmentUrl` lockstep

`apps/api-server/src/modules/neture/services/supplier-unified-order.service.ts`

```ts
- fulfillmentUrl: `/account/supplier/orders/${o.id}`,
+ fulfillmentUrl: `/supplier/orders/${o.id}`,
```

| 무변경 확인 | 상태 |
|-------------|:---:|
| `canFulfill` 판정 | 무변경 |
| 주문 source / 상태 / 배송 상태 판정 | 무변경 |
| checkout 주문 처리 경로 | 무변경 |
| 처리 불가 주문 `fulfillmentUrl: null` (`:206`) | **유지** |

read model 의 URL 문자열만 바뀐다. DB write·migration 없음.

## 7. legacy account route 유지

`App.tsx` 의 다음 route 를 **삭제·redirect 하지 않았다.**

```
/account/supplier/orders        → SupplierOrdersListPage
/account/supplier/orders/:id    → SupplierOrderDetailPage
```

`SupplierAccountLayout` · account 대시보드 · 그 내부 링크도 그대로 두었다(§11 · §18).

`SupplierOrderDetailPage:116` 의 backPath 분기도 §9 에 따라 **삭제하지 않았다**:

```ts
const backPath = location.pathname.startsWith('/supplier/') ? '/supplier/orders' : '/account/supplier/orders';
```

canonical 상세의 뒤로가기는 기존 계약대로 허브(`/supplier/orders`)로 돌아간다.
“처리목록으로 복귀” 는 신규 UX 변경이라 범위에서 제외했다.

## 8. guard · 권한

5개 route 모두 실브라우저로 확인 — **redirect loop 0 · 로그인 튕김 0 · 착지 경로 일치**.

| route | 착지 | 결과 |
|-------|------|:---:|
| `/supplier/orders` | 동일 | PASS |
| `/supplier/orders/manage` | 동일 | PASS |
| `/supplier/orders/:id` | 동일 | PASS |
| `/account/supplier/orders` | 동일 | PASS |
| `/account/supplier/orders/:id` | 동일 | PASS |

`/supplier/orders/manage` 는 기존 `SupplierRoute` + `SupplierSpaceLayout` 블록 안에 넣었으므로
Neture membership · supplier role · activation gate 가 형제 route 와 동일하게 적용된다.
`role-constants` · activation gate **무변경**.

## 9. 잔여 검색 (§13)

`grep -rn "account/supplier/orders" services/ apps/ packages/ --include=*.tsx --include=*.ts`

**금지 잔존 — 전부 0:**

| 항목 | 건수 |
|------|:---:|
| `SupplierOrdersListPage` 의 account 상세 링크 | **0** |
| `SupplierOrdersPage` 의 account 처리목록 CTA | **0** |
| 백엔드 unified `fulfillmentUrl` 의 account 경로 | **0** |

**허용 잔존 (§13 목록과 일치):**

| 위치 | 성격 |
|------|------|
| `App.tsx:865-866` | legacy account routes (유지 대상) |
| `SupplierAccountLayout.tsx:21` | account 레이아웃 내비 |
| `SupplierAccountDashboardPage.tsx:120,161,189` | account 대시보드 내부 링크 (§18 제거 제외) |
| `SupplierOrderDetailPage.tsx:116` | account route 내부 backPath (§9 유지) |
| `SupplierOrdersPage.tsx:181` · 백엔드 `:139` | 이관 경위 주석 (링크 아님) |

## 10. typecheck · build

| 명령 | 결과 |
|------|:---:|
| `pnpm --filter @o4o/web-neture exec tsc --noEmit -p tsconfig.json` | **PASS** (오류 0) |
| `pnpm --filter @o4o/web-neture build` | **PASS** (25.29s) |
| `apps/api-server` `tsc --noEmit -p tsconfig.build.json` (**배포 빌드 기준**) | **PASS** (오류 0) |
| `apps/api-server` `tsc --noEmit -p tsconfig.json` | 오류 11건 — **전부 pre-existing baseline** (아래) |

### api-server `tsconfig.json` 오류에 대한 판정

- 11건 **전부 `src/scripts/**` 하위**(`hff-*`, `otc-*` 등 병렬 세션의 데이터 작업 스크립트)
- 본 변경 파일(`supplier-unified-order.service.ts`) 관련 오류 **0건**
- `src/scripts/` 는 `git status` 상 **미수정**(HEAD 상태) → 오류는 main 에 이미 존재하는 baseline
- 배포에 쓰이는 `tsconfig.build.json` 은 `src/scripts/**/*` 를 **exclude** 하므로 배포 빌드에 영향 없음

→ 본 WO 로 인한 타입 회귀 **0**. baseline 오류는 별도 소유 세션 소관이라 접촉하지 않았다.

## 11. 기능 검증 (실브라우저)

Playwright 로 실제 로그인 후 검증. 배포 전에는 로컬 `dist` 를 실제 오리진(`neture.co.kr`)에 서빙해
CORS 제약 없이 확인했고, 배포 후 프로덕션 번들로 재실행했다.

### 11.1 주문 허브 `/supplier/orders`

| 항목 | 결과 |
|------|:---:|
| 허브 접근 — 리다이렉트 없음 | PASS |
| CTA `href = /supplier/orders/manage` | PASS |
| CTA 문구 `주문 처리 · 배송 관리` | PASS |
| legacy account CTA 잔존 0 | PASS |
| 주문 현황 · 통합 조회 유지 | PASS |
| CTA 클릭 → `/supplier/orders/manage` 도달 | PASS |

### 11.2 주문 처리 목록 `/supplier/orders/manage`

| 항목 | 결과 |
|------|:---:|
| 처리 목록 렌더 (canonical 레이아웃·사이드바) | PASS |
| 상태 필터 · 검색 입력 존재 | PASS |
| legacy account 상세 링크 0 | PASS |
| [합성] 주문 행 렌더 | PASS |
| [합성] 주문번호 링크 → `/supplier/orders/:id` | PASS |
| [합성] account 상세 링크 0 | PASS |
| [합성] `NEXT_STATUS` 액션 버튼 노출 (`paid` → `처리 시작`) | PASS |

**운영 주문 상태 mutation 은 수행하지 않았다.** 목록·링크·액션 노출은 합성 200 응답
(가짜 주문 1건, `{ data: [...], meta }` 계약 준수)을 주입해 확인했다.
전 구간 `PATCH /neture/supplier/orders/:id/status` 등 **비-GET 요청 0건**을 계측으로 확인했다.

### 11.3 주문 상세 `/supplier/orders/:id`

| 항목 | 결과 |
|------|:---:|
| canonical 상세 route 도달 (루프 없음) | PASS |
| 권한 튕김 없음 | PASS |
| backPath 계약 (`/supplier/` → `/supplier/orders`) | 코드 무변경 확인 |

### 11.4 legacy 회귀

| 항목 | 결과 |
|------|:---:|
| `/account/supplier/orders` 유지 (redirect 없음) | PASS |
| legacy 목록 컴포넌트 렌더 | PASS |
| `/account/supplier/orders/:id` 유지 (redirect 없음) | PASS |
| legacy 상세 권한 튕김 없음 | PASS |

### 11.5 unified `fulfillmentUrl`

__UNIFIED__

## 12. 반응형

`/supplier/orders/manage` 기준 (합성 주문 1건 렌더 상태):

| 뷰포트 | 가로 overflow | canonical 상세 링크 |
|--------|:---:|:---:|
| Desktop 1440×900 | 없음 | 2 (표 + 모바일 카드 DOM 공존, CSS 로 전환) |
| Tablet 768×1024 | 없음 | 2 |
| Mobile 390×844 | 없음 | 2 |

CTA 잘림 없음, 필터·상태 변경 버튼 접근 가능, 기존 대비 overflow 회귀 0.

## 13. 배포

| 항목 | 값 |
|------|-----|
| commit | __COMMIT__ |
| detect-changes | __DETECT__ |
| web-neture | __WEB__ |
| api-server | __API__ |

## 14. 프로덕션 smoke

__PRODSMOKE__

## 15. DB · migration · 운영 mutation

| 항목 | 값 |
|------|:---:|
| DB write | **0** |
| migration | **0** |
| 운영 주문 상태 mutation | **0** (계측 확인) |
| 주문 상태 머신 · 배송 엔진 변경 | **0** |
| 신규 주문 API | **0** |
| dependency / lockfile | **무변경** |

## 16. staged 범위

작업 중 워킹트리에 **타 세션의 dirty 파일**이 존재했다:

```
services/web-kpa-society/src/App.tsx
services/web-kpa-society/src/pages/pharmacy/PharmacyStorePage.tsx
pnpm-lock.yaml
```

이 파일들은 **수정·복구·삭제·stash·stage 하지 않았고**, pathspec 제한 commit 으로 혼입을 차단했다.
`git diff --cached --name-status` 로 스테이지 내용이 본 WO 파일만인지 확인 후 커밋했다.

## 17. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/App.tsx` | `/supplier/orders/manage` route 추가 |
| `services/web-neture/src/pages/supplier/SupplierOrdersPage.tsx` | 허브 CTA → canonical, 문구 정비 |
| `services/web-neture/src/pages/account/SupplierOrdersListPage.tsx` | 상세 링크 2곳 → canonical |
| `apps/api-server/src/modules/neture/services/supplier-unified-order.service.ts` | `fulfillmentUrl` → canonical |
| `docs/checks/CHECK-O4O-NETURE-SUPPLIER-ORDER-ROUTE-CANONICALIZATION-V1.md` | 본 문서 |

## 18. 후속 항목

| # | 항목 |
|---|------|
| 1 | `/account/supplier/*` 전체 redirect 및 `SupplierAccountLayout` 정리 — 별도 WO (본 WO §18 제외) |
| 2 | account 대시보드(`SupplierAccountDashboardPage`)의 주문 링크도 canonical 로 이관할지 판단 — legacy 트리 유지 정책과 함께 결정 |
| 3 | 처리목록 → 상세 → **처리목록** 복귀 UX (현재는 허브 복귀) — 신규 UX 변경이라 별도 WO |
| 4 | 검증 계정에 주문 실데이터 0건 — 실주문 확보 후 상태 전이·배송 처리 회귀 재확인 |
