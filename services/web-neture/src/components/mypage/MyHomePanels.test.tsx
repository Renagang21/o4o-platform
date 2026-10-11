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
  MyHomeStoreParticipation,
} from "./MyHomePanels";
import type { HomeEntryData } from "../../lib/home-entry";
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../../lib/api/communityOperator", () => ({
  listOperatedCommunities: () => Promise.resolve([]),
}));
vi.mock("../../lib/apiClient", () => ({ api: { get: (path: string, ...args: unknown[]) => path === "/neture/pharmacy/semi-franchises"
  ? Promise.resolve({ data: { success: true, data: [] } }) : get(path, ...args) } }));
afterEach(cleanup);
beforeEach(() => {
  get.mockReset();
  sessionStorage.clear();
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
    success: true,
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
  it("offers store participation in Services without requesting management analytics", async () => {
    render(wrap(<MyHomeStoreParticipation accountId="owner" data={stores} />));
    await screen.findByText("운영 중인 약국 협력사업에 표시할 참여 기록이 없습니다.");
    expect(screen.getByLabelText("참여 현황을 볼 매장")).toBeTruthy();
    expect(screen.queryByText("QR 방문 현황")).toBeNull();
    expect(get).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("참여 현황을 볼 매장"), { target: { value: "second" } });
    expect(JSON.parse(sessionStorage.getItem("o4o_my_home_store")!).organizationId).toBe("second");
  });
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
        success: true,
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
      params: { author: "me", page: 1, limit: 10 },
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
          success: true,
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
                total: 1,
                page: 1,
                limit: 5,
                totalPages: 1,
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
  it("pages and filters notifications on the server without caller identity", async () => {
    get.mockImplementation((path, options) =>
      Promise.resolve({
        data: {
          success: true,
          data: path.endsWith("unread-count")
            ? { count: 12 }
            : {
                notifications: [
                  {
                    id: `n${options.params.page}`,
                    title: `알림 ${options.params.page}`,
                    isRead: false,
                    createdAt: "2026-10-01",
                  },
                ],
                total: 12,
                page: options.params.page,
                limit: options.params.limit,
                totalPages: Math.ceil(12 / options.params.limit),
              },
        },
      }),
    );
    render(wrap(<MyHomeNotifications accountId="normal" />));
    await screen.findByText("알림 1");
    fireEvent.click(screen.getByRole("button", { name: "알림 전체보기" }));
    await screen.findByText("1 / 2 페이지 · 12건");
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await screen.findByText("알림 2");
    fireEvent.change(screen.getByLabelText("알림 상태"), {
      target: { value: "unread" },
    });
    await screen.findByText("알림 1");
    expect(
      get.mock.calls
        .filter(([path]) => path === "/notifications")
        .map(([, options]) => options.params),
    ).toEqual([
      { page: 1, limit: 5 },
      { page: 1, limit: 10 },
      { page: 2, limit: 10 },
      { page: 1, limit: 10, isRead: false },
    ]);
  });
  it("does not let a late notification page overwrite a changed filter", async () => {
    let resolve!: (value: unknown) => void;
    get.mockImplementation((path, options) => {
      if (path.endsWith("unread-count"))
        return Promise.resolve({ data: { success: true, data: { count: 1 } } });
      if (options.params.limit === 10 && options.params.isRead === undefined)
        return new Promise((r) => {
          resolve = r;
        });
      return Promise.resolve({
        data: {
          success: true,
          data: {
            notifications: [],
            total: 0,
            totalPages: 0,
            ...options.params,
          },
        },
      });
    });
    render(wrap(<MyHomeNotifications accountId="normal" />));
    await screen.findByText("도착한 알림이 없습니다.");
    fireEvent.click(screen.getByRole("button", { name: "알림 전체보기" }));
    fireEvent.change(screen.getByLabelText("알림 상태"), {
      target: { value: "unread" },
    });
    await screen.findByText("읽지 않은 알림이 없습니다.");
    resolve({
      data: {
        success: true,
        data: {
          notifications: [
            {
              id: "old",
              title: "늦은 알림",
              isRead: true,
              createdAt: "2026-10-01",
            },
          ],
          total: 1,
          totalPages: 1,
          page: 1,
          limit: 10,
        },
      },
    });
    await Promise.resolve();
    expect(screen.queryByText("늦은 알림")).toBeNull();
  });
  it("rejects failed notification envelopes instead of displaying an empty result", async () => {
    get.mockResolvedValue({
      data: {
        success: false,
        data: {
          count: 0,
          notifications: [],
          total: 0,
          totalPages: 0,
          page: 1,
          limit: 5,
        },
      },
    });
    render(wrap(<MyHomeNotifications accountId="normal" />));
    await screen.findByRole("alert");
    expect(screen.queryByText("도착한 알림이 없습니다.")).toBeNull();
  });
  it("pages community drafts with author=me and distinguishes an emptied later page", async () => {
    get.mockImplementation((path, options) =>
      Promise.resolve({
        data: {
          success: true,
          total: 11,
          data:
            options.params.page === 1
              ? [
                  {
                    id: "draft",
                    title: "작성 중인 글",
                    status: "draft",
                    createdAt: "2026-10-01",
                  },
                ]
              : [],
        },
      }),
    );
    render(
      wrap(
        <MyHomeActivity
          accountId="normal"
          data={{
            ...empty,
            communities: [
              {
                communityKey: "own",
                name: "내 커뮤니티",
                canParticipate: true,
                reason: null,
                entries: [],
              },
            ],
          }}
        />,
      ),
    );
    await screen.findByText("임시 저장");
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await screen.findByText("이 페이지에 작성 글이 없습니다.");
    expect(screen.queryByText("아직 작성한 글이 없습니다.")).toBeNull();
    expect(get).toHaveBeenLastCalledWith("/communities/own/forum/posts", {
      params: { author: "me", page: 2, limit: 10 },
    });
    expect(
      screen.getByRole("button", { name: "이전" }).hasAttribute("disabled"),
    ).toBe(false);
  });
  it("uses only returned dates in a sorted QR trend and keeps real zero visible", async () => {
    const response = stats(0);
    response.data.data.dailyScans = [
      { date: "2026-10-03", count: 4 },
      { date: "2026-10-01", count: 0 },
    ];
    get.mockResolvedValue(response);
    render(wrap(<MyHomeManagement accountId="owner" data={stores} />));
    await screen.findByText("일별 QR 방문 추이", { selector: "h3" });
    expect(
      [...document.querySelectorAll("ol time")].map((node) =>
        node.getAttribute("datetime"),
      ),
    ).toEqual(["2026-10-01", "2026-10-03"]);
    expect(screen.getByText("0건")).toBeTruthy();
    expect(screen.queryByText("10-02")).toBeNull();
  });
  it("rejects invalid statistic counts and dates instead of plotting them", async () => {
    const response = stats(1);
    response.data.data.dailyScans = [{ date: "2026-02-30", count: 1 }];
    get.mockResolvedValue(response);
    render(wrap(<MyHomeManagement accountId="owner" data={stores} />));
    await screen.findByRole("alert");
    expect(
      screen.queryByText("일별 QR 방문 추이", { selector: "h3" }),
    ).toBeNull();
    response.data.data.dailyScans = [];
    response.data.data.totalScans = -1;
    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
    await screen.findByRole("alert");
    expect(screen.queryByText("오늘 방문")).toBeNull();
  });
  it("retains a selected authorized store across views and rejects another account or removed store", async () => {
    get.mockResolvedValue(stats(1));
    const initial = render(
      wrap(<MyHomeManagement accountId="owner" data={stores} compact />),
    );
    fireEvent.change(screen.getByLabelText("통계를 볼 매장"), {
      target: { value: "second" },
    });
    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith(
        "/kpa/pharmacy/analytics/marketing",
        { headers: { "X-Store-Organization-Id": "second" } },
      ),
    );
    initial.unmount();
    const next = render(
      wrap(<MyHomeManagement accountId="owner" data={stores} />),
    );
    expect(
      (screen.getByLabelText("통계를 볼 매장") as HTMLSelectElement).value,
    ).toBe("second");
    next.rerender(wrap(<MyHomeManagement accountId="other" data={stores} />));
    expect(
      (screen.getByLabelText("통계를 볼 매장") as HTMLSelectElement).value,
    ).toBe("first");
    next.rerender(
      wrap(
        <MyHomeManagement
          accountId="owner"
          data={{ ...stores, stores: stores.stores.slice(0, 1) }}
        />,
      ),
    );
    expect(
      (screen.getByLabelText("통계를 볼 매장") as HTMLSelectElement).value,
    ).toBe("first");
  });
});
