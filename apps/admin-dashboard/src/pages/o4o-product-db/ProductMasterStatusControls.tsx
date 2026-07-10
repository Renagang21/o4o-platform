/**
 * ProductMasterStatusControls — 상품 이용 상태 배지 + 상태 변경 모달
 *
 * WO-O4O-ADMIN-PRODUCT-MASTER-STATUS-ACTIONS-V1
 *
 * 목록/상세 공용. 상태 변경은 단건 PATCH .../:id/status 로만 수행하며,
 * 참여자·공급자·매장·주문·콘텐츠 등 사용처 데이터는 변경하지 않는다(안내 문구로 명시).
 */

import { useState } from 'react';
import {
  setProductMasterStatus,
  PRODUCT_MASTER_STATUS_LABEL,
  type ProductMasterStatus,
  type ProductMasterStatusChangeResult,
} from '@/api/o4o-product-db.api';

const STATUS_TONE: Record<ProductMasterStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  ARCHIVED: 'bg-gray-200 text-gray-600',
};

/** 이용 상태 배지 (목록/상세 공용). status 미전달 시 ACTIVE 로 간주. */
export function ProductMasterStatusBadge({ status }: { status?: ProductMasterStatus }) {
  const s = status ?? 'ACTIVE';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${STATUS_TONE[s]}`}>
      {PRODUCT_MASTER_STATUS_LABEL[s]}
    </span>
  );
}

/** targetStatus 별 모달 문구 */
const TARGET_COPY: Record<ProductMasterStatus, { title: string; guide: string; confirmCls: string; confirmLabel: string }> = {
  SUSPENDED: {
    title: '이용 중단',
    guide:
      '이 상품은 O4O 상품 DB의 검색 및 신규 선택 대상에서 제외됩니다. 기존 참여자 데이터는 자동으로 변경하지 않습니다.',
    confirmCls: 'bg-red-600 hover:bg-red-700',
    confirmLabel: '이용 중단',
  },
  ARCHIVED: {
    title: '보관',
    guide: '이 상품은 데이터 정리 목적으로 일반 검색 및 신규 선택 대상에서 제외됩니다.',
    confirmCls: 'bg-gray-700 hover:bg-gray-800',
    confirmLabel: '보관',
  },
  ACTIVE: {
    title: '정상 복원',
    guide: '이 상품을 다시 정상 상태로 복원합니다. O4O 상품 DB 검색·신규 선택 대상에 다시 포함됩니다.',
    confirmCls: 'bg-admin-blue hover:opacity-90',
    confirmLabel: '정상 복원',
  },
};

export interface StatusModalTarget {
  id: string;
  name: string;
  currentStatus: ProductMasterStatus;
  targetStatus: ProductMasterStatus;
}

/**
 * 상태 변경 확인 모달. target 이 null 이면 닫힘.
 * onDone: 성공 시 호출(목록/상세 새로고침용).
 */
export function ProductMasterStatusModal({
  target,
  onClose,
  onDone,
}: {
  target: StatusModalTarget | null;
  onClose: () => void;
  onDone: (result: ProductMasterStatusChangeResult) => void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!target) return null;
  const copy = TARGET_COPY[target.targetStatus];

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await setProductMasterStatus(target.id, target.targetStatus, reason);
      setReason('');
      onDone(result);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '상태 변경에 실패했습니다');
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (busy) return;
    setReason('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={close}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">상품 {copy.title}</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="text-sm text-gray-800">
            <span className="font-medium">{target.name || '(이름 없음)'}</span>
            <span className="text-gray-400"> 을(를) </span>
            <ProductMasterStatusBadge status={target.currentStatus} />
            <span className="text-gray-400"> → </span>
            <ProductMasterStatusBadge status={target.targetStatus} />
          </div>
          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-2 leading-relaxed">
            {copy.guide}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">사유 {target.targetStatus === 'ACTIVE' ? '(선택)' : '(권장)'}</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 판매 중지 / 회수 / 중복 데이터 정리"
              rows={2}
              maxLength={500}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-y"
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={close} disabled={busy} className="px-4 py-1.5 border border-gray-300 rounded text-sm text-gray-700 disabled:opacity-40">
            취소
          </button>
          <button onClick={submit} disabled={busy} className={`px-4 py-1.5 rounded text-sm text-white disabled:opacity-40 ${copy.confirmCls}`}>
            {busy ? '처리 중…' : copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** 현재 상태 → 가능한 행/상세 액션(targetStatus) 목록. */
export function statusActionsFor(current: ProductMasterStatus): { targetStatus: ProductMasterStatus; label: string }[] {
  if (current === 'ACTIVE') {
    return [
      { targetStatus: 'SUSPENDED', label: '이용 중단' },
      { targetStatus: 'ARCHIVED', label: '보관' },
    ];
  }
  // SUSPENDED | ARCHIVED → 정상 복원
  return [{ targetStatus: 'ACTIVE', label: '정상 복원' }];
}
