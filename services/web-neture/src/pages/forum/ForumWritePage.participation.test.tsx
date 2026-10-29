import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Link, MemoryRouter } from "react-router-dom";
const m = vi.hoisted(() => ({
  read: vi.fn(),
  categories: vi.fn(),
  contacts: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
}));
vi.mock("../../contexts", () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: "actor" } }),
  useLoginModal: () => ({ openLoginModal: vi.fn() }),
}));
vi.mock("../../lib/api", () => ({ supplierApi: { getLibraryItem: vi.fn() } }));
vi.mock("../../services/forumApi", () => ({
  fetchForumPostBySlug: m.read,
  fetchForumCategories: m.categories,
  fetchUserContactSettings: m.contacts,
  updateForumPost: m.update,
  createForumPost: m.create,
}));
vi.mock("@o4o/content-editor", () => ({
  RichTextEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: { html: string }) => void;
  }) => (
    <textarea
      aria-label="본문"
      value={value}
      onChange={(e) => onChange({ html: e.target.value })}
    />
  ),
  ContentRenderer: () => null,
}));
import { ForumWritePage } from "./ForumWritePage";
const base = "/communities/community/forum";
const post = (id = "a", authorId = "actor") => ({
  id,
  title: `글 ${id}`,
  slug: id,
  authorId,
  content: "충분히 긴 테스트 본문입니다.",
  status: "publish",
});
function mount(search = "?edit=a") {
  return render(
    <MemoryRouter initialEntries={[`${base}/write${search}`]}>
      <Link to={`${base}/write?edit=b`}>다음 편집</Link>
      <ForumWritePage
        communityLabel="커뮤니티"
        categorySlug=""
        backPath={base}
      />
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  m.contacts.mockResolvedValue(null);
  m.categories.mockResolvedValue({
    data: [{ id: "board", slug: "board", name: "게시판", tags: [] }],
  });
  m.read.mockImplementation(async (id: string) => ({
    success: true,
    data: post(id),
  }));
  m.update.mockResolvedValue({ success: true, data: { slug: "a" } });
});
afterEach(cleanup);
it("편집 조회 실패는 제출 폼 대신 재조회를 제공한다", async () => {
  m.read.mockRejectedValueOnce(new Error("failed"));
  mount();
  await screen.findByText("게시글을 불러오지 못했습니다.");
  expect(screen.queryByRole("button", { name: "수정하기" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "게시글 다시 불러오기" }));
  await screen.findByDisplayValue("글 a");
  expect(m.update).not.toHaveBeenCalled();
});
it("늦게 도착한 이전 편집 조회는 현재 편집 글을 덮어쓰지 않는다", async () => {
  let release!: (v: unknown) => void;
  m.read.mockImplementationOnce(
    () =>
      new Promise((r) => {
        release = r;
      }),
  );
  mount();
  fireEvent.click(screen.getByRole("link", { name: "다음 편집" }));
  await screen.findByDisplayValue("글 b");
  await act(async () => release({ success: true, data: post("a") }));
  expect(screen.queryByDisplayValue("글 a")).toBeNull();
  expect(screen.getByDisplayValue("글 b")).toBeTruthy();
});
it("지정한 게시판이 없으면 다른 게시판으로 자동 제출하지 않는다", async () => {
  mount("?forum=missing");
  await waitFor(() => expect(m.categories).toHaveBeenCalled());
  fireEvent.change(screen.getByPlaceholderText("제목을 입력하세요"), {
    target: { value: "새 글" },
  });
  fireEvent.change(screen.getByLabelText("본문"), {
    target: { value: "충분히 긴 테스트 본문입니다." },
  });
  fireEvent.click(screen.getByRole("button", { name: "등록하기" }));
  await screen.findByText(/게시판을 확인할 수 없습니다/);
  expect(m.create).not.toHaveBeenCalled();
});
it("다른 회원의 글은 읽을 수 있어도 편집 제출을 열지 않는다", async () => {
  m.read.mockResolvedValue({ success: true, data: post("a", "other") });
  mount();
  await screen.findByText("본인이 작성한 게시글만 수정할 수 있습니다.");
  expect(screen.queryByRole("button", { name: "수정하기" })).toBeNull();
  expect(m.update).not.toHaveBeenCalled();
});
