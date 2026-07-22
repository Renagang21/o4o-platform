# CHECK — HFF shard 1 완결형 생산 배치 (Agent B)

- 정비: `CHECK-O4O-HFF-PARALLEL-SHARD-COLLISION-GUARD-B-V1` (`eb698ff70`) — shard 분리 + taken 제외.
- 방식: 자기 shard(1/3)에서만 생산. `select --shard 1 --shard-count 3 --exclude-taken`.

## 1. 생산 결과

| 항목 | 값 |
|------|-----|
| 대상 | shard-1 top-100 signature (shard-plan) |
| 순가용 그룹 | 60 (taken 제외 후 — nc 선점분 자동 회피) |
| **READY (LIVE)** | **174** |
| REVIEW_LATER | 1 (개별 데이터 문제, 자동 분리) |
| REVIEW(known-safe 포함) | 18 |
| dry-run | 60그룹 PASS · 예상=실측 write **696** |
| apply | 60/60 COMMIT · **ALREADY_PROMOTED 0** · canonicalDup 0 |
| 독립검증 | combo-sh1 masters **174** · canonicalDup **0** |
| slug | `combo-sh1-*` (verifier `combo-%` 자동 포함) |

## 2. 충돌 방지 실증

- **ALREADY_PROMOTED 0 / canonicalDup 0** — 2차 배치(무조율, 11그룹 충돌)와 대조적으로 **충돌 완전 차단**.
- taken-exclusion 이 nc 세션 선점분을 select 단계에서 자동 제외 → dry-run/apply 충돌 0.
- shard 분리로 세션 간 대상 signature disjoint(교집합 0).

## 3. 목표 대비

- WO 목표 500~800 대비 **174** — 정비 이전에 nc 세션이 shard-1 고수율 signature 를 이미 선점(select taken-exclusion 에서 대량 제외 관찰: 상위 vc-vd-zn 34 전량 taken 등). 현 shard-1 순가용 상한이 낮음.
- 이후 재선점은 taken-exclusion 으로 원천 차단 → **정비 후 신규 생산은 항상 충돌 0**. 남은 shard-1 저수율 signature 및 향후 유입 후보로 누적 가능.

*정비 후 생산 · apply 사용자 승인 · 독립검증 read-only · path-specific commit.*
