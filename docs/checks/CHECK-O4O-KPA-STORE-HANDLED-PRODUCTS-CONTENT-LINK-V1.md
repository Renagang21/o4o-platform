# CHECK — KPA 매장 취급제품 콘텐츠 연결 V1

> **WO:** WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-V1
> **선행 IR:** IR-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-MODEL-V1
> **작성일:** 2026-06-27
> **범위:** KPA Society 한정 (apps/api-server, services/web-kpa-society)

---

## 1. 선행 IR 요약

매장 취급제품(= O4O 기반 제품 + 매장 경영활용 제품)과 매장 자료함 콘텐츠를 연결하는 모델이 확정됨.

확정된 연결 기준:

| 제품 유형 | 사용자 노출 용어 | 내부 sourceType | 연결 기준 테이블 |
|---|---|---|---|
| O4O 기반 제품 | O4O 기반 제품 | `listing` | `organization_product_listings` |
| 매장 경영활용 제품 | 매장 경영활용 제품 | `local` | `store_local_products` |

- O4O 기반 제품의 운영 단위는 매장 등록 listing → **연결 기준은 listing**. `master_id`(ProductMaster)는 부가 보존.
- 기존 선례 `store_multilingual_product_content_groups` 의 `targetKind('listing'|'local') + targetId` 규약과 정합.
- **기본 상세설명서 지정 없음** (is_default / primary_description_id 등 미생성).
- V1 UI = 콘텐츠 1개 → 제품 1개. DB 구조는 N:N 확장 가능 조인 테이블.

---

## 2. DB / migration 변경

**신규 migration:** `apps/api-server/src/database/migrations/20261128000000-CreateKpaStoreContentProductLinks.ts`

- raw SQL `CREATE TABLE IF NOT EXISTS` (프로젝트 migration 관례).
- `content_id` → `kpa_store_contents(id)` FK **ON DELETE CASCADE**.
- `product_source_id` 는 listing/local **다형 참조 → 단일 FK 미설정**(약참조), 조회 시 org 스코프 검증.
- `down()` 은 `DROP TABLE IF EXISTS`.

---

## 3. 신규 연결 테이블 구조

`kpa_store_content_product_links`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | UUID PK | gen_random_uuid() |
| `organization_id` | UUID NOT NULL | 매장/조직 스코프 |
| `content_id` | UUID NOT NULL | FK → kpa_store_contents(id) CASCADE |
| `product_source_type` | VARCHAR(20) NOT NULL | CHECK IN ('listing','local') |
| `product_source_id` | UUID NOT NULL | listing.id 또는 local.id |
| `master_id` | UUID NULL | listing 일 때 master_id, local 이면 NULL |
| `link_type` | VARCHAR(30) NOT NULL DEFAULT 'product_description' | V1 고정 |
| `created_at` / `updated_at` | TIMESTAMP NOT NULL DEFAULT NOW() | |

**제약/인덱스:**
- `UQ_kspcl_org_content_product_linktype` UNIQUE (org, content, source_type, source_id, link_type)
- `IDX_kspcl_org_content` (org, content)
- `IDX_kspcl_org_product` (org, source_type, source_id)
- `IDX_kspcl_org_product_linktype` (org, source_type, source_id, link_type)
- `IDX_kspcl_master` (master_id)
- `chk_kspcl_source_type` CHECK (source_type IN ('listing','local'))

**Entity:** `apps/api-server/src/routes/kpa/entities/kpa-store-content-product-link.entity.ts` (`KpaStoreContentProductLink`) — 관계 미정의(ESM 규칙), 평문 컬럼만. `database/entities.ts` + `kpa/entities/index.ts` 등록 완료.

---

## 4. sourceType / sourceId 기준

- 사용자 화면: "O4O 기반 제품" / "매장 경영활용 제품" / "매장 취급제품" 만 노출.
- 내부 식별자: `listing` / `local`. 화면에 listing/local 노출 안 함.

---

## 5. O4O 기반 제품(listing) 연결

- `product_source_type='listing'`, `product_source_id=organization_product_listings.id`
- `master_id = organization_product_listings.master_id` (부가 보존)
- org 스코프 검증: `SELECT master_id FROM organization_product_listings WHERE id=$1 AND organization_id=$2`

## 6. 매장 경영활용 제품(local) 연결

- `product_source_type='local'`, `product_source_id=store_local_products.id`, `master_id=NULL`
- org 스코프 검증: `SELECT id FROM store_local_products WHERE id=$1 AND organization_id=$2`

## 7. master_id 부가 저장 정책

- listing 연결 시에만 보존. B2C 상세설명 복사 후속 / 공용 ProductMaster 참조 / 중복 listing 인지 목적.
- local 은 ProductMaster 없음 → NULL.

---

## 8. 콘텐츠 생성/수정 API 변경

대상 컨트롤러: `apps/api-server/src/routes/o4o-store/controllers/store-content.controller.ts`
(마운트: `/api/v1/kpa/store-contents`)

`productRef` (optional) 추가:
```jsonc
"productRef": { "sourceType": "listing" | "local", "sourceId": "<uuid>" }
```

| 값 | 동작 |
|---|---|
| 미전송(undefined) | 기존 link 유지 (tags 정책과 동일) |
| `null` | 기존 product_description link 제거 |
| 객체 | 검증 후 link 교체(콘텐츠당 1개 유지) |

적용 엔드포인트: `POST /` (direct 생성), `PUT /direct/:id` (direct 수정), `PUT /:snapshotId` (snapshot upsert).

- **검증은 콘텐츠 저장 *이전*** (`prepareProductRef`) → 잘못된 productRef 로 콘텐츠가 먼저 저장되는 orphan 방지. 실패 시 400 `INVALID_PRODUCT_REF`.
- link upsert 는 raw SQL + parameter binding (Boundary Policy 준수), `DELETE → INSERT ... ON CONFLICT DO NOTHING`.
- 별도 link/unlink API 는 V1 에서 만들지 않음(WO §7.2).

---

## 9. 제품별 연결 콘텐츠 조회

신규: `GET /api/v1/kpa/store-contents/by-product?sourceType=&sourceId=`

응답:
```jsonc
{ "success": true, "data": { "items": [
  { "contentId", "title", "status" (=workspace_status), "linkType", "updatedAt" }
] } }
```
- `/:snapshotId` 보다 먼저 라우트 등록(리터럴 경로 우선).
- org 스코프: `resolveDualOrgId` + JOIN 시 `c.organization_id = l.organization_id`.

---

## 10. handled-products linkedContentCount 표시

대상: `apps/api-server/src/routes/platform/store-handled-products.routes.ts`
(`GET /api/v1/store/handled-products`)

- UNION 본 쿼리는 유지. **현재 페이지 제품(source_id)에 대해서만 1회 group count** → N+1 회피.
  ```sql
  SELECT product_source_type, product_source_id, COUNT(*)::int AS cnt
  FROM kpa_store_content_product_links
  WHERE organization_id = $1 AND product_source_id = ANY($2::uuid[])
  GROUP BY product_source_type, product_source_id
  ```
- 응답 item 에 `linkedContentCount` 추가(0 = 없음).
- 프론트(`services/web-kpa-society`):
  - `api/handledProducts.ts` `HandledProduct.linkedContentCount: number`
  - `StoreHandledProductsPage.tsx` "연결 콘텐츠" 컬럼 1개 추가 (구분/표시가격 다음, 상태 앞). `>0` → "N개" 배지, `0` → "없음". 기존 컬럼 구조 유지 + 최소 추가.

---

## 11. 기본 상세설명 미지정 확인

- 테이블/엔티티/API 어디에도 `is_default` / `default_content_id` / `primary_description_id` 없음. ✅
- 상세설명서는 여러 개 연결 가능하나 기본 지정 안 함(진열/제작 시점 선택은 후속 WO).

## 12. 공급처 / 온라인 풀필먼트 비확장 확인

- 공급처/구매처/조달 경로 컬럼 추가 없음. ✅
- 온라인 주문 이후 처리(재고/배송/발송/응대) 구조 추가 없음. ✅
- 제품 원본(listing/local/ProductMaster) 수정 없음 — 읽기 검증만. ✅
- O4O B2C 원본 수정 없음. ✅ (복사는 후속 WO)

---

## 13. typecheck 결과

| 패키지 | 결과 |
|---|---|
| `apps/api-server` (`tsc --noEmit`) | **PASS** (오류 0) |
| `services/web-kpa-society` (`tsc --noEmit`) | **PASS** (오류 0) |

> narrowing 이슈(boolean 리터럴 discriminant collapse)로 `prepareProductRef` 반환 타입에 `error?`/`plan?` optional 부여하여 해소.

---

## 14. API smoke 결과

- [ ] **배포 후 수행 예정** (main 배포 → CI/CD migration 자동 실행 후):
  - `POST /api/v1/kpa/store-contents` productRef 없이 → 201, link 없음
  - productRef listing → 201, link 1개 + master_id 보존
  - productRef local → 201, link 1개 + master_id NULL
  - `PUT /direct/:id` productRef 변경 → link 교체 / `null` → 제거
  - `GET /store-contents/by-product?sourceType=&sourceId=` → 연결 목록
  - `GET /store/handled-products` → linkedContentCount 반영
  - 타 매장 제품 sourceId → 400 INVALID_PRODUCT_REF (org 스코프 차단)

> 본 테이블은 신규 → 배포 전 prod 데이터 없음. migration 적용 확인은 `o4o-api-migrations` job + `migration:show` 기준.

## 15. browser smoke 결과

- [ ] **배포 후 수행 예정**:
  - `/store/handled-products` 접근, "연결 콘텐츠" 컬럼 표시, 기존 컬럼 구조 유지
  - 콘텐츠 작성/수정(제품 연결 없이/포함) 정상 저장
  - 콘솔 주요 오류 없음

> V1 프론트 범위는 count 표시까지. 콘텐츠 작성 화면의 제품 picker 는 후속 CONTENT-ACTIONS WO.

---

## 16. 후속 후보

- `WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-ACTIONS-V1` — 제품 선택 상태로 콘텐츠 작성 진입 + 제품별 연결 콘텐츠 보기 + 제품 picker UI
- `WO-O4O-KPA-TABLET-DISPLAY-CONTENT-SELECTION-V1` — 타블렛 진열 시 연결 콘텐츠 중 선택(기본 지정 없음)
- `WO-O4O-KPA-O4O-B2C-DESCRIPTION-COPY-TO-STORE-CONTENT-V1` — O4O B2C 상세설명 → 매장 콘텐츠 복사(가져오기=복사, master_id 활용)
- `WO-O4O-KPA-STORE-HANDLED-PRODUCTS-API-RESPONSE-DIET-V1` — 미사용 채널 상태 필드 정리

---

## 상태

- 구현/typecheck: **완료**
- API/browser smoke: **배포 후 수행 예정** (migration CI/CD 자동 실행 후)
