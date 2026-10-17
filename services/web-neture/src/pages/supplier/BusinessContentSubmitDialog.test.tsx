import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BusinessContentSubmitDialog } from "./BusinessContentSubmitDialog";
const api = vi.hoisted(() => ({
  listSemiFranchises: vi.fn(),
  submitContent: vi.fn(),
}));
vi.mock("../../lib/api/neturePharmacy", () => ({
  neturePharmacySupplierApi: api,
}));
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  api.listSemiFranchises.mockResolvedValue([
    { key: "a", name: "Business A" },
    { key: "b", name: "Business B" },
  ]);
});
const show = (onSuccess = vi.fn()) => {
  render(
    <BusinessContentSubmitDialog
      item={{ id: "item-a", title: "Synthetic material" }}
      onClose={vi.fn()}
      onSuccess={onSuccess}
    />,
  );
  return onSuccess;
};
it("selects an explicit business and submits the existing source library ID without making it public", async () => {
  api.submitContent.mockResolvedValue({ reused: false });
  const success = show();
  await screen.findByRole("option", { name: "Business B" });
  fireEvent.change(screen.getByLabelText("제공할 약국 협력사업"), {
    target: { value: "b" },
  });
  fireEvent.click(screen.getByRole("button", { name: "검토 요청" }));
  await waitFor(() => expect(success).toHaveBeenCalled());
  expect(api.submitContent).toHaveBeenCalledWith("item-a", "b");
});
it("does not turn a failed target lookup into a successful empty result; retries lookup", async () => {
  api.listSemiFranchises
    .mockRejectedValueOnce(new Error("Lookup failed"))
    .mockResolvedValueOnce([]);
  show();
  await screen.findByRole("alert");
  expect(
    (screen.getByRole("button", { name: "검토 요청" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "대상 다시 조회" }));
  await screen.findByRole("option", { name: "제공 가능한 협업체가 없습니다" });
  expect(api.submitContent).not.toHaveBeenCalled();
});
it("keeps failed submissions open with the same selected business and serializes retries", async () => {
  api.submitContent
    .mockRejectedValueOnce(new Error("Write failed"))
    .mockResolvedValueOnce({ reused: true });
  const success = show();
  await screen.findByRole("option", { name: "Business A" });
  fireEvent.click(screen.getByRole("button", { name: "검토 요청" }));
  await screen.findByRole("alert");
  expect(success).not.toHaveBeenCalled();
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: "검토 요청" }));
    fireEvent.click(screen.getByRole("button", { name: "검토 요청" }));
  });
  await waitFor(() =>
    expect(success).toHaveBeenCalledWith(
      expect.stringContaining("중복 제출하지 않았습니다"),
    ),
  );
  expect(api.submitContent).toHaveBeenCalledTimes(2);
});
