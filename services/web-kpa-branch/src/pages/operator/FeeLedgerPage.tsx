/**
 * FeeLedgerPage — 운영자 연회비 정책 · 원장
 * WO-O4O-KPA-BRANCH-ANNUAL-FEE-LEDGER-V1
 *
 * 두 블록만 둔다.
 *   1) 연도 정책  — 회비구분별 부과액 (연도 단위 일괄 저장)
 *   2) 회비 원장  — 회원별 부과·납부 (일괄 부과 + 개별 수정)
 *
 * 하지 않는 것: 배분 · 결제 · 청구서 · 독촉. 이 화면은 단순 원장이다.
 *
 * 상태(미납/일부/완납/면제)를 화면이 계산하지 않는다 — 서버가 준 status 를 그대로 쓴다.
 * 화면이 따로 계산하면 목록의 상태와 저장된 상태가 어긋난다.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listFeePolicies,
  replaceFeePolicies,
  listFeeLedgers,
  assessFeeYear,
  updateFeeLedger,
  feeCategoryLabel,
  FEE_CATEGORIES,
  FEE_STATUS_LABEL,
  FEE_EXEMPTION_LABEL,
  FEE_EXEMPTION_OPTIONS,
  ASSESS_SKIP_LABEL,
  type FeePolicyItem,
  type FeeLedgerItem,
  type FeeLedgerSummary,
  type FeeStatus,
  type FeeExemptionType,
} from '../../lib/api/branchFee';
import { describeApiError as describe } from '../../lib/errors';

const STATUS_FILTERS: Array<{ value: '' | FeeStatus; label: string }> = [
  { value: '', label: '전체' },
  { value: 'unpaid', label: '미납' },
  { value: 'partial', label: '일부납부' },
  { value: 'paid', label: '완납' },
  { value: 'exempt', label: '면제' },
];

const STATUS_CLASS: Record<FeeStatus, string> = {
  unpaid: 'bg-red-50 text-red-700',
  partial: 'bg-amber-50 text-amber-800',
  paid: 'bg-green-50 text-green-700',
  exempt: 'bg-gray-100 text-gray-600',
};

function won(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`;
}

function fmtDate(v: string | null): string {
  return v ? new Date(v).toLocaleDateString('ko-KR') : '-';
}

/** `Date` → `yyyy-MM-dd` (date input 용). 타임존 보정 없이 로컬 날짜를 쓴다 */
function toDateInput(v: string | null): string {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function StatusBadge({ status }: { status: FeeStatus }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}>
      {FEE_STATUS_LABEL[status]}
    </span>
  );
}

/** 정책 편집 행. 금액은 문자열로 들고 있다가 저장 시점에 숫자로 바꾼다 */
interface PolicyDraft {
  feeCategory: string;
  amount: string;
  memo: string;
}

export default function FeeLedgerPage({ slug }: { slug: string }) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(thisYear);

  // ── 정책 ──
  const [policies, setPolicies] = useState<PolicyDraft[] | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [policyMessage, setPolicyMessage] = useState<string | null>(null);

  // ── 원장 ──
  const [status, setStatus] = useState<'' | FeeStatus>('');
  const [ledgers, setLedgers] = useState<FeeLedgerItem[] | null>(null);
  const [summary, setSummary] = useState<FeeLedgerSummary | null>(null);
  const [ledgerError, setLedgerError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 개별 수정 중인 행
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    assessedAmount: string;
    paidAmount: string;
    paidAt: string;
    exempt: boolean;
    exemptionType: '' | FeeExemptionType;
    exemptionReason: string;
    memo: string;
  } | null>(null);

  const loadPolicies = useCallback(async () => {
    setPolicyError(null);
    try {
      const rows = await listFeePolicies(slug, year);
      setPolicies(rows.map((r) => ({ feeCategory: r.feeCategory, amount: String(r.amount), memo: r.memo ?? '' })));
    } catch (e) {
      setPolicies(null);
      setPolicyError(describe(e));
    }
  }, [slug, year]);

  const loadLedgers = useCallback(async () => {
    setLedgerError(null);
    try {
      const res = await listFeeLedgers(slug, { year, status: status || null });
      setLedgers(res.items);
      setSummary(res.summary);
    } catch (e) {
      setLedgers(null);
      setSummary(null);
      setLedgerError(describe(e));
    }
  }, [slug, year, status]);

  useEffect(() => {
    void loadPolicies();
  }, [loadPolicies]);

  useEffect(() => {
    void loadLedgers();
  }, [loadLedgers]);

  const yearOptions = useMemo(
    () => [thisYear + 1, thisYear, thisYear - 1, thisYear - 2, thisYear - 3],
    [thisYear],
  );

  /** 아직 정책에 없는 회비구분만 추가 후보로 낸다 (중복은 서버가 422 로 막는다) */
  const addablecategories = useMemo(() => {
    const used = new Set((policies ?? []).map((p) => p.feeCategory));
    return FEE_CATEGORIES.filter((c) => !used.has(c.value));
  }, [policies]);

  async function savePolicies() {
    if (!policies) return;
    setBusy(true);
    setPolicyError(null);
    setPolicyMessage(null);
    try {
      const items: FeePolicyItem[] = policies.map((p) => ({
        feeCategory: p.feeCategory,
        amount: Number(p.amount || 0),
        memo: p.memo.trim() || null,
      }));
      const saved = await replaceFeePolicies(slug, year, items);
      setPolicies(saved.map((r) => ({ feeCategory: r.feeCategory, amount: String(r.amount), memo: r.memo ?? '' })));
      setPolicyMessage(`${year}년 회비 정책 ${saved.length}건을 저장했습니다.`);
    } catch (e) {
      setPolicyError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  async function runAssess() {
    setBusy(true);
    setActionError(null);
    setMessage(null);
    try {
      const res = await assessFeeYear(slug, year);
      const counts = res.skipped.reduce<Record<string, number>>((acc, s) => {
        acc[s.reason] = (acc[s.reason] ?? 0) + 1;
        return acc;
      }, {});
      const skipText = Object.entries(counts)
        .map(([reason, n]) => `${ASSESS_SKIP_LABEL[reason as keyof typeof ASSESS_SKIP_LABEL] ?? reason} ${n}명`)
        .join(' · ');
      setMessage(
        `대상 ${res.targetCount}명 중 ${res.created}명 부과했습니다.` + (skipText ? ` (제외: ${skipText})` : ''),
      );
      await loadLedgers();
    } catch (e) {
      setActionError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(row: FeeLedgerItem) {
    setEditId(row.id);
    setActionError(null);
    setMessage(null);
    setEditDraft({
      assessedAmount: String(row.assessedAmount),
      paidAmount: String(row.paidAmount),
      paidAt: toDateInput(row.paidAt),
      exempt: row.status === 'exempt',
      exemptionType: row.exemptionType ?? '',
      exemptionReason: row.exemptionReason ?? '',
      memo: row.memo ?? '',
    });
  }

  async function saveEdit(row: FeeLedgerItem) {
    if (!editDraft) return;
    setBusy(true);
    setActionError(null);
    setMessage(null);
    try {
      const paid = Number(editDraft.paidAmount || 0);
      await updateFeeLedger(slug, row.id, {
        assessedAmount: Number(editDraft.assessedAmount || 0),
        paidAmount: paid,
        // 납부액이 0 이면 납부일은 서버가 지운다 — 보내지 않는다
        ...(paid > 0 ? { paidAt: editDraft.paidAt || null } : {}),
        exempt: editDraft.exempt,
        // 면제가 아니면 사유를 보내지 않는다 — 서버가 지운다 (WO §3)
        ...(editDraft.exempt
          ? {
              exemptionType: editDraft.exemptionType || null,
              exemptionReason:
                editDraft.exemptionType === 'other' ? editDraft.exemptionReason : null,
            }
          : {}),
        memo: editDraft.memo,
      });
      setEditId(null);
      setEditDraft(null);
      setMessage(`${row.memberName ?? '회원'} 님의 회비를 저장했습니다.`);
      await loadLedgers();
    } catch (e) {
      setActionError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">연회비 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            분회 회원의 연도별 회비를 부과하고 납부 사실을 기록합니다. 결제·정산 기능은 없습니다.
          </p>
        </div>
        <label className="text-sm text-gray-600">
          연도{' '}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="ml-1 rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
        </label>
      </header>

      {/* ── 1) 연도 정책 ─────────────────────────────────────────────── */}
      <section className="rounded border border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-800">{year}년 회비 정책</h2>
          <button
            type="button"
            disabled={busy || !policies}
            onClick={() => void savePolicies()}
            className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            정책 저장
          </button>
        </div>

        <div className="p-4">
          {policyError && (
            <p className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{policyError}</p>
          )}
          {policyMessage && (
            <p className="mb-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              {policyMessage}
            </p>
          )}

          {policies === null ? (
            <p className="text-sm text-gray-500">불러오는 중입니다…</p>
          ) : policies.length === 0 ? (
            <p className="text-sm text-gray-500">
              {year}년 정책이 없습니다. 아래에서 회비구분을 추가한 뒤 저장해 주세요.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="py-2">회비구분</th>
                  <th className="py-2">연 부과액(원)</th>
                  <th className="py-2">메모</th>
                  <th className="py-2 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p, idx) => (
                  <tr key={p.feeCategory} className="border-b border-gray-100">
                    <td className="py-2 text-gray-800">{feeCategoryLabel(p.feeCategory)}</td>
                    <td className="py-2">
                      <input
                        type="number"
                        min={0}
                        value={p.amount}
                        onChange={(e) =>
                          setPolicies((prev) =>
                            (prev ?? []).map((it, i) => (i === idx ? { ...it, amount: e.target.value } : it)),
                          )
                        }
                        className="w-32 rounded border border-gray-300 px-2 py-1"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="text"
                        value={p.memo}
                        onChange={(e) =>
                          setPolicies((prev) =>
                            (prev ?? []).map((it, i) => (i === idx ? { ...it, memo: e.target.value } : it)),
                          )
                        }
                        className="w-full rounded border border-gray-300 px-2 py-1"
                        placeholder="예: 2026 정기총회 의결"
                      />
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setPolicies((prev) => (prev ?? []).filter((_, i) => i !== idx))}
                        className="text-xs text-gray-500 hover:text-red-600"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {addablecategories.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <select
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  setPolicies((prev) => [...(prev ?? []), { feeCategory: v, amount: '0', memo: '' }]);
                }}
                className="rounded border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="">+ 회비구분 추가</option>
                {addablecategories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-500">저장하면 이 목록이 {year}년 정책 전체가 됩니다.</span>
            </div>
          )}
        </div>
      </section>

      {/* ── 2) 회비 원장 ─────────────────────────────────────────────── */}
      <section className="rounded border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-800">{year}년 회비 원장</h2>
          <div className="flex items-center gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as '' | FeeStatus)}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAssess()}
              className="rounded border border-primary-600 px-3 py-1.5 text-sm font-medium text-primary-700 disabled:opacity-50"
            >
              {year}년 일괄 부과
            </button>
          </div>
        </div>

        <div className="p-4">
          {actionError && (
            <p className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>
          )}
          {message && (
            <p className="mb-3 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</p>
          )}
          {ledgerError && (
            <p className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{ledgerError}</p>
          )}

          {summary && (
            <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: '대상', value: `${summary.count}명` },
                { label: '부과 합계', value: won(summary.assessed) },
                { label: '납부 합계', value: won(summary.paid) },
                { label: '미수금', value: won(summary.outstanding) },
              ].map((s) => (
                <div key={s.label} className="rounded border border-gray-200 p-3">
                  <dt className="text-xs text-gray-500">{s.label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {ledgers === null ? (
            <p className="text-sm text-gray-500">불러오는 중입니다…</p>
          ) : ledgers.length === 0 ? (
            <p className="text-sm text-gray-500">
              해당 조건의 회비 원장이 없습니다. 정책을 등록한 뒤 «{year}년 일괄 부과» 를 실행해 주세요.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                    <th className="py-2">회원</th>
                    <th className="py-2">회비구분</th>
                    <th className="py-2 text-right">부과액</th>
                    <th className="py-2 text-right">납부액</th>
                    <th className="py-2 text-right">미수금</th>
                    <th className="py-2">납부일</th>
                    <th className="py-2">상태</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {ledgers.map((row) =>
                    editId === row.id && editDraft ? (
                      <tr key={row.id} className="border-b border-gray-100 bg-amber-50/40 align-top">
                        <td className="py-2">
                          <div className="font-medium text-gray-900">{row.memberName ?? '-'}</div>
                          <div className="text-xs text-gray-500">{row.memberEmail ?? ''}</div>
                        </td>
                        <td className="py-2 text-gray-600">{feeCategoryLabel(row.feeCategory)}</td>
                        <td className="py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            value={editDraft.assessedAmount}
                            onChange={(e) => setEditDraft({ ...editDraft, assessedAmount: e.target.value })}
                            className="w-28 rounded border border-gray-300 px-2 py-1 text-right"
                          />
                        </td>
                        <td className="py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            value={editDraft.paidAmount}
                            onChange={(e) => setEditDraft({ ...editDraft, paidAmount: e.target.value })}
                            className="w-28 rounded border border-gray-300 px-2 py-1 text-right"
                          />
                        </td>
                        <td className="py-2 text-right text-gray-400">-</td>
                        <td className="py-2">
                          <input
                            type="date"
                            value={editDraft.paidAt}
                            onChange={(e) => setEditDraft({ ...editDraft, paidAt: e.target.value })}
                            className="rounded border border-gray-300 px-2 py-1"
                          />
                        </td>
                        <td className="py-2">
                          <label className="flex items-center gap-1 text-xs text-gray-700">
                            <input
                              type="checkbox"
                              checked={editDraft.exempt}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  exempt: e.target.checked,
                                  // 면제를 풀면 사유도 함께 비운다 (서버·DB 계약과 같은 방향)
                                  ...(e.target.checked ? {} : { exemptionType: '' as const, exemptionReason: '' }),
                                })
                              }
                            />
                            면제
                          </label>
                          {/* 면제 사유는 면제일 때만 묻는다 (WO §4) */}
                          {editDraft.exempt && (
                            <div className="mt-1 flex flex-col gap-1">
                              <select
                                value={editDraft.exemptionType}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    exemptionType: e.target.value as '' | FeeExemptionType,
                                    // 기타가 아니면 자유 사유는 저장되지 않는다
                                    ...(e.target.value === 'other' ? {} : { exemptionReason: '' }),
                                  })
                                }
                                className="rounded border border-gray-300 px-1 py-1 text-xs"
                              >
                                <option value="">사유 선택</option>
                                {FEE_EXEMPTION_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                              {editDraft.exemptionType === 'other' && (
                                <input
                                  type="text"
                                  value={editDraft.exemptionReason}
                                  onChange={(e) =>
                                    setEditDraft({ ...editDraft, exemptionReason: e.target.value })
                                  }
                                  placeholder="기타 사유"
                                  className="w-32 rounded border border-gray-300 px-1 py-1 text-xs"
                                />
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <input
                              type="text"
                              value={editDraft.memo}
                              onChange={(e) => setEditDraft({ ...editDraft, memo: e.target.value })}
                              placeholder="메모"
                              className="w-40 rounded border border-gray-300 px-2 py-1 text-xs"
                            />
                            <span className="flex gap-2">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void saveEdit(row)}
                                className="rounded bg-primary-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                              >
                                저장
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditId(null);
                                  setEditDraft(null);
                                }}
                                className="text-xs text-gray-500 hover:text-gray-900"
                              >
                                취소
                              </button>
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={row.id} className="border-b border-gray-100">
                        <td className="py-2">
                          <div className="font-medium text-gray-900">{row.memberName ?? '-'}</div>
                          <div className="text-xs text-gray-500">{row.memberEmail ?? ''}</div>
                        </td>
                        <td className="py-2 text-gray-600">{feeCategoryLabel(row.feeCategory)}</td>
                        <td className="py-2 text-right text-gray-800">{won(row.assessedAmount)}</td>
                        <td className="py-2 text-right text-gray-800">{won(row.paidAmount)}</td>
                        <td className="py-2 text-right text-gray-800">{won(row.outstanding)}</td>
                        <td className="py-2 text-gray-600">{fmtDate(row.paidAt)}</td>
                        <td className="py-2">
                          <StatusBadge status={row.status} />
                          {row.status === 'exempt' && row.exemptionType && (
                            <div className="mt-1 text-xs text-gray-600">
                              {FEE_EXEMPTION_LABEL[row.exemptionType]}
                              {row.exemptionType === 'other' && row.exemptionReason
                                ? ` · ${row.exemptionReason}`
                                : ''}
                            </div>
                          )}
                          {row.memo && <div className="mt-1 text-xs text-gray-500">{row.memo}</div>}
                        </td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            className="text-xs text-primary-700 hover:underline"
                          >
                            수정
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
