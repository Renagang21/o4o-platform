/**
 * PartnerOps Links Page
 *
 * WO-O4O-TABLE-DATATABLE-DEPRECATION-V1B — BaseTable 직접 사용으로 마이그레이션
 */

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import { Plus, Copy, ExternalLink, MousePointer, TrendingUp, Check } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import {
  PartnerOpsLoadError,
  PartnerOpsMutationNotice,
  PARTNEROPS_MUTATION_DISABLED_REASON,
  toLoadError,
  type PartnerOpsLoadErrorInfo,
} from '../components/PartnerOpsLoadError';
import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';

interface TrackingLink {
  id: string;
  shortUrl: string;
  originalUrl: string;
  targetType: 'product' | 'routine' | 'category' | 'custom';
  targetId: string;
  productType?: string;
  totalClicks: number;
  uniqueClicks: number;
  conversions: number;
  conversionRate: number;
  totalCommission: number;
  createdAt: string;
}

const LINKS_ENDPOINT = '/partnerops/links';

const Links: React.FC = () => {
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [loading, setLoading] = useState(true);
  // WO-O4O-PARTNEROPS-ACTIVE-DEMO-FALLBACK-AUDIT-AND-GUIDE-V1:
  //   조회 실패 시 데모 링크를 주입하지 않는다. 실패는 실패로 표시한다.
  const [loadError, setLoadError] = useState<PartnerOpsLoadErrorInfo | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLinks = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await authClient.api.get(LINKS_ENDPOINT);
      setLinks(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (err) {
      console.error('Failed to fetch links:', err);
      setLinks([]);
      setLoadError(toLoadError(err, LINKS_ENDPOINT));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLinks(); }, []);

  // WO-O4O-PARTNEROPS-ACTIVE-DEMO-FALLBACK-AUDIT-AND-GUIDE-V1:
  //   링크 생성(POST /partnerops/links) · 삭제(DELETE /partnerops/links/:id) 는
  //   운영 API 검증 전이므로 CTA 를 비활성 처리했다. 실행 경로를 남겨두지 않는다.

  const copyLink = (link: TrackingLink) => {
    navigator.clipboard.writeText(link.shortUrl);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getShortCode = (shortUrl: string) => {
    const parts = shortUrl.split('/');
    return parts[parts.length - 1];
  };

  const getTargetTypeBadge = (type: string) => {
    switch (type) {
      case 'product': return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">상품</span>;
      case 'routine': return <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">루틴</span>;
      case 'category': return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">카테고리</span>;
      default: return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">커스텀</span>;
    }
  };

  const columns: O4OColumn<TrackingLink>[] = [
    {
      key: 'link',
      header: '링크',
      render: (_, row) => (
        <div>
          <p className="font-medium text-blue-600">/{getShortCode(row.shortUrl)}</p>
          <p className="text-xs text-gray-500 truncate max-w-xs">{row.originalUrl}</p>
        </div>
      ),
    },
    {
      key: 'targetType',
      header: '유형',
      render: (_, row) => getTargetTypeBadge(row.targetType),
    },
    {
      key: 'totalClicks',
      header: '클릭',
      align: 'right',
      sortable: true,
      sortAccessor: (row) => row.totalClicks,
      render: (_, row) => <span className="font-medium">{row.totalClicks.toLocaleString()}</span>,
    },
    {
      key: 'conversions',
      header: '전환',
      align: 'right',
      sortable: true,
      sortAccessor: (row) => row.conversions,
      render: (_, row) => <span className="font-medium">{row.conversions}</span>,
    },
    {
      key: 'conversionRate',
      header: '전환율',
      align: 'right',
      sortable: true,
      sortAccessor: (row) => row.conversionRate,
      render: (_, row) => (
        <span className={`font-medium ${row.conversionRate >= 3 ? 'text-green-600' : row.conversionRate >= 2 ? 'text-blue-600' : 'text-gray-600'}`}>
          {row.conversionRate.toFixed(2)}%
        </span>
      ),
    },
    {
      key: '_actions',
      header: '',
      width: 100,
      system: true,
      align: 'center',
      render: (_, row) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => copyLink(row)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
            title="복사"
          >
            {copiedId === row.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={() => window.open(row.shortUrl, '_blank')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
            title="열기"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="추적 링크 관리"
        subtitle="파트너 링크를 생성하고 성과를 추적합니다"
        actions={[
          { id: 'new-link', label: '새 링크', icon: <Plus className="w-4 h-4" />, onClick: () => {}, variant: 'primary' as const, disabled: true },
        ]}
      />

      <div className="mb-6">
        <PartnerOpsMutationNotice reason={`링크 생성·삭제 — ${PARTNEROPS_MUTATION_DISABLED_REASON}`} />
      </div>

      {loadError && (
        <div className="mb-6">
          <PartnerOpsLoadError error={loadError} onRetry={fetchLinks} retrying={loading} />
        </div>
      )}

      {!loadError && (
      <>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-blue-600" />
            </div>
            <div><p className="text-sm text-gray-600">총 링크</p><p className="text-xl font-bold">{links.length}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <MousePointer className="w-5 h-5 text-green-600" />
            </div>
            <div><p className="text-sm text-gray-600">총 클릭</p><p className="text-xl font-bold">{links.reduce((acc, l) => acc + l.totalClicks, 0).toLocaleString()}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div><p className="text-sm text-gray-600">총 전환</p><p className="text-xl font-bold">{links.reduce((acc, l) => acc + l.conversions, 0)}</p></div>
          </div>
        </div>
      </div>

      {/* Links Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="animate-pulse p-4 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}
          </div>
        ) : (
          <BaseTable<TrackingLink>
            columns={columns}
            data={links}
            rowKey={(row) => row.id}
            emptyMessage="아직 생성된 링크가 없습니다."
            tableId="partnerops-links"
            columnVisibility
            persistState
          />
        )}
      </div>
      </>
      )}
    </div>
  );
};

export default Links;
