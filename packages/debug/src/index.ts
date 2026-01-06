/**
 * @o4o/debug - O4O Platform Debugging Utilities
 *
 * 플랫폼 전체에서 사용하는 디버깅 인프라
 *
 * 커뮤니티 검증 패턴 기반:
 * - Runtime observation (window.__PROBE__)
 * - Timeline marking
 * - API call tracking
 * - Performance measurement
 *
 * 사용법:
 *
 * 1. 기본 프로브 사용:
 *    import { probe } from '@o4o/debug';
 *    probe.startSession('login');
 *    probe.mark('step1');
 *    await someAsyncWork();
 *    probe.mark('step2');
 *    probe.endSession();
 *    console.log(probe.exportSession());
 *
 * 2. React 컴포넌트 사용:
 *    import { DebugPageLayout, useDebugTest } from '@o4o/debug/react';
 *
 * 3. 브라우저 콘솔에서 직접 접근:
 *    window.__PROBE__          // 전체 상태
 *    window.__DEBUG__.probe    // probe 함수들
 *    window.__DEBUG__.sessions // 모든 세션
 */

// Export types
export type {
  TimelineMark,
  ApiCall,
  ProbeSession,
  ProbeError,
  GlobalProbeState,
  ProbeConfig,
  DebugTestResult,
  DebugTestConfig,
} from './types';

// Export probe functions
export * as probe from './probe';

// Re-export commonly used functions at top level for convenience
export {
  startSession,
  endSession,
  mark,
  trackApiStart,
  trackApiEnd,
  trackError,
  setMetadata,
  getMetadata,
  exportSession,
  exportAllSessions,
  logSessionSummary,
  clearSessions,
  createTrackedFetch,
  configure,
  setEnabled,
  isEnabled,
  getActiveSession,
  getSession,
  getAllSessions,
  measureBetween,
} from './probe';
