# CHECK-O4O-STORE-POP-LEGACY-INSTANT-PDF-RETIREMENT-FINAL-CLOSURE-V1

> **WO**: `WO-O4O-STORE-POP-LEGACY-INSTANT-PDF-RETIREMENT-FINAL-CLOSURE-V1`
> **상태**: CLOSED_WITH_REPORT · PRODUCTION SMOKE PASS
> **구현 commit**: `cb964ad9c` (worktree `work/store-pop-legacy-instant-pdf-final-closure-v1`, 기준 `origin/main` = `d6bf3d031` → rebase 후 `6ae74cbd6`)
> **작성일**: 2026-09-11
> **선행**: 체인 ② `CHECK-O4O-KCOS-LIBRARY-CONTENT-BD-CANONICAL-REALIGNMENT-V1` ·
> ③ `CHECK-O4O-STORE-CONTENTS-SELECTOR-INLINE-POP-TO-V2-MIGRATION-V1` ·
> `CHECK-O4O-STORE-POP-LEGACY-RETIREMENT-AND-DEAD-CODE-CLOSURE-V1` (KEEP_TEMPORARY 판정의 원본)
> **후속**: 없음 — POP 축 정리 완료

---

## 0. 결론 (한 줄)

KPA/KCos 에 남아 있던 **legacy 즉시 PDF POP 축**(page · 모달 · api client · 공통 composer · `POST /pharmacy/pop/generate` controller)을 제거했다.
사용자-facing old route(`/store/marketing/pop`, `/store/pop`)는 **POP V2 로 redirect**, API route 는 **제거(404)**.
POP V2 만 매장 POP canonical 로 남고, `store_pops` HUB 축 · `store_execution_assets(usage_type='pop')` historical row · schema 는 손대지 않았다.

**사용자 retire 목록 대비 편차 1건(보존)**: `pop-generator.service.ts` 는 POP V2 renderer(`pop-v2-renderer.service.ts` → `generatePopPdf`)의 의존이라 **제거하지 않았다**.
legacy 전용 backend 는 `store-pop.controller.ts` 이며 이것은 제거했다.

---

## 1. 최신 origin/main 재검증 (step 1)

- 착수 시 `origin/main` = `d6bf3d031`. 전용 worktree `C:\tmp\o4o-pop-ret`, 브랜치 `work/store-pop-legacy-instant-pdf-final-closure-v1`.
- push 직전 `origin/main` = `6ae74cbd6`(`WO-O4O-LOCAL-DATA-SQLITE-V0`) — 이번 WO 접촉 경로(`packages/store-ui-core` · `web-kpa-society` · `web-k-cosmetics` · `apps/api-server/src/routes`)와 겹침 0. rebase clean.

## 2. legacy caller 최종 census (step 2~5)

### 2-1. 코드 (import graph + 리터럴)

| 대상 | 소비처 | 판정 |
|---|---|---|
| `StorePopCreateModal.tsx` (KPA) | ③ 에서 0 으로 만든 뒤 `@deprecated` 만 | **제거** |
| `api/storePop.ts` (KPA `generateStorePop`) | `StorePopPage.tsx` 만 | **제거** |
| `pages/pharmacy/StorePopPage.tsx` (KPA) | `App.tsx` route `marketing/pop` 만 | **제거** |
| `pages/store/StorePopPage.tsx` (KCos) | `App.tsx` route `marketing/pop` 만 | **제거** |
| `packages/store-ui-core/src/components/pop/*` (13 파일, legacy composer) | KPA/KCos `StorePopPage` + V2 view 가 `popStyles` 3개만 재사용 | **제거** (스타일 3개는 `pop-v2/popV2Styles.ts` 로 이관) |
| `CANONICAL_STORE_POP_ROUTE` · `buildLocalProductPopState` (`productionUtils.ts`) | 0 | **제거** |
| `store-pop.controller.ts` (`POST /pharmacy/pop/generate` · `GET /pharmacy/pop/source/supplier-items`) | `kpa.routes.ts` · `cosmetics.routes.ts` mount 만 | **제거** |
| `pop-generator.service.ts` (`generatePopPdf`) | **`pop-v2-renderer.service.ts`** | **보존** (V2 의존) |
| `store-pop.service.ts` (`listStorePops/createStorePop/importStorePop…`) | `pop.controller.ts` · `PharmacyHubStorePopController.ts` · `operator-pop.controller.ts` | **보존** (store_pops HUB 축) |
| `ProductPopBuilderPage` (KPA/KCos `commerce/products/:productId/pop`) | 이미 V2 로 Navigate | 무변경 |

`node scripts/quality/check-literal-consumers.mjs --source <각 제거 파일>` → 살아있는 소비처 0 (HISTORICAL_DOC 만).
`store-pop.controller.ts` 에서 ACTIVE_RUNTIME 3건으로 잡힌 것은 전부 `tmp/product-db-write-authority/raw-scan.json:1043` — 과거 스캔 산출물(JSON), 런타임 코드 아님.

### 2-2. production 로그 (gcloud logging · 최근 60일)

| 요청 | 건수 | 비고 |
|---|---|---|
| `POST /api/v1/*/pharmacy/pop/generate` | **0** | GET 404 1건(9/10, 조사 세션의 probe) 뿐 |
| `GET /api/v1/*/pharmacy/pop/source/supplier-items` | 19 | 전부 2026-08-13~19, cosmetics/glycopharm legacy 페이지 마운트 fetch. glycopharm 은 이미 제거됨 |

→ 외부/public consumer 없음. **중지 조건 5개 모두 해당 없음**
(외부 consumer 0 / HUB handoff 는 `marketing/pop/library` staff page 가 담당(legacy page 불필요) / KCos deep-link 는 V2 redirect 로 치환 / schema 변경 불필요 / 병렬 세션 충돌 없음).

## 3. 변경 내역 (step 6~10)

| 구분 | 파일 | 변경 |
|---|---|---|
| backend | `routes/o4o-store/controllers/store-pop.controller.ts` | **삭제** |
| backend | `routes/kpa/kpa.routes.ts` · `routes/cosmetics/cosmetics.routes.ts` | import · `router.use('/', createStorePopController(...))` 제거, 주석으로 historical row 보존 명시 |
| backend | `store-pop-v2.controller.ts` | 주석 1줄(legacy 제거 반영) |
| KPA | `pages/pharmacy/StorePopPage.tsx` · `components/store/StorePopCreateModal.tsx` · `api/storePop.ts` | **삭제** |
| KPA | `App.tsx` | `marketing/pop` → `<Navigate to="/store/marketing/pop-v2" replace/>`, `pop` → 동일 |
| KCos | `pages/store/StorePopPage.tsx` | **삭제** |
| KCos | `App.tsx` | `marketing/pop` → V2 Navigate, `pop` → V2 Navigate. `marketing/pop/library`(StorePopStaffPage) 유지 |
| package | `store-ui-core/src/components/pop/*` 13 파일 | **삭제** |
| package | `store-ui-core/src/components/pop-v2/popV2Styles.ts` | 신설 — `popPageStyle` · `popSectionStyle` · `popStepBadgeStyle` (V2 가 쓰던 3개) |
| package | `StorePopV2EditorView.tsx` · `StorePopV2ListView.tsx` | import `../pop/popStyles` → `./popV2Styles` |
| package | `store-ui-core/src/index.ts` · `utils/productionUtils.ts` | `components/pop` export · `CANONICAL_STORE_POP_ROUTE` · `buildLocalProductPopState` 제거 |
| package | `config/storeMenuConfig.ts` | KPA POP 메뉴 `/marketing/pop` → `/marketing/pop-v2` |
| package | `shared-space-ui/src/guide/copy/kpa.ts`(4) · `k-cosmetics.ts`(3) | `'/store/marketing/pop'` → `'/store/marketing/pop-v2'` |
| test | `__tests__/store-pop-legacy-instant-pdf-retirement.spec.ts` | 신설 (18 cases) |
| test | `kcos-pop-v2-canonical-adoption.spec.ts` · `store-contents-selector-inline-pop-to-v2.spec.ts` | retired 상태로 갱신 |

34 files, +246 / −3,235. `package.json` · lockfile · migration · entity 변경 0.

### old route 처리 원칙 적용

| route | 처리 | 근거 |
|---|---|---|
| `/store/marketing/pop` (KPA · KCos) | **V2 redirect** | bookmark/deep-link 가능성(메뉴·가이드에 노출됐던 경로) |
| `/store/pop` (KPA · KCos) | **V2 redirect** | 기존 단축 redirect 대상만 교체 |
| `POST /api/v1/{kpa,cosmetics}/pharmacy/pop/generate` · `GET …/pop/source/supplier-items` | **제거(404)** | 60일 caller 0 · public contract 아님 |

## 4. 회귀 (step 11~13)

| 항목 | 결과 |
|---|---|
| `pnpm run build:packages` | 0 |
| `tsc --noEmit` api-server / web-kpa-society / web-k-cosmetics / web-pharmacy-hub | 모두 0 (rebase 후 api-server 재확인 0) |
| jest `store-pop-legacy-instant-pdf-retirement.spec.ts` | 18/18 |
| jest `kcos-pop-v2-canonical-adoption.spec.ts` · `store-contents-selector-inline-pop-to-v2.spec.ts` · `store-pop.service.test.ts` | 3 suites PASS (합계 61 tests) |
| vitest `store-ui-core` `popV2Handoff.contract.test.ts`(15) · `my-store-parity-contract.test.ts`(16) · `storeExecutionModel.test.ts`(24) | PASS |
| vitest `store-cart/useStoreCart.axis-separation` 4 · `supply-catalog/SupplyCatalogHub.cart-producer` 5 | **FAIL — origin/main(`6ae74cbd6`)에서도 동일 9건 실패**. POP 무관(장바구니 축). 이번 WO 에서 손대지 않음 → 별도 보고 |
| eslint 변경 파일 16개 | 0 errors (경고 2건은 `kpa.routes.ts` 기존 unused import, 이번 diff 아님) |
| `check-staged-scope.mjs` | 34/34 범위 내 |

## 5. Production smoke (step 14)

배포: Deploy Web Services · Deploy API Server · Deploy Admin Dashboard · CodeQL 모두 **success** (commit `cb964ad9c`). API revision `o4o-core-api-03613-rbr`.
계정 `ren***`(약국 경영자 · KCos store_owner · PH store_owner), 자격증명은 `docs/local/TEST-ACCOUNTS.local.md` 런타임 parse. headless Chrome(Playwright) + API 직접 호출.

### 5-1. 브라우저 (KPA `kpa-society.co.kr` · KCos `k-cosmetics.site`)

| 항목 | KPA | KCos |
|---|---|---|
| `/store/marketing/pop` | → `/store/marketing/pop-v2` (V2 화면 · legacy composer 문구 0) | 동일 |
| `/store/pop` | → `/store/marketing/pop-v2` | 동일 |
| `/store/marketing/pop-v2` 목록 | `200 GET /kpa/pharmacy/pop-v2` · 새 POP 버튼 1 | `200 GET /cosmetics/pharmacy/pop-v2` · 새 POP 버튼 1 |
| store_pops HUB 화면 | `/store-hub/pop` HubPopLibraryPage 렌더(200) | `/store/marketing/pop/library` StorePopStaffPage 렌더 — API `403 /stores/<slug>/pop/staff` (**기존**: 9/10 revision `03597-cmk` 에서도 동일 403 로그. `resolveOwnedStoreId` 매장 소유자 판정 · 이번 WO 무관 · 별도 보고) |
| 앱이 보낸 legacy `pop/generate` · `pop/source` 호출 | 0 | 0 |
| console error / pageerror / 4xx·5xx | 0 / 0 / 0 | 위 기존 403 1건 / 0 / 위 1건 |

### 5-2. API (Bearer · read-only)

| 요청 | kpa | cosmetics | pharmacy-hub |
|---|---|---|---|
| `POST …/pharmacy/pop/generate` | **404** (배포 전 400 VALIDATION_ERROR → 배포 후 404) | **404** | 404 |
| `GET …/pharmacy/pop/source/supplier-items` | **404** (배포 전 200) | **404** | — |
| POP V2 목록 `GET …/pharmacy/pop-v2` (PH: `/store-owner/pop-v2`) | 200 n=1 | 200 n=1 | 200 n=0 |
| store_pops 축 `GET /store-owner/pop` · `/store-owner/pop/hub` (PH) | — | — | 200 · 200 |
| operator POP `GET /operator/pop/posts` | 403(매장 계정 · 정상) | 403 | — |
| **historical** `GET /store/assets?usage_type=pop` (store_execution_assets) | **200 total=12** | **200 total=4** | — |

→ legacy API 두 route 는 production 에서 제거 확인. V2 · store_pops · historical 산출물 전부 그대로. DB write 0.

## 6. 완료 조건

```
LEGACY INSTANT PDF FRONTEND     = REMOVED   (KPA StorePopPage/StorePopCreateModal/api/storePop · KCos StorePopPage · store-ui-core components/pop 13)
LEGACY GENERATE API             = REMOVED   (store-pop.controller.ts · kpa/cosmetics mount · production 404)
LEGACY POP SERVICE              = REMOVED   (legacy 전용 backend = controller. pop-generator.service.ts 는 V2 renderer 의존으로 보존 — 편차 §0)
OLD ROUTES                      = REDIRECTED_OR_RETIRED (/store/marketing/pop · /store/pop → pop-v2 redirect / API route 제거)
POP V2 CANONICAL ONLY           = PASS
STORE_POPS HUB AXIS             = PRESERVED (store-pop.service · pop.controller · operator-pop · PH · HubPopLibraryPage · KCos pop/library)
HISTORICAL POP OUTPUT           = PRESERVED (store_execution_assets usage_type='pop' row · entity 무변경 · migration 0)
KPA / PH / KCOS REGRESSION      = PASS
SCHEMA CHANGE                   = 0
PRODUCTION SMOKE                = PASS
```

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(vitest store-cart/supply-catalog 기존 실패 9건)
