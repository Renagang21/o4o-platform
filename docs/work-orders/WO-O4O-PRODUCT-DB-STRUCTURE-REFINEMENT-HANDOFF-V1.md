# WO-O4O-PRODUCT-DB-STRUCTURE-REFINEMENT-HANDOFF-V1

Status: READY FOR AGENT HANDOFF
Date: 2026-07-06
Scope: 식약처/공공데이터 적용 전에 O4O 상품 데이터베이스 구조를 먼저 정비한다.

Related:

- `docs/investigations/PROPOSAL-O4O-PRODUCT-STRUCTURE-REFINEMENT-FOR-MFDS-PUBLIC-DATA-V1.md`
- `docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md`
- `docs/investigations/CHECK-O4O-PRODUCT-IDENTIFIER-CORE-V1.md`
- `docs/investigations/CHECK-O4O-PRODUCT-DRUG-EXTENSION-PERSISTENCE-V1.md`
- `docs/checks/CHECK-O4O-DRUG-MASTER-PROMOTION-DRYRUN-DB-V1.md`
- `docs/work-orders/WO-O4O-DRUG-O4O-DB-APPLY-HANDOFF-V1.md`

---

## 0. 에이전트에게 전달할 핵심

이번 작업은 의약품 데이터를 저장하는 작업이 아니다.

먼저 O4O 상품 데이터베이스의 기준 구조를 정비한다.

운영 사실:

- 의약품 Gate B는 과거 dry-run 기준으로는 `230,841`건 승격 대상이었다.
- 최근 커밋에는 의약품 Gate B 재개/완료 기록도 있으므로, 현재는 부분 적용 상태이거나 완료 상태일 수 있다.
- 따라서 이번 WO의 첫 실행 스텝은 신규 apply가 아니라 **CHECK-A read-only 실측**이다.
- 기존 dry-run 숫자나 이전 apply WO의 숫자를 현재 운영 상태로 가정하지 않는다.

전체 순서:

1. **O4O 상품 DB 구조 정비**
2. 식약처/공공 데이터를 O4O DB에 적용
3. 분류별 매장용 설명서 제작
4. 매장 적용 작업

따라서 이번 WO에서 금지되는 것:

- 의약품 `ProductMaster` 대량 apply
- HFF `RepresentativeProduct` 대량 생성
- `SharedProductDescription` 구조 변경
- 매장용 설명서 생성
- store/QR/POP/tablet 적용 작업

---

## 1. 이번 정비의 목표

O4O 상품 DB 구조 정비의 목표는 다음 5개다.

| 목표 | 내용 | 성격 |
| --- | --- | --- |
| 1 | 코드 SSOT 명문화 | 문서/baseline 정비 |
| 2 | `RepresentativeProduct` 용도 확장 경계 정리 | 문서 + 필요 시 additive schema |
| 3 | HFF `STTEMNT_NO` master-less 앵커 정책 정리 | 문서 + 후속 WO |
| 4 | 설명 저장소 경계 정리 | 문서 + 후속 WO |
| 5 | 의약품 apply/HFF parser/설명 단계의 선후관계 고정 | 문서 + gate |

핵심 판단:

- `ProductMaster`는 상품/SKU/포장 단위 SSOT다.
- `ProductIdentifier`는 외부 코드 매칭/유일성 SSOT다.
- `ProductDrugExtension`은 의약품 표시/정책/상세 mirror다.
- `RepresentativeProduct`는 의약품 그룹핑과 HFF master-less anchor에 같이 쓰일 수 있으므로 구분자가 필요하다.
- `SharedProductDescription`은 master 기준 canonical 계약을 유지한다.
- HFF store explanation 후보는 `SharedProductDescription`에 섞지 않는다.

---

## 2. 선행 구조 판단

### 2.1 이미 구현된 구조

| 구조 | 현재 판단 |
| --- | --- |
| `ProductMaster` | 이미 O4O 상품 SSOT |
| `ProductIdentifier` | 이미 존재. `KOREA_DRUG_CODE`, `MFDS_CODE`, `KOREA_INSURANCE_CODE`, `ATC_CODE`, `UDI_DI` 수용 |
| `ProductDrugExtension` | 이미 존재. 의약품 정책/상세/표시 mirror 가능 |
| `RepresentativeProduct` | 이미 존재. 대표상품/콘텐츠 그룹 계층 |
| `SharedProductDescription` | 이미 존재. ProductMaster 기준 설명 후보/canonical |
| store-execution | 이미 존재. 매장별 QR/POP/태블릿 콘텐츠 계층 |

### 2.2 정비가 필요한 지점

| 지점 | 문제 | 정비 방향 |
| --- | --- | --- |
| 코드 이중저장 | `ProductIdentifier`와 `ProductDrugExtension`에 코드가 중복됨 | Identifier=SSOT, Extension=read-only mirror |
| 대표상품 구분자 | 의약품 group과 HFF anchor가 같은 `RepresentativeProduct`에 들어갈 수 있음 | `metadata.anchorType` 또는 `group_type` 명시 |
| HFF master-less | HFF `STTEMNT_NO`는 SKU가 아니어서 ProductMaster가 없음 | `RepresentativeProduct` anchor 우선 |
| 설명 저장소 | `SharedProductDescription.master_id`는 NOT NULL | HFF store explanation 후보는 별도 저장소 검토 |
| 매장 설명 | O4O 공식 후보와 내 매장 설명이 다름 | store-execution/copy-on-import 경계 재사용 |

---

## 3. 이번 WO에서 실제로 할 일

### Step 0. CHECK-A read-only 실측

구조 정비의 첫 작업은 운영 DB 현재 상태를 read-only로 확인하는 것이다.

목적:

- 의약품 Gate B 부분 적용 상태 확인
- `ProductMaster` / `ProductIdentifier` / `ProductDrugExtension` / `RepresentativeProduct` / `SharedProductDescription` 연결률 확인
- `MFDS_CODE`별 master/제조사 분포 확인
- 대표상품 grouping apply 금지/분기 근거 확보

필수 수치:

| 항목 | 목적 |
| --- | --- |
| `regulatory_type='DRUG'` ProductMaster 수 | 의약품 승격 진행률 확인 |
| `KOREA_DRUG_CODE` identifier 수 | 표준코드 승격/연결률 확인 |
| `MFDS_CODE` identifier 수 | 허가 단위 코드 연결률 확인 |
| `KOREA_INSURANCE_CODE` identifier 수 | 보험/제품코드 연결률 확인 |
| `ATC_CODE` identifier 수 | ATC 연결률 확인 |
| `ProductDrugExtension` 생성률 | extension mirror 진행 여부 확인 |
| `representativeProductId` 연결률 | 대표상품 apply 여부 확인 |
| `SharedProductDescription` 생성률 | 설명 후보 파생 여부 확인 |
| `MFDS_CODE`별 distinct manufacturer 분포 | grouping key 결정 근거 |

주의:

- SELECT만 수행한다.
- DB credential materialization은 사용자 승인 없이 하지 않는다.
- 부분 적용/완료 상태가 확인되면 신규 apply를 진행하지 말고 현황 CHECK 문서부터 작성한다.

결과물:

```text
docs/checks/CHECK-O4O-PRODUCT-DB-STRUCTURE-REFINEMENT-CHECK-A-V1.md
```

### Step 1. baseline 문서 정비

`docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md`를 최신 구조 결정에 맞게 보강한다.

반영할 내용:

- `ProductIdentifier` = 외부 코드 매칭/유일성 SSOT
- `ProductDrugExtension` 코드 컬럼 = 표시/정책/상세용 read-only mirror
- `barcode = 의약품 표준코드`는 의약품에서 이미 채택된 정책
- `MFDS_CODE`는 `ProductMaster.mfdsProductId`에 넣지 않음
- `MFDS_CODE`는 Identifier/DrugExtension/Representative grouping 축
- 설명은 B2B/B2C/매장 설명용으로 분리
- 매장 설명용 O4O 공식 후보와 내 매장 설명은 분리

결과물:

- baseline patch
- 변경 요약

### Step 2. `RepresentativeProduct` 구분자 결정

의약품 대표상품과 HFF master-less anchor가 같은 테이블에 섞이므로 구분자가 필요하다.

검토안:

| 방식 | 장점 | 단점 |
| --- | --- | --- |
| `metadata.anchorType` | migration 없이 가능 | 쿼리/검증이 약함 |
| `group_type` nullable 컬럼 | 명확하고 쿼리 쉬움 | additive migration 필요 |

에이전트 판단 원칙:

- 대량 HFF anchor를 만들기 전에 구분자는 반드시 있어야 한다.
- 당장 schema 변경이 부담되면 `metadata.anchorType`를 baseline 계약으로 고정한다.
- 대량 조회/운영 화면/집계가 필요하면 `group_type` nullable additive 컬럼을 권고한다.

이번 WO의 산출:

- `metadata.anchorType`만으로 갈지, `group_type` 컬럼을 추가할지 결정 보고
- `group_type`을 추가한다면 entity + migration + 최소 테스트

권장 값:

| anchor type | 의미 |
| --- | --- |
| `drug_group` | 의약품 `MFDS_CODE` 기반 대표상품 그룹 |
| `hff_sttemnt` | 건강기능식품 `STTEMNT_NO` 기반 master-less anchor |
| `manual` | 운영자/수동 대표상품 |

### Step 3. `SharedProductDescription` 보호

`SharedProductDescription`은 현재 master 기준 canonical/candidate 설명 저장소다.

이번 WO에서는 다음을 명확히 한다.

- `SharedProductDescription.masterId`를 nullable로 바꾸지 않는다.
- `representativeProductId`를 임의로 추가하지 않는다.
- HFF store explanation 후보를 이 테이블에 섞지 않는다.
- 이 테이블은 의약품/e약은요 등 master가 있는 설명 후보/canonical 흐름에 남긴다.

결과물:

- 문서 명문화
- 필요 시 엔티티 주석 보강

### Step 4. HFF store explanation 후보 저장소는 설계만 고정

HFF 공식 텍스트 파서 dry-run 전에는 후보 테이블 컬럼을 확정하지 않는다.

이번 WO에서는 다음까지만 한다.

- 우선 후보명: `RepresentativeStoreExplanationCandidate`
- anchor: `representativeProductId`
- source type 후보: `mfds_hff`
- 기본 status: `needs_review`
- content/sections schema는 parser dry-run 이후 확정
- `descriptionPurpose`는 전용 테이블이면 만들지 않음

금지:

- parser dry-run 전 테이블 migration 확정
- HFF candidate 44,885건 대량 anchor 생성
- 매장용 설명 자동 생성/게시

### Step 5. 후속 gate 정리

구조 정비가 끝나면 다음 WO들이 순서대로 진행된다.

| 순서 | 후속 작업 | 비고 |
| --- | --- | --- |
| 1 | 의약품 O4O DB apply 또는 부분적용 복구/완료 | CHECK-A 결과로 현재 상태 확인 후 `WO-O4O-DRUG-O4O-DB-APPLY-HANDOFF-V1` 갱신 |
| 2 | 의약품 `ProductDrugExtension` mirror/정책 생성 | 설명은 아직 아님 |
| 3 | 의약품 `RepresentativeProduct` grouping 실측/적용 | `MFDS_CODE` 제조사 혼입 규칙 필요 |
| 4 | HFF 공식 텍스트 parser dry-run | 저장소 sections 확정 근거 |
| 5 | HFF representative anchor + store explanation 후보 저장소 | parser 결과 반영 |
| 6 | 분류별 매장용 설명서 | 의료기기/HFF 우선 검토, 처방약/의약외품 보류 |

---

## 4. 이번 WO에서 하지 말 것

- 의약품 `ProductMaster`/`ProductIdentifier` 대량 생성
- `ProductDrugExtension` 대량 생성
- `RepresentativeProduct` grouping apply
- HFF `RepresentativeProduct` anchor 대량 생성
- `RepresentativeStoreExplanationCandidate` 테이블을 parser dry-run 없이 확정
- `SharedProductDescription`의 master 계약 변경
- 매장 설명/QR/POP/태블릿 적용
- 운영 DB write

운영 DB가 필요하면 read-only SELECT만 수행한다.

---

## 5. 완료 기준

이번 WO는 아래 상태가 되면 완료다.

- baseline에 코드 SSOT와 설명 3종 분리, 매장 설명 경계가 반영됨
- CHECK-A read-only 실측 결과가 문서화됨
- 의약품 Gate B 부분 적용 여부가 확인됨
- `RepresentativeProduct` 구분자 정책이 결정됨
- `group_type` 컬럼을 추가할지, `metadata.anchorType`만 사용할지 결정됨
- `SharedProductDescription`을 보호한다는 계약이 명문화됨
- HFF store explanation 후보 저장소는 parser dry-run 뒤 확정한다는 gate가 명문화됨
- 의약품 apply WO가 구조 정비 완료 전까지 HOLD임이 문서화됨

---

## 6. Claude Code 전달용 요약

```text
목표:
의약품/HFF/의료기기/의약외품 공공데이터를 넣기 전에 O4O 상품 DB 구조를 먼저 정비한다.

지금 하지 말 것:
- 의약품 ProductMaster apply
- HFF anchor 대량 생성
- SharedProductDescription 구조 변경
- 매장 설명 생성

해야 할 일:
1. 먼저 CHECK-A read-only 실측을 수행한다.
   - 의약품 Gate B 부분 적용 상태를 확인한다.
   - ProductMaster/Identifier/DrugExtension/Representative/Description 연결률을 확인한다.
   - MFDS_CODE별 제조사 혼입 분포를 확인한다.
2. PROPOSAL-O4O-PRODUCT-STRUCTURE-REFINEMENT-FOR-MFDS-PUBLIC-DATA-V1.md를 기준으로 baseline을 갱신한다.
3. ProductIdentifier=코드 매칭 SSOT, ProductDrugExtension=표시/정책 mirror를 명문화한다.
4. 의약품 barcode=표준코드는 이미 채택된 정책으로 문서화한다.
5. MFDS_CODE는 ProductMaster.mfdsProductId가 아니라 Identifier/DrugExtension/Representative grouping 축임을 문서화한다.
6. RepresentativeProduct에 drug_group과 hff_sttemnt를 구분할 수 있는 정책을 결정한다.
   - metadata.anchorType만 쓸지
   - nullable group_type 컬럼을 추가할지 판단한다.
7. SharedProductDescription은 master 기준 canonical 계약을 유지하고, HFF store explanation 후보를 섞지 않는다.
8. HFF RepresentativeStoreExplanationCandidate는 parser dry-run 후 테이블 스키마를 확정하도록 gate를 건다.
9. 의약품 apply WO는 CHECK-A 결과 반영 전까지 HOLD 유지한다.

산출물:
- CHECK-A read-only 실측 문서
- baseline 문서 patch
- 필요 시 RepresentativeProduct group_type additive migration/entity patch
- 완료 CHECK 문서: CHECK-O4O-PRODUCT-DB-STRUCTURE-REFINEMENT-V1.md

주의:
운영 DB write 금지. 필요하면 read-only SELECT만 수행한다.
```
