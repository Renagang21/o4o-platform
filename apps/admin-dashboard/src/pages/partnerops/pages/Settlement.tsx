/**
 * PartnerOps Settlement Page
 *
 * WO-O4O-TABLE-DATATABLE-DEPRECATION-V1B — BaseTable 직접 사용으로 마이그레이션
 */

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import { DollarSign, Calendar, Download, CheckCircle, Clock, FileText, CreditCard } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';

interface SettlementBatch {
  id: string;
  batchNumber: string;
  periodStart: string;
  periodEnd: string;
  conversionCount: number;
  totalCommissionAmount: number;
  deductionAmount: number;
  netAmount: number;
  status: 'open' | 'closed' | 'processing' | 'paid' | 'failed';
  paymentDueDate?: string;
  paidAt?: string;
  createdAt: string;
}

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

      if (batchesResponse.data?.data) setBatches(batchesResponse.data.data);
      if (summaryResponse.data?.data) setSummary(summaryResponse.data.data);
    } catch (err) {
      console.error('Failed to fetch settlements:', err);
      // Demo data
      setBatches([
        { id: '1', batchNumber: 'SET-2024-001', periodStart: '2024-01-01', periodEnd: '2024-01-31', conversionCount: 45, totalCommissionAmount: 250000, deductionAmount: 16000, netAmount: 234000, status: 'paid', paidAt: '2024-02-15', createdAt: '2024-02-01' },
        { id: '2', batchNumber: 'SET-2024-002', periodStart: '2024-02-01', periodEnd: '2024-02-29', conversionCount: 52, totalCommissionAmount: 330000, deductionAmount: 18000, netAmount: 312000, status: 'paid', paidAt: '2024-03-15', createdAt: '2024-03-01' },
        { id: '3', batchNumber: 'SET-2024-003', periodStart: '2024-03-01', periodEnd: '2024-03-31', conversionCount: 48, totalCommissionAmount: 295000, deductionAmount: 17000, netAmount: 278000, status: 'processing', paymentDueDate: '2024-04-15', createdAt: '2024-04-01' },
        { id: '4', batchNumber: 'SET-2024-004', periodStart: '2024-04-01', periodEnd: '2024-04-30', conversionCount: 23, totalCommissionAmount: 170000, deductionAmount: 14000, netAmount: 156000, status: 'open', createdAt: '2024-05-01' },
      ]);
      setSummary({ totalEarnings: 1742000, settledEarnings: 546000, pendingEarnings: 434000, processingAmount: 278000, lastPaymentDate: '2024-03-15', nextPaymentDate: '2024-05-15', totalBatches: 4, openBatches: 1, paidBatches: 2 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettlements(); }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs"><CheckCircle className="w-3 h-3" />지급완료</span>;
      case 'processing':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"><Clock className="w-3 h-3" />처리중</span>;
      case 'closed':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs"><CheckCircle className="w-3 h-3" />마감됨</span>;
      case 'open':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs"><Clock className="w-3 h-3" />진행중</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs"><Clock className="w-3 h-3" />실패</span>;
      default:
        return null;
    }
  };

  const columns: O4OColumn<SettlementBatch>[] = [
    {
      key: 'batchNumber',
      header: '정산번호',
      render: (_, row) => <span className="font-medium">{row.batchNumber}</span>,
    },
    {
      key: 'period',
      header: '정산기간',
      render: (_, row) => (
        <span className="text-sm text-gray-600">
          {new Date(row.periodStart).toLocaleDateString()} ~ {new Date(row.periodEnd).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'conversionCount',
      header: '전환수',
      align: 'center',
      sortable: true,
      sortAccessor: (row) => row.conversionCount,
      render: (_, row) => <span>{row.conversionCount}</span>,
    },
    {
      key: 'netAmount',
      header: '정산금액',
      align: 'right',
      sortable: true,
      sortAccessor: (row) => row.netAmount,
      render: (_, row) => <span className="font-medium">{row.netAmount.toLocaleString()}원</span>,
    },
    {
      key: 'status',
      header: '상태',
      align: 'center',
      render: (_, row) => getStatusBadge(row.status),
    },
    {
      key: 'paidAt',
      header: '지급일',
      align: 'center',
      render: (_, row) => <span className="text-sm text-gray-600">{row.paidAt ? new Date(row.paidAt).toLocaleDateString() : '-'}</span>,
    },
    {
      key: '_actions',
      header: '영수증',
      width: 56,
      system: true,
      align: 'center',
      render: (_, row) => row.status === 'paid' ? (
        <button
          onClick={() => {}}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded"
          title="영수증 다운로드"
        >
          <Download className="w-4 h-4" />
        </button>
      ) : null,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="정산 관리"
        subtitle="커미션 정산 내역을 확인합니다"
        actions={[
          { id: 'download-all', label: '전체 다운로드', icon: <Download className="w-4 h-4" />, onClick: () => {}, variant: 'secondary' as const },
        ]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <div><p className="text-sm text-gray-600">총 지급액</p><p className="text-xl font-bold text-green-600">{summary?.settledEarnings.toLocaleString()}원</p></div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div><p className="text-sm text-gray-600">정산 예정</p><p className="text-xl font-bold text-orange-600">{summary?.pendingEarnings.toLocaleString()}원</p></div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">다음 정산일</p>
              <p className="text-xl font-bold">{summary?.nextPaymentDate ? new Date(summary.nextPaymentDate).toLocaleDateString() : '-'}</p>
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
              <p className="text-xl font-bold">{summary?.processingAmount.toLocaleString()}원</p>
              <p className="text-xs text-gray-500">{summary?.lastPaymentDate ? `최근 지급: ${new Date(summary.lastPaymentDate).toLocaleDateString()}` : ''}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Settlement Batches Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="animate-pulse p-4 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}
          </div>
        ) : (
          <BaseTable<SettlementBatch>
            columns={columns}
            data={batches}
            rowKey={(row) => row.id}
            emptyMessage="정산 내역이 없습니다"
            tableId="partnerops-settlement"
            columnVisibility
            persistState
          />
        )}
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
            <a href="/partnerops/profile" className="text-blue-600 hover:underline">프로필 설정</a>
            에서 가능합니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settlement;
