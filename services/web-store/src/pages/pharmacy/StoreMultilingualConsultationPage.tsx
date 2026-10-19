import { useEffect, useRef, useState, type RefObject } from 'react';
import { coreApiClient } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useUnifiedStore } from '../../contexts/StoreContext';
import { useConsultationSpeech } from './useConsultationSpeech';

const base = '/neture/pharmacy/multilingual-consultation';
type Mode = { key: string; label: string; professional: boolean; entitled: boolean; allowed: boolean };
type Context = { organizationId: string; languages: Array<{ key: string; label: string }>; phrases: Array<{ key: string; text: string }>; modes: Mode[] };
type Result = { organizationId: string; mode: string; language: string; direction: string; source: string; translation: string };
type Speech = ReturnType<typeof useConsultationSpeech>;

function modeLabel(mode: Mode) {
  if (mode.allowed) return mode.label;
  return mode.label + (mode.entitled ? ' · 약사 사용 확인 필요' : ' · 제공 자격 필요');
}
function unavailableModeMessage(mode?: Mode) {
  return mode?.entitled ? '약사 상담 사용 확인이 필요합니다.' : '약국의 제공 기능과 My Home에서 허용한 근무자 이용 범위를 확인해 주세요.';
}
function translationErrorMessage(code?: string) {
  if (code === 'CONSULTATION_QUOTA_EXCEEDED') return '번역 이용 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.';
  if (['SERVICE_FEATURE_REQUIRED', 'STORE_ACCESS_REQUIRED', 'PHARMACIST_CONFIRMATION_REQUIRED'].includes(code ?? '')) return '상담 이용 권한이 변경됐습니다. 이용 상태를 다시 확인해 주세요.';
  return '번역을 완료하지 못했습니다. 입력 문장을 유지했습니다. 다시 시도해 주세요.';
}
function matchingResult(data: Result, organizationId: string, captured: { mode: string; language: string; direction: string }) {
  return data?.organizationId === organizationId && data.mode === captured.mode && data.language === captured.language &&
    data.direction === captured.direction && typeof data.source === 'string' && typeof data.translation === 'string' && !!data.translation.trim();
}

function ConsultationSelectors({ context, mode, language, onMode, onLanguage }: Readonly<{
  context: Context; mode: string; language: string; onMode: (value: string) => void; onLanguage: (value: string) => void;
}>) {
  return <div className="grid gap-4 rounded-xl border bg-white p-4 sm:grid-cols-2">
    <label className="space-y-1"><span className="block text-sm font-medium">상담 방식</span><select className="w-full rounded border p-2" value={mode} onChange={event => onMode(event.target.value)}>
      {context.modes.map(item => <option key={item.key} value={item.key} disabled={!item.allowed}>{modeLabel(item)}</option>)}
    </select></label>
    <label className="space-y-1"><span className="block text-sm font-medium">고객 언어</span><select className="w-full rounded border p-2" value={language} onChange={event => onLanguage(event.target.value)}>
      {context.languages.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
    </select></label>
  </div>;
}
function SpeechInput({ speech, language, busy }: Readonly<{ speech: Speech; language: string; busy: boolean }>) {
  const change = () => { if (speech.listening) speech.finishListening(); else speech.startListening(language); };
  return <div className="space-y-2">
    <p className="text-xs text-slate-500">마이크를 켜면 브라우저의 음성 인식 서비스로 음성이 전달될 수 있습니다. 입력된 문장을 확인·수정한 뒤 번역해 주세요.</p>
    {speech.inputSupported ? <button type="button" disabled={busy} aria-pressed={speech.listening} className="min-h-11 rounded border px-4 py-2 disabled:opacity-50" onClick={change}>{speech.listening ? '음성 입력 마치기' : '마이크 켜기'}</button>
      : <p className="text-sm text-slate-600">이 브라우저는 음성 입력을 지원하지 않습니다. 문자를 직접 입력해 주세요.</p>}
    {speech.listening && <output className="block text-sm text-blue-800">음성을 듣고 있습니다. 말을 마친 뒤 입력된 문장을 확인해 주세요.</output>}
  </div>;
}
function ReadAloudButton({ speech, text, language, label = '번역문 읽어주기' }: Readonly<{ speech: Speech; text: string; language: string; label?: string }>) {
  const read = () => { if (speech.speaking) speech.stopReading(); else speech.read(text, language); };
  if (!speech.outputSupported) return <p className="text-sm text-slate-600">이 브라우저는 읽어주기를 지원하지 않습니다. 문자 화면을 이용해 주세요.</p>;
  return <button type="button" className="min-h-11 rounded border px-3 py-2" onClick={read}>{speech.speaking ? '읽어주기 중지' : label}</button>;
}
function ConsultationInput({ fixed, direction, phrases, phrase, text, onPhrase, onText }: Readonly<{
  fixed: boolean; direction: string; phrases: Context['phrases']; phrase: string; text: string;
  onPhrase: (value: string) => void; onText: (value: string) => void;
}>) {
  const label = direction === 'to-customer' ? '고객에게 전달할 한국어 문장' : '고객이 입력한 문장';
  if (fixed) return <><p className="text-sm text-slate-600">직원은 매장 안내 문구를 선택합니다. 약 선택·복용 문의는 약사에게 연결해 주세요.</p>
    <label className="block space-y-2"><span className="font-medium">안내 문구</span><select className="w-full rounded border p-2" value={phrase} onChange={event => onPhrase(event.target.value)}>{phrases.map(item => <option key={item.key} value={item.key}>{item.text}</option>)}</select></label></>;
  return <label className="block space-y-2"><span className="font-medium">{label}</span>
    <textarea aria-label={label} autoComplete="off" className="min-h-32 w-full rounded border p-3" maxLength={1000} value={text} onChange={event => onText(event.target.value)} />
    <span className="block text-right text-xs text-slate-500">{text.length}/1,000자</span></label>;
}
function TranslationResult({ result, speech, onShow }: Readonly<{ result: Result; speech: Speech; onShow: () => void }>) {
  const outputLanguage = result.direction === 'to-customer' ? result.language : 'ko';
  return <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4" aria-live="polite">
    <p className="whitespace-pre-wrap break-words text-sm text-slate-600">{result.source}</p>
    <p className="whitespace-pre-wrap break-words text-xl font-medium" lang={outputLanguage}>{result.translation}</p>
    <ReadAloudButton speech={speech} text={result.translation} language={outputLanguage} />
    {result.direction === 'to-customer' && <button type="button" className="min-h-11 rounded border border-blue-700 px-3 py-2 text-blue-800" onClick={onShow}>고객에게 크게 보여주기</button>}
  </div>;
}
function CustomerDialog({ dialogRef, result, language, speech }: Readonly<{ dialogRef: RefObject<HTMLDialogElement | null>; result: Result | null; language: string; speech: Speech }>) {
  return <dialog ref={dialogRef} aria-label="고객용 번역 화면" onClose={speech.stopReading} onCancel={speech.stopReading} className="max-h-[90vh] w-11/12 max-w-4xl rounded-xl p-5 backdrop:bg-black/50">
    <p className="whitespace-pre-wrap break-words text-3xl leading-relaxed sm:text-5xl" lang={language}>{result?.translation}</p>
    {speech.message && <output className="mt-4 block text-sm text-amber-800">{speech.message}</output>}
    {result && <div className="mt-4"><ReadAloudButton speech={speech} text={result.translation} language={language} label="고객에게 읽어주기" /></div>}
    <form method="dialog" className="mt-6"><button type="submit" className="min-h-11 rounded border px-4 py-2">직원 화면으로 돌아가기</button></form>
  </dialog>;
}

export default function StoreMultilingualConsultationPage() {
  const { organizationId } = useUnifiedStore();
  const { user } = useAuth();
  if (!organizationId) return <p className="p-4">먼저 내 매장을 선택해 주세요.</p>;
  return <Consultation key={`${user?.id}:${organizationId}`} organizationId={organizationId} />;
}

function Consultation({ organizationId }: Readonly<{ organizationId: string }>) {
  const [context, setContext] = useState<Context | null>(null);
  const [mode, setMode] = useState('');
  const [language, setLanguage] = useState('en');
  const [direction, setDirection] = useState('to-customer');
  const [text, setText] = useState('');
  const [phrase, setPhrase] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const version = useRef(0);
  const alive = useRef(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const current = context?.modes.find(item => item.key === mode);
  const fixedResponse = mode === 'floor-staff' && direction === 'to-customer';
  const speech = useConsultationSpeech(`${organizationId}:${mode}:${language}:${direction}`, words => {
    version.current++; setBusy(false); setResult(null);
    setError(text.length + words.length + 1 > 1000 ? '음성 입력은 1,000자까지 반영했습니다. 문장을 확인해 주세요.' : '');
    setText(previous => [previous.trim(), words].filter(Boolean).join(' ').slice(0, 1000));
  });
  useEffect(() => {
    alive.current = true;
    const forget = () => { version.current++; setText(''); setResult(null); setBusy(false); dialog.current?.close(); };
    window.addEventListener('pagehide', forget);
    return () => { alive.current = false; window.removeEventListener('pagehide', forget); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setContext(null); setError('');
    coreApiClient.get<{ success: boolean; data: Context }>(`${base}/context`).then(response => {
      if (cancelled) return;
      const data = response.data;
      if (!response.success || data?.organizationId !== organizationId || !Array.isArray(data.languages) || !data.languages.length ||
        !Array.isArray(data.phrases) || !Array.isArray(data.modes) || !data.modes.length ||
        data.modes.some(item => typeof item.allowed !== 'boolean' || typeof item.entitled !== 'boolean')) throw new Error('Invalid context');
      setContext(data); setMode((data.modes.find(item => item.allowed) ?? data.modes.find(item => item.entitled) ?? data.modes[0]).key);
      setLanguage(data.languages[0].key); setPhrase(data.phrases[0]?.key ?? '');
    }).catch(() => { if (!cancelled) setError('상담 이용 상태를 확인하지 못했습니다. 다시 시도해 주세요.'); });
    return () => { cancelled = true; };
  }, [organizationId, retry]);

  const clear = () => {
    speech.reset(); version.current++; setResult(null); setText(''); setError(''); setBusy(false); dialog.current?.close();
  };
  const translate = async () => {
    if (!current?.allowed || busy || speech.listening || (!fixedResponse && !text.trim())) return;
    speech.reset();
    const request = ++version.current;
    const captured = { mode, language, direction };
    setBusy(true); setError(''); setResult(null);
    try {
      const response = await coreApiClient.post<{ success: boolean; data: Result }>(`${base}/translate`, {
        ...captured, ...(fixedResponse ? { phrase } : { text }),
      });
      if (!alive.current || request !== version.current) return;
      const data = response.data;
      if (!response.success || !matchingResult(data, organizationId, captured)) throw new Error('Invalid result');
      setResult(data);
    } catch (error_) {
      if (alive.current && request === version.current) {
        const value = error_ as { code?: string };
        setError(translationErrorMessage(value.code));
      }
    } finally { if (alive.current && request === version.current) setBusy(false); }
  };
  return <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div>
      <h1 className="text-2xl font-bold">다국어 상담</h1>
      <p className="mt-1 text-sm text-slate-600">입력한 문장만 번역합니다. 번역 결과를 확인한 뒤 고객에게 보여 주세요.</p>
    </div><button type="button" className="min-h-11 rounded border px-3 py-2" onClick={clear}>새 상담 · 내용 지우기</button></div>
    {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-red-800"><p>{error}</p>
      {!context && <button type="button" className="mt-2 underline" onClick={() => { clear(); setRetry(value => value + 1); }}>다시 확인</button>}
      {context && <button type="button" className="mt-2 underline" onClick={() => { clear(); setRetry(value => value + 1); }}>이용 상태 다시 확인</button>}
    </div>}
    {speech.message && <output className="block rounded border bg-amber-50 p-3 text-sm">{speech.message}</output>}
    {!context && !error && <output className="block">상담 이용 상태를 확인하는 중…</output>}
    {context && <>
      <ConsultationSelectors context={context} mode={mode} language={language} onMode={value => { clear(); setMode(value); }} onLanguage={value => { clear(); setLanguage(value); }} />
      {!current?.allowed ? <p className="rounded border bg-amber-50 p-4">{unavailableModeMessage(current)}</p> : <section className="space-y-4 rounded-xl border bg-white p-4" aria-label="문장 번역">
        <div className="flex flex-wrap gap-2" aria-label="번역 방향">{[{ key: 'to-customer', label: '직원 → 고객' }, { key: 'to-staff', label: '고객 → 직원' }].map(item => <button key={item.key} type="button" aria-pressed={direction === item.key}
          className={`min-h-11 rounded border px-4 py-2 ${direction === item.key ? 'border-blue-700 bg-blue-50 text-blue-800' : ''}`} onClick={() => { clear(); setDirection(item.key); }}>{item.label}</button>)}</div>
        <ConsultationInput fixed={fixedResponse} direction={direction} phrases={context.phrases} phrase={phrase} text={text}
          onPhrase={value => { clear(); setPhrase(value); }} onText={value => { speech.reset(); version.current++; setBusy(false); setResult(null); setError(''); setText(value); }} />
        {!fixedResponse && <SpeechInput speech={speech} language={direction === 'to-customer' ? 'ko' : language} busy={busy} />}
        <p className="text-xs text-slate-500">문장은 번역 서비스로 전달됩니다. 음성 입력·읽어주기는 브라우저·기기 서비스에서 처리하며 지원 언어가 다를 수 있습니다. 이름·연락처 등 식별 정보는 입력하지 마세요. O4O는 음성 파일과 상담 내용을 저장하지 않으며 화면을 나가거나 새 상담을 시작하면 문장이 지워집니다.</p>
        <button type="button" className="min-h-11 rounded bg-blue-700 px-5 py-2 text-white disabled:opacity-50" disabled={busy || speech.listening || (!fixedResponse && !text.trim())} onClick={() => void translate()}>{busy ? '번역 중…' : '번역하기'}</button>
        {busy && <output className="block">문장을 번역하고 있습니다…</output>}
        {result && <TranslationResult result={result} speech={speech} onShow={() => dialog.current?.showModal()} />}
      </section>}
    </>}
    <CustomerDialog dialogRef={dialog} result={result} language={language} speech={speech} />
  </main>;
}
