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
    ).toEqual(["공지사항", "약업계 주요 소식", "O4O 개선·업데이트", "포럼", "콘텐츠", "자료실"]);
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
  it("refreshes collected news without discarding an in-progress editorial draft", async () => {
    api.manage.mockResolvedValue({ items: [], hasNext: false });
    let finish!: (value: any) => void;
    api.collect.mockImplementationOnce(
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
        screen.getByText("오늘의 기사 수집").hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(screen.getByText("오늘의 기사 수집"));
    fireEvent.change(screen.getByLabelText("제목"), {
      target: { value: "편집 중인 제목" },
    });
    finish({
      day: "2026-10-23",
      state: "done",
      sources: [{ id: "kpanews", added: 2, status: "ok" }],
    });
    await screen.findByText("약사공론: 신규 2개");
    await waitFor(() => expect(api.manage).toHaveBeenCalledTimes(3));
    expect((screen.getByLabelText("제목") as HTMLInputElement).value).toBe(
      "편집 중인 제목",
    );
  });
});
