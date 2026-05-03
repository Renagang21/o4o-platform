/**
 * PointSpendPage
 *
 * WO-O4O-POINT-OPERATOR-UI-V1
 *
 * 운영자 포인트 차감(보상 지급 완료 처리) UI.
 * 정책: docs/point/O4O-POINT-REWARD-OPERATION-POLICY.md
 *   - 차감 = 보상 지급 완료 처리
 *   - description 필수
 *
 * Route: /operator/points
 *
 * 본 단계 범위:
 *   - 차감 폼만 (이력 조회는 admin API 부재로 별도 WO)
 *   - payoutType은 UI 전용 dropdown (description 자동 채움)
 *   - API에는 userId, amount, description만 전송 (sourceType 백엔드 미변경)
 */

import { useState, FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { toast } from 'react-hot-toast';
import { Coins, AlertTriangle } from 'lucide-react';
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

// ── Constants ────────────────────────────────────────────────────────────────

const PAYOUT_TYPES = [
  { value: 'reward_payout_offline', label: '오프라인 보상', description: '오프라인 보상 지급 완료' },
  { value: 'reward_payout_voucher', label: '상품권', description: '상품권 지급 완료' },
  { value: 'reward_payout_survey', label: '설문 참여', description: '설문 참여 보상 정산 완료' },
  { value: 'reward_payout_course', label: '강의 참여', description: '강의 참여 보상 지급 완료' },
  { value: 'reward_payout_other', label: '기타', description: '기타 보상 지급 완료' },
] as const;

type PayoutType = typeof PAYOUT_TYPES[number]['value'];

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
    </div>
  );
}
