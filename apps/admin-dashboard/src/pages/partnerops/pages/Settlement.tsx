/**
 * PartnerOps Settlement Page
 *
 * Commission settlement management:
 * - Settlement batches
 * - Pending/paid status
 * - Transaction history
 *
 * Refactored: PageHeader + DataTable pattern applied
 */

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import {
  DollarSign,
  Calendar,
  Download,
  CheckCircle,
  Clock,
  FileText,
  CreditCard,
} from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import { DataTable, Column } from '../../../components/common/DataTable';

/**
 * Settlement Batch Item (Partner-Core aligned)
 * Maps to SettlementBatchItemDto from @o4o/partnerops
 */
interface SettlementBatch {
  id: string;
  batchNumber: string;
  periodStart: string;
  periodEnd: string;
  conversionCount: number;
  totalCommissionAmount: number;
  deductionAmount: number;
  netAmount: number;
  status: 'open' | 'closed' | 'processing' | 'paid' | 'failed';  // Partner-Core statuses
  paymentDueDate?: string;
  paidAt?: string;
  createdAt: string;
}

/**
 * Settlement Summary (Partner-Core aligned)
 * Maps to SettlementSummaryDto from @o4o/partnerops
 */
interface SettlementSummary {
  totalEarnings: number;
  settledEarnings: number;
  pendingEarnings: number;
  processingAmount: number;
  lastPaymentDate?: string;
  nextPaymentDate?: string;
  totalBatches: number;
  openBatches: number;
  paidBatches: number;
}

const Settlement: React.FC = () => {
  const [batches, setBatches] = useState<SettlementBatch[]>([]);
  const [summary, setSummary] = useState<SettlementSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const [batchesResponse, summaryResponse] = await Promise.all([
        authClient.api.get('/partnerops/settlement/batches'),
        authClient.api.get('/partnerops/settlement/summary'),
      ]);

      if (batchesResponse.data?.data) {
        setBatches(batchesResponse.data.data);
      }
      if (summaryResponse.data?.data) {
        setSummary(summaryResponse.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch settlements:', err);
      // Demo data
      setBatches([
        {
          id: '1',
          batchNumber: 'SET-2024-001',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-31',
          conversionCount: 45,
          totalCommissionAmount: 250000,
          deductionAmount: 16000,
          netAmount: 234000,
          status: 'paid',
          paidAt: '2024-02-15',
          createdAt: '2024-02-01',
        },
        {
          id: '2',
          batchNumber: 'SET-2024-002',
          periodStart: '2024-02-01',
          periodEnd: '2024-02-29',
          conversionCount: 52,
          totalCommissionAmount: 330000,
          deductionAmount: 18000,
          netAmount: 312000,
          status: 'paid',
          paidAt: '2024-03-15',
          createdAt: '2024-03-01',
        },
        {
          id: '3',
          batchNumber: 'SET-2024-003',
          periodStart: '2024-03-01',
          periodEnd: '2024-03-31',
          conversionCount: 48,
          totalCommissionAmount: 295000,
          deductionAmount: 17000,
          netAmount: 278000,
          status: 'processing',
          paymentDueDate: '2024-04-15',
          createdAt: '2024-04-01',
        },
        {
          id: '4',
          batchNumber: 'SET-2024-004',
          periodStart: '2024-04-01',
          periodEnd: '2024-04-30',
          conversionCount: 23,
          totalCommissionAmount: 170000,
          deductionAmount: 14000,
          netAmount: 156000,
          status: 'open',
          createdAt: '2024-05-01',
        },
      ]);
      setSummary({
        totalEarnings: 1742000,
        settledEarnings: 546000,
        pendingEarnings: 434000,
        processingAmount: 278000,
        lastPaymentDate: '2024-03-15',
        nextPaymentDate: '2024-05-15',
        totalBatches: 4,
        openBatches: 1,
        paidBatches: 2,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
            <CheckCircle className="w-3 h-3" /> 지급완료
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
            <Clock className="w-3 h-3" /> 처리중
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
            <CheckCircle className="w-3 h-3" /> 마감됨
          </span>
        );
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
            <Clock className="w-3 h-3" /> 진행중
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
            <Clock className="w-3 h-3" /> 실패
          </span>
        );
      default:
        return null;
    }
  };

  // DataTable column definitions
  const columns: Column<SettlementBatch>[] = [
    {
      key: 'batchNumber',
      title: '정산번호',
      dataIndex: 'batchNumber',
      render: (value: string) => (
        <span className="font-medium">{value}</span>
      ),
    },
    {
      key: 'period',
      title: '정산기간',
      render: (_: unknown, record: SettlementBatch) => (
        <span className="text-sm text-gray-600">
          {new Date(record.periodStart).toLocaleDateString()} ~{' '}
          {new Date(record.periodEnd).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'conversionCount',
      title: '전환수',
      dataIndex: 'conversionCount',
      align: 'center',
      sortable: true,
    },
    {
      key: 'netAmount',
      title: '정산금액',
      dataIndex: 'netAmount',
      align: 'right',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium">{value.toLocaleString()}원</span>
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
      key: 'paidAt',
      title: '지급일',
      dataIndex: 'paidAt',
      align: 'center',
      render: (value: string | undefined) => (
        <span className="text-sm text-gray-600">
          {value ? new Date(value).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '영수증',
      align: 'center',
      render: (_: unknown, record: SettlementBatch) => (
        record.status === 'paid' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('Download receipt:', record.id);
            }}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
            title="영수증 다운로드"
          >
            <Download className="w-4 h-4" />
          </button>
        ) : null
      ),
    },
  ];

  // PageHeader actions
  const headerActions = [
    {
      id: 'download-all',
      label: '전체 다운로드',
      icon: <Download className="w-4 h-4" />,
      onClick: () => {
        console.log('Download all settlements');
      },
      variant: 'secondary' as const,
    },
  ];

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* PageHeader */}
      <PageHeader
        title="정산 관리"
        subtitle="커미션 정산 내역을 확인합니다"
        actions={headerActions}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">총 지급액</p>
              <p className="text-xl font-bold text-green-600">
                {summary?.settledEarnings.toLocaleString()}원
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">정산 예정</p>
              <p className="text-xl font-bold text-orange-600">
                {summary?.pendingEarnings.toLocaleString()}원
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">다음 정산일</p>
              <p className="text-xl font-bold">
                {summary?.nextPaymentDate
                  ? new Date(summary.nextPaymentDate).toLocaleDateString()
                  : '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">처리중</p>
              <p className="text-xl font-bold">
                {summary?.processingAmount.toLocaleString()}원
              </p>
              <p className="text-xs text-gray-500">
                {summary?.lastPaymentDate
                  ? `최근 지급: ${new Date(summary.lastPaymentDate).toLocaleDateString()}`
                  : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settlement Batches DataTable */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable<SettlementBatch>
          columns={columns}
          dataSource={batches}
          rowKey="id"
          loading={false}
          emptyText="정산 내역이 없습니다"
        />
      </div>

      {/* Bank Account Info */}
      <div className="mt-6 bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          정산 계좌 정보
        </h3>
        <div className="text-sm text-gray-600">
          <p>정산금은 매월 15일 등록된 계좌로 입금됩니다.</p>
          <p className="mt-2">
            계좌 정보 변경은{' '}
            <a href="/partnerops/profile" className="text-blue-600 hover:underline">
              프로필 설정
            </a>
            에서 가능합니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settlement;
