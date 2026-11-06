import { useEffect, useRef, useState } from "react";
import { readEmailAuthError, type EmailAuthApi } from "./shared";

/** The generic resend endpoint does not disclose whether an account exists. */
export function useVerificationEmailResend(
  api: Pick<EmailAuthApi, "resendVerificationEmail">,
  email: string,
) {
  const current = useRef(api);
  current.current = api;
  const generation = useRef({ value: 0 }),
    pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    const state = generation.current;
    ++state.value;
    pending.current = false;
    setBusy(false);
    setRemaining(0);
    setMessage("");
    setError("");
    return () => {
      ++state.value;
    };
  }, [email]);
  useEffect(() => {
    if (!remaining) return;
    const timer = setTimeout(
      () => setRemaining((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [remaining]);
  async function resend() {
    if (pending.current || remaining || !email.trim()) return;
    const request = generation.current.value;
    pending.current = true;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const result = await current.current.resendVerificationEmail(
        email.trim(),
      );
      if (request !== generation.current.value) return;
      if (result.mailSent === false)
        setError("확인 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주시기 바랍니다.");
      else
        setMessage(
          result.mailSent === true
            ? "확인 메일을 다시 보냈습니다."
            : (result.message ??
                "재발송 요청을 처리했습니다. 가입 확인이 필요한 계정이면 메일이 발송됩니다."),
        );
      setRemaining(60);
    } catch (failure) {
      if (request !== generation.current.value) return;
      const parsed = readEmailAuthError(
        failure,
        "확인 메일을 보내지 못했습니다.",
      );
      setError(parsed.message);
      if (parsed.status === 429) {
        const raw = Number(
          (failure as { response?: { headers?: Record<string, unknown> } })
            .response?.headers?.["retry-after"],
        );
        setRemaining(
          Number.isFinite(raw) && raw > 0 ? Math.min(3600, Math.ceil(raw)) : 60,
        );
      }
    } finally {
      if (request === generation.current.value) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  return {
    resend,
    busy,
    remaining,
    message,
    error,
    label: busy
      ? "보내는 중…"
      : remaining
        ? `${remaining}초 후 다시 보내기`
        : "확인 메일 다시 보내기",
  };
}
