# CHECK-O4O-NETURE-SUPPLIER-LEGACY-DASHBOARD-AND-ACCOUNT-SHELL-RETIREMENT-V1

WO: `WO-O4O-NETURE-SUPPLIER-LEGACY-DASHBOARD-AND-ACCOUNT-SHELL-RETIREMENT-V1`
대상: `/account/supplier/*` redirect 전환 후 남은 legacy 공급자 화면 · account shell 정리 (A 버킷)
작성일: 2026-07-27 (KST)
선행: `CHECK-...-ORDER-ROUTE-CANONICALIZATION-V1` (`bc36b21f6`) · `CHECK-...-ACCOUNT-ROUTE-LEGACY-REDIRECT-V1` (`db23c2d0d`)

---

## 1. 제거 후보별 importer · route 전수 결과 (§4)

| 파일 | importer | route mount | runtime 소비 | 판정 |
|------|:---:|:---:|:---:|------|
| `pages/account/SupplierAccountDashboardPage.tsx` | **0** | **0** | 없음 | **SAFE_DELETE** |
| `pages/account/SupplierProductsListPage.tsx` | **0** | **0** | 없음 | **SAFE_DELETE** |
| `pages/dashboard/SupplierDashboardPage.tsx` (mock) | **0**¹ | **0** | 없음 | **SAFE_DELETE** |
| `components/layouts/SupplierAccountLayout.tsx` | 1 (`App.tsx`) | redirect shell | legacy shell | **선택지 A → 삭제** |

¹ 유일한 참조는 같은 디렉터리의 배럴 `pages/dashboard/index.ts` 였고, **그 배럴 자체의 importer 가 0** 이었다.
배럴은 이 mock 만 export 하므로 함께 제거했다(§5.3 "0 importer 인 전용 파일 동반 제거 가능").
같은 디렉터리의 `MyContentPage.tsx` 는 `App.tsx` 가 **경로 직접 import** 로 사용 중(`/workspace/my-content`)이라
디렉터리와 해당 파일은 유지했다.

**canonical 재사용 중 — 삭제 금지 확인:**

| 파일 | canonical mount |
|------|-----------------|
| `SupplierOrdersListPage` | `/supplier/orders/manage` |
| `SupplierOrderDetailPage` | `/supplier/orders/:id` |
| `SupplierInventoryPage` | `/supplier/inventory` |
| `SupplierSettlementsPage` | `/supplier/settlements` |
| `pages/supplier/SupplierDashboardPage.tsx` (canonical, 992줄) | `/supplier/dashboard` |

> mock(`pages/dashboard/`, 270줄, 하드코딩 통계)과 canonical(`pages/supplier/`, 992줄)은 **다른 파일**이다.
> `App.tsx` 의 `SupplierDashboardPage` lazy 는 `./pages/supplier` 배럴을 가리키므로 mock 삭제 영향 0.

## 2~3. 삭제한 legacy 페이지 · mock dashboard

| # | 삭제 파일 |
|---|-----------|
| 1 | `services/web-neture/src/pages/account/SupplierAccountDashboardPage.tsx` |
| 2 | `services/web-neture/src/pages/account/SupplierProductsListPage.tsx` |
| 3 | `services/web-neture/src/pages/dashboard/SupplierDashboardPage.tsx` (죽은 mock) |
| 4 | `services/web-neture/src/pages/dashboard/index.ts` (3번만 export 하던 orphan 배럴) |
| 5 | `services/web-neture/src/components/layouts/SupplierAccountLayout.tsx` (아래 §4) |

## 4. SupplierAccountLayout 판정 → **선택지 A (제거)**

### 권한 계약 비교 (근거)

| gate | role set |
|------|----------|
| `SupplierRoute` (redirect source, **유지**) | `SUPPLIER_ROLES` = neture supplier · legacy supplier · legacy **partner** · legacy **seller** + `requireMembership: 'neture'` |
| `SupplierAccountLayout` (제거) | `SUPPLIER_ACCESS_ROLES` = neture supplier · legacy supplier · neture **admin** · **platform super_admin** |
| `SupplierSpaceLayout` (canonical target, 무변경) | **`SUPPLIER_ACCESS_ROLES`** — 동일 set |

핵심: **canonical target 의 `SupplierSpaceLayout` 이 제거되는 layout 과 동일한 `SUPPLIER_ACCESS_ROLES`
재검증을 이미 수행하며, 거부 UI(`접근 권한 없음 / 이 페이지는 공급자 전용입니다` + 홈 링크)와
미인증 처리(`<Navigate to="/login" state={{from}} replace />`)까지 동일하다.**

| 사용자 상태 | 변경 전 | 변경 후 | 권한 변화 |
|-------------|---------|---------|:---:|
| 비로그인 | `SupplierRoute` → 로그인 | 동일 | 없음 |
| membership 없음 / PENDING | `SupplierRoute`(MembershipGate) 기존 안내 | 동일 | 없음 |
| ACTIVE supplier | legacy layout 통과 → redirect | redirect | 없음 |
| **partner / seller** (SUPPLIER_ROLES 포함, ACCESS_ROLES 미포함) | legacy URL 에서 **403 화면** | canonical 로 redirect 후 **동일 403 화면** | **없음** (403 위치만 이동) |
| neture:admin / super_admin (supplier role 없음) | `SupplierRoute` 에서 차단 | 동일 | 없음 |

→ **권한 확대 0 · 축소 0.** 실제 접근 가능 집합은 두 gate 의 교집합으로 변경 전후 동일하다.

### redirect source 구조

`SupplierRoute` 는 `children: React.ReactNode` 를 요구하고 `RouteGuard` 가 `<>{children}</>` 를 반환한다 —
**Outlet 기반 `<Route element={<SupplierRoute />}>` 를 지원하지 않는다**(children 없으면 빈 렌더).
따라서 §8 예시 대신 기존 wrapper 패턴을 유지하고 layout 자리만 `<Outlet />` 으로 교체했다.

```tsx
<Route element={
  <SupplierRoute>
    <Outlet />        {/* was: <SupplierAccountLayout /> */}
  </SupplierRoute>
}>
  <Route path="/account/supplier" element={<Navigate to="/supplier/dashboard" replace />} />
  ... (6개 유지)
</Route>
```

신규 공유 route helper **생성 0**. `role-constants` **무변경**.

## 5. 죽은 `/supplier/dashboard` redirect 제거 (§7)

```tsx
- {/* Legacy supplier/partner 리다이렉트 */}
- <Route path="/supplier/dashboard" element={<Navigate to="/supplier" replace />} />
```

동일 path 가 상단 `SupplierSpaceLayout` 블록에 `SupplierDashboardPage` 로 이미 선언돼 있어
랭킹 동점 시 선언 순서상 항상 그쪽이 승리했다(**실행된 적 없는 정의**).

| 항목 | 결과 |
|------|:---:|
| 변경 후 `/supplier/dashboard` 실행 route | **1개** (`App.tsx:813`, canonical) |
| `/supplier/dashboard` 렌더 회귀 | 없음 (smoke PASS) |

## 6. 유지한 canonical 컴포넌트 (§9)

`SupplierOrdersListPage` · `SupplierOrderDetailPage` · `SupplierInventoryPage` · `SupplierSettlementsPage` ·
`SupplierOrdersPage` · `pages/supplier/SupplierDashboardPage` · `SupplierProductsPage` · `SupplierSpaceLayout` ·
`SupplierRoute` · `LegacySupplierOrderRedirect` · `/account/supplier/*` redirect 6개 — **전부 유지.**

주문·재고·정산 API, DB schema, role constants, notification routing, backend `fulfillmentUrl` — **무접촉.**

## 7. 잔여 검색 (§10)

| 검색어 | 실행 참조 | 비고 |
|--------|:---:|------|
| `SupplierAccountDashboardPage` | **0** | 주석 1건(App.tsx:234) |
| `SupplierProductsListPage` | **0** | 주석 1건(App.tsx:234) |
| `SupplierAccountLayout` | **0** | 주석 1건(App.tsx:872) |
| `pages/dashboard/SupplierDashboardPage` | **0** | 파일 없음 |
| `/account/supplier` | redirect source 6 | + 주석 |
| `/supplier/dashboard` | **route 1개** | + 주석 |
| `SupplierDashboardPage` | canonical 1 (`./pages/supplier` 배럴) | 동일 이름 다른 파일 혼동 없음 |

삭제 파일 **importer 0**, 파일 **0**.

## 8. 권한 상태별 검증 (§11)

브라우저 실측(비로그인) — legacy source 와 canonical target **동작 동일**:

| path | 착지 | 화면 |
|------|------|------|
| `/account/supplier` | `/` | 로그인 UI |
| `/account/supplier/products` | `/` | 로그인 UI |
| `/account/supplier/orders` | `/` | 로그인 UI |
| `/account/supplier/orders/test-id-1234` | `/` | 로그인 UI |
| `/supplier/dashboard` | `/` | 로그인 UI |
| `/supplier/products` | `/` | 로그인 UI |

ACTIVE supplier 계정 실측은 §9·§10 참조(전 route redirect·렌더 PASS).
partner/seller · admin-without-supplier 는 **실계정이 없어 코드 경로로 검증**했다(§4 표).
`SUPPLIER_ROLES` vs `SUPPLIER_ACCESS_ROLES` 차이는 §4 에 기록했고, **role set 은 수정하지 않았다.**

| 항목 | 결과 |
|------|:---:|
| redirect loop | **0** |
| 권한 확대 | **0** |
| 권한 축소 | **0** |

## 9. legacy redirect 회귀 (§12)

6개 legacy URL 전부 기존 canonical target 으로 redirect — **18/18 PASS**
(착지 · SPA blank/404 아님 · route console error 0).

| from | 착지 |
|------|------|
| `/account/supplier` | `/supplier/dashboard` |
| `/account/supplier/products` | `/supplier/products` |
| `/account/supplier/orders` | `/supplier/orders/manage` |
| `/account/supplier/orders/test-id-1234` | `/supplier/orders/test-id-1234` |
| `/account/supplier/inventory` | `/supplier/inventory` |
| `/account/supplier/settlements` | `/supplier/settlements` |

`replace` 유지(뒤로가기 시 legacy 미복귀) · 동적 id 보존 · `?tab=shipping` 보존 · `":id"` 미사용 ·
새로고침 후 canonical 유지 — **5/5 PASS**.

## 10. canonical 기능 회귀 (§12)

| route | 착지 유지 | 렌더 | 4xx/5xx |
|-------|:---:|:---:|:---:|
| `/supplier/dashboard` | PASS | PASS | 0 |
| `/supplier/products` | PASS | PASS | 0 |
| `/supplier/orders` | PASS | PASS | 0 |
| `/supplier/orders/manage` | PASS | PASS | 0 |
| `/supplier/inventory` | PASS | PASS | 0 |
| `/supplier/settlements` | PASS | PASS | 0 |

주문 처리목록 상태 필터·검색 UI 유지 PASS. **운영 mutation 0건** 계측.

## 11. 반응형 (§14)

| target | 1440×900 | 768 | 390×844 |
|--------|:---:|:---:|:---:|
| `/supplier/products` | ok | ok | overflow (**기존 기준선**) |
| `/supplier/orders/manage` | ok | ok | ok |
| `/supplier/inventory` | ok | ok | ok |
| `/supplier/settlements` | ok | ok | ok |

`/supplier/products` 390px overflow 는 선행 CHECK 2건에서 정상 상태 기준선으로도 동일 측정된
기존 레이아웃 특성이며 본 WO 로 생긴 회귀가 아니다. 본 WO 는 UI 를 변경하지 않았다.

## 12. typecheck · build · chunk 제거 (§13)

| 항목 | 결과 |
|------|:---:|
| `tsc --noEmit -p tsconfig.json` | **PASS** (출력 0줄, exit 0) |
| `pnpm --filter @o4o/web-neture build` | **PASS** |
| unused lazy import | 0 |
| 삭제 파일 importer | 0 |
| route duplicate (`/supplier/dashboard`) | **해소 — 1개** |
| `Navigate`/`Outlet`/`useParams` 오류 | 0 |

**제거 chunk 확인** — `dist` 를 지우고 클린 빌드 후 `dist/assets` 에서
`SupplierAccountDashboard` / `SupplierProductsList` / `SupplierAccountLayout` 패턴 chunk 를 세면 **0건**.
삭제한 3개 페이지/레이아웃의 dynamic import chunk 가 산출물에서 사라졌다.

## 13. 배포

| 항목 | 값 |
|------|-----|
| commit | `4f0f7ba3f` |
| push run (30275474288) | **cancelled** — 병렬 세션의 후속 push 로 concurrency 취소 |
| 후속 push run (30275476358, sha `c5809eb58`) | `deploy-neture` **skipped** — detect-changes 가 tip 커밋 기준으로만 판정하는 알려진 동작(해당 커밋은 kpa-society 변경) |
| 명시 재배포 | `gh workflow run deploy-web-services.yml --ref main -f service=neture` → run **30275542436** (`workflow_dispatch`) |
| 배포 SHA | `ca035f9e1` — `git merge-base --is-ancestor 4f0f7ba3f ca035f9e1` = **YES** |
| 결과 | `detect-changes` success · `deploy-neture` **success** (타 3서비스 skipped) |
| Cloud Run revision | `neture-web-01351-xfm` → **`neture-web-01352-mb5`** (트래픽 100%) |

> 본 커밋의 자체 push run 이 concurrency 로 취소되고, 뒤이은 push 는 tip 커밋이 neture 를 건드리지 않아
> `deploy-neture` 가 skip 되었다. 두 경로 모두로는 배포되지 않으므로 **명시 dispatch 로 재배포**했다.

## 14. 프로덕션 smoke

배포된 프로덕션 번들(`neture-web-01352-mb5`) 기준으로 §9~§11 전 항목 재실행 — **30/30 PASS**, 배포 전 결과와 동일.

| 구간 | 결과 |
|------|:---:|
| legacy redirect 6 route × (착지 · blank/404 아님 · route error 0) | 18/18 PASS |
| `replace` 뒤로가기 · 동적 id · query 보존 · `":id"` 미사용 · 새로고침 | 5/5 PASS |
| canonical 회귀 6 route + 처리목록 UI | 7/7 PASS |
| 반응형 4 화면 × 3 뷰포트 | 회귀 0 |

**텔레메트리**: page error **0** · 운영 mutation 요청 **0** · redirect loop **0**.

console error 3건은 존재하지 않는 합성 주문 id(`test-id-1234`, UUID 형식 아님) 상세를 의도적으로
3회 방문해 발생한 API 400 뿐이다(선행 CHECK 와 동일 패턴). 실제 legacy redirect 경로 자체의 4xx/5xx 는 0건이다.

## 15. DB · migration · 운영 mutation

| 항목 | 값 |
|------|:---:|
| DB write / migration | **0 / 0** |
| 운영 mutation | **0** (계측 확인) |
| backend / API 변경 | **0** |
| role constants · notification routing · 주문/재고/정산 기능 | **무변경** |
| dependency / lockfile | **무변경** |
| 공통 모듈(`packages/*`) | **무접촉** |

## 16. staged 범위

착수·커밋 시점 워킹트리에 타 세션 dirty 파일이 다수 존재했다
(`services/web-kpa-society/**` 다수, `apps/api-server/src/routes/kpa/**`,
`packages/operator-core-ui/**`, `pnpm-lock.yaml` 등).

**수정·복구·삭제·stash·stage 하지 않았고**, pathspec 제한 commit 으로 혼입을 차단했다.
`git diff --cached --name-status` 로 스테이지 내용을 확인한 뒤 커밋했다.

## 17. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/App.tsx` | layout → `Outlet` 교체 · `SupplierAccountLayout` import 제거 · 죽은 `/supplier/dashboard` redirect 제거 · `Outlet` import 추가 · 주석 정리 |
| `services/web-neture/src/pages/account/SupplierAccountDashboardPage.tsx` | **삭제** |
| `services/web-neture/src/pages/account/SupplierProductsListPage.tsx` | **삭제** |
| `services/web-neture/src/pages/dashboard/SupplierDashboardPage.tsx` | **삭제** (mock) |
| `services/web-neture/src/pages/dashboard/index.ts` | **삭제** (orphan 배럴) |
| `services/web-neture/src/components/layouts/SupplierAccountLayout.tsx` | **삭제** |
| `docs/checks/CHECK-...-RETIREMENT-V1.md` | 본 문서 |

## 18. 후속 항목

| # | 항목 |
|---|------|
| 1 | `/account/supplier/*` redirect 자체의 은퇴(404 전환) — 사용량 관측 후 별도 판단 (§15 제외 항목) |
| 2 | §15 부수 발견(bulkDelete 경로 버그, `/workspace/supplier/requests` dangling redirect, 승인 콘솔 중복, load-error 계약)은 본 WO 에 섞지 않았다 |
| 3 | `pages/dashboard/` 디렉터리에는 `MyContentPage` 만 남았다 — 디렉터리 명명 정리는 별도 |
