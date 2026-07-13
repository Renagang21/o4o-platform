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

- (main push → CI/CD 자동 배포. 리비전/로그 확인 후 기록.)

## smoke 결과

- (배포 후 실브라우저 검증 후 기록. 공급자 작성→검수요청→운영자 큐 노출→승인 경로.)
- (테스트 데이터 생성 시 정리 또는 명확 기록.)

## commit SHA

- (커밋 후 기록.)
