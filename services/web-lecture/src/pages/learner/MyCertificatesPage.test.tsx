import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Page from "./MyCertificatesPage";
const get = vi.hoisted(() => vi.fn());
vi.mock("../../api/lecture", () => ({
  learnerApi: { getMyCertificates: get },
  errorMessage: () => "조회 실패",
}));
vi.mock("../../lib/apiClient", () => ({ api: { get: vi.fn() } }));
vi.mock("../../components/Toast", () => ({
  useToast: () => ({ error: vi.fn() }),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("reflects server validity and expiry without showing private operator reasons", async () => {
  get.mockResolvedValue({
    data: [
      {
        id: "revoked",
        certificateNumber: "REVOKED",
        isValid: false,
        expiresAt: "2100-01-01",
        course: { title: "폐기 강의" },
      },
      {
        id: "expired",
        certificateNumber: "EXPIRED",
        isValid: true,
        expiresAt: "2000-01-01",
        course: { title: "만료 강의" },
      },
      {
        id: "valid",
        certificateNumber: "VALID",
        isValid: true,
        expiresAt: "2100-01-01",
        course: { title: "유효 강의" },
      },
    ],
  });
  render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>,
  );
  expect(await screen.findByText("폐기")).toBeTruthy();
  expect(screen.getByText("만료")).toBeTruthy();
  expect(screen.getByText("유효")).toBeTruthy();
  expect(screen.queryByText("폐기 사유")).toBeNull();
});
