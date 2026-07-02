# CHECK-O4O-APPROVED-PUBLIC-DATA-API-BULK-FETCH-AND-SAMPLE-MAPPING-V1

> **작업 성격**: read-only 공공데이터 수집·검증. 운영 DB·코드 무변경, git 무커밋.
> **일자**: 2026-07-02
> **raw 저장 위치 (repo 밖, git tracked 아님)**: `C:\Users\home\coding\o4o-public-data-samples\`
> **키 노출**: 0건 (셸 변수로만 사용, 문서·로그·diff 미기록)

---

## 0. 요약

| # | API | 인증 | JSON | totalCount | 수집 row (상한여부) | 핵심필드 | 등급 |
|---|-----|:---:|:---:|---:|---:|------|:---:|
| 1 | 의료기기 표준코드별 제품정보 | ✅ | ✅ | 2,656,054 | 20,000 (**capped: pages 200**) | UDIDI_CD, PRDLST_NM, PERMIT_NO, MNFT_IPRT_ENTP_NM | **B** |
| 2 | 의약외품 제품 허가정보 | ✅ | ✅ | 22,949 | 20,000 (**capped: pages 200**) | ITEM_SEQ, ITEM_NAME, ENTP_NAME, CLASS_NO_NAME, MAIN_INGR, EE/UD/NB_DOC_DATA | **A** |
| 3 | 의약품개요정보(e약은요) | ✅ | ✅ | 4,774 | 4,774 (전량) | itemName, itemSeq, entpName, efcyQesitm, itemImage | **A** |
| 4 | 의료기기 품목허가 정보 | — | — | (미확인) | 0 | — | **E (엔드포인트 미확인)** |

- 등급 기준: **A** = 즉시 ProductCandidate/DrugExtension 적재 가능·핵심 필드 완비 / **B** = 수집 가능하나 식별자(barcode) 정규화·상한 이슈 있어 보조/부분 활용 / **E** = 엔드포인트 미확인.
- 공통: `serviceKey`는 64자 클린키. **User-Agent 헤더 필수** (UA 없으면 WAF가 HTTP 403 "Forbidden" 반환 — data.go.kr 일반 오류 XML 아님). 파라미터 `type=json` 지원.

---

## 1. 승인 API 목록 (2028-07-02 만료)

| # | 이름 | 요청 엔드포인트 |
|---|------|------|
| 1 | 의료기기 표준코드별 제품정보 | `https://apis.data.go.kr/1471000/MdeqStdCdPrdtInfoService03/getMdeqStdCdPrdtInfoInq03` |
| 2 | 의약외품 제품 허가정보 | `https://apis.data.go.kr/1471000/QdrgPrdtPrmsnInfoService03/getQdrgPrdtPrmsnInfoInq03` |
| 3 | 의약품개요정보(e약은요) | `https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList` |
| 4 | 의료기기 품목허가 정보 | **미확인** (data.go.kr dataset 15057456 존재하나 요청 URL 미노출) |

---

## 2. API별 호출 성공/실패

| API | HTTP | header.resultCode / resultMsg | 비고 |
|-----|:---:|------|------|
| 1 | 200 | `00` / NORMAL SERVICE. | UA 헤더 필수 (없으면 403) |
| 2 | 200 | `00` / NORMAL SERVICE. | items가 `{item:{...}}` **이중 중첩** — 파서에서 `.item` 언랩 필요 |
| 3 | 200 | `00` / NORMAL SERVICE. | items 평면 구조 |
| 4 | — | — | UA 유·무 모두 HTTP 500 "Unexpected errors" (게이트웨이 라우팅 실패 = 경로 부재). 후보 8종 probe 전부 500 |

### API 4 엔드포인트 탐색 경위
- data.go.kr dataset **15057456** = "식품의약품안전처_의료기기 품목허가 정보" (REST, JSON+XML, ~2,392,239건 명세). 페이지에 요청 URL·operation 미노출(Swagger UI/명세 다운로드 안내만).
- MFDS 명명 규칙 `{Name}Service01/get{Name}Inq01` 기준 후보 probe: `MdeqPrmsnInfoService01`, `MdeqItemPrmsnInfoService01`, `MdeqItemInfoService01/03`, `MdcinGrnItemService(01)`, `MdeqPrdlstInfoService01`, `MdeqPrmisnInfoService01`, `MdeqItemService(01)` 등 → **전부 HTTP 500** (엔드포인트 부재).
- 결론: **등급 E**. 사람이 data.go.kr 로그인 후 Swagger UI에서 정확한 서비스명/operation 확보 필요.

---

## 3. totalCount

- API1: **2,656,054** (초대형 → 상한 적용)
- API2: **22,949** (상한 초과 → 200페이지=20,000에서 cap)
- API3: **4,774** (상한 내 → 전량)

## 4. 받은 row 수 (상한 적용여부)

| API | 수집 | totalPages | maxPages | capped |
|-----|---:|---:|---:|------|
| 1 | 20,000 | 26,561 | 200 | **yes (pages 상한)** — 잔여 2,636,054 미수집 |
| 2 | 20,000 | 230 | 200 | **yes (pages 상한)** — 잔여 2,949 미수집 |
| 3 | 4,774 | 48 | 48 | no (전량) |

> 수집 파라미터: `numOfRows=100`, 호출 간 sleep 300ms, 실패 페이지 최대 3회 재시도, silent truncation 없음.

## 5. 실패 page 목록

- API1: **[]** (0건)
- API2: **[]** (0건)
- API3: **[]** (0건)

> raw 무결성 검증: API1 20,000 / API2 20,000 / API3 4,774 lines 모두 유효 JSON (bad 0).
> (수집 중 writeStream flush 이슈로 API3가 1차 불완전 저장 → 동기 append 방식으로 재수집하여 4,774 전량 정합 확정.)

---

## 6. 주요 필드명 (API별 item 필드)

### API1 — 의료기기 표준코드별 제품정보
`UDIDI_CD`(UDI-DI 표준코드), `PRDLST_NM`(품목명), `MDEQ_CLSF_NO`(분류번호), `CLSF_NO_GRAD_CD`(등급), `PERMIT_NO`(허가번호), `PRMSN_YMD`(허가일), `FOML_INFO`(형명), `PRDT_NM_INFO`(제품명), `USE_PURPS_CONT`(사용목적), `STRG_CND_INFO`(보관조건), `MNFT_IPRT_ENTP_NM`(제조수입업체명), 기타 Y/N 플래그(멸균·추적관리 등).

### API2 — 의약외품 제품 허가정보
`ITEM_SEQ`(품목기준코드), `ITEM_NAME`(제품명), `ENTP_NAME`(업체명), `ITEM_PERMIT_DATE`(허가일), `ITEM_NO`(품목번호), `CANCEL_CODE_NAME`(상태: 정상/폐업/취하/행정(취소)/취소), `CANCEL_DATE`, `MAIN_INGR`(주성분), `ADIT_INGR`(첨가제), `CLASS_NO`/`CLASS_NO_NAME`(분류), `PERMIT_KIND_CODE_NM`(허가종류), `INDUTY_CODE`(제조/수입), `MANUF_COUNTRY_NAMES`(제조국), `EE_DOC_DATA`(효능효과 XML), `UD_DOC_DATA`(용법용량 XML), `NB_DOC_DATA`(사용상주의 XML), `ENTP_NO`/`ENTP_SEQ`/`BIZRNO`.

### API3 — 의약품개요정보(e약은요)
`itemName`(제품명), `itemSeq`(품목기준코드), `entpName`(업체명), `efcyQesitm`(효능), `useMethodQesitm`(사용법), `atpnWarnQesitm`(경고), `atpnQesitm`(주의), `intrcQesitm`(상호작용), `seQesitm`(부작용), `depositMethodQesitm`(보관법), `openDe`/`updateDe`, `itemImage`(이미지 URL, nedrug.mfds.go.kr), `bizrno`.

---

## 7. O4O 필드 매핑표 (실제 엔티티 컬럼 확인 후 매핑)

> 확인 엔티티: `ProductMaster`, `ProductIdentifier`, `ProductImage`, `ProductCandidate`, `ProductDrugExtension` (모두 `apps/api-server/src/modules/neture/entities/`).

### API1 (의료기기 표준코드) → O4O

| O4O 필드 | 소스 필드 | 비고 |
|------|------|------|
| `name` / `regulatoryName` | `PRDLST_NM` (또는 `PRDT_NM_INFO`) | |
| `manufacturerName` | `MNFT_IPRT_ENTP_NM` | |
| `regulatoryType` | (고정) `MEDICAL_DEVICE` | 소스에 직접 필드 없음 → 데이터셋 유형으로 설정 |
| `specification` | `FOML_INFO`(형명) + `USE_PURPS_CONT` 조합 | 단일 대응 컬럼 없음 |
| barcode | `UDIDI_CD` | **주의**: 표본 20,000 중 순수 14자리 숫자 19,055(≈95%, GTIN-14 castable) / 비숫자(HIBCC `+…` 등) 945(≈5%) → 비숫자는 barcode 부적합 |
| 허가·신고번호 | `PERMIT_NO` | ProductMaster에 `mfdsPermitNumber`(nullable) 존재 → 매핑 가능 |
| `mfdsProductId` (source id) | `UDIDI_CD` (또는 `PERMIT_NO`) | 안정적 고유키는 UDIDI_CD |
| ProductIdentifier | UDIDI_CD → `MFDS_CODE` (숫자14면 `GTIN`도 가능) | 아래 §10 참조 |
| ProductImage | **없음** | 이미지 필드 부재 |
| rawPayload | item 전체 | ✅ `ProductCandidate.rawPayload`(jsonb) 적합 |

### API2 (의약외품 허가) → O4O

| O4O 필드 | 소스 필드 | 비고 |
|------|------|------|
| `name` / `regulatoryName` / `candidateName` | `ITEM_NAME` | |
| `manufacturerName` / `candidateManufacturer` | `ENTP_NAME` | |
| `regulatoryType` | (고정) `QUASI_DRUG` | `drugCategory`='quasi_drug'로 세분 가능 |
| `candidateCategory` | `CLASS_NO_NAME` | |
| `mfdsProductId` / source id | `ITEM_SEQ` | 품목기준코드(고유) |
| 허가·신고번호 | `ITEM_SEQ`(+`ITEM_NO`) | 별도 permit 문자열 없음. `ITEM_PERMIT_DATE`=허가일 |
| 성분 | `MAIN_INGR`/`ADIT_INGR` | `ProductDrugExtension.ingredientSummary`/`activeIngredients` |
| 효능/용법/주의 | `EE_DOC_DATA`/`UD_DOC_DATA`/`NB_DOC_DATA` (XML) | `ProductDrugExtension.efficacyText`/`dosageText`/`cautionText` (CDATA 파싱 필요) |
| 상태 필터 | `CANCEL_CODE_NAME` | 분포: 정상 15,260 / 폐업 2,380 / 행정(취소) 1,398 / 취하 958 / 취소 4 → **정상만 승격 권장** |
| ProductImage | **없음** | |
| rawPayload | item 전체 | ✅ 적합 |

### API3 (e약은요) → O4O

| O4O 필드 | 소스 필드 | 비고 |
|------|------|------|
| `name` / `candidateName` | `itemName` | |
| `manufacturerName` / `candidateManufacturer` | `entpName` | |
| `regulatoryType` | (고정) `DRUG` | OTC/일반 중심(개요정보) |
| `mfdsProductId` / source id | `itemSeq` | 품목기준코드(고유) — API2 `ITEM_SEQ`와 동일 체계 → **cross-API 조인 가능** |
| 효능/용법/주의/부작용/보관 | `efcyQesitm`/`useMethodQesitm`/`atpnQesitm`/`seQesitm`/`depositMethodQesitm` | `ProductDrugExtension.efficacyText`/`dosageText`/`cautionText`/`storageText` 직결 (평문, XML 파싱 불필요) |
| ProductImage | `itemImage` | **존재** — 4,774 중 2,806건(59%) non-null. `nedrug.mfds.go.kr/pbp/cmn/itemImageDownload/…` |
| rawPayload | item 전체 | ✅ 적합 |

---

## 8. ProductCandidate 저장 가능성

- **3개 API 모두 저장 가능.** `ProductCandidate`는 varchar+jsonb 유연 스키마(candidateName/candidateManufacturer/candidateCategory/rawPayload)로 미확정 외부 데이터를 그대로 수용.
- 권장 `sourceType` = **`external_api`** (이미 enum union에 존재, 추가 불필요).
- `rawPayload`(jsonb)에 item 원형 보존 → 후속 매칭/승격 시 손실 없음.
- API별 권장 `serviceKey`: 의료기기·의약외품·의약품 모두 서비스 중립 후보 → serviceKey null 또는 운영 스코프로 적재.

## 9. ProductMaster 승격 가능성

| API | 승격 적합도 | 사유 |
|-----|:---:|------|
| **API3 (e약은요)** | **높음** | itemSeq(고유), 제조사, 효능/용법/주의 평문, 이미지(59%) 완비 → ProductMaster + ProductDrugExtension 승격 최적 |
| **API2 (의약외품)** | **중간~높음** | ITEM_SEQ(고유)·성분·효능(XML) 완비. `CANCEL_CODE_NAME='정상'` 필터 필수. XML(EE/UD/NB) CDATA 파싱 필요 |
| **API1 (의료기기)** | **부분** | barcode(UDIDI_CD) 5%가 비-GTIN(HIBCC)이라 ProductMaster.barcode(varchar14) 직입 부적합 → **보조 검색/식별자 매칭용** 권장. 승격은 숫자14 GTIN 건에 한정하거나 UDIDI를 MFDS_CODE 식별자로만 |

> ProductMaster 불변필드(barcode/regulatory*/manufacturer*/mfds*) 계약상, 승격은 **정상 상태 + 고유 source id 확보** 건에 한해 안전.

## 10. ProductIdentifier type 추가 필요 여부

- 현재 enum union: `GTIN, EAN13, UPC, JAN, INTERNAL_O4O, SUPPLIER_SKU, PHARMACY_LOCAL, STORE_LOCAL, KOREA_DRUG_CODE, KOREA_INSURANCE_CODE, ATC_CODE, MFDS_CODE, UNKNOWN`.
- **판정: 신규 type 추가 불필요 (기존으로 수용 가능).**
  - API1 `UDIDI_CD` 숫자14 → `GTIN`, 비숫자(HIBCC) → `MFDS_CODE` 또는 `UNKNOWN`.
  - API2 `ITEM_SEQ` / API3 `itemSeq` (품목기준코드) → **`MFDS_CODE`** 로 수용 가능.
- (선택) 품목기준코드를 명시적으로 구분하고 싶다면 `MFDS_ITEM_SEQ` 같은 type을 향후 추가 검토 가능하나, **현 시점 필수 아님** — application-level varchar union이라 enum migration 불필요하게 설계되어 있음.

## 11. 이미지 필드 존재 여부

| API | 이미지 필드 | 존재율 | ProductImage 매핑 |
|-----|------|:---:|------|
| 1 | 없음 | — | 불가 |
| 2 | 없음 | — | 불가 |
| 3 | `itemImage` | 2,806 / 4,774 (**59%**) | 가능 (`ProductImage.imageUrl`, type='detail'/'thumbnail'). GCS 복사 파이프라인 필요(외부 URL 직참조 대신 사본 권장) |

## 12. 다음 구현 권장 순서

1. **API3 (e약은요) → ProductCandidate 적재** — 필드 완비·전량 수집됨. `sourceType='external_api'`, rawPayload 보존. itemSeq 기준 중복 판정.
2. **API3 승격 파이프라인** — ProductMaster + ProductDrugExtension 매핑(효능/용법/주의 평문 직결) + itemImage GCS 사본 → ProductImage.
3. **API2 (의약외품) → Candidate** — `CANCEL_CODE_NAME='정상'` 필터 + EE/UD/NB XML(CDATA) 파서 구현 후 DrugExtension 텍스트 매핑. ITEM_SEQ로 API3와 cross-link.
4. **API2 상한 해제 수집** — totalCount 22,949 전량(현재 20,000 capped) 필요 시 페이지 상한 상향.
5. **API1 (의료기기)** — 보조 식별자/검색 용도로 UDIDI_CD를 ProductIdentifier(GTIN/MFDS_CODE)에 매핑. 전량(2.6M) 적재는 별도 배치 설계 필요(현재 20,000 표본만).
6. **API4 (의료기기 품목허가)** — 사람이 data.go.kr Swagger에서 정확한 endpoint 확보 후 재시도.

---

## 부록 — raw 파일 경로 (repo 밖, git 미추적)

```
C:\Users\home\coding\o4o-public-data-samples\mfds-medical-device-standard-code-raw.jsonl   (20,000 rows)
C:\Users\home\coding\o4o-public-data-samples\mfds-quasi-drug-permit-raw.jsonl              (20,000 rows)
C:\Users\home\coding\o4o-public-data-samples\mfds-easy-drug-info-raw.jsonl                 (4,774 rows)
C:\Users\home\coding\o4o-public-data-samples\fetch-report.json                             (수집 요약)
```

각 JSONL row 메타: `{"sourceDataset","fetchedAt","pageNo","rowIndex","item":{...}}`.
API4 raw 파일 없음(엔드포인트 미확인).
