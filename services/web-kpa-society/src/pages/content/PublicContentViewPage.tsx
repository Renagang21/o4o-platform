/**
 * PublicContentViewPage — 공개 콘텐츠 렌더링
 *
 * WO-KPA-A-CONTENT-USAGE-MODE-EXTENSION-V1
 *
 * 경로: /content/:snapshotId?org=:organizationId
 * 공개 페이지 — 인증 불필요
 *
 * content_json.usage 기반 렌더링:
 *   - displayMode: default | banner | landing
 *   - cta: 버튼 표시
 *   - qr: QR 코드 표시
 *   - print: 인쇄 버튼 표시
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle, ExternalLink, Printer, QrCode } from 'lucide-react';
import { publishedAssetsApi, type PublishedAssetItem } from '../../api/assetSnapshot';

interface ContentBlock {
  type: 'text' | 'image' | 'link';
  value: string;
  label?: string;
}

interface UsageSettings {
  displayMode: 'default' | 'banner' | 'landing';
  cta: { enabled: boolean; label: string; url: string; target: '_blank' | '_self' };
  qr: { enabled: boolean };
  print: { enabled: boolean };
}

function parseUsage(json: Record<string, unknown>): UsageSettings {
  const raw = (json.usage || {}) as Partial<UsageSettings>;
  return {
    displayMode: raw.displayMode || 'default',
    cta: {
      enabled: raw.cta?.enabled || false,
      label: raw.cta?.label || '',
      url: raw.cta?.url || '',
      target: raw.cta?.target || '_blank',
    },
    qr: { enabled: raw.qr?.enabled || false },
    print: { enabled: raw.print?.enabled || false },
  };
}

function parseBlocks(json: Record<string, unknown>): ContentBlock[] {
  if (Array.isArray(json.blocks)) {
    return (json.blocks as ContentBlock[]).map(b => ({
      type: b.type || 'text',
      value: b.value || '',
      label: b.label,
    }));
  }
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
  return blocks;
}

function qrImageUrl(data: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export default function PublicContentViewPage() {
  const { snapshotId } = useParams<{ snapshotId: string }>();
  const [searchParams] = useSearchParams();
  const orgId = searchParams.get('org');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asset, setAsset] = useState<PublishedAssetItem | null>(null);

  useEffect(() => {
    if (!snapshotId || !orgId) {
      setError('필수 파라미터가 누락되었습니다');
      setLoading(false);
      return;
    }
    setLoading(true);
    publishedAssetsApi
      .get(orgId, snapshotId)
      .then(res => {
        if (res.success && res.data) {
          setAsset(res.data);
        } else {
          setError('콘텐츠를 찾을 수 없습니다');
        }
      })
      .catch(() => setError('콘텐츠를 불러올 수 없습니다'))
      .finally(() => setLoading(false));
  }, [snapshotId, orgId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <AlertCircle className="w-8 h-8 text-slate-300 mb-3" />
        <p className="text-sm text-slate-500">{error || '콘텐츠를 찾을 수 없습니다'}</p>
        <Link to="/" className="mt-4 text-sm text-blue-600 hover:underline">홈으로</Link>
      </div>
    );
  }

  const contentJson = asset.contentJson as Record<string, unknown>;
  const usage = parseUsage(contentJson);
  const blocks = parseBlocks(contentJson);
  const pageUrl = window.location.href;
  const imageBlock = blocks.find(b => b.type === 'image');
  const textBlocks = blocks.filter(b => b.type === 'text');
  const linkBlocks = blocks.filter(b => b.type === 'link');

  // Banner mode: hero image + overlay title + CTA
  if (usage.displayMode === 'banner') {
    return (
      <div className="min-h-screen bg-white">
        {/* Hero */}
        <div className="relative">
          {imageBlock ? (
            <img
              src={imageBlock.value}
              alt={asset.title}
              className="w-full h-[400px] object-cover"
            />
          ) : (
            <div className="w-full h-[400px] bg-gradient-to-br from-blue-600 to-blue-800" />
          )}
          <div className="absolute inset-0 bg-black/40 flex items-end">
            <div className="max-w-3xl mx-auto w-full px-6 pb-10">
              <h1 className="text-3xl font-bold text-white leading-tight">{asset.title}</h1>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="max-w-3xl mx-auto px-6 py-10">
          {textBlocks.map((b, i) => (
            <p key={i} className="text-base text-slate-700 leading-relaxed whitespace-pre-wrap mb-4">{b.value}</p>
          ))}
          {linkBlocks.map((b, i) => (
            <a key={i} href={b.value} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm mb-2">
              {b.label || b.value} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ))}
          <ContentFooter usage={usage} pageUrl={pageUrl} snapshotId={snapshotId!} />
        </div>
      </div>
    );
  }

  // Landing mode: full-screen sections
  if (usage.displayMode === 'landing') {
    return (
      <div className="min-h-screen bg-white">
        {/* Title Section */}
        <section className="bg-slate-900 text-white py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">{asset.title}</h1>
            {usage.cta.enabled && usage.cta.url && (
              <a
                href={usage.cta.url}
                target={usage.cta.target}
                rel="noopener noreferrer"
                className="inline-block mt-6 px-8 py-3 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition-colors"
              >
                {usage.cta.label || '자세히 보기'}
              </a>
            )}
          </div>
        </section>

        {/* Image Section */}
        {imageBlock && (
          <section className="py-0">
            <img src={imageBlock.value} alt="" className="w-full max-h-[600px] object-cover" />
          </section>
        )}

        {/* Text Section */}
        {textBlocks.length > 0 && (
          <section className="py-16 px-6">
            <div className="max-w-3xl mx-auto">
              {textBlocks.map((b, i) => (
                <p key={i} className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap mb-6">{b.value}</p>
              ))}
            </div>
          </section>
        )}

        {/* Links */}
        {linkBlocks.length > 0 && (
          <section className="py-10 px-6 bg-slate-50">
            <div className="max-w-3xl mx-auto flex flex-col gap-3">
              {linkBlocks.map((b, i) => (
                <a key={i} href={b.value} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                  {b.label || b.value} <ExternalLink className="w-4 h-4" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Footer utilities */}
        <section className="py-12 px-6">
          <div className="max-w-3xl mx-auto">
            <ContentFooter usage={usage} pageUrl={pageUrl} snapshotId={snapshotId!} />
          </div>
        </section>
      </div>
    );
  }

  // Default mode: clean card layout
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <article className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {imageBlock && (
          <img src={imageBlock.value} alt={asset.title} className="w-full h-auto max-h-[400px] object-cover" />
        )}
        <div className="p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">{asset.title}</h1>
          {textBlocks.map((b, i) => (
            <p key={i} className="text-base text-slate-700 leading-relaxed whitespace-pre-wrap mb-4">{b.value}</p>
          ))}
          {linkBlocks.map((b, i) => (
            <a key={i} href={b.value} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm mb-2">
              {b.label || b.value} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ))}
          <ContentFooter usage={usage} pageUrl={pageUrl} snapshotId={snapshotId!} />
        </div>
      </article>
    </div>
  );
}

/**
 * Shared footer: CTA button, QR code, Print button
 */
function ContentFooter({
  usage,
  pageUrl,
  snapshotId,
}: {
  usage: UsageSettings;
  pageUrl: string;
  snapshotId: string;
}) {
  const showFooter = usage.cta.enabled || usage.qr.enabled || usage.print.enabled;
  if (!showFooter) return null;

  return (
    <div className="mt-8 pt-6 border-t border-slate-100 space-y-6">
      {/* CTA */}
      {usage.cta.enabled && usage.cta.url && usage.displayMode !== 'landing' && (
        <div className="flex justify-center">
          <a
            href={usage.cta.url}
            target={usage.cta.target}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {usage.cta.label || '자세히 보기'}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* QR */}
      {usage.qr.enabled && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <QrCode className="w-3.5 h-3.5" />
            QR 코드
          </div>
          <img
            src={qrImageUrl(pageUrl)}
            alt="QR Code"
            className="w-[160px] h-[160px] border border-slate-200 rounded-lg p-1"
          />
        </div>
      )}

      {/* Print */}
      {usage.print.enabled && (
        <div className="flex justify-center">
          <Link
            to={`/content/${snapshotId}/print${window.location.search}`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <Printer className="w-4 h-4" />
            인쇄용 보기
          </Link>
        </div>
      )}
    </div>
  );
}
