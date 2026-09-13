/**
 * Startup state — 서버 준비 상태의 단일 정본
 *
 * WO-O4O-API-DATABASE-READINESS-AND-COLD-START-TRAFFIC-GATE-FINAL-CLOSURE-V1
 *
 * "프로세스가 실행 중" 과 "외부 요청을 정상 처리할 준비가 됨" 을 구분한다.
 *
 *   STARTING → DB_CONNECTING → READY
 *   STARTING | DB_CONNECTING → FAILED      (프로덕션: process exit non-zero)
 *   READY | FAILED → SHUTTING_DOWN          (readiness 503 · 신규 연결 거부)
 *
 * 전환은 이 모듈의 `transitionStartupState()` 로만 한다. HTTP listen 은 main.ts 가 READY 로 전환한 뒤에만
 * 호출하므로, Cloud Run TCP startup probe 는 DB 연결·라우트 등록이 끝나기 전에는 성공할 수 없다.
 *
 * GRACEFUL_STARTUP:
 *   - 프로덕션(NODE_ENV=production)에서는 **무시**한다. DB 연결 실패 후 port 를 열어 트래픽을 받던 경로
 *     ("Continuing without database")는 모든 DB 의존 route 를 500 으로 만들 뿐이므로 제거했다.
 *   - 비프로덕션(로컬 개발 · 테스트)에서만 `GRACEFUL_STARTUP !== 'false'` 이면 DB 없이 기동을 허용한다.
 */

import logger from '../utils/logger.js';

export type StartupState = 'STARTING' | 'DB_CONNECTING' | 'READY' | 'FAILED' | 'SHUTTING_DOWN';

const ALLOWED: Record<StartupState, readonly StartupState[]> = {
  STARTING: ['DB_CONNECTING', 'FAILED', 'SHUTTING_DOWN'],
  DB_CONNECTING: ['READY', 'FAILED', 'SHUTTING_DOWN'],
  READY: ['SHUTTING_DOWN'],
  FAILED: ['SHUTTING_DOWN'],
  SHUTTING_DOWN: [],
};

const startedAtMs = Date.now();
let current: StartupState = 'STARTING';

/** 구조화 startup 로그 — 자격정보 · 접속 문자열을 포함하지 않는다. */
function logPhase(phase: string, extra?: Record<string, string | number | boolean>): void {
  logger.info(`[STARTUP] phase=${phase} t+${Date.now() - startedAtMs}ms`, extra ?? {});
}

export function getStartupState(): StartupState {
  return current;
}

export function isServerReady(): boolean {
  return current === 'READY';
}

export function transitionStartupState(next: StartupState, reason?: string): void {
  if (next === current) return;
  if (!ALLOWED[current].includes(next)) {
    throw new Error(`Invalid startup state transition: ${current} → ${next}`);
  }
  const prev = current;
  current = next;
  logPhase(next.toLowerCase(), { from: prev, ...(reason ? { reason } : {}) });
}

/** 테스트 전용 — 프로세스 내 상태를 초기화한다. */
export function __resetStartupStateForTests(): void {
  current = 'STARTING';
}

/**
 * DB 없이 기동을 계속할 수 있는가.
 * 프로덕션에서는 항상 false — 환경변수로 켤 수 없다.
 */
export function isGracefulStartupAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV === 'production') return false;
  return env.GRACEFUL_STARTUP !== 'false';
}

export { logPhase as logStartupPhase };

/**
 * DB 연결 예산 — 무한 재시도 · 고정 긴 sleep 없음.
 *   attempts 5 × attempt timeout 15s + backoff (3 + 6 + 9 + 12)s = 최대 약 105s
 *   < Cloud Run startup probe (tcpSocket · timeoutSeconds 240 · failureThreshold 1).
 */
export const DB_CONNECT_MAX_ATTEMPTS = 5;
export const DB_CONNECT_ATTEMPT_TIMEOUT_MS = 15_000;
export const DB_CONNECT_RETRY_BASE_DELAY_MS = 3_000;
export const DB_CONNECT_TOTAL_BUDGET_MS =
  DB_CONNECT_MAX_ATTEMPTS * DB_CONNECT_ATTEMPT_TIMEOUT_MS +
  (DB_CONNECT_RETRY_BASE_DELAY_MS * ((DB_CONNECT_MAX_ATTEMPTS - 1) * DB_CONNECT_MAX_ATTEMPTS)) / 2;
