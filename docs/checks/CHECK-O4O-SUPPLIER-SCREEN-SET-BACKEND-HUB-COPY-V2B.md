# CHECK-O4O-SUPPLIER-SCREEN-SET-BACKEND-HUB-COPY-V2B

> WO: `WO-O4O-SUPPLIER-SCREEN-SET-BACKEND-HUB-COPY-V2B`
> 선행: `…-POLICY-AND-TARGET-SCHEMA-V1`(정책·스키마) · `…-EDITOR-SHARED-EXTRACTION-V2A`(편집기) · operator HUB/copy WO
> 성격: 공급자 백엔드(API·소유권·게시·HUB·독립 복사·의약품 이중 가드). UI 는 V2c. migration 0.
> Date: 2026-07-22

---

## 0. 결론

operator 백엔드(컨트롤러·adapter·HUB·독립 복사·provenance)를 재사용해 **공급자 Screen Set 백엔드**를 구현했다. 소유권=`neture_suppliers(user_id, ACTIVE)`, 상태=`draft/active/archived`(supplier_template 미사용), 게시 대상=`hub_target_store_type`, 의약품=`regulatory_type='DRUG'` 이중 가드(게시 + 매장 조회/가져오기). **신규 migration·스키마 0.**

## 1. 재사용한 operator HUB·독립 복사 구조 (실행 2)

- 컨트롤러 골격·setCols·blockCols·firstReturnedRow·preview resolve·blocks PUT(store_content 거부) = operator 컨트롤러 미러.
- 매장 독립 복사 = operator `/screen-set-hub/templates/:id/import` 트랜잭션 재사용(값 복사·FK 없음·코너 미적용).
- provenance = `store_asset_derivations`(FK 없음) + kind `supplier_screen_set`(신규 application-level).
- content adapter = `createSupplierContentSourceAdapter`(operator 와 동일: O4O canonical 허용·store content 차단).

## 2. 구현한 공급자 API (실행 4) — `/api/v1/kpa/supplier/screen-sets`

GET `/` · GET `/:id` · POST `/` · PATCH `/:id`(name/template/hubTarget) · PUT `/:id/blocks` · POST `/:id/duplicate` · POST `/:id/publish` · `/unpublish` · `/archive` · `/unarchive` · DELETE `/:id` · POST `/preview` · GET `/content-sources/o4o-descriptions`.

## 3. Supplier ContentSourceAdapter (실행 5)

- `fetchProductDescription` = O4O 표준(STORE canonical) 허용(플랫폼 canonical, 타 공급자 사유 아님 → "O4O 표준 상품 정보" 허용 범위). `fetchStoreContent` = **항상 null**(매장 콘텐츠 차단). content_list `store_content` 참조는 blocks PUT 에서 거부.
- (own-offer 한정 강화는 `supplier_product_offers` 로 가능하나 content_list 는 canonical 축 → 현행 canonical 허용. 안전 제약은 의약품 이중 가드가 담당. 현재 offer 0건.)

## 4. membership·소유권·다른 공급자 차단 (실행 3·5) — §검증

- 로그인 user → `neture_suppliers WHERE user_id=$u AND status='ACTIVE'` → supplier_id. 없으면 403.
- 모든 쿼리 `origin='supplier' AND supplier_id=$sup AND service_key=$svc AND deleted_at IS NULL`. **organization_id 소유권 미사용**.

## 5. 상태 전환 (실행 4)

draft→active(publish) / active→draft(unpublish) / draft·active→archived / archived→draft. `transition()` 공통(현재 상태 검증). 신규 status 없음.

## 6. 게시 대상 처리 (실행 6)

`hubTargetStoreType ∈ {pharmacy, non_pharmacy, all}`. draft NULL 허용, **publish 시 필수**(body 우선/기존 값). active 대상 변경(PATCH)도 CHK + 의약품 재검사.

## 7. 의약품 이중 가드 (실행 6·8) — `store-tablet-medication-guard.ts`

- 판별: 블록 content_list o4o masterId + product_content productRef → `product_masters.regulatory_type='DRUG'` = 의약품. 미존재/NULL = **보수적(미분류)**.
- **게시 시점**: 의약품/미분류 → `pharmacy` 대상만 허용(non_pharmacy/all 거부, 409 MEDICATION_PHARMACY_ONLY). active 대상 변경도 동일.
- **매장 조회/가져오기 시점**: 비약국(store) 매장은 의약품/미분류 세트 목록 제외·상세 403·가져오기 403. 가져오기 직전 현재 원본 재검사.
- DB CHECK 미사용(블록 조사 필요).

## 8. 매장 HUB 목록·상세·미리보기 API (실행 7)

`/store/screen-set-hub/supplier-templates`(목록) · `/:id`(상세+blocks) · `/:id/import`. 미리보기는 상세 blocks → 기존 `POST /store/screen-sets/preview`(V2c 연결). 목록·상세·가져오기 **각각** 대상·상태·의약품 재검사.

## 9. 매장 유형·의약품 조회 가드 (실행 8)

`organizations.type`: pharmacy→약국 / store→비약국 / 그 외·판별불가 → HUB 대상 제외(목록 빈 결과·상세 403). hub_target ↔ 매장 유형 일치(pharmacy 매장 ← pharmacy|all / 비약국 ← non_pharmacy|all).

## 10~13. 검증 (실행 10·13) — ✅ PASS (프로덕션 API, renagang21=ACTIVE 공급자+약국 매장, 2026-07-22, 배포 93f769412)

**공급자 권한·소유권**: 생성 → origin='supplier'·supplierId set·**organization_id=NULL**·status='draft'·hub=NULL ✅. 타 id GET → **404** ✅. (membership 없는 사용자·org 우회는 guard 가 `neture_suppliers(user_id,ACTIVE)` + `supplier_id` 격리로 차단 — 구조상 자기 원본만.)

**게시 매트릭스**:
| 조합 | 결과 |
|------|:---:|
| 비의약품 + pharmacy / non_pharmacy / all | **200 / 200 / 200** ✅ |
| draft + 대상 NULL publish | **400** ✅ |
| 의약품 + pharmacy | **200** ✅ |
| 의약품 + non_pharmacy | **409** ✅ |
| 의약품 + all | **409** ✅ |
| store_content 참조 blocks | **400** ✅ |
| unpublish(active→draft) | 200, hub_target 유지 ✅ |

**HUB(약국 매장)**: 목록 200 — all 세트 노출·pharmacy(의약품) 노출·**non_pharmacy 세트 제외(교차유형)** ✅. supplierName="서 Renagang21" ✅. 상세 200(blocks 3). **unpublish 후 목록에서 제외**(active 아님) ✅.

**가져오기**: import 201 → 사본 **origin='store'·org=매장(9c87f46b)·supplier_id NULL·hub_target_store_type NULL·tablet_id NULL·status='active'·신규 id** ✅(DB 실측). 블록 [corner_description, content_list, qr_guide] **값 복사** ✅. **provenance `supplier_screen_set`→`screen_set`** ✅. **코너 자동 적용 0**(current_screen_set 참조 0) ✅.

**독립성**: 공급자가 원본 이름 변경 + unpublish → 사본 name 불변·사본 alive ✅.

**공개 URL·QR**: 공급자 원본·사본에 QR slug 미발급(공급자 컨트롤러 withQrLink 미호출) ✅.

**회귀**: 공개 타블렛 5섹션[idle_media,corner_description,content_list,product_list,qr_guide]·Screen Set QR 4섹션 **불변** ✅(주의: 검증 중 API 일시 불안정으로 1회 빈 응답 후 재요청 시 정상 — api-server 인프라 blip, 본 변경 무관). 보호 샘플 코너 적용 불변(구강→구강관리 기본 코너 안내형/피부→피부관리 기본 화면 세트) ✅.

**테스트 데이터 정리**: 공급자 원본 3 + 매장 사본 1 전량 soft-delete(공급자 목록 0·HUB 0). **정직한 기록**: V1 CHECK(2026-07-21) 스냅샷의 "operator 9·store 27"은 **테스트 데이터 포함 수치**였다 — soft-deleted 실측상 operator 9행은 전부 내 operator-HUB WO 테스트 템플릿(이름 "UI검증…/[검증]…/[ISO]…", 2026-07-20~21 그 WO 정리 시 삭제), store archived/draft 도 테스트 사본. **실 지속 데이터 = store/active 12(보호 샘플+실 콘텐츠) 불변**. 본 V2b 는 테스트 3+1 생성·전량 삭제로 **순 DB 변경 0**.

## 14. typecheck·build (실행 12)

- api-server tsc(내 파일) **0** · 프로덕션 build config tsc **0**. migration 0.

## 15. V2c 연결 계약 (실행 20)

- 공급자 API: `/api/v1/kpa/supplier/screen-sets/*`(V2a 편집기에 supplier ScreenSetBuilderApi 주입 — create/update/saveBlocks/preview/searchO4oDescriptions[o4o]/searchStoreContents(빈배열)). contentSources=`['spd','o4o']`(store 제외).
- 게시 UI: publish(hubTarget)·unpublish·archive. 의약품 시 pharmacy 강제(409 처리).
- 매장 HUB: `/store/screen-set-hub/supplier-templates*` — 목록/상세/미리보기(previewScreenSet)/가져오기.

## 16. 변경 파일

```
apps/api-server/src/routes/platform/store-tablet-medication-guard.ts                    (신규 의약품 가드)
apps/api-server/src/routes/o4o-store/controllers/supplier-screen-set.controller.ts       (신규 공급자 컨트롤러)
apps/api-server/src/routes/platform/store-public/store-public-tablet-content-source.ts   (createSupplierContentSourceAdapter)
apps/api-server/src/routes/platform/store-tablet.routes.ts                               (매장 HUB 공급자 목록/상세/import)
apps/api-server/src/routes/o4o-store/services/store-asset-derivation.service.ts          (kind supplier_screen_set)
apps/api-server/src/routes/kpa/kpa.routes.ts                                             (컨트롤러 마운트)
```
- **migration·스키마·백필 0.**
