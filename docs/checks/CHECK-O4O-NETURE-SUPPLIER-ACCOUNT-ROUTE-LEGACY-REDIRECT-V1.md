# CHECK-O4O-NETURE-SUPPLIER-ACCOUNT-ROUTE-LEGACY-REDIRECT-V1

WO: `WO-O4O-NETURE-SUPPLIER-ACCOUNT-ROUTE-LEGACY-REDIRECT-V1`
대상: Neture 공급자 legacy `/account/supplier/*` → canonical `/supplier/*` 통합
작성일: 2026-07-26 (KST)
선행: `CHECK-O4O-NETURE-SUPPLIER-ORDER-ROUTE-CANONICALIZATION-V1` (`bc36b21f6` · `15a0fce9d`)

---

## 1~2. legacy route 6개 → canonical target 6개

**착수 전 게이트(§4)**: 6개 canonical target 이 모두 실제 component 에 마운트되어 있음을 확인했다.
특히 선행 WO 산출물인 `/supplier/orders/manage`(`SupplierOrdersListPage`) 와
`/supplier/orders/:id`(`SupplierOrderDetailPage`) 존재를 확인한 뒤 진행했다.

| # | legacy (redirect source) | canonical target | 방식 |
|---|--------------------------|------------------|------|
| 1 | `/account/supplier` | `/supplier/dashboard` | `<Navigate replace>` |
| 2 | `/account/supplier/products` | `/supplier/products` | `<Navigate replace>` |
| 3 | `/account/supplier/orders` | `/supplier/orders/manage` | `<Navigate replace>` |
| 4 | `/account/supplier/orders/:id` | `/supplier/orders/:id` | `LegacySupplierOrderRedirect` |
| 5 | `/account/supplier/inventory` | `/supplier/inventory` | `<Navigate replace>` |
| 6 | `/account/supplier/settlements` | `/supplier/settlements` | `<Navigate replace>` |

**전부 `replace`** — 뒤로가기로 legacy URL 에 다시 갇히지 않는다(실측 §11).

## 3. 동적 order id 보존

```tsx
function LegacySupplierOrderRedirect() {
  const { id } = useParams();
  const { search } = useLocation();
  if (!id) return <Navigate to="/supplier/orders" replace />;
  return <Navigate to={`/supplier/orders/${id}${search}`} replace />;
}
```

- 문자열 `":id"` 를 그대로 보내지 않고 `useParams()` 실제 값으로 치환 — 실측으로 `:id`/`%3Aid` 미포함 확인
- `id` 부재 시 `/supplier/orders` 허브로 안전 복귀 (빈 문자열·`undefined` URL 생성 없음)
- 신규 공유 패키지 없이 `App.tsx` 내부 최소 컴포넌트로 구현(§11)

## 4. query 보존 판단

**측정 결과 — target 화면들은 query 를 소비하지 않는다:**

| 화면 | `useSearchParams` / `location.search` 사용 |
|------|:---:|
| `SupplierProductsPage` | 0 |
| `SupplierOrdersListPage` | 0 |
| `SupplierOrderDetailPage` | 0 |
| `SupplierInventoryPage` | 0 |
| `SupplierSettlementsPage` | 0 |

→ §10 “target 화면이 해당 query 를 실제 소비하는 경우에만 보존” 에 따라
**정적 route 5개는 query 를 전달하지 않는다**(소비처가 없어 전달해도 무의미).

→ 상세 route 는 §10 “추가 query 가 있으면 불필요하게 제거하지 않는다” 에 따라
`location.search` 를 **그대로 이어붙인다**. 실측: `?tab=shipping` 보존 확인.

향후 target 이 query 를 소비하게 되면 정적 route 에도 보존을 추가해야 한다(후속 항목 3).

## 5. Products HUB 배지 판단 → **A. 의도적 폐기**

legacy `SupplierProductsListPage` 의 고유 표시 기능은 `공급자 미활성 배지` + `HUB 노출 카운터` 였다.
canonical `SupplierProductsPage` 를 재확인한 결과 **동등한 업무 판단이 이미 가능**하다.

| legacy 표시 | canonical 대체 |
|-------------|----------------|
| HUB 노출 여부 | `노출 가능` / `노출 불가` 필터 칩 (`getVisibilityStatus()` 기반, `SupplierProductsPage:1414-1415`) |
| 승인 상태 | `승인요청 전` / `승인 요청 중` / `승인완료` / `거절` 탭 + 건수 배지 (`:1367-1370`) |
| 노출 불가 사유 판단 | `서비스 미설정` 배지(`:409`), `approvalStatus` 컬럼(`:453`) |
| 공급자 미활성 | `SupplierActivationGate` (상태별 차단 문구 · 배너 · 세션 1회 모달) + 프로필 화면 |

→ “왜 HUB 에 노출되지 않는지” 를 canonical 화면에서 판단할 수 있으므로 **구형 배지·카운터를 이식하지 않는다.**
추가 UI 구현 **0**, `SupplierProductsPage.tsx` **변경 0**(§19 에 따라 커밋 대상에서 제외).

## 6. redirect 구현 방식 · guard

기존 wrapper 를 **그대로 유지**하고 leaf route 의 element 만 교체했다.

```tsx
<Route element={<SupplierRoute><SupplierAccountLayout /></SupplierRoute>}>
  <Route path="/account/supplier" element={<Navigate to="/supplier/dashboard" replace />} />
  ...
</Route>
```

| 판단 | 근거 |
|------|------|
| `SupplierRoute` 를 source 에 유지 | §9 “redirect source 와 target 모두 기존 supplier guard 아래” |
| `SupplierAccountLayout` 을 wrapper 로 유지 | §7 “layout 제거 금지”. 또한 이 layout 은 자체 인증·권한 검사를 갖고 있어(`!isAuthenticated → /login`, 권한 없음 → `접근 권한 없음` 화면) 제거 시 **비인가 사용자의 기존 동작이 바뀐다**. 유지 = 동작 보존 |
| 신규 helper 패키지 | 만들지 않음 (§11) |

`role-constants` · `SUPPLIER_ROLES` · membership 요구사항 **무변경**.

## 7. account inbound link 현황 (§8 · §12)

`grep -rn "/account/supplier" services/ apps/ packages/ --include=*.tsx --include=*.ts`

**반드시 0이어야 하는 active canonical 참조 — 전부 0:**

| 항목 | 건수 |
|------|:---:|
| `SupplierOrdersPage` → `/account/supplier/orders` | **0** (주석만) |
| `SupplierOrdersListPage` → `/account/supplier/orders/:id` | **0** |
| backend `fulfillmentUrl` → account 경로 | **0** (주석만) |
| canonical dashboard/menu(`SupplierSpaceLayout`, `SupplierDashboardPage`) → `/account/supplier/*` | **0** |

**허용 잔존 (§8 목록과 일치):**

| 위치 | 성격 |
|------|------|
| `App.tsx:882-887` | redirect source route 정의 (본 WO 산출물) |
| `SupplierAccountLayout.tsx:19-21` | legacy layout self-link — 링크 대상이 모두 redirect 되므로 데드링크 아님 |
| `SupplierAccountDashboardPage.tsx` (7곳) | 마운트 해제된 legacy 컴포넌트 내부 self-link |
| `SupplierInventoryPage:39` · `SupplierOrderDetailPage:116` · `SupplierSettlementsPage:83` | `pathname.startsWith('/supplier/')` 삼항의 **else 분기**. redirect 이후 이 페이지들은 `/supplier/*` 로만 렌더되므로 else 분기는 도달 불가 — 사용자에게 account 링크가 노출되지 않는다. §8 “불필요한 대량 수정 금지” 에 따라 유지 |
| `App.tsx:10,669,869` · `SupplierOrdersPage:181` · 백엔드 `:139` | 주석 |

## 8. legacy component 유지 · 삭제 판단

**모두 유지 (삭제 0)** — §7 기본 방침.

| 컴포넌트 | route mount | 판단 |
|----------|:---:|------|
| `SupplierOrdersListPage` | `/supplier/orders/manage` | **삭제 금지** — canonical 재사용 중 |
| `SupplierOrderDetailPage` | `/supplier/orders/:id` | **삭제 금지** — canonical 재사용 중 |
| `SupplierInventoryPage` | `/supplier/inventory` | **삭제 금지** — canonical 재사용 중 |
| `SupplierSettlementsPage` | `/supplier/settlements` | **삭제 금지** — canonical 재사용 중 |
| `SupplierAccountLayout` | redirect wrapper | 유지 (§7, 위 §6 근거) |
| `SupplierAccountDashboardPage` | **0** | 파일 유지 — 후속 A 버킷 |
| `SupplierProductsListPage` | **0** | 파일 유지 — 후속 A 버킷 |

단, `App.tsx` 의 **lazy import 선언 2줄**(`SupplierAccountDashboardPage`, `SupplierProductsListPage`)은
마운트 지점이 사라져 `noUnusedLocals: true` 위반이 되므로 **선언만 제거**했다(§13.1 “unused import 0”).
**컴포넌트 파일 자체는 삭제하지 않았다.**

## 9. typecheck · build

| 명령 | 결과 |
|------|:---:|
| `pnpm --filter @o4o/web-neture exec tsc --noEmit -p tsconfig.json` | **PASS** (출력 0줄, exit 0) |
| `pnpm --filter @o4o/web-neture build` | **PASS** (23.77s) |

route syntax · `Navigate`/`useParams` import · unused import · dynamic id 보존 전부 이상 없음.

## 10. legacy route smoke (§13.2)

배포 전 로컬 `dist` 를 실제 오리진에 서빙해 검증하고, 배포 후 프로덕션 번들로 재실행했다.
직접 URL 진입(= 북마크 재현)으로 확인 — **18/18 PASS**.

| from | 착지 | blank/404 아님 | route console error |
|------|------|:---:|:---:|
| `/account/supplier` | `/supplier/dashboard` | PASS | 0 |
| `/account/supplier/products` | `/supplier/products` | PASS | 0 |
| `/account/supplier/orders` | `/supplier/orders/manage` | PASS | 0 |
| `/account/supplier/orders/test-id-1234` | `/supplier/orders/test-id-1234` | PASS | 0 |
| `/account/supplier/inventory` | `/supplier/inventory` | PASS | 0 |
| `/account/supplier/settlements` | `/supplier/settlements` | PASS | 0 |

추가 확인:

| 항목 | 결과 |
|------|:---:|
| `replace` 동작 — redirect 후 뒤로가기가 legacy 로 복귀하지 않음 | PASS (`/supplier/orders/manage` → 뒤로 → `/supplier/dashboard`) |
| 동적 id 보존 | PASS |
| 추가 query(`?tab=shipping`) 보존 | PASS |
| 문자열 `":id"` 미사용 | PASS |
| 새로고침(직접 진입) 후에도 canonical 유지 | PASS |
| redirect loop | **0** |

### `/supplier/dashboard` 이중 정의에 대한 확인

`App.tsx` 하단에 legacy redirect `"/supplier/dashboard" → "/supplier"` 가 **별도로 존재**한다.
동일 path 랭크 동점 시 트리 순서상 먼저 선언된 `<Route path="/supplier/dashboard" element={<SupplierDashboardPage />}>`
가 승리하므로, `/account/supplier` → `/supplier/dashboard` 는 마케팅 랜딩(`/supplier`)으로 튕기지 않는다.
**실측으로 착지 경로가 `/supplier/dashboard` 이고 대시보드가 렌더됨을 확인**했다.
이 죽은 redirect 자체는 본 WO 범위 밖이라 접촉하지 않았다(후속 항목 1).

## 11. canonical 회귀 (§13.3)

| route | 착지 유지 | 렌더 | 4xx/5xx |
|-------|:---:|:---:|:---:|
| `/supplier/dashboard` | PASS | PASS | 0 |
| `/supplier/products` | PASS | PASS | 0 |
| `/supplier/orders` | PASS | PASS | 0 |
| `/supplier/orders/manage` | PASS | PASS | 0 |
| `/supplier/inventory` | PASS | PASS | 0 |
| `/supplier/settlements` | PASS | PASS | 0 |

주문 처리목록의 상태 필터·검색 UI 유지 PASS. 권한 튕김 0.
**운영 mutation 은 수행하지 않았다** — 전 구간 비-GET API 요청 **0건** 계측.

## 12. 반응형 (§14)

| target | 1440×900 | 768 | 390×844 |
|--------|:---:|:---:|:---:|
| `/supplier/products` | ok | ok | overflow (**기존 동작**) |
| `/supplier/orders/manage` | ok | ok | ok |
| `/supplier/inventory` | ok | ok | ok |
| `/supplier/settlements` | ok | ok | ok |

`/supplier/products` 390px 가로 overflow 는 선행 CHECK(`...PRODUCTS-LOAD-ERROR-CONTRACT-V1` §8)에서
정상 상태 기준선으로도 동일하게 측정된 **기존 레이아웃 특성**이며, 본 WO 로 생긴 회귀가 아니다.
본 WO 는 target UI 를 변경하지 않았다.

## 13. 배포

| 항목 | 값 |
|------|-----|
| commit | `db23c2d0d` |
| 배포 SHA | `f7e391d63` — `git merge-base --is-ancestor db23c2d0d f7e391d63` = **YES** (본 변경 포함) |
| 배포 run | 30270281524 — `deploy-neture` **success** (타 3서비스 skipped) |
| Cloud Run revision | `neture-web-01349-v2n` → **`neture-web-01350-jht`** (트래픽 100%) |

> push 시점에 병렬 세션이 공유 `main` 을 먼저 push 하면서 본 커밋이 함께 올라갔다
> (`git push` 결과 `Everything up-to-date`). `db23c2d0d` 가 `origin/main` ancestor 임을 확인했다.

## 14. 프로덕션 smoke

배포된 프로덕션 번들 기준으로 §10~§12 전 항목 재실행 — **30/30 PASS, 배포 전 결과와 동일**.

| 구간 | 결과 |
|------|:---:|
| legacy redirect 6 route × (착지 · blank/404 아님 · route error 0) | 18/18 PASS |
| `replace` 뒤로가기 · 동적 id · query 보존 · `":id"` 미사용 · 새로고침 | 5/5 PASS |
| canonical 회귀 6 route + 처리목록 UI | 7/7 PASS |
| 반응형 4 화면 × 3 뷰포트 | 회귀 0 |

**텔레메트리**: page error **0** · 운영 mutation 요청 **0** · redirect loop **0**.

console error 3건은 **존재하지 않는 합성 주문 id(`test-id-1234`, UUID 형식 아님)** 상세를
의도적으로 3회 방문해 발생한 API 400 뿐이다. §13.2 “route redirect 성공과 데이터 404/400 은 분리” 에 해당한다.
별도 probe 로 legacy redirect 5개(정적 route)를 확인한 결과 **4xx/5xx 0건**:

```
/account/supplier             → 4xx/5xx 0건
/account/supplier/products    → 4xx/5xx 0건
/account/supplier/orders      → 4xx/5xx 0건
/account/supplier/inventory   → 4xx/5xx 0건
/account/supplier/settlements → 4xx/5xx 0건
합성 id 상세                   → 400 1건 (GET /neture/supplier/orders/test-id-1234 — 존재하지 않는 주문)
```

## 15. DB · migration · 운영 mutation

| 항목 | 값 |
|------|:---:|
| DB write | **0** |
| migration | **0** |
| 운영 mutation | **0** (계측 확인) |
| backend / API 변경 | **0** |
| 주문 상태 머신 · 배송 엔진 · role constants · notification routing | **무변경** |
| dependency / lockfile | **무변경** |
| 공통 모듈 | **무접촉** |

## 16. staged 범위

작업 중 워킹트리에 타 세션의 dirty·untracked 파일이 존재했다
(`services/web-kpa-society/*`, `apps/api-server/src/scripts/hff-ko-first-10000-*`, `pnpm-lock.yaml`,
`docs/checks/CHECK-O4O-KPA-STORE-SETTINGS-TEMPLATE-APPLY-FIX-V1.md` 등).

이 파일들은 **수정·복구·삭제·stash·stage 하지 않았고**, pathspec 제한 commit 으로 혼입을 차단했다.
`git diff --cached --name-status` 로 스테이지 내용을 확인한 뒤 커밋했다.

## 17. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/App.tsx` | legacy route 6개 redirect 전환 · `LegacySupplierOrderRedirect` 추가 · `useParams` import · dead lazy import 2줄 제거 |
| `docs/checks/CHECK-O4O-NETURE-SUPPLIER-ACCOUNT-ROUTE-LEGACY-REDIRECT-V1.md` | 본 문서 |

`SupplierProductsPage.tsx` 는 §5 판단(의도적 폐기)에 따라 **변경 대상에서 제외**했다.

## 18. 후속 항목

| # | 항목 |
|---|------|
| 1 | `App.tsx` 하단의 죽은 legacy redirect `"/supplier/dashboard" → "/supplier"` 정리 (현재는 선행 route 에 가려져 무해) |
| 2 | 데드코드 A 버킷 — `SupplierAccountDashboardPage` · `SupplierProductsListPage` 파일 제거, `SupplierAccountLayout` 의 redirect-only wrapper 역할 정리 |
| 3 | target 화면이 query 를 소비하게 되면 정적 redirect 에도 query 보존 추가 |
| 4 | §16 부수 발견(bulkDelete 백슬래시 경로, `/workspace/supplier/requests` dangling redirect, 죽은 mock dashboard, 승인 콘솔 중복)은 본 WO 에 섞지 않았다 — 별도 버킷 |
