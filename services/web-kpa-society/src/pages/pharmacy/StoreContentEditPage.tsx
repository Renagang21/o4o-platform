/**
 * StoreContentEditPage — 매장 콘텐츠 독립 편집
 *
 * WO-KPA-A-CONTENT-OVERRIDE-EXTENSION-V1
 * WO-KPA-A-CONTENT-USAGE-MODE-EXTENSION-V1: 활용 설정 (displayMode, CTA, QR, print)
 *
 * 경로: /pharmacy/assets/content/:snapshotId/edit
 *
 * 기능:
 * - 제목 수정
 * - 본문(contentJson) 구조적 편집
 * - 이미지 URL 변경
 * - 링크 삽입/수정
 * - 활용 설정 (displayMode, CTA, QR, 출력 모드)
 * - 저장 (upsert → kpa_store_contents)
 * - 저장 성공 toast
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Loader2,
  AlertCircle,
  Save,
  ArrowLeft,
  CheckCircle,
  FileText,
  Image,
  Link as LinkIcon,
  Plus,
  Trash2,
  Settings2,
  QrCode,
  Printer,
  MousePointerClick,
  Eye,
} from 'lucide-react';
import { storeContentApi } from '../../api/assetSnapshot';

type ContentBlock = {
  type: 'text' | 'image' | 'link';
  value: string;
  label?: string;
};

type DisplayMode = 'default' | 'banner' | 'landing';

interface UsageSettings {
  displayMode: DisplayMode;
  cta: {
    enabled: boolean;
    label: string;
    url: string;
    target: '_blank' | '_self';
  };
  qr: {
    enabled: boolean;
  };
  print: {
    enabled: boolean;
  };
}

const DEFAULT_USAGE: UsageSettings = {
  displayMode: 'default',
  cta: { enabled: false, label: '', url: '', target: '_blank' },
  qr: { enabled: false },
  print: { enabled: false },
};

function parseContentJson(json: Record<string, unknown>): {
  blocks: ContentBlock[];
  usage: UsageSettings;
  raw: Record<string, unknown>;
} {
  // Parse usage settings
  const rawUsage = (json.usage || {}) as Partial<UsageSettings>;
  const usage: UsageSettings = {
    displayMode: rawUsage.displayMode || 'default',
    cta: {
      enabled: rawUsage.cta?.enabled || false,
      label: rawUsage.cta?.label || '',
      url: rawUsage.cta?.url || '',
      target: rawUsage.cta?.target || '_blank',
    },
    qr: { enabled: rawUsage.qr?.enabled || false },
    print: { enabled: rawUsage.print?.enabled || false },
  };

  // Try structured blocks format
  if (Array.isArray(json.blocks)) {
    return {
      blocks: (json.blocks as ContentBlock[]).map(b => ({
        type: b.type || 'text',
        value: b.value || '',
        label: b.label,
      })),
      usage,
      raw: json,
    };
  }

  // Fallback: convert flat fields to blocks
  const blocks: ContentBlock[] = [];
  if (typeof json.body === 'string' || typeof json.content === 'string') {
    blocks.push({ type: 'text', value: (json.body || json.content || '') as string });
  }
  if (typeof json.imageUrl === 'string' && json.imageUrl) {
    blocks.push({ type: 'image', value: json.imageUrl as string });
  }
  if (typeof json.linkUrl === 'string' && json.linkUrl) {
    blocks.push({ type: 'link', value: json.linkUrl as string, label: (json.linkLabel || '') as string });
  }

  if (blocks.length === 0) {
    blocks.push({ type: 'text', value: JSON.stringify(json, null, 2) });
  }

  return { blocks, usage, raw: json };
}

function blocksToContentJson(
  blocks: ContentBlock[],
  usage: UsageSettings,
  originalRaw: Record<string, unknown>,
): Record<string, unknown> {
  // If original had blocks format, preserve it
  if (Array.isArray(originalRaw.blocks)) {
    return { ...originalRaw, blocks, usage };
  }

  // Reconstruct flat fields
  const result: Record<string, unknown> = { ...originalRaw };
  const textBlock = blocks.find(b => b.type === 'text');
  const imageBlock = blocks.find(b => b.type === 'image');
  const linkBlock = blocks.find(b => b.type === 'link');

  if (textBlock) {
    if ('body' in originalRaw) result.body = textBlock.value;
    else if ('content' in originalRaw) result.content = textBlock.value;
    else result.body = textBlock.value;
  }
  if (imageBlock) result.imageUrl = imageBlock.value;
  if (linkBlock) {
    result.linkUrl = linkBlock.value;
    result.linkLabel = linkBlock.label || '';
  }

  result.blocks = blocks;
  result.usage = usage;
  return result;
}

const DISPLAY_MODE_OPTIONS: { value: DisplayMode; label: string; desc: string }[] = [
  { value: 'default', label: '기본', desc: '일반 콘텐츠 표시' },
  { value: 'banner', label: '배너형', desc: '상단 이미지 강조 + CTA 버튼' },
  { value: 'landing', label: '랜딩형', desc: '전체 화면 랜딩 레이아웃' },
];

export default function StoreContentEditPage() {
  const { snapshotId } = useParams<{ snapshotId: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [usage, setUsage] = useState<UsageSettings>(DEFAULT_USAGE);
  const [rawJson, setRawJson] = useState<Record<string, unknown>>({});
  const [orgId, setOrgId] = useState<string | null>(null);
  const [source, setSource] = useState<'store' | 'snapshot'>('snapshot');

  const fetchContent = useCallback(async () => {
    if (!snapshotId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await storeContentApi.get(snapshotId);
      const data = res.data;
      setTitle(data.title);
      setSource(data.source);
      setOrgId(data.organizationId);
      const parsed = parseContentJson(data.contentJson);
      setBlocks(parsed.blocks);
      setUsage(parsed.usage);
      setRawJson(parsed.raw);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [snapshotId]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const handleSave = async () => {
    if (!snapshotId) return;
    setSaving(true);
    try {
      const contentJson = blocksToContentJson(blocks, usage, rawJson);
      await storeContentApi.save(snapshotId, { title, contentJson });
      setSource('store');
      setToast('저장 완료');
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) {
      setToast(`저장 실패: ${e.message}`);
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const updateBlock = (index: number, field: keyof ContentBlock, value: string) => {
    setBlocks(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b));
  };

  const addBlock = (type: ContentBlock['type']) => {
    setBlocks(prev => [...prev, { type, value: '', label: type === 'link' ? '' : undefined }]);
  };

  const removeBlock = (index: number) => {
    setBlocks(prev => prev.filter((_, i) => i !== index));
  };

  const updateUsage = (patch: Partial<UsageSettings>) => {
    setUsage(prev => ({ ...prev, ...patch }));
  };

  const publicUrl = snapshotId && orgId ? `${window.location.origin}/content/${snapshotId}?org=${orgId}` : '';

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          콘텐츠를 불러오는 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex flex-col items-center justify-center py-20 text-red-500">
          <AlertCircle className="w-6 h-6 mb-2" />
          <p className="text-sm">{error}</p>
          <button onClick={fetchContent} className="mt-3 text-sm text-blue-600 hover:underline">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.startsWith('저장 실패') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          <CheckCircle className="w-4 h-4" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <Link
          to="/pharmacy/assets"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          자산 목록
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">콘텐츠 편집</h1>
            <p className="text-xs text-slate-400 mt-1">
              {source === 'store' ? '매장 편집본 (독립 저장)' : '원본 스냅샷 (첫 저장 시 매장 복사본 생성)'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {source === 'store' && orgId && (
              <Link
                to={`/content/${snapshotId}?org=${orgId}`}
                target="_blank"
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                <Eye className="w-4 h-4" />
                미리보기
              </Link>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              저장
            </button>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">제목</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="콘텐츠 제목"
        />
      </div>

      {/* Content Blocks */}
      <div className="space-y-4 mb-6">
        <label className="block text-sm font-medium text-slate-700">본문</label>
        {blocks.map((block, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {block.type === 'text' && <><FileText className="w-3.5 h-3.5" /> 텍스트</>}
                {block.type === 'image' && <><Image className="w-3.5 h-3.5" /> 이미지 URL</>}
                {block.type === 'link' && <><LinkIcon className="w-3.5 h-3.5" /> 링크</>}
              </div>
              <button
                onClick={() => removeBlock(idx)}
                className="text-slate-400 hover:text-red-500 transition-colors"
                title="블록 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {block.type === 'text' && (
              <textarea
                value={block.value}
                onChange={e => updateBlock(idx, 'value', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="본문 내용을 입력하세요"
              />
            )}

            {block.type === 'image' && (
              <input
                type="url"
                value={block.value}
                onChange={e => updateBlock(idx, 'value', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="https://example.com/image.jpg"
              />
            )}

            {block.type === 'link' && (
              <div className="space-y-2">
                <input
                  type="url"
                  value={block.value}
                  onChange={e => updateBlock(idx, 'value', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="https://example.com"
                />
                <input
                  type="text"
                  value={block.label || ''}
                  onChange={e => updateBlock(idx, 'label', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="링크 표시 텍스트"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Block Buttons */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => addBlock('text')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <Plus className="w-3.5 h-3.5" />
          텍스트
        </button>
        <button
          onClick={() => addBlock('image')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <Plus className="w-3.5 h-3.5" />
          이미지
        </button>
        <button
          onClick={() => addBlock('link')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <Plus className="w-3.5 h-3.5" />
          링크
        </button>
      </div>

      {/* ─────────────────────────────────────────── */}
      {/* Usage Settings — WO-KPA-A-CONTENT-USAGE-MODE-EXTENSION-V1 */}
      {/* ─────────────────────────────────────────── */}
      <div className="border-t border-slate-200 pt-6 mb-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-4">
          <Settings2 className="w-4 h-4" />
          활용 설정
        </h2>

        {/* Display Mode */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-600 mb-2">디스플레이 모드</label>
          <div className="flex gap-2">
            {DISPLAY_MODE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => updateUsage({ displayMode: opt.value })}
                className={`flex-1 px-3 py-2 rounded-lg border text-xs transition-colors ${
                  usage.displayMode === opt.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium">{opt.label}</div>
                <div className="text-[10px] mt-0.5 opacity-70">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <div className="mb-5 bg-slate-50 rounded-lg p-4">
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={usage.cta.enabled}
              onChange={e => updateUsage({ cta: { ...usage.cta, enabled: e.target.checked } })}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <MousePointerClick className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-700">CTA 버튼 사용</span>
          </label>
          {usage.cta.enabled && (
            <div className="space-y-2 pl-6">
              <input
                type="text"
                value={usage.cta.label}
                onChange={e => updateUsage({ cta: { ...usage.cta, label: e.target.value } })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="버튼 라벨 (예: 자세히 보기)"
              />
              <input
                type="url"
                value={usage.cta.url}
                onChange={e => updateUsage({ cta: { ...usage.cta, url: e.target.value } })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="링크 URL (https://...)"
              />
              <label className="flex items-center gap-2 text-[10px] text-slate-500">
                <input
                  type="checkbox"
                  checked={usage.cta.target === '_blank'}
                  onChange={e => updateUsage({ cta: { ...usage.cta, target: e.target.checked ? '_blank' : '_self' } })}
                  className="w-3 h-3 rounded border-slate-300"
                />
                새 탭에서 열기
              </label>
            </div>
          )}
        </div>

        {/* QR Code */}
        <div className="mb-5 bg-slate-50 rounded-lg p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={usage.qr.enabled}
              onChange={e => updateUsage({ qr: { enabled: e.target.checked } })}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <QrCode className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-700">QR 코드 표시</span>
          </label>
          {usage.qr.enabled && (
            <p className="text-[10px] text-slate-400 mt-2 pl-6">
              공개 URL: {publicUrl}
            </p>
          )}
        </div>

        {/* Print Mode */}
        <div className="mb-5 bg-slate-50 rounded-lg p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={usage.print.enabled}
              onChange={e => updateUsage({ print: { enabled: e.target.checked } })}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <Printer className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-700">인쇄 모드 사용</span>
          </label>
          {usage.print.enabled && (
            <p className="text-[10px] text-slate-400 mt-2 pl-6">
              인쇄 버튼이 공개 페이지에 표시됩니다
            </p>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="text-xs text-slate-400 border-t border-slate-100 pt-4">
        <p>저장하면 매장 전용 편집본이 생성됩니다. 원본 스냅샷은 변경되지 않습니다.</p>
        <p className="mt-1">게시 화면(B2C/사이니지/프로모션)에는 매장 편집본이 우선 노출됩니다.</p>
      </div>
    </div>
  );
}
