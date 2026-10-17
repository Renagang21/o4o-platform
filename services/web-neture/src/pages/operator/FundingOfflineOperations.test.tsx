import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import FundingOfflineOperations from "./FundingOfflineOperations";
const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("../../lib/apiClient", () => ({ api: { get, post } }));
const snapshot = () => ({
  data: {
    success: true,
    data: {
      trial: {
        status: "recruiting",
        offlineState: { version: 0, decision: "pending" },
      },
      totals: { netAmount: "100", refundedAmount: "0", withdrawnCount: 0 },
      participants: [
        {
          id: "participant",
          name: "격리 참여자",
          paidAmount: "100",
          contributionAmount: "100",
          paymentStatus: "paid",
          offlineState: { version: 0, refundAmount: 0 },
          refundPending: "0",
        },
      ],
      page: 1,
      hasMore: false,
      history: [],
    },
  },
});
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  get.mockResolvedValue(snapshot());
  post.mockResolvedValue({ data: { success: true } });
});
const ready = async () => {
  render(<FundingOfflineOperations id="trial" />);
  await screen.findByText(/순모금/);
};
const fill = () =>
  fireEvent.change(screen.getByLabelText("오프라인 처리 사유"), {
    target: { value: "오프라인 확인 사유" },
  });
it("preserves the reason and target when saving fails", async () => {
  post.mockRejectedValue({ response: { data: { message: "기록 실패" } } });
  await ready();
  fireEvent.change(screen.getByLabelText("오프라인 처리 종류"), {
    target: { value: "withdraw" },
  });
  fireEvent.change(screen.getByLabelText("사후 처리 참여자"), {
    target: { value: "participant" },
  });
  fill();
  fireEvent.click(
    screen.getByRole("button", { name: "오프라인 처리 기록 저장" }),
  );
  await screen.findByText("기록 실패");
  expect(
    (screen.getByLabelText("오프라인 처리 사유") as HTMLTextAreaElement).value,
  ).toBe("오프라인 확인 사유");
  expect(
    (screen.getByLabelText("사후 처리 참여자") as HTMLSelectElement).value,
  ).toBe("participant");
  expect(post).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      participantId: "participant",
      version: 0,
      action: "withdraw",
    }),
  );
});
it("blocks duplicate saves and retries only reads after a committed save and failed reload", async () => {
  let finish!: (v: unknown) => void;
  post.mockReturnValue(
    new Promise((r) => {
      finish = r;
    }),
  );
  get
    .mockResolvedValueOnce(snapshot())
    .mockRejectedValueOnce(Error("read unavailable"))
    .mockResolvedValue(snapshot());
  await ready();
  fill();
  const button = screen.getByRole("button", {
    name: "오프라인 처리 기록 저장",
  });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(post).toHaveBeenCalledTimes(1);
  await act(async () => finish({ data: { success: true } }));
  await screen.findByText(/저장은 완료됐으니 조회만/);
  fireEvent.click(screen.getByRole("button", { name: "운영 기록 다시 조회" }));
  await screen.findByText(/순모금/);
  expect(post).toHaveBeenCalledTimes(1);
  expect(get).toHaveBeenCalledTimes(3);
});
it("ignores a late read from another funding", async () => {
  let finish!: (v: unknown) => void;
  get.mockReturnValueOnce(
    new Promise((r) => {
      finish = r;
    }),
  );
  const view = render(<FundingOfflineOperations id="old" />);
  view.rerender(<FundingOfflineOperations id="new" />);
  await screen.findByText(/순모금/);
  const old = snapshot();
  old.data.data.totals.netAmount = "999";
  await act(async () => finish(old));
  expect(screen.queryByText(/순모금 999원/)).toBeNull();
});
it("coordinates parent busy state and preserves input on a rejected success envelope", async () => {
  post.mockResolvedValue({ data: { success: false } });
  const busy = vi.fn();
  render(<FundingOfflineOperations id="trial" onBusyChange={busy} />);
  await screen.findByText(/순모금/);
  fill();
  fireEvent.click(
    screen.getByRole("button", { name: "오프라인 처리 기록 저장" }),
  );
  await screen.findByRole("alert");
  await waitFor(() => expect(busy).toHaveBeenLastCalledWith(false));
  expect(busy).toHaveBeenCalledWith(true);
  expect(
    (screen.getByLabelText("오프라인 처리 사유") as HTMLTextAreaElement).value,
  ).toBe("오프라인 확인 사유");
});
