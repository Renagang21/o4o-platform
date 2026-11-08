import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { EmailSentNotice, EmailSignupForm } from "../email/EmailSignupForm";
import { useVerificationEmailResend } from "../email/useVerificationEmailResend";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it("shows an unsent or pending request truthfully with the submitted email and login", () => {
  const api = { resendVerificationEmail: vi.fn() };
  const view = render(
    <EmailSentNotice
      api={api}
      email="pending@fixture.invalid"
      mailSent={false}
      links={{ login: "/login" }}
    />,
  );
  expect(screen.queryByText("확인 메일을 보냈습니다.")).toBeNull();
  expect(screen.getByText("pending@fixture.invalid")).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "로그인하러 가기" }).getAttribute("href"),
  ).toBe("/login");
  view.rerender(<EmailSentNotice api={api} email="pending@fixture.invalid" />);
  expect(screen.getByTestId("email-sent-notice").textContent).toContain(
    "가입 신청한 이메일의 확인이 필요합니다.",
  );
});
it("one resend request at a time, generic acceptance is not a sent claim, and cooldown expires", async () => {
  vi.useFakeTimers();
  let resolve!: (result: object) => void;
  const api = {
    resendVerificationEmail: vi.fn(
      () =>
        new Promise<object>((r) => {
          resolve = r;
        }),
    ),
  };
  const { result } = renderHook(() =>
    useVerificationEmailResend(api, "a@fixture.invalid"),
  );
  act(() => {
    void result.current.resend();
    void result.current.resend();
  });
  expect(api.resendVerificationEmail).toHaveBeenCalledTimes(1);
  await act(async () => {
    resolve({});
  });
  expect(result.current.message).toContain("가입 확인이 필요한 계정이면");
  expect(result.current.message).not.toContain("다시 보냈습니다");
  expect(result.current.remaining).toBe(60);
  act(() => {
    void result.current.resend();
  });
  expect(api.resendVerificationEmail).toHaveBeenCalledTimes(1);
  for (let second = 0; second < 60; second++)
    act(() => vi.advanceTimersByTime(1000));
  expect(result.current.remaining).toBe(0);
});
it("rejects a late response for a different email and reports 429 Retry-After and explicit mail failure", async () => {
  let resolve!: (result: { mailSent: boolean }) => void;
  const api = {
    resendVerificationEmail: vi.fn(
      () =>
        new Promise<{ mailSent: boolean }>((r) => {
          resolve = r;
        }),
    ),
  };
  const { result, rerender } = renderHook(
    ({ email }) => useVerificationEmailResend(api, email),
    { initialProps: { email: "first@fixture.invalid" } },
  );
  act(() => {
    void result.current.resend();
  });
  rerender({ email: "second@fixture.invalid" });
  await act(async () => resolve({ mailSent: true }));
  expect(result.current.message).toBe("");
  api.resendVerificationEmail.mockRejectedValueOnce({
    response: { status: 429, headers: { "retry-after": "12" } },
  });
  await act(async () => result.current.resend());
  expect(result.current.remaining).toBe(12);
  expect(result.current.error).toContain("요청이 너무 많습니다");
  rerender({ email: "third@fixture.invalid" });
  api.resendVerificationEmail.mockResolvedValueOnce({ mailSent: false });
  await act(async () => result.current.resend());
  expect(result.current.error).toContain("보내지 못했습니다");
  expect(result.current.message).toBe("");
});
it("pending-verification duplicate signup leaves the password form and offers resend without repeating signup", async () => {
  const policy = {
    policyDocumentId: "11111111-1111-4111-8111-111111111111",
    version: 1,
    title: "Fixture",
    termsHref: "https://neture.co.kr/terms",
  };
  const signup = vi.fn().mockRejectedValue({
    response: {
      status: 409,
      data: { code: "EMAIL_PENDING_VERIFICATION", error: "확인 필요" },
    },
  });
  const resend = vi.fn().mockResolvedValue({});
  render(
    <EmailSignupForm
      api={{
        signupWithEmail: signup,
        resendVerificationEmail: resend,
        getSignupTerms: async () => policy,
      }}
      termsHref="/terms"
      privacyHref="/privacy"
      links={{ login: "/login" }}
    />,
  );
  await screen.findByRole("link", { name: "내용 보기 · 버전 1" });
  for (const [label, value] of [
    ["닉네임", "Fixture"],
    ["이메일 (로그인 아이디)", "pending@fixture.invalid"],
    ["이름 (선택)", "Fixture"],
    ["휴대전화 (선택)", "01012345678"],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.change(screen.getByTestId("email-signup-password"), {
    target: { value: "Fixture123!" },
  });
  fireEvent.change(screen.getByTestId("email-signup-confirm"), {
    target: { value: "Fixture123!" },
  });
  screen
    .getAllByRole("checkbox")
    .slice(0, 2)
    .forEach((box) => fireEvent.click(box));
  fireEvent.click(
    screen.getByRole("button", { name: "가입하고 확인 메일 받기" }),
  );
  await screen.findByTestId("email-sent-notice");
  expect(screen.getByText("pending@fixture.invalid")).toBeTruthy();
  expect(screen.queryByTestId("email-signup-password")).toBeNull();
  expect(document.body.textContent).not.toContain("Fixture123!");
  fireEvent.click(
    screen.getByRole("button", { name: "확인 메일 다시 보내기" }),
  );
  expect(resend).toHaveBeenCalledWith("pending@fixture.invalid");
  expect(signup).toHaveBeenCalledTimes(1);
});
