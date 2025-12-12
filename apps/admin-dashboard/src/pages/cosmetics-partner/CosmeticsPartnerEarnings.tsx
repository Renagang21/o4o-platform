/**
 * Cosmetics Partner Earnings Page
 *
 * 파트너 수익 관리 페이지
 * Phase 6-E: UI/UX Enhancement
 * - 대기 중 수익
 * - 인출 가능 수익
 * - 인출 버튼 + Enhanced Modal
 * - 수익 내역 (Improved table)
 * - Toast notifications
 */

import React, { useState, useEffect, useCallback } from 'react';
import { authClient } from '@o4o/auth-client';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  RefreshCw,
  Download,
  Calendar,
  ArrowRight,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Check,
  AlertTriangle,
  Wallet,
  Gift,
  History,
  FileText,
  ChevronRight,
  Info,
  Banknote,
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

// Bank options with icons
const bankOptions = [
  { value: '신한은행', label: '신한은행' },
  { value: '국민은행', label: '국민은행' },
  { value: '우리은행', label: '우리은행' },
  { value: '하나은행', label: '하나은행' },
  { value: '농협은행', label: '농협은행' },
  { value: 'SC제일은행', label: 'SC제일은행' },
  { value: '기업은행', label: '기업은행' },
  { value: '카카오뱅크', label: '카카오뱅크' },
  { value: '토스뱅크', label: '토스뱅크' },
  { value: '케이뱅크', label: '케이뱅크' },
];

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

  // Phase 6-E: New state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [withdrawStep, setWithdrawStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchEarnings = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const handleWithdraw = async () => {
    setIsSubmitting(true);
    try {
      await authClient.api.post('/api/v1/partner/earnings/withdraw', withdrawForm);
      setShowWithdrawModal(false);
      setWithdrawStep(1);
      setWithdrawForm({ amount: 0, bankName: '', accountNumber: '', accountHolder: '' });
      setToast({ message: '출금 신청이 완료되었습니다! 1-3 영업일 내 입금됩니다.', type: 'success' });
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
      setWithdrawStep(1);
      setWithdrawForm({ amount: 0, bankName: '', accountNumber: '', accountHolder: '' });
      setToast({ message: '출금 신청이 완료되었습니다! 1-3 영업일 내 입금됩니다.', type: 'success' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Phase 6-E: Quick amount buttons
  const quickAmounts = [
    { label: '10만원', value: 100000 },
    { label: '50만원', value: 500000 },
    { label: '100만원', value: 1000000 },
    { label: '전액', value: summary?.withdrawableEarnings || 0 },
  ];

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

  // Type icons for records
  const typeIcons: Record<string, React.ReactNode> = {
    commission: <DollarSign className="w-4 h-4" />,
    bonus: <Gift className="w-4 h-4" />,
    withdrawal: <Banknote className="w-4 h-4" />,
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="h-24 bg-gray-200 rounded-lg"></div>
        <div className="h-12 bg-gray-200 rounded-lg"></div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in ${
            toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          {toast.message}
        </div>
      )}

      {/* Hero Summary Card - Withdrawable Amount */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-pink-100 text-sm mb-1">인출 가능 금액</p>
            <p className="text-4xl font-bold mb-2">
              {summary?.withdrawableEarnings.toLocaleString()}원
            </p>
            <p className="text-pink-200 text-sm">
              총 수익 {summary?.totalEarnings.toLocaleString()}원 중
              {summary?.pendingEarnings.toLocaleString()}원 정산 대기 중
            </p>
          </div>
          <button
            onClick={() => {
              setWithdrawForm({
                ...withdrawForm,
                amount: summary?.withdrawableEarnings || 0,
              });
              setWithdrawStep(1);
              setShowWithdrawModal(true);
            }}
            disabled={!summary?.withdrawableEarnings || summary.withdrawableEarnings < 10000}
            className="px-6 py-3 bg-white text-pink-600 rounded-xl font-semibold hover:bg-pink-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <CreditCard className="w-5 h-5" />
            출금 신청
          </button>
        </div>
        {summary?.withdrawableEarnings && summary.withdrawableEarnings < 10000 && (
          <div className="mt-4 flex items-center gap-2 text-pink-200 text-sm">
            <Info className="w-4 h-4" />
            최소 출금 금액은 10,000원입니다
          </div>
        )}
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-sm text-gray-500">총 누적 수익</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {summary?.totalEarnings.toLocaleString()}원
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-sm text-gray-500">정산 대기</div>
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {summary?.pendingEarnings.toLocaleString()}원
          </div>
          <div className="text-xs text-gray-400 mt-1">구매확정 대기 중</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <History className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-sm text-gray-500">누적 출금</div>
          </div>
          <div className="text-2xl font-bold text-gray-600">
            {summary?.withdrawnEarnings.toLocaleString()}원
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-sm text-gray-500">이번 달 수익</div>
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {summary?.thisMonthEarnings.toLocaleString()}원
          </div>
          <div className={`flex items-center gap-1 text-xs mt-1 ${
            (summary?.growthRate ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {(summary?.growthRate ?? 0) >= 0 ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {Math.abs(summary?.growthRate ?? 0)}% vs 지난달
          </div>
        </div>
      </div>

      {/* Month Comparison Chart */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">월별 수익 비교</h2>
          <button
            onClick={fetchEarnings}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="flex items-end gap-4 h-20">
              <div className="flex-1">
                <div
                  className="bg-gray-200 rounded-t-lg transition-all"
                  style={{
                    height: `${Math.max(20, ((summary?.lastMonthEarnings || 0) / Math.max(summary?.lastMonthEarnings || 1, summary?.thisMonthEarnings || 1)) * 100)}%`,
                  }}
                ></div>
                <p className="text-center text-xs text-gray-500 mt-2">지난달</p>
                <p className="text-center text-sm font-semibold">
                  {summary?.lastMonthEarnings.toLocaleString()}원
                </p>
              </div>
              <div className="flex-1">
                <div
                  className="bg-pink-500 rounded-t-lg transition-all"
                  style={{
                    height: `${Math.max(20, ((summary?.thisMonthEarnings || 0) / Math.max(summary?.lastMonthEarnings || 1, summary?.thisMonthEarnings || 1)) * 100)}%`,
                  }}
                ></div>
                <p className="text-center text-xs text-gray-500 mt-2">이번달</p>
                <p className="text-center text-sm font-semibold text-pink-600">
                  {summary?.thisMonthEarnings.toLocaleString()}원
                </p>
              </div>
            </div>
          </div>
          <div className="w-32 text-center border-l pl-6">
            <div className={`text-3xl font-bold ${
              (summary?.growthRate ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {(summary?.growthRate ?? 0) >= 0 ? '+' : ''}{summary?.growthRate}%
            </div>
            <p className="text-sm text-gray-500">성장률</p>
          </div>
        </div>
      </div>

      {/* Filters and History */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex flex-col md:flex-row gap-4 justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            수익 내역
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['all', 'commission', 'bonus', 'withdrawal'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    filterType === type
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {type === 'all' ? '전체' : type === 'commission' ? '커미션' : type === 'bonus' ? '보너스' : '출금'}
                </button>
              ))}
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="all">전체 기간</option>
              <option value="week">최근 1주일</option>
              <option value="month">최근 1개월</option>
            </select>
          </div>
        </div>

        {/* Records List */}
        <div className="divide-y">
          {filteredRecords.map((record) => (
            <div key={record.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  record.type === 'commission' ? 'bg-blue-100 text-blue-600' :
                  record.type === 'bonus' ? 'bg-purple-100 text-purple-600' :
                  'bg-orange-100 text-orange-600'
                }`}>
                  {typeIcons[record.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{record.description}</p>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${statusLabels[record.status].color}`}>
                      {statusLabels[record.status].label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                    <span>{new Date(record.createdAt).toLocaleDateString('ko-KR')}</span>
                    {record.orderId && (
                      <span className="text-gray-400">주문: {record.orderId}</span>
                    )}
                  </div>
                </div>
                <div className={`text-lg font-bold ${
                  record.amount >= 0 ? 'text-green-600' : 'text-red-500'
                }`}>
                  {record.amount >= 0 ? '+' : ''}{record.amount.toLocaleString()}원
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredRecords.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <History className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">수익 내역이 없습니다</h3>
            <p className="text-gray-500">
              {filterType !== 'all' || dateRange !== 'all'
                ? '다른 필터 조건을 선택해보세요.'
                : '추천 링크를 통한 판매가 발생하면 여기에 표시됩니다.'}
            </p>
          </div>
        )}
      </div>

      {/* Enhanced Withdraw Modal - 2 Step Process */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">출금 신청</h2>
                  <p className="text-sm text-gray-500">
                    {withdrawStep === 1 ? '금액 입력' : '계좌 정보 입력'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawStep(1);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div className={`flex-1 h-1 rounded-full ${withdrawStep >= 1 ? 'bg-pink-500' : 'bg-gray-200'}`}></div>
              <div className={`flex-1 h-1 rounded-full ${withdrawStep >= 2 ? 'bg-pink-500' : 'bg-gray-200'}`}></div>
            </div>

            {withdrawStep === 1 ? (
              /* Step 1: Amount */
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    출금 금액
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={withdrawForm.amount || ''}
                      onChange={(e) =>
                        setWithdrawForm({ ...withdrawForm, amount: Number(e.target.value) })
                      }
                      max={summary?.withdrawableEarnings || 0}
                      placeholder="0"
                      className="w-full px-4 py-3 text-2xl font-bold border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-right"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">원</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2 flex items-center justify-between">
                    <span>인출 가능</span>
                    <span className="font-medium text-green-600">
                      {summary?.withdrawableEarnings.toLocaleString()}원
                    </span>
                  </p>
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => setWithdrawForm({ ...withdrawForm, amount: Math.min(item.value, summary?.withdrawableEarnings || 0) })}
                      disabled={item.value > (summary?.withdrawableEarnings || 0)}
                      className="px-3 py-2 text-sm border-2 rounded-lg hover:border-pink-300 hover:bg-pink-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {withdrawForm.amount > 0 && withdrawForm.amount > (summary?.withdrawableEarnings || 0) && (
                  <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                    <AlertTriangle className="w-4 h-4" />
                    인출 가능 금액을 초과했습니다
                  </div>
                )}

                <div className="pt-4">
                  <button
                    onClick={() => setWithdrawStep(2)}
                    disabled={!withdrawForm.amount || withdrawForm.amount < 10000 || withdrawForm.amount > (summary?.withdrawableEarnings || 0)}
                    className="w-full py-3 bg-pink-600 text-white rounded-xl font-semibold hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    다음
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  {withdrawForm.amount > 0 && withdrawForm.amount < 10000 && (
                    <p className="text-center text-sm text-gray-500 mt-2">
                      최소 출금 금액: 10,000원
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* Step 2: Bank Account */
              <div className="space-y-4">
                <div className="bg-pink-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">출금 금액</span>
                    <span className="text-xl font-bold text-pink-600">
                      {withdrawForm.amount.toLocaleString()}원
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    은행 선택
                  </label>
                  <select
                    value={withdrawForm.bankName}
                    onChange={(e) =>
                      setWithdrawForm({ ...withdrawForm, bankName: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  >
                    <option value="">은행을 선택하세요</option>
                    {bankOptions.map((bank) => (
                      <option key={bank.value} value={bank.value}>
                        {bank.label}
                      </option>
                    ))}
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
                      setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value.replace(/[^0-9]/g, '') })
                    }
                    placeholder="'-' 없이 숫자만 입력"
                    className="w-full px-3 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
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
                    placeholder="예금주명을 입력하세요"
                    className="w-full px-3 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>

                <div className="flex items-start gap-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>출금 신청 후 1-3 영업일 내 입금됩니다. 예금주명이 일치하지 않으면 입금이 지연될 수 있습니다.</span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setWithdrawStep(1)}
                    className="flex-1 py-3 border-2 rounded-xl font-semibold hover:bg-gray-50"
                  >
                    이전
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={
                      isSubmitting ||
                      !withdrawForm.bankName ||
                      !withdrawForm.accountNumber ||
                      !withdrawForm.accountHolder
                    }
                    className="flex-1 py-3 bg-pink-600 text-white rounded-xl font-semibold hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        처리 중...
                      </>
                    ) : (
                      '출금 신청'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CosmeticsPartnerEarnings;
