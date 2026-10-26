import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, it, expect } from 'vitest';
import type { PeriodicDashboard } from '@/api/product-correction-periodic.api';
import ProductCorrectionWorkerStatus from './ProductCorrectionWorkerStatus';
afterEach(cleanup);
const now = Date.parse('2026-10-26T00:10:00Z');
const base = { scheduleDue: 0 } as PeriodicDashboard;
describe('worker observations without claiming Scheduler activation', () => {
  it.each([undefined, 'not-a-date', '2026-10-27T00:00:00Z'])('reports missing/unusable evidence: %s', stamp => {
    render(<ProductCorrectionWorkerStatus dashboard={{ ...base, worker: { lastSucceededAt: stamp } }} now={now} />);
    expect(screen.getByText(/최근 성공 기록 없음/)).toBeTruthy();
  });
  it('marks old success and due schedules separately', () => {
    render(<ProductCorrectionWorkerStatus dashboard={{ ...base, scheduleDue: 2, worker: { lastSucceededAt: '2026-10-26T00:04:59Z' } }} now={now} />);
    expect(screen.getByText(/5분 이상 오래/)).toBeTruthy();
    expect(screen.getByText(/지난 예약 2건/)).toBeTruthy();
  });
  it('does not promote a recent job heartbeat into enabled scheduling', () => {
    render(<ProductCorrectionWorkerStatus dashboard={{ ...base, worker: { source: 'job', lastSucceededAt: '2026-10-26T00:09:00Z' } }} now={now} />);
    expect(screen.getByText(/5분 안에 성공/)).toBeTruthy();
    expect(screen.getByText(/활성화·서버 휴면 중 실행을 보장하지 않습니다/)).toBeTruthy();
  });
  it('prioritizes the latest error even when a prior success is recent', () => {
    render(<ProductCorrectionWorkerStatus dashboard={{ ...base, worker: { lastSucceededAt: '2026-10-26T00:09:00Z', lastErrorCode: 'WORKER_TICK_FAILED' } }} now={now} />);
    expect(screen.getByText(/최근 실행 실패/)).toBeTruthy();
    expect(screen.queryByText(/5분 안에 성공/)).toBeNull();
  });
});
