import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { StaffDemandSummary } from "./StaffDemandSummary";
const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("./api", () => ({ getPharmacyManagementClient: () => api }));
afterEach(cleanup);
it("shows only requested monthly anonymous counts and distinguishes lookup failure", async () => {
  api.get
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({
      data: {
        success: true,
        data: [{ id: "store", name: "합성 약국", counts: { "not-found": 3 } }],
      },
    });
  render(<StaffDemandSummary />);
  fireEvent.click(screen.getByRole("button", { name: "집계 조회" }));
  await screen.findByText("집계를 불러오지 못했습니다. 다시 시도해 주세요.");
  fireEvent.click(screen.getByRole("button", { name: "집계 조회" }));
  await screen.findByText("합성 약국");
  await waitFor(() => expect(screen.getByText(/위치 못 찾음 3/)).toBeTruthy());
  fireEvent.change(screen.getByLabelText("현장 요구 조회 월"), {
    target: { value: "2030-01" },
  });
  expect(screen.queryByText("합성 약국")).toBeNull();
});
