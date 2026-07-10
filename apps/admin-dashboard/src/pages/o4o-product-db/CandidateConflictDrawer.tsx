/**
 * CandidateConflictDrawer — 공공데이터 후보 충돌 상세 + 처리 액션
 *
 * WO-O4O-ADMIN-PRODUCT-CANDIDATE-CONFLICT-ACTIONS-V1
 *
 * conflict(및 일반) 후보의 충돌 근거를 보여주고 안전 처리 액션을 제공한다.
 *  - 충돌 근거: 동일 식별자 후보 + 일치 ProductMaster + rawPayload 요약 (read-only 계산)
 *  - 처리: archive / ignore(rejected) / manual_review(reviewing) — hard delete 없음
 *  - 수동 매칭: 기존 ProductMaster 검색 → 연결 (candidate 만 갱신, master 무변경)
 * 모든 쓰기 액션은 ConfirmActionDialog 확인을 거친다.
 */

import { useEffect, useState, useCallback } from 'react';
import { BaseDetailDrawer, ConfirmActionDialog } from '@o4o/ui';
import { Search, Link2, PackagePlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  getCandidateConflictInfo,
  bulkCandidateAction,
  manualMatchCandidate,
  promoteCandidateToMaster,
  listProductMasters,
  type CandidateConflictInfo,
  type CandidateBulkAction,
  type ProductMasterRow,
} from '@/api/o4o-product-db.api';
// WO-O4O-ADMIN-PUBLIC-DATA-CANDIDATE-CLOSED-STATUS-AND-MATCH-BADGE-CLEANUP-V1
import { matchStatusBusinessLabel, isConflictCandidate } from './candidate-status.util';

interface Props {
  candidateId: string | null;
  open: boolean;
  onClose: () => void;
  /** 처리(상태변경/매칭) 성공 시 호출 — 목록 갱신 */
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

  // 수동 매칭 검색
  const [matchOpen, setMatchOpen] = useState(false);
  const [masterTerm, setMasterTerm] = useState('');
  const [masterQuery, setMasterQuery] = useState('');
  const [masters, setMasters] = useState<ProductMasterRow[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);

  useEffect(() => {
    if (!open || !candidateId) return;
    let cancelled = false;
    setLoading(true); setError(null); setInfo(null);
    setMatchOpen(false); setMasterTerm(''); setMasterQuery(''); setMasters([]);
    getCandidateConflictInfo(candidateId)
      .then((d) => { if (!cancelled) setInfo(d); })
      .catch((e: any) => { if (!cancelled) setError(e?.response?.data?.error || e?.message || '충돌 정보를 불러오지 못했습니다'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, candidateId]);

  // 수동 매칭 검색 debounce
  useEffect(() => {
    const h = setTimeout(() => setMasterQuery(masterTerm.trim()), 350);
    return () => clearTimeout(h);
  }, [masterTerm]);

  useEffect(() => {
    if (!matchOpen) return;
    let cancelled = false;
    setMasterLoading(true);
    listProductMasters({ q: masterQuery || undefined, page: 1, limit: 20 })
      .then((r) => { if (!cancelled) setMasters(r.items); })
      .catch(() => { if (!cancelled) setMasters([]); })
      .finally(() => { if (!cancelled) setMasterLoading(false); });
    return () => { cancelled = true; };
  }, [matchOpen, masterQuery]);

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

  const askMatch = (master: ProductMasterRow) => {
    if (!candidateId) return;
    setConfirm({
      title: '기본상품에 수동 매칭',
      message: `이 후보를 다음 기본상품에 연결합니다: "${master.name}" (${master.barcode || '바코드 없음'}). 기본상품 정보는 변경하지 않습니다. 계속할까요?`,
      confirmText: '매칭',
      variant: 'default',
      run: async () => { await manualMatchCandidate(candidateId, master.id); },
    });
  };

  const askPromote = () => {
    if (!candidateId || !c) return;
    setConfirm({
      title: '신규 기본상품으로 승격',
      message: `이 후보를 신규 기본상품(ProductMaster)으로 생성합니다.\n\n생성될 정보:\n상품명: ${c.candidateName || '—'}\n제조/업체: ${c.candidateManufacturer || '—'}\n식별자/바코드: ${c.identifierValue || '—'}\n규격: ${c.candidateSpec || '—'}\n\n이 작업은 ProductMaster 와 필요한 ProductIdentifier 를 생성합니다(중복 시 기존 연결·충돌 시 중단). 원천 rawPayload 는 삭제되지 않으며 기본상품 정보는 별도 변경하지 않습니다. 계속할까요?`,
      confirmText: '승격',
      variant: 'default',
      run: async () => {
        const r = await promoteCandidateToMaster(candidateId);
        if (r.outcome === 'create') toast.success('신규 기본상품이 생성되었습니다');
        else if (r.outcome === 'link') toast.success('동일 식별자 기본상품에 연결되었습니다');
        else if (r.outcome === 'conflict') toast.error(`승격 충돌: ${r.conflictReason || '식별자 불일치'} (생성 안 함)`);
        else toast(`승격 건너뜀: ${r.skipReason || '자격 미달'}`);
      },
    });
  };

  const c = info?.candidate;
  // WO-...-CLOSED-STATUS-AND-MATCH-BADGE-CLEANUP-V1:
  //   식별자가 없는 후보(예: 의료기기)는 식별자 기반 충돌/매칭 영역을 숨긴다.
  //   실제 충돌 후보만 제목에 '충돌 검토' 를 붙인다.
  const hasIdentifier = !!(info?.conflictKey.identifierValue || info?.conflictKey.normalizedIdentifierValue);
  const conflictReview = isConflictCandidate(c?.matchStatus);

  return (
    <>
      <BaseDetailDrawer
        open={open}
        onClose={onClose}
        width={640}
        title={<span className="text-base font-semibold">{conflictReview ? '후보 상세 · 충돌 검토' : '후보 상세'}</span>}
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
            {/* A. 기본 정보 */}
            <Section title="후보 기본 정보">
              <Field label="상품명" value={c.candidateName} strong />
              <Field label="제조/업체" value={c.candidateManufacturer} />
              <Field label="분류" value={c.candidateCategory} />
              <Field label="source" value={`${c.sourceType}${c.sourceLabel ? ` · ${c.sourceLabel}` : ''}`} />
              <Field label="후보 상태" value={c.candidateStatus} badge />
              {/* 종료 후보는 매칭 표시 숨김, 등록 전 후보는 업무 의미 문구 */}
              <Field label="기본상품 매칭" value={matchStatusBusinessLabel(c.candidateStatus, c.matchStatus)} badge />
              <Field label="생성일" value={c.createdAt?.slice(0, 10)} />
            </Section>

            {/* B. 주요 원천값 — 식별자 필드는 식별자가 있는 후보에서만 표시 */}
            <Section title="주요 원천값">
              {hasIdentifier && (
                <>
                  <Field label="식별자 유형" value={info.conflictKey.identifierType} />
                  <Field label="식별자 값" value={info.conflictKey.identifierValue} mono />
                  <Field label="정규화 식별자" value={info.conflictKey.normalizedIdentifierValue} mono />
                </>
              )}
              {Object.entries(info.rawPayloadSummary).slice(0, 12).map(([k, v]) => (
                <Field key={k} label={k} value={String(v)} />
              ))}
            </Section>

            {/* C. 식별자 기반 충돌/매칭 근거 — 식별자가 없는 후보(예: 의료기기)에서는 숨긴다 */}
            {hasIdentifier && (
              <>
                <Section title={`동일 식별자 다른 후보 (${info.conflictingCandidates.length})`}>
                  {info.conflictingCandidates.length === 0 ? (
                    <div className="text-gray-400 text-xs">동일 식별자를 공유하는 다른 후보가 없습니다.</div>
                  ) : (
                    <MiniTable
                      head={['상품명', '제조사', '후보상태', '매칭상태', 'source']}
                      rows={info.conflictingCandidates.map((x) => [
                        x.candidateName || '—', x.candidateManufacturer || '—', x.candidateStatus, x.matchStatus, x.sourceLabel || '—',
                      ])}
                    />
                  )}
                </Section>

                <Section title={`식별자 일치 기본상품 (${info.possibleMasters.length})`}>
                  {info.possibleMasters.length === 0 ? (
                    <div className="text-gray-400 text-xs">바코드/식별자가 일치하는 기존 기본상품이 없습니다.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {info.possibleMasters.map((m) => (
                        <div key={m.id} className="flex items-center justify-between border border-gray-200 rounded px-3 py-2">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{m.name}</div>
                            <div className="text-xs text-gray-500 truncate">{m.manufacturerName} · <span className="font-mono">{m.barcode}</span></div>
                          </div>
                          <button
                            onClick={() => askMatch(m as unknown as ProductMasterRow)}
                            className="shrink-0 ml-2 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-admin-blue text-white"
                          >
                            <Link2 size={12} /> 매칭
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              </>
            )}

            {/* 수동 매칭 검색 */}
            <Section title="기본상품 수동 매칭">
              {!matchOpen ? (
                <button onClick={() => setMatchOpen(true)} className="flex items-center gap-1 text-xs px-3 py-1.5 border border-admin-blue text-admin-blue rounded">
                  <Search size={13} /> 기존 기본상품 검색
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={masterTerm}
                      onChange={(e) => setMasterTerm(e.target.value)}
                      placeholder="상품명 / 바코드 / 제조사"
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded text-sm"
                      autoFocus
                    />
                  </div>
                  {masterLoading ? (
                    <div className="text-gray-400 text-xs py-2">검색 중…</div>
                  ) : masters.length === 0 ? (
                    <div className="text-gray-400 text-xs py-2">{masterQuery ? '검색 결과가 없습니다' : '검색어를 입력하세요'}</div>
                  ) : (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {masters.map((m) => (
                        <div key={m.id} className="flex items-center justify-between border border-gray-200 rounded px-3 py-2">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{m.name}</div>
                            <div className="text-xs text-gray-500 truncate">{m.manufacturerName} · <span className="font-mono">{m.barcode || '—'}</span></div>
                          </div>
                          <button onClick={() => askMatch(m)} className="shrink-0 ml-2 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-admin-blue text-white">
                            <Link2 size={12} /> 매칭
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Section>

            {/* 신규 ProductMaster 승격 (drug 소스만) */}
            <Section title="신규 기본상품 승격">
              {info.promotable?.eligible ? (
                <button onClick={askPromote} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded bg-admin-blue text-white">
                  <PackagePlus size={14} /> 신규 기본상품으로 승격
                </button>
              ) : (
                <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-2.5">
                  {info.promotable?.reason === 'NOT_DRUG_SOURCE'
                    ? '이 후보 유형(의료기기·의약외품·건강기능식품·e약은요 등)은 신규 승격을 지원하지 않습니다. 현재 승격 파이프라인은 의약품 표준코드 전용이며, 비-의약품 승격은 별도 트랙(후속 WO)에서 처리합니다. 기존 기본상품 수동 매칭 또는 보류/제외/archive 로 처리하세요.'
                    : info.promotable?.reason === 'ALREADY_MATCHED' || info.promotable?.reason === 'ALREADY_LINKED'
                      ? '이미 매칭/연결된 후보입니다.'
                      : '현재 상태(pending/reviewing·unmatched)가 아니어서 승격할 수 없습니다.'}
                </div>
              )}
            </Section>

            {/* D. rawPayload 전체 (접힘) */}
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

function MiniTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto border border-gray-200 rounded">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50">
          <tr>{head.map((h) => <th key={h} className="px-2 py-1.5 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r, i) => (
            <tr key={i}>{r.map((cell, j) => <td key={j} className="px-2 py-1.5 text-gray-700 whitespace-nowrap max-w-[10rem] truncate" title={cell}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
