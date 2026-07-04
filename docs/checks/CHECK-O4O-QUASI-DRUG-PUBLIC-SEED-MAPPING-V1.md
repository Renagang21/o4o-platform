# CHECK-O4O-QUASI-DRUG-PUBLIC-SEED-MAPPING-V1

> 작업 성격: **Gate 0 read-only CHECK**. 의약외품 공공상품 seed 의 grain, identifier, ProductCandidate 매핑, ProductMaster 승격 가능성을 1차 판단한다.  
> 작성일: 2026-07-04  
> 기준선: `docs/investigations/IR-O4O-PUBLIC-PRODUCT-SEED-STANDARD-PROCESS-V1.md`  
> 금지 준수: 코드 변경 0, DB write 0, ProductCandidate/ProductMaster/ProductIdentifier 생성 0, raw 대용량 파일 커밋 0, secret 기록 0

---

## 0. 한 줄 결론

**의약외품 제품 허가정보는 ProductCandidate Gate A 후보로는 적합하지만, V1에서 ProductMaster로 바로 승격하기에는 부족하다.**

이유는 단순하다. 실제 샘플 기준 `ITEM_SEQ`, 제품명, 업체명, 분류, 허가상태, 효능/용법/주의 XML 원문은 확보되지만, O4O `ProductMaster`의 grain인 **포장단위/SKU/barcode 기준 식별자**가 확인되지 않았다. 따라서 V1은 **Candidate 검색/매칭 보조 + 공식 설명 원문 보존**까지가 안전하다. ProductMaster 승격은 별도 포장단위/표준코드/바코드 연결 원천을 확인한 뒤 Gate B에서 다시 판단해야 한다.

---

## 1. 사용한 raw/sample 파일 또는 API

### 1.1 기준 문서

| 구분 | 경로 | 사용 목적 |
|---|---|---|
| 공통 seed 표준 프로세스 | `docs/investigations/IR-O4O-PUBLIC-PRODUCT-SEED-STANDARD-PROCESS-V1.md` | Gate 0/A/B/C, Candidate 경유, ProductMaster grain 기준 확인 |
| 선행 bulk fetch CHECK | `docs/checks/CHECK-O4O-APPROVED-PUBLIC-DATA-API-BULK-FETCH-AND-SAMPLE-MAPPING-V1.md` | 의약외품 API 샘플 수집 결과, 필드 목록, row 수, 상태 분포 확인 |
| 선행 API sample CHECK | `docs/checks/CHECK-O4O-PUBLIC-DATA-API-SAMPLE-RESPONSE-V1.md` | API endpoint 및 초기 미구독 상태 이력 확인 |
| 유통용 데이터 소스 IR | `docs/investigations/IR-O4O-PUBLIC-DISTRIBUTION-PRODUCT-DATA-SOURCE-AUDIT-V1.md` | 의약품 대비 의약외품 데이터 적합성 차이 확인 |

### 1.2 대상 API

| 항목 | 값 |
|---|---|
| 데이터명 | 식품의약품안전처_의약외품 제품 허가정보 |
| data.go.kr ID | `15095679` |
| endpoint | `https://apis.data.go.kr/1471000/QdrgPrdtPrmsnInfoService03/getQdrgPrdtPrmsnInfoInq03` |
| 응답 형식 | JSON/XML 지원, 선행 수집은 JSON |
| 선행 raw 파일 위치(문서 기록) | `C:\Users\home\coding\o4o-public-data-samples\mfds-quasi-drug-permit-raw.jsonl` |
| 현재 실행환경에서 raw JSONL 확인 | **미확인**. `/workspace`, `/tmp` 검색 결과 원본 JSONL 없음 |

> 주의: 이번 CHECK는 현재 컨테이너에서 repo 밖 Windows 경로와 GCS/Google Drive 원본을 직접 열지 못했다. 따라서 실제 row 분석은 선행 CHECK에 기록된 수집 결과를 근거로 하며, 다음 Gate A WO에서 raw 파일 위치를 재확인해야 한다.

---

## 2. 총 row 수 또는 sample 수

선행 bulk fetch CHECK 기준:

| 항목 | 값 |
|---|---:|
| API totalCount | 22,949 |
| 선행 수집 row | 20,000 |
| 수집 상한 | 200 pages capped |
| 미수집 잔여 | 2,949 |
| 실패 page | 0 |
| JSONL 무결성 | 20,000 lines 유효 JSON, bad 0 |

상태 분포는 선행 20,000 row 표본 기준 다음과 같이 기록되어 있다.

| `CANCEL_CODE_NAME` | 표본 건수 | seed 판단 |
|---|---:|---|
| 정상 | 15,260 | Candidate 적재 가능, 향후 승격 검토 가능 |
| 폐업 | 2,380 | Candidate에는 보존, Core 승격 제외 |
| 행정(취소) | 1,398 | Candidate에는 보존, Core 승격 제외 |
| 취하 | 958 | Candidate에는 보존, Core 승격 제외 |
| 취소 | 4 | Candidate에는 보존, Core 승격 제외 |

---

## 3. 주요 필드 목록

선행 샘플 CHECK에서 확인된 주요 필드는 다음이다.

| 필드 | 의미 | O4O 사용 후보 |
|---|---|---|
| `ITEM_SEQ` | 품목기준코드/품목일련번호 성격 | `identifierType=MFDS_CODE`, `normalizedIdentifierValue` |
| `ITEM_NAME` | 제품명 | `candidateName` |
| `ENTP_NAME` | 업체명 | `candidateManufacturer` |
| `ITEM_PERMIT_DATE` | 허가일 | `rawPayload.source`, review metadata |
| `ITEM_NO` | 품목번호 | `rawPayload`, 허가 보조 식별자 후보 |
| `CANCEL_CODE_NAME` | 상태명: 정상/폐업/취하/행정(취소)/취소 | 승격 제외 규칙 |
| `CANCEL_DATE` | 취소/취하 등 상태일 | `rawPayload` |
| `MAIN_INGR` | 주성분 | `rawPayload.officialRegulatoryText.ingredients.main` |
| `ADIT_INGR` | 첨가제 | `rawPayload.officialRegulatoryText.ingredients.additive` |
| `CLASS_NO` | 분류코드 | `candidateCategory` 보조 |
| `CLASS_NO_NAME` | 분류명 | `candidateCategory` |
| `PERMIT_KIND_CODE_NM` | 허가종류 | `rawPayload` |
| `INDUTY_CODE` | 제조/수입 구분 | `rawPayload` |
| `MANUF_COUNTRY_NAMES` | 제조국 | `rawPayload` |
| `ENTP_NO` / `ENTP_SEQ` / `BIZRNO` | 업체 식별 보조 | 업체 dedup 보조, `rawPayload` |
| `EE_DOC_DATA` | 효능효과 XML | 공식 설명 원문, XML/CDATA 파싱 필요 |
| `UD_DOC_DATA` | 용법용량 XML | 공식 설명 원문, XML/CDATA 파싱 필요 |
| `NB_DOC_DATA` | 사용상주의 XML | 공식 설명 원문, XML/CDATA 파싱 필요 |

이미지 URL, 포장단위, 표준코드, GTIN/barcode 필드는 선행 샘플에서 확인되지 않았다.

---

## 4. Grain 판단

### 4.1 판단

**현재 확인된 의약외품 API의 grain은 포장단위/SKU가 아니라 "품목/허가 단위"에 가깝다.**

근거:

| 관찰 | 판단 |
|---|---|
| 핵심 식별자가 `ITEM_SEQ` | 의약품의 품목기준코드처럼 허가/품목 단위 식별자로 보는 것이 안전 |
| 제품명·업체명·허가일·상태·분류·효능/용법/주의가 중심 | 허가정보/규제정보 데이터의 성격 |
| 포장단위/표준코드/barcode 미확인 | O4O `ProductMaster`의 SKU grain과 직접 일치하지 않음 |
| `EE_DOC_DATA`/`UD_DOC_DATA`/`NB_DOC_DATA` 존재 | 제품 설명/허가사항 단위에 가깝고 거래 SKU 단위와 다름 |

### 4.2 의약품과의 차이

| 항목 | 의약품 약가마스터 | 의약외품 허가정보 |
|---|---|---|
| ProductMaster grain 확인 | 표준코드=SKU/포장단위로 확인 | 미확인 |
| barcode/표준코드 | KOREA_DRUG_CODE 13자리 기반, check digit 검증 가능 | 확인 안 됨 |
| 품목기준코드 | 여러 표준코드를 묶는 품목 단위 | `ITEM_SEQ`는 품목/허가 단위 후보 |
| 설명 단위 | e약은요 `itemSeq`, 설명 단위 | `ITEM_SEQ`와 EE/UD/NB 설명 원문이 같은 레코드에 존재 |
| 취소 데이터 처리 | Candidate 보존, Core 승격 제외 | 동일 원칙 적용 가능 |

---

## 5. Identifier 후보

| 후보 | 출처 필드 | identifier_type 후보 | 강도 | 판단 |
|---|---|---|---|---|
| 품목기준코드/품목일련번호 | `ITEM_SEQ` | `MFDS_CODE` | 높음 | Candidate dedup/검색 키로 적합 |
| 품목번호 | `ITEM_NO` | 신규 type보다는 `rawPayload` 보존 | 중간 | 단독 고유성·의미 재확인 필요 |
| 허가번호 | 명시 필드 미확인. 선행 문서상 `ITEM_PERMIT_NO` 언급은 있었으나 bulk 필드에는 `ITEM_NO` 중심 | 보류 | 중간 | 다음 raw 재확인 필요 |
| 업체명+제품명 | `ENTP_NAME` + `ITEM_NAME` | identifier 아님 | 보조 | 텍스트 dedup/동명이품 검출용 |
| 업체 식별 | `ENTP_NO` / `ENTP_SEQ` / `BIZRNO` | identifier 아님 | 보조 | manufacturer 정규화 보조 |
| 표준코드/barcode | 미확인 | `GTIN`/`EAN13` 등 | 없음 | V1 승격 근거로 사용 불가 |

### 신규 ProductIdentifier type 필요 여부

V1 CHECK 기준으로는 **신규 type 추가를 보류**한다. `ITEM_SEQ`는 기존 `MFDS_CODE`로 수용 가능하다. 다만 중앙 리뷰에서 식약처 품목기준코드를 더 명시적으로 구분하고 싶다면 향후 `MFDS_ITEM_SEQ`를 검토할 수 있다. 이번 CHECK에서는 코드 union 변경을 제안하지 않는다.

---

## 6. e약은요 itemSeq와 cross-link 가능성

결론: **가능성은 있으나, 의약외품에서는 V1 확정 금지**.

이유:

- 선행 의약품 트랙에서는 e약은요 `itemSeq`와 식약처 품목기준코드가 같은 축으로 동작했다.
- 의약외품 API의 `ITEM_SEQ`도 명칭상 같은 식약처 품목 식별자 계열로 보인다.
- 하지만 e약은요 API는 기본적으로 "의약품개요정보"이며, 선행 수집 건수 4,774건도 의약품 중심이다.
- 의약외품 품목이 e약은요에 포함되는지, 포함된다면 `itemSeq=ITEM_SEQ`로 안정 조인되는지는 별도 샘플 조인이 필요하다.

따라서 다음 WO에서는 다음 검증을 권장한다.

| 검증 | 방법 | 결과 사용 |
|---|---|---|
| 의약외품 `ITEM_SEQ` 100~1,000건과 e약은요 `itemSeq` 교집합 | offline raw join | 설명/이미지 보강 가능성 판단 |
| 교집합 제품명·업체명 일치율 | normalize 후 비교 | cross-link 신뢰도 산정 |
| e약은요 이미지 존재율 | `itemImage` 확인 | Gate C 이미지 보강 후보 |

---

## 7. active/cancelled 상태 구분

`CANCEL_CODE_NAME`으로 1차 구분 가능하다.

| 상태 | Candidate | ProductMaster 승격 |
|---|---|---|
| 정상 | 보존 | 별도 SKU 식별자 확인 전까지 보류 |
| 폐업 | 보존 | 제외 |
| 행정(취소) | 보존 | 제외 |
| 취하 | 보존 | 제외 |
| 취소 | 보존 | 제외 |
| 미상/빈값 | 보존 + review flag | 제외 또는 수동 검토 |

의약품 seed 교훈과 동일하게, 취소/취하/폐업 row는 삭제하지 않고 `rawPayload`와 review flag로 남기는 것이 맞다. Core 오염만 막는다.

---

## 8. 설명/이미지 보강 가능성

### 8.1 설명

설명 보강 가능성은 높다. 다만 공식 공공 설명과 매장용 AI 설명을 분리해야 한다.

| 필드 | 성격 | 처리 제안 |
|---|---|---|
| `EE_DOC_DATA` | 효능효과 XML | `rawPayload.officialRegulatoryText.efficacyXml` 원문 보존, 후속 파싱 |
| `UD_DOC_DATA` | 용법용량 XML | `rawPayload.officialRegulatoryText.dosageXml` 원문 보존, 후속 파싱 |
| `NB_DOC_DATA` | 사용상주의 XML | `rawPayload.officialRegulatoryText.cautionXml` 원문 보존, 후속 파싱 |
| `MAIN_INGR` | 주성분 | `rawPayload.officialRegulatoryText.ingredients.main` |
| `ADIT_INGR` | 첨가제 | `rawPayload.officialRegulatoryText.ingredients.additive` |

후속 파싱은 XML/CDATA/HTML fragment 가능성을 모두 고려해야 한다. 이번 CHECK에서는 파서를 만들지 않는다.

### 8.2 이미지

의약외품 허가정보 샘플에서는 이미지 필드가 확인되지 않았다. V1에서는 ProductImage 생성 불가다.

이미지는 다음 중 하나가 별도 확인될 때 Gate C에서 다룬다.

1. e약은요 또는 다른 식약처/의약품안전나라 원천과 `ITEM_SEQ` 조인 가능
2. 공급자 제공 이미지
3. 운영자 검수 이미지

외부 URL 직참조는 금지하고, 공공 이미지가 있더라도 GCS 사본 후 `ProductImage`에 연결해야 한다.

---

## 9. ProductCandidate 매핑 후보

의약외품 V1 Candidate 매핑은 다음이 안전하다.

| ProductCandidate 필드 | 매핑 |
|---|---|
| `serviceKey` | `null` 또는 공공 seed 공통 스코프. 특정 서비스 자동 귀속 금지 |
| `sourceType` | `external_api` |
| `sourceLabel` | `MFDS_QUASI_DRUG_PERMIT` |
| `identifierType` | `MFDS_CODE` if `ITEM_SEQ` exists |
| `identifierValue` | trim(`ITEM_SEQ`) |
| `normalizedIdentifierValue` | trim(`ITEM_SEQ`) |
| `candidateName` | trim(`ITEM_NAME`) |
| `candidateManufacturer` | trim(`ENTP_NAME`) |
| `candidateCategory` | trim(`CLASS_NO_NAME`) 또는 `의약외품 제품 허가정보` |
| `candidateSpec` | `null` (포장/SKU 규격 미확인) |
| `candidateUnit` | `null` (포장단위 미확인) |
| `candidateImageUrl` | `null` |
| `rawPayload.source` | 원본 item 전체 |
| `rawPayload.sourceAgency` | `MFDS` |
| `rawPayload.sourceDatasetId` | `15095679` |
| `rawPayload.sourceDatasetName` | `의약외품 제품 허가정보` |
| `rawPayload.sourceKind` | `quasi_drug_permit` |
| `rawPayload.sourceRowKey` | `ITEM_SEQ` |
| `rawPayload.status.cancelCodeName` | `CANCEL_CODE_NAME` |
| `rawPayload.status.cancelDate` | `CANCEL_DATE` |
| `rawPayload.reviewFlags` | 결측/취소/설명 XML 결측 등 |
| `candidateStatus` | 기본 `pending` |
| `matchStatus` | 기본 `unmatched` |

권장 review flag:

| flag | 조건 |
|---|---|
| `ITEM_SEQ_MISSING` | `ITEM_SEQ` 결측 |
| `ITEM_NAME_MISSING` | `ITEM_NAME` 결측 |
| `MANUFACTURER_MISSING` | `ENTP_NAME` 결측 |
| `NOT_ACTIVE_PERMIT` | `CANCEL_CODE_NAME !== '정상'` |
| `CATEGORY_MISSING` | `CLASS_NO_NAME` 결측 |
| `OFFICIAL_TEXT_MISSING` | EE/UD/NB 모두 결측 |
| `XML_PARSE_REQUIRED` | EE/UD/NB 중 하나라도 존재 |
| `SKU_IDENTIFIER_MISSING` | barcode/표준코드/포장단위 식별자 없음 |

중복 방지는 `ProductCandidate`에 전역 UNIQUE가 없으므로 서비스 로직에서 처리한다. V1 dedup 후보는 다음 조합이다.

```text
sourceType='external_api'
identifierType='MFDS_CODE'
normalizedIdentifierValue=ITEM_SEQ
rawPayload.sourceKind='quasi_drug_permit'
deleted_at IS NULL
```

---

## 10. ProductMaster 승격 가능성

### 10.1 V1 판단

**V1에서 ProductMaster 승격은 보류한다.**

| 조건 | 확인 여부 | 판단 |
|---|---:|---|
| 제품명 | 확인 | 충족 |
| 업체명 | 확인 | 충족 |
| 규제 유형 | 데이터셋으로 추론 가능 | `regulatoryType='DRUG'`, `drugCategory='quasi_drug'` 또는 별도 정책 재확인 필요 |
| 품목 식별자 | `ITEM_SEQ` 확인 | `mfdsProductId` 후보 |
| 허가 상태 | `CANCEL_CODE_NAME` 확인 | 정상 필터 가능 |
| 포장단위/SKU grain | 미확인 | 불충족 |
| barcode/GTIN/표준코드 | 미확인 | 불충족 |
| check digit 검증 | 불가 | 불충족 |
| 이미지 | 미확인 | Gate C 불가 |

O4O `ProductMaster`는 "물리적 제품 1건 = barcode 1건 = SKU/포장단위"다. 의약외품 허가정보는 현재 품목/허가 단위로 보이므로, `ITEM_SEQ` 하나로 Master를 생성하면 의약품에서 피한 grain 오염을 다시 만들 위험이 있다.

### 10.2 향후 승격이 가능해지는 조건

다음 중 하나 이상이 확보되면 Gate B 승격을 다시 검토할 수 있다.

1. 의약외품 표준코드/barcode/GTIN 원천 확보
2. 허가정보에 포장단위 필드가 실제 raw에 존재함을 확인하고, 같은 `ITEM_SEQ` 내 포장 변형을 구분할 수 있음
3. 공급자/운영자 검수로 SKU 단위 식별자 보강
4. 별도 공공 데이터와 조인하여 포장단위/SKU 단위 grain 확정

그 전까지는 ProductMaster가 아니라 ProductCandidate 검색 보조 풀로 운용한다.

---

## 11. 의약품 seed 표준 프로세스와의 차이

| 단계 | 의약품 완료 트랙 | 의약외품 V1 판단 |
|---|---|---|
| raw 확보 | 약가마스터 CSV + e약은요 등 | API raw 20,000 표본 기록은 있으나 현재 실행환경 원본 미확인 |
| field/sample CHECK | 완료 | 본 CHECK로 1차 완료 |
| offline dry-run | 약가마스터 기준 완료 | 후속 WO 필요 |
| ProductCandidate 적재 | 305,522 apply 완료 | 가능. Gate A 후보 |
| promotion dry-run | 완료 | V1에서는 ProductMaster 승격 dry-run보다 Candidate import dry-run 우선 |
| Gate 승인 | Gate B 완료 | Gate A 후보까지만 |
| ProductMaster 승격 | 230,841 완료 | 보류 |
| ProductIdentifier 생성 | 703,483 완료 | 보류 |
| SQL 검증 | 완료 | 후속 Candidate apply 때만 필요 |
| 설명/이미지 | Gate C 별도 | 설명 XML은 rawPayload 보존 후 파싱, 이미지는 별도 원천 필요 |

---

## 12. 반드시 확인할 질문 답변

| 질문 | 답변 |
|---|---|
| 1. 이 데이터의 grain은 무엇인가? | 품목/허가 단위로 판단한다. 포장단위/SKU로 보지 않는다. |
| 2. ProductMaster 생성이 가능한가? | V1에서는 불가/보류. 포장단위·바코드·표준코드가 확인되지 않았다. |
| 3. 어떤 identifier를 쓸 수 있는가? | `ITEM_SEQ`를 `MFDS_CODE`로 Candidate 식별자에 사용 가능. `ITEM_NO`, 업체명+제품명은 보조. |
| 4. e약은요 itemSeq와 cross-link 가능한가? | 가능성은 있으나 의약외품 포함 여부와 교집합 검증 전 확정 금지. |
| 5. active/cancelled 상태를 구분할 수 있는가? | 가능. `CANCEL_CODE_NAME` 기준. 정상 외 상태는 Candidate 보존, Core 승격 제외. |
| 6. 제품명/업체명/효능/용법/원료/주의 필드가 있는가? | 제품명·업체명·주성분·첨가제·효능효과 XML·용법용량 XML·사용상주의 XML 확인. |
| 7. XML CDATA 또는 HTML 필드 파싱이 필요한가? | 필요. EE/UD/NB 문서는 XML/CDATA 가능성이 높아 후속 파서가 필요하다. |
| 8. 동일 제품명/다제조사/다허가 문제가 있는가? | 가능성이 높다. `ITEM_SEQ` 중심으로 보고, 제품명+업체명만으로 dedup 금지. |
| 9. ProductCandidate 구조를 재사용할 수 있는가? | 가능. `sourceType=external_api`, `identifierType=MFDS_CODE`, `rawPayload` 원문 보존 구조와 잘 맞는다. |
| 10. ProductMaster 승격은 V1에서 가능한가? | 보류. V1은 Candidate 검색 보조와 공식 설명 원문 보존까지가 적절하다. |

---

## 13. Gate A 후보 여부

**Gate A 후보로 적합하다.**

단, Gate A 착수 전 조건:

1. repo 밖 raw JSONL 위치 재확인
2. totalCount 22,949 전량 수집 여부 결정
3. 선행 20,000 capped 파일과 잔여 2,949 수집 파일의 중복/누락 검증
4. mapper는 pure function으로 작성
5. offline dry-run으로 row 수, 결측, 상태 분포, dedup 예상치 문서화
6. apply는 ProductCandidate만 허용
7. ProductMaster/ProductIdentifier/ProductDrugExtension/ProductImage 생성 금지

Gate B(ProductMaster/Identifier 승격)는 **후보 아님**이다. 포장/SKU 식별자 확인 후 별도 CHECK가 필요하다.

---

## 14. 후속 WO 제안

### WO 1. Candidate import dry-run

```text
WO-O4O-QUASI-DRUG-PUBLIC-CANDIDATE-IMPORT-DRYRUN-V1
```

목표:

- raw JSONL 위치 복원/확인
- 22,949 전량 수집 또는 기존 20,000 + 잔여 2,949 보강
- JSONL parser + mapper pure function 작성
- offline dry-run 리포트 작성
- DB write 0

산출:

- field stats
- 상태 분포
- `ITEM_SEQ` 결측/중복
- 제품명+업체명 중복
- XML 필드 존재율
- Candidate apply 예상 row 수

### WO 2. Candidate apply Gate A

```text
WO-O4O-QUASI-DRUG-PUBLIC-CANDIDATE-APPLY-V1
```

전제:

- WO 1 dry-run 승인
- 사전 백업 확인
- 명시적 apply 승인 문구

허용 write:

- `product_candidates` only

금지:

- `product_masters`
- `product_identifiers`
- `product_drug_extensions`
- `product_images`
- offer/listing/store_local_product

### WO 3. official regulatory text parser

```text
WO-O4O-QUASI-DRUG-PERMIT-XML-TEXT-PARSER-V1
```

목표:

- `EE_DOC_DATA` / `UD_DOC_DATA` / `NB_DOC_DATA` XML/CDATA 파싱
- 원문 보존 + 파생 텍스트 분리
- SharedProductDescription 또는 후속 설명 제작 참고 구조 검토

### WO 4. SKU/barcode source audit

```text
IR-O4O-QUASI-DRUG-SKU-BARCODE-SOURCE-AUDIT-V1
```

목표:

- 의약외품 포장단위/SKU/barcode/표준코드 공공 원천 존재 여부 조사
- ProductMaster Gate B 가능성 재판정

---

## 15. 완료 기준 체크

| 기준 | 결과 |
|---|---|
| CHECK 문서 작성 | 완료 |
| 코드 변경 없음 또는 최소 read-only helper만 | 코드 변경 없음 |
| DB write 0 | 준수 |
| raw 파일 커밋 0 | 준수 |
| secret 노출 0 | 준수 |
| ProductMaster 승격 가능성 1차 판단 | V1 승격 보류, Candidate까지만 권장 |
| 다음 WO 제안 | 완료 |

---

## 16. 최종 판단

의약외품은 의약품과 가장 가까운 공공 seed 후보지만, 의약품 약가마스터와 같은 SKU/포장단위 식별자 축이 아직 확인되지 않았다. 그러므로 현 단계에서 가장 안전한 진행은 다음 순서다.

```text
raw 위치 확인
→ 전량/표본 field stats
→ offline dry-run
→ ProductCandidate Gate A
→ XML 공식 설명 파싱
→ SKU/barcode 원천 별도 조사
→ ProductMaster Gate B 재판정
```

이번 V1 CHECK의 결론은 **"의약외품은 ProductCandidate로 먼저 받아야 하며, ProductMaster 승격은 아직 하지 않는다"** 이다.
