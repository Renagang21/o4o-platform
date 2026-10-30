import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const m = vi.hoisted(() => ({
  get: vi.fn(),
  list: vi.fn(),
  add: vi.fn(),
  store: "store-a",
}));
vi.mock("../../contexts/StoreContext", () => ({
  useUnifiedStore: () => ({ organizationId: m.store }),
}));
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "owner" } }),
}));
vi.mock("../../api/neturePharmacy", () => ({
  neturePharmacyApi: {
    getSupplyOption: m.get,
    listSupplyOptions: m.list,
    addCartItem: m.add,
  },
  pharmacyErrorMessage: (e: Error) => e.message,
}));
vi.mock("./useStoreBusinesses", () => ({
  useStoreBusinesses: () => ({
    rows: [{ key: "carepharm", name: "사업", membershipStatus: "active" }],
    joined: [{ key: "carepharm", name: "사업" }],
    loading: false,
    error: false,
    reload: vi.fn(),
    isCurrent: () => true,
  }),
}));
vi.mock("../../components/store/StoreCommerceNavigation", () => ({
  StoreCommerceNavigation: () => null,
}));
import Page from "./SupplyOptionsPage";
const id = "11111111-1111-4111-8111-111111111111";
const option = {
  kind: "proposal",
  optionId: id,
  semiFranchiseKey: "carepharm",
  productName: "선택한 제안",
  supplierName: "공급자",
  unitPrice: 9000,
};
const view = () => (
  <MemoryRouter
    initialEntries={[
      `/store/pharmacy/supply?source=sf%3Acarepharm&proposal=${id}`,
    ]}
  >
    <Page />
  </MemoryRouter>
);
beforeEach(() => {
  vi.resetAllMocks();
  m.store = "store-a";
  m.get.mockResolvedValue(option);
  m.list.mockResolvedValue({ items: [], total: 0 });
});
afterEach(cleanup);
it("loads the exact proposal through the existing guarded lookup without a broad list or automatic order", async () => {
  render(view());
  await screen.findByText("선택한 제안");
  expect(m.get).toHaveBeenCalledWith("proposal", id);
  expect(m.list).not.toHaveBeenCalled();
  expect(m.add).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "이 협업체의 전체 공급 상품 보기" }),
  );
  await waitFor(() => expect(m.list).toHaveBeenCalled());
});
it.each([new Error("공급 종료"), { ...option, semiFranchiseKey: "other" }])(
  "does not replace an unavailable or foreign proposal with another product",
  async (value) => {
    if (value instanceof Error) m.get.mockRejectedValue(value);
    else m.get.mockResolvedValue(value);
    render(view());
    await screen.findByRole("alert");
    expect(screen.queryByText("선택한 제안")).toBeNull();
    expect(m.list).not.toHaveBeenCalled();
    expect(m.add).not.toHaveBeenCalled();
  },
);
