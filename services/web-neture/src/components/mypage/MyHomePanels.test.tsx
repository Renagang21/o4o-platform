import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  MyHomeActivity,
  MyHomeManagement,
  MyHomeNotifications,
} from "./MyHomePanels";
import type { HomeEntryData } from "../../lib/home-entry";
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../../lib/api/communityOperator", () => ({
  listOperatedCommunities: () => Promise.resolve([]),
}));
vi.mock("../../lib/apiClient", () => ({ api: { get } }));
afterEach(cleanup);
beforeEach(() => {
  get.mockReset();
});
const empty: HomeEntryData = {
  services: [],
  stores: [],
  branches: [],
  serviceStates: { supplier: { status: "none", source: "none" } },
  communities: [],
};
const stats = (n: number) => ({
  data: {
    data: {
      todayScans: n,
      weeklyScans: n + 1,
      totalScans: n + 2,
      activeQrCount: 1,
      dailyScans: [{ date: "2026-10-01", count: n }],
    },
  },
});
const stores = {
  ...empty,
  stores: ["first", "second"].map((id) => ({
    organizationId: id,
    serviceKey: "kpa-society",
    name: `매장 ${id}`,
    memberRole: "owner",
  })),
};
const wrap = (node: React.ReactNode) => <MemoryRouter>{node}</MemoryRouter>;
describe("My Home self-scoped data", () => {
  it("allows ordinary accounts without requesting store analytics", () => {
    render(wrap(<MyHomeManagement accountId="normal" data={empty} />));
    expect(
      screen.getByText(/현재 조회할 수 있는 매장 통계가 없습니다/),
    ).toBeTruthy();
    expect(get).not.toHaveBeenCalled();
  });
  it("keeps analytics scoped to selected stores and ignores the older reply", async () => {
    let resolve!: (result: ReturnType<typeof stats>) => void;
    get
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            resolve = r;
          }),
      )
      .mockResolvedValueOnce(stats(77));
    render(wrap(<MyHomeManagement accountId="owner" data={stores} />));
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "second" },
    });
    await screen.findByText("77", { selector: "dd" });
    resolve(stats(999));
    await Promise.resolve();
    expect(screen.queryByText("999", { selector: "dd" })).toBeNull();
    expect(
      get.mock.calls.map((c) => c[1].headers["X-Store-Organization-Id"]),
    ).toEqual(["first", "second"]);
  });
  it("shows failed statistics as an error, then retries with real zero values", async () => {
    get
      .mockRejectedValueOnce(new Error("denied"))
      .mockResolvedValueOnce(stats(0));
    render(wrap(<MyHomeManagement accountId="owner" data={stores} />));
    await screen.findByRole("alert");
    expect(screen.queryByText("오늘 방문")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
    await screen.findByText("0", { selector: "dd" });
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("requests only the authenticated author, within each accessible community", async () => {
    get.mockResolvedValue({
      data: {
        data: [
          {
            id: "p1",
            slug: "my-post",
            title: "내 작성 글",
            status: "publish",
            createdAt: "2026-10-01",
          },
        ],
        total: 1,
      },
    });
    const data = {
      ...empty,
      communities: [true, false].map((allowed, i) => ({
        communityKey: `c${i}`,
        name: `커뮤니티 ${i}`,
        canParticipate: allowed,
        reason: null,
        entries: [],
      })),
    };
    render(wrap(<MyHomeActivity accountId="normal" data={data} />));
    await screen.findByText("내 작성 글");
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("/communities/c0/forum/posts", {
      params: { author: "me", page: 1, limit: 5 },
    });
    expect(
      screen.getByRole("link", { name: "내 작성 글" }).getAttribute("href"),
    ).toBe("/communities/c0/forum/post/my-post");
  });
  it("does not confuse unavailable community history with an empty history", async () => {
    get.mockRejectedValue(new Error("unavailable"));
    render(
      wrap(
        <MyHomeActivity
          accountId="normal"
          data={{
            ...empty,
            communities: [
              {
                communityKey: "c",
                name: "C",
                canParticipate: true,
                reason: null,
                entries: [],
              },
            ],
          }}
        />,
      ),
    );
    await screen.findByRole("alert");
    expect(screen.queryByText("아직 작성한 글이 없습니다.")).toBeNull();
  });
  it("removes the previous account notifications immediately on an account change", async () => {
    get.mockImplementation((path: string) =>
      Promise.resolve({
        data: {
          data: path.endsWith("unread-count")
            ? { count: 1 }
            : {
                notifications: [
                  {
                    id: "n",
                    title: "첫 계정 알림",
                    isRead: false,
                    createdAt: "2026-10-01",
                  },
                ],
              },
        },
      }),
    );
    const { rerender } = render(
      wrap(<MyHomeNotifications accountId="first" />),
    );
    await screen.findByText("첫 계정 알림");
    get.mockImplementation(() => new Promise(() => {}));
    rerender(wrap(<MyHomeNotifications accountId="second" />));
    expect(screen.queryByText("첫 계정 알림")).toBeNull();
    await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());
  });
});
