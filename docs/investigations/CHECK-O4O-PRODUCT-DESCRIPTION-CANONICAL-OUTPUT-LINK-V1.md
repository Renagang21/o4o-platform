# CHECK-O4O-PRODUCT-DESCRIPTION-CANONICAL-OUTPUT-LINK-V1

> **작업명:** WO-O4O-PRODUCT-DESCRIPTION-CANONICAL-OUTPUT-LINK-V1
> **유형:** 상품 상세 output path 최소 수정 — `'' AS description` 제거 + canonical fallback 연결.
> **결과: PASS — GP storefront 상품 상세/리스트/featured 공유 헬퍼 `queryVisibleProducts` 에 `shared_product_descriptions` canonical LEFT JOIN + COALESCE fallback. product_ai_contents 미노출, 매장별 override/selection 미도입. api-server typecheck 0.**
> 선행: [`CHECK-O4O-PRODUCT-DESCRIPTION-SHARED-CANDIDATE-STORAGE-V1`](CHECK-O4O-PRODUCT-DESCRIPTION-SHARED-CANDIDATE-STORAGE-V1.md) · 정책 IR-SHARED-ASSET — 2026-06-16

---

## 1. 수정 파일 (2)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/glycopharm/controllers/store.controller.ts` | `queryVisibleProducts` 헬퍼: `'' AS description`/`'' AS short_description` → canonical fallback COALESCE + `shared_product_descriptions` LEFT JOIN |
| `docs/investigations/CHECK-O4O-PRODUCT-DESCRIPTION-CANONICAL-OUTPUT-LINK-V1.md` | 본 CHECK(신규) |

> backend 1파일만. frontend/DB/migration/entity/route/capability 변경 0.

## 2. 구현 위치 — 단일 공유 헬퍼

`queryVisibleProducts(dataSource, pharmacyId, opts)` 가 GP storefront 의 **3 경로 모두**를 구동:
- `GET /:slug/products/featured` (line 345)
- `GET /:slug/products` (리스트, line 391)
- `GET /:slug/products/:id` (**상품 상세**, line 428)

→ 헬퍼 1곳 수정으로 상세·리스트·featured description 동시 해소.

## 3. fallback 구현

```sql
LEFT JOIN shared_product_descriptions spd
  ON spd.master_id = pm.id
  AND spd.status = 'canonical'
  AND spd.deleted_at IS NULL
...
regexp_replace(
  COALESCE(spd.content, spo.consumer_detail_description, spo.consumer_short_description, ''),
  '<[^>]+>', '', 'g'
) AS description,
regexp_replace(
  COALESCE(spd.summary, spo.consumer_short_description, ''),
  '<[^>]+>', '', 'g'
) AS short_description
```

**fallback 순서(§4 정책 반영):**
1. `shared_product_descriptions.content` (canonical 공용 대표)
2. `SupplierProductOffer.consumer_detail_description` (공급자 상세)
3. `SupplierProductOffer.consumer_short_description` (공급자 단문)
4. `''` (빈 문자열)

> §4 의 "ProductMaster name/spec 기반 기본 설명"(4단계)은 **의도적 생략** — 상품명(`name`)은 이미 별도 필드로 반환되며, 이름을 설명으로 위장하면 노이즈. 실제 설명 없으면 `''`(기존 빈 화면 동작 유지)이 더 정직.
> `product_ai_contents` 는 fallback 에 **미포함** — AI 초안은 shared 후보로 승격될 때만 노출(정책 준수).

## 4. HTML/plain 처리 (§7.1 안전 방안)

- GP storefront(`StoreProductDetail.tsx:313`)는 `{product.description}` — **plain text 렌더**(HTML 렌더 아님).
- canonical `content` 는 HTML 가능 → **`regexp_replace('<[^>]+>','')` 로 태그 제거** 후 반환 → GP 에서 raw 태그 노출 없이 안전한 plain text.
- HTML 리치 렌더 도입은 별도 `WO-O4O-PRODUCT-DESCRIPTION-HTML-RENDERING-POLICY-V1`(후속)로 분리. 본 WO 는 plain 안전 노출까지.

## 5. canonical 중복/안정성 방어 (§7.2/§7.3)

- **중복 row 없음:** canonical 은 master 당 1개(partial unique index `WHERE status='canonical' AND deleted_at IS NULL`). LEFT JOIN 조건이 그 index 조건과 **정확히 일치** → offer 당 spd ≤1행. 기존 `DISTINCT ON (spo.id)` 가 추가 방어.
- **count 쿼리 무영향:** count 쿼리(별도, spd 미참여)는 변경 없음 → 페이지네이션 total 정합 유지.
- **fallback 안정성:** canonical 없으면 supplier → `''` 로 graceful. LEFT JOIN 이라 상품 자체 row 는 절대 사라지지 않음.

## 6. 서비스 영향 (KPA/GP/KCos)

| 서비스 | 영향 | 근거 |
|------|------|------|
| **GlycoPharm** | ✅ 변경(개선) | `createStoreController` = **glycopharm.routes 전용 마운트**. storefront 상세/리스트/featured description 연결 |
| **KPA** | 영향 없음 | `routes/kpa` 에 이 컨트롤러/`AS description` 하드코딩 없음 → KPA storefront 는 **별도 백엔드 경로**. 본 변경 미적용(필요 시 별도 WO 로 KPA 경로 확인) |
| **K-Cosmetics** | 대상 아님 | 소비자 storefront 상품 상세 부재(operator 내부 도구만) |

> 본 WO 는 GP storefront(이 컨트롤러)로 범위 한정. KPA 는 동일 컨트롤러를 쓰지 않으므로 무영향이며, KPA 노출 연결이 필요하면 후속 WO 에서 KPA 백엔드 경로를 별도 확인.

## 7. 불변 / 미도입 확인

- `product_ai_contents` 직접 노출 **없음**(fallback 미포함).
- 매장별 override 저장소 / selection table **미도입**.
- StoreLocalProduct off-catalog 상품 상세 **미연결**(이 컨트롤러는 supplier offer 기반 카탈로그 상품만).
- 관리자 UI / seed / AI batch **미수행**.
- frontend 변경 **0** · DB/migration/entity 변경 **0**.

## 8. 검증

- **api-server typecheck PASS** (`tsc --noEmit` → EXIT 0).
- SQL 정합: LEFT JOIN 조건 = partial unique index 조건 일치(중복 0), `deleted_at IS NULL` 포함, count 무영향.
- **DB/배포 검증 미수행** — `shared_product_descriptions` migration 은 main 배포 시 CI/CD 자동 적용(저장소 WO). 배포 후 권장 API sanity:
  1. `POST /api/v1/admin/shared-product-descriptions/by-master/:masterId` → 후보 생성 → `PATCH /:id/canonical`
  2. 해당 master 의 offer 를 가진 매장 `GET /stores/:slug/products/:id` → description = canonical content(태그 제거) 반환 확인
  3. canonical `hidden` 전환 → description 이 supplier/`''` 로 fallback 확인
  4. canonical 없는 상품 → 상세 정상 응답(빈 description, 깨짐 없음)

## 9. 완료 판정

**PASS.** `'' AS description` 제거, canonical 우선 fallback(→supplier→`''`) 연결, product_ai_contents 미노출, 매장별 override/selection 미도입, GP/KPA/KCos 영향 확인, typecheck 통과. GP plain-text 안전 노출(태그 제거). 배포 후 DB sanity 권장(§8).

## 10. 후속 WO

1. `WO-O4O-PRODUCT-DESCRIPTION-CANDIDATE-SEED-V1` — supplier/ai/drug_extension → shared 후보 seed(노출에 실데이터 공급).
2. `WO-O4O-PRODUCT-DESCRIPTION-ADMIN-CURATION-V1` — 관리자 정비/대표 지정 UI.
3. `WO-O4O-PRODUCT-DESCRIPTION-HTML-RENDERING-POLICY-V1` — content HTML sanitize/리치 렌더 정책(태그 제거 → 리치 렌더 전환).
4. (선택) `WO-O4O-KPA-STOREFRONT-DESCRIPTION-LINK-V1` — KPA storefront 백엔드 경로 canonical 연결.
5. (소) `WO-O4O-PRODUCT-DESCRIPTION-GUIDE-NOTICE-V1` — 안내 문구.

---

*Date: 2026-06-16 · 상품설명 canonical output-link · PASS · GP queryVisibleProducts 에 shared_product_descriptions canonical LEFT JOIN + COALESCE fallback(canonical→supplier detail→short→'') · GP plain-text 안전(태그 제거) · product_ai_contents 미노출, 매장별 override 미도입 · KPA 별도 백엔드(무영향)/KCos storefront 부재 · typecheck 0 · 후속 seed→curation→HTML 렌더 정책.*
