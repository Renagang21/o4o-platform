import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
}));
vi.mock("../../contexts", () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: "author" } }),
  useLoginModal: () => ({ openLoginModal: vi.fn() }),
}));
vi.mock("../../lib/api", () => ({ supplierApi: {} }));
vi.mock("../../services/forumApi", () => ({
  fetchForumPostBySlug: m.get,
  updateForumPost: m.update,
  createForumPost: m.create,
  fetchForumCategories: vi.fn(async () => ({ data: [] })),
  fetchUserContactSettings: vi.fn(async () => null),
}));
vi.mock("@o4o/forum-core/utils", () => ({
  blocksToHtml: () =>
    "<h2>원래 형식</h2><p>검토할 충분한 길이의 본문입니다.</p>",
  htmlToBlocks: (content: string) => [{ type: "html", content }],
}));
vi.mock("@o4o/shared-space-ui", () => ({
  ForumWriteForm: (p: {
    initialTitle: string;
    initialContentHtml: string;
    submitLabel: string;
    onSubmit: (v: unknown) => void;
  }) => (
    <div>
      <p>{p.initialContentHtml}</p>
      <button
        onClick={() =>
          p.onSubmit({
            title: p.initialTitle,
            editorHtml: p.initialContentHtml,
          })
        }
      >
        {p.submitLabel}
      </button>
    </div>
  ),
}));
import { ForumWritePage } from "./ForumWritePage";
beforeEach(() => {
  vi.clearAllMocks();
  m.get.mockResolvedValue({
    data: {
      id: "draft",
      title: "초안",
      slug: "draft-slug",
      status: "draft",
      content: [],
    },
  });
  m.update.mockResolvedValue({ success: true, data: { slug: "draft-slug" } });
});
afterEach(cleanup);
const show = () =>
  render(
    <MemoryRouter initialEntries={["/forum/write?edit=draft"]}>
      <ForumWritePage />
    </MemoryRouter>,
  );
it("loads a private draft without publication and publishes only after explicit user submission", async () => {
  show();
  const submit = await screen.findByRole("button", {
    name: "검토한 초안 게시",
  });
  expect(screen.getByText(/<h2>원래 형식/)).toBeTruthy();
  expect(m.update).not.toHaveBeenCalled();
  fireEvent.click(submit);
  await waitFor(() =>
    expect(m.update).toHaveBeenCalledWith(
      "draft",
      expect.objectContaining({
        status: "publish",
        content: expect.any(Array),
      }),
    ),
  );
  expect(m.create).not.toHaveBeenCalled();
});
it("existing published editing does not inject a new publication transition", async () => {
  m.get.mockResolvedValue({
    data: {
      id: "draft",
      title: "게시글",
      slug: "post",
      status: "publish",
      content: [],
    },
  });
  show();
  fireEvent.click(await screen.findByRole("button", { name: "수정하기" }));
  await waitFor(() => expect(m.update).toHaveBeenCalled());
  expect(m.update.mock.calls[0][1]).not.toHaveProperty("status");
});
