import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
