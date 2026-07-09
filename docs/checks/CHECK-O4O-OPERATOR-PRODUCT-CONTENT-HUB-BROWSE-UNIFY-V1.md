# CHECK-O4O-OPERATOR-PRODUCT-CONTENT-HUB-BROWSE-UNIFY-V1

> 대응 WO: `WO-O4O-OPERATOR-PRODUCT-CONTENT-HUB-BROWSE-UNIFY-V1` (A안: read-only 통합 browse API)
> 실행일: 2026-07-09 · **DB write 0 / 콘텐츠 생성 0 / 콘텐츠 복사 0 / QR·POP·태블릿 생성 0 / migration 0 / 프론트 변경 0.**

## 1. 작업 목적

제품 콘텐츠 원본(표준/공급자/운영자/매장 사본)이 흩어져 있어(G4), 이를 **하나의 read-only API로 통합 조회**한다. 프론트 화면은 이번 범위 밖(동시 세션 충돌 회피 → 후속 WO).

## 2. 선택한 최소 구현 범위

- **read-only 통합 browse API만** 구현. 프론트/Store Hub UI/ProductMaster detail UI/매장 자료함 UI 무변경.
- 라우트: **`GET /api/v1/admin/o4o-product-db/product-contents`** (+ `/facets`).
  - 결정 근거: 기존 operator API prefix와 충돌 회피 + 동일 read-only 콘솔 패턴(description-status/review-queue) 재사용. ADMIN_ROLES에 `*:operator` 포함되어 operator도 사용 가능. 유사 통합 API는 부재(신규).

## 3. 조사한 화면/API/테이블

- 재사용 판단: 기존 `description-status`(drug-OTC 튜닝·language 분해 없음), `description-review-queue`(needs_review 한정), `store-hub`(KPI 전용), `usage-links`(master 활용)로는 4-source 통합 browse를 못 함 → 신규 최소 API 필요.
- 테이블: shared_product_descriptions, supplier_product_offers, store_multilingual_product_content_groups, operator_multilingual_product_content_groups, organization_product_listings, product_masters.

## 4. 통합한 source 목록 / 각 source별 조회 테이블

| contentKind | 테이블 | master 연결 | source 파생 |
|---|---|---|---|
| `spd` | shared_product_descriptions | master_id 직접 | source_type→standard/supplier/operator/ai_generated/store/manual/imported/public_source/**unknown** |
| `supplier_offer` | supplier_product_offers | master_id 직접 | supplier (원 offer, seed 이전) |
| `store_multilingual` | store_multilingual_product_content_groups | target_kind='listing'→organization_product_listings.master_id (local=미연결) | source_type→store/operator/supplier |
| `operator_multilingual` | operator_multilingual_product_content_groups | **없음**(target/master 미연결) | operator |

## 5. source / status / language 파생 기준

- **source**: SPD는 `source_type` CASE 매핑, offer=supplier, 다국어 그룹은 source_type/author_role. **임의 확정 금지 — 미매핑 source_type은 `unknown`.**
- **status**: source-native 원본값 그대로(정규화 안 함). SPD=status(lowercase), offer=approval_status(UPPERCASE), 그룹=status(draft/published/archived).
- **language**: SPD=language(default ko), offer='ko'(설명 언어 필드 없음), 그룹=default_locale. locale 표준화(zh/zh-CN)는 후속 WO.

## 6. 표준/공급자/운영자/매장 사본 구분 방식

- 4개 `contentKind` + `source` 조합으로 구분. `hasProductMaster`(master 연결 여부), `hasStoreCopy`(페이지 master 기준 후처리 best-effort), `extra`(jsonb: descriptionType/sourceType/hasConsumer/hasBusiness/targetKind/hasPublicKey/authorRole)로 세부 표시.
- 필터: q · productMasterId · source · status · language · serviceKey · hasProductMaster · page/limit. (**hasStoreCopy는 출력 필드로만 제공, 입력 필터는 후속** — CTE 편입 시 비용/복잡도.)

## 7. 가져오기=복사 / QR·POP·태블릿 연결 가능성

- 이번 API는 **조회만**. `hasStoreCopy`로 매장 사본 존재 여부를 표시해 후속 "가져오기=복사"의 판단 근거 제공.
- 활용(QR/POP/태블릿) 액션은 미포함 → 후속 WO.

## 8. 구현하지 않은 것

```text
프론트 화면/진입점(Store Hub·ProductMaster detail·매장 자료함) — 동시 세션 충돌 회피, 후속 WO
콘텐츠 생성/복사/승인/canonical 변경, store copy 생성, QR/POP/태블릿 생성
hasStoreCopy 입력 필터, product_candidate_description_drafts source(초안) 편입
locale 표준화, kpa_contents(문서 허브, master 미연결) 편입
supplier seed apply(G1, 별도 보류 WO)
```

## 9. 검증 결과

- **api-server typecheck** (`tsc -p tsconfig.build.json --noEmit`): exit 0, error 0.
- **api-server build** (`tsup`): exit 0 (Build success).
- **런타임 read-only smoke**: **미실행** — 프로덕션 DB 접속(cloud-sql-proxy)이 현재 불가(직전 supplier-seed dry-run과 동일 블로커), 인증 API curl은 auto-mode 분류기 차단, 브라우저는 동시 세션 프로필 락.
  - 대응: **UNION SQL의 모든 컬럼을 엔티티 정의에서 검증**(supplier offer/SPD/store·operator 다국어 그룹/organization_product_listings). 특히 store/operator 다국어 그룹은 `deleted_at` 컬럼 부재를 확인하고 참조하지 않음. read-only·additive·ADMIN 게이트이므로 배포 후 smoke에서 안전하게 확인 가능.

## 10. 데이터 안전

```text
DB write 0 / 콘텐츠 생성 0 / 콘텐츠 복사 0 / QR·POP·태블릿 생성 0 / migration 0 / 프론트 변경 0
```

## 11. 후속 WO 제안

```text
1. WO-O4O-STORE-PRODUCT-CONTENT-IMPORT-COPY-V1 (매장 가져오기=복사)
2. WO-O4O-STORE-PRODUCT-CONTENT-TO-EXECUTION-ACTIONS-V1 (QR/POP/태블릿 활용 액션)
3. WO-O4O-OPERATOR-PRODUCT-CONTENT-HUB-BROWSE-FRONTEND-V1 (본 API 기반 화면 진입점 — 동시 세션 정리 후)
4. WO-O4O-SUPPLIER-OFFER-TO-SPD-SEED-ON-APPROVAL-V1-RESUME (G1 dry-run/apply, DB 접속 후)
5. WO-O4O-PRODUCT-CONTENT-STATUS-AND-HISTORY-MODEL-V1
```

## 변경 파일

```
apps/api-server/src/modules/neture/services/product-content-browse.service.ts   (신규)
apps/api-server/src/modules/neture/controllers/product-content-browse.controller.ts (신규)
apps/api-server/src/bootstrap/register-routes.ts                                 (route 등록)
docs/checks/CHECK-O4O-OPERATOR-PRODUCT-CONTENT-HUB-BROWSE-UNIFY-V1.md            (신규)
```
