# CHECK-O4O-PRODUCT-CANDIDATE-REVIEW-QUEUE-V1

> Phase 3 — Product Candidate Review Queue 도입(additive) 구현 검증 보고.
>
> WO: `WO-O4O-PRODUCT-CANDIDATE-REVIEW-QUEUE-V1`
> Baseline: [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md) §2, §8
> 선행: [`CHECK-O4O-PRODUCT-IDENTIFIER-CORE-V1`](CHECK-O4O-PRODUCT-IDENTIFIER-CORE-V1.md) (Phase 2)
> 작성일: 2026-06-06
> 상태: 구현 완료 (선택 A — backend foundation, 사용자-facing UI 없음)

---

## 1. Summary

`product_candidates` 검토 큐 테이블과 `ProductCandidate` 엔티티를 **additive** 로 도입했다. 웹 등록 / 모바일 수집 / CSV·xlsx import / 공급자·약국 입력에서 발생하는 "아직 ProductMaster 로 확정되지 않은 상품 후보" 를 ProductMaster 에 직접 넣지 않고 이 큐에 보관한 뒤, Phase 2 Identifier Core 로 매칭/분류한다.

WO 권고대로 **선택 A (backend foundation: entity + migration + service + 최소 운영자 API + CHECK)** 로 진행했고, 사용자-facing 웹 UI 는 구현하지 않았다. API 는 운영자/관리자 권한으로 제한된 `/api/v1/operator/product-candidates` 에 additive 로 마운트했다.

핵심 안전장치:
- **자동으로 ProductMaster 를 생성하지 않는다.** exact identifier match 라도 `candidate_status` 는 `matched` 까지만 (자동 승인 금지).
- `approveAsNewProductMaster` 는 **guarded skeleton** (501 NOT_IMPLEMENTED) — 실제 Master 생성은 후속 WO.
- ProductMaster / ProductIdentifier 구조 무변경 (단방향 nullable ManyToOne).

검증: api-server `tsc --noEmit` **0 errors** (전체 프로젝트).

---

## 2. Files Changed

| 파일 | 변경 | 성격 |
|---|---|---|
| `apps/api-server/src/modules/neture/entities/ProductCandidate.entity.ts` | 신규 | Entity + union/상수 3종 |
| `apps/api-server/src/modules/neture/services/product-candidate.service.ts` | 신규 | 큐 service + Identifier Core 매칭 |
| `apps/api-server/src/modules/neture/controllers/product-candidate.controller.ts` | 신규 | 운영자 API (Router factory) |
| `apps/api-server/src/database/migrations/20260606010000-CreateProductCandidates.ts` | 신규 | 테이블+index |
| `apps/api-server/src/modules/neture/entities/index.ts` | 수정 | export 추가 |
| `apps/api-server/src/database/connection.ts` | 수정 | import + entities 배열 등록 (2곳) |
| `apps/api-server/src/bootstrap/register-routes.ts` | 수정 | `/api/v1/operator/product-candidates` 마운트 (additive, try/catch) |
| `docs/investigations/CHECK-O4O-PRODUCT-CANDIDATE-REVIEW-QUEUE-V1.md` | 신규 | 본 문서 |

> ESM 규칙(CLAUDE.md §2): 관계는 `import type` + 문자열 기반(`@ManyToOne('ProductMaster' …)`, `@ManyToOne('ProductIdentifier' …)`) **단방향** — 인버스 속성을 추가하지 않아 ProductMaster/ProductIdentifier 엔티티 무변경.
> 라우트 배치는 WO 의 `/api/v1/product-candidates` 대신 기존 Operator Product Console(`/api/v1/operator/products`)과 정합하도록 **`/api/v1/operator/product-candidates`** 로 결정 (operator/admin guard 모델 일치).

---

## 3. Migration Details

`CreateProductCandidates20260606010000` (`20260606010000-CreateProductCandidates.ts`)

- **테이블 생성:** `product_candidates` (신규 빈 테이블, **백필 없음**)
- **FK:**
  - `matched_product_master_id → product_masters(id) ON DELETE SET NULL`
  - `matched_identifier_id → product_identifiers(id) ON DELETE SET NULL`
- **Index (8):** status / match_status / source_type / service_key / organization_id / normalized_identifier / matched_product_master_id / created_at
- **전역 UNIQUE 없음** (후보 큐) — 중복 방지는 service logic
- **down:** `DROP TABLE IF EXISTS product_candidates CASCADE` (index/FK 동반 drop, product_masters·product_identifiers 무변경)

---

## 4. ProductCandidate Model

주요 컬럼: service_key / organization_id / source_type / source_id / source_label / submitted_by / candidate_status / match_status / matched_product_master_id / matched_identifier_id / confidence_score / identifier_type / identifier_value / normalized_identifier_value / candidate_{name,brand,manufacturer,category,spec,unit,image_url,price} / raw_payload(jsonb) / review_note / reviewed_by / reviewed_at / timestamps / deleted_at(soft delete).

Boundary(CLAUDE.md §7): 후보는 `service_key` + `organization_id` 를 직접 보유. service 는 raw SQL 대신 repository + parameter binding 사용.

---

## 5. Candidate Status / Match Status

DB enum 이 아니라 **varchar + application-level union** (확장 시 enum migration 회피).

- `source_type`: supplier_web / pharmacy_web / store_web / mobile_draft / csv_import / xlsx_import / operator_import / external_api / unknown
- `candidate_status`: pending / reviewing / matched / approved_new_master / rejected / merged / archived
- `match_status`: unmatched / exact_identifier_match / possible_identifier_match / possible_text_match / conflict / no_match / manually_matched

상수 배열을 entity 에서 export.

---

## 6. Matching Policy

`matchCandidate` → `computeMatch` (Phase 2 `ProductIdentifierService` 활용):

1. `(identifier_type, identifier_value)` → `findByIdentifier` → distinct master 1개 → `exact_identifier_match`(0.8~1.0), 복수 → `conflict`
2. `normalized_identifier_value` → `findByNormalizedValue` → 1개 → `possible_identifier_match`(0.8), 복수 → `conflict`
3. `product_masters.barcode` fallback → 1개 → `possible_identifier_match`(0.7), 복수 → `conflict`
4. `candidate_name` ILIKE → `possible_text_match`(0.4, 단일일 때만 master id 연결)
5. 없음 → `no_match`

안전 규칙:
- **ProductMaster 자동 생성 없음.**
- exact match 라도 `candidate_status` 는 `matched` 까지만 (자동 승인 금지) — 운영자/웹 검토에서 최종 확정.
- conflict(복수 master)는 자동 연결하지 않고 표기만.

---

## 7. API Endpoints

마운트: `/api/v1/operator/product-candidates` — guard: `authenticate` + `requireRole([platform/neture/glycopharm/cosmetics/kpa-society :admin|:operator])` + `injectServiceScope`.

| Method | Path | 설명 |
|---|---|---|
| GET | `/` | 후보 목록 (operator scope 적용: 제한 스코프는 `service_key ∈ scope OR NULL`) |
| GET | `/:id` | 후보 상세 |
| POST | `/` | 후보 생성 (식별자 있으면 즉시 매칭 시도) |
| POST | `/:id/match` | Identifier Core 매칭 재시도 |
| POST | `/:id/manual-match` | 운영자 수동 매칭 (기존 Master 연결, body: productMasterId) |
| POST | `/:id/reject` | 반려 (body: reason) |
| POST | `/:id/archive` | 보관 |

> `approveAsNewProductMaster` 는 endpoint 미공개 (service 에서 501 NOT_IMPLEMENTED guard). 약국/매장 사용자-facing 후보 확정 API 는 후속 WO.

---

## 8. Existing Flow Impact

이번 WO 는 기존 소비처를 product_candidates 로 **전환하지 않았다.** 영향 지점과 후속 전환 후보만 기록한다.

| 소비처 | 본 WO 영향 | 후속 전환 후보 |
|---|---|---|
| supplier product create (`offer.service` / supplier-product.controller) | 무변경 | 신규 미확정 입력을 candidate 로 우회 |
| CSV/xlsx import (`csv-import.service` 등) | 무변경 | import staging → candidate 수렴 (source_type=csv_import/xlsx_import) |
| store-products search (`/api/v1/store/products`) | 무변경 | — |
| mobile skeleton | 무변경 | Phase 4: mobile_draft → candidate(source_type=mobile_draft) |
| bulk-match | 무변경 | candidate 매칭에 normalize 재사용 가능 |
| operator product console (`/api/v1/operator/products`) | 무변경 (별도 라우트) | 검토 UI 연계 |

> `ProductCandidateService` 는 supplier_web / pharmacy_web / store_web / mobile_draft / csv_import / xlsx_import / operator_import / external_api source_type 을 이미 수용. 전환은 Phase 4·후속 WO 에서 점진 적용.

---

## 9. What Was Not Changed

- ✅ ProductMaster 구조 변경 없음
- ✅ `product_masters.barcode` 변경 없음 (조회만)
- ✅ `product_identifiers` 구조 변경 없음 (단방향 참조만)
- ✅ 모바일 draft 구현 없음
- ✅ OTC 등록 분기 구현 없음
- ✅ Rx 등록 루트 구현 없음
- ✅ SupplierProductOffer 경계 변경 없음
- ✅ StoreProductProfile / OrganizationProductListing 경계 변경 없음
- ✅ 기존 CSV import 강제 전환 없음
- ✅ 사용자-facing 웹 UI 신규 구현 없음 (선택 A)
- ✅ 자동 ProductMaster 생성 없음 (`approveAsNewProductMaster` = 501 guard)

---

## 10. Risks / Follow-ups

| # | 항목 | 비고 |
|---|---|---|
| R1 | `approveAsNewProductMaster` 미구현 | 정식 승격(barcode 검증 + MFDS regulatory + Identifier Core 동기화)은 후속 WO |
| R2 | 소비처 미전환 | supplier/csv/mobile 유입을 candidate 로 보내는 연계는 Phase 4·후속 |
| R3 | conflict 운영 정책 | 복수 master 충돌 시 표기만 — 운영자 해소 UI 는 후속 |
| R4 | 텍스트 매칭 단순 ILIKE | bulk-match 의 정규화/유사도 로직과 통합 여지 |
| R5 | 중복 후보 방지 service logic 미구현 | (source_type, source_id) / (organization_id, normalized, pending) 중복 경고는 후속 (WO §3 권고) |
| R6 | UI 부재 | operator review UI 는 별도 후속 WO |

---

## 11. Verification Results

| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit -p tsconfig.json` | ✅ 0 errors (entity·service·controller·migration·register-routes 포함 전체) |
| ESM 규칙 (import type + 문자열 단방향 관계) | ✅ 준수 (ProductMaster/ProductIdentifier 무변경) |
| entity 등록 (index.ts + connection.ts import + 배열) | ✅ 3곳 |
| route 등록 no-regression | ✅ additive 마운트 (try/catch), 기존 라우트 무변경 |
| migration 위치 (src/database/migrations) | ✅ |
| migration 클래스명 유일성 | ✅ `CreateProductCandidates20260606010000` |
| 자동 Master 생성 없음 / 자동 승인 없음 | ✅ (matched 까지만, approve=501) |
| 전역 UNIQUE 미설정 | ✅ |

> 정적(컴파일 + 코드 경로) 검증 기준. 실제 DB 적용(테이블 생성)·런타임 매칭 동작은 main 배포 후 CI/CD 마이그레이션(`o4o-api-migrations` job) 또는 `migration:show` / 배포 환경 API 호출로 확인한다.

---

**작성:** O4O Platform Team · 2026-06-06
**상태:** Phase 3 완료 (backend foundation). 다음: Phase 4 — `mobile_product_drafts` → candidate 연결.
