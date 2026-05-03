/**
 * PointSpendPage
 *
 * WO-O4O-POINT-OPERATOR-UI-V1
 * WO-O4O-POINT-PAYOUT-TYPE-BACKEND-V1 — payoutType을 API body에 포함
 * WO-O4O-POINT-TRANSACTION-VIEW-ADMIN-V1 — 사용자 거래 이력 조회 영역 추가
 *
 * 운영자 포인트 차감(보상 지급 완료 처리) UI + 거래 이력 조회.
 * 정책: docs/point/O4O-POINT-REWARD-OPERATION-POLICY.md
 *   - 차감 = 보상 지급 완료 처리
 *   - description 필수
 *
 * Route: /operator/points
 */

import { useState, FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { toast } from 'react-hot-toast';
import { Coins, AlertTriangle, Search } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';

// ── Types ────────────────────────────────────────────────────────────────────

interface SpendResponse {
  success: boolean;
  data: {
    balance: number;
    transactionId: string;
  };
}

interface SpendErrorBody {
  success: false;
  error?: string;
  code?: string;
}

// ── Transaction History Types ───────────────────────────────────────────────

type TransactionType = 'earn' | 'spend' | 'adjust';

interface PointTransaction {
  id: string;
  userId: string;
  amount: number;
  transactionType: TransactionType;
  sourceType: string;
  sourceId: string | null;
  description: string | null;
  createdAt: string;
}

interface TransactionsResponse {
  success: boolean;
  data: {
    transactions: PointTransaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// ── Constants ────────────────────────────────────────────────────────────────

const PAYOUT_TYPES = [
  { value: 'reward_payout_offline', label: '오프라인 보상', description: '오프라인 보상 지급 완료' },
  { value: 'reward_payout_voucher', label: '상품권', description: '상품권 지급 완료' },
  { value: 'reward_payout_survey', label: '설문 참여', description: '설문 참여 보상 정산 완료' },
  { value: 'reward_payout_course', label: '강의 참여', description: '강의 참여 보상 지급 완료' },
  { value: 'reward_payout_other', label: '기타', description: '기타 보상 지급 완료' },
] as const;

type PayoutType = typeof PAYOUT_TYPES[number]['value'];

// 사람이 읽기 쉬운 sourceType 라벨 (없는 키는 raw 표시)
const SOURCE_TYPE_LABELS: Record<string, string> = {
  lesson_complete: '레슨 완료',
  quiz_pass: '퀴즈 통과',
  course_complete: '코스 완료',
  admin_grant: '관리자 지급',
  admin_spend: '관리자 차감(legacy)',
  admin_adjust: '관리자 조정',
  reward_payout_offline: '오프라인 보상',
  reward_payout_voucher: '상품권',
  reward_payout_survey: '설문 참여',
  reward_payout_course: '강의 참여',
  reward_payout_other: '기타',
};

const HISTORY_PAGE_SIZE = 20;

// ── API ──────────────────────────────────────────────────────────────────────

async function spendPoint(params: {
  userId: string;
  amount: number;
  payoutType: PayoutType;
  description: string;
}): Promise<SpendResponse['data']> {
  const res = await authClient.api.post<SpendResponse>('/api/v1/points/admin/spend', params);
  return res.data.data;
}

async function fetchTransactions(
  userId: string,
  page: number,
): Promise<TransactionsResponse['data']> {
  const res = await authClient.api.get<TransactionsResponse>(
    '/api/v1/points/admin/transactions',
    { params: { userId, page: String(page), limit: String(HISTORY_PAGE_SIZE) } },
  );
  return res.data.data;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PointSpendPage() {
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [payoutType, setPayoutType] = useState<PayoutType | ''>('');
  const [description, setDescription] = useState('');
  const [lastResult, setLastResult] = useState<SpendResponse['data'] | null>(null);

  const trimmedDescription = description.trim();
  const numericAmount = Number(amount);
  const isValidAmount = Number.isInteger(numericAmount) && numericAmount > 0;
  const canSubmit =
    userId.trim().length > 0 &&
    isValidAmount &&
    payoutType !== '' &&
    trimmedDescription.length > 0;

  const handlePayoutTypeChange = (value: PayoutType | '') => {
    setPayoutType(value);
    if (value !== '') {
      const preset = PAYOUT_TYPES.find((p) => p.value === value);
      if (preset) setDescription(preset.description);
    }
  };

  const mutation = useMutation({
    mutationFn: spendPoint,
    onSuccess: (data) => {
      setLastResult(data);
      toast.success(`차감 완료. 잔액: ${data.balance.toLocaleString()}P`);
      setAmount('');
    },
    onError: (err: any) => {
      const body: SpendErrorBody | undefined = err?.response?.data;
      const code = body?.code;
      if (code === 'INSUFFICIENT_BALANCE') {
        toast.error('잔액이 부족합니다.');
      } else if (code === 'INVALID_DESCRIPTION') {
        toast.error('차감 사유(description)를 입력해 주세요.');
      } else if (code === 'INVALID_AMOUNT') {
        toast.error('차감 금액은 1 이상의 정수여야 합니다.');
      } else if (code === 'INVALID_USER_ID') {
        toast.error('대상 사용자 ID를 확인해 주세요.');
      } else if (code === 'INVALID_PAYOUT_TYPE') {
        toast.error('보상 유형(payoutType) 값이 올바르지 않습니다.');
      } else {
        toast.error(body?.error || '차감 처리 중 오류가 발생했습니다.');
      }
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    // canSubmit narrows payoutType to PointPayoutType (alias narrowing)
    mutation.mutate({
      userId: userId.trim(),
      amount: numericAmount,
      payoutType: payoutType as PayoutType,
      description: trimmedDescription,
    });
  };

  // ── Transaction History (WO-O4O-POINT-TRANSACTION-VIEW-ADMIN-V1) ────────────
  const [lookupUserIdInput, setLookupUserIdInput] = useState('');
  const [submittedLookupUserId, setSubmittedLookupUserId] = useState('');
  const [historyPage, setHistoryPage] = useState(1);

  const historyQuery = useQuery({
    queryKey: ['point-admin-transactions', submittedLookupUserId, historyPage],
    queryFn: () => fetchTransactions(submittedLookupUserId, historyPage),
    enabled: submittedLookupUserId.length > 0,
  });

  const handleLookup = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = lookupUserIdInput.trim();
    if (!trimmed) return;
    setHistoryPage(1);
    setSubmittedLookupUserId(trimmed);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const txTypeBadge = (t: TransactionType) => {
    if (t === 'earn') return { label: '적립', className: 'bg-green-100 text-green-800' };
    if (t === 'spend') return { label: '차감', className: 'bg-red-100 text-red-800' };
    return { label: '조정', className: 'bg-gray-100 text-gray-700' };
  };

  return (
    <div className="p-6">
      <PageHeader
        title="포인트 보상 정산 (차감)"
        subtitle="보상 지급 완료 후 사용자 포인트를 차감합니다. 차감 사유(description)는 필수입니다."
      />

      <div className="mt-2 mb-6 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">정책 안내</p>
          <p className="mt-0.5">
            포인트 차감은 <strong>보상 지급 완료 처리</strong>를 의미합니다. 실제 보상(현금/상품권 등)
            지급 후 본 화면에서 차감을 수행하세요. 모든 차감 내역은 영구 기록됩니다.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        {/* userId */}
        <div>
          <label htmlFor="userId" className="mb-1 block text-sm font-medium text-gray-700">
            사용자 ID <span className="text-red-500">*</span>
          </label>
          <input
            id="userId"
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="UUID (예: a0000000-0a00-4000-a000-000000000001)"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
            disabled={mutation.isPending}
          />
        </div>

        {/* amount */}
        <div>
          <label htmlFor="amount" className="mb-1 block text-sm font-medium text-gray-700">
            차감 포인트 <span className="text-red-500">*</span>
          </label>
          <input
            id="amount"
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="예: 100"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            disabled={mutation.isPending}
          />
          {amount !== '' && !isValidAmount && (
            <p className="mt-1 text-xs text-red-600">1 이상의 정수만 입력 가능합니다.</p>
          )}
        </div>

        {/* payoutType */}
        <div>
          <label htmlFor="payoutType" className="mb-1 block text-sm font-medium text-gray-700">
            보상 유형 <span className="text-red-500">*</span>
          </label>
          <select
            id="payoutType"
            value={payoutType}
            onChange={(e) => handlePayoutTypeChange(e.target.value as PayoutType | '')}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            disabled={mutation.isPending}
          >
            <option value="">보상 유형을 선택하세요</option>
            {PAYOUT_TYPES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            선택 시 아래 사유가 자동으로 입력됩니다. 필요 시 직접 수정할 수 있습니다.
          </p>
        </div>

        {/* description */}
        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
            차감 사유 (description) <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="예: 설문 참여 보상 정산 완료"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            disabled={mutation.isPending}
          />
          {description !== '' && trimmedDescription === '' && (
            <p className="mt-1 text-xs text-red-600">공백만 입력할 수 없습니다.</p>
          )}
        </div>

        {/* submit */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={!canSubmit || mutation.isPending}
            className="inline-flex items-center gap-2 rounded bg-admin-blue px-4 py-2 text-sm font-medium text-white hover:bg-admin-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Coins size={14} />
            {mutation.isPending ? '처리 중...' : '차감 실행'}
          </button>
          {lastResult && (
            <span className="text-sm text-gray-600">
              마지막 처리: 잔액 <strong>{lastResult.balance.toLocaleString()}P</strong>
              <span className="ml-2 font-mono text-xs text-gray-400">
                tx: {lastResult.transactionId.slice(0, 8)}…
              </span>
            </span>
          )}
        </div>
      </form>

      {/* ── 거래 이력 조회 (WO-O4O-POINT-TRANSACTION-VIEW-ADMIN-V1) ── */}
      <div className="mt-10 border-t border-gray-200 pt-8">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">거래 이력 조회</h2>
        <p className="mb-4 text-sm text-gray-500">
          특정 사용자의 포인트 적립·차감 이력을 최신순으로 조회합니다.
        </p>

        <form onSubmit={handleLookup} className="mb-6 flex max-w-xl items-end gap-2">
          <div className="flex-1">
            <label htmlFor="lookupUserId" className="mb-1 block text-sm font-medium text-gray-700">
              사용자 ID
            </label>
            <input
              id="lookupUserId"
              type="text"
              value={lookupUserIdInput}
              onChange={(e) => setLookupUserIdInput(e.target.value)}
              placeholder="UUID"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!lookupUserIdInput.trim() || historyQuery.isFetching}
            className="inline-flex items-center gap-2 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Search size={14} />
            {historyQuery.isFetching ? '조회 중...' : '조회'}
          </button>
        </form>

        {submittedLookupUserId === '' ? (
          <p className="text-sm text-gray-400">사용자 ID를 입력하고 조회 버튼을 눌러주세요.</p>
        ) : historyQuery.isError ? (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {(historyQuery.error as any)?.response?.data?.error
              || '거래 이력을 불러오지 못했습니다. (UUID 형식이 올바른지 확인해 주세요.)'}
          </div>
        ) : historyQuery.isLoading ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : (
          <div>
            <div className="overflow-x-auto rounded border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">날짜</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">구분</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">금액</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">유형 (sourceType)</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">사유</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {(historyQuery.data?.transactions ?? []).map((tx) => {
                    const badge = txTypeBadge(tx.transactionType);
                    const sourceLabel = SOURCE_TYPE_LABELS[tx.sourceType] ?? tx.sourceType;
                    const isNegative = tx.amount < 0;
                    return (
                      <tr key={tx.id}>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                          {formatDate(tx.createdAt)}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className={`whitespace-nowrap px-3 py-2 text-right font-medium ${isNegative ? 'text-red-600' : 'text-green-700'}`}>
                          {isNegative ? '' : '+'}{tx.amount.toLocaleString()}P
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-gray-800">{sourceLabel}</div>
                          {sourceLabel !== tx.sourceType && (
                            <div className="font-mono text-xs text-gray-400">{tx.sourceType}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {tx.description ?? <span className="text-gray-300">-</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {historyQuery.data?.transactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-sm text-gray-400">
                        해당 사용자의 거래 이력이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {historyQuery.data && historyQuery.data.pagination.totalPages > 1 && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  className="rounded border px-3 py-1 text-sm disabled:opacity-40"
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage <= 1 || historyQuery.isFetching}
                >
                  이전
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">
                  {historyQuery.data.pagination.page} / {historyQuery.data.pagination.totalPages}
                  <span className="ml-2 text-xs text-gray-400">
                    (총 {historyQuery.data.pagination.total.toLocaleString()}건)
                  </span>
                </span>
                <button
                  className="rounded border px-3 py-1 text-sm disabled:opacity-40"
                  onClick={() =>
                    setHistoryPage((p) =>
                      Math.min(historyQuery.data!.pagination.totalPages, p + 1),
                    )
                  }
                  disabled={
                    historyPage >= (historyQuery.data?.pagination.totalPages ?? 1) ||
                    historyQuery.isFetching
                  }
                >
                  다음
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
