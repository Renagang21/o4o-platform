import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { AiOverviewPanel, type AiOverviewData } from '@o4o/ai-components';

afterEach(cleanup);
const data: AiOverviewData = { summary: '합성 현황 설명', recommendedActions: ['자료 확인'], evidence: {
  collectedAt: '2026-10-24T00:00:00Z', metrics: { zero: { label: '상품', value: 0 }, unknown: { label: '요청', value: null } },
} };
it('renders without a paid request and shows confirmed zero separately from unknown', async () => {
  const load = vi.fn().mockResolvedValue(data);
  render(<AiOverviewPanel scopeKey="actor:store-a" load={load} />);
  expect(load).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'AI로 현재 현황 설명' }));
  await screen.findByText('합성 현황 설명');
  expect(screen.getByText('0건')).toBeTruthy();
  expect(screen.getByText('확인하지 못함')).toBeTruthy();
  expect(load).toHaveBeenCalledTimes(1);
});
it('locks a pending request and discards its result after an account/workspace change', async () => {
  let finish!: (value: AiOverviewData) => void;
  const load = vi.fn(() => new Promise<AiOverviewData>(resolve => { finish = resolve; }));
  const view = render(<AiOverviewPanel scopeKey="actor:store-a" load={load} />);
  const button = screen.getByRole('button'); fireEvent.click(button); fireEvent.click(button);
  expect(load).toHaveBeenCalledTimes(1);
  view.rerender(<AiOverviewPanel scopeKey="actor:store-b" load={load} />);
  await act(async () => { finish(data); });
  expect(screen.queryByText('합성 현황 설명')).toBeNull();
  expect(load).toHaveBeenCalledTimes(1);
});
it('keeps manual work available and never retries a failed request automatically', async () => {
  const load = vi.fn().mockRejectedValue(new Error('quota fixture'));
  render(<AiOverviewPanel scopeKey="actor:store-a" load={load} />);
  fireEvent.click(screen.getByRole('button'));
  expect((await screen.findByRole('alert')).textContent).toContain('기존 화면에서 업무를 계속');
  expect(load).toHaveBeenCalledTimes(1);
  expect(screen.getByRole<HTMLButtonElement>('button').disabled).toBe(false);
});
it('does not make a call while the host disables the scope', () => {
  const load = vi.fn();
  render(<AiOverviewPanel scopeKey="missing" load={load} disabled />);
  fireEvent.click(screen.getByRole('button'));
  expect(load).not.toHaveBeenCalled();
});
