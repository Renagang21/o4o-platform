/**
 * PartnerOps Conversions Page
 *
 * Conversion analytics:
 * - Conversion list with status
 * - Funnel analysis
 * - Period-based filtering
 */

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import {
  TrendingUp,
  TrendingDown,
  Filter,
  Download,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';

/**
 * Conversion Item (Partner-Core aligned)
 * Maps to ConversionListItemDto from @o4o/partnerops
 */
interface Conversion {
  id: string;
  partnerId: string;
  orderId: string;
  orderNumber?: string;
  productType?: string;
  orderAmount: number;
  commissionAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';  // Partner-Core statuses
  attributionDays?: number;
  createdAt: string;
  confirmedAt?: string;
}

/**
 * Conversion Summary
 */
interface ConversionSummary {
  totalConversions: number;
  totalAmount: number;
  totalCommission: number;
  pendingCount: number;
  confirmedCount: number;
  cancelledCount: number;
  refundedCount: number;
}

const Conversions: React.FC = () => {
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [summary, setSummary] = useState<ConversionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });

  const fetchConversions = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filter !== 'all') params.status = filter;
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;

      const [convResponse, summaryResponse] = await Promise.all([
        authClient.api.get('/partnerops/conversions', { params }),
        authClient.api.get('/partnerops/conversions/summary'),
      ]);

      if (convResponse.data?.data) {
        setConversions(convResponse.data.data);
      }
      if (summaryResponse.data?.data) {
        setSummary(summaryResponse.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch conversions:', err);
      // Demo data
      setConversions([
        {
          id: '1',
          partnerId: 'demo-partner',
          orderId: 'ORD-2024-001',
          orderNumber: 'ORD-2024-001',
          orderAmount: 89000,
          commissionAmount: 4450,
          status: 'confirmed',
          attributionDays: 7,
          createdAt: new Date().toISOString(),
          confirmedAt: new Date().toISOString(),
        },
        {
          id: '2',
          partnerId: 'demo-partner',
          orderId: 'ORD-2024-002',
          orderNumber: 'ORD-2024-002',
          orderAmount: 156000,
          commissionAmount: 7800,
          status: 'confirmed',
          attributionDays: 7,
          createdAt: new Date().toISOString(),
          confirmedAt: new Date().toISOString(),
        },
        {
          id: '3',
          partnerId: 'demo-partner',
          orderId: 'ORD-2024-003',
          orderNumber: 'ORD-2024-003',
          orderAmount: 45000,
          commissionAmount: 2250,
          status: 'pending',
          attributionDays: 7,
          createdAt: new Date().toISOString(),
        },
        {
          id: '4',
          partnerId: 'demo-partner',
          orderId: 'ORD-2024-004',
          orderNumber: 'ORD-2024-004',
          orderAmount: 234000,
          commissionAmount: 11700,
          status: 'confirmed',
          attributionDays: 7,
          createdAt: new Date().toISOString(),
          confirmedAt: new Date().toISOString(),
        },
        {
          id: '5',
          partnerId: 'demo-partner',
          orderId: 'ORD-2024-005',
          orderNumber: 'ORD-2024-005',
          orderAmount: 67000,
          commissionAmount: 3350,
          status: 'cancelled',
          attributionDays: 7,
          createdAt: new Date().toISOString(),
        },
      ]);
      setSummary({
        totalConversions: 342,
        totalAmount: 15420000,
        totalCommission: 771000,
        pendingCount: 23,
        confirmedCount: 312,
        cancelledCount: 5,
        refundedCount: 2,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversions();
  }, [filter, dateRange]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
            <CheckCircle className="w-3 h-3" /> 확정
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
            <Clock className="w-3 h-3" /> 대기중
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
            <XCircle className="w-3 h-3" /> 취소됨
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
            <XCircle className="w-3 h-3" /> 환불됨
          </span>
        );
      default:
        return null;
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
          <h1 className="text-2xl font-bold mb-2">전환 분석</h1>
          <p className="text-gray-600">파트너 링크를 통한 전환 내역을 확인합니다</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
          <Download className="w-4 h-4" />
          내보내기
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 전환</p>
              <p className="text-2xl font-bold">{summary?.totalConversions}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 주문금액</p>
              <p className="text-2xl font-bold">
                {summary?.totalAmount.toLocaleString()}원
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">누적 커미션</p>
              <p className="text-2xl font-bold text-blue-600">
                {summary?.totalCommission.toLocaleString()}원
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">대기중</span>
              <span className="font-medium text-yellow-600">{summary?.pendingCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">확정</span>
              <span className="font-medium text-green-600">{summary?.confirmedCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">취소됨</span>
              <span className="font-medium text-red-600">{summary?.cancelledCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">환불됨</span>
              <span className="font-medium text-gray-600">{summary?.refundedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="all">모든 상태</option>
              <option value="pending">대기중</option>
              <option value="confirmed">확정</option>
              <option value="cancelled">취소됨</option>
              <option value="refunded">환불됨</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-600" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
            <span className="text-gray-600">~</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Conversions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">주문번호</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">주문금액</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">커미션</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">상태</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">생성일</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">확정일</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {conversions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  전환 내역이 없습니다.
                </td>
              </tr>
            ) : (
              conversions.map((conv) => (
                <tr key={conv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{conv.orderNumber || conv.orderId}</td>
                  <td className="px-4 py-3 text-right">
                    {conv.orderAmount.toLocaleString()}원
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-blue-600">
                    {conv.commissionAmount.toLocaleString()}원
                  </td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(conv.status)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(conv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {conv.confirmedAt ? new Date(conv.confirmedAt).toLocaleDateString() : '-'}
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

export default Conversions;
