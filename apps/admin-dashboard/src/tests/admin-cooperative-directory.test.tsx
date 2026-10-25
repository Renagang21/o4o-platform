import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import Page from "../pages/platform/AdminPharmacyServiceSettingsPage";
import { configurePharmacyManagementClient } from "@o4o/operator-core-ui/modules/pharmacy-management";
const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("@o4o/auth-client", () => ({ authClient: { api } }));
const response = (data: unknown) => ({ data: { success: true, data } });
beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockImplementation(async (path: string) =>
    path === "/neture/admin/service-feature-policies"
      ? response({
          features: [{ key: "tablet", label: "태블릿" }],
          targets: [{ key: "default", name: "기본 제공", features: [] }],
        })
      : response({ roleOperators: [] }),
  );
  configurePharmacyManagementClient(api);
});
function open(path = "/admin/pharmacy-service-settings?section=cooperatives") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Page />
    </MemoryRouter>,
  );
}
it.each([
  "?section=cooperatives",
  "?register=pharmcoop",
  "?target=federation%3Apharmcoop",
])(
  "preserves federation entry %s without creating a generic business or role",
  async (query) => {
    open(`/admin/pharmacy-service-settings${query}`);
    await screen.findByText("지정된 연합회 Admin·Operator가 없습니다.");
    expect(
      screen.getByRole("link", { name: "연합회 Admin·Operator 지정" }),
    ).toHaveAttribute("href", "/operators");
    expect(
      screen.getByRole("link", { name: "연합회 서비스 열기" }),
    ).toHaveAttribute("href", "https://pharmcoop.neture.co.kr/");
    expect(
      screen.queryByRole("heading", { name: /개별 조합/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "저장", exact: true }),
    ).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(
      "/neture/admin/cooperative-federation",
    );
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
  },
);
it("retains federation account eligibility and name fallbacks", async () => {
  api.get.mockImplementation(async (path: string) =>
    path.includes("service-feature-policies")
      ? response({
          features: [],
          targets: [{ key: "default", name: "기본 제공", features: [] }],
        })
      : response({
          roleOperators: [
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
              email: null,
              membershipStatus: "suspended",
            },
          ],
        }),
  );
  open();
  await screen.findByText("합성 관리자");
  expect(screen.getByText("이름 미등록")).toBeInTheDocument();
  expect(screen.getByText("메인 이용 자격 확인 필요")).toBeInTheDocument();
});
it("keeps a failed federation lookup distinct from no operators and supports retry", async () => {
  let failed = true;
  api.get.mockImplementation(async (path: string) => {
    if (path.includes("service-feature-policies"))
      return response({
        features: [],
        targets: [{ key: "default", name: "기본 제공", features: [] }],
      });
    if (failed) throw new Error("offline");
    return response({ roleOperators: [] });
  });
  open();
  await screen.findByRole("alert");
  expect(
    screen.queryByText("지정된 연합회 Admin·Operator가 없습니다."),
  ).not.toBeInTheDocument();
  failed = false;
  fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
  await screen.findByText("지정된 연합회 Admin·Operator가 없습니다.");
});
