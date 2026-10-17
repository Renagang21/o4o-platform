import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Panel from "./FundingExceptionsPanel";
const api = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("../../api/fundingExceptions", () => ({
  fundingExceptionsApi: api,
  FUNDING_EXCEPTION_LABELS: {
    amount_mismatch: "참여금·확인 금액 불일치",
    payment_pending: "입금 확인 대기",
  },
}));
const item = {
  participantId: "participant-a",
  trialId: "trial-a",
  trialTitle: "검증 펀딩",
  participantName: "검증 참여자",
  types: ["amount_mismatch"],
  paymentStatus: "paid",
  rewardStatus: "pending",
  contributionAmount: "100.00",
  paidAmount: "90.00",
  updatedAt: "2026-10-16",
};
beforeEach(() => {
  vi.resetAllMocks();
  api.list.mockResolvedValue({ items: [item], hasMore: false, page: 1 });
});
afterEach(cleanup);
const show = () =>
  render(
    <MemoryRouter>
      <Panel />
    </MemoryRouter>,
  );
it("links the exact participant to the existing record workflow", async () => {
  show();
  const link = await screen.findByRole("link", {
    name: "대상 참여자 기록·이력 확인",
  });
  expect(link.getAttribute("href")).toBe(
    "/operator/market-trial/trial-a?participantId=participant-a",
  );
  expect(screen.getByText("참여금 100원 · 확인 금액 90원")).toBeTruthy();
});
it("rejects late responses from a previous filter", async () => {
  let release!: (v: unknown) => void;
  api.list
    .mockReturnValueOnce(
      new Promise((r) => {
        release = r;
      }),
    )
    .mockResolvedValueOnce({ items: [], hasMore: false, page: 1 });
  show();
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "amount_mismatch" },
  });
  await screen.findByText("해당 조건의 확인 대상이 없습니다.");
  await act(async () => release({ items: [item], hasMore: false, page: 1 }));
  expect(screen.queryByText(/검증 펀딩/)).toBeNull();
});
it("shows query errors separately from an empty queue and supports read retry", async () => {
  api.list.mockRejectedValueOnce(new Error("fixture"));
  show();
  await screen.findByRole("alert");
  expect(screen.queryByText("해당 조건의 확인 대상이 없습니다.")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "확인 대상 다시 조회" }));
  await screen.findByRole("link");
  expect(api.list).toHaveBeenCalledTimes(2);
});
