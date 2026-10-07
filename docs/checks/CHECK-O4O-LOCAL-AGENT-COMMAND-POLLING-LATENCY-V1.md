# CHECK-O4O-LOCAL-AGENT-COMMAND-POLLING-LATENCY-V1

> **WO**: `WO-O4O-LOCAL-AGENT-COMMAND-POLLING-LATENCY-V1` (사용자 지시 2026-10-01 · WO 문서 없음 — 이 CHECK 가 기록)
> **발견 경위**: [`CHECK-O4O-MAIN-AUTOMATION-RESUME-AND-REPLAY-PREFLIGHT-FIX-V1`](CHECK-O4O-MAIN-AUTOMATION-RESUME-AND-REPLAY-PREFLIGHT-FIX-V1.md) §3-0 — B 재개 run 48.69 s 중 Local 명령 대기 ≈44 s
> **작성일**: 2026-10-01
> **현재 판정**: `CODE_COMPLETE` · 단위 PASS · 실 PC latency 재측정 **PENDING**

---

## 1. 범위

| 한다 | 하지 않는다 |
|---|---|
| Local Agent heartbeat 간격을 active / idle 2단으로 | API contract · DB schema · 명령 contract |
| idle 부하는 기존(5 s) 유지 | long-poll · 관찰 명령 통합 · 원장 명령 통합 |
| | AI prompt / model · 서버 코드 · 배포(agent 는 PC 에서 직접 실행) |

## 2. 원인

`index.mjs` 루프: heartbeat(명령 수령) → 명령 처리 → **무조건 `sleep(5000)`**. 서버는 결과를 받아야 다음 명령을 만들므로(순차) 명령마다 최대 5 s 공백이 생긴다. 실측 명령당 PC 실처리 수십~수백 ms, 명령당 체류 ≈5.1 s.

## 3. 변경

| 파일 | 내용 |
|---|---|
| `tools/o4o-local-agent/src/poll-schedule.mjs` (신규) | `nextPollDelayMs(lastCommandAt, now)` — 마지막 명령 수령 후 0~3 s: 250 ms · 3~10 s: 500 ms · 10~20 s: 1 s · 그 뒤 / 수령 이력 없음 / 시계 역행: 5 s(idle) |
| `tools/o4o-local-agent/src/index.mjs` | 명령을 받으면 `lastCommandAt` 갱신 · 고정 `POLL_INTERVAL_MS` 대신 `nextPollDelayMs` |
| `tools/o4o-local-agent/test/poll-schedule.test.mjs` (신규) | 7 케이스 |

- 단계 근거: 연속 관찰·행동 명령 간격 ≈0.1 s, AI 계획 대기 실측 2.9~5.1 s, 서버 명령 결과 대기 상한 `COMMAND_WAIT_TIMEOUT_MS` 12 s.
- 서버 부하: heartbeat = `UPDATE local_agent_devices SET last_seen_at` 1 + 명령 claim 1. `/api/local-agent` 에 rate limiter 없음. active 구간 1회의 추가 heartbeat 상한 36회(12 + 14 + 10), idle 1분 heartbeat 12회(기존과 같음).
- 남는 지연: run 의 **첫 명령**은 idle 상태에서 받으므로 최대 5 s 그대로(idle 부하 유지의 대가). 연결 오류 백오프 · 401 재연결 경로는 무변경.

## 4. 검증

| 항목 | 결과 |
|---|---|
| `node --test test/poll-schedule.test.mjs` | **7/7 PASS** |
| `node --test test/*.test.mjs` (전체) | **130/130 PASS** (기존 123 + 신규 7) |
| `node --check src/index.mjs` | PASS |
| 실 PC 재측정 (baseline B = 48.69 s · 명령당 ≈5.1 s) | **PENDING** — agent 재시작(+확장 새로고침) 후 동등 `게보린` 검색 |

## 5. 실 PC 재측정 — PENDING
