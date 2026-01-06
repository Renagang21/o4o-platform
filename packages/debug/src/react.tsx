/**
 * O4O Debug React Components
 * 디버그 페이지 구축을 위한 React 컴포넌트
 */

import React, { useState, useEffect, useCallback } from 'react';
import * as probe from './probe';
import type { ProbeSession, DebugTestResult, DebugTestConfig } from './types';

// ============================================================================
// Debug Panel Component
// ============================================================================

interface DebugPanelProps {
  title?: string;
  children?: React.ReactNode;
}

/**
 * 디버그 정보를 표시하는 패널 컴포넌트
 */
export function DebugPanel({ title = 'Debug Panel', children }: DebugPanelProps) {
  return (
    <div
      style={{
        fontFamily: 'monospace',
        fontSize: '12px',
        backgroundColor: '#1a1a2e',
        color: '#eee',
        padding: '16px',
        borderRadius: '8px',
        margin: '8px 0',
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', color: '#00d9ff' }}>{title}</h3>
      {children}
    </div>
  );
}

// ============================================================================
// JSON Display Component
// ============================================================================

interface JsonDisplayProps {
  data: unknown;
  title?: string;
  maxHeight?: string;
}

/**
 * JSON 데이터를 보기 좋게 표시하는 컴포넌트
 * AI 에이전트가 분석하기 쉬운 형식으로 출력
 */
export function JsonDisplay({ data, title, maxHeight = '400px' }: JsonDisplayProps) {
  const jsonString = JSON.stringify(data, null, 2);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonString);
  };

  return (
    <div style={{ position: 'relative' }}>
      {title && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <span style={{ color: '#888' }}>{title}</span>
          <button
            onClick={copyToClipboard}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Copy JSON
          </button>
        </div>
      )}
      <pre
        style={{
          backgroundColor: '#0d0d1a',
          padding: '12px',
          borderRadius: '4px',
          overflow: 'auto',
          maxHeight,
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {jsonString}
      </pre>
    </div>
  );
}

// ============================================================================
// Timeline Display Component
// ============================================================================

interface TimelineDisplayProps {
  session: ProbeSession | null;
}

/**
 * 타임라인 마크를 시각적으로 표시하는 컴포넌트
 */
export function TimelineDisplay({ session }: TimelineDisplayProps) {
  if (!session || session.timeline.length === 0) {
    return <div style={{ color: '#888' }}>No timeline data</div>;
  }

  const totalDuration = session.endTime
    ? session.endTime - session.startTime
    : performance.now() - session.startTime;

  return (
    <div>
      <div style={{ marginBottom: '8px', color: '#888' }}>
        Total Duration: <span style={{ color: '#00ff88' }}>{totalDuration.toFixed(2)}ms</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {session.timeline.map((mark, index) => {
          const widthPercent = Math.min(100, (mark.time / totalDuration) * 100);
          const deltaColor = mark.delta && mark.delta > 100 ? '#ff6b6b' : '#888';

          return (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '200px',
                  height: '20px',
                  backgroundColor: '#333',
                  borderRadius: '2px',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${widthPercent}%`,
                    height: '100%',
                    backgroundColor: '#00d9ff',
                    borderRadius: '2px',
                  }}
                />
              </div>
              <span style={{ minWidth: '150px', color: '#eee' }}>{mark.label}</span>
              <span style={{ color: '#888', fontSize: '11px' }}>
                {mark.time.toFixed(2)}ms
              </span>
              {mark.delta !== undefined && mark.delta > 0 && (
                <span style={{ color: deltaColor, fontSize: '11px' }}>
                  (+{mark.delta.toFixed(2)}ms)
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// API Calls Display Component
// ============================================================================

interface ApiCallsDisplayProps {
  session: ProbeSession | null;
}

/**
 * API 호출 목록을 표시하는 컴포넌트
 */
export function ApiCallsDisplay({ session }: ApiCallsDisplayProps) {
  if (!session || session.apiCalls.length === 0) {
    return <div style={{ color: '#888' }}>No API calls recorded</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {session.apiCalls.map((call, index) => {
        const statusColor =
          call.status && call.status >= 200 && call.status < 300
            ? '#00ff88'
            : call.status && call.status >= 400
              ? '#ff6b6b'
              : '#ffcc00';

        const durationColor =
          call.duration && call.duration > 1000
            ? '#ff6b6b'
            : call.duration && call.duration > 500
              ? '#ffcc00'
              : '#00ff88';

        return (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px',
              backgroundColor: '#0d0d1a',
              borderRadius: '4px',
            }}
          >
            <span
              style={{
                padding: '2px 6px',
                backgroundColor: '#333',
                borderRadius: '2px',
                fontSize: '11px',
                fontWeight: 'bold',
              }}
            >
              {call.method}
            </span>
            <span style={{ flex: 1, color: '#eee', fontSize: '11px' }}>{call.url}</span>
            <span style={{ color: statusColor, fontWeight: 'bold' }}>
              {call.status || 'pending'}
            </span>
            <span style={{ color: durationColor, minWidth: '80px', textAlign: 'right' }}>
              {call.duration ? `${call.duration.toFixed(2)}ms` : '...'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Debug Test Runner Hook
// ============================================================================

interface UseDebugTestOptions {
  config?: DebugTestConfig;
  autoRun?: boolean;
}

/**
 * 디버그 테스트를 실행하고 결과를 관리하는 훅
 */
export function useDebugTest<T>(
  testFn: () => Promise<T>,
  options: UseDebugTestOptions = {}
) {
  const { config = { name: 'test' }, autoRun = false } = options;

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DebugTestResult | null>(null);
  const [session, setSession] = useState<ProbeSession | null>(null);

  const runTest = useCallback(async () => {
    setIsRunning(true);
    setResult(null);

    const probeSession = probe.startSession(config.name);
    setSession(probeSession);

    const startTime = performance.now();
    let testData: T | undefined;
    let success = true;

    try {
      probe.mark('test:start');
      testData = await testFn();
      probe.mark('test:success');
    } catch (error) {
      success = false;
      probe.trackError(error instanceof Error ? error : new Error(String(error)));
      probe.mark('test:error');
    }

    const finalSession = probe.endSession();
    const duration = performance.now() - startTime;

    const testResult: DebugTestResult = {
      success,
      testName: config.name,
      duration,
      timeline: finalSession?.timeline || [],
      apiCalls: finalSession?.apiCalls || [],
      errors: finalSession?.errors || [],
      data: testData,
    };

    setResult(testResult);
    setSession(finalSession);
    setIsRunning(false);

    return testResult;
  }, [testFn, config.name]);

  useEffect(() => {
    if (autoRun) {
      runTest();
    }
  }, [autoRun, runTest]);

  return {
    runTest,
    isRunning,
    result,
    session,
    exportJson: () => probe.exportSession(session?.id),
  };
}

// ============================================================================
// Debug Page Layout Component
// ============================================================================

interface DebugPageLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * 디버그 페이지 레이아웃 컴포넌트
 */
export function DebugPageLayout({ title, description, children }: DebugPageLayoutProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a14',
        color: '#eee',
        padding: '24px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 8px',
              backgroundColor: '#ff6b6b',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 'bold',
              borderRadius: '4px',
              marginBottom: '8px',
            }}
          >
            DEBUG MODE
          </div>
          <h1 style={{ margin: '8px 0', fontSize: '24px' }}>{title}</h1>
          {description && <p style={{ color: '#888', margin: 0 }}>{description}</p>}
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

// ============================================================================
// Test Button Component
// ============================================================================

interface TestButtonProps {
  onClick: () => void;
  isRunning?: boolean;
  children: React.ReactNode;
}

/**
 * 테스트 실행 버튼 컴포넌트
 */
export function TestButton({ onClick, isRunning = false, children }: TestButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isRunning}
      style={{
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: 'bold',
        backgroundColor: isRunning ? '#333' : '#00d9ff',
        color: isRunning ? '#888' : '#000',
        border: 'none',
        borderRadius: '8px',
        cursor: isRunning ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {isRunning ? 'Running...' : children}
    </button>
  );
}

// ============================================================================
// Session Monitor Component (Real-time)
// ============================================================================

interface SessionMonitorProps {
  refreshInterval?: number;
}

/**
 * 실시간 세션 모니터링 컴포넌트
 */
export function SessionMonitor({ refreshInterval = 500 }: SessionMonitorProps) {
  const [sessions, setSessions] = useState<Record<string, ProbeSession>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setSessions({ ...probe.getAllSessions() });
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const sessionList = Object.values(sessions);

  if (sessionList.length === 0) {
    return (
      <DebugPanel title="Session Monitor">
        <div style={{ color: '#888' }}>No active sessions</div>
      </DebugPanel>
    );
  }

  return (
    <DebugPanel title="Session Monitor">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sessionList.map((session) => (
          <div
            key={session.id}
            style={{
              padding: '12px',
              backgroundColor: '#0d0d1a',
              borderRadius: '4px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span style={{ fontWeight: 'bold' }}>{session.name}</span>
              <span style={{ color: session.endTime ? '#00ff88' : '#ffcc00' }}>
                {session.endTime ? 'Completed' : 'Running'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#888' }}>
              <span>Marks: {session.timeline.length}</span>
              <span>APIs: {session.apiCalls.length}</span>
              <span>Errors: {session.errors.length}</span>
            </div>
          </div>
        ))}
      </div>
    </DebugPanel>
  );
}
