# CHECK — O4O EASY-DRUG EN FULL RETRANSLATION · FINAL PRODUCTION CLOSE V1

- **WO**: `WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FINAL-PRODUCTION-TO-CLOSE-V1` / `...-CONTINUE-V2`
- **트랙**: `apps/api-server/src/scripts/easy-drug-en-full-retranslation/`
- **작성일**: 2026-08-08
- **상태**: **CLOSED — 전 모집단 생산·검증 완료**
- **DB write**: **0** (LIVE apply 는 본 WO 범위 밖, 별도 WO)

---

## 1. 결론

| 항목 | 값 |
|------|-----|
| 모집단 (ko-units master) | **19,360** |
| 생산 완료 (en-units master) | **19,360** |
| 미생산 | **0** |
| 최종 BLOCKED | **0** |
| 최종 PENDING | **0** |
| 독립 재검증 통과 | **19,360 / 19,360** |
| 독립 재검증 실패 | **0** |
| DB write | **0** |

---

## 2. 이번 회차 생산 구간

재구성(`resumeSource=reconstructed-from-final-tm`) 이후 **batch-0039 ~ batch-0066** 를 연속 생산했다.
직전 세션 종료 시점(HEAD `8bbf26cf0`) 기준 16,104 → **19,360**.

| batch | master | sentence | 1차 blocked | 정정 후 |
|------:|------:|------:|------|------|
| 0039–0053 | (이전 회차 누계) | — | — | blocked 0 |
| 0054 | 51 | 225 | 0 | — |
| 0055 | 125 | 21 | 0 | — |
| 0056 | 19 | 21 | 0 | — |
| 0057 | 56 | 25 | 0 | — |
| 0058 | 169 | 78 | 5 (WARNING_WEAKENED) | 0059 정정 배치로 RESOLVED |
| 0059 | 5 (CORRECTION) | 2 | — | RESOLVED 5 |
| 0060 | 285 | 451 | 4 (ROUTE_LOST 3 / WARNING_WEAKENED 1) | 문장 5건 정정 → 0 |
| 0061 | 306 | 285 | 2 (ROUTE_LOST) | 문장 2건 정정 → 0 |
| 0062 | 163 | 259 | 4 (DOSING_LOST) | 문장 1건 정정 → 0 |
| 0063 | 158 | 409 | 6 (ROUTE_LOST 4 / DOSING_LOST 2) | 문장 3건 정정 → 0 |
| 0064 | 137 | 440 | 13 (ROUTE_LOST 11 / WARNING_WEAKENED 2) | 문장 6건 정정 → 0 |
| 0065 | 140 | 174 | 9 (WARNING_WEAKENED) | 문장 1건 정정 → 0 |
| 0066 | 45 | 186 | 0 | — |

- 모든 batch 는 `recovery-precheck.mjs` 문장 게이트를 **READY_TO_INGEST** 로 통과한 뒤에만 수납했다.
- 실패 번역이 TM 에 편입된 사례는 없다 (`checkSentence` 게이트가 admit 이전에 차단).

---

## 3. 종료 검증 (ingest 결과 미사용 · write 0)

`recovery-final-verify.mjs` — ko-units 전량을 다시 스트리밍하며 en-units 저장본에 대해
`en-validator.validate()` 를 **처음부터 다시** 실행했다. ingest 결과 파일은 참조하지 않는다.

```json
{
  "koMasters": 19360,
  "enUnitsLines": 19360,
  "enUnitsDistinct": 19360,
  "enUnitsDuplicateAppends": 0,
  "missingUnit": 0,
  "verified": 19360,
  "failed": 0,
  "emptyBodySegments": 0,
  "codeTally": {},
  "tm": { "lines": 25365, "distinct": 16026, "corrections": 82 },
  "koBodySentencesTotal": 248529,
  "fileWrites": 0,
  "dbWrites": 0
}
```

- **en-units 중복 append 0** — master 당 정확히 1 단위.
- **빈 BODY 세그먼트 0** — TM 미스로 인한 공란 조립 없음.
- **TM 25,365 줄 / distinct 16,026 / 정정 82건** — append-only + last-wins 계약대로. 정정 82건은
  ROUTE/WARNING/DOSING/NEGATION 게이트 대응으로 기존 문장 번역을 교체한 건수다.

## 4. 문제 큐 최종 상태

```json
{ "queueLines": 866, "masterDistinct": 219, "netBlocked": 0, "netResolved": 219, "sentenceRejectedRows": 10 }
```

- last-state-wins 기준 **BLOCKED 0 / RESOLVED 219**.
- SENTENCE REJECTED 10 행은 모두 과거 회차 기록이며, 해당 문장은 정정 후 재수납되어 현재 TM 최종본은 게이트 통과본이다.

## 5. 멱등성 확인 (write 0)

`recovery-dry-check.mjs` — 파일·DB 를 건드리지 않고 emitter 를 시뮬레이션했다.

```json
{
  "population": 19360,
  "doneMasters": 19360,
  "blockedMasters": 0,
  "candidates": 0,
  "notReadyMasters": 0,
  "pick": { "masters": 0, "newSentences": 0, "zeroCostMasters": 0 },
  "pickOverlapWithDone": 0,
  "fileWrites": 0,
  "dbWrites": 0
}
```

- **candidates 0 / pick.masters 0 / pick.newSentences 0** → 재실행해도 새 batch 가 생기지 않는다.
- `nativeNextSeq=0067` 은 다음 번호가 비어 있다는 뜻일 뿐, 뽑을 master 가 0 이므로 실제 emit 은 빈 배치가 된다.
  (`forcedNextSeq=0039` / `renumberRequired=true` 는 재구성 회차 전용 필드로, 현재는 의미 없음.)

## 6. 신설 도구 (이번 회차)

| 파일 | 용도 |
|------|------|
| `recovery-inspect-warn.mjs` | WARNING_WEAKENED 진단 — KO 경고 표지 대비 EN 표지 누락 문장 추출 (write 0) |
| `recovery-fix-batch.mjs` | BLOCKED master 정정용 배치 생성. 새 master 를 선정하지 않고 지정 hash 문장만 담는다 |
| `recovery-final-verify.mjs` | 전 모집단 독립 재검증 (write 0) |

`produce-emit.mjs` / `produce-ingest.mjs` / `en-frame.mjs` / `en-validator.mjs` / `tm-lib.mjs` 는 **수정하지 않았다.**
배치 크기 조절은 emitter 가 이미 제공하는 `--sentences N` CLI 인자만 사용했다.

## 7. 반복 관측된 게이트 함정 (다음 트랙 참고)

1. **`마시` 오탐** — `사용하지 마시고` 의 어미가 route key `마시`(drink)로 잡힌다. validator 는 동결이므로
   EN 쪽에 `take` 계열 표현을 자연스럽게 넣어 해소한다.
2. **`위험` ≠ risk** — `WARNING_EN` 에 `risk` 가 없다. `위험` 문장은 `danger` / `be sure` / `must` 로 받아야 한다.
3. **`주의` ≠ take care** — `care` 는 표지가 아니다. `caution` 을 써야 한다.
4. **숫자 표기는 KO 원문을 그대로 미러링** — `4,000mg` 는 `4mg` 로, `4200 mg` 는 `4200mg` 로 정규화되므로
   콤마 유무를 KO 와 다르게 쓰면 NUMBER 계열이 어긋난다.
5. **STRENGTH_SEQUENCE 는 순서 검사** — EN 문장에서 함량 등장 순서를 KO 와 같게 유지해야 한다.
6. **TRUNCATED 는 EN 종결부호를 본다** — KO 가 콤마로 끊긴 조각이어도 EN 은 종결부호로 끝내야 통과한다.

## 8. 남은 범위

- **LIVE DB apply 는 본 WO 범위 밖**이다. 별도 WO 에서 dry-run · 이중 게이트 · 독립검증 · rollback 계약을 거쳐 수행한다.
- `results/en-units.jsonl` (97MB) 은 `.gitignore` 대상이다. 재개 SSOT 는 **TM + batch manifest + ingest 결과 + checkpoints** 이며,
  `recovery-reconstruct.mjs` 로 en-units 를 언제든 재생성할 수 있다.
