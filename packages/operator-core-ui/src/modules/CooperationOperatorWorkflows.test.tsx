import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CooperationOperatorWorkflows } from "./CooperationOperatorWorkflows";
afterEach(cleanup);
const data = () => ({
  work: { items: [], total: 0 },
  materials: { items: [], total: 0 },
  support: {
    items: [
      {
        id: "case",
        subject: "회원 지원 요청",
        status: "received",
        assigned_to: null,
        due_at: null,
        version: "v1",
      },
    ],
    total: 1,
    unassigned: 1,
    overdue: 0,
  },
  subjects: { items: [{ id: "person-one", name: "합성 조합원" }], total: 1 },
  operators: [{ id: "operator", name: "합성 담당자" }],
  summary: { notices: 2, applications: 1 },
});
const api = () => ({
  get: vi.fn().mockResolvedValue({ data: { data: data() } }),
  post: vi.fn().mockResolvedValue({}),
});
function tree(client: ReturnType<typeof api>) {
  return (
    <CooperationOperatorWorkflows
      client={client}
      accountId="operator"
      kind="cooperative"
      scopeKey="one"
      inboxHref="/one/operator/inbox"
      materialEditHref={(id) =>
        id ? `/one/operator/contents/${id}/edit` : "/one/operator/contents/new"
      }
    />
  );
}
it("saves one complete draft with explicit personal targets rather than granting pharmacy access", async () => {
  const client = api();
  render(tree(client));
  await screen.findByText("협업 업무 관리");
  await screen.findByRole("button", { name: "새 공지" });
  fireEvent.click(screen.getByRole("button", { name: "새 공지" }));
  await screen.findByRole("textbox", { name: "제목" });
  fireEvent.change(screen.getByLabelText("제목"), {
    target: { value: "공지 제목" },
  });
  fireEvent.change(screen.getByLabelText("본문"), {
    target: { value: "확인할 공지 본문" },
  });
  fireEvent.click(screen.getByLabelText("합성 조합원"));
  fireEvent.submit(
    screen.getByRole("button", { name: "초안 저장" }).closest("form")!,
  );
  await waitFor(() =>
    expect(client.post).toHaveBeenCalledWith(
      "/cooperation-workflows/cooperative/one/manage/work",
      expect.objectContaining({
        kind: "notice",
        state: "draft",
        targetIds: ["person-one"],
        title: "공지 제목",
      }),
      expect.any(Object),
    ),
  );
});
it("keeps failed assignment values and version so retry cannot silently overwrite a newer case", async () => {
  const client = api();
  client.post.mockRejectedValueOnce(new Error("배정 충돌"));
  render(tree(client));
  await screen.findByRole("button", { name: "새 공지" });
  fireEvent.click(screen.getByRole("button", { name: "새 공지" }));
  await screen.findByRole("textbox", { name: "제목" });
  fireEvent.click(screen.getByRole("button", { name: "지원 담당·기한" }));
  fireEvent.change(screen.getByLabelText("배정 담당자"), {
    target: { value: "operator" },
  });
  fireEvent.click(screen.getByRole("button", { name: "담당·기한 저장" }));
  await screen.findByText("배정 충돌");
  expect(
    (screen.getByLabelText("배정 담당자") as HTMLSelectElement).value,
  ).toBe("operator");
  fireEvent.click(screen.getByRole("button", { name: "담당·기한 저장" }));
  await waitFor(() => expect(client.post).toHaveBeenCalledTimes(2));
  expect(client.post.mock.calls[0][1]).toEqual(client.post.mock.calls[1][1]);
  expect(client.post.mock.calls[1][1]).toMatchObject({
    version: "v1",
    assignedTo: "operator",
  });
});
it("preserves draft text after a failed save and sends no speculative publish", async () => {
  const client = api();
  client.post.mockRejectedValue(new Error("저장 실패"));
  render(tree(client));
  await screen.findByRole("button", { name: "새 공지" });
  fireEvent.click(screen.getByRole("button", { name: "새 공지" }));
  await screen.findByRole("textbox", { name: "제목" });
  fireEvent.change(screen.getByLabelText("제목"), {
    target: { value: "작성 중인 공지" },
  });
  fireEvent.change(screen.getByLabelText("본문"), {
    target: { value: "보존할 본문" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "초안 저장" }).closest("form")!,
  );
  await screen.findByText("저장 실패");
  expect((screen.getByLabelText("제목") as HTMLInputElement).value).toBe(
    "작성 중인 공지",
  );
  expect((screen.getByLabelText("본문") as HTMLTextAreaElement).value).toBe(
    "보존할 본문",
  );
  expect(client.post.mock.calls[0][1]).toMatchObject({ state: "draft" });
});
