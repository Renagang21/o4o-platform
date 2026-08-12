/**
 * AnnualReportPage — 회원 신상신고 4 STEP 작성
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-V1 §3
 *
 * 기존 web-kpa-society 의 AnnualReportFormPage 를 복원하지 않는다.
 * 이 화면은 필드를 하나도 모르고, 서버가 준 Template schema 만으로 그린다.
 *
 * 한 화면에 51개를 펼치지 않는다 — STEP 단위로 나누고 이전/다음으로 이동한다.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  getAnnualReport,
  saveAnnualReportDraft,
  submitAnnualReport,
  computeVisibility,
  writableValues,
  type AnnualReportState,
  type FieldIssue,
  type ReportValues,
} from '../../lib/api/annualReport';
import { describeApiError as describe } from '../../lib/errors';
import FieldRenderer from './FieldRenderer';

export default function AnnualReportPage({ slug }: { slug: string }) {
  const [state, setState] = useState<AnnualReportState | null>(null);
  const [values, setValues] = useState<ReportValues>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getAnnualReport(slug)
      .then((s) => {
        if (!alive) return;
        setState(s);
        setValues(s.values ?? {});
      })
      .catch((e: unknown) => alive && setError(describe(e)));
    return () => {
      alive = false;
    };
  }, [slug]);

  const visible = useMemo(
    () => (state ? computeVisibility(state.schema, values) : {}),
    [state, values],
  );

  const steps = useMemo(
    () => (state ? [...state.schema.steps].sort((a, b) => a.order - b.order) : []),
    [state],
  );

  const stepFields = useMemo(() => {
    if (!state) return [];
    const key = steps[stepIndex]?.key;
    return state.schema.fields
      .filter((f) => f.step === key)
      .filter((f) => visible[f.key] !== false)
      .sort((a, b) => a.order - b.order);
  }, [state, steps, stepIndex, visible]);

  if (error && !state) return <p className="text-sm text-red-600">{error}</p>;
  if (!state) return <p className="text-sm text-gray-500">불러오는 중입니다…</p>;

  const locked = state.readonly;
  const issueOf = (key: string) => issues.find((i) => i.key === key)?.message;

  function change(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function saveDraft() {
    if (!state || locked) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await saveAnnualReportDraft(slug, writableValues(state.schema, values));
      setValues(res.values);
      setMessage('임시저장했습니다.');
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!state || locked) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    setIssues([]);
    try {
      await submitAnnualReport(slug, writableValues(state.schema, values));
      const fresh = await getAnnualReport(slug);
      setState(fresh);
      setValues(fresh.values ?? {});
      setMessage('신고서를 제출했습니다.');
    } catch (e) {
      const raw = (e as { response?: { data?: { data?: { issues?: FieldIssue[] } } } })?.response?.data?.data;
      if (raw?.issues?.length) {
        setIssues(raw.issues);
        // 누락 항목이 있는 STEP 으로 이동시킨다
        const firstKey = raw.issues[0].key;
        const f = state.schema.fields.find((x) => x.key === firstKey);
        const idx = steps.findIndex((s) => s.key === f?.step);
        if (idx >= 0) setStepIndex(idx);
        setError('입력하지 않은 필수 항목이 있습니다.');
      } else {
        setError(describe(e));
      }
    } finally {
      setBusy(false);
    }
  }

  const isLast = stepIndex === steps.length - 1;
  const groups = groupBy(stepFields);

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900">{state.template.title}</h1>
      <p className="mt-1 text-sm text-gray-500">
        신고기간 {state.template.periodStart} ~ {state.template.periodEnd}
        {state.report && (
          <span className="ml-2">
            · 현재 상태 <strong>{state.report.status === 'submitted' ? '제출완료' : '작성중'}</strong>
          </span>
        )}
      </p>

      {locked && (
        <p className="mt-3 rounded bg-green-50 px-3 py-2 text-sm text-green-800">
          제출이 완료되어 읽기 전용입니다. 수정이 필요하면 분회 사무국에 문의해 주세요.
        </p>
      )}
      {!locked && state.period.status !== 'open' && (
        <p className="mt-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {state.period.status === 'before' ? '신고 기간이 시작되기 전입니다.' : '신고 기간이 종료되었습니다.'}
          {state.period.canSubmit
            ? ' (운영자 권한으로 제출할 수 있습니다)'
            : ' 임시저장은 가능하지만 제출은 할 수 없습니다.'}
        </p>
      )}

      {/* STEP 표시 */}
      <ol className="mt-5 flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => setStepIndex(i)}
              className={
                'rounded px-3 py-1.5 text-sm ' +
                (i === stepIndex ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600')
              }
            >
              {String(i + 1).padStart(2, '0')}. {s.title}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-5 space-y-5">
        {groups.map(([groupName, fields]) => (
          <fieldset key={groupName || '_'} className="rounded border border-gray-200 p-4">
            {groupName && <legend className="px-1 text-sm font-medium text-gray-600">{groupName}</legend>}
            {fields.map((f) => (
              <FieldRenderer
                key={f.key}
                field={f}
                value={values[f.key]}
                onChange={change}
                disabled={locked}
                notLinked={state.associationLinkStatus?.[f.key] === 'not_linked'}
                issue={issueOf(f.key)}
              />
            ))}
          </fieldset>
        ))}
        {stepFields.length === 0 && (
          <p className="text-sm text-gray-500">이 단계에서 입력할 항목이 없습니다.</p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 disabled:opacity-50"
        >
          이전
        </button>
        {!isLast && (
          <button
            type="button"
            onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700"
          >
            다음
          </button>
        )}
        {!locked && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveDraft()}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 disabled:opacity-60"
          >
            임시저장
          </button>
        )}
        {!locked && isLast && (
          <button
            type="button"
            disabled={busy || !state.period.canSubmit}
            onClick={() => void submit()}
            className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            제출
          </button>
        )}

        {message && <span className="text-sm text-green-700">{message}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {issues.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-600">
          {issues.map((i) => (
            <li key={i.key}>{i.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** field.group 단위로 묶는다. group 없는 필드는 맨 앞 무명 묶음 */
function groupBy<T extends { group?: string }>(fields: T[]): Array<[string, T[]]> {
  const map = new Map<string, T[]>();
  for (const f of fields) {
    const g = f.group ?? '';
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(f);
  }
  return [...map.entries()];
}
