/**
 * PartnershipRequestListPage - 제휴 요청 목록 조회
 *
 * Work Order: WO-NETURE-EXTENSION-P1
 *
 * 조회 전용 페이지:
 * - 제휴 요청 목록만 표시
 * - 신청은 각 서비스에서 직접 처리
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { netureApi, type PartnershipRequest } from '../../../lib/api';
import { SimpleTable, type SimpleTableColumn, type SimpleTableRow } from '../../../components/common/SimpleTable';

export default function PartnershipRequestListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'MATCHED' | 'CLOSED'>('ALL');
  const [requests, setRequests] = useState<PartnershipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const data = statusFilter === 'ALL'
          ? await netureApi.getPartnershipRequests()
          : await netureApi.getPartnershipRequests(statusFilter);
        setRequests(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [statusFilter]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Loading partnership requests...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-red-600">Error loading requests: {error}</p>
      </div>
    );
  }

  // SimpleTable 컬럼 정의 (4개 - 축약형)
  const columns: SimpleTableColumn[] = [
    { id: 'seller', label: '판매자', width: '30%' },
    { id: 'products', label: '제품 / 기간', width: '25%' },
    { id: 'revenue', label: '수익 구조', width: '25%' },
    { id: 'status', label: '상태', width: '20%', align: 'center' },
  ];

  // SimpleTable 행 데이터 변환
  const tableRows: SimpleTableRow[] = requests.map((request) => {
    const statusConfig = {
      OPEN: { label: '모집 중', color: '#16a34a', bg: '#dcfce7' },
      MATCHED: { label: '매칭 완료', color: '#2563eb', bg: '#dbeafe' },
      CLOSED: { label: '종료', color: '#64748b', bg: '#f1f5f9' },
    }[request.status];

    return {
      id: request.id,
      data: {
        seller: (
          <div>
            <div className="font-medium text-gray-900 mb-1">{request.seller.name}</div>
            <span
              className="inline-block px-3 py-1 text-xs rounded-full"
              style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}
            >
              {request.seller.serviceType}
            </span>
          </div>
        ),
        products: (
          <div>
            <div className="text-sm text-gray-800 mb-1">
              제품 {request.productCount}개
            </div>
            <div className="text-xs text-gray-600">
              {request.period.start} ~ {request.period.end}
            </div>
          </div>
        ),
        revenue: (
          <div className="text-sm text-gray-700">{request.revenueStructure}</div>
        ),
        status: (
          <span
            className="inline-block px-3 py-1 text-xs rounded-full font-medium"
            style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
          >
            {statusConfig.label}
          </span>
        ),
      },
      actions: (
        <button
          onClick={() => navigate(`/partners/requests/${request.id}`)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          조건 보기
        </button>
      ),
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">제휴 파트너를 찾는 판매자</h1>
        <p className="text-lg text-gray-600 mb-4">
          단일 판매자와 기간 제휴 형태로 진행됩니다
        </p>
        {/* 안내 메시지 */}
        <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <Info className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-slate-700">
              <strong>조회 전용:</strong> 제휴 신청은 각 서비스에서 직접 진행해 주세요.
            </p>
            <Link
              to="/partners/apply"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-1 inline-block"
            >
              참여 안내 페이지 →
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 flex gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">상태</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'OPEN' | 'MATCHED' | 'CLOSED')}
            className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="ALL">전체</option>
            <option value="OPEN">모집 중</option>
            <option value="MATCHED">매칭 완료</option>
            <option value="CLOSED">종료</option>
          </select>
        </div>
      </div>

      {/* Request List - SimpleTable */}
      <SimpleTable
        columns={columns}
        rows={tableRows}
        loading={loading}
        emptyMessage="해당하는 제휴 요청이 없습니다"
      />
    </div>
  );
}
