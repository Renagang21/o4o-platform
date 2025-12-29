/**
 * SellerOps Settlement Dashboard
 *
 * Refactored: PageHeader + DataTable pattern applied
 */

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Calendar,
  Download,
  Eye,
} from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import { DataTable, Column } from '../../../components/common/DataTable';

interface SettlementBatch {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  totalAmount: number;
  commissionAmount: number;
  netAmount: number;
  status: 'open' | 'closed' | 'paid';
  transactionCount: number;
}

const SettlementDashboard: React.FC = () => {
  const [summary, setSummary] = useState({
    totalSettled: 12500000,
    pendingSettlement: 2340000,
    currentPeriodSales: 4560000,
    currentPeriodCommission: 456000,
  });
  const [batches, setBatches] = useState<SettlementBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Demo data
    setTimeout(() => {
      setBatches([
        {
          id: '1',
          periodStart: new Date(2024, 11, 1),
          periodEnd: new Date(2024, 11, 31),
          totalAmount: 4560000,
          commissionAmount: 456000,
          netAmount: 4104000,
          status: 'open',
          transactionCount: 45,
        },
        {
          id: '2',
          periodStart: new Date(2024, 10, 1),
          periodEnd: new Date(2024, 10, 30),
          totalAmount: 3890000,
          commissionAmount: 389000,
          netAmount: 3501000,
          status: 'closed',
          transactionCount: 38,
        },
        {
          id: '3',
          periodStart: new Date(2024, 9, 1),
          periodEnd: new Date(2024, 9, 31),
          totalAmount: 4120000,
          commissionAmount: 412000,
          netAmount: 3708000,
          status: 'paid',
          transactionCount: 42,
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3" />
            진행중
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            <Calendar className="w-3 h-3" />
            마감
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            지급완료
          </span>
        );
      default:
        return null;
    }
  };

  // DataTable column definitions
  const columns: Column<SettlementBatch>[] = [
    {
      key: 'period',
      title: '정산 기간',
      render: (_: unknown, record: SettlementBatch) => (
        <div>
          <p className="font-medium">
            {record.periodStart.toLocaleDateString()} ~{' '}
            {record.periodEnd.toLocaleDateString()}
          </p>
          <p className="text-sm text-gray-500">
            거래 {record.transactionCount}건
          </p>
        </div>
      ),
    },
    {
      key: 'totalAmount',
      title: '매출',
      dataIndex: 'totalAmount',
      align: 'right',
      sortable: true,
      render: (value: number) => (
        <span>{value.toLocaleString()}원</span>
      ),
    },
    {
      key: 'commissionAmount',
      title: '수수료',
      dataIndex: 'commissionAmount',
      align: 'right',
      sortable: true,
      render: (value: number) => (
        <span className="text-orange-600">{value.toLocaleString()}원</span>
      ),
    },
    {
      key: 'netAmount',
      title: '정산액',
      dataIndex: 'netAmount',
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
      key: 'actions',
      title: '상세',
      align: 'center',
      render: (_: unknown, record: SettlementBatch) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            console.log('View settlement:', record.id);
          }}
          className="text-blue-600 hover:text-blue-900 p-1"
          title="상세 보기"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  // PageHeader actions
  const headerActions = [
    {
      id: 'download',
      label: '내역 다운로드',
      icon: <Download className="w-4 h-4" />,
      onClick: () => {
        console.log('Download settlement history');
      },
      variant: 'secondary' as const,
    },
  ];

  return (
    <div className="p-6">
      {/* PageHeader */}
      <PageHeader
        title="정산 관리"
        subtitle="정산 현황 및 수수료 내역"
        actions={headerActions}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">누적 정산액</p>
              <p className="text-2xl font-bold text-green-600">
                {summary.totalSettled.toLocaleString()}원
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">정산 대기</p>
              <p className="text-2xl font-bold text-blue-600">
                {summary.pendingSettlement.toLocaleString()}원
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">이번 기간 매출</p>
              <p className="text-2xl font-bold">
                {summary.currentPeriodSales.toLocaleString()}원
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">예상 수수료</p>
              <p className="text-2xl font-bold text-orange-600">
                {summary.currentPeriodCommission.toLocaleString()}원
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-orange-600 opacity-50" />
          </div>
        </div>
      </div>

      {/* Settlement Batches DataTable */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable<SettlementBatch>
          columns={columns}
          dataSource={batches}
          rowKey="id"
          loading={loading}
          emptyText="정산 내역이 없습니다"
        />
      </div>
    </div>
  );
};

export default SettlementDashboard;
