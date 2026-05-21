/**
 * PointBudgetPage — 서비스별 포인트 예산 관리
 *
 * WO-O4O-SERVICE-OPERATOR-POINT-BUDGET-PHASE1-V1
 *
 * - 전체 서비스 예산 현황 조회
 * - 서비스별 예산 추가 (allocate)
 * - 서비스별 예산 변경 이력 조회
 *
 * Route: /operator/points/budget
 */

import { useState, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { toast } from 'react-hot-toast';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';

// ── Types ────────────────────────────────────────────────────────────────────

interface BudgetSummary {
  serviceKey: string;
  allocatedAmount: number;
  usedAmount: number;
  remainingAmount: number;
  memo?: string;
  updatedAt: string;
}

interface BudgetTransaction {
  id: string;
  serviceKey: string;
  amount: number;
  txType: 'allocate' | 'deduct';
  referenceKey?: string;
  description?: string;
  operatorId?: string;
  createdAt: string;
}

interface ListBudgetsResponse {
  success: boolean;
  data: { budgets: BudgetSummary[] };
}

interface AllocateResponse {
  success: boolean;
  data: BudgetSummary;
}

interface TransactionsResponse {
  success: boolean;
  data: {
    transactions: BudgetTransaction[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

// ── Constants ────────────────────────────────────────────────────────────────

const SERVICE_LABELS: Record<string, string> = {
  'kpa-society': 'KPA 약사회',
  'glycopharm': '글라이코팜',
  'neture': '네처',
  'k-cosmetics': 'K-화장품',
  'glucoseview': '글루코스뷰',
};

function serviceLabel(key: string): string {
  return SERVICE_LABELS[key] ?? key;
}

// ── API ──────────────────────────────────────────────────────────────────────

async function fetchBudgets(): Promise<BudgetSummary[]> {
  const res = await authClient.api.get<ListBudgetsResponse>('/api/v1/points/budget');
  return res.data.data.budgets;
}

async function allocateBudget(params: {
  serviceKey: string;
  amount: number;
  memo?: string;
}): Promise<BudgetSummary> {
  const { serviceKey, ...body } = params;
  const res = await authClient.api.post<AllocateResponse>(
    `/api/v1/points/budget/${serviceKey}/allocate`,
    body,
  );
  return res.data.data;
}

async function fetchTransactions(
  serviceKey: string,
  page: number,
): Promise<TransactionsResponse['data']> {
  const res = await authClient.api.get<TransactionsResponse>(
    `/api/v1/points/budget/${serviceKey}/transactions`,
    { params: { page: String(page), limit: '20' } },
  );
  return res.data.data;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PointBudgetPage() {
  const queryClient = useQueryClient();

  // ── Budget list ──
  const budgetsQuery = useQuery({
    queryKey: ['point-budgets'],
    queryFn: fetchBudgets,
  });

  // ── Allocate form ──
  const [allocServiceKey, setAllocServiceKey] = useState('kpa-society');
  const [allocAmount, setAllocAmount] = useState('');
  const [allocMemo, setAllocMemo] = useState('');
  const numericAmount = Number(allocAmount);
  const isValidAmount = Number.isInteger(numericAmount) && numericAmount > 0;
  const canAllocate = allocServiceKey.trim() && isValidAmount;

  const allocateMutation = useMutation({
    mutationFn: allocateBudget,
    onSuccess: (data) => {
      toast.success(`${serviceLabel(data.serviceKey)} 예산 +${data.allocatedAmount.toLocaleString()}P 완료`);
      setAllocAmount('');
      setAllocMemo('');
      queryClient.invalidateQueries({ queryKey: ['point-budgets'] });
    },
    onError: (err: any) => {
      const code = err?.response?.data?.code;
      if (code === 'INVALID_AMOUNT') toast.error('금액은 1 이상의 정수여야 합니다.');
      else if (code === 'INVALID_SERVICE_KEY') toast.error('서비스 키가 올바르지 않습니다.');
      else toast.error(err?.response?.data?.error || '예산 추가 중 오류가 발생했습니다.');
    },
  });

  const handleAllocate = (e: FormEvent) => {
    e.preventDefault();
    if (!canAllocate) return;
    allocateMutation.mutate({
      serviceKey: allocServiceKey,
      amount: numericAmount,
      memo: allocMemo.trim() || undefined,
    });
  };

  // ── Transaction history drawer ──
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [txPage, setTxPage] = useState(1);

  const txQuery = useQuery({
    queryKey: ['budget-transactions', expandedService, txPage],
    queryFn: () => fetchTransactions(expandedService!, txPage),
    enabled: expandedService !== null,
  });

  const toggleService = (key: string) => {
    if (expandedService === key) {
      setExpandedService(null);
    } else {
      setExpandedService(key);
      setTxPage(1);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

  const txTypeBadge = (t: 'allocate' | 'deduct') =>
    t === 'allocate'
      ? { label: '입금', cls: 'bg-green-100 text-green-800' }
      : { label: '차감', cls: 'bg-red-100 text-red-800' };

  const pctUsed = (s: BudgetSummary) =>
    s.allocatedAmount > 0 ? Math.round((s.usedAmount / s.allocatedAmount) * 100) : 0;

  return (
    <div className="p-6">
      <PageHeader
        title="서비스 포인트 예산"
        subtitle="서비스별 포인트 지급 예산을 관리합니다. 예산이 소진되면 자동 포인트 지급이 중단됩니다."
      />

      {/* ── 예산 추가 폼 ── */}
      <section className="mb-10 border-b border-gray-200 pb-8">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">예산 추가</h2>
        <p className="mb-4 text-sm text-gray-500">
          서비스에 포인트 예산을 추가합니다. 서비스가 없으면 새로 생성됩니다.
        </p>

        <form onSubmit={handleAllocate} className="max-w-xl space-y-4">
          <div>
            <label htmlFor="allocServiceKey" className="mb-1 block text-sm font-medium text-gray-700">
              서비스 <span className="text-red-500">*</span>
            </label>
            <select
              id="allocServiceKey"
              value={allocServiceKey}
              onChange={(e) => setAllocServiceKey(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              disabled={allocateMutation.isPending}
            >
              {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label} ({key})</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="allocAmount" className="mb-1 block text-sm font-medium text-gray-700">
              예산 금액 (P) <span className="text-red-500">*</span>
            </label>
            <input
              id="allocAmount"
              type="number"
              min={1}
              step={1}
              value={allocAmount}
              onChange={(e) => setAllocAmount(e.target.value)}
              placeholder="예: 10000"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              disabled={allocateMutation.isPending}
            />
            {allocAmount !== '' && !isValidAmount && (
              <p className="mt-1 text-xs text-red-600">1 이상의 정수만 입력 가능합니다.</p>
            )}
          </div>

          <div>
            <label htmlFor="allocMemo" className="mb-1 block text-sm font-medium text-gray-700">
              메모 (선택)
            </label>
            <input
              id="allocMemo"
              type="text"
              value={allocMemo}
              onChange={(e) => setAllocMemo(e.target.value)}
              placeholder="예: 2026년 5월 KPA 약사회 예산"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              disabled={allocateMutation.isPending}
            />
          </div>

          <button
            type="submit"
            disabled={!canAllocate || allocateMutation.isPending}
            className="inline-flex items-center gap-2 rounded border border-green-600 bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={14} />
            {allocateMutation.isPending ? '처리 중...' : '예산 추가'}
          </button>
        </form>
      </section>

      {/* ── 예산 현황 목록 ── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">예산 현황</h2>

        {budgetsQuery.isLoading && (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        )}
        {budgetsQuery.isError && (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            예산 목록을 불러오지 못했습니다.
          </div>
        )}

        {budgetsQuery.data && budgetsQuery.data.length === 0 && (
          <p className="text-sm text-gray-400">등록된 예산이 없습니다. 위 폼에서 추가하세요.</p>
        )}

        <div className="space-y-3">
          {(budgetsQuery.data ?? []).map((s) => {
            const pct = pctUsed(s);
            const isExpanded = expandedService === s.serviceKey;
            return (
              <div key={s.serviceKey} className="rounded-lg border border-gray-200 bg-white shadow-sm">
                {/* Summary row */}
                <div className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-gray-900">{serviceLabel(s.serviceKey)}</span>
                      <span className="font-mono text-xs text-gray-400">{s.serviceKey}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                      <span>총 배정 <strong>{s.allocatedAmount.toLocaleString()}P</strong></span>
                      <span>사용 <strong className="text-red-600">{s.usedAmount.toLocaleString()}P</strong></span>
                      <span>잔여 <strong className={s.remainingAmount < 100 ? 'text-red-600' : 'text-green-700'}>{s.remainingAmount.toLocaleString()}P</strong></span>
                    </div>
                    {/* Usage bar */}
                    <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                      <div
                        className={`h-1.5 rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">{pct}% 사용{s.memo && ` · ${s.memo}`}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleService(s.serviceKey)}
                    className="flex items-center gap-1 rounded border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    이력
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>

                {/* Transaction history drawer */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                    {txQuery.isLoading ? (
                      <p className="text-sm text-gray-400">이력 불러오는 중...</p>
                    ) : txQuery.isError ? (
                      <p className="text-sm text-red-600">이력을 불러오지 못했습니다.</p>
                    ) : (
                      <>
                        <div className="overflow-x-auto rounded border border-gray-100">
                          <table className="min-w-full divide-y divide-gray-100 text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium text-gray-600">날짜</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-600">구분</th>
                                <th className="px-3 py-2 text-right font-medium text-gray-600">금액</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-600">메모</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 bg-white">
                              {(txQuery.data?.transactions ?? []).map((tx) => {
                                const badge = txTypeBadge(tx.txType);
                                return (
                                  <tr key={tx.id}>
                                    <td className="whitespace-nowrap px-3 py-1.5 text-gray-500">
                                      {formatDate(tx.createdAt)}
                                    </td>
                                    <td className="px-3 py-1.5">
                                      <span className={`inline-flex rounded-full px-1.5 py-0.5 text-xs font-medium ${badge.cls}`}>
                                        {badge.label}
                                      </span>
                                    </td>
                                    <td className={`whitespace-nowrap px-3 py-1.5 text-right font-medium ${tx.txType === 'allocate' ? 'text-green-700' : 'text-red-600'}`}>
                                      {tx.txType === 'allocate' ? '+' : '-'}{tx.amount.toLocaleString()}P
                                    </td>
                                    <td className="px-3 py-1.5 text-gray-600">
                                      {tx.description ?? '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                              {txQuery.data?.transactions.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                                    이력이 없습니다.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {txQuery.data && txQuery.data.pagination.totalPages > 1 && (
                          <div className="mt-2 flex items-center justify-center gap-2">
                            <button
                              className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                              onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                              disabled={txPage <= 1 || txQuery.isFetching}
                            >
                              이전
                            </button>
                            <span className="text-xs text-gray-500">
                              {txQuery.data.pagination.page} / {txQuery.data.pagination.totalPages}
                            </span>
                            <button
                              className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                              onClick={() => setTxPage((p) => Math.min(txQuery.data!.pagination.totalPages, p + 1))}
                              disabled={txPage >= (txQuery.data?.pagination.totalPages ?? 1) || txQuery.isFetching}
                            >
                              다음
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
