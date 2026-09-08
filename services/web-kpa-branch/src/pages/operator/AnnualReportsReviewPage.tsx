/**
 * AnnualReportsReviewPage — 운영자 신상신고 검수
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-REVIEW-V1 §3 §4 §5 §6 §7
 *
 * 목록(회원·년도·제출일·상태·주요 변경사항·원장 반영여부) + 상세(제출 스냅샷·원장 대비 diff)
 * + 승인 / 보완요청 / 원장 반영 3개 행동만 둔다.
 *
 * 상세는 **제출 당시 스냅샷 그대로** 그린다 — 현재 회원정보를 다시 끌어와 덮지 않는다.
 * 승인과 반영은 별도 행동이다: 승인은 검수 판정, 반영은 원장 쓰기다 (WO §6).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listAnnualReports,
  getAnnualReportDetail,
  approveAnnualReport,
  requestAnnualReportRevision,
  syncAnnualReportToMembership,
  type ReviewListItem,
  type ReviewDetail,
} from '../../lib/api/operatorAnnualReport';
import { REPORT_STATUS_LABEL, type ReportStatus } from '../../lib/api/annualReport';
import { describeApiError as describe } from '../../lib/errors';

const STATUS_FILTERS: Array<{ value: '' | ReportStatus; label: string }> = [
  { value: '', label: '전체' },
  { value: 'submitted', label: '검수대기' },
  { value: 'revision_requested', label: '보완요청' },
  { value: 'approved', label: '승인완료' },
  { value: 'draft', label: '작성중' },
];

const STATUS_CLASS: Record<ReportStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-50 text-blue-700',
  revision_requested: 'bg-amber-50 text-amber-800',
  approved: 'bg-green-50 text-green-700',
};

function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}>
      {REPORT_STATUS_LABEL[status]}
    </span>
  );
}

function fmtDate(v: string | null): string {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('ko-KR');
}

/** 스냅샷 값 표시용. 배열·객체를 통째로 그리지 않고 사람이 읽을 문자열로 만든다. */
function display(v: unknown): string {
  if (v === null || v === undefined || v === '') return '-';
  if (Array.isArray(v)) return v.length ? v.map((x) => String(x)).join(', ') : '-';
  if (typeof v === 'boolean') return v ? '예' : '아니오';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export default function AnnualReportsReviewPage({ slug }: { slug: string }) {
  const [year, setYear] = useState<string>('');
  const [status, setStatus] = useState<'' | ReportStatus>('');
  const [items, setItems] = useState<ReviewListItem[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setListError(null);
    try {
      const rows = await listAnnualReports(slug, {
        year: year ? Number(year) : null,
        status: status || null,
      });
      setItems(rows);
    } catch (e) {
      setItems(null);
      setListError(describe(e));
    }
  }, [slug, year, status]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadDetail = useCallback(
    async (reportId: string) => {
      setSelectedId(reportId);
      setDetail(null);
      setDetailError(null);
      setMessage(null);
      setActionError(null);
      setReason('');
      try {
        setDetail(await getAnnualReportDetail(slug, reportId));
      } catch (e) {
        setDetailError(describe(e));
      }
    },
    [slug],
  );

  /** 행동 하나를 실행하고 목록·상세를 함께 새로고침한다 (상태가 둘 다에 보이므로) */
  async function run(fn: () => Promise<unknown>, ok: string) {
    if (!selectedId) return;
    setBusy(true);
    setMessage(null);
    setActionError(null);
    try {
      await fn();
      setMessage(ok);
      await reload();
      setDetail(await getAnnualReportDetail(slug, selectedId));
      setReason('');
    } catch (e) {
      setActionError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  const steps = useMemo(
    () => (detail ? [...detail.schema.steps].sort((a, b) => a.order - b.order) : []),
    [detail],
  );

  const reportStatus = detail?.report.status;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">신상신고 검수</h1>
      <p className="mt-1 text-sm text-gray-500">
        제출된 신고서를 확인하고 승인하거나 보완을 요청합니다. 승인 후에만 회원정보에 반영할 수 있습니다.
      </p>

      {/* 필터 — 년도 / 상태 2개뿐 */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-600">
          신고년도{' '}
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="전체"
            className="w-28 rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
        <label className="text-sm text-gray-600">
          상태{' '}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | ReportStatus)}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {listError && <p className="mt-4 text-sm text-red-600">{listError}</p>}

      {!listError && items === null && <p className="mt-4 text-sm text-gray-500">불러오는 중입니다…</p>}

      {items && items.length === 0 && (
        <p className="mt-4 rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
          조건에 맞는 신고서가 없습니다.
        </p>
      )}

      {items && items.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-3">회원</th>
                <th className="py-2 pr-3">신고년도</th>
                <th className="py-2 pr-3">제출일</th>
                <th className="py-2 pr-3">상태</th>
                <th className="py-2 pr-3">주요 변경사항</th>
                <th className="py-2 pr-3">원장 반영</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr
                  key={it.id}
                  className={'border-b border-gray-100 ' + (it.id === selectedId ? 'bg-primary-50' : '')}
                >
                  <td className="py-2 pr-3">
                    <span className="font-medium text-gray-900">{it.member.name ?? '이름 없음'}</span>
                    <span className="ml-2 text-xs text-gray-500">{it.member.email ?? ''}</span>
                  </td>
                  <td className="py-2 pr-3">{it.year}</td>
                  <td className="py-2 pr-3">{fmtDate(it.submittedAt)}</td>
                  <td className="py-2 pr-3">
                    <StatusBadge status={it.status} />
                    {it.revisionRound > 0 && (
                      <span className="ml-1 text-xs text-gray-500">보완 {it.revisionRound}회</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-gray-600">
                    {it.diffUnavailable
                      ? <span className="text-amber-700">{it.diffUnavailable}</span>
                      : it.changedCount === 0
                        ? '변경 없음'
                        : `${it.changedCount}건 · ${it.changedLabels.join(', ')}`}
                  </td>
                  <td className="py-2 pr-3">
                    {it.syncedToMembership ? (
                      <span className="text-green-700">반영됨</span>
                    ) : (
                      <span className="text-gray-400">미반영</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => void loadDetail(it.id)}
                      className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700"
                    >
                      검수
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 상세 검수 */}
      {selectedId && (
        <section className="mt-8 border-t border-gray-200 pt-6">
          {detailError && <p className="text-sm text-red-600">{detailError}</p>}
          {!detail && !detailError && <p className="text-sm text-gray-500">신고서를 불러오는 중입니다…</p>}

          {detail && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  {detail.member.name ?? '이름 없음'} · {detail.report.year}년 신상신고
                </h2>
                <StatusBadge status={detail.report.status} />
                {/* 제출 당시 양식 version — 지금 활성 양식이 아니라 그때 것이다 (WO §4) */}
                <span className="text-xs text-gray-500">
                  제출 양식 v{detail.template.version} · 제출일 {fmtDate(detail.report.submittedAt)}
                </span>
              </div>

              {detail.report.status === 'revision_requested' && (
                <p className="mt-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  보완요청 상태입니다. 사유: {detail.report.revisionReason}
                </p>
              )}
              {detail.report.status === 'approved' && (
                <p className="mt-3 rounded bg-green-50 px-3 py-2 text-sm text-green-800">
                  {fmtDate(detail.report.approvedAt)} 승인되었습니다.
                  {detail.report.syncedToMembership ? ' 회원정보에 반영 완료.' : ' 회원정보 반영은 아직 하지 않았습니다.'}
                </p>
              )}

              {/* 원장 대비 변경 항목 */}
              <div className="mt-5 rounded border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700">회원정보 대비 변경 항목</h3>
                {detail.ledgerDiff.unavailable ? (
                  <p className="mt-2 text-sm text-amber-700">{detail.ledgerDiff.unavailable}</p>
                ) : detail.ledgerDiff.changes.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">변경되는 항목이 없습니다.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm">
                    {detail.ledgerDiff.changes.map((c) => (
                      <li key={c.key} className="text-gray-700">
                        <span className="font-medium">{c.label}</span>{' '}
                        <span className="text-gray-400 line-through">{display(c.before)}</span>{' '}
                        <span aria-hidden>→</span> <span className="text-gray-900">{display(c.after)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {detail.ledgerDiff.invalid.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-red-600">
                    {detail.ledgerDiff.invalid.map((i) => (
                      <li key={i.key}>{i.message}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 제출 스냅샷 */}
              <div className="mt-5 space-y-4">
                {steps.map((st) => {
                  const fields = detail.schema.fields
                    .filter((f) => f.step === st.key)
                    .sort((a, b) => a.order - b.order);
                  if (fields.length === 0) return null;
                  return (
                    <div key={st.key} className="rounded border border-gray-200 p-4">
                      <h3 className="text-sm font-semibold text-gray-700">{st.title}</h3>
                      <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                        {fields.map((f) => (
                          <div key={f.key} className="flex gap-2">
                            <dt className="min-w-[9rem] shrink-0 text-gray-500">{f.label}</dt>
                            <dd className="text-gray-900">{display(detail.values[f.key])}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  );
                })}
              </div>

              {/* 보완요청 이력 */}
              {detail.report.revisionHistory.length > 0 && (
                <div className="mt-5 rounded border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-700">보완요청 이력</h3>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    {detail.report.revisionHistory.map((h) => (
                      <li key={h.round}>
                        {h.round}차 · {fmtDate(h.requestedAt)} · {h.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 행동 */}
              <div className="mt-6 border-t border-gray-200 pt-4">
                {reportStatus === 'submitted' && (
                  <div className="space-y-3">
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      maxLength={1000}
                      placeholder="보완요청 사유 (회원에게 그대로 표시됩니다)"
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void run(() => approveAnnualReport(slug, selectedId), '승인했습니다.')}
                        className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                      >
                        승인
                      </button>
                      <button
                        type="button"
                        disabled={busy || !reason.trim()}
                        onClick={() =>
                          void run(
                            () => requestAnnualReportRevision(slug, selectedId, reason.trim()),
                            '보완을 요청했습니다.',
                          )
                        }
                        className="rounded border border-amber-400 px-4 py-2 text-sm text-amber-800 disabled:opacity-60"
                      >
                        보완요청
                      </button>
                    </div>
                  </div>
                )}

                {reportStatus === 'approved' && !detail.report.syncedToMembership && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(() => syncAnnualReportToMembership(slug, selectedId), '회원정보에 반영했습니다.')
                    }
                    className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    회원정보에 반영
                  </button>
                )}

                {reportStatus === 'revision_requested' && (
                  <p className="text-sm text-gray-500">회원이 수정해 재제출하면 다시 검수할 수 있습니다.</p>
                )}
                {reportStatus === 'draft' && (
                  <p className="text-sm text-gray-500">아직 제출되지 않은 작성중 신고서입니다.</p>
                )}

                {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
                {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
