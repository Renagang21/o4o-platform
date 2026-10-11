import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
const { auth, openLoginModal, entry } = vi.hoisted(() => ({
  auth: {
    user: {
      id: "first",
      name: "일반 회원",
      email: "fixture@example.test",
      roles: [] as string[],
    },
    isAuthenticated: true,
    isLoading: false,
  },
  openLoginModal: vi.fn(),
  entry: {
    data: {
      services: [],
      stores: [],
      branches: [],
      serviceStates: { supplier: { status: "none", source: "none" } },
    },
    loading: false,
    error: null,
    reload: vi.fn(),
  },
}));
vi.mock("../../contexts", () => ({ useAuth: () => auth }));
vi.mock("../../contexts/LoginModalContext", () => ({
  useLoginModal: () => ({ openLoginModal }),
}));
vi.mock("../../lib/hostProfile", () => ({ CURRENT_HOST_PROFILE: "main" }));
vi.mock("../../lib/apiClient", () => ({ api: { post: vi.fn() } }));
vi.mock("../../lib/home-entry", () => ({
  useHomeEntry: () => entry,
  buildHomeEntryModel: () => ({ myServices: [] }),
}));
vi.mock("../../components/home/HomeEntryPanel", () => ({
  default: () => <p>참여 서비스 목록</p>,
}));
vi.mock("../../components/mypage/MyHomePanels", () => ({
  MyHomeActivity: () => <p>본인 커뮤니티 활동</p>,
  MyHomeManagement: () => <p>권한 있는 매장 통계</p>,
  MyHomeNotifications: () => <p>본인 알림</p>,
  ResourceNotice: () => <p>재시도 안내</p>,
}));
import MyPageHub from "./MyPageHub";
afterEach(cleanup);
beforeEach(() => {
  sessionStorage.clear();
  auth.user.id = "first";
  auth.isAuthenticated = true;
  auth.isLoading = false;
  openLoginModal.mockClear();
});
const app = (path = "/mypage") => (
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/mypage" element={<MyPageHub />} />
      <Route path="/mypage/activity" element={<MyPageHub view="activity" />} />
    </Routes>
  </MemoryRouter>
);
it("offers a personal home without requiring a store role or a service membership", () => {
  render(app());
  expect(
    screen.getByRole("heading", { name: "My Home", exact: true }),
  ).toBeTruthy();
  for (const name of [
    "모아보기",
    "참여 서비스",
    "커뮤니티 활동",
    "경영 현황",
    "계정 설정",
  ])
    expect(screen.getAllByRole("link", { name }).length).toBeGreaterThan(0);
  expect(screen.getByText("본인 알림")).toBeTruthy();
});
it("keeps the previous service across personal subviews, but never carries it into another account", () => {
  const { rerender } = render(app("/mypage?from=store"));
  expect(
    screen
      .getByRole("link", { name: "매장 관리로 돌아가기" })
      .getAttribute("href"),
  ).toBe("https://store.neture.co.kr");
  fireEvent.click(screen.getAllByRole("link", { name: "커뮤니티 활동" })[0]);
  expect(screen.getByText("본인 커뮤니티 활동")).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "매장 관리로 돌아가기" }),
  ).toBeTruthy();
  auth.user.id = "second";
  rerender(app("/mypage?from=store"));
  expect(
    screen.queryByRole("link", { name: "매장 관리로 돌아가기" }),
  ).toBeNull();
});
it.each(["https://evil.test", "__proto__", "constructor", "toString"])(
  "rejects arbitrary return context %s",
  (source) => {
    render(app(`/mypage?from=${encodeURIComponent(source)}`));
    expect(screen.queryByRole("link", { name: /로 돌아가기/ })).toBeNull();
  },
);
it("waits for authentication bootstrap before showing a login prompt", () => {
  auth.isLoading = true;
  auth.isAuthenticated = false;
  render(app());
  expect(screen.queryByRole("button", { name: "로그인" })).toBeNull();
  expect(screen.getByText(/My Home을 불러오는 중/)).toBeTruthy();
});
it("login returns to the requested personal path", () => {
  auth.isAuthenticated = false;
  render(app("/mypage?from=study"));
  fireEvent.click(screen.getByRole("button", { name: "로그인" }));
  expect(openLoginModal).toHaveBeenCalledWith("/mypage?from=study");
});
