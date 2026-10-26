import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PersonalMailPage from "./PersonalMailPage";
import { MailJobReview } from "./MailJobReview";
import { personalMailApi, type MailJob } from "../../api/personalMail";

const auth = vi.hoisted(() => ({
  user: { id: "owner", roles: [] as string[] },
  isAuthenticated: true,
  isLoading: false,
}));
vi.mock("../../contexts", () => ({ useAuth: () => auth }));
vi.mock("../../contexts/LoginModalContext", () => ({
  useLoginModal: () => ({ openLoginModal: vi.fn() }),
}));
vi.mock("../../lib/apiClient", () => ({
  api: {},
  API_BASE_URL: "https://api.example.invalid",
}));
vi.mock("@o4o/auth-react", () => ({
  MyHomeButton: () => <a href="/mypage">My Home</a>,
}));
vi.mock("@o4o/account-ui", () => ({
  MyPageLayout: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
  MyPageAuthRequired: () => <p>로그인 필요</p>,
  MyPageLoadingState: () => <p>로그인 확인 중</p>,
}));
vi.mock("../../api/personalMail", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../api/personalMail")>();
  return {
    ...original,
    personalMailApi: Object.fromEntries(
      Object.keys(original.personalMailApi).map((key) => [key, vi.fn()]),
    ),
  };
});
const preview: MailJob = {
  id: "job-a",
  accountId: "account-a",
  kind: "cleanup",
  action: "trash",
  status: "preview",
  total: 1,
  proposal: { senders: ["notice@example.invalid"] },
  includeImportant: false,
  counts: { done: 0, pending: 1, skipped: 0, failed: 0 },
  lastError: null,
  confirmationToken: "browser-only-token",
  confirmationExpiresAt: new Date(Date.now() + 600000).toISOString(),
  confirmUrl: "https://example.invalid/confirm",
};
function view() {
  return render(
    <MemoryRouter>
      <PersonalMailPage />
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  auth.isAuthenticated = true;
  auth.isLoading = false;
  vi.mocked(personalMailApi.status).mockResolvedValue({
    enabled: true,
    gmailConfigured: true,
    naverConfigured: true,
  });
  vi.mocked(personalMailApi.accounts).mockResolvedValue([
    {
      id: "account-a",
      provider: "gmail",
      address: "owner@example.invalid",
      state: "active",
      syncCompletedAt: null,
      syncing: false,
    },
  ]);
  vi.mocked(personalMailApi.senders).mockResolvedValue({
    senders: [
      {
        sender: "notice@example.invalid",
        count: 2,
        important: 1,
        latestAt: "2026-10-26",
        ruleAction: null,
        category: null,
      },
    ],
    page: 1,
    scope: "indexed_inbox",
  });
  vi.mocked(personalMailApi.rules).mockResolvedValue([]);
  vi.mocked(personalMailApi.jobs).mockResolvedValue([]);
  vi.mocked(personalMailApi.capabilities).mockResolvedValue({
    archive: true,
    trash: true,
    important: true,
    body: true,
  });
  vi.mocked(personalMailApi.prepare).mockResolvedValue(preview);
  vi.mocked(personalMailApi.job).mockResolvedValue(preview);
  vi.mocked(personalMailApi.confirm).mockResolvedValue({
    ...preview,
    status: "pending",
    confirmationToken: undefined,
  });
});
afterEach(cleanup);
describe("personal mail end-to-end screen contract", () => {
  it("waits for authentication and does not fetch mail accounts for unauthenticated users", () => {
    auth.isLoading = true;
    view();
    expect(screen.getByText("로그인 확인 중")).toBeTruthy();
    expect(personalMailApi.status).not.toHaveBeenCalled();
    cleanup();
    auth.isLoading = false;
    auth.isAuthenticated = false;
    view();
    expect(screen.getByText("로그인 필요")).toBeTruthy();
    expect(personalMailApi.accounts).not.toHaveBeenCalled();
  });
  it("does not offer real account operations while disabled", async () => {
    vi.mocked(personalMailApi.status).mockResolvedValue({
      enabled: false,
      gmailConfigured: false,
      naverConfigured: false,
    });
    view();
    expect(await screen.findByText("개인 메일 관리 준비 중")).toBeTruthy();
    await screen.findByRole("button", { name: "계정 연결 해제" });
    expect(personalMailApi.capabilities).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Gmail 연결" })).toBeNull();
  });
  it("requires a separate target/count acknowledgment before executing the immutable preview", async () => {
    view();
    const sender = await screen.findByRole("checkbox", {
      name: "notice@example.invalid",
    });
    fireEvent.click(sender);
    fireEvent.change(screen.getByLabelText("처리 방식"), {
      target: { value: "trash" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "기존 메일 정리 검토" }),
    );
    const confirm = await screen.findByRole("button", {
      name: "확인한 1건 실행",
    });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    expect(personalMailApi.confirm).not.toHaveBeenCalled();
    expect(personalMailApi.prepare).toHaveBeenCalledWith(
      "cleanup",
      expect.objectContaining({
        accountId: "account-a",
        senders: ["notice@example.invalid"],
        action: "trash",
        includeImportant: false,
        requestId: expect.any(String),
      }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "대상·건수와 처리 방식을 확인했습니다.",
      }),
    );
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(personalMailApi.confirm).toHaveBeenCalledWith(preview),
    );
  });
  it("preserves the request ID when an uncertain create response is retried", async () => {
    vi.mocked(personalMailApi.prepare)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue(preview);
    view();
    fireEvent.click(
      await screen.findByRole("checkbox", { name: "notice@example.invalid" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "기존 메일 정리 검토" }),
    );
    await screen.findByRole("alert");
    const first = vi.mocked(personalMailApi.prepare).mock.calls[0][1].requestId;
    fireEvent.click(
      screen.getByRole("button", { name: "기존 메일 정리 검토" }),
    );
    await screen.findByRole("button", { name: "확인한 1건 실행" });
    expect(vi.mocked(personalMailApi.prepare).mock.calls[1][1].requestId).toBe(
      first,
    );
  });
  it("clears the Naver secret after a failed connection and never stores it in browser storage", async () => {
    vi.mocked(personalMailApi.naver).mockRejectedValue(new Error("connection"));
    view();
    const password = await screen.findByLabelText("네이버 앱 비밀번호"),
      secret = crypto.randomUUID();
    fireEvent.change(screen.getByLabelText("네이버 메일 주소"), {
      target: { value: "sample@naver.com" },
    });
    fireEvent.change(password, { target: { value: secret } });
    fireEvent.click(screen.getByRole("button", { name: "네이버 연결" }));
    await waitFor(() => expect((password as HTMLInputElement).value).toBe(""));
    expect(JSON.stringify(localStorage)).not.toContain(secret);
    expect(JSON.stringify(sessionStorage)).not.toContain(secret);
  });
  it("does not treat a confirmation URL or prior acknowledgment as approval of another job", () => {
    const onConfirm = vi.fn(),
      onControl = vi.fn();
    const mounted = render(
      <MailJobReview
        job={preview}
        busy={false}
        onConfirm={onConfirm}
        onControl={onControl}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    mounted.rerender(
      <MailJobReview
        job={{ ...preview, id: "job-b", total: 9 }}
        busy={false}
        onConfirm={onConfirm}
        onControl={onControl}
      />,
    );
    expect(
      (
        screen.getByRole("button", {
          name: "확인한 9건 실행",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
