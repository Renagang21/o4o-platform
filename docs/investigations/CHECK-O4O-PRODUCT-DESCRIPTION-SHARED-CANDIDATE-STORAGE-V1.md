# CHECK-O4O-PRODUCT-DESCRIPTION-SHARED-CANDIDATE-STORAGE-V1

> **작업명:** WO-O4O-PRODUCT-DESCRIPTION-SHARED-CANDIDATE-STORAGE-V1
> **유형:** additive 구현 — 신규 테이블/entity/service/admin API. 기존 스키마 **무변경**.
> **결과: PASS — `shared_product_descriptions`(ProductMaster 기준 공용 후보 풀) entity+migration+service+admin API 추가. canonical 1개/master 보장(partial unique index + transaction). product_ai_contents 불변, 매장별 override/selection 미도입. api-server typecheck 0.**
> 정책: [`IR-O4O-PRODUCT-DESCRIPTION-SHARED-ASSET-AND-CANONICAL-DESCRIPTION-POLICY-V1`](IR-O4O-PRODUCT-DESCRIPTION-SHARED-ASSET-AND-CANONICAL-DESCRIPTION-POLICY-V1.md) — 2026-06-16

---

## 1. 구현 파일 (7)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/modules/neture/entities/SharedProductDescription.entity.ts` | **신규** entity (ESM: `import type ProductMaster` + 문자열 관계명) |
| `apps/api-server/src/modules/neture/entities/index.ts` | export 추가 |
| `apps/api-server/src/database/connection.ts` | entity import + `entities` 배열 등록(2곳) |
| `apps/api-server/src/database/migrations/20261114000000-CreateSharedProductDescriptions.ts` | **신규** additive migration (테이블+인덱스+partial unique) |
| `apps/api-server/src/modules/neture/services/shared-product-description.service.ts` | **신규** service |
| `apps/api-server/src/modules/neture/controllers/shared-product-description.controller.ts` | **신규** admin/operator API |
| `apps/api-server/src/bootstrap/register-routes.ts` | route mount(`/api/v1/admin/shared-product-descriptions`) |

> 템플릿: 기존 `ProductCandidate`(entity/migration/service/controller/등록) 패턴 미러링.

## 2. 테이블 / 컬럼 / 인덱스

`shared_product_descriptions` (additive, 빈 테이블):
- `id` uuid PK · `master_id` uuid NOT NULL → `product_masters(id)` ON DELETE CASCADE
- `content` text NOT NULL · `summary` text · `source_type` varchar(32) · `source_ref_id` uuid
- `status` varchar(32) default `'candidate'` · `language` varchar(16) default `'ko'` · `quality_score` numeric(5,4)
- `curated_by/curated_at/created_by/updated_by` · `created_at/updated_at/deleted_at`(soft delete)

인덱스: `(master_id)`, `(master_id, status)`, `(source_type)`.

**source_type**: supplier · operator · ai · store_contribution · drug_extension · migration · manual
**status**: candidate · canonical · hidden · needs_review · deprecated

## 3. canonical 1개/master 보장 (2중)

1. **DB partial unique index**:
   ```sql
   CREATE UNIQUE INDEX uniq_shared_product_descriptions_canonical_per_master
   ON shared_product_descriptions (master_id)
   WHERE status = 'canonical' AND deleted_at IS NULL
   ```
2. **service transaction** (`setCanonical`): 같은 master 의 기존 canonical 을 candidate 로 강등 → 대상 row canonical 승격. 동일 트랜잭션이라 unique 충돌 없음.

→ PostgreSQL partial unique index 는 기존 migration(SQL raw)과 동일 스타일로 적용. 추가로 service 보장도 둠(이중 안전).

## 4. API / Service

mount: `/api/v1/admin/shared-product-descriptions` (authenticate + requireRole admin/operator). 매장 경영자 API 없음.

| Method | Path | service |
|------|------|------|
| GET | `/by-master/:masterId` | `listByMaster` |
| GET | `/by-master/:masterId/canonical` | `getCanonical` |
| POST | `/by-master/:masterId` | `createCandidate`(content/sourceType 검증) |
| PATCH | `/:id/canonical` | `setCanonical`(transaction) |
| PATCH | `/:id/status` | `setStatus`(canonical 제외) |
| DELETE | `/:id` | `softDelete` |

service 메서드: `listByMaster · getCanonical · getById · createCandidate · setCanonical · setStatus · softDelete`.

## 5. 불변 / 미도입 확인

- **product_ai_contents 불변** — schema/의미 변경 0. AI 초안/POP fallback 그대로(별 entity).
- **매장별 override 저장소 미도입** · **매장별 selection table 미도입**.
- **StoreLocalProduct off-catalog 미통합** — master 기준만.
- **ProductMaster 리팩터 0** — 단방향 nullable ManyToOne(문자열 관계명), inverse relation 미추가.
- **대량 seed/migration 미수행** — 빈 테이블. 기존 소스 흡수는 §7 mapping 문서화만(후속 SEED WO).
- **공개 상품 상세 노출 연결 미수행** — 후속 CANONICAL-OUTPUT-LINK.
- **관리자 UI 미구현** — API/service 까지.

## 6. 검증 결과

- **api-server typecheck PASS** (`npx tsc --noEmit -p tsconfig.json` → EXIT 0).
- entity registration: connection.ts import + entities 배열(2곳) 반영. migration glob(`migrations/*.ts`) 자동 픽업(명시 등록 불요).
- route registration: register-routes.ts mount + logger.info.
- ESM Entity 규칙 준수: `import type { ProductMaster }` + `@ManyToOne('ProductMaster', ...)` 문자열.
- **DB 동작/배포 검증: 미수행** — migration 은 main 배포 시 CI/CD 자동 실행(프로덕션 정책). 배포 후 권장 검증:
  ```sql
  -- canonical 1개/master 위반 0 이어야 함
  SELECT master_id, COUNT(*) FROM shared_product_descriptions
  WHERE status='canonical' AND deleted_at IS NULL GROUP BY master_id HAVING COUNT(*) > 1;
  ```
  + POST 후보 생성 → PATCH canonical → 재지정 시 기존 강등 확인(API sanity).

## 7. 기존 후보 소스 흡수 mapping (문서화 — 후속 SEED WO)

| 기존 소스 | → shared_product_descriptions |
|------|------|
| `SupplierProductOffer.consumer_detail_description` | content, source_type='supplier', source_ref_id=offer.id |
| `SupplierProductOffer.consumer_short_description` | summary |
| `ProductDrugExtension.efficacy/dosage/caution_text` 등 | content(조합), source_type='drug_extension' |
| `product_ai_contents`(product_description) | content, source_type='ai', source_ref_id=ai_content.id |
| 운영자 직접 작성 | source_type='operator'/'manual' |

→ 본 WO 는 수동 createCandidate + setCanonical 만 구현. 대량 seed 는 `WO-O4O-PRODUCT-DESCRIPTION-CANDIDATE-SEED-V1`(후속).

## 8. 완료 판정

**PASS.** entity/table/migration/service/admin API 추가, ProductMaster 기준 후보 저장 + canonical 1개/master 보장, product_ai_contents 불변, 매장별 override/selection 미도입, typecheck 통과. 배포 후 DB 검증 권장(§6).

## 9. 후속 WO

1. `WO-O4O-PRODUCT-DESCRIPTION-CANONICAL-OUTPUT-LINK-V1` — 상품 상세 description = canonical → supplier consumer_detail → master name/spec fallback(`'' AS description` 제거).
2. `WO-O4O-PRODUCT-DESCRIPTION-ADMIN-CURATION-V1` — 관리자 정비/대표 지정/숨김/AI 보조 UI.
3. `WO-O4O-PRODUCT-DESCRIPTION-CANDIDATE-SEED-V1` — supplier/ai/drug_extension 후보 seed.
4. (소) `WO-O4O-PRODUCT-DESCRIPTION-GUIDE-NOTICE-V1` — 안내 문구.

## 10. 작업 규칙 준수

- 사전 git 동기화(0/0). 동시 세션 WIP 미접촉. additive migration only. product_ai_contents schema 무변경. ProductMaster 대형 리팩터 0. 매장별 저장소 0. `git add .` 미사용 — path-specific. typecheck 후 commit.

---

*Date: 2026-06-16 · 상품설명 공용 후보 저장소 도입 · PASS · shared_product_descriptions(master 기준, canonical 1/master via partial unique+transaction) entity+migration+service+admin API · product_ai_contents 불변, 매장별 override/selection 미도입 · typecheck 0 · 배포 후 migration CI/CD 자동+DB 검증 권장 · 후속 output-link→curation→seed.*
