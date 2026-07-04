# CHECK-O4O-MEDICAL-DEVICE-PUBLIC-SEED-MAPPING-V1

> 작업 성격: Gate 0 read-only CHECK. 코드 변경, DB write, migration, Cloud Run Job, ProductCandidate/ProductMaster/ProductIdentifier apply 없음.  
> 작성일: 2026-07-04  
> 기준선: `docs/investigations/IR-O4O-PUBLIC-PRODUCT-SEED-STANDARD-PROCESS-V1.md`

---

## 1. 결론

의료기기 공공 데이터는 **ProductCandidate / 검색 보조 / identifier 보조**로는 V1에서 사용할 수 있다. 다만 **UDI-DI를 전량 `ProductMaster.barcode`처럼 쓰는 것은 보류**한다.

이유는 다음과 같다.

1. `ProductMaster`의 grain은 현재 **SKU/포장단위 + GTIN barcode** 중심이다.
2. 의료기기 표준코드별 제품정보의 `UDIDI_CD`는 강한 식별자이지만, 표본상 전량이 GTIN 숫자형은 아니다.
3. 기존 표본 20,000건에서 `UDIDI_CD` 중 **순수 14자리 숫자 19,055건(약 95%)**, **비숫자/HIBCC 계열 945건(약 5%)**이 확인되었다.
4. 의료기기는 허가번호, 모델명, 제품명, 제조/수입업체명, 등급, 사용목적이 함께 움직이며, **허가 단위·모델 단위·유통 포장 단위가 의약품처럼 단순히 일치한다고 볼 수 없다.**

따라서 V1 권장 정책은 다음이다.

```text
MFDS 의료기기 raw
→ ProductCandidate 적재 후보
→ UDI-DI / 허가번호 / 모델명 기반 검색·매칭
→ 숫자 14자리 + GTIN check-digit 통과 건만 제한적 ProductMaster 승격 후보
→ 비-GTIN UDI-DI는 ProductIdentifier 보조 식별자 후보로 보존
```

Gate A는 가능하지만, Gate B(ProductMaster 승격)는 **숫자형 UDI-DI의 GTIN 검증 + 중복/상태/포장 grain 확인 dry-run 후 별도 승인**이 필요하다.

---

## 2. 사용한 원천과 raw/sample 상태

### 2.1 직접 사용한 repo 문서

| 문서 | 사용 내용 |
|---|---|
| `IR-O4O-PUBLIC-PRODUCT-SEED-STANDARD-PROCESS-V1.md` | 공공 raw → ProductCandidate → dry-run → Gate → 승격 표준 절차 |
| `IR-O4O-GOVERNMENT-PRODUCT-DATA-SOURCE-AUDIT-V1.md` | 의료기기 데이터 원천, A13/A14/A15, UDI-DI join 필요성 |
| `CHECK-O4O-APPROVED-PUBLIC-DATA-API-BULK-FETCH-AND-SAMPLE-MAPPING-V1.md` | 의료기기 표준코드 20,000건 표본 실측, 필드명, UDI-DI 숫자/비숫자 분포 |
| `CHECK-O4O-PUBLIC-DATA-API-SAMPLE-RESPONSE-V1.md` | data.go.kr 엔드포인트와 명세 기반 필드 확인 |
| `IR-O4O-PUBLIC-DISTRIBUTION-PRODUCT-DATA-SOURCE-AUDIT-V1.md` | 의료기기 유통 데이터 적합성, 포장단위 약함 판단 |

### 2.2 raw/sample 파일 위치 확인

현재 작업공간(`/workspace/o4o-platform`)에서는 의료기기 raw JSONL 파일을 찾지 못했다.

검색 결과:

```text
repo 안 의료기기 raw jsonl/csv: 없음
repo 안 mfds-medical-device-standard-code-raw.jsonl: 없음
```

기존 bulk fetch CHECK에는 repo 밖 raw 위치가 다음으로 기록되어 있다.

```text
C:\Users\home\coding\o4o-public-data-samples\mfds-medical-device-standard-code-raw.jsonl
```

사용자 요청에 언급된 후보 경로는 다음이나, 이 Linux 작업공간에서는 직접 확인할 수 없다.

```text
C:\Users\sohae\o4o-public-data-samples\mfds-medical-device-standard-code-raw.jsonl
G:\내 드라이브\자료실\public-data-api-samples\
gs://o4o-media-library/data-seed/...
```

이번 CHECK는 **기존 repo 문서에 기록된 20,000건 표본 결과와 공식 명세 기반 판단**이다. raw 파일 재실측은 후속 WO에서 raw 복원 후 수행한다.

---

## 3. 대상 데이터

### 3.1 1순위: 식품의약품안전처_의료기기 표준코드별 제품정보

| 항목 | 값 |
|---|---|
| data.go.kr ID | `15073875` |
| 엔드포인트 | `https://apis.data.go.kr/1471000/MdeqStdCdPrdtInfoService03/getMdeqStdCdPrdtInfoInq03` |
| 형식 | JSON/XML |
| 기존 수집 totalCount | 2,656,054 |
| 기존 수집 표본 | 20,000 rows capped |
| 핵심 키 | `UDIDI_CD` |
| 주요 필드 | `PRDLST_NM`, `MDEQ_CLSF_NO`, `CLSF_NO_GRAD_CD`, `PERMIT_NO`, `PRMSN_YMD`, `FOML_INFO`, `PRDT_NM_INFO`, `USE_PURPS_CONT`, `STRG_CND_INFO`, `MNFT_IPRT_ENTP_NM` |

### 3.2 2순위: 식품의약품안전처_의료기기 품목허가 정보

| 항목 | 값 |
|---|---|
| data.go.kr ID | `15057456`로 기록됨 |
| 현재 상태 | 정확한 요청 URL/operation 미확인 |
| 기존 probe 결과 | 후보 엔드포인트 다수 HTTP 500 |
| 판정 | 이번 V1 CHECK에서는 join 가능성을 열어두되, 실제 매핑 근거로 사용하지 않음 |

후속 작업에서 data.go.kr 로그인 Swagger UI 또는 활용가이드 PDF로 정확한 operation을 확보해야 한다.

---

## 4. 주요 필드 목록

의료기기 표준코드별 제품정보의 주요 필드는 다음이다.

| 필드 | 의미 | O4O 후보 매핑 |
|---|---|---|
| `UDIDI_CD` | UDI-DI 표준코드 | primary identifier 후보. 숫자14 + check-digit 통과 시 GTIN 후보 |
| `PRDLST_NM` | 품목명 | `candidateName`, `regulatoryName` 후보 |
| `PRDT_NM_INFO` | 제품명 정보 | `candidateName` 보조 또는 rawPayload |
| `FOML_INFO` | 형명/모델명 | `candidateSpec` 또는 ProductIdentifier 보조 후보 |
| `PERMIT_NO` | 품목허가번호 | `mfdsPermitNumber` 후보, ProductIdentifier 후보 |
| `PRMSN_YMD` | 허가일자 | rawPayload, 상태/신뢰도 보조 |
| `MDEQ_CLSF_NO` | 의료기기 분류번호 | `candidateCategory` 보조 |
| `CLSF_NO_GRAD_CD` | 등급 | `candidateCategory`/rawPayload |
| `MNFT_IPRT_ENTP_NM` | 제조/수입업체명 | `candidateManufacturer`, `manufacturerName` 후보 |
| `USE_PURPS_CONT` | 사용목적 | rawPayload. 매장 설명과 혼동 금지 |
| `STRG_CND_INFO` | 저장조건 | rawPayload. 설명 보강 후보 |

이미지 필드는 확인되지 않았다.

---

## 5. Grain 판단

### 5.1 현재 판단

의료기기 표준코드별 제품정보는 **UDI-DI 중심 row**로 보는 것이 가장 안전하다.

다만 이것을 곧바로 O4O `ProductMaster` grain인 **SKU/포장단위**라고 확정할 수는 없다.

| 후보 grain | 판단 |
|---|---|
| UDI-DI 단위 | 가장 강함. row의 중심 키가 `UDIDI_CD` |
| 모델명 단위 | 일부 row에서 모델명(`FOML_INFO`)이 중요하지만 유일키로 확정 불가 |
| 품목허가 단위 | `PERMIT_NO`가 있으나 하나의 허가번호 아래 여러 UDI-DI/모델 가능성 있음 |
| 포장/SKU 단위 | 미확정. `UDIDI_CD`가 숫자 GTIN이면 유통 단위에 가까울 수 있으나 비-GTIN UDI도 존재 |

### 5.2 의약품과의 차이

의약품에서는 HIRA 약가마스터의 표준코드가 **13자리 GTIN형 SKU/포장단위**로 검증되었다. 의료기기는 다르다.

| 항목 | 의약품 | 의료기기 |
|---|---|---|
| 핵심 유통 식별자 | 표준코드 13자리 | UDI-DI |
| barcode 사용 가능성 | 높음. check-digit fail 1건만 격리 | 부분. 표본 5% 비숫자/HIBCC 계열 |
| 품목/허가와 포장 관계 | 품목기준코드 1개 → 다수 표준코드 | 허가번호 1개 → 다수 UDI-DI/모델 가능성 검증 필요 |
| 설명 단위 | e약은요 itemSeq 등 별도 | 사용목적/주의는 허가·모델 단위 가능성 |
| V1 승격 | 완료됨 | 제한 승격 또는 Candidate 보조 권장 |

---

## 6. UDI-DI / GTIN 판단

기존 20,000건 표본의 `UDIDI_CD` 분포:

| 구분 | 건수 | 비율 | 판단 |
|---|---:|---:|---|
| 순수 14자리 숫자 | 19,055 | 약 95% | GTIN-14 후보. check-digit 검증 필요 |
| 비숫자/HIBCC 등 | 945 | 약 5% | `ProductMaster.barcode` 부적합. identifier 보조로 보존 |
| 합계 | 20,000 | 100% | 전량 barcode 승격 금지 |

정책 초안:

```text
UDIDI_CD 숫자 14자리 + GTIN check-digit pass
  → ProductCandidate.identifierType = GTIN 후보
  → ProductMaster.barcode 승격 후보

UDIDI_CD 비숫자 또는 check-digit fail
  → ProductCandidate에는 보존
  → ProductIdentifier에는 UDI_DI 신규 type 또는 MFDS_CODE/UNKNOWN + metadata 후보
  → ProductMaster.barcode에는 직접 사용하지 않음
```

중요: `ProductMaster.barcode`는 길이 14, GTIN barcode 전제를 가진다. HIBCC처럼 `+` 등을 포함하는 UDI-DI는 컬럼 길이·의미 양쪽에서 부적합하다.

---

## 7. Identifier 후보

| 후보 identifier | 안정성 | 기존 type 수용 | 권장 |
|---|---:|---|---|
| `UDIDI_CD` 숫자14 | 높음 | `GTIN` | GTIN check-digit 통과 시 primary 후보 |
| `UDIDI_CD` 비숫자/HIBCC | 높음 | `MFDS_CODE` 또는 `UNKNOWN`로 임시 수용 가능 | 신규 `UDI_DI` type 권장 |
| `PERMIT_NO` | 중간 | `MFDS_CODE`로 임시 수용 가능 | 신규 `MEDICAL_DEVICE_PERMIT_NO`는 후속 검토 |
| `FOML_INFO` 모델명 | 낮음~중간 | `UNKNOWN` 또는 metadata | 단독 identifier보다 text match 보조 |
| 업체명 + 제품명 | 낮음 | identifier 부적합 | 검색/중복 후보 산출에만 사용 |
| 분류번호/등급 | 낮음 | identifier 부적합 | category/meta 보조 |

### ProductIdentifier type 추가 필요 여부

이번 CHECK에서는 구현하지 않는다. 다만 **`UDI_DI` 신규 type 추가를 권장**한다.

사유:

1. UDI-DI는 의료기기에서 매우 중요한 공식 식별자다.
2. GTIN형 UDI-DI와 HIBCC형 UDI-DI가 공존한다.
3. 비숫자 UDI-DI를 `MFDS_CODE`나 `UNKNOWN`에 넣으면 검색·충돌 분석 의미가 흐려진다.
4. `ProductIdentifier.identifier_type`은 DB enum이 아니라 varchar + application-level union이므로 migration 없이 코드 union 확장으로 처리 가능하다.

단, V1 Gate A에서는 신규 type 없이도 `identifierType='UNKNOWN'` 또는 `MFDS_CODE` + metadata로 후보 보존은 가능하다. 중앙 리뷰 후 type을 확정하는 것이 좋다.

---

## 8. ProductCandidate 매핑 후보

| ProductCandidate 필드 | 매핑 |
|---|---|
| `sourceType` | `external_api` |
| `sourceLabel` | `MFDS_MEDICAL_DEVICE_STANDARD_CODE_15073875` |
| `identifierType` | 숫자14 GTIN 후보는 `GTIN`, 그 외는 `UDI_DI`(후속) 또는 `MFDS_CODE`/`UNKNOWN` |
| `identifierValue` | `UDIDI_CD` |
| `normalizedIdentifierValue` | `UDIDI_CD` 정규화값. GTIN은 숫자만, HIBCC는 trim/uppercase 등 별도 규칙 필요 |
| `candidateName` | `PRDLST_NM` 우선, 필요 시 `PRDT_NM_INFO` |
| `candidateManufacturer` | `MNFT_IPRT_ENTP_NM` |
| `candidateCategory` | `MDEQ_CLSF_NO` + `CLSF_NO_GRAD_CD` |
| `candidateSpec` | `FOML_INFO` |
| `candidateUnit` | 미확정. 원본에 포장단위 필드 확인 전 null |
| `rawPayload` | 원본 item 전체 + sourceDatasetId + collectedAt + rowNumber/pageNo |

권장 `rawPayload.reviewFlags`:

| flag | 조건 |
|---|---|
| `UDI_DI_MISSING` | `UDIDI_CD` 없음 |
| `UDI_DI_NON_GTIN` | 숫자14가 아닌 UDI-DI |
| `UDI_DI_GTIN_CHECKDIGIT_FAIL` | 숫자14이나 check-digit 실패 |
| `PERMIT_NO_MISSING` | 허가번호 없음 |
| `MODEL_MISSING` | 모델명/형명 없음 |
| `MANUFACTURER_MISSING` | 제조/수입업체명 없음 |
| `PACKAGE_GRAIN_UNCONFIRMED` | 포장/SKU 단위 확인 불가 |
| `POSSIBLE_MULTI_MODEL_PER_PERMIT` | 동일 허가번호 다수 모델/UDI-DI |

---

## 9. ProductMaster 승격 가능성

### 9.1 V1 판단

의료기기 V1은 **전량 ProductMaster 승격 불가**로 본다. 제한 조건을 통과한 일부만 Gate B 후보가 될 수 있다.

승격 후보 조건:

```text
1. UDIDI_CD 존재
2. UDIDI_CD가 순수 숫자 14자리
3. GTIN check-digit 통과
4. PRDLST_NM 또는 PRDT_NM_INFO 존재
5. MNFT_IPRT_ENTP_NM 존재
6. PERMIT_NO 존재 권장
7. 동일 UDIDI_CD 중복 없음
8. 기존 ProductMaster.barcode / ProductIdentifier 와 conflict 없음
9. 취소/폐기/영업정지 등 inactive 상태가 아님
10. 포장/SKU grain으로 볼 수 있는지 dry-run에서 재확인
```

위 조건을 만족하지 못하는 row는 ProductCandidate에 남겨 검색/매칭 보조로 사용한다.

### 9.2 ProductMaster 필드 후보

| ProductMaster 필드 | 매핑 후보 | 주의 |
|---|---|---|
| `barcode` | 숫자14 + check-digit 통과 `UDIDI_CD` | 비-GTIN UDI-DI 사용 금지 |
| `regulatoryType` | `MEDICAL_DEVICE` | 기존 union/정책 확인 필요 |
| `regulatoryName` | `PRDLST_NM` 또는 `PRDT_NM_INFO` | 공식명 기준 확정 필요 |
| `name` | `PRDLST_NM` 또는 `PRDT_NM_INFO` | 유통명과 공식명 차이 가능 |
| `manufacturerName` | `MNFT_IPRT_ENTP_NM` | 제조/수입 구분이 섞일 수 있음 |
| `mfdsPermitNumber` | `PERMIT_NO` | null 가능하지만 승격 시 권장 |
| `mfdsProductId` | `MFDS:MEDICAL_DEVICE:{UDIDI_CD}` 권장 | 컬럼 길이 100 내 |
| `specification` | `FOML_INFO` | 모델명은 SKU spec과 다를 수 있음 |
| `isMfdsVerified` | true | MFDS 직접 출처일 때 |

---

## 10. 의료기기 표준코드와 품목허가 정보 join 가능성

현재 확정 가능한 join key:

| join key | 가능성 | 비고 |
|---|---:|---|
| `PERMIT_NO` | 높음 | 표준코드별 제품정보에 존재. 품목허가 정보에도 있을 가능성이 높음 |
| `UDIDI_CD` | 중간 | 품목허가 정보가 UDI-DI를 포함하는지는 endpoint 확인 후 검증 필요 |
| 제품명 + 업체명 | 중간 | 보조 match로만 사용 |
| 모델명 | 중간 | 표기 흔들림 가능성 큼 |

현 단계에서는 **표준코드별 제품정보 단독으로 Candidate 적재 가능**하나, 품목허가 정보와 join하여 상태/허가 상세를 보강하려면 정확한 endpoint 확보가 선행되어야 한다.

---

## 11. 상태값 확인

의료기기 표준코드별 제품정보의 기존 필드 목록만으로는 `active/cancelled/취소/폐기/영업정지`를 충분히 확정하지 못했다.

필요 확인:

1. 표준코드별 제품정보에 상태 코드가 있는지 raw 재실측
2. 품목허가 정보(`15057456`)에 취소/취하/폐기/영업정지 필드가 있는지 확인
3. UDI/EDI 정보 조회(`15138675`)에 유효 상태가 있는지 확인

정책:

```text
상태 미확정 row
  → ProductCandidate에는 적재 가능
  → ProductMaster 승격은 보류

취소/폐기/영업정지 row
  → rawPayload에 보존
  → ProductMaster 승격 제외
```

---

## 12. 중복/충돌 확인 항목

후속 dry-run에서 반드시 산출해야 할 지표:

| 지표 | 목적 |
|---|---|
| `UDIDI_CD` 중복 수 | primary identifier로 쓸 수 있는지 확인 |
| 숫자14 UDI-DI 중 GTIN check-digit fail 수 | barcode 승격 제외 대상 확인 |
| 비숫자 UDI-DI 수와 prefix 분포 | HIBCC 등 별도 처리 정책 |
| 동일 `PERMIT_NO` 아래 UDI-DI 수 | 허가번호 1:N 구조 확인 |
| 동일 `PERMIT_NO` + 동일 `FOML_INFO` 아래 UDI-DI 수 | 모델/포장 관계 확인 |
| 동일 `FOML_INFO` + 업체명 아래 UDI-DI 수 | 모델명 중복/포장 다양성 확인 |
| 동일 제품명 + 업체명 다수 UDI-DI | 대표상품/검색 그룹 후보 |
| 기존 ProductMaster.barcode 충돌 | Core write 금지 대상 |
| 기존 ProductIdentifier 충돌 | 식별자 충돌 대상 |

---

## 13. 설명/이미지 보강 가능성

의료기기 표준코드별 제품정보에는 이미지 필드가 확인되지 않았다. 이미지 보강은 V1 범위 밖이다.

설명 관련 필드:

| 필드 | 용도 |
|---|---|
| `USE_PURPS_CONT` | 공식 사용목적. 매장용 설명서 원문이 아니라 AI 설명 제작 참고 원천 |
| `STRG_CND_INFO` | 보관조건 참고 |
| 멸균/일회용/추적관리/인체이식 여부 | 제품 특성 메타 |

주의:

```text
공공 사용목적/주의사항 = 공식 원천/참고
매장용 설명 = 별도 AI 제작 메뉴에서 생성
```

이번 seed 작업에서 설명/이미지/대표상품/매장용 콘텐츠를 생성하지 않는다.

---

## 14. Gate A 후보 여부

Gate A(ProductCandidate 적재) 후보로는 가능하다. 단, raw 파일 복원과 offline dry-run이 선행되어야 한다.

Gate A 전 필수 조건:

1. raw 파일 위치 확정 또는 API 재수집
2. serviceKey 노출 없는 수집 스크립트/로그 관리
3. 표본보다 큰 범위에서 UDI-DI 숫자/비숫자/check-digit 분포 재계산
4. 상태 필드 존재 여부 확인
5. ProductCandidate 매핑 dry-run 리포트 작성
6. rawPayload 원형 보존 확인

Gate B(ProductMaster 승격)는 이번 CHECK 기준으로 **불승인/보류**가 안전하다. 다음 dry-run에서 숫자14 GTIN형 UDI-DI에 한정한 승격 후보 수를 산출한 뒤 별도 Gate B 문서가 필요하다.

---

## 15. 금지 사항 이행 확인

| 항목 | 결과 |
|---|---|
| ProductMaster 생성 | 0 |
| ProductIdentifier 생성 | 0 |
| ProductCandidate apply | 0 |
| DB write | 0 |
| migration 작성 | 0 |
| Cloud Run Job 실행 | 0 |
| 대량 API 호출 | 0 |
| raw 대용량 파일 커밋 | 0 |
| serviceKey/secret 기록 | 0 |
| 코드 변경 | 0 |

이번 변경은 CHECK 문서 추가 1건뿐이다.

---

## 16. 후속 WO 제안

### WO 1. 의료기기 raw 복원 및 field/sample dry-run

```text
WO-O4O-MEDICAL-DEVICE-PUBLIC-RAW-RESTORE-AND-FIELD-SAMPLE-DRYRUN-V1
```

목표:

1. repo 밖 raw 파일 복원 또는 API 재수집
2. `UDIDI_CD` 형식 분포 전량/대형 표본 재계산
3. GTIN check-digit pass/fail 산출
4. 동일 UDI-DI/허가번호/모델명/업체명 중복 분포 산출
5. 상태 필드 확인
6. ProductCandidate 매핑 dry-run 리포트 작성

### WO 2. 의료기기 ProductIdentifier type 정책 확정

```text
WO-O4O-PRODUCT-IDENTIFIER-MEDICAL-DEVICE-UDI-TYPE-POLICY-V1
```

목표:

1. `UDI_DI` 신규 type 추가 여부 중앙 리뷰
2. GTIN형 UDI-DI와 HIBCC형 UDI-DI의 저장 정책 확정
3. `PERMIT_NO`, 모델명, UDI/EDI 코드의 identifier/type/metadata 경계 확정

### WO 3. 의료기기 Candidate 적재 Gate A

```text
WO-O4O-MEDICAL-DEVICE-PUBLIC-CANDIDATE-IMPORT-GATE-A-V1
```

목표:

1. dry-run 리포트 기반 ProductCandidate apply
2. rawPayload 원형 보존
3. DB write 범위는 ProductCandidate로 제한
4. ProductMaster/ProductIdentifier/offer/listing/store_local_product 생성 금지

### WO 4. 의료기기 제한 승격 Gate B dry-run

```text
WO-O4O-MEDICAL-DEVICE-GTIN-UDI-PROMOTION-DRYRUN-GATE-B-V1
```

목표:

1. 숫자14 + GTIN check-digit pass UDI-DI만 대상으로 승격 dry-run
2. 기존 barcode/identifier conflict 산출
3. ProductMaster grain 적합성 재검토
4. 승격 가능 수/보류 수/충돌 수를 산출하고 apply 여부 별도 승인

---

## 17. 최종 판정

| 질문 | 답 |
|---|---|
| 이 데이터의 grain은 무엇인가? | UDI-DI 중심 row. ProductMaster SKU/포장단위로는 미확정 |
| ProductMaster 생성 가능한가? | 전량 불가. 숫자14 GTIN형 + check-digit 통과 + 상태/중복 통과 건만 제한 후보 |
| 어떤 identifier를 쓸 수 있는가? | UDI-DI, 허가번호, 모델명, 업체명+제품명 보조 |
| 기존 ProductIdentifier type으로 충분한가? | 임시 수용은 가능하나 `UDI_DI` 신규 type 권장 |
| 품목허가 정보와 join 가능한가? | `PERMIT_NO` 기반 가능성 높음. endpoint 확보 후 검증 필요 |
| active/cancelled 상태 구분 가능한가? | 표준코드별 제품정보만으로 미확정. 품목허가 정보 확인 필요 |
| 주요 필드가 있는가? | 제품명, 업체명, 품목명, 등급, 사용목적, 모델명, 허가번호 있음. 제조/수입 구분은 추가 확인 |
| 중복 문제가 있는가? | 후속 dry-run 필요. 특히 동일 허가번호 다수 UDI-DI/모델 확인 필요 |
| ProductCandidate 구조 재사용 가능한가? | 가능. rawPayload/jsonb에 매우 적합 |
| V1 ProductMaster 승격 가능한가? | Candidate/Identifier 보조 우선. Gate B는 제한 승격 dry-run 후 별도 판단 |

**최종 결론: 의료기기 V1은 ProductCandidate/검색 보조/identifier 보조까지를 1차 목표로 삼고, ProductMaster 승격은 숫자형 GTIN UDI-DI에 한정한 별도 Gate B dry-run 이후 결정한다.**