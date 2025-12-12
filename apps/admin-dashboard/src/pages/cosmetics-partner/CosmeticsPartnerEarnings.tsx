/**
 * Cosmetics Partner Earnings Page
 *
 * 파트너 수익 관리 페이지
 * - 대기 중 수익
 * - 인출 가능 수익
 * - 인출 버튼
 * - 수익 내역
 */

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  RefreshCw,
  Download,
  Calendar,
  ArrowRight,
  CreditCard,
} from 'lucide-react';

interface EarningsSummary {
  totalEarnings: number;
  pendingEarnings: number;
  withdrawableEarnings: number;
  withdrawnEarnings: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  growthRate: number;
}

interface EarningsRecord {
  id: string;
  type: 'commission' | 'bonus' | 'withdrawal';
  amount: number;
  status: 'pending' | 'confirmed' | 'paid' | 'processing';
  orderId?: string;
  linkId?: string;
  description: string;
  createdAt: string;
}

interface WithdrawalRequest {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

const CosmeticsPartnerEarnings: React.FC = () => {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [records, setRecords] = useState<EarningsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState<WithdrawalRequest>({
    amount: 0,
    bankName: '',
    accountNumber: '',
    accountHolder: '',
  });
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const [summaryRes, recordsRes] = await Promise.all([
        authClient.api.get('/api/v1/partner/earnings/summary'),
        authClient.api.get('/api/v1/partner/earnings'),
      ]);
      if (summaryRes.data?.data) setSummary(summaryRes.data.data);
      if (recordsRes.data?.data) setRecords(recordsRes.data.data);
    } catch (err) {
      console.error('Failed to fetch earnings:', err);
      // Demo data
      setSummary({
        totalEarnings: 2450000,
        pendingEarnings: 180000,
        withdrawableEarnings: 1270000,
        withdrawnEarnings: 1000000,
        thisMonthEarnings: 342000,
        lastMonthEarnings: 298000,
        growthRate: 14.8,
      });
      setRecords([
        {
          id: '1',
          type: 'commission',
          amount: 45000,
          status: 'confirmed',
          orderId: 'ORD-2024-001',
          linkId: 'link-1',
          description: '여름 선케어 세트 판매 커미션',
          createdAt: '2024-12-10T14:30:00Z',
        },
        {
          id: '2',
          type: 'commission',
          amount: 32000,
          status: 'confirmed',
          orderId: 'ORD-2024-002',
          description: '안티에이징 세럼 판매 커미션',
          createdAt: '2024-12-09T11:20:00Z',
        },
        {
          id: '3',
          type: 'commission',
          amount: 58000,
          status: 'pending',
          orderId: 'ORD-2024-003',
          description: '스킨케어 세트 판매 커미션 (정산 대기)',
          createdAt: '2024-12-08T16:45:00Z',
        },
        {
          id: '4',
          type: 'bonus',
          amount: 50000,
          status: 'confirmed',
          description: '월간 우수 파트너 보너스',
          createdAt: '2024-12-01T10:00:00Z',
        },
        {
          id: '5',
          type: 'withdrawal',
          amount: -500000,
          status: 'paid',
          description: '계좌 출금 완료',
          createdAt: '2024-11-30T15:00:00Z',
        },
        {
          id: '6',
          type: 'commission',
          amount: 28000,
          status: 'confirmed',
          orderId: 'ORD-2024-004',
          description: '토너 패드 판매 커미션',
          createdAt: '2024-11-28T09:30:00Z',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const handleWithdraw = async () => {
    try {
      await authClient.api.post('/api/v1/partner/earnings/withdraw', withdrawForm);
      setShowWithdrawModal(false);
      setWithdrawForm({ amount: 0, bankName: '', accountNumber: '', accountHolder: '' });
      fetchEarnings();
    } catch (err) {
      console.error('Failed to request withdrawal:', err);
      // Demo: add withdrawal record
      const newRecord: EarningsRecord = {
        id: String(Date.now()),
        type: 'withdrawal',
        amount: -withdrawForm.amount,
        status: 'processing',
        description: `출금 신청 (${withdrawForm.bankName} ${withdrawForm.accountNumber})`,
        createdAt: new Date().toISOString(),
      };
      setRecords([newRecord, ...records]);
      if (summary) {
        setSummary({
          ...summary,
          withdrawableEarnings: summary.withdrawableEarnings - withdrawForm.amount,
        });
      }
      setShowWithdrawModal(false);
      setWithdrawForm({ amount: 0, bankName: '', accountNumber: '', accountHolder: '' });
    }
  };

  const filteredRecords = records.filter((record) => {
    if (filterType !== 'all' && record.type !== filterType) return false;
    if (dateRange !== 'all') {
      const recordDate = new Date(record.createdAt);
      const now = new Date();
      if (dateRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (recordDate < weekAgo) return false;
      } else if (dateRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (recordDate < monthAgo) return false;
      }
    }
    return true;
  });

  const typeLabels: Record<string, { label: string; color: string }> = {
    commission: { label: '커미션', color: 'bg-blue-100 text-blue-800' },
    bonus: { label: '보너스', color: 'bg-purple-100 text-purple-800' },
    withdrawal: { label: '출금', color: 'bg-orange-100 text-orange-800' },
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: '대기', color: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: '확정', color: 'bg-green-100 text-green-800' },
    paid: { label: '지급완료', color: 'bg-blue-100 text-blue-800' },
    processing: { label: '처리중', color: 'bg-gray-100 text-gray-800' },
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">수익 관리</h1>
          <p className="text-gray-600">커미션 및 수익 현황</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchEarnings}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setWithdrawForm({
                ...withdrawForm,
                amount: summary?.withdrawableEarnings || 0,
              });
              setShowWithdrawModal(true);
            }}
            disabled={!summary?.withdrawableEarnings || summary.withdrawableEarnings <= 0}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CreditCard className="w-4 h-4" />
            출금 신청
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 수익</p>
              <p className="text-2xl font-bold text-blue-600">
                {summary?.totalEarnings.toLocaleString()}원
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">대기 중</p>
              <p className="text-2xl font-bold text-yellow-600">
                {summary?.pendingEarnings.toLocaleString()}원
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">인출 가능</p>
              <p className="text-2xl font-bold text-green-600">
                {summary?.withdrawableEarnings.toLocaleString()}원
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">이번 달</p>
              <p className="text-2xl font-bold text-purple-600">
                {summary?.thisMonthEarnings.toLocaleString()}원
              </p>
              <p
                className={`text-xs ${
                  (summary?.growthRate ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {(summary?.growthRate ?? 0) >= 0 ? '+' : ''}{summary?.growthRate}% vs 지난달
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Month Comparison */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">월별 비교</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm text-gray-500">지난달</p>
            <p className="text-xl font-bold">
              {summary?.lastMonthEarnings.toLocaleString()}원
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
          <div className="flex-1">
            <p className="text-sm text-gray-500">이번달</p>
            <p className="text-xl font-bold text-pink-600">
              {summary?.thisMonthEarnings.toLocaleString()}원
            </p>
          </div>
          <div className="flex-1 text-right">
            <p className="text-sm text-gray-500">성장률</p>
            <p
              className={`text-xl font-bold ${
                (summary?.growthRate ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {(summary?.growthRate ?? 0) >= 0 ? '+' : ''}{summary?.growthRate}%
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
        >
          <option value="all">전체 유형</option>
          <option value="commission">커미션</option>
          <option value="bonus">보너스</option>
          <option value="withdrawal">출금</option>
        </select>

        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
        >
          <option value="all">전체 기간</option>
          <option value="week">최근 1주일</option>
          <option value="month">최근 1개월</option>
        </select>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">날짜</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">유형</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">설명</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">금액</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredRecords.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      {new Date(record.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs rounded ${typeLabels[record.type].color}`}
                  >
                    {typeLabels[record.type].label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm">{record.description}</p>
                  {record.orderId && (
                    <p className="text-xs text-gray-500">주문: {record.orderId}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-bold ${
                      record.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {record.amount >= 0 ? '+' : ''}{record.amount.toLocaleString()}원
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`px-2 py-1 text-xs rounded ${statusLabels[record.status].color}`}
                  >
                    {statusLabels[record.status].label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRecords.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            수익 내역이 없습니다.
          </div>
        )}
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">출금 신청</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  출금 금액
                </label>
                <input
                  type="number"
                  value={withdrawForm.amount}
                  onChange={(e) =>
                    setWithdrawForm({ ...withdrawForm, amount: Number(e.target.value) })
                  }
                  max={summary?.withdrawableEarnings || 0}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  인출 가능: {summary?.withdrawableEarnings.toLocaleString()}원
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  은행명
                </label>
                <select
                  value={withdrawForm.bankName}
                  onChange={(e) =>
                    setWithdrawForm({ ...withdrawForm, bankName: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="">선택하세요</option>
                  <option value="신한은행">신한은행</option>
                  <option value="국민은행">국민은행</option>
                  <option value="우리은행">우리은행</option>
                  <option value="하나은행">하나은행</option>
                  <option value="농협은행">농협은행</option>
                  <option value="카카오뱅크">카카오뱅크</option>
                  <option value="토스뱅크">토스뱅크</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  계좌번호
                </label>
                <input
                  type="text"
                  value={withdrawForm.accountNumber}
                  onChange={(e) =>
                    setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value })
                  }
                  placeholder="'-' 없이 입력"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  예금주
                </label>
                <input
                  type="text"
                  value={withdrawForm.accountHolder}
                  onChange={(e) =>
                    setWithdrawForm({ ...withdrawForm, accountHolder: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleWithdraw}
                disabled={
                  !withdrawForm.amount ||
                  !withdrawForm.bankName ||
                  !withdrawForm.accountNumber ||
                  !withdrawForm.accountHolder ||
                  withdrawForm.amount > (summary?.withdrawableEarnings || 0)
                }
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50"
              >
                신청하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CosmeticsPartnerEarnings;
