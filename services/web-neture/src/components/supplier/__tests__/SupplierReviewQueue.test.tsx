import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import Queue from "../SupplierReviewQueue";
const api = vi.hoisted(() => ({
  queue: vi.fn(),
  list: vi.fn(),
  resolve: vi.fn(),
}));
vi.mock("../../../lib/api/supplierReview", () => ({
  supplierReviewApi: api,
  SUPPLIER_REVIEW_LABELS: { contact: "담당자·연락처" },
}));
const item = {
  id: "r",
  supplier_id: "s",
  supplier_name: "검증 공급자",
  state: "submitted",
  items: ["contact"],
  updated_at: "2026-10-16",
};
beforeEach(() => {
  vi.resetAllMocks();
  api.queue.mockResolvedValue({ items: [item], hasMore: false });
  api.list.mockResolvedValue({
    supplierId: "s",
    current: {
      id: "r",
      state: "submitted",
      version: 2,
      items: ["contact"],
      request_note: "연락처 보완",
      response_note: "수정 완료",
    },
    requests: [],
    actions: [],
    hasMore: false,
    page: 1,
  });
  api.resolve.mockResolvedValue({});
});
afterEach(cleanup);
it("finds submitted work, opens the exact supplier and refreshes the queue after review", async () => {
  render(<Queue onBusyChange={() => {}} />);
  await screen.findByText(/검증 공급자/);
  fireEvent.click(screen.getByRole("button", { name: "요청 상세 확인" }));
  const note = await screen.findByRole("textbox", { name: "검토 완료 사유" });
  fireEvent.change(note, { target: { value: "확인 완료" } });
  fireEvent.click(screen.getByRole("button", { name: "검토 완료 저장" }));
  await waitFor(() =>
    expect(api.resolve).toHaveBeenCalledWith("s", "r", "확인 완료", 2),
  );
  await waitFor(() => expect(api.queue).toHaveBeenCalledTimes(2));
});
it("queries the chosen queue status after initial loading", async () => {
  let release!: (v: unknown) => void;
  api.queue.mockReturnValueOnce(
    new Promise((r) => {
      release = r;
    }),
  );
  render(<Queue onBusyChange={() => {}} />);
  await act(async () => release({ items: [item], hasMore: false }));
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "requested" },
  });
  await waitFor(() =>
    expect(api.queue).toHaveBeenLastCalledWith("requested", 1),
  );
});
it("does not disguise a failed queue read as no work", async () => {
  api.queue.mockRejectedValueOnce(new Error("fixture"));
  render(<Queue onBusyChange={() => {}} />);
  await screen.findByRole("alert");
  expect(screen.queryByText("해당 상태의 보완 요청이 없습니다.")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "보완 대기 목록 다시 조회" }),
  );
  await screen.findByRole("button", { name: "요청 상세 확인" });
});
