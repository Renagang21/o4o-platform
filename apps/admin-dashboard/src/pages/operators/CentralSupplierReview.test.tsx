import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
const mock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@o4o/auth-client", () => ({ authClient: { api: mock } }));
vi.mock("@o4o/operator-ux-core", () => ({
  DataTable: ({ data, columns }: any) => (
    <div>
      {data.map((row: any) => (
        <div key={row.id}>
          {columns.map((col: any) => (
            <span key={col.key}>{col.render?.(undefined, row)}</span>
          ))}
        </div>
      ))}
    </div>
  ),
}));
import CentralSupplierReview from "./CentralSupplierReview";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("does not turn incomplete contact profile metadata into a new approval requirement", async () => {
  mock.get.mockResolvedValue({
    data: {
      data: {
        items: [
          {
            id: "synthetic",
            name: "합성 공급자",
            status: "PENDING",
            activationReady: false,
            missingActivationFields: ["contactName"],
          },
        ],
        pagination: { totalPages: 1 },
      },
    },
  });
  mock.post.mockResolvedValue({ data: { success: true } });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  render(<CentralSupplierReview />);
  expect(screen.getByRole("link",{name:"신청 정보·사업자등록증 검토"})).toHaveAttribute("href","https://supplier.neture.co.kr/operator/suppliers");
  const approve = await screen.findByRole("button", { name: "승인" });
  expect(approve).not.toBeDisabled();
  fireEvent.click(approve);
  await waitFor(() =>
    expect(mock.post).toHaveBeenCalledWith(
      "/neture/operator/suppliers/synthetic/approve",
      {},
    ),
  );
  expect(screen.getByText(/프로필 보완 안내/)).toBeTruthy();
});
