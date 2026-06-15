# CHECK-O4O-SUPPLIER-PRODUCT-REGISTRATION-ENTRY-FLOW-POLICY-V1

> **작업명:** WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-ENTRY-FLOW-POLICY-V1
> **유형:** 프론트 진입 화면 + 정책 문구 정비 — 제품 등록 첫 선택을 5유형 → **의약품/비의약품 2분기**로 단순화. DB/route/gate/backend **무변경**.
> **결과: PASS — 진입 첫 화면을 의약품/비의약품 2카드로 단순화, 의약품→비처방/처방 sub-step(기존 otc_drug/rx_drug internal value 재사용), 비의약품→표준 폼(GENERAL). 의약외품/미분류 카드 제거. 정책 문구·식별정보 선택 안내·하단 연결 메뉴 안내 추가. 단일 파일 변경. web-neture build ✓ · api-server typecheck 0.**
> 선행: `15318e471`(품목군 gate) · `WO-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-IA-V1`(5유형 IA) — 2026-06-15

---

## 1. 조사한 현재 register 화면 구조

- 진입 파일: `services/web-neture/src/pages/supplier/SupplierProductRegisterEntryPage.tsx` (route `/supplier/products/register`).
- 유형 정의: `services/web-neture/src/lib/supplierProductTypes.ts` `SUPPLIER_PRODUCT_TYPES`(5종).
- 흐름: 유형 카드 선택 → 등록 방식(하나씩/대량) → `/supplier/products/new?productType=X&regulatoryType=Y` 또는 `/products/bulk?productType=X`.

## 2. 기존 제품 유형 internal value (변경 안 함)

| key | label | regulatoryType | drugCategory | 비고 |
|-----|-------|----------------|--------------|------|
| `non_drug` | 비의약품 | GENERAL | — | 표준 |
| `quasi_drug` | 의약외품 | QUASI_DRUG | — | 진입 카드에서 제거(비의약품 폼 내 규제구분으로 흡수) |
| `otc_drug` | 비처방 의약품 | DRUG | otc | 의약품 sub |
| `rx_drug` | 처방의약품 | DRUG | rx | 의약품 sub |
| `unclassified` | 미분류/운영자 검토 | '' | — | 진입 카드에서 제거 |

> `supplierProductTypes.ts` 의 type def 5종은 **유지**(bulk 템플릿·`getSupplierProductType`·legacy 링크 참조). 진입 화면이 노출하는 카드만 축소.

## 3. 의약품/비의약품 2분기 적용 방식

- **1차 선택:** 의약품 / 비의약품 (2 카드).
- **비의약품** → 선택 즉시 등록 방식 노출 → `non_drug`(regulatoryType=GENERAL) 표준 폼. 의약외품/의료기기/건기식/화장품 세부 분류는 폼 내 **"규제 구분" select**(기존 구현, `SupplierProductCreatePage.tsx:611-625`)에서 선택(강제 안 함, WO §2.3 충족).
- **의약품** → sub-step(비처방 의약품 `otc_drug` / 처방 의약품 `rx_drug`) → 등록 방식. rx 경고 배너·식별정보 선택 안내 유지.
- 라우팅/쿼리 파라미터(`productType`/`regulatoryType`)는 기존과 동일 → create/bulk 폼 무변경.

## 4. OTC/ETC 구분 유지 방식

- 의약품 sub-step 에서 `otc_drug`(drugCategory='otc') / `rx_drug`(drugCategory='rx') 선택 → 기존 internal value 그대로 전달. `ProductMaster.drug_category` 저장 체계·운영자 검토 확정 흐름 무변경.

## 5. B2B/B2C 상세설명 현황

- **이미 구현됨(변경 불필요).** `SupplierB2BContentPage.tsx:78` — "B2B 설명이 없으면 B2C 설명이 자동으로 사용됩니다"(`businessShortDescription`/`businessDetailDescription`). B2C 편집은 ProductDetailDrawer. WO §2.4("이미 이 방식이면 유지")에 해당 → 본 WO 무수정.

## 6. submit-approval gate 영향 여부

- **영향 없음.** 품목군 gate(선행 `15318e471`)는 `regulatoryType`→공급자 품목군 매핑(DRUG→pharmaceutical, GENERAL→general)으로 동작. 진입 화면 단순화는 동일 `regulatoryType` 값을 전달하므로 gate 로직·동작 불변. backend/SQL/service 무변경.

## 7. 제외 범위 (WO §4 준수)

약국 대상 서비스 설정(DB/admin) / 의약품 서비스 연결 gate / B2B 등록·서비스 승인 제품·판매자 모집 기능 / 이벤트 오퍼·펀딩 연결 / 차등 가격 / ProductMaster·SupplierProductOffer·ProductApproval·OrganizationProductListing 구조·정책 / package.json·lock / migration. **모두 미수행.** 하단 연결 안내는 텍스트만(기능 미구현).

## 8. 검증 결과

- **web-neture:** `pnpm --filter @o4o/web-neture build` → `✓ built in ~11s` ✅
- **api-server:** `pnpm --filter @o4o/api-server type-check` → `tsc --noEmit` **0 errors** ✅ (backend 무변경, 회귀 없음 확인)
- **정적:** 진입 화면만 변경. create/bulk 폼·B2B 페이지·gate·라우트 쿼리 계약 불변. 기존 internal value/type def 보존.
- **browser smoke:** 미수행 — dev 서버·인증 guard. **배포 후 권장:** ① `/supplier/products/register` 의약품/비의약품 2카드 ② 의약품→비처방/처방 sub 후 등록 방식 ③ 비의약품→표준 폼(규제 구분 select 노출) ④ 하단 연결 안내 ⑤ 기존 제품 목록/상세·승인요청 gate 정상.

## 9. 변경 파일 (2)

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/pages/supplier/SupplierProductRegisterEntryPage.tsx` | 5유형 카드 → 의약품/비의약품 2분기(+의약품 sub-step) 재구성. 정책 문구·식별정보 안내·하단 연결 메뉴 안내. 기존 type def 재사용(`getSupplierProductType`) |
| `docs/investigations/CHECK-...-V1.md` | 본 문서 |

## 10. 완료 판정 / 후속

**PASS.** 진입 첫 화면 의약품/비의약품 2분기 단순화, 의약품 비처방/처방 유지, 비의약품 표준 폼, 식별정보 비강제, B2B/B2C 기존 흐름 유지, 하단 연결 안내. gate·DB·route 무변경.

**커밋:** path-specific 2파일 · `<commit>`.
**차기 WO:** **WO-O4O-SERVICE-PHARMACY-AUDIENCE-POLICY-SETTINGS-V1** — 약국 대상 서비스(kpa-society/glycopharm) DB 관리 + admin 설정 화면(의약품 서비스 연결 gate 기반).

---

*Date: 2026-06-15 · 프론트 진입 정비 PASS · 제품 등록 첫 선택 의약품/비의약품 2분기. 의약품→비처방/처방(기존 value 재사용), 비의약품→표준 폼. B2B/B2C·gate·DB·route 무변경. web-neture build ✓ · api-server typecheck 0. 배포 후 smoke 권장.*
