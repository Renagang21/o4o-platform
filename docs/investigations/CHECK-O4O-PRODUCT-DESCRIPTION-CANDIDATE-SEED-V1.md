# CHECK-O4O-PRODUCT-DESCRIPTION-CANDIDATE-SEED-V1

> **작업명:** WO-O4O-PRODUCT-DESCRIPTION-CANDIDATE-SEED-V1
> **유형:** 기존 설명 소스 → 공용 후보 흡수 (service + admin API). masterId 단위. 대량 백필 **없음**.
> **결과: PASS — supplier/ai/drug_extension 소스를 masterId 단위로 `shared_product_descriptions` 후보로 seed. (master,source,ref) 중복 방지, canonical 자동 승격 없음, product_ai_contents 불변, 매장별 override 미도입. api-server typecheck 0.**
> 선행: SHARED-CANDIDATE-STORAGE · CANONICAL-OUTPUT-LINK — 2026-06-16

---

## 1. 수정 파일 (3)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/modules/neture/services/shared-product-description.service.ts` | `SeedSource/SeedResult` 타입 + `seedFromExistingSources`/`seedFromSupplierOffers`/`seedFromProductAiContents`/`seedFromDrugExtension`/`existsBySourceRef` 추가 |
| `apps/api-server/src/modules/neture/controllers/shared-product-description.controller.ts` | `POST /by-master/:masterId/seed` 추가(sources 검증) |
| `docs/investigations/CHECK-O4O-PRODUCT-DESCRIPTION-CANDIDATE-SEED-V1.md` | 본 CHECK(신규) |

> DB/migration/entity/route mount 변경 0. frontend 0. 기존 메서드(list/getCanonical/createCandidate/setCanonical/setStatus/softDelete) 무변경.

## 2. seed source별 처리

| source | 조회 | source_type | status | content | summary | source_ref_id |
|------|------|------|------|------|------|------|
| **supplier** | `supplier_product_offers WHERE master_id=$1` (offer 당 1건) | `supplier` | `candidate` | consumer_detail(없으면 short) | consumer_short | offer.id |
| **ai** | `product_ai_contents WHERE product_id=$1 AND content_type='product_description'` | `ai` | `candidate` | content | — | ai_content.id |
| **drug_extension** | `product_drug_extensions WHERE product_master_id=$1` | `drug_extension` | **`needs_review`** | 구조화 필드(성분/효능/용법/주의/금기/저장) HTML 조합 | — | extension.id |

- 모든 소스에 안정적 `source_ref_id` 존재(offer.id / ai.id / extension.id) → content hash 불요.
- 빈 내용(설명 없음)은 skip(created 아님).
- **drug_extension 은 법적 표현 리스크 → `needs_review`** (자동 candidate/canonical 금지, §4.3 준수).

## 3. 중복 방지 (§6)

```ts
existsBySourceRef(masterId, sourceType, sourceRefId)  // repo.count, soft-deleted 제외
```
- 동일 `(master_id, source_type, source_ref_id)` row 가 이미 있으면 **skip**.
- 기존 row 가 `canonical`/`hidden`/`deprecated`/`needs_review` 어떤 상태든 **덮어쓰지·되살리지 않음**(§6 주의 준수). seed 재실행 시 skipped 만 증가.

## 4. canonical 자동 지정 정책 (§7)

- **자동 canonical 승격 없음.** seed 는 `candidate`(또는 drug_extension `needs_review`) 생성까지만.
- `autoCanonical` body 파라미터는 **수신하되 미동작(no-op)** — 실제 대표 지정은 후속 `ADMIN-CURATION` 에서. 기존 canonical 은 seed 가 절대 건드리지 않음.

## 5. API

`POST /api/v1/admin/shared-product-descriptions/by-master/:masterId/seed` (authenticate + admin/operator guard, 매장 경영자 불가)

```json
{ "sources": ["supplier", "ai", "drug_extension"], "autoCanonical": false }
```
- `sources` 생략/빈 배열 → 기본 3개 전부. 잘못된 source 값 → 400.
- 응답: `SeedResult { masterId, created, skipped, sources: { supplier?, ai?, drugExtension? } }`.

## 6. 데이터 변경 범위 (§8)

- **허용:** 관리자가 특정 masterId seed 호출 시 후보 row 생성.
- **미수행/금지:** 전체 ProductMaster 자동 대량 백필 ✗ · migration 데이터 seed ✗ · cron/batch ✗ · product_ai_contents/SupplierProductOffer/DrugExtension 데이터 변경 ✗.

## 7. 불변 / 미도입 확인

- `product_ai_contents` 읽기만(SELECT) — schema/데이터 **불변**. 노출 아님(후보 흡수).
- 매장별 override 저장소 / selection table **미도입**.
- StoreLocalProduct off-catalog **미통합**.
- 관리자 UI / 상품 상세 output 변경 / KPA link / HTML 렌더 정책 **미수행**.

## 8. 검증

- **api-server typecheck PASS** (`tsc --noEmit` → EXIT 0).
- 컬럼명 실측 확인: `supplier_product_offers.consumer_detail_description/consumer_short_description`, `product_ai_contents(product_id, content_type, content)`, `product_drug_extensions(product_master_id, efficacy_text/dosage_text/caution_text/storage_text/contraindication_text/ingredient_summary)`.
- **DB/배포 sanity 미수행** — `shared_product_descriptions` migration 은 main 배포 시 CI/CD 자동. 배포 후 권장:
  1. supplier 설명 있는 masterId → seed → supplier candidate 생성
  2. 동일 seed 재호출 → created 0, skipped 증가(중복 방지)
  3. product_ai_contents/drug_extension 있으면 각 후보 생성(drug=needs_review)
  4. 기존 canonical 있어도 seed 가 덮지 않음
  5. 매장 경영자 권한 호출 → 403
  ```sql
  SELECT master_id, source_type, status, COUNT(*) FROM shared_product_descriptions
  GROUP BY master_id, source_type, status ORDER BY COUNT(*) DESC;
  -- 중복(소스 ref) 0 이어야:
  SELECT master_id, source_type, source_ref_id, COUNT(*) FROM shared_product_descriptions
  WHERE source_ref_id IS NOT NULL GROUP BY 1,2,3 HAVING COUNT(*) > 1;
  ```

## 9. 완료 판정

**PASS.** masterId 단위 seed API + service(supplier/ai/drug_extension), (master,source,ref) 중복 방지, canonical 자동 덮어쓰기 없음, product_ai_contents 불변, 매장별 override/selection 미도입, 대량 백필 없음, typecheck 통과. 배포 후 DB sanity 권장(§8).

## 10. 후속 WO

1. `WO-O4O-PRODUCT-DESCRIPTION-ADMIN-CURATION-V1` — 관리자 후보 정비/대표 지정/숨김/AI 보조(seed 된 후보를 canonical 로 승격).
2. (선택) `WO-O4O-PRODUCT-DESCRIPTION-CANDIDATE-BULK-SEED-V1` — 조건별/전체 seed 실행.
3. (선택) `WO-O4O-KPA-STOREFRONT-DESCRIPTION-LINK-V1` — KPA storefront canonical 연결.
4. (소) `WO-O4O-PRODUCT-DESCRIPTION-GUIDE-NOTICE-V1` — 안내 문구.

---

*Date: 2026-06-16 · 상품설명 공용 후보 seed · PASS · supplier/ai/drug_extension → shared_product_descriptions 후보(masterId 단위), (master,source,ref) 중복 방지, drug=needs_review, canonical 자동승격 없음 · product_ai_contents 불변, 매장별 override 미도입, 대량백필 없음 · typecheck 0 · 후속 ADMIN-CURATION.*
