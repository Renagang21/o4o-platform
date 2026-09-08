/**
 * EducationCreditsPage — 운영자 연수교육 평점 원장
 * WO-O4O-KPA-BRANCH-CONTINUING-EDUCATION-CREDIT-LEDGER-V1
 *
 * 한 블록만 둔다: 연도 원장(개설 + 목록 + 인라인 수정).
 * 회비 화면(W5)과 달리 정책 표가 없다 — 의무평점은 개설할 때 한 숫자로 받고
 * 회원별 차이는 개별 수정으로 조정한다 (WO §3 최소).
 *
 * **LMS 화면이 아니다.** 강좌·수강신청·출결 진입점을 두지 않는다.
 * 상태(미이수/이수완료/면제·유예)를 화면이 계산하지 않는다 — DB 가 정한 값을 그대로 쓴다.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listEducationCredits,
  openEducationYear,
  updateEducationCredit,
  EDUCATION_STATUS_LABEL,
  EXEMPTION_TYPE_LABEL,
  type EducationCreditItem,
  type EducationSummary,
  type EducationStatus,
  type ExemptionType,
} from '../../lib/api/educationCredit';
import { describeApiError as describe } from '../../lib/errors';

const STATUS_FILTERS: Array<{ value: '' | EducationStatus; label: string }> = [
  { value: '', label: '전체' },
  { value: 'incomplete', label: '미이수' },
  { value: 'complete', label: '이수완료' },
  { value: 'exempt', label: '면제·유예' },
];

const STATUS_CLASS: Record<EducationStatus, string> = {
  incomplete: 'bg-red-50 text-red-700',
  complete: 'bg-green-50 text-green-700',
  exempt: 'bg-gray-100 text-gray-600',
};

/** 평점 표시 — 8 은 "8", 7.5 는 "7.5" 로 낸다 (불필요한 .0 을 붙이지 않는다) */
function credit(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function StatusBadge({ item }: { item: EducationCreditItem }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[item.status]}`}>
      {item.status === 'exempt' && item.exemptionType
        ? EXEMPTION_TYPE_LABEL[item.exemptionType]
        : EDUCATION_STATUS_LABEL[item.status]}
    </span>
  );
}

export default function EducationCreditsPage({ slug }: { slug: string }) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(thisYear);
  const [status, setStatus] = useState<'' | EducationStatus>('');

  const [items, setItems] = useState<EducationCreditItem[] | null>(null);
  const [summary, setSummary] = useState<EducationSummary | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [openCredits, setOpenCredits] = useState('8');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    requiredCredits: string;
    completedCredits: string;
    exemptionType: '' | ExemptionType;
    memo: string;
  } | null>(null);

  const reload = useCallback(async () => {
    setListError(null);
    try {
      const res = await listEducationCredits(slug, { year, status: status || null });
      setItems(res.items);
      setSummary(res.summary);
    } catch (e) {
      setItems(null);
      setSummary(null);
      setListError(describe(e));
    }
  }, [slug, year, status]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const yearOptions = useMemo(
    () => [thisYear + 1, thisYear, thisYear - 1, thisYear - 2, thisYear - 3],
    [thisYear],
  );

  async function runOpen() {
    setBusy(true);
    setActionError(null);
    setMessage(null);
    try {
      const res = await openEducationYear(slug, year, Number(openCredits || 0));
      setMessage(
        `대상 ${res.targetCount}명 중 ${res.created}명 개설했습니다.` +
          (res.skipped.length ? ` (이미 개설: ${res.skipped.length}명)` : ''),
      );
      await reload();
    } catch (e) {
      setActionError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(row: EducationCreditItem) {
    setEditId(row.id);
    setActionError(null);
    setMessage(null);
    setDraft({
      requiredCredits: credit(row.requiredCredits),
      completedCredits: credit(row.completedCredits),
      exemptionType: row.exemptionType ?? '',
      memo: row.memo ?? '',
    });
  }

  async function saveEdit(row: EducationCreditItem) {
    if (!draft) return;
    setBusy(true);
    setActionError(null);
    setMessage(null);
    try {
      await updateEducationCredit(slug, row.id, {
        requiredCredits: Number(draft.requiredCredits || 0),
        completedCredits: Number(draft.completedCredits || 0),
        exemptionType: draft.exemptionType || null,
        memo: draft.memo,
      });
      setEditId(null);
      setDraft(null);
      setMessage(`${row.memberName ?? '회원'} 님의 연수교육 평점을 저장했습니다.`);
      await reload();
    } catch (e) {
      setActionError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">연수교육 평점</h1>
          <p className="mt-1 text-sm text-gray-500">
            분회가 확인한 회원별 연도 인정평점을 기록합니다. 강좌 개설·수강신청 기능은 없습니다.
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

      <section className="rounded border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-800">{year}년 연수교육 원장</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as '' | EducationStatus)}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <label className="text-sm text-gray-600">
              의무평점{' '}
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={openCredits}
                onChange={(e) => setOpenCredits(e.target.value)}
                className="ml-1 w-20 rounded border border-gray-300 px-2 py-1"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runOpen()}
              className="rounded border border-primary-600 px-3 py-1.5 text-sm font-medium text-primary-700 disabled:opacity-50"
            >
              {year}년 개설
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
          {listError && (
            <p className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{listError}</p>
          )}

          {summary && (
            <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: '대상', value: `${summary.count}명` },
                { label: '이수완료', value: `${summary.complete}명` },
                { label: '미이수', value: `${summary.incomplete}명` },
                { label: '면제·유예', value: `${summary.exempt}명` },
              ].map((s) => (
                <div key={s.label} className="rounded border border-gray-200 p-3">
                  <dt className="text-xs text-gray-500">{s.label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {items === null ? (
            <p className="text-sm text-gray-500">불러오는 중입니다…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500">
              해당 조건의 원장이 없습니다. 의무평점을 정한 뒤 «{year}년 개설» 을 실행해 주세요.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                    <th className="py-2">회원</th>
                    <th className="py-2 text-right">의무평점</th>
                    <th className="py-2 text-right">인정평점</th>
                    <th className="py-2 text-right">남은 평점</th>
                    <th className="py-2">상태</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) =>
                    editId === row.id && draft ? (
                      <tr key={row.id} className="border-b border-gray-100 bg-amber-50/40 align-top">
                        <td className="py-2">
                          <div className="font-medium text-gray-900">{row.memberName ?? '-'}</div>
                          <div className="text-xs text-gray-500">{row.memberEmail ?? ''}</div>
                        </td>
                        <td className="py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={draft.requiredCredits}
                            onChange={(e) => setDraft({ ...draft, requiredCredits: e.target.value })}
                            className="w-20 rounded border border-gray-300 px-2 py-1 text-right"
                          />
                        </td>
                        <td className="py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={draft.completedCredits}
                            onChange={(e) => setDraft({ ...draft, completedCredits: e.target.value })}
                            className="w-20 rounded border border-gray-300 px-2 py-1 text-right"
                          />
                        </td>
                        <td className="py-2 text-right text-gray-400">-</td>
                        <td className="py-2">
                          <select
                            value={draft.exemptionType}
                            onChange={(e) =>
                              setDraft({ ...draft, exemptionType: e.target.value as '' | ExemptionType })
                            }
                            className="rounded border border-gray-300 px-2 py-1 text-xs"
                          >
                            <option value="">이수 의무 있음</option>
                            <option value="exempt">면제</option>
                            <option value="deferred">유예</option>
                          </select>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <input
                              type="text"
                              value={draft.memo}
                              onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
                              placeholder="메모 (면제·유예 사유 등)"
                              className="w-48 rounded border border-gray-300 px-2 py-1 text-xs"
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
                                  setDraft(null);
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
                        <td className="py-2 text-right text-gray-800">{credit(row.requiredCredits)}</td>
                        <td className="py-2 text-right text-gray-800">{credit(row.completedCredits)}</td>
                        <td className="py-2 text-right text-gray-800">{credit(row.remainingCredits)}</td>
                        <td className="py-2">
                          <StatusBadge item={row} />
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
