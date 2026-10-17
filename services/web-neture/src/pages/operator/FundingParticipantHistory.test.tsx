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
  api.history.mockResolvedValue([
    {
      id: "h",
      action: "neture.operator.market_trial_reward_change",
      beforeStatus: "pending",
      afterStatus: "fulfilled",
      at: "2026-10-16",
      actorId: "fixture-operator",
    },
  ]);
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
    .mockResolvedValueOnce([]);
  const view = render(<Panel trialId="trial" participantId="a" />);
  view.rerender(<Panel trialId="trial" participantId="b" />);
  await screen.findByText("조회 가능한 처리 이력이 없습니다.");
  await act(async () =>
    release([{ id: "old", action: "old", at: "2026-10-16" }]),
  );
  expect(screen.queryByText(/Invalid Date/)).toBeNull();
  expect(screen.getByText("조회 가능한 처리 이력이 없습니다.")).toBeTruthy();
});
