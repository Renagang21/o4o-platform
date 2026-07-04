# WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-CANDIDATE-IMPORT-DRYRUN-V1

> 작업 성격: **Gate A ProductCandidate import dry-run (offline, read-only).** DB write 0, apply 0, migration 0, Cloud Run Job 0, 코드 변경 0.
> 작성일: 2026-07-04
> 선행: [`CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-SEED-LIVE-RESPONSE-V1`](../checks/CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-SEED-LIVE-RESPONSE-V1.md), [`WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-RAW-SAMPLE-FETCH-DRYRUN-V1`](WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-RAW-SAMPLE-FETCH-DRYRUN-V1.md)
> 매핑 기준: 실제 엔티티 `apps/api-server/src/modules/neture/entities/ProductCandidate.entity.ts`
> 구조 참조: `docs/work-orders/WO-O4O-QUASI-DRUG-PUBLIC-CANDIDATE-IMPORT-DRYRUN-V1.md` (의약외품 선례 — **구조만 참조, 트랙 혼합 없음**)
> 범위 고정: **건강기능식품 트랙 전용.** 의료기기/의약외품 확장 금지. 병렬 세션 파일 무수정.

---

## 0. 목적

건강기능식품 raw(현재 100건 sample) 기준으로 **ProductCandidate 적재 가능성만** dry-run으로 검증한다.
mapper(pure) 설계 + dedup 규칙 + 예상 적재 결과(created/skipped/errored/reviewFlags)를 산출한다.
**DB write·apply 없음.** ProductMaster/ProductIdentifier 승격은 이 WO 범위 밖(0건 명시).

> **표본 경계:** 모든 수치는 **100 표본** 기준. 전량 44,885 재산출은 후속(전량 수집 WO). 특히 §4 length guard는 표본 max로 판단했으므로 전량에서 재확인 필수.

---

## 1. 실제 엔티티 매핑 (컬럼 검증됨)

`product_candidates` 실제 컬럼 기준. 사용자 초안의 `source=MFDS_HEALTH_FUNCTIONAL_FOOD_INFO` / `regulatoryType` / `sourceRegistrationNo`는 **엔티티 최상위 컬럼이 아니다** → `source_type`은 엔티티 union 값을 쓰고, 나머지는 `source_label` / `raw_payload`(jsonb)에 보존한다 (의약외품 WO §1과 동일 규율).

| ProductCandidate 컬럼 | 타입 | 매핑 |
|---|---|---|
| `service_key` | varchar(50) null | `null` (공공 seed, 특정 서비스 귀속 금지) |
| `organization_id` | uuid null | `null` |
| `source_type` | varchar(32) | **`external_api`** (엔티티 union 값 — `MFDS_...`는 union 아님) |
| `source_id` | uuid null | `null` (외부 seed, 내부 row id 없음) |
| `source_label` | varchar(128) null | `MFDS_HEALTH_FUNCTIONAL_FOOD` |
| `candidate_status` | varchar(32) | `pending` |
| `match_status` | varchar(32) | `unmatched` |
| `identifier_type` | varchar(40) null | **`MFDS_STTEMNT_NO`** (품목제조신고번호 — 약외품 ITEM_SEQ와 다른 식별자라 구분) |
| `identifier_value` | varchar(128) null | trim(`STTEMNT_NO`) — 표본 max 15자, 안전 |
| `normalized_identifier_value` | varchar(128) null | trim(`STTEMNT_NO`) |
| `candidate_name` | varchar(255) null | trim(`PRDUCT`) — 표본 max **83자**, 안전(§4) |
| `candidate_brand` | varchar(255) null | `null` |
| `candidate_manufacturer` | varchar(255) null | trim(`ENTRPS`) — 표본 max 18자, 안전 |
| `candidate_category` | varchar(255) null | `HEALTH_FUNCTIONAL_FOOD` (트랙 태그 상수) — §1.2 결정 |
| `candidate_spec` | varchar(255) null | `null` (포장/SKU 규격 부재) |
| `candidate_unit` | varchar(64) null | `null` (포장단위 부재) |
| `candidate_image_url` | text null | `null` (이미지 필드 없음) |
| `candidate_price` | numeric null | `null` |
| `raw_payload` | jsonb null | §1.1 구조 |

### 1.1 raw_payload 구조

```json
{
  "source": { "…item 11필드 전체…" },
  "sourceAgency": "MFDS",
  "sourceDatasetId": "15056760",
  "sourceDatasetName": "건강기능식품정보",
  "sourceKind": "health_functional_food",
  "sourceRowKey": "<STTEMNT_NO>",
  "regulatoryType": "HEALTH_FUNCTIONAL",
  "mainFunction": "<MAIN_FNCTN>",
  "reviewFlags": ["…"]
}
```

- `MAIN_FNCTN`(주된 기능성) / `BASE_STANDARD` / `SUNGSANG` 등 긴 텍스트는 **최상위 컬럼으로 승격하지 않고** `raw_payload.source`에 원문 보존.
- 허가상태/바코드 필드가 원천에 없으므로 `status` 블록은 두지 않는다 (의약외품과의 차이).

### 1.2 candidate_category 결정

원천에 상품 카테고리 필드가 없다(HFF는 `MAIN_FNCTN` 기능성만 제공). 두 안 중 **A 채택**:
- **A (채택):** `candidate_category = 'HEALTH_FUNCTIONAL_FOOD'` 상수 → 후보 큐에서 트랙 필터 가능. `MAIN_FNCTN`은 `raw_payload.mainFunction` 보존.
- B (비채택): `MAIN_FNCTN` 요약을 category에 넣기 → 기능성≠카테고리 의미 왜곡 + 255 초과 위험. 폐기.

---

## 2. mapper (pure function) 설계

의약외품 선례와 동일하게 **순수 함수**(입력=raw item, 출력=candidate input + reviewFlags + dedupKey, 부수효과 없음).

```text
mapHealthFunctionalFoodRow(item) -> { candidateInput, reviewFlags, dedupKey }

trim 규칙:    빈문자/공백 -> null
identifier:   STTEMNT_NO 있으면 identifierType=MFDS_STTEMNT_NO, value=normalized=trim(STTEMNT_NO)
name:         candidateName = trim(PRDUCT)   (§4 length guard: 표본 안전, 전량 재확인)
manufacturer: candidateManufacturer = trim(ENTRPS)
category:     candidateCategory = 'HEALTH_FUNCTIONAL_FOOD' (상수)
optional:     PRSRV_PD / INTAKE_HINT1 결측 허용(nullable) → 결측 시 flag만
xml/status:   해당 없음 (원천에 허가상태·바코드·XML 없음)
```

### 2.1 dedup 규칙 (offline = 파일 내부, apply = DB 조회)

```text
dedupKey = external_api :: MFDS_STTEMNT_NO :: normalized(STTEMNT_NO) :: health_functional_food

offline dry-run: 파일 내부 dedupKey 중복 -> skipped_dup
                 STTEMNT_NO 결측(dedupKey null) -> skipped_no_identifier
apply(후속 WO): 기존 product_candidates 조회
  WHERE source_type='external_api'
    AND identifier_type='MFDS_STTEMNT_NO'
    AND normalized_identifier_value=<STTEMNT_NO>
    AND raw_payload->>'sourceKind'='health_functional_food'
    AND deleted_at IS NULL
  존재 -> updated(write 생략, 재실행 안전) / 없음 -> created
```

---

## 3. dry-run 실행 결과 (offline, 100 표본)

| 지표 | 값 |
|---|---:|
| totalLines | 100 |
| parse OK / error | 100 / **0** |
| processed | 100 |
| **counts.created (예측 적재)** | **100** |
| counts.skipped_dup | **0** |
| counts.skipped_no_identifier | **0** |
| counts.errored | **0** |
| STTEMNT_NO(dedupKey) distinct | 100 / 100 |
| **ProductMaster 승격 대상** | **0 (명시 — Gate A 전용)** |

### 3.1 필수 필드 결측 (격리 대상)

| 필드 | 결측 수 |
|---|---:|
| `STTEMNT_NO` | 0 |
| `PRDUCT` | 0 |
| `ENTRPS` | 0 |

표본 100건 전부 필수 3필드가 채워져 있어 **격리(skip) 대상 0건**.

### 3.2 optional 필드 결측 (nullable 허용, flag만)

| 필드 | 결측 수 | 처리 |
|---|---:|---|
| `PRSRV_PD` (보관조건) | 1 | 적재 + `PRSRV_PD_MISSING` flag |
| `INTAKE_HINT1` (섭취 주의) | 6 | 적재 + `INTAKE_HINT_MISSING` flag |

### 3.3 reviewFlag 분포 (표본)

| flag | 건수 | 의미 |
|---|---:|---|
| `SKU_IDENTIFIER_MISSING` | 100 | barcode/GTIN/포장 부재(전건) → ProductMaster 보류 근거 |
| `INTAKE_HINT_MISSING` | 6 | INTAKE_HINT1 결측 |
| `PRSRV_PD_MISSING` | 1 | 보관조건 결측 |
| `STTEMNT_NO_MISSING` | 0 | — |
| `CANDIDATE_NAME_OVERLENGTH` | 0 | — (§4) |

---

## 4. length guard (apply 선결 — 표본 기준 통과, 전량 재확인)

| 필드 | 컬럼 한도 | 표본 max | 초과 건수 |
|---|---:|---:|---:|
| `STTEMNT_NO` → identifier_value | 128 | 15 | 0 |
| `PRDUCT` → candidate_name | **255** | **83** | **0** |
| `ENTRPS` → candidate_manufacturer | 255 | 18 | 0 |

- **의약외품과의 차이:** 의약외품은 `ITEM_NAME` max 1,840자로 260건 overlength truncation이 apply 선결 조건이었으나, **건강기능식품 `PRDUCT`는 표본 max 83자로 truncation 불필요.**
- ⚠️ **단, 100 표본 한정.** 전량 44,885에는 더 긴 제품명이 있을 수 있으므로, 전량 수집 WO에서 `candidate_name` max 재산출 필수. 안전을 위해 **mapper에는 truncate(255)+`CANDIDATE_NAME_OVERLENGTH` flag 로직을 그대로 넣어두는 것을 권장**(비용 0, 회귀 방지).
- `PRDUCT` 선행 공백 **38/100(38%)** → `trim` 은 반드시 적용(dry-run에서 trim 후 길이 기준으로 판단).

---

## 5. 예상 적재 요약

| 항목 | 표본(100) 예측 | apply 시 실제(후속) |
|---|---:|---|
| 신규 Candidate created | 100 | 전량 44,885 수집·재산출 후 확정 |
| skipped(중복/식별자 결측) | 0 | 전량 기준 STTEMNT_NO 유일성 재확인 |
| errored | 0 | truncate 로직 포함 시 0 유지 |
| ProductMaster 생성 | **0** | **0 (Gate A 범위 밖)** |
| ProductIdentifier 생성 | **0** | **0** |

**Gate A apply는 `product_candidates` INSERT만** 대상이다. 성능은 의약외품/약가마스터 선례(청크 multi-row INSERT + dedup 선적재)를 따르면 44,885 규모 문제없음.

---

## 6. read-only 준수 확인

| 항목 | 결과 |
|---|---|
| ProductCandidate apply / DB write | 0 |
| ProductMaster/ProductIdentifier 생성 | 0 |
| migration / Cloud Run Job | 0 |
| raw 대용량 파일 커밋 | 0 (raw는 repo 밖 G: 드라이브) |
| serviceKey 원문 출력/기록 | 0 |
| 코드 변경 | 0 (mapper/dedup는 설계 + scratchpad 시뮬레이션만, 프로덕션 코드 미작성) |
| 병렬 세션 파일 수정 | 0 (pnpm-lock.yaml 등 무수정) |
| 범위 확장(의료기기/의약외품) | 0 |

이번 변경은 문서 1건(본 WO) 추가뿐이다.

---

## 7. 다음 단계 (건강기능식품 트랙 전용, 순서)

1. **전량 44,885 수집** — pageNo 페이징 전량 수집(serviceKey 비노출), 전량 기준 STTEMNT_NO 유일성·§4 candidate_name max·optional 결측률 재산출.
2. **mapper/서비스 구현 WO** — 본 설계(§1~2)를 프로덕션 코드로. `PRDUCT` trim + truncate(255)+`CANDIDATE_NAME_OVERLENGTH` flag(방어적) + optional nullable. offline dry-run 테스트 포함.
3. **Gate A Candidate apply** — 사용자 승인 + 백업 확인 후 `product_candidates` only INSERT. ProductMaster/Identifier 금지. 재실행 안전(idempotent).
4. **Gate B 판정 보류** — barcode/포장단위/허가상태 원천 없음 → ProductMaster 승격은 별도 원천 확보 후 재판정(현재는 후보풀/보조 검색 성격 유지).

**최종: 건강기능식품 Gate A Candidate import는 offline dry-run(100 표본) 기준 전량 적재 가능(skipped 0, errored 0)으로 예측된다. 의약외품과 달리 candidate_name truncation 선결 조건은 표본상 불필요하나, 전량 재확인 전까지 방어적 truncate 로직 유지를 권장한다. ProductMaster 승격은 이 WO 범위 밖(0건)이며 SKU/barcode 원천 부재로 계속 보류한다.**
