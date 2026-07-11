/**
 * ProductDbMaintenancePage — 데이터 정비
 *
 * WO-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-ORPHAN-CANDIDATE-ARCHIVE-DRYRUN-V1
 * 근거 IR: IR-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-REGISTER-MISSING-CANDIDATES-AUDIT-V1
 *
 * 첫 번째 명확한 정비 기능: "등록 완료 고아 후보 정합화" (dry-run).
 * 등록 완료 상태이나 연결 master 가 삭제되어 링크가 끊긴 후보를 확인한다.
 * 이 후보들은 미등록 후보가 아니므로 기본상품 등록 대상에서 분리해야 한다(→ archived).
 * V1 은 dry-run 전용(DB write 0). apply(archived 전환)는 정책 승인 후 후속 WO.
 */

import { useState } from 'react';
import { Settings, AlertTriangle, PlayCircle, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  dryRunOrphanRegisteredCandidates,
  applyOrphanRegisteredCandidates,
  type OrphanCandidateDryRunResult,
} from '@/api/o4o-product-db.api';

const CONFIRMATION_PHRASE = 'ARCHIVE_ORPHAN_REGISTERED_CANDIDATES';

export default function ProductDbMaintenancePage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<OrphanCandidateDryRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDryRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const data = await dryRunOrphanRegisteredCandidates();
      setResult(data);
      toast.success(`Dry-run 완료 — 대상 ${data.targetCount.toLocaleString()}건`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Dry-run 실행에 실패했습니다';
      setError(msg);
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-gray-500" />
        <h2 className="text-lg font-semibold text-gray-800">데이터 정비</h2>
      </div>

      {/* 카드: 등록 완료 고아 후보 정합화 */}
      <div className="border border-gray-200 rounded-lg p-5 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">등록 완료 고아 후보 정합화</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              등록 완료 상태이나 연결된 기본상품이 삭제되어 master 링크가 끊긴 후보를 확인합니다.
              이 후보들은 <strong>미등록 후보가 아니므로</strong> 기본상품 등록 대상에서 제외해야 합니다.
              예상 변경: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">approved_new_master / matched → archived</code>
            </p>
          </div>
          <button
            type="button"
            onClick={runDryRun}
            disabled={running}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-admin-blue text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            Dry-run 실행
          </button>
        </div>

        {/* 주의 문구 */}
        <div className="mt-4 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Dry-run 은 데이터를 변경하지 않습니다(read-only). 실제 archived 전환(apply)은 정책 승인 후 후속 WO 에서 제공합니다.
          </span>
        </div>

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {result && <DryRunResultView result={result} onApplied={runDryRun} />}
      </div>
    </div>
  );
}

function DryRunResultView({
  result,
  onApplied,
}: {
  result: OrphanCandidateDryRunResult;
  onApplied: () => void;
}) {
  return (
    <div className="mt-5 space-y-5">
      {/* 요약 */}
      <div className="flex flex-wrap items-center gap-6">
        <div>
          <div className="text-xs text-gray-500">대상 수</div>
          <div className="text-2xl font-bold text-gray-900">{result.targetCount.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">예상 변경</div>
          <div className="text-sm font-medium text-gray-800">
            {result.proposedChange.from.join(' / ')} → {result.proposedChange.to}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Apply 적격</div>
          <div className={`text-sm font-medium ${result.applyEligible ? 'text-green-700' : 'text-gray-500'}`}>
            {result.applyEligible ? '적격 (드럭 트랙 단일)' : '부적격'}
          </div>
        </div>
      </div>

      {/* 경고 */}
      {result.warnings.length > 0 && (
        <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 space-y-1">
          {result.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* 분포 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <DistTable
          title="상태별 분포"
          rows={result.byStatus.map((r) => ({ label: r.candidateStatus, count: r.count }))}
        />
        <DistTable
          title="source_label 별 분포"
          rows={result.bySourceLabel.map((r) => ({ label: r.sourceLabel ?? '(없음)', count: r.count }))}
        />
      </div>

      {/* 샘플 */}
      <div>
        <div className="text-xs font-medium text-gray-500 mb-2">샘플 (최대 10건)</div>
        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left px-3 py-2 font-medium">상품명</th>
                <th className="text-left px-3 py-2 font-medium">제조사</th>
                <th className="text-left px-3 py-2 font-medium">식별자</th>
                <th className="text-left px-3 py-2 font-medium">현재 상태</th>
                <th className="text-left px-3 py-2 font-medium">변경 후</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.samples.map((s) => (
                <tr key={s.candidateId}>
                  <td className="px-3 py-2 text-gray-800">{s.name || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{s.manufacturerName || '—'}</td>
                  <td className="px-3 py-2 text-gray-600 font-mono text-xs">{s.identifierValue || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{s.before.candidateStatus}</td>
                  <td className="px-3 py-2 text-gray-800 font-medium">{s.after.candidateStatus}</td>
                </tr>
              ))}
              {result.samples.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                    표시할 샘플이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* apply — confirmation 게이트 */}
      <ApplyPanel result={result} onApplied={onApplied} />
    </div>
  );
}

function ApplyPanel({
  result,
  onApplied,
}: {
  result: OrphanCandidateDryRunResult;
  onApplied: () => void;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState<string | null>(null);
  const [applyErr, setApplyErr] = useState<string | null>(null);

  const phrase = result.confirmationPhrase ?? CONFIRMATION_PHRASE;
  const canApply = result.applyEligible && confirmText === phrase && !applying;

  const runApply = async () => {
    if (!canApply) return;
    setApplying(true);
    setApplyMsg(null);
    setApplyErr(null);
    try {
      const r = await applyOrphanRegisteredCandidates(confirmText, result.targetCount);
      const msg = `Apply 완료 — ${r.updated.toLocaleString()}건 archived (chunks ${r.chunks}, ${r.elapsedMs}ms)`;
      setApplyMsg(msg);
      toast.success(msg);
      setConfirmText('');
      onApplied(); // dry-run 재실행 → targetCount 0 확인
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Apply 실행에 실패했습니다';
      setApplyErr(m);
      toast.error(m);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="border-t border-gray-200 pt-5">
      <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Apply 는 <strong>candidate_status 를 archived 로 전환</strong>합니다(되돌리려면 별도 조치 필요).
          ProductMaster/ProductIdentifier 는 변경되지 않습니다. 실행하려면 아래에 확인 문구를 정확히 입력하세요.
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={phrase}
          disabled={!result.applyEligible || applying}
          className="px-3 py-2 text-sm font-mono border border-gray-300 rounded-md w-96 max-w-full disabled:bg-gray-50 disabled:text-gray-400"
        />
        <button
          type="button"
          onClick={runApply}
          disabled={!canApply}
          title={result.applyEligible ? '확인 문구 입력 후 실행' : 'apply 부적격 (드럭 트랙 단일 아님 또는 대상 0)'}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Apply (archived 전환)
        </button>
        <span className="text-xs text-gray-400">
          확인 문구: <code className="bg-gray-100 px-1 py-0.5 rounded">{phrase}</code>
        </span>
      </div>
      {applyMsg && (
        <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          {applyMsg}
        </div>
      )}
      {applyErr && (
        <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {applyErr}
        </div>
      )}
    </div>
  );
}

function DistTable({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-2">{title}</div>
      <div className="border border-gray-200 rounded-md divide-y divide-gray-100">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="text-gray-700 font-mono text-xs">{r.label}</span>
            <span className="text-gray-900 font-medium">{r.count.toLocaleString()}</span>
          </div>
        ))}
        {rows.length === 0 && <div className="px-3 py-4 text-center text-gray-400 text-sm">데이터 없음</div>}
      </div>
    </div>
  );
}
