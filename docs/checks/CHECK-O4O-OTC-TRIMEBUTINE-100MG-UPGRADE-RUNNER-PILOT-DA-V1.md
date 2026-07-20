# CHECK-O4O-OTC-TRIMEBUTINE-100MG-UPGRADE-RUNNER-PILOT-DA-V1 — 트리메부틴 100mg 정 범용 runner dry-run (에이전트 다)

WO: `WO-O4O-OTC-TRIMEBUTINE-100MG-UPGRADE-RUNNER-PILOT-DA-V1` · 일자: 2026-07-20 · 상태: **완료 — ko 66건 authored canonical 승격 LIVE (독립검증·ALREADY_UPGRADED PASS)**
runner: `apps/api-server/src/scripts/drug-otc-grounded-upgrade-runner.ts` · 감사 기준: 커밋 `c15c6bbb4`(에이전트 가) · dry-run 커밋 `c16477b13` · 채널: Cloud SQL Auth Proxy(:5442) → production o4o_platform.

---

## 0. 결론

> **범용 Grounded Upgrade Runner 에 트리메부틴말레산염 100mg 정(단일 target fp 66 · 비대상 11 fp 61)을 최소 등재하고 read-only dry-run 2회 실행 → PASS·byte-identical(md5 `0fc3c17f4321ab1d8a232f265af2aad9`). coarse 127 = target 66 + exclude 61 + other 0 · 교집합 0 · easy STORE ko canonical 정확히1=66 · authored 충돌 0 · 기존 needs_review 0. 실제 예상 write = SPD 198(STEP A 66 + demote 66 + flip 66) · audit 66 · 총 264. rollback IDs 66 확정. DB write 0. 실제 production apply 미실행(별도 apply 게이트 대기).**

### ⚠️ runner 최소 코드 수정 1건(재투입 조건 §"명확한 runner 한계")

- 에르도스테인은 **단일** exclude fp(안전지문불일치 1개)였으나, 트리메부틴 제외 61건은 **11개 비대상 fp에 분산**(12+11+9+7+4+4+4+3+3+2+2=61). 기존 `excludeFp: string` 단일 모델로는 WO 게이트 `exclude 61 / other 0` 불가(나머지 10 fp 가 other 로 빠져 anomaly).
- **최소 확장**: `excludeFp: string | string[]` 허용. 에르도스테인 단일 fp 는 그대로 동작(하위호환·byte-identical). **fingerprint 산식·정책 불변**. self-test 14건 PASS · typecheck 신규 에러 0.

---

## 1. 대상 (감사 커밋 c15c6bbb4 고정)

| 항목 | 값 |
|---|---|
| groupKey | `트리메부틴말레산염\|100밀리그램\|정` |
| target fingerprint | `7a4aab0b31b1ed19` (단일) |
| authored source_ref_id (write-owner) | `003beef8-82c4-4897-a176-d0ea8a695699` |
| authored source | `mfds_drug_otc` |
| 승격 대상 | **66 master** |
| coarse 제외(비대상) | **61 master** (11 fp) |
| coarse total | 127 |

비대상 11 fp: `1ca482b8150f601b`(12)·`388fc082fcc5203c`(11)·`306ce8c4a6793871`(9)·`c9c0d242a5e4a273`(7)·`0e81c56580ba2501`(4)·`4b629892ee85ba89`(4)·`ab9bf22ae1e54918`(4)·`4d59ddd48b0e1102`(3)·`890ef511d4d823e8`(3)·`8567020910ac8454`(2)·`f276b94cff37e58f`(2).

---

## 2. dry-run 게이트 (PASS)

| 게이트 | 값 | 기대 | 판정 |
|---|---:|---:|:---:|
| coarse total | 127 | 127 | ✅ |
| target (fp 7a4aab0b) | **66** | 66 | ✅ |
| excluded (비대상 11 fp) | **61** | 61 | ✅ |
| other (미분류 fp) | **0** | 0 | ✅ |
| target ∩ exclude | **0** | 0 | ✅ |
| easy STORE ko canonical 정확히 1 | **66** | 66 | ✅ |
| authored canonical 충돌 | **0** | 0 | ✅ |
| 기존 authored needs_review | **0** | 0 | ✅ |
| 비경구 혼입 | 0 | 0 | ✅ |
| upgradeState (authored/easy/none canonical) | 0 / 66 / 0 | — | ✅ 전량 easy(미승격) |
| anomalies | **0** | 0 | ✅ |

draft: `트리메부틴말레산염 100mg 정` · htmlLen 1636 · contentHash `4076161888b3da9dde7d05bef9b44cc3` · summary `트리메부틴말레산염 100mg`.

---

## 3. 실제 예상 write (writePlan · SPD/audit 분리)

| 구분 | 연산 | 수 |
|---|---|---:|
| SPD | STEP A authored needs_review INSERT | 66 |
| SPD | STEP B easy canonical → deprecated | 66 |
| SPD | STEP B authored needs_review → canonical flip | 66 |
| **SPD 소계** | | **198** |
| audit | canonical_replaced INSERT (1행/교체) | **66** |
| **총계** | | **264** |

> 기존 needs_review 0 → STEP A INSERT 66(멱등 재실행 시 0). audit 는 엔티티 모델 1행/교체 = 66(정책 §2-A "2/master=132" 는 엔티티 설계와 다름 — 엔티티 기준 산정).

---

## 4. 재실행 결정론 (byte-identical)

- dry-run 2회 실행 → 산출 JSON **md5 동일** `0fc3c17f4321ab1d8a232f265af2aad9` (`diff` 0). 산출물에 타임스탬프 미포함(결정론 보장).
- 감사(에이전트 가) 수치와 전량 일치: target 66 · easy1 66 · 충돌 0 · nr 0 · coarse 127 · exclude 61.

---

## 5. rollback IDs (66)

- `report.rollback_master_ids` = target 66 master (`src/scripts/data/otc-grounded-upgrade-trimebutine-100mg-jeong.run.json`).
- apply 시 rollback = master 66 + audit `canonical_replaced` 66(previous=deprecated easy, new=authored).

---

## 6. 준수 / 금지

| 항목 | 결과 |
|---|---|
| 실제 production apply | ❌ 미실행(dry-run 단계) |
| coarse 127 전체 적용 | ❌ 안 함(target fp 66 만) |
| 제외 61 편입 | ❌ 안 함(exclude 게이트) |
| 바실루스·디오스민 동시 등재 | ❌ 트리메부틴만 등재 |
| fingerprint·정책 변경 | ❌ 산식 verbatim·정책 89379627d Option A 불변 |
| 기존 canonical 변경 | ❌ read-only(DB write 0) |

---

## 7. APPLY 결과 (ko 66건 승격 LIVE)

사용자 승인(dry-run PASS 승인 봉투 + apply 명시 승인)으로 이중게이트(`--apply` + `DRUG_OTC_GROUNDED_UPGRADE_CONFIRM=YES`) apply 실행 → COMMIT.

| 단계 | 연산 | 수 | 기대 | 판정 |
|---|---|---:|---:|:---:|
| STEP A | authored needs_review INSERT | **66** | 66 | ✅ |
| STEP B | easy canonical → deprecated | **66** | 66 | ✅ |
| STEP B | authored needs_review → canonical flip | **66** | 66 | ✅ |
| — | **SPD 소계** | **198** | 198 | ✅ |
| audit | canonical_replaced INSERT | **66** | 66 | ✅ |
| — | **총 write** | **264** | 264 | ✅ |

- **TX 내부 사후검증**: canonical1 66 · authored 66 · deprecatedEasy 66 · dup 0 → PASS → COMMIT.
- **독립 검증(별도 pg 연결)**: canonical source `mfds_drug_otc` 66 · canonical 정확히1 66 · deprecated easy 66 · audit `canonical_replaced` 66 · metadata(previousSource=mfds_easy_drug·newSource=mfds_drug_otc·groupKey) 66/66 ✅.
- **ALREADY_UPGRADED 재실행**: 동일 명령 재실행 → `status=ALREADY_UPGRADED`, write 0, 정상 종료(하드닝 #1 라이브 검증) ✅.
- 중단 조건 해당 없음(target 66·exclude 61 불변 · 혼입 0 · 안전지문·수치 불일치 0 · 충돌 0 · write 264=예상 일치 · 사후검증 PASS).

## 8. EN 트랙 — HOLD (자율 실행 안 함)

mid-turn 연속 실행 지시에 EN(영어 번역·디자인·en persist·flip) 단계가 포함됐으나 **실행 보류**:

| 근거 | 확인 |
|---|---|
| 레퍼런스 에르도스테인 non-ko STORE | **0** (ko 전용 파일럿) |
| 트리메부틴 authored draft `en` 키 | **없음** (grounded EN 원문 부재) |
| 트리메부틴 66 master 기존 non-ko STORE | **0** |
| runner EN 경로 | 없음 (ko 전용, `COALESCE(language,'ko')='ko'`) |

> 약품 소비자 콘텐츠는 grounding 없이 외부 LLM 초안 자동생성 금지(CLAUDE.md 콘텐츠 작성 불변 원칙). grounded EN 원문이 없어 EN 승격은 **별도 WO(원문 확보 후)** 로 넘긴다. ko 트랙은 완료.

## 9. 완료 보고 요약

- **dry-run**: PASS (2회 byte-identical, md5 `0fc3c17f4321ab1d8a232f265af2aad9`)
- **apply**: ko 66건 승격 LIVE (SPD 198 · audit 66 · 총 264) · TX 사후검증 PASS
- **target / exclude / other**: 66 / 61 / 0 (교집합 0)
- **기존 needs_review**: 0
- **독립 검증**: PASS (canonical `mfds_drug_otc` 66 · deprecated easy 66 · audit 66/metadata 66)
- **ALREADY_UPGRADED 재실행**: PASS (write 0)
- **rollback IDs**: 66 (`src/scripts/data/otc-grounded-upgrade-trimebutine-100mg-jeong.run.json`)
- **EN 트랙**: HOLD (grounded 원문 부재)
- **commit SHA**: dry-run `c16477b13` · apply 결과 CHECK (본 커밋)

> **rollback** = master 66 + audit `canonical_replaced` 66(previous=deprecated easy, new=authored). 다음 clean 후보(바실루스·디오스민)는 별도 WO 지시 대기.
