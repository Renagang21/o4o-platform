/**
 * Cosmetics Partner Links Page
 *
 * 파트너 링크 관리 페이지
 * - 링크 목록 테이블
 * - 새 링크 생성
 * - 링크 클릭수/전환수 표시
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  Plus,
  Link2,
  Copy,
  ExternalLink,
  Trash2,
  Search,
  RefreshCw,
  X,
  Check,
} from 'lucide-react';

interface PartnerLink {
  id: string;
  urlSlug: string;
  linkType: 'product' | 'routine' | 'promotion' | 'general';
  targetId?: string;
  targetName?: string;
  fullUrl: string;
  clicks: number;
  conversions: number;
  totalEarnings: number;
  status: 'active' | 'paused' | 'expired';
  createdAt: string;
}

interface CreateLinkForm {
  urlSlug: string;
  linkType: 'product' | 'routine' | 'promotion' | 'general';
  targetId?: string;
}

const CosmeticsPartnerLinks: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [links, setLinks] = useState<PartnerLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('action') === 'new');
  const [createForm, setCreateForm] = useState<CreateLinkForm>({
    urlSlug: '',
    linkType: 'product',
    targetId: '',
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const response = await authClient.api.get('/api/v1/partner/links');
      if (response.data?.data) {
        setLinks(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch links:', err);
      // Demo data
      setLinks([
        {
          id: '1',
          urlSlug: 'summer-skincare-2024',
          linkType: 'product',
          targetId: 'prod-123',
          targetName: '여름 선케어 세트',
          fullUrl: 'https://neture.co.kr/p/summer-skincare-2024',
          clicks: 1245,
          conversions: 52,
          totalEarnings: 156000,
          status: 'active',
          createdAt: '2024-12-01T10:00:00Z',
        },
        {
          id: '2',
          urlSlug: 'anti-aging-routine',
          linkType: 'routine',
          targetId: 'routine-456',
          targetName: '안티에이징 루틴',
          fullUrl: 'https://neture.co.kr/r/anti-aging-routine',
          clicks: 892,
          conversions: 38,
          totalEarnings: 114000,
          status: 'active',
          createdAt: '2024-11-28T14:30:00Z',
        },
        {
          id: '3',
          urlSlug: 'best-sunscreen-picks',
          linkType: 'product',
          targetId: 'prod-789',
          targetName: '선크림 베스트',
          fullUrl: 'https://neture.co.kr/p/best-sunscreen-picks',
          clicks: 567,
          conversions: 21,
          totalEarnings: 63000,
          status: 'active',
          createdAt: '2024-11-25T09:15:00Z',
        },
        {
          id: '4',
          urlSlug: 'winter-sale-2024',
          linkType: 'promotion',
          targetName: '겨울 할인 프로모션',
          fullUrl: 'https://neture.co.kr/promo/winter-sale-2024',
          clicks: 2341,
          conversions: 89,
          totalEarnings: 267000,
          status: 'active',
          createdAt: '2024-12-05T16:00:00Z',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleCopyLink = async (link: PartnerLink) => {
    try {
      await navigator.clipboard.writeText(link.fullUrl);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCreateLink = async () => {
    try {
      await authClient.api.post('/api/v1/partner/links', createForm);
      setShowCreateModal(false);
      setCreateForm({ urlSlug: '', linkType: 'product', targetId: '' });
      setSearchParams({});
      fetchLinks();
    } catch (err) {
      console.error('Failed to create link:', err);
      // For demo, just add to list
      const newLink: PartnerLink = {
        id: String(Date.now()),
        urlSlug: createForm.urlSlug,
        linkType: createForm.linkType,
        targetId: createForm.targetId,
        targetName: '새 링크',
        fullUrl: `https://neture.co.kr/p/${createForm.urlSlug}`,
        clicks: 0,
        conversions: 0,
        totalEarnings: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      setLinks([newLink, ...links]);
      setShowCreateModal(false);
      setCreateForm({ urlSlug: '', linkType: 'product', targetId: '' });
      setSearchParams({});
    }
  };

  const filteredLinks = links.filter(
    (link) =>
      link.urlSlug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.targetName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const linkTypeLabels: Record<string, string> = {
    product: '상품',
    routine: '루틴',
    promotion: '프로모션',
    general: '일반',
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    active: { label: '활성', color: 'bg-green-100 text-green-800' },
    paused: { label: '일시정지', color: 'bg-yellow-100 text-yellow-800' },
    expired: { label: '만료', color: 'bg-gray-100 text-gray-800' },
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">파트너 링크</h1>
          <p className="text-gray-600">추천 링크 관리 및 성과 추적</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLinks}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
          >
            <Plus className="w-4 h-4" />
            새 링크 생성
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="링크 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
      </div>

      {/* Links Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">링크</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">유형</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">클릭</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">전환</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">수익</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">상태</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredLinks.map((link) => (
              <tr key={link.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-pink-500" />
                      {link.urlSlug}
                    </p>
                    {link.targetName && (
                      <p className="text-xs text-gray-500">{link.targetName}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs rounded bg-gray-100">
                    {linkTypeLabels[link.linkType]}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-medium text-blue-600">
                    {link.clicks.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-medium text-green-600">
                    {link.conversions.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-medium">
                    {link.totalEarnings.toLocaleString()}원
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`px-2 py-1 text-xs rounded ${statusLabels[link.status].color}`}
                  >
                    {statusLabels[link.status].label}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleCopyLink(link)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="링크 복사"
                    >
                      {copiedId === link.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    <a
                      href={link.fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-gray-100 rounded"
                      title="링크 열기"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-500" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLinks.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? '검색 결과가 없습니다.' : '등록된 링크가 없습니다.'}
          </div>
        )}
      </div>

      {/* Create Link Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">새 링크 생성</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSearchParams({});
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL 슬러그
                </label>
                <input
                  type="text"
                  value={createForm.urlSlug}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, urlSlug: e.target.value })
                  }
                  placeholder="my-product-link"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  링크 유형
                </label>
                <select
                  value={createForm.linkType}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      linkType: e.target.value as CreateLinkForm['linkType'],
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="product">상품</option>
                  <option value="routine">루틴</option>
                  <option value="promotion">프로모션</option>
                  <option value="general">일반</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  대상 ID (선택)
                </label>
                <input
                  type="text"
                  value={createForm.targetId || ''}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, targetId: e.target.value })
                  }
                  placeholder="상품 또는 루틴 ID"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSearchParams({});
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleCreateLink}
                disabled={!createForm.urlSlug}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50"
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CosmeticsPartnerLinks;
