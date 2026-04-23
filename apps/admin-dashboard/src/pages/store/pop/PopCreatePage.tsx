/**
 * POP 제작 페이지 (단일 페이지 내 단계형 UI)
 *
 * WO-STORE-POP-CREATION-RESTRUCTURE-V1
 *
 * 경로: /store/pop/create
 *
 * Step 1. 상품 선택
 * Step 2. 템플릿(레이아웃) 선택
 * Step 3. AI 문구 생성
 * Step 4. 편집
 * Step 5. 미리보기
 * Step 6. PDF 출력
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, ChevronRight, Search, RefreshCw,
  Sparkles, Printer, Download, Check, AlertCircle,
  FileText, LayoutTemplate,
} from 'lucide-react';
import { popApi, ProductListItem, AiContent, PopLayout } from '@/api/pop.api';
import { RichTextEditor } from '@o4o/content-editor';
import { uploadImageForEditor } from '@/api/media-library.api';

// ============================================
// Types
// ============================================

interface PopCreationState {
  productId: string | null;
  product: ProductListItem | null;
  layout: PopLayout;
  aiContents: AiContent[];
  form: {
    title: string;
    shortText: string;
    longText: string;
    includeQr: boolean;
    qrUrl: string;
  };
}

const INITIAL_STATE: PopCreationState = {
  productId: null,
  product: null,
  layout: 'A4',
  aiContents: [],
  form: {
    title: '',
    shortText: '',
    longText: '',
    includeQr: false,
    qrUrl: '',
  },
};

const STEPS = [
  { id: 1, label: '상품 선택' },
  { id: 2, label: '레이아웃' },
  { id: 3, label: 'AI 문구' },
  { id: 4, label: '편집' },
  { id: 5, label: '출력' },
];

// ============================================
// Step Components
// ============================================

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {STEPS.map((step, idx) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-colors ${
              step.id < current
                ? 'bg-orange-600 text-white'
                : step.id === current
                ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-500'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {step.id < current ? <Check className="w-3.5 h-3.5" /> : step.id}
          </div>
          <span className={`ml-1.5 text-xs font-medium hidden sm:inline ${
            step.id === current ? 'text-orange-700' : step.id < current ? 'text-gray-600' : 'text-gray-400'
          }`}>
            {step.label}
          </span>
          {idx < STEPS.length - 1 && (
            <ChevronRight className="w-4 h-4 text-gray-300 mx-1.5" />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================
// Step 1: 상품 선택
// ============================================

function Step1ProductSelect({
  onSelect,
}: {
  onSelect: (product: ProductListItem) => void;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const load = useCallback(
    async (q: string, p: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await popApi.listProducts({ search: q || undefined, page: p, limit: 12 });
        setProducts(res.items);
        setTotal(res.total);
        setSearched(true);
      } catch {
        setError('상품 목록을 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleSearch = () => {
    setPage(1);
    load(search, 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-1">상품 선택</h2>
      <p className="text-sm text-gray-500 mb-5">POP를 제작할 상품을 선택하세요.</p>

      {/* Search */}
      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="상품명, 브랜드로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : '검색'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!searched && !loading && (
        <div className="text-center py-12 text-gray-400">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">상품명 또는 브랜드를 검색하세요</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-10 text-gray-400">
          <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
          <p className="text-sm">검색 중...</p>
        </div>
      )}

      {/* Product grid */}
      {!loading && searched && products.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <p className="text-sm">검색 결과가 없습니다.</p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {products.map((p) => {
              const name = p.marketingName || p.regulatoryName || '(이름 없음)';
              return (
                <button
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className="flex flex-col items-start p-3 border border-gray-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all text-left group"
                >
                  {p.primaryImageUrl ? (
                    <img
                      src={p.primaryImageUrl}
                      alt={name}
                      className="w-full h-28 object-cover rounded mb-2 bg-gray-50"
                    />
                  ) : (
                    <div className="w-full h-28 rounded mb-2 bg-gray-100 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                  <p className="text-xs font-medium text-gray-800 line-clamp-2 group-hover:text-orange-700">{name}</p>
                  {p.brandName && (
                    <p className="text-xs text-gray-400 mt-0.5">{p.brandName}</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          {total > 12 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => { setPage(page - 1); load(search, page - 1); }}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                이전
              </button>
              <span className="text-xs text-gray-500">
                {page} / {Math.ceil(total / 12)}
              </span>
              <button
                onClick={() => { setPage(page + 1); load(search, page + 1); }}
                disabled={page >= Math.ceil(total / 12)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================
// Step 2: 레이아웃 선택
// ============================================

function Step2LayoutSelect({
  selected,
  onSelect,
}: {
  selected: PopLayout;
  onSelect: (layout: PopLayout) => void;
}) {
  const layouts: { value: PopLayout; label: string; desc: string; size: string }[] = [
    { value: 'A4', label: 'A4 기본형', desc: '1매 / 페이지, 선명한 대형 POP', size: '210 × 297mm' },
    { value: 'A5', label: 'A5 기본형', desc: '2매 / 페이지, 경제적 소형 POP', size: '148 × 210mm' },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-1">레이아웃 선택</h2>
      <p className="text-sm text-gray-500 mb-5">출력할 POP 크기를 선택하세요.</p>

      <div className="grid grid-cols-2 gap-4">
        {layouts.map((l) => (
          <button
            key={l.value}
            onClick={() => onSelect(l.value)}
            className={`p-5 border-2 rounded-xl text-left transition-all ${
              selected === l.value
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 hover:border-orange-300'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <LayoutTemplate
                className={`w-8 h-8 ${selected === l.value ? 'text-orange-500' : 'text-gray-300'}`}
              />
              {selected === l.value && (
                <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                  선택됨
                </span>
              )}
            </div>
            <p className="font-semibold text-gray-800 text-sm">{l.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{l.desc}</p>
            <p className="text-xs text-gray-400 mt-1 font-mono">{l.size}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Step 3: AI 문구 생성
// ============================================

function Step3AiGenerate({
  productId,
  onGenerated,
  onSkip,
}: {
  productId: string;
  onGenerated: (contents: AiContent[]) => void;
  onSkip: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contents, setContents] = useState<AiContent[]>([]);
  const [done, setDone] = useState(false);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      await popApi.generateAiContent(productId, 'pop_short');
      await popApi.generateAiContent(productId, 'pop_long');
      // Poll for results
      setPolling(true);
      let attempts = 0;
      const maxAttempts = 15;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const all = await popApi.getAiContents(productId);
          const popContents = all.filter(
            (c) => c.contentType === 'pop_short' || c.contentType === 'pop_long',
          );
          if (popContents.length >= 2 || attempts >= maxAttempts) {
            clearInterval(interval);
            setPolling(false);
            setContents(popContents);
            setDone(true);
            onGenerated(popContents);
          }
        } catch {
          // keep polling
        }
      }, 2000);
    } catch {
      setError('AI 문구 생성 요청에 실패했습니다. 다시 시도해주세요.');
      setGenerating(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-1">AI 문구 생성</h2>
      <p className="text-sm text-gray-500 mb-5">
        선택한 상품 정보를 바탕으로 POP 문구를 자동 생성합니다.
      </p>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!done && (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
          <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-4">
            AI가 POP용 짧은 문구(30자 이내)와 긴 문구(3~5문장)를 생성합니다.
          </p>
          <button
            onClick={generate}
            disabled={generating || polling}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm font-medium"
          >
            {generating || polling ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {polling ? '생성 중... (최대 30초)' : '요청 중...'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                AI 문구 생성
              </>
            )}
          </button>
          {!generating && !polling && (
            <button
              onClick={onSkip}
              className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
            >
              HUB 자료로 직접 작성할 경우 건너뛰기
            </button>
          )}
        </div>
      )}

      {done && contents.length > 0 && (
        <div className="space-y-3">
          {contents
            .sort((a, b) => (a.contentType === 'pop_short' ? -1 : 1))
            .map((c) => (
              <div key={c.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">
                    {c.contentType === 'pop_short' ? '짧은 문구 (30자 이내)' : '긴 문구 (3~5문장)'}
                  </span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{c.content}</p>
              </div>
            ))}
          <p className="text-xs text-gray-400 text-center">다음 단계에서 문구를 자유롭게 수정할 수 있습니다.</p>
        </div>
      )}

      {done && contents.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
          AI 문구 생성이 완료되었으나 결과를 가져오지 못했습니다. 다음 단계에서 직접 입력해주세요.
        </div>
      )}
    </div>
  );
}

// ============================================
// Step 4: 편집
// ============================================

async function uploadImage(file: File): Promise<string> {
  return uploadImageForEditor(file, 'pop');
}

function Step4Edit({
  form,
  onChange,
  aiContents,
}: {
  form: PopCreationState['form'];
  onChange: (updates: Partial<PopCreationState['form']>) => void;
  aiContents: AiContent[];
}) {
  const handleApplyAi = () => {
    const short = aiContents.find((c) => c.contentType === 'pop_short');
    const long = aiContents.find((c) => c.contentType === 'pop_long');
    const updates: Partial<PopCreationState['form']> = {};
    if (short?.content) updates.shortText = short.content;
    if (long?.content) updates.longText = `<p>${long.content}</p>`;
    if (Object.keys(updates).length > 0) onChange(updates);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-gray-800">편집</h2>
        {aiContents.length > 0 && (
          <button
            onClick={handleApplyAi}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI 결과 적용
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-5">POP에 표시될 내용을 수정하세요.</p>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            제목
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="POP 제목을 입력하세요 (15자 이내 권장)"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* Short Text */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            짧은 문구 <span className="text-gray-400 font-normal">(30자 이내 권장)</span>
          </label>
          <input
            type="text"
            value={form.shortText}
            onChange={(e) => onChange({ shortText: e.target.value })}
            placeholder="핵심 메시지 (예: 빠른 혈당 관리, 하루 1번)"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <p className="text-xs text-gray-400 mt-1">{form.shortText.length}자</p>
        </div>

        {/* Long Text */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            긴 문구 <span className="text-gray-400 font-normal">(3~5문장 권장)</span>
          </label>
          <RichTextEditor
            value={form.longText}
            onChange={({ html }) => onChange({ longText: html })}
            placeholder="상품의 특징과 효능을 설명하는 문구를 입력하세요."
            preset="compact"
            minHeight="120px"
            onImageUpload={uploadImage}
          />
        </div>

        {/* QR Toggle */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="mt-0.5">
            <button
              onClick={() => onChange({ includeQr: !form.includeQr })}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                form.includeQr ? 'bg-orange-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  form.includeQr ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">QR 코드 포함</p>
            <p className="text-xs text-gray-500">QR 코드를 POP에 삽입합니다.</p>
            {form.includeQr && (
              <input
                type="text"
                value={form.qrUrl}
                onChange={(e) => onChange({ qrUrl: e.target.value })}
                placeholder="QR에 인코딩할 URL (예: https://...)"
                className="mt-2 w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Step 5: 출력
// ============================================

function Step5Output({
  state,
}: {
  state: PopCreationState;
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const download = async () => {
    if (!state.productId) return;
    setDownloading(true);
    setError(null);
    try {
      const qrUrl = state.form.includeQr && state.form.qrUrl ? state.form.qrUrl : undefined;
      const blob = await popApi.downloadPdf(state.productId, state.layout, qrUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pop-${state.layout.toLowerCase()}-${state.productId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch {
      setError('PDF 다운로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setDownloading(false);
    }
  };

  const productName =
    state.product?.marketingName || state.product?.regulatoryName || '(상품)';

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-1">출력</h2>
      <p className="text-sm text-gray-500 mb-5">PDF를 다운로드하거나 바로 인쇄하세요.</p>

      {/* Summary */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 mb-5 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">상품</span>
          <span className="font-medium text-gray-800">{productName}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">레이아웃</span>
          <span className="font-medium text-gray-800">{state.layout} ({state.layout === 'A4' ? '1매/페이지' : '2매/페이지'})</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">제목</span>
          <span className="font-medium text-gray-800 truncate max-w-xs">{state.form.title || '(미입력)'}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">짧은 문구</span>
          <span className="font-medium text-gray-800 truncate max-w-xs">{state.form.shortText || '(미입력)'}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">QR 포함</span>
          <span className="font-medium text-gray-800">{state.form.includeQr ? '예' : '아니오'}</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {done && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-4">
          <Check className="w-4 h-4 flex-shrink-0" />
          PDF 다운로드가 완료되었습니다.
        </div>
      )}

      <button
        onClick={download}
        disabled={downloading || !state.productId}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors text-sm font-medium"
      >
        {downloading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            PDF 생성 중...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            PDF 다운로드
          </>
        )}
      </button>

      <button
        onClick={() => {
          if (!state.productId) return;
          const qrUrl = state.form.includeQr && state.form.qrUrl ? state.form.qrUrl : undefined;
          const url = popApi.getPdfUrl(state.productId, state.layout, qrUrl);
          window.open(url, '_blank');
        }}
        disabled={!state.productId}
        className="w-full mt-2 inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-orange-200 text-orange-700 rounded-lg hover:bg-orange-50 disabled:opacity-50 transition-colors text-sm"
      >
        <Printer className="w-4 h-4" />
        새 창에서 미리보기
      </button>
    </div>
  );
}

// ============================================
// Main Page
// ============================================

export default function PopCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<PopCreationState>(INITIAL_STATE);

  const update = (patch: Partial<PopCreationState>) =>
    setState((s) => ({ ...s, ...patch }));

  const updateForm = (patch: Partial<PopCreationState['form']>) =>
    setState((s) => ({ ...s, form: { ...s.form, ...patch } }));

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const canGoNext = () => {
    if (step === 1) return !!state.productId;
    if (step === 2) return !!state.layout;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/store/pop')}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">새 POP 만들기</h1>
          <p className="text-xs text-gray-400 mt-0.5">상품 기반 POP 제작</p>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Step content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 min-h-64">
        {step === 1 && (
          <Step1ProductSelect
            onSelect={(product) => {
              update({
                productId: product.id,
                product,
                form: {
                  ...state.form,
                  title: product.marketingName || product.regulatoryName || '',
                },
              });
            }}
          />
        )}
        {step === 2 && (
          <Step2LayoutSelect
            selected={state.layout}
            onSelect={(layout) => update({ layout })}
          />
        )}
        {step === 3 && state.productId && (
          <Step3AiGenerate
            productId={state.productId}
            onSkip={next}
            onGenerated={(contents) => {
              const short = contents.find((c) => c.contentType === 'pop_short');
              const long = contents.find((c) => c.contentType === 'pop_long');
              update({
                aiContents: contents,
                form: {
                  ...state.form,
                  shortText: short?.content || state.form.shortText,
                  longText: long?.content || state.form.longText,
                },
              });
            }}
          />
        )}
        {step === 4 && (
          <Step4Edit form={state.form} onChange={updateForm} aiContents={state.aiContents} />
        )}
        {step === 5 && (
          <Step5Output state={state} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prev}
          disabled={step === 1}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          이전
        </button>

        {/* Step label */}
        <span className="text-xs text-gray-400">
          {step} / {STEPS.length} — {STEPS[step - 1]?.label}
        </span>

        {step < STEPS.length ? (
          <button
            onClick={next}
            disabled={!canGoNext()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-40 transition-colors"
          >
            다음
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => navigate('/store/pop')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            목록으로
          </button>
        )}
      </div>
    </div>
  );
}
