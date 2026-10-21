import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MemberForum } from "./MemberForum";
const root = "/communities/business%3Acoop-one";
function client() {
  return {
    get: vi.fn(async (path: string) => ({
      data: {
        data: path.startsWith("/neture/")
          ? { key: "coop-one", communityKey: "business:coop-one" }
          : path.endsWith("/categories")
            ? [{ id: "board", name: "회원 이야기" }]
            : path.endsWith("/posts/post")
              ? { id: "post", title: "우리 소식", content: "본문 내용" }
              : [{ id: "post", title: "우리 소식" }],
        pagination: { totalPages: 2 },
      },
    })),
    post: vi.fn(async () => ({ data: { success: true } })),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
}
afterEach(cleanup);
const open = (
  api: ReturnType<typeof client>,
  manage = false,
  path = "/one/community",
  boardsOnly = false,
) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <MemberForum
        client={api}
        businessKey="coop-one"
        canManage={manage}
        boardsOnly={boardsOnly}
      />
    </MemoryRouter>,
  );
describe("cooperative business forum", () => {
  it("uses the actual business community binding for list, detail and pagination", async () => {
    const api = client();
    open(api);
    fireEvent.click(await screen.findByRole("button", { name: "다음" }));
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith(
        `${root}/forum/posts?page=2&limit=20`,
      ),
    );
    fireEvent.click(await screen.findByRole("button", { name: "우리 소식" }));
    expect(await screen.findByText("본문 내용")).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith(`${root}/forum/posts/post`);
    expect(screen.queryByText("조합 게시판 개설")).toBeNull();
  });
  it("submits a selected board and preserves a failed draft", async () => {
    const api = client();
    api.post.mockRejectedValueOnce({
      response: { data: { error: "참여 자격이 변경됐습니다." } },
    });
    open(api);
    await screen.findByText("조합원 글쓰기");
    fireEvent.change(screen.getByLabelText("게시판"), {
      target: { value: "board" },
    });
    fireEvent.change(screen.getByLabelText("글 제목"), {
      target: { value: "제목" },
    });
    fireEvent.change(screen.getByLabelText("글 내용"), {
      target: { value: "내용" },
    });
    fireEvent.click(screen.getByRole("button", { name: "글 등록" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "참여 자격이 변경됐습니다.",
    );
    expect(screen.getByLabelText("글 내용")).toHaveProperty("value", "내용");
    expect(api.post).toHaveBeenCalledWith(`${root}/forum/posts`, {
      forumId: "board",
      title: "제목",
      content: [{ id: "paragraph-0", type: "paragraph", content: "내용" }],
      type: "discussion",
    });
    fireEvent.click(screen.getByRole("button", { name: "글 등록" }));
    await screen.findByText("게시글을 등록했습니다.");
  });
  it("preserves textarea line breaks and literal markup after submission and detail reload", async () => {
    const api = client();
    let savedContent: unknown;
    const get = api.get.getMockImplementation()!;
    api.get.mockImplementation(async (path) =>
      path.endsWith("/posts/post")
        ? {
            data: {
              data: { id: "post", title: "줄바꿈", content: savedContent },
            },
          }
        : get(path),
    );
    api.post.mockImplementation(async (_path, body) => {
      savedContent = body.content;
      return { data: { success: true } };
    });
    const view = open(api);
    await screen.findByText("조합원 글쓰기");
    fireEvent.change(screen.getByLabelText("게시판"), {
      target: { value: "board" },
    });
    fireEvent.change(screen.getByLabelText("글 제목"), {
      target: { value: "줄바꿈" },
    });
    fireEvent.change(screen.getByLabelText("글 내용"), {
      target: { value: "첫 줄\n\n둘째 줄 <b>문자 그대로</b> & 안내" },
    });
    fireEvent.click(screen.getByRole("button", { name: "글 등록" }));
    await screen.findByText("게시글을 등록했습니다.");
    fireEvent.click(screen.getByRole("button", { name: "우리 소식" }));
    await screen.findByText(/둘째 줄 <b>문자 그대로<\/b> & 안내/);
    expect(view.container.querySelectorAll("article br")).toHaveLength(2);
    expect(view.container.querySelector("article b")).toBeNull();
  });
  it("allows scoped operators to request a board using the existing endpoint", async () => {
    const api = client();
    open(api, true, "/one/operator?work=boards", true);
    await screen.findByText("조합 게시판 개설");
    expect(screen.queryByText("조합원 글쓰기")).toBeNull();
    expect(api.get.mock.calls.some(([path]) => path.includes("/posts"))).toBe(
      false,
    );
    fireEvent.change(screen.getByLabelText("게시판 이름"), {
      target: { value: "조합 공지" },
    });
    fireEvent.click(screen.getByRole("button", { name: "게시판 개설" }));
    await screen.findByText("게시판을 개설했습니다.");
    expect(api.post).toHaveBeenCalledWith(`${root}/boards`, {
      name: "조합 공지",
    });
  });
  it("keeps a forbidden response as an error instead of substituting a public forum", async () => {
    const api = client();
    api.get.mockRejectedValue(new Error("forbidden"));
    open(api);
    await screen.findByRole("alert");
    expect(screen.queryByText("조합원 글쓰기")).toBeNull();
    expect(api.get).toHaveBeenCalledTimes(1);
  });
  it("supports direct post links and sanitizes unsafe stored markup", async () => {
    const api = client();
    api.get.mockImplementation(async (path: string) => ({
      data: {
        data: path.startsWith("/neture/")
          ? { key: "coop-one", communityKey: "business:coop-one" }
          : path.endsWith("/categories")
            ? []
            : {
                id: "post",
                title: "직접 본문",
                content: [
                  {
                    type: "paragraph",
                    content:
                      "<script>window.bad=true</script><strong>안전한 본문</strong>",
                  },
                ],
              },
      },
    }));
    const view = open(api, false, "/one/community?post=post");
    await screen.findByText("안전한 본문");
    expect(view.container.querySelector("script")).toBeNull();
  });
});
