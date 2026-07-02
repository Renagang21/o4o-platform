# CHECK-O4O-EASY-DRUG-INFO-CANDIDATE-IMPORT-V1

> **작업명**: WO-O4O-EASY-DRUG-INFO-PRODUCT-CANDIDATE-IMPORT-V1
> **일자**: 2026-07-02
> **성격**: e약은요(의약품개요정보) raw JSONL → 기존 `ProductCandidate` 적재 파이프라인 구현 (parser+mapper+service+CLI+테스트)
> **선행**: `docs/checks/CHECK-O4O-APPROVED-PUBLIC-DATA-API-BULK-FETCH-AND-SAMPLE-MAPPING-V1.md` (§7 API3 매핑표), 기존 `apps/api-server/src/modules/neture/drug-import/`(약가마스터 CSV import) 구조/CLI 관례
> **안전 경계 준수**: `--apply` **미실행**. dry-run(offline)까지만 실증. ProductCandidate 외 DB write 0. 스키마 변경/마이그레이션 0. raw 파일 repo 미커밋.

---

## 1. 구현 파일 목록

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/neture/drug-import/easy-drug-info-jsonl.parser.ts` | JSONL 파서(PURE). fetch 메타 래핑 언랩, line 단위 오류 `errors[]` 누적(무음 손실 금지), 빈줄 `blankLines` 카운트 |
| `apps/api-server/src/modules/neture/drug-import/easy-drug-info-candidate.mapper.ts` | item 1건 → ProductCandidate 후보 매핑(PURE). reviewFlags 산출, officialConsumerText 분리 보존 |
| `apps/api-server/src/modules/neture/drug-import/easy-drug-info-candidate-import.service.ts` | 파이프라인. dry-run(offline/DB)·apply, dedup, 리포트 |
| `apps/api-server/src/scripts/easy-drug-info-candidate-import.ts` | CLI. `--file/--service-key/--limit/--dry-run/--apply/--use-db`. apply는 env 가드로 차단 |
| `apps/api-server/src/modules/neture/drug-import/__tests__/easy-drug-info-candidate-import.test.ts` | 단위 테스트 17건 (DB 불필요) |
| `apps/api-server/package.json` | `easy-drug-info:import` 스크립트 1줄 추가 |

> 신규 엔티티/테이블/마이그레이션 **0**. 기존 `ProductCandidate`(`product_candidates`) 재사용만.

---

## 2. 매핑표 (e약은요 item → ProductCandidate)

| ProductCandidate 컬럼 | 소스 | 값 | 비고 |
|------|------|------|------|
| `source_type` | (고정) | `external_api` | 실 enum union 에 존재(추가 불필요) |
| `source_label` | (고정) | `MFDS_EASY_DRUG_INFO` | varchar(128) 컬럼 존재 |
| `identifier_type` | (고정) | `MFDS_CODE` | itemSeq 결측 시 null |
| `identifier_value` | `itemSeq` | trim(itemSeq) | |
| `normalized_identifier_value` | `itemSeq` | trim(itemSeq) | |
| `candidate_name` | `itemName` | trim | |
| `candidate_manufacturer` | `entpName` | trim | |
| `candidate_image_url` | `itemImage` | trim(URL) 또는 null | 컬럼 존재(text) |
| `candidate_category` | (고정) | `의약품개요정보(e약은요)` | |
| `candidate_spec` | — | `null` | WO 정책상 항상 null |
| `candidate_unit` | — | `null` | WO 정책상 항상 null |
| `candidate_status` | (고정) | `pending` | INSERT 기본 |
| `match_status` | (고정) | `unmatched` | INSERT 기본 |
| `raw_payload` | item 전체 + 소스메타 | jsonb | 아래 구조 |

### rawPayload 구조 (엔티티에 없는 값은 전부 여기 보존 — "해당 컬럼 없음")

```json
{
  "sourceAgency": "MFDS",
  "sourceDatasetName": "의약품개요정보(e약은요)",
  "sourceDatasetId": "15075057",
  "sourceKind": "easy_drug_info",
  "sourceRowKey": "itemSeq",
  "sourceBaseDate": null,
  "collectedAt": "<line.fetchedAt>",
  "itemSeq": "...",
  "itemImage": "... | null",
  "officialConsumerText": {
    "efficacy": efcyQesitm, "usage": useMethodQesitm, "warning": atpnWarnQesitm,
    "caution": atpnQesitm, "interaction": intrcQesitm, "sideEffect": seQesitm,
    "storage": depositMethodQesitm
  },
  "reviewFlags": ["IMAGE_MISSING", ...],
  "source": { /* 원본 item 전체 무손실 */ }
}
```

- **효능/용법/주의/부작용/보관** 은 상품 기본정보가 아니므로 `candidate_*` 컬럼에 넣지 않고 `rawPayload.officialConsumerText`(공식 공공 설명 원문)에 별도 보존 — Store 설명 제작 자산과 분리.
- 엔티티에 **없는** 필드: `officialConsumerText`, `reviewFlags`, `sourceAgency/Dataset*/sourceKind/collectedAt` → 전부 rawPayload.

### reviewFlags 판정
`ITEM_SEQ_MISSING` / `ITEM_NAME_MISSING` / `MANUFACTURER_MISSING`(entpName 결측) / `IMAGE_MISSING`(itemImage 결측) / `OFFICIAL_TEXT_MISSING`(officialConsumerText 7종 전부 결측) / `UPDATE_DATE_MISSING`(updateDe 결측).

### 중복 기준 (실 unique/index 조사 반영)
`ProductCandidate` 는 **전역 UNIQUE 없음**(후보 큐, 엔티티 주석 §17). dedup 은 service logic 으로 수행:

```
source_type='external_api' AND identifier_type='MFDS_CODE'
AND normalized_identifier_value=trim(itemSeq)
AND raw_payload->>'sourceKind'='easy_drug_info'
AND deleted_at IS NULL
```

있으면 UPDATE, 없으면 CREATE. 같은 파일 재실행 시 무한중복 금지(파일 내부 중복도 skip). `normalized_identifier_value` 에는 인덱스 `idx_product_candidates_normalized_identifier` 존재.

---

## 3. dry-run 결과 (4,774행 전량, offline / DB 미연결)

```
mode            : dry-run
file            : mfds-easy-drug-info-raw.jsonl
sourceLabel     : MFDS_EASY_DRUG_INFO
totalRows       : 4774
processedRows   : 4774
blankLines      : 1        (파일 말미 개행)
counts          : createdExpected=4757  updatedExpected=0  skipped=17  errored=0
image           : present=2806  missing=1968
officialText    : present=4774  missing=0
reviewFlags     : { ITEM_SEQ_MISSING:0, ITEM_NAME_MISSING:0, MANUFACTURER_MISSING:0,
                    IMAGE_MISSING:1968, OFFICIAL_TEXT_MISSING:0, UPDATE_DATE_MISSING:0 }
dedupChecked(DB): false    (offline — createdExpected 는 상한값)
```

- **skipped=17 = 파일 내부 itemSeq 중복 occurrences.** 별도 검증: distinct itemSeq 4,757 + dup 17 = 4,774, 결측 0. 즉 4,757 distinct candidate 예상, 중복 17건 skip.
- **errored=0**: JSON 파싱 실패 0. 전 line 유효 JSON(CHECK-...-BULK-FETCH §5 정합과 일치).
- 이미지 present 2,806 / missing 1,968 (59% — CHECK-...-BULK-FETCH §11 수치 일치).
- officialConsumerText 는 전 행에 최소 1개 이상 존재(missing 0).
- sampleMappedRows 3건: `활명수`(동화약품, 이미지 없음) / `신신티눈고…`(신신제약) / `아네모정`(삼진제약, 이미지 있음) — MFDS_CODE 식별자·external_api·라벨·officialConsumerText 7키 정상.

---

## 4. 테스트 결과

`apps/api-server/src/modules/neture/drug-import/__tests__/easy-drug-info-candidate-import.test.ts` — **17 passed / 17**.

- 파서: JSONL 1줄 파싱+언랩 / 빈줄 blankLines / JSON 실패 line errors[] 누적(무음 손실 금지) / 평면 item 인식
- 매퍼: itemSeq(trim)→MFDS_CODE / itemName·entpName·itemImage 매핑 / IMAGE_MISSING flag / OFFICIAL_TEXT_MISSING flag / UPDATE_DATE_MISSING flag / officialConsumerText 원문 보존 / rawPayload 원본 item 무손실 / dedupKey 구성
- 서비스(dry-run offline): 예상건수 산출 / 동일파일 중복 skip(무한중복 방지) / itemSeq 결측 skip / apply DataSource 없으면 거부 / limit 제한

모든 단위 테스트는 **실 DB 불필요**.

---

## 5. `--apply` 미실행 사유

- 이 환경엔 로컬/dev DB 없음 + 프로덕션 DB 방화벽 차단(Cloud Run/Console/CLI 외) + 데이터 변경은 사용자 승인 필요(CLAUDE.md §0).
- WO 안전 경계: **dry-run 까지만 실증, apply 경로는 구현하되 미실행.**
- CLI 는 `--apply` 시 `EASY_DRUG_IMPORT_ALLOW_APPLY=I_UNDERSTAND` 환경변수 없으면 `APPLY_BLOCKED` 로 즉시 차단(DB import 이전). 서비스도 초기화된 DataSource 없으면 `APPLY_REQUIRES_INITIALIZED_DATASOURCE` 로 거부.
- apply write 는 `product_candidates` INSERT/UPDATE 만 — 다른 테이블 미접근.

---

## 6. ProductMaster 미생성 확인

- 구현 전 범위: parser + mapper + service + CLI + 테스트. write 경로(`applyRows`)는 `product_candidates` 단일 테이블 INSERT/UPDATE 만 수행.
- **생성 금지 대상 미생성 확인**: ProductMaster / ProductIdentifier / ProductDrugExtension / ProductImage / SupplierProductOffer / OrganizationProductListing 어느 것도 코드에서 참조·생성하지 않음(import 없음, 쿼리 없음).
- 표준코드/식별자/공식 설명 원문은 candidate 필드 + rawPayload 에 **보존만** — Core 식별자 즉시 확정·승격 없음.

---

## 7. 후속 작업 (권장)

1. **--apply 실 적재** — 사용자 승인 + DB 연결 확보 후 `--use-db` dry-run(정확한 update 예측)으로 기존 후보와의 충돌 확인 → apply. createdExpected 4,757 은 offline 상한값이므로 재실행 시 기존 row 는 update 로 분류됨.
2. **ProductMaster + ProductDrugExtension 승격 파이프라인** — itemSeq(고유)·제조사·officialConsumerText 평문 직결(efficacy→efficacyText 등) + itemImage GCS 사본 → ProductImage. (CHECK-...-BULK-FETCH §9 "승격 적합도 높음")
3. **cross-API 조인** — itemSeq 는 API2(의약외품) `ITEM_SEQ` 와 동일 체계 → 두 소스 candidate 병합/보강 검토.
4. **이미지 GCS 사본** — 1,968건은 이미지 없음(정상). 2,806건 `nedrug.mfds.go.kr` 외부 URL 은 직참조 대신 사본 권장(승격 시점).
