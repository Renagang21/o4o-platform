/**
 * MembersConsolePage — 운영자 회원 업무 콘솔 (목록 + 상세)
 * WO-O4O-KPA-BRANCH-MEMBER-OPERATIONS-CONSOLE-V1
 *
 * "회원 한 명의 전체 상태를 보는 진입점"이다 (WO §9). 각 원장의 상세 편집 UI 를
 * 여기서 다시 만들지 않는다 — 실제 작업은 기존 전문화면(신상신고 검수 / 회비 관리 /
 * 연수교육)으로 연결한다.
 *
 * **화면이 원장을 조인하지 않는다.** 목록도 상세도 서버 응답 1개를 그대로 그린다.
 * 회원별 추가 호출을 넣지 않는 것이 이 화면의 성능 계약이다 (WO §2).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listMemberConsole,
  getMemberConsoleDetail,
  REPORT_LABEL,
  FEE_LABEL,
  EDUCATION_LABEL,
  ATTENTION_LABEL,
  type MemberConsoleListItem,
  type MemberConsoleDetail,
  type AttentionCode,
  type ReportSummaryStatus,
  type FeeSummaryStatus,
  type EducationSummaryStatus,
} from '../../lib/api/memberConsole';
import { describeApiError as describe } from '../../lib/errors';

const REPORT_CLASS: Record<ReportSummaryStatus, string> = {
  not_submitted: 'bg-gray-100 text-gray-600',
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-50 text-blue-700',
  revision_requested: 'bg-amber-50 text-amber-800',
  approved: 'bg-green-50 text-green-700',
};

const FEE_CLASS: Record<FeeSummaryStatus, string> = {
  not_assessed: 'bg-gray-100 text-gray-600',
  unpaid: 'bg-red-50 text-red-700',
  partial: 'bg-amber-50 text-amber-800',
  paid: 'bg-green-50 text-green-700',
  exempt: 'bg-gray-100 text-gray-600',
};

const EDU_CLASS: Record<EducationSummaryStatus, string> = {
  not_recorded: 'bg-gray-100 text-gray-600',
  incomplete: 'bg-red-50 text-red-700',
  complete: 'bg-green-50 text-green-700',
  exempt: 'bg-gray-100 text-gray-600',
};

const ATTENTION_FILTERS: Array<{ value: '' | AttentionCode; label: string }> = [
  { value: '', label: '전체' },
  { value: 'REPORT_REVIEW_PENDING', label: '신고 검수대기' },
  { value: 'REPORT_REVISION_OPEN', label: '보완 대기' },
  { value: 'FEE_OUTSTANDING', label: '회비 미수' },
  { value: 'EDUCATION_INCOMPLETE', label: '교육 미이수' },
];

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

function won(n: number | null | undefined): string {
  return n === null || n === undefined ? '-' : `${n.toLocaleString('ko-KR')}원`;
}

function credit(n: number | null | undefined): string {
  if (n === null || n === undefined) return '-';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function fmtDate(v: string | null | undefined): string {
  return v ? new Date(v).toLocaleDateString('ko-KR') : '-';
}

/** 상세 값 표시 — 배열·객체를 통째로 그리지 않는다 (W4 검수화면과 같은 처리) */
function display(v: unknown): string {
  if (v === null || v === undefined || v === '') return '-';
  if (Array.isArray(v)) return v.length ? v.map((x) => String(x)).join(', ') : '-';
  if (typeof v === 'boolean') return v ? '예' : '아니오';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded border border-gray-200">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value}</dd>
    </div>
  );
}

export default function MembersConsolePage({ slug, basePath }: { slug: string; basePath: string }) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(thisYear);
  const [attention, setAttention] = useState<'' | AttentionCode>('');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');

  const [items, setItems] = useState<MemberConsoleListItem[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<MemberConsoleDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setListError(null);
    try {
      const res = await listMemberConsole(slug, { year, attention: attention || null, q: query });
      setItems(res.items);
    } catch (e) {
      setItems(null);
      setListError(describe(e));
    }
  }, [slug, year, attention, query]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let alive = true;
    setDetail(null);
    setDetailError(null);
    getMemberConsoleDetail(slug, selected, year)
      .then((d) => alive && setDetail(d))
      .catch((e) => alive && setDetailError(describe(e)));
    return () => {
      alive = false;
    };
  }, [slug, selected, year]);

  const yearOptions = useMemo(
    () => [thisYear + 1, thisYear, thisYear - 1, thisYear - 2, thisYear - 3],
    [thisYear],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">회원 업무 현황</h1>
          <p className="mt-1 text-sm text-gray-500">
            회원 한 명의 소속·신상신고·회비·연수교육 상태를 한 화면에서 확인합니다.
            실제 처리는 각 전문화면에서 합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <select
            value={attention}
            onChange={(e) => setAttention(e.target.value as '' | AttentionCode)}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {ATTENTION_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(q);
            }}
            className="flex gap-1"
          >
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="성명 · 면허번호"
              className="w-40 rounded border border-gray-300 px-2 py-1 text-sm"
            />
            <button type="submit" className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700">
              검색
            </button>
          </form>
        </div>
      </header>

      {listError && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{listError}</p>}

      {items === null && !listError ? (
        <p className="text-sm text-gray-500">불러오는 중입니다…</p>
      ) : items && items.length === 0 ? (
        <p className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          조건에 맞는 회원이 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="py-2">성명</th>
                <th className="py-2">면허번호</th>
                <th className="py-2">신상신고</th>
                <th className="py-2">회비</th>
                <th className="py-2">연수교육</th>
                <th className="py-2">주의</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((m) => (
                <tr key={m.id} className={`border-b border-gray-100 ${selected === m.userId ? 'bg-primary-50/40' : ''}`}>
                  <td className="py-2">
                    <div className="font-medium text-gray-900">{m.name ?? '-'}</div>
                    <div className="text-xs text-gray-500">{m.email ?? ''}</div>
                  </td>
                  <td className="py-2 text-gray-700">{m.licenseNumber ?? '-'}</td>
                  <td className="py-2">
                    <Badge label={REPORT_LABEL[m.report.status]} cls={REPORT_CLASS[m.report.status]} />
                  </td>
                  <td className="py-2">
                    <Badge label={FEE_LABEL[m.fee.status]} cls={FEE_CLASS[m.fee.status]} />
                  </td>
                  <td className="py-2">
                    <Badge label={EDUCATION_LABEL[m.education.status]} cls={EDU_CLASS[m.education.status]} />
                  </td>
                  <td className="py-2">
                    {m.attention.length === 0 ? (
                      <span className="text-xs text-gray-400">-</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {m.attention.map((a) => (
                          <span key={a} className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800">
                            {ATTENTION_LABEL[a]}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(selected === m.userId ? null : m.userId)}
                      className="text-xs text-primary-700 hover:underline"
                    >
                      {selected === m.userId ? '닫기' : '상세'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 회원 상세: 4영역 ─────────────────────────────────────────── */}
      {selected && (
        <div className="space-y-4">
          {detailError && (
            <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{detailError}</p>
          )}
          {!detail && !detailError ? (
            <p className="text-sm text-gray-500">회원 정보를 불러오는 중입니다…</p>
          ) : detail ? (
            <>
              <Section title={`${detail.member.name ?? '회원'} · ${detail.year}년`}>
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="면허번호" value={detail.member.licenseNumber ?? '-'} />
                  <Field label="이메일" value={detail.member.email ?? '-'} />
                  <Field label="회비구분" value={detail.member.feeCategory ?? '-'} />
                  <Field
                    label="분회 소속"
                    value={`${detail.affiliation.status === 'active' ? '재적' : '전출'} · ${fmtDate(detail.affiliation.joinedAt)}~`}
                  />
                </dl>
              </Section>

              <Section
                title="신상신고"
                action={
                  <a href={`${basePath}/operator/annual-reports`} className="text-xs text-primary-700 hover:underline">
                    검수 화면 →
                  </a>
                }
              >
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="상태" value={<Badge label={REPORT_LABEL[detail.report.status]} cls={REPORT_CLASS[detail.report.status]} />} />
                  <Field label="제출일" value={fmtDate(detail.report.submittedAt)} />
                  <Field label="승인일" value={fmtDate(detail.report.approvedAt)} />
                  <Field label="원장 반영" value={detail.report.syncedToMembership ? '반영됨' : '미반영'} />
                </dl>
                {detail.report.revisionReason && (
                  <p className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    보완요청({detail.report.revisionRound}회): {detail.report.revisionReason}
                  </p>
                )}
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-600">주요 신고 변경사항</p>
                  {detail.report.diffUnavailable ? (
                    <p className="mt-1 text-sm text-gray-500">{detail.report.diffUnavailable}</p>
                  ) : detail.report.changes && detail.report.changes.length > 0 ? (
                    <ul className="mt-1 space-y-1 text-sm text-gray-800">
                      {detail.report.changes.map((c) => (
                        <li key={c.key}>
                          {c.label}: <span className="text-gray-500">{display(c.before)}</span> →{' '}
                          <span className="font-medium">{display(c.after)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-gray-500">회원 원장과 달라지는 항목이 없습니다.</p>
                  )}
                </div>
              </Section>

              <Section
                title="회비"
                action={
                  <a href={`${basePath}/operator/fees`} className="text-xs text-primary-700 hover:underline">
                    회비 관리 →
                  </a>
                }
              >
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <Field label="상태" value={<Badge label={FEE_LABEL[detail.fee.status]} cls={FEE_CLASS[detail.fee.status]} />} />
                  <Field label="회비구분" value={detail.fee.feeCategory ?? '-'} />
                  <Field label="부과액" value={won(detail.fee.assessedAmount)} />
                  <Field label="납부액" value={won(detail.fee.paidAmount)} />
                  <Field label="납부일" value={fmtDate(detail.fee.paidAt)} />
                </dl>
                {detail.fee.memo && <p className="mt-3 text-xs text-gray-500">{detail.fee.memo}</p>}
              </Section>

              <Section
                title="연수교육"
                action={
                  <a href={`${basePath}/operator/education`} className="text-xs text-primary-700 hover:underline">
                    연수교육 →
                  </a>
                }
              >
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field
                    label="상태"
                    value={<Badge label={EDUCATION_LABEL[detail.education.status]} cls={EDU_CLASS[detail.education.status]} />}
                  />
                  <Field label="의무평점" value={credit(detail.education.requiredCredits)} />
                  <Field label="인정평점" value={credit(detail.education.completedCredits)} />
                  <Field label="남은 평점" value={credit(detail.education.remainingCredits)} />
                </dl>
                {detail.education.memo && <p className="mt-3 text-xs text-gray-500">{detail.education.memo}</p>}
              </Section>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
