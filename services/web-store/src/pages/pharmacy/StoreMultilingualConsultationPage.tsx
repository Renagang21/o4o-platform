import { ConsultationAccessNotice, ConsultationMyHomeLink, consultationAccessError } from './consultation/ConsultationAccessNotice';
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConsultationSelectors,
  ConsultationInput,
  TranslationResult,
  CustomerDialog,
  type Context,
  type Result,
} from "./consultation/ConsultationParts";
import { useSearchParams } from "react-router-dom";
import { useConsultationStation } from "./consultation/useConsultationStation";
import {
  ConsultationStationPanel,
  ConsultationIncomingReply,
} from "./consultation/ConsultationStationPanel";
import { ConsultationGuidancePanel } from "./consultation/ConsultationGuidancePanel";
import { ConsultationSupportPanel } from './consultation/ConsultationSupportPanel';
import type { ConsultationProduct } from './consultation/ConsultationProducts';
import { coreApiClient } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { useUnifiedStore } from "../../contexts/StoreContext";
import { useConsultationAudio } from './useConsultationAudio';
import { prepareConsultationSupport, type ConsultationSupportSourceProof } from '../../api/consultationWorkspace';
import {
  useConsultationDrafts,
  type ConsultationDirection,
} from "./useConsultationDrafts";

const base = "/neture/pharmacy/multilingual-consultation";
/**
 * 상담 태블릿 종류별로 쓸 수 있는 상담 방식. 매장 이용 자격(기능)은 그대로 두고
 * 앞쪽 방식부터 고른다. 한 태블릿에서 문의와 답변을 끝내므로 고객 화면 연결은 쓰지 않는다.
 */
export const TABLET_ROLE_MODES = {
  pharmacist: ["floor-pharmacist", "counter-pharmacist"],
  staff: ["floor-staff", "counter-staff"],
} as const;
export type TabletRole = keyof typeof TABLET_ROLE_MODES;
const ROLE_TITLE: Record<TabletRole, string> = { pharmacist: "약사 상담", staff: "근무자 상담" };
const tabletRole = (value: string | null): TabletRole | null =>
  value === "pharmacist" || value === "staff" ? value : null;
function translationErrorMessage(code?: string) {
  if (code === "CONSULTATION_QUOTA_EXCEEDED") return "번역 이용 한도에 도달했습니다. 잠시 후 다시 시도해 주시기 바랍니다.";
  if (code === 'CONSULTATION_LANGUAGE_UNCERTAIN') return '입력 언어가 불확실합니다. 고객 문장 언어를 직접 선택하고 자동 감지를 끈 뒤 다시 시도해 주시기 바랍니다.';
  if (code === 'CONSULTATION_PRICING_REQUIRED') return '선택한 번역 수단의 가격 설정을 관리자에게 확인해 주시기 바랍니다. 입력 문장은 유지했습니다.';
  if (code === 'CONSULTATION_AI_DISABLED') return '관리자가 현재 번역 실행을 중지했습니다. 입력 문장은 유지했습니다.';
  return consultationAccessError(code) ?? "번역을 완료하지 못했습니다. 입력 문장을 유지했습니다. 다시 시도해 주시기 바랍니다.";
}
function matchingResult(
  data: Result,
  organizationId: string,
  captured: { mode: string; language: string; direction: string },
) {
  return (
    data?.organizationId === organizationId &&
    data.mode === captured.mode &&
    data.language === captured.language &&
    data.direction === captured.direction &&
    typeof data.source === "string" &&
    typeof data.translation === "string" &&
    !!data.translation.trim()
  );
}

export default function StoreMultilingualConsultationPage() {
  const [params] = useSearchParams();
  const { organizationId } = useUnifiedStore();
  const { user } = useAuth();
  if (!organizationId)
    return <p className="p-4">먼저 내 매장을 선택해 주시기 바랍니다.</p>;
  const pinned = params.get("store");
  if (pinned && pinned !== organizationId)
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1>상담 매장이 변경되었습니다.</h1>
        <p>
          다른 탭에서 선택한 매장이 바뀌었습니다. 진행하던 상담을 이 매장으로
          옮기지 않습니다. 내 매장에서 현재 매장을 확인한 뒤 상담 화면을 다시
          열어 주시기 바랍니다.
        </p>
        <a href="/store/workspace/use">내 매장으로</a>
      </main>
    );
  return (
    <Consultation
      key={`${user?.id}:${organizationId}`}
      organizationId={organizationId}
      initialMode={params.get("mode") || ""}
      role={tabletRole(params.get("role"))}
      tabletId={(params.get("tablet") || "").slice(0, 40)}
      tabletName={(params.get("name") || "").slice(0, 40)}
      stationKey={params.get("station") || "counter-1"}
    />
  );
}

function Consultation({
  organizationId,
  initialMode,
  role,
  tabletId,
  tabletName,
  stationKey,
}: Readonly<{
  organizationId: string;
  initialMode: string;
  role: TabletRole | null;
  tabletId: string;
  tabletName: string;
  stationKey: string;
}>) {
  const [context, setContext] = useState<Context | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [mode, setMode] = useState("");
  const [language, setLanguage] = useState("en");
  const [replyLanguage, setReplyLanguage] = useState("");
  const [autoLanguage, setAutoLanguage] = useState(false);
  const autoDefault = useRef(false);
  const defaultLanguage = useRef('en');
  const languageWasDetected = useRef(false);
  const supportSource = useRef<ConsultationSupportSourceProof | null>(null);
  const [direction, setDirection] =
    useState<ConsultationDirection>("to-customer");
  const {
    text,
    result,
    setText,
    setResult,
    clearDrafts,
    receiveText,
    clearResults,
    incomingText,
  } = useConsultationDrafts<Result>(direction);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [guidanceVoice, setGuidanceVoice] = useState<{
    text: string;
    sequence: number;
  } | null>(null);
  const [guidanceReset, setGuidanceReset] = useState(0);
  const reuseSession = useRef(crypto.randomUUID());
  const [supportProduct, setSupportProduct] = useState<ConsultationProduct | null>(null);
  const voiceSequence = useRef(0);
  const voiceTarget = useRef<"guidance" | "sentence">("sentence");
  const [pendingVoice, setPendingVoice] =
    useState<ConsultationDirection | null>(null);
  const station = useConsultationStation(
    organizationId,
    mode,
    language,
    stationKey,
  );
  // 2대 연결(고객 화면 짝짓기)은 새 태블릿 구조로 교체했다(2026-11-13). 서버 계약은 정리 단계에서 제거한다.
  const counter = false;
  const connected = counter && station.room?.active ? station.room : null;
  const version = useRef(0);
  const alive = useRef(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const focusReply = useRef(false);
  useEffect(() => {
    if (focusReply.current) {
      input.current?.focus();
      focusReply.current = false;
    }
  }, [direction]);
  const current = context?.modes.find((item) => item.key === mode);
  // 근무자 태블릿도 자유 문장 · 음성으로 답한다. 안내 문구는 빠른 입력으로만 남긴다.
  const fixedResponse = false;
  const roleModes: readonly string[] | null = role ? TABLET_ROLE_MODES[role] : null;
  const visibleContext = context && roleModes
    ? { ...context, modes: context.modes.filter((item) => roleModes.includes(item.key)) }
    : context;
  const inputLanguage =
    direction === "to-staff" ? replyLanguage || language : language;
  const speech = useConsultationAudio(
    `${organizationId}:${mode}:${inputLanguage}:${direction}`,
    (words) => {
      if (voiceTarget.current === "guidance") {
        setGuidanceVoice({ text: words, sequence: ++voiceSequence.current });
        return;
      }
      version.current++;
      setBusy(false);
      setResult(null);
      setError(
        text.length + words.length + 1 > 1000
          ? "음성 입력은 1,000자까지 반영했습니다. 문장을 확인해 주시기 바랍니다."
          : "",
      );
      setText((previous) =>
        [previous.trim(), words].filter(Boolean).join(" ").slice(0, 1000),
      );
    }, {
      recognition: context?.runtime?.recognition, synthesis: context?.runtime?.synthesis,
      recognize: async (audioBase64, spokenLanguage) => {
        const response = await coreApiClient.post<{ success: boolean; data: { organizationId: string; mode: string; text: string; language: string } }>('/neture/pharmacy/consultation-speech/recognize', {
          mode, audioBase64, language: direction === 'to-staff' && autoLanguage ? 'auto' : spokenLanguage, ...(tabletId ? { tabletId } : {}),
          ...(connected ? { stationId: connected.id, epoch: connected.epoch } : {}),
        });
        if (!response.success || response.data.organizationId !== organizationId || response.data.mode !== mode || !response.data.text || !context?.languages.some(item => item.key === response.data.language)) throw new Error('음성 인식 결과를 확인하지 못했습니다.');
        return response.data;
      },
      synthesize: async (words, spokenLanguage) => {
        const response = await coreApiClient.post<{ success: boolean; data: { organizationId: string; mode: string; audioBase64: string; mimeType: string } }>('/neture/pharmacy/consultation-speech/synthesize', {
          mode, text: words, language: spokenLanguage, ...(connected ? { stationId: connected.id, epoch: connected.epoch } : {}),
        });
        if (!response.success || response.data.organizationId !== organizationId || response.data.mode !== mode) throw new Error('음성 재생 결과를 확인하지 못했습니다.');
        return response.data;
      },
      onLanguage: detected => { if (direction === 'to-staff' && context?.languages.some(item => item.key === detected)) setReplyLanguage(detected); },
      onAccessDenied: () => { clear(); setContext(null); setRetry(value => value + 1); },
    },
  );
  const startListening = speech.startListening;
  const resetSpeech = speech.reset;
  useEffect(() => {
    if (pendingVoice && pendingVoice === direction) {
      voiceTarget.current = "sentence";
      startListening(direction === "to-customer" ? "ko" : inputLanguage);
      setPendingVoice(null);
    }
  }, [pendingVoice, direction, inputLanguage, startListening]);
  useEffect(() => {
    alive.current = true;
    const forget = () => {
      reuseSession.current = crypto.randomUUID();
      version.current++;
      clearDrafts();
      setGuidanceVoice(null);
      setGuidanceReset((value) => value + 1);
      setSupportProduct(null);
      supportSource.current = null;
      setBusy(false);
      focusReply.current = false;
      dialog.current?.close();
    };
    window.addEventListener("pagehide", forget);
    return () => {
      alive.current = false;
      window.removeEventListener("pagehide", forget);
    };
  }, [clearDrafts]);
  useEffect(() => {
    let cancelled = false;
    setContext(null);
    setContextLoading(true);
    setError("");
    coreApiClient
      // 태블릿 화면이면 그 태블릿의 음성 자동 감지 후보를 받는다(서버가 저장된 목록에서 읽는다).
      .get<{ success: boolean; data: Context }>(`${base}/context${tabletId ? `?${new URLSearchParams({ tablet: tabletId })}` : ""}`)
      .then((response) => {
        if (cancelled) return;
        const data = response.data;
        if (
          !response.success ||
          data?.organizationId !== organizationId ||
          !Array.isArray(data.languages) ||
          !data.languages.length ||
          !Array.isArray(data.phrases) ||
          !Array.isArray(data.modes) ||
          !data.modes.length ||
          data.modes.some(
            (item) =>
              typeof item.allowed !== "boolean" ||
              typeof item.entitled !== "boolean",
          )
        )
          throw new Error("Invalid context");
        const candidates: readonly string[] | null = role ? TABLET_ROLE_MODES[role] : null;
        const pool = candidates
          ? candidates.map((key) => data.modes.find((item) => item.key === key)).filter((item): item is Context["modes"][number] => !!item)
          : data.modes;
        if (!pool.length) throw new Error("Invalid context");
        setContext(data);
        autoDefault.current = data.runtime?.detectLanguage === true;
        setAutoLanguage(autoDefault.current);
        setMode(
          (
            pool.find((item) => item.key === initialMode) ??
            pool.find((item) => item.allowed) ??
            pool.find((item) => item.entitled) ??
            pool[0]
          ).key,
        );
        setLanguage(data.languages[0].key);
        defaultLanguage.current = data.languages[0].key;
        languageWasDetected.current = false;
        setPhrase(data.phrases[0]?.key ?? "");
      })
      .catch((cause: { code?: string }) => {
        if (!cancelled)
          setError(consultationAccessError(cause?.code) ?? "상담 이용 상태를 확인하지 못했습니다. 다시 시도해 주시기 바랍니다.");
      }).finally(() => { if (!cancelled) setContextLoading(false); });
    return () => {
      cancelled = true;
    };
  }, [organizationId, retry, initialMode, role, tabletId]);

  const clear = useCallback(() => {
    reuseSession.current = crypto.randomUUID();
    resetSpeech();
    version.current++;
    clearDrafts();
    setReplyLanguage("");
    setAutoLanguage(autoDefault.current);
    if (languageWasDetected.current) setLanguage(defaultLanguage.current);
    languageWasDetected.current = false;
    setGuidanceVoice(null);
    setGuidanceReset((value) => value + 1);
    setSupportProduct(null);
    supportSource.current = null;
    setError("");
    setBusy(false);
    setPendingVoice(null);
    focusReply.current = false;
    dialog.current?.close();
  }, [resetSpeech, clearDrafts]);
  const applyLanguage = useCallback((value: string) => {
    resetSpeech();
    version.current++;
    setBusy(false);
    clearResults();
    setReplyLanguage(previous => incomingText.trim() ? previous || language : "");
    setLanguage(value);
    dialog.current?.close();
  }, [resetSpeech, clearResults, incomingText, language]);
  useEffect(() => {
    if (connected?.language && connected.language !== language)
      applyLanguage(connected.language);
  }, [connected?.language, language, applyLanguage]);
  const previousEpoch = useRef<string | null>(null);
  useEffect(() => {
    const next = connected?.epoch || null, previous = previousEpoch.current;
    previousEpoch.current = next;
    if (previous && previous !== next) clear();
  }, [connected?.epoch, clear]);
  const changeDirection = (next: ConsultationDirection) => {
    if (next === direction) return;
    speech.reset();
    version.current++;
    setError("");
    setBusy(false);
    dialog.current?.close();
    setDirection(next);
  };
  const translate = async () => {
    if (
      !current?.allowed ||
      busy ||
      speech.listening ||
      (!fixedResponse && !text.trim())
    )
      return;
    speech.reset();
    const request = ++version.current;
    const captured = { mode, language: inputLanguage, direction };
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await coreApiClient.post<{
        success: boolean;
        data: Result;
      }>(`${base}/translate`, {
        reuseSession: reuseSession.current,
        ...captured,
        ...(captured.direction === 'to-customer' && supportSource.current ? { supportSource: supportSource.current } : {}),
        ...(captured.direction === 'to-staff' && autoLanguage ? { detectLanguage: true } : {}),
        ...(connected
          ? { stationId: connected.id, epoch: connected.epoch, stationLanguage: connected.language }
          : {}),
        ...(fixedResponse ? { phrase } : { text }),
      });
      if (!alive.current || request !== version.current) return;
      const data = response.data;
      if (!response.success || !matchingResult(data, organizationId, captured))
        throw new Error("Invalid result");
      if (captured.direction === 'to-staff' && autoLanguage && !data.detectedLanguage)
        throw new Error('감지된 언어를 확인해 주시기 바랍니다.');
      if (data.detectedLanguage) {
        if (!context?.languages.some(item => item.key === data.detectedLanguage)) throw new Error('감지된 언어를 확인해 주시기 바랍니다.');
        clearResults();
        languageWasDetected.current = true;
        setLanguage(data.detectedLanguage); setReplyLanguage(data.detectedLanguage);
        if (connected && data.station) station.acceptPreparedStation(data.station);
      }
      setResult(data);
    } catch (error_) {
      if (alive.current && request === version.current) {
        const value = error_ as { code?: string; status?: number };
        if (value?.status === 401 || value?.status === 403) {
          clear(); setContext(null);
          setError(consultationAccessError(value?.code) ?? '상담 이용 권한이 변경됐습니다. 이용 상태를 다시 확인해 주시기 바랍니다.');
        } else setError(translationErrorMessage(value?.code));
      }
    } finally {
      if (alive.current && request === version.current) setBusy(false);
    }
  };
  const verifyCustomerResult = async (currentResult: Result) => {
    if (!currentResult.supportSource) return true;
    const request = version.current;
    try {
      const checked = await prepareConsultationSupport({ ...currentResult.supportSource, verifyOnly: true,
        ...(connected ? { stationId: connected.id, epoch: connected.epoch } : {}) });
      return alive.current && request === version.current && checked.state === 'verified' && checked.sourceVersion === currentResult.supportSource.sourceVersion;
    } catch (cause) {
      if (alive.current && request === version.current) {
        const failure = cause as { status?: number; code?: string; message?: string };
        if ([401, 403].includes(failure.status ?? 0)) { clear(); setContext(null); setError(consultationAccessError(failure.code) ?? '상담 이용 권한을 다시 확인해 주시기 바랍니다.'); }
        else { setResult(null); setError(failure.message || '상담 근거가 변경되었습니다. 다시 준비해 주시기 바랍니다.'); }
      }
      return false;
    }
  };
  const resultSpeech = { ...speech, read: (words: string, spokenLanguage: string) => {
    if (!result?.supportSource) { speech.read(words, spokenLanguage); return; }
    void verifyCustomerResult(result).then(valid => { if (valid) speech.read(words, spokenLanguage); });
  } };
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {tabletName || (role ? ROLE_TITLE[role] : current?.label) || "상담 화면"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {role === "pharmacist"
              ? "약사와 고객이 이 태블릿 한 대를 함께 보는 약사용 상담 화면입니다."
              : role === "staff"
                ? "근무자와 고객이 이 태블릿 한 대를 함께 보는 근무자용 상담 화면입니다."
                : "고객과 함께 보는 상담 화면입니다."}{" "}
            문의와 답변은 이 화면에서 진행합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            className="min-h-11 rounded border p-3"
            href="/store/workspace/use"
          >
            내 매장 관리
          </a>
          <button
            type="button"
            className="min-h-11 rounded border px-3 py-2"
            disabled={station.busy}
            onClick={() => {
              if (connected)
                void station.action({ action: "end" }).then((ok) => {
                  if (ok) clear();
                });
              else clear();
            }}
          >
            {connected ? "상담 종료 · 화면 비우기" : "새 상담 · 내용 지우기"}
          </button>
          {counter && current?.allowed && !connected && (
            <button
              type="button"
              className="min-h-11 rounded border px-3 py-2"
              disabled={station.busy}
              onClick={() =>
                void station.open(false, languageWasDetected.current ? defaultLanguage.current : language).then((ok) => {
                  if (ok) clear();
                })
              }
            >
              매대 상담 시작
            </button>
          )}
        </div>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-3 text-red-800"
        >
          <p>{error}</p>
          {!context && <ConsultationMyHomeLink />}
          {!context && (
            <button
              type="button"
              className="mt-2 underline"
              onClick={() => {
                clear();
                setRetry((value) => value + 1);
              }}
            >
              다시 확인
            </button>
          )}
          {context && (
            <button
              type="button"
              className="mt-2 underline"
              onClick={() => {
                clear();
                setRetry((value) => value + 1);
              }}
            >
              이용 상태 다시 확인
            </button>
          )}
        </div>
      )}
      {speech.message && (
        <output className="block rounded border bg-amber-50 p-3 text-sm">
          {speech.message}
        </output>
      )}
      {!context && !error && (contextLoading ? (
        <output className="block">상담 이용 상태를 확인하는 중…</output>
      ) : <section aria-label="상담 이용 상태 재확인" className="space-y-3 rounded border p-4">
        <p>상담 이용 상태를 다시 확인해 주시기 바랍니다.</p>
        <ConsultationMyHomeLink />
        <button type="button" className="min-h-11 rounded border px-3 py-2" onClick={() => { clear(); setRetry(value => value + 1); }}>이용 상태 다시 확인</button>
      </section>)}
      {context && (
        <>
          <details className="rounded-xl border bg-white px-4">
            <summary className="min-h-11 cursor-pointer content-center text-sm">
              {roleModes ? "고객 언어" : "상담 방식·고객 언어"} ·{" "}
              {context.languages.find((l) => l.key === language)?.label}
            </summary>
            <ConsultationSelectors
              locked={station.busy}
              modeLocked={!!connected || !!roleModes}
              context={visibleContext!}
              mode={mode}
              language={language}
              onMode={(value) => {
                clear();
                setMode(value);
              }}
              onLanguage={(value) => {
                setAutoLanguage(false);
                if (connected)
                  void station
                    .action({ action: "language", language: value })
                    .then((ok) => {
                      if (ok) applyLanguage(value);
                    });
                else applyLanguage(value);
              }}
            />
            {!!connected && (
              <p className="text-sm text-slate-600">
                상담 방식은 종료 후 변경합니다. 언어는 상담을 유지하며 바꿀 수
                있습니다.
              </p>
            )}
          </details>
          {current?.allowed && counter && (
            <>
              <details
                open={!!station.error}
                className="rounded-xl border bg-white px-4"
              >
                <summary className="min-h-11 cursor-pointer content-center text-sm">
                  고객 화면 연결 ·{" "}
                  {connected
                    ? connected.connected
                      ? "기기 등록됨"
                      : "연결 필요"
                    : "상담 시작 전"}
                </summary>
                <ConsultationStationPanel station={station} onStarted={clear} initialLanguage={languageWasDetected.current ? defaultLanguage.current : language} />
              </details>
              <ConsultationIncomingReply
                station={station}
                onReply={(reply) => {
                  setReplyLanguage(reply.language);
                  speech.reset();
                  version.current++;
                  setBusy(false);
                  setDirection("to-staff");
                  receiveText("to-staff", reply.text);
                }}
              />
            </>
          )}
          {current?.allowed && (
            <ConsultationGuidancePanel
              key={`${organizationId}:${mode}:${guidanceReset}`}
              organizationId={organizationId}
              mode={mode}
              language={language}
              supportAllowed={context.supportAllowed === true}
              onProduct={setSupportProduct}
              locked={station.busy}
              room={connected}
              onShare={(id) =>
                station.action({
                  action: "share",
                  kind: "guidance",
                  deliveryId: id,
                })
              }
              onVoice={() => {
                if (speech.listening && voiceTarget.current === "guidance") {
                  speech.finishListening();
                  return;
                }
                speech.reset();
                voiceTarget.current = "guidance";
                speech.startListening("ko");
              }}
              voiceSupported={speech.inputSupported}
              voiceListening={speech.listening && voiceTarget.current === "guidance"}
              onRead={speech.read}
              onStopReading={speech.stopReading}
              voice={guidanceVoice}
              inquiry={
                direction === "to-staff"
                  ? result?.translation || (inputLanguage === "ko" && !autoLanguage ? text : "")
                  : undefined
              }
            />
          )}
          {current?.allowed && current.professional && context.supportAllowed === true && (
            <ConsultationSupportPanel key={`support:${organizationId}:${mode}:${guidanceReset}`}
              organizationId={organizationId} mode={mode} product={supportProduct} room={connected}
              onSelectProduct={setSupportProduct}
              locked={station.busy || speech.listening}
              onAccessDenied={() => { clear(); setContext(null); setRetry(value => value + 1); }}
              inquiry={direction === 'to-staff' ? result?.translation || (inputLanguage === 'ko' && !autoLanguage ? text : '') : undefined}
              onUseDraft={(words, proof) => {
                supportSource.current = proof;
                speech.reset(); version.current++; setBusy(false); setError('');
                setDirection('to-customer'); receiveText('to-customer', words);
                input.current?.closest('section')?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
              }} />
          )}
          {!current?.allowed ? (
            <ConsultationAccessNotice mode={current} onReload={() => { clear(); setRetry(value => value + 1); }} />
          ) : (
            <section
              className="space-y-4 rounded-xl border bg-white p-4"
              aria-label="문장 번역"
            >
              <div className="flex flex-wrap gap-2" aria-label="번역 방향">
                {(
                  [
                    { key: "to-customer", label: "직원 → 고객" },
                    { key: "to-staff", label: "고객 → 직원" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={direction === item.key}
                    className={`min-h-11 rounded border px-4 py-2 ${direction === item.key ? "border-blue-700 bg-blue-50 text-blue-800" : ""}`}
                    onClick={() => changeDirection(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {direction === "to-staff" && (
                <div className="space-y-2">
                {context.runtime?.detectLanguage && <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={autoLanguage} onChange={event => { version.current++; setBusy(false); setResult(null); setAutoLanguage(event.target.checked); }} />고객 문장 언어 자동 감지</label>}
                <label className="block text-sm">
                  고객 문장 언어{" "}
                  <select
                    className="min-h-11 rounded border p-2"
                    value={inputLanguage}
                    onChange={(event) => {
                      speech.reset();
                      version.current++;
                      setBusy(false);
                      setResult(null);
                      setReplyLanguage(event.target.value);
                      setAutoLanguage(false);
                    }}
                  >
                    {context.languages.map((l) => (
                      <option key={l.key} value={l.key}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-xs text-slate-500">{context.runtime?.recognition === 'google-cloud' ? `음성 자동 감지는 이 태블릿의 후보 언어(${context.runtime.speechLanguages.join(', ')})에서 선택합니다. 후보는 매장 경영자가 태블릿마다 정하며, 없으면 관리자 기본 후보를 씁니다.` : '브라우저 음성은 선택한 언어로 인식합니다. 문자 번역의 자동 감지와 다르며, 모바일에서 Chrome 언어 감지를 보장하지 않습니다.'}</p>
                {result?.detectedLanguage && <p role="status">감지한 고객 언어: {context.languages.find(item => item.key === result.detectedLanguage)?.label} · 잘못 감지되면 직접 수정하시기 바랍니다.</p>}
                </div>
              )}
              <p className="text-xs text-slate-500">
                같은 상담 중에는 양쪽의 마지막 입력과 번역을 유지합니다. 다른
                고객을 응대할 때는 새 상담을 시작해 주시기 바랍니다.
              </p>
              <div className="flex flex-wrap gap-3" aria-label="발화 순서 선택">
                {speech.inputSupported && (
                  <button
                    className="min-h-16 rounded-xl border border-teal-600 px-5 py-3 text-lg"
                    disabled={busy}
                    onClick={() => {
                      changeDirection("to-staff");
                      setPendingVoice("to-staff");
                    }}
                  >
                    고객이 말하기
                  </button>
                )}
                {speech.inputSupported && (
                  <button
                    className="min-h-16 rounded-xl border border-teal-600 px-5 py-3 text-lg"
                    disabled={busy}
                    onClick={() => {
                      changeDirection("to-customer");
                      setPendingVoice("to-customer");
                    }}
                  >
                    {role === "pharmacist" ? "약사가 말하기" : role === "staff" ? "근무자가 말하기" : "직원·약사가 말하기"}
                  </button>
                )}
                {speech.listening && (
                  <button
                    className="min-h-16 rounded-xl border px-4"
                    onClick={speech.finishListening}
                  >
                    말하기 마치기
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500">
                말하기 버튼은 이번에 말할 사람을 구분합니다. 직원 로그인이나
                약사 자격을 바꾸지 않습니다.
              </p>
              <details
                open={
                  counter ||
                  !!role ||
                  fixedResponse ||
                  direction === "to-staff" ||
                  speech.listening
                }
              >
                <summary className="min-h-11 cursor-pointer content-center">
                  문장 확인·직접 입력
                </summary>
                <ConsultationInput
                  fixed={fixedResponse}
                  direction={direction}
                  phrases={context.phrases}
                  phrase={phrase}
                  text={text}
                  inputRef={input}
                  onPhrase={(value) => {
                    speech.reset();
                    version.current++;
                    setBusy(false);
                    setResult(null);
                    setError("");
                    setPhrase(value);
                  }}
                  onText={(value) => {
                    speech.reset();
                    version.current++;
                    setBusy(false);
                    setResult(null);
                    setError("");
                    setText(value);
                  }}
                />
                {current && !current.professional && direction === "to-customer" && (
                  <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="자주 쓰는 안내 문구">
                    {context.phrases.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className="min-h-11 rounded border px-3 py-2 text-left text-sm"
                        disabled={busy || speech.listening}
                        onClick={() => {
                          speech.reset();
                          version.current++;
                          setBusy(false);
                          setResult(null);
                          setError("");
                          setText(item.text);
                        }}
                      >
                        {item.text}
                      </button>
                    ))}
                  </div>
                )}
              </details>
              {!speech.inputSupported && (
                <p className="text-sm text-slate-600">
                  이 브라우저는 음성 입력을 지원하지 않습니다. 문자를 직접
                  입력해 주시기 바랍니다.
                </p>
              )}
              <details className="text-xs text-slate-500">
                <summary className="min-h-11 cursor-pointer content-center">
                  음성·상담 정보 처리 안내
                </summary>
                <p>
                  문장은 번역 서비스로 전달됩니다. 음성 입력·읽어주기는
                  선택한 브라우저 또는 외부 음성 서비스에서 처리하며 지원 언어가
                  다를 수 있습니다. 이름·연락처 등 식별 정보는 입력하지 마시기 바랍니다.
                  O4O에서 음성 파일을 영구 저장하지 않습니다. 고객 화면을 연결하면 확인한 안내와
                  고객 답변을 현재 상담 전달 상태로 보관합니다. 상담 종료 시
                  공유 내용을 비웁니다. 장기 상담 이력 기능은 제공하지 않습니다.
                </p>
              </details>
              <button
                type="button"
                className="min-h-11 rounded bg-blue-700 px-5 py-2 text-white disabled:opacity-50"
                disabled={
                  busy || speech.listening || (!fixedResponse && !text.trim())
                }
                onClick={() => void translate()}
              >
                {busy
                  ? "준비 중…"
                  : language === "ko" && !(direction === 'to-staff' && autoLanguage)
                    ? "안내 준비"
                    : "번역하기"}
              </button>
              {busy && (
                <output className="block">문장을 번역하고 있습니다…</output>
              )}
              {result && (
                <TranslationResult
                  result={result}
                  speech={resultSpeech}
                  onShow={() => {
                    const show = () => {
                      if (connected && result.deliveryId) void station.action({
                        action: "share",
                        kind: "translation",
                        deliveryId: result.deliveryId,
                      });
                      else dialog.current?.showModal();
                    };
                    if (result.supportSource) void verifyCustomerResult(result).then(valid => { if (valid) show(); });
                    else show();
                  }}
                />
              )}
            </section>
          )}
        </>
      )}
      <CustomerDialog
        dialogRef={dialog}
        result={result}
        language={language}
        speech={resultSpeech}
        onReply={() => {
          focusReply.current = true;
          changeDirection("to-staff");
        }}
      />
    </main>
  );
}
