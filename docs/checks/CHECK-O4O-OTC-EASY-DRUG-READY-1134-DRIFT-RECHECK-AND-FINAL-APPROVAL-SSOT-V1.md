# CHECK-O4O-OTC-EASY-DRUG-READY-1134-DRIFT-RECHECK-AND-FINAL-APPROVAL-SSOT-V1

- WO: `WO-O4O-OTC-EASY-DRUG-READY-1134-DRIFT-RECHECK-AND-FINAL-APPROVAL-SSOT-V1`
- 에이전트: 라 (조사 전용)
- 성격: **READ-ONLY** — DB write 0 / 설명서 생성 0 / dry-run 0 / LIVE apply 0
- 선행: `CHECK-O4O-OTC-EASY-DRUG-MARKETED-SCOPE-BASELINE-CENSUS-V1` (승인됨)

## 1. 확정 기준 (WO 고정, 변경 금지)

| 항목 | 값 |
|------|-----|
| 공식 분모 (e약은요 등록) | **19,385** |
| 완료 (easyReg ∩ authored ko+en canonical) | **14,442** |
| 미완료 (easyReg incomplete) | **4,943** |
| 공식 완료율 | **74.50%** (14,442 / 19,385) |
| 77.85% | 참고치(reference only) — 공식 아님 |
| 비-easy | 향후 대량 생산 대상 아님 |

본 recheck 스냅샷에서 위 값 전부 재확인:
- easyReg = 19,385 · easyReg∩complete(now) = 14,442 · easyReg∩complete(baseline, created_at ≤ TS) = 14,442 · easyReg incomplete = 4,943.

## 2. 스냅샷

| 구분 | 값 |
|------|-----|
| baseline census 스냅샷 (TS) | `2026-07-27 03:46:25.177729+00` (xmin 4050462) |
| 본 recheck 스냅샷 시각 | `2026-07-27 04:42:18.792975+00` |
| 본 recheck 스냅샷 xmin | `4051150` |
| 격리 수준 | `REPEATABLE READ READ ONLY` 단일 트랜잭션 |

## 3. baseline READY 1,134 재현

`otc-easy-drug-marketed-scope-baseline-census-v1.json` 은 READY masterId 원장을 보존하지 않으므로,
**baseline census classifyHold 로직을 VERBATIM 재사용**하여 결정론적으로 재구성했다.

- 재구성식: `easyReg ∩ NOT baseline-complete(authored ko AND en canonical, created_at ≤ BASELINE_TS) ∩ classifyHold == READY`
- baseline incomplete 재현 = **4,943** (기대 4,943 ✅)
- baseline HOLD 분포 재현: `HOLD_IDENTITY 3,246 / READY 1,134 / HOLD_ROUTE 536 / HOLD_SOURCE 27` (합 4,943 ✅, WO 명시치와 일치)
- **baseline READY 재현 = 1,134 (기대 1,134 ✅ · reproductionOk=true)**
- 2회 실행 시 masterId 원장·route 승인 SSOT 모두 스냅샷 필드 제외 byte-identical.

> 전역 `drift_completed_after_ts = 0` — baseline 스냅샷(03:46:25) 이후 authored ko+en 신규 완료 0건.
> 즉 baseline 시점 완료 상태 == 현재 스냅샷 완료 상태. created_at 게이트로 baseline 을 안정 재구성.

## 4. Drift recheck (READY 1,134 ONLY)

| 상태 | 수 |
|------|-----|
| ALREADY_COMPLETED_DRIFT (스냅샷 시점 완료됨) | **0** |
| REMAINING_READY (미완료 잔여) | **1,134** |
| 합 | 1,134 |

- ALREADY_COMPLETED_DRIFT = baseline READY 였으나 스냅샷 시점 타 세션이 authored ko+en canonical 완료한 master.
- 이번 스냅샷에서는 drift 0 — 타 세션의 easy→authored 생산이 baseline 이후 정지 상태.
- HOLD_IDENTITY 3,246 / HOLD_ROUTE 536 / HOLD_SOURCE 27 은 범위 밖(승인 대상 아님).

## 5. Route 최종 승인 SSOT (status=PROPOSAL)

master 당 write = **KO 4T + EN 2T = 6T**.

| route | 승인 master | 생산 단위 | 예상 write |
|-------|:----------:|:--------:|:---------:|
| oral | 540 | 2 | 3,240 |
| topical | 327 | 1 | 1,962 |
| ophthalmic | 253 | 1 | 1,518 |
| oromucosal | 14 | 1 | 84 |
| **합계** | **1,134** | **5** | **6,804** |

- 생산 단위 규칙: route 경계 우선(단위는 route 를 넘지 않음) · fingerprint 그룹 분할 없음 · route 내 `<500=1 / 500–1,200=2 / >1,200=3` 단위 · 단위=트랜잭션/검증 단위.
- oral 540 (500–1,200 구간) → 2 단위. 나머지 route (<500) → 각 1 단위.
- EN 은 KO canonical 선행 필요(dry-run HELD 정상).

## 6. 게이트 (전부 PASS)

| 게이트 | 결과 |
|--------|------|
| g1 baseline READY 재현 = 1,134 | ✅ true |
| g2 baseline incomplete = 4,943 | ✅ true |
| g3 drift + remaining = 1,134 (drift 0 / remaining 1,134) | ✅ true |
| g4 승인 대상 중 이미 완료(LIVE) 교집합 = 0 | ✅ 0 |
| g5 승인 전량 baseline READY 내부 | ✅ true |
| g6 route 승인 합 = remaining(1,134) | ✅ true |
| g7 예상 write 정합(1,134×6=6,804) | ✅ true |
| g8 DB write | ✅ 0 |

## 7. 산출물

- `apps/api-server/src/scripts/otc-easy-drug-ready-1134-drift-recheck.ts` (recheck 스크립트, read-only)
- `apps/api-server/src/scripts/data/otc-easy-drug-ready-1134-drift-recheck-v1.json` (요약 + 게이트)
- `apps/api-server/src/scripts/data/otc-easy-drug-ready-1134-latest-state-ledger-v1.json` (1,134 최신 상태 원장)
- `apps/api-server/src/scripts/data/otc-easy-drug-ready-1134-already-completed-drift-v1.json` (drift 원장, 0건)
- `apps/api-server/src/scripts/data/otc-easy-drug-ready-1134-final-approval-ssot-v1.json` (status=PROPOSAL route 승인 SSOT)
- `docs/checks/CHECK-O4O-OTC-EASY-DRUG-READY-1134-DRIFT-RECHECK-AND-FINAL-APPROVAL-SSOT-V1.md` (본 문서)

## 8. 결론

baseline READY 1,134 를 최신 DB 와 대조한 결과, **drift 0 · 잔여 미완료 READY 1,134 전량 유효**.
route 별 승인 SSOT(PROPOSAL): oral 540(2단위) / topical 327(1) / ophthalmic 253(1) / oromucosal 14(1),
총 5 생산 단위 · 예상 write 6,804T (master 당 6T). 승인 + drift = 1,134 게이트 충족. DB write 0.
