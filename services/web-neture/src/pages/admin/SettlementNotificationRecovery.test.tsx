import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Recovery, {
  SettlementNotificationStatus,
} from "./SettlementNotificationRecovery";
const api = vi.hoisted(() => ({ get: vi.fn(), list: vi.fn(), retry: vi.fn() }));
vi.mock("../../lib/api/settlement-notification", () => ({
  settlementNotificationApi: api,
}));
const base = {
  settlementId: "a",
  state: "failed",
  attempts: 1,
  deliveredCount: 0,
  lastErrorCode: "NOTIFICATION_STORAGE_FAILED",
  deliveredAt: null,
  updatedAt: null,
};
beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockResolvedValue(base);
  api.list.mockResolvedValue({
    items: [
      {
        ...base,
        supplierName: "검증 공급자",
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
      },
    ],
    page: 1,
    limit: 10,
    total: 1,
  });
});
afterEach(cleanup);
describe("settlement notification recovery", () => {
  it("shows a list read failure instead of pretending there are no failed notifications", async () => {
    api.list
      .mockRejectedValueOnce(Error("fixture read"))
      .mockResolvedValueOnce({ items: [], page: 1, limit: 10, total: 0 });
    render(<Recovery />);
    await screen.findByText(
      "알림 처리 목록을 확인하지 못했습니다. 다시 조회해 주세요.",
    );
    expect(screen.queryByText(/선택한 상태의 추적 대상이 없습니다/)).toBeNull();
    fireEvent.click(screen.getByText("목록 다시 조회"));
    await screen.findByText(/선택한 상태의 추적 대상이 없습니다/);
  });
  it("retries only notifications, shows committed storage and blocks duplicate clicks", async () => {
    let finish!: (v: any) => void;
    api.retry.mockReturnValue(
      new Promise((r) => {
        finish = r;
      }),
    );
    render(<SettlementNotificationStatus settlementId="a" />);
    await screen.findByText("알림함 저장 실패");
    const retry = screen.getByText("알림 저장 재처리");
    fireEvent.click(retry);
    fireEvent.click(retry);
    expect(api.retry).toHaveBeenCalledTimes(1);
    await act(async () =>
      finish({
        ...base,
        state: "delivered",
        attempts: 2,
        deliveredCount: 2,
        lastErrorCode: null,
      }),
    );
    await screen.findByText("알림함 저장 완료");
    expect(screen.queryByText("알림 저장 재처리")).toBeNull();
    expect(api.retry).toHaveBeenCalledWith("a");
  });
  it("an uncertain response requires status read, and a delivered read never offers a replay", async () => {
    api.retry.mockRejectedValue(Error("fixture response lost"));
    api.get
      .mockResolvedValueOnce(base)
      .mockResolvedValueOnce({
        ...base,
        state: "delivered",
        deliveredCount: 2,
      });
    render(<SettlementNotificationStatus settlementId="a" />);
    await screen.findByText("알림함 저장 실패");
    fireEvent.click(screen.getByText("알림 저장 재처리"));
    await screen.findByText(/재지급하지 말고/);
    fireEvent.click(screen.getByText("알림 상태 다시 조회"));
    await screen.findByText("알림함 저장 완료");
    expect(api.retry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("알림 저장 재처리")).toBeNull();
  });
  it.each(["legacy_unknown", "not_applicable", "delivered"])(
    "never offers retry for %s",
    async (state) => {
      api.get.mockResolvedValue({ ...base, state, lastErrorCode: null });
      render(<SettlementNotificationStatus settlementId="a" />);
      await waitFor(() => expect(api.get).toHaveBeenCalledWith("a"));
      await waitFor(() => expect(screen.queryByText("확인 중…")).toBeNull());
      expect(screen.queryByText("알림 저장 재처리")).toBeNull();
    },
  );
  it("discards an old settlement response after target replacement", async () => {
    let finish!: (v: any) => void;
    api.get
      .mockReturnValueOnce(
        new Promise((r) => {
          finish = r;
        }),
      )
      .mockResolvedValueOnce({
        ...base,
        settlementId: "b",
        state: "delivered",
      });
    const view = render(
      <SettlementNotificationStatus key="a" settlementId="a" />,
    );
    view.rerender(<SettlementNotificationStatus key="b" settlementId="b" />);
    await screen.findByText("알림함 저장 완료");
    await act(async () => finish(base));
    expect(screen.queryByText("알림함 저장 실패")).toBeNull();
  });
  it("refreshes status after a successful parent payment without triggering retry or payment", async () => {
    api.get
      .mockResolvedValueOnce({ ...base, state: "not_applicable" })
      .mockResolvedValueOnce(base);
    const view = render(
      <SettlementNotificationStatus settlementId="a" refreshKey={0} />,
    );
    await screen.findByText("지급 완료 전 · 대상 아님");
    view.rerender(
      <SettlementNotificationStatus settlementId="a" refreshKey={1} />,
    );
    await screen.findByText("알림함 저장 실패");
    expect(api.retry).not.toHaveBeenCalled();
  });
  it("shows owner absence as a failure and preserves the pending filter on an explicit refresh", async () => {
    api.get.mockResolvedValue({ ...base, lastErrorCode: "NO_CURRENT_OWNER" });
    render(<Recovery />);
    await screen.findByText(/현재 공급자 수신자가 없습니다/);
    fireEvent.change(screen.getByLabelText("처리 상태"), {
      target: { value: "pending" },
    });
    await waitFor(() =>
      expect(api.list).toHaveBeenLastCalledWith("pending", 1),
    );
  });
});
