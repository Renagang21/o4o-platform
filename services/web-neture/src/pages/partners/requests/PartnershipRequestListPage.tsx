import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { netureApi, type PartnershipRequest } from '../../../lib/api';

export default function PartnershipRequestListPage() {
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">제휴 파트너를 찾는 판매자</h1>
        <p className="text-lg text-gray-600">
          단일 판매자와 기간 제휴 형태로 진행됩니다
        </p>
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

      {/* Request Cards */}
      {requests.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-600">해당하는 제휴 요청이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((request) => (
            <Link
              key={request.id}
              to={`/partners/requests/${request.id}`}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-primary-300 transition-all"
            >
              {/* Header with Status */}
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {request.seller.name}
                </h3>
                <span className={`px-3 py-1 text-xs rounded-full ${
                  request.status === 'OPEN'
                    ? 'bg-green-100 text-green-700'
                    : request.status === 'MATCHED'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {request.status === 'OPEN' ? '모집 중' : request.status === 'MATCHED' ? '매칭 완료' : '종료'}
                </span>
              </div>

              {/* Service Type Badge */}
              <div className="mb-4">
                <span className="inline-block px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-full">
                  {request.seller.serviceType}
                </span>
              </div>

              {/* Info */}
              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">제품 수:</span> {request.productCount}개
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">기간:</span> {request.period.start} ~ {request.period.end}
                </p>
              </div>

              {/* Revenue Structure */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-700 font-medium mb-2">수익 구조</p>
                <p className="text-sm text-gray-600">{request.revenueStructure}</p>
              </div>

              {/* CTA */}
              <div className="mt-4">
                <span className="inline-flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium">
                  조건 보기
                  <ArrowRight className="ml-1 w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
