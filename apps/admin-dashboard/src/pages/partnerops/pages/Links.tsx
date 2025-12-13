/**
 * PartnerOps Links Page
 *
 * Tracking link management:
 * - Create tracking links
 * - View link statistics
 * - Copy/share links
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
  BarChart2,
  Check,
} from 'lucide-react';

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

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">추적 링크 관리</h1>
          <p className="text-gray-600">파트너 링크를 생성하고 성과를 추적합니다</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          새 링크
        </button>
      </div>

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

      {/* Links List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">링크</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">유형</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">클릭</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">전환</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">전환율</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {links.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  아직 생성된 링크가 없습니다.
                </td>
              </tr>
            ) : (
              links.map((link) => (
                <tr key={link.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-blue-600">/{getShortCode(link.shortUrl)}</p>
                      <p className="text-xs text-gray-500 truncate max-w-xs">
                        {link.originalUrl}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">{getTargetTypeBadge(link.targetType)}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {link.totalClicks.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{link.conversions}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-medium ${
                        link.conversionRate >= 3
                          ? 'text-green-600'
                          : link.conversionRate >= 2
                            ? 'text-blue-600'
                            : 'text-gray-600'
                      }`}
                    >
                      {link.conversionRate.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => copyLink(link)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                        title="복사"
                      >
                        {copiedId === link.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => window.open(link.shortUrl, '_blank')}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                        title="열기"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Links;
