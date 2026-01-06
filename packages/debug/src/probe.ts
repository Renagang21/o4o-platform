/**
 * O4O Debug Probe
 * 런타임 관측을 위한 핵심 유틸리티
 *
 * 커뮤니티 검증 패턴: window.__PROBE__ 를 통한 상태 노출
 * AI 에이전트가 분석하기 쉬운 구조화된 데이터 제공
 */

import type {
  GlobalProbeState,
  ProbeSession,
  ProbeConfig,
  TimelineMark,
  ApiCall,
  ProbeError,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: ProbeConfig = {
  captureApiCalls: true,
  captureConsoleErrors: true,
  capturePerformance: true,
  maxSessions: 10,
  maxTimelineMarks: 100,
  maxApiCalls: 50,
};

// ============================================================================
// Global State Initialization
// ============================================================================

function getGlobalState(): GlobalProbeState {
  if (typeof window === 'undefined') {
    // SSR 환경
    return {
      enabled: false,
      sessions: {},
      activeSession: null,
      config: DEFAULT_CONFIG,
    };
  }

  if (!window.__PROBE__) {
    window.__PROBE__ = {
      enabled: true,
      sessions: {},
      activeSession: null,
      config: { ...DEFAULT_CONFIG },
    };
  }

  return window.__PROBE__;
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * 새 프로브 세션 시작
 * @param name 세션 이름 (예: 'login', 'dashboard-load', 'api-test')
 */
export function startSession(name: string): ProbeSession {
  const state = getGlobalState();
  const id = `${name}-${Date.now()}`;

  const session: ProbeSession = {
    id,
    name,
    startTime: performance.now(),
    timeline: [],
    apiCalls: [],
    errors: [],
    metadata: {},
  };

  // 오래된 세션 정리
  const sessionIds = Object.keys(state.sessions);
  if (sessionIds.length >= state.config.maxSessions) {
    const oldestId = sessionIds[0];
    delete state.sessions[oldestId];
  }

  state.sessions[id] = session;
  state.activeSession = id;

  // 시작 마크 자동 추가
  mark('session:start');

  return session;
}

/**
 * 현재 활성 세션 종료
 */
export function endSession(): ProbeSession | null {
  const state = getGlobalState();
  if (!state.activeSession) return null;

  const session = state.sessions[state.activeSession];
  if (session) {
    mark('session:end');
    session.endTime = performance.now();
  }

  state.activeSession = null;
  return session;
}

/**
 * 현재 활성 세션 가져오기
 */
export function getActiveSession(): ProbeSession | null {
  const state = getGlobalState();
  if (!state.activeSession) return null;
  return state.sessions[state.activeSession] || null;
}

/**
 * 특정 세션 가져오기
 */
export function getSession(id: string): ProbeSession | null {
  const state = getGlobalState();
  return state.sessions[id] || null;
}

/**
 * 모든 세션 가져오기
 */
export function getAllSessions(): Record<string, ProbeSession> {
  return getGlobalState().sessions;
}

// ============================================================================
// Timeline Marking
// ============================================================================

/**
 * 타임라인에 마크 추가
 * @param label 마크 라벨 (예: 'login:start', 'api:response', 'render:complete')
 * @param metadata 추가 메타데이터
 */
export function mark(label: string, metadata?: Record<string, unknown>): TimelineMark | null {
  const session = getActiveSession();
  if (!session) return null;

  const state = getGlobalState();
  const now = performance.now();

  // 이전 마크와의 시간 차이 계산
  const prevMark = session.timeline[session.timeline.length - 1];
  const delta = prevMark ? now - prevMark.time : 0;

  const timelineMark: TimelineMark = {
    label,
    time: now,
    delta,
    metadata,
  };

  // 최대 마크 수 제한
  if (session.timeline.length >= state.config.maxTimelineMarks) {
    session.timeline.shift();
  }

  session.timeline.push(timelineMark);
  return timelineMark;
}

/**
 * 타임라인 마크 간 시간 측정 헬퍼
 */
export function measureBetween(startLabel: string, endLabel: string): number | null {
  const session = getActiveSession();
  if (!session) return null;

  const startMark = session.timeline.find((m) => m.label === startLabel);
  const endMark = session.timeline.find((m) => m.label === endLabel);

  if (!startMark || !endMark) return null;
  return endMark.time - startMark.time;
}

// ============================================================================
// API Call Tracking
// ============================================================================

/**
 * API 호출 시작 기록
 */
export function trackApiStart(url: string, method: string = 'GET'): ApiCall | null {
  const session = getActiveSession();
  if (!session) return null;

  const state = getGlobalState();
  if (!state.config.captureApiCalls) return null;

  const apiCall: ApiCall = {
    url,
    method,
    startTime: performance.now(),
  };

  // 최대 API 호출 수 제한
  if (session.apiCalls.length >= state.config.maxApiCalls) {
    session.apiCalls.shift();
  }

  session.apiCalls.push(apiCall);
  return apiCall;
}

/**
 * API 호출 완료 기록
 */
export function trackApiEnd(
  url: string,
  status: number,
  error?: string
): ApiCall | null {
  const session = getActiveSession();
  if (!session) return null;

  const apiCall = session.apiCalls.find(
    (c) => c.url === url && !c.endTime
  );

  if (apiCall) {
    apiCall.endTime = performance.now();
    apiCall.duration = apiCall.endTime - apiCall.startTime;
    apiCall.status = status;
    apiCall.error = error;
  }

  return apiCall;
}

/**
 * fetch wrapper for automatic API tracking
 */
export function createTrackedFetch(originalFetch: typeof fetch): typeof fetch {
  return async (input, init) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';

    trackApiStart(url, method);
    mark(`api:${method}:start`, { url });

    try {
      const response = await originalFetch(input, init);
      trackApiEnd(url, response.status);
      mark(`api:${method}:end`, { url, status: response.status });
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      trackApiEnd(url, 0, errorMessage);
      mark(`api:${method}:error`, { url, error: errorMessage });
      throw error;
    }
  };
}

// ============================================================================
// Error Tracking
// ============================================================================

/**
 * 에러 기록
 */
export function trackError(error: Error | string, context?: Record<string, unknown>): void {
  const session = getActiveSession();
  if (!session) return;

  const probeError: ProbeError = {
    time: performance.now(),
    message: typeof error === 'string' ? error : error.message,
    stack: error instanceof Error ? error.stack : undefined,
    context,
  };

  session.errors.push(probeError);
  mark('error', { message: probeError.message });
}

// ============================================================================
// Metadata Management
// ============================================================================

/**
 * 세션 메타데이터 설정
 */
export function setMetadata(key: string, value: unknown): void {
  const session = getActiveSession();
  if (!session) return;
  session.metadata[key] = value;
}

/**
 * 세션 메타데이터 가져오기
 */
export function getMetadata(key: string): unknown {
  const session = getActiveSession();
  if (!session) return undefined;
  return session.metadata[key];
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * 프로브 설정 변경
 */
export function configure(config: Partial<ProbeConfig>): void {
  const state = getGlobalState();
  state.config = { ...state.config, ...config };
}

/**
 * 프로브 활성화/비활성화
 */
export function setEnabled(enabled: boolean): void {
  getGlobalState().enabled = enabled;
}

/**
 * 프로브 활성화 여부 확인
 */
export function isEnabled(): boolean {
  return getGlobalState().enabled;
}

// ============================================================================
// Export Utilities
// ============================================================================

/**
 * 세션 데이터를 JSON 문자열로 내보내기
 * AI 에이전트에게 전달하기 좋은 형식
 */
export function exportSession(sessionId?: string): string {
  const state = getGlobalState();
  const id = sessionId || state.activeSession;

  if (!id || !state.sessions[id]) {
    return JSON.stringify({ error: 'No session found' }, null, 2);
  }

  const session = state.sessions[id];
  return JSON.stringify(
    {
      ...session,
      totalDuration: session.endTime
        ? session.endTime - session.startTime
        : performance.now() - session.startTime,
      summary: {
        totalMarks: session.timeline.length,
        totalApiCalls: session.apiCalls.length,
        totalErrors: session.errors.length,
        slowestApi: session.apiCalls.reduce(
          (max, call) => (call.duration && call.duration > (max?.duration || 0) ? call : max),
          null as ApiCall | null
        ),
      },
    },
    null,
    2
  );
}

/**
 * 모든 세션 데이터 내보내기
 */
export function exportAllSessions(): string {
  return JSON.stringify(getGlobalState(), null, 2);
}

/**
 * 세션 데이터 클리어
 */
export function clearSessions(): void {
  const state = getGlobalState();
  state.sessions = {};
  state.activeSession = null;
}

// ============================================================================
// Console Integration
// ============================================================================

/**
 * 콘솔에 세션 요약 출력
 */
export function logSessionSummary(sessionId?: string): void {
  const state = getGlobalState();
  const id = sessionId || state.activeSession;

  if (!id || !state.sessions[id]) {
    console.log('[Probe] No session found');
    return;
  }

  const session = state.sessions[id];
  const duration = session.endTime
    ? session.endTime - session.startTime
    : performance.now() - session.startTime;

  console.group(`[Probe] Session: ${session.name}`);
  console.log(`Duration: ${duration.toFixed(2)}ms`);
  console.log(`Timeline marks: ${session.timeline.length}`);
  console.log(`API calls: ${session.apiCalls.length}`);
  console.log(`Errors: ${session.errors.length}`);

  if (session.apiCalls.length > 0) {
    console.group('API Calls:');
    session.apiCalls.forEach((call) => {
      console.log(
        `  ${call.method} ${call.url} - ${call.duration?.toFixed(2) || '?'}ms (${call.status || 'pending'})`
      );
    });
    console.groupEnd();
  }

  if (session.errors.length > 0) {
    console.group('Errors:');
    session.errors.forEach((err) => {
      console.error(`  ${err.message}`);
    });
    console.groupEnd();
  }

  console.groupEnd();
}

// ============================================================================
// Quick Access for window.__DEBUG__
// ============================================================================

if (typeof window !== 'undefined') {
  window.__DEBUG__ = {
    probe: {
      startSession,
      endSession,
      mark,
      trackApiStart,
      trackApiEnd,
      trackError,
      exportSession,
      exportAllSessions,
      logSessionSummary,
      clearSessions,
    },
    get sessions() {
      return getAllSessions();
    },
  };
}
