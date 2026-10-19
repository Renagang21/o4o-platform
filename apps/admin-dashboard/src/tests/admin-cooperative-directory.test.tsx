import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import Page from "../pages/platform/AdminCooperationBusinessesPage";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@o4o/auth-client", () => ({ authClient: { api } }));
vi.mock("@o4o/operator-core-ui/modules/pharmacy-management", () => ({
  AdminSemiFranchisePage: () => <div>기존 사업 설정</div>,
}));
const response = (roleOperators: unknown[] = []) => ({
  data: { success: true, data: { roleOperators } },
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
it("keeps the existing business form and exposes federation settings without individual cooperative management", async () => {
  open("/admin/semi-franchises?register=carepharm");
  expect(screen.getByText("기존 사업 설정")).toBeInTheDocument();
  expect(api.get).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "약국·약사 협동조합 연합회" }),
  );
  await screen.findByText("지정된 연합회 Admin·Operator가 없습니다.");
  expect(
    screen.getByRole("heading", { name: "약국·약사 협동조합 연합회" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "연합회 Admin·Operator 지정" }),
  ).toHaveAttribute("href", "/operators");
  expect(
    screen.getByRole("link", { name: "연합회 서비스 열기" }),
  ).toHaveAttribute("href", "https://pharmcoop.neture.co.kr/");
  expect(
    screen.queryByRole("heading", { name: /개별 조합/ }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith("/neture/admin/cooperative-federation");
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "약국 협력사업" }));
  expect(screen.getByText("기존 사업 설정")).toBeInTheDocument();
});
it("opens a legacy cooperative registration link in federation settings instead of creating a generic business", async () => {
  open("/admin/semi-franchises?register=pharmcoop");
  await screen.findByText("지정된 연합회 Admin·Operator가 없습니다.");
  expect(screen.queryByText("기존 사업 설정")).not.toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});
it("shows federation Admin and Operator grants with name fallbacks and separate account eligibility", async () => {
  api.get.mockResolvedValue(
    response([
      {
        userId: "a",
        role: "neture:pharmcoop_admin",
        name: "합성 관리자",
        email: null,
        membershipStatus: "active",
      },
      {
        userId: "b",
        role: "neture:pharmcoop_operator",
        name: null,
        email: "synthetic@example.invalid",
        membershipStatus: "suspended",
      },
      {
        userId: "c",
        role: "neture:pharmcoop_operator",
        name: null,
        email: null,
        membershipStatus: "active",
      },
    ]),
  );
  open();
  await screen.findByText("합성 관리자");
  expect(screen.getByText("Admin")).toBeInTheDocument();
  expect(screen.getAllByText("Operator")).toHaveLength(2);
  expect(screen.getByText("synthetic@example.invalid")).toBeInTheDocument();
  expect(screen.getByText("이름 미등록")).toBeInTheDocument();
  expect(screen.getAllByText("메인 이용 자격 확인 필요")).toHaveLength(1);
});
it.each(["network", "malformed"])(
  "does not report no operators after %s failure and can retry",
  async (mode) => {
    if (mode === "network")
      api.get.mockRejectedValueOnce(new Error("fixture failure"));
    else
      api.get.mockResolvedValueOnce(
        response([{ userId: "bad", role: "neture:carepharm_admin" }]),
      );
    open();
    await screen.findByRole("alert");
    expect(
      screen.queryByText("지정된 연합회 Admin·Operator가 없습니다."),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
    await screen.findByText("지정된 연합회 Admin·Operator가 없습니다.");
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(api.post).not.toHaveBeenCalled();
  },
);
