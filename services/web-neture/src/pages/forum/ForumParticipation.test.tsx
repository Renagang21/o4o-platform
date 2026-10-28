import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
const m = vi.hoisted(() => ({
  read: vi.fn(),
  comments: vi.fn(),
  create: vi.fn(),
  like: vi.fn(),
  remove: vi.fn(),
  edit: vi.fn(),
  removeComment: vi.fn(),
  actor: "actor",
}));
vi.mock("../../contexts", () => ({
  useAuth: () => ({ user: { id: m.actor, roles: [] }, isAuthenticated: true }),
  useLoginModal: () => ({ openLoginModal: vi.fn() }),
}));
vi.mock("../../services/forumApi", async (original) => ({
  ...(await original<typeof import("../../services/forumApi")>()),
  fetchForumPostBySlug: m.read,
  fetchForumComments: m.comments,
  createForumComment: m.create,
  toggleForumPostLike: m.like,
  deleteForumPost: m.remove,
  updateForumComment: m.edit,
  deleteForumComment: m.removeComment,
}));
import ForumPostPage from "./ForumPostPage";
const base = "/communities/community/forum";
const post = (slug = "first") => ({
  id: slug,
  slug,
  title: `글 ${slug}`,
  content: "본문입니다.",
  type: "discussion",
  authorId: "actor",
  author: { id: "actor", name: "작성자" },
  createdAt: "2026-10-28",
  likeCount: 0,
  tags: [],
});
const comment = {
  id: "comment",
  content: "내 댓글",
  authorId: "actor",
  author: { id: "actor", name: "작성자" },
  createdAt: "2026-10-28",
};
function Location() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}
function Fixture() {
  return (
    <MemoryRouter initialEntries={[`${base}/post/first`]}>
      <Link to={`${base}/post/next`}>다른 글</Link>
      <Location />
      <Routes>
        <Route
          path={`${base}/post/:slug`}
          element={<ForumPostPage basePath={base} />}
        />
        <Route path={base} element={<p>목록 화면</p>} />
      </Routes>
    </MemoryRouter>
  );
}
function mount() {
  return render(<Fixture />);
}
beforeEach(() => {
  vi.resetAllMocks();
  m.actor = "actor";
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  m.read.mockImplementation(async (slug: string) => ({
    success: true,
    data: post(slug),
  }));
  m.comments.mockResolvedValue({ success: true, data: [] });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("댓글 조회 실패는 글 본문을 유지하고 조회만 재시도한다", async () => {
  m.comments
    .mockRejectedValueOnce(new Error("network"))
    .mockResolvedValue({ success: true, data: [comment] });
  mount();
  await screen.findByText("글 first");
  fireEvent.click(
    await screen.findByRole("button", { name: "댓글 다시 불러오기" }),
  );
  await screen.findByText("내 댓글");
  expect(m.comments).toHaveBeenCalledTimes(2);
  expect(m.create).not.toHaveBeenCalled();
});
it("댓글 작성 중 다른 글로 이동하면 입력과 늦은 응답을 격리한다", async () => {
  let release!: (v: unknown) => void;
  m.create.mockImplementation(
    () =>
      new Promise((r) => {
        release = r;
      }),
  );
  mount();
  fireEvent.change(await screen.findByPlaceholderText("댓글을 입력하세요..."), {
    target: { value: "이전 글의 댓글" },
  });
  fireEvent.click(screen.getByRole("button", { name: "댓글 작성" }));
  fireEvent.click(screen.getByRole("link", { name: "다른 글" }));
  await screen.findByText("글 next");
  expect(
    (screen.getByPlaceholderText("댓글을 입력하세요...") as HTMLTextAreaElement)
      .value,
  ).toBe("");
  await act(async () =>
    release({ success: true, data: { ...comment, content: "이전 응답" } }),
  );
  expect(screen.queryByText("이전 응답")).toBeNull();
});
it("다른 글로 이동한 뒤 완료된 삭제는 현재 화면을 이동시키지 않는다", async () => {
  let release!: (v: unknown) => void;
  m.remove.mockImplementation(
    () =>
      new Promise((r) => {
        release = r;
      }),
  );
  mount();
  fireEvent.click(
    await screen.findByRole("button", { name: "삭제", exact: true }),
  );
  fireEvent.click(screen.getByRole("link", { name: "다른 글" }));
  await screen.findByText("글 next");
  await act(async () => release({ success: true }));
  expect(screen.getByTestId("location").textContent).toBe(`${base}/post/next`);
});
it("댓글 수정 실패는 입력을 보존하고 오류를 표시하여 다시 저장할 수 있다", async () => {
  m.comments.mockResolvedValue({ success: true, data: [comment] });
  m.edit
    .mockResolvedValueOnce({
      success: false,
      error: "권한 또는 상태를 확인해 주세요.",
    })
    .mockResolvedValue({
      success: true,
      data: { ...comment, content: "수정 초안" },
    });
  mount();
  await screen.findByText("내 댓글");
  fireEvent.click(
    screen.getAllByRole("button", { name: "수정", exact: true })[1],
  );
  fireEvent.change(screen.getByDisplayValue("내 댓글"), {
    target: { value: "수정 초안" },
  });
  fireEvent.click(screen.getByRole("button", { name: "저장", exact: true }));
  await screen.findByRole("alert");
  expect(screen.getByDisplayValue("수정 초안")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "저장", exact: true }));
  await screen.findByText("수정 초안");
  expect(m.edit).toHaveBeenCalledTimes(2);
});
it("같은 글에서 계정이 바뀌면 이전 댓글 입력이 남지 않는다", async () => {
  const v = mount();
  fireEvent.change(await screen.findByPlaceholderText("댓글을 입력하세요..."), {
    target: { value: "이전 계정 내용" },
  });
  m.actor = "other";
  v.rerender(<Fixture />);
  expect(screen.queryByDisplayValue("이전 계정 내용")).toBeNull();
});
it("늦은 좋아요 응답은 다음 글의 상태를 바꾸지 않는다", async () => {
  let release!: (v: unknown) => void;
  m.like.mockImplementation(
    () =>
      new Promise((r) => {
        release = r;
      }),
  );
  mount();
  fireEvent.click(
    await screen.findByRole("button", { name: "좋아요", exact: true }),
  );
  fireEvent.click(screen.getByRole("link", { name: "다른 글" }));
  await screen.findByText("글 next");
  await act(async () =>
    release({ success: true, data: { likeCount: 9, isLiked: true } }),
  );
  expect(
    screen
      .getByRole("button", { name: "좋아요", exact: true })
      .getAttribute("aria-pressed"),
  ).toBe("false");
  expect(m.like).toHaveBeenCalledOnce();
});
it.each([{ isLocked: true }, { allowComments: false }])(
  "댓글 제한 상태에서는 작성 폼을 열지 않는다 (%j)",
  async (flags) => {
    m.read.mockResolvedValue({ success: true, data: { ...post(), ...flags } });
    mount();
    await screen.findByText("이 게시글은 댓글 작성이 제한되어 있습니다.");
    expect(screen.queryByPlaceholderText("댓글을 입력하세요...")).toBeNull();
    expect(m.create).not.toHaveBeenCalled();
  },
);
it("삭제 중 중복 클릭은 요청을 반복하지 않는다", async () => {
  let release!: (v: unknown) => void;
  m.remove.mockImplementation(
    () =>
      new Promise((r) => {
        release = r;
      }),
  );
  mount();
  const b = await screen.findByRole("button", { name: "삭제", exact: true });
  fireEvent.click(b);
  fireEvent.click(b);
  expect(m.remove).toHaveBeenCalledOnce();
  await act(async () => release({ success: true }));
  await screen.findByText("목록 화면");
});

it("댓글 재조회와 새 댓글 작성을 직렬화하여 늦은 조회의 덮어쓰기를 막는다", async () => {
  let release!: (value: unknown) => void;
  m.comments
    .mockRejectedValueOnce(new Error("조회 실패"))
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
  m.create.mockResolvedValue({
    success: true,
    data: { ...comment, content: "새 댓글" },
  });
  mount();
  fireEvent.click(
    await screen.findByRole("button", { name: "댓글 다시 불러오기" }),
  );
  fireEvent.change(screen.getByPlaceholderText("댓글을 입력하세요..."), {
    target: { value: "새 댓글" },
  });
  const submit = screen.getByRole("button", { name: "댓글 조회 중..." });
  expect((submit as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(submit);
  expect(m.create).not.toHaveBeenCalled();
  await act(async () => release({ success: true, data: [] }));
  fireEvent.click(screen.getByRole("button", { name: "댓글 작성" }));
  await screen.findByText("새 댓글");
  expect(m.create).toHaveBeenCalledOnce();
});
it("새 댓글 작성 중 재조회 버튼은 기존 작성 요청을 방해하지 않는다", async () => {
  let release!: (value: unknown) => void;
  m.comments.mockRejectedValueOnce(new Error("조회 실패"));
  m.create.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  mount();
  const retry = await screen.findByRole("button", {
    name: "댓글 다시 불러오기",
  });
  fireEvent.change(screen.getByPlaceholderText("댓글을 입력하세요..."), {
    target: { value: "새 댓글" },
  });
  fireEvent.click(screen.getByRole("button", { name: "댓글 작성" }));
  expect((retry as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(retry);
  expect(m.comments).toHaveBeenCalledOnce();
  await act(async () =>
    release({ success: true, data: { ...comment, content: "새 댓글" } }),
  );
  expect(
    (screen.getByPlaceholderText("댓글을 입력하세요...") as HTMLTextAreaElement)
      .value,
  ).toBe("");
  expect((retry as HTMLButtonElement).disabled).toBe(false);
});
