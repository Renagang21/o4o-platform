import { consultationUi } from "./consultationLocale";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  customerRequest,
  validCustomerScreen,
  type CustomerCredential,
  type CustomerScreen,
} from "../../../api/consultationWorkspace";
import { useConsultationSpeech } from "../useConsultationSpeech";
const credentialKey = "o4o:consultation-customer-device:v1";
const button =
  "min-h-14 rounded-xl border px-5 py-3 text-lg disabled:opacity-50";
function stored(): CustomerCredential | null {
  try {
    const value = JSON.parse(localStorage.getItem(credentialKey) || "null");
    return value &&
      typeof value.id === "string" &&
      typeof value.name === "string" &&
      /^[a-f0-9]{64}$/.test(value.token)
      ? value
      : null;
  } catch {
    return null;
  }
}
/** Intentionally outside employee authentication, Store selection and management layouts. */
export default function CustomerConsultationPage() {
  const [credential, setCredential] = useState(stored),
    [code, setCode] = useState("");
  const [screen, setScreen] = useState<CustomerScreen | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [storageWarning, setStorageWarning] = useState(false);
  const [text, setText] = useState(""),
    [language, setLanguage] = useState("ko"),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0);
  const alive = useRef(false),
    generation = useRef(0),
    lock = useRef(false),
    latest = useRef<CustomerScreen | null>(null),
    draftEpoch = useRef<string | null>(null);
  const submission = useRef(0);
  const invalidateSubmission = useCallback(() => {
    submission.current++;
    lock.current = false;
    setBusy(false);
  }, []);
  const reset = useCallback(() => {
    invalidateSubmission();
    latest.current = null;
    draftEpoch.current = null;
    setScreen(null);
    setText("");
    setNotice("");
  }, [invalidateSubmission]);
  const speech = useConsultationSpeech(
    `${credential?.id}:${screen?.epoch}:${language}`,
    (words) =>
      setText((previous) =>
        [previous, words].filter(Boolean).join(" ").slice(0, 1000),
      ),
  );
  const copy = consultationUi(screen?.language || language);
  const textRef = useRef(text);
  textRef.current = text;
  const resetSpeech = speech.reset;
  const stopReading = speech.stopReading;
  const revokeDevice = useCallback(() => {
    generation.current++;
    reset();
    resetSpeech();
    setStorageWarning(false);
    try { localStorage.removeItem(credentialKey); } catch { /* In-memory revocation still applies. */ }
    setCredential(null);
  }, [reset, resetSpeech]);
  useEffect(() => {
    alive.current = true;
    const forget = () => {
      generation.current++;
      reset();
      resetSpeech();
    };
    const restore = () => setRetry((n) => n + 1);
    window.addEventListener("pagehide", forget);
    window.addEventListener("pageshow", restore);
    return () => {
      alive.current = false;
      window.removeEventListener("pagehide", forget);
      window.removeEventListener("pageshow", restore);
    };
  }, [reset, resetSpeech]);
  useEffect(() => {
    reset();
  }, [credential, reset]);
  useEffect(() => {
    const version = ++generation.current;
    latest.current = null;
    setScreen(null);
    if (!credential) return;
    setError("");
    let cancelled = false,
      timer: number | undefined;
    const controller = new AbortController();
    const read = async () => {
      if (cancelled) return;
      if (document.hidden) {
        reset();
        timer = window.setTimeout(() => void read(), 2500);
        return;
      }
      try {
        const value = await customerRequest<CustomerScreen>(
          "read",
          { id: credential.id, token: credential.token },
          controller.signal,
        );
        if (cancelled || generation.current !== version || document.hidden)
          return;
        if (!validCustomerScreen(value) || value.id !== credential.id)
          throw new Error("고객 화면 응답을 확인하지 못했습니다.");
        if (draftEpoch.current !== value.epoch) {
          invalidateSubmission();
          draftEpoch.current = value.epoch;
          setText("");
          setNotice("");
          setLanguage(value.language);
          resetSpeech();
        }
        if (
          latest.current?.epoch === value.epoch &&
          latest.current.language !== value.language &&
          !textRef.current.trim()
        )
          setLanguage(value.language);
        if (
          latest.current?.epoch === value.epoch &&
          latest.current.version > value.version
        )
          return;
        if (JSON.stringify(latest.current?.shared ?? null) !== JSON.stringify(value.shared ?? null))
          stopReading();
        latest.current = value;
        setScreen(value);
        setError("");
        if (value.state !== "active") {
          invalidateSubmission();
          setText("");
          setNotice("");
          resetSpeech();
        }
      } catch (e) {
        if (!cancelled && generation.current === version) {
          // Hide shared material immediately; keep an unsent draft only until the same epoch is verified.
          latest.current = null;
          setScreen(null);
          resetSpeech();
          setError((e as Error).message || "연결을 확인하지 못했습니다.");
          if ([401, 403].includes((e as { status?: number }).status ?? 0)) {
            revokeDevice();
          }
        }
      } finally {
        if (!cancelled) timer = window.setTimeout(() => void read(), 2500);
      }
    };
    const hidden = () => {
      if (document.hidden) {
        generation.current++;
        reset();
        resetSpeech();
      } else setRetry((n) => n + 1);
    };
    document.addEventListener("visibilitychange", hidden);
    void read();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [credential, retry, reset, resetSpeech, stopReading, revokeDevice, invalidateSubmission]);
  const pair = async () => {
    if (lock.current || !code.trim()) return;
    const request = ++submission.current;
    lock.current = true;
    setBusy(true);
    setError("");
    const version = generation.current;
    try {
      const value = await customerRequest<CustomerCredential>("claim", {
        code,
      });
      if (!alive.current || generation.current !== version || submission.current !== request) return;
      if (
        !value?.id ||
        typeof value.name !== "string" ||
        !/^[a-f0-9]{64}$/.test(value.token)
      )
        throw new Error("연결 응답을 확인하지 못했습니다.");
      setStorageWarning(false);
      try {
        localStorage.setItem(credentialKey, JSON.stringify(value));
      } catch {
        setStorageWarning(true);
      }
      setCredential(value);
      setCode("");
    } catch (e) {
      if (alive.current && generation.current === version && submission.current === request)
        setError((e as Error).message);
    } finally {
      if (submission.current === request) {
        lock.current = false;
        if (alive.current) setBusy(false);
      }
    }
  };
  const send = async () => {
    const current = latest.current;
    if (
      !credential ||
      current?.state !== "active" ||
      !text.trim() ||
      lock.current
    )
      return;
    const version = generation.current;
    const request = ++submission.current;
    lock.current = true;
    setBusy(true);
    setError("");
    resetSpeech();
    try {
      await customerRequest("reply", {
        id: credential.id,
        token: credential.token,
        epoch: current.epoch,
        text,
        language,
      });
      if (
        alive.current &&
        generation.current === version &&
        submission.current === request &&
        latest.current?.epoch === current.epoch
      ) {
        setText("");
        setNotice(copy.sent);
        setLanguage(latest.current.language);
      }
    } catch (e) {
      if (alive.current && generation.current === version && submission.current === request && draftEpoch.current === current.epoch) {
        if ([401, 403].includes((e as { status?: number }).status ?? 0)) revokeDevice();
        setError((e as Error).message || "답변을 전달하지 못했습니다. 다시 시도해 주세요.");
      }
    } finally {
      if (submission.current === request) {
        lock.current = false;
        if (alive.current) setBusy(false);
      }
    }
  };
  const forgetDevice = () => {
    revokeDevice();
    setError("");
  };
  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-6 bg-slate-50 p-5 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{copy.title}</h1>
        {credential && <span>{credential.name}</span>}
      </header>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-white p-4"
        >
          <p>{error}</p>
          {credential && (
            <button className={button} onClick={() => setRetry((n) => n + 1)}>
              {copy.retry}
            </button>
          )}
        </div>
      )}
      {!credential ? (
        <section className="space-y-4 rounded-xl border bg-white p-6">
          <h2 className="text-xl font-semibold">고객 화면 연결</h2>
          <p>직원 상담 화면에 표시된 연결 코드를 입력해 주세요.</p>
          <form
            className="flex flex-wrap gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void pair();
            }}
          >
            <input
              aria-label="고객 화면 연결 코드"
              autoComplete="off"
              maxLength={11}
              className="min-h-14 min-w-0 rounded-xl border p-3 text-xl uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button className={button} disabled={busy || !code.trim()}>
              연결하기
            </button>
          </form>
        </section>
      ) : !screen || screen.state === "waiting" ? (
        <section className="rounded-xl bg-white p-8 text-center">
          <h2 className="text-3xl">{copy.waiting}</h2>
        </section>
      ) : (
        <>
          <section
            aria-label={copy.guidance}
            className="space-y-5 rounded-2xl border bg-white p-6 sm:p-10"
          >
            <h2 className="text-xl font-medium">
              {screen.shared?.title || copy.guidance}
            </h2>
            {screen.shared && (
              <>
                {screen.shared.fallbackUsed && (
                  <p className="rounded bg-amber-50 p-3">
                    {copy.fallback} ({screen.shared.language})
                  </p>
                )}
                {screen.shared.translated && <p>{copy.translated}</p>}
                {screen.shared.source && (
                  <p className="text-sm">
                    {copy.source}: {screen.shared.source.title} (
                    {screen.shared.source.language})
                  </p>
                )}
                <p
                  className="whitespace-pre-wrap break-words text-3xl leading-relaxed sm:text-5xl"
                  lang={screen.shared.language || "ko"}
                >
                  {screen.shared.text}
                </p>
                {speech.outputSupported && (
                  <button
                    className={button}
                    onClick={() =>
                      speech.speaking
                        ? speech.stopReading()
                        : speech.read(
                            screen.shared!.text,
                            screen.shared!.language || "ko",
                          )
                    }
                  >
                    {speech.speaking ? copy.stop : copy.listen}
                  </button>
                )}
                {screen.shared.publicKey && (
                  <a
                    className={button}
                    target="_blank"
                    rel="noreferrer"
                    href={`https://pharmacy.neture.co.kr/multilingual-products/${encodeURIComponent(screen.shared.publicKey)}?locale=${encodeURIComponent(screen.shared.requestedLanguage || screen.language)}`}
                  >
                    {copy.details} ↗
                  </a>
                )}
              </>
            )}
          </section>
          <section
            aria-label={copy.reply}
            className="space-y-4 rounded-xl border bg-white p-5"
          >
            <h2 className="text-xl font-semibold">{copy.reply}</h2>
            <label className="block">
              {copy.language}{" "}
              <select
                className="min-h-14 rounded border p-3"
                value={language}
                disabled={busy || speech.listening}
                onChange={(e) => {
                  resetSpeech();
                  setLanguage(e.target.value);
                }}
              >
                {screen.languages.map((l) => (
                  <option key={l.key} value={l.key}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            {speech.inputSupported && (
              <button
                className={button}
                disabled={busy}
                aria-pressed={speech.listening}
                onClick={() =>
                  speech.listening
                    ? speech.finishListening()
                    : speech.startListening(language)
                }
              >
                {speech.listening ? copy.finish : copy.speak}
              </button>
            )}
            <label className="block">
              <span>{copy.message}</span>
              <textarea
                autoComplete="off"
                aria-label={copy.message}
                className="mt-2 min-h-28 w-full rounded border p-3 text-xl"
                maxLength={1000}
                value={text}
                disabled={busy}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <button
              className={`${button} bg-teal-700 text-white`}
              disabled={busy || speech.listening || !text.trim()}
              onClick={() => void send()}
            >
              {copy.send}
            </button>
            <p className="text-sm text-slate-600">{copy.privacy}</p>
          </section>
        </>
      )}
      {speech.message && <p role="status">{speech.message}</p>}
      {notice && <p role="status">{notice}</p>}
      {credential && storageWarning && <p role="status">이 브라우저에서는 연결이 저장되지 않습니다. 다음에 다시 연결해 주세요.</p>}
      {credential && (
        <details className="border-t pt-4">
          <summary className="min-h-12 cursor-pointer">
            {copy.connection}
          </summary>
          <button className={button} onClick={forgetDevice}>
            이 브라우저의 연결 지우기
          </button>
          <p className="text-sm">
            연결 자체를 폐기하려면 직원 화면에서 ‘고객 기기 연결 해제’를
            사용하세요.
          </p>
        </details>
      )}
    </main>
  );
}
