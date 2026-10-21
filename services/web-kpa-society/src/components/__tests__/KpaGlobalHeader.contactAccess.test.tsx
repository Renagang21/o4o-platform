import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const state = vi.hoisted(() => ({
  get: vi.fn(),
  user: {
    id: "test-member",
    roles: ["neture:operator"],
    memberships: [{ serviceKey: "neture", status: "active" }],
  } as {
    id: string;
    roles: string[];
    memberships: { serviceKey: string; status: string }[];
  } | null,
}));
vi.mock("../../config/businessSite", () => ({
  BUSINESS_SITE: { key: "megapharm" },
}));
vi.mock("../../contexts", () => ({
  useAuth: () => ({ user: state.user, logout: vi.fn(), isLoading: false }),
}));
vi.mock("../../contexts/AuthContext", () => ({
  authClient: { api: { get: state.get } },
}));
vi.mock("../../contexts/LoginModalContext", () => ({
  useAuthModal: () => ({ openLoginModal: vi.fn(), openRegisterModal: vi.fn() }),
}));
vi.mock("../../api/credit", () => ({
  creditApi: { getMyBalance: vi.fn(async () => ({ data: { balance: 0 } })) },
}));
vi.mock("../../api/notifications", () => ({ notificationsApi: {} }));
vi.mock("@o4o/account-ui", () => ({
  NotificationBell: () => null,
  useNotifications: () => ({}),
  getUserDisplayName: () => "검증 운영자",
}));
vi.mock("@o4o/ui", () => ({
  GlobalHeader: ({
    publicNav,
  }: {
    publicNav: { label: string; href: string }[];
  }) => (
    <nav>
      {publicNav.map((item) => (
        <a key={item.href} href={item.href}>
          {item.label}
        </a>
      ))}
    </nav>
  ),
  buildCommunityPrimaryNav: () => [],
}));
vi.mock("@o4o/auth-react", () => ({
  MyHomeButton: () => null,
  O4OHomeButton: () => null,
  ServiceAccountMenu: () => null,
  O4O_LOGOUT_LABEL: "로그아웃",
}));
vi.mock("../KpaUserMenu", () => ({
  useKpaUserRoles: () => ({ isStoreOwner: false }),
  getKpaServiceRoleLabel: () => undefined,
  KpaUserMenuItems: () => null,
}));
import { KpaGlobalHeader } from "../KpaGlobalHeader";
beforeEach(() => {
  state.get.mockReset().mockRejectedValue({ response: { status: 403 } });
  state.user = {
    id: "test-member",
    roles: ["neture:operator"],
    memberships: [{ serviceKey: "neture", status: "active" }],
  };
});
afterEach(cleanup);
it.each(["neture:operator", "neture:admin"])(
  "shows the MegaPharm inbox for server-confirmed legacy %s",
  async (role) => {
    state.user!.roles = [role];
    state.get.mockResolvedValue({ data: { data: { newCount: 4 } } });
    render(
      <MemoryRouter>
        <KpaGlobalHeader />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("link", { name: "문의 관리 · 새 문의 4" }),
    ).toHaveProperty(
      "href",
      "https://neture.co.kr/operator/service-contact/megapharm",
    );
  },
);
it("hides an apparently eligible local role when the server denies access", async () => {
  state.user!.roles = ["neture:megapharm_operator"];
  render(
    <MemoryRouter>
      <KpaGlobalHeader />
    </MemoryRouter>,
  );
  await waitFor(() => expect(state.get).toHaveBeenCalled());
  expect(screen.queryByRole("link", { name: /문의 관리/ })).toBeNull();
});
it("does not probe contact access for a guest", () => {
  state.user = null;
  render(
    <MemoryRouter>
      <KpaGlobalHeader />
    </MemoryRouter>,
  );
  expect(state.get).not.toHaveBeenCalled();
});
