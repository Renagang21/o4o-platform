import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ExternalAiConsentPage from "../ExternalAiConsentPage";
import {
  getExternalConsent,
  approveExternalConsent,
} from "../../api/externalAi";
vi.mock("../../contexts", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { id: "owner" },
  }),
}));
vi.mock("../../contexts/LoginModalContext", () => ({
  useLoginModal: () => ({ openLoginModal: vi.fn() }),
}));
vi.mock("../../api/externalAi", () => ({
  getExternalConsent: vi.fn(),
  approveExternalConsent: vi.fn(),
  denyExternalConsent: vi.fn(),
}));
const account = {
  id: "mail:7e8c9f74-bc4e-4b3c-8627-5ca12740ee80",
  name: "개인 메일 (gmail) owner@example.invalid",
  kind: "personal_mail" as const,
  writable: true,
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getExternalConsent).mockResolvedValue({
    clientName: "Fixture app",
    scopes: [
      "o4o:read",
      "o4o:draft:write",
      "o4o:mail:read",
      "o4o:mail:manage",
      "o4o:mail:body",
    ],
    workspaces: [],
    mailAccounts: [account],
  });
  vi.mocked(approveExternalConsent).mockImplementation(
    () => new Promise(() => {}),
  );
});
afterEach(cleanup);
const view = () =>
  render(
    <MemoryRouter initialEntries={["/external-ai/connect?request=fixture"]}>
      <ExternalAiConsentPage />
    </MemoryRouter>,
  );
it("requires explicit mail read/account/body choices and does not grant draft or manage implicitly", async () => {
  view();
  const mailbox = await screen.findByRole("checkbox", { name: account.name });
  expect((mailbox as HTMLInputElement).disabled).toBe(true);
  fireEvent.click(
    screen.getByRole("checkbox", { name: "메일 목록·발신처·처리 현황 조회" }),
  );
  fireEvent.click(mailbox);
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: "선택한 메일 본문을 연결한 AI에 전달",
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "선택한 범위로 연결" }));
  await waitFor(() =>
    expect(approveExternalConsent).toHaveBeenCalledWith(
      "fixture",
      [account.id],
      ["o4o:read", "o4o:mail:read", "o4o:mail:body"],
      false,
    ),
  );
});
it("removing mail read clears manage/body/account selections and blocks an empty grant", async () => {
  view();
  await screen.findByRole("checkbox", { name: account.name });
  const read = screen.getByRole("checkbox", {
    name: "메일 목록·발신처·처리 현황 조회",
  });
  fireEvent.click(read);
  fireEvent.click(screen.getByRole("checkbox", { name: account.name }));
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: "정리·규칙 제안과 직접 승인한 작업 관리",
    }),
  );
  fireEvent.click(read);
  expect(
    (
      screen.getByRole("checkbox", {
        name: "정리·규칙 제안과 직접 승인한 작업 관리",
      }) as HTMLInputElement
    ).checked,
  ).toBe(false);
  expect(
    (
      screen.getByRole("button", {
        name: "선택한 범위로 연결",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(approveExternalConsent).not.toHaveBeenCalled();
});
it("preserves the existing content-only scope contract", async () => {
  vi.mocked(getExternalConsent).mockResolvedValue({
    clientName: "Fixture app",
    scopes: ["o4o:read", "o4o:draft:write"],
    workspaces: [
      { id: "store:a", name: "Fixture store", kind: "store", writable: true },
    ],
  });
  view();
  fireEvent.click(
    await screen.findByRole("checkbox", { name: "Fixture store 약국" }),
  );
  fireEvent.click(screen.getByRole("checkbox", { name: "초안 저장·수정" }));
  fireEvent.click(screen.getByRole("button", { name: "선택한 범위로 연결" }));
  await waitFor(() =>
    expect(approveExternalConsent).toHaveBeenCalledWith(
      "fixture",
      ["store:a"],
      ["o4o:read", "o4o:draft:write"],
      false,
    ),
  );
  expect(screen.queryByText("개인 메일 별도 동의")).toBeNull();
});
