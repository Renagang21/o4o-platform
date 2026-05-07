/**
 * StoreContentWorkspacePage — 매장 콘텐츠 작업 공간
 *
 * WO-O4O-STORE-CONTENT-WORKSPACE-V1
 *
 * 경로: /kpa/content-workspace
 *
 * 매장으로 가져온 자산(StoreExecutionAsset)을 기반으로
 * QR/POP/Blog/Signage 결과물 작업을 시작하는 허브 페이지.
 *
 * 핵심 원칙:
 * - Community Asset 원본 copy 금지 — reference 기반 표시
 * - QR 선택 시 Warning Modal 필수 표시
 * - 미구현 Output은 disabled + 준비 중 표시
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import {
  QrCode,
  Printer,
  FileText,
  Monitor,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  File,
  Code,
  Globe,
  X,
  MessageSquare,
  Filter,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';

// ── Types ──────────────────────────────────────────────────────────────────

interface StoreAsset {
  id: string;
  title: string;
  description: string | null;
  assetType: 'file' | 'content' | 'external-link';
  usageType: 'pop' | 'qr' | 'signage' | 'banner' | 'notice' | null;
  fileUrl: string | null;
  htmlContent: string | null;
  url: string | null;
  category: string | null;
  sourceType: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AssetsResponse {
  success: boolean;
  data: {
    items: StoreAsset[];
    page: number;
    limit: number;
    total: number;
  };
}

// ── Constants ──────────────────────────────────────────────────────────────

const API_BASE = '/api/v1/kpa/store/assets';

const ASSET_TYPE_CONFIG: Record<StoreAsset['assetType'], { label: string; icon: typeof File; className: string }> = {
  file: { label: '파일', icon: File, className: 'text-blue-600 bg-blue-50' },
  content: { label: 'HTML 콘텐츠', icon: Code, className: 'text-purple-600 bg-purple-50' },
  'external-link': { label: '외부 링크', icon: Globe, className: 'text-green-600 bg-green-50' },
};

const USAGE_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  pop: { label: 'POP', className: 'text-orange-700 bg-orange-50 border-orange-200' },
  qr: { label: 'QR', className: 'text-blue-700 bg-blue-50 border-blue-200' },
  signage: { label: '사이니지', className: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  banner: { label: '배너', className: 'text-pink-700 bg-pink-50 border-pink-200' },
  notice: { label: '공지', className: 'text-gray-700 bg-gray-100 border-gray-200' },
};

const USAGE_TYPE_FILTER_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'qr', label: 'QR' },
  { value: 'pop', label: 'POP' },
  { value: 'signage', label: '사이니지' },
  { value: 'banner', label: '배너' },
  { value: 'notice', label: '공지' },
];

// QR Warning 문구
const QR_WARNING_MESSAGE = `QR 코드는 내용을 담는 것이 아니라 연결 대상을 저장합니다.
사용자가 QR을 스캔하면 선택한 상품·콘텐츠·페이지·링크로 이동합니다.
내용이 바뀌어도 QR 이미지는 그대로 재사용할 수 있지만,
연결 대상을 변경하면 기존에 인쇄한 QR도 새 대상으로 이동합니다.`;

// ── Helpers ─────────────────────────────────────────────────────────────────

async function fetchAssets(usageType: string): Promise<AssetsResponse> {
  const params = new URLSearchParams({ page: '1', limit: '50' });
  if (usageType !== 'all') params.set('usage_type', usageType);
  const res = await authClient.api.get<AssetsResponse>(`${API_BASE}?${params}`);
  return res.data;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function StoreContentWorkspacePage() {
  const navigate = useNavigate();
  const [usageTypeFilter, setUsageTypeFilter] = useState('all');
  const [qrWarningAsset, setQrWarningAsset] = useState<StoreAsset | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['store-content-workspace', usageTypeFilter],
    queryFn: () => fetchAssets(usageTypeFilter),
  });

  const assets = data?.data?.items ?? [];

  const handleQrClick = (asset: StoreAsset) => {
    setQrWarningAsset(asset);
  };

  const handleQrConfirm = () => {
    // assetId를 QR create 페이지에 전달 (state 방식)
    navigate('/store/qr/create', {
      state: {
        prefillTitle: qrWarningAsset?.title,
        prefillLibraryItemId: qrWarningAsset?.id,
      },
    });
    setQrWarningAsset(null);
  };

  const handlePopClick = (asset: StoreAsset) => {
    navigate('/store/pop/create', {
      state: {
        prefillTitle: asset.title,
        prefillLibraryItemId: asset.id,
      },
    });
  };

  const handleNotReady = (label: string) => {
    // 미구현 Output — 준비 중 안내
    import('react-hot-toast').then(({ toast }) => {
      toast(`${label} 기능은 준비 중입니다.`, { icon: '🔧' });
    });
  };

  const columns: O4OColumn<StoreAsset>[] = [
    {
      key: 'title',
      header: '자산 제목',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{row.title}</p>
          {row.description && (
            <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{row.description}</p>
          )}
          {row.category && (
            <span className="mt-1 inline-block text-[11px] text-gray-400">{row.category}</span>
          )}
        </div>
      ),
    },
    {
      key: 'assetType',
      header: '유형',
      width: 120,
      render: (row) => {
        const cfg = ASSET_TYPE_CONFIG[row.assetType];
        const Icon = cfg.icon;
        return (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
            <Icon size={11} />
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'usageType',
      header: '용도',
      width: 100,
      render: (row) => {
        if (!row.usageType) return <span className="text-xs text-gray-400">—</span>;
        const cfg = USAGE_TYPE_CONFIG[row.usageType];
        if (!cfg) return <span className="text-xs text-gray-500">{row.usageType}</span>;
        return (
          <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: '등록일',
      width: 100,
      render: (row) => (
        <span className="text-xs text-gray-400">
          {new Date(row.createdAt).toLocaleDateString('ko-KR')}
        </span>
      ),
    },
    {
      key: 'id',
      header: '결과물 만들기',
      width: 300,
      render: (row) => (
        <div className="flex flex-wrap items-center gap-1.5">
          {/* QR 만들기 — Warning Modal 경유 */}
          <button
            onClick={() => handleQrClick(row)}
            className="flex items-center gap-1 rounded border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <QrCode size={12} />
            QR 만들기
          </button>

          {/* POP 만들기 */}
          <button
            onClick={() => handlePopClick(row)}
            className="flex items-center gap-1 rounded border border-orange-300 bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100 transition-colors"
          >
            <Printer size={12} />
            POP 만들기
          </button>

          {/* 블로그 — 준비 중 */}
          <button
            onClick={() => handleNotReady('블로그')}
            className="flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-400 cursor-not-allowed"
            title="준비 중"
          >
            <FileText size={12} />
            블로그
          </button>

          {/* 사이니지 — 준비 중 */}
          <button
            onClick={() => handleNotReady('사이니지')}
            className="flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-400 cursor-not-allowed"
            title="준비 중"
          >
            <Monitor size={12} />
            사이니지
          </button>

          {/* SNS — 준비 중 */}
          <button
            onClick={() => handleNotReady('SNS 문구')}
            className="flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-400 cursor-not-allowed"
            title="준비 중"
          >
            <MessageSquare size={12} />
            SNS
          </button>

          {/* 원본 보기 (파일·외부링크) */}
          {(row.fileUrl || row.url) && (
            <a
              href={row.fileUrl || row.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded border border-gray-200 px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ExternalLink size={11} />
              원본
            </a>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="매장 콘텐츠 작업 공간"
        subtitle="내 매장 자산을 선택하여 QR·POP·블로그·사이니지 등 결과물을 만드세요."
        actions={[
          { id: 'refresh', label: '새로고침', icon: <RefreshCw size={14} />, onClick: () => refetch() },
        ]}
      />

      {/* 안내 배너 */}
      <div className="mb-5 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-blue-600" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">작업 공간 안내</p>
          <p className="mt-0.5 text-blue-700">
            여기에 표시된 자산은 매장이 보유한 실행 자산입니다.
            자산을 선택하여 QR·POP 등 결과물을 만들고, 매장에서 활용하세요.
            커뮤니티 원본은 복제되지 않으며 참조(reference) 방식으로 연결됩니다.
          </p>
        </div>
      </div>

      {/* usageType 필터 */}
      <div className="mb-4 flex items-center gap-2">
        <Filter size={14} className="text-gray-400" />
        <span className="text-xs text-gray-500 mr-1">용도 필터:</span>
        {USAGE_TYPE_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setUsageTypeFilter(opt.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              usageTypeFilter === opt.value
                ? 'bg-blue-600 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">불러오는 중...</div>
      ) : isError ? (
        <div className="rounded border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          데이터를 불러오는 중 오류가 발생했습니다.
        </div>
      ) : (
        <BaseTable<StoreAsset>
          columns={columns}
          data={assets}
          emptyMessage={
            usageTypeFilter === 'all'
              ? '등록된 자산이 없습니다. 자산을 먼저 추가해 주세요.'
              : `'${USAGE_TYPE_CONFIG[usageTypeFilter]?.label ?? usageTypeFilter}' 용도의 자산이 없습니다.`
          }
        />
      )}

      {/* QR Warning Modal — WO-O4O-STORE-CONTENT-WORKSPACE-V1 */}
      {qrWarningAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <h3 className="text-base font-semibold text-gray-900">QR 코드 생성 전 확인</h3>
              </div>
              <button
                onClick={() => setQrWarningAsset(null)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Warning Content */}
            <div className="px-6 py-5">
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  ⚠ QR 코드를 출력하기 전에 확인하세요.
                </p>
                <p className="text-sm text-amber-700 whitespace-pre-line leading-relaxed">
                  {QR_WARNING_MESSAGE}
                </p>
              </div>

              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs font-medium text-blue-800 mb-1">
                  이 QR은 URL 연결형입니다.
                </p>
                <p className="text-xs text-blue-700">
                  QR 자체가 콘텐츠를 저장하지 않습니다.
                  스캔한 사용자는 선택한 상품 또는 페이지로 이동합니다.
                </p>
              </div>

              <p className="text-sm text-gray-600">
                선택한 자산: <span className="font-medium text-gray-900">"{qrWarningAsset.title}"</span>
              </p>
              <p className="mt-1 text-xs text-gray-400">
                QR 생성 페이지로 이동합니다. 세부 설정은 다음 단계에서 진행하세요.
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setQrWarningAsset(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleQrConfirm}
                className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <QrCode size={14} />
                QR 생성 페이지로 이동
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
