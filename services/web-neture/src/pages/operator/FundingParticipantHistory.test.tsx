import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import Panel from "./FundingParticipantHistory";
const api = vi.hoisted(() => ({ history: vi.fn() }));
vi.mock("../../api/fundingExceptions", () => ({ fundingExceptionsApi: api }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("refreshes after record changes and labels fulfillment separately from payments", async () => {
  api.history.mockResolvedValue({ items: [
    {
      id: "h",
      action: "neture.operator.market_trial_reward_change",
      beforeStatus: "pending",
      afterStatus: "fulfilled",
      at: "2026-10-16",
      actorId: "fixture-operator",
    },
  ], page: 1, hasMore: false });
  const view = render(
    <Panel trialId="trial" participantId="a" refreshKey="1" />,
  );
  await screen.findByText("이행 대기 → 이행 완료");
  view.rerender(<Panel trialId="trial" participantId="a" refreshKey="2" />);
  await screen.findByText("이행 대기 → 이행 완료");
  expect(api.history).toHaveBeenCalledTimes(2);
});
it("ignores history for the previous participant", async () => {
  let release!: (v: unknown) => void;
  api.history
    .mockReturnValueOnce(
      new Promise((r) => {
        release = r;
      }),
    )
    .mockResolvedValueOnce({ items: [], page: 1, hasMore: false });
  const view = render(<Panel trialId="trial" participantId="a" />);
  view.rerender(<Panel trialId="trial" participantId="b" />);
  await screen.findByText("조회 가능한 처리 이력이 없습니다.");
  await act(async () =>
    release({ items: [{ id: "old", action: "old", at: "2026-10-16" }], page: 1, hasMore: false }),
  );
  expect(screen.queryByText(/Invalid Date/)).toBeNull();
  expect(screen.getByText("조회 가능한 처리 이력이 없습니다.")).toBeTruthy();
});

it('retains prior rows across failed page reads and retries the same page with offline actions', async () => {
  api.history.mockResolvedValueOnce({ items: [{ id: 'new', action: 'funding.offline_operation', offlineAction: 'refund', reason: '환급 확인', beforeRefundAmount: '0', afterRefundAmount: '10', at: '2026-10-20' }], page: 1, hasMore: true })
    .mockRejectedValueOnce(new Error('unavailable'))
    .mockResolvedValueOnce({ items: [{ id: 'old', action: 'funding.offline_operation', offlineAction: 'withdraw', reason: '철회 확인', at: '2026-10-19' }], page: 2, hasMore: false });
  render(<Panel trialId="trial" participantId="a" />);
  await screen.findByText(/누적 환급 0 → 10원/);
  const { fireEvent } = await import('@testing-library/react');
  fireEvent.click(screen.getByRole('button', { name: '이전 이력 더 보기' }));
  await screen.findByRole('alert'); expect(screen.getByText(/누적 환급 0 → 10원/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '이전 이력 더 보기' }));
  await screen.findByText('철회 확인');
  expect(api.history.mock.calls.map(call => call[2])).toEqual([1, 2, 2]);
  expect(screen.queryByRole('button', { name: '이전 이력 더 보기' })).toBeNull();
});
