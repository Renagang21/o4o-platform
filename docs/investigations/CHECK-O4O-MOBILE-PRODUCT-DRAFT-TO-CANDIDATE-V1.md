# CHECK-O4O-MOBILE-PRODUCT-DRAFT-TO-CANDIDATE-V1

> Phase 4 — Mobile Product Draft → Candidate backend foundation 구현 검증 보고.
>
> WO: `WO-O4O-MOBILE-PRODUCT-DRAFT-TO-CANDIDATE-V1`
> Baseline: [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md) §8
> 선행: [`CHECK-O4O-PRODUCT-IDENTIFIER-CORE-V1`](CHECK-O4O-PRODUCT-IDENTIFIER-CORE-V1.md) (Phase 2), [`CHECK-O4O-PRODUCT-CANDIDATE-REVIEW-QUEUE-V1`](CHECK-O4O-PRODUCT-CANDIDATE-REVIEW-QUEUE-V1.md) (Phase 3)
> 작성일: 2026-06-06
> 상태: 구현 완료 (backend foundation, 모바일 UI 없음)

---

## 1. Summary

`mobile_product_drafts` 테이블과 `MobileProductDraft` 엔티티를 **additive** 로 도입하고, draft → `product_candidates`(Phase 3) 전환 service/API 를 구현했다.

모바일 수집 데이터는 **ProductMaster 로 직접 저장되지 않는다.** 흐름은 `모바일 수집 → mobile_product_drafts → product_candidates → Identifier Core 매칭 → 웹/운영자 검토`. draft → candidate 전환은 Phase 3 `ProductCandidateService.createCandidate` + `matchCandidate` 를 사용하며, ProductMaster/ProductIdentifier 를 직접 생성하지 않는다.

WO 권고대로 backend foundation 만 진행했다. 모바일 앱 UI(카메라/바코드 스캔/업로드 화면)·이미지 업로드 파이프라인은 구현하지 않았다.

검증: api-server `tsc --noEmit` **0 errors** (전체 프로젝트).

---

## 2. Files Changed

| 파일 | 변경 | 성격 |
|---|---|---|
| `apps/api-server/src/modules/neture/entities/MobileProductDraft.entity.ts` | 신규 | Entity + union/상수 2종 |
| `apps/api-server/src/modules/neture/services/mobile-product-draft.service.ts` | 신규 | draft CRUD + candidate 전환 |
| `apps/api-server/src/modules/neture/controllers/mobile-product-draft.controller.ts` | 신규 | 모바일 API (Router factory) |
| `apps/api-server/src/database/migrations/20260606020000-CreateMobileProductDrafts.ts` | 신규 | 테이블+index |
| `apps/api-server/src/modules/neture/entities/index.ts` | 수정 | export 추가 |
| `apps/api-server/src/database/connection.ts` | 수정 | import + entities 배열 등록 (2곳) |
| `apps/api-server/src/bootstrap/register-routes.ts` | 수정 | `/api/v1/mobile/product-drafts` 마운트 (additive, try/catch) |
| `docs/investigations/CHECK-O4O-MOBILE-PRODUCT-DRAFT-TO-CANDIDATE-V1.md` | 신규 | 본 문서 |

> ESM 규칙(CLAUDE.md §2): `import type` + 문자열 기반 **단방향** ManyToOne(`@ManyToOne('ProductCandidate' …)`) — ProductCandidate 엔티티 무변경.
> 모바일 앱(`services/mobile-app`) 코드는 변경하지 않았다.

---

## 3. Migration Details

`CreateMobileProductDrafts20260606020000` (`20260606020000-CreateMobileProductDrafts.ts`)

- **테이블 생성:** `mobile_product_drafts` (신규 빈 테이블, **백필 없음**)
- **FK:** `candidate_id → product_candidates(id) ON DELETE SET NULL`
- **Index (8):** status / service_key / organization_id / store_id / submitted_by / normalized_identifier / candidate_id / created_at
- **전역 UNIQUE 없음** (같은 상품 다회 촬영 허용)
- **down:** `DROP TABLE IF EXISTS mobile_product_drafts CASCADE` (product_candidates 등 무변경)

---

## 4. MobileProductDraft Model

주요 컬럼: service_key / organization_id / store_id / submitted_by / source_app / draft_status / candidate_id / identifier_{type,value} / normalized_identifier_value / captured_{name,brand,manufacturer,category,spec,unit,price,currency} / thumbnail_image_url / image_urls(jsonb) / memo / raw_payload(jsonb) / submitted_at / converted_at / archived_at / timestamps / deleted_at(soft delete).

---

## 5. Draft Status Policy

DB enum 이 아니라 **varchar + application-level union**.

- `draft_status`: draft / submitted / candidate_created / reviewed / rejected / archived
- `source_app`: mobile_app / mobile_web / tablet / operator_input / unknown

상태 전이 가드:
- 수정(updateDraft): `draft` / `submitted` 만 가능 → 아니면 409 `DRAFT_NOT_EDITABLE`
- 제출(submitDraft): `draft` 만 → 아니면 409 `DRAFT_NOT_SUBMITTABLE`
- 전환(convertDraftToCandidate): `draft` / `submitted` 만 → 아니면 409 `DRAFT_NOT_CONVERTIBLE`. 이미 전환된 draft 는 기존 candidate 반환(idempotent).

---

## 6. Draft to Candidate Flow

`convertDraftToCandidate(draftId, ownerId?)`:

1. draft 조회 (본인 소유 경계)
2. 이미 `candidate_created` + candidate_id 있으면 그대로 반환 (idempotent)
3. status 가 `draft`/`submitted` 인지 확인
4. `ProductCandidateService.createCandidate` 호출 — `source_type='mobile_draft'`, `source_id=draft.id`, `source_label=source_app`, candidate_name=captured_name, candidate_image_url=thumbnail, raw_payload 에 draft 요약(mobileDraftId/storeId/sourceApp/currency/memo/imageUrls) 포함
5. 식별자 있으면 `matchCandidate` best-effort (실패해도 전환 진행)
6. `draft.candidate_id` 저장, `draft_status='candidate_created'`, `converted_at` 기록

> ProductMaster/ProductIdentifier 직접 생성 없음. `approveAsNewProductMaster` 호출 없음. candidate_status 는 Phase 3 정책대로 pending/matched 까지만.

---

## 7. API Endpoints

마운트: `/api/v1/mobile/product-drafts` — guard: `requireAuth`. 소유 경계: `submittedBy = req.user.id`.

| Method | Path | 설명 |
|---|---|---|
| POST | `/` | draft 생성 (수집 항목 저장) |
| GET | `/` | 본인 draft 목록 |
| GET | `/:id` | 본인 draft 상세 |
| PATCH | `/:id` | draft 수정 (draft/submitted 만) |
| POST | `/:id/submit` | 제출 |
| POST | `/:id/convert-to-candidate` | product_candidates 전환 |
| POST | `/:id/archive` | 보관 |

> 사용자-facing 의미는 "상품 등록 완료" 가 아니라 "수집 항목 저장" — 모바일=수집 원칙(Baseline §8).

---

## 8. Image Handling Scope

- 허용: `thumbnail_image_url`(text), `image_urls`(jsonb 문자열 배열), `raw_payload` 내 임시/외부 URL 저장.
- **미구현(후속 WO):** GCS 업로드 파이프라인, 리사이징, 카메라 촬영 UI, OCR, 이미지 AI 분석.

---

## 9. Permission / Boundary Notes

- 현재: `requireAuth` + `submittedBy = req.user.id` 소유 경계(본인 draft 만 조회/수정/전환).
- organization_id / store_id 는 caller(body) 제공값을 저장만 하며, 본 WO 의 접근 제어 기준은 **submittedBy** 다.
- **후속 정비(CHECK follow-up):** organization/store 기반 정밀 권한(약국/매장 경영자 범위), 운영자 전체 조회(별도 또는 `/api/v1/operator/product-candidates` 활용). Store/O4O boundary(CLAUDE.md §7) 정합은 후속.

---

## 10. Existing Flow Impact

| 소비처 | 본 WO 영향 |
|---|---|
| ProductCandidateService (Phase 3) | 재사용 (createCandidate/matchCandidate), 변경 없음 |
| ProductMaster / ProductIdentifier | 무변경 (직접 생성 없음) |
| supplier/store/csv 흐름 | 무변경 |
| 기존 route | 무변경 (additive 마운트, try/catch) |
| `services/mobile-app` | 무변경 |

---

## 11. What Was Not Changed

- ✅ ProductMaster 구조 변경 없음 / `product_masters.barcode` 변경 없음
- ✅ product_identifiers 구조 변경 없음
- ✅ product_candidates 구조 변경 없음 (단방향 참조만)
- ✅ ProductMaster 자동 생성 없음 / ProductIdentifier 자동 생성 없음
- ✅ OTC 등록 분기 없음 / Rx 등록 루트 없음
- ✅ 모바일 카메라/바코드 스캔 UI 없음
- ✅ 이미지 업로드 파이프라인 없음
- ✅ SupplierProductOffer 경계 변경 없음
- ✅ StoreProductProfile / OrganizationProductListing 경계 변경 없음
- ✅ product_candidates 우회 없음 (draft 는 반드시 candidate 경유)

---

## 12. Risks / Follow-ups

| # | 항목 | 비고 |
|---|---|---|
| R1 | 권한이 submittedBy 단일 경계 | organization/store 정밀 권한·운영자 조회는 후속 (§9) |
| R2 | 이미지 URL 문자열만 저장 | 업로드/보관 파이프라인은 후속 WO |
| R3 | 모바일 앱 UI 부재 | 수집/스캔 화면은 후속 (이번은 backend foundation) |
| R4 | 중복 draft 방지 미구현 | 같은 상품 다회 촬영 허용 — 중복 정리는 검토 큐/후속 |
| R5 | convert 매칭 best-effort | matchCandidate 실패 시 candidate 는 unmatched 로 남음(전환 자체는 성공) |

---

## 13. Verification Results

| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit -p tsconfig.json` | ✅ 0 errors (entity·service·controller·migration·register-routes 포함 전체) |
| ESM 규칙 (import type + 문자열 단방향 관계) | ✅ 준수 (ProductCandidate 무변경) |
| entity 등록 (index.ts + connection.ts import + 배열) | ✅ 3곳 |
| route 등록 no-regression | ✅ additive 마운트 (try/catch) |
| migration 위치/클래스명 유일성 | ✅ `CreateMobileProductDrafts20260606020000` |
| ProductCandidateService 연동 compile | ✅ |
| ProductMaster 자동 생성 없음 | ✅ |

> 정적(컴파일 + 코드 경로) 검증 기준. 실제 DB 적용(테이블 생성)·런타임 전환(draft→candidate→match) 은 main 배포 후 CI/CD 마이그레이션(`o4o-api-migrations` job) 또는 배포 환경 API 호출로 확인한다.

---

**작성:** O4O Platform Team · 2026-06-06
**상태:** Phase 4 완료 (backend foundation). 다음 권장: Operator Product Candidate Review UI (모바일/웹/공급자 후보의 실제 사람 검토).
