import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
const mock = vi.hoisted(() => ({
  get: vi.fn(),
  user: { id: "synthetic-user", roles: ["supplier:operator"] },
}));
vi.mock("@o4o/auth-client", () => ({ authClient: { api: { get: mock.get } } }));
vi.mock("@o4o/auth-context", () => ({
  useAuth: () => ({
    user: mock.user,
    isLoading: false,
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}));
vi.mock("@o4o/operator-core-ui/modules/members", () => ({
  ServiceMembersWorkspace: ({ serviceKey }: any) => (
    <div>
      <p>members:{serviceKey}</p>
      <input aria-label="작성 중" />
    </div>
  ),
}));
vi.mock("@o4o/operator-core-ui", () => ({
  OperatorInbox: () => null,
  createCommunityHomeApi: () => ({}),
  createPartnerCommunityApi: () => ({}),
  PartnerCommunityOperator: () => null,
  CommunityHomeManagementPage: () => null,
  CommunityManagementWorkspace: () => null,
  OperatorLmsCoursesManager: () => null,
}));
vi.mock("@o4o/operator-core-ui/modules/pharmacy-management", () => ({
  PharmacyMembershipReviewPage: () => null,
}));
import CentralOperationsPage from "./CentralOperationsPage";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function view(path = "/operations") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/operations" element={<CentralOperationsPage />} />
        <Route
          path="/operations/:serviceKey/:area"
          element={<CentralOperationsPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}
it("service roles alone do not show operating screens when server delegation is denied", async () => {
  mock.get.mockRejectedValueOnce(new Error("denied"));
  view("/operations/supplier/members");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "유효한 업무 위임",
  );
  expect(screen.queryByText("members:supplier")).toBeNull();
});
it("shows only current delegated services and never the platform-admin entry", async () => {
  mock.get.mockResolvedValueOnce({
    data: { data: { roles: ["supplier:operator"] } },
  });
  view();
  expect(await screen.findByText("공급자 회원 관리")).toBeTruthy();
  expect(screen.queryByText("펀딩 회원 관리")).toBeNull();
  expect(screen.queryByText("전체 관리자")).toBeNull();
});
it("rejects an undelegated direct URL despite a valid grant for another service", async () => {
  mock.get.mockResolvedValueOnce({
    data: { data: { roles: ["supplier:operator"] } },
  });
  view("/operations/funding/members");
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("위임되지 않은 업무"),
  );
});

it("preserves unsaved work during successful background delegation checks and removes it on revocation", async () => {
  mock.get.mockResolvedValue({
    data: { data: { roles: ["supplier:operator"] } },
  });
  view("/operations/supplier/members");
  const input = await screen.findByLabelText("작성 중");
  fireEvent.change(input, { target: { value: "작성 중인 사유" } });
  fireEvent(window, new Event("focus"));
  await waitFor(() => expect(mock.get).toHaveBeenCalledTimes(2));
  expect(screen.getByLabelText("작성 중")).toHaveValue("작성 중인 사유");
  mock.get.mockRejectedValueOnce(new Error("revoked"));
  fireEvent(window, new Event("focus"));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "유효한 업무 위임",
  );
  expect(screen.queryByLabelText("작성 중")).toBeNull();
});
