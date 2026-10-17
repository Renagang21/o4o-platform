import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import Panel from "../SupplierReviewRequestsPanel";
const api = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  submit: vi.fn(),
  resolve: vi.fn(),
}));
vi.mock("../../../lib/api/supplierReview", () => ({
  supplierReviewApi: api,
  SUPPLIER_REVIEW_LABELS: {
    business_registration: "사업자등록증",
    contact: "담당자·연락처",
  },
}));
const request = {
  id: "request-a",
  supplier_id: "supplier-a",
  state: "requested",
  version: 1,
  items: ["business_registration"],
  request_note: "서류 보완 요청",
  response_note: null,
  resolution_note: null,
  created_at: "2026-10-16",
  submitted_at: null,
  resolved_at: null,
};
const submitted = {
  ...request,
  state: "submitted",
  version: 2,
  response_note: "서류 수정 완료",
  submitted_at: "2026-10-16",
};
const data =(current: unknown = null, supplierId = "supplier-a") => ({
  supplierId,
  current,
  requests: current ? [current] : [],
  actions: [],
  hasMore: false,
  page: 1,
});
beforeEach(() => {
  vi.resetAllMocks();
  api.list.mockResolvedValue(data());
  api.create.mockResolvedValue({ notificationCreated: true });
  api.submit.mockResolvedValue({});
  api.resolve.mockResolvedValue({});
});
afterEach(cleanup);
it("preserves failed request inputs and retries without changing supplier approval", async () => {
  api.create.mockRejectedValueOnce(new Error("fixture"));
  render(<Panel supplierId="supplier-a" operator />);
  await screen.findByText("진행 중인 보완 요청이 없습니다.");
  fireEvent.click(screen.getByRole("checkbox", { name: "사업자등록증" }));
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "서류를 보완해 주세요." },
  });
  fireEvent.click(screen.getByRole("button", { name: "보완 요청 저장" }));
  await screen.findByRole("alert");
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(
    "서류를 보완해 주세요.",
  );
  fireEvent.click(screen.getByRole("button", { name: "보완 요청 저장" }));
  await waitFor(() => expect(api.create).toHaveBeenCalledTimes(2));
  expect(api.create.mock.calls[1]).toEqual([
    "supplier-a",
    ["business_registration"],
    "서류를 보완해 주세요.",
  ]);
});
it("retries only reads after a committed request and failed refresh", async () => {
  render(<Panel supplierId="supplier-a" operator />);
  await screen.findByText("진행 중인 보완 요청이 없습니다.");
  fireEvent.click(screen.getByRole("checkbox", { name: "사업자등록증" }));
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "보완 요청" },
  });
  api.list.mockRejectedValueOnce(new Error("read"));
  fireEvent.click(screen.getByRole("button", { name: "보완 요청 저장" }));
  await screen.findByText(/목록 갱신에 실패/);
  fireEvent.click(screen.getByRole("button", { name: "보완 요청 다시 조회" }));
  await waitFor(() => expect(api.list).toHaveBeenCalledTimes(3));
  expect(api.create).toHaveBeenCalledTimes(1);
});
it("allows the supplier to submit only its own current request version", async () => {
  api.list.mockResolvedValue(data(request));
  render(<Panel supplierId="supplier-a" />);
  const input = await screen.findByRole("textbox", { name: "보완 제출 내용" });
  fireEvent.change(input, { target: { value: "서류 수정 완료" } });
  fireEvent.click(screen.getByRole("button", { name: "보완 제출" }));
  await waitFor(() =>
    expect(api.submit).toHaveBeenCalledWith("request-a", "서류 수정 완료", 1),
  );
  expect(api.create).not.toHaveBeenCalled();
  expect(api.resolve).not.toHaveBeenCalled();
});
it("does not let the operator resolve a request before the supplier submits", async () => {
  api.list.mockResolvedValue(data(request));
  render(<Panel supplierId="supplier-a" operator />);
  await screen.findByText(/보완 제출을 기다리고 있습니다/);
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(screen.queryByRole("button", { name: "검토 완료 저장" })).toBeNull();
  expect(api.resolve).not.toHaveBeenCalled();
});
it("resolves a submitted request with its current version", async () => {
  api.list.mockResolvedValue(data(submitted));
  render(<Panel supplierId="supplier-a" operator />);
  fireEvent.change(
    await screen.findByRole("textbox", { name: "검토 완료 사유" }),
    { target: { value: "확인 완료" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "검토 완료 저장" }));
  await waitFor(() =>
    expect(api.resolve).toHaveBeenCalledWith(
      "supplier-a",
      "request-a",
      "확인 완료",
      2,
    ),
  );
});
it("locks duplicate submissions and ignores completion after switching suppliers", async () => {
  let release!: (v: unknown) => void;
  api.list.mockResolvedValue(data(submitted));
  api.resolve.mockReturnValueOnce(
    new Promise((r) => {
      release = r;
    }),
  );
  const view = render(<Panel supplierId="supplier-a" operator />);
  await screen.findByRole("textbox");
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "검토 완료" },
  });
  const submit = screen.getByRole("button", { name: "검토 완료 저장" });
  fireEvent.click(submit);
  fireEvent.click(submit);
  expect(api.resolve).toHaveBeenCalledTimes(1);
  api.list.mockResolvedValue(data(null, "supplier-b"));
  view.rerender(<Panel supplierId="supplier-b" operator />);
  await screen.findByText("진행 중인 보완 요청이 없습니다.");
  await act(async () => release({}));
  expect(screen.queryByText(/검토 완료를 저장했습니다/)).toBeNull();
  expect(api.list).toHaveBeenCalledTimes(2);
});
it("discards the previous target draft when a refreshed request changed", async () => {
  api.list
    .mockResolvedValueOnce(data(submitted))
    .mockResolvedValueOnce(data({ ...submitted, id: "request-b", version: 3 }));
  render(<Panel supplierId="supplier-a" operator />);
  await screen.findByRole("textbox");
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "이전 대상 메모" },
  });
  fireEvent.click(screen.getByRole("button", { name: "보완 요청 다시 조회" }));
  await waitFor(() =>
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(""),
  );
});
it("rejects a response from another supplier rather than showing its requests", async () => {
  api.list.mockResolvedValue(data(request, "supplier-other"));
  render(<Panel supplierId="supplier-a" />);
  await screen.findByRole("alert");
  expect(screen.queryByText("서류 보완 요청")).toBeNull();
  expect(api.submit).not.toHaveBeenCalled();
});
