# IR-O4O-PRODUCT-CONTENT-TO-STORE-CONTENT-WORKFLOW-AUDIT-V1

> 상태: 조사 완료 (read-only) · 작성일 2026-07-09
> 성격: **조사·설계 기록(불변)**. 코드/DB/QR/배포 무변경. QR 생성 정책(slug/bulk/seed/publicKey)은 재논의하지 않음.
> 상위 SSOT: [O4O-3-ROLE-FLOW-BASELINE-V1](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) · [O4O-BUSINESS-PHILOSOPHY-V1](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) · [PLATFORM-CONTENT-POLICY-V1](../baseline/PLATFORM-CONTENT-POLICY-V1.md)(F4) · [CONTENT-STABLE-DECLARATION-V1](../baseline/CONTENT-STABLE-DECLARATION-V1.md)(F5) · [O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1](../baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md)(F12) · [IR-O4O-PRODUCT-CONTENT-RESOURCE-ARCHITECTURE-V1](../architecture/IR-O4O-PRODUCT-CONTENT-RESOURCE-ARCHITECTURE-V1.md)

---

## 1. 조사 목적

제품 콘텐츠가 어떤 경로로 만들어지고(표준/공급자/운영자/매장), 승인·큐레이션·복사·수정되어 매장 콘텐츠가 되며, 그 결과가 QR/POP/태블릿/상담으로 활용되는지 **현재 구조**를 정리한다. QR 자체는 활용 수단일 뿐이며, 중심은 **콘텐츠 업무동선**이다.

원칙: "무엇을 새로 만들지"보다 **"현재 무엇이 이미 있고, 어떤 업무동선이 끊겨 있는지"**를 우선 정리한다.

---

## 2. 핵심 결론 (Executive Summary)

1. **저장 계층은 대부분 존재하고, 매장 측 "가져오기=복사"·"복사본 독립 수정" 불변식은 견고하게 구현**되어 있다. 끊긴 곳은 대부분 **주체 간 인계(hand-off) 지점**과 **하나의 콘텐츠를 여러 사용처로 잇는 변환(OSMU)**이다.

2. **거버넌스 정합 주의 (중요)**: 3-ROLE-FLOW SSOT 상 **공급자는 원천 자료 제공만** 하고 O4O 내부 콘텐츠 직접 제작·HUB 게시는 **Drift(금지)**다. 따라서 WO가 가정한 "공급자 → 제품 콘텐츠 등록 요청 → 승인" 레그는 **"공급자 원천 자료 제출 → 운영자 등록/구성/게시"**로 재해석해야 한다(공급자 직접 콘텐츠 = legacy 예외, F4). 현재 코드의 `SupplierProductOffer` 설명 필드는 이 예외에 해당한다.

3. **가장 큰 단절 3곳**:
   - **(A) 승인 ↔ 콘텐츠 canonical 화의 단절** — offer 승인은 offer 상태만 바꾸고 `shared_product_descriptions`(SPD)를 건드리지 않는다. 공급자/운영자 콘텐츠가 canonical 제품 콘텐츠가 되려면 **admin이 수동으로 seed + canonical 승격**해야 한다.
   - **(B) `SUPPLIER_STORE` 생산 경로 부재** — descriptionType `SUPPLIER_STORE`는 매장 선택 UI에서 **소비**되지만, 이를 **쓰는 코드가 0건**(전부 `STORE`로만 적재).
   - **(C) OSMU 변환기 부재** — 하나의 제품/매장 콘텐츠를 QR·POP·태블릿·블로그로 잇는 통합 변환기는 없음(개념/PoC만). 각 사용처는 개별 엔드포인트로 따로 생산되고, `store_asset_derivations`는 **계보 추적**만 한다.

4. **콘텐츠 상태/출처/소유 모델은 테이블마다 파편화**되어 있다(SPD status, draft review_status, kpa_contents status, multilingual status). 통합 상태/소유 enum이 없어 "제품 콘텐츠 1건의 현재 상태·출처"를 한 축으로 답하기 어렵다.

5. **가장 먼저 연결 가능한 것**: offer 승인 → SPD seed 자동화(A), `SUPPLIER_STORE` 생산 경로(B), 운영자 콘텐츠의 매장 노출 단일 진입점 정리 — 모두 저장 계층이 이미 있어 migration 없이 착수 가능.

---

## 3. 현재 제품 콘텐츠 저장 구조 (product content = master/제품 기준)

| 저장소 | 테이블 | scope | 핵심 필드 | 성격 |
|---|---|---|---|---|
| SPD | `shared_product_descriptions` | master | content/summary, `source_type`(provenance), `description_type`(B2B/B2C/STORE/SUPPLIER_STORE, default STORE), `status`(candidate/canonical/hidden/needs_review/deprecated), `language`(default ko) | **제품 콘텐츠 공용 자산(설명서 전용)**. canonical unique (master, description_type). curated_by/at, soft delete |
| 후보 draft 풀 | `product_candidate_description_drafts` | candidate(master 이전) | `review_status`(draft/needs_review/approved/rejected/hidden/deprecated), language, draft_type, AI provenance | 검토용 draft |
| 공급자 offer 콘텐츠 | `supplier_product_offers` | supplier×master | consumer/business × short/detail description(Tiptap HTML) | **공급자 원천 콘텐츠 필드**(승격 전 원본) |

- `source_type`(provenance) ∈ `supplier / operator / ai / store_contribution / drug_extension / mfds_easy_drug / ... / manual`.
- **Resource Type축(POP/VIDEO/BLOG 등 일반 Resource 저장소)은 미구현** — SPD는 DESCRIPTION 전용(F12 설계상 목표, As-Is 없음).
- language 컬럼은 있으나 canonical unique가 language를 포함하지 않음 → **언어별 canonical 구분엔 부적합**(ko 중심). ko/zh 다국어는 매장 측 `store_multilingual_product_content_*`(§4)에서 취급.

## 4. 현재 매장 콘텐츠 저장 구조 (store content = organization 기준)

| 저장소 | 테이블 | 핵심 | 성격 |
|---|---|---|---|
| 매장 실행자산 | `store_execution_assets`(구 store_library_items) | `asset_type`(file/content/external-link), `usage_type`(pop/qr/signage/banner/notice), `source_type`(uploaded/generated), `html_content` | 매장 실행 콘텐츠(사본) |
| 매장 직접/스냅샷 콘텐츠 | `kpa_store_contents` | `source_type`(direct/snapshot_edit), content_json, translations | 매장 직접 작성 + 스냅샷 override(COALESCE) |
| 콘텐츠 스냅샷 | `o4o_asset_snapshots` | asset_type(cms/content), sourceAssetId(provenance) | 가져오기 사본(불변) |
| 매장 다국어 판매 콘텐츠 | `store_multilingual_product_content_groups/_pages` | `source_type`(store_created/operator_hub/supplier_offline_imported), locale별 page, public_key, target(local/listing) | **ko/zh 등 다국어 매장 콘텐츠** |
| 매장 작업본 | `kpa_working_contents` | copy-to-store 사본 | 독립 편집본 |

- **"store_library_contents" 라는 테이블명은 없음** → 위 조합. 통합 피드 = `GET /store-library/contents`(snapshots + direct + execution-assets UNION, `source_group` = operator/community/mine).

## 5. 표준 콘텐츠 흐름 (O4O canonical)

```text
ProductMaster → SPD 후보(candidate) → admin 검토 → canonical(STORE) → 매장 선택/가져오기 → 실행자산 → QR/POP/태블릿
```

- 현재: SPD 후보 적재/승격(`POST /by-master/:id`, `POST /by-master/:id/seed`, `PATCH /:id/canonical`) EXISTS. B2C 설명 매장 가져오기(`POST /store-contents/import-b2c-description` → kpa_store_contents 사본) EXISTS.
- 단절: **canonical 화가 전부 admin 수동**. 검토 큐(`/description-review-queue`)는 read-only(승인 액션 없음) — 승인은 `/admin/shared-product-descriptions`에서 별도 수동.

## 6. 공급자 콘텐츠 흐름 (거버넌스 재해석 필요)

```text
[As-Is 코드] 공급자 offer 설명 작성 → submit-approval(offer 상태만) → 운영자 offer 승인(SPD 무접촉) → [수동 seed] → SPD supplier candidate(STORE only) → [수동] canonical
[Canonical]  공급자 원천 자료 제출 → 운영자 등록/구성 → HUB 게시 (공급자 직접 콘텐츠 제작=Drift)
```

- EXISTS: offer의 consumer/business 설명 필드, submit-approval(`approval_status` PENDING/APPROVED/REJECTED), 운영자 offer 승인/반려(`/operator/products/*`), 공급자 계정 승인(NetureSupplier), admin seed(`seedFromSupplierOffers`, **consumer 필드만·`STORE`만**).
- **단절**:
  - offer 승인 ↔ SPD 적재 **자동 연결 없음**(승인해도 콘텐츠는 SPD로 안 감).
  - 콘텐츠 **제출 상태(draft/submitted/needs_revision/...) 없음** — 콘텐츠는 offer row에서 in-place 편집(스테이징/버전 없음).
  - **`SUPPLIER_STORE` 생산 경로 0건**(소비만 됨).
  - 콘텐츠 **반려/수정요청 공급자 회신·이력(history) 없음**.
  - 공급자 admin HTML 가져오기 = **이미지만**(상세 텍스트 스크래핑은 제거됨).

## 7. 운영자 콘텐츠 흐름

```text
운영자 → kpa_contents(문서 허브) / operator_multilingual_product_content(제품 다국어) 제작 → publish/ready → 매장 노출 → 매장 가져오기(사본)
```

- EXISTS: `kpa_contents` CRUD(`/api/v1/kpa/contents`, 기본 status=ready), operator 다국어 원본(`author_role='operator'`, publish→HUB `/multilingual-product-contents/hub`).
- **단절/한계**:
  - `kpa_contents`에 **producer/visibility/serviceScope/author_role 컬럼 없음** → HUB 3축(F4/F5)을 문서 허브에 적용 불가(코드 주석도 명시).
  - **운영자 콘텐츠 매장 노출 단일 진입점 없음(파편화)** — `store-hub.controller`는 KPI 집계 전용(운영자 콘텐츠 미노출), 문서 허브는 asset-copy(`reusable_policy != restricted` 게이트, status 게이트 미적용), 다국어는 자체 `/hub`.
  - 운영자 콘텐츠 vs O4O canonical 구분이 **테이블/source_type 구조로만**(공유 enum 없음, 피드의 `source_group`은 coarse).

## 8. 매장 콘텐츠 흐름 (가장 견고)

```text
매장 → 제품/콘텐츠 선택 → 가져오기(=사본) → 독립 수정 → QR/POP/태블릿/상담 활용
```

- EXISTS(견고): **copy-on-import 4레그** — 다국어 `/import`(source_type=operator_hub), QR page 사본 가드(`ensureStoreCopyForPageTarget`→store_execution_assets), asset-copy(`o4o_asset_snapshots`, 반복 복사 허용), `contents/:id/copy-to-store`(kpa_working_contents). **복사본 독립 수정** 전부 가능(COALESCE override 포함). Store→Community 공유는 제거됨(복사 전용 정책 확정).
- 단절: 제품 리스트 → 콘텐츠 활용 액션 진입은 **직전 WO(PRODUCT-LIST-DESCRIPTION-QR-ACTIONS-V1)에서 admin 설명 보기까지만** 연결(만들기/QR은 후속).

## 9. QR / POP / 태블릿 / 상담 활용 연결점

| 사용처 | 상태 | 연결 방식 |
|---|---|---|
| QR landing | EXISTS | `GET /qr/public/:slug`, landingType(product/promotion/page/link/video). **page 2단 우선순위**(kpa_store_contents direct > store_execution_assets html). 원본 직접 렌더 안 함(copy 보장). 제품당 대표 QR+언어탭은 별도 트랙(재논의 안 함) |
| POP | EXISTS | `POST /pharmacy/pop/generate`(입력 4종: library/direct/snapshot/supplier, 최대 8). save→실행자산(generated/pop)+derivation. **Product-AI POP은 별도 파이프라인**(product_ai_content) |
| 태블릿 | PARTIAL | `store_tablet_displays`가 **제품에 앵커**되고 `content_id`(→kpa_store_contents) 선택 attachment. 실행자산/POP→태블릿 경로 없음 |
| 상담 | PARTIAL | CTA 토글(QR page consultation_cta / 태블릿 show_consultation_button) + `tablet_interest_request` 요청 row + 라벨. **제품별 상담 보조 콘텐츠 개념 없음** |
| OSMU 변환 | NOT-EXISTS | 개념/PoC만. `store_asset_derivations`=계보 추적(source/derived kinds). 다국어 group=1콘텐츠→landing+QR(최근접) |

## 10. 현재 가능한 것 (요약)

- 제품 콘텐츠 후보 적재·canonical 승격(수동), B2C 매장 가져오기, ko/zh 다국어 매장 콘텐츠 작성·공개.
- 공급자 offer 설명 작성/제출, 운영자 offer 승인, 운영자 문서/다국어 콘텐츠 제작·게시.
- 매장 가져오기=사본, 복사본 독립 수정, QR page 콘텐츠 연결, POP 생성, 태블릿 콘텐츠 attachment, 상담 CTA.

## 11. 단절 지점 (Gap)

| # | 단절 | 영향 |
|---|---|---|
| G1 | offer 승인 ↔ SPD 적재/canonical 자동 연결 없음 | 승인해도 제품 콘텐츠가 안 생김(전부 수동) |
| G2 | `SUPPLIER_STORE` 생산 경로 0건 | 매장이 고를 "공급자 제공 매장 설명서"가 실제로 안 만들어짐 |
| G3 | 콘텐츠 제출/반려/수정요청 상태·이력 없음 | 공급자↔운영자↔admin 인계·감사 불가 |
| G4 | 운영자 콘텐츠 매장 노출 단일 진입점 없음(파편화), kpa_contents에 3축 컬럼 없음 | 매장이 "무엇을 가져올 수 있는지" 한 곳에서 못 봄 |
| G5 | OSMU 통합 변환기 없음 | 1콘텐츠→QR/POP/태블릿을 각각 수동 생산 |
| G6 | 통합 상태/출처/소유 모델 없음(테이블별 파편) | 제품 콘텐츠 1건의 상태·출처를 한 축으로 못 답함 |
| G7 | 태블릿=제품 attachment만·상담=CTA만 | 콘텐츠→태블릿/상담 활용이 얕음 |

## 12. 재사용 가능한 테이블/API/UI

- 저장: SPD, product_candidate_description_drafts, store_multilingual_product_content_*, store_execution_assets, o4o_asset_snapshots, kpa_store_contents, store_asset_derivations(계보), media_assets.
- 승인/큐레이션: `/admin/shared-product-descriptions`(canonical), `/operator/products`(offer 승인), `seedFromSupplierOffers`, `/description-review-queue`(read-only).
- 복사: `qr-content-hub-copy.service`, `AssetCopyService.copyResolved`, 다국어 `/import`, `copy-to-store`.
- 활용: `/pharmacy/pop/generate`, `/qr/public/:slug`, store_tablet_displays, 다국어 group public_key+QR.
- UI: OperatorContentHubPage, OperatorMultilingualContentListPage, StoreHandledProductsPage(+DescriptionSelectionModal), HubMultilingual/ContentLibraryPage, StorePopPage, admin o4o-product-db(직전 WO badge/action).

## 13. 신규 개발이 필요한 것

- offer 승인 시 SPD seed(supplier candidate) 자동 트리거 or 원클릭(G1).
- `SUPPLIER_STORE` 생산 경로(seed/create에 descriptionType 파라미터 + origin) (G2).
- 콘텐츠 제출/검토/반려 상태머신 + 이력(G3).
- 운영자 콘텐츠 매장 노출 단일 HUB browse 엔드포인트 + (선택) kpa_contents 3축 정합(G4).
- OSMU 변환 계층(1 source → QR/POP/태블릿) — 큰 과제, 후반(G5).
- 통합 콘텐츠 상태/출처/소유 모델(뷰 or 정규화) (G6).

## 14. 콘텐츠 우선순위 제안 (매장 활용·QR landing 시)

원칙: **매장 자율 > 큐레이션 > 승인된 공급 > 표준 > 원천**. "가져오기=복사·복사본 독립" 불변식 유지(원본과 분리).

```text
1. 매장 직접 수정 콘텐츠 (kpa_store_contents direct / store_execution_assets / 다국어 store copy)
2. 운영자 큐레이션 콘텐츠 (operator 다국어 / kpa_contents ready)
3. 승인된 공급자 콘텐츠 (SPD source_type=supplier, canonical)
4. O4O 표준 콘텐츠 (SPD canonical STORE)
5. 원천 설명서/draft (candidate/draft) — 표시 최후순위
```

- 현재 QR page landing의 2단 우선순위(direct > execution-asset)와 방향 일치. 언어(ko/zh)는 우선순위와 **직교**(대표 QR+언어탭에서 언어 선택).

## 15. 상태 모델 제안

현재 파편(SPD status / draft review_status / kpa_contents status / multilingual status). **콘텐츠 자산 공통 라이프사이클** 후보(신규 강제 아님, 매핑 뷰 우선 검토):

```text
draft → submitted → under_review → (needs_revision ↺) → approved → canonical
                                                        → rejected
                                          archived (은퇴) / hidden
store_copy (매장 사본, 독립 라이프사이클)
```

- 공급자 제출용 서브상태: `draft / submitted / under_review / needs_revision / approved / rejected / withdrawn` (G3).
- 우선 접근: 신규 컬럼 강제보다 **기존 status 매핑 + 부족분(제출/반려/이력)만 추가**.

## 16. source / owner 모델 제안

F4 HUB 3축(Producer/Visibility/ServiceScope) + F12 provenance를 정합. 두 축은 **직교**:

```text
origin(provenance): standard | supplier | operator | store | ai_generated | imported | manual   (이미 SPD source_type에 존재)
producer(3-role): operator | store | community  (+ supplier=legacy 예외, F4)
```

- owner 식별자(대부분 이미 존재): `product_master_id`, `supplier_id`, `organization_id`, `created_by/operator_user_id`, `source_ref_id`, `copied_from_content_id`(사본 계보; store_asset_derivations에 상응).
- **판단 필요(F12에 위임)**: `SUPPLIER_STORE`를 (a) 독립 descriptionType으로 둘지 (b) `STORE` + `origin=supplier`로 표현할지 — G2 구현 WO에서 결정.

## 17. 권한 모델 제안 (3-ROLE-FLOW 정합)

```text
admin    : SPD canonical 승격, 콘텐츠 검토/승인/반려, 정책
supplier : 원천 자료·offer 설명 제출·수정·재제출 (직접 HUB 게시 ❌, canonical 승격 ❌)
operator : 원천 수신·등록·구성, 콘텐츠 큐레이션, HUB 게시, 서비스별 배포
store    : HUB 자료 보기·가져오기(=복사)·복사본 수정·QR/POP/태블릿/상담 활용 (내 매장 한정)
```

- 현재 코드 권한(requireNetureScope/requireStoreOwner/ADMIN_ROLES)과 정합. 공급자 "승인 후 원본 수정" 정책은 G3 상태머신에서 확정 필요.

## 18. 후속 WO 우선순위

기준: ①현재 구조에서 가장 빨리 연결 ②사용자 체감 ③migration 없이 가능 ④역할 명확화 ⑤QR/POP/태블릿 자연 연결.

| 순위 | WO 후보 | 근거 |
|---|---|---|
| 1 | `WO-O4O-SUPPLIER-OFFER-TO-SPD-SEED-ON-APPROVAL-V1` (G1) | 저장 계층 완비, offer 승인 훅만 추가. 체감 큼 |
| 2 | `WO-O4O-PRODUCT-CONTENT-SUPPLIER-STORE-PRODUCER-V1` (G2) | seed/create에 descriptionType 파라미터. 소비처 이미 존재 |
| 3 | `WO-O4O-OPERATOR-PRODUCT-CONTENT-HUB-BROWSE-UNIFY-V1` (G4) | 운영자 콘텐츠 매장 노출 단일 진입점 |
| 4 | `WO-O4O-PRODUCT-CONTENT-STATUS-AND-HISTORY-MODEL-V1` (G3/G6) | 제출/반려/이력 상태머신 |
| 5 | `WO-O4O-STORE-PRODUCT-CONTENT-TO-QR-POP-TABLET-ACTIONS-V1` (G7) | 매장 콘텐츠→활용 액션(직전 WO 연장) |
| 6 | `WO-O4O-OSMU-CONTENT-CONVERSION-LAYER-V1` (G5) | 큰 과제, 후반 |

---

## 부록 A. 테이블별 매트릭스 (스펙 §8)

범례: 제품=제품 콘텐츠 / 매장=매장 콘텐츠 / 실행=실행 자산 / — 해당없음

| 테이블·엔티티 | 역할 | 제품 | 매장 | 실행 | owner/scope | master 연결 | store/org 연결 | lang | status | source/copy | 한계 |
|---|---|:-:|:-:|:-:|---|:-:|:-:|:-:|:-:|---|---|
| ProductMaster (`product_masters`) | 기준 데이터 | — | — | — | platform | 자신 | — | — | productDataStatus | — | 콘텐츠 아님(콘텐츠 앵커) |
| `product_identifiers` | 식별자 | — | — | — | platform | ✔ | — | — | verificationStatus | — | — |
| `supplier_product_offers` | 공급자 원천 콘텐츠 | ✔(원천) | — | — | supplier×master | master_id | — | — | approval_status(PENDING/APPROVED/REJECTED) | offer→SPD seed(수동) | 콘텐츠 승인상태 없음(offer 상태만), in-place 편집 |
| `organization_product_listings` | 매장 취급(O4O채택) | — | — | — | org | master_id | ✔ | — | status/is_active | — | 콘텐츠 아님 |
| `store_local_products` | 매장 자체제품 | — | — | — | org | barcode loose | ✔ | — | is_active | — | 콘텐츠 아님 |
| **SPD** `shared_product_descriptions` | **제품 콘텐츠 공용자산(설명서)** | ✔(원본) | — | — | master(공용) | master_id | — | ✔(default ko) | candidate/canonical/hidden/needs_review/deprecated | source_type=provenance | DESCRIPTION 전용, canonical unique (master,description_type)—lang 미포함 |
| `product_candidate_description_drafts` | 검토용 draft | ✔(draft) | — | — | candidate | 간접 | — | ✔ | review_status(draft/needs_review/approved/rejected/...) | draft_type, AI provenance | master 이전 버퍼 |
| `operator_multilingual_product_content_*` | 운영자 다국어 원본 | ✔(운영자) | — | — | service | target | — | ✔(locale) | draft/published/archived | author_role=operator | 제품 anchor는 target(local/listing) |
| **`store_multilingual_product_content_*`** | **매장 다국어 콘텐츠(사본)** | — | ✔ | — | org | target(local/listing) | ✔ | ✔(ko/zh/…) | draft/published/archived | **source_type=store_created/operator_hub/supplier_offline_imported** | ko/zh 매장 사본의 핵심 |
| `store_execution_assets` | **매장 실행자산** | — | ✔(본문) | ✔ | org | 간접 | ✔ | — | is_active | source_type=uploaded/generated | usage_type(pop/qr/signage/banner/notice), asset_type(file/content/external-link) |
| `kpa_store_contents` | 매장 직접/스냅샷 | — | ✔ | — | org | 간접(links) | ✔ | translations | source_type=direct/snapshot_edit | snapshot override(COALESCE) | — |
| `o4o_asset_snapshots` | 가져오기 사본 | — | ✔(사본) | — | org | — | ✔ | — | — | sourceAssetId(provenance), 반복복사 허용 | 불변 스냅샷 |
| `store_asset_derivations` | 계보 추적 | — | — | — | org | — | ✔ | — | — | source/derived kinds | 변환기 아님(추적만) |
| `media_assets` | 미디어 | — | 공용 | 공용 | service/org | — | — | ✔(tag) | status | source/usage_type | 단일 lang 태그 |
| `store_qr_codes` | 매장 QR(계층2) | — | — | ✔ | org | 직접매핑 없음 | ✔ | 없음 | is_active | library_item_id/landing_target_id | master↔QR 직접매핑 부재 |
| `store_tablet_displays` | 태블릿 편성 | — | — | ✔ | org | 제품 anchor | ✔ | — | — | content_id→kpa_store_contents(attach) | 콘텐츠는 attachment |
| `tablet_interest_request` | 상담 요청 | — | — | — | org | master nullable | ✔ | — | 요청상태 | source(qr/tablet) | 상담=요청 row(콘텐츠 아님) |
| `store_videos` | 매장 영상 | — | ✔ | ✔ | org | — | ✔ | — | — | 사본 | — |
| `kpa_contents` | 운영자 문서허브 | ✔(운영자) | — | — | (서비스) | — | — | — | draft/ready/published/private | source_type, reusable_policy | **producer/visibility/serviceScope 컬럼 없음** |

> 참고: `store_library_contents`, `store_pops` 라는 이름의 단일 테이블은 없음 → 각각 `store_execution_assets`(+snapshots+kpa_store_contents), POP는 `/pharmacy/pop/generate` 산출물(store_execution_assets usage_type=pop).

## 부록 B. 화면별 매트릭스 (스펙 §9)

| 화면·경로 | 주체 | 제품콘텐츠 조회 | 매장콘텐츠 생성 | 가져오기=복사 | 수정 | QR/POP/태블릿 연결 | 단절 |
|---|---|:-:|:-:|:-:|:-:|:-:|---|
| admin `/admin/o4o-product-db/masters`(+/:id) | admin | ✔(설명상태 KO/ZH badge, 직전 WO) | — | — | — | 설명보기 deep-link만 | QR/만들기 destination 없음 |
| `/admin/o4o-product-db/description-review-queue` | admin | ✔ | — | — | ✗(read-only) | — | 승인 액션 없음(별도 surface) |
| `/admin/shared-product-descriptions`(API) | admin | ✔ | — | — | ✔(canonical/status) | — | 수동 승격 |
| 공급자 상품 등록/수정 (web-neture supplier) | supplier | ✔(offer 설명 작성) | — | — | ✔(offer in-place) | — | **콘텐츠 제출상태·SUPPLIER_STORE 산출 없음** |
| 공급자/운영자 승인 (`/operator/products`) | operator | offer | — | — | 승인/반려 | — | 승인이 SPD 미접촉 |
| OperatorContentHubPage (`/kpa/contents`) | operator | ✔(문서) | — | — | ✔ | — | 3축 컬럼 없음 |
| OperatorMultilingualContentListPage | operator | ✔(다국어 원본) | — | — | ✔ | publish→HUB | — |
| Hub 라이브러리 (HubMultilingual/ContentLibraryPage) | store | 운영자/공용 | — | ✔(가져오기) | — | — | 진입점 파편화 |
| StoreHandledProductsPage (`/store/handled-products`) | store | 설명 선택 | — | (선택) | — | 행 "다국어QR" CTA(동시 트랙) | 상태 badge 금지(SIMPLIFY) |
| StoreLibraryContentsPage (`/store-library/contents`) | store | — | ✔(내 자료함) | ✔(사본 UNION) | ✔ | — | — |
| 다국어 콘텐츠 저작 (StoreProductMultilingualContentPage) | store | — | ✔(ko/zh 사본) | ✔(operator_hub import) | ✔ | publicKey landing+QR | — |
| StorePopPage (`/store/marketing`) | store | — | — | — | — | ✔ POP 생성(4소스) | Product-AI POP 별도 |
| StoreTabletDisplaysPage | store | — | — | — | attach | ✔ 태블릿(content_id) | 실행자산/POP→태블릿 없음 |
| QR 생성 (StoreQrCreateModal / QR pages) | store | — | — | (page 사본 가드) | — | ✔ /qr/:slug | 콘텐츠 리스트엔 있음, 제품 리스트엔 없음 |

## 부록 C. 현재 ↔ 목표 비교 (스펙 §17)

| # | 업무 | 현재 가능 | 단절 | 재사용 | 필요 개발 | 우선순위 |
|---|---|:-:|---|---|---|:-:|
| 1 | 표준 콘텐츠 매장 가져오기 | ✔ | canonical 승격 수동 | import-b2c-description, SPD | 승격 자동화(보조) | 중 |
| 2 | 공급자 콘텐츠 제출 | △ | offer in-place, 콘텐츠 제출상태 없음 | offer 설명 필드 | 제출 상태머신 | 중(G3) |
| 3 | 공급자 콘텐츠 admin 승인 | △ | offer 승인이 SPD 미접촉 | offer 승인, seedFromSupplierOffers | 승인→SPD seed 훅 | **1위(G1)** |
| 4 | 운영자 큐레이션 | ✔ | 매장 노출 진입점 파편 | kpa_contents, operator 다국어 | HUB browse 통일 | 3위(G4) |
| 5 | 매장 콘텐츠 사본 생성 | ✔(견고) | — | copy-on-import 4레그 | — | — |
| 6 | 매장 사본 수정 | ✔(견고) | — | COALESCE override 등 | — | — |
| 7 | 매장 콘텐츠 → QR | ✔ | 제품 리스트 행 QR 없음(admin) | /qr/:slug, page 사본가드 | 행 액션(G7) | 5위 |
| 8 | 매장 콘텐츠 → POP | ✔ | Product-AI POP 별도 | /pharmacy/pop/generate | (통합 선택) | 중 |
| 9 | 매장 콘텐츠 → 태블릿 | △ | content=attach만 | store_tablet_displays | 실행자산→태블릿 | 하 |
| 10 | 매장 콘텐츠 → 상담 | △ | CTA만·콘텐츠 없음 | consultation CTA, interest_request | 제품별 상담콘텐츠 | 하 |
| — | SUPPLIER_STORE 생산 | ✗ | 생산경로 0건(소비만) | 소비 UI 존재 | descriptionType 산출 | 2위(G2) |
| — | OSMU 1→다 변환 | ✗ | 변환기 없음 | store_asset_derivations(추적) | 변환 계층 | 6위(G5) |

---

> 본 IR은 조사·설계 기록(불변)이다. QR 생성 정책은 재논의하지 않았고, 코드/DB/QR/배포 무변경. 구현은 §18 후속 WO에서 수행한다. (부록 A/B/C는 스펙 §8/§9/§17 형식 보강, 2026-07-09.)
