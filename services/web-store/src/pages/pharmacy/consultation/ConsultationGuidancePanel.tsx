import { useEffect, useRef, useState } from "react";
import { consultationUi } from "./consultationLocale";
import {
  prepareConsultationGuidance,
  type GuidanceIntent,
  type GuidanceResult,
  type GuidanceCard,
  type ConsultationStation,
} from "../../../api/consultationWorkspace";
import {
  ConsultationProducts,
  type ConsultationProduct,
} from "./ConsultationProducts";
const button = "min-h-12 rounded-lg border px-4 py-3 disabled:opacity-50";
type GuidanceRequest = Parameters<typeof prepareConsultationGuidance>[0];
const labels: Record<string, string> = {
  ko: "한국어",
  en: "영어",
  zh: "중국어",
  ja: "일본어",
  vi: "베트남어",
  th: "태국어",
  id: "인도네시아어",
};
const tasks = [
  ["find-product", "상품 찾기"],
  ["location", "위치 안내"],
  ["product-details", "제품 설명"],
  ["pharmacist", "약사에게 안내"],
] as const;
export function ConsultationGuidancePanel({
  organizationId,
  mode,
  language,
  supportAllowed,
  locked = false,
  room,
  onShare,
  onVoice,
  voiceSupported,
  voiceListening,
  onRead,
  onStopReading,
  voice,
  inquiry,
  onProduct,
}: {
  organizationId: string;
  mode: string;
  language: string;
  supportAllowed: boolean;
  locked?: boolean;
  room: ConsultationStation | null;
  onShare: (id: string) => Promise<boolean>;
  onVoice: () => void;
  voiceSupported: boolean;
  voiceListening: boolean;
  onRead: (text: string, language: string) => void;
  onStopReading: () => void;
  voice: { text: string; sequence: number } | null;
  inquiry?: string;
  onProduct?: (product: ConsultationProduct) => void;
}) {
  const [intent, setIntent] = useState<GuidanceIntent>("help"),
    [question, setQuestion] = useState(""),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ConsultationProduct | null>(null),
    [choose, setChoose] = useState(false),
    [result, setResult] = useState<GuidanceResult | null>(null),
    [error, setError] = useState(""),
    [loading, setBusy] = useState(false);
  const busy = loading || locked || voiceListening;
  const [notice, setNotice] = useState(""),
    [showing, setShowing] = useState(false);
  const generation = useRef(0),
    alive = useRef(false),
    lock = useRef(false),
    dialog = useRef<HTMLDialogElement>(null);
  const lastVoice = useRef(0),
    lastAttempt = useRef<GuidanceRequest | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    generation.current++;
    lastAttempt.current = null;
    setResult(null);
    setError("");
    setNotice("");
    dialog.current?.close();
    setShowing(false);
    onStopReading();
  }, [organizationId, mode, language, room?.epoch, onStopReading]);
  useEffect(() => {
    if (!voice || voice.sequence === lastVoice.current) return;
    lastVoice.current = voice.sequence;
    setQuestion(voice.text);
    setError("");
  }, [voice]);
  const prepare = async (options: Partial<GuidanceRequest> = {}) => {
    if (lock.current || locked || voiceListening) return;
    const input: GuidanceRequest = {
      mode,
      language,
      intent,
      question,
      ...(selected ? { productKind: selected.kind, productId: selected.id } : {}),
      useAi: false,
      translateMaterial: false,
      ...(options.translateMaterial && result?.selection ? { selection: result.selection } : {}),
      ...(room?.active ? { stationId: room.id, epoch: room.epoch } : {}),
      ...options,
    };
    // A manual retry repeats this operation, including AI/translation and selected passages.
    lastAttempt.current = input;
    const request = ++generation.current;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    dialog.current?.close();
    setShowing(false);
    onStopReading();
    try {
      const data = await prepareConsultationGuidance(input);
      if (!alive.current || generation.current !== request) return;
      if (
        data.organizationId !== organizationId ||
        data.mode !== mode ||
        data.language !== language
      )
        throw new Error("상담 매장이나 언어가 변경되었습니다.");
      setResult(data);
      if (data.intent) setIntent(data.intent);
      setChoose(data.state === "clarify" && !!data.intent);
    } catch (e) {
      if (alive.current && generation.current === request)
        setError(
          (e as Error).message ||
            "안내를 준비하지 못했습니다. 입력과 선택을 유지했습니다.",
        );
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const show = async () => {
    if (!result?.card || busy || lock.current) return;
    const captured = result,
      request = generation.current;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (room?.active) {
        if (!captured.deliveryId)
          throw new Error("현재 매대 상담에 맞는 안내를 다시 준비해 주세요.");
        const ok = await onShare(captured.deliveryId);
        if (ok && alive.current && generation.current === request)
          setNotice("연결된 고객 화면에 전달했습니다.");
      } else {
        const checked = await prepareConsultationGuidance({
          mode,
          language,
          intent: captured.intent || intent,
          question,
          ...(selected
            ? { productKind: selected.kind, productId: selected.id }
            : {}),
        });
        if (
          !captured.sourceVersion ||
          checked.state !== "ready" ||
          checked.sourceVersion !== captured.sourceVersion
        )
          throw new Error(
            "상품 또는 게시 자료가 변경되었습니다. 현재 자료로 다시 준비해 주세요.",
          );
        if (alive.current && generation.current === request) {
          setShowing(true);
          dialog.current?.showModal();
        }
      }
    } catch (e) {
      if (alive.current && generation.current === request)
        setError(
          (e as Error).message ||
            "안내를 확인하지 못했습니다. 다시 준비해 주세요.",
        );
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const pick = (p: ConsultationProduct) => {
    generation.current++;
    setSelected(p);
    onProduct?.(p);
    setChoose(false);
    setResult(null);
    void prepare({
      intent: intent === "help" || intent === "pharmacist" ? "product-details" : intent,
      productKind: p.kind,
      productId: p.id,
    });
  };
  return (
    <section
      aria-label="상담 안내 준비"
      className="space-y-4 rounded-xl border bg-white p-4"
    >
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        aria-label="현장 빠른 안내"
      >
        {tasks.map(([key, label]) => (
          <button
            key={key}
            className={`${button} font-semibold ${intent === key ? "border-teal-600 bg-teal-50" : ""}`}
            disabled={busy || (key !== "pharmacist" && !supportAllowed)}
            aria-pressed={intent === key}
            onClick={() => {
              setIntent(key);
              setResult(null);
              void prepare({ intent: key });
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void prepare({ intent: "help" });
        }}
      >
        <input
          aria-label="상담 안내 요청"
          className="min-h-12 w-full min-w-0 rounded-lg border p-3 sm:w-auto sm:flex-1"
          placeholder="원하는 안내를 말하거나 적어주세요"
          maxLength={1000}
          value={question}
          disabled={busy}
          onChange={(e) => {
            setQuestion(e.target.value);
            setError("");
          }}
        />
        <button className={button} disabled={busy || !question.trim()}>
          안내 찾기
        </button>
        {voiceSupported && (
          <button
            type="button"
            className={button}
            disabled={loading || locked}
            aria-pressed={voiceListening}
            onClick={onVoice}
          >
            {voiceListening ? "요청 말하기 마치기" : "말로 안내 요청"}
          </button>
        )}
      </form>
      {voiceListening && <p role="status">요청을 듣고 있습니다. 말을 마친 뒤 안내를 찾아 주세요.</p>}
      {voice?.text && (
        <p className="text-xs text-slate-500">
          음성으로 입력한 요청을 확인한 뒤 안내를 찾아 주세요.
        </p>
      )}
      {inquiry && (
        <button
          className={button}
          disabled={busy}
          onClick={() => {
            setQuestion(inquiry);
            void prepare({ intent: "help", question: inquiry });
          }}
        >
          고객 질문으로 안내 찾기
        </button>
      )}
      {selected && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded bg-slate-50 p-3">
          <span>
            지금 안내하는 상품: <strong>{selected.name}</strong>
          </span>
          <button
            className={button}
            disabled={busy}
            onClick={() => {
              generation.current++;
              setChoose(true);
              setResult(null);
            }}
          >
            다른 상품 선택
          </button>
          <a className="inline-flex min-h-12 items-center text-sm text-teal-800 underline" target="_blank" rel="noreferrer"
            href={`/store/products/multilingual/${selected.kind}/${encodeURIComponent(selected.id)}?${new URLSearchParams({ name: selected.name, store: organizationId })}`}>
            상품 안내 자료 확인·보완 ↗
          </a>
        </div>
      )}
      {busy && (
        <p role="status">
          {intent === "product-details"
            ? "자료를 확인하고 있습니다…"
            : "안내를 준비하고 있습니다…"}
        </p>
      )}
      {error && (
        <div role="alert" className="rounded border border-red-200 p-3">
          <p>{error}</p>
          <button
            className={button}
            disabled={busy}
            onClick={() => void prepare(lastAttempt.current ?? {})}
          >
            같은 안내 다시 준비
          </button>
        </div>
      )}
      {result?.message && (
        <p role="status" className="rounded bg-teal-50 p-3">
          {result.message}
        </p>
      )}
      {choose && supportAllowed && (
        <div className="space-y-3">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(search.trim());
            }}
          >
            <label className="flex-1">
              상품 이름
              <input
                aria-label="상담 상품 이름"
                className="block min-h-12 w-full min-w-0 rounded border p-3"
                maxLength={80}
                value={search}
                disabled={busy}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <button className={button} disabled={busy || !search.trim()}>
              상품 검색
            </button>
          </form>
          <ConsultationProducts
            query={query}
            busy={busy}
            onSelect={pick}
            selectLabel={
              intent === "location" || intent === "find-product"
                ? "이 상품 위치 안내"
                : "이 상품 설명 보기"
            }
          />
        </div>
      )}
      {result?.card && (
        <div
          aria-label="준비된 상담 안내"
          className="space-y-3 rounded-xl border border-teal-200 p-4"
        >
          <GuidanceContent card={result.card} />
          <p className="text-xs text-slate-500">
            {result.aiSelected
              ? "AI가 질문에 맞춰 고른 게시 문단입니다."
              : "현재 매장의 상품·게시 자료에서 발췌한 안내입니다."}{" "}
            원문과 안내를 확인한 뒤 고객에게 보여 주세요.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className={`${button} bg-teal-700 text-white`}
              disabled={busy}
              onClick={() => void show()}
            >
              {room?.active
                ? "고객 화면에 안내 전달"
                : "이 화면에서 고객에게 보여주기"}
            </button>
            <button
              className={button}
              disabled={busy}
              onClick={() => onRead(result.card!.text, result.card!.language)}
            >
              안내 읽어주기
            </button>
            {intent === "product-details" && (
              <button
                className={button}
                disabled={busy || !question.trim()}
                onClick={() => void prepare({ useAi: true })}
              >
                AI로 관련 문단 추리기
              </button>
            )}
            {result.canTranslate && !result.card.translated && (
              <button
                className={button}
                disabled={busy}
                onClick={() => void prepare({ translateMaterial: true })}
              >
                선택 언어로 번역 준비
              </button>
            )}
          </div>
        </div>
      )}
      {result?.publicKey && !result.card && (
        <a
          className="inline-flex min-h-12 items-center underline"
          target="_blank"
          rel="noreferrer"
          href={publicUrl(result.publicKey, language)}
        >
          게시된 원문 열기 ↗
        </a>
      )}
      {notice && <p role="status">{notice}</p>}
      <dialog
        ref={dialog}
        aria-label="고객용 상담 안내"
        onClose={() => {
          setShowing(false);
          onStopReading();
        }}
        onCancel={() => {
          setShowing(false);
          onStopReading();
        }}
        className="w-11/12 max-w-4xl space-y-5 rounded-xl p-6 backdrop:bg-black/50"
      >
        {showing && result?.card && (
          <>
            <GuidanceContent card={result.card} large />
            <button
              className={button}
              onClick={() => onRead(result.card!.text, result.card!.language)}
            >
              {consultationUi(language).listen}
            </button>
          </>
        )}
        <form method="dialog">
          <button className={button}>상담 화면으로</button>
        </form>
      </dialog>
    </section>
  );
}
function publicUrl(key: string, language: string) {
  return `https://pharmacy.neture.co.kr/multilingual-products/${encodeURIComponent(key)}?locale=${encodeURIComponent(language)}`;
}
function GuidanceContent({
  card,
  large = false,
}: {
  card: GuidanceCard;
  large?: boolean;
}) {
  const copy = large ? consultationUi(card.requestedLanguage) : null;
  return (
    <>
      <h2
        className={
          large ? "break-words text-3xl font-semibold" : "text-lg font-semibold"
        }
      >
        {card.title}
      </h2>
      {card.fallbackUsed && (
        <p className="rounded bg-amber-50 p-3 text-sm">
          {copy ? (
            `${copy.fallback} (${card.language})`
          ) : (
            <>
              {labels[card.requestedLanguage] || card.requestedLanguage} 자료가
              없어 {labels[card.language] || card.language} 원문을 표시합니다.
            </>
          )}
        </p>
      )}
      {card.translated && (
        <p className="text-sm">
          {copy?.translated || "게시 자료 번역 · 직원 확인 후 안내"}
        </p>
      )}
      <p
        className={`whitespace-pre-wrap break-words ${large ? "text-3xl leading-relaxed sm:text-5xl" : "text-lg"}`}
        lang={card.language}
      >
        {card.text}
      </p>
      {card.source && (
        <p className="text-sm text-slate-600">
          {copy?.source || "출처"}: {card.source.title} ·{" "}
          {labels[card.source.language] || card.source.language}
        </p>
      )}
      {card.publicKey && (
        <a
          className="inline-flex min-h-12 items-center rounded border px-4"
          target="_blank"
          rel="noreferrer"
          href={publicUrl(card.publicKey, card.requestedLanguage)}
        >
          {copy?.details || "게시된 제품 원문"} ↗
        </a>
      )}
    </>
  );
}
