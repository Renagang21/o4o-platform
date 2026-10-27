import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Panel from "./FundingOfflineHistory";
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../../lib/apiClient", () => ({ api: { get } }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("loads old history without replacing the editable snapshot, retaining rows on failure", async () => {
  const initial = [
    {
      id: "new",
      actorId: null,
      at: "2026-10-20",
      action: "refund",
      reason: "현재 기록",
      participantId: null,
      after: { refundAmount: 20 },
    },
  ];
  get
    .mockRejectedValueOnce(new Error("unavailable"))
    .mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          history: [{ ...initial[0], id: "old", reason: "이전 기록" }],
          historyPage: 2,
          historyHasMore: false,
        },
      },
    });
  render(
    <Panel id="trial" initial={initial} hasMore={true} participantPage={3} />,
  );
  fireEvent.click(screen.getByRole("button"));
  await screen.findByRole("alert");
  expect(screen.getByText(/현재 기록/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button"));
  await screen.findByText(/이전 기록/);
  expect(get).toHaveBeenCalledTimes(2);
  expect(get).toHaveBeenLastCalledWith(expect.any(String), {
    params: { page: 3, historyPage: 2 },
  });
  expect(screen.queryByRole("button")).toBeNull();
});
