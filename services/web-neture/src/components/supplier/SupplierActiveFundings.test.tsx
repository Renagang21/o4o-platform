import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import SupplierActiveFundings from "./SupplierActiveFundings";
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../../lib/apiClient", () => ({ api: { get } }));
afterEach(cleanup);
beforeEach(() => vi.resetAllMocks());
it("distinguishes a failed read from an empty list, then offers a funding operator link", async () => {
  get
    .mockRejectedValueOnce(Error("unavailable"))
    .mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          items: [{ id: "funding", title: "격리 펀딩", status: "recruiting" }],
          hasMore: false,
        },
      },
    });
  render(<SupplierActiveFundings supplierId="supplier" />);
  await screen.findByRole("alert");
  expect(screen.queryByText("조회된 진행 펀딩이 없습니다.")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "다시 확인" }));
  expect(
    (await screen.findByRole("link", { name: "격리 펀딩" })).getAttribute(
      "href",
    ),
  ).toBe("https://funding.neture.co.kr/operator/market-trial/funding");
  expect(get).toHaveBeenCalledTimes(2);
});
it("does not display another supplier response after switching suppliers", async () => {
  let finish!: (v: unknown) => void;
  get
    .mockReturnValueOnce(
      new Promise((r) => {
        finish = r;
      }),
    )
    .mockResolvedValueOnce({
      data: { success: true, data: { items: [], hasMore: false } },
    });
  const view = render(<SupplierActiveFundings supplierId="old" />);
  view.rerender(<SupplierActiveFundings supplierId="new" />);
  await screen.findByText("조회된 진행 펀딩이 없습니다.");
  await act(async () =>
    finish({
      data: {
        success: true,
        data: {
          items: [{ id: "old", title: "이전 공급자", status: "recruiting" }],
        },
      },
    }),
  );
  expect(screen.queryByText("이전 공급자")).toBeNull();
});
