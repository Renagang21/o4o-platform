import { useCallback, useEffect, useRef, useState } from "react";
import {
  kioskRequest,
  type KioskAnswer,
  type KioskCard,
  type KioskContext,
  type KioskCredential,
} from "../../../api/consultationWorkspace";
import { useConsultationAudio } from "../useConsultationAudio";
import { kioskUi } from "./kioskLocale";

const credentialKey = "o4o:consultation-kiosk-device:v1";
/** 다음 고객을 위해 마지막 조작 뒤 이 시간이 지나면 처음 화면으로 돌아간다. */
export const KIOSK_IDLE_MS = 120_000;
const big = "min-h-14 rounded-xl border px-5 py-3 text-lg disabled:opacity-50";
type Product = { kind: string; id: string; name: string };
type Failure = Error & { status?: number };

function stored(): KioskCredential | null {
  try {
    const value = JSON.parse(localStorage.getItem(credentialKey) || "null");
    return value && typeof value.id === "string" && typeof value.name === "string" && /^[a-f0-9]{64}$/.test(value.token) ? value : null;
  } catch {
    return null;
  }
}

/**
 * 소비자 태블릿(키오스크). 직원 로그인 · 매장 선택 · 관리 화면 밖에 있다.
 * 고객이 직접 묻고 답을 받는 단일 화면이며, 근무자 수준(상품 · 위치 · 게시 제품 설명 · 약사 연결)만 보여 준다.
 */
export default function KioskConsultationPage() {
  const [credential, setCredential] = useState(stored);
  const [code, setCode] = useState("");
  const [context, setContext] = useState<KioskContext | null>(null);
  const [language, setLanguage] = useState("ko"); // 'auto' 또는 언어 key
  const [uiLanguage, setUiLanguage] = useState("ko");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [question, setQuestion] = useState("");
  const [card, setCard] = useState<KioskCard | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const target = useRef<"search" | "question">("search");
  const generation = useRef(0);
  const copy = kioskUi(uiLanguage);
  const requestLanguage = language === "auto" ? "auto" : language;

  const speech = useConsultationAudio(`${credential?.id}:${language}`, (words) => {
    const set = target.current === "search" ? setSearch : setQuestion;
    set((previous) => [previous.trim(), words].filter(Boolean).join(" ").slice(0, 300));
  }, {
    recognition: context?.runtime?.recognition, synthesis: context?.runtime?.synthesis,
    recognize: async (audioBase64, spoken) => kioskRequest<{ text: string; language: string }>("speech/recognize",
      { ...credential, audioBase64, language: language === "auto" && context?.runtime?.detectLanguage ? "auto" : spoken }),
    synthesize: async (text, spoken) => kioskRequest<{ audioBase64: string; mimeType: string }>("speech/synthesize", { ...credential, text, language: spoken }),
    onLanguage: (value) => { if (context?.languages.some((item) => item.key === value)) setUiLanguage(value); },
    onAccessDenied: () => revoke(),
  });
  const resetSpeech = speech.reset;

  const startOver = useCallback(() => {
    generation.current++;
    resetSpeech();
    setSearch(""); setProducts(null); setProduct(null); setQuestion(""); setCard(null); setMessage(""); setError(""); setBusy(false);
  }, [resetSpeech]);
  const revoke = useCallback(() => {
    startOver();
    try { localStorage.removeItem(credentialKey); } catch { /* 메모리 상태만으로도 차단된다. */ }
    setCredential(null); setContext(null);
  }, [startOver]);

  useEffect(() => {
    if (!credential) return;
    let cancelled = false;
    setContext(null); setError("");
    kioskRequest<KioskContext>("context", { id: credential.id, token: credential.token })
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data?.languages) || !data.languages.length) throw new Error("invalid");
        setContext(data);
        if (data.runtime?.detectLanguage) setLanguage("auto");
      })
      .catch((cause: Failure) => {
        if (cancelled) return;
        const code = String((cause as { code?: string }).code ?? "");
        if (cause.status === 401 || ["KIOSK_NOT_REGISTERED", "CONSULTATION_ACCESS_REVOKED"].includes(code)) revoke();
        else setError(cause.message || kioskUi("ko").failed);
      });
    return () => { cancelled = true; };
  }, [credential, revoke]);

  // 다음 고객이 앞 고객의 질문 · 답을 보지 않게 한다.
  useEffect(() => {
    if (!credential) return;
    let timer = window.setTimeout(startOver, KIOSK_IDLE_MS);
    const touch = () => { clearTimeout(timer); timer = window.setTimeout(startOver, KIOSK_IDLE_MS); };
    const events = ["pointerdown", "keydown"] as const;
    events.forEach((name) => window.addEventListener(name, touch));
    window.addEventListener("pagehide", startOver);
    return () => {
      clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, touch));
      window.removeEventListener("pagehide", startOver);
    };
  }, [credential, startOver]);

  const run = async (action: "search" | "answer" | "pharmacist", body: Record<string, unknown>) => {
    if (!credential || busy) return null;
    const version = ++generation.current;
    resetSpeech(); setBusy(true); setError(""); setMessage("");
    try {
      const data = await kioskRequest<KioskAnswer>(action, { id: credential.id, token: credential.token, ...body });
      if (generation.current !== version) return null;
      if (context?.languages.some((item) => item.key === data.language)) setUiLanguage(data.language);
      if (data.card) { setCard(data.card); }
      if (typeof data.message === "string") setMessage(data.message);
      return data;
    } catch (cause) {
      if (generation.current !== version) return null;
      const failure = cause as Failure;
      const code = String((failure as { code?: string }).code ?? "");
      // 기기 자격이 끊긴 경우만 연결을 지운다. 매장 이용 자격 문제는 안내만 하고 기기 연결은 유지한다.
      if (failure.status === 401 || ["KIOSK_NOT_REGISTERED", "CONSULTATION_ACCESS_REVOKED"].includes(code)) revoke();
      else setError(failure.message || copy.failed);
      return null;
    } finally {
      if (generation.current === version) setBusy(false);
    }
  };
  const find = async () => {
    if (!search.trim()) return;
    setCard(null); setProduct(null); setProducts(null);
    const data = await run("search", { text: search.trim(), language: requestLanguage });
    if (data?.state === "products") setProducts(data.products ?? []);
  };
  const answer = async (intent: "location" | "product-details") => {
    if (!product) return;
    setCard(null);
    const ask = intent === "product-details" && question.trim() ? question.trim() : "";
    await run("answer", { intent, productKind: product.kind, productId: product.id,
      language: ask ? requestLanguage : uiLanguage, ...(ask ? { question: ask } : {}) });
  };
  const listen = (field: "search" | "question") => {
    if (speech.listening) { speech.finishListening(); return; }
    target.current = field;
    speech.startListening(uiLanguage);
  };

  if (!credential)
    return (
      <main className="mx-auto max-w-xl space-y-4 p-6">
        <h1 className="text-2xl font-bold">{copy.connectTitle}</h1>
        <p>{copy.connectHelp}</p>
        <form className="space-y-3" onSubmit={async (event) => {
          event.preventDefault();
          if (busy || !code.trim()) return;
          setBusy(true); setError("");
          try {
            const value = await kioskRequest<KioskCredential>("claim", { code });
            try { localStorage.setItem(credentialKey, JSON.stringify(value)); } catch { /* 이 화면을 닫기 전까지만 연결된다. */ }
            setCode(""); setCredential(value);
          } catch (cause) {
            setError((cause as Error).message || copy.failed);
          } finally { setBusy(false); }
        }}>
          <label className="block space-y-1">
            <span>{copy.code}</span>
            <input className="w-full rounded border p-3 text-xl tracking-widest" value={code} maxLength={11}
              autoComplete="off" onChange={(event) => setCode(event.target.value.toUpperCase())} />
          </label>
          <button className={big} disabled={busy || !code.trim()}>{copy.connect}</button>
        </form>
        {error && <p role="alert" className="text-red-700">{error}</p>}
      </main>
    );

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{copy.title}</h1>
        {context && (
          <div role="group" aria-label={copy.language} className="flex flex-wrap gap-2">
            {context.runtime?.detectLanguage && (
              <button type="button" aria-pressed={language === "auto"} className={`min-h-11 rounded border px-3 ${language === "auto" ? "border-teal-700 bg-teal-50" : ""}`}
                onClick={() => { startOver(); setLanguage("auto"); }}>{copy.auto}</button>
            )}
            {context.languages.map((item) => (
              <button key={item.key} type="button" lang={item.key} aria-pressed={language === item.key}
                className={`min-h-11 rounded border px-3 ${language === item.key ? "border-teal-700 bg-teal-50" : ""}`}
                onClick={() => { startOver(); setLanguage(item.key); setUiLanguage(item.key); }}>{item.label}</button>
            ))}
          </div>
        )}
      </header>
      {!context && !error && <output className="block">{copy.busy}</output>}
      {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-red-800">{error}</p>}
      {speech.message && <output className="block rounded border bg-amber-50 p-3 text-sm">{speech.message}</output>}
      {context && (
        <>
          <section aria-label={copy.find} className="space-y-3 rounded-xl border bg-white p-4">
            <label className="block space-y-2">
              <span className="text-lg font-medium">{copy.searchLabel}</span>
              <input className="w-full rounded border p-3 text-lg" value={search} maxLength={300} placeholder={copy.searchPlaceholder}
                onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void find(); }} />
            </label>
            <div className="flex flex-wrap gap-3">
              {speech.inputSupported && (
                <button type="button" className={big} disabled={busy} onClick={() => listen("search")}>
                  {speech.listening && target.current === "search" ? copy.finish : copy.speak}
                </button>
              )}
              <button type="button" className={`${big} border-teal-700 bg-teal-700 text-white`} disabled={busy || speech.listening || !search.trim()}
                onClick={() => void find()}>{copy.find}</button>
            </div>
          </section>
          {products && (
            <section aria-label={copy.results} className="space-y-2">
              <h2 className="text-lg font-semibold">{copy.results}</h2>
              {products.length === 0 ? <p>{copy.noResults}</p> : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {products.map((item) => (
                    <li key={`${item.kind}:${item.id}`}>
                      <button type="button" aria-pressed={product?.id === item.id}
                        className={`${big} w-full text-left ${product?.id === item.id ? "border-teal-700 bg-teal-50" : ""}`}
                        onClick={() => { setProduct(item); setCard(null); setMessage(""); setQuestion(""); }}>{item.name}</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {product && (
            <section aria-label={product.name} className="space-y-3 rounded-xl border bg-white p-4">
              <h2 className="text-xl font-semibold">{product.name}</h2>
              <div className="flex flex-wrap gap-3">
                <button type="button" className={big} disabled={busy || speech.listening} onClick={() => void answer("location")}>{copy.location}</button>
                <button type="button" className={big} disabled={busy || speech.listening} onClick={() => void answer("product-details")}>{copy.details}</button>
              </div>
              <label className="block space-y-2">
                <span>{copy.questionLabel}</span>
                <input className="w-full rounded border p-3" value={question} maxLength={300} placeholder={copy.questionPlaceholder}
                  onChange={(event) => setQuestion(event.target.value)} />
              </label>
              <div className="flex flex-wrap gap-3">
                {speech.inputSupported && (
                  <button type="button" className={big} disabled={busy} onClick={() => listen("question")}>
                    {speech.listening && target.current === "question" ? copy.finish : copy.speak}
                  </button>
                )}
                <button type="button" className={big} disabled={busy || speech.listening || !question.trim()}
                  onClick={() => void answer("product-details")}>{copy.ask}</button>
              </div>
            </section>
          )}
          {busy && <output className="block">{copy.busy}</output>}
          {card && (
            <section aria-label={card.title} aria-live="polite" className="space-y-3 rounded-xl border-2 border-teal-700 bg-teal-50 p-5">
              <h2 className="text-xl font-semibold" lang={card.language}>{card.title}</h2>
              <p className="whitespace-pre-line text-lg" lang={card.language}>{card.text}</p>
              {card.fallbackUsed && <p className="text-sm text-slate-600">{copy.fallback}</p>}
              {speech.outputSupported && (
                <button type="button" className={big} onClick={() => speech.speaking ? speech.stopReading() : speech.read(card.text, card.language)}>
                  {speech.speaking ? copy.stop : copy.listen}
                </button>
              )}
            </section>
          )}
          {message && !card && <p role="status" className="rounded border bg-slate-50 p-3">{message}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="button" className={big} disabled={busy}
              onClick={() => { setCard(null); void run("pharmacist", { language: uiLanguage }); }}>{copy.pharmacist}</button>
            <button type="button" className={big} onClick={startOver}>{copy.back}</button>
          </div>
          <p className="text-xs text-slate-500">{copy.privacy}</p>
        </>
      )}
    </main>
  );
}
