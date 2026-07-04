# WO-O4O-QUASI-DRUG-PUBLIC-CANDIDATE-IMPORT-MAPPER-AND-SERVICE-V1

> 작업 성격: **의약외품 ProductCandidate import mapper/service/CLI/test 구현 + offline dry-run 검증.** DB apply 미실행(안전 경계). migration 0, Cloud Run Job 0.
> 작성일: 2026-07-04
> 선행: `CHECK-O4O-QUASI-DRUG-PUBLIC-SEED-MAPPING-V1`, `WO-...-RAW-RESTORE-AND-FIELD-SAMPLE-DRYRUN-V1`, `WO-...-CANDIDATE-IMPORT-DRYRUN-V1`, `WO-...-RAW-REMAINDER-FETCH-AND-FULL-DRYRUN-V1`
> 참조 구현: `easy-drug-info-*`(JSONL parser+mapper+service+CLI+test), `drug-candidate-import.service.ts`
> 범위 고정: **의약외품 트랙 전용.** 의료기기/건강기능식품 확장 금지. 병렬 세션 파일(health-functional-food-*) 무수정.

---

## 0. 목적

전량 dry-run(22,953)에서 확정된 의약외품 raw 를 ProductCandidate 로 적재하기 위한 **프로덕션 mapper/service/CLI/test** 를 구현한다. **이번 WO 에서 DB apply 는 실행하지 않는다**(다음 Gate A apply WO). apply 는 env 가드로 차단.

---

## 1. 구현 산출물 (신규 파일)

| 파일 | 역할 |
|---|---|
| `apps/api-server/src/modules/neture/drug-import/quasi-drug-permit-jsonl.parser.ts` | JSONL 파서. `.item` 언랩(래퍼/평면 모두 관대), parse 실패 line 은 errors[] 누적(무음 손실 금지) |
| `apps/api-server/src/modules/neture/drug-import/quasi-drug-permit-candidate.mapper.ts` | **순수 함수** mapper. 실제 ProductCandidate 컬럼 매핑 + truncate + reviewFlags + dedupKey |
| `apps/api-server/src/modules/neture/drug-import/quasi-drug-permit-candidate-import.service.ts` | import 서비스. dry-run(offline/DB) + apply(가드) — `product_candidates` only |
| `apps/api-server/src/scripts/quasi-drug-permit-candidate-import.ts` | CLI. dry-run 기본, `--apply` 는 `QUASI_DRUG_IMPORT_ALLOW_APPLY=I_UNDERSTAND` 가드 |
| `apps/api-server/src/modules/neture/drug-import/__tests__/quasi-drug-permit-candidate-import.test.ts` | unit/offline test 22건 |
| `apps/api-server/package.json` | script `quasi-drug:candidate-import` 등록 |

---

## 2. 매핑 규칙 (실제 엔티티 컬럼)

| ProductCandidate 컬럼 | 매핑 |
|---|---|
| `source_type` | `external_api` |
| `source_label` | `MFDS_QUASI_DRUG_PERMIT` |
| `identifier_type` | `MFDS_CODE` (ITEM_SEQ 존재 시) |
| `identifier_value` / `normalized_identifier_value` | trim(`ITEM_SEQ`) |
| `candidate_name` | trim(`ITEM_NAME`) → **255자 truncate** |
| `candidate_manufacturer` | trim(`ENTP_NAME`) |
| `candidate_category` | trim(`CLASS_NO_NAME`) |
| `candidate_spec` / `candidate_unit` / `candidate_image_url` | `null` (포장·SKU·이미지 축 부재) |
| `candidate_status` / `match_status` | `pending` / `unmatched` |
| `raw_payload` | sourceAgency/Dataset/Kind, regulatoryType=QUASI_DRUG, status{cancelCodeName,cancelDate}, officialRegulatoryText{efficacyXml,dosageXml,cautionXml,ingredients}, reviewFlags, **source(원본 item 전체)** |

**컬럼에 없는 값(regulatoryType/status/officialRegulatoryText/reviewFlags)은 전부 `raw_payload`(jsonb)에 보존.** EE/UD/NB XML 은 **파싱하지 않고 원문 보존**(후속 XML 파서 WO).

### 2.1 candidate_name truncation

- `candidate_name` 컬럼은 varchar(255). `ITEM_NAME` 최대 1,840자(실측) → 255자 truncate.
- truncate 발생 시 `CANDIDATE_NAME_OVERLENGTH` reviewFlag + `raw_payload.candidateNameTruncated=true` + `candidateNameOriginalLength`.
- **원문 전체는 `raw_payload.source.ITEM_NAME` 에 무손실 보존** → 손실 0.

### 2.2 dedup

```text
dedupKey = external_api :: MFDS_CODE :: normalized(ITEM_SEQ) :: quasi_drug_permit
offline: 파일 내부 중복 → skipped / ITEM_SEQ 결측 → skipped
DB/apply: source_type='external_api' AND identifier_type='MFDS_CODE'
          AND normalized_identifier_value=$ITEM_SEQ
          AND raw_payload->>'sourceKind'='quasi_drug_permit' AND deleted_at IS NULL
          존재 → update / 없음 → create (재실행 안전)
```

---

## 3. 검증 결과

### 3.1 unit/offline test — 22건 전량 PASS

parser 4 + mapper 13 + service 5. 필수 케이스 포함:
- `.item` 언랩 / 평면 item 인식 / parse 실패 errors[] 누적
- ITEM_SEQ(trim)→MFDS_CODE, ITEM_NAME→candidateName, spec/unit/image=null
- **candidate_name 255 truncate + CANDIDATE_NAME_OVERLENGTH flag + 원문 보존**
- 정상/폐업 isCancelled, 신고 NOTIFICATION_ITEM
- EE/UD/NB 원문 보존(파싱 안 함) + CDATA/XML flag / 전무 시 OFFICIAL_TEXT_MISSING
- 필수 결측 flag + identifier 미부착
- rawPayload 원문 무손실 보존 / dedupKey 구성
- offline dry-run 예측, 파일 내부 중복 skip, ITEM_SEQ 결측 skip
- `--apply` DataSource 없으면 거부(`APPLY_REQUIRES_INITIALIZED_DATASOURCE`)

### 3.2 typecheck

`tsc -p tsconfig.build.json --noEmit` — **신규 파일 타입 오류 0**. (기존 baseline 오류 1건 `marketTrialController.ts` 는 본 WO 무관, 미수정.)

### 3.3 전량 offline dry-run (프로덕션 CLI, 22,953)

`quasi-drug:candidate-import --file mfds-quasi-drug-permit-raw-full.jsonl` 결과:

| 지표 | 값 | 선행 dry-run 예측 | 일치 |
|---|---:|---:|:--:|
| totalRows / processedRows | 22,953 / 22,953 | 22,953 | ✅ |
| createdExpected | 22,953 | 22,953 | ✅ |
| skipped / errored | 0 / 0 | 0 / 0 | ✅ |
| classification active / cancelled | 18,070 / 4,883 | 18,070 / 4,883 | ✅ |
| **candidateNameTruncated** | **283** | 283 | ✅ |
| officialText present / missing | 22,952 / 1 | — | — |
| reviewFlag NOT_ACTIVE_PERMIT | 4,883 | 4,883 | ✅ |
| reviewFlag CDATA_PRESENT | 22,928 | 22,928 | ✅ |
| reviewFlag NOTIFICATION_ITEM | 8,666 | 8,666 | ✅ |
| errors | [] | — | ✅ |
| ProductMaster / Identifier 생성 | **0** | 0 | ✅ |

프로덕션 코드가 offline 시뮬레이션과 **완전 일치**. `dedupChecked=false`(offline) note 정상 출력.

---

## 4. read-only / 안전 경계 준수

| 항목 | 결과 |
|---|---|
| Gate A apply 실행 | **0** (env 가드 `QUASI_DRUG_IMPORT_ALLOW_APPLY` 미설정 시 차단) |
| DB write | 0 (offline dry-run만 실행) |
| ProductMaster/ProductIdentifier/Extension/Image 생성 로직 | 없음 (product_candidates only) |
| migration / Cloud Run Job | 0 |
| raw 대용량 파일 커밋 | 0 (raw는 repo 밖 G: 드라이브) |
| serviceKey 출력/기록 | 0 |
| 범위 확장(의료기기/건기식) | 0 |
| 병렬 세션 파일(health-functional-food-*) 수정 | 0 (커밋 제외) |

이번 커밋 = 의약외품 코드 5파일 + package.json(quasi-drug 라인) + 본 WO 문서.

---

## 5. 다음 단계 — Gate A apply (별도 WO, 사용자 승인 필요)

구현·검증이 끝났으므로 다음은 **Gate A Candidate apply** 다. apply 는 데이터 변경이므로 아래 선결 조건을 갖춘 별도 WO 로만 진행한다.

1. 사용자 명시 승인 + `QUASI_DRUG_IMPORT_ALLOW_APPLY=I_UNDERSTAND`
2. 사전 `product_candidates` row count 확인(백업/기준선)
3. `--use-db` dry-run 으로 기존 후보 대비 create/update 예측 재확인
4. apply 실행: `product_candidates` INSERT/UPDATE only (예상 create 22,953, candidate_name truncate 283)
5. apply 후 SQL 검증: sourceKind='quasi_drug_permit' count = 22,953, ProductMaster/Identifier 증가 0
6. rollback 기준: 이상 시 `source_label='MFDS_QUASI_DRUG_PERMIT' AND sourceKind='quasi_drug_permit'` soft-delete

후속: XML 공식 설명 파서 WO → SKU/barcode 원천 audit → Gate B(ProductMaster 승격) 재판정.

**최종: 의약외품 ProductCandidate import 파이프라인(parser/mapper/service/CLI/test) 구현 완료. 22건 test PASS, 신규 파일 타입 오류 0, 전량 22,953 offline dry-run이 예측과 완전 일치(created 22,953 / skipped 0 / errored 0 / truncate 283 / ProductMaster 0). Gate A apply 는 사용자 승인 하 별도 WO.**
