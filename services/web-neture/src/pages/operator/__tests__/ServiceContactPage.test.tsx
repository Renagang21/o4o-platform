import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
