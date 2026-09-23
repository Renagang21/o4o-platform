# CHECK-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1

> **WO:** [`WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1`](../work-orders/WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1.md)
> **실행일:** 2026-09-23 · **착수 기준 `origin/main`:** `34ed4acd1` 이후 · **최종:** `b0d51c4ec`
> **커밋:** backend `8d8a3a874` (§E~§J) · frontend `58ca3d763` (§A~§E-1) · test 정정 `b0d51c4ec` (§I) · CHECK(본 문서) 후속
> **판정:** **COMPLETE — Supplier Products 축 CLOSED.** 인증 UI smoke 는 `AUTHENTICATED_UI_SMOKE = PENDING` (§10, 사유 명시)
> **중지 조건:** A~H **전부 미발동** (§6·§7 근거)

---

## 1. 최종 Supplier product-management 구조 (§10-1)

```text
Supplier -> SupplierProductOffer 편집 -> ProductMaster 기준정보 read-only
         -> Supplier 내부 LLM 호출 0 -> Supplier HTTP ProductMaster 직접 create 0
```

| 화면 | route | 역할 | 소유 API |
|---|---|---|---|
| `SupplierProductsPage` | `/supplier/products` | 목록 · Offer 인라인 관리 · Drawer 단일 진입 | `GET/PATCH /neture/supplier/products*` |
| `ProductDetailDrawer` (분해됨) | (모달) | Master 조회 · Offer 편집 · 유통 · 이미지 | 위 + 이미지 route |
| `SupplierProductRegisterEntryPage` / `bulk` | `/supplier/products/register` · `/bulk` | 등록(AI First · Candidate 경유) | `POST /supplier/products/bulk-candidates` |
| (은퇴) `SupplierSupplyOffersPage` | `/supplier/supply-offers` | **redirect -> `/supplier/products`** | 없음 |
| (은퇴) `SupplierB2BContentPage` | `/supplier/b2b-content` | **redirect -> `/supplier/products`** | 없음 |
| (은퇴) CSV Import | `/supplier/csv-import` | redirect -> `/supplier/products/bulk` (선행 WO) | **backend route 0** |

## 2. 수정 책임표 — ProductMaster / SupplierProductOffer (§10-2)

| 필드군 | 쓰는 주체 | Supplier 표면 |
|---|---|---|
| `product_masters.name` · `barcode` · `specification` · `category_id` · `brand_id` · `origin_country` · `regulatory_*` | 운영자(Promotion / admin) | **read-only** (`MasterReadOnlySection` · 편집 모드 `disabled readOnly`) |
| `product_masters.tags` | 운영자 · 매장 축 (`/products/:id/ai-tags/*`) | **write deny** (§F) |
| `supplier_product_offers.*` (가격 · 재고 · 노출 · B2C/B2B 설명 · 유통 정책 · 서비스 대상 · 서비스별 공급가) | **Supplier** | 편집 가능 (`OfferEditSection` · `OfferDistributionSection`) |
| `product_images` (`source='supplier_upload'` + 자기 `created_by`) | **Supplier** | 업로드 · 수정 · 삭제 가능 |
| `product_images` (그 외 출처) | 운영자 · Promotion | **불가** (403 / 409) |

## 3. Drawer 분해 결과 (§10-3)

`ProductDetailDrawer.tsx` **1,796 -> 1,342 lines**, 4개 presentational 섹션 추출 (총 721 lines).

| 파일 | lines | 책임 |
|---|---|---|
| `product-detail/MasterReadOnlySection.tsx` | 53 | ProductMaster 기준정보 조회 전용 |
| `product-detail/OfferEditSection.tsx` | 296 | Offer 편집 본문 (기본정보 read-only · ProductForm · B2C/B2B 설명) |
| `product-detail/OfferDistributionSection.tsx` | 187 | 공급 방식 · 서비스별 공급가 · 이벤트 오퍼 진입 |
| `product-detail/SupplierImageSection.tsx` | 185 | 공급자 이미지 관리 (thumbnail / detail / content) |

**`approvalActions` 계약 유지 증명**

- `ProductDetailDrawerProps` = `{ product, open, onClose, onSaved?, approvalActions? }` — **변경 0** (interface 블록 무수정).
- `approvalActions` 소비 코드(footer 승인/반려 버튼)는 Drawer 본체에 그대로 남아 있고 추출된 4개 섹션 어디에도 넘기지 않는다.
- 유일 소비처 `services/web-neture/src/pages/operator/OperatorProductApprovalPage.tsx` 무수정 · `tsc` PASS.

## 4. B2B / SupplyOffers retirement (§10-4)

| 대상 | 처리 | runtime 0 증명 |
|---|---|---|
| `SupplierB2BContentPage.tsx` (236 lines) | 파일 삭제 | lazy import 제거 · 참조 grep 0 |
| `components/supplier/B2BContentDrawer.tsx` (178 lines) | 파일 삭제 | 참조 grep 0 |
| `SupplierSupplyOffersPage.tsx` (105 lines) | 파일 삭제 | lazy import 제거 · 참조 grep 0 |
| `/supplier/b2b-content` | `<Navigate to="/supplier/products" replace />` | `App.tsx:844` |
| `/supplier/supply-offers` | `<Navigate to="/supplier/products" replace />` | `App.tsx:822` |
| sidebar `SupplierSpaceLayout` | '거래 상품 정보' · '공급 오퍼' 항목 제거 | 나머지 진입(서비스 제공 설정 · 판매자 모집 · 펀딩 · 이벤트 오퍼)은 직접 항목 유지 |
| `supplierProductTypes.ts` `supply` action | `/supplier/supply-offers` -> `/supplier/products` | — |
| `SupplierDashboardPage` · `SupplierServiceDeliveryPage` 링크 | `/supplier/products` 로 재지정 | — |

**B2B 편집 진입 = 1곳** (`ProductDetailDrawer` B2B 편집 모드). B2B 필드(`businessShortDescription` · `businessDetailDescription`)와 fallback 계약은 변경 0 — 삭제된 Drawer 가 쓰던 API 와 동일 경로다.

**합치지 않은 것(WO §5 준수):** 판매자 모집 · Market Trial · Event Offer · Pharmacy-Hub 제공 설정.

## 5. Supplier 내부 AI 잔재 0 증명 (§10-5)

| 검색 축 | 범위 | 결과 |
|---|---|---|
| `ai-tags` | `services/web-neture/src` | 1건 — `lib/api/product.ts` 의 **주석**(backend 유지 사유). 호출 0 |
| `runAIInsight` / `ai-insight` | `services/web-neture/src/pages/supplier`, `components/supplier` | **0건** |
| `runAIInsight` | `apps/api-server` supplier 축 | `GET /supplier/dashboard/ai-insight` 제거 (`8d8a3a874`) |

**범위 밖으로 유지한 것(의도):**

- `HubPage.tsx` -> `GET /neture/seller/dashboard/ai-insight` — **seller(판매자) 축**이며 Supplier 업무공간이 아니다. 본 WO 범위 밖 · 미접촉.
- `/products/:id/ai-tags/*` backend — 운영자 · 매장 축 소비처 존재. §F 로 supplier actor 만 write deny.
- §E-3 Copilot SQL 집계 · 외부 LLM "ChatGPT로 작업" — 유지(변경 0).

## 6. ProductImage ownership 최종 계약 (§10-6)

컨트롤러: `apps/api-server/src/modules/neture/controllers/supplier-product-image.controller.ts` (신규 · §H 위치 정리). **DDL 0** — `product_images` 스키마 무변경.

| 시나리오 | 결과 |
|---|---|
| 업로드 | `source='supplier_upload'` + `created_by=<요청자>` 기록 |
| 내 `supplier_upload` 수정 · 삭제 | 허용 |
| `source=NULL` 이미지 수정 · 삭제 | **403 `IMAGE_NOT_OWNED`** |
| `candidate_promotion` 이미지 | **403 `IMAGE_NOT_OWNED`** |
| `admin_upload` 이미지 | **403 `IMAGE_NOT_OWNED`** |
| 다른 supplier 의 `supplier_upload` | **403 `IMAGE_NOT_OWNED`** |
| 내 offer 가 없는 master 의 이미지 | **403 `NOT_OWNED`** |
| 대표 지정 — 현재 primary 없음 | 허용 |
| 대표 지정 — 현재 primary 가 내 `supplier_upload` | 허용 |
| 대표 지정 — 현재 primary 가 다른 출처 | **409 `SUPPLIER_CANNOT_REPLACE_CANONICAL_PRIMARY`** (해제하지 않는다 · §G-2) |

**canonical primary 불변 증명:** 대표 변경 경로는 현재 primary 의 출처를 먼저 조회하고, 내 `supplier_upload` 가 아니면 **어떤 UPDATE 도 실행하기 전에** 409 로 반환한다. `source=NULL` backfill 없음(§G-1).

> 프로덕션 실측(§11)상 `product_images` 2,794행 중 **2,792행이 `source=NULL`, 그 중 2,791행이 `is_primary`** 다. 즉 현행 데이터에서 공급자의 대표 변경은 사실상 전부 409 로 떨어진다. 이는 §G-2 가 의도한 결과이며 **중지 조건 B 는 발동하지 않는다**(우회 없이 규칙대로 거부 가능).

## 7. CSV backend retirement · Supplier HTTP Master-create 0 (§10-7)

- 은퇴: `supplier/csv-import/*` route 8종 + `GET /supplier/products/template` + xlsx-template service + `SupplierCsvImportBatch` / `Row` **entity 등록**.
- **테이블 DROP 0 · migration 파일 무수정 · `canonical-schema-baseline.ts` 무수정.** entity registry gate PASS -> **중지 조건 F 미발동**.
- 프로덕션 `supplier_csv_import_batches` = **0행**, `_rows` = **0행** -> 실사용 consumer 없음 -> **중지 조건 C 미발동**.
- **Supplier HTTP Master-create 0**: 남은 공급자 등록 경로는 `POST /supplier/products/bulk-candidates`(ProductCandidate 경유 · 운영자 승인)와 `POST /supplier/products/from-master`(기존 Master 연결 · Offer 만 생성). `MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED` 가드 유지. source-contract 테스트로 고정.

## 8. route/API 은퇴 결과 · 착수 census (§10-8)

| 대상 | 결과 |
|---|---|
| `supplier/csv-import/*` (8) | 제거 |
| `GET /supplier/products/template` | 제거 |
| `GET /supplier/dashboard/ai-insight` | 제거 |
| `/supplier/b2b-content` | redirect |
| `/supplier/supply-offers` | redirect |

**착수 census 재확인 결과:** §E-1 AI 태그 클라이언트 6종의 소비처는 Supplier 표면이 **유일**(운영자·매장은 backend 직접) -> 클라이언트 제거가 다른 축을 깨지 않음. `B2BContentDrawer` 는 `businessShort/DetailDescription` 만 편집(Drawer B2B 모드가 동일 필드 커버). `SupplierSupplyOffersPage` 는 링크 허브였고 대상 4곳 전부 사이드바 직접 항목 보유. §J dead client 6종 소비처 0.

## 9. Operator 회귀 (§10-9)

- `OperatorProductApprovalPage` **무수정** · Drawer props 무변경 · `tsc` PASS · `vite build` PASS.
- 승인/반려 버튼은 Drawer footer 의 `approvalActions` 분기(§3)로 그대로 렌더링.
- backend 승인/반려 route 무접촉.

## 10. 테스트 · 배포 · smoke (§10-10)

**테스트 (로컬, `NODE_OPTIONS=--max-old-space-size=6144 npx jest --maxWorkers=1`)**

| suite | 결과 |
|---|---|
| `supplier-product-image-ownership-contract.test.ts` | PASS (계약 14건 포함) |
| `security/product-ai-tags-route-ownership.spec.ts` | 41/41 PASS (supplier write 4종+DELETE -> 403 · manage_read 회귀 유지) |
| `security/product-ai-global-access.spec.ts` | PASS |
| `store-ai-first-editor-boundary-contract.spec.ts` | PASS |
| `supplier-offer-update-private-gate` · `supplier-offer-duplicate-contract` · `supplier-existing-master-direct-offer-link` · `supplier-product-registration-cutover` · `supplier-workspace-realignment` · `supplier-bulk-delete-soft-delete` | PASS |
| 합계 | **10 suites · 233 tests PASS · FAIL 0** |

> `supplier-offer-duplicate-contract` 의 `기존 계약을 유지한다` 1건이 처음 FAIL 했다. 원인은 런타임 회귀가 아니라 **stale source-text 단언** — 문자열 리터럴 `'SUPPLIER_NOT_ACTIVE'` 가 은퇴한 CSV 라우트에도 있어 그쪽이 매칭되고 있었고, 살아있는 Offer 경로는 `OfferErrorCode.SUPPLIER_NOT_ACTIVE` 상수를 쓴다. 403 계약·라우트 동작은 불변이며 정규식만 두 표기를 허용하도록 넓혔다(`b0d51c4ec`).

**타입 · 빌드**

- `apps/api-server` `tsc --noEmit` **0 errors**
- `services/web-neture` `tsc --noEmit` **0 errors** · `vite build` **PASS**

**배포**

| workflow | 대상 커밋 | 결과 |
|---|---|---|
| Deploy Web Services (Cloud Run) | `58ca3d763` | **success** |
| Deploy API Server (Cloud Run) | `b0d51c4ec` | **success** (배포 직후 `/health` uptime 266s 확인) |

**CI Pipeline — FAILURE (원인은 본 WO 밖 · 숨기지 않고 기록한다)**

`b0d51c4ec` 의 CI Pipeline 이 **실패**했다. 실패 job 2개와 원인은 다음과 같다.

| job | 결과 | 원인 |
|---|---|---|
| Code Quality Check | failure | `tsc --noEmit` TS2307 5건 — `AdminUserController.ts` 3 · `database/entities.ts` 1 · `database/incremental/manifest.ts` 1 |
| API Server Jest | failure | 11 suites `Test suite failed to run` — 전부 위 모듈 해석 실패의 cascade. 개별 test 실패 3건도 같은 축(admin user · entity registry · store workspace) |

해석 불가 모듈 3종은 전부 **다른 세션이 진행 중인 `WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1`** 의 신규 파일이며, 그 세션의 워킹트리에 **untracked 상태로 남아 있다**(`services/admin/service-membership-ensure.ts` · `entities/OperatorInvitation.ts` · `migrations/1790125106065-CreateOperatorInvitations.ts`).

> **원인은 본 세션의 커밋 실수다.** `8d8a3a874` 가 pathspec 에 포함된 파일들의 **당시 워킹트리 내용**을 그대로 담으면서, 그 파일에 이미 들어 있던 위 WO 의 WIP 를 함께 커밋했다. 참조 대상 신규 파일은 untracked(불가침)라 커밋되지 않았고, 그 결과 origin/main 이 존재하지 않는 모듈을 import 하게 됐다.

휩쓸린 foreign 변경 정밀 분류:

| 파일 | 판정 |
|---|---|
| `controllers/admin/AdminUserController.ts` | 100% foreign (본 WO diff 0줄) |
| `database/incremental/manifest.ts` | 100% foreign |
| `routes/admin/users.routes.ts` | 100% foreign |
| `services/auth/google-auth.service.ts` | 100% foreign |
| `database/entities.ts` | 혼재 — CSV entity 해제=본 WO(§I) / `OperatorInvitation` 2 hunk=foreign |
| `modules/neture/**` · `modules/store-ai/**` · `services/web-neture/**` | 전부 본 WO |

**Supplier 축 suite 실패 0건** — 실패 11 suites 는 admin user · database bootstrap · entity registry · store workspace · store owner termination 축이며 supplier/offer/image/store-ai 계약 suite 는 모두 PASS 했다(로컬 10 suites 233 tests 와 정합).

**처리 판정(사용자 확인, 2026-09-23): 해당 세션이 이어서 커밋한다.** 본 세션은 타 세션의 modified · untracked 파일을 되돌리거나 커밋하지 않는다(CLAUDE.md 불가침). 누락 파일이 push 되면 두 job 모두 해소된다. 본 WO 의 코드 변경은 이 실패에 대해 **원인도 해결 주체도 아니다**.

**smoke**

- `AUTHENTICATED_UI_SMOKE = PENDING` — ACTIVE Supplier 로 로그인 가능한 계정이 없다. 알려진 차단 그대로: super_admin 문서 계정 Google-only, 사용자 본인 계정 전역 `428 TERMS_ACCEPTANCE_REQUIRED`(약관 동의는 본인의 법적 행위 · 대행 금지), `neture_suppliers.user_id` NULL. **이 상태를 smoke 목적으로 수정하지 않았다.**
- 비인증 route probe = **INCONCLUSIVE**: `/api/v1/neture/supplier/*` 는 router 레벨 `requireAuth` 때문에 존재하지 않는 경로도 401 을 돌려준다(대조군 `/supplier/definitely-not-a-route` -> 401, `/neture/definitely-not-a-route` -> 404). 따라서 CSV route 부재는 HTTP 가 아니라 **source contract 테스트 + grep**으로 증명한다(§7).
- **운영 데이터 mutation smoke 0** (신규 주문·이미지·offer 생성 없음).

## 11. 프로덕션 read-only 실측 (§10-11)

2026-09-23, cloud-sql-proxy 경유 SELECT only. 본 WO 는 **DDL 0 · 데이터 write 0** 이므로 before == after (코드 변경만).

| 테이블 | rows |
|---|---|
| `supplier_product_offers` | 22 |
| `product_masters` | 272,040 |
| `product_images` | 2,794 |
| `product_ai_tags` | **0** |
| `product_ai_contents` | **0** |
| `supplier_csv_import_batches` | **0** |
| `supplier_csv_import_rows` | **0** |

`product_images` 출처 분포: `source=NULL` 2,792 (is_primary 2,791) · `admin_upload` 2 (is_primary 0) · **`supplier_upload` 0**.

## 12. 문서 정합 (§10-12)

`발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건`

- **발견 1건 · 별도 WO 제안 1건:** `services/web-neture/src/pages/guide/GuideFeatureB2BContentPage.tsx` 와 `GuideHomePage.tsx:113` 의 '콘텐츠(B2B) 운영' 가이드가 은퇴한 별도 B2B 화면을 전제로 서술한다. 가이드 콘텐츠는 본 WO 범위(§5) 밖이므로 **수정하지 않고 보고**한다. 별도 WO 로 문구를 "상품 상세 Drawer 의 B2B 편집 모드" 기준으로 갱신할 것을 제안한다. (route `/guide/features/b2b-content` 자체는 살아 있어 404 는 발생하지 않는다.)
- `docs/baseline/` · `architecture/` · `rules/` 등 기준 문서 drift 발견 0.

## 13. commit · git 상태 (§10-13)

| commit | 범위 |
|---|---|
| `8d8a3a874` | backend §E~§J |
| `58ca3d763` | frontend §A~§E-1 |
| `b0d51c4ec` | §I stale 단언 정정 |
| (본 문서) | CHECK — 코드 CI 완주 후 커밋 |

본 WO 범위의 미커밋 변경 **0건**(다른 세션의 dirty · untracked 파일은 전부 미접촉).

`8d8a3a874` 가 타 세션 WIP 5파일을 함께 커밋한 사실과 그 처리 판정은 §10 에 기록했다. 되돌리는 커밋은 만들지 않는다 — 해당 세션이 누락 파일을 이어서 커밋한다.

---

## 14. 판정 — Supplier Products 축 CLOSED

등록 이후 상품관리 리팩토링을 **작은 후속 WO 로 다시 나누지 않는다.** 다음 단계는 새 기능 구현이 아니라 **Supplier 전체 closeout census 1회**로 실제 잔여만 재확인하는 것이다.
