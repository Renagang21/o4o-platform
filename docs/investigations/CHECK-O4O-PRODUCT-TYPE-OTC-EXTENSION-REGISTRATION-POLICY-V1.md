# CHECK-O4O-PRODUCT-TYPE-OTC-EXTENSION-REGISTRATION-POLICY-V1

> 비처방의약품(OTC) 등록 분기·검증 정책의 **최소 기반 + 정책 고정**.
>
> WO: `WO-O4O-PRODUCT-TYPE-OTC-EXTENSION-REGISTRATION-POLICY-V1`
> Baseline: [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md) §9 (Product Type / Drug Extension), §10 (Rx 제외)
> 선행: Phase 1~6 (Core/Identifier/Candidate/Mobile/Operator UI/Listing)
> 작성일: 2026-06-06
> 상태: foundation(helper) + policy 고정 완료. Rx 제외. UI/판매 미구현.

---

## 1. Summary

OTC(비처방의약품)를 비의약품·처방의약품(Rx)과 **분류**하고, 검토 전 **보수적 노출/판매 기본 정책**을 적용하기 위한 **순수 helper + 정책 문서**를 추가했다. **DB 변경 없음.**

핵심 결정:
- **새 테이블/필드 추가하지 않음.** 기존 활성 모델(`ProductMaster.regulatoryType` + 규제 게이트) + Identifier Core(Phase 2) 위에서 분류만 수행.
- `PharmaProductMaster`(pharmaceutical-core)는 **api-server 에서 dormant**(미등록/migration 없음/미사용) → 이번에 건드리지 않음. Drug Extension 활성화는 별도 결정.
- Rx(ETC) 등록 루트는 범위 밖 — 분류만 하고 등록/판매 차단.

검증: api-server `tsc --noEmit` **0 errors**.

---

## 2. Existing PharmaProductMaster Findings

| 항목 | 사실 |
|---|---|
| 위치 | `packages/pharmaceutical-core/src/entities/PharmaProductMaster.entity.ts` |
| 보유 필드 | drugCode/insuranceCode/atcCode, category(enum OTC/ETC/QUASI_DRUG), status(draft/active/discontinued/out_of_stock/recalled), activeIngredients(jsonb), indications/dosage/warnings, unit/packageSize/expiryMonths/storageCondition/therapeuticCategory, images/attributes/metadata, `coreProductMasterId`(nullable) |
| **api-server 등록** | ❌ `connection.ts` entities 에 **미등록** |
| **migration** | ❌ api-server `database/migrations` 에 `pharma_product_masters` **없음** |
| **api-server 사용처** | ❌ 서비스/컨트롤러 **미사용** (검색 매치는 본 helper 주석 + appsCatalog 뿐) |
| ESM 규칙 | ⚠️ `@OneToMany(() => PharmaOffer, ...)` 구상 참조 — CLAUDE.md §2 위반 형태(현 상태 그대로, 본 WO 미변경) |

> **결론**: `pharma_product_masters` 는 api-server 런타임에서 **dormant**. 필드 추가는 런타임 무의미 + ESM 위반 파일 수정 리스크 → **변경하지 않음**. OTC/ETC 구분 데이터(category)는 이 dormant 엔티티에만 존재.

---

## 3. ProductMaster / Identifier Relationship (활성 모델)

api-server 의 **활성** 규제 메커니즘:
- `ProductMaster.regulatoryType` (varchar, immutable): `DRUG` / `HEALTH_FUNCTIONAL` / `QUASI_DRUG` / `COSMETIC` / `GENERAL` (`offer.service.ts:32`, 한글 별칭 매핑 포함).
- `isRegulated` ← `ProductCategory.isRegulated` (카테고리 기반).
- `assertPharmacyOnlyServiceKeys(isRegulated, serviceKeys)` → 규제품은 `PHARMACY_ALLOWED_SERVICE_KEYS = ['glycopharm','kpa-society']` 부분집합만 허용 (`offer.service.ts:100`).
- `assertRegulatedPermit(...)` → 규제품 MFDS 미검증 시 허가번호 필수.
- Identifier Core(Phase 2): `KOREA_DRUG_CODE`/`KOREA_INSURANCE_CODE`/`ATC_CODE`/`MFDS_CODE`/`GTIN`/… 이미 정의됨 → OTC 식별자 정책 **재사용**(변경 불필요).

> **결정적 갭**: 활성 `regulatoryType` 은 `DRUG` 까지만 구분 → **OTC vs ETC(Rx)를 구분하지 못함**. 구분 데이터는 dormant `PharmaProductMaster.category` 에만 존재. (Follow-up F1)

---

## 4. OTC Classification Policy (고정)

`classifyProductType()` (helper) 우선순위:
1. 명시 `drugCategory` (otc/etc/quasi) → otc_drug / rx_drug / quasi_drug
2. candidate `rawPayload.drug_category|product_type`
3. `regulatoryType`: `DRUG`→**drug_unspecified**, `QUASI_DRUG`→quasi_drug, `HEALTH_FUNCTIONAL`→health_functional, `COSMETIC|GENERAL`→non_drug
4. 그 외 → unknown

분류값: `non_drug | otc_drug | rx_drug | quasi_drug | health_functional | drug_unspecified | unknown` (DB enum 아님).

> 'DRUG' 인데 OTC/ETC 미명시 → **drug_unspecified** 로 두고 **OTC 와 동일한 보수적 기본 정책** 적용(검토에서 OTC 확정 필요). 자동 확정 없음.

---

## 5. Identifier Policy (고정 — 재사용)

OTC 식별자는 Phase 2 ProductIdentifier Core 사용. 허용 type: `GTIN/EAN13/JAN/UPC`, `KOREA_DRUG_CODE`, `KOREA_INSURANCE_CODE`, `MFDS_CODE`, `ATC_CODE`, `SUPPLIER_SKU`, `INTERNAL_O4O`.
- 바코드 있으면 exact match 우선 / 약품코드 → KOREA_DRUG_CODE / 보험코드 → KOREA_INSURANCE_CODE
- 다중 후보 → conflict
- **ProductMaster 자동 생성 없음** — 필요 시 product_candidates 경유 (Phase 3/6 정책 유지). 식별자 구조 변경 없음.

---

## 6. OTC Field / Extension Decision

- **새 필드/테이블 추가하지 않음.** (PharmaProductMaster dormant + ProductMaster 규제필드 immutable/frozen Core)
- OTC 상세정보(성분/효능/용법/주의/허가/출처)와 검증·노출 정책 필드는 **Drug Extension 활성화 시점**에 active 엔티티(PharmaProductMaster wiring 또는 신규 extension)에 추가하는 것으로 **연기**. 본 WO 는 분류 + 정책 기본값 + Rx 차단 기반까지.
- 정책 기본값/상태 모델은 helper 의 타입(`DrugDisplayPolicy`, `DrugVerificationStatus`, `DrugReviewer`)으로 **계약만 고정**(영속은 후속).

---

## 7. Verification / Review Status Policy (고정)

- `DrugVerificationStatus`: `draft | pending_review | verified | rejected | deprecated`
- `DrugReviewer`: `operator | pharmacist_reviewer | system_import | supplier_provided`
- OTC 후보는 **검토(pending_review) 경유 필수**, 운영자/약사 검토 전 `verified` 금지. (영속은 Drug Extension 활성 후)

---

## 8. Supplier Registration Boundary

- 본 WO 는 공급자 UI/등록 흐름을 **변경하지 않음**. 기존 `offer.service` 규제 게이트(`assertPharmacyOnlyServiceKeys`, `assertRegulatedPermit`)가 의약품을 이미 약국 전용으로 제한 → 유지.
- 효능·효과/용법/주의 문구는 Product Core 로 끌어올리지 않음. 공급자 B2C 설명을 공식 의약품 정보로 간주하지 않음. (Offer 경계 유지)
- `classifyProductType` 는 등록 시 OTC 판정 보조용으로 **준비**(wiring 은 후속, 자동 확정 없음).

---

## 9. ProductCandidate Boundary

- candidate `rawPayload` 의 `drug_category`/`product_type` 를 `classifyProductType` 가 인식 → OTC 후보 판별 helper **준비 완료**.
- candidate 구조/마이그레이션 변경 없음. 자동 확정 없음 — OTC 후보도 검토 큐(Phase 3) + 활용 연결(Phase 6) 정책 그대로.

---

## 10. Display / Advertising / Sale Policy (고정 기본값)

`getDefaultDrugDisplayPolicy(cls)` (검토 전 기본값, 검토 후 override):

| class | pharmacyOnly | customerDisplay | tabletDisplay | onlineSale | advertising |
|---|:---:|:---:|:---:|:---:|---|
| otc_drug / drug_unspecified | ✅ | ❌ | limited | ❌ | needs_review |
| rx_drug | ✅ | ❌ | limited | ❌ | **blocked** |
| quasi_drug / health_functional | ❌ | ✅ | ✅ | ❌(검토) | needs_review |
| non_drug | ❌ | ✅ | ✅ | ✅ | not_reviewed |

> OTC/Rx 는 검토 전 **고객 노출·온라인 판매 차단**, 약국 전용. Rx 는 광고 blocked. 비의약품은 제한 없음.

---

## 11. What Was Changed

- 신규: `apps/api-server/src/modules/neture/utils/product-type.util.ts` — `classifyProductType`, `isDrug/isOtcRegistrable/isRxClass`, `getDefaultDrugDisplayPolicy`, 타입(`ProductTypeClass`/`DrugDisplayPolicy`/`DrugVerificationStatus`/`DrugReviewer`). 순수 함수, DB/런타임 wiring 없음.
- 신규: 본 CHECK 문서 (정책 고정).

---

## 12. What Was Not Changed

- ✅ ProductMaster SSOT / regulatory 필드 변경 없음
- ✅ ProductIdentifier 구조 변경 없음
- ✅ ProductCandidate 구조 변경 없음
- ✅ MobileProductDraft 변경 없음
- ✅ SupplierProductOffer B2B/B2C 경계 변경 없음
- ✅ StoreProductProfile / OrganizationProductListing 변경 없음
- ✅ PharmaProductMaster 변경 없음 (dormant)
- ✅ migration 없음 / DB 변경 없음
- ✅ Rx 등록 루트 없음
- ✅ 모바일 UI / 약국·매장 사용자-facing OTC 등록 화면 없음
- ✅ 온라인 판매 허용 기능 없음 (기본 차단)
- ✅ 공급자 등록 흐름·게이트 변경 없음

---

## 13. Verification Results

| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit -p tsconfig.json` | ✅ 0 errors |
| pharmaceutical-core | 미변경 (해당 없음) |
| migration | 없음 (DB 무변경) |
| 기존 supplier/candidate/listing flow no-regression | ✅ (helper 는 미wiring, 기존 경로 무영향) |
| 순수 helper 단위 동작 (분류/정책) | ✅ 정적 검토 (DRUG→drug_unspecified, otc/etc/quasi 매핑, Rx blocked) |

---

## 14. Follow-ups

| # | 항목 |
|---|---|
| F1 | **OTC/ETC 구분 활성화** — 활성 모델이 'DRUG' 까지만 구분. PharmaProductMaster 를 api-server 에 wiring 하거나 active 엔티티에 drug_category 도입 (별도 WO, ESM 규칙 정정 동반) |
| F2 | Drug Extension 영속 — 검증 상태/노출·광고·판매 정책/출처 필드를 active 엔티티에 추가 + migration |
| F3 | `classifyProductType` wiring — offer 등록 + candidate 상세에 OTC 판정 노출 (자동 확정 없이) |
| F4 | Operator OTC 검토 UI (candidate 상세 OTC 표시 보강) |
| F5 | 공급자 OTC 등록 UX 분기 |
| F6 | **Rx 별도 루트** — `WO-O4O-RX-DRUG-REGISTRATION-ROUTE-AND-POLICY-V1` |

---

**작성:** O4O Platform Team · 2026-06-06
**상태:** OTC 분류·정책 foundation 고정 (helper + 정책). DB/UI/판매 미구현, Rx 제외. 다음: Drug Extension 활성화(F1) 또는 helper wiring(F3).
