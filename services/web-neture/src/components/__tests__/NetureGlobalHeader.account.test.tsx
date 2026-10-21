import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const state = vi.hoisted(() => ({
  profile: "carepharm",
  get: vi.fn(),
  logout: vi.fn(),
  user: {
    id: "fixture-account",
    displayName: "검증용 회원",
    email: "member@example.invalid",
    roles: [] as string[],
    demo: { isDemo: true },
  },
}));
vi.mock("../../lib/hostProfile", () => ({
  get CURRENT_HOST_PROFILE() {
    return state.profile;
  },
}));
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: state.user,
    isAuthenticated: true,
    isLoading: false,
    logout: state.logout,
  }),
}));
vi.mock("../../contexts/LoginModalContext", () => ({
  useLoginModal: () => ({ openLoginModal: vi.fn() }),
}));
vi.mock("../../lib/apiClient", () => ({
  api: { get: state.get },
  API_BASE_URL: "https://api.example.invalid",
}));
vi.mock("@o4o/account-ui", async (original) => ({
  ...(await original<typeof import("@o4o/account-ui")>()),
  NotificationBell: () => <button>알림</button>,
  useNotifications: () => ({}),
}));
vi.mock("@o4o/auth-react", async (original) => ({
  ...(await original<typeof import("@o4o/auth-react")>()),
  MyHomeButton: () => <button>My Home</button>,
  O4OHomeButton: () => <button>O4O 메인으로</button>,
}));
import { NetureGlobalHeader } from "../NetureGlobalHeader";
beforeEach(() => {
  state.user.roles = [];
  state.get.mockReset().mockRejectedValue({ response: { status: 403 } });
});
afterEach(cleanup);

it.each(["main", "supplier", "funding", "community", "carepharm"])(
  "%s shows one named account menu and keeps Demo notice inside it",
  (profile) => {
    state.profile = profile;
    render(
      <MemoryRouter>
        <NetureGlobalHeader />
      </MemoryRouter>,
    );
    const trigger = screen.getByRole("button", { name: "계정 메뉴" });
    expect(within(trigger).getByText("검증용 회원")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "사용자 메뉴" })).toBeNull();
    expect(screen.queryByText("Demo 계정")).toBeNull();
    fireEvent.click(trigger);
    expect(
      within(screen.getByRole("region", { name: "계정 메뉴" })).getByText(
        "Demo 계정",
      ),
    ).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "계정 메뉴" })).toHaveLength(
      1,
    );
    expect(
      within(screen.getByRole("region", { name: "계정 메뉴" })).getByText(
        "설정",
      ),
    ).toBeTruthy();
  },
);

it.each(["main", "supplier", "funding"])(
  "%s exposes the inbox for a platform account approved by the server",
  async (profile) => {
    state.profile = profile;
    state.user.roles = ["platform:super_admin"];
    state.get.mockResolvedValue({ data: { data: { newCount: 0 } } });
    render(
      <MemoryRouter>
        <NetureGlobalHeader />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("link", { name: "문의 관리" })).toBeTruthy();
  },
);
it("exposes CarePharm inquiries for a server-confirmed legacy business assignee", async () => {
  state.profile = "carepharm";
  state.user.roles = ["neture:operator"];
  state.get.mockResolvedValue({ data: { data: { newCount: 3 } } });
  render(
    <MemoryRouter>
      <NetureGlobalHeader />
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole("link", { name: "문의 관리 · 새 문의 3" }),
  ).toBeTruthy();
});
