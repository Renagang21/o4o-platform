import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
const state = vi.hoisted(() => ({
  user: { id: "operator-one", roles: ["supplier:operator"] },
  get: vi.fn(),
  notificationCalls: vi.fn(),
}));
vi.mock("../../../contexts", () => ({
  useAuth: () => ({
    user: state.user,
    isAuthenticated: true,
    isLoading: false,
  }),
}));
vi.mock("../../../lib/apiClient", () => ({
  api: { get: state.get, post: vi.fn(), patch: vi.fn() },
}));
vi.mock("../../../lib/api/notifications", () => ({ notificationsApi: {} }));
vi.mock("@o4o/account-ui", () => ({
  useNotifications: (...args: unknown[]) => {
    state.notificationCalls(...args);
    return {
      unreadCount: 0,
      notifications: [],
      refetchCount: vi.fn(),
      refetchList: vi.fn(),
      markAsRead: vi.fn(),
    };
  },
}));
import ServiceContactPage from "../ServiceContactPage";
beforeEach(() => {
  state.get.mockReset();
  state.notificationCalls.mockClear();
});
afterEach(cleanup);
it("clears the previous account inquiry list while a new account request is pending", async () => {
  state.user = { id: "operator-one", roles: ["supplier:operator"] };
  state.get.mockImplementation(async () => ({
    data: {
      data: {
        items: [
          {
            id: "inquiry",
            serviceKey: "supplier",
            subject: "첫 계정 전용 문의",
            status: "received",
          },
        ],
        pagination: { page: 1, total: 1, totalPages: 1 },
      },
    },
  }));
  const tree = () => (
    <MemoryRouter initialEntries={["/operator/service-contact/supplier"]}>
      <Routes>
        <Route
          path="/operator/service-contact/:serviceKey"
          element={<ServiceContactPage />}
        />
      </Routes>
    </MemoryRouter>
  );
  const view = render(tree());
  await screen.findByText("첫 계정 전용 문의");
  state.user = { id: "operator-two", roles: ["supplier:operator"] };
  state.get.mockImplementation(() => new Promise(() => {}));
  view.rerender(tree());
  expect(screen.queryByText("첫 계정 전용 문의")).toBeNull();
});

it.each(["store", "hospital"])(
  "uses the Neture support notification channel for %s inquiries",
  async (serviceKey) => {
    state.user = { id: "central-support", roles: ["neture:operator"] };
    state.get.mockResolvedValue({
      data: {
        data: { items: [], pagination: { page: 1, total: 0, totalPages: 0 } },
      },
    });
    render(
      <MemoryRouter
        initialEntries={[`/operator/service-contact/${serviceKey}`]}
      >
        <Routes>
          <Route
            path="/operator/service-contact/:serviceKey"
            element={<ServiceContactPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("서비스 문의 관리");
    expect(state.notificationCalls).toHaveBeenLastCalledWith(
      {},
      expect.objectContaining({ serviceKey: "neture", enabled: true }),
    );
  },
);

it.each([
  ["neture", "platform:super_admin"],
  ["supplier", "platform:super_admin"],
  ["funding", "platform:super_admin"],
  ["store", "platform:super_admin"],
  ["hospital", "platform:super_admin"],
  ["carepharm", "neture:admin"],
  ["drugstore", "neture:admin"],
])(
  "shows %s settings for server-confirmed admin %s",
  async (serviceKey, role) => {
    state.user = { id: "server-confirmed-admin", roles: [role] };
    state.get.mockImplementation(async (path: string) => ({
      data: {
        success: true,
        data: path.endsWith("/contact-settings")
          ? { serviceKey }
          : path.endsWith("/summary")
            ? { newCount: 0 }
            : { items: [], pagination: { page: 1, total: 0, totalPages: 0 } },
      },
    }));
    render(
      <MemoryRouter
        initialEntries={[`/operator/service-contact/${serviceKey}`]}
      >
        <Routes>
          <Route
            path="/operator/service-contact/:serviceKey"
            element={<ServiceContactPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("link", { name: "문의 알림 설정" }),
    ).toHaveProperty(
      "href",
      expect.stringContaining(
        `/operator/service-contact/${serviceKey}/settings`,
      ),
    );
  },
);
it("hides settings when the server denies a locally named admin role", async () => {
  state.user = { id: "denied-admin", roles: ["supplier:admin"] };
  state.get.mockImplementation(async (path: string) => {
    if (path.endsWith("/contact-settings")) throw { response: { status: 403 } };
    return {
      data: {
        data: { items: [], pagination: { page: 1, total: 0, totalPages: 0 } },
      },
    };
  });
  render(
    <MemoryRouter initialEntries={["/operator/service-contact/supplier"]}>
      <Routes>
        <Route
          path="/operator/service-contact/:serviceKey"
          element={<ServiceContactPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByText("서비스 문의 관리");
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(screen.queryByRole("link", { name: "문의 알림 설정" })).toBeNull();
});

it("removes the settings link when admin access is revoked", async () => {
  state.user = { id: "revoked-admin", roles: ["supplier:admin"] };
  let allowed = true;
  state.get.mockImplementation(async (path: string) => {
    if (path.endsWith("/contact-settings")) {
      if (!allowed) throw { response: { status: 403 } };
      return { data: { success: true, data: { serviceKey: "supplier" } } };
    }
    return {
      data: {
        data: { items: [], pagination: { page: 1, total: 0, totalPages: 0 } },
      },
    };
  });
  render(
    <MemoryRouter initialEntries={["/operator/service-contact/supplier"]}>
      <Routes>
        <Route
          path="/operator/service-contact/:serviceKey"
          element={<ServiceContactPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole("link", { name: "문의 알림 설정" });
  allowed = false;
  window.dispatchEvent(new Event("focus"));
  await waitFor(() =>
    expect(screen.queryByRole("link", { name: "문의 알림 설정" })).toBeNull(),
  );
});
