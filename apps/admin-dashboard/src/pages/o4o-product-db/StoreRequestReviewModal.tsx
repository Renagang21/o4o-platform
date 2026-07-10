/**
 * StoreRequestReviewModal — 매장 신규 상품 등록 요청 검토·처리 (P2)
 *
 * WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (Phase 2)
 *
 * 요청 상세 + 중복 후보(바코드/상품명+제조사) 표시 + 4액션.
 *  - 기존 연결: 중복 후보 master 선택 → link (매장 listing 자동 생성, status=linked)
 *  - 신규 승인: approve-new (store_web 전용 A안, master+identifier+listing, status=approved_new_master)
 *  - 보완 요청: request-revision (note 필수)
 *  - 등록 불가: reject
 */

import { useEffect, useState, useCallback } from 'react';
import { X, Loader2, Package, AlertTriangle, Link2, PlusCircle, MessageSquareWarning, Ban } from 'lucide-react';
import {
  getStoreRequestDuplicates,
  linkStoreRequestToMaster,
  approveStoreRequestAsNewMaster,
  requestStoreRequestRevision,
  rejectStoreRequest,
  type StoreRequestAdminRow,
  type StoreRequestDuplicate,
} from '@/api/store-product-requests-admin.api';

interface Props {
  requestId: string | null;
  request: StoreRequestAdminRow | null;
  open: boolean;
  onClose: () => void;
  onProcessed: () => void;
}

type Busy = 'link' | 'approve' | 'revision' | 'reject' | null;

const ERROR_LABELS: Record<string, string> = {
  DUPLICATE_MASTER_EXISTS: '동일 상품(바코드 또는 상품명+제조사)이 이미 존재합니다. 아래 중복 후보에서 기존 연결을 사용하세요.',
  RX_NEW_MASTER_BLOCKED: '전문의약품은 매장 신규 승인 대상이 아닙니다.',
  RX_LISTING_BLOCKED: '전문의약품은 매장 경영활용 제품으로 연결할 수 없습니다.',
  STATUS_NOT_REVIEWABLE: '이미 처리된 요청입니다. 목록을 새로고침하세요.',
  ALREADY_LINKED: '이미 연결된 요청입니다.',
  CANDIDATE_SERVICE_KEY_MISSING: '요청의 서비스 정보가 없어 처리할 수 없습니다.',
  CANDIDATE_ORG_MISSING: '요청의 매장(조직) 정보가 없어 처리할 수 없습니다.',
  REVISION_NOTE_REQUIRED: '보완 요청 사유를 입력하세요.',
};

function errMsg(e: any): string {
  const code = e?.response?.data?.error?.code || e?.response?.data?.error;
  if (code && ERROR_LABELS[code]) return ERROR_LABELS[code];
  return code || e?.message || '처리에 실패했습니다';
}

export default function StoreRequestReviewModal({ requestId, request, open, onClose, onProcessed }: Props) {
  const [dups, setDups] = useState<StoreRequestDuplicate[]>([]);
  const [dupsLoading, setDupsLoading] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const reviewable = request?.reviewable ?? false;

  const loadDups = useCallback(async () => {
    if (!requestId) return;
    setDupsLoading(true);
    try {
      setDups(await getStoreRequestDuplicates(requestId));
    } catch {
      setDups([]);
    } finally {
      setDupsLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    if (open && requestId) {
      setError(null);
      setNote('');
      setDups([]);
      if (reviewable) loadDups();
    }
  }, [open, requestId, reviewable, loadDups]);

  if (!open || !request) return null;

  const doLink = async (masterId: string) => {
    if (!requestId || busy) return;
    setBusy('link'); setError(null);
    try {
      await linkStoreRequestToMaster(requestId, masterId, note || undefined);
      onProcessed();
    } catch (e) { setError(errMsg(e)); } finally { setBusy(null); }
  };

  const doApproveNew = async () => {
    if (!requestId || busy) return;
    if (!window.confirm('이 요청을 신규 O4O 표준 상품으로 승인하고 요청 매장의 경영활용 제품에 연결합니다. 계속할까요?')) return;
    setBusy('approve'); setError(null);
    try {
      await approveStoreRequestAsNewMaster(requestId, note || undefined);
      onProcessed();
    } catch (e) {
      setError(errMsg(e));
      // 중복 충돌이면 중복 후보를 다시 로드해 기존 연결을 유도
      const code = (e as any)?.response?.data?.error?.code;
      if (code === 'DUPLICATE_MASTER_EXISTS') {
        const serverDups = (e as any)?.response?.data?.data?.duplicates as StoreRequestDuplicate[] | undefined;
        if (serverDups?.length) setDups(serverDups); else loadDups();
      }
    } finally { setBusy(null); }
  };

  const doRevision = async () => {
    if (!requestId || busy) return;
    if (!note.trim()) { setError('보완 요청 사유를 입력하세요.'); return; }
    setBusy('revision'); setError(null);
    try {
      await requestStoreRequestRevision(requestId, note.trim());
      onProcessed();
    } catch (e) { setError(errMsg(e)); } finally { setBusy(null); }
  };

  const doReject = async () => {
    if (!requestId || busy) return;
    if (!window.confirm('이 요청을 등록 불가로 처리합니다. 계속할까요?')) return;
    setBusy('reject'); setError(null);
    try {
      await rejectStoreRequest(requestId, note.trim() || undefined);
      onProcessed();
    } catch (e) { setError(errMsg(e)); } finally { setBusy(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mt-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">등록 요청 검토</h2>
            <p className="text-sm text-gray-500 mt-0.5">{request.displayStatusLabel} · {request.organizationName || request.organizationId?.slice(0, 8) || '매장 미상'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* 요청 상세 */}
          <div className="flex gap-4">
            {request.imageUrl ? (
              <img src={request.imageUrl} alt="" className="w-20 h-20 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0"><Package size={22} className="text-gray-400" /></div>
            )}
            <div className="min-w-0 flex-1 text-sm">
              <div className="text-base font-medium text-gray-900">{request.productName || '—'}</div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-gray-600">
                <div><dt className="inline text-gray-400">분류: </dt><dd className="inline">{request.classification?.label || '—'}</dd></div>
                <div><dt className="inline text-gray-400">바코드: </dt><dd className="inline font-mono">{request.barcode || (request.noBarcode ? '바코드 없음' : '—')}</dd></div>
                <div><dt className="inline text-gray-400">제조/판매원: </dt><dd className="inline">{request.manufacturer || '—'}</dd></div>
                <div><dt className="inline text-gray-400">규격·용량: </dt><dd className="inline">{[request.spec, request.unit].filter(Boolean).join(' ') || '—'}</dd></div>
              </dl>
            </div>
          </div>

          {request.reviewNote && request.displayStatus !== 'reviewing' && (
            <div className="text-sm bg-amber-50 border border-amber-200 rounded p-3 text-amber-800">
              메모: {request.reviewNote}
            </div>
          )}

          {!reviewable ? (
            <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded p-3">
              이 요청은 <b>{request.displayStatusLabel}</b> 상태로, 추가 처리 대상이 아닙니다.
            </div>
          ) : (
            <>
              {/* 중복 후보 */}
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <AlertTriangle size={15} className="text-amber-500" />
                  중복 후보 (기존 O4O 표준 상품)
                  {dupsLoading && <Loader2 size={13} className="animate-spin text-gray-400" />}
                </div>
                {dups.length === 0 ? (
                  <div className="text-sm text-gray-400 bg-gray-50 border border-gray-100 rounded p-3">
                    {dupsLoading ? '확인 중…' : '동일 바코드/상품명+제조사의 기존 상품이 없습니다. 신규 승인 가능합니다.'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dups.map((d) => (
                      <div key={d.id} className="flex items-center gap-3 border border-gray-200 rounded p-2.5">
                        <div className="min-w-0 flex-1 text-sm">
                          <div className="font-medium text-gray-800 truncate">{d.name || '(이름 미상)'}</div>
                          <div className="text-xs text-gray-400">
                            {d.manufacturerName || '제조사 미상'}{d.barcode ? ` · ${d.barcode}` : ''} · {d.matchType === 'barcode' ? '바코드 일치' : '상품명+제조사 일치'}
                          </div>
                        </div>
                        <button
                          onClick={() => doLink(d.id)}
                          disabled={!!busy}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50"
                        >
                          {busy === 'link' ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />} 이 상품에 연결
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 처리 메모 (보완/등록불가 사유, 연결/승인 노트 공용) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">처리 메모 (보완 요청·등록 불가 시 사유)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="보완 요청/등록 불가 사유 또는 승인 메모"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none"
                />
              </div>

              {error && <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded p-3">{error}</div>}

              {/* 액션 */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={doApproveNew}
                  disabled={!!busy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {busy === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />} 신규 상품 승인
                </button>
                <button
                  onClick={doRevision}
                  disabled={!!busy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 disabled:opacity-50"
                >
                  {busy === 'revision' ? <Loader2 size={14} className="animate-spin" /> : <MessageSquareWarning size={14} />} 보완 요청
                </button>
                <button
                  onClick={doReject}
                  disabled={!!busy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 disabled:opacity-50"
                >
                  {busy === 'reject' ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />} 등록 불가
                </button>
              </div>
              <p className="text-xs text-gray-400">
                ※ 기존 상품이 있으면 위 중복 후보에서 <b>연결</b>하세요. 없을 때만 <b>신규 상품 승인</b>을 사용합니다.
                승인·연결 시 요청 매장의 경영활용 제품에 자동 반영됩니다.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
