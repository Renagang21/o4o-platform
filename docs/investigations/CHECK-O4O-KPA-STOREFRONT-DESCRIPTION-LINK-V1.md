# CHECK-O4O-KPA-STOREFRONT-DESCRIPTION-LINK-V1

> **작업명:** WO-O4O-KPA-STOREFRONT-DESCRIPTION-LINK-V1
> **유형:** KPA storefront 상품 상세 output path 최소 수정 — canonical 공용 설명 fallback 연결.
> **결과: PASS — KPA storefront(통합 store-public) `queryVisibleProducts` 에 `shared_product_descriptions` canonical LEFT JOIN + COALESCE fallback. product_ai_contents 미노출, 매장별 override 신규 미도입, GP 경로 무회귀. api-server typecheck 0.**
> **⚠️ 선행 이슈:** KPA 통합 핸들러에 **기존 `store_product_profiles.description` per-store override**(편집 UI 존재)가 canonical 보다 우선. 비회귀 위해 보존 — "공용 자산(매장 override 미사용)" 정책 완전 정렬은 후속 결정(§6).
> 선행: CANONICAL-OUTPUT-LINK(GP) · SHARED-CANDIDATE-STORAGE — 2026-06-16

---

## 1. 수정 파일 (2)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/platform/store-public/store-public-utils.ts` | `queryVisibleProducts` SELECT: description COALESCE 에 `spd.content`(canonical) 삽입 + short_description 에 `spd.summary` + `shared_product_descriptions` LEFT JOIN |
| `docs/investigations/CHECK-O4O-KPA-STOREFRONT-DESCRIPTION-LINK-V1.md` | 본 CHECK |

> frontend/DB/migration/entity/route 변경 0. `queryTabletVisibleProducts`(tablet, 별도 함수) **미변경**(별 surface — §5 후속).

## 2. KPA backend path 조사 결과

| 항목 | 결과 |
|------|------|
| 프론트 | `StorefrontProductDetailPage` → `GET ${VITE_API_BASE_URL}/api/v1/stores/:slug/products/:id` (`getApiBase`) |
| 렌더 | `<ContentRenderer html={product.description} variant="product-detail" />` → **HTML 렌더**(GP plain-text 와 다름) |
| 백엔드 | `/api/v1/stores` → `createUnifiedStorePublicRoutes` → `store-public-product.handler` → **공유 헬퍼 `queryVisibleProducts`**(store-public-utils) |
| 경로 공유 | featured(L46)·list(L80)·detail(L105) **모두 `queryVisibleProducts`** → 단일 수정으로 3경로 해소 |
| GP 와의 관계 | GP 는 **별도** `glycopharm/store.controller` 의 자체 `queryVisibleProducts` 사용 → 본 변경과 무관(무회귀) |

## 3. fallback 구현

```sql
LEFT JOIN shared_product_descriptions spd
  ON spd.master_id = pm.id AND spd.status = 'canonical' AND spd.deleted_at IS NULL
...
COALESCE(sp.description, spd.content, spo.consumer_detail_description, '') AS description,
COALESCE(spd.summary, spo.consumer_short_description, '') AS short_description
```

**description 우선순위(실제):**
1. `sp.description` — **기존 store_product_profiles per-store override**(보존, §6)
2. `spd.content` — **shared canonical**(본 WO 추가)
3. `spo.consumer_detail_description` — 공급자 상세
4. `''`

> WO §4 정책은 canonical 최상위지만, 기존 store override 가 이미 존재(편집 UI)하므로 **비회귀 우선** → override 아래·supplier 위에 canonical 삽입. override 없는 상품(다수)은 canonical 노출.
> `product_ai_contents` 는 **미포함**(정책 준수). ProductMaster name/spec 위장 안 함(없으면 `''`).

## 4. HTML/plain 처리

- KPA storefront 는 `ContentRenderer`(HTML 리치 렌더). 기존 코드도 `sp.description`/`consumer_detail`(Tiptap HTML)을 **strip 없이** 반환 → canonical `content`(HTML)도 **태그 보존**(consistent). GP(plain-text 렌더)에서 strip 한 것과 의도적으로 다름 — 프론트 렌더 방식에 맞춤.

## 5. 안정성 (§8)

- **중복 row 없음:** canonical 1개/master(partial unique `WHERE status='canonical' AND deleted_at IS NULL`) + LEFT JOIN 조건 동일 + 기존 `DISTINCT ON (spo.id)`. offer 당 spd ≤1.
- **count 무영향:** count 쿼리(spd 미참여) 변경 없음 → pagination total 정합.
- **fallback 안정:** canonical 없으면 override/supplier/`''` 로 graceful. LEFT JOIN → 상품 row 안 사라짐.
- **서비스 영향:** 통합 store-public 는 service-agnostic 이나 **활성 consumer = KPA storefront**. GP=별도 컨트롤러(무회귀), KCos=storefront 부재, tablet=별도 함수(미변경).

## 6. ⚠️ 기존 store override 선행 이슈 (후속 결정 필요)

- KPA 통합 핸들러는 **`store_product_profiles.description` per-store override** 를 이미 보유하고, frontend 에 매장 owner 편집 경로(`PATCH /store/products/:id/description`)가 존재.
- 사용자 정책("상품설명=O4O 공용 자산, 매장별 override 미사용")과 **부분 상충**하나, 이 override 는 **본 WO 이전부터 존재**하는 기능이며 제거는 동작/기능 변경(범위 밖, "override 추가 금지"이지 "기존 제거" 아님).
- 본 WO 는 **비회귀** 원칙으로 override 를 보존하고 canonical 을 그 아래 삽입 → override 없는 상품은 canonical 노출, override 있는 상품은 기존대로.
- **완전 정렬**(공용 canonical 을 store override 보다 우선 또는 override 폐지)은 사용자 결정 필요 → 후속 `WO-O4O-PRODUCT-DESCRIPTION-STORE-PROFILE-OVERRIDE-DECISION-V1`(또는 STORE-FACING-PAGE-ALIGNMENT)로 분리.

## 7. 불변 / 미도입 확인

- `product_ai_contents` 직접 노출 **없음**.
- 매장별 override 저장소/selection **신규 미도입**(기존 store_product_profiles 는 보존, 추가 아님).
- StoreLocalProduct off-catalog **미연결**.
- GP 경로/관리자 UI/seed/HTML 렌더 정책 **미변경**. frontend 변경 **0**.

## 8. 검증

- **api-server typecheck PASS** (`tsc --noEmit` → EXIT 0).
- SQL 정합: LEFT JOIN 조건 = partial unique index 조건 일치, `deleted_at IS NULL`, DISTINCT ON, count 무영향.
- **DB/배포 sanity 미수행** — migration CI/CD 자동. 배포 후 권장:
  1. canonical 지정된 master 의 상품 → KPA `/store/:slug/products/:id` description = canonical(HTML) 반환(단, 해당 매장에 store override 없을 때)
  2. canonical 없음 → consumer_detail / `''` fallback, 상세 정상
  3. store override(sp.description) 있는 상품 → 기존 override 유지(비회귀)
  ```sql
  SELECT master_id, COUNT(*) FROM shared_product_descriptions
  WHERE status='canonical' AND deleted_at IS NULL GROUP BY master_id HAVING COUNT(*)>1;  -- 0
  ```

## 9. 완료 판정

**PASS.** KPA storefront(통합 store-public `queryVisibleProducts`)에 canonical fallback 연결, supplier fallback 유지, product_ai_contents 미노출, 매장 override 신규 미도입, GP 무회귀, HTML 렌더에 맞춘 태그 보존, typecheck 통과. 기존 store_product_profiles override precedence 는 §6 후속 결정 사항으로 명시.

## 10. 후속 WO

1. `WO-O4O-PRODUCT-DESCRIPTION-STORE-PROFILE-OVERRIDE-DECISION-V1`(권장) — KPA store_product_profiles.description override 와 canonical 우선순위/폐지 결정(정책 완전 정렬).
2. `WO-O4O-PRODUCT-DESCRIPTION-HTML-RENDERING-POLICY-V1` — content HTML sanitize/리치 렌더 정책(GP plain strip ↔ KPA HTML 통일).
3. (선택) tablet(`queryTabletVisibleProducts`)에도 canonical 연결.

---

*Date: 2026-06-16 · KPA storefront canonical description link · PASS · 통합 store-public queryVisibleProducts 에 shared_product_descriptions canonical LEFT JOIN + COALESCE(sp.description→spd.content→consumer_detail→'') · KPA HTML 렌더라 태그 보존 · product_ai_contents 미노출, 매장 override 신규 미도입, GP 무회귀 · 기존 store_product_profiles override precedence 후속 결정(§6) · tablet 미변경 · typecheck 0.*
