/**
 * AI Content Generation Modal — 3-step wizard
 *
 * WO-KPA-SOCIETY-DIGITAL-SIGNAGE-AI-CONTENT-GENERATION-UI-V1
 *
 * Step 1: Input (prompt, templateType, style, optional template reference)
 * Step 2: Preview (AI-generated HTML preview + metadata)
 * Step 3: Save (edit name/description → save as HQ media)
 */

import { useState, useEffect } from 'react';
import { Sparkles, Loader2, ArrowLeft, RefreshCw, X, Save, Wand2, Eye } from 'lucide-react';
import { generateAiContent, saveAsHqMedia } from '../../../api/signageAi';
import type { AiGenerateRequest, AiGenerateResponse } from '../../../api/signageAi';
import { fetchTemplates } from '../../../api/signageTemplate';
import type { SignageTemplateItem } from '../../../api/signageTemplate';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

type Step = 1 | 2 | 3;

const templateTypeOptions = [
  { value: 'banner', label: '배너' },
  { value: 'card', label: '카드' },
  { value: 'poster', label: '포스터' },
  { value: 'slide', label: '슬라이드' },
] as const;

const styleOptions = [
  { value: 'modern', label: '모던' },
  { value: 'classic', label: '클래식' },
  { value: 'minimal', label: '미니멀' },
  { value: 'vibrant', label: '비비드' },
] as const;

const templateTypeLabel: Record<string, string> = {
  banner: '배너', card: '카드', poster: '포스터', slide: '슬라이드',
};

export default function AiContentGenerationModal({ open, onClose, onSaved }: Props) {
  const [step, setStep] = useState<Step>(1);

  // Step 1 — Input
  const [prompt, setPrompt] = useState('');
  const [templateType, setTemplateType] = useState<AiGenerateRequest['templateType']>('banner');
  const [style, setStyle] = useState<NonNullable<AiGenerateRequest['style']>>('modern');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templates, setTemplates] = useState<SignageTemplateItem[]>([]);

  // Step 2 — Preview
  const [isGenerating, setIsGenerating] = useState(false);
  const [genResult, setGenResult] = useState<AiGenerateResponse | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  // Step 3 — Save
  const [mediaName, setMediaName] = useState('');
  const [mediaDesc, setMediaDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load templates on mount
  useEffect(() => {
    fetchTemplates({ limit: 100, status: 'active' })
      .then(res => setTemplates(res.items))
      .catch(() => {});
  }, []);

  if (!open) return null;

  const isPromptValid = prompt.trim().length >= 5;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenError(null);
    setStep(2);

    const payload: AiGenerateRequest = {
      prompt: prompt.trim(),
      templateType,
      style,
    };

    // If a template is selected, pass its dimensions
    if (selectedTemplateId) {
      const tpl = templates.find(t => t.id === selectedTemplateId);
      if (tpl?.layoutConfig) {
        payload.width = tpl.layoutConfig.width;
        payload.height = tpl.layoutConfig.height;
        payload.metadata = { selectedTemplateId, templateName: tpl.name };
      }
    }

    try {
      const result = await generateAiContent(payload);
      setGenResult(result);
      // Pre-fill save form
      const typeLabel = templateTypeLabel[templateType] || templateType;
      const promptSnippet = prompt.trim().length > 30 ? prompt.trim().slice(0, 30) + '...' : prompt.trim();
      setMediaName(`AI 생성: ${typeLabel} - ${promptSnippet}`);
      setMediaDesc('');
    } catch (err: any) {
      setGenError(err?.message || 'AI 콘텐츠 생성에 실패했습니다');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!genResult || !mediaName.trim()) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      await saveAsHqMedia({
        name: mediaName.trim(),
        description: mediaDesc.trim() || undefined,
        mediaType: 'html',
        sourceType: 'cms',
        sourceUrl: `ai-generated:${genResult.contentBlockId}`,
        content: genResult.generatedContent,
        tags: ['ai-generated'],
        category: templateType,
        metadata: {
          aiGenerated: true,
          contentBlockId: genResult.contentBlockId,
          generationLog: genResult.generationLog,
          selectedTemplateId: selectedTemplateId || undefined,
        },
      });
      onSaved();
    } catch (err: any) {
      setSaveError(err?.message || 'HQ 미디어 저장에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  // Step indicators
  const stepLabels = ['입력', '미리보기', '저장'];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-slate-800">AI 콘텐츠 생성</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-6 pt-4">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                step === i + 1 ? 'bg-purple-100 text-purple-700' : step > i + 1 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
              }`}>
                <span className="w-4 h-4 flex items-center justify-center rounded-full bg-white text-[10px] font-bold">
                  {step > i + 1 ? '✓' : i + 1}
                </span>
                {label}
              </div>
              {i < stepLabels.length - 1 && <div className="w-6 h-px bg-slate-200" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* ── Step 1: Input ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">주제 / 목적 *</label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="예: 약국 건강검진 캠페인 홍보용 배너, 봄철 건강관리 안내..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">{prompt.trim().length}/5자 이상 입력</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">콘텐츠 유형 *</label>
                  <select
                    value={templateType}
                    onChange={e => setTemplateType(e.target.value as AiGenerateRequest['templateType'])}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {templateTypeOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">디자인 스타일 *</label>
                  <select
                    value={style}
                    onChange={e => setStyle(e.target.value as NonNullable<AiGenerateRequest['style']>)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {styleOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">기존 템플릿 참고 (선택)</label>
                <select
                  value={selectedTemplateId}
                  onChange={e => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">선택 안 함</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.layoutConfig?.width}x{t.layoutConfig?.height})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ── Step 2: Preview ── */}
          {step === 2 && (
            <div className="space-y-4">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                  <p className="text-sm text-slate-600">AI가 콘텐츠를 생성하고 있습니다...</p>
                </div>
              ) : genError ? (
                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{genError}</div>
                  <button
                    onClick={handleGenerate}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                  >
                    <RefreshCw className="w-4 h-4" /> 다시 시도
                  </button>
                </div>
              ) : genResult ? (
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">미리보기</span>
                    </div>
                    <div
                      className="border border-slate-200 rounded-lg p-4 bg-slate-50 max-h-64 overflow-auto"
                      dangerouslySetInnerHTML={{ __html: genResult.generatedContent }}
                    />
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 space-y-1">
                    <p>모델: {genResult.generationLog.modelName}</p>
                    <p>토큰: {genResult.generationLog.tokensUsed}</p>
                    <p>생성: {new Date(genResult.generationLog.generatedAt).toLocaleString('ko-KR')}</p>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* ── Step 3: Save ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-sm text-purple-700">
                생성된 콘텐츠가 HQ 미디어로 저장됩니다
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">미디어 이름 *</label>
                <input
                  type="text"
                  value={mediaName}
                  onChange={e => setMediaName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">설명 (선택)</label>
                <textarea
                  value={mediaDesc}
                  onChange={e => setMediaDesc(e.target.value)}
                  placeholder="미디어에 대한 설명을 입력하세요"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Compact preview */}
              {genResult && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">콘텐츠 미리보기</p>
                  <div
                    className="border border-slate-200 rounded-lg p-3 bg-slate-50 max-h-32 overflow-auto text-sm"
                    dangerouslySetInnerHTML={{ __html: genResult.generatedContent }}
                  />
                </div>
              )}

              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{saveError}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
          <div>
            {step === 2 && !isGenerating && (
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> 입력 수정
              </button>
            )}
            {step === 3 && (
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> 뒤로
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              취소
            </button>

            {step === 1 && (
              <button
                onClick={handleGenerate}
                disabled={!isPromptValid}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                <Wand2 className="w-4 h-4" /> 초안 생성하기
              </button>
            )}

            {step === 2 && !isGenerating && genResult && (
              <>
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-2 px-4 py-2 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-50 text-sm font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> 다시 생성
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors"
                >
                  <Sparkles className="w-4 h-4" /> 사용하기
                </button>
              </>
            )}

            {step === 3 && (
              <button
                onClick={handleSave}
                disabled={isSaving || !mediaName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4" /> {isSaving ? '저장 중...' : 'HQ 미디어로 저장'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
