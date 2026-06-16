# CHECK-O4O-PRODUCT-DESCRIPTION-STORE-PROFILE-OVERRIDE-POLICY-ALIGNMENT-V1

> **작업명:** WO-O4O-PRODUCT-DESCRIPTION-STORE-PROFILE-OVERRIDE-POLICY-ALIGNMENT-V1
> **유형:** KPA storefront fallback 순서 정렬 — canonical 우선, store profile override 는 legacy fallback 으로 격하. 데이터/컬럼/UI **무삭제**.
> **결과: PASS — KPA storefront `queryVisibleProducts` description fallback 을 `canonical → store_profile(legacy) → supplier → ''` 로 정렬(SQL COALESCE 순서 swap). 데이터/migration/UI 변경 0, product_ai_contents 미노출. api-server typecheck 0.**
> 선행: KPA-STOREFRONT-DESCRIPTION-LINK-V1 — 2026-06-16

---

## 1. 수정 파일 (2)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/platform/store-public/store-public-utils.ts` | `queryVisibleProducts` description COALESCE 순서: `sp.description, spd.content, …` → **`spd.content, sp.description, …`** (canonical 우선) |
| `docs/investigations/CHECK-...-STORE-PROFILE-OVERRIDE-POLICY-ALIGNMENT-V1.md` | 본 CHECK |

> 단일 SQL 라인(COALESCE 순서) + 주석. JOIN/데이터/컬럼/migration/UI/frontend 변경 0.

## 2. store_product_profiles.description 사용처 조사

| 사용처 | 위치 | 성격 | 본 WO 영향 |
|------|------|------|------|
| **편집(write)** | `o4o-store/.../store-product-library.controller.ts:621` `PATCH /api/v1/store/products/:id/description` (requireStoreOwner) | 매장 owner per-store override 작성 | **미변경**(데이터/UI 보존) |
| **KPA storefront 노출(read)** | `store-public-utils.ts` `queryVisibleProducts` (storefront list/detail/featured) | sp.description fallback | **순서 격하**(canonical 우선) |
| **tablet 노출(read)** | `store-public-utils.ts` `queryTabletVisibleProducts` (L327) | sp.description fallback, **canonical 미연결** | **미변경**(별 surface → §5 후속) |
| **neture operator 상품 view(read)** | `neture/neture.routes.ts:420/475/540` (profile.display_name/description/pharmacist_comment) | 운영자 상품 목록 표시 | **미변경**(별 surface, 매장 노출 아님) |

→ KPA **소비자 storefront** 경로의 fallback 순서만 정렬. 편집 UI·데이터·tablet·neture operator surface 는 보존.

## 3. fallback 순서 변경 (KPA storefront)

| | description |
|---|---|
| **이전** | `store_profile.description → canonical → supplier_detail → ''` |
| **변경** | **`canonical → store_profile.description(legacy) → supplier_detail → ''`** |

```sql
COALESCE(spd.content, sp.description, spo.consumer_detail_description, '') AS description
```
- `short_description`: 기존 `COALESCE(spd.summary, spo.consumer_short_description, '')` 유지 — 이미 canonical(summary) 우선, sp 미포함(§6.2 준수, store profile 을 short 에 억지 주입 안 함).

## 4. store profile 을 legacy fallback 으로 둔 이유 (§4)

- 공용 canonical 을 **우선 노출**(정책: 상품설명 = O4O 공용 자산).
- 기존 `store_product_profiles.description` **데이터 삭제 안 함** — canonical 없는 상품에서 기존 동작 fallback 보존(회귀 위험 최소).
- 매장별 override 는 사실상 **legacy fallback 으로 격하**(신규 권장 아님). 완전 폐지/편집 UI 제거는 후속 deprecation WO(§7).

## 5. HTML 처리

- 이번 WO 에서 HTML 렌더 정책 **재정의 안 함**. KPA `ContentRenderer`(HTML) 흐름 유지 — canonical/sp.description 모두 strip 없이 반환(기존 KPA 동작 동일). GP(plain strip) ↔ KPA(HTML) 통일은 별도 `HTML-RENDERING-POLICY` WO.

## 6. 안정성

- **canonical 1개/master**(partial unique) + LEFT JOIN 동일 조건 + `DISTINCT ON (spo.id)` → 행 증식 없음(순서만 바뀜, JOIN 동일).
- **count/pagination 무영향**(count 쿼리 spd 미참여, 변경 없음).
- **fallback 안정:** canonical 없으면 sp → supplier → `''`. 상품 row 안 사라짐.
- **GP 무회귀:** GP 는 별도 glycopharm 컨트롤러 — 본 파일 미사용.

## 7. 불변 / 미도입 확인 (§7)

- `store_product_profiles.description` 컬럼/데이터 **삭제 0**, migration **0**, 대량 보정 **0**.
- 매장별 override UI **제거 안 함**(보존). 매장별 override/selection **신규 추가 0**.
- `product_ai_contents` 직접 노출 **없음**.
- 상품설명 편집기/콘텐츠 만들기/AI batch/bulk seed/GP 경로/KCos storefront **미변경**.

## 8. 데이터 영향 (DB 실측 미수행)

- prod 방화벽 + 비대화형(psql) → 미수행. 배포 후/별도 채널 권장:
  ```sql
  SELECT COUNT(*) FROM store_product_profiles WHERE description IS NOT NULL AND trim(description) <> '';
  SELECT organization_id, COUNT(*) FROM store_product_profiles
    WHERE description IS NOT NULL AND trim(description) <> '' GROUP BY organization_id ORDER BY COUNT(*) DESC;
  ```
  → store override 사용량 파악(deprecation WO 의사결정 근거). 사용량 0/소수면 폐지 안전.

## 9. 검증

- **api-server typecheck PASS** (EXIT 0).
- 정적: COALESCE 순서만 변경(canonical 우선), JOIN/조건/DISTINCT/count 동일.
- **배포 후 sanity 권장:**
  1. canonical 지정 + store override 둘 다 있는 상품 → description = **canonical** 반환(이전엔 override)
  2. canonical 없고 override 있는 상품 → override fallback(기존 유지)
  3. 둘 다 없음 → supplier → `''`
  ```sql
  SELECT master_id, COUNT(*) FROM shared_product_descriptions
  WHERE status='canonical' AND deleted_at IS NULL GROUP BY master_id HAVING COUNT(*)>1;  -- 0
  ```

## 10. 완료 판정

**PASS.** store_product_profiles.description 사용처 조사 완료, KPA storefront fallback canonical 우선 정렬, 기존 override 데이터/편집 UI legacy fallback 보존(무삭제), product_ai_contents 미노출, 매장 override 신규 미도입, DB/migration 대형 변경 0, typecheck 통과. tablet/편집 UI deprecation 은 §11 후속.

## 11. 후속 WO

1. `WO-O4O-PRODUCT-DESCRIPTION-STORE-PROFILE-OVERRIDE-DEPRECATION-V1` — (DB 사용량 확인 후) 편집 UI 축소/legacy 안내/폐지 결정.
2. `WO-O4O-KPA-TABLET-DESCRIPTION-CANONICAL-LINK-V1` — tablet(`queryTabletVisibleProducts`)에도 canonical 연결(+ 동일 순서 정렬).
3. `WO-O4O-PRODUCT-DESCRIPTION-HTML-RENDERING-POLICY-V1` — GP plain ↔ KPA HTML 렌더 정책 통일.

---

*Date: 2026-06-16 · store profile override 정책 정렬 · PASS · KPA storefront queryVisibleProducts description = COALESCE(canonical → store_profile legacy → supplier → '') · 데이터/컬럼/migration/UI 무삭제, 매장 override legacy fallback 격하 · product_ai_contents 미노출, GP 무회귀, tablet 미변경 · typecheck 0 · DB 사용량 실측은 후속/배포후 · 후속 deprecation/tablet/HTML 정책.*
