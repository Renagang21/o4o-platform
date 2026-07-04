# WO-O4O-QUASI-DRUG-PUBLIC-CANDIDATE-IMPORT-DRYRUN-V1

> 작업 성격: **Gate A ProductCandidate import dry-run (offline, read-only).** DB write 0, apply 0, migration 0, Cloud Run Job 0, 코드 변경 0.
> 작성일: 2026-07-04
> 선행: `docs/work-orders/WO-O4O-QUASI-DRUG-PUBLIC-RAW-RESTORE-AND-FIELD-SAMPLE-DRYRUN-V1.md`, `docs/checks/CHECK-O4O-QUASI-DRUG-PUBLIC-SEED-MAPPING-V1.md`
> 매핑 기준: 실제 엔티티 `apps/api-server/src/modules/neture/entities/ProductCandidate.entity.ts`
> 패턴 기준: `apps/api-server/src/modules/neture/drug-import/drug-candidate-import.service.ts` (약가마스터 선례)
> 범위 고정: **의약외품 트랙 전용.** 의료기기/건강기능식품 확장 금지. 병렬 세션 파일 무수정.

---

## 0. 목적

의약외품 raw 20,000건 기준으로 **ProductCandidate 적재 가능성만** dry-run으로 검증한다. mapper(pure) 설계 + dedup 규칙 + 예상 적재 결과(created/skipped/errored/상태분포/reviewFlags)를 산출한다. **DB write·apply 없음.** ProductMaster/ProductIdentifier 승격은 이 WO 범위 밖(0건 명시).

> **표본 경계:** 모든 수치는 20,000 표본 기준. 전량 22,949(잔여 2,949 미수집) 재산출은 후속.

---

## 1. 실제 엔티티 매핑 (컬럼 검증됨)

`product_candidates` 실제 컬럼 기준. 사용자 초안의 `regulatoryType`/`sourceItemSeq`/`sourceStatus`는 **엔티티 최상위 컬럼이 아니다** → `raw_payload`(jsonb)에 보존한다.

| ProductCandidate 컬럼 | 타입 | 매핑 |
|---|---|---|
| `service_key` | varchar(50) null | `null` (공공 seed, 특정 서비스 귀속 금지) |
| `organization_id` | uuid null | `null` |
| `source_type` | varchar(32) | `external_api` (엔티티 union 값) |
| `source_label` | varchar(128) null | `MFDS_QUASI_DRUG_PERMIT` |
| `candidate_status` | varchar(32) | `pending` |
| `match_status` | varchar(32) | `unmatched` |
| `identifier_type` | varchar(40) null | `MFDS_CODE` (ITEM_SEQ 존재 시) |
| `identifier_value` | varchar(128) null | trim(`ITEM_SEQ`) — max 9자, 안전 |
| `normalized_identifier_value` | varchar(128) null | trim(`ITEM_SEQ`) |
| `candidate_name` | varchar(255) null | trim(`ITEM_NAME`) — **§4 truncation 규칙 필요** |
| `candidate_brand` | varchar(255) null | `null` |
| `candidate_manufacturer` | varchar(255) null | trim(`ENTP_NAME`) — max 25자, 안전 |
| `candidate_category` | varchar(255) null | trim(`CLASS_NO_NAME`) — max 65자, 안전 |
| `candidate_spec` | varchar(255) null | `null` (포장/SKU 규격 부재) |
| `candidate_unit` | varchar(64) null | `null` (포장단위 부재) |
| `candidate_image_url` | text null | `null` (이미지 필드 없음) |
| `candidate_price` | numeric null | `null` |
| `raw_payload` | jsonb null | §2 구조 |

### 1.1 raw_payload 구조

```json
{
  "source": { "…item 전체 20필드…" },
  "sourceAgency": "MFDS",
  "sourceDatasetId": "15095679",
  "sourceDatasetName": "의약외품 제품 허가정보",
  "sourceKind": "quasi_drug_permit",
  "sourceRowKey": "<ITEM_SEQ>",
  "regulatoryType": "QUASI_DRUG",
  "status": { "cancelCodeName": "<CANCEL_CODE_NAME>", "cancelDate": "<CANCEL_DATE|null>" },
  "reviewFlags": ["…"]
}
```

`EE_DOC_DATA`/`UD_DOC_DATA`/`NB_DOC_DATA` XML은 **이 WO에서 파싱하지 않는다.** `raw_payload.source`에 원문 그대로 보존하고, 파싱은 후속 XML 파서 WO로 분리한다.

---

## 2. mapper (pure function) 설계

`drug-master-row.mapper.ts` 선례와 동일하게 **순수 함수**로 설계한다(입력=raw item, 출력=candidate input + reviewFlags, 부수효과 없음).

```text
mapQuasiDrugRow(item) -> { candidateInput, reviewFlags, dedupKey, isCancelled }

trim 규칙:   빈문자/공백 -> null
identifier:  ITEM_SEQ 있으면 identifierType=MFDS_CODE, value=normalized=trim(ITEM_SEQ)
name:        candidateName = trim(ITEM_NAME)  (§4 length guard)
manufacturer:candidateManufacturer = trim(ENTP_NAME)
category:    candidateCategory = trim(CLASS_NO_NAME)
status:      isCancelled = (CANCEL_CODE_NAME !== '정상')
xml:         EE/UD/NB 원문 보존만 (파싱 금지)
```

### 2.1 dedup 규칙 (offline = 파일 내부, apply = DB 조회)

```text
dedupKey = external_api :: MFDS_CODE :: normalized(ITEM_SEQ) :: quasi_drug_permit

offline dry-run: 파일 내부 dedupKey 중복 -> skipped_dup
                 ITEM_SEQ 결측(dedupKey null) -> skipped_no_identifier
apply(후속 WO): 기존 product_candidates 조회
  WHERE source_type='external_api'
    AND identifier_type='MFDS_CODE'
    AND normalized_identifier_value=<ITEM_SEQ>
    AND raw_payload->>'sourceKind'='quasi_drug_permit'
    AND deleted_at IS NULL
  존재 -> updated(write 생략, 재실행 안전) / 없음 -> created
```

---

## 3. dry-run 실행 결과 (offline, 20,000 표본)

| 지표 | 값 |
|---|---:|
| totalLines | 20,000 |
| parse OK / error | 20,000 / **0** |
| `.item` 결측 | **0** |
| processed | 20,000 |
| **counts.created (예측 적재)** | **20,000** |
| counts.skipped_dup | **0** |
| counts.skipped_no_identifier | **0** |
| counts.errored | **0** |
| classification.active (정상) | 15,260 |
| classification.cancelled (비정상) | 4,740 |
| ITEM_SEQ 중복 row | **0** |
| **ProductMaster 승격 대상** | **0 (명시 — Gate A 전용)** |

### 3.1 필수 필드 결측 (격리 대상)

| 필드 | 결측 수 |
|---|---:|
| `ITEM_SEQ` | 0 |
| `ITEM_NAME` | 0 |
| `ENTP_NAME` | 0 |
| `CLASS_NO_NAME` | 0 |

표본 20,000건 전부 필수 4필드가 채워져 있어 **격리(skip) 대상 0건**. 전량 매핑 성공.

### 3.2 상태 분포 (Candidate 보존, active만 향후 승격 후보)

| CANCEL_CODE_NAME | 건수 | Candidate | 승격 |
|---|---:|---|---|
| 정상 | 15,260 | 적재 | 향후 후보(SKU 확보 전 보류) |
| 폐업 | 2,380 | 적재+flag | 제외 |
| 행정(취소) | 1,398 | 적재+flag | 제외 |
| 취하 | 958 | 적재+flag | 제외 |
| 취소 | 4 | 적재+flag | 제외 |

비정상 row도 삭제하지 않고 `raw_payload` + `NOT_ACTIVE_PERMIT` flag로 보존한다(CHECK §7 원칙).

### 3.3 reviewFlag 분포 (표본)

| flag | 건수 | 의미 |
|---|---:|---|
| `SKU_IDENTIFIER_MISSING` | 20,000 | barcode/표준코드/포장 부재(전건) → ProductMaster 보류 근거 |
| `XML_PARSE_REQUIRED` | 19,999 | EE/UD/NB 중 하나 이상 존재 → 후속 파서 대상 |
| `CDATA_PRESENT` | 19,980 | 설명에 CDATA 포함 → 파서 CDATA 처리 필수 |
| `NOTIFICATION_ITEM` | 7,755 | `PERMIT_KIND_CODE_NM='신고'` |
| `NOT_ACTIVE_PERMIT` | 4,740 | 정상 외 상태 |
| `CANDIDATE_NAME_OVERLENGTH` | 260 | `ITEM_NAME` > 255자 (§4) |
| `OFFICIAL_TEXT_MISSING` | 1 | EE/UD/NB 모두 결측 |
| `ITEM_SEQ_MISSING` | 0 | — |
| `ITEM_NAME_MISSING` | 0 | — |
| `MANUFACTURER_MISSING` | 0 | — |
| `CATEGORY_MISSING` | 0 | — |

---

## 4. 신규 발견 — candidate_name 길이 초과 (apply 선결 규칙)

실측 결과 `ITEM_NAME` 최대 길이는 **1,840자**이고, **260건이 `candidate_name` varchar(255)를 초과**한다.

| 필드 | 컬럼 한도 | 실측 max | 초과 건수 |
|---|---:|---:|---:|
| `ITEM_SEQ` → identifier_value | 128 | 9 | 0 |
| `ITEM_NAME` → candidate_name | **255** | **1,840** | **260** |
| `ENTP_NAME` → candidate_manufacturer | 255 | 25 | 0 |
| `CLASS_NO_NAME` → candidate_category | 255 | 65 | 0 |

**apply 선결 mapper 규칙:** `candidate_name`은 255자로 truncate하되, **전체 원문은 이미 `raw_payload.source.ITEM_NAME`에 보존**되므로 손실 없음. 초과 row에는 `CANDIDATE_NAME_OVERLENGTH` flag를 부여한다. (약가마스터 선례처럼 컬럼 초과를 그냥 INSERT하면 Postgres varchar(255)에서 에러 → 반드시 truncate 처리.)

> 이 규칙 없이 apply하면 260건이 insert 에러로 errored 처리된다. dry-run이 사전 포착했다.

---

## 5. 예상 적재 요약

| 항목 | 표본 예측 | apply 시 실제(후속) |
|---|---:|---|
| 신규 Candidate created | 20,000 | 잔여 2,949 보강 후 최대 22,949 |
| skipped(중복/식별자 결측) | 0 | 전량 기준 재확인 |
| errored | 0 (truncate 규칙 적용 시) | truncate 미적용 시 260 |
| ProductMaster 생성 | **0** | **0 (Gate A 범위 밖)** |
| ProductIdentifier 생성 | **0** | **0** |

**Gate A apply는 `product_candidates` INSERT만** 대상이다. 성능은 약가마스터 선례(청크 multi-row INSERT 500行/문 + sourceBase dedup 선적재)를 따르면 22,949 규모는 문제없다.

---

## 6. read-only 준수 확인

| 항목 | 결과 |
|---|---|
| ProductCandidate apply / DB write | 0 |
| ProductMaster/ProductIdentifier 생성 | 0 |
| migration / Cloud Run Job | 0 |
| raw 대용량 파일 커밋 | 0 (raw는 repo 밖 G: 드라이브) |
| 코드 변경 | 0 (mapper/dedup는 설계 + scratchpad 시뮬레이션만, 프로덕션 코드 미작성) |
| XML(EE/UD/NB) 파싱 | 0 (원문 보존, 후속 WO 분리) |
| 병렬 세션 파일 수정 | 0 |
| 범위 확장(의료기기/건기식) | 0 |

이번 변경은 문서 1건(본 WO) 추가뿐이다.

---

## 7. 다음 단계 (의약외품 트랙 전용, 순서)

1. **잔여 2,949 보강** — totalCount 22,949 전량 수집(serviceKey 비노출), 전량 기준 ITEM_SEQ 유일성·§3 분포·§4 overlength 재산출.
2. **mapper/서비스 구현 WO** — 본 설계(§1~2)를 프로덕션 코드로. `candidate_name` truncate(255) + `CANDIDATE_NAME_OVERLENGTH` flag 필수. offline dry-run 테스트 포함.
3. **Gate A Candidate apply** — 사용자 승인 + 백업 확인 후 `product_candidates` only INSERT. ProductMaster/Identifier/DrugExtension/Image 금지. 재실행 안전(idempotent).
4. **XML 공식 설명 파서 WO** — EE/UD/NB `<DOC>`+CDATA(99.90%)+HTML엔티티(7.17%) 파싱, 원문 보존 + 파생 분리.
5. **SKU/barcode 원천 audit WO** → Gate B(ProductMaster 승격) 재판정.

**최종: 의약외품 Gate A Candidate import는 offline dry-run 기준 20,000건 전량 적재 가능(skipped 0, errored 0)으로 예측된다. 유일한 apply 선결 조건은 `candidate_name` 255자 truncation(260건, 원문은 rawPayload 보존)이다. ProductMaster 승격은 이 WO 범위 밖(0건)이며 SKU/barcode 원천 확보 후 Gate B에서 재판정한다.**
