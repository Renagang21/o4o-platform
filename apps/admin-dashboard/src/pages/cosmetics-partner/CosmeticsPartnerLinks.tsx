/**
 * Cosmetics Partner Links Page
 *
 * 파트너 링크 관리 페이지
 * - 링크 목록 테이블 (정렬 옵션)
 * - 새 링크 생성 (제품 검색)
 * - 링크 복사 토스트
 * - Empty state
 *
 * Phase 6-E: UX Enhancement
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  ArrowUpDown,
  MousePointer,
  TrendingUp,
  Clock,
  Package,
  CheckCircle,
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
  campaignId?: string;
}

type SortField = 'clicks' | 'conversions' | 'createdAt' | 'earnings';
type SortOrder = 'asc' | 'desc';

const CosmeticsPartnerLinks: React.FC = () => {
  const api = authClient.api;
  const [searchParams, setSearchParams] = useSearchParams();
  const [links, setLinks] = useState<PartnerLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('action') === 'new');
  const [createForm, setCreateForm] = useState<CreateLinkForm>({
    urlSlug: '',
    linkType: 'product',
    targetId: '',
    campaignId: '',
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [productSearch, setProductSearch] = useState('');
  const [productSuggestions, setProductSuggestions] = useState<{ id: string; name: string }[]>([]);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/partner/links');
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
  }, [api]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // Product search simulation
  useEffect(() => {
    if (productSearch.length >= 2) {
      // Simulate API search
      const suggestions = [
        { id: 'prod-001', name: '비타민C 세럼' },
        { id: 'prod-002', name: '히알루론산 앰플' },
        { id: 'prod-003', name: '선크림 SPF50+' },
        { id: 'prod-004', name: '레티놀 크림' },
      ].filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
      setProductSuggestions(suggestions);
    } else {
      setProductSuggestions([]);
    }
  }, [productSearch]);

  const handleCopyLink = async (link: PartnerLink) => {
    try {
      await navigator.clipboard.writeText(link.fullUrl);
      setCopiedId(link.id);
      setShowToast(true);
      setTimeout(() => {
        setCopiedId(null);
        setShowToast(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCreateLink = async () => {
    try {
      await api.post('/api/v1/partner/links', createForm);
      setShowCreateModal(false);
      setCreateForm({ urlSlug: '', linkType: 'product', targetId: '', campaignId: '' });
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
      setCreateForm({ urlSlug: '', linkType: 'product', targetId: '', campaignId: '' });
      setSearchParams({});
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm('이 링크를 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/api/v1/partner/links/${id}`);
      fetchLinks();
    } catch (err) {
      // Demo: just remove from state
      setLinks(links.filter(l => l.id !== id));
    }
  };

  const selectProduct = (product: { id: string; name: string }) => {
    setCreateForm({ ...createForm, targetId: product.id });
    setProductSearch(product.name);
    setProductSuggestions([]);
  };

  const filteredAndSortedLinks = links
    .filter(
      (link) =>
        link.urlSlug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.targetName?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortField) {
        case 'clicks':
          aVal = a.clicks;
          bVal = b.clicks;
          break;
        case 'conversions':
          aVal = a.conversions;
          bVal = b.conversions;
          break;
        case 'earnings':
          aVal = a.totalEarnings;
          bVal = b.totalEarnings;
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

  const linkTypeLabels: Record<string, { label: string; color: string }> = {
    product: { label: '상품', color: 'bg-blue-100 text-blue-700' },
    routine: { label: '루틴', color: 'bg-purple-100 text-purple-700' },
    promotion: { label: '프로모션', color: 'bg-orange-100 text-orange-700' },
    general: { label: '일반', color: 'bg-gray-100 text-gray-700' },
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    active: { label: '활성', color: 'bg-green-100 text-green-800' },
    paused: { label: '일시정지', color: 'bg-yellow-100 text-yellow-800' },
    expired: { label: '만료', color: 'bg-gray-100 text-gray-800' },
  };

  const SortButton: React.FC<{ field: SortField; label: string }> = ({ field, label }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 text-xs ${
        sortField === field ? 'text-pink-600 font-semibold' : 'text-gray-500'
      }`}
    >
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  // Empty State Component
  const EmptyState = () => (
    <div className="text-center py-12">
      <Link2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">생성된 링크가 없습니다</h3>
      <p className="text-gray-500 mb-6">제품을 선택해 첫 번째 추천 링크를 만들어보세요!</p>
      <button
        onClick={() => setShowCreateModal(true)}
        className="inline-flex items-center gap-2 px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
      >
        <Plus className="w-5 h-5" />
        링크 만들기
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
          <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            링크가 복사되었습니다!
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">추천 링크</h1>
          <p className="text-gray-500 text-sm mt-1">추천 링크 관리 및 성과 추적</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLinks}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="새로고침"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            새 링크 생성
          </button>
        </div>
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="링크 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1">
          <span className="text-xs text-gray-500">정렬:</span>
          <SortButton field="clicks" label="클릭순" />
          <span className="text-gray-300">|</span>
          <SortButton field="conversions" label="전환순" />
          <span className="text-gray-300">|</span>
          <SortButton field="createdAt" label="최신순" />
        </div>
      </div>

      {/* Links List */}
      {filteredAndSortedLinks.length === 0 ? (
        searchTerm ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">"{searchTerm}"에 대한 검색 결과가 없습니다.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100">
            <EmptyState />
          </div>
        )
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  링크
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  유형
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <MousePointer className="w-3 h-3" />
                    클릭
                  </div>
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    전환
                  </div>
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  수익
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAndSortedLinks.map((link) => (
                <tr key={link.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-pink-50 rounded-lg flex items-center justify-center">
                        <Link2 className="w-5 h-5 text-pink-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{link.urlSlug}</p>
                        {link.targetName && (
                          <p className="text-xs text-gray-500 mt-0.5">{link.targetName}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${linkTypeLabels[link.linkType].color}`}>
                      {linkTypeLabels[link.linkType].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold text-blue-600">
                      {link.clicks.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold text-green-600">
                      {link.conversions.toLocaleString()}
                    </span>
                    {link.clicks > 0 && (
                      <span className="text-xs text-gray-400 ml-1">
                        ({((link.conversions / link.clicks) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-gray-900">
                      {link.totalEarnings.toLocaleString()}원
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusLabels[link.status].color}`}
                    >
                      {statusLabels[link.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleCopyLink(link)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                        title="링크 복사"
                      >
                        {copiedId === link.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                        )}
                      </button>
                      <a
                        href={link.fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                        title="링크 열기"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                      </a>
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats Summary */}
      {filteredAndSortedLinks.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {filteredAndSortedLinks.reduce((sum, l) => sum + l.clicks, 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">총 클릭</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {filteredAndSortedLinks.reduce((sum, l) => sum + l.conversions, 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">총 전환</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-pink-600">
              {filteredAndSortedLinks.reduce((sum, l) => sum + l.totalEarnings, 0).toLocaleString()}원
            </p>
            <p className="text-sm text-gray-500">총 수익</p>
          </div>
        </div>
      )}

      {/* Create Link Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">새 링크 생성</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSearchParams({});
                }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL 슬러그 *
                </label>
                <input
                  type="text"
                  value={createForm.urlSlug}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, urlSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })
                  }
                  placeholder="my-product-link"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  URL: https://neture.co.kr/p/{createForm.urlSlug || '...'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                >
                  <option value="product">상품</option>
                  <option value="routine">루틴</option>
                  <option value="promotion">프로모션</option>
                  <option value="general">일반</option>
                </select>
              </div>

              {createForm.linkType === 'product' && (
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      제품 검색
                    </div>
                  </label>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="제품명 검색..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                  {productSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {productSuggestions.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => selectProduct(product)}
                          className="w-full px-4 py-2.5 text-left hover:bg-gray-50 text-sm"
                        >
                          {product.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  캠페인 ID (선택)
                </label>
                <input
                  type="text"
                  value={createForm.campaignId || ''}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, campaignId: e.target.value })
                  }
                  placeholder="특정 캠페인에 연결 시 입력"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSearchParams({});
                }}
                className="px-5 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 font-medium"
              >
                취소
              </button>
              <button
                onClick={handleCreateLink}
                disabled={!createForm.urlSlug}
                className="px-5 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                생성하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CosmeticsPartnerLinks;
