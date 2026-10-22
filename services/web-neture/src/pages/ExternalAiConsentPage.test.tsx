import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ExternalAiConsentPage from "./ExternalAiConsentPage";
import { useAuth } from "../contexts";
import { getExternalConsent, approveExternalConsent } from "../api/externalAi";
const openLoginModal = vi.fn();
vi.mock("../contexts", () => ({ useAuth: vi.fn() }));
vi.mock("../contexts/LoginModalContext", () => ({
  useLoginModal: () => ({ openLoginModal }),
}));
vi.mock("../api/externalAi", () => ({
  getExternalConsent: vi.fn(),
  approveExternalConsent: vi.fn(),
  denyExternalConsent: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
  } as ReturnType<typeof useAuth>);
  vi.mocked(getExternalConsent).mockResolvedValue({
    clientName: "Fixture AI",
    scopes: ["o4o:read", "o4o:draft:write"],
    workspaces: [
      { id: "workspace-a", name: "공급자 A", writable: true },
      { id: "workspace-b", name: "공급자 B", writable: false },
    ],
  });
});
afterEach(cleanup);
const show = () =>
  render(
    <MemoryRouter
      initialEntries={["/external-ai/connect?request=fixture-request"]}
    >
      <ExternalAiConsentPage />
    </MemoryRouter>,
  );
describe("external AI consent", () => {
  it("uses the existing login flow with a return address", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    } as ReturnType<typeof useAuth>);
    show();
    fireEvent.click(screen.getByText("O4O 로그인"));
    expect(openLoginModal).toHaveBeenCalledWith(
      "/external-ai/connect?request=fixture-request",
    );
    expect(getExternalConsent).not.toHaveBeenCalled();
  });
  it("requires explicit workspace selection and optional write consent", async () => {
    vi.mocked(approveExternalConsent).mockRejectedValue(
      new Error("fixture failure"),
    );
    show();
    await screen.findByText("공급자 A");
    const submit = screen.getByText("선택한 범위로 연결");
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/공급자 B/));
    fireEvent.click(screen.getByLabelText("초안 저장·수정"));
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText("공급자 A"));
    fireEvent.click(submit);
    await waitFor(() =>
      expect(approveExternalConsent).toHaveBeenCalledWith(
        "fixture-request",
        ["workspace-a"],
        ["o4o:read", "o4o:draft:write"],
      ),
    );
    await screen.findByText(/연결을 처리하지 못했습니다/);
  });
  it("reports expired requests and offers retry", async () => {
    vi.mocked(getExternalConsent).mockRejectedValueOnce(new Error("expired"));
    show();
    await screen.findByRole("alert");
    fireEvent.click(screen.getByText("다시 확인"));
    await screen.findByText("공급자 A");
  });
});
