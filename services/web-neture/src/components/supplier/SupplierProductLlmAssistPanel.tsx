/**
 * SupplierProductLlmAssistPanel — 공급자 제품정보 "ChatGPT로 작업" 패널 (외부 LLM First)
 *
 * WO-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1 §2.1 · §2.3 · §2.4 · §2.5 · §2.6
 *
 * 흐름: 자료 유형 선택 → Prompt 복사 → (사용자가 자기 ChatGPT/Astra 에 사진·PDF 첨부 + Prompt 붙여넣기)
 *       → 결과 JSON 복사 → 여기 붙여넣기 → [결과 적용] → 화면 폼에 채움(저장 아님) → 사용자 확인 → 검토 요청.
 *
 * 하지 않는 것:
 *   - 내부 AI endpoint 호출 · 사진/PDF 를 서버로 보내 분석 · Prompt/결과 저장 · 자동 제출.
 *   - @o4o/content-editor 의 LlmAssistPanel 은 HTML 출력 전용이라 재사용하지 않는다(공용 컴포넌트 무변경).
 */

import { useMemo, useState } from 'react';
import { Sparkles, ClipboardCopy, Check, AlertTriangle } from 'lucide-react';
import {
  buildSupplierProductAuthoringPrompt,
  parseSupplierProductCandidateDraft,
  SUPPLIER_PRODUCT_LLM_ASSIST_LABEL,
  type SupplierProductAuthoringContext,
  type SupplierProductCandidateDraft,
  type SupplierProductSourceKind,
  type SupplierProductApplyMode,
} from '../../lib/supplier-product-authoring';

export interface SupplierProductLlmAssistPanelProps {
  /** Prompt 에 넣을 현재 화면 상태(개인정보·거래정보 없음) */
  context: Omit<SupplierProductAuthoringContext, 'sourceKind' | 'sourceUrl' | 'sourceLabel' | 'additionalInstruction'>;
  /** Import Assistant 초안으로 진입한 경우 true → 자료 유형 기본값 'import' */
  fromImport?: boolean;
  /**
   * 검증된 Draft 를 화면 폼에 적용한다(저장 아님). 적용 후 안내 문구(note)를 돌려주면 패널이 표시한다.
   * 화면이 mode 에 따라 빈 칸만 / 덮어쓰기 를 결정한다.
   */
  onApplyDraft: (draft: SupplierProductCandidateDraft, mode: SupplierProductApplyMode) => string[];
  onNotify?: (message: string, kind: 'success' | 'error') => void;
}

const SOURCE_OPTIONS: Array<{ value: SupplierProductSourceKind; label: string; hint: string }> = [
  { value: 'manual', label: '직접 설명', hint: '제품 설명을 ChatGPT 대화에 직접 적습니다.' },
  { value: 'image', label: '제품 사진', hint: '포장·라벨 사진을 ChatGPT 대화에 첨부합니다. O4O 에 올리는 이미지는 별도(3단계).' },
  { value: 'pdf', label: '소개서 PDF', hint: 'PDF 파일을 ChatGPT 대화에 첨부합니다. O4O 는 파일을 받지 않습니다.' },
  { value: 'url', label: '상세 URL', hint: '제품 상세 페이지 주소를 Prompt 에 넣습니다.' },
  { value: 'import', label: '자동 추출 초안 보정', hint: '상세페이지 소스에서 추출한 현재 입력값을 바로잡습니다.' },
];

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function SupplierProductLlmAssistPanel({
  context,
  fromImport = false,
  onApplyDraft,
  onNotify,
}: SupplierProductLlmAssistPanelProps) {
  const [open, setOpen] = useState(fromImport);
  const [sourceKind, setSourceKind] = useState<SupplierProductSourceKind>(fromImport ? 'import' : 'manual');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [additionalInstruction, setAdditionalInstruction] = useState('');
  const [copied, setCopied] = useState(false);
  const [resultText, setResultText] = useState('');
  const [mode, setMode] = useState<SupplierProductApplyMode>('fill-empty');
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applyMessages, setApplyMessages] = useState<string[]>([]);
  const [applied, setApplied] = useState(false);

  const prompt = useMemo(
    () => buildSupplierProductAuthoringPrompt({ ...context, sourceKind, sourceUrl, sourceLabel, additionalInstruction }),
    [context, sourceKind, sourceUrl, sourceLabel, additionalInstruction],
  );

  const handleCopy = async () => {
    const ok = await copyText(prompt);
    setCopied(ok);
    if (ok) {
      onNotify?.('작업 요청문을 복사했습니다. ChatGPT 대화창에 붙여 넣고 결과 JSON 을 받아 오세요.', 'success');
      setTimeout(() => setCopied(false), 2500);
    } else {
      onNotify?.('복사에 실패했습니다. 아래 요청문을 직접 선택해 복사해 주세요.', 'error');
    }
  };

  const handleApply = () => {
    setApplyError(null);
    setApplyMessages([]);
    setApplied(false);
    const parsed = parseSupplierProductCandidateDraft(resultText);
    if (!parsed.ok) {
      setApplyError(parsed.error);
      return;
    }
    const notes = onApplyDraft(parsed.draft, mode);
    setApplyMessages([...parsed.warnings, ...notes]);
    setApplied(true);
    onNotify?.('결과를 입력란에 적용했습니다. 내용을 확인·수정한 뒤 검토 요청을 제출해 주세요.', 'success');
  };

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-violet-800">
          <Sparkles className="w-4 h-4" /> {SUPPLIER_PRODUCT_LLM_ASSIST_LABEL}
        </span>
        <span className="text-xs text-violet-600">{open ? '접기' : '사진 · PDF · URL · 설명으로 제품정보 정리'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 text-sm">
          <p className="text-xs text-violet-700">
            O4O 는 요청문과 결과 형식만 제공합니다. 정리는 본인의 ChatGPT(또는 다른 AI)에서 하고, 결과 JSON 을 여기에 붙여 넣으면
            입력란에 채워집니다. <strong>붙여 넣어도 저장되지 않습니다</strong> — 확인·수정 후 검토 요청을 눌러야 제출됩니다.
          </p>

          {/* 1. 자료 유형 */}
          <div>
            <div className="text-xs font-medium text-slate-700 mb-1">1. 어떤 자료로 정리하나요?</div>
            <div className="flex flex-wrap gap-1.5">
              {SOURCE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                    sourceKind === opt.value ? 'border-violet-500 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="supplier-llm-source-kind"
                    value={opt.value}
                    checked={sourceKind === opt.value}
                    onChange={() => setSourceKind(opt.value)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">{SOURCE_OPTIONS.find((o) => o.value === sourceKind)?.hint}</p>
            {sourceKind === 'url' && (
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://… 제품 상세 페이지 주소"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
              />
            )}
            {(sourceKind === 'pdf' || sourceKind === 'image') && (
              <input
                type="text"
                value={sourceLabel}
                onChange={(e) => setSourceLabel(e.target.value)}
                placeholder={sourceKind === 'pdf' ? '파일명 · 자료 설명 (예: 2026 카탈로그 12p)' : '사진 설명 (예: 뒷면 라벨 · 성분표)'}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
              />
            )}
            <input
              type="text"
              value={additionalInstruction}
              onChange={(e) => setAdditionalInstruction(e.target.value)}
              placeholder="추가 요청 (선택 · 예: 규격은 낱개 기준으로)"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
            />
          </div>

          {/* 2. Prompt 복사 */}
          <div>
            <div className="text-xs font-medium text-slate-700 mb-1">2. 작업 요청문을 복사해 ChatGPT 에 붙여 넣으세요</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-700"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                {copied ? '복사됨' : '요청문 복사'}
              </button>
              <span className="text-[11px] text-slate-500">
                {sourceKind === 'image' && '사진은 ChatGPT 대화에 직접 첨부하세요.'}
                {sourceKind === 'pdf' && 'PDF 는 ChatGPT 대화에 직접 첨부하세요.'}
              </span>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-slate-500">요청문 미리보기</summary>
              <pre className="mt-1 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 text-[11px] text-slate-700">{prompt}</pre>
            </details>
          </div>

          {/* 3. 결과 적용 */}
          <div>
            <div className="text-xs font-medium text-slate-700 mb-1">3. ChatGPT 가 준 결과(JSON)를 붙여 넣고 적용하세요</div>
            <textarea
              value={resultText}
              onChange={(e) => { setResultText(e.target.value); setApplied(false); setApplyError(null); }}
              rows={6}
              placeholder='{ "name": "...", "barcode": null, ... }'
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs focus:border-violet-400 focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-1 text-xs text-slate-700">
                <input type="radio" name="supplier-llm-apply-mode" checked={mode === 'fill-empty'} onChange={() => setMode('fill-empty')} />
                빈 칸만 채우기
              </label>
              <label className="inline-flex items-center gap-1 text-xs text-slate-700">
                <input type="radio" name="supplier-llm-apply-mode" checked={mode === 'overwrite'} onChange={() => setMode('overwrite')} />
                결과로 덮어쓰기
              </label>
              <button
                type="button"
                onClick={handleApply}
                disabled={!resultText.trim()}
                className="ml-auto rounded-lg border border-violet-500 bg-white px-3 py-2 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
              >
                결과 적용
              </button>
            </div>
            {applyError && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{applyError} 입력란은 변경되지 않았습니다.</span>
              </div>
            )}
            {applied && (
              <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
                적용했습니다. 입력란을 확인·수정한 뒤 검토 요청을 제출하세요. 카테고리·브랜드·이미지는 직접 선택합니다.
              </div>
            )}
            {applyMessages.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 rounded-lg border border-amber-200 bg-amber-50 p-2 pl-6 text-[11px] text-amber-800">
                {applyMessages.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
