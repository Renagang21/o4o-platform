# CHECK — WO-O4O-OTC-EASY-DRUG-V4-ROUTE-RECOVERABLE-535-FINAL-PRODUCTION-V1

route 예외 673 판정 원장에서 회수된 **RECOVERABLE 535 master 최종 LIVE 생산** 결과.

- 실행: 에이전트 가 (단일 write-owner)
- 배치 ID: `otc-v4-route535`
- 입력 SSOT: `otc-v4-route-673-final-reentry-queue.ga.json` (route 재판정 없음 — `resolvedRoute` 상속)
- 실행일: 2026-07-30
- 판정: **PASS · 독립검증 25/25**

---

## 1. 결과 요약

| 항목 | 값 |
|---|---:|
| 입력 대상 | 535 (topical 496 · oromucosal 39) |
| APPLY GREEN (커밋) | 535 |
| 회수 (인체 미적용 기구 멸균제) | 3 |
| **유효 GREEN** | **532** |
| EXCEPTION | 0 |
| write (유효분) | 3,192 = 532 × 6T |
| 멱등 재실행 | GREEN 0 · SKIP 535 · write 0 |
| 독립검증 | 25 게이트 전부 PASS |

### 누적 (V4 route 트랙)

| 항목 | 값 |
|---|---:|
| 선행 GREEN (pilot100 80 + pilot500 416 + next2000 1,962 + finalall 388) | 2,846 |
| 본 배치 유효 GREEN | 532 |
| **누적 V4 GREEN** | **3,378** |
| 공식 미완료 | 431 |

미완료 431 내역: route 이월 138 · **인체 미적용 기구 멸균제 3 (본 배치 신규 격리)** · source terminal 24 · exclude 266.

> WO 예상치는 535 전량 GREEN 시 누적 3,381 / 미완료 428 이었다. 차이 3건은 아래 §4 회수분이다.

---

## 2. 실행 경로

| 단계 | 결과 |
|---|---|
| 선정 preflight | 535/535 · `liveDropped {}` · `systemStop []` · route 승계 검증 통과 |
| KO 저작 | composed 535 · blocked 0 |
| EN 번역메모리 | 고유 문장 207 (3,329 occurrence) · shard 0~3 번역 후 병합 `rejected 0` · `pendingAfter 0` |
| EN 경구동사 감사 | hits 22 → 교정 라운드(shard 5, `--overwrite-from 5`) 병합 후 **hits 0** |
| EN 저작 | composed 535 · blocked 0 · `tmMissingUnique 0` · route 가드 원문근거 면제 391 |
| baseline 스냅샷 | allcanon 100,244 · v4canon 30,556 · 선행 GREEN 2,846 |
| dry-run (535) | GREEN 0 · write 0 · PASS |
| rollback-test (5 → 535 전량) | write 0 · `failedMasterResidueDirty 0` · PASS |
| **APPLY** | GREEN 535 · EXCEPTION 0 · write 3,210 = 535 × 6T · PASS |
| 멱등 재실행 | GREEN 0 · SKIP 535 · write 0 · PASS |
| 회수 (3건) | demoted 2 (ko·en) · easy ko 복원 1 · audit 1 · 3/3 committed |
| 독립검증 | 25/25 PASS |

master 당 write 계약 6T: KO 4T (authored needs_review INSERT → easy canonical 강등 → authored canonical flip → audit INSERT) + EN 2T (authored en INSERT → canonical flip).

---

## 3. EN 번역메모리 — 경구 동사 오도입 교정

비경구(topical/oromucosal) 제품의 EN 에 경구 동사가 나타나면 투여 경로 역전이다. 감사 규칙은
**KO 원문에 경구 동사(복용/삼키/먹/섭취/마시/경구)가 없는데 EN 에 경구 동사가 있는 문장**을 잡는다.

22건이 검출되었고 전부 원문에 없는 경구 표현이었다(모두 `take` 의 비경구 관용 용법 또는 잘못된 동사 선택).
의미·수치·강도를 바꾸지 않는 최소 치환으로 교정했다.

| 교정 전 | 교정 후 |
|---|---|
| `do not take it internally` | `do not use it internally` |
| `it must not be swallowed` | `it must not be used internally` |
| `Take a small amount` | `Pick up a small amount` |
| `take N mL of this medicine in the palm` | `dispense N mL of this medicine into the palm` |
| `take only the minimum amount` | `use only the minimum amount` |
| `Activation takes` | `Activation requires` |
| `Take care` / `take care` | `Be careful` / `be careful` |

교정 후 재감사 **hits 0**, EN 저작 blocked 0.

병합 게이트(빈 값·한글 잔존·원문 수치 누락·수치 추가)는 4개 shard 192문장 + 교정 22문장 전부에서 `rejected 0`.

---

## 4. 회수 3건 — 인체 미적용 기구 멸균제

독립검증 IV-16(경로 표현 검출)이 3 master 를 지목했다.

| masterId | 제품 | 사유 |
|---|---|---|
| `06712efc-…faaa1` | 쓰리엠스테리-가스EO카트리지 계열 | EO 가스 멸균기 카트리지 |
| `171812b7-…5ca0e3` | 동일 원문 | 〃 |
| `8fb8e44a-…3df2e7` | 동일 원문 | 〃 |

세 건 모두 용법이 "산화에틸렌 가스 멸균기의 일회멸균공정마다 본제품 한개를 사용" 으로, **인체에 적용하는 제품이 아니다.**
상속 route 는 `topical` 이지만 EN 제목이 `Topical medicine` 으로 렌더되어 매장 소비자 설명서로서 부정확하다.
선정 단계 `PROFESSIONAL_USE` 필터의 빈틈이다.

**route 재판정이 아니라 대상 적격성 회수**로 처리했다 (`NON_HUMAN_DEVICE_STERILANT`).

- 본 배치 `source_ref_id` 인 authored 행만 canonical → deprecated (ko·en 각 1)
- 본 배치가 강등한 easy ko 행을 canonical 로 복원
- 회수 audit 1건 기록
- 회수 후 상태: authored canonical 0 · easy ko canonical 1 (IV-25 로 재검증)

생산 run 원장(`*.run-ROUTE535FINAL.ga.json`)은 **실제 실행 사실 그대로 535 커밋으로 보존**하고,
회수는 별도 원장(`otc-v4-route535-withdraw-nonhuman.ga.json`)으로 기록한다. 독립검증은 회수분을 GREEN 모집단에서 제외한다.

---

## 5. 독립검증 25 게이트

실행기 로직 미import · 별개 섹션 파서 · 별개 수치 정규식 · 별개 검증 SQL. `liveDbWrite 0`.

| ID | 게이트 | 실측 |
|---|---|---|
| IV-01 | 모집단(535) − 회수(3) ↔ 결과 원장 일치 | 532 동일 집합 |
| IV-02 | 대상 master 중복 0 | 0 |
| IV-03 | GREEN+EXCEPTION+SKIP = 유효 입력 수 | 532+0+0 = 532 |
| IV-04~05 | canonical 중복 0 / easy 잔존 0 | 0 / 0 |
| IV-06~09 | 섹션 헤딩·순서·필수 섹션·빈 섹션 | 위반 0 |
| IV-10~11 | 원문 외 사실 도입 0 / 금칙 표현 0 | 0 / 0 |
| IV-12 | 섹션 내용 커버리지 ≥ 0.95 | 미달 0 master |
| IV-13~15 | 수치·연령·기간 토큰 누락 0 | 0 / 0 / 0 |
| IV-16 | route 표현 오류 0 | **0** (회수 후) |
| IV-17 | EN canonical 한글 잔존 0 | 0 |
| IV-18~19 | 대상 밖 audit 0 / GREEN master audit 정확히 1 | 0 / 위반 0 |
| IV-20 | 선행 GREEN 2,846 불변 | 변경 0 / 소실 0 |
| IV-21 | 대상 밖 canonical 불변 | 30,556 |
| IV-22 | pilot100 예외 20 중 **재투입 큐 밖** write 0 | 0 (큐 내 재투입 7 master · row 14) |
| IV-23 | 선행 배치 **GREEN** 교집합 0 | 0 (선행 선정 원장 교집합 84 = 재투입 설계상 정상) |
| IV-24 | write 총량 = GREEN × 6 | 3,192 |
| IV-25 | 회수 3건 원복 | 위반 0 |

### 게이트 의미 정정 2건 (IV-22 · IV-23)

두 게이트는 선행 배치용 불변식을 그대로 들고 있어 **재투입 배치에서는 설계상 반드시 실패**했다.

- **IV-23**: 선행 *선정 원장* 과의 교집합 0 을 요구했다. 그러나 본 배치는 선행 배치에서 route 예외로 빠진 master 를
  다시 넣는 배치이므로 선정 원장 교집합(84)은 재투입 대상 그 자체다. 이중 생산 위험은 선행 **GREEN** 교집합으로만
  판정해야 한다 → 실측 **0**.
- **IV-22**: pilot100 예외 20 master 에 대한 write 0 을 요구했다. 그 중 7 master 가 본 재투입 큐에 정식 포함되어 있고
  14 row(7 × ko/en)는 계약된 산출이다 → **큐 밖** write 0 으로 정정, 실측 **0**.

두 정정 모두 검사를 느슨하게 한 것이 아니라 대상 불변식을 배치 성격에 맞게 옮긴 것이며, 원래 측정치(84 · 14)를
게이트 문구에 그대로 남겨 추적 가능하게 했다.

---

## 6. 산출물

스크립트 (`apps/api-server/src/scripts/`)

- `otc-v4-route535-contract.ga.ts` · `-select.ga.ts` · `-author.ga.ts` · `-tm-shard.ga.ts` · `-executor.ga.ts` · `-independent-verify.ga.ts`
- `otc-v4-route535-tm-oralverb-audit.ga.ts` (신규 — EN 경구 동사 오도입 감사)
- `otc-v4-route535-withdraw-nonhuman.ga.ts` (신규 — 인체 미적용 기구 멸균제 회수)

원장 (`apps/api-server/src/scripts/data/`)

- 선정 `otc-v4-route535-selection-ledger.ga.json` (+ `.run-ROUTE535FINAL`)
- 생산 `otc-v4-route535-result-ledger.run-ROUTE535FINAL.ga.json` · `-green-ledger.run-ROUTE535FINAL.ga.json`
- TM `otc-v4-route535-tm.ga.json` · shard 0~3 / 5(교정) · `-tm-merge-report` · `-tm-oralverb-audit` · `-tm-repair-oralverb`
- 저작 `otc-v4-route535-ko-payload` · `-en-payload` · `-author-report`
- 검증 `otc-v4-route535-verify-baseline` · `-independent-verification`
- 회수 `otc-v4-route535-withdraw-nonhuman.ga.json`

> 무접미 `result/green` 원장은 멱등 재실행이 GREEN 0 / SKIP 535 로 덮어쓴다. **정본은 `.run-ROUTE535FINAL` 스냅샷**이다.

---

## 7. 잔여

| 구분 | 건수 | 성격 |
|---|---:|---|
| route 이월 | 138 | 후속 판정 필요 |
| 인체 미적용 기구 멸균제 | 3 | 매장 소비자 설명서 대상 아님 (terminal) |
| source terminal | 24 | 공식 원문 부재 (terminal) |
| exclude | 266 | 대상 제외 (terminal) |
| **합계** | **431** | |

후속 권고: 선정 단계 `PROFESSIONAL_USE` 필터에 "인체 미적용 기구 멸균/소독제" 판정을 추가해 §4 유형이 다음 배치에서
생산 이후가 아니라 선정 단계에서 걸리도록 한다. (별도 WO)
