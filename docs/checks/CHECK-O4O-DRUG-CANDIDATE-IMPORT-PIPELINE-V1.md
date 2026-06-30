# CHECK-O4O-DRUG-CANDIDATE-IMPORT-PIPELINE-V1

> 약가마스터(의약품표준코드) CSV 를 기존 `ProductCandidate` 계층에 후보로 적재하는 **1차 파이프라인** 구현 CHECK.
> WO: WO-O4O-DRUG-CANDIDATE-IMPORT-PIPELINE-V1 · 작성일: 2026-06-30
> 선행: `IR-O4O-DRUG-STANDARD-CODE-CANDIDATE-IMPORT-DESIGN-V1`, `CHECK-O4O-DRUG-STANDARD-CODE-CSV-SAMPLE-MAPPING-V1`, `CHECK-O4O-PRODUCT-MASTER-REPRESENTATIVE-LINK-FOUNDATION-V1`

---

## 1. 목적

약가마스터 CSV(2025-10-31 기준, CP949, 305,522행)를 **ProductMaster Core 에 직접 적재하지 않고** 기존 `ProductCandidate(csv_import)` 후보 큐에 보존하는 1차 파이프라인을 구현한다. 표준코드·품목기준코드·ATC 는 Core 식별자로 즉시 확정하지 않고 candidate 필드/rawPayload 에 보존한다. 본 WO 는 **dry-run(300행 샘플)까지만 실증**하고 `--apply` 경로는 구현하되 미실행으로 둔다.

## 2. 선행 IR 반영

| 선행 결정 | 본 구현 반영 |
|---|---|
| 결정 1: candidate 경유(B안) | `ProductCandidate(csv_import)` 재사용. 신규 테이블 0 |
| 결정 2: 기존 ProductCandidate + rawPayload | metadata 전용 컬럼 없음 → **모든 import 메타를 rawPayload 에 보존** |
| 결정 3: 표준코드 = KOREA_DRUG_CODE (trim 외 무가공) | trim 후 13자리 검증 통과시 `identifierType=KOREA_DRUG_CODE` |
| 결정 5: 다제조사 manufacturer 자동 단일파생 금지 | manufacturer = candidate 후보값으로만 보존, `multiManufacturerDetected`/`manufacturerCount` 메타 산출(대표 생성 안 함) |
| 결정 7: active/cancelled | 취소일자 공란→active, 존재→cancelled. 둘 다 보존 |
| 결정 8: CP949 → UTF-8 (iconv) + 따옴표 파서 + trim | iconv-lite cp949 + csv-parse + clean() trim |

## 3. 구현 범위

| 파일 | 역할 |
|---|---|
| `apps/api-server/src/modules/neture/drug-import/drug-master-row.mapper.ts` | **순수(PURE)** — 22컬럼 1행 → candidate 입력 + review flags + groupKey. DB 무관 |
| `apps/api-server/src/modules/neture/drug-import/drug-master-csv.parser.ts` | **순수** — CP949/UTF-8/auto 디코드 + csv-parse(따옴표/줄바꿈 안전) |
| `apps/api-server/src/modules/neture/drug-import/drug-candidate-import.service.ts` | orchestration — 매핑·multi-mfr 집계·dedup 예측·dry-run/apply 리포트. dry-run 은 DB 없이 동작 |
| `apps/api-server/src/scripts/drug-candidate-import.ts` | CLI (`pnpm --filter @o4o/api-server drug:candidate-import`) |
| `.../__tests__/drug-candidate-import.test.ts` | 단위테스트 20개 (실 DB 불필요) |

신규 마이그레이션·엔티티 스키마 변경·자동실행 없음. `iconv-lite@0.6.3` 를 api-server 직접 의존성으로 추가(기존 트랜지티브 존재).

## 4. ProductCandidate 구조 확인 (IR 가정 vs 실제)

실 엔티티 `apps/api-server/src/modules/neture/entities/ProductCandidate.entity.ts` 대조:

| 항목 | 실제 | IR 가정과 차이 |
|---|---|---|
| `sourceType` enum 에 `csv_import` | ✅ 실존 (varchar union) | 일치 |
| `rawPayload` jsonb | ✅ 실존 | 일치 |
| `identifierType/identifierValue/normalizedIdentifierValue` | ✅ 실존 | 일치 |
| `candidateName/candidateManufacturer/candidateCategory/candidateSpec/candidateUnit` | ✅ 실존 | 일치 |
| `candidateStatus` 기본값 | `pending` | 일치 |
| **`metadata` 전용 컬럼** | ❌ **없음** — `rawPayload` 만 존재 | **차이**: IR/WO 가 "metadata/rawPayload" 로 표기했으나 실제 candidate 에 `metadata` 컬럼 없음 → **모든 메타(sourceFileName/sourceBaseDate/rowNumber/standardCode/mfdsCode/atcCode/groupKey/isCancelled/reviewFlags/manufacturerCount/multiManufacturerDetected/source 22컬럼)를 rawPayload 에 보존** |
| unique/index | 전역 UNIQUE 없음(후보 큐). index: status/match/source_type/service_key/normalized_identifier 등 | dedup 은 **service logic** 으로 수행(IR §6.3 일치) |
| `ProductIdentifierType` enum | `KOREA_DRUG_CODE`/`MFDS_CODE`/`ATC_CODE` 실존 (`MFDS_ITEM_CODE` 없음) | CHECK §9 정정과 일치 |

> 차이 결론: candidate 에 별도 `metadata` 컬럼이 없으므로 **rawPayload 단일 보존**으로 구현. ProductMaster/ProductIdentifier/DrugExtension 은 본 파이프라인에서 일절 건드리지 않음.

## 5. CSV 파싱 · 인코딩

- **인코딩**: 기본 `cp949`(iconv-lite, EUC-KR superset — CP949 전용문자 무손실). `--encoding utf-8|auto` 지원. `auto` 는 UTF-8 BOM / U+FFFD 휴리스틱 / `한글상품명` 헤더로 판정.
- **변환 이상**: U+FFFD·NUL 포함 시 `ENCODING_SUSPECT` review flag (행 누락 없이 보존 — 무음 손실 금지).
- **파서**: `csv-parse/sync` (`relax_quotes`, `relax_column_count`, `bom`). 단순 split 금지. 따옴표 안 쉼표(예 `"한약재, 갈근"`)를 단일 필드로 보존(테스트 검증).
- **trim**: 표준코드/품목기준코드 trailing space 등 모든 문자열 `clean()`(trim, 빈 문자열→null).
- **컬럼수 이상**: `rawColumnCount ≠ 22` 시 `COLUMN_COUNT_MISMATCH` flag. 헤더 불일치 시 `HEADER_MISMATCH` error(중단 아님).
- **샘플 파일 주의**: `docs/checks/artifacts/DRUG-STANDARD-CODE-CSV-SAMPLE-300.csv` 는 실제로 **UTF-8** 로 저장돼 있음(프로덕션 원본은 CP949). 그래서 실증은 `--encoding utf-8`(또는 auto) 로 수행. 파이프라인은 CP949/UTF-8 양쪽 처리.

## 6. 매핑 정책

| 약가마스터 | candidate | 비고 |
|---|---|---|
| 표준코드(trim, 13자리 검증) | `identifierType=KOREA_DRUG_CODE` + `identifierValue` + `normalizedIdentifierValue` | 형식이상/결측이면 미부착 + dedup 키 없음 |
| 품목기준코드 | `rawPayload.mfdsCode` + `rawPayload.groupKey` | **MFDS_CODE 식별자는 부착하지 않음**(승격 시점) |
| ATC | `rawPayload.atcCode` | 있을 때만 보존 |
| 한글상품명 | `candidateName` | |
| 업체명 | `candidateManufacturer` | **대표상품 manufacturer 자동 파생 금지** |
| 약품규격 | `candidateSpec` + `rawPayload.specificationRaw` | |
| 포장형태 | `candidateUnit` (결측 시 null) + `rawPayload.packageFormRaw` | fallback 합성은 승격 시점 |
| 전문/일반 | `candidateCategory` | 분류 보조 |
| 22컬럼 전체 | `rawPayload.source` | **무손실 보존** |
| sourceLabel | `파일명stem_기준일`(≤128자) | |

## 7. 중복 · upsert

- **중복 키**: `(sourceType='csv_import', standardCode, sourceBaseDate)` — IR 권장.
- ProductCandidate 전역 UNIQUE 없음 → service logic 으로 dedup.
  - 파일 내부 중복: `seen` 셋으로 같은 키 2회차 → **skipped** (같은 파일 재실행 무한중복 방지).
  - DB 기존 후보: `SELECT ... WHERE source_type='csv_import' AND identifier_type='KOREA_DRUG_CODE' AND normalized_identifier_value=$표준코드 AND raw_payload->>'sourceBaseDate'=$기준일` (parameter binding, raw SQL 인터폴레이션 없음).
- 표준코드 형식이상/결측 행 → dedup 키 없음 → **skipped**(식별 불가).
- `--apply` 시: 기존 있으면 **UPDATE**(candidate 필드 + rawPayload), 없으면 **INSERT**. created/updated/skipped/errored 카운트.

## 8. dry-run 결과 (300행 샘플)

```
mode             : dry-run
file             : DRUG-STANDARD-CODE-CSV-SAMPLE-300.csv
baseDate         : 2025-10-31
encodingUsed     : utf-8
headerMatches    : true
totalRows        : 300
processedRows    : 300
counts           : created=300 updated=0 skipped=0 errored=0
classification   : active=300 cancelled=0
reviewFlags      : {"PACKAGE_FORM_MISSING":134,"STANDARD_CODE_FORMAT":0,"MFDS_CODE_MISSING":0,
                    "PRODUCT_NAME_MISSING":0,"MANUFACTURER_MISSING":0,"ENCODING_SUSPECT":0,
                    "COLUMN_COUNT_MISMATCH":0}
multiManufacturer: groups=0 rows=0
dedupChecked(DB) : false   (offline — created 는 상한값)
```

- 표준코드 형식이상 0 (CHECK §10 결측0·형식0·중복0 와 정합).
- 포장형태 결측 134/300 = 44.7% (head 슬라이스 — 모집단 35.8% 수준의 표본 편차).
- 샘플 head 300행은 전부 active(취소일자 공란), multi-manufacturer 그룹 0(표본 한계).
- `--encoding auto` 도 UTF-8 정확 판정 확인.

## 9. apply 테스트 결과 (미실행 사유)

**`--apply` 미실행.** 사유:
1. ProductCandidate INSERT/UPDATE 는 **데이터 변경 → 사용자 승인 필요**(CLAUDE.md §0).
2. 프로덕션 DB 는 방화벽 차단(Cloud Run/Console/CLI 외 불가) — 로컬 apply 불가.
3. 전체 CSV(305,522행) 미확보 — 300행 샘플만 보유.

안전장치 2중:
- CLI: `--apply` 는 `process.env.DRUG_IMPORT_ALLOW_APPLY === 'I_UNDERSTAND'` 가 아니면 **DB import 이전에 `APPLY_BLOCKED` throw**.
- Service: `apply=true` 인데 초기화된 DataSource 없으면 `APPLY_REQUIRES_INITIALIZED_DATASOURCE` throw.

apply 경로 코드(`applyRows`)는 구현 완료(INSERT/UPDATE + 카운트), 단위테스트로 가드만 검증(실 write 미실행).

## 10. 생성/수정/스킵/오류 건수 (dry-run 예측)

300행 샘플 dry-run: **created=300 / updated=0 / skipped=0 / errored=0**.
- offline dry-run 이므로 updated 예측은 0(기존 DB 후보 미조회). `--use-db`(읽기 전용) 지정 시 기존 후보 존재분이 updated 로 예측됨.

## 11. Core 미변경 확인

- `cms-core`/`auth-core`/`platform-core`/`organization-core` 등 동결 Core 무변경.
- `ProductMaster`/`ProductIdentifier`/`ProductDrugExtension`/`RepresentativeProduct` 엔티티·테이블 무변경.
- 신규 마이그레이션 0, 엔티티 스키마 변경 0.

## 12. 금지 범위 준수 확인

| 금지 | 준수 |
|---|---|
| ProductMaster/representative_products/ProductIdentifier/DrugExtension 생성 | ✅ 생성 코드 없음 |
| Core 승격 / representative_product_id 연결 | ✅ 없음 |
| 자동 대표상품 생성 / manufacturer 자동 파생 | ✅ 후보값 보존만, 대표 생성 0 |
| ProductMaster.barcode/mfds_product_id 채우기 | ✅ 미접근 |
| 신규 테이블 | ✅ 0 (ProductCandidate 재사용) |
| `--apply` prod 실행 | ✅ **미실행**(2중 가드) |
| 운영자/공급자 UI | ✅ 없음 (CLI only) |

## 13. 테스트 결과

`npx jest src/modules/neture/drug-import` → **20 passed**. neture 전체 → **38 passed**.
- 파서: 따옴표 쉼표 보존 / CP949 무손실 디코드 / auto 판정 / 헤더 매칭 / 컬럼수.
- 매퍼: 표준코드 trim+KOREA_DRUG_CODE / 상품명·업체명 / groupKey / active·cancelled / 포장형태 결측 flag / 형식이상 flag+식별자 미부착 / 22컬럼 무손실 / 보조 메타.
- 서비스: offline dry-run / 파일내 중복 idempotency / 형식이상 skip / multi-mfr 감지 / CP949 dry-run / apply 가드 / limit.
- typecheck: `npx tsc --noEmit` (api-server) **EXIT=0, 0 errors**.

## 14. 위험 요소

1. **샘플 인코딩 불일치** — 커밋 샘플은 UTF-8, 프로덕션 원본은 CP949. apply 전 실제 CP949 파일로 재실증 필요.
2. **rawPayload 기반 dedup/그룹 성능** — 305,522행 시 `raw_payload->>'sourceBaseDate'` 조건 조회 비용. additive 컬럼(`source_base_date`) 전환은 후속(IR §6.2).
3. **dry-run offline created 상한값** — DB 미연결 시 update 예측 불가. apply 전 `--use-db` 로 정밀 예측 권장.
4. **승격 단계 미구현** — mfds_product_id/barcode 채움·MFDS/ATC 식별자 부착은 본 WO 범위 밖(별도 승격 WO).
5. **공공저작물 제1유형(출처표시)** — 노출 시 출처표시 의무.

## 15. 후속 WO

- **WO-O4O-DRUG-CANDIDATE-IMPORT-APPLY-V1** — 전체 CSV 확보 + 사용자 승인 후 `--apply` 실 적재(CP949). 품질 리포트.
- **WO-O4O-DRUG-REPRESENTATIVE-PRODUCT-CANDIDATE-GROUPING-V1** — groupKey 집계·대표상품 승격 후보 산출(FOUNDATION 완료 전제).
- **WO-O4O-PRODUCT-IDENTIFIER-KOREA-DRUG-CODE-ATTACHMENT-V1** — 승격 시 KOREA_DRUG_CODE/MFDS_CODE/ATC_CODE 부착, barcode 내부 GTIN 자동생성.
- (조건부) `ProductCandidate` additive 컬럼(`source_base_date`/`group_key`) — 인덱싱 성능 입증 시.

---

**결론**: 본 WO 는 약가마스터를 ProductMaster Core 에 직접 적재하지 않고 기존 `ProductCandidate(csv_import)` 에 후보로 보존하는 **1차 파이프라인**이다. 표준코드·품목기준코드는 Core 식별자로 즉시 확정하지 않고 candidate rawPayload 에 보존했다. ProductMaster/representative_products/ProductIdentifier/DrugExtension 미생성. Core 승격은 별도 품질리포트·승격설계 WO 이후.

> 출처표시: 건강보험심사평가원_약가마스터_의약품표준코드 (공공데이터포털 15067462, 공공저작물 제1유형).
