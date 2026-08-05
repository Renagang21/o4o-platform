# CHECK-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1

- **WO**: `WO-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1`
- **선행 감사**: [`CHECK-O4O-DROPSHIPPING-AND-HEALTH-LEGACY-RETIREMENT-AUDIT-V1`](CHECK-O4O-DROPSHIPPING-AND-HEALTH-LEGACY-RETIREMENT-AUDIT-V1.md) §5 · §8-1 (R1~R4)
- **일자**: 2026-08-05
- **성격**: 제거 실행 (**DB write 0 / migration 0 / migration 파일 미삭제**)
- **판정**: **완료**. 중지 조건 해당 없음.

---

## 0. 한 문장 결론

감사에서 `DELETE` 로 확정된 dropshipping 레거시 체인(패키지 6종 + api-server 스텁 2종 + 백엔드 라우트 + admin 프런트 56 files + 카탈로그·빌드·CI 설정)을 제거했고, **삭제 대상 package·route·manifest 참조는 전역 0**, typecheck·test·build 는 전부 EXIT 0 이다.

---

## 1. 삭제한 패키지

| 패키지 | 처리 |
|------|------|
| `packages/dropshipping-core` | `git rm -r` |
| `packages/dropshipping-cosmetics` | `git rm -r` |
| `packages/sellerops` | `git rm -r` |
| `packages/supplierops` | `git rm -r` |
| `packages/pharmacyops` | `git rm -r` |
| `packages/pharmaceutical-core` | `git rm -r` |
| `apps/api-server/packages/dropshipping-core` (스텁) | `git rm -r` |
| `apps/api-server/packages/dropshipping-cosmetics` (스텁) | `git rm -r` |

**유령 디렉터리 (tracked 0 — 로컬 잔여물 삭제)**: `packages/health-extension`, `packages/diabetes-core`, `packages/diabetes-pharmacy`

---

## 2. 삭제한 라우트

| 대상 | 처리 |
|------|------|
| `/api/v1/dropshipping` mount | `bootstrap/register-routes.ts` 의 import + `app.use(...)` 블록 제거 (사유 주석 대체) |
| `apps/api-server/src/routes/dropshipping-admin/**` | 14 files `git rm -r` |
| `app-manifests/dropshipping-core.manifest.ts` · `sellerops.manifest.ts` · `supplierops.manifest.ts` | 3 files `git rm` (**전역 importer 0 확인 후**) |
| admin `/admin/dropshipping/order-relays{,/:id}` · `/admin/dropshipping/settlements{,/:id}` | `routes/commerce.routes.tsx` 4 라우트 + lazy import 4건 제거 |
| admin `/admin/test/dropshipping-users` | `routes/test.routes.tsx` 라우트 + lazy import 제거 |

> 삭제 전 확인: 삭제된 라우터가 실제로 제공하던 경로는 **`/api/v1/dropshipping/admin/*` 뿐**이었고, 그 조회 대상 테이블 3종은 감사 §2 에서 프로덕션 부재로 확인됐다.

---

## 3. 삭제한 화면 (admin-dashboard, tracked 56 files)

| 대상 | files |
|------|:---:|
| `src/pages/dropshipping/**` | 25 |
| `src/pages/dropshipping-offers/**` | 6 |
| `src/components/shortcodes/dropshipping/**` | 22 |
| `src/api/dropshipping-admin.ts` · `src/api/dropshipping-cpt.ts` | 2 |
| `src/pages/test/DropshippingUsersTest.tsx` | 1 |
| **합계** | **56** |

**연쇄 정리 (소비처 수정)**

| 파일 | 내용 |
|------|------|
| `services/ai/block-registry-extractor.ts` | `@/components/shortcodes/dropshipping` 동적 import 및 추출 블록 제거, `'Dropshipping'` 카테고리 분기 제거 |
| `hooks/useDynamicCPTMenu.tsx` | `ds_` prefix CPT 를 별도 메뉴로 분리하던 분기 제거. **상위 메뉴 `id='dropshipping'` 가 존재하지 않아 해당 CPT 는 메뉴에서 누락되던 상태**였고, 이제 일반 CPT 경로를 따른다 |
| `pages/cpt-engine/CPTDashboardToolset.tsx` | `DROPSHIPPING_CPTS` 하드코딩 합성(DB 에 없는 CPT 를 목록에 주입), `DS` 배지, "Dropshipping CPTs Status" 섹션 제거 |
| `pages/cpt-engine/components/CPTContentList.tsx` | 죽은 breadcrumb `/dropshipping/products` 제거 |
| `pages/ToolsPage.tsx` | 죽은 버튼 `/dropshipping/products/bulk-import` 제거 |
| `components/routing/ViewComponentRegistry.ts` | `sellerops.router` · `supplierops.router` 등록 제거 (해당 appId 가 카탈로그에서 삭제됨). **`partnerops.router` 는 유지** |
| `tests/admin-operation-boundary.test.ts` | KNOWN 목록의 `pages/dropshipping/BulkProductImport.tsx` 항목 제거 |
| `vite.config.ts` | `@o4o/dropshipping-core` alias + `optimizeDeps.exclude` 항목 제거 |

---

## 4. 카탈로그 · manifest · 엔티티

| 파일 | 내용 |
|------|------|
| `app-manifests/appsCatalog.ts` | 7 항목 제거 (`dropshipping-core` / `pharmaceutical-core` / `dropshipping-cosmetics` / `sellerops` / `supplierops` / `health-extension` / `pharmacyops`), 각 위치에 사유 주석 대체. dangling `dependencies` 4건 정리 (`cosmetics-seller-extension` · `cosmetics-supplier-extension` · `cosmetics-sample-display-extension` · `partnerops`) |
| `app-manifests/partnerops.manifest.ts` | `dropshipping-core` 의존 제거 → `dependencies: {}` |
| `database/entities.ts` | dropshipping entity 주석 블록 제거 + Phase R1 기록줄에 삭제 사실 명기 |
| `config/swagger-enhanced.ts` | `Dropshipping` 태그 + `x-tagGroups` 항목 제거 |
| `service-templates/templates/sellerops-universal.json` · `supplierops-universal.json` | 파일 삭제 (템플릿 전체가 삭제된 체인) |
| `service-templates/templates/cosmetics-retail.json` · `partnerops-service.json` · `tourist-service.json` | `coreApps` / `extensionApps` 에서 삭제 패키지 항목만 제거 (나머지 필드 불변) |

---

## 5. 빌드 · CI · 의존 설정

| 파일 | 내용 |
|------|------|
| root `package.json` | `build:packages` 에서 `build:diabetes-packages` 호출 제거 · `build:diabetes-packages` 스크립트 삭제 · `build:app-store-packages` 에서 `@o4o/dropshipping-core` 제거 |
| `.github/workflows/ci-pipeline.yml:119` | dist 검증 루프에서 `dropshipping-core` 제거 (**`build:packages` 와 동기 유지**) |
| `.github/workflows/deploy-api.yml:94` | `pnpm --filter '@o4o/dropshipping-core' run build` 제거 |
| `apps/api-server/package.json` | `@o4o/dropshipping-cosmetics: workspace:*` 의존 제거 |
| `apps/api-server/tsconfig.json` | `@o4o/dropshipping-cosmetics/*` path mapping 제거 |
| `pnpm-lock.yaml` | 재생성 — 삭제 패키지 참조 **0** |

---

## 6. 관련 레거시 문서

| 문서 | 처리 |
|------|------|
| `docs/architecture/DROPSHIPPING-DOMAIN-RULES.md` | **삭제** — 존재하지 않는 도메인의 "절대 기준" 문서 (`Status: Active` 표기는 감사 WO 전제에 따라 근거로 사용하지 않음) |
| `docs/architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md` | PARTIAL 목록의 dropshipping 4행 + P1-E 작업 행을 삭제 사실로 취소선 표기 |
| `docs/architecture/O4O-STORE-RULES.md` §1.4 | "Dropshipping 연계 규칙" → "상품 공급 연계 규칙". 공급 정본이 `ProductMaster` · `SupplierProductOffer` 임을 명기 |
| `docs/archive/**` 의 dropshipping 언급 | **미수정** — 과거 시점 기록이므로 이력 정합성상 보존 |

---

## 7. 남겨둔 동명 항목과 사유

| 대상 | 사유 |
|------|------|
| GlycoPharm `serviceType: 'dropshipping'` (`glycopharm/controllers/{admin,application,store-applications}.controller.ts`, `glycopharm-application.entity.ts`, `auth-register.controller.ts:982`, `services/web-glycopharm/**`) | **LIVE 도메인 값**. 매장 신청 유형 enum 이며 프로덕션 데이터 존재. 삭제 패키지와 무관 |
| `OrderType.DROPSHIPPING` (`packages/ecommerce-core`) | E-commerce Core 주문 유형. CLAUDE.md §4 에 명시된 현행 계약 |
| `User.ts` 의 `supplier?/seller?/partner?` · `getDropshippingRoles()` | 소비처 0 이나 **F10 O4O Core Freeze (Auth)** 대상. 별도 WO 필요 |
| 마이그레이션 23건 | 감사 §5-4 `RETAIN`. `typeorm_migrations` 이력 대조 근거 |
| `appsCatalog.ts` 의 serviceGroup id `'sellerops'` / `'supplierops'`, `tenant-context.middleware.ts` 의 `ServiceGroup` | 패키지명이 아닌 **별도 taxonomy**. 삭제 시 cosmetics 계열 앱의 serviceGroup 이 깨짐 |
| admin 로컬 `pages/{sellerops,supplierops,partnerops}` | 감사 §5-4 `RETAIN` (패키지와 별개 자산, 삭제 패키지 import 0). sellerops/supplierops 는 이번 등록 해제로 **미참조 상태**가 됨 → §8 참조 |
| `packages/partnerops`, `packages/partner-core`, `packages/pharmacy-ai-insight` | 감사 §5-4 `RETAIN` (`app_registry` active / admin 라우트 LIVE) |
| `packages/cgm-pharmacist-app`, `glucoseview` service key | 감사 §5-2 `MIGRATE_THEN_DELETE` — 별도 WO (§8-2 · §8-3) |
| `constants/coreTables.ts:25,40`, `entities/AppRegistry.ts:23` | 주석 내 예시 문자열 |
| `app-manifests/index.ts` | Phase R1 제거 이력 산문 기록 |

---

## 8. 전역 잔존 참조 수

| 대상 | 잔존 |
|------|:---:|
| `@o4o/dropshipping-core` · `@o4o/dropshipping-cosmetics` · `@o4o/sellerops` · `@o4o/supplierops` · `@o4o/pharmacyops` · `@o4o/pharmaceutical-core` **실 import** | **0** |
| 위 패키지명 문자열 (주석·안내 문구) | 4 (`ShortcodeRenderer.tsx` 2 = 과거 제거 기록 주석, `SellerOpsRouter.tsx` 1 = 안내 주석, 본 WO 사유 주석) |
| `/api/v1/dropshipping` **mount** | **0** |
| 삭제된 manifest 파일 참조 | **0** |
| `pnpm-lock.yaml` 내 삭제 패키지 참조 | **0** |
| CI dist 루프 ↔ `build:packages` 불일치 | **0** (19개 패키지 전수 dist 존재 확인) |

### 8-1. 본 WO 범위 밖에서 새로 확인된 잔여 모집단 (후속 필요)

감사 §5 목록에 없던 항목으로, **삭제 패키지를 import 하지 않아 현재 빌드·런타임은 정상**이다. 범위를 임의 확대하지 않고 기록만 남긴다.

| 항목 | 상태 | 비고 |
|------|------|------|
| `apps/api-server/src/init/cpt.init.ts` → `ds_product` · `ds_supplier` · `ds_partner` · `ds_commission_policy` 스키마 등록 | **LIVE** (main.ts 부트스트랩) | `schemas/ds_*.schema.ts`, `services/cpt/dropshipping-cpts.ts`, `services/acf/dropshipping-fields.ts`, `types/dropshipping.ts`, `templates/system/archive-ds-products.json`. 제거 전 `custom_posts` 의 `ds_*` row 조사 필요 |
| `packages/shortcodes/src/dropshipping/**`, `apps/main-site/src/shortcodes/_functions/dropshipping/**`, `apps/main-site/src/components/ui/dropshipping/**`, `apps/admin-dashboard/public/shortcode-config.js` | dead | 삭제 패키지 import 0, 백엔드 대응 경로 없음 |
| `services/signage-player-web/.../CornerDisplayBlock.tsx:70` `DEFAULT_LISTINGS_API = '/api/v1/dropshipping/core'` | **본 WO 이전부터 404** | 삭제된 라우터가 제공한 경로는 `/api/v1/dropshipping/admin/*` 뿐이었으므로 `/core` 는 원래부터 존재하지 않았다. 본 WO 로 인한 회귀 아님 |
| `apps/api-server/tests/multi-tenant/**` | **CI 전용 스텝** — 사후 정정 완료 | jest 대상이 아니라 CI 의 별도 스텝(`Run tests (multi-tenant Vitest)`)으로만 실행되어 로컬 검증에서 누락되었다. §9-1 참조 |
| `apps/api-server/tests/multi-tenant/tenant-factory.ts` 의 `dropshipping-cosmetics` · `sellerops` · `supplierops` appId 문자열 | 테스트 픽스처 | 삭제 코드 import 아닌 가상 테넌트 시뮬레이션 문자열. navigation / view-system 스펙의 유효성을 유지하기 위해 보존 |
| `scripts/{bootstrap-install-apps,test-e2e-workflow,test-settlement-workflow-simple}.ts` | 미실행 스크립트 | jest·CI 실행 대상 아님 |
| `docs/architecture/BUSINESS-SERVICE-RULES.md` 의 `dropshipping-api`/`dropshipping-web` **Planned** 행 | 계획 문서 | 삭제 코드 참조 아님 |

---

## 9. 테스트 · 빌드 결과

| 검증 | 결과 |
|------|:---:|
| `pnpm install --frozen-lockfile` | **EXIT 0** |
| api-server `tsc --noEmit` | **삭제 관련 오류 0** (잔존 오류는 전부 병렬 세션의 `src/scripts/hff-*` · `otc-*`, 본 WO 미접촉 파일) |
| admin-dashboard `tsc --noEmit` | **EXIT 0** |
| services `web-neture` / `web-glycopharm` / `signage-player-web` / `web-kpa-society` typecheck | **EXIT 0** |
| api-server `jest` | **EXIT 0** — 73 suites / 1339 tests PASS |
| admin-dashboard `vitest` | **EXIT 0** — 14 files / 239 tests PASS |
| `pnpm run build:packages` | **EXIT 0** |
| CI dist 루프 재현 (19 패키지) | 누락 **0** |
| admin-dashboard `vite build` | **EXIT 0** |
| main-site `vite build` | **EXIT 0** |
| api-server `npm run build` | **EXIT 0** |
| multi-tenant `vitest` (§9-1 정정 후) | **EXIT 0** — 4 files / 75 tests PASS |

### 9-1. CI 1차 실패와 정정

1차 CI(`30964857643`, 커밋 `223832247`)에서 `Code Quality Check` 의 **`Run tests (multi-tenant Vitest)` 스텝 1건만 실패**했다. 나머지 15개 스텝(typecheck · ESLint · api-server Jest · admin Vitest · api-gateway Vitest 포함)은 전부 success.

- **원인** — `apps/api-server/tests/multi-tenant/appstore.spec.ts` 가 삭제된 카탈로그 항목(`dropshipping-core` · `dropshipping-cosmetics` · `sellerops` · `supplierops` · `pharmaceutical-core`)의 **존재를 단정**하고 있었다. 이 스펙은 jest 대상이 아니라 `.github/workflows/ci-pipeline.yml:92` 의 별도 스텝에서만 실행되어 로컬 검증에서 누락되었다.
- **정정** — 같은 파일의 선례(`WO-O4O-LEGACY-COSMETICS-PARTNER-REMOVAL-V1`, 51-55행)와 동일하게 처리했다. 삭제 항목 단정은 **`not.toContain` 부재 검증으로 전환**하고, 대표 검증이 필요한 자리는 잔존 앱(`cosmetics-seller-extension` · `cosmetics-supplier-extension` · `cosmetics-sample-display-extension`)으로 교체했다. 테스트 개수(24)는 유지했고 삭제하거나 skip 한 케이스는 없다.
- **소스 코드 변경 없음** — 정정 범위는 테스트 스펙 1파일이며, `appsCatalog.ts` 등 제품 코드는 재수정하지 않았다.

---

## 10. 중지 조건 대조

| 조건 | 결과 |
|------|------|
| 삭제 대상에서 현재 운영 route 소비처 발견 | **미해당** — 삭제된 라우터의 유일 경로 `/api/v1/dropshipping/admin/*` 는 부재 테이블을 조회하던 상태. 프런트 소비처도 전부 함께 삭제 |
| 현재 정본이 해당 레거시 타입·runtime 구현에 실제 의존 | **미해당** — 실 import 0 |
| 삭제 과정에서 DB schema 변경 필요 | **미해당** — DB write 0 / migration 0 / migration 파일 미삭제 |
| 병렬 세션 파일과 충돌 | **미해당** — 커밋은 명시 pathspec 사용. `hff-zh-*.mjs` 6건 및 병렬 수정된 `otc-*.ts` 2건 **미접촉·미커밋** |

---

## 11. 완료 조건 대조

| 조건 | 결과 |
|------|:---:|
| 삭제 대상 package·route·manifest 참조 전역 0 | ✅ |
| `/api/v1/dropshipping` mount 제거 | ✅ |
| `pnpm install --frozen-lockfile` | ✅ |
| 관련 package 및 API typecheck | ✅ |
| admin-dashboard · api-server test | ✅ |
| 주요 앱 build | ✅ |
| CI GREEN | ✅ (§12) |
| CHECK 문서 | 본 문서 |
| commit · push | §12 참조 |

---

## 12. 이력

| 일자 | 내용 |
|------|------|
| 2026-08-05 | 제거 실행 + 본 CHECK 문서 작성 — 커밋 `0c857f984` (395 files changed, +282 / -60,893), `origin/main` push 완료 |
| 2026-08-05 | 1차 CI(`30964857643`) 의 multi-tenant Vitest 스텝 1건 실패 → 스펙 정정 커밋 `cf91949b5` push (§9-1) |
| 2026-08-05 | **CI Pipeline GREEN 확인** — 실행 `30966777802`. `Code Quality Check` 16 스텝 + `Build Applications` (admin-dashboard / main-site) 전부 success. `0c857f984` 시점의 `Deploy API Server` · `Deploy Web Services` · `Deploy Admin Dashboard` · `AppStore Guard` 도 success. **WO 완료** |
