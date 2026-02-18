/**
 * PrintContentPage — 인쇄 최적화 콘텐츠 뷰
 *
 * WO-KPA-A-CONTENT-USAGE-MODE-EXTENSION-V1
 *
 * 경로: /content/:snapshotId/print?org=:organizationId
 * 공개 페이지 — 인증 불필요
 *
 * 기능:
 * - @media print 최적화 레이아웃
 * - 로드 완료 시 자동 인쇄 다이얼로그
 * - QR 코드 포함 (usage.qr.enabled 시)
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { publishedAssetsApi, type PublishedAssetItem } from '../../api/assetSnapshot';

interface ContentBlock {
  type: 'text' | 'image' | 'link';
  value: string;
  label?: string;
}

interface UsageSettings {
  displayMode: string;
  cta: { enabled: boolean; label: string; url: string; target: string };
  qr: { enabled: boolean };
  print: { enabled: boolean };
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

function parseUsage(json: Record<string, unknown>): UsageSettings {
  const raw = (json.usage || {}) as Partial<UsageSettings>;
  return {
    displayMode: (raw.displayMode as string) || 'default',
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

function qrImageUrl(data: string, size = 160): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export default function PrintContentPage() {
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

  // Auto-print when content is loaded
  useEffect(() => {
    if (!loading && asset) {
      const timer = setTimeout(() => window.print(), 500);
      return () => clearTimeout(timer);
    }
  }, [loading, asset]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-8 h-8 text-slate-300 mb-3" />
        <p className="text-sm text-slate-500">{error || '콘텐츠를 찾을 수 없습니다'}</p>
      </div>
    );
  }

  const contentJson = asset.contentJson as Record<string, unknown>;
  const usage = parseUsage(contentJson);
  const blocks = parseBlocks(contentJson);
  const publicUrl = `${window.location.origin}/content/${snapshotId}${window.location.search}`;

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .print-page { padding: 20mm; max-width: none; }
          .print-page img { max-height: 300px; }
        }
        @media screen {
          .print-page { max-width: 800px; margin: 0 auto; padding: 40px 24px; }
        }
      `}</style>

      <div className="print-page">
        {/* Screen-only toolbar */}
        <div className="no-print mb-6 flex items-center gap-3 pb-4 border-b border-slate-200">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            인쇄
          </button>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            돌아가기
          </button>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#0f172a' }}>
          {asset.title}
        </h1>

        {/* Content Blocks */}
        {blocks.map((block, idx) => {
          if (block.type === 'image') {
            return (
              <div key={idx} style={{ marginBottom: '16px' }}>
                <img src={block.value} alt="" style={{ maxWidth: '100%', height: 'auto' }} />
              </div>
            );
          }
          if (block.type === 'text') {
            return (
              <p key={idx} style={{ fontSize: '14px', lineHeight: '1.8', color: '#334155', whiteSpace: 'pre-wrap', marginBottom: '12px' }}>
                {block.value}
              </p>
            );
          }
          if (block.type === 'link') {
            return (
              <p key={idx} style={{ fontSize: '13px', color: '#2563eb', marginBottom: '8px' }}>
                {block.label || block.value}: {block.value}
              </p>
            );
          }
          return null;
        })}

        {/* QR Code for print */}
        {usage.qr.enabled && (
          <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>QR 코드로 온라인에서 확인하세요</p>
            <img
              src={qrImageUrl(publicUrl)}
              alt="QR Code"
              style={{ width: '120px', height: '120px', margin: '0 auto' }}
            />
            <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>{publicUrl}</p>
          </div>
        )}

        {/* CTA URL for print */}
        {usage.cta.enabled && usage.cta.url && (
          <div style={{ marginTop: '16px', fontSize: '12px', color: '#64748b' }}>
            {usage.cta.label || '자세히 보기'}: {usage.cta.url}
          </div>
        )}
      </div>
    </>
  );
}
