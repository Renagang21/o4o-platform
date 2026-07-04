# WO-O4O-QUASI-DRUG-PUBLIC-RAW-RESTORE-AND-FIELD-SAMPLE-DRYRUN-V1

> 작업 성격: read-only field/sample dry-run. 코드 변경, DB write, migration, Cloud Run Job, ProductCandidate/ProductMaster/ProductIdentifier apply 없음.
> 작성일: 2026-07-04
> 선행 문서: `docs/checks/CHECK-O4O-QUASI-DRUG-PUBLIC-SEED-MAPPING-V1.md`
> 기준선: `docs/investigations/IR-O4O-PUBLIC-PRODUCT-SEED-STANDARD-PROCESS-V1.md`
> 범위 고정: **의약외품 트랙 전용.** 의료기기/건강기능식품/약가마스터로 확장 금지.

---

## 0. 실행 환경 및 raw 복원 결과

선행 CHECK 문서 §1.2는 raw 파일을 "미확인"으로 기록했다(당시 실행환경에서 repo 밖 Windows/Google Drive 원본을 열지 못함). 이번 WO는 **집 PC(Windows, `C:\Users\sohae\o4o-platform`)** 에서 수행했고, raw 파일을 실제로 복원해 실측했다.

| 항목 | 값 |
|---|---|
| raw 파일 | `G:\내 드라이브\자료실\public-data-api-samples\mfds-quasi-drug-permit-raw.jsonl` |
| 크기 | 53.72 MB |
| 수집 시각 | `fetchedAt` = 2026-07-02T06:46:46Z (파일 mtime 2026-07-02) |
| 총 row 수 | **20,000** (표본 capped. 원천 totalCount = 22,949, 잔여 2,949 미수집) |
| 형식 | JSONL. 각 line = `{ sourceDataset, fetchedAt, pageNo, rowIndex, item }` wrapper. 실제 필드는 `item` 하위 |

같은 폴더의 공공 seed raw 표준 저장소(canonical):

```text
mfds-drug-master-standard-code.csv          52.34 MB   (약가마스터, 별도 트랙)
mfds-easy-drug-info-raw.jsonl               12.35 MB   (e약은요, 별도 트랙)
mfds-medical-device-standard-code-raw.jsonl 18.26 MB   (의료기기, 별도 트랙)
mfds-quasi-drug-permit-raw.jsonl            53.72 MB   ← 이번 대상
```

> **CHECK §1.2 정정:** 문서에 기록된 raw 경로 `C:\Users\home\coding\o4o-public-data-samples\...`는 **회사 PC 기준**이며 틀린 값이 아니다. 실제 canonical 저장소는 Google Drive `G:\내 드라이브\자료실\public-data-api-samples\`이다. "미확인" 상태는 이번 WO로 **해소**됐다.
>
> **중요: 아래 모든 수치는 20,000 표본 기준이다.** 전량(22,949) 분포는 잔여 2,949 보강 후 Gate A dry-run에서 재계산해야 한다.

---

## 1. line count / JSON parse / 구조

| 지표 | 값 |
|---|---:|
| non-empty lines | 20,000 |
| JSON parse 오류 | **0** |
| `.item` 결측(wrapper만) | **0** |
| 유효 분석 레코드 | 20,000 |

**`.item` 언랩 필요 확정.** 각 라인 최상위는 `{ sourceDataset, fetchedAt, pageNo, rowIndex, item }` wrapper이고, 실제 허가정보 필드는 전부 `item` 하위에 있다. mapper는 반드시 `.item`을 파싱한다(최상위 아님).

---

## 2. item 필드 전량 (20개) 및 존재율

표본 20,000건 모두 동일한 20개 키를 가진다(첫 레코드 키셋 = 전체 union, 구조 일관).

```text
ITEM_SEQ, ITEM_NAME, ENTP_NAME, ITEM_PERMIT_DATE, ITEM_NO, CANCEL_CODE_NAME,
CANCEL_DATE, MAIN_INGR, ADIT_INGR, CLASS_NO, CLASS_NO_NAME, PERMIT_KIND_CODE_NM,
INDUTY_CODE, MANUF_COUNTRY_NAMES, EE_DOC_DATA, UD_DOC_DATA, NB_DOC_DATA,
ENTP_NO, ENTP_SEQ, BIZRNO
```

### 2.1 필드 존재율 (non-empty / 20,000)

| 필드 | 존재율 | 비고 |
|---|---:|---|
| `ITEM_SEQ` | 100.00% | 결측 0, 아래 §4 |
| `ITEM_NAME` | 100.00% | 결측 0 |
| `ENTP_NAME` | 100.00% | 결측 0 |
| `ITEM_PERMIT_DATE` | 100.00% | 허가일 전건 |
| `ITEM_NO` | 100.00% | 존재는 100%지만 유일성 낮음(§4.3) |
| `CANCEL_CODE_NAME` | 100.00% | 상태 전건 존재 |
| `CANCEL_DATE` | 23.70% | 비-정상 4,740건에만 존재(정상=76.30% 상보) |
| `MAIN_INGR` | 28.95% | 주성분. 마스크·생리대·반창고류는 대부분 결측 |
| `ADIT_INGR` | 97.58% | 첨가제 |
| `CLASS_NO` | 100.00% | 분류코드 전건 |
| `CLASS_NO_NAME` | 100.00% | 분류명 전건 |
| `PERMIT_KIND_CODE_NM` | 100.00% | 허가/신고 (§3) |
| `INDUTY_CODE` | 100.00% | 제조/수입 (§3) |
| `MANUF_COUNTRY_NAMES` | 8.99% | 수입(8.88%)에만 존재 |
| `EE_DOC_DATA` | 99.98% | 효능효과 XML |
| `UD_DOC_DATA` | 99.98% | 용법용량 XML |
| `NB_DOC_DATA` | 99.70% | 사용상주의 XML |
| `ENTP_NO` | 100.00% | 업체 식별 보조 |
| `ENTP_SEQ` | 100.00% | 업체 식별 보조 |
| `BIZRNO` | 99.98% | 사업자번호 |

`candidateName`은 `ITEM_NAME`(100%), `candidateManufacturer`는 `ENTP_NAME`(100%)로 확정 가능하다.

---

## 3. 분류/속성 분포

### 3.1 CANCEL_CODE_NAME (상태) — CHECK §2 수치 실측 검증

| 상태 | 실측 건수 | 비율 | CHECK §2 기록 | 일치 |
|---|---:|---:|---:|:--:|
| 정상 | 15,260 | 76.30% | 15,260 | ✅ |
| 폐업 | 2,380 | 11.90% | 2,380 | ✅ |
| 행정(취소) | 1,398 | 6.99% | 1,398 | ✅ |
| 취하 | 958 | 4.79% | 958 | ✅ |
| 취소 | 4 | 0.02% | 4 | ✅ |
| 합계 | 20,000 | 100% | 20,000 | ✅ |

**CHECK 문서 §2의 상태 분포는 raw 실측과 완전 일치한다.** 선행 기록 기반 수치가 정확함을 확인했다. `CANCEL_DATE` 존재율 23.70%(=4,740건)는 비-정상 합계(2,380+1,398+958+4=4,740)와 정확히 일치 → 상태-일자 정합성 확인.

### 3.2 PERMIT_KIND_CODE_NM (허가 종류)

| 값 | 건수 | 비율 |
|---|---:|---:|
| 허가 | 12,245 | 61.22% |
| 신고 | 7,755 | 38.77% |

의약외품에는 **허가 외 신고 품목이 38.77%** 존재한다. Candidate `rawPayload`에 보존한다.

### 3.3 INDUTY_CODE (제조/수입)

| 값 | 건수 | 비율 |
|---|---:|---:|
| 제조 | 18,224 | 91.12% |
| 수입 | 1,776 | 8.88% |

수입 비율(8.88%)은 `MANUF_COUNTRY_NAMES` 존재율(8.99%)과 근사 → 수입 품목에만 제조국이 채워짐.

### 3.4 CLASS_NO_NAME (39개 분류, 상위 10)

| 건수 | 분류 |
|---:|---|
| 5,778 | [32200]보건용 마스크 |
| 2,961 | [41400]치약제 |
| 2,844 | [31100]생리대 |
| 2,155 | [32300]비말차단용 마스크 |
| 1,741 | [33800]반창고 |
| 1,356 | [46000]외용소독제 |
| 688 | [32100]수술용 마스크 |
| 448 | [33600]거즈 |
| 280 | [43200]기피제 |
| 269 | [41100]구중청량제 |

마스크류(보건용+비말+수술용) 8,621건(43%)이 최대 카테고리. `candidateCategory`는 `CLASS_NO_NAME` 사용이 안전하다.

---

## 4. 식별자(identifier) 실측 — 신규 강한 발견

### 4.1 ITEM_SEQ — 표본 내 완전 유일 (의료기기와 대조)

| 지표 | 값 |
|---|---:|
| 존재율 | 100.00% |
| distinct | **20,000** |
| 중복 그룹 | **0** |
| 순수 숫자 | 20,000 (100%) |
| 자릿수 | 전건 9자리 |

**`ITEM_SEQ`는 표본 20,000건에서 중복 0, 전건 9자리 숫자로 완전 유일 키다.** 이는 의료기기 `UDIDI_CD`가 126개 충돌(122개 실충돌)을 가졌던 것과 정반대다. 의약외품 Candidate dedup/검색 키로 `ITEM_SEQ`(→ `identifierType=MFDS_CODE`)는 매우 안정적이다.

> 단, 이는 20,000 표본 결과다. 잔여 2,949 보강 후 전량 22,949에서 중복 0을 재확인해야 한다.

### 4.2 ITEM_NAME + ENTP_NAME 중복

| 지표 | 값 |
|---|---:|
| distinct name\|entp | 19,992 |
| 중복 그룹 | 8 |
| 중복에 얽힌 row | 16 |

제품명+업체명 중복은 8쌍(16건)뿐이다. `ITEM_SEQ`가 유일하므로 이 16건은 **동일 제품명·업체의 서로 다른 허가(다른 `ITEM_SEQ`)** 로 해석된다. dedup은 `ITEM_SEQ` 기준으로 하고 name+entp는 보조 검출용으로만 쓴다(CHECK §12 Q8 유지).

### 4.3 ITEM_NO — 유일성 낮음 (단독 식별자 부적합)

| 지표 | 값 |
|---|---:|
| 존재율 | 100.00% |
| distinct ITEM_NO | **1,303** (20,000건 대비) |

`ITEM_NO`는 값 예시 "2" 처럼 업체별 품목 일련번호 성격으로, distinct가 1,303뿐이다. **단독 고유 식별자로 부적합.** CHECK §5 판단(보조/`rawPayload` 보존) 유지.

---

## 5. barcode / SKU / 표준코드 필드 — 직접 스캔으로 부재 확정

20개 키를 barcode/pack/SKU/GTIN/EAN/UDI/standard-code 패턴으로 스캔한 결과, **실제 barcode·포장단위·표준코드 필드는 0개**다(패턴에 걸린 `CANCEL_CODE_NAME`/`PERMIT_KIND_CODE_NM`/`INDUTY_CODE`는 "CODE" 부분문자열 오탐이며 모두 상태/구분 필드).

| 축 | 의료기기 | 의약외품 |
|---|---|---|
| barcode/GTIN 식별자 | `UDIDI_CD` 존재, check digit 검증 가능 | **부재** |
| 포장단위/표준코드 | UDI-DI grain | **부재** |
| ProductMaster grain 근거 | 충족(충돌 해소 조건부) | **불충족** |

**이 직접 스캔은 CHECK §4·§10의 ProductMaster 승격 보류 판단을 실측으로 재확인한다.** 의약외품은 SKU/barcode 축이 데이터에 존재하지 않는다.

---

## 6. 공식 설명(EE/UD/NB) XML/CDATA 실측

| 지표 | 값 |
|---|---:|
| `EE_DOC_DATA` 존재 | 99.98% |
| `UD_DOC_DATA` 존재 | 99.98% |
| `NB_DOC_DATA` 존재 | 99.70% |
| 3개 중 1개 이상 | 100.00% (결측 전무는 아님, none=1건) |
| 3개 모두 | 99.68% |
| 3개 모두 결측 | 1건 (0.01%) |
| `<DOC ...>` 태그 포함 | 100.00% |
| **CDATA(`<![CDATA[`) 포함** | **99.90%** |
| HTML 엔티티(`&lt;`/`&gt;`) 포함 | 7.17% |

**설명 원문은 사실상 전건이 `<DOC type="EE|UD|NB">` XML이며, 99.90%가 CDATA 섹션을 포함한다.** CHECK §12 Q7("XML/CDATA 파싱 필요")이 실측으로 확정됐다. 후속 파서(WO 3)는 반드시 CDATA와 HTML 엔티티(7.17%)를 함께 처리해야 한다. 이번 WO는 파서를 만들지 않는다(원문 보존만).

---

## 7. CHECK 문서 대비 검증 요약

| 항목 | CHECK 문서 | 이번 dry-run 실측 | 판정 |
|---|---|---|---|
| raw 위치 | "미확인" | **G: 드라이브 확정, 53.72MB/20,000** | 해소 |
| 상태 분포(정상/폐업/행정/취하/취소) | 15,260/2,380/1,398/958/4 | 15,260/2,380/1,398/958/4 | **완전 일치** |
| ITEM_SEQ 식별자 강도 | "높음" | **표본 중복 0, 전건 9자리 숫자** | 실측 강화 |
| ITEM_NO 유일성 | "재확인 필요" | **distinct 1,303 = 단독 부적합 확정** | 실측 확정 |
| barcode/SKU 부재 | "미확인 → 승격 불가" | **20개 키 직접 스캔, 실제 부재 확정** | 실측 확정 |
| EE/UD/NB XML/CDATA | "가능성 높음" | **<DOC 100% / CDATA 99.90%** | 실측 확정 |
| ProductMaster 승격 | V1 보류 | **보류 근거 실측 강화** | 유지 |

---

## 8. Candidate 매핑 반영 (실측 조정)

CHECK §9 매핑을 유지하되 다음을 실측으로 확정/조정한다.

| ProductCandidate 필드 | 확정/조정 |
|---|---|
| `identifierType` | `MFDS_CODE` (ITEM_SEQ, 표본 유일성 확인) |
| `identifierValue` / `normalizedIdentifierValue` | trim(`ITEM_SEQ`) — 전건 9자리 숫자 |
| `candidateName` | `ITEM_NAME` (100%) |
| `candidateManufacturer` | `ENTP_NAME` (100%) |
| `candidateCategory` | `CLASS_NO_NAME` (100%, 39개 분류) |
| `candidateSpec` / `candidateUnit` / `candidateImageUrl` | `null` (§5 barcode/포장 부재 확정) |

`rawPayload.reviewFlags` 실측 규모:

| flag | 조건 | 표본 규모 |
|---|---|---:|
| `NOT_ACTIVE_PERMIT` | `CANCEL_CODE_NAME !== '정상'` | 4,740 (23.70%) |
| `XML_PARSE_REQUIRED` | EE/UD/NB 중 하나라도 존재 | 19,999 (100.00%) |
| `CDATA_PRESENT` (신규) | 설명에 CDATA 포함 | 19,980 (99.90%) |
| `OFFICIAL_TEXT_MISSING` | EE/UD/NB 모두 결측 | 1 (0.01%) |
| `MAIN_INGR_MISSING` | 주성분 결측 | 14,210 (71.05%) |
| `SKU_IDENTIFIER_MISSING` | barcode/표준코드/포장 부재 | 20,000 (100%) |
| `NOTIFICATION_ITEM` (신규) | `PERMIT_KIND_CODE_NM='신고'` | 7,755 (38.77%) |

dedup 후보(CHECK §9 유지, 실측 근거 보강):

```text
sourceType='external_api'
identifierType='MFDS_CODE'
normalizedIdentifierValue=ITEM_SEQ           ← 표본 중복 0
rawPayload.sourceKind='quasi_drug_permit'
deleted_at IS NULL
```

---

## 9. ProductMaster 승격 — 보류 유지 (실측 재확인)

| 조건 | 실측 | 판단 |
|---|---|---|
| 제품명/업체명 | 100% | 충족 |
| 품목 식별자(ITEM_SEQ) | 표본 유일, 9자리 숫자 | 충족(Candidate 키) |
| 허가 상태 | CANCEL_CODE_NAME 전건 | 정상 필터 가능 |
| **barcode/GTIN/표준코드** | **20개 키 직접 스캔 결과 부재** | **불충족** |
| **포장단위/SKU grain** | **부재** | **불충족** |
| check digit 검증 | 불가(코드 없음) | 불충족 |
| 이미지 | 필드 없음 | Gate C 불가 |

**결론: CHECK §10 판단 유지 — V1 ProductMaster 승격 보류.** 의료기기와 달리 의약외품 raw에는 barcode/SKU 축이 실측상 존재하지 않는다. Gate A(Candidate) 적재는 근거가 강화됐으나, Gate B는 별도 SKU/barcode 원천(CHECK §14 WO 4) 확보 전까지 보류가 안전하다.

---

## 10. read-only 준수 확인

| 항목 | 결과 |
|---|---|
| ProductCandidate/ProductMaster/ProductIdentifier apply | 0 |
| DB write | 0 |
| migration 작성 | 0 |
| Cloud Run Job 실행 | 0 |
| 대량 API 호출 | 0 (기존 로컬 raw만 읽음) |
| raw 대용량 파일 커밋 | 0 (raw는 repo 밖 G: 드라이브) |
| serviceKey/secret 기록 | 0 |
| 코드 변경 | 0 (분석 스크립트는 세션 scratchpad에만 존재) |
| 작업 범위 확장(의료기기/건기식) | 0 |

이번 변경은 문서 2건뿐이다: 본 WO 리포트 추가 + CHECK §1.2 raw 위치 보강.

---

## 11. 다음 단계 (의약외품 트랙 전용)

1. **잔여 2,949 보강** — totalCount 22,949 전량 수집 후 §3·§4 분포 재산출(특히 ITEM_SEQ 전량 유일성 재확인). serviceKey 비노출 수집.
2. **Gate A Candidate import dry-run** — mapper pure function(`.item` 언랩) + §8 dedup 규칙 + apply 예상 row 수 산출. DB write 0.
3. **Gate A Candidate apply** — `product_candidates` only. ProductMaster/Identifier/DrugExtension/Image 금지 (CHECK §14 WO 2).
4. **XML 공식 설명 파서(WO 3)** — EE/UD/NB의 `<DOC>` + CDATA(99.90%) + HTML 엔티티(7.17%) 파싱, 원문 보존 + 파생 텍스트 분리.
5. **SKU/barcode 원천 audit(WO 4)** — 의약외품 포장단위/표준코드 공공 원천 조사 후 Gate B 재판정.

**최종: 의약외품 표본 raw는 read-only로 실측 완료됐다. CHECK 문서 상태 분포는 완전 일치로 검증됐고, ITEM_SEQ 유일성·barcode 부재·EE/UD/NB CDATA가 실측 확정됐다. Gate A(Candidate) 근거는 강화, Gate B(ProductMaster 승격)는 barcode/SKU 축 부재로 보류 유지가 안전하다.**
