# CHECK-O4O-KPA-TABLET-DESCRIPTION-CANONICAL-LINK-V1

> **작업명:** WO-O4O-KPA-TABLET-DESCRIPTION-CANONICAL-LINK-V1
> **유형:** tablet(supplier) 상품 description output path 최소 수정 — storefront 와 동일 canonical 우선 정렬.
> **결과: PASS — `queryTabletVisibleProducts`(TABLET 채널 supplier 상품)에 `shared_product_descriptions` canonical LEFT JOIN + COALESCE(canonical → store_profile legacy → supplier → ''). 데이터/migration/UI 무변경, product_ai_contents 미노출. api-server typecheck 0.**
> 성격: tablet 전용 정책 신설 아님 — **이미 확정된 상품설명 공용 자산 정책을 빠진 surface(tablet)에 연결**. canonical = **대표 상품설명**으로, tablet 에서도 매장별 설명보다 우선.
> 선행: KPA-STOREFRONT-DESCRIPTION-LINK-V1 · STORE-PROFILE-OVERRIDE-POLICY-ALIGNMENT-V1 — 2026-06-16

---

## 1. 수정 파일 (2)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/platform/store-public/store-public-utils.ts` | `queryTabletVisibleProducts` 데이터 SELECT: description/short COALESCE 에 canonical 우선 삽입 + `shared_product_descriptions` LEFT JOIN |
| `docs/investigations/CHECK-O4O-KPA-TABLET-DESCRIPTION-CANONICAL-LINK-V1.md` | 본 CHECK |

> JOIN/COALESCE 2곳 + 주석. 데이터/컬럼/migration/UI/frontend/count 쿼리 변경 0. storefront(`queryVisibleProducts`)·GP·KCos·Neture·local-product 경로 미접촉.

## 2. 사용자 강조 4점 검증

| # | 항목 | 결과 |
|:--:|------|------|
| 1 | **tablet 이 consumer/display-facing 인가** | ✅ `GET /:slug/tablet/products`(store-public-tablet.handler) — TABLET 채널 키오스크 고객 노출. `queryTabletVisibleProducts` = **supplier 상품(Commerce, 4중 게이트)** 경로. (handler 의 local-product 경로는 **별도** Display-Domain 쿼리 → 미접촉) |
| 2 | **ProductMaster join 안정** | ✅ `JOIN product_masters pm ON pm.id = spo.master_id`(INNER, supplier-offer 기반). **local-product 중심 아님** → HOLD 조건 비해당 |
| 3 | **pagination/count row 중복 없음** | ✅ count 쿼리(L57 `COUNT(DISTINCT spo.id)`)는 **spd 미참여**(데이터 쿼리에만 LEFT JOIN). canonical 1개/master(partial unique) + `DISTINCT ON (spo.id)` → 행 증식 0 |
| 4 | **HTML 새 정책 안 만듦** | ✅ 기존 tablet 도 description 을 **strip 없이 반환**(sp.description/consumer_detail = Tiptap HTML) → canonical 도 동일 처리(HTML 보존). 새 렌더 정책 신설 안 함(별도 HTML-RENDERING-POLICY WO) |

## 3. fallback 구현

```sql
LEFT JOIN shared_product_descriptions spd
  ON spd.master_id = pm.id AND spd.status = 'canonical' AND spd.deleted_at IS NULL
...
COALESCE(spd.content, sp.description, spo.consumer_detail_description, '') AS description,
COALESCE(spd.summary, spo.consumer_short_description, '') AS short_description
```

**description 우선순위(storefront 와 동일):**
1. `spd.content` — **shared canonical (대표 상품설명)** ← tablet 에서도 매장별 설명보다 우선
2. `sp.description` — store_product_profiles override (**legacy fallback, 데이터 보존**)
3. `spo.consumer_detail_description` — 공급자 상세
4. `''`

- `short_description`: `spd.summary → consumer_short → ''`.
- `product_ai_contents` **미포함**(직접 노출 금지 — 정책 준수).
- local product(off-catalog) 경로는 별도이며 native 필드 유지(canonical 비대상).

## 4. 안정성 (§9)

- canonical 1개/master + LEFT JOIN 동일 조건(`status='canonical' AND deleted_at IS NULL AND master_id=pm.id`) → offer 당 spd ≤1.
- `DISTINCT ON (spo.id)` 추가 방어. count 쿼리 무영향 → pagination total 정합.
- canonical 없으면 sp → supplier → `''`. LEFT JOIN → 상품 row 안 사라짐.

## 5. 불변 / 미도입 확인 (§8)

- `store_product_profiles.description` **삭제 안 함**(legacy fallback 보존), 편집 UI 미제거, migration 0.
- `product_ai_contents` 직접 노출 **없음**.
- 매장별 override/selection **신규 미도입**. local product 경로/storefront/GP/KCos/Neture admin/tablet frontend **미변경**.
- HTML 렌더 정책 **미변경**.

## 6. 검증

- **api-server typecheck PASS** (`tsc --noEmit` → EXIT 0).
- 정적: 데이터 쿼리 LEFT JOIN + COALESCE 순서만, count/JOIN 조건/DISTINCT 정합.
- **배포 후 sanity 권장:**
  1. canonical 지정된 master 의 tablet 상품 → description = **canonical** 반환(매장 override 있어도 canonical 우선)
  2. canonical 없고 override 있음 → override fallback(기존 유지)
  3. 둘 다 없음 → supplier → `''`, 상품 정상 노출
  4. tablet 상품 개수(pagination total) 변화 없음(count 무영향)
  ```sql
  SELECT master_id, COUNT(*) FROM shared_product_descriptions
  WHERE status='canonical' AND deleted_at IS NULL GROUP BY master_id HAVING COUNT(*)>1;  -- 0
  ```

## 7. 완료 판정

**PASS.** `queryTabletVisibleProducts`(TABLET supplier 상품)에 canonical fallback 연결, store profile override legacy 보존, supplier fallback 유지, product_ai_contents 미노출, 매장 override 신규 미도입, DB/UI 변경 0, typecheck 통과. 4 강조점 모두 충족(display-facing/ProductMaster 안정/count 무중복/HTML 기존 유지).

## 8. 후속 WO

1. `WO-O4O-PRODUCT-DESCRIPTION-HTML-RENDERING-POLICY-V1` — GP plain / KPA·tablet HTML 렌더 정책 통일.
2. `WO-O4O-PRODUCT-DESCRIPTION-STORE-PROFILE-OVERRIDE-DEPRECATION-V1` — DB 사용량 확인 후 override 편집 UI 축소/폐지.
3. (선택) `WO-O4O-PRODUCT-DESCRIPTION-TABLET-FRONTEND-RENDER-V1` — tablet 화면 description 표시 보정(필요 시).

---

*Date: 2026-06-16 · KPA tablet canonical description link · PASS · queryTabletVisibleProducts 에 shared_product_descriptions canonical LEFT JOIN + COALESCE(canonical → store_profile legacy → supplier → '') · canonical=대표 상품설명, tablet 에서도 매장별 설명보다 우선 · display-facing/ProductMaster INNER join/count 무중복/HTML 기존 유지 4점 충족 · product_ai_contents 미노출, override 데이터 보존, local-product 경로 미접촉 · typecheck 0.*
