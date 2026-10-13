import type { ServiceApprovalItem } from '../../lib/api/serviceApproval';
import { getSupplyPolicyBadges, getServiceDisplay } from '../../lib/productConstants';
import { STATUS_BADGE, getRegulatoryBadge, getCompletenessBadge, formatPrice } from './productServiceApprovalPresentation';

interface Props {
  item: ServiceApprovalItem;
  canManage: boolean;
  decisionBusy: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function ProductServiceApprovalDrawer({ item, canManage, decisionBusy, onClose, onApprove, onReject }: Readonly<Props>) {
  const badge = STATUS_BADGE[item.approvalStatus] || { label: item.approvalStatus, bg: 'bg-slate-50', text: 'text-slate-600' };
  const regulatoryBadge = getRegulatoryBadge(item);
  const completenessBadge = getCompletenessBadge(item);
  return (
    <>
      <button type="button" aria-label="상품 상세 배경 닫기" className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <dialog open aria-modal="true" aria-label="상품 상세" className="m-0 p-0 border-0 left-auto fixed right-0 top-0 bottom-0 h-full w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto">
        <div className="p-6">
          {/* Drawer header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">상품 상세</h2>
            <button
              onClick={onClose}
              aria-label="상품 상세 닫기"
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Image */}
          <div className="w-full h-48 rounded-lg overflow-hidden bg-slate-100 mb-6 flex items-center justify-center">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className="w-full h-full object-contain" />
            ) : (
              <div className="text-slate-300 text-sm">이미지 없음</div>
            )}
          </div>

          {/* Info grid */}
          <div className="space-y-4 mb-6">
            <div>
              <div className="text-xs text-slate-400 mb-1">상품명</div>
              <div className="font-medium text-slate-900">{item.productName || '-'}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-400 mb-1">바코드</div>
                <div className="font-mono text-sm text-slate-700">{item.barcode || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">브랜드</div>
                <div className="text-sm text-slate-700">{item.brandName || '-'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-400 mb-1">공급사</div>
                <div className="text-sm text-slate-700">{item.supplierName || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">공급가</div>
                <div className="text-sm font-medium text-slate-700">{formatPrice(item.priceGeneral)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-400 mb-1">서비스</div>
                <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                  {getServiceDisplay(item.serviceKeys) || item.serviceKey}
                </span>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">유통</div>
                <div className="flex flex-wrap gap-1">
                  {getSupplyPolicyBadges(item).map((b) => (
                    <span key={b.label} className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${b.bg} ${b.text}`}>
                      {b.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${badge.bg} ${badge.text}`}>
                  상태: {badge.label}
                </span>
            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${regulatoryBadge.bg} ${regulatoryBadge.text}`}>
                  규제: {regulatoryBadge.label}
                </span>
            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${completenessBadge.bg} ${completenessBadge.text}`}>
                  완성도: {completenessBadge.label} ({item.completenessScore}/100)
                </span>
          </div>

          {/* Completeness detail */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <div className="text-xs font-medium text-slate-500 mb-3">완성도 상세 (각 20점)</div>
            <div className="space-y-2">
              {[
                { label: '공급가 설정', ok: item.priceGeneral != null && item.priceGeneral > 0 },
                { label: '상품 이미지', ok: !!item.imageUrl },
                { label: '간단 소개', ok: item.hasShortDescription },
                { label: '상세 설명', ok: item.hasDetailDescription },
                { label: '유통 타입', ok: !!item.distributionType },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-2 text-sm">
                  <span className={c.ok ? 'text-green-600' : 'text-slate-300'}>{c.ok ? '✓' : '✗'}</span>
                  <span className={c.ok ? 'text-slate-700' : 'text-slate-400'}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Decision reason */}
          {item.reason && (
            <div className={`border rounded-lg p-4 mb-6 ${
              item.approvalStatus === 'rejected'
                ? 'bg-red-50 border-red-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <div className={`text-xs font-medium mb-1 ${
                item.approvalStatus === 'rejected' ? 'text-red-600' : 'text-green-600'
              }`}>
                {item.approvalStatus === 'rejected' ? '거절 사유' : '승인 메모'}
              </div>
              <div className={`text-sm ${
                item.approvalStatus === 'rejected' ? 'text-red-800' : 'text-green-800'
              }`}>{item.reason}</div>
            </div>
          )}

          {/* Date info */}
          <div className="text-xs text-slate-400 mb-6">
            등록일: {new Date(item.createdAt).toLocaleString('ko-KR')}
            {item.decidedAt && (
              <span className="ml-3">처리일: {new Date(item.decidedAt).toLocaleString('ko-KR')}</span>
            )}
          </div>

          {/* Drawer actions */}
          {item.approvalStatus === 'pending' && (
            <div className="flex gap-3">
              <button
                onClick={() => onApprove(item.id)}
                disabled={!canManage || decisionBusy}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                승인
              </button>
              <button
                onClick={() => onReject(item.id)}
                disabled={!canManage || decisionBusy}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                거절
              </button>
            </div>
          )}
        </div>
      </dialog>
    </>

  );
}
