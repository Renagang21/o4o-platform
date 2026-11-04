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
vi.mock("@o4o/auth-context", () => ({useAuth:()=>({user:{id:'fixture-reviewer',roles:['platform:super_admin']}})}));
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
  await screen.findByText('합성 공급자');
  fireEvent.click(screen.getAllByRole('checkbox')[1]);
  fireEvent.click(screen.getByRole('button',{name:'신청 정보·계정'}));
  expect(screen.getByRole('link',{name:'공급자 사업 정보·증빙·제품·거래 관리'})).toHaveAttribute('href','https://supplier.neture.co.kr/operator/suppliers');
  expect(screen.getByText(/프로필 보완 안내/)).toHaveTextContent("contactName");
  const approve = await screen.findByRole("button", { name: "승인" });
  expect(approve).not.toBeDisabled();
  fireEvent.click(approve);
  await waitFor(() =>
    expect(mock.post).toHaveBeenCalledWith(
      "/neture/operator/suppliers/synthetic/approve",
      {},
    ),
  );
  await waitFor(()=>expect(screen.getAllByRole("checkbox")[1]).not.toBeChecked());
});
