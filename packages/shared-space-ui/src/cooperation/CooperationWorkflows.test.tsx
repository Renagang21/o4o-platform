import { MemoryRouter } from "react-router-dom";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  CooperationMemberWorkflows,
  safeEducationUrl,
} from "./CooperationWorkflows";
afterEach(cleanup);
const payload = () => ({
  totals: { notices: 1, activities: 1 },
  pending: { notices: 1, applications: 0 },
  notices: [
    {
      id: "notice",
      title: "필수 확인 안내",
      body: "실제 공지 내용",
      priority: "important",
      required: true,
      version: 2,
      due_at: null,
      acknowledged_at: null,
    },
  ],
  activities: [
    {
      id: "activity",
      title: "공동 안내 활동",
      body: "함께 진행할 업무",
      state: "recruiting",
      version: 1,
      due_at: null,
    },
  ],
  materials: { items: [], total: 0 },
  support: { items: [], total: 0 },
});
const envelope = (data: unknown) => ({ data: { data } });
const client = () => ({
  get: vi.fn().mockResolvedValue(envelope(payload())),
  post: vi.fn().mockResolvedValue({}),
});
function tree(
  api: ReturnType<typeof client>,
  accountId = "person",
  scopeKey = "one",
  organizationId?: string,
) {
  return (
    <MemoryRouter>
      <CooperationMemberWorkflows
        client={api}
        accountId={accountId}
        kind={organizationId ? "business" : "cooperative"}
        scopeKey={scopeKey}
        organizationId={organizationId}
      />
    </MemoryRouter>
  );
}
it("preserves a failed notice confirmation and retries exactly the same version", async () => {
  const api = client();
  api.post.mockRejectedValueOnce(new Error("일시 처리 실패"));
  render(tree(api));
  await screen.findByText("필수 확인 안내");
  fireEvent.click(screen.getByLabelText("내용을 읽고 확인했습니다."));
  fireEvent.click(screen.getByRole("button", { name: "공지 확인 기록" }));
  await screen.findByText("일시 처리 실패");
  expect(
    (screen.getByLabelText("내용을 읽고 확인했습니다.") as HTMLInputElement)
      .checked,
  ).toBe(true);
  expect(api.get).toHaveBeenCalledTimes(1);
  const acknowledged = payload();
  acknowledged.notices[0].acknowledged_at = "2026-10-25T00:00:00Z" as any;
  api.get.mockResolvedValue(envelope(acknowledged));
  fireEvent.click(screen.getByRole("button", { name: "공지 확인 기록" }));
  await screen.findByText(/확인 완료 ·/);
  expect(api.post.mock.calls.map(([url, body]) => [url, body])).toEqual(
    Array(2).fill([
      "/cooperation-workflows/cooperative/one/notices/notice/acknowledge",
      { version: 2 },
    ]),
  );
});
it("keeps application text after a failed submit and prevents duplicate writes", async () => {
  const api = client();
  let reject!: (error: Error) => void;
  api.post.mockReturnValue(
    new Promise((_resolve, r) => {
      reject = r;
    }),
  );
  render(tree(api));
  await screen.findByText("필수 확인 안내");
  fireEvent.click(screen.getByRole("button", { name: "협업 활동" }));
  fireEvent.change(screen.getByLabelText("신청 내용"), {
    target: { value: "함께 참여하겠습니다." },
  });
  const submit = screen.getByRole("button", { name: "참여 신청" });
  act(() => {
    fireEvent.click(submit);
    fireEvent.click(submit);
  });
  expect(api.post).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error("신청 실패")));
  await screen.findByText("신청 실패");
  expect(
    (screen.getByLabelText("신청 내용") as HTMLTextAreaElement).value,
  ).toBe("함께 참여하겠습니다.");
  expect(screen.queryByText("내 신청: 승인")).toBeNull();
});
it("never fetches pharmacy work without an explicit selected pharmacy", () => {
  const api = client();
  render(
    <CooperationMemberWorkflows
      client={api}
      accountId="owner"
      kind="business"
      scopeKey="pharmacy"
    />,
  );
  expect(
    screen.getByText("회원 업무를 이용할 약국을 선택해 주세요."),
  ).toBeTruthy();
  expect(api.get).not.toHaveBeenCalled();
});
it("drops old account/scope responses and keeps personal membership free of pharmacy headers", async () => {
  const api = client();
  let resolve!: (value: any) => void;
  api.get.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const view = render(tree(api));
  view.rerender(tree(api, "other-account", "two"));
  await screen.findByText("필수 확인 안내");
  const old = payload();
  old.notices[0].title = "이전 계정 공지";
  await act(async () => resolve(envelope(old)));
  expect(screen.queryByText("이전 계정 공지")).toBeNull();
  expect(api.get).toHaveBeenLastCalledWith(
    "/cooperation-workflows/cooperative/two/member?materialOffset=0&supportOffset=0&noticeOffset=0&activityOffset=0",
    { headers: { "X-Store-Organization-Id": "" } },
  );
});
it("keys pharmacy records by selected organization and ignores the previous late response", async () => {
  const api = client();
  let resolve!: (value: any) => void;
  api.get.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const view = render(tree(api, "owner", "pharmacy", "store-a"));
  view.rerender(tree(api, "owner", "pharmacy", "store-b"));
  await screen.findByText("필수 확인 안내");
  const old = payload();
  old.notices[0].title = "이전 약국 공지";
  await act(async () => resolve(envelope(old)));
  expect(screen.queryByText("이전 약국 공지")).toBeNull();
  expect(api.get).toHaveBeenLastCalledWith(expect.any(String), {
    headers: { "X-Store-Organization-Id": "store-b" },
  });
});
it("retains inquiry consent, message and idempotency key on retry", async () => {
  const api = client();
  api.post.mockRejectedValueOnce(new Error("접수 실패"));
  render(tree(api));
  await screen.findByText("필수 확인 안내");
  fireEvent.click(screen.getByRole("button", { name: "내 문의" }));
  fireEvent.change(screen.getByLabelText("제목"), {
    target: { value: "자료 문의" },
  });
  fireEvent.change(screen.getByLabelText("문의 내용"), {
    target: { value: "문의 내용 확인을 요청드립니다." },
  });
  fireEvent.click(screen.getByLabelText(/문의 처리에 필요한/));
  fireEvent.submit(
    screen.getByRole("button", { name: "문의 접수" }).closest("form")!,
  );
  await screen.findByText("접수 실패");
  expect(
    (screen.getByLabelText("문의 내용") as HTMLTextAreaElement).value,
  ).toBe("문의 내용 확인을 요청드립니다.");
  fireEvent.submit(
    screen.getByRole("button", { name: "문의 접수" }).closest("form")!,
  );
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
  expect(api.post.mock.calls[0][1]).toEqual(api.post.mock.calls[1][1]);
});
it.each([
  "javascript:alert(1)",
  "http://example.invalid",
  "https://user:secret@example.invalid",
])("never renders an unsafe education destination (%s)", (value) =>
  expect(safeEducationUrl(value)).toBeUndefined(),
);

it("keeps a successful write distinct from a failed refresh and retries only the read", async () => {
  const api = client();
  api.get
    .mockResolvedValueOnce(envelope(payload()))
    .mockRejectedValue(new Error("목록 조회 실패"));
  render(tree(api));
  await screen.findByText("필수 확인 안내");
  fireEvent.click(screen.getByLabelText("내용을 읽고 확인했습니다."));
  fireEvent.click(screen.getByRole("button", { name: "공지 확인 기록" }));
  await screen.findByText(/처리를 완료했습니다/);
  await screen.findByText("목록 조회 실패");
  fireEvent.click(screen.getByRole("button", { name: "업무 다시 조회" }));
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(3));
  expect(api.post).toHaveBeenCalledTimes(1);
});

it.each([
  ['pharmacy', 'store-a'], ['drugstore', 'store-a'], ['carepharm', 'store-a'], ['pharmcoop', undefined],
])('lets %s members read the full operator material and open its attachment without changing membership scope', async (key, organization) => {
  const api = client();
  const data = payload();
  data.materials = { items: [{ id: 'material', title: '업무 준비 자료', summary: '짧은 요약', body: '<p>요약에 없는 필수 준비사항</p>', revision: 2, attachments: [{ name: '현장 체크리스트', url: 'https://example.invalid/checklist.pdf' }] }] as any, total: 1 };
  api.get.mockResolvedValue(envelope(data));
  render(tree(api, 'reader', key, organization));
  await screen.findByText('필수 확인 안내');
  fireEvent.click(screen.getByRole('button', { name: '자료·교육' }));
  fireEvent.click(screen.getByText('자료 내용·첨부 보기'));
  expect(screen.getByText('요약에 없는 필수 준비사항')).toBeTruthy();
  expect(screen.getByRole('link', { name: '현장 체크리스트' }).getAttribute('href')).toBe('https://example.invalid/checklist.pdf');
  expect(api.get.mock.calls[0][1].headers['X-Store-Organization-Id']).toBe(organization ?? '');
  expect(api.post).not.toHaveBeenCalled();
});
