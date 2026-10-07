/**
 * 명령 수령(heartbeat) 간격 — active / idle 2단 (WO-O4O-LOCAL-AGENT-COMMAND-POLLING-LATENCY-V1)
 *
 * 서버는 run 하나를 **명령 하나씩 순차로** 내려보낸다(결과를 받아야 다음 명령을 만든다). 그래서
 * 명령을 처리한 직후에 고정 5 s 를 쉬면 명령마다 최대 5 s 의 공백이 생긴다 — 실측(2026-10-01, B
 * 재개 run 48.7 s)에서 PC 쪽 실처리는 명령당 수십 ms 였고 44 s 가 이 공백이었다.
 *
 * 규칙: 마지막으로 명령을 받은 시각에서 멀어질수록 간격을 되돌린다.
 *   0 ~ 3 s   : 250 ms   (다음 관찰·행동 명령은 보통 이 안에 온다)
 *   3 ~ 10 s  : 500 ms   (AI 계획 대기 — 실측 3~5 s)
 *   10 ~ 20 s : 1 s      (느린 AI · 페이지 이동 대기)
 *   그 뒤      : 5 s      (idle — 기존과 같은 부하)
 *
 * 명령을 한 번도 받지 않았거나 마지막 명령에서 20 s 가 지나면 idle 이다. idle 에서 250 ms 를
 * 두드리지 않는다 — 아무 일 없는 PC 의 서버 부하는 기존(5 s 주기)과 같다.
 * 한 번의 active 구간이 만드는 추가 heartbeat 는 최대 12 + 14 + 10 = 36 회다.
 */

export const IDLE_POLL_INTERVAL_MS = 5000;

/** [이 경과 시간 미만이면, 이 간격] — 오름차순. */
export const ACTIVE_POLL_STEPS = Object.freeze([
  Object.freeze({ untilMs: 3000, intervalMs: 250 }),
  Object.freeze({ untilMs: 10000, intervalMs: 500 }),
  Object.freeze({ untilMs: 20000, intervalMs: 1000 }),
]);

/** active 구간 길이 = 마지막 단계의 끝. */
export const ACTIVE_WINDOW_MS = ACTIVE_POLL_STEPS[ACTIVE_POLL_STEPS.length - 1].untilMs;

/**
 * 다음 heartbeat 까지 쉴 시간.
 *
 * @param {number | null} lastCommandAt 마지막으로 명령을 받아 처리한 시각(ms). 없으면 null.
 * @param {number} now 현재 시각(ms).
 */
export function nextPollDelayMs(lastCommandAt, now) {
  if (typeof lastCommandAt !== 'number' || !Number.isFinite(lastCommandAt)) return IDLE_POLL_INTERVAL_MS;
  const elapsed = now - lastCommandAt;
  // 시계가 뒤로 간 경우(elapsed < 0)는 판단할 근거가 없으므로 idle 로 돌아간다 — 짧은 간격에 갇히지 않게.
  if (!Number.isFinite(elapsed) || elapsed < 0) return IDLE_POLL_INTERVAL_MS;
  for (const step of ACTIVE_POLL_STEPS) {
    if (elapsed < step.untilMs) return step.intervalMs;
  }
  return IDLE_POLL_INTERVAL_MS;
}
