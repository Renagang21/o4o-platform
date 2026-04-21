/**
 * PartnerOps Links Page
 *
 * WO-O4O-TABLE-DATATABLE-DEPRECATION-V1B — BaseTable 직접 사용으로 마이그레이션
 */

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import { Plus, Copy, Trash2, ExternalLink, MousePointer, TrendingUp, Check } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import { BaseTable, RowActionMenu } from '@o4o/ui';
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
      if (response.data?.data) setLinks(response.data.data);
    } catch (err) {
      console.error('Failed to fetch links:', err);
      // Demo data
      setLinks([
        { id: '1', shortUrl: 'https://link.neture.co.kr/abc123', originalUrl: 'https://neture.co.kr/products/skincare-set', targetType: 'product', targetId: 'product-1', totalClicks: 1234, uniqueClicks: 980, conversions: 45, conversionRate: 3.65, totalCommission: 225000, createdAt: new Date().toISOString() },
        { id: '2', shortUrl: 'https://link.neture.co.kr/xyz789', originalUrl: 'https://neture.co.kr/routines/winter-care', targetType: 'routine', targetId: 'routine-1', totalClicks: 567, uniqueClicks: 450, conversions: 23, conversionRate: 4.06, totalCommission: 115000, createdAt: new Date().toISOString() },
        { id: '3', shortUrl: 'https://link.neture.co.kr/promo01', originalUrl: 'https://neture.co.kr/sale', targetType: 'custom', targetId: '', totalClicks: 2340, uniqueClicks: 1890, conversions: 67, conversionRate: 2.86, totalCommission: 335000, createdAt: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLinks(); }, []);

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
          <RowActionMenu
            actions={[
              { key: 'delete', label: '삭제', icon: <Trash2 size={14} />, variant: 'danger', confirm: '이 링크를 삭제하시겠습니까?', onClick: () => handleDelete(row.id) },
            ]}
          />
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
          { id: 'new-link', label: '새 링크', icon: <Plus className="w-4 h-4" />, onClick: () => setShowForm(true), variant: 'primary' as const },
        ]}
      />

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
                  onChange={(e) => setFormData({ ...formData, targetType: e.target.value as 'product' | 'routine' | 'category' | 'custom' })}
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
              <button onClick={handleCreate} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">생성</button>
              <button onClick={() => { setShowForm(false); setFormData({ originalUrl: '', targetType: 'custom', targetId: '' }); }} className="flex-1 py-2 border rounded-lg hover:bg-gray-50">취소</button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default Links;
