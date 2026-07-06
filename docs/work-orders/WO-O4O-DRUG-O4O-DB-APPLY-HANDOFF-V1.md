# WO-O4O-DRUG-O4O-DB-APPLY-HANDOFF-V1

Status: HOLD — O4O 상품 DB 구조 정비 및 CHECK-A 재실측 완료 후 갱신 필요
Date: 2026-07-06
Scope: 의약품 공공/식약처 데이터를 O4O 상품 데이터베이스 구조에 맞춰 저장하는 1차 작업 지시서.

Related:

- `docs/investigations/PROPOSAL-O4O-PRODUCT-STRUCTURE-REFINEMENT-FOR-MFDS-PUBLIC-DATA-V1.md`
- `docs/checks/CHECK-O4O-DRUG-CANDIDATE-IMPORT-PIPELINE-V1.md`
- `docs/checks/CHECK-O4O-DRUG-SEED-CANDIDATE-APPLY-RUNBOOK-V1.md`
- `docs/checks/CHECK-O4O-DRUG-MASTER-PROMOTION-DRYRUN-DB-V1.md`
- `docs/checks/CHECK-O4O-DRUG-MASTER-PROMOTION-APPLY-BATCHING-V1.md`
- `docs/checks/CHECK-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-APPLY-V1.md`
- `docs/checks/CHECK-O4O-EASY-DRUG-INFO-CANDIDATE-TO-MASTER-DRUGEXTENSION-DESIGN-V1.md`

---

## 0. 에이전트에게 전달할 핵심

이 문서는 **O4O 상품 데이터베이스 구조 정비가 끝난 뒤** 실행한다.

주의:

- 이 문서의 수치는 과거 dry-run/부분 적용 전후 상태와 다를 수 있다.
- 의약품 Gate B가 부분 적용 또는 완료 상태일 수 있으므로, 이 문서를 그대로 실행하지 않는다.
- 먼저 `WO-O4O-PRODUCT-DB-STRUCTURE-REFINEMENT-HANDOFF-V1`의 CHECK-A read-only 실측을 수행한다.
- CHECK-A 결과로 현재 생성된 `ProductMaster`/`ProductIdentifier` 수와 남은 candidate 수를 확인한 뒤 이 문서를 갱신한다.

현재 전체 순서:

1. O4O 상품 DB 구조 정비
2. 의약품 데이터를 O4O DB에 저장
3. 분류별 매장용 설명서 제작
4. 매장 적용 작업

따라서 이 WO는 지금 바로 apply하지 않는다.

이번 작업의 기준은 **식약처/약가마스터 row가 아니라 O4O 상품 데이터 구조**다.

의약품 데이터는 다음 grain으로 저장한다.

| 계층 | grain | 역할 |
| --- | --- | --- |
| `ProductMaster` | 표준코드 1개 = 포장/SKU 1개 | O4O 상품 SSOT |
| `ProductIdentifier` | Master 1개에 여러 외부 코드 | 외부 코드 매칭/유일성 SSOT |
| `ProductDrugExtension` | Master 1개에 1개 | 의약품 표시/정책/상세 mirror |
| `RepresentativeProduct` | `MFDS_CODE` 기반 대표/설명 그룹 후보 | 다포장 묶음. apply는 실측/규칙 확정 전 금지 |
| `SharedProductDescription` | Master 기준 설명 후보/canonical | 설명 단계. 이번 저장 작업의 1차 대상 아님 |

핵심 원칙:

1. 약가마스터/식약처 데이터를 `ProductMaster`에 무조건 밀어 넣지 않는다.
2. O4O의 `ProductMaster` grain에 맞는 row만 승격한다.
3. 의약품 1차 저장은 `ProductMaster + ProductIdentifier`까지만 완료한다.
4. `RepresentativeProduct`, `SharedProductDescription`, 이미지, 매장 설명서는 후속 단계다.
5. `ProductIdentifier`가 코드 매칭 SSOT이고, `ProductDrugExtension`의 코드 컬럼은 read-only mirror다.

---

## 1. 현재까지 진행 상태

### 1.1 완료된 것

| 항목 | 상태 | 근거 |
| --- | --- | --- |
| 약가마스터 CSV 파싱/후보 적재 파이프라인 | 완료 | `CHECK-O4O-DRUG-CANDIDATE-IMPORT-PIPELINE-V1` |
| 운영 `ProductCandidate` 적재 | 완료 | `CHECK-O4O-DRUG-SEED-CANDIDATE-APPLY-RUNBOOK-V1` §9 |
| 운영 DB promotion dry-run | 완료 | `CHECK-O4O-DRUG-MASTER-PROMOTION-DRYRUN-DB-V1` |
| promotion apply 엔진 | 완료 | `CHECK-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-APPLY-V1` |
| apply 경로 배치화 | 완료 | `CHECK-O4O-DRUG-MASTER-PROMOTION-APPLY-BATCHING-V1` |

운영 DB dry-run 결과:

| 지표 | 값 |
| --- | ---: |
| candidate total | 305,522 |
| eligible | 230,841 |
| wouldCreate `ProductMaster` | 230,841 |
| wouldCreate `ProductIdentifier` | 703,483 |
| wouldLinkExistingMaster | 0 |
| conflict | 0 |
| skipped cancelled | 74,680 |
| skipped invalid check digit | 1 |

판단:

- 의약품 1차 저장은 게이트 B만 남아 있다.
- 충돌 정리 작업은 현재 dry-run 기준으로 필요 없다.
- 대량 write이므로 사전 백업과 명시 승인 없이는 apply하지 않는다.

### 1.2 아직 하지 않은 것

| 항목 | 상태 | 이유 |
| --- | --- | --- |
| `ProductMaster + ProductIdentifier` 운영 apply | 미실행 | 게이트 B 승인 필요 |
| `ProductDrugExtension` 대량 생성 | 미실행 | 1차 저장 이후 mirror/정책 단계 |
| `RepresentativeProduct` 그룹핑 apply | 미실행 | `MFDS_CODE` 제조사 혼입 규칙 확정 필요 |
| e약은요 기반 설명 후보 파생 | 미실행 | DB 저장 다음 단계 |
| 매장용 설명서 제작 | 미실행 | 분류별 설명 단계에서 진행 |

---

## 2. 이번 에이전트의 목표

의약품 데이터를 O4O DB에 저장하는 1차 목표는 다음이다.

```text
ProductCandidate(csv_import)
  -> ProductMaster
  -> ProductIdentifier
```

완료 상태:

- active 의약품 표준코드 230,841건이 `ProductMaster`로 생성 또는 기존 master에 link된다.
- 각 master에 필요한 `ProductIdentifier`가 생성된다.
- `ProductCandidate`는 승격 상태로 마킹된다.
- `RepresentativeProduct`, `SharedProductDescription`, `ProductDrugExtension`, `ProductImage`, offer/listing/store 계층은 생성하지 않는다.

---

## 3. 저장 정책

### 3.1 ProductMaster

| 필드 | 정책 |
| --- | --- |
| `barcode` | 약가마스터 표준코드. `barcode = standardCode`는 이미 채택된 정책 |
| `regulatoryType` | `DRUG` |
| `drugCategory` | 전문=`rx`, 일반=`otc`, 그 외=`drug_unspecified` |
| `regulatoryName` / `name` | 약가마스터 한글상품명 |
| `manufacturerName` | 약가마스터 업체명 |
| `mfdsProductId` | `HIRA:DRUG_MASTER:{standardCode}` |
| `mfdsPermitNumber` | V1에서는 `null` |
| `specification` | 약품규격/수량/제형/포장형태 fallback |
| `isMfdsVerified` | `true` |
| `mfdsSyncedAt` | source base date |
| `tags` | `import:hira-drug-master`, `batch:{importBatchId}`, `src:{sourceLabel}` |

주의:

- `ProductMaster.mfdsProductId`에 `MFDS_CODE`를 넣지 않는다.
- `MFDS_CODE`는 다포장/다제조사 그룹을 만들 수 있으므로 `ProductMaster`의 unique 슬롯에 직접 넣으면 안 된다.

### 3.2 ProductIdentifier

`ProductIdentifier`는 의약품 코드 매칭 SSOT다.

| identifier type | 값 | 생성 조건 |
| --- | --- | --- |
| `KOREA_DRUG_CODE` | 표준코드 | 모든 eligible master. primary |
| `MFDS_CODE` | 품목기준코드 | 값이 있으면 생성 |
| `KOREA_INSURANCE_CODE` | 제품코드/보험코드 | 값이 있으면 생성 |
| `ATC_CODE` | ATC 코드 | 값이 있으면 생성 |

예상 수:

| type | 예상 |
| --- | ---: |
| `KOREA_DRUG_CODE` | 230,841 |
| `MFDS_CODE` | 230,841 |
| `KOREA_INSURANCE_CODE` | 64,745 |
| `ATC_CODE` | 177,056 |
| 합계 | 703,483 |

원칙:

- 코드 매칭/조회는 `ProductIdentifier`를 본다.
- `ProductDrugExtension`의 코드 컬럼은 표시/정책/상세용 mirror다.
- identifier 충돌은 자동 병합하지 않는다.

### 3.3 ProductDrugExtension

이번 1차 apply에서는 `ProductDrugExtension`을 생성하지 않는다.

후속 단계에서 할 일:

- `ProductMaster.drugCategory`와 mirror되는 `drugCategory` 생성
- `drugCode`, `mfdsCode`, `insuranceCode`, `atcCode` mirror 채움
- 보수적 정책 기본값 유지
  - `pharmacyOnly = true`
  - `customerDisplayAllowed = false`
  - `onlineSaleAllowed = false`
  - `publicDisplayPolicy = blocked`
  - `advertisingReviewStatus = needs_review`

설명 텍스트는 이 단계의 목표가 아니다.

### 3.4 RepresentativeProduct

이번 1차 apply에서는 `RepresentativeProduct` grouping apply를 하지 않는다.

이유:

- `MFDS_CODE`는 대표상품 그룹핑 후보지만 제조사 혼입 약 7~8% 리스크가 있다.
- 그룹핑 key를 `MFDS_CODE` 단독으로 할지 `(MFDS_CODE, manufacturer)`로 분기할지 CHECK-A/실측 기준으로 확정해야 한다.

후속 원칙:

- `MFDS_CODE` 1개 + 제조사 1개: 자동 그룹핑 후보
- `MFDS_CODE` 1개 + 제조사 다수: 자동 apply 금지, 검토 또는 제조사 분리

### 3.5 SharedProductDescription / 매장 설명

이번 작업에서 설명서는 만들지 않는다.

후속 순서:

1. 의약품 `ProductMaster + ProductIdentifier` 저장 완료
2. 의약품 `ProductDrugExtension` mirror/정책 정리
3. e약은요/MFDS 설명 후보를 `SharedProductDescription` 또는 별도 정책에 따라 파생
4. 매장용 설명서는 분류별 설명 단계에서 별도 진행

처방약 설명/매장 노출은 보류 정책을 따른다.

---

## 4. 실행 순서

### Step 0. 문서/코드 기준 확인

먼저 아래 문서를 읽는다.

1. `PROPOSAL-O4O-PRODUCT-STRUCTURE-REFINEMENT-FOR-MFDS-PUBLIC-DATA-V1.md`
2. `CHECK-O4O-DRUG-SEED-CANDIDATE-APPLY-RUNBOOK-V1.md`
3. `CHECK-O4O-DRUG-MASTER-PROMOTION-DRYRUN-DB-V1.md`
4. `CHECK-O4O-DRUG-MASTER-PROMOTION-APPLY-BATCHING-V1.md`
5. `CHECK-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-APPLY-V1.md`

코드 기준 파일:

- `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts`
- `apps/api-server/src/modules/neture/entities/ProductIdentifier.entity.ts`
- `apps/api-server/src/modules/neture/entities/ProductDrugExtension.entity.ts`
- `apps/api-server/src/modules/neture/drug-import/drug-master-promotion-apply.db.ts`
- `apps/api-server/src/modules/neture/drug-import/drug-master-promotion-apply.service.ts`
- `apps/api-server/src/drug-seed-promotion-apply-job.ts`

### Step 1. 운영 DB read-only 재확인

게이트 B 전, 기존 dry-run 수치를 재확인한다.

필수 확인:

- candidate total = 305,522인지
- eligible = 230,841인지
- conflict = 0인지
- 기존 `product_masters`/`product_identifiers` 수가 예상과 크게 달라졌는지
- `ProductMaster`/`ProductIdentifier`에 이미 의약품 seed가 적용된 흔적이 있는지

주의:

- read-only SELECT만 허용한다.
- DB credential materialization은 사용자 승인 없이 하지 않는다.
- write는 절대 하지 않는다.

### Step 2. 게이트 B 승인 요청

승인 문구:

```text
promotion dry-run 리포트(wouldCreate/link/conflict 수치)를 확인했다.
eligible 230,841건을 product_masters + product_identifiers로 승격 apply 한다.
백업 id ____ 확인함.
운영 ProductMaster/ProductIdentifier 대량 생성을 승인한다.
```

이 승인 전에는 apply 금지.

### Step 3. 운영 apply

승인 후에만 실행한다.

실행 채널:

- 권장: Cloud Run one-off job
- 대안: cloud-sql-proxy + 로컬 CLI

apply 대상:

- 생성: `product_masters`
- 생성: `product_identifiers`
- 갱신: `product_candidates` 승격 상태 마킹

apply 금지 대상:

- `representative_products`
- `shared_product_descriptions`
- `product_drug_extensions`
- `product_images`
- `supplier_product_offers`
- `organization_product_listings`
- store/local product 계층

### Step 4. apply 후 검증

필수 검증:

| 검증 | 기대 |
| --- | --- |
| 신규 `ProductMaster` 수 | 230,841 생성 또는 report와 일치 |
| 신규 `ProductIdentifier` 수 | 703,483 생성 또는 report와 일치 |
| `KOREA_DRUG_CODE` 중복 | 0 |
| `barcode` 중복 | 0 |
| conflict | 0 |
| candidate promoted count | eligible 수와 일치 |
| Rx/OTC/unspecified 분포 | dry-run과 일치 |

검증 SQL 결과와 apply report를 문서에 남긴다.

### Step 5. 완료 문서 작성

작업 완료 후 다음 CHECK 문서를 작성한다.

```text
docs/checks/CHECK-O4O-DRUG-O4O-DB-APPLY-V1.md
```

문서에 포함할 것:

- 실행 일시
- 실행 채널
- 백업 id
- 승인 문구
- apply report
- 생성/링크/스킵/충돌 건수
- 검증 SQL 결과
- 다음 단계 제안

---

## 5. 완료 기준

이번 WO는 다음 상태가 되면 완료다.

- `ProductMaster`에 active 의약품 SKU가 저장됨
- `ProductIdentifier`에 `KOREA_DRUG_CODE`, `MFDS_CODE`, `KOREA_INSURANCE_CODE`, `ATC_CODE`가 정책대로 저장됨
- candidate가 승격 상태로 마킹됨
- conflict가 없거나, conflict가 있으면 write 없이 report로 남김
- `ProductDrugExtension`, `RepresentativeProduct`, `SharedProductDescription`은 아직 만들지 않음
- 후속 작업을 위한 CHECK 문서가 작성됨

---

## 6. 후속 작업

의약품 O4O DB 저장 완료 후 다음 순서로 진행한다.

1. `ProductDrugExtension` mirror/정책 생성 WO
2. `RepresentativeProduct` 그룹핑 key 확정 및 apply WO
3. e약은요/MFDS 설명 후보 파생 WO
4. 이미지 복사/연결 WO
5. 분류별 매장용 설명서 단계

이 중 매장용 설명서는 이번 저장 작업의 범위가 아니다.

---

## 7. Claude Code 전달용 요약

```text
목표:
의약품 약가마스터/식약처 candidate를 O4O 상품 DB 구조 기준으로 ProductMaster + ProductIdentifier까지 승격한다.

기준:
식약처 row가 아니라 O4O ProductMaster grain이 기준이다.
ProductMaster 1건 = 표준코드 1개 = 포장/SKU 1개.
MFDS_CODE는 ProductMaster unique slot이 아니라 Identifier/DrugExtension/Representative grouping 축이다.

현재 상태:
- ProductCandidate 305,522건 적재 완료.
- 운영 DB promotion dry-run 완료: eligible 230,841, wouldCreateMaster 230,841, wouldCreateIdentifiers 703,483, conflict 0.
- apply 경로 배치화 완료.
- 운영 ProductMaster/Identifier apply는 아직 미실행.

해야 할 일:
1. 관련 CHECK/WO와 promotion apply 코드를 읽는다.
2. 운영 DB read-only dry-run/수치를 재확인한다.
3. 사용자에게 게이트 B 승인을 받는다.
4. 승인 후 ProductMaster + ProductIdentifier만 apply한다.
5. apply 후 검증 SQL과 report를 남긴다.
6. CHECK-O4O-DRUG-O4O-DB-APPLY-V1.md를 작성한다.

하지 말 것:
- ProductDrugExtension 생성 금지.
- RepresentativeProduct grouping apply 금지.
- SharedProductDescription/e약은요 설명 파생 금지.
- ProductImage/Offer/Listing/Store 계층 생성 금지.
- MFDS_CODE를 ProductMaster.mfdsProductId에 넣지 말 것.
- 승인 없이 운영 write 금지.
```
