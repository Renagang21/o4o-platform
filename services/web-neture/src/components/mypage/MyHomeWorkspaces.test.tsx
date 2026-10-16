import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { User } from "../../contexts/AuthContext";
import type { HomeEntryData } from "../../lib/home-entry";
import { myHomePreferencesKey } from "../../lib/my-home-preferences";
const { resolve } = vi.hoisted(() => ({ resolve: vi.fn() }));
vi.mock("../../lib/home-entry", async (original) => ({
  ...(await original<typeof import("../../lib/home-entry")>()),
  resolveHomeEntryUrl: resolve,
}));
import { MyHomeWorkspaces } from "./MyHomeWorkspaces";
const user = (id = "account-a") =>
  ({ id, name: "합성 사용자", roles: [] }) as unknown as User;
const data = (): HomeEntryData => ({
  services: [],
  stores: [],
  branches: [],
  serviceStates: { supplier: { status: "none", source: "none" } },
  workspaceStores: [
    {
      organizationId: "store-a",
      organizationName: "합성 매장 A",
      memberRole: "owner",
    },
    {
      organizationId: "store-b",
      organizationName: "합성 매장 B",
      memberRole: "staff",
    },
  ],
  communities: [
    {
      communityKey: "common",
      name: "합성 커뮤니티",
      canParticipate: true,
      reason: null,
      entries: [{ serviceKey: "neture", path: "/community" }],
    },
  ],
});
const app = (
  d: HomeEntryData | null = data(),
  id = "account-a",
  extra = {},
) => (
  <MemoryRouter>
    <MyHomeWorkspaces
      user={user(id)}
      data={d}
      loading={false}
      error={null}
      onReload={vi.fn()}
      {...extra}
    />
  </MemoryRouter>
);
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("shows both stores and personal communities without a global store filter", () => {
  render(app());
  expect(screen.getByRole("button", { name: /합성 매장 A 매장/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /합성 매장 B 매장/ })).toBeTruthy();
  expect(
    screen.getByRole("link", { name: /합성 커뮤니티/ }).getAttribute("href"),
  ).toBe("/community");
  expect(screen.getByText(/매장 선택 화면에서/)).toBeTruthy();
});

it('lists an internal destination once when both workspace and service entries point to it', () => {
  const d = data();
  d.serviceStates.supplier.status = 'active';
  render(app(d));
  const links = screen.getAllByRole('link').filter(link => link.getAttribute('href')?.includes('/supplier'));
  expect(links).toHaveLength(1);
});

it('provides a useful empty state without asking a general member to open a store', () => {
  const d = data(); d.workspaceStores = []; d.communities = [];
  render(app(d));
  expect(screen.getByText(/현재 바로 이동할 수 있는 공간이 없습니다/)).toBeTruthy();
  expect(screen.getByRole('link', { name: /참여 서비스와 이용 상태/ })).toBeTruthy();
  expect(screen.queryByText(/매장 개설/)).toBeNull();
});

it("pins identifiers only, persists them on remount, and supports unpinning", () => {
  const { unmount } = render(app());
  fireEvent.click(screen.getByRole("button", { name: "합성 매장 B 즐겨찾기" }));
  const saved = JSON.parse(
    localStorage.getItem(myHomePreferencesKey("account-a"))!,
  );
  expect(saved).toEqual({ pinned: ["workspace-store:store-b"], recent: [] });
  unmount();
  render(app());
  expect(
    screen.getAllByRole("button", {
      name: "합성 매장 B 즐겨찾기",
      pressed: true,
    }),
  ).toHaveLength(2);
  fireEvent.click(
    screen.getAllByRole("button", { name: "합성 매장 B 즐겨찾기" })[0],
  );
  expect(
    JSON.parse(localStorage.getItem(myHomePreferencesKey("account-a"))!).pinned,
  ).toEqual([]);
});

it("limits pinned destinations without disabling removal of an existing pin", () => {
  const d = data();
  d.workspaceStores = [];
  d.communities = Array.from({ length: 7 }, (_, i) => ({
    communityKey: `c${i}`,
    name: `합성 모임 ${i}`,
    canParticipate: true,
    reason: null,
    entries: [{ serviceKey: "neture", path: `/community/${i}` }],
  }));
  render(app(d));
  for (let i = 0; i < 6; i++)
    fireEvent.click(
      screen
        .getAllByRole("button", { name: `합성 모임 ${i} 즐겨찾기` })
        .at(-1)!,
    );
  expect(
    (
      screen.getByRole("button", {
        name: "합성 모임 6 즐겨찾기",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(
    screen.getAllByRole("button", { name: "합성 모임 0 즐겨찾기" })[0],
  );
  expect(
    (
      screen.getByRole("button", {
        name: "합성 모임 6 즐겨찾기",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(false);
});

it("records internal navigation once and clears only recent history", () => {
  render(app());
  fireEvent.click(
    screen.getByRole("button", { name: "합성 커뮤니티 즐겨찾기" }),
  );
  fireEvent.click(
    screen.getAllByRole("link", { name: /합성 커뮤니티/ }).at(-1)!,
  );
  fireEvent.click(
    screen.getAllByRole("link", { name: /합성 커뮤니티/ }).at(-1)!,
  );
  expect(
    JSON.parse(localStorage.getItem(myHomePreferencesKey("account-a"))!).recent,
  ).toEqual(["community:common"]);
  fireEvent.click(screen.getByRole("button", { name: "최근 이동 지우기" }));
  expect(
    JSON.parse(localStorage.getItem(myHomePreferencesKey("account-a"))!),
  ).toEqual({ pinned: ["community:common"], recent: [] });
  expect(screen.queryByRole("heading", { name: "최근 이동" })).toBeNull();
});

it("never displays saved entries outside the currently allowed model", () => {
  localStorage.setItem(
    myHomePreferencesKey("account-a"),
    JSON.stringify({
      pinned: ["workspace-store:store-b", "forged:https://evil.test"],
      recent: ["workspace-store:store-b"],
    }),
  );
  const { rerender } = render(app());
  expect(
    screen.getAllByRole("button", { name: /합성 매장 B 매장/ }),
  ).toHaveLength(3);
  const revoked = data();
  revoked.workspaceStores = [revoked.workspaceStores![0]];
  rerender(app(revoked));
  expect(screen.queryByText("합성 매장 B")).toBeNull();
  expect(screen.queryByText(/evil/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "합성 매장 A 즐겨찾기" }));
  expect(
    JSON.parse(localStorage.getItem(myHomePreferencesKey("account-a"))!),
  ).toEqual({ pinned: ["workspace-store:store-a"], recent: [] });
});

it("isolates preferences and in-memory search between accounts", () => {
  const { rerender } = render(app());
  fireEvent.click(screen.getByRole("button", { name: "합성 매장 A 즐겨찾기" }));
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "없는 공간" },
  });
  rerender(app(data(), "account-b"));
  expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("");
  expect(
    screen.queryByRole("button", {
      name: "합성 매장 A 즐겨찾기",
      pressed: true,
    }),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "합성 매장 B 즐겨찾기" }));
  expect(
    JSON.parse(localStorage.getItem(myHomePreferencesKey("account-a"))!).pinned,
  ).toEqual(["workspace-store:store-a"]);
  expect(
    JSON.parse(localStorage.getItem(myHomePreferencesKey("account-b"))!).pinned,
  ).toEqual(["workspace-store:store-b"]);
});

it("searches names and restores destinations when search is cleared", () => {
  render(app());
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "매장 B" },
  });
  expect(screen.queryByText("합성 매장 A")).toBeNull();
  expect(screen.getByText("합성 매장 B")).toBeTruthy();
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "없음" },
  });
  expect(screen.getByText(/검색 결과가 없습니다/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "검색 지우기" }));
  expect(screen.getByText("합성 매장 A")).toBeTruthy();
});

it("keeps basic navigation usable when browser storage is blocked or corrupted", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  render(app());
  fireEvent.click(screen.getByRole("button", { name: "합성 매장 A 즐겨찾기" }));
  expect(screen.getByText(/현재 화면에서만 유지될 수/)).toBeTruthy();
  expect(
    screen.getAllByRole("button", {
      name: "합성 매장 A 즐겨찾기",
      pressed: true,
    }),
  ).toHaveLength(2);
  expect(screen.getByRole("link", { name: /합성 커뮤니티/ })).toBeTruthy();
});

it("handles malformed saved data without rendering forged navigation", () => {
  localStorage.setItem(myHomePreferencesKey("account-a"), "{");
  render(app());
  expect(screen.getByText(/설정을 읽거나 저장하지 못했습니다/)).toBeTruthy();
  expect(screen.getByText("합성 매장 A")).toBeTruthy();
});

it("shows a retry instead of stale saved links when the current model fails", () => {
  const reload = vi.fn();
  render(app(data(), "account-a", { error: "offline", onReload: reload }));
  expect(screen.queryByText("합성 매장 A")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
  expect(reload).toHaveBeenCalledOnce();
});

it("does not record failed handoff attempts and permits retry", async () => {
  resolve.mockRejectedValue(new Error("denied"));
  render(app());
  fireEvent.click(screen.getByRole("button", { name: /합성 매장 B 매장/ }));
  await screen.findByRole("alert");
  expect(resolve).toHaveBeenCalledWith({
    kind: "workspace",
    returnPath: "/select-store",
  });
  expect(localStorage.getItem(myHomePreferencesKey("account-a"))).toBeNull();
  expect(
    (
      screen.getByRole("button", {
        name: /합성 매장 B 매장/,
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(false);
});

it("discards a late handoff after the source account or access data changes", async () => {
  let finish!: (href: string) => void;
  resolve.mockImplementation(
    () =>
      new Promise<string>((r) => {
        finish = r;
      }),
  );
  const { rerender } = render(app());
  fireEvent.click(screen.getByRole("button", { name: /합성 매장 A 매장/ }));
  rerender(app(data(), "account-b"));
  finish("https://store.neture.co.kr/");
  await waitFor(() => expect(screen.queryByText(/이동 중/)).toBeNull());
  expect(localStorage.getItem(myHomePreferencesKey("account-a"))).toBeNull();
  expect(localStorage.getItem(myHomePreferencesKey("account-b"))).toBeNull();
});

it("applies other-tab changes for this account without accepting another account storage event", () => {
  render(app());
  const value = JSON.stringify({
    pinned: ["workspace-store:store-a"],
    recent: [],
  });
  fireEvent(
    window,
    new StorageEvent("storage", {
      key: myHomePreferencesKey("account-b"),
      newValue: value,
    }),
  );
  expect(
    screen.queryByRole("button", {
      name: "합성 매장 A 즐겨찾기",
      pressed: true,
    }),
  ).toBeNull();
  fireEvent(
    window,
    new StorageEvent("storage", {
      key: myHomePreferencesKey("account-a"),
      newValue: value,
    }),
  );
  expect(
    screen.getAllByRole("button", {
      name: "합성 매장 A 즐겨찾기",
      pressed: true,
    }),
  ).toHaveLength(2);
});
