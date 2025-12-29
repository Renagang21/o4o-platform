/**
 * PartnerOps Conversions Page
 *
 * Conversion analytics:
 * - Conversion list with status
 * - Funnel analysis
 * - Period-based filtering
 *
 * Refactored: PageHeader + DataTable pattern applied
 */

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import {
  TrendingUp,
  Filter,
  Download,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  Settings,
} from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import { DataTable, Column } from '../../../components/common/DataTable';

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

  // DataTable column definitions
  const columns: Column<Conversion>[] = [
    {
      key: 'orderNumber',
      title: '주문번호',
      render: (_: unknown, record: Conversion) => (
        <span className="font-medium">{record.orderNumber || record.orderId}</span>
      ),
    },
    {
      key: 'orderAmount',
      title: '주문금액',
      dataIndex: 'orderAmount',
      align: 'right',
      sortable: true,
      render: (value: number) => (
        <span>{value.toLocaleString()}원</span>
      ),
    },
    {
      key: 'commissionAmount',
      title: '커미션',
      dataIndex: 'commissionAmount',
      align: 'right',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium text-blue-600">{value.toLocaleString()}원</span>
      ),
    },
    {
      key: 'status',
      title: '상태',
      dataIndex: 'status',
      align: 'center',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'createdAt',
      title: '생성일',
      dataIndex: 'createdAt',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-gray-600">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'confirmedAt',
      title: '확정일',
      dataIndex: 'confirmedAt',
      render: (value: string | undefined) => (
        <span className="text-sm text-gray-600">
          {value ? new Date(value).toLocaleDateString() : '-'}
        </span>
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
        // TODO: Implement screen options
      },
      variant: 'secondary' as const,
    },
    {
      id: 'export',
      label: '내보내기',
      icon: <Download className="w-4 h-4" />,
      onClick: () => {
        // TODO: Implement export
      },
      variant: 'secondary' as const,
    },
  ];

  return (
    <div className="p-6">
      {/* PageHeader */}
      <PageHeader
        title="전환 분석"
        subtitle="파트너 링크를 통한 전환 내역을 확인합니다"
        actions={headerActions}
      />

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

      {/* Conversions DataTable */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable<Conversion>
          columns={columns}
          dataSource={conversions}
          rowKey="id"
          loading={loading}
          emptyText="전환 내역이 없습니다."
        />
      </div>
    </div>
  );
};

export default Conversions;
