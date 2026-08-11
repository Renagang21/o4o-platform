/**
 * CandidateConflictDrawer — 공공데이터 후보 상세 + 처리 액션
 *
 * WO-O4O-PUBLIC-DATA-CANDIDATE-LEGACY-MASTER-MATCHING-REMOVAL-V1
 *   기존 ProductMaster 사전 매칭(자동/수동/재매칭·동일 식별자 후보·식별자 일치 기본상품) UI 를 제거.
 *   후보 상세는 원천 정보 + 원천 식별자 + rawPayload + 등록(승격)/제외 액션만 제공한다.
 *   중복 방지는 승격(등록) 트랜잭션 내부 dedup 이 담당한다(운영자 사전 매칭 없음).
 *  - 처리: archive / ignore(rejected) / manual_review(reviewing) — hard delete 없음
 *  - 등록: 신규 기본상품 승격(drug 소스만, 내부 dedup) → 신규 생성 또는 기존 동일 코드 상품에 연결
 * 모든 쓰기 액션은 ConfirmActionDialog 확인을 거친다.
 */

import { useEffect, useState, useCallback } from 'react';
import { BaseDetailDrawer, ConfirmActionDialog } from '@o4o/ui';
import { PackagePlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useProductDbWriteAccess } from './useProductDbWriteAccess';
import {
  getCandidateConflictInfo,
  bulkCandidateAction,
  promoteCandidateToMaster,
  type CandidateConflictInfo,
  type CandidateBulkAction,
} from '@/api/o4o-product-db.api';

interface Props {
  candidateId: string | null;
  open: boolean;
  onClose: () => void;
  /** 처리(상태변경/등록) 성공 시 호출 — 목록 갱신 */
  onProcessed: () => void;
}

interface ConfirmState {
  title: string;
  message: string;
  confirmText: string;
  variant: 'default' | 'danger' | 'warning';
  run: () => Promise<void>;
}

export default function CandidateConflictDrawer({ candidateId, open, onClose, onProcessed }: Props) {
  const [info, setInfo] = useState<CandidateConflictInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !candidateId) return;
    let cancelled = false;
    setLoading(true); setError(null); setInfo(null);
    getCandidateConflictInfo(candidateId)
      .then((d) => { if (!cancelled) setInfo(d); })
      .catch((e: any) => { if (!cancelled) setError(e?.response?.data?.error || e?.message || '후보 정보를 불러오지 못했습니다'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, candidateId]);

  const runConfirmed = useCallback(async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await confirm.run();
      setConfirm(null);
      onProcessed();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '처리에 실패했습니다');
    } finally {
      setBusy(false);
    }
  }, [confirm, onProcessed, onClose]);

  const askBulk = (action: CandidateBulkAction) => {
    if (!candidateId) return;
    const map: Record<CandidateBulkAction, { title: string; message: string; variant: ConfirmState['variant']; confirmText: string }> = {
      archive: { title: 'archive 처리', message: '이 후보를 archive 처리합니다. 원천 데이터(rawPayload)는 삭제되지 않으며, 기본 목록에서 정리 상태로 전환됩니다. 계속할까요?', variant: 'warning', confirmText: 'archive' },
      ignore: { title: 'ignored 처리', message: 'O4O 상품화 대상이 아닌 후보로 처리(제외)합니다. 원천 데이터는 삭제되지 않습니다. 계속할까요?', variant: 'warning', confirmText: '제외' },
      manual_review: { title: 'manual review 처리', message: '판단 보류(검토 중) 상태로 표시합니다. 계속할까요?', variant: 'default', confirmText: '보류' },
    };
    const c = map[action];
    setConfirm({ ...c, run: async () => { await bulkCandidateAction([candidateId], action); } });
  };

  const askPromote = () => {
    if (!candidateId || !c) return;
    setConfirm({
      title: '신규 기본상품으로 등록',
      message: `이 후보를 O4O 기본상품(ProductMaster)으로 등록합니다.\n\n등록 정보:\n상품명: ${c.candidateName || '—'}\n제조/업체: ${c.candidateManufacturer || '—'}\n식별자/바코드: ${c.identifierValue || '—'}\n규격: ${c.candidateSpec || '—'}\n\n동일한 공식 식별자의 기본상품이 이미 있으면 신규 생성하지 않고 기존 상품에 연결합니다(중복 방지 dedup). 원천 rawPayload 는 삭제되지 않습니다. 계속할까요?`,
      confirmText: '등록',
      variant: 'default',
      run: async () => {
        const r = await promoteCandidateToMaster(candidateId);
        if (r.outcome === 'create') toast.success('신규 기본상품이 등록되었습니다');
        else if (r.outcome === 'link') toast.success('기존 동일 코드 기본상품에 연결되었습니다');
        else if (r.outcome === 'conflict') toast.error(`등록 충돌: ${r.conflictReason || '식별자 불일치'} (생성 안 함)`);
        else toast(`등록 건너뜀: ${r.skipReason || '자격 미달'}`);
      },
    });
  };

  const c = info?.candidate;
  const canWrite = useProductDbWriteAccess();

  return (
    <>
      <BaseDetailDrawer
        open={open}
        onClose={onClose}
        width={640}
        title={<span className="text-base font-semibold">후보 상세</span>}
        actions={c ? [
          { label: 'archive', variant: 'default', onClick: () => askBulk('archive') },
          { label: '제외(ignored)', variant: 'default', onClick: () => askBulk('ignore') },
          { label: '보류(manual review)', variant: 'default', onClick: () => askBulk('manual_review') },
        ] : []}
      >
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">불러오는 중…</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">{error}</div>
        ) : !info || !c ? null : (
          <div className="space-y-5 text-sm">
            {/* A. 원천 상품 정보 */}
            <Section title="후보 기본 정보">
              <Field label="상품명" value={c.candidateName} strong />
              <Field label="제조/업체" value={c.candidateManufacturer} />
              <Field label="분류" value={c.candidateCategory} />
              <Field label="source" value={`${c.sourceType}${c.sourceLabel ? ` · ${c.sourceLabel}` : ''}`} />
              <Field label="후보 상태" value={c.candidateStatus} badge />
              {/* 등록 결과 링크 (사전 매칭 아님) */}
              <Field label="등록된 O4O 상품 ID" value={c.matchedProductMasterId} mono />
              <Field label="생성일" value={c.createdAt?.slice(0, 10)} />
            </Section>

            {/* B. 원천 식별자 + 주요 원천값 */}
            <Section title="원천 식별자 / 주요 원천값">
              <Field label="식별자 유형" value={info.conflictKey.identifierType} />
              <Field label="식별자 값" value={info.conflictKey.identifierValue} mono />
              <Field label="정규화 식별자" value={info.conflictKey.normalizedIdentifierValue} mono />
              {Object.entries(info.rawPayloadSummary).slice(0, 12).map(([k, v]) => (
                <Field key={k} label={k} value={String(v)} />
              ))}
            </Section>

            {/* 신규 기본상품 등록 (drug 소스만 — 등록 시점 내부 dedup) */}
            {/* WO-O4O-PRODUCT-DB-WRITE-AUTHORITY-BOUNDARY-ALIGNMENT-V1 §5
                후보 큐레이션(archive/제외/보류)은 서비스 경계 안이라 유지하고,
                공통 ProductMaster 를 만드는 승격만 O4O 전체 관리자로 닫는다. */}
            <Section title="신규 기본상품 등록">
              {!canWrite ? (
                <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-2.5">
                  신규 기본상품 등록(승격)은 O4O 전체 관리자가 수행합니다. 후보 검토·보류·제외는 계속 가능합니다.
                </div>
              ) : info.promotable?.eligible ? (
                <button onClick={askPromote} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded bg-admin-blue text-white">
                  <PackagePlus size={14} /> 신규 기본상품으로 등록
                </button>
              ) : (
                <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-2.5">
                  {info.promotable?.reason === 'NOT_DRUG_SOURCE'
                    ? '이 후보 유형(의료기기·의약외품·건강기능식품·e약은요 등)은 신규 등록을 지원하지 않습니다. 현재 등록 파이프라인은 의약품 표준코드 전용이며, 비-의약품 등록은 별도 트랙(후속 WO)에서 처리합니다. 보류/제외/archive 로 처리하세요.'
                    : info.promotable?.reason === 'ALREADY_LINKED'
                      ? '이미 O4O 상품에 등록·연결된 후보입니다.'
                      : '현재 상태(pending/reviewing)가 아니어서 등록할 수 없습니다.'}
                </div>
              )}
            </Section>

            {/* C. rawPayload 전체 (접힘) */}
            {c.rawPayload && (
              <details className="border border-gray-200 rounded p-3">
                <summary className="cursor-pointer text-xs font-semibold text-gray-600">rawPayload 전체 (원천 보존 · 변경 안 함)</summary>
                <pre className="mt-2 text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap max-h-72 overflow-y-auto">
                  {JSON.stringify(c.rawPayload, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </BaseDetailDrawer>

      <ConfirmActionDialog
        open={!!confirm}
        onClose={() => { if (!busy) setConfirm(null); }}
        onConfirm={runConfirmed}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        confirmText={confirm?.confirmText || '확인'}
        variant={confirm?.variant || 'default'}
      />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Field({ label, value, strong, mono, badge }: { label: string; value: string | null | undefined; strong?: boolean; mono?: boolean; badge?: boolean }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-gray-400 w-28 shrink-0">{label}</span>
      {badge ? (
        <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">{value || '—'}</span>
      ) : (
        <span className={`${strong ? 'font-medium text-gray-900' : 'text-gray-700'} ${mono ? 'font-mono text-xs' : ''} break-all`}>{value || '—'}</span>
      )}
    </div>
  );
}
