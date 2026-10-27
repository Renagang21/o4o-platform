import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import WorkspacePortal from "./WorkspacePortal";
import { ApiError, partnerApi, type ServerSpace } from "./api";
import { emptyWorkspace } from "./model";

vi.mock("./api", async (importOriginal) => {
  const original = await importOriginal<typeof import("./api")>();
  return {
    ...original,
    partnerApi: {
      me: vi.fn(),
      list: vi.fn(),
      load: vi.fn(),
      login: vi.fn(),
      join: vi.fn(),
      logout: vi.fn(),
    },
  };
});
beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/#home");
  vi.mocked(partnerApi.me).mockResolvedValue({
    id: "test-user",
    name: "테스트 사용자",
  });
  vi.mocked(partnerApi.list).mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("공동공간 진입", () => {
  it("clears workspace and parent session state even when logout fails", async () => {
    const changed = vi.fn();
    vi.mocked(partnerApi.logout).mockRejectedValue(
      new ApiError(503, "REQUEST_FAILED"),
    );
    render(<WorkspacePortal onSessionChange={changed} />);
    await screen.findByRole("button", { name: "공동공간 만들기" });
    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));
    await screen.findByRole("button", { name: "로그인", exact: true });
    expect(changed).toHaveBeenCalledWith({
      type: "signed-out",
      error: expect.any(String),
    });
  });

  it("성공한 로그아웃을 상위 사이트에 알려 커뮤니티 세션도 함께 갱신한다", async () => {
    const changed = vi.fn();
    vi.mocked(partnerApi.logout).mockResolvedValue({});
    render(<WorkspacePortal onSessionChange={changed} />);
    await screen.findByRole("button", { name: "공동공간 만들기" });
    expect(changed).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));
    await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
  });
  it("로그인 후 사이트 세션을 갱신하면서 아직 수락하지 않은 초대 fragment를 보존한다", async () => {
    const changed = vi.fn(),
      token = "b".repeat(64);
    history.replaceState(null, "", `/#join=${token}`);
    vi.mocked(partnerApi.me).mockRejectedValue(
      new ApiError(401, "UNAUTHENTICATED"),
    );
    vi.mocked(partnerApi.login).mockResolvedValue({});
    render(<WorkspacePortal onSessionChange={changed} />);
    await screen.findByRole("button", { name: "로그인", exact: true });
    await waitFor(() =>
      expect(screen.queryByText("서버에서 처리 중입니다…")).toBeNull(),
    );
    fireEvent.change(screen.getByLabelText("이메일"), {
      target: { value: "member@example.invalid" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: crypto.randomUUID() },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "로그인", exact: true }),
    );
    await waitFor(() =>
      expect(changed).toHaveBeenCalledWith({
        type: "signed-in",
        inviteToken: token,
      }),
    );
  });

  it("StrictMode에서도 초대 코드를 유지하고 주소에서 제거하며 자동 참여하지 않는다", async () => {
    const token = "a".repeat(64);
    history.replaceState(null, "", `/?mode=local#join=${token}`);
    render(
      <StrictMode>
        <WorkspacePortal />
      </StrictMode>,
    );
    await waitFor(() =>
      expect(
        (screen.getByLabelText("초대 코드") as HTMLInputElement).value,
      ).toBe(token),
    );
    expect(location.hash).toBe("#home");
    expect(location.search).toBe("");
    expect(partnerApi.join).not.toHaveBeenCalled();
  });
  it("로컬 도구 선택을 새로고침 후에도 유지하고 서버 복귀 시 재인증한다", async () => {
    let view = render(<WorkspacePortal />);
    await screen.findByRole("button", { name: "공동공간 만들기" });
    fireEvent.click(screen.getByRole("button", { name: "로컬 도구 이용" }));
    expect(new URLSearchParams(location.search).get("mode")).toBe("local");
    const count = vi.mocked(partnerApi.me).mock.calls.length;
    view.unmount();
    view = render(<WorkspacePortal />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "홍보를 함께 만드는 공간",
    );
    expect(partnerApi.me).toHaveBeenCalledTimes(count);
    fireEvent.click(screen.getByRole("button", { name: "서버 공동공간 연결" }));
    await screen.findByRole("button", { name: "공동공간 만들기" });
    expect(new URLSearchParams(location.search).has("mode")).toBe(false);
    expect(partnerApi.me).toHaveBeenCalledTimes(count + 1);
  });
  it("세션 만료 후 서버 재연결 시 이전 사용자와 공동공간을 제거한다", async () => {
    const space: ServerSpace = {
      id: "private-space",
      name: "비공개 테스트 공간",
      role: "owner",
      revision: 0,
      updated_at: "2026-01-01T00:00:00Z",
      workspace: emptyWorkspace(),
    };
    vi.mocked(partnerApi.list).mockResolvedValue([space]);
    vi.mocked(partnerApi.load).mockResolvedValue(space);
    render(<WorkspacePortal />);
    await screen.findByRole("option", { name: "비공개 테스트 공간 · 소유자" });
    fireEvent.change(screen.getByLabelText("이용할 공동공간"), {
      target: { value: space.id },
    });
    await screen.findByRole("button", { name: "공동공간 관리" });
    fireEvent.click(screen.getByRole("button", { name: "로컬 도구 이용" }));
    vi.mocked(partnerApi.me).mockRejectedValueOnce(
      new ApiError(401, "UNAUTHENTICATED"),
    );
    fireEvent.click(screen.getByRole("button", { name: "서버 공동공간 연결" }));
    await screen.findByRole("button", { name: "로그인", exact: true });
    expect(screen.queryByLabelText("이용할 공동공간")).toBeNull();
    expect(screen.queryByText("테스트 사용자님의 공동공간")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "기존 로그인 확인" }));
    await screen.findByLabelText("이용할 공동공간");
    expect(
      (screen.getByLabelText("이용할 공동공간") as HTMLSelectElement).value,
    ).toBe("");
    expect(screen.queryByRole("button", { name: "공동공간 관리" })).toBeNull();
  });
  it("실패한 로그인에서도 비밀번호를 입력창과 브라우저 저장소에 남기지 않는다", async () => {
    vi.mocked(partnerApi.me).mockRejectedValue(
      new ApiError(401, "UNAUTHENTICATED"),
    );
    vi.mocked(partnerApi.login).mockRejectedValue(
      new ApiError(401, "INVALID_LOGIN"),
    );
    render(<WorkspacePortal />);
    await waitFor(() =>
      expect(screen.queryByText("서버에서 처리 중입니다…")).toBeNull(),
    );
    fireEvent.change(screen.getByLabelText("이메일"), {
      target: { value: "fixture@example.invalid" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: crypto.randomUUID() },
    });
    fireEvent.submit(
      screen
        .getByRole("button", { name: "로그인", exact: true })
        .closest("form")!,
    );
    await screen.findByRole("alert");
    expect((screen.getByLabelText("비밀번호") as HTMLInputElement).value).toBe(
      "",
    );
    expect(localStorage.length).toBe(0);
  });
});
