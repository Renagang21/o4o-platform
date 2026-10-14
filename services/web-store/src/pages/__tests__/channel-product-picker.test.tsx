import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AddProductModal } from "../pharmacy/StoreChannelsPage";
const api = vi.hoisted(() => ({ available: vi.fn(), add: vi.fn() }));
vi.mock("../../api/channelProducts", () => ({
  fetchAvailableProducts: api.available,
  addProductToChannel: api.add,
}));
afterEach(cleanup);
beforeEach(() => vi.resetAllMocks());
const product = {
  id: "synthetic-product",
  productName: "Synthetic product",
  serviceKey: "synthetic",
  retailPrice: 1000,
  createdAt: "",
};
function props() {
  return {
    open: true,
    organizationId: "store",
    channelId: "A",
    onProductAdded: vi.fn(),
    onClose: vi.fn(),
  };
}
it("picker failure is explicit and retry restores actual candidate controls", async () => {
  api.available
    .mockRejectedValueOnce(new Error("synthetic"))
    .mockResolvedValueOnce([product]);
  render(
    <MemoryRouter>
      <AddProductModal {...props()} />
    </MemoryRouter>,
  );
  await screen.findByRole("alert");
  expect(screen.queryByText("추가할 수 있는 상품이 없습니다")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
  await screen.findByText("Synthetic product");
  expect(screen.getByRole("button", { name: /^추가$/ })).toBeTruthy();
});
it("picker failure after reopening does not display the prior candidate", async () => {
  api.available
    .mockResolvedValueOnce([product])
    .mockRejectedValueOnce(new Error("synthetic"));
  const value = props();
  const { rerender } = render(
    <MemoryRouter>
      <AddProductModal {...value} />
    </MemoryRouter>,
  );
  await screen.findByText("Synthetic product");
  rerender(
    <MemoryRouter>
      <AddProductModal {...value} open={false} />
    </MemoryRouter>,
  );
  rerender(
    <MemoryRouter>
      <AddProductModal {...value} />
    </MemoryRouter>,
  );
  await screen.findByRole("alert");
  expect(screen.queryByText("Synthetic product")).toBeNull();
});
it("an actual empty candidate list stays distinct from an error", async () => {
  api.available.mockResolvedValue([]);
  render(
    <MemoryRouter>
      <AddProductModal {...props()} />
    </MemoryRouter>,
  );
  await screen.findByText("추가할 수 있는 상품이 없습니다");
  expect(screen.queryByRole("alert")).toBeNull();
});
it("closing the actual picker during add still notifies the same channel on success", async () => {
  let resolve!: (value: unknown) => void;
  api.add.mockReturnValue(
    new Promise((yes) => {
      resolve = yes;
    }),
  );
  api.available.mockResolvedValue([product]);
  const value = props();
  const { rerender } = render(
    <MemoryRouter>
      <AddProductModal {...value} />
    </MemoryRouter>,
  );
  await screen.findByText("Synthetic product");
  fireEvent.click(screen.getByRole("button", { name: /^추가$/ }));
  rerender(
    <MemoryRouter>
      <AddProductModal {...value} open={false} />
    </MemoryRouter>,
  );
  await act(async () => {
    resolve({ id: "added" });
  });
  await waitFor(() => expect(value.onProductAdded).toHaveBeenCalledOnce());
});
