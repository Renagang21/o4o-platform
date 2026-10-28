import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const mocks = vi.hoisted(() => ({ posts: vi.fn(), categories: vi.fn() }));
vi.mock("../../services/forumApi", () => ({
  fetchForumPosts: mocks.posts,
  fetchForumCategories: mocks.categories,
  normalizePostType: (type: string) => type,
  getAuthorName: () => "샘플 회원",
}));
import { ForumPage } from "./ForumPage";
const row = (n: number, type = "discussion", isPinned = false) => ({
  id: `p${n}`,
  slug: `post-${n}`,
  title: `샘플 글 ${n}`,
  type,
  isPinned,
  createdAt: "2026-10-28",
  commentCount: 0,
  likeCount: 0,
});
let rows: ReturnType<typeof row>[];
beforeEach(() => {
  vi.resetAllMocks();
  rows = [];
  mocks.categories.mockResolvedValue({ success: true, data: [] });
  mocks.posts.mockImplementation(async (params) => {
    const selected = rows.filter((p) => !params.type || p.type === params.type);
    return {
      success: true,
      data: selected.slice(
        (params.page - 1) * params.limit,
        params.page * params.limit,
      ),
      totalCount: selected.length,
    };
  });
});
afterEach(cleanup);
const mount = (query = "") =>
  render(
    <MemoryRouter
      initialEntries={[`/communities/community/forum/posts${query}`]}
    >
      <ForumPage basePath="/communities/community/forum" />
    </MemoryRouter>,
  );
it("searches types before pagination and counts matches beyond the first unfiltered page", async () => {
  rows = Array.from({ length: 40 }, (_, i) =>
    row(i + 1, i < 20 ? "discussion" : "question"),
  );
  mount("?q=샘플&type=question");
  expect(await screen.findByText("샘플 글 21")).toBeTruthy();
  expect(screen.getByText("검색 결과 20건")).toBeTruthy();
  expect(screen.queryByText("샘플 글 1")).toBeNull();
  expect(mocks.posts).toHaveBeenLastCalledWith(
    expect.objectContaining({ search: "샘플", type: "question", page: 1 }),
  );
});
it("keeps a pinned post visible when its type is selected", async () => {
  rows = [row(1, "question", true), row(2)];
  mount("?type=question");
  expect(await screen.findByText("샘플 글 1")).toBeTruthy();
  expect(screen.getByText("검색 결과 1건")).toBeTruthy();
  expect(screen.queryByText("샘플 글 2")).toBeNull();
});
it("never drops excess pinned rows or changes server totals between pages", async () => {
  rows = Array.from({ length: 40 }, (_, i) => row(i + 1, "discussion", i < 25));
  mount();
  await screen.findByText("샘플 글 1");
  expect(screen.getByText("샘플 글 20")).toBeTruthy();
  expect(screen.getByText("총 40개의 게시글")).toBeTruthy();
  expect(screen.getAllByRole("row")).toHaveLength(21); // One regular header, plus all twenty rows.
  fireEvent.click(screen.getByRole("button", { name: "다음 페이지" }));
  await screen.findByText("샘플 글 21");
  expect(screen.getByText("샘플 글 40")).toBeTruthy();
  expect(screen.getAllByRole("row")).toHaveLength(21);
  expect(screen.getByText("총 40개의 게시글")).toBeTruthy();
});
it("resets the page and preserves search when changing type", async () => {
  rows = Array.from({ length: 45 }, (_, i) => row(i + 1, "question"));
  mount("?q=샘플&page=2");
  await screen.findByText("샘플 글 21");
  fireEvent.click(screen.getByRole("button", { name: "질문", exact: true }));
  await screen.findByText("샘플 글 1");
  await waitFor(() =>
    expect(mocks.posts).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "샘플", type: "question", page: 1 }),
    ),
  );
  expect(screen.getByText("검색 결과 45건")).toBeTruthy();
});

it("does not describe a pinned-only page as an empty forum", async () => {
  rows = [row(1, "announcement", true), row(2, "question", true)];
  mount();
  await screen.findByText("샘플 글 1");
  expect(screen.getByText("샘플 글 2")).toBeTruthy();
  expect(screen.queryByText("아직 등록된 글이 없습니다")).toBeNull();
  expect(screen.getByText("총 2개의 게시글")).toBeTruthy();
});
