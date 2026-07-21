# CHECK-O4O-SUPPLIER-SCREEN-SET-AUTHORING-AND-HUB-PUBLISH-V2 — ⛔ HOLD (편집기 재사용 선행 조건)

> WO: `WO-O4O-SUPPLIER-SCREEN-SET-AUTHORING-AND-HUB-PUBLISH-V2`
> 선행: `CHECK-O4O-SUPPLIER-SCREEN-SET-POLICY-AND-TARGET-SCHEMA-V1`(정책·스키마 LIVE)
> Date: 2026-07-22
> **상태: HOLD** — 실행 1~6(조사·설계) 수행 후 **구조적 중지 조건 확정**. 코드·DB write 0.

---

## 0. 결론

선행 조사 결과 **백엔드·게시 계약은 전부 구현 가능**(스키마·소유권 키·의약품 판별 축 모두 확정)하나, WO 가 요구한 **"기존 5섹션 편집기 재사용 + 새 편집기 금지"** 전제가 **교차-앱 구조**로 인해 선행 추출 없이는 충족 불가하다.

- 5섹션 authoring 편집기(`TabletScreenSetManager` 등, 내부 의존 24심볼)는 **`services/web-kpa-society` 의 페이지**이며 **공유 패키지가 아니다**.
- 공급자 대시보드는 **`services/web-neture`** (별도 앱, tablet 편집기 스택 전무).
- 운영자 authoring 이 재사용에 성공한 이유 = **같은 앱**(web-kpa-society) 내 import(`OperatorTabletScreenSetsPage.tsx:15` → `../../pharmacy/TabletScreenSetManager`).
- 공급자 UI 를 web-neture 에 두면서 편집기를 재사용하려면 **편집기의 공유 패키지 추출(선행 리팩터)** 이 필수인데, 이는 near-frozen 운영자·매장 편집기 consumer 를 함께 건드려 **"기존 운영자·매장 Screen Set 동작을 깨뜨려야 함"** 중지 조건 위험을 수반한다. 새 편집기를 web-neture 에 만드는 것은 WO 가 명시 금지("공급자 전용 새 편집기 모델 금지").

→ 임의 우회(새 편집기/대규모 추출 무단 착수/앱 위치 변경) 대신 **조사 결과 + 분해안 보고 후 중지**(WO 중지 지침 준수).

---

## 1. 재확인한 선행 스키마·계약 (실행 1) — ✅ 정상

- `hub_target_store_type` 컬럼 + `CHK_stss_hub_target` 프로덕션 존재(재확인). owner scope·status CHECK 불변.
- 상태 계약: supplier = `draft`/`active`/`archived`, `supplier_template` 미사용(선행 WO 확정).
→ 중지 조건 "선행 migration/CHK 미적용" **미해당**.

## 2. 조사한 기존 운영자 Screen Set 흐름 (실행 2) — ✅ 재사용 가능(백엔드)

| 자산 | 재사용성 |
|------|---------|
| `resolveScreenSetSections`(origin='store' 격리) | ✅ 공개 렌더 공용 |
| `createOperatorContentSourceAdapter` 패턴(`store-public-tablet-content-source.ts`) | ✅ → `createSupplierContentSourceAdapter` 로 확장 가능 |
| `operator-screen-set.controller.ts`(list/create/update/blocks/preview/delete) | ✅ 공급자 컨트롤러 미러 대상 |
| 매장 HUB `hub-content.service.queryScreenSet` + `/store/screen-set-hub/*`(목록·상세·import 트랜잭션) | ✅ 공급자 노출·가져오기로 확장 |
| provenance `store_asset_derivations`(FK 없음) + kind 화이트리스트 | ✅ 신규 kind `supplier_screen_set` 추가만(application-level, migration 0) |
→ 중지 조건 "운영자 HUB·독립 복사 재사용 불가" **미해당**(백엔드).

## 3. 5섹션 편집기 구조 (실행 3) — ⛔ **재사용 선행 조건**

- 편집기 = `services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx`(≈1600줄) + export 되는 `TabletContentStepBuilder` + 내부 `ContentListEditor`/`ContentPickerModal` + `TabletKioskPage` 미리보기 + `RichTextEditor`. 내부 의존 24심볼.
- **공유 패키지 아님** — web-kpa-society 페이지. 운영자·매장 소비처는 **동일 앱 내 상대경로 import**.
- `services/web-neture` 는 `@o4o/tablet-kiosk-core`·`@o4o/screen-content-core`·해당 편집기 **의존 전무**(package.json 미포함).
- 블록 계약(실제): `idle_media / corner_description / content_list / product_list / qr_guide`(WO 의 "idle/corner_intro/content_list/product_detail/additional_content" 5섹션과 명칭만 상이, 구조 동일).

→ web-neture 재사용 = **편집기 공유 패키지 추출**(예 `@o4o/tablet-screen-set-editor`) 선행 필요. 추출은 web-kpa-society 의 store/operator consumer 를 함께 rewire(회귀 위험) + web-neture 가 tablet 렌더 스택·디자인시스템 채택. **본 WO 범위·"새 편집기 금지" 제약과 충돌** → HOLD.

## 4. 공급자 상품·콘텐츠 소유권 (실행 4) — ✅ 신뢰 키 확정

- 로그인→공급자: `neture_suppliers(id, user_id, status)`. user_id 로 supplier_id 도출.
- 공급자 상품: **`supplier_product_offers(supplier_id, master_id, approval_status, is_active, service_keys, deleted_at)`**. 자기 상품 = `supplier_id=$sup AND deleted_at IS NULL`(+승인/활성 게이트).
- O4O 표준 상품 정보: `shared_product_descriptions`(STORE canonical) — content_list `o4o_product_description`(masterId). 공급자 adapter 는 **자기 offer 의 masterId 로 제한**(다른 공급자 상품 차단).
- 매장 콘텐츠(`kpa_store_contents`)·운영자 전용: **차단**(operator adapter 처럼 `fetchStoreContent` → null).
→ 중지 조건 "자기 상품 판별 키 없음"·"다른 공급자 차단 불가" **미해당**.

## 5. 의약품 판별 기준 (실행 5) — ✅ 판별 축 + 보수적 차단 확정

- 판별 축: **`product_masters.regulatory_type`** — `DRUG`(177,413=전문 rx+일반 otc, `drug_category` 세분) = **의약품**. `QUASI_DRUG`(의약외품)·`건강기능식품`·`MEDICAL_DEVICE`·`GENERAL`/`일반` = 의약품 아님.
- **의약품 포함 판정** = Screen Set 의 content_list `o4o_product_description` items(+product_content productRef) 의 masterId 를 `product_masters` 조회 → 하나라도 `regulatory_type='DRUG'` 이면 의약품 포함.
- **보수적 차단**(실패 처리): masterId 미존재 / `regulatory_type IS NULL` / 미분류 → 의약품으로 취급(pharmacy 강제, 또는 non_pharmacy·all 게시 거부). WO "확정 불가 시 보수적 게시 거부" 충족.
- **DB CHECK 아님**(블록 조사 필요) → 애플리케이션 이중 가드(게시·대상변경 시점 + HUB 조회·가져오기 시점).
→ 중지 조건 "의약품 판별 불가·보수적 차단 불가" **미해당**.

## 6. 재사용 설계·변경 범위 (실행 6) — 백엔드 확정 / 프론트 HOLD

| 구성 | 상태 |
|------|------|
| 공급자 API(list/create/update/blocks/preview/duplicate/publish/unpublish/archive) | 설계 확정(operator 컨트롤러 미러) — **구현 가능** |
| `createSupplierContentSourceAdapter`(자기 offer masterId 한정 + store content 차단) | 설계 확정 — **구현 가능** |
| 의약품 이중 가드(게시 시점 + HUB 조회/가져오기 시점) | 설계 확정 — **구현 가능** |
| 매장 HUB 공급자 노출(`queryScreenSet` supplier + store type 매칭) + import + provenance | 설계 확정(web-kpa 동일 앱) — **구현 가능** |
| **공급자 authoring UI(web-neture, 편집기 재사용)** | ⛔ **선행 추출 필요 — HOLD** |

## 7. 중지 조건 점검

| 조건 | 발생? |
|------|:-----:|
| 선행 migration/CHK 미적용 | ❌ (§1 정상) |
| Screen Set 구조가 ADR 계약과 다름 | ❌ (§1) |
| neture_suppliers.id 안정 도출 불가 | ❌ (§4 user_id 매핑) |
| 자기 상품 판별 키 없음 | ❌ (§4 supplier_product_offers) |
| 콘텐츠 소유·사용상태 판별 불가 | ❌ (§4) |
| 다른 공급자 콘텐츠 차단 불가 | ❌ (§4 adapter masterId 한정) |
| 의약품 판별·보수 차단 불가 | ❌ (§5) |
| organizations.type 매장 판별 불가 | ❌ (pharmacy/store 구분 가능) |
| 운영자 HUB·독립 복사 재사용 불가 | ❌ (§2 백엔드 재사용) |
| 독립 복사에 신규 스키마·migration 필요 | ❌ (기존 흐름 재사용) |
| provenance 신규 스키마 필요 | ❌ (store_asset_derivations kind 추가만) |
| supplier_template/새 status 필요 | ❌ (기존 값 재사용) |
| **기존 편집기 재사용이 앱 구조상 선행 추출 필요 + near-frozen 편집기 회귀 위험** | **✅ 발동**(§3) |

## 8. 권장 분해안 (후속 WO)

1. **V2a (선행·최상위)** — 타블렛 Screen Set **authoring 편집기 공유 패키지 추출**: `TabletScreenSetManager`(+`TabletContentStepBuilder`·`ContentListEditor`·`ContentPickerModal`·kiosk 미리보기 배선)를 `@o4o/tablet-screen-set-editor`(신규 UI 패키지)로 이동, **store/operator consumer byte-equivalent rewire**(screen-content-core 추출 방식과 동일 검증). role 차이는 주입 prop(ContentSourceAdapter·게시 기능·selectable 원천)로. web-kpa 회귀 0 확인.
2. **V2b** — 공급자 **백엔드**: 공급자 컨트롤러 + `createSupplierContentSourceAdapter`(자기 offer masterId 한정) + 의약품 이중 가드 + 매장 HUB 공급자 노출/가져오기 + provenance(kind `supplier_screen_set`). **API + 매장측 브라우저로 검증**(테스트 supplier set 은 API 생성 — 현재 supplier offer 0·supplier set 0).
3. **V2c** — 공급자 **authoring UI**(web-neture, V2a 패키지 소비) + 매장 HUB 공급자 섹션(web-kpa) + 게시/대상 UI. 3계정(supplier/약국/비약국) 브라우저 smoke.

> V2b 는 V2a 없이도 부분 착수 가능(백엔드+매장측)하나, 공급자가 실제 제작하려면 V2a·V2c 필요. 순서는 사용자 판단.

## 9. 확정 계약(후속 turnkey 용)

- 소유권: `origin='supplier'` · `organization_id=NULL` · `supplier_id=neture_suppliers.id(로그인 user_id 매핑)` · `service_key` · active 시 `hub_target_store_type` 필수.
- 의약품: `product_masters.regulatory_type='DRUG'` → pharmacy 전용. NULL/미분류 → 보수적 차단.
- 매장 판별: `organizations.type` = pharmacy→약국 / store→비약국 / 그 외 제외.
- 매장 사본: operator 경로 재사용(`/store/screen-set-hub/*` import 트랜잭션) — org=매장·origin='store'·supplier_id NULL·hub_target NULL·tablet_id NULL·값복사·FK 없음·반복 허용·코너 자동 미적용.
- provenance: `store_asset_derivations` source_kind `supplier_screen_set`(신규, application-level) → derived_kind `screen_set`.

## 10. 조사 채널·안전

- 프로덕션 DB **read-only SELECT/카탈로그**(cloud-sql-proxy 재기동 5442). write 0. 코드·배포·migration 0. 보호 샘플 무접촉.

---

## 완료 보고(HOLD)

1. **재사용 조사**: 백엔드(resolver·adapter·컨트롤러·HUB·복사·provenance) 전부 재사용 가능.
2. **중지 원인**: 5섹션 authoring 편집기가 **web-kpa-society 페이지**(공유 패키지 아님)인데 공급자 UI 는 **web-neture** — 교차-앱 재사용은 **편집기 추출 선행 필요**, near-frozen 운영자·매장 편집기 회귀 위험. "새 편집기 금지" 제약과 충돌.
3. **확정 계약**: 소유권(neture_suppliers/supplier_product_offers)·의약품(regulatory_type='DRUG'+보수차단)·매장판별(organizations.type)·상태(draft/active/archived)·provenance(kind 추가) 모두 확정 — 후속 WO turnkey.
4. **분해안**: V2a 편집기 추출 → V2b 공급자 백엔드 → V2c 공급자 UI + 매장 HUB.
5. **산출물**: 본 CHECK 만(docs-only). 코드·DB·migration·백필 **0**.
