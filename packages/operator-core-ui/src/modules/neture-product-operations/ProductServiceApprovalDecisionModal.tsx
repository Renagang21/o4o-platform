import type { RefObject } from 'react';
import { OperatorDialog } from '../../common/operation-support';
import type { ServiceApprovalDecision } from './serviceApprovalDecisionResult';

const REJECT_TEMPLATES = [
  '상품 이미지가 없습니다. 이미지를 추가한 후 다시 요청해 주세요.',
  '상품 설명이 부족합니다. 간단 소개와 상세 설명을 작성해 주세요.',
  '가격 정보가 누락되었습니다. 공급가를 설정해 주세요.',
  '상품 정보가 불완전합니다. 완성도를 높인 후 재요청 바랍니다.',
  '규제 정보 확인이 필요합니다. MFDS 허가번호를 입력해 주세요.',
];

interface Props {
  fallbackFocus: RefObject<HTMLElement | null>;
  decision: ServiceApprovalDecision; batch: boolean; count: number;
  value: string; error: string | null; busy: boolean; canManage: boolean;
  onChange: (value: string) => void; onCancel: () => void; onConfirm: () => void;
}

/** 입력/표시만 담당한다. 요청과 입력 보존·중복 전송 방어는 부모가 소유한다. */
export function ProductServiceApprovalDecisionModal({ fallbackFocus, decision, batch, count, value, error, busy, canManage, onChange, onCancel, onConfirm }: Readonly<Props>) {
  const reject = decision === 'reject';
  const action = reject ? '거절' : '승인';
  const singleTitle = reject ? '승인 거절' : '상품 승인';
  const title = batch ? `일괄 ${action} (${count}건)` : singleTitle;
  const singleDescription = reject ? '이 상품의 서비스 승인을 거절합니다.' : '이 상품의 서비스 승인을 처리합니다.';
  const description = batch ? `선택한 승인대기 상품을 일괄 ${action}합니다.` : singleDescription;
  return (
    <OperatorDialog label={title} fallbackFocus={fallbackFocus} busy={busy} onCancel={onCancel} className="bg-white rounded-lg p-6 max-w-md">
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-4">
          {description}
        </p>
        {reject && <div className="flex flex-wrap gap-1.5 mb-3">
          {REJECT_TEMPLATES.map((tpl) => <button key={tpl} onClick={() => onChange(tpl)} disabled={busy}
            className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-xs hover:bg-slate-200 text-left">
            {tpl.length > 30 ? tpl.slice(0, 30) + '…' : tpl}
          </button>)}
        </div>}
        <textarea data-dialog-initial-focus aria-label={reject ? '거절 사유' : '승인 메모'} value={value} onChange={(e) => onChange(e.target.value)} disabled={busy}
          placeholder={reject ? '거절 사유를 입력하세요 (선택)' : '승인 메모를 입력하세요 (선택)'}
          className={`w-full border border-slate-300 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 ${reject ? 'focus:ring-blue-500' : 'focus:ring-green-500'}`} />
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} disabled={busy} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200">취소</button>
          <button onClick={onConfirm} disabled={busy || !canManage}
            className={`px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 ${reject ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
            {reject ? '거절 확인' : '승인 확인'}
          </button>
        </div>
      </OperatorDialog>
  );
}
