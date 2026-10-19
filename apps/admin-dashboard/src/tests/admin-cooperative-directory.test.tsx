import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Page from "../pages/platform/AdminCooperationBusinessesPage";
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@o4o/auth-client", () => ({ authClient: { api } }));
vi.mock("@o4o/operator-core-ui/modules/pharmacy-management", () => ({
  AdminSemiFranchisePage: () => <div>기존 사업 설정</div>,
}));
const response = (
  cooperatives: unknown[] = [],
  roleOperators: unknown[] = [],
) => ({ data: { success: true, data: { cooperatives, roleOperators } } });
const cooperative = (
  id: string,
  status = "active",
  businessStatus = "active",
) => ({
  id,
  slug: `coop-${id}`,
  name: `합성 조합 ${id}`,
  cooperativeStatus: status,
  businessKey: `business-${id}`,
  businessStatus,
  activeMemberCount: 2,
});
beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockResolvedValue(response());
});
function open(path = "/admin/semi-franchises?section=cooperatives") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Page />
    </MemoryRouter>,
  );
}
it("keeps the existing business form and exposes the cooperative category without creating a business", async () => {
  open("/admin/semi-franchises?register=carepharm");
  expect(screen.getByText("기존 사업 설정")).toBeInTheDocument();
  expect(api.get).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "약국·약사 협동조합" }));
  await screen.findByText(/등록된 개별 조합이 없습니다/);
  expect(
    screen.getByRole("heading", { name: "약국·약사 협동조합" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "연합회 Admin·Operator 지정" }),
  ).toHaveAttribute("href", "/operators");
  expect(api.post).not.toHaveBeenCalled();
});
it("opens a legacy cooperative registration link in the cooperative view instead of the generic business form", async () => {
  open("/admin/semi-franchises?register=pharmcoop");
  await screen.findByText(/등록된 개별 조합이 없습니다/);
  expect(screen.queryByText("기존 사업 설정")).not.toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});
it("distinguishes cooperative suspension and business closure from an active cooperative", async () => {
  api.get.mockResolvedValue(
    response(
      [
        cooperative("a"),
        cooperative("b", "suspended"),
        cooperative("c", "active", "closed"),
      ],
      [
        {
          userId: "synthetic",
          role: "neture:pharmcoop_admin",
          name: null,
          email: "synthetic@example.invalid",
          membershipStatus: "suspended",
        },
      ],
    ),
  );
  open();
  await screen.findByText("등록 3곳 · 운영 중 1곳");
  expect(
    screen.getAllByRole("link", { name: "조합 서비스 열기" }),
  ).toHaveLength(1);
  expect(screen.getByText(/조합: 중지/)).toBeInTheDocument();
  expect(screen.getByText(/연결 사업: 마감/)).toBeInTheDocument();
  expect(screen.getByText("메인 이용 자격 확인 필요")).toBeInTheDocument();
});
it.each(["network", "malformed"])(
  "never reports an empty directory after %s failure and can retry",
  async (mode) => {
    if (mode === "network")
      api.get.mockRejectedValueOnce(new Error("fixture failure"));
    else
      api.get.mockResolvedValueOnce(response([cooperative("bad", "unknown")]));
    open();
    await screen.findByRole("alert");
    expect(
      screen.queryByText(/등록된 개별 조합이 없습니다|등록 0곳/),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
    await screen.findByText(/등록된 개별 조합이 없습니다/);
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(api.post).not.toHaveBeenCalled();
  },
);
