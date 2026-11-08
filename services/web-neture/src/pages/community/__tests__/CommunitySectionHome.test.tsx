import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const api = vi.hoisted(() => ({
  home: vi.fn(),
  manage: vi.fn(),
  save: vi.fn(),
  forum: vi.fn(),
  pinForum: vi.fn(),
  autoRuns: vi.fn().mockResolvedValue([]),
  runAutoNews: vi.fn(),
  newsEngagement: vi.fn().mockResolvedValue({}),
  review: vi.fn().mockResolvedValue(null),
  collection: vi.fn().mockResolvedValue(null),
  collect: vi.fn(),
  runReview: vi.fn(),
}));
vi.mock("../../../contexts", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("../communityHomeApi", async () => ({
  ...(await vi.importActual("../communityHomeApi")),
  homeApi: api,
}));
vi.mock("@o4o/shared-space-ui", () => ({
  ServiceHomeHero: () => <div data-testid="community-hero" />,
  ServiceHomePromotion: () => <div data-testid="community-promotion" />,
}));
import Home from "../CommunityHostHomePage";
import Management from "../CommunityHomeManagementPage";
const item = (id: string, title = id) => ({
  id,
  title,
  createdAt: "2026-10-19T00:00:00Z",
  isPinned: false,
  kind: "content",
  status: "published",
  audience: "public",
});
const fixture = () => ({
  member: false,
  ...Object.fromEntries(
    ["notice", "news", "forum", "content", "resource"].map((k) => [
      k,
      {
        pinned: [
          {
            ...item(`${k}-pin`),
            isPinned: true,
            linkUrl:
              k === "news" ? "https://www.kpanews.co.kr/article/1" : undefined,
          },
        ],
        recent: Array.from({ length: 10 }, (_, i) => item(`${k}-${i}`)),
      },
    ]),
  ),
});
const mount = (component: React.ReactNode) =>
  render(<MemoryRouter>{component}</MemoryRouter>);
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());
describe("community section home", () => {
  it("renders notices and news together, then forum/content/resources, pins separately and real destinations", async () => {
    api.home.mockResolvedValue(fixture());
    mount(<Home />);
    await screen.findByText("notice-pin");
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((x) => x.textContent),
    ).toEqual(["공지사항", "약업계 주요 소식", "O4O 개선·업데이트", "포럼", "콘텐츠", "디지털사이니지", "자료실"]);
    expect(screen.getByRole('link', {name:'영상 보기·AI로 등록 →'}).getAttribute('href')).toBe('/communities/community/signage');
    expect(screen.getByRole("link", { name: "업데이트 확인·개선 요청 →" }).getAttribute("href")).toBe("/improvements");
    const content = screen.getByRole("region", { name: "콘텐츠" });
    expect(within(content).getAllByRole("listitem")).toHaveLength(11);
    expect(within(content).getByText("상시 노출")).toBeTruthy();
    expect(screen.getByText("forum-0").getAttribute("href")).toContain(
      "/public/post/",
    );
    expect(screen.getByText("content-0").getAttribute("href")).toBe(
      "/communities/community/content/content-0",
    );
    expect(screen.getByText("news-pin ↗").getAttribute("target")).toBe(
      "_blank",
    );
    expect(screen.getByTestId("community-hero")).toBeTruthy();
    expect(screen.getByTestId("community-promotion")).toBeTruthy();
    expect(screen.queryByText("게시판 만들기")).toBeNull();
    expect(screen.queryByText("가입 신청")).toBeNull();
  });
  it("shows loading, explicit fetch error and working retry", async () => {
    api.home.mockRejectedValueOnce(Error()).mockResolvedValueOnce(fixture());
    mount(<Home />);
    expect(screen.getByRole("status")).toBeTruthy();
    await screen.findByRole("alert");
    fireEvent.click(screen.getByText("다시 시도"));
    await screen.findByText("notice-pin");
    expect(api.home).toHaveBeenCalledTimes(2);
  });
  it("keeps all sections and shortcuts when no entries are readable", async () => {
    const data = fixture();
    for (const k of ["notice", "news", "forum", "content", "resource"])
      data[k] = { pinned: [], recent: [] };
    api.home.mockResolvedValue(data);
    mount(<Home />);
    expect(
      await screen.findAllByText("현재 열람 가능한 항목이 없습니다."),
    ).toHaveLength(5);
    expect(screen.getByText("약사공론 바로가기 ↗")).toBeTruthy();
  });
  it("operator can edit and save pin/order/publication without destructive controls", async () => {
    api.manage.mockResolvedValue({
      items: [
        {
          ...item("one", "운영 공지"),
          kind: "notice",
          isPinned: true,
          sortOrder: 1,
        },
      ],
      hasNext: false,
      page: 1,
    });
    api.save.mockResolvedValue({});
    mount(<Management />);
    fireEvent.click(await screen.findByText("운영 공지"));
    fireEvent.change(screen.getByLabelText("제목"), {
      target: { value: "수정 공지" },
    });
    fireEvent.change(screen.getByLabelText("표시 순서 (작은 숫자 먼저)"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByText("저장"));
    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith(
        "one",
        expect.objectContaining({
          title: "수정 공지",
          isPinned: true,
          sortOrder: 2,
        }),
      ),
    );
    expect(screen.queryByText("완전 삭제")).toBeNull();
  });
  it("shows server pin limit rejection without claiming save success", async () => {
    api.manage.mockResolvedValue({ items: [], hasNext: false, page: 1 });
    api.save.mockRejectedValue({
      response: { data: { error: "상시 노출은 분류별 최대 2개입니다." } },
    });
    mount(<Management />);
    await screen.findByText("등록된 항목이 없습니다.");
    fireEvent.change(screen.getByLabelText("제목"), {
      target: { value: "공지" },
    });
    fireEvent.click(screen.getByText("저장"));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "최대 2개",
    );
    expect(screen.queryByText("저장했습니다.")).toBeNull();
  });
  it("news registration offers source link without article body input", async () => {
    api.manage.mockResolvedValue({ items: [], hasNext: false, page: 1 });
    mount(<Management />);
    await screen.findByText("등록된 항목이 없습니다.");
    fireEvent.click(screen.getByRole("button", { name: "약업계 주요 소식" }));
    await screen.findByLabelText("기사 원문 URL (약사공론·데일리팜·메디파나)");
    expect(screen.queryByLabelText("본문")).toBeNull();
  });

  it("pages the operator list so older records remain editable", async () => {
    api.manage
      .mockResolvedValueOnce({
        items: [item("new", "최근 공지")],
        hasNext: true,
        page: 1,
      })
      .mockResolvedValueOnce({
        items: [item("old", "이전 공지")],
        hasNext: false,
        page: 2,
      });
    mount(<Management />);
    await screen.findByText("최근 공지");
    fireEvent.click(screen.getByRole("button", { name: "다음 항목" }));
    await screen.findByText("이전 공지");
    expect(api.manage).toHaveBeenLastCalledWith("notice", 2);
    fireEvent.click(screen.getByText("이전 공지"));
    expect((screen.getByLabelText("제목") as HTMLInputElement).value).toBe(
      "이전 공지",
    );
  });
  it("searches forum titles and pins a selected result without technical IDs", async () => {
    api.manage.mockResolvedValue({ items: [], hasNext: false, page: 1 });
    api.forum.mockResolvedValue({
      pinned: [],
      recent: [{ ...item("old-post", "지난 포럼 글"), slug: "old-post" }],
      hasNext: false,
      page: 1,
    });
    api.pinForum.mockResolvedValue({});
    mount(<Management />);
    await screen.findByText("등록된 항목이 없습니다.");
    fireEvent.click(screen.getByRole("button", { name: "포럼", exact: true }));
    await screen.findByLabelText("게시글 제목 검색");
    expect(screen.queryByLabelText("게시글 ID")).toBeNull();
    fireEvent.change(screen.getByLabelText("게시글 제목 검색"), {
      target: { value: "지난" },
    });
    fireEvent.click(screen.getByRole("button", { name: "검색", exact: true }));
    await waitFor(() => expect(api.forum).toHaveBeenLastCalledWith(1, "지난"));
    await screen.findByText("지난 포럼 글");
    fireEvent.click(
      screen.getByRole("button", { name: "상시 노출", exact: true }),
    );
    await waitFor(() =>
      expect(api.pinForum).toHaveBeenCalledWith("old-post", true),
    );
  });
  it("refreshes auto-published news without discarding an in-progress editorial draft", async () => {
    api.manage.mockResolvedValue({ items: [], hasNext: false });
    let finish!: (value: any) => void;
    api.runAutoNews.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    mount(<Management />);
    fireEvent.click(
      screen.getByRole("button", { name: "약업계 주요 소식", exact: true }),
    );
    await waitFor(() =>
      expect(
        screen.getByText("이번 시간대 수동 실행").hasAttribute("disabled"),
      ).toBe(false),
    );
    expect(screen.queryByText("오늘의 기사 수집")).toBeNull();
    expect(screen.queryByText("오늘의 초안 정리")).toBeNull();
    fireEvent.click(screen.getByText("이번 시간대 수동 실행"));
    fireEvent.change(screen.getByLabelText("제목"), {
      target: { value: "편집 중인 제목" },
    });
    api.autoRuns.mockResolvedValueOnce([
      {
        id: "run",
        day: "2026-11-07",
        window: "morning",
        state: "partial",
        trigger: "manual",
        ai: "done",
        candidates: 120,
        clusters: 30,
        published: 8,
        swapped: 0,
        suppressed: 1,
        startedAt: "2026-11-06T23:00:00Z",
        finishedAt: "2026-11-06T23:01:00Z",
        sources: [
          { id: "kpanews", status: "ok", fetched: 50, added: 40, duplicates: 1, outOfWindow: 9 },
          { id: "dailypharm", status: "ROBOTS_BLOCKED", fetched: 0, added: 0, duplicates: 0, outOfWindow: 0 },
        ],
      },
    ]);
    finish({ id: "run" });
    // Standard list: check the run, then open its detail from the ActionBar.
    const row = (await screen.findByText("2026-11-07 오전 · 수동")).closest("tr")!;
    expect(within(row).getByText("일부 매체 실패")).toBeTruthy();
    fireEvent.click(within(row).getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /상세 보기/ }));
    await screen.findByText(/약사공론: 수신 50건/);
    expect(screen.getByText("데일리팜: 수집 실패 (ROBOTS_BLOCKED)")).toBeTruthy();
    await waitFor(() => expect(api.manage).toHaveBeenCalledTimes(3));
    expect((screen.getByLabelText("제목") as HTMLInputElement).value).toBe(
      "편집 중인 제목",
    );
  });
  it("marks auto-published news in the operator list and keeps it editable", async () => {
    api.manage.mockImplementation(async (kind: string) => ({
      items:
        kind === "news"
          ? [
              {
                ...item("auto", "자동 기사"),
                kind: "news",
                autoPublished: true,
                expiresAt: "2020-01-01T00:00:00Z",
              },
            ]
          : [],
      hasNext: false,
      page: 1,
    }));
    mount(<Management />);
    fireEvent.click(
      screen.getByRole("button", { name: "약업계 주요 소식", exact: true }),
    );
    expect(
      (await screen.findByText(/자동 게시 · 노출 기간 종료/)).textContent,
    ).toContain("자동 게시");
  });
  it("reports news impressions and clicks only for auto-published items, by home position", async () => {
    const data = fixture();
    data.news = {
      pinned: [
        {
          ...item("news-manual"),
          isPinned: true,
          linkUrl: "https://www.kpanews.co.kr/news/articleView.html?idxno=1",
        },
      ],
      recent: [
        {
          ...item("news-auto-a"),
          autoPublished: true,
          linkUrl: "https://www.kpanews.co.kr/news/articleView.html?idxno=2",
        },
        {
          ...item("news-auto-b"),
          autoPublished: true,
          linkUrl: "https://www.medipana.com/news/articleView.html?idxno=3",
        },
      ],
    };
    api.home.mockResolvedValue(data);
    mount(<Home />);
    const link = await screen.findByText("news-auto-b ↗");
    await waitFor(() =>
      expect(api.newsEngagement).toHaveBeenCalledWith("impression", [
        { contentId: "news-auto-a", position: 2 },
        { contentId: "news-auto-b", position: 3 },
      ]),
    );
    expect(api.newsEngagement).toHaveBeenCalledTimes(1);
    fireEvent.click(link);
    await waitFor(() =>
      expect(api.newsEngagement).toHaveBeenLastCalledWith("click", [
        { contentId: "news-auto-b", position: 3 },
      ]),
    );
    fireEvent.click(screen.getByText("news-manual ↗"));
    expect(api.newsEngagement).toHaveBeenCalledTimes(2);
  });
  it("keeps the home working when a beacon fails and sends none without auto items", async () => {
    api.newsEngagement.mockRejectedValue(Error("offline"));
    api.home.mockResolvedValue(fixture());
    mount(<Home />);
    await screen.findByText("news-pin ↗");
    expect(api.newsEngagement).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("news-pin ↗"));
    expect(api.newsEngagement).not.toHaveBeenCalled();
  });
});
