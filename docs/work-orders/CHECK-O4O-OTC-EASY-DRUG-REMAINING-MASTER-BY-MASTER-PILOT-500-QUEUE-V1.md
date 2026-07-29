# CHECK — WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-500-QUEUE-V1

> 잔여 제품별 생산 pilot 500 — **라 에이전트 대기열 확정 (READ-ONLY)**
>
> 선행: 모집단 정합성 `036e4d5f7` (잔여 3,809) · pilot 100 대기열 `324823745` · pilot 100 생산 `7f04f3ffb` (GREEN 80 / EXCEPTION 20 / `APPROVED_FOR_PILOT_500`)
> 실행 에이전트: **agent-la** · 실행일 2026-07-29 · batchId `otc-v4-pilot-500`
> **DB write 0** — 설명서 생성 0 · 번역 0 · dry-run 0 · LIVE apply 0. 프로덕션 DB 는 `REPEATABLE READ READ ONLY` SELECT 만 사용.

---

## 1. 결론

| 항목 | 결과 |
|------|------|
| pilot 500 확정 | **정확히 500 master** |
| 층 구성 | A_NORMAL **416** / B_BOUNDARY **70** / C_SOURCE_COMPOSER **14** |
| 정상 생산 예상 | **416** (`PRODUCE_EXPECTED`) |
| 사전 예외 예상 | **84** (`PRE_EXCEPTION_EXPECTED`) |
| pilot 100 교집합 | **0** (GREEN 80 · 예외 20 전량 제외) |
| READY 1,134 교집합 | **0** |
| sourceRef 중복 / LIVE 충돌 / GREEN 80 충돌 | **0 / 0 / 0** |
| identity 판정 정정 | `gencodeCount>=2` 단독 조건 **제거** — 재분류 **600건** |
| 선정 게이트 | **27/27 PASS** |
| 독립검증(별개 코드경로) | **ALL PASS** |
| 2회 실행 byte-identical | **PASS** (6 산출물 md5 동일) |
| DB write | **0** (`transaction_read_only=on` 실측) |

---

## 2. 모집단 재현 및 drift

| 축 | 값 | 판정 |
|----|----|------|
| production targets | 3,729 | — |
| 잔여(remaining) — pilot 100 이전 | 3,809 | 기준 |
| 잔여(remaining) — 현재 | **3,729** | drift **80** |
| drift 차집합 | pilot 100 **GREEN 80** | ✅ 정확히 일치 |
| GREEN 80 이 잔여에 남아있는 수 | **0** | ✅ (authored ko+en 획득 → baseline `complete` 전이) |
| 예외 20 이 잔여에 유지되는 수 | **20** | ✅ |
| HOLD 분포 | `HOLD_IDENTITY 3,174` / `HOLD_ROUTE 528` / `HOLD_SOURCE 27` | — |

### 2-1. READY 1,134 의 상태 변화 (설계된 변화)

`READY 1,134` 는 후속 V3 트랙(`oral-unit-1` 1,620T · `topical-unit-1` 1,962T 등)에서 authored ko+en canonical 을 획득해 baseline `complete` 로 전이했다.

| 축 | 값 |
|----|----|
| 현재 production target 내 READY 수 | **0** |
| `complete` 로 전이한 READY 수 | **1,134 / 1,134** |
| 잔여 모집단과의 교집합 | **0** |

따라서 pilot 100 의 게이트 `readyMatchesLedger`(=READY 가 production target 안에 1,134건 존재)는 **더 이상 성립하지 않는 것이 정상**이며, 본 WO 는 이를 drift 인지 게이트(`1_ready_1134_fully_completed_and_left_population`)로 대체했다.

### 2-2. 분류 재현 (정정 전 v1 기준)

| 큐 | 값 | 판정 |
|----|----|------|
| agent-ga | 2,426 | ✅ = 2,496 − GREEN 70(A층) |
| agent-na | 1,037 | ✅ = 1,047 − GREEN 10(B층) |
| exclude | **266** | ✅ 불변 |
| 합계 | 3,729 | ✅ |

---

## 3. identity 판정 기준 정정 (WO §3)

📄 `apps/api-server/src/scripts/data/otc-easy-drug-remaining-pilot-500-identity-criteria-correction-v1.md`

### 3-1. 정정 내용

| 축 | 정정 전 | 정정 후 |
|----|---------|---------|
| `gencodeCount >= 2` 단독 | `IDENTITY_CONFLICT` | **예외 사유에서 제거** |
| `permitCodeCount >= 2` | 미사용 | `IDENTITY_CONFLICT` |
| 서로 다른 공식 원문 hash 다중 | 미사용 | `IDENTITY_CONFLICT` |
| 성분·함량·제형 / 품목 identity 상충 | 미사용 | `IDENTITY_CONFLICT` |
| master↔공식원문 단일 확정 불가 | 미사용 | `IDENTITY_CONFLICT` |

**gencode 는 후보 연결 키이며, 생산 grounding 은 `master_id` + 공식 원문이다.**

### 3-2. 실측 근거 — pilot 100

- 사전 `IDENTITY_CONFLICT` 예상 **12건** (전량 `gencodeCount >= 2` 사유)
- 그 중 **10건 정상 생산(GREEN)** — 전부 `permitCodeCount = 1`
  - `002063d6…` 디알클리어점안액 (ophthalmic) · `00218d5c…` 미리놀과립 (oral) · `004aab4d…` 스카풀라정 (oral) · `00a49157…` 아웃콜에프캡슐 (oral) · `00fdc1b1…` 태극케토코나졸크림 (topical) · `012903c2…` 신신파스아렉스 (topical) · `015425b9…` / `0157af47…` / `0203be99…` 원타임프레쉬점안액 (ophthalmic) · `0181e3ea…` 헥사메딘액0.12% (oromucosal)
- 나머지 **2건 실패** — 실제 코드는 `ROUTE_UNRESOLVED` (`00551806…` 대한관류용멸균생리식염수 · `02342db7…` 큐앤큐헥시코올탈지면액). **identity 사유가 아니다.**

### 3-3. 정정 적용 결과 (잔여 3,729)

| 축 | 값 |
|----|----|
| 분류 대상(exclude 제외) | 3,463 |
| `permitCodeCount >= 2` | **0** |
| `officialSourceHashCount >= 2` | **0** |
| `gencodeCount >= 2` | 600 |
| v1 `IDENTITY_CONFLICT` 총계 | 600 |
| **v2(정정) `IDENTITY_CONFLICT` 총계** | **0** |
| 재분류 | **600건** — `IDENTITY_CONFLICT → READY 340` · `IDENTITY_CONFLICT → ROUTE_UNRESOLVED 260` |

| 분류 | v1 | v2(정정) |
|------|---:|---------:|
| agent-ga | 2,426 | **2,766** |
| agent-na | 1,037 | **697** |
| exclude | 266 | 266 |

> ⚠️ pilot 100 원장과 결과 파일은 **일절 수정하지 않았다**(읽기 전용). 정정은 pilot 500 이후 기준에만 적용된다.

---

## 4. pilot 500 선정

### 4-1. 제외 규칙 적용

| 제외 축 | 건수 |
|---------|-----:|
| pilot 100 전체 (GREEN 80 + 예외 20) | 100 |
| READY 1,134 | 1,134 (이미 모집단 밖) |
| EXCLUDE_CONFIRMED | 266 |
| 기존 authored ko/en canonical 보유 | 0 (모집단 밖으로 전이 완료) |
| sourceRef 기존 점유 | 0 |
| 전문/수술 스크린 (A층 배제) | 0 |

> pilot 100 예외 20 은 **정상 생산 대기열에 재편입하지 않는다.** agent-na 전용 예외 원장(`otc-v4-pilot-100-exception-handoff-na.ga.json`)에 그대로 유지되며, pilot 500 예외 마무리 시 동일 그룹 축에 병합해 판정한다.

### 4-2. 층별 분포 및 조정 근거

| 층 | 권장 | 확정 | pool | 근거 |
|----|-----:|-----:|-----:|------|
| A_NORMAL | ~400 | **416** | 2,766 | C 부족분 16 을 A→B→C 순서 규칙에 따라 A 로 재배분 |
| B_BOUNDARY | ~70 | **70** | 663 | 목표 충족 |
| C_SOURCE_COMPOSER | ~30 | **14** | **14** | 잔여 모집단의 `SOURCE_*_MISSING` 총량이 14 (pool 상한). `COMPOSER_*` 예외는 5개 route 전부 프로파일 보유로 0 |
| 합계 | 500 | **500** | — | — |

**재배분 기록**: `C 부족 16(pool 14)` → `A +16 재배분(pool 2766)` — 원장 `selection.reallocation` 에 기계 판독 가능 형태로 보존.

### 4-3. route 분포 (A 정상층)

| route | 건수 | 비율 | pool |
|-------|-----:|-----:|-----:|
| oral | **208** | 50.0% (상한 적중) | 1,596 |
| topical | 149 | 35.8% | 832 |
| ophthalmic | 54 | 13.0% | 303 |
| vaginal | 3 | 0.7% | 21 |
| oromucosal | 2 | 0.5% | 14 |

- oral 편중 방지: 단일 route 상한 `floor(416 × 0.5) = 208` 적용 → oral 정확히 상한에서 절단
- topical·ophthalmic 은 D'Hondt 비례로 **203건** 확보
- vaginal·oromucosal 최소 2건 보장 규칙 충족
- 전체 500 기준 route 분포: oral 216 / topical 151 / ophthalmic 54 / vaginal 3 / oromucosal 2 / **UNRESOLVED 74**(B층 경계 대상)

### 4-4. 사전 예외 예상 (84건)

| 코드 | 건수 | 층 |
|------|-----:|----|
| `ROUTE_UNRESOLVED` | 50 | B_BOUNDARY |
| `ROUTE_CONFLICT` | 20 | B_BOUNDARY |
| `SOURCE_EFFICACY_MISSING` | 14 | C_SOURCE_COMPOSER |

`IDENTITY_CONFLICT` 는 정정 기준 적용 결과 **0건**(모집단 전체에서 `permitCodeCount>=2` / 원문 hash 다중이 실측 0).

### 4-5. 공식 원문 6섹션 상태 (500건)

| 섹션 | 보유 |
|------|-----:|
| 사용상 주의사항 | 500 |
| 용법·용량 | 496 |
| 효능·효과 | 486 |
| 이상반응 | 465 |
| 상호작용 | 292 |
| 경고 | 101 |

composer 가능성: `OK 416` / `ROUTE_PENDING 70` / `BLOCKED_SOURCE 14`.
A 정상층 416건은 **전건 효능·효과 + 용법·용량 보유 + route 확정 + composer OK**.

---

## 5. sourceRef

| 축 | 값 |
|----|----|
| namespace | `otc-v4-master-leaflet:<masterId>` → `uuid(md5(...))` |
| 결정성 | master 별 결정론적 · 2회 실행 동일값 |
| pilot 500 내부 중복 | **0** |
| 기존 V2·V3·V4 LIVE 점유 | **0** |
| pilot 100 GREEN 80 sourceRef 충돌 | **0** |

---

## 6. 실행 계약

### 6-1. 제품 단위 continue (agent-ga 입력에 명시)

개별 제품 실패는 **전체 중지 조건이 아니다**. 실패 시 → 해당 master DB write 0(savepoint/독립 transaction ROLLBACK) → 예외 원장 1행 → **다음 master 계속**.
중지 사유가 **아닌 것**: route 미확정 / identity 충돌 / 수치·연령·기간 파싱 실패 / 공식 원문 결손 / composer 미지원 / **성공률 자체**.

예외 코드 **15종** 그대로 유지 (`IDENTITY_MISSING`, `IDENTITY_CONFLICT`, `ROUTE_UNRESOLVED`, `ROUTE_CONFLICT`, `SOURCE_EFFICACY_MISSING`, `SOURCE_DOSAGE_MISSING`, `NUMERIC_PARSE_FAILED`, `AGE_PARSE_FAILED`, `DURATION_PARSE_FAILED`, `COMPOSER_SECTION_UNSUPPORTED`, `TRANSLATION_VALIDATION_FAILED`, `PROFESSIONAL_USE`, `EXISTING_CANONICAL_CONFLICT`, `SOURCE_REF_CONFLICT`, `OTHER_REVIEW_REQUIRED`) — `IDENTITY_CONFLICT` 의 **정의만 정정**.

### 6-2. 시스템 중지 조건 — SYS-01~SYS-17

pilot 100 의 SYS-01~SYS-12 를 그대로 유지하고 다음을 추가한다.

| ID | 조건 | 탐지 |
|----|------|------|
| SYS-13 | pilot 100 GREEN 80 이 변경됨 | GREEN 80 의 (content_hash, source_ref_id, status, updated_at) 배치 전후 비교 |
| SYS-14 | pilot 100 예외 20 에 DB write 발생 | 예외 20 의 STORE canonical row count 증가 ≥ 1 |
| SYS-15 | 완료 master 자동 skip 실패 | authored ko+en 보유 master 에 CREATED > 0 |
| SYS-16 | checkpoint 이후 재개 시 중복 write | 재개 구간 write 합 > 계약 기대치(GREEN×6T) |
| SYS-17 | master 별 sourceRef 가 다른 master 에 재사용 | `source_ref_id → master_id` 매핑이 1:1 아님 |

### 6-3. 잔여 전량 확대 게이트 — EXPALL-01~14

`500 전량 처리` · `개별 실패 후 계속` · `실패 master DB residue 0` · `공식 6섹션 mismatch 0` · `수치·연령·기간 누락 0` · `canonicalDup 0` · `sourceRef 충돌·누출 0` · `기존 LIVE 변경 0` · `pilot 100 GREEN 80 불변` · `재실행 자동 skip` · `예외 원장 누락·중복 0` · `checkpoint 재개 PASS` · `독립검증 PASS` · `시스템 오류 0(SYS-01~17)`.

`EXPALL-NOT`: **성공률은 절대 전량 확대 차단 기준이 아니다.**

최종 판정 enum: `APPROVED_FOR_REMAINING_ALL` | `NEEDS_PIPELINE_FIX` | `SYSTEM_STOP`

---

## 7. 검증

### 7-1. 선정 게이트 27/27 PASS

`1` READY 1,134 전량 완료·모집단 이탈 · `2` 잔여 3,729 · `3` drift 차집합 = GREEN 80 · `4` 예외 20 모집단 유지 · `5` v1 분류 2,426/1,037/266 · `6` 정확히 500 · `7` 중복 0 · `8` pilot 100 교집합 0 · `9` READY 교집합 0 · `10` 완료 master 0 · `11` 공식 분모 밖 0 · `12` exclude 미포함 · `13` A층 기존 canonical 0 · `14` 정상/사전예외 분리 · `15` A층 전문용 0 · `16` 공식 원문 상태 전건 기록 · `17` A층 효능·용법·route·composer OK · `18` sourceRef 중복·LIVE·GREEN80 충돌 0 · `19` sourceRef 산식 일치 · `20` identity 판정 = §3 정정 기준 · `21` gencode 다중 단독 ≠ 예외 · `22` oral 편중 방지 · `23` 소수 route 표본 확보 · `24` 예외 schema 17필드 · `25` 예외 코드 15 · `26` DB write 0 · `27` 2회 byte-identical

### 7-2. 독립검증 (별개 코드경로) — ALL PASS

`otc-easy-drug-remaining-pilot-500-verify.la.ts` 는 선정 로직(분류기·D'Hondt·층화)을 **일절 import 하지 않고**, 산출 JSON 을 입력으로 받아 DB 실측과 직접 대조한다.

- 별개 섹션 파서(정규식 미재사용)로 공식 6섹션 presence 재계산 → 원장과 일치
- `officialSourceHash` / `officialSourceCount` / `officialSourceHashCount` DB 재계산 일치
- `permitCodeCount` / `gencodeCount` DB 재조회 일치 (별도 SQL, drug_extensions 조인 없이)
- exclude 키워드·표준코드 전량취소 독립 재검사 → 혼입 0
- `IDENTITY_CONFLICT` 판정이 §3 정정 기준과 일치 · `gencodeCount>=2` 단독(87건) 전건 예외 아님
- agent-ga 입력 ↔ 원장 7개 필드 순서·값 일치
- 계약 문서 완비 (예외 schema 17필드 · 예외코드 15 · SYS 17 · 확대 게이트 15 · 판정 enum 3 · pilot 100 예외 20 인계)
- `transaction_read_only = on` 실측

### 7-3. byte-identical

2회 실행 결과 6개 산출물 md5 전부 동일:

```
fc950c7d9fc880752ad8b4c6284e3b82  otc-easy-drug-remaining-pilot-500-ledger-v1.json
56d27e1aa973fa129bfc83b50779d365  otc-easy-drug-remaining-pilot-500-agent-ga-input-v1.json
f22684bbc42fb3177f76562333d3eb62  otc-easy-drug-remaining-pilot-500-agent-na-handoff-schema-v1.json
94193f90f3622c15a835ac87b33b9290  otc-easy-drug-remaining-pilot-500-check-v1.json
decc323db1363eece3204f5dc660108d  otc-easy-drug-remaining-pilot-500-identity-criteria-correction-v1.md
f7fa244266fd75c4bebcd3d5b7efaa3e  otc-easy-drug-remaining-pilot-500-followup-agent-requests-v1.md
```

### 7-4. DB write 0

- 두 스크립트 모두 `INSERT / UPDATE / DELETE / ALTER / DROP / TRUNCATE / CREATE` 문 **0개** (정적 검사)
- 모든 조회는 `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY` 안에서 수행, `current_setting('transaction_read_only') = on` 실측
- snapshot: `2026-07-29 12:32:21+00` (xmin 4117611)

---

## 8. 산출물

| 파일 | 역할 |
|------|------|
| [otc-easy-drug-remaining-pilot-500-queue.la.ts](../../apps/api-server/src/scripts/otc-easy-drug-remaining-pilot-500-queue.la.ts) | pilot 500 선정 (READ-ONLY) |
| [otc-easy-drug-remaining-pilot-500-verify.la.ts](../../apps/api-server/src/scripts/otc-easy-drug-remaining-pilot-500-verify.la.ts) | 독립검증 (별개 코드경로) |
| [otc-easy-drug-remaining-pilot-500-ledger-v1.json](../../apps/api-server/src/scripts/data/otc-easy-drug-remaining-pilot-500-ledger-v1.json) | pilot 500 전체 원장 (제품별 사전 조사 · 게이트 · SYS · 확대 게이트) |
| [otc-easy-drug-remaining-pilot-500-agent-ga-input-v1.json](../../apps/api-server/src/scripts/data/otc-easy-drug-remaining-pilot-500-agent-ga-input-v1.json) | agent-ga 생산 입력 + 실행 계약 |
| [otc-easy-drug-remaining-pilot-500-agent-na-handoff-schema-v1.json](../../apps/api-server/src/scripts/data/otc-easy-drug-remaining-pilot-500-agent-na-handoff-schema-v1.json) | agent-na 예외 인계 schema · 예외코드 15 · SYS-01~17 · 확대 게이트 |
| [otc-easy-drug-remaining-pilot-500-identity-criteria-correction-v1.md](../../apps/api-server/src/scripts/data/otc-easy-drug-remaining-pilot-500-identity-criteria-correction-v1.md) | identity 판정 정정 기록 (§3) |
| [otc-easy-drug-remaining-pilot-500-followup-agent-requests-v1.md](../../apps/api-server/src/scripts/data/otc-easy-drug-remaining-pilot-500-followup-agent-requests-v1.md) | agent-ga 생산 / agent-na 예외 처리 요청서 초안 |
| [otc-easy-drug-remaining-pilot-500-check-v1.json](../../apps/api-server/src/scripts/data/otc-easy-drug-remaining-pilot-500-check-v1.json) | 게이트 27/27 · 500 masterId 목록 |

---

## 9. agent-ga 즉시 착수 가능 여부

**가능.** 다음이 모두 충족되었다.

- 입력 원장 500건 확정 · masterId 오름차순 · 필수 필드 전건 완비
- master 별 `officialSourceHash` · `sourceRef` · 기존 canonical 상태 · route 후보 · composer 가능성 사전 기록
- 실행 계약(제품 단위 continue · 멱등 · checkpoint · preflight 5항목) 명시
- 시스템 중지 조건 SYS-01~17 · 잔여 전량 확대 게이트 EXPALL-01~14 · 최종 판정 enum 확정
- pilot 100 GREEN 80 / 예외 20 과의 교집합 0, sourceRef 충돌 0

착수 조건: **사용자 발주** (본 CHECK 와 요청서 초안은 실행 지시가 아니다). 실행 시 `batchId = otc-v4-pilot-500`, write owner = **agent-ga 단독**.
