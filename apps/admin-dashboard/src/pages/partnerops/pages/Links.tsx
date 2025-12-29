/**
 * PartnerOps Links Page
 *
 * Tracking link management:
 * - Create tracking links
 * - View link statistics
 * - Copy/share links
 *
 * Refactored: PageHeader + DataTable pattern applied
 */

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import {
  Plus,
  Copy,
  Trash2,
  ExternalLink,
  MousePointer,
  TrendingUp,
  Check,
  Settings,
} from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import { DataTable, Column } from '../../../components/common/DataTable';

/**
 * Tracking Link (Partner-Core aligned)
 * Maps to PartnerLinkStatsDto from @o4o/partnerops
 */
interface TrackingLink {
  id: string;            // linkId
  shortUrl: string;      // Changed from shortCode
  originalUrl: string;   // Changed from targetUrl
  targetType: 'product' | 'routine' | 'category' | 'custom';  // Partner-Core types
  targetId: string;
  productType?: string;
  totalClicks: number;   // Changed from clicks
  uniqueClicks: number;
  conversions: number;
  conversionRate: number;
  totalCommission: number;
  createdAt: string;
}

const Links: React.FC = () => {
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    originalUrl: '',
    targetType: 'custom' as 'product' | 'routine' | 'category' | 'custom',
    targetId: '',
  });

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const response = await authClient.api.get('/partnerops/links');
      if (response.data?.data) {
        setLinks(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch links:', err);
      // Demo data
      setLinks([
        {
          id: '1',
          shortUrl: 'https://link.neture.co.kr/abc123',
          originalUrl: 'https://neture.co.kr/products/skincare-set',
          targetType: 'product',
          targetId: 'product-1',
          totalClicks: 1234,
          uniqueClicks: 980,
          conversions: 45,
          conversionRate: 3.65,
          totalCommission: 225000,
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          shortUrl: 'https://link.neture.co.kr/xyz789',
          originalUrl: 'https://neture.co.kr/routines/winter-care',
          targetType: 'routine',
          targetId: 'routine-1',
          totalClicks: 567,
          uniqueClicks: 450,
          conversions: 23,
          conversionRate: 4.06,
          totalCommission: 115000,
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          shortUrl: 'https://link.neture.co.kr/promo01',
          originalUrl: 'https://neture.co.kr/sale',
          targetType: 'custom',
          targetId: '',
          totalClicks: 2340,
          uniqueClicks: 1890,
          conversions: 67,
          conversionRate: 2.86,
          totalCommission: 335000,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleCreate = async () => {
    try {
      await authClient.api.post('/partnerops/links', formData);
      setShowForm(false);
      setFormData({ originalUrl: '', targetType: 'custom', targetId: '' });
      fetchLinks();
    } catch (err) {
      console.error('Failed to create link:', err);
      alert('링크 생성에 실패했습니다.');
    }
  };

  const handleDelete = async (linkId: string) => {
    if (!confirm('이 링크를 삭제하시겠습니까?')) return;

    try {
      await authClient.api.delete(`/partnerops/links/${linkId}`);
      fetchLinks();
    } catch (err) {
      console.error('Failed to delete link:', err);
      alert('링크 삭제에 실패했습니다.');
    }
  };

  const copyLink = (link: TrackingLink) => {
    navigator.clipboard.writeText(link.shortUrl);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Extract short code from shortUrl for display
  const getShortCode = (shortUrl: string) => {
    const parts = shortUrl.split('/');
    return parts[parts.length - 1];
  };

  const getTargetTypeBadge = (type: string) => {
    switch (type) {
      case 'product':
        return (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
            상품
          </span>
        );
      case 'routine':
        return (
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
            루틴
          </span>
        );
      case 'category':
        return (
          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
            카테고리
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
            커스텀
          </span>
        );
    }
  };

  // DataTable column definitions
  const columns: Column<TrackingLink>[] = [
    {
      key: 'link',
      title: '링크',
      render: (_: unknown, record: TrackingLink) => (
        <div>
          <p className="font-medium text-blue-600">/{getShortCode(record.shortUrl)}</p>
          <p className="text-xs text-gray-500 truncate max-w-xs">
            {record.originalUrl}
          </p>
        </div>
      ),
    },
    {
      key: 'targetType',
      title: '유형',
      dataIndex: 'targetType',
      render: (value: string) => getTargetTypeBadge(value),
    },
    {
      key: 'totalClicks',
      title: '클릭',
      dataIndex: 'totalClicks',
      align: 'right',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium">{value.toLocaleString()}</span>
      ),
    },
    {
      key: 'conversions',
      title: '전환',
      dataIndex: 'conversions',
      align: 'right',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium">{value}</span>
      ),
    },
    {
      key: 'conversionRate',
      title: '전환율',
      dataIndex: 'conversionRate',
      align: 'right',
      sortable: true,
      render: (value: number) => (
        <span
          className={`font-medium ${
            value >= 3
              ? 'text-green-600'
              : value >= 2
                ? 'text-blue-600'
                : 'text-gray-600'
          }`}
        >
          {value.toFixed(2)}%
        </span>
      ),
    },
    {
      key: 'actions',
      title: '작업',
      align: 'center',
      render: (_: unknown, record: TrackingLink) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyLink(record);
            }}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
            title="복사"
          >
            {copiedId === record.id ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(record.shortUrl, '_blank');
            }}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
            title="열기"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(record.id);
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded"
            title="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // PageHeader actions
  const headerActions = [
    {
      id: 'screen-options',
      label: 'Screen Options',
      icon: <Settings className="w-4 h-4" />,
      onClick: () => {
        // Screen options toggle (placeholder)
        console.log('Screen options clicked');
      },
      variant: 'secondary' as const,
    },
    {
      id: 'new-link',
      label: '새 링크',
      icon: <Plus className="w-4 h-4" />,
      onClick: () => setShowForm(true),
      variant: 'primary' as const,
    },
  ];

  return (
    <div className="p-6">
      {/* PageHeader */}
      <PageHeader
        title="추적 링크 관리"
        subtitle="파트너 링크를 생성하고 성과를 추적합니다"
        actions={headerActions}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">총 링크</p>
              <p className="text-xl font-bold">{links.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <MousePointer className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">총 클릭</p>
              <p className="text-xl font-bold">
                {links.reduce((acc, l) => acc + l.totalClicks, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">총 전환</p>
              <p className="text-xl font-bold">
                {links.reduce((acc, l) => acc + l.conversions, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg mx-4">
            <h2 className="text-xl font-bold mb-4">새 링크 만들기</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">링크 유형</label>
                <select
                  value={formData.targetType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      targetType: e.target.value as 'product' | 'routine' | 'category' | 'custom',
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="custom">커스텀 URL</option>
                  <option value="product">상품</option>
                  <option value="routine">루틴</option>
                  <option value="category">카테고리</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">대상 URL</label>
                <input
                  type="text"
                  value={formData.originalUrl}
                  onChange={(e) => setFormData({ ...formData, originalUrl: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="https://neture.co.kr/product/..."
                />
              </div>

              {formData.targetType !== 'custom' && (
                <div>
                  <label className="block text-sm font-medium mb-1">대상 ID</label>
                  <input
                    type="text"
                    value={formData.targetId}
                    onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="상품 또는 루틴 ID"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreate}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                생성
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setFormData({ originalUrl: '', targetType: 'custom', targetId: '' });
                }}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Links DataTable */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable<TrackingLink>
          columns={columns}
          dataSource={links}
          rowKey="id"
          loading={loading}
          emptyText="아직 생성된 링크가 없습니다."
        />
      </div>
    </div>
  );
};

export default Links;
