# PROPOSAL-O4O-PRODUCT-STRUCTURE-REFINEMENT-FOR-MFDS-PUBLIC-DATA-V1

Status: REVISED DECISION DRAFT  
Date: 2026-07-06  
Scope: O4O 상품 데이터 구조 정비. HFF 식약처 공식 텍스트를 담기 위한 master-less 설명 앵커 포함. 소비자 화면/버튼 UX는 후속 범위.

Related assessment:

- `IR-O4O-PRODUCT-STRUCTURE-REFINEMENT-ASSESSMENT-V1`

---

## 0. 목표

이 문서의 목표는 **O4O 상품 데이터 구조를 먼저 정비**하는 것이다.

이번 단계에서 다룬다:

1. 이미 구현된 O4O 상품 구조 확인
2. 의약품 코드 저장 위치와 SSOT 결정
3. `RepresentativeProduct` 그룹핑 기준 결정
4. 건강기능식품 내부 식별자와 `STTEMNT_NO` 구조 결정
5. ProductMaster가 없는 HFF 공식 텍스트/설명 앵커 결정
6. 이후 CHECK/WO 순서 정리

이번 단계에서 다루지 않는다:

- 소비자 화면 UX
- 공식정보 버튼 UI
- 매장용 설명 콘텐츠 제작
- 최종 문구/광고 검수 정책

주의:

- HFF 설명 문구 생성과 소비자 노출 정책은 후속 범위다.
- 그러나 **HFF 식약처 공식 텍스트를 어디에 저장하고 어떤 대상에 연결할지**는 상품 데이터 구조 정비의 본범위다.
- 현재 `SharedProductDescription`과 `ProductDrugExtension`은 `ProductMaster`에 묶여 있어, ProductMaster가 없는 HFF candidate에는 직접 사용할 수 없다.
- 상품에 연결되는 설명은 B2B용, B2C용, 매장 설명용 3가지로 분리한다.
- 지금 논의하는 HFF 식약처 공식 텍스트 기반 설명은 **매장 설명용**이다.
- O4O 공신 데이터베이스의 매장 설명용 후보와, 실제 매장이 QR-code/POP/태블릿에 사용하는 매장별 설명은 분리한다.
- 매장은 O4O 설명 후보를 가져와 복사한 뒤 수정할 수 있으며, 이 복사본은 O4O 공신 데이터베이스와 독립된 내 매장 콘텐츠다.

---

## 1. 결론 요약

기존 제안서의 큰 방향, 즉 `ProductMaster`를 억지로 키우지 않고 `RepresentativeProduct`와 도메인 extension을 활용한다는 방향은 맞다.

다만 Claude Code 평가 기준으로 보면, 이 3계층 구조는 이미 구현되어 있다. 따라서 지금 필요한 것은 새 구조 신설 전제의 반복이 아니라 **미결 결정 4개를 정리하고 실측/파서 dry-run으로 확인하는 것**이다.

| 결정 | 내용 | 상태 |
| --- | --- | --- |
| 결정 1 | 코드 이중저장 SSOT 명문화 | 필요 |
| 결정 2 | `RepresentativeProduct` 그룹핑 키 확정 | 실측 필요 |
| 결정 3 | 건강기능식품 내부 identifier / `STTEMNT_NO` 구조 설계 | 필요 |
| 결정 4 | ProductMaster 없는 HFF 공식 텍스트/설명 앵커 일반화 | 신규 필요 |

우선순위:

1. 의약품 구조는 새로 만들지 않는다. 이미 있는 구조를 기준으로 정합성만 정리한다.
2. `ProductIdentifier`를 외부 코드 매칭/유일성 SSOT로 둔다.
3. `ProductDrugExtension`은 의약품 표시/정책/상세 mirror로 둔다.
4. 의약품 `RepresentativeProduct` apply는 `MFDS_CODE` 오염율 실측 전까지 금지한다.
5. HFF는 `STTEMNT_NO` 신고 단위가 SKU가 아니므로 ProductMaster 승격 없이도 담을 앵커가 필요하다.
6. HFF 공식 텍스트/설명 앵커는 `RepresentativeProduct`를 우선 후보로 둔다.
7. 소비자 화면과 버튼 UX는 이 뒤의 후속 단계다.

---

## 2. 이미 구현된 구조

| 구조 | 실제 코드 상태 | 판단 |
| --- | --- | --- |
| `ProductMaster` | 상품/SKU/포장 단위 SSOT | 유지 |
| `ProductIdentifier` | `KOREA_DRUG_CODE`, `MFDS_CODE`, `KOREA_INSURANCE_CODE`, `ATC_CODE`, `UDI_DI` 지원 | 외부 코드 수용 계층으로 이미 구현됨 |
| `ProductDrugExtension` | 의약품 코드, 효능/용법/주의/저장, 노출/광고/판매 정책 컬럼 존재 | 의약품 extension은 이미 구현됨 |
| `RepresentativeProduct` | 대표상품/콘텐츠 그룹 계층, `metadata jsonb`, `ProductMaster.representativeProductId` 존재 | 의약품 그룹핑/HFF master-less 앵커 후보 |
| `SharedProductDescription` | `ProductMaster` 기준 candidate/canonical 설명 구조 존재, `master_id NOT NULL` | 기존 canonical 계약 보호. HFF store explanation 후보 저장소로 직접 확장하지 않음 |
| store-execution 계층 | 매장 실행 콘텐츠, QR/POP/태블릿 copy-on-import 흐름 존재 | 매장별 설명 사용 계층으로 재사용 |
| HFF Extension | 없음 | 필요 시 `RepresentativeProduct` 앵커 우선 |

따라서 이 문서는 "위 구조를 만들자"가 아니라 "위 구조를 기준으로 아직 모호한 결정을 끝내자"는 문서다.

---

## 3. 정정: 낡은 판단 제거

### 3.1 `barcode = 표준코드`는 재검토 대상이 아니다

기존 초안에는 `ProductMaster.barcode`에 의약품 표준코드를 직접 넣는 것을 재검토 또는 보류처럼 표현한 부분이 있었다. 이 표현은 제거한다.

현재 판단:

- 약가마스터 dry-run에서 active 표준코드 대부분이 GTIN-13 check digit을 통과한 것으로 확인되었다.
- 현재 promotion apply는 `barcode = standardCode`로 구현되어 있다.
- 따라서 의약품에서 `barcode = 표준코드`는 정책 불일치가 아니라 **이미 채택된 정책**으로 본다.

남은 일:

- 이 결정이 baseline/WO/CHECK 문서에 충분히 남아 있는지 확인한다.

### 3.2 공공데이터 직접 승격 금지는 새 원칙이 아니다

기존 초안에는 "공공데이터 row를 ProductMaster로 바로 승격하지 않는다"는 원칙을 새 경고처럼 썼다.

현재 판단:

- 이 원칙은 맞다.
- 그러나 이미 `ProductCandidate → Gate A → Gate B promotion` 흐름으로 구현되어 있다.
- 따라서 새 구조 제안이 아니라 기존 gate 원칙의 재확인으로만 둔다.

---

## 4. 결정 1: 코드 이중저장 SSOT

### 4.1 문제

의약품 코드는 두 계층에 중복 저장된다.

| 코드 | `ProductIdentifier` | `ProductDrugExtension` |
| --- | --- | --- |
| 표준코드 | `KOREA_DRUG_CODE` | `drugCode` |
| 품목기준코드 | `MFDS_CODE` | `mfdsCode` |
| 보험/제품코드 | `KOREA_INSURANCE_CODE` | `insuranceCode` |
| ATC | `ATC_CODE` | `atcCode` |

이중 저장 자체는 허용한다. 문제는 어느 쪽이 기준인지 명문화되지 않으면 값이 갈라질 때 정합성이 깨진다는 점이다.

### 4.2 결정안

| 용도 | 기준 |
| --- | --- |
| 외부 코드 매칭 | `ProductIdentifier` |
| 유일성/충돌 판단 | `ProductIdentifier` |
| 코드 검색 | `ProductIdentifier` |
| 의약품 표시/정책 | `ProductDrugExtension` |
| 효능/용법/주의/저장 텍스트 | `ProductDrugExtension` |
| 광고/노출/판매 제한 | `ProductDrugExtension` |

정리:

- `ProductIdentifier` = 매칭/유일성 SSOT
- `ProductDrugExtension` = 도메인 표시/정책/상세 저장소
- `ProductDrugExtension`의 코드 컬럼 = read-only mirror

### 4.3 동기화 원칙

1. 코드 매칭 로직은 `ProductIdentifier`를 본다.
2. `ProductDrugExtension`의 코드 컬럼만 바꿔 매칭 결과를 바꾸지 않는다.
3. mirror 값이 다르면 `ProductIdentifier`를 우선한다.
4. mismatch는 자동 덮어쓰기보다 `needs_review` 또는 audit log 대상으로 둔다.

---

## 5. 결정 2: RepresentativeProduct 그룹핑 키

### 5.1 문제

의약품에서 `MFDS_CODE`는 설명/허가 그룹 후보로 자연스럽다. 하지만 `MFDS_CODE = RepresentativeProduct 1개`로 단순화하면 위험하다.

이유:

- 기존 조사와 엔티티 주석상 동일 `MFDS_CODE`에 여러 제조사가 섞이는 케이스가 약 7~8% 존재한다.
- 대표상품은 콘텐츠/대표 노출/설명 연결의 기준이므로 제조사 혼입 케이스를 자동 단일화하면 오염이 생긴다.

### 5.2 결정 전 원칙

`RepresentativeProduct` grouping apply는 실측 전까지 금지한다.

실측해야 할 것:

- `MFDS_CODE`별 ProductMaster 수
- `MFDS_CODE`별 제조사 수
- 제조사 혼입 비율
- 이미 연결된 `representativeProductId` 비율
- `ProductDrugExtension` 생성률
- `SharedProductDescription` 생성률

### 5.3 권장 후보 규칙

| 케이스 | 처리 후보 |
| --- | --- |
| `MFDS_CODE` 1개 + 제조사 1개 | `MFDS_CODE` 기준 대표상품 자동 생성 가능 |
| `MFDS_CODE` 1개 + 제조사 다수 | 자동 apply 금지 |
| 제조사 다수이나 제품명이 사실상 동일 | `(MFDS_CODE, manufacturer)` 분리 또는 운영자 검토 |
| 제품명/제조사/성분 오염 의심 | `review_required` |

후보 group key:

```text
drug:mfds:{MFDS_CODE}
drug:mfds:{MFDS_CODE}:mfr:{normalizedManufacturer}
```

두 번째 키는 제조사 혼입 케이스에 한해 검토한다.

---

## 6. 결정 3: 건강기능식품 내부 식별자 / STTEMNT_NO 구조

### 6.1 현재 판단

건강기능식품의 현재 원천 grain은 `STTEMNT_NO` 품목제조신고 단위로 본다. 이 값은 SKU/barcode 단위가 아니므로 `ProductMaster` 직접 승격 기준이 아니다.

HFF는 먼저 상품 데이터 구조에 어떻게 담을지를 정해야 한다.

이번 단계에서 결정할 것:

- HFF `ProductCandidate`에 남길 원천 필드
- `ProductMaster` 승격 조건
- HFF용 내부 identifier type
- HFF 원천 row를 `RepresentativeProduct`로 승격/연결할지
- HFF 원천 row가 상품/SKU 단위인지, 신고/제품 단위인지 구분

이번 단계에서 하지 않을 것:

- 소비자용 문구 생성
- 소비자 화면 문구 생성
- 공식정보 버튼 UI 구현
- 공식 원문 패널 UX 결정

### 6.2 내부 식별자 원칙

`품목제조관리번호`, `품목제조신고번호`, `STTEMNT_NO` 같은 값은 소비자용 정보가 아니라 내부 매칭/출처 관리용 식별자다.

다만 상품 데이터 구조에는 이런 내부 식별자가 필요할 수 있다.

identifier type 후보:

| 후보 | 의미 | 비고 |
| --- | --- | --- |
| `MFDS_STTEMNT_NO` | 품목제조신고번호 의미를 직접 드러내는 내부 식별자 | 우선 후보. 기존 HFF Gate 문서와 정합 |
| `MFDS_HFF_INGREDIENT_CODE` | 기능성 원료 인정번호 | 원료 단위. ProductMaster 직접 매칭용 아님 |

결정 필요:

- HFF 신고번호는 `MFDS_STTEMNT_NO`로 둘지 최종 확인
- `MFDS_CODE`를 재사용하지 않는다는 원칙 유지
- 기능성 원료 코드는 ProductMaster 식별자라기보다 extension/reference 성격인지
- ProductMaster가 없는 representative-only HFF에도 identifier를 붙일 방법을 둘지, 우선 `RepresentativeProduct.metadata.sttemntNo`로 보존할지

권고:

- Gate B에서 ProductMaster가 생기는 경우에만 `ProductIdentifier(MFDS_STTEMNT_NO)`를 생성한다.
- ProductMaster가 없는 현재 HFF 공식 텍스트/설명 구조에서는 `RepresentativeProduct.metadata.sttemntNo`를 우선 사용한다.

---

## 7. 결정 4: master-less 설명 앵커 일반화

### 7.1 문제

HFF는 ProductMaster 승격이 장기간 HOLD 상태다. 이유는 barcode/GTIN/포장 SKU와 유효상태 원천이 부족하기 때문이다.

하지만 식약처 HFF candidate에는 공식 텍스트가 이미 들어 있다.

대표 원천 필드:

- `MAIN_FNCTN`: 기능성
- `SRV_USE`: 섭취방법
- `INTAKE_HINT1`: 섭취 시 주의사항
- `PRSRV_PD`: 보관
- `SUNGSANG`: 성상
- `BASE_STANDARD`: 기준규격

문제는 현재 설명 저장소가 master 앵커라는 점이다.

| 구조 | 현재 앵커 | HFF candidate에 사용 가능 여부 |
| --- | --- | --- |
| `SharedProductDescription` | `master_id NOT NULL` | ProductMaster 없으면 불가 |
| `ProductDrugExtension` | `product_master_id UNIQUE` | HFF에 직접 불가 |
| 기존 HFF 설명 WO들 | master 없음으로 DB 저장 회피 | 구조 한계 재확인 |

따라서 HFF 설명/공식 텍스트를 식약처 기반으로 만들려면, 설명의 앵커를 `ProductMaster`에서 `RepresentativeProduct`까지 일반화해야 한다.

### 7.2 설명 3종 분리

상품에 연결되는 설명은 하나가 아니다.

| 설명 종류 | 목적 | 주 사용자/채널 | 이번 문서에서의 위치 |
| --- | --- | --- | --- |
| B2B용 설명 | 공급/거래/주문 판단 보조 | 공급자, 사업자, 운영자 | 별도 축. 이번 HFF 논의 대상 아님 |
| B2C용 설명 | 온라인 판매/소비자 구매 판단 보조 | 외부 소비자, 온라인 판매 화면 | 별도 축. 광고/표시 검수 강함 |
| 매장 설명용 | 매장 안에서 상담, 진열, QR, 태블릿, 약사/매장 안내 보조 | 매장 경영자, 매장 직원, 매장 방문 고객 | **이번 HFF 논의 대상** |

따라서 이 문서의 master-less 설명 앵커는 B2B/B2C 전체 설명 모델을 한 번에 바꾸자는 뜻이 아니다.

정확한 범위:

- HFF 식약처 공식 텍스트를 기반으로 한 **매장 설명용 공식 후보**를 어디에 저장할지 결정한다.
- B2B/B2C 설명은 기존 offer/listing/commerce 흐름과 분리해 후속 검토한다.
- 같은 원천 텍스트를 쓰더라도 용도별 상태와 검수 정책은 분리한다.

### 7.3 O4O 설명 후보와 내 매장 설명의 경계

매장 설명용이라고 해서 모두 O4O 공신 데이터베이스에 저장되는 것은 아니다.

두 계층을 분리한다.

| 계층 | 소유/역할 | 저장 성격 | QR/POP/태블릿 사용 |
| --- | --- | --- | --- |
| O4O 매장 설명용 후보 | O4O 공신 데이터베이스 | 공통 후보, 공식 원천 기반, 검수 전/후 상태 보유 | 매장이 그대로 사용하거나 복사/참조할 수 있는 원천 |
| 내 매장 설명 | 개별 매장 | 매장이 선택·수정·확정한 설명. 공식 설명 그대로 사용, 공식 설명 복사 후 수정, 매장 자체 작성 모두 포함 | 실제 QR-code, POP, 태블릿에 사용 |

원칙:

1. O4O는 식약처/공식 원천 기반의 매장 설명용 후보를 만든다.
2. 매장은 O4O 공식 설명을 그대로 사용할 수 있다.
3. 매장은 O4O 공식 설명을 가져와 자기 매장 설명으로 복사한 뒤 수정할 수 있다.
4. 매장은 O4O 공식 설명과 무관하게 자체 설명을 만들 수도 있다.
5. 매장 수정본 또는 자체 작성본은 O4O 공신 데이터베이스를 변경하지 않는다.
6. QR-code, POP, 태블릿은 O4O 공신 설명 테이블을 직접 보는 것이 아니라 **매장이 선택한 설명/콘텐츠**를 사용한다.
7. 매장이 선택한 설명은 "O4O 공식 설명 그대로 사용"일 수도 있고, "매장 수정본/자체 작성본"일 수도 있다.
8. 내 매장 작업에서 이 경계를 놓치면, 공신 데이터와 매장 운영 콘텐츠가 섞이는 문제가 생긴다.

후속 내 매장 작업에서 확인할 것:

- HFF/O4O 매장 설명용 후보를 기존 store-execution copy-on-import 계보로 가져오는 흐름
- 복사 후 수정본의 저장 위치
- O4O 공식 설명을 복사하지 않고 그대로 선택해 사용하는 흐름
- 매장 자체 작성 설명을 새로 만드는 흐름
- 매장별로 현재 선택된 설명의 origin/source 구분: `o4o_official`, `store_copy_modified`, `store_custom`
- QR-code, POP, 태블릿이 참조하는 설명 ID
- 원본 O4O 설명 후보가 변경되어도 매장 복사본을 자동 변경하지 않는 원칙
- 매장이 원할 때 새 버전을 다시 가져오는 수동 갱신 흐름

### 7.4 결정안

HFF `STTEMNT_NO` 신고품목은 `RepresentativeProduct` 1개로 받는 것을 우선 후보로 둔다.

```text
HFF STTEMNT_NO
  -> RepresentativeProduct
  -> representative-targeted official description / structured text
```

판단:

- `RepresentativeProduct`는 주문/SKU 단위가 아니다.
- `ProductMaster` 멤버가 0개여도 대표/콘텐츠/소비자 안내 그룹으로 존재할 수 있다.
- 따라서 master 없는 HFF 신고품목의 공식 텍스트를 담는 앵커로 적합하다.
- 이 앵커의 1차 설명 용도는 `store_explanation`이다.

주의:

- HFF 44,885건을 모두 앵커로 만들면 ProductMaster member가 0개인 `RepresentativeProduct`가 대량 생성된다.
- 기존 엔티티 주석상 `RepresentativeProduct`는 여러 SKU를 묶는 상위 노드로 설명되어 있으므로, HFF master-less anchor는 의미 확장이다.
- 이 확장은 금지는 아니지만 의도된 용법 확장임을 문서와 metadata에 명확히 남겨야 한다.
- 의약품 `MFDS_CODE` 그룹 대표상품과 HFF `STTEMNT_NO` anchor가 같은 테이블에 섞이므로 구분자가 필수다.

구분자 후보:

| 방식 | 설명 | 판단 |
| --- | --- | --- |
| `metadata.anchorType` | `drug_group`, `hff_sttemnt` 등으로 구분 | 1차 최소안 |
| `metadata.groupType` | 대표상품의 그룹 의미를 metadata에 저장 | 1차 최소안 대안 |
| `group_type` 명시 컬럼 | representative_products에 정식 컬럼 추가 | 대량 HFF anchor apply 시 우선 검토 |

권고:

- HFF 앵커 생성 시점에 `metadata.anchorType='hff_sttemnt'`를 반드시 저장한다.
- 의약품 대표상품에는 `metadata.anchorType='drug_group'` 또는 이에 준하는 값을 둔다.
- 대량 생성 전에 `group_type` 명시 컬럼 도입 여부를 별도 WO에서 판단한다.

### 7.5 매장 설명 후보 저장소 후보

현재 `SharedProductDescription.masterId`는 NOT NULL이고, 엔티티 의미도 ProductMaster 기준 canonical/candidate 설명 풀이다.

따라서 HFF 매장 설명용 후보를 `SharedProductDescription`에 섞는 것은 우선안에서 제외한다.

확장 후보:

| 방식 | 설명 | 판단 |
| --- | --- | --- |
| A. `SharedProductDescription`에 `representativeProductId` nullable 추가 | master 또는 representative 중 하나를 target으로 함 | 회귀 표면 큼. 우선 제외 |
| B. 별도 `RepresentativeStoreExplanationCandidate` 신설 | 대표상품 앵커의 매장 설명용 공식 후보 테이블 | 우선 검토 |
| C. HFF 전용 설명 테이블 신설 | HFF만 빠르게 처리 | 장기적으로 도메인별 파편화 위험 |
| D. ProductMaster를 임시 생성 | master 없는 문제를 우회 | 금지. Gate B HOLD 원칙 위반 |

권고:

- B를 1차 우선안으로 둔다.
- `SharedProductDescription`의 master 기준 canonical 계약과 partial unique/cascade 의미를 건드리지 않는다.
- HFF store explanation 후보는 대표상품 앵커의 별도 후보 테이블에 저장한다.
- 매장 실제 사용은 신규 후보 테이블이 아니라 기존 store-execution 계층으로 복사/선택한다.

필수 후보 필드:

| 필드 | 값 후보 | 이유 |
| --- | --- | --- |
| `representativeProductId` | uuid | HFF master-less 앵커 |
| `sourceType` | `mfds_hff`, `mfds_easy_drug`, `operator`, `ai` 등 | 출처 구분 |
| `status` | `candidate`, `needs_review`, `canonical`, `hidden`, `deprecated` | 검수 상태 |
| `content` / `sections` | text/jsonb | 구조화된 공식 텍스트 |
| `sourceRef` / `metadata` | jsonb | `STTEMNT_NO`, raw source, parser version |

이 테이블은 1차 목적이 store explanation 전용이므로 `descriptionPurpose` 컬럼은 필수는 아니다.

다만 나중에 같은 테이블이 B2B/B2C까지 겸하면 그때 `descriptionPurpose`를 추가한다.

### 7.6 저장 상태/검수 정책

HFF 공식 텍스트 기반 설명은 자동 게시하지 않는다.

권장 기본값:

| 항목 | 값 |
| --- | --- |
| `source_type` | `mfds_hff` 신규 |
| `status` | `needs_review` |
| 광고/표시 검토 | 미검수 |
| 소비자 노출 | 운영자 검수 전 차단 |

의약품 e약은요 파생 선례처럼, 공식 원문 기반 후보를 만들되 canonical/public 노출은 별도 검수 후 결정한다.

### 7.7 HFF Extension 재정의

이전 초안의 `ProductHealthFunctionalFoodExtension.productMasterId` 중심 설계는 HFF master-less 상황과 맞지 않는다.

다만 1차에서는 extension을 바로 만들지 않는다. HFF 공식 텍스트는 아직 parser dry-run 전의 rawPayload 단계이므로, 필드 구조를 먼저 확인해야 한다.

1차 기본안:

- `RepresentativeProduct.metadata.sttemntNo`
- `RepresentativeProduct.metadata.sourceDataset`
- `RepresentativeProduct.metadata.anchorType = 'hff_sttemnt'`
- HFF store explanation 후보 테이블의 `metadata`
- extension 없음

파서 dry-run 이후 extension이 필요하다고 판단되면 다음 후보를 검토한다.

```text
ProductHealthFunctionalFoodExtension
```

후보 필드:

| 필드 | 용도 | 이번 단계 판단 |
| --- | --- | --- |
| `representativeProductId` | RepresentativeProduct FK | 우선 앵커 후보 |
| `productMasterId` | ProductMaster FK | nullable 또는 후속 연결 후보 |
| `sttemntNo` | HFF 신고번호 mirror | 필요 |
| `functionalIngredientCodes` | 기능성 원료 인정번호 목록 | 후보 |
| `functionalClaims` | 공식 기능성 원문 | 보존 후보 |
| `intakeMethodText` | 섭취량/섭취방법 | 보존 후보 |
| `cautionText` | 섭취 시 주의사항 | 보존 후보 |
| `ingredientText` | 원재료 원문 | 보존 후보 |
| `nutritionFacts` | 영양성분 | 후보 |
| `dataSource` | 출처 | 필요 |
| `sourceUpdatedAt` | 원천 갱신일 | 필요 |
| `verificationStatus` | 검증 상태 | 필요 |
| `advertisingReviewStatus` | 표시/광고 검토 상태 | 필요 |

주의:

- extension은 ProductMaster에만 묶지 않는다.
- `representativeProductId` 중심으로 두고, 나중에 ProductMaster가 생기면 연결할 수 있게 한다.
- 1차는 `RepresentativeProduct.metadata` + representative-anchored store explanation 후보로 시작한다.

---

## 8. HFF 공식 텍스트 파서 / 설명 후보 생성 위치

HFF 공식 텍스트 파서 dry-run은 CHECK-C보다 더 직접적인 다음 작업이다.

기존 문서상 후보:

- `WO-O4O-HEALTH-FUNCTIONAL-FOOD-OFFICIAL-TEXT-PARSER-DRYRUN-V1`

재정의:

- "B2B/B2C 상품 설명 생성"이 아니라 `STTEMNT_NO` 대표상품 앵커에 붙일 **매장 설명용 공식 텍스트 구조화 dry-run**으로 본다.
- DB write 없이 rawPayload 필드 커버리지와 파싱 가능성을 확인한다.
- 저장소 스키마를 먼저 못 박지 않고, 파서 dry-run으로 필드 커버리지와 안정성을 확인한 뒤 결정한다.

필수 결과:

- `STTEMNT_NO`별 공식 텍스트 존재율
- `MAIN_FNCTN`, `SRV_USE`, `INTAKE_HINT1`, `PRSRV_PD`, `SUNGSANG`, `BASE_STANDARD` 커버리지
- 위험 문구 flag
- `status='needs_review'` 저장 후보 수
- store-explanation 후보 테이블에 필요한 최소 section schema

---

## 9. CHECK 재조정

| CHECK | 이전 목적 | 재조정 목적 |
| --- | --- | --- |
| CHECK-A | 구조 존재 여부 확인 | 대표상품 연결률, DrugExtension 생성률, MFDS_CODE당 master/제조사 분포 실측 |
| CHECK-B | barcode 정책 불일치 조사 | `barcode=표준코드` 결정의 문서 정합성 확인 + representative/extension apply 미실행 범위 확인 |
| CHECK-C | HFF API grain 조사 | 일부는 이미 결론 있음. `STTEMNT_NO=신고단위≠SKU`를 재확인하고 rawPayload 공식 텍스트 파서 dry-run으로 전환 |

### CHECK-A 쿼리 범위

전부 read-only SELECT만 수행한다.

필수 수치:

- `regulatory_type='DRUG'` ProductMaster 수
- `KOREA_DRUG_CODE`, `MFDS_CODE`, `KOREA_INSURANCE_CODE`, `ATC_CODE` identifier 수
- `MFDS_CODE`별 ProductMaster 수
- `MFDS_CODE`별 제조사 수 분포
- `representativeProductId` 연결률
- `ProductDrugExtension` 존재율
- `SharedProductDescription` 존재율

---

## 10. 실행 순서

| 순서 | 작업 | 결과물 |
| --- | --- | --- |
| 1 | CHECK-A read-only 실측 | 의약품 그룹핑 결정 근거 숫자 |
| 2 | 코드 SSOT 명문화 | baseline/decision 문서 갱신 |
| 3 | 의약품 그룹핑 키 확정 | grouping apply WO |
| 4 | HFF 공식 텍스트 parser dry-run | STTEMNT_NO별 공식 텍스트 후보 리포트 |
| 5 | HFF store-explanation 후보 저장소 결정 | representative-anchored 후보 테이블 WO |
| 6 | HFF `RepresentativeProduct` 앵커 설계/apply dry-run | master-less HFF 구조 WO + `anchorType/groupType` 구분자 |
| 7 | HFF extension 필요 여부 최종 결정 | metadata-only 유지 또는 entity/migration WO |

---

## 11. 순 net-new 빌드 표면

이번 구조 정비에서 실제 신규 개발 표면은 세 가지로 제한한다.

| 항목 | 설명 |
| --- | --- |
| `RepresentativeStoreExplanationCandidate` | HFF store explanation 공식 후보 저장소. `SharedProductDescription` 계약을 건드리지 않음 |
| HFF `STTEMNT_NO` → `RepresentativeProduct` anchor | member 없는 HFF 앵커. `metadata.anchorType='hff_sttemnt'` 또는 `group_type` 구분자 필요 |
| HFF 공식 텍스트 parser dry-run | rawPayload 공식 텍스트 커버리지/섹션/위험 flag 확인 |

그 외:

- store-execution / copy-on-import 계층은 재사용한다.
- HFF extension은 1차에 만들지 않는다.
- `SharedProductDescription`은 확장하지 않는다.

---

## 12. Claude Code 재점검 요청서

```text
아래 문서는 O4O 상품 데이터 구조 정비를 위한 개정 decision draft입니다.
새 맥락을 반영해 HFF 식약처 공식 텍스트/설명 앵커 문제를 본범위에 포함했습니다.
소비자 화면/버튼 UX는 후속 범위입니다.

검토해 주세요.

검토 포인트:
1. "이미 구현된 구조" 정리가 실제 코드와 맞는지
2. ProductIdentifier = 외부 코드 매칭/유일성 SSOT,
   ProductDrugExtension = 의약품 표시/정책/상세 mirror 라는 정리가 맞는지
3. barcode = 의약품 표준코드를 이미 채택된 정책으로 본 것이 맞는지
4. RepresentativeProduct grouping apply 전,
   MFDS_CODE별 제조사 혼입 분포 실측이 필수라는 판단이 맞는지
5. HFF STTEMNT_NO가 SKU가 아니므로 ProductMaster 없이 RepresentativeProduct 앵커가 필요하다는 판단이 맞는지
6. HFF representative anchor가 member 없는 대표상품을 대량 생성하므로,
   metadata.anchorType 또는 group_type 구분자가 필요하다는 판단이 맞는지
7. SharedProductDescription master_id NOT NULL 및 canonical 계약 때문에 HFF store explanation 후보를 직접 섞지 않고,
   representative-anchored store-explanation 후보 전용 저장소가 필요하다는 판단이 맞는지
8. 상품 설명을 B2B/B2C/매장 설명용으로 분리하고,
   HFF 식약처 공식 텍스트 기반 설명을 store_explanation 용도로 보는 것이 맞는지
9. O4O 매장 설명용 후보와 내 매장 설명을 분리하고,
   QR-code/POP/태블릿은 매장별 설명/콘텐츠를 사용한다는 경계가 맞는지
10. O4O 설명 후보를 매장이 복사·수정하면 O4O 공신 데이터베이스와 독립된다는 원칙이 맞는지
11. store-explanation 전용 후보 테이블이면 descriptionPurpose 없이 시작하고,
    여러 purpose를 겸할 때만 descriptionPurpose를 추가한다는 판단이 맞는지
12. HFF extension은 productMasterId 중심이 아니라 representativeProductId 중심이어야 하지만,
    1차는 extension 없이 metadata-only로 시작한다는 판단이 맞는지
13. MFDS_STTEMNT_NO를 우선 내부 식별자명으로 보는 것이 기존 HFF Gate 문서와 맞는지
14. HFF 공식 텍스트 파서 dry-run을 다음 작업으로 보는 것이 맞는지

필요하면 read-only SQL 결과와 기존 HFF rawPayload field coverage를 받아 CHECK/WO에 반영해 주세요.
코드 수정/DB write는 하지 마세요.
```

---

## 13. 최종 추천

현 시점 최종 추천:

1. 의약품 구조 신설 작업은 하지 않는다.
2. `ProductIdentifier`와 `ProductDrugExtension`의 역할을 baseline에 명문화한다.
3. 의약품 `RepresentativeProduct` grouping apply는 CHECK-A 실측 전까지 금지한다.
4. `barcode = 표준코드`는 재검토가 아니라 이미 채택된 정책으로 문서 정리한다.
5. HFF는 ProductMaster 없이도 공식 텍스트/설명 후보를 담을 수 있어야 한다.
6. HFF `STTEMNT_NO`는 `RepresentativeProduct` 앵커로 받는 것을 우선 검토한다.
7. HFF representative anchor에는 `metadata.anchorType='hff_sttemnt'` 또는 `group_type` 구분자가 필요하다.
8. `SharedProductDescription`의 master 기준 canonical 계약은 건드리지 않는다.
9. HFF store explanation 후보는 representative-anchored 전용 후보 저장소를 우선 검토한다.
10. store-explanation 전용 후보 저장소라면 `descriptionPurpose` 없이 시작할 수 있다.
11. O4O 매장 설명용 후보와 내 매장 설명은 분리한다.
12. 매장은 O4O 공식 설명을 그대로 사용할 수도 있고, 복사·수정하거나 자체 설명을 만들 수도 있다.
13. QR-code, POP, 태블릿은 기존 store-execution/copy-on-import 계보의 매장별 선택 설명/콘텐츠를 사용한다.
14. 매장이 O4O 설명 후보를 복사·수정하거나 자체 작성한 내용은 O4O 공신 데이터베이스와 독립이다.
15. HFF extension은 1차에 만들지 않고, 파서 dry-run 이후 필요성이 확인되면 `representativeProductId` 중심으로 설계한다.
16. HFF 소비자 화면/버튼 UX는 구조 정비 이후 별도 단계로 다룬다.

---

## 14. 전체 작업 순서

이 문서 이후의 전체 작업은 아래 순서를 기준으로 진행한다.

### 14.1 1단계: O4O 데이터베이스 구조 정비

가장 먼저 O4O 상품 데이터베이스 구조를 정비한다.

목표:

- `ProductMaster`, `ProductIdentifier`, `RepresentativeProduct`, domain extension, 설명 후보 저장소의 역할 확정
- 의약품 코드 SSOT 명문화
- `RepresentativeProduct` 그룹핑 규칙 확정
- HFF `STTEMNT_NO` master-less 앵커 정책 확정
- HFF store explanation 후보 저장소 방향 확정
- 기존 `SharedProductDescription` canonical 계약 보호
- store-execution/copy-on-import 계보와 O4O 공신 DB 경계 명확화

이 단계가 끝나기 전에는 식약처 데이터를 추가로 대량 적용하지 않는다.

### 14.2 2단계: 식약처/공공 데이터를 O4O DB에 적용

O4O DB 구조가 정비된 뒤, 현재 수집 중인 식약처/공공 데이터를 O4O 데이터베이스에 적용한다.

대상:

- 의약품
- 의료기기
- 건강기능식품
- 의약외품

각 분류는 현재 진행 단계가 다르므로 하나씩 진행한다.

우선순위:

1. 의약품
2. 의료기기
3. 건강기능식품
4. 의약외품

첫 순서는 의약품이다.

의약품에서 먼저 할 일:

- CHECK-A로 `MFDS_CODE` 제조사 혼입률 실측
- 의약품 `RepresentativeProduct` 그룹핑 키 확정
- `ProductIdentifier`/`ProductDrugExtension` SSOT 문서화
- 기존 ProductMaster/Identifier/Description/Extension 연결 상태 확인
- 필요 시 grouping apply WO 작성

### 14.3 3단계: 분류별 매장용 설명서 제작

O4O 데이터베이스에 상품/대표상품/공식 텍스트 후보가 정리된 뒤, 각 분류별 매장용 설명서를 만든다.

분류별 정책:

| 분류 | 매장용 설명서 정책 |
| --- | --- |
| 일반의약품 | 진행 대상. 단, 성분/허가/표준 구조를 기준으로 단계 진행 |
| 처방의약품 | 보류 |
| 의료기기 | 진행 대상. 식약처 정보를 활용할 수 있으면 활용 |
| 건강기능식품 | 진행 대상. 식약처 정보를 활용할 수 있으면 활용 |
| 의약외품 | 보류 |

주의:

- 이 단계는 B2B/B2C 설명이 아니라 매장 설명용이다.
- 식약처 공식 텍스트는 후보/원천으로 사용하되, 검수 전 자동 게시하지 않는다.
- 매장 설명용 후보는 O4O 공신 DB에 저장하고, 실제 매장 사용은 store-execution/copy-on-import 계보를 따른다.

### 14.4 4단계: 매장 적용 작업

매장 적용 작업은 마지막 단계다.

이 단계에서 다룰 것:

- 매장이 O4O 공식 설명을 그대로 사용하는 흐름
- 매장이 O4O 설명을 복사해 수정하는 흐름
- 매장이 자체 설명을 작성하는 흐름
- QR-code, POP, 태블릿이 매장별 선택 설명/콘텐츠를 사용하는 흐름
- 원본 O4O 공신 DB와 매장별 콘텐츠의 독립성

이 단계는 별도 설계 논의 후 진행한다.

현재 문서에서는 매장 적용 구현을 하지 않는다. 다만 이후 내 매장 작업에서 놓치지 않도록 경계만 명확히 남긴다.
