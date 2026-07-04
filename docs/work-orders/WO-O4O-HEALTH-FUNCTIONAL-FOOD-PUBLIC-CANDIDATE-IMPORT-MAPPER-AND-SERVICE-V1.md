# WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-CANDIDATE-IMPORT-MAPPER-AND-SERVICE-V1

> 작업 성격: **Gate A ProductCandidate import mapper/service/CLI/test 구현 (apply 미실행).** DB write 0, apply 0, migration 0, Cloud Run Job 0.
> 작성일: 2026-07-04
> 선행: [`CHECK-...-LIVE-RESPONSE-V1`](../checks/CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-SEED-LIVE-RESPONSE-V1.md) · [`WO-...-RAW-SAMPLE-FETCH-DRYRUN-V1`](WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-RAW-SAMPLE-FETCH-DRYRUN-V1.md) · [`WO-...-CANDIDATE-IMPORT-DRYRUN-V1`](WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-CANDIDATE-IMPORT-DRYRUN-V1.md) · [`WO-...-FULL-RAW-FETCH-AND-FULL-DRYRUN-V1`](WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-FULL-RAW-FETCH-AND-FULL-DRYRUN-V1.md)
> 구현 패턴 참조: `easy-drug-info-*`(flatten JSONL 후보 적재 선례) + `quasi-drug-permit-*`(255 truncate 선례)
> 범위 고정: **건강기능식품 트랙 전용.** 의료기기/의약외품 확장 금지. 병렬 세션 파일 무수정.

---

## 0. 목적

전량 dry-run([선행 WO](WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-FULL-RAW-FETCH-AND-FULL-DRYRUN-V1.md))에서
확정된 건강기능식품 raw 44,885건을 ProductCandidate 로 안전하게 적재할 수 있도록
**프로덕션 mapper/service/CLI/test 를 구현**한다. 단, 이 WO 에서 **apply 는 실행하지 않는다(DB write 0).**

---

## 1. 산출 파일 (신규 5 + package.json 1)

| 파일 | 역할 |
|---|---|
| `apps/api-server/src/modules/neture/drug-import/health-functional-food-jsonl.parser.ts` | flatten JSONL 파서 (래퍼 관대, 오류 무음손실 금지) |
| `apps/api-server/src/modules/neture/drug-import/health-functional-food-candidate.mapper.ts` | **순수 함수** item→후보 매핑 + reviewFlags + 방어적 truncate |
| `apps/api-server/src/modules/neture/drug-import/health-functional-food-candidate-import.service.ts` | dry-run/apply 서비스 (dedup, offline 예측, apply는 코드만) |
| `apps/api-server/src/scripts/health-functional-food-candidate-import.ts` | CLI (dry-run 기본, `--apply` 환경변수 가드 차단) |
| `apps/api-server/src/modules/neture/drug-import/__tests__/health-functional-food-candidate-import.test.ts` | 단위 테스트 19개 |
| `apps/api-server/package.json` | `hff:candidate-import` 스크립트 등록 |

---

## 2. 매핑 (WO 스펙 그대로 구현)

```text
source_type        = external_api            (엔티티 union 값)
source_label       = MFDS_HEALTH_FUNCTIONAL_FOOD
identifier_type    = MFDS_STTEMNT_NO
identifier_value   = trim(STTEMNT_NO)
normalized         = trim(STTEMNT_NO)
candidate_name     = trim(PRDUCT) → 방어적 truncate(255) + CANDIDATE_NAME_OVERLENGTH flag
candidate_manufacturer = trim(ENTRPS)
candidate_category = HEALTH_FUNCTIONAL_FOOD  (상수)
candidate_spec/unit/image_url = null
service_key        = null (CLI --service-key 로만 주입 가능)
raw_payload.source = 원본 11필드 전체 (무손실)
raw_payload.regulatoryType = HEALTH_FUNCTIONAL
raw_payload.mainFunction   = MAIN_FNCTN

dedupKey = external_api :: MFDS_STTEMNT_NO :: <STTEMNT_NO> :: health_functional_food
```

reviewFlags: `STTEMNT_NO_MISSING` / `PRDUCT_MISSING` / `MANUFACTURER_MISSING` /
`MAIN_FUNCTION_MISSING` / `PRESERVATION_MISSING` / `INTAKE_HINT_MISSING` /
`CANDIDATE_NAME_OVERLENGTH` / `SKU_IDENTIFIER_MISSING`(전건 — 승격 보류 근거).

---

## 3. 검증 결과

### 3.1 단위 테스트 (jest) — **19/19 PASS**
파서(4) + 매퍼(9) + 서비스 dry-run(6). 커버:
정상 매핑 / PRDUCT trim / STTEMNT_NO 결측 / optional 결측 flag / duplicate dedup /
candidate_name 255 방어 truncate(원문 rawPayload 보존) / **apply DB 없으면 거부(DB write 0)** / limit.

### 3.2 CLI 전량 dry-run (offline, 실제 44,885 raw) — 전량 dry-run WO 와 완전 일치

| 지표 | 값 |
|---|---:|
| totalRows / processedRows | 44,885 / 44,885 |
| createdExpected | **44,885** |
| updatedExpected / skipped / errored | 0 / 0 / 0 |
| nameTruncatedCount | **0** (전량 max 110 < 255) |
| reviewFlag `MAIN_FUNCTION_MISSING` | 31 |
| reviewFlag `PRESERVATION_MISSING` | 415 |
| reviewFlag `INTAKE_HINT_MISSING` | 1,663 |
| reviewFlag `SKU_IDENTIFIER_MISSING` | 44,885 (전건) |
| parse errors | 0 |

→ 프로덕션 코드가 선행 전량 dry-run(standalone 분석)의 수치를 **정확히 재현**. STTEMNT_NO 결측 0 → skipped 0.

### 3.3 타입체크
`tsc --noEmit` — 신규 HFF 파일 타입 오류 **0**.

---

## 4. 안전 경계 (구현에 내장)

| 항목 | 구현 |
|---|---|
| dry-run 기본 | `apply` 미지정 시 dry-run. DB 미연결도 offline 예측 동작 |
| apply DB 가드 | `apply=true` + DataSource 미초기화 → `APPLY_REQUIRES_INITIALIZED_DATASOURCE` throw |
| CLI apply 차단 | `--apply` 는 `HFF_IMPORT_ALLOW_APPLY=I_UNDERSTAND` 없으면 `APPLY_BLOCKED` (DB import 이전 차단) |
| write 대상 제한 | `product_candidates` INSERT/UPDATE 만. ProductMaster/Identifier/Extension/Image 생성 코드 없음 |
| idempotent | dedup 조회 후 존재 시 UPDATE(중복 INSERT 금지) → 재실행 안전 |

---

## 5. read-only 준수 확인

| 항목 | 결과 |
|---|---|
| ProductCandidate apply / DB write | 0 (dry-run/test/offline만) |
| ProductMaster/ProductIdentifier 생성 | 0 (코드 자체 없음) |
| migration / Cloud Run Job | 0 |
| raw 대용량 파일 커밋 | 0 (raw는 repo 밖 G: 드라이브) |
| serviceKey 원문 출력/기록 | 0 |
| 병렬 세션 파일 수정 | 0 (pnpm-lock.yaml / quasi-drug 파서 무수정) |
| 범위 확장(의료기기/의약외품) | 0 |
| 신규 npm 의존성 | 0 (package.production.json 동기화 불요) |

이번 변경 = 신규 코드 5 + package.json 스크립트 1줄 + 본 WO 문서.

---

## 6. 다음 단계 — Gate A apply 승인 단계 (별도 WO)

구현·검증 완료로 apply 준비가 끝났다. **apply 실행은 사용자 승인 하에 별도 WO** 로 진행한다:

1. **사전**: 프로덕션 `product_candidates` 백업 확인 + 사전 row count(현재 HFF 후보 0 예상) 스냅샷.
2. **실행**: `HFF_IMPORT_ALLOW_APPLY=I_UNDERSTAND` + `--apply --use-db` 로 `product_candidates` only INSERT.
3. **검증**: 적재 후 count = 44,885, STTEMNT_NO distinct, source_label/identifier_type 분포 확인.
4. **재실행 안전**: 동일 파일 재실행 시 전건 updatedExpected(중복 INSERT 0) 확인.
5. **rollback 기준**: source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND source_type='external_api' 범위 삭제로 원복 가능.

ProductMaster 승격(Gate B)은 계속 범위 밖(barcode/포장/허가상태 원천 부재).

**최종: 건강기능식품 ProductCandidate import mapper/service/CLI/test 구현 완료. 단위 19/19 PASS, 전량 CLI dry-run created 44,885·skipped 0·errored 0·truncate 0 로 선행 dry-run 재현. apply 는 이 WO 에서 미실행(다중 가드 내장)이며, Gate A apply 는 사용자 승인 하 별도 WO 로 진행한다.**
