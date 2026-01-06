/**
 * O4O Debug Types
 * 플랫폼 전체에서 사용하는 디버깅 타입 정의
 */

// ============================================================================
// Timeline & Measurement Types
// ============================================================================

export interface TimelineMark {
  label: string;
  time: number;
  delta?: number; // 이전 마크로부터의 시간 차이
  metadata?: Record<string, unknown>;
}

export interface ApiCall {
  url: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status?: number;
  error?: string;
  requestSize?: number;
  responseSize?: number;
}

// ============================================================================
// Probe Session Types
// ============================================================================

export interface ProbeSession {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  timeline: TimelineMark[];
  apiCalls: ApiCall[];
  errors: ProbeError[];
  metadata: Record<string, unknown>;
}

export interface ProbeError {
  time: number;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
}

// ============================================================================
// Global Probe State
// ============================================================================

export interface GlobalProbeState {
  enabled: boolean;
  sessions: Record<string, ProbeSession>;
  activeSession: string | null;
  config: ProbeConfig;
}

export interface ProbeConfig {
  captureApiCalls: boolean;
  captureConsoleErrors: boolean;
  capturePerformance: boolean;
  maxSessions: number;
  maxTimelineMarks: number;
  maxApiCalls: number;
}

// ============================================================================
// Debug Page Types
// ============================================================================

export interface DebugTestResult {
  success: boolean;
  testName: string;
  duration: number;
  timeline: TimelineMark[];
  apiCalls: ApiCall[];
  errors: ProbeError[];
  data?: unknown;
}

export interface DebugTestConfig {
  name: string;
  description?: string;
  timeout?: number;
  retries?: number;
}

// ============================================================================
// Window Extension
// ============================================================================

declare global {
  interface Window {
    __PROBE__?: GlobalProbeState;
    __DEBUG__?: {
      probe: typeof import('./probe');
      sessions: Record<string, ProbeSession>;
    };
  }
}
