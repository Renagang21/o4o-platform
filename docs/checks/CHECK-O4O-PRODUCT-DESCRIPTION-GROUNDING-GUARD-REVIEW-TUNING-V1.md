# CHECK — Product Description Grounding Guard · REVIEW 튜닝 V1

- **WO**: `WO-O4O-PRODUCT-DESCRIPTION-GROUNDING-GUARD-REVIEW-TUNING-V1`
- **일자**: 2026-07-16
- **대상**: `apps/api-server/src/modules/content-guard/*` (guard 1.0.0 → **1.1.0**)
- **판정**: **PASS**
- **DB write**: 0 · **설명서 내용 변경**: 0 · **migration**: 0

---

## 1. 목적

> "지금은 검출을 약하게 만드는 작업이 아니라, **위험 신호와 정보성 신호를 분리해 사람이 실제 위험에 집중**할 수 있게 만드는 작업으로 진행하면 됩니다." (WO)

가드 1.0.0 은 25건 전부를 `REVIEW_REQUIRED` 로 올렸다(REVIEW findings 130). 그 중 116건은
**정보성·형식성**이라 사람이 볼 것이 없었고, 실제 판단이 필요한 14건이 그 안에 묻혔다.
1.1.0 은 신호를 분리한다. **규칙을 삭제하거나 임계값을 낮추지 않았다.**

## 2. 상태 모델 (1.1.0)

| status | 의미 | 최종 REVIEW 집계 |
|---|---|:---:|
| `BLOCKED` | 위반 확정 | 포함 |
| `REVIEW_REQUIRED` | 사람 판정 필요 | 포함 |
| `INFO` | 근거가 확인된 정보성 | **제외** |
| `PRECHECK_INFO` | 작성 **전** 상태 고지(위반 검출 아님) | **제외** |
| `PASS` / `NOT_APPLICABLE` | — | 제외 |

병합 우선순위: `BLOCKED` > `REVIEW_REQUIRED` > `PASS`/`INFO` > `PRECHECK_INFO` > `NOT_APPLICABLE`.
`isRiskSignal()` 이 집계 경계이며, `findingsByRule` 도 위험 신호만 센다.

## 3. REVIEW 130건 이동 대응표 (WO 요구)

| 기존 ruleId | 건수 | 기존 status | 신규 ruleId | 신규 status | 변경 사유 | 안전성 영향 |
|---|:---:|---|---|---|---|---|
| `B-SPEC-MINMAX-003` | **50** | REVIEW_REQUIRED | `B-SPEC-MINMAX-003` | **INFO** | 문자열("at least")이 아니라 **문맥**으로 판정. BASE_STANDARD 에 규격 하한(이상/not less than)이 있고 + 수량·단위와 함께 쓰였고 + 비교 문맥이 아니면 공식 규격 인용이다 | **없음**. 비교 문맥이면 신규 `B-SPEC-MINMAX-COMPARE-004` **BLOCKED** 로 오히려 강화(1.0.0 은 BLOCKED 없이 REVIEW 였음) |
| `B-SPEC-MINMAX-003` | **1** | REVIEW_REQUIRED | `B-SPEC-MINMAX-003` | REVIEW_REQUIRED **(유지)** | `proba-novarex`: "Keep air exposure **to a minimum** after opening" — 규격 인용 문맥 아님 | 없음(유지) |
| `H-MAKER-MISSING-005` | **25** | REVIEW_REQUIRED | `H-MAKER-NO-OFFICIAL-EN-007` | **INFO** | **공식 영문 제조사명이 원천에 존재하지 않는다**(MFDS `ENTRPS` 는 한국어 법인명 전용, 영문 필드 없음). 대조 기준이 없는 항목을 매 건 REVIEW 로 올리면 사람이 할 수 있는 판정이 없다 → 음역 표기 적정성은 **표본검수** 대상 | **없음**. 공식 영문명이 입력되면 `H-MAKER-MATCH-005`(INFO) / `H-MAKER-MISMATCH-005`(REVIEW) 로 **정확 대조**. en 초안에 제조사 표기 자체가 없으면 `H-MAKER-ABSENT-006` **REVIEW 유지** |
| `PRE-F-AGE-001` | **23** | REVIEW_REQUIRED | `PRE-F-AGE-001` | **PRECHECK_INFO** | 작성 **전** 단계의 상태 고지(원문 연령별 섭취량 유무)이지 위반 검출이 아니다. 초안이 아직 없다 | **없음**. 작성 후 연령 위반은 `F-*`(post) 가 별도 검출 |
| `PRE-A-BASIS-001` | **17** | REVIEW_REQUIRED | `PRE-A-BASIS-001` | **PRECHECK_INFO** | 동일 — 환산 가능/불가 **고지**. 메시지(생성 금지 목록)는 그대로 유지 | **없음**. 실제 환산 위반은 `A-UNIT-BASIS-001` / `A-CALC-DECLARED-MISMATCH-001` **BLOCKED** 가 검출(회귀 10/10 유지) |
| `H-GUARANTEE-SPEC-006` | 7 | REVIEW_REQUIRED | 동일 | **유지** | 사람 판정 필요(보증 표현) | 유지 |
| `B-SUPERLATIVE-CONTEXT-002` | 2 | REVIEW_REQUIRED | 동일 | **유지** | 소비자 문맥 "가장" — 제품 비교 여부는 사람 판정 | 유지 |
| `C-ABSENCE-NUMERIC-003` | 2 | REVIEW_REQUIRED | 동일 | **유지** | 부재≠허용 | 유지 |
| `C-ABSENCE-CONTRAST-005` | 2 | REVIEW_REQUIRED | 동일 | **유지** | 부정형 대비 | 유지 |
| `C-ABSENCE-SOFT-004` | 1 | REVIEW_REQUIRED | 동일 | **유지** | "no need to" | 유지 |
| **합계** | **130** | | | **REVIEW 15 / INFO 75 / PRECHECK_INFO 50** | | |

> `PRE-*` 는 1.0.0 에서 조건부로만 REVIEW 였다(23·17). 1.1.0 은 **전 건**(각 25) 을 `PRECHECK_INFO`
> 로 고지하므로 비위험 카운트가 40 → 50 으로 늘어난다. 최종 REVIEW 집계에는 들어가지 않는다.

## 4. 회귀 검증 (WO 기준)

| 기준 | 목표 | 결과 | 판정 |
|---|---|---|:---:|
| 과거 실제 오류 검출 | 10/10 유지 | **10/10 BLOCKED** | ✅ |
| 정정된 25건 | BLOCKED 0 유지 | **BLOCKED 0** | ✅ |
| 미탐 | 0 유지 | **0** (아래 §5 참조 — 오히려 1건 추가 검출) | ✅ |
| 사람 판단 필요 REVIEW | 약 14건 유지 | **15건** (14 + §5 의 신규 1) | ✅ |
| 정보성·형식성 REVIEW | 최종 집계 제외 | **125건 제외**(INFO 75 + PRECHECK_INFO 50) | ✅ |
| 단위 테스트 | — | **39/39 PASS** (1.0.0 은 29) | ✅ |
| tsc (content-guard) | 0 error | **0** | ✅ |

배치 결과: `제품 25 · PASS 12 · REVIEW_REQUIRED 13 · BLOCKED 0` (`guard@1.1.0`)

## 5. 튜닝 중 발견한 **실제 미탐 버그** 1건 (검출 강화)

`B-SPEC-MINMAX` 의 규격 인용 문맥 판정에서 단위 대안이 `(CFU|mg|g|billion|...)` 였다.
**맨몸 `g`** 가 임의 단어의 g 에 매칭돼("mornin**g**", "openin**g**"), 규격과 무관한 문장이
"규격 인용"으로 오인되어 **INFO 로 강등**될 수 있었다 — 전형적인 미탐 경로다.

```
- /(CFU|mg|g|billion|million|labelled basis|per\s)/i
+ /(\bCFU\b|\d\s*(?:mg|g|billion|million)\b|\bbillion\b|\bmillion\b|labelled basis|\bper\s)/i
```

수정 후 `proba-novarex` 의 "Keep air exposure to a minimum after opening" 이 INFO → **REVIEW 로 복귀**했다.
이 1건이 목표 14 대비 +1 의 원인이며, **완화가 아니라 강화의 결과**다.

## 6. 오탐으로 남긴 것 (의도된 유지)

`proba-novarex` 의 "to a minimum" 은 **보관 안내**이며 규격 주장도 비교 주장도 아니다(= 오탐).
보관 문맥 예외 정규식으로 억제할 수 있으나 **하지 않았다** — WO 원칙이
"오탐은 허용하되 미탐을 최소화한다" 이고, 그 예외는 실제 비교 주장까지 함께 숨길 수 있다.
사람이 즉시 해제 가능한 비용이 미탐 위험보다 싸다.

## 7. 신규/변경 ruleId

| ruleId | status | 성격 |
|---|---|---|
| `B-SPEC-MINMAX-COMPARE-004` | **BLOCKED** | 신규 — 규격어가 제품·그룹 비교로 사용 |
| `H-MAKER-MATCH-005` | INFO | 신규 — 공식 영문명 일치 |
| `H-MAKER-MISMATCH-005` | REVIEW_REQUIRED | 신규 — 공식 영문명 불일치 |
| `H-MAKER-ABSENT-006` | REVIEW_REQUIRED | 신규 — en 초안에 제조사 표기 자체 없음 |
| `H-MAKER-NO-OFFICIAL-EN-007` | INFO | 신규 — 공식 영문명 부재(대조 불가) |
| `H-MAKER-MISSING-005` | — | **폐기**(위 4개로 분해) |

## 8. `manufacturerEn` 입력 필드 — **창작 금지** 준수

`GuardProductInput.manufacturerEn?: string | null` 추가. 25건 회귀 입력은 **전건 `null`** 이다.

- MFDS `HtfsInfoService03` 는 `ENTRPS`(한국어 법인명)만 제공하며 **영문 법인명 필드가 없다**(원천 확인).
- en 초안의 음역 표기("Cell Biotech", "Novarex Co., Ltd.")를 `manufacturerEn` 에 역으로 채우면
  ① **초안을 초안으로 검증하는 순환**이고 ② WO 금지 "영문 제조사명 자동 창작" 에 해당한다.
- 따라서 공식 영문명은 **입력이 있을 때만** 대조한다. 가드는 만들지 않는다.

## 9. 변경 파일

| 파일 | 변경 |
|---|---|
| `.../product-description-guard.types.ts` | `INFO`·`PRECHECK_INFO` status, `manufacturerEn`, `precheckInfoCount`, GUARD_VERSION 1.1.0 |
| `.../product-description-guard.rules.ts` | B-SPEC-MINMAX 문맥 3분기 + 단위 경계 버그 수정, H-MAKER 4분기 |
| `.../product-description-guard.ts` | `isRiskSignal()`, PRE-* → PRECHECK_INFO, 위험 신호만 집계 |
| `.../__tests__/product-description-guard.test.ts` | +10 (29 → 39) |
| `docs/checks/data/product-description-guard/*.json` | 회귀 I/O 갱신 |

## 10. 후속

- 추가 20~50건 유산균 검증 배치 (다음 WO)
- `H-GUARANTEE-SPEC-006` 7건: en "guarantees" 표현 — 표본검수에서 문구 정책 확정 필요
- 공식 영문 제조사명 SSOT 가 생기면 `manufacturerEn` 주입 → 자동 대조 활성화
