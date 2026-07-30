# CHECK — WO-O4O-OTC-EASY-DRUG-V4-ROUTE-673-CURRENT-REMAINDER-RECONCILIATION-V1

> route 예외 673 판정 원장(commit `45b2f1add`)을 **현행 LIVE DB 와 대조**하여 실제 미생산 재투입 대상을 확정한다.
>
> 실행 에이전트: **agent-ga** · 실행일 2026-07-30 · 모드 **READ_ONLY** · **LIVE DB write 0**
> 기준 원장: [`otc-v4-route-673-resolution-ledger.na.json`](../../apps/api-server/src/scripts/data/otc-v4-route-673-resolution-ledger.na.json) (무수정)

---

## 1. 결론

| 항목 | 결과 |
|------|------|
| 대조 대상 | **673** (중복 0 · 누락 0) |
| **RECOVERABLE 535 중 이미 생산 완료** | **0** |
| **실제 미생산 RECOVERABLE (재투입 대상)** | **535** |
| 부분 생산(PARTIAL_REVIEW_REQUIRED) | 0 |
| 이월(carry-over) | **138** |
| 재판정 | **0** (classification·resolvedRoute 전건 승계) |
| 기존 673 원장 수정 | **0** (git blob `45b2f1add` 대비 sha256 동일) |
| LIVE DB write | **0** |
| 독립검증 | **PASS 15/15** |
| 산출물 재현성 | 2회 실행 **byte-identical** |

**핵심 판정:** 후속 생산 3회(pilot 500 · next 2,000 · 정상 잔여 388, GREEN 합집합 **2,846**)는 route 예외 673 집합을 **한 건도 건드리지 않았다**. 따라서 RECOVERABLE 535 는 전량 미생산이며, **535 전량이 가 에이전트 최종 재투입 대상**이다.

---

## 2. WO 필수 확인 12항목

| # | 확인 | 결과 |
|---|------|------|
| ① | 기존 RECOVERABLE 535 중 이미 KO/EN canonical 완료 | **0** |
| ② | 아직 미생산 RECOVERABLE | **535** (topical 496 · oromucosal 39) |
| ③ | REQUIRES_ROUTE_PROFILE 수 / route 분포 | **26** — nasal 14 · rectal 12 |
| ④ | TRUE_MULTI_ROUTE | **46** |
| ⑤ | HOLD_UNRESOLVED | **35** |
| ⑥ | ROUTE_SOURCE_CONFLICT | **31** |
| ⑦ | 기존 GREEN(2,846) 과의 교집합 | **0** |
| ⑧ | source terminal 24 · exclude 266 혼입 | **0 / 0** |
| ⑨ | agent-ga 최종 재투입 원장 | [`otc-v4-route-673-final-reentry-queue.ga.json`](../../apps/api-server/src/scripts/data/otc-v4-route-673-final-reentry-queue.ga.json) (535) |
| ⑩ | DB write | **0** (SELECT 전용 · authored row 최근 변동 0 · route-673 batch audit 0) |
| ⑪ | 독립검증 | **R-01~R-15 전부 PASS** |
| ⑫ | CHECK · commit · push | 본 문서 · §6 |

### 673 현행 상태 분해

| classification | 건수 | SKIP_COMPLETE | PENDING | 처리 |
|---|---:|---:|---:|---|
| RECOVERABLE_ROUTE_CONFIRMED | 535 | 0 | 535 | **재투입 큐** |
| TRUE_MULTI_ROUTE | 46 | 0 | 46 | 이월 |
| HOLD_UNRESOLVED | 35 | 0 | 35 | 이월 |
| ROUTE_SOURCE_CONFLICT | 31 | 0 | 31 | 이월 |
| REQUIRES_ROUTE_PROFILE | 26 | 0 | 26 | 이월 (route profile 신설 필요: nasal 14 · rectal 12) |
| **계** | **673** | **0** | **673** | 535 + 138 |

---

## 3. 실행 계층

| 단계 | 산출물 |
|------|--------|
| reconciliation (READ ONLY) | [otc-v4-route-673-reconciliation.ga.ts](../../apps/api-server/src/scripts/otc-v4-route-673-reconciliation.ga.ts) |
| 독립검증 (분리 코드 경로) | [otc-v4-route-673-reconciliation-independent-verify.ga.ts](../../apps/api-server/src/scripts/otc-v4-route-673-reconciliation-independent-verify.ga.ts) |

**대조 기준(제품별):** `shared_product_descriptions` 의 `description_type='STORE'` · `deleted_at IS NULL` 에서
`source_type='mfds_drug_otc'`(authored) 이면서 `status='canonical'` 인 행이 **ko 1건 + en 1건** 이면 `SKIP_COMPLETE`,
authored 행이 일부만 존재하면 `PARTIAL_REVIEW_REQUIRED`, 전무하면 `PENDING_*`.

**재판정 금지 준수:** `classification` · `resolvedRoute` 는 기존 원장 값을 그대로 복사하며 어떤 재계산·재추론도 수행하지 않는다(독립검증 R-02 로 전건 대조). 제품명은 판정에 사용되지 않는다.

---

## 4. 독립검증 (15항목)

reconciliation 실행기를 **import 하지 않고**, LIVE 상태를 행 단위 SELECT 로 재수집하고, 원장 무결성은 git blob 과 대조하고, 재투입 큐 유도 규칙과 sourceRef 를 독립 재계산한다. READ ONLY.

| ID | 검증 | 결과 |
|----|------|------|
| R-01 | 기존 673 원장 3종 무수정 (`45b2f1add` blob sha256 동일) | 0 변경 |
| R-02 | 재판정 0 — classification·resolvedRoute 전건 승계 | 0 drift |
| R-03 | 대상 673 · 중복 0 · 누락 0 | PASS |
| R-04 | 분류별 건수 = 535/46/35/31/26 | 일치 |
| R-05 | LIVE 상태 독립 재수집 = 원장 state/liveState | 0 불일치 |
| R-06 | SKIP_COMPLETE 는 ko/en canonical 1/1 한정 | PASS |
| R-07 | 재투입 큐 = 미생산 RECOVERABLE 전량, 그 외 0 | 535 = 535 |
| R-08 | 재투입 큐 route 전건 composer 지원 | topical 496 · oromucosal 39 |
| R-09 | 오염 0 (exclude 266 · source 24 · 기존 GREEN) | 0 / 0 / 0 |
| R-10 | 기존 GREEN 합집합 = 2,846 | 80+416+1,962+388 |
| R-11 | carry-over = 673 − 535 − 0 · 중복 0 | 138 |
| R-12 | 재투입 큐 ⊆ 나 에이전트 RECOVERABLE 535 | PASS |
| R-13 | plannedSourceRef = uuid(md5(`otc-v4-master-leaflet:`+masterId)) 재계산 일치 · 중복 0 | PASS |
| R-14 | DB write 0 (authored row 최근 변동 0 · route-673 audit 0) | PASS |
| R-15 | 산출물 3종 지문 기록 | 기록 |

**15/15 PASS.** 2회 실행 결과 3종 산출물 md5 동일(byte-identical).

---

## 5. 후속 (가 에이전트 최종 생산)

- 입력: [`otc-v4-route-673-final-reentry-queue.ga.json`](../../apps/api-server/src/scripts/data/otc-v4-route-673-final-reentry-queue.ga.json) — **535 master** (topical 496 · oromucosal 39)
- 계약: 기존과 동일 — sourceRef namespace `otc-v4-master-leaflet:<masterId>` · 제품별 savepoint · **KO 4T + EN 2T = 6T** · 이중 게이트 · LIVE write 소유자 **agent-ga 단일**
- 재판정 없음: route 는 본 큐의 `resolvedRoute` 를 그대로 사용한다.
- 이월 138(TRUE_MULTI_ROUTE 46 · HOLD_UNRESOLVED 35 · ROUTE_SOURCE_CONFLICT 31 · REQUIRES_ROUTE_PROFILE 26)은 본 생산 범위 밖이며 [`otc-v4-route-673-carryover-ledger.ga.json`](../../apps/api-server/src/scripts/data/otc-v4-route-673-carryover-ledger.ga.json) 로 보존한다. REQUIRES_ROUTE_PROFILE 26 은 nasal/rectal composer profile 신설 시 회수 가능하다.

---

## 6. 산출물

| 파일 | 내용 |
|------|------|
| [otc-v4-route-673-reconciliation-ledger.ga.json](../../apps/api-server/src/scripts/data/otc-v4-route-673-reconciliation-ledger.ga.json) | 673 제품별 현행 대조 원장 |
| [otc-v4-route-673-final-reentry-queue.ga.json](../../apps/api-server/src/scripts/data/otc-v4-route-673-final-reentry-queue.ga.json) | 가 에이전트 최종 재투입 큐 535 |
| [otc-v4-route-673-carryover-ledger.ga.json](../../apps/api-server/src/scripts/data/otc-v4-route-673-carryover-ledger.ga.json) | 이월 138 |
| [otc-v4-route-673-reconciliation-independent-verification.ga.json](../../apps/api-server/src/scripts/data/otc-v4-route-673-reconciliation-independent-verification.ga.json) | 독립검증 15항목 |

기존 673 판정 원장·hold 원장·나 에이전트 reentry 원장·run 별 GREEN 원장은 **수정하지 않았다**.

---

*작성: agent-ga · 2026-07-30 · 상태: 종료(재투입 535 확정)*
