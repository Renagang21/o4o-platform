import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
const mock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("../../lib/apiClient", () => ({ api: mock }));
import PharmacistQualificationCard from "./PharmacistQualificationCard";
beforeEach(() => {
  mock.get.mockReset().mockResolvedValue({
    data: {
      data: { status: "unrequested", licenseNumber: null, reason: null },
    },
  });
  mock.post.mockReset().mockResolvedValue({
    data: {
      data: { status: "pending", licenseNumber: "synthetic", reason: null },
    },
  });
});
afterEach(cleanup);
it("requires explicit own licence confirmation and shows pending without changing common membership", async () => {
  render(<PharmacistQualificationCard />);
  await screen.findByRole("status");
  fireEvent.change(screen.getByLabelText("약사 면허번호"), {
    target: { value: "synthetic" },
  });
  expect(screen.getByRole("button", { name: "자격 검토 신청" })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "자격 검토 신청" }));
  await waitFor(() =>
    expect(mock.post).toHaveBeenCalledWith("/qualifications/pharmacist/me", {
      licenseNumber: "synthetic",
      ownLicenseConfirmed: true,
    }),
  );
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("검토 대기"),
  );
  expect(screen.getByText(/공통 계정을 삭제하거나/)).toBeTruthy();
});
it("a rejected qualification remains visible with the reviewer reason and can be resubmitted", async () => {
  mock.get.mockResolvedValueOnce({
    data: {
      data: {
        status: "rejected",
        licenseNumber: "synthetic",
        reason: "근거 보완 필요",
      },
    },
  });
  render(<PharmacistQualificationCard />);
  expect(await screen.findByRole("status")).toHaveTextContent("반려");
  expect(screen.getByText("확인·반려 사유: 근거 보완 필요")).toBeTruthy();
  expect(screen.getByRole("button", { name: "자격 검토 신청" })).toBeDisabled();
  expect(screen.getByRole("checkbox")).not.toBeDisabled();
});
it("fails closed when own qualification cannot be loaded", async () => {
  mock.get.mockRejectedValueOnce(new Error("offline"));
  render(<PharmacistQualificationCard />);
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByRole("button", { name: "자격 검토 신청" })).toBeDisabled();
  expect(mock.post).not.toHaveBeenCalled();
});
