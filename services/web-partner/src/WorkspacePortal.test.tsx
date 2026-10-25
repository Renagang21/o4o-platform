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
import { ApiError, partnerApi } from "./api";

vi.mock("./api", async (importOriginal) => {
  const original = await importOriginal<typeof import("./api")>();
  return {
    ...original,
    partnerApi: {
      me: vi.fn(),
      list: vi.fn(),
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
