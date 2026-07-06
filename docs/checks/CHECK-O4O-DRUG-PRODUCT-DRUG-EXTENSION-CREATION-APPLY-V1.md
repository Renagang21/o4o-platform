# CHECK-O4O-DRUG-PRODUCT-DRUG-EXTENSION-CREATION-APPLY-V1

Status: DONE — apply 완료·검증 통과 (2026-07-06, 승인 하)
Date: 2026-07-06
Scope: `WO-O4O-DRUG-PRODUCT-DRUG-EXTENSION-CREATION-V1` apply 실행. DRUG ProductMaster 177,413에 ProductDrugExtension를 보수 기본 정책값으로 create.

Related:

- `docs/work-orders/WO-O4O-DRUG-PRODUCT-DRUG-EXTENSION-CREATION-V1.md`
- `docs/checks/CHECK-O4O-DRUG-PRODUCT-DRUG-EXTENSION-CREATION-DRYRUN-V1.md`
- `docs/checks/CHECK-O4O-PRODUCT-DB-STRUCTURE-REFINEMENT-CHECK-A-V1.md`

---

## 1. 실행 (승인 하)

사용자 승인: rx/otc 구분 없이 전건 보수 기본값, create only, 임상 텍스트 미채움, 코드는 ProductIdentifier mirror, dry-run 재확인 후 count 불일치/mirror 이상 시 중단.

트랜잭션 원자 실행 — `INSERT ... SELECT` (identifier LATERAL pivot mirror) + 가드:
- dry-run 재확인 wouldCreate = **177,413** (≠ 시 abort)
- `GET DIAGNOSTICS` inserted = **177,413** (≠ 시 abort)
- 총 drug extension = **177,413** (≠ 시 abort)
- drug_code/mfds_code mirror 결측 = **0** (≠0 시 abort)
- drug_category NULL = **0** (≠0 시 abort)

→ 전 가드 통과 후 COMMIT.

## 2. 사후 검증

| 검증 | 기대 | 실측 |
| --- | --- | --- |
| ProductDrugExtension(DRUG) 총수 | 177,413 | **177,413** |
| drug_category mirror 일치 | 전건 | rx 119,548 / otc 57,572 / unspecified 293 **전건 master 일치** |
| 정책 기본값(단일 조합) | 177,413 | pharmacy_only=t · customer_display=f · online_sale=f · tablet=limited · ad_review=needs_review · public=blocked · verification=pending_review **전건** |
| 코드 mirror 정합(identifier와 불일치) | 0 | drug 0 · mfds 0 · insurance 0 · atc 0 |
| 부분 코드 null | — | insurance_null 112,721 · atc_null 451 · drug_code_null 0 · mfds_null 0 |
| 임상 텍스트 채움 | 0 | **0** (efficacy/dosage/caution 전건 null — 범위 준수) |

## 3. 결과

- **의약품 정책/mirror 계층(ProductDrugExtension) 177,413건 생성 완료.** 노출/광고/판매 전건 보수 차단, 검증 pending_review.
- 코드 mirror는 ProductIdentifier와 완전 정합(불일치 0). Identifier=SSOT, Extension=read-only mirror 계약(PROPOSAL 결정 1) 성립.
- 임상 텍스트는 미채움 — 후속 설명 파생 단계 대상.

## 4. 의약품 구조 정비 마감 상태 (참고)

| 계층 | 상태 |
| --- | --- |
| ProductMaster (DRUG) | 177,413 (Gate B 완료 + drug_unspecified 정제) |
| ProductIdentifier | KOREA_DRUG_CODE/MFDS_CODE 100%, ATC 99.7%, 보험 36% |
| RepresentativeProduct | 48,101 (MFDS_CODE 그룹핑, orphan 정리 완료) |
| **ProductDrugExtension** | **177,413 (본 apply — 정책/mirror 계층 완비)** |
| SharedProductDescription | 19,431 (11%, e약은요) — 설명 파생 확대 대상 |

## 5. 다음

- 설명 파생 확대 범위 결정 (e약은요 89% 미파생 / Extension 임상 텍스트 채움 여부).
- 잔여 drug_unspecified 293 후처리.
- orphan 백업 테이블 `_bak_orphan_representative_products_20260706` 안정 확인 후 정리.

## 6. write 범위

| 항목 | 결과 |
| --- | --- |
| product_drug_extensions create | 177,413 |
| 그 외 테이블 write | **0** |
| migration | 0 |
