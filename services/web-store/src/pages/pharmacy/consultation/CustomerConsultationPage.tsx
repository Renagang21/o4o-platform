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
  const [text, setText] = useState(""),
    [language, setLanguage] = useState("ko"),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0);
  const alive = useRef(false),
    generation = useRef(0),
    lock = useRef(false),
    latest = useRef<CustomerScreen | null>(null),
    draftEpoch = useRef<string | null>(null);
  const reset = useCallback(() => {
    latest.current = null;
    draftEpoch.current = null;
    setScreen(null);
    setText("");
    setNotice("");
  }, []);
  const speech = useConsultationSpeech(
    `${credential?.id}:${screen?.epoch}:${language}`,
    (words) =>
      setText((previous) =>
        [previous, words].filter(Boolean).join(" ").slice(0, 1000),
      ),
  );
  const resetSpeech = speech.reset;
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
    setError("");
    if (!credential) return;
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
          draftEpoch.current = value.epoch;
          setText("");
          setNotice("");
          setLanguage(value.language);
          resetSpeech();
        }
        if (
          latest.current?.epoch === value.epoch &&
          latest.current.version > value.version
        )
          return;
        latest.current = value;
        setScreen(value);
        setError("");
        if (value.state !== "active") {
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
            reset();
            try {
              localStorage.removeItem(credentialKey);
            } catch {
              /* Storage may be disabled. */
            }
            setCredential(null);
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
  }, [credential, retry, reset, resetSpeech]);
  const pair = async () => {
    if (lock.current || !code.trim()) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const version = generation.current;
    try {
      const value = await customerRequest<CustomerCredential>("claim", {
        code,
      });
      if (!alive.current || generation.current !== version) return;
      if (
        !value?.id ||
        typeof value.name !== "string" ||
        !/^[a-f0-9]{64}$/.test(value.token)
      )
        throw new Error("연결 응답을 확인하지 못했습니다.");
      try {
        localStorage.setItem(credentialKey, JSON.stringify(value));
      } catch {
        setNotice(
          "이 브라우저에서는 연결이 저장되지 않습니다. 다음에 다시 연결해 주세요.",
        );
      }
      setCredential(value);
      setCode("");
    } catch (e) {
      if (alive.current && generation.current === version)
        setError((e as Error).message);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
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
        latest.current?.epoch === current.epoch
      ) {
        setText("");
        setNotice("직원에게 전달했습니다. / Sent to staff.");
      }
    } catch (e) {
      if (alive.current && generation.current === version)
        setError((e as Error).message);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const forgetDevice = () => {
    generation.current++;
    reset();
    resetSpeech();
    try {
      localStorage.removeItem(credentialKey);
    } catch {
      /* In-memory reset still works. */
    }
    setCredential(null);
    setError("");
  };
  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-6 bg-slate-50 p-5 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">
          고객 상담 · Customer consultation
        </h1>
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
              다시 연결 확인 / Retry
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
          <h2 className="text-3xl">상담을 준비하고 있습니다.</h2>
          <p className="mt-4 text-xl">Please wait for the staff.</p>
        </section>
      ) : (
        <>
          <section
            aria-label="고객에게 전달된 안내"
            className="space-y-5 rounded-2xl border bg-white p-6 sm:p-10"
          >
            <h2 className="text-xl font-medium">
              {screen.shared?.title ||
                "직원의 안내를 기다려 주세요. / Waiting for guidance."}
            </h2>
            {screen.shared && (
              <>
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
                    {speech.speaking ? "읽기 중지 / Stop" : "읽어주기 / Listen"}
                  </button>
                )}
                {screen.shared.publicKey && (
                  <a
                    className={button}
                    target="_blank"
                    rel="noreferrer"
                    href={`https://pharmacy.neture.co.kr/multilingual-products/${encodeURIComponent(screen.shared.publicKey)}`}
                  >
                    제품 설명 / Product details ↗
                  </a>
                )}
              </>
            )}
          </section>
          <section
            aria-label="고객 답변"
            className="space-y-4 rounded-xl border bg-white p-5"
          >
            <h2 className="text-xl font-semibold">
              말씀해 주세요. / Your reply
            </h2>
            <label className="block">
              언어 / Language{" "}
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
                {speech.listening
                  ? "음성 입력 마치기 / Finish"
                  : "눌러서 말하기 / Tap to speak"}
              </button>
            )}
            <label className="block">
              <span>전달할 내용 / Message</span>
              <textarea
                autoComplete="off"
                aria-label="고객 답변 입력"
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
              직원에게 전달 / Send
            </button>
            <p className="text-sm text-slate-600">
              이름·연락처를 입력하지 마세요. 음성은 브라우저의 인식 서비스로
              전달될 수 있습니다. / Please do not enter personal details.
            </p>
          </section>
        </>
      )}
      {speech.message && <p role="status">{speech.message}</p>}
      {notice && <p role="status">{notice}</p>}
      {credential && (
        <details className="border-t pt-4">
          <summary className="min-h-12 cursor-pointer">
            기기 연결 설정 / Device connection
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
