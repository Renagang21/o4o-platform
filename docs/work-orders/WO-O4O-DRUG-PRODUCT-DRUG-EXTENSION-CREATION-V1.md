# WO-O4O-DRUG-PRODUCT-DRUG-EXTENSION-CREATION-V1

Status: DONE — dry-run + apply 완료 (2026-07-06, 177,413 생성). 결과: `CHECK-...-CREATION-APPLY-V1`
Date: 2026-07-06
Scope: DRUG ProductMaster 177,413건에 `ProductDrugExtension`(의약품 표시/노출/광고/판매 **정책 mirror 계층**)을 생성한다. **설명 문구(효능/용법/주의 텍스트) 채움은 범위 밖.**

Related:

- `docs/checks/CHECK-O4O-PRODUCT-DB-STRUCTURE-REFINEMENT-CHECK-A-V1.md` (Extension 0 발견)
- `docs/investigations/PROPOSAL-O4O-PRODUCT-STRUCTURE-REFINEMENT-FOR-MFDS-PUBLIC-DATA-V1.md` (결정 1: Identifier=SSOT, Extension=mirror)
- `apps/api-server/src/modules/neture/entities/ProductDrugExtension.entity.ts`
- `apps/api-server/src/modules/neture/drug-import/drug-master-promotion-apply.db.ts` (배치 패턴 재사용)

---

## 0. 왜 필요한가

CHECK-A 실측: DRUG ProductMaster 177,413건에 대해 **`ProductDrugExtension` = 0**. 즉 의약품의 **노출/광고/판매 정책 계층이 아예 없다.**

매장 설명서·소비자 노출 단계로 가기 전에, 각 의약품이 "약국 전용인지 / 고객 노출 가능한지 / 온라인 판매 가능한지 / 광고 검토됐는지"를 판정할 **정책 mirror**가 있어야 한다. 이것이 없으면 설명서를 만들어도 노출 gate를 걸 대상이 없다.

**이 WO는 정책 계층만 만든다. 설명 텍스트 생성은 별도 단계(e약은요/MFDS 파생)다.**

---

## 1. 원칙

1. **Identifier = 매칭/유일성 SSOT.** Extension의 코드 컬럼(`drugCode`/`mfdsCode`/`insuranceCode`/`atcCode`)은 **read-only mirror**다(PROPOSAL 결정 1).
2. **1:1.** `product_master_id` unique. master당 extension 1개. 재실행 멱등(dedup on unique).
3. **보수적 기본값.** 노출/판매/광고는 전부 차단 기본. 권한 여는 로직 아님.
4. **텍스트 미채움.** `efficacy_text`/`dosage_text`/`caution_text`/`storage_text`/`contraindication_text`/`ingredient*` 등 임상 텍스트는 이 WO에서 null. 후속 설명 WO에서 채움.
5. **write는 dry-run → 승인 → apply → 검증** gate. 대량 write이므로 백업 필수.

---

## 2. 대상

`product_masters WHERE regulatory_type='DRUG'` 177,413건 (drug_category: rx 119,548 / otc 57,572 / drug_unspecified 293).

- 이미 extension이 있는 master는 skip(멱등). 현재 0이므로 전건 create 예상.
- 잔여 drug_unspecified 293은 별도 후처리 대상이나, extension 생성 자체는 막지 않는다(정책은 보수 기본이라 안전). 포함 여부는 dry-run 리포트로 결정.

---

## 3. 필드 매핑 (생성 시)

| Extension 필드 | 채움 값 | 출처 |
| --- | --- | --- |
| `product_master_id` | master id | product_masters |
| `drug_category` | `rx`/`otc`/`drug_unspecified` | **ProductMaster.drug_category mirror** (NOT NULL) |
| `verification_status` | `pending_review` (기본) | 상수 |
| `drug_code` | 표준코드 | **ProductIdentifier(KOREA_DRUG_CODE) mirror** |
| `mfds_code` | 품목기준코드 | **ProductIdentifier(MFDS_CODE) mirror** |
| `insurance_code` | 보험/제품코드 | **ProductIdentifier(KOREA_INSURANCE_CODE) mirror** (있으면) |
| `atc_code` | ATC | **ProductIdentifier(ATC_CODE) mirror** (있으면) |
| `manufacturer_name` | 제조사 | ProductMaster.manufacturer_name mirror |
| `dosage_form` / `package_*` | 제형/포장 (선택) | candidate raw_payload.source (있으면, optional) |
| `data_source` | `HIRA_DRUG_MASTER` | 상수 |
| `source_updated_at` | source base date | candidate raw_payload.sourceBaseDate |
| **임상 텍스트 전부** | **null** | 후속 설명 WO |

### 정책 기본값 (엔티티 default와 정합 — 전부 보수)

| 필드 | 값 |
| --- | --- |
| `pharmacy_only` | `true` |
| `customer_display_allowed` | `false` |
| `tablet_display_allowed` | `limited` |
| `online_sale_allowed` | `false` |
| `advertising_review_status` | `needs_review` |
| `public_display_policy` | `blocked` |

> rx/otc에 따라 기본값을 달리할지는 dry-run 리포트 검토 후 결정(예: otc는 `tablet_display_allowed` 완화 검토). **1차는 전건 보수값 통일** 권장.

---

## 4. 구현 방식

- `drug-master-promotion-apply.db.ts`의 **배치 패턴 재사용**: raw `ds.query`, 앱측 UUID, 청크 multi-row INSERT(500/chunk), master 페이지 스캔.
- Identifier mirror: master별 `product_identifiers`에서 type별 `normalized_value`를 pivot(2.7 쿼리 패턴)해서 채움.
- 멱등: `INSERT ... WHERE NOT EXISTS (SELECT 1 FROM product_drug_extensions WHERE product_master_id=...)` 또는 선적재 dedup Set.
- dry-run 기본: wouldCreate 수 / drug_category 분포 / code mirror 결측 수 / 정책 기본값만 리포트. write 0.

---

## 5. 실행 gate

| 순서 | 단계 | write |
| --- | --- | --- |
| 1 | dry-run (wouldCreate, mirror 결측, 분포 리포트) | 0 |
| 2 | 사용자 승인 + 백업 id 확보 | — |
| 3 | apply (Cloud Run one-off 권장) | create only |
| 4 | 검증: extension 수 = 177,413, drug_category mirror 일치, code mirror 정합(CHECK-A 2.7 재사용), 정책 기본값 분포 | read-only |
| 5 | 완료 CHECK 문서 작성 | — |

apply 대상: `product_drug_extensions` 생성만. 다른 테이블 write 금지.

---

## 6. 범위 밖 (하지 말 것)

- 효능/용법/주의/저장/금기 등 **임상 텍스트 채움** (후속 설명 WO)
- `SharedProductDescription` 생성/변경
- 정책값을 열어주는 로직(고객 노출/온라인 판매 허용)
- RepresentativeProduct/이미지/offer/listing/store 계층 변경
- e약은요/MFDS 설명 파생

---

## 7. 완료 기준

- DRUG master 177,413에 `ProductDrugExtension` 1:1 생성(멱등)
- 코드 mirror가 Identifier와 정합(불일치 0 또는 report)
- 정책 전건 보수 기본값
- 임상 텍스트 전건 null(범위 준수)
- 검증 SQL + 완료 CHECK 문서

---

## 8. 후속

이 WO 완료 후: e약은요/MFDS 공식 텍스트를 Extension 임상 텍스트 및/또는 SharedProductDescription에 파생하는 **설명 WO**로 진행. 그다음 분류별 매장용 설명서 단계.
