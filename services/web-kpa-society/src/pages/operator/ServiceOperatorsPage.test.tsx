import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ServiceOperatorsPage from "./ServiceOperatorsPage";
const state = vi.hoisted(() => ({
  roles: [] as string[],
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "actor", roles: state.roles } }),
  authClient: {
    api: { get: state.get, post: state.post, delete: state.delete },
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  state.get.mockResolvedValue({
    data: {
      data: {
        operators: [],
        candidates: [],
        truncated: false,
        role: "kpa:operator",
      },
    },
  });
});
afterEach(cleanup);
it("platform-only account reaches the central-console fallback without service API reads", () => {
  state.roles = ["platform:super_admin"];
  render(<ServiceOperatorsPage />);
  expect(
    screen
      .getByRole("link", { name: "전체 관리자에서 역할 관리" })
      .getAttribute("href"),
  ).toBe("https://admin.neture.co.kr/operators");
  expect(state.get).not.toHaveBeenCalled();
});
it("KPA admin loads the scoped Operator roster", async () => {
  state.roles = ["kpa:admin"];
  render(<ServiceOperatorsPage />);
  await screen.findByText("지정된 Operator가 없습니다.");
  expect(state.get).toHaveBeenCalledWith(
    "/service-operator-management/kpa-society",
  );
});
