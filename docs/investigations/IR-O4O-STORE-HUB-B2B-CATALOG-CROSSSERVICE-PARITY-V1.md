# IR-O4O-STORE-HUB-B2B-CATALOG-CROSSSERVICE-PARITY-V1

> **유형**: Investigation (read-only) — Store Hub B2B Catalog 3서비스 parity 조사.
> **성격**: 코드/DB/UI **무변경**. 조사 문서만 (file:line 근거).
> **결론(요약)**: **계약·용어·신청 흐름은 3서비스 이미 정합(A)** — 동일 distribution 탭(전체/B2B/운영자/**공급 승인 대상**), `applyBySupplyProductId → POST /{svc}/pharmacy/products/apply → ProductApproval(PENDING)`, `@o4o/operator-ux-core DataTable`, **판매자 모집 잔재 0**(SELLER-RECRUITMENT-FIX). 컴포넌트만 중복: **GP↔KCos near-identical(370/371, diff 35) → B**, **KPA fuller(796) → C**. → GP/KCos 공통 추출(B, event-offers 패턴) + KPA fold-in 평가(C).
> **선행**: `IR-...-PHASE6`(b2b=C) · `WO-O4O-SELLER-RECRUITMENT-TERMINOLOGY-BOUNDARY-FIX-V1` · event-offers/local-products 공통화.
> **작성일**: 2026-06-12

---

## 1. 목적
KPA/GP/KCos B2B 카탈로그(공급 상품 신청) 화면의 구조·distributionType·신청/승인 흐름을 비교해 공통화 가능성을 판정한다.

## 2. 배경
Phase 6 IR 에서 b2b hub = C(OPL 정합·UI 3별도). 본 IR 이 parity 확정.

## 3. 선행 기준
신청 ≠ 주문 가능. `applyBySupplyProductId` → ProductApproval(PENDING) → 승인 후 OPL. distribution: PUBLIC/SERVICE/PRIVATE. PRIVATE user-facing = **공급 승인 대상**(구 '판매자 모집' 폐기, Neture 파트너 모집과 혼동 방지).

## 4. 조사 범위
3서비스 `/store-hub/b2b` route/component + apply api + 신청 backend. (read-only.)

---

## 5. Phase 1 — route/component/API 매핑

| 서비스 | route | component(줄) | 테이블 | apply api | 신청 endpoint |
|--------|-------|---------------|--------|-----------|---------------|
| **KPA** | `/store-hub/b2b` | `HubB2BCatalogPage`(`pages/pharmacy/`, **796**) | `@o4o/operator-ux-core DataTable`+Pagination | `applyBySupplyProductId`(`api/pharmacyProducts`) | `POST /kpa/.../pharmacy/products/apply` |
| **GP** | `/store-hub/b2b` | `HubB2BCatalogPage`(`pages/hub/`, **370**) | 동(operator-ux-core DataTable) | 동(`api/pharmacyProducts`) | `POST /glycopharm/pharmacy/products/apply` |
| **KCos** | `/store-hub/b2b` | `HubB2BPage`(`pages/hub/`, **371**) | 동 | 동 | `POST /cosmetics/pharmacy/products/apply` |

> 3서비스 모두 `@o4o/operator-ux-core DataTable` + `applyBySupplyProductId` + checkbox multi-select + ActionBar(bulk 내 매장에 추가) 사용. GP/KCos 주석: "KPA-Society canonical 정렬". (operator 측 supply 카탈로그 source = `getCatalog()` neture_supplier_products PUBLIC.)

## 6. Phase 2 — distributionType / tab / label 비교 (정합)

| 항목 | KPA | GP | KCos |
|------|-----|-----|------|
| DISTRIBUTION_TABS | 전체 / **SERVICE(=B2B)** / 운영자 / **PRIVATE(=공급 승인 대상)** | 동일 | 동일 |
| PRIVATE 라벨 | **공급 승인 대상** | 동일 | 동일 |
| 판매자 모집 잔재 | **0** | **0** | **0** |

> **3서비스 distribution 탭·라벨 IDENTICAL.** 모두 `WO-O4O-SELLER-RECRUITMENT-TERMINOLOGY-BOUNDARY-FIX-V1` 주석 보유 — PRIVATE = "공급자 allowed_seller_ids 지정 비공개 공급, 매장 입장 취급 신청/공급 승인 대상(ProductApproval 흐름)", 구 '판매자 모집'(neture_partner_recruitments 혼동)→'공급 승인 대상' 정정 **완료**. → **용어 parity = A**.

## 7. Phase 3 — 신청/승인 흐름 비교 (정합)

| 단계 | 내용 |
|------|------|
| 신청 | `applyBySupplyProductId(supplyProductId)` → `POST /{svc}/pharmacy/products/apply` |
| backend | `product-policy-v2/product-approval-v2.service.ts` → **`ProductApproval` 생성**(approval_type=SERVICE, status=**PENDING**), 기존 PENDING 중복 가드 |
| 신청 직후 | ProductApproval(PENDING) — **주문 가능 상품(OPL) 아님**(신청≠주문) |
| 승인 후 | OPL 생성(별도, operator/approval 흐름) → 내 매장 주문 가능 |
| 취소/제외 | `cancelProductByOfferId` → `DELETE /{svc}/pharmacy/products/by-offer/:offerId` |

> **3서비스 동일 apply→ProductApproval(PENDING) 계약.** 신청≠주문 가능 원칙 정합(IR §2.1). 승인 후 OPL 합류는 공통 approval 경로. → **신청/승인 흐름 parity = A**.

## 8. Phase 4 — UI/UX 구조 비교

**GP↔KCos**: `HubB2BCatalogPage`(370) ↔ `HubB2BPage`(371) **전체 diff = 35줄**, 실질:
| 항목 | GP | KCos |
|------|-----|------|
| 컴포넌트명 | `HubB2BCatalogPage` | `HubB2BPage` |
| 테마색 | teal | pink |
| tableId | `glyco-store-hub-b2b-products` | `kcos-store-hub-b2b-products` |
| 품목 예시 | 의약품/건기식 | 화장품/뷰티디바이스 |
| header 라벨 | "공급자" | "공급사" |
| 주석/WO ref | GP | KCos |
> 로직/구조 차이 0 → **event-offers/local-products 와 동일 near-identical 패턴**.

**KPA**: `HubB2BCatalogPage`(796) — GP/KCos 와 **동일 canonical 패턴**(operator-ux-core DataTable + 동일 탭 + applyBySupplyProductId) 이나 **fuller**: 제거 confirm flow(`removeConfirmId`), 추가 컬럼/상태, Pagination 등. KPA↔GP diff=842(=KPA 796 vs GP 370 규모차). → KPA 는 "다른 tier" 가 아니라 **같은 패턴의 더 큰 구현**.

## 9. Phase 5 — 공통화 가능성 판정

| 영역 | KPA | GP | KCos | 판정 | 근거 |
|------|:---:|:---:|:---:|:---:|------|
| **계약·용어·신청 흐름** | ✅ | ✅ | ✅ | **A** | distribution 탭/공급 승인 대상/applyBySupplyProductId→ProductApproval 동일, 판매자 모집 0 |
| **GP↔KCos 컴포넌트** | — | dup | dup | **B** | 370 near-identical(name/theme/tableId/품목/공급자·공급사) → 공통 추출(event-offers 패턴) |
| **KPA 컴포넌트** | fuller | — | — | **C** | 동일 패턴 + 제거 confirm/추가 기능(796). 공통 컴포넌트 fold-in(remove flow 등 prop화) or 별도 유지 평가 필요 |

> **종합 = A(계약/용어) + B(GP/KCos 컴포넌트) + C(KPA fuller)**. event-offers 와 동형 구조(GP/KCos near-identical, KPA fuller).

## 10. Phase 6 — 후속 작업 분리

**즉시 가능 (B — GP/KCos 공통 추출)**
- `WO-O4O-STORE-HUB-B2B-CATALOG-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1` — GP/KCos `HubB2BCatalogPage`/`HubB2BPage`(370 near-identical)를 공통 `B2BCatalogHub`(api `pharmacyProducts` + theme accent + tableId/품목/header 라벨 prop)로 통합. event-offers V1 패턴. **저위험.**

**평가 후 (C — KPA fold-in)**
- `WO-O4O-STORE-HUB-B2B-CATALOG-KPA-FOLD-IN-V1`(후보) — KPA 의 제거 confirm/추가 기능을 공통 컴포넌트의 optional prop/slot 으로 흡수해 3서비스 통합, 또는 KPA 별도 유지 결정. (GP/KCos 추출 후 차이 재측정.)

**저위험 정렬/조사**
- `WO-O4O-PRODUCT-APPROVAL-STATUS-LABEL-ALIGNMENT-V1`(후보) — PENDING/approved/rejected 라벨 공통.
- `IR-O4O-PRODUCT-APPROVAL-TO-OPL-CROSSSERVICE-AUDIT-V1`(후보) — 승인 후 OPL 생성 경로 3서비스 audit(본 IR 은 신청까지, 승인→OPL 은 별도).

> **권장 순서**: ① GP/KCos 공통 추출(B, 저위험) → ② KPA fold-in 평가(C) → ③ 승인→OPL audit/라벨 정렬.

---

## 11. 결론
- **계약·용어·신청 흐름은 3서비스 이미 정합(A)**: 동일 distribution 탭(공급 승인 대상 포함), `applyBySupplyProductId → ProductApproval(PENDING)`, operator-ux-core DataTable, **판매자 모집 잔재 0**(SELLER-RECRUITMENT-FIX 전 서비스 적용).
- **GP↔KCos 컴포넌트는 370 near-identical**(diff 35=name/theme/tableId/품목/표현) → **공통 추출 가능(B)**, event-offers 와 동형.
- **KPA(796)는 동일 패턴의 fuller 구현**(제거 confirm 등) → 공통 컴포넌트 fold-in 평가(C).
- 신청≠주문 가능 원칙 정합(ProductApproval PENDING). 승인→OPL 합류는 공통 approval 경로(상세 audit 별도).
- **권고**: GP/KCos 공통 추출(B) 먼저 → KPA fold-in 평가(C). 계약/용어는 추가 정렬 불요(이미 A).

---

*Date: 2026-06-12 · read-only IR · 코드 무변경 · b2b 계약/용어 정합(A) / GP·KCos near-identical(B 공통추출) / KPA fuller(C fold-in 평가). apply→ProductApproval(PENDING), 판매자 모집 잔재 0.*
