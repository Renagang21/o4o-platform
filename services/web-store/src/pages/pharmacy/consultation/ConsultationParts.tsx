import type { RefObject } from "react";
import type { useConsultationSpeech } from "../useConsultationSpeech";
export type Mode = {
  key: string;
  label: string;
  professional: boolean;
  entitled: boolean;
  allowed: boolean;
};
export type Context = {
  organizationId: string;
  languages: Array<{ key: string; label: string }>;
  phrases: Array<{ key: string; text: string }>;
  modes: Mode[];
  supportAllowed?: boolean;
};
export type Result = {
  organizationId: string;
  mode: string;
  language: string;
  direction: string;
  source: string;
  translation: string;
  deliveryId?: string;
};
type Speech = ReturnType<typeof useConsultationSpeech>;

function modeLabel(mode: Mode) {
  if (mode.allowed) return mode.label;
  return (
    mode.label +
    (mode.entitled ? " · 약사 사용 확인 필요" : " · 제공 자격 필요")
  );
}
export function ConsultationSelectors({
  context,
  mode,
  language,
  onMode,
  onLanguage,
  locked,
}: Readonly<{
  context: Context;
  mode: string;
  language: string;
  onMode: (value: string) => void;
  onLanguage: (value: string) => void;
  locked?: boolean;
}>) {
  return (
    <div className="grid gap-4 rounded-xl border bg-white p-4 sm:grid-cols-2">
      <label className="space-y-1">
        <span className="block text-sm font-medium">상담 방식</span>
        <select
          className="w-full rounded border p-2"
          value={mode}
          disabled={locked}
          onChange={(event) => onMode(event.target.value)}
        >
          {context.modes.map((item) => (
            <option key={item.key} value={item.key} disabled={!item.allowed}>
              {modeLabel(item)}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="block text-sm font-medium">고객 언어</span>
        <select
          className="w-full rounded border p-2"
          value={language}
          disabled={locked}
          onChange={(event) => onLanguage(event.target.value)}
        >
          {context.languages.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
function ReadAloudButton({
  speech,
  text,
  language,
  label = "번역문 읽어주기",
}: Readonly<{
  speech: Speech;
  text: string;
  language: string;
  label?: string;
}>) {
  const read = () => {
    if (speech.speaking) speech.stopReading();
    else speech.read(text, language);
  };
  if (!speech.outputSupported)
    return (
      <p className="text-sm text-slate-600">
        이 브라우저는 읽어주기를 지원하지 않습니다. 문자 화면을 이용해 주세요.
      </p>
    );
  return (
    <button
      type="button"
      className="min-h-11 rounded border px-3 py-2"
      onClick={read}
    >
      {speech.speaking ? "읽어주기 중지" : label}
    </button>
  );
}
export function ConsultationInput({
  fixed,
  direction,
  phrases,
  phrase,
  text,
  inputRef,
  onPhrase,
  onText,
}: Readonly<{
  fixed: boolean;
  direction: string;
  phrases: Context["phrases"];
  phrase: string;
  text: string;
  onPhrase: (value: string) => void;
  onText: (value: string) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}>) {
  const label =
    direction === "to-customer"
      ? "고객에게 전달할 한국어 문장"
      : "고객이 입력한 문장";
  if (fixed)
    return (
      <>
        <p className="text-sm text-slate-600">
          직원은 매장 안내 문구를 선택합니다. 약 선택·복용 문의는 약사에게
          연결해 주세요.
        </p>
        <label className="block space-y-2">
          <span className="font-medium">안내 문구</span>
          <select
            aria-label="안내 문구"
            className="w-full rounded border p-2"
            value={phrase}
            onChange={(event) => onPhrase(event.target.value)}
          >
            {phrases.map((item) => (
              <option key={item.key} value={item.key}>
                {item.text}
              </option>
            ))}
          </select>
        </label>
      </>
    );
  return (
    <label className="block space-y-2">
      <span className="font-medium">{label}</span>
      <textarea
        ref={inputRef}
        aria-label={label}
        autoComplete="off"
        className="min-h-32 w-full rounded border p-3"
        maxLength={1000}
        value={text}
        onChange={(event) => onText(event.target.value)}
      />
      <span className="block text-right text-xs text-slate-500">
        {text.length}/1,000자
      </span>
    </label>
  );
}
export function TranslationResult({
  result,
  speech,
  onShow,
}: Readonly<{ result: Result; speech: Speech; onShow: () => void }>) {
  const outputLanguage =
    result.direction === "to-customer" ? result.language : "ko";
  return (
    <div
      className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4"
      aria-live="polite"
    >
      <p className="whitespace-pre-wrap break-words text-sm text-slate-600">
        {result.source}
      </p>
      <p
        className="whitespace-pre-wrap break-words text-xl font-medium"
        lang={outputLanguage}
      >
        {result.translation}
      </p>
      <ReadAloudButton
        speech={speech}
        text={result.translation}
        language={outputLanguage}
      />
      {result.direction === "to-customer" && (
        <button
          type="button"
          className="min-h-11 rounded border border-blue-700 px-3 py-2 text-blue-800"
          onClick={onShow}
        >
          고객에게 크게 보여주기
        </button>
      )}
    </div>
  );
}
export function CustomerDialog({
  dialogRef,
  result,
  language,
  speech,
  onReply,
}: Readonly<{
  dialogRef: RefObject<HTMLDialogElement | null>;
  result: Result | null;
  language: string;
  speech: Speech;
  onReply: () => void;
}>) {
  return (
    <dialog
      ref={dialogRef}
      aria-label="고객용 번역 화면"
      onClose={speech.stopReading}
      onCancel={speech.stopReading}
      className="max-h-[90vh] w-11/12 max-w-4xl rounded-xl p-5 backdrop:bg-black/50"
    >
      <p
        className="whitespace-pre-wrap break-words text-3xl leading-relaxed sm:text-5xl"
        lang={language}
      >
        {result?.translation}
      </p>
      {speech.message && (
        <output className="mt-4 block text-sm text-amber-800">
          {speech.message}
        </output>
      )}
      {result && (
        <div className="mt-4">
          <ReadAloudButton
            speech={speech}
            text={result.translation}
            language={language}
            label="고객에게 읽어주기"
          />
        </div>
      )}
      <button
        type="button"
        className="mt-4 min-h-11 rounded bg-blue-700 px-4 py-2 text-white"
        onClick={onReply}
      >
        고객이 답하기
      </button>
      <form method="dialog" className="mt-6">
        <button type="submit" className="min-h-11 rounded border px-4 py-2">
          직원 화면으로 돌아가기
        </button>
      </form>
    </dialog>
  );
}
