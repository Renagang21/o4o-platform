/**
 * PartnershipRequestListPage - 파트너 모집 제품 목록
 *
 * WO-O4O-PARTNER-RECRUITMENT-API-IMPLEMENTATION-V1
 *
 * 제품별 파트너 프로그램 목록을 테이블로 표시.
 * 파트너 신청 -> 매장 대시보드에 표시 -> 승인 시 파트너 대시보드에 등록
 */

import { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Search, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../contexts';
import { partnerRecruitmentApi, type PartnerRecruitment } from '../../../lib/api';

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원';
}

export default function PartnershipRequestListPage() {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<PartnerRecruitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'recruiting' | 'closed'>('all');
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await partnerRecruitmentApi.getRecruitments();
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filtered = products.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.serviceName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApply = async (recruitmentId: string) => {
    if (!isAuthenticated) {
      showToast('로그인이 필요합니다.');
      return;
    }

    setApplyingId(recruitmentId);
    try {
      const result = await partnerRecruitmentApi.apply(recruitmentId);
      if (result.success) {
        setAppliedIds((prev) => new Set(prev).add(recruitmentId));
        showToast('파트너 신청이 완료되었습니다.');
      } else if (result.error === 'DUPLICATE_APPLICATION') {
        setAppliedIds((prev) => new Set(prev).add(recruitmentId));
        showToast('이미 신청한 모집입니다.');
      } else {
        showToast('신청에 실패했습니다. 다시 시도해 주세요.');
      }
    } catch {
      showToast('신청에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">파트너 모집 제품</h1>
          <p className="text-gray-600 text-sm">
            제품별 파트너 프로그램에 참여하세요. 신청 후 매장에서 승인하면 파트너로 등록됩니다.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="제품명, 제조사, 업체명 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'recruiting' | 'closed')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="all">전체 상태</option>
          <option value="recruiting">모집 중</option>
          <option value="closed">마감</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500">로딩 중...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg">자료가 없습니다</p>
          <p className="text-gray-400 text-sm mt-1">현재 모집 중인 제품이 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-16">이미지</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">제품명</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">제조사</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">소비자가</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">수수료</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">요청 업체</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">서비스명</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">몰 URL</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 w-28">신청</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-500">
                      해당하는 제품이 없습니다
                    </td>
                  </tr>
                ) : (
                  filtered.map((product) => (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.productName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-400 text-xs">IMG</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{product.productName}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{product.manufacturer}</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium tabular-nums">
                        {formatPrice(product.consumerPrice)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded">
                          {product.commissionRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{product.sellerName}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                          {product.serviceName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {product.shopUrl ? (
                          <a
                            href={product.shopUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                          >
                            방문
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {product.status === 'closed' ? (
                          <span className="text-xs text-gray-400">마감</span>
                        ) : appliedIds.has(product.id) ? (
                          <span className="text-xs text-green-600 font-medium">신청 완료</span>
                        ) : (
                          <button
                            onClick={() => handleApply(product.id)}
                            disabled={applyingId === product.id}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                              applyingId === product.id
                                ? 'bg-primary-300 text-white cursor-wait'
                                : 'bg-primary-600 text-white hover:bg-primary-700'
                            }`}
                          >
                            {applyingId === product.id ? '신청 중...' : '파트너 신청'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer info */}
      <p className="mt-4 text-xs text-gray-400">
        총 {filtered.length}개 제품 | 파트너 신청 후 매장 대시보드에서 승인 시 파트너 대시보드에 등록됩니다.
      </p>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg text-sm font-medium">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
