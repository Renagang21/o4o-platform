import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Page from "./StoreStaffSupportPage";
const state = vi.hoisted(() => ({
  role: "staff",
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}));
vi.mock("../../contexts/StoreContext", () => ({
  useUnifiedStore: () => ({
    organizationId: "store",
    stores: [{ organizationId: "store", memberRole: state.role }],
  }),
}));
vi.mock("../../api/client", () => ({ coreApiClient: state }));
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  state.role = "staff";
  state.get.mockImplementation(async (path: string) => ({
    data: path.endsWith("/guides")
      ? [
          {
            id: "guide",
            title: "짧은 안내",
            summary: "위치 안내 후 약사 연결",
            businessName: "합성 사업",
          },
        ]
      : [{ id: "p", kind: "local", name: "합성 상품", location: "A-3" }],
  }));
  state.post.mockResolvedValue({});
  state.put.mockResolvedValue({});
});
it("lets free invited staff search and record one demand without location editing or customer text", async () => {
  render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>,
  );
  await screen.findByText("짧은 안내");
  fireEvent.change(screen.getByLabelText("상품 이름"), {
    target: { value: "상품" },
  });
  fireEvent.click(screen.getByRole("button", { name: "찾기" }));
  await screen.findByText("위치: A-3");
  expect(screen.queryByRole("button", { name: "위치 저장" })).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "취급하지 않는 상품 요청" }),
  );
  await waitFor(() =>
    expect(state.post).toHaveBeenCalledWith(
      "/neture/pharmacy/staff-support/demands",
      { reason: "not-carried" },
    ),
  );
  expect(screen.getAllByRole("textbox")).toHaveLength(1);
});
it("allows the owner to save a short location and preserves failed demand input for retry", async () => {
  state.role = "owner";
  state.post.mockRejectedValueOnce(new Error("offline"));
  render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("상품 이름"), {
    target: { value: "상품" },
  });
  fireEvent.click(screen.getByRole("button", { name: "찾기" }));
  const location = await screen.findByLabelText("합성 상품 진열 위치");
  fireEvent.change(location, { target: { value: "B-2" } });
  fireEvent.click(screen.getByRole("button", { name: "위치 저장" }));
  await waitFor(() =>
    expect(state.put).toHaveBeenCalledWith(
      "/neture/pharmacy/staff-support/location",
      { kind: "local", id: "p", location: "B-2" },
    ),
  );
  await screen.findByText("위치를 저장했습니다.");
  fireEvent.click(screen.getByRole("button", { name: "상품 위치를 못 찾음" }));
  await screen.findByText(
    "저장하지 못했습니다. 이용 자격과 연결 상태를 확인하고 다시 시도해 주세요.",
  );
  fireEvent.click(screen.getByRole("button", { name: "상품 위치를 못 찾음" }));
  await screen.findByText("기록했습니다.");
});
