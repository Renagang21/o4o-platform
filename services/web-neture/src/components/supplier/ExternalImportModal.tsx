/**
 * ExternalImportModal — WO-NETURE-EXTERNAL-PRODUCT-IMPORT-ASSISTANT-V1
 *
 * 외부 쇼핑몰 상품 페이지에서 B2C 정보를 가져와 각 항목별로 수동 적용하는 모달
 */

import { useState } from 'react';
import { X, Loader2, ArrowRight, Globe, Code } from 'lucide-react';
import { supplierApi } from '../../lib/api';

interface ExternalImportModalProps {
  open: boolean;
  onClose: () => void;
  masterId: string;
  onApplyProductName?: (name: string) => void;
  onApplyShortDescription?: (html: string) => void;
  onApplyDetailDescription?: (html: string) => void;
}

interface ParseResult {
  productName: string | null;
  shortDescription: string | null;
  detailDescription: string | null;
  imageCount: number;
  source: string;
}

type Tab = 'url' | 'html';

export default function ExternalImportModal({
  open,
  onClose,
  masterId,
  onApplyProductName,
  onApplyShortDescription,
  onApplyDetailDescription,
}: ExternalImportModalProps) {
  const [tab, setTab] = useState<Tab>('url');
  const [url, setUrl] = useState('');
  const [html, setHtml] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://3lifezone.co.kr');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [applied, setApplied] = useState<Record<string, boolean>>({});

  if (!open) return null;

  const handleParse = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setApplied({});

    const params = tab === 'url'
      ? { url: url.trim(), masterId }
      : { html: html.trim(), masterId, baseUrl: baseUrl.trim() || undefined };

    if (tab === 'url' && !params.url) {
      setError('URL을 입력하세요');
      setLoading(false);
      return;
    }
    if (tab === 'html' && !params.html) {
      setError('HTML을 붙여넣으세요');
      setLoading(false);
      return;
    }

    const res = await supplierApi.parseExternalProduct(params);

    if (res.success && res.data) {
      setResult(res.data);
    } else {
      setError(res.error || '파싱에 실패했습니다');
    }
    setLoading(false);
  };

  const handleApply = (field: string, value: string | null) => {
    if (!value) return;
    if (field === 'productName' && onApplyProductName) {
      onApplyProductName(value);
    } else if (field === 'shortDescription' && onApplyShortDescription) {
      onApplyShortDescription(value);
    } else if (field === 'detailDescription' && onApplyDetailDescription) {
      onApplyDetailDescription(value);
    }
    setApplied((prev) => ({ ...prev, [field]: true }));
  };

  const handleClose = () => {
    setUrl('');
    setHtml('');
    setResult(null);
    setError(null);
    setApplied({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800">외부 상품 가져오기</h3>
          <button onClick={handleClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setTab('url')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === 'url' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Globe size={12} /> URL 입력
            </button>
            <button
              onClick={() => setTab('html')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === 'html' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Code size={12} /> HTML 붙여넣기
            </button>
          </div>

          {/* Input */}
          {tab === 'url' ? (
            <div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://3lifezone.co.kr/goods/view?no=657"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleParse()}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">원본 사이트 주소 (이미지 경로 해결용)</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://3lifezone.co.kr"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                placeholder="외부 상품 페이지의 HTML을 붙여넣으세요..."
                rows={5}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
              />
            </div>
          )}

          {/* Parse button */}
          <button
            onClick={handleParse}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                가져오는 중... (이미지 업로드 포함)
              </>
            ) : (
              '가져오기'
            )}
          </button>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">결과</span>
                {result.imageCount > 0 && (
                  <span className="text-xs text-emerald-600">이미지 {result.imageCount}개 업로드됨</span>
                )}
              </div>

              {/* Product Name */}
              {result.productName && (
                <ResultRow
                  label="상품명"
                  value={result.productName}
                  applied={!!applied.productName}
                  onApply={() => handleApply('productName', result.productName)}
                  showApply={!!onApplyProductName}
                />
              )}

              {/* Short Description */}
              {result.shortDescription && (
                <ResultRow
                  label="간략설명"
                  value={result.shortDescription}
                  applied={!!applied.shortDescription}
                  onApply={() => handleApply('shortDescription', result.shortDescription)}
                  showApply={!!onApplyShortDescription}
                />
              )}

              {/* Detail Description */}
              {result.detailDescription && (
                <ResultRow
                  label="상세설명"
                  value={`HTML (${result.detailDescription.length.toLocaleString()}자)`}
                  preview
                  previewHtml={result.detailDescription}
                  applied={!!applied.detailDescription}
                  onApply={() => handleApply('detailDescription', result.detailDescription)}
                  showApply={!!onApplyDetailDescription}
                />
              )}

              {!result.productName && !result.shortDescription && !result.detailDescription && (
                <p className="text-sm text-slate-400 text-center py-3">추출된 내용이 없습니다</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200">
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Result Row ──

function ResultRow({
  label,
  value,
  preview,
  previewHtml,
  applied,
  onApply,
  showApply,
}: {
  label: string;
  value: string;
  preview?: boolean;
  previewHtml?: string;
  applied: boolean;
  onApply: () => void;
  showApply: boolean;
}) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <span className="text-xs text-slate-400 block">{label}</span>
          {preview ? (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              {showPreview ? '미리보기 닫기' : value}
            </button>
          ) : (
            <p className="text-sm text-slate-700 truncate">{value}</p>
          )}
        </div>
        {showApply && (
          <button
            onClick={onApply}
            disabled={applied}
            className={`shrink-0 ml-3 flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              applied
                ? 'bg-emerald-50 text-emerald-600 cursor-default'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            {applied ? '적용됨' : (
              <>적용 <ArrowRight size={10} /></>
            )}
          </button>
        )}
      </div>
      {showPreview && previewHtml && (
        <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-100 max-h-48 overflow-y-auto">
          <div
            className="text-xs text-slate-600 prose prose-xs max-w-none"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      )}
    </div>
  );
}
