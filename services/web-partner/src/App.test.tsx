import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import App from "./App";
import {
  emptyWorkspace,
  loadWorkspace,
  saveWorkspace,
  STORAGE_KEY,
} from "./model";

const prepared = () => ({
  ...emptyWorkspace(),
  proposals: [
    {
      id: "p1",
      createdAt: "2026-01-01T00:00:00Z",
      title: "테스트 제안",
      business: "테스트 브랜드",
      category: "생활",
      channel: "인스타그램" as const,
      description: "제품 정보",
      destination: "https://example.com/item",
      contact: "",
    },
  ],
  creators: [
    {
      id: "c1",
      createdAt: "2026-01-01T00:00:00Z",
      name: "테스트 홍보자",
      channel: "유튜브" as const,
      topic: "제품 소개",
      portfolio: "",
    },
  ],
});
function open(page: string) {
  window.history.replaceState(null, "", `/#${page}`);
  return render(<App />);
}
function input(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function save() {
  fireEvent.submit(
    screen.getByRole("button", { name: "저장하기" }).closest("form")!,
  );
}
beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Partner의 독립 서비스 흐름", () => {
  it("복수 채널·언어·지역 프로필을 저장하고 추가 채널로 찾는다", () => {
    open("creators");
    input("활동 이름", "테스트 멀티 크리에이터");
    input("활동 분야·소개", "생활 콘텐츠");
    input(
      "추가 채널 (채널명 | 주소, 한 줄씩)",
      "유튜브 | https://example.com/channel",
    );
    input("활동 언어 (선택)", "한국어");
    input("활동 지역 (선택)", "지역 A");
    save();
    const c = loadWorkspace(localStorage).data.creators[0];
    expect(c.channelProfiles?.[0].channel).toBe("유튜브");
    expect(c.language).toBe("한국어");
    input("채널 필터", "유튜브");
    expect(
      screen.getByRole("heading", { name: "테스트 멀티 크리에이터" }),
    ).toBeTruthy();
  });
  it("분류·태그·템플릿으로 자료를 찾고 제작 도구에서 재사용한다", async () => {
    const w = prepared();
    w.assets = [
      {
        id: "a1",
        createdAt: "2026-01-01T00:00:00Z",
        title: "템플릿 자료",
        business: "테스트",
        channel: "라인",
        content: "확인된 제품 정보",
        url: "",
        usage: "직접 작성",
        folder: "제품",
        tags: ["새 자료"],
        isTemplate: true,
      },
      {
        id: "a2",
        createdAt: "2026-01-01T00:00:00Z",
        title: "일반 자료",
        business: "테스트",
        channel: "라인",
        content: "일반 내용",
        url: "",
        usage: "직접 작성",
        folder: "기타",
      },
    ];
    saveWorkspace(localStorage, w);
    open("library");
    input("자료 분류 필터", "제품");
    fireEvent.click(screen.getByRole("checkbox", { name: "템플릿만 보기" }));
    expect(screen.queryByRole("heading", { name: "일반 자료" })).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "제작 도구에서 활용 ↗" }),
    );
    await waitFor(() =>
      expect(
        (screen.getByLabelText("전달할 사실 정보") as HTMLTextAreaElement)
          .value,
      ).toBe("확인된 제품 정보"),
    );
  });
  it("비교 리포트에서 조회수 0과 미입력, 반응 합계를 구분한다", () => {
    const w = prepared();
    w.activities = [
      {
        id: "a1",
        createdAt: "2026-01-01T00:00:00Z",
        proposalId: "p1",
        creatorId: "c1",
        url: "https://example.com/one",
        publishedAt: "2026-01-01",
        views: 0,
        metrics: { likes: 2, comments: 1, shares: null, source: "import" },
      },
      {
        id: "a2",
        createdAt: "2026-01-01T00:00:00Z",
        proposalId: "p1",
        creatorId: "c1",
        url: "https://example.com/two",
        publishedAt: "2026-01-02",
        views: null,
      },
    ];
    saveWorkspace(localStorage, w);
    open("reports");
    const row = screen.getAllByRole("row")[1];
    expect(
      within(row)
        .getAllByRole("cell")
        .map((c) => c.textContent),
    ).toEqual(["테스트 제안", "2", "0", "3", "1"]);
  });
  it("서버 저장이 성공해야 화면에 반영하고 로컬에는 복사하지 않는다", async () => {
    window.history.replaceState(null, "", "/#creators");
    const saveRemote = vi.fn(async (workspace) => workspace);
    render(
      <App
        remote={{
          workspace: emptyWorkspace(),
          role: "owner",
          name: "테스트 공동공간",
          save: saveRemote,
        }}
      />,
    );
    input("활동 이름", "서버 홍보자");
    input("활동 분야·소개", "제품 소개");
    save();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "서버 홍보자" })).toBeTruthy(),
    );
    expect(saveRemote).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
  it("서버 충돌 시 입력을 지우거나 성공으로 표시하지 않는다", async () => {
    window.history.replaceState(null, "", "/#creators");
    render(
      <App
        remote={{
          workspace: emptyWorkspace(),
          role: "owner",
          name: "테스트 공동공간",
          save: async () => {
            throw new Error("변경 충돌");
          },
        }}
      />,
    );
    input("활동 이름", "작성 중인 홍보자");
    input("활동 분야·소개", "제품 소개");
    save();
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("변경 충돌"),
    );
    expect((screen.getByLabelText("활동 이름") as HTMLInputElement).value).toBe(
      "작성 중인 홍보자",
    );
    expect(
      screen.queryByRole("heading", { name: "작성 중인 홍보자" }),
    ).toBeNull();
  });
  it("열람자는 자료를 수정하지 못하고 편집자도 정산을 변경하지 못한다", () => {
    window.history.replaceState(null, "", "/#proposals");
    const view = render(
      <App
        remote={{
          workspace: prepared(),
          role: "viewer",
          name: "테스트",
          save: vi.fn(),
        }}
      />,
    );
    expect(screen.queryByRole("button", { name: "저장하기" })).toBeNull();
    expect(screen.queryByRole("button", { name: "수정" })).toBeNull();
    view.unmount();
    window.history.replaceState(null, "", "/#settlements");
    render(
      <App
        remote={{
          workspace: prepared(),
          role: "editor",
          name: "테스트",
          save: vi.fn(),
        }}
      />,
    );
    expect(screen.queryByRole("button", { name: "저장하기" })).toBeNull();
  });
  it("기록을 수정하되 ID와 생성 시각을 유지한다", () => {
    saveWorkspace(localStorage, prepared());
    open("creators");
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("활동 이름"), {
      target: { value: "수정한 이름" },
    });
    fireEvent.submit(
      within(dialog)
        .getByRole("button", { name: "변경 저장" })
        .closest("form")!,
    );
    const saved = loadWorkspace(localStorage).data.creators[0];
    expect(saved.name).toBe("수정한 이름");
    expect(saved.id).toBe("c1");
    expect(saved.createdAt).toBe(prepared().creators[0].createdAt);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("연결된 활동이 있는 제안을 삭제해 기록을 끊지 않는다", () => {
    const data = prepared();
    saveWorkspace(localStorage, {
      ...data,
      activities: [
        {
          id: "a1",
          createdAt: "2026-01-01T00:00:00Z",
          proposalId: "p1",
          creatorId: "c1",
          url: "https://example.com/post",
          publishedAt: "2026-01-01",
          views: null,
        },
      ],
    });
    open("proposals");
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(screen.getByRole("alert").textContent).toContain(
      "삭제할 수 없습니다",
    );
    expect(loadWorkspace(localStorage).data.proposals).toHaveLength(1);
  });
  it("빈 작업공간과 로컬 저장 범위를 보여준다", () => {
    open("home");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "홍보를 함께 만드는 공간",
    );
    expect(screen.getByText(/다른 사용자와의 공유/).textContent).toContain(
      "아직 연결되지 않았습니다",
    );
    expect(
      screen
        .getByRole("link", { name: "홍보 제안 살펴보기 ↗" })
        .getAttribute("href"),
    ).toBe("#proposals");
  });
  it("홍보 제안을 저장하고 검색·필터·새로고침으로 다시 찾는다", () => {
    const view = open("proposals");
    input("사업자·브랜드", "테스트 브랜드");
    input("홍보 제안 제목", "생활 제품 소개");
    input("활동 분야", "생활");
    input("제품·홍보 소개", "확인된 제품 정보");
    input("제품·서비스 주소", "https://example.com/item");
    save();
    expect(
      screen.getByRole("heading", { name: "생활 제품 소개" }),
    ).toBeTruthy();
    expect(loadWorkspace(localStorage).data.proposals).toHaveLength(1);
    input("검색", "없는 키워드");
    expect(screen.getByText("검색 결과가 없습니다")).toBeTruthy();
    input("검색", "");
    input("채널 필터", "유튜브");
    expect(
      screen.queryByRole("heading", { name: "생활 제품 소개" }),
    ).toBeNull();
    view.unmount();
    open("proposals");
    expect(
      screen.getByRole("heading", { name: "생활 제품 소개" }),
    ).toBeTruthy();
  });
  it("자료에 사용 범위를 필수로 남긴다", () => {
    open("library");
    input("자료 제목", "제품 안내");
    input("제공자·브랜드", "테스트 브랜드");
    input("내용·제품 정보", "제품 자료 본문");
    input("사용 범위·출처", "직접 제작 · 편집 가능");
    save();
    expect(loadWorkspace(localStorage).data.assets[0].usage).toBe(
      "직접 제작 · 편집 가능",
    );
    expect(screen.getByRole("heading", { name: "제품 안내" })).toBeTruthy();
  });
  it("입력한 초안을 편집해 자료실에 저장한다", () => {
    open("studio");
    input("제품·서비스 이름", "테스트 제품");
    input("제공자·브랜드", "테스트 브랜드");
    input("전달할 사실 정보", "보관은 서늘한 곳에");
    fireEvent.submit(
      screen.getByRole("button", { name: "구성안 만들기" }).closest("form")!,
    );
    input("구성안 편집", "직접 수정한 콘텐츠");
    fireEvent.click(screen.getByRole("button", { name: "자료실에 저장" }));
    expect(loadWorkspace(localStorage).data.assets[0].content).toBe(
      "직접 수정한 콘텐츠",
    );
  });
  it("링크를 생성하지만 측정되었다고 표시하지 않는다", () => {
    saveWorkspace(localStorage, prepared());
    open("studio");
    input("홍보 제안", "p1");
    input("홍보자", "c1");
    fireEvent.submit(
      screen.getByRole("button", { name: "홍보 링크 만들기" }).closest("form")!,
    );
    const link = new URL(
      (screen.getByLabelText("생성한 홍보 링크") as HTMLTextAreaElement).value,
    );
    expect(link.searchParams.get("utm_content")).toBe("c1");
    expect(
      screen.getByText(/클릭 집계와 전환 측정은 아직 연결되지 않았습니다/),
    ).toBeTruthy();
  });
  it("직접 입력한 활동의 출처와 조회수 0을 보존한다", () => {
    saveWorkspace(localStorage, prepared());
    open("activities");
    input("홍보 제안", "p1");
    input("홍보자", "c1");
    input("게시물 주소", "https://example.com/post");
    input("게시일", "2026-01-01");
    input("직접 확인한 조회수 (선택)", "0");
    save();
    expect(loadWorkspace(localStorage).data.activities[0].views).toBe(0);
    expect(
      screen.getByText("홍보자 입력 · 자동 검증하지 않은 정보"),
    ).toBeTruthy();
  });
  it("외부에서 합의한 금액을 기록하고 외부 지급 사실만 등록한다", () => {
    saveWorkspace(localStorage, prepared());
    open("settlements");
    input("홍보 제안", "p1");
    input("홍보자", "c1");
    input("지급 내역 설명", "활동비");
    input("당사자가 정한 금액 (원)", "25000");
    save();
    expect(loadWorkspace(localStorage).data.settlements[0].status).toBe(
      "recorded",
    );
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(
      screen.getByRole("button", { name: "외부 지급 내역 기록" }),
    );
    expect(loadWorkspace(localStorage).data.settlements[0].status).toBe(
      "recorded",
    );
    confirm.mockReturnValue(true);
    fireEvent.click(
      screen.getByRole("button", { name: "외부 지급 내역 기록" }),
    );
    const record = loadWorkspace(localStorage).data.settlements[0];
    expect(record.status).toBe("paid");
    expect(record.paidAt).not.toBeNull();
    expect(screen.getByRole("status").textContent).toContain(
      "실제 송금은 수행하지 않았습니다",
    );
  });
  it("손상된 원본 데이터를 덮어쓰지 않는다", () => {
    localStorage.setItem(STORAGE_KEY, "{broken");
    open("proposals");
    expect(screen.getByRole("alert").textContent).toContain("쓰기를 중지");
    expect(
      screen.getByRole("button", { name: "저장하기" }).matches(":disabled"),
    ).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("{broken");
  });
  it("저장 용량 부족 시 성공으로 표시하거나 화면에만 추가하지 않는다", () => {
    open("creators");
    input("활동 이름", "테스트 홍보자");
    input("활동 분야·소개", "생활");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    save();
    expect(screen.getByRole("alert").textContent).toContain(
      "저장하지 못했습니다",
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("heading", { name: "테스트 홍보자" })).toBeNull();
  });
  it("다른 탭의 새 자료를 오래된 화면에서 덮어쓰지 않는다", () => {
    open("creators");
    saveWorkspace(localStorage, prepared());
    input("활동 이름", "추가 홍보자");
    input("활동 분야·소개", "생활");
    save();
    expect(screen.getByRole("alert").textContent).toContain("다른 탭");
    expect(loadWorkspace(localStorage).data.creators).toHaveLength(1);
    expect(loadWorkspace(localStorage).data.creators[0].name).toBe(
      "테스트 홍보자",
    );
  });
});
