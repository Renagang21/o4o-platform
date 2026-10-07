# CHECK-O4O-DELIVERY-NOT-SELECTED-CLASSIFICATION-CORRECTION-V1

> **WO**: WO-O4O-DELIVERY-NOT-SELECTED-CLASSIFICATION-CORRECTION-V1
> **일자**: 2026-10-03
> **변경**: `scripts/ci/deploy-orchestrate.mjs` (상태 표 4줄) · `scripts/ci/__tests__/deploy-orchestrate.test.mjs` (U6 계약 4건)

## 판정

```text
ROOT_CAUSE_IDENTIFIED            = YES
NOT_SELECTED_SEMANTICS           = PASS
HELD_LEVEL_3_SEMANTICS           = PASS
HELD_DEPENDENCY_SEMANTICS        = PASS
AUTO_DEPLOY_SEMANTICS            = PASS
NO_DEPLOY_SEMANTICS              = PASS

L3_DOWNGRADE                     = 0
CLASSIFIER_CONTRACT_TESTS        = PASS (U6 4건)
EXISTING_TESTS                   = PASS (scripts/ci 337/337)
CI_GATE                          = 반영 commit 의 main CI 에서 확인 (아래 §4)

PRODUCTION_DB_WRITE              = 0
MANUAL_PRODUCTION_DEPLOY         = 0
DEPLOY_FREEZE_CHANGED            = NO

DELIVERY_CLASSIFICATION_RESIDUAL = CLOSED
```

## 1. Root cause

판정(decision)은 처음부터 맞았다. `decidePromote()` 는 promote `services` 입력에 없는 서비스를 `NOT_SELECTED` 로 판정한다.
틀린 곳은 **decision → 표시 상태** 변환표 `STATE_OF` 한 줄이다: `NOT_SELECTED: 'HELD_LEVEL_3'`.
이 표를 commit status(`commitStatus`) · Delivery summary 표(`STATE_OF[s.decision]` 열) · report 가 모두 쓰므로, 미선택 서비스가 세 곳 모두에서 `HELD_LEVEL_3` · `(L3)` 로 보였다.

## 2. 수정 (upstream 상태 모델 — 문자열 후처리 아님)

| 항목 | 이전 | 이후 |
|---|---|---|
| `STATE_OF.NOT_SELECTED` | `HELD_LEVEL_3` | `NOT_SELECTED` (자체 상태) |
| `STATE_ORDER` | — | `HELD_DEPENDENCY` 다음, `DEPLOYING` 앞 |
| GitHub commit status | pending (HELD_LEVEL_3 경유) | **pending 유지** — 미선택 서비스는 target SHA 에 아직 못 미친다 |
| commit status 문구 | `held: store(L3)` | `held: store(not-selected)` · promote 재실행 안내 유지 |

classifier · L1/L2/L3 기준 · migration / auth / RBAC / token / secret 규칙 · `delivery.yml` · `promote.yml` 변경 0.

## 3. 계약 테스트 (U6)

| 케이스 | 입력 | 결과 |
|---|---|---|
| 재현 | promote `services=[api]` · 변경 = migration + neture + store | api `PROMOTE`(DEPLOYING) · neture · store `NOT_SELECTED` · kpa-society `NO_DEPLOY` |
| 실제 L3 | 자동 경로 · migration | `HELD_LEVEL_3` |
| L2 | 자동 경로 · API 일반 파일 | `AUTO_DEPLOY` |
| runtime diff 없음 | 변경 없는 서비스 | `NO_DEPLOY` |
| 의존 보류 | promote `services=[neture]` · API 변경 동반 | `HELD_DEPENDENCY` |
| L3 다운그레이드 0 | `STATE_OF` 에서 `HELD_LEVEL_3` 로 가는 decision | `AUTO_DEPLOY_BLOCKED` · `PROMOTE_REFUSED_UNKNOWN_SERVING` 2종뿐 (serving 불명 승인 거절도 HELD_LEVEL_3 유지) |
| commit status | api DEPLOYING + store NOT_SELECTED | overall `NOT_SELECTED` · pending · `(L3)` 표기 0 · 실제 L3 동반 시 overall = `HELD_LEVEL_3` |

수정 전 표(`NOT_SELECTED: 'HELD_LEVEL_3'`)에서는 재현 · 다운그레이드 테스트가 실패한다.

## 4. 운영 검증

가짜 runtime commit · 수동 deploy 없음. 반영 commit 은 `scripts/ci` 변경이라 main CI 가 global fallback(full) 경로로 돈다 → `CI Gate` 결과를 완료 보고에 기록.
실제 `NOT_SELECTED` 표시는 promote 를 `services` 로 좁혀 실행할 때만 생긴다 — 자연 발생 시 확인(이번 WO 에서 promote 를 일부러 실행하지 않음).

`문서 정합: 해당 없음`
