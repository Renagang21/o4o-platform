# CHECK-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-AND-REVIEW-QUEUE-V1

> 공급자 매장용(STORE) 상품 설명서 작성/저장 + 운영자 최소 검수 큐 (draft 저장 + 검수 큐 묶음).

## WO 명칭

- **확정 명칭**: `WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-AND-REVIEW-QUEUE-V1`
- **기존 후보명 (alias, 문서 참조용)**:
  - `WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-V1`
  - `WO-O4O-PRODUCT-CONTENT-STORE-SUPPLIER-DRAFT-V1`

## 전제 (검증됨)

- B1 `WO-O4O-SPD-AUTHOR-SUBJECT-METADATA-V1` 완료 — `shared_product_descriptions.created_by_supplier_id` / `submitted_at` 컬럼 + 마이그레이션(`20270108000000`) 운영 반영. **DB 마이그레이션 신규 없음**(컬럼 재사용).
- 검수 큐는 `WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-REVIEW-REMOVE-V1`(7649626e6)로 완전 제거되어 있었음 → 본 WO에서 **공급자 STORE 전용 최소 큐**로 재도입(통합 큐 부활 아님).
- AUTO-CREDIT(`resolveSupplierCredit`)는 `source_type='supplier' + source_ref_id(offer)` 경로 유지. 신규 draft가 `source_ref_id=offerId`를 세팅하므로 기존 fallback 무접촉으로 정합.

## 정책 / 데이터 계약

| 항목 | 값 |
|------|-----|
| description_type | `STORE` (SUPPLIER_STORE 신규 사용 금지) |
| source_type | `supplier` |
| created_by_supplier_id | 작성 공급자 SSOT (`neture_suppliers.id`, `req.supplierId`) |
| source_ref_id | 원천 `supplier_product_offers.id` (추적/AUTO-CREDIT fallback) |
| created_by | 실제 작성 사용자 (`user.id`) |
| status 흐름 | `draft`(임시저장) → `needs_review`(검수요청) → 운영자 `canonical`(승인) / `hidden`(반려) |
| submitted_at | **검수요청(needs_review) 시점에만** 세팅. 임시저장/재-임시저장은 null |
| canonical 생성 | **공급자 직접 금지** — 운영자 검수 큐 `approve`(setCanonical)만 |

- `SharedProductDescriptionStatus` union에 `'draft'` 추가(varchar(32), **additive, DB 마이그레이션 불필요**). 기존 상태값·조회 회귀 없음(draft/needs_review는 canonical 아님 → 매장 미노출).
- 공급자당 `(master, STORE, language)` **단일 작업행 upsert** — 기존 draft/needs_review 행 재사용하여 중복 검수행 방지. canonical/hidden 행은 재사용하지 않고 새 draft 생성(승인본 유지·재검수).

## supplier draft 저장 방식

- 엔드포인트: `POST /api/v1/neture/supplier/store-descriptions` (`requireActiveSupplier` write gate)
  - body: `{ offerId, content, summary?, language?, submit }`
  - offer 소유 검증(`supplier_product_offers WHERE id=offerId AND supplier_id=req.supplierId`) → master 파생.
  - `submit=true` → `needs_review` + `submitted_at=now()`, `false` → `draft` + `submitted_at=null`.
- 조회: `GET /api/v1/neture/supplier/store-descriptions?masterId=` (`requireLinkedSupplier` read gate) — 공급자 본인 작업행.
- 편집기: 표준 `@o4o/content-editor` `RichTextEditor` (`templateCategory="product"`, product-detail-860, 이미지 삽입/템플릿/HTML 저장/미리보기) **재사용**. 신규 편집기 없음.

## 운영자 검수 큐 범위

- 엔드포인트: `/api/v1/admin/o4o-product-db/supplier-store-descriptions` (`authenticate` + `requireRole(ADMIN_ROLES)`)
  - `GET /` 목록(기본 `status=needs_review`, `draft|canonical|all`, `q`, 페이지네이션)
  - `GET /:id` 상세(full content 미리보기)
  - `POST /:id/approve` → **canonical 승격**(`setCanonical`) — 포함됨
  - `POST /:id/reject` → 반려/보류(`setStatus 'hidden'`) — 포함됨
- 큐는 `source_type='supplier' AND description_type='STORE'` 로만 한정. 상품명/공급자명/작성자/제출일시/상태/미리보기 노출.
- 화면: admin `O4O 상품 DB > 설명서 검수` 탭(`/admin/o4o-product-db/supplier-store-descriptions`). 목록+상세 모달(ContentRenderer `variant="store-description"`)+승인/반려.

### canonical 승격 포함 여부

- **포함**. `setCanonical`/`setStatus` 기존 메서드 재사용으로 승인/반려까지 이번 WO에 포함(다음 WO 분리 아님).

## AUTO-CREDIT fallback 유지 확인

- `product-landing.service.ts resolveSupplierCredit` **무수정**. 신규 draft가 `source_ref_id=offerId`를 세팅하므로 승인(canonical) 시 기존 read path(offer→supplier→org)로 크레딧 정상 해석. `created_by_supplier_id` 우선순위 read-path 보강은 landing 파일 충돌 회피를 위해 **후속 분리**(현재 offer fallback으로 충분).

## 변경 파일 목록

백엔드(api-server):
- `src/modules/neture/entities/SharedProductDescription.entity.ts` — status union에 `'draft'` 추가
- `src/modules/neture/services/shared-product-description.service.ts` — `CreateCandidateInput`에 createdBySupplierId/submittedAt, `upsertSupplierStoreDraft`/`listSupplierStoreDrafts`/`listSupplierStoreReview`/`getSupplierStoreReviewDetail` + row/detail 인터페이스
- `src/modules/neture/controllers/supplier-store-description.controller.ts` — 신규(공급자 저작/저장)
- `src/modules/neture/controllers/operator-supplier-store-description-review.controller.ts` — 신규(운영자 검수 큐)
- `src/modules/neture/neture.routes.ts` — 공급자 컨트롤러 마운트
- `src/bootstrap/register-routes.ts` — 운영자 큐 컨트롤러 마운트

공급자 프론트(services/web-neture):
- `src/lib/api/supplierStoreDescription.ts` — 신규 api client
- `src/lib/api/index.ts` — export
- `src/pages/supplier/SupplierStoreDescriptionEditorDrawer.tsx` — 신규 에디터 드로어
- `src/pages/supplier/SupplierStoreDescriptionsPage.tsx` — 상품 선택 목록 + authoring 활성화

운영자 프론트(apps/admin-dashboard):
- `src/api/supplier-store-description-review.api.ts` — 신규 api client
- `src/pages/o4o-product-db/SupplierStoreDescriptionReviewPage.tsx` — 신규 검수 큐 페이지
- `src/routes/o4o-product-db.routes.tsx` — 라우트
- `src/pages/o4o-product-db/ProductDbLayout.tsx` — nav 탭

## 금지사항 준수

- SUPPLIER_STORE 신규 사용 없음 / 공급자 직접 canonical 없음 / 운영자 검수 전 매장 노출 없음.
- QR / product landing 인증 게이트 / 태블릿 / 매장 가져오기=복사 **무변경**.
- AUTO-CREDIT fallback 제거 없음 / SPD 대규모 backfill 없음 / canonical unique index 변경 없음.
- lockfile 등 무관 dirty 파일 커밋 제외(path-specific commit).

## typecheck / build 결과

- api-server: `tsconfig.build.json` typecheck **0 error**(scripts 제외는 기존 정책). 변경 파일 clean.
- services/web-neture: `tsc --noEmit` **0 error**.
- apps/admin-dashboard: `tsc --noEmit` **0 error**.

## 배포 결과

- main push `91579cfa4` → CI/CD 3 타깃 전부 **success** (2026-07-13):
  - Deploy API Server (Cloud Run) — success (run 29216933944)
  - Deploy Admin Dashboard (Cloud Run) — success (run 29216933930)
  - Deploy Web Services (Cloud Run) — success (run 29216933921)
- 신규 엔드포인트 라이브 확인(인증 없이 401 = 라우트 마운트 + 게이트 동작):
  - `GET/POST /api/v1/neture/supplier/store-descriptions` → 401
  - `GET /api/v1/admin/o4o-product-db/supplier-store-descriptions` → 401

## smoke 결과 (실브라우저, prod, 2026-07-13)

전 과정 **PASS**. 공급자(ACTIVE, renagang21@gmail.com=(주)네뚜레 공급자 테스트) → 운영자(sohae2100@gmail.com=Neture admin).

**생성한 smoke 데이터 (전량 `[SMOKE]` prefix):**
| 항목 | id / 값 |
|------|---------|
| 상품명 | `[SMOKE] 매장용 설명서 검증 상품` |
| barcode | `8809178390621` |
| offer id (source_ref_id) | `2314a76b-5c6a-4551-b6e5-48a8a841cb75` |
| master id | `23f51f76-1dd9-463a-b35a-d352d7710794` (신규 master → 기존 STORE canonical 없음, 승격 충돌 없음) |
| SPD id | `fd71a3cf-c035-46c2-bdd9-44ea357cf43c` |
| created_by_supplier_id | `91169739-6291-4bed-b1e9-b3d4a93d65eb` |
| created_by (user) | `6967ebe0-2f87-4cab-809b-8c7190493cef` |
| curated_by (operator) | `cfd2a5e7-db28-4842-bd5c-4814cba49ca5` |

**검증 단계:**
1. 공급자 store-descriptions 페이지 = ACTIVE authoring UI 렌더(상품 선택 목록·검색·빈 상태). ✅
2. 임시저장(submit=false) → SPD `fd71a3cf` 생성: `status=draft`, `descriptionType=STORE`, `submittedAt=null`, 본문 보존, before-count 0. ✅
3. 검수요청(submit=true) → **동일 행 upsert**(신규 행 아님, rowCount=1): `status=needs_review`, `submittedAt` 세팅. ✅ (중복 검수행 없음)
4. 공급자 UI 목록 = 해당 상품 "검수 대기" 배지 + "설명서 편집" 표시. ✅
5. 운영자 `O4O 상품 DB > 설명서 검수` 큐 = 상품명/공급자명(organizations 조인 `(주)네뚜레 공급자 테스트`)/작성자(서Renagang21·이메일)/제출일시/상태/미리보기·승인·반려 노출. ✅
6. 미리보기 = ContentRenderer(`variant=store-description`)로 본문 렌더. ✅
7. 승인 → **canonical 승격**: `status=canonical`, `curated_by`/`curated_at` 세팅. 검수 대기 목록 제거, 검수 완료 필터 노출. ✅
8. detail 필드 전수 확인: description_type=STORE·source_type=supplier(큐 필터)·created_by_supplier_id·source_ref_id(=offer id)·submitted_at(검수요청 시점)·curated_by/curated_at·language=ko. ✅
9. 반려/보류 → `status=hidden` (렌더러/큐/매장 미노출). ✅
10. 공급자 직접 canonical 생성 경로 없음(공급자 endpoint 는 setCanonical 미호출, 승격은 운영자 approve 만). ✅
11. AUTO-CREDIT `resolveSupplierCredit` 무접촉 · source_ref_id=offer 보존(회귀 없음). ✅

**canonical 충돌 처리 note:** 신규 master 사용으로 승격 충돌 없음(조건 준수). 동일 (master, STORE, ko) 재승격 시 `setCanonical` 이 기존 canonical 을 candidate 로 강등 후 승격하므로 partial-unique 위반 없음(코드 경로). 별도 충돌 UX 는 후속 큐 고도화에서 보완 권장.

**테스트 데이터 정리:**
- SPD `fd71a3cf` → **hidden** 처리(반려로 숨김, 매장/큐 미노출). 남긴 사유: reject 경로 smoke 겸 SPD 정리.
- offer `2314a76b` → **삭제**(supplier bulk delete, deleted:1).
- master `23f51f76` → **잔존(orphan `[SMOKE]` master)**. 사유: ProductMaster 물리 삭제는 UI/무승인 경로 없음(직접 DB DELETE=승인 필요). offer 0·SPD hidden 상태라 노출/영향 없음. 필요 시 후속 승인 하에 아카이브/삭제.
- 미디어: 별도 이미지 업로드 없음(본문 텍스트만) → 정리 대상 없음.

## 동시 세션 stash

- rebase 중 타 세션 dirty 파일(pnpm-lock.yaml, web-kpa-society/*)은 `stash@{0}`에 보존, 본 WO 커밋에는 미포함. 본 세션에서 pop/정리하지 않음.

## commit SHA

- 구현: `91579cfa4` (feat) — 15 files.
- 배포/smoke 결과 기록: (본 CHECK 갱신 커밋 SHA.)

## 완료 판정

**WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-AND-REVIEW-QUEUE-V1 — CLOSED / PASS**
(구현·정적검증·배포·실브라우저 smoke 전 과정 통과. 저장→검수요청→운영자 큐→승인→canonical→반려까지 확인.)
