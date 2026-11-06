import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
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
  ServiceMembersWorkspace: ({ serviceKey, userId }: any) => (
    <div>
      <p>
        members:{serviceKey}
        {userId ? `:${userId}` : ""}
      </p>
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
vi.mock("./CentralLectureOperations", () => ({
  default: ({ courseId }: any) => <p>course:{courseId}</p>,
}));
vi.mock("./CentralOperationOverview", () => ({ default: () => null }));
vi.mock("./CentralOperationNotifications", () => ({ default: () => null }));
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
          path="/operations/:serviceKey/courses/:courseId"
          element={<CentralOperationsPage />}
        />
        <Route
          path="/operations/:serviceKey/members/:userId"
          element={<CentralOperationsPage />}
        />
        <Route
          path="/operations/:serviceKey/:area"
          element={<CentralOperationsPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}
const denied = (code: string, status = 403) =>
  Object.assign(new Error(code), { response: { status, data: { success: false, code } } });
it("service roles alone do not show operating screens when server delegation is denied", async () => {
  mock.get.mockRejectedValueOnce(denied("CENTRAL_DELEGATION_REQUIRED"));
  view("/operations/supplier/members");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "초대를 본인이 수락",
  );
  expect(screen.queryByText("members:supplier")).toBeNull();
});
it.each([
  ["GOOGLE_SESSION_REQUIRED", 403, "Google 계정으로 다시 로그인"],
  ["CENTRAL_MENU_NOT_DELEGATED", 403, "담당 업무 지정을 요청"],
  ["CENTRAL_ACCESS_UNAVAILABLE", 503, "확인하지 못했습니다"],
])("guides the action for the %s denial and keeps screens closed", async (code, status, guidance) => {
  mock.get.mockRejectedValueOnce(denied(code, status));
  view("/operations/supplier/members");
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent(guidance);
  expect(alert).not.toHaveTextContent("초대를 본인이 수락");
  expect(screen.queryByText("members:supplier")).toBeNull();
});
it("does not blame delegation when the check fails without a server reason", async () => {
  mock.get.mockRejectedValueOnce(new Error("Network Error"));
  view("/operations/supplier/members");
  expect(await screen.findByRole("alert")).toHaveTextContent("확인하지 못했습니다");
});
it("shows only current delegated services and never the platform-admin entry", async () => {
  mock.get.mockResolvedValueOnce({
    data: { data: { roles: ["supplier:operator"], menuKeys: ["supplier.members", "supplier.inbox", "supplier.suppliers"] } },
  });
  view();
  expect(await screen.findByRole('heading', { name: '공급자' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: '펀딩' })).toBeNull();
  expect(screen.queryByText("전체 관리자")).toBeNull();
});
it("rejects an undelegated direct URL despite a valid grant for another service", async () => {
  mock.get.mockResolvedValueOnce({
    data: { data: { roles: ["supplier:operator"], menuKeys: ["supplier.members", "supplier.inbox", "supplier.suppliers"] } },
  });
  view("/operations/funding/members");
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("위임되지 않은 업무"),
  );
});

it("preserves unsaved work during successful background delegation checks and removes it on revocation", async () => {
  mock.get.mockResolvedValue({
    data: { data: { roles: ["supplier:operator"], menuKeys: ["supplier.members", "supplier.inbox", "supplier.suppliers"] } },
  });
  view("/operations/supplier/members");
  const input = await screen.findByLabelText("작성 중");
  fireEvent.change(input, { target: { value: "작성 중인 사유" } });
  fireEvent(window, new Event("focus"));
  await waitFor(() => expect(mock.get).toHaveBeenCalledTimes(2));
  expect(screen.getByLabelText("작성 중")).toHaveValue("작성 중인 사유");
  mock.get.mockRejectedValueOnce(denied("CENTRAL_DELEGATION_REQUIRED"));
  fireEvent(window, new Event("focus"));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "유효한 업무 위임",
  );
  expect(screen.queryByLabelText("작성 중")).toBeNull();
});

it.each([
  ["a 503 outage", denied("CENTRAL_ACCESS_UNAVAILABLE", 503)],
  ["a rate limit", denied("TOO_MANY_REQUESTS", 429)],
  ["a network failure", new Error("Network Error")],
])("keeps unsaved work through %s and clears the notice once the check recovers", async (_label, failure) => {
  const granted = { data: { data: { roles: ["supplier:operator"], menuKeys: ["supplier.members"] } } };
  mock.get.mockResolvedValueOnce(granted);
  view("/operations/supplier/members");
  fireEvent.change(await screen.findByLabelText("작성 중"), { target: { value: "작성 중인 사유" } });
  mock.get.mockRejectedValueOnce(failure);
  fireEvent(window, new Event("focus"));
  expect(await screen.findByText(/현재 화면을 유지합니다/)).toHaveAttribute("role", "status");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByLabelText("작성 중")).toHaveValue("작성 중인 사유");
  mock.get.mockResolvedValueOnce(granted);
  fireEvent(window, new Event("focus"));
  await waitFor(() => expect(screen.queryByText(/현재 화면을 유지합니다/)).toBeNull());
  expect(screen.getByLabelText("작성 중")).toHaveValue("작성 중인 사유");
});
it("an explicit refusal during an outage still closes the screen", async () => {
  mock.get.mockResolvedValueOnce({ data: { data: { roles: ["supplier:operator"], menuKeys: ["supplier.members"] } } });
  view("/operations/supplier/members");
  await screen.findByLabelText("작성 중");
  mock.get.mockRejectedValueOnce(denied("CENTRAL_ACCESS_UNAVAILABLE", 503));
  fireEvent(window, new Event("focus"));
  await screen.findByText(/현재 화면을 유지합니다/);
  mock.get.mockRejectedValueOnce(denied("CENTRAL_DELEGATION_REQUIRED"));
  fireEvent(window, new Event("focus"));
  expect(await screen.findByRole("alert")).toHaveTextContent("유효한 업무 위임");
  expect(screen.queryByLabelText("작성 중")).toBeNull();
});
it("an outage cannot carry one account's verification over to another", async () => {
  mock.get.mockResolvedValueOnce({ data: { data: { roles: ["supplier:operator"], menuKeys: ["supplier.members"] } } });
  const page = view("/operations/supplier/members");
  await screen.findByLabelText("작성 중");
  const original = mock.user;
  mock.user = { id: "synthetic-other-user", roles: ["supplier:operator"] };
  mock.get.mockRejectedValue(denied("CENTRAL_ACCESS_UNAVAILABLE", 503));
  try {
    page.rerender(
      <MemoryRouter initialEntries={["/operations/supplier/members"]}>
        <Routes>
          <Route path="/operations/:serviceKey/:area" element={<CentralOperationsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("확인하지 못했습니다");
    expect(screen.queryByLabelText("작성 중")).toBeNull();
  } finally {
    mock.user = original;
    mock.get.mockReset();
  }
});

it.each([
  [
    "/operations/supplier/members/synthetic-member",
    "supplier:operator",
    "members:supplier:synthetic-member",
  ],
  [
    "/operations/lecture/courses/synthetic-course",
    "lecture:operator",
    "course:synthetic-course",
  ],
])(
  "resolves the fixed business area of detail route %s",
  async (path, role, content) => {
    mock.get.mockResolvedValueOnce({ data: { data: { roles: [role], menuKeys: [`${role.split(':')[0]}.members`, `${role.split(':')[0]}.courses`] } } });
    view(path);
    expect(await screen.findByText(content)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  },
);
it("does not let a detail-route area bypass service delegation", async () => {
  mock.get.mockResolvedValueOnce({
    data: { data: { roles: ["supplier:operator"], menuKeys: ["supplier.members", "supplier.inbox", "supplier.suppliers"] } },
  });
  view("/operations/lecture/courses/synthetic-course");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "위임되지 않은 업무",
  );
  expect(screen.queryByText("course:synthetic-course")).toBeNull();
});
it("rejects a menu outside the explicit duties even when the service role is present", async () => {
  mock.get.mockResolvedValueOnce({ data: { data: { roles: ['neture:operator'], menuKeys: ['neture.members'] } } });
  view('/operations/neture/qualifications');
  expect(await screen.findByRole('alert')).toHaveTextContent('위임되지 않은 업무 메뉴');
});

it("replaces the flat business menu list with the current three-level location", async () => {
  mock.get.mockResolvedValue({data:{data:{roles:['neture:operator'],menuKeys:['neture.service-members','neture.qualifications','neture.candidates','neture.inbox','neture.products']}}});
  view('/operations/neture/service-members');
  const breadcrumb=await screen.findByRole('navigation',{name:'현재 위치'});
  expect(within(breadcrumb).getByText('약국·공통 운영')).toBeTruthy();
  expect(within(breadcrumb).getByText('회원·자격')).toBeTruthy();
  expect(within(breadcrumb).getByText('O4O 서비스 회원·이용 상태')).toHaveAttribute('aria-current','page');
  expect(screen.queryByRole('navigation',{name:'서비스 운영 업무'})).toBeNull();
  expect(screen.queryByRole('link',{name:'상품 후보 검토'})).toBeNull();
  expect(screen.queryByRole('button',{name:'공급자'})).toBeNull();
});
