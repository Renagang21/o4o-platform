# IR-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-MODEL-V1

> 유형: 설계 조사 (read-only) / 상태: 설계 확정, 후속 WO 분리 대기
> 작성일: 2026-06-26 / 범위: KPA. 코드/DB 변경 없음
> 선행: DISPLAY-CONTENT-MODEL-V1, DISPLAY-POOL-SIMPLIFY-V1, TERM-CLARIFICATION-V1

---

## 0. 핵심 결론 (먼저)

- 제품↔콘텐츠 연결은 **별도 조인 테이블(후보 B)** 권장. 단, **기존 선례 `store_multilingual_product_content_groups` 의 `(targetKind, targetId)` 규약을 그대로 따른다**(targetKind: `listing` | `local`, targetId: listing.id | local.id).
- **O4O 기반 제품은 listing 기준으로 연결**(master 아님). 이유: ① handled-products·multilingual 선례가 모두 listing/local 단위 ② local 제품은 master가 없어 master 기준이면 매장 경영활용 제품을 못 담음 ③ "매장이 등록한 제품 단위"가 사용자 모델. **단 N:1 리스크(같은 master 다른 offer로 복수 listing)** 를 보완하기 위해 링크 row에 `master_id`(O4O 기반일 때 derive)를 **부가 컬럼**으로 함께 저장(미래 master 단위 공유/중복 인지용, V1 조회는 listing 기준).
- **제품 1:N 콘텐츠** 지원(조인 테이블이므로 자연 지원). 콘텐츠 1개가 여러 제품에 연결되는 N:N 도 구조상 가능하나 V1 UI는 콘텐츠 1개 → 제품 1개로 제한(테이블은 N:N 허용).
- **기본 상세설명서 미지정** 정책 부합 — `is_default`/`primary_*` 컬럼 두지 않음.
- 콘텐츠 생성/수정 API에 별도 link/unlink 보다 **콘텐츠 저장 시 productRef 동봉 + 링크 upsert** 권장(단순). 제품별 조회는 신규 GET.
- handled-products는 (동시 세션 다이어트로) 현재 채널/설명 상태 필드가 제거됨 → **"연결 콘텐츠 수"는 깨끗한 신규 필드**로 추가 가능.

---

## 1. 현재 콘텐츠/제품 데이터 구조

| 엔티티 | 핵심 | 제품 참조 |
|---|---|---|
| `kpa_store_contents` (KpaStoreContent) | id, source_type('direct' 등), organization_id, title, content_json, tags, **source_metadata(jsonb)**, workspace_status | **없음** |
| `organization_product_listings` | id, organization_id, **master_id(NOT NULL→product_masters)**, offer_id(nullable), price, is_active, status | master_id |
| `store_local_products` | id, organization_id, name, price_display, is_active | 없음(자체) |
| `shared_product_descriptions` | **master_id** 기준, content, source_type, status(canonical 등) | master_id |
| `store_multilingual_product_content_groups` | **targetKind('listing'\|'local'), targetId, contentKey**, UNIQUE(org,targetKind,targetId,contentKey) | **listing/local (선례!)** |
| `store_qr_codes` | library_item_id(FK 자산), landing_target_id(문자열 약참조) | 약참조 |

- 콘텐츠 생성/수정 API: `routes/o4o-store/controllers/store-content.controller.ts` — `POST /store-contents`(title/contentJson/tags), `PUT /store-contents/direct/:id`, `PUT /store-contents/:snapshotId`. 프론트 `StoreDirectContentPage.tsx` + `api/assetSnapshot.ts directContentApi`.
- `source_metadata` = Workspace A 수신 원천 메타(supplierName 등). 제품 링크 저장소로 쓰면 조회/집계 불가 → 부적합(후보 C 탈락 근거).

---

## 2. listing ↔ master 관계 (핵심 쟁점)

- `master_id` **NOT NULL**(migration `20260301100000`, ON DELETE RESTRICT).
- **N:1** — 같은 master를 한 매장이 **복수 listing** 가능. 부분 unique idx `idx_org_listing_unique_master ON (organization_id, service_key, master_id) WHERE offer_id IS NULL` (migration `20260920000000`) → master 기반(offer_id NULL)만 유일, **offer가 다르면 같은 master 중복 listing 허용**(다공급처).
- 의미: "상품(master)"은 1개여도 "매장 취급 listing"은 여러 개일 수 있음.

| 연결 기준 | 의미 | 장점 | 위험 |
|---|---|---|---|
| **listing_id** (권장) | 매장이 실제 취급 등록한 상품 단위 | handled-products·multilingual 선례 일치, local 포함 가능, 매장 맞춤 | 같은 master 복수 listing 시 콘텐츠 분산 / listing 비활성 시 orphan |
| master_id | O4O 공용 상품 단위 | 중복 제거, shared_product_descriptions와 동일 축 | local 제품 불가(master 없음), 매장 맞춤 불가, handled-products 단위와 불일치 |

→ **listing 기준 + master_id 부가 저장**으로 양쪽 장점 취함.

---

## 3. (14.1) 연결 모델 후보 비교표

| 후보 | 구조 | 장점 | 단점 | 권장 |
|---|---|---|---|---|
| A | kpa_store_contents에 product_source_type/id 직접 컬럼 | 단순, 제품별 조회 쉬움 | 콘텐츠 1개=제품 1개 고정, 확장 제약 | △ |
| **B** | 신규 조인 `kpa_store_content_product_links`(content_id, product_source_type, product_source_id, master_id?, link_type) | 제품 1:N(및 N:N), link_type 확장, 제품별 조회/집계 용이, multilingual 선례와 규약 일치 | 조인 테이블·조회 API 추가 | **권장** |
| C | source_metadata jsonb | DB 변경 최소 | 조회/집계/정합성 불가 | ✕ |

권장: **B**. 컬럼: `id, organization_id, content_id(→kpa_store_contents), product_source_type('listing'|'local'), product_source_id, master_id(nullable, listing일 때 derive), link_type('product_description' 기본), created_at`. UNIQUE(organization_id, content_id, product_source_type, product_source_id). org 필터 + FK(content_id) + product_source_id는 약참조(listing/local 혼합이라 단일 FK 불가, multilingual 선례와 동일).

---

## 4. (14.2) 제품 소스 연결 기준표

| 제품 구분 | sourceType | 연결 기준 ID | 부가 | 위험 |
|---|---|---|---|---|
| O4O 기반 제품 | `listing` | organization_product_listings.id | master_id 동봉 | 같은 master 복수 listing 분산 / listing 비활성 |
| 매장 경영활용 제품 | `local` | store_local_products.id | 없음 | local 비활성/삭제 |

- ID 체계: handled-products·multilingual과 동일한 `(sourceType, sourceId)`. master_id는 O4O 기반에서만 채움(미래 master 단위 공유·중복 인지용, V1 조회엔 미사용).

---

## 5. (14.3) 콘텐츠 생성/수정 흐름표

| 흐름 | 제품 선택 시점 | API | 장점 | 위험 |
|---|---|---|---|---|
| 자료함에서 콘텐츠 작성 | 작성 화면에서 제품 picker(선택, 없어도 됨) | POST /store-contents + productRef → 링크 upsert | 일반 콘텐츠도 동일 화면 | picker UX 추가 |
| **매장 취급제품 → 콘텐츠 만들기** (V1 권장) | 제품 행에서 진입, 제품 사전 선택 | 동일(productRef 프리필) | 직관적, 연결 누락 적음 | handled-products 액션 추가 |
| O4O B2C 설명서 복사 | 복사 시 자동 연결 | 복사 API(후속) → 콘텐츠 생성 + 링크 + metadata 출처 | 가져오기=복사 일치 | 후속 WO |

- 권장: **콘텐츠 저장 API가 productRef(optional)를 받아 링크 upsert**(별도 link/unlink API V1 불필요). 변경 지점: store-content.controller POST/PUT + directContentApi + (선택) 작성 화면 picker.

---

## 6. (14.4) 후속 타블렛 연결 대비표

| 항목 | 이번 CONTENT-LINK 필요 | TABLET-SELECTION 후속 필요 |
|---|---|---|
| 제품별 콘텐츠 목록 | GET /store/products/:sourceType/:sourceId/contents (또는 ?source=&id=) | 동일 API 재사용 |
| 진열 시 콘텐츠 선택 | (미구현) | store_tablet_displays에 content_id(nullable) 추가 |
| 기본 설명서 | 없음 | 없음(진열 시 선택) |
| store_tablet_displays 변경 | 없음 | content_id 컬럼 추가 |

→ CONTENT-LINK가 "제품별 콘텐츠 목록 조회"를 제공하면 TABLET-SELECTION은 그 목록에서 선택 + content_id 저장만 추가. 호환 ✅.

---

## 7. 삭제/비활성 처리 정책

- 콘텐츠 삭제(soft/hard) → 링크 row 함께 제거(FK content_id ON DELETE CASCADE) 또는 콘텐츠 비활성 시 링크 유지+조회 필터.
- 제품(listing/local) 비활성 → 링크 유지(약참조), 제품별 조회 시 비활성 제품 제외. handled-products는 active만 노출하므로 자연 필터.
- 제품 삭제: listing은 보통 비활성(soft), master는 RESTRICT. 링크는 약참조라 orphan 가능 → 조회 시 JOIN으로 존재 검증(orphan 무시). 정기 정리는 후속.

---

## 8. O4O B2C 상세설명서 복사와의 관계 (후속 호환)

```
O4O 기반 제품 → shared_product_descriptions(master_id, status='canonical') 보기
 → 매장 콘텐츠로 가져오기(복사) → kpa_store_contents 신규 복사본 생성
 → kpa_store_content_product_links(content_id, 'listing', listing_id, master_id) 링크 생성
 → source_metadata에 { copiedFrom: 'shared_product_description', sourceRefId, masterId } 보존
```
- 원본 shared_product_descriptions 불변. 가져오기=복사. 링크는 listing 기준(부가 master_id로 출처 일관). 본 모델과 호환 ✅(복사 구현은 별도 WO).

---

## 9. (15) 중점 질문 15개 답변

| # | 질문 | 답 |
|---|---|---|
| 1 | 직접 필드 vs 조인 | **조인 테이블(B)** |
| 2 | 콘텐츠 1개 다중 제품 가능성 | 테이블은 N:N 허용, V1 UI는 1제품 |
| 3 | source_type/id 체계 | `(listing\|local, listing.id\|local.id)` — handled-products/multilingual 동일 |
| 4 | O4O 기반 = listing vs master | **listing**(+master_id 부가 저장) |
| 5 | 매장 경영활용 = local 기준? | ✅ store_local_products.id |
| 6 | 연결 콘텐츠 수 효율 조회 | 조인 테이블 GROUP BY count → handled-products에 LEFT JOIN 집계 |
| 7 | 생성/수정 API에 연결 포함 | ✅ productRef optional 동봉 → 링크 upsert |
| 8 | 별도 link/unlink API 필요? | V1 불필요(저장 시 upsert). 다중 연결 확장 시 추가 |
| 9 | 콘텐츠 삭제 시 링크 | CASCADE 제거(또는 비활성 필터) |
| 10 | 제품 비활성/삭제 시 링크 | 약참조 유지 + 조회 시 존재 검증/active 필터 |
| 11 | B2C 복사본 metadata | { copiedFrom, sourceRefId(shared_product_description), masterId } |
| 12 | 작성 화면 제품 picker | 매장 취급제품 picker 재사용(선택적, 없어도 일반 콘텐츠) |
| 13 | handled-products '콘텐츠 만들기' 동선 | ✅ 제품 행 액션(제품 프리필) |
| 14 | 기본 미지정 충돌? | 없음 — is_default/primary 컬럼 두지 않음 |
| 15 | TABLET-SELECTION 호환? | ✅ 제품별 콘텐츠 목록 API 재사용 + content_id만 후속 |

---

## 10. 후속 WO 제안 (§18)

1. **`WO-...-CONTENT-LINK-V1`** — `kpa_store_content_product_links` 테이블(migration) + 콘텐츠 저장 API productRef + 제품별 콘텐츠 조회 API + handled-products 연결 콘텐츠 수 집계 컬럼.
2. **`WO-...-HANDLED-PRODUCTS-CONTENT-ACTIONS-V1`** — handled-products 제품 행 '콘텐츠 만들기'(제품 프리필) + '연결 콘텐츠 보기'.
3. **`WO-...-TABLET-DISPLAY-CONTENT-SELECTION-V1`** — store_tablet_displays content_id + 진열 시 콘텐츠 선택(제품별 목록 재사용, 기본 미지정).
4. **`WO-...-O4O-B2C-DESCRIPTION-COPY-TO-STORE-CONTENT-V1`** — shared_product_descriptions → kpa_store_contents 복사 + 링크 + 출처 metadata.

> 분리 권장 이유: 1번은 DB migration 포함(첫 스키마 변경) → 단독 안정화. 2~4는 1번 위에 UI/후속.

---

## 11. 이번 IR 비범위 / 완료 기준

- 비범위: DB/migration/API/UI/연결·복사·타블렛 구현 — read-only.
- 완료: 연결 모델 권장(B+multilingual 규약, §3) · listing 기준 확정(§2,§4) · 1:N(§0) · 기본 미지정 충돌 없음(§9-14) · API 영향(§5) · 제품별 조회/수 표시(§6,§9-6) · 삭제/비활성(§7) · B2C 복사 호환(§8) · 타블렛 후속 호환(§6) · 후속 WO(§10) ✅

---

## 12. 참고 파일

- 콘텐츠 API: `routes/o4o-store/controllers/store-content.controller.ts`, `routes/kpa/entities/kpa-store-content.entity.ts`, `services/web-kpa-society/src/pages/pharmacy/StoreDirectContentPage.tsx`, `src/api/assetSnapshot.ts`
- 제품/관계: `modules/store-core/entities/organization-product-listing.entity.ts`(master_id NOT NULL), migration `20260920000000-MakeOfferIdNullableAddMasterListing.ts`(부분 unique idx), `20260301100000`
- 연결 선례: `routes/platform/entities/store-multilingual-product-content-group.entity.ts`(targetKind/targetId), `multilingual-product-content.controller.ts`
- 설명서: `modules/neture/entities/SharedProductDescription.entity.ts`(master_id)
- 후속 대상: `routes/platform/entities/store-tablet-display.entity.ts`
