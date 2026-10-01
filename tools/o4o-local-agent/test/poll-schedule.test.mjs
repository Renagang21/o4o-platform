/**
 * 명령 수령 간격 active / idle — agent 계층 테스트 (WO-O4O-LOCAL-AGENT-COMMAND-POLLING-LATENCY-V1)
 *
 * 의존성 0 — node:test + node:assert. 실 PC 지연 측정은 CHECK 가 본다. 여기서는 간격 규칙과
 * "idle 부하는 기존과 같다" 는 경계를 잠근다.
 *
 *   1 명령 받은 적 없음 = idle 5 s · 2 단계 경계값 · 3 active 구간 뒤 idle 복귀 · 4 시계 역행/비정상 입력 = idle ·
 *   5 idle 1 분 heartbeat 수 = 기존(5 s) 과 같음 · 6 active 1 구간 추가 heartbeat 상한 · 7 명령 사이 대기 상한
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nextPollDelayMs,
  IDLE_POLL_INTERVAL_MS,
  ACTIVE_POLL_STEPS,
  ACTIVE_WINDOW_MS,
} from '../src/poll-schedule.mjs';

const T0 = 1_000_000;

/** 루프 모사 — heartbeat 즉시 응답 가정, `commandTimes` 시각(ms, T0 기준)에 명령이 대기열에 생긴다. */
function simulate({ durationMs, commandTimes = [] }) {
  const pending = [...commandTimes].sort((a, b) => a - b);
  let now = 0;
  let lastCommandAt = null;
  const heartbeats = [];
  const waits = [];
  while (now < durationMs) {
    heartbeats.push(now);
    let got = false;
    while (pending.length > 0 && pending[0] <= now) {
      waits.push(now - pending.shift());
      got = true;
    }
    if (got) lastCommandAt = T0 + now;
    now += nextPollDelayMs(lastCommandAt, T0 + now);
  }
  return { heartbeats, waits };
}

test('1 명령을 받은 적이 없으면 idle 간격(기존 5 s)', () => {
  assert.equal(IDLE_POLL_INTERVAL_MS, 5000);
  assert.equal(nextPollDelayMs(null, T0), 5000);
  assert.equal(nextPollDelayMs(undefined, T0), 5000);
});

test('2 마지막 명령에서 멀어질수록 간격이 단계적으로 늘어난다', () => {
  assert.equal(nextPollDelayMs(T0, T0), 250);
  assert.equal(nextPollDelayMs(T0, T0 + 2999), 250);
  assert.equal(nextPollDelayMs(T0, T0 + 3000), 500);
  assert.equal(nextPollDelayMs(T0, T0 + 9999), 500);
  assert.equal(nextPollDelayMs(T0, T0 + 10000), 1000);
  assert.equal(nextPollDelayMs(T0, T0 + 19999), 1000);
  // 단계는 오름차순이고 간격은 줄지 않는다.
  for (let i = 1; i < ACTIVE_POLL_STEPS.length; i += 1) {
    assert.ok(ACTIVE_POLL_STEPS[i].untilMs > ACTIVE_POLL_STEPS[i - 1].untilMs);
    assert.ok(ACTIVE_POLL_STEPS[i].intervalMs >= ACTIVE_POLL_STEPS[i - 1].intervalMs);
  }
});

test('3 active 구간이 끝나면 idle 로 돌아간다', () => {
  assert.equal(ACTIVE_WINDOW_MS, 20000);
  assert.equal(nextPollDelayMs(T0, T0 + ACTIVE_WINDOW_MS), 5000);
  assert.equal(nextPollDelayMs(T0, T0 + 3_600_000), 5000);
});

test('4 시계 역행 · 비정상 입력은 idle — 짧은 간격에 갇히지 않는다', () => {
  assert.equal(nextPollDelayMs(T0, T0 - 1), 5000);
  assert.equal(nextPollDelayMs(Number.NaN, T0), 5000);
  assert.equal(nextPollDelayMs(T0, Number.NaN), 5000);
  assert.equal(nextPollDelayMs('1000', T0), 5000);
});

test('5 idle 1 분 heartbeat 수는 기존(5 s 고정)과 같다', () => {
  const { heartbeats } = simulate({ durationMs: 60_000 });
  assert.equal(heartbeats.length, 12);
});

test('6 명령 1 개가 만드는 추가 heartbeat 는 상한(36) 안이고, 그 뒤 idle 로 복귀한다', () => {
  const { heartbeats } = simulate({ durationMs: 120_000, commandTimes: [0] });
  const active = heartbeats.filter((t) => t > 0 && t < ACTIVE_WINDOW_MS).length;
  assert.ok(active <= 36, `active heartbeats ${active}`);
  const after = heartbeats.filter((t) => t >= ACTIVE_WINDOW_MS + IDLE_POLL_INTERVAL_MS);
  for (let i = 1; i < after.length; i += 1) assert.equal(after[i] - after[i - 1], 5000);
});

test('7 run 진행 중 다음 명령 대기: 3 s 안 = ≤250 ms · AI 대기(≤10 s) = ≤500 ms (기존 최대 5 s)', () => {
  // 실측 B 재개 run 모양: 연속 명령 간격 ~0.1 s, AI 계획 뒤 5.1 s, 클릭 뒤 0.8 s, 완료 판정 뒤 2.9 s.
  const commandTimes = [0, 100, 200, 300, 5400, 5500, 6300, 6400, 9300];
  const { waits } = simulate({ durationMs: 40_000, commandTimes });
  assert.equal(waits.length, commandTimes.length);
  for (const w of waits) assert.ok(w <= 500, `wait ${w}`);
  const total = waits.reduce((a, b) => a + b, 0);
  assert.ok(total < 9 * 5000 * 0.1, `total wait ${total}`);
});
