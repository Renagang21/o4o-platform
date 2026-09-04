# WO-O4O-FINAL-CODE-ONLY-RETIREMENT-CLOSURE-V1 — CHECK

- 작업일: 2026-09-04
- 브랜치: `work/o4o-final-code-only-retirement-v1` (격리 worktree)
- 시작 HEAD: `943cc760dede4f9460a45da87f1696a4f18beb82`
- 시작 origin/main: `943cc760dede4f9460a45da87f1696a4f18beb82`
- 최종 판정: **FINAL_CODE_ONLY_RETIREMENT_CLOSED**

선행 census `WO-O4O-POST-CLEANUP-FINAL-RESIDUE-AND-CLOSURE-CENSUS-V1` 이 `RETIRE_READY` 로
남긴 code-only 4축을 한 번에 닫았다. production DB write 0 · migration 0 · seed 0 · shim 0.

---

## 1. 축 B — Neture admin 전용 승인 표면 은퇴

canonical 승인 경로는 operator 다 (`WO-O4O-NETURE-SUPPLIER-APPROVAL-CONSOLE-AND-ADMIN-GOVERNANCE-SEPARATION-V1`).
admin 표면은 그 분리 이후 진입점이 없는 잔재였다.

### 제거 (backend)

`apps/api-server/src/modules/neture/controllers/admin.controller.ts` — 8 route

| route | 비고 |
|---|---|
| `GET /suppliers/pending` | canonical = `GET /neture/operator/suppliers/pending` |
| `POST /suppliers/:id/approve` | canonical = operator |
| `POST /suppliers/:id/reject` | canonical = operator |
| `GET /products/pending` | canonical = operator |
| `POST /products/:id/approve` | canonical = operator |
| `POST /products/:id/reject` | canonical = operator |
| `POST /products/batch-approve` | canonical = operator |
| `POST /products/batch-reject` | canonical = operator |

diff: 9 insertions / 228 deletions (제거 라인 supplier 74 · productPending 14 · productApproval 143).

### 제거 (frontend)

| 파일 | 처리 |
|---|---|
| `services/web-neture/src/pages/admin/AdminProductApprovalPage.tsx` | 삭제 (463 lines) |
| `apps/admin-dashboard/src/pages/neture/ProductApprovalQueuePage.tsx` | 삭제 |
| `services/web-neture/src/App.tsx` | lazy import + `/admin/product-approvals` route 제거 |
| `apps/admin-dashboard/src/pages/neture/NetureRouter.tsx` | lazy import + `<Route path="approvals">` 제거 |
| `services/web-neture/src/lib/api/admin.ts` | `adminProductApi` 전체 · `adminSupplierApi.getPendingSuppliers/approveSupplier/rejectSupplier` 제거 |
| `services/web-neture/src/lib/api/index.ts` | `adminProductApi` re-export 제거 |
| `apps/admin-dashboard/src/pages/neture/SupplierListPage.tsx` | 승인/거절 fetcher·mutation·handler·버튼 제거 |

### 보존 (§7)

- operator 승인 컨트롤러: `operator-supplier.controller.ts` · `operator-product-approval.controller.ts`
- 공유 service: `netureService.approveSupplier / rejectSupplier / approveProduct / rejectProduct / getPendingSuppliers`
- operator 화면·route·메뉴: `OperatorProductApprovalPage` · `/operator/product-approvals` · `operatorMenuGroups.ts`
- operator client: `operatorSupplierApi` · `operatorProductApi`
- admin governance(active): `GET /suppliers` · `/suppliers/governance` · `/suppliers/:id/deactivate` · `/:id/reactivate` · `/:id/onboarding` · `/requests` · `/service-approvals*` · `/approval-integrity-check` · `/sync-offer-approvals`
- `SupplierListPage` 의 목록 조회 + 비활성화 기능

---

## 2. 축 C — `stores/:slug/channels/b2c` route 은퇴

`apps/api-server/src/routes/platform/store-policy.routes.ts` 에서
`POST /:slug/channels/b2c/activate` · `POST /:slug/channels/b2c/deactivate` 2 route 제거 (119 lines).
파일 헤더의 B2C Channel 설명을 RETIRED 표기로 교체했다.

매장 소비자 commerce 는 O4O 범위 밖이다 (`O4O-STORE-COMMERCE-BOUNDARY-V1`).

### DB 무접촉 (§13)

- `organization_channels` DB DELETE **0** / UPDATE **0** / migration **0**
- entity · migration(`20260215200001-CreateOrganizationChannels` 외 2건)은 실제 schema 와 일치해야 하므로 **그대로 보존**
- 보존 route: `/:slug/policies` · `/:slug/payment-config` · `/:slug/slug`

---

## 3. 축 D — `packages/cosmetics-seller-extension` 패키지 은퇴

### §17 전체 은퇴 조건 census

| 조건 | 측정 | 결과 |
|---|---|---|
| runtime consumer | `@o4o/cosmetics-seller-extension` import 0건 (라우트 미마운트) | 0 |
| dependency consumer | `apps/api-server/package.json` 1건뿐 (이번에 제거) | 0 |
| CI-specific consumer | `.github/workflows/deploy-api.yml` build 1줄뿐 (이번에 제거) | 0 |
| independent deploy | 없음 | 0 |
| app_registry install | production `app_registry` 6행에 부재 · `app_instances` 0행 | 0 |
| external/public contract | 없음 | 0 |
| UNKNOWN | — | **0** |

> production 측정치는 선행 CHECK
> `WO-O4O-POST-CLEANUP-FINAL-RESIDUE-AND-CLOSURE-CENSUS-V1-CHECK.md` 의 기록을 근거로 삼았다
> (이번 WO 는 DB 접속 0 — §35).

### 처리 (§18 — 부분 보존 없음)

- `packages/cosmetics-seller-extension/**` tracked 38 파일 전량 삭제
- `apps/api-server/package.json`: workspace dependency + `build:deps` 세그먼트 제거
- `apps/api-server/tsconfig.json`: `{backend,manifest}` path mapping 2건 제거
- `.github/workflows/deploy-api.yml`: build 라인 + 빈 `# Cosmetics Extensions` 섹션 제거
- `pnpm-lock.yaml`: importer dep 3줄 + importer block 25줄 = **28 deletions / 0 insertions**
  (§19 — unrelated dependency/resolution 변화 **0**. `pnpm install --frozen-lockfile` PASS 로 확인)

K-Cosmetics 서비스 자체와 `cosmetics` serviceGroup 은 무접촉이다 (§22).

---

## 4. 축 E — APPS_CATALOG 정합

`apps/api-server/src/app-manifests/appsCatalog.ts` 의 `cosmetics-seller-extension` 항목 **제거**(§21 기본값 `REMOVE_CATALOG_ENTRY`).
설치 가능한 실체가 없어졌고, 동일 ID 계약을 쓰는 active replacement app 은 없다 (중지 조건 미해당).

`sellerops` serviceGroup 소비자는 `market-trial`(serviceGroups `['cosmetics','supplierops','sellerops']`)이 계속 담당한다.
카탈로그 항목 수 16 → 15.

---

## 5. 테스트 (§28-29)

기존 spec 확장을 우선했고, 신규 spec 은 1개만 추가했다.

| 파일 | 처리 |
|---|---|
| `src/__tests__/final-code-only-retirement-closure.spec.ts` | **신규 1건** — 축 B·C guard |
| `src/__tests__/shortcode-domain-retirement.spec.ts` | 8번 describe 를 "패키지 부재" 단언으로 전환 (삭제 파일을 fixture 로 재생성하지 않음) |
| `src/__tests__/public-appstore-read-retirement.spec.ts` | 카탈로그 항목 수 16 → 15 |
| `src/__tests__/app-management-runtime-residue-retirement.spec.ts` | packages manifest.ts 13 → 12 |
| `tests/multi-tenant/appstore.spec.ts` | 5개 단언을 `not.toContain('cosmetics-seller-extension')` + live 대체(`forum-cosmetics` · `market-trial`)로 전환 |
| `tests/multi-tenant/setup.ts` | fixture appId 6건 → `forum-cosmetics` |

> `tests/multi-tenant/**` 는 api-server jest `roots: ['<rootDir>/src']` 밖이라 현재 러너가 수집하지 않는다.
> 그럼에도 stale fixture 를 남기지 않기 위해 함께 정합화했다. (관측 기록 — 이번 WO 범위에서 러너 설정은 바꾸지 않았다.)

---

## 6. 검증 (§30-34)

| 게이트 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm run build:packages` | PASS |
| `pnpm --filter './packages/**' run build` | `@o4o/financial-core` 만 실패 — **선행 결함**(`tsup` no input files), 이번 변경과 무관 |
| `pnpm --filter @o4o/api-server run type-check` | **PASS (exit 0)** |
| api-server 전체 Jest | **226 suites / 3,795 tests PASS** |
| `@o4o/admin-dashboard` type-check · build | PASS |
| `@o4o/web-neture` build (`tsc && vite build`) | PASS |
| `@o4o/web-k-cosmetics` build | PASS — K-Cosmetics 빌드 무영향 확인 (§37) |
| DEAD_REFERENCE | **0** (비-doc 잔여 hit 는 전부 주석·test guard·보존된 operator 경로) |
| UNKNOWN | **0** |
| production DB write | **0** |
| migration | **0** |
| production smoke | **PENDING** — 미배포 상태 (§36) |

---

## 7. 보호 축 무접촉 확인 (§12 · §25-27)

`store_cart_items` · `checkout_orders` · `neture_orders` · PharmacyHub B2B bridge ·
외부 판매채널 order · refund · settlement · notification: **변경 0**.
이번 diff 는 Neture admin 승인 표면 · store-policy B2C route · cosmetics-seller-extension 패키지 ·
카탈로그 항목 · 관련 test/CI/lockfile 정합에 국한된다.

---

## 8. 관측 (범위 외 — 별도 WO 후보)

1. `apps/main-site/src/pages/seller/dashboard/sellerDashboard.api.ts` 가 `/api/v1/cosmetics-seller` 를 호출한다.
   해당 라우트는 **처음부터 마운트된 적이 없다**(dead API consumer). 이번 WO 의 제거 대상 목록(§8)에 없어 손대지 않았다.
2. backend `GET /neture/admin/products` · `/neture/admin/products/summary` 는 이번 은퇴로 consumer 0 이 되었다.
   §8 제거 목록에 없는 route 라 보존했다.
3. `packages/financial-core` build 실패는 선행 결함이다.

---

## 9. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (위 관측 1·2)
