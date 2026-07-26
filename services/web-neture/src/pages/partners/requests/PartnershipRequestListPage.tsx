/**
 * PartnershipRequestListPage - 파트너 모집 제품 목록
 *
 * WO-O4O-PARTNER-RECRUITMENT-API-IMPLEMENTATION-V1
 *
 * 제품별 파트너 프로그램 목록을 테이블로 표시.
 * 파트너 신청 -> 매장 대시보드에 표시 -> 승인 시 파트너 대시보드에 등록
 */

import { useState, useEffect, useCallback } from 'react';
import { DataTable, type ListColumnDef } from '@o4o/operator-ux-core';
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
  const [apiError, setApiError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'recruiting' | 'closed'>('all');
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    try {
      const data = await partnerRecruitmentApi.getRecruitments();
      setProducts(data);
    } catch {
      setApiError(true);
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

  // WO-O4O-NETURE-APPROVAL-AND-OPERATION-LISTS-STANDARDIZATION-BATCH-V3:
  //   raw <table> → 표준 DataTable 컬럼. 표시 내용 동일.
  //   신청 액션은 단일 주 CTA 라 RowActionMenu 로 감추지 않고 인라인 유지(상태 3분기 보존).
  const columns: ListColumnDef<PartnerRecruitment>[] = [
    {
      key: 'imageUrl',
      header: '이미지',
      width: '64px',
      render: (_v, product) => (
        <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.productName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-400 text-xs">IMG</span>
          )}
        </div>
      ),
    },
    {
      key: 'productName',
      header: '제품명',
      minWidth: 160,
      render: (_v, product) => <span className="font-medium text-gray-900">{product.productName}</span>,
    },
    { key: 'manufacturer', header: '제조사', width: '120px', render: (_v, product) => product.manufacturer },
    {
      key: 'consumerPrice',
      header: '소비자가',
      width: '110px',
      align: 'right',
      render: (_v, product) => (
        <span className="text-gray-900 font-medium tabular-nums">{formatPrice(product.consumerPrice)}</span>
      ),
    },
    {
      key: 'commissionRate',
      header: '수수료',
      width: '90px',
      align: 'center',
      render: (_v, product) => (
        <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded">
          {product.commissionRate}%
        </span>
      ),
    },
    { key: 'sellerName', header: '요청 업체', width: '130px', render: (_v, product) => product.sellerName },
    {
      key: 'serviceName',
      header: '서비스명',
      width: '120px',
      render: (_v, product) => (
        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
          {product.serviceName}
        </span>
      ),
    },
    {
      key: 'shopUrl',
      header: '몰 URL',
      width: '110px',
      render: (_v, product) =>
        product.shopUrl ? (
          <a
            href={product.shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-xs"
          >
            바로가기 <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        ),
    },
    {
      key: '_apply',
      header: '신청',
      width: '112px',
      align: 'center',
      system: true,
      render: (_v, product) =>
        product.status === 'closed' ? (
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
        ),
    },
  ];

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
      ) : apiError ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-red-500 text-lg mb-2">데이터를 불러올 수 없습니다</p>
          <p className="text-gray-400 text-sm mb-4">서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg">자료가 없습니다</p>
          <p className="text-gray-400 text-sm mt-1">현재 모집 중인 제품이 없습니다.</p>
        </div>
      ) : (
        /* WO-…-BATCH-V3: raw <table> → 표준 DataTable.
           행 액션이 단일 주 CTA("파트너 신청")이므로 RowActionMenu 로 감추지 않고
           인라인 버튼을 유지한다(주 동선 접근성 우선). */
        <DataTable<PartnerRecruitment>
          columns={columns}
          data={filtered}
          rowKey={(p) => p.id}
          loading={false}
          emptyMessage="해당하는 제품이 없습니다"
        />
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
