import { useEffect, useRef, useState } from 'react';
import type {
  ProductCorrectionContext,
  ProductCorrectionEvidence,
  ProductCorrectionField,
  ProductCorrectionProposal,
  ProductCorrectionValue,
} from '@o4o/types';
import { productCorrectionApi as api } from '@/api/product-correction.api';

const labels: Record<ProductCorrectionField, string> = {
  name: '상품명',
  brandName: '브랜드명',
  specification: '규격',
  originCountry: '원산지',
  tags: '태그',
  descriptionContent: '설명서 본문',
};
const fields = Object.keys(labels) as ProductCorrectionField[];
const inputClass = 'w-full rounded border p-2';
const buttonClass = 'rounded border px-3 py-2 disabled:opacity-50';
const display = (value: ProductCorrectionValue) =>
  value === null ? '(없음)' : Array.isArray(value) ? value.join(', ') : value;
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '요청에 실패했습니다.';

/** Manual P2 flow. No AI request or implicit official save. */
export default function ProductCorrectionProposalEditor({
  batchId,
  taskId,
  canWrite,
}: {
  batchId: string;
  taskId: string;
  canWrite: boolean;
}) {
  const [context, setContext] = useState<ProductCorrectionContext | null>(null);
  const [history, setHistory] = useState<ProductCorrectionProposal[]>([]);
  const [proposal, setProposal] = useState<ProductCorrectionProposal | null>(null);
  const [attempts, setAttempts] = useState<Awaited<ReturnType<typeof api.proposalAttempts>>>([]);
  const [versions, setVersions] = useState<ProductCorrectionProposal[]>([]);
  const [selected, setSelected] = useState<ProductCorrectionField[]>([]);
  const [values, setValues] = useState<Partial<Record<ProductCorrectionField, string>>>({});
  const [reasons, setReasons] = useState<Partial<Record<ProductCorrectionField, string>>>({});
  const [evidence, setEvidence] = useState<ProductCorrectionEvidence[]>([]);
  const [approved, setApproved] = useState<ProductCorrectionField[]>([]);
  const [applyFields, setApplyFields] = useState<ProductCorrectionField[]>([]);
  const [note, setNote] = useState('');
  const [confirmApply, setConfirmApply] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const active = useRef(true);
  const lock = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const execute = async (fn: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
    } catch (e) {
      if (active.current) setError(errorMessage(e));
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  };
  const showProposal = (item: ProductCorrectionProposal) => {
    setProposal(item);
    setApproved(item.changes.filter((c) => c.decision === 'approved').map((c) => c.field));
    setApplyFields([]);
    setNote(item.reviewNote ?? '');
    setConfirmApply(false);
    setVersions([]);
    setAttempts([]);
  };
  const remember = (item: ProductCorrectionProposal) => {
    showProposal(item);
    setHistory((previous) => [item, ...previous.filter((p) => p.id !== item.id)]);
  };
  const load = () =>
    execute(async () => {
      const [source, saved] = await Promise.all([
        api.changeContext(batchId, taskId),
        api.proposals(batchId, taskId),
      ]);
      if (!active.current) return;
      const requestedId = new URLSearchParams(window.location.search).get('proposal');
      const requested = requestedId && /^[0-9a-f-]{36}$/i.test(requestedId)
        ? await api.proposal(requestedId) : null;
      if (!active.current) return;
      setContext(source);
      if (requested && requested.batchId === batchId && requested.taskId === taskId) {
        setHistory([requested, ...saved.filter(p => p.id !== requested.id)]);
        showProposal(requested);
      } else setHistory(saved);
      // Keep typed suggestions on refresh; the current baseline is always displayed separately.
      setNotice('최신 원본과 변경안 이력을 불러왔습니다. 입력 중인 제안은 유지됩니다.');
    });
  const save = () =>
    execute(async () => {
      if (!context) return;
      const result = await api.createProposal(batchId, taskId, {
        fingerprint: context.fingerprint,
        evidence,
        changes: selected.map((field) => ({
          field,
          after:
            field === 'tags'
              ? (values[field] ?? '')
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean)
              : (values[field] ?? '').trim() ||
                (['name', 'descriptionContent'].includes(field) ? '' : null),
          reason: reasons[field] ?? '',
          evidenceIds: evidence.filter((e) => e.fields.includes(field)).map((e) => e.id),
        })),
      });
      if (active.current) {
        remember(result);
        setNotice(
          '변경안을 저장했습니다. 아래에서 실제 저장된 내용을 검토하세요. 아직 원본에 반영되지 않았습니다.',
        );
      }
    });
  const toggle = (list: ProductCorrectionField[], field: ProductCorrectionField) =>
    list.includes(field) ? list.filter((f) => f !== field) : [...list, field];
  return (
    <section className="space-y-4 rounded border p-3" aria-label="근거와 상품 변경안">
      <h5 className="font-semibold">근거 등록 · 변경안 비교 · 선택 반영</h5>
      <p className="text-sm">
        기존 보완 기록과 별도로 저장합니다. 승인 후 선택 반영을 실행하면 공통 상품 정보가
        변경됩니다. 제조사·바코드·허가정보는 이 화면에서 수정하지 않습니다.
      </p>
      <button type="button" className={buttonClass} disabled={busy} onClick={() => void load()}>
        최신 원본·변경안 이력 불러오기
      </button>
      {error && (
        <p role="alert">
          {error} 입력은 유지됩니다. 원본 충돌 시 최신 원본을 불러와 다시 비교하고 새 변경안을
          저장하세요.
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {context && (
        <>
          <p className="text-sm">
            새 변경안의 기준은 아래 최신 원본입니다. 태그는 쉼표로 구분합니다. 설명서 본문은 이
            작업의 유형·언어에만 적용되며 기존 요약은 유지합니다.
          </p>
          {fields.map((field) => (
            <div key={field} className="space-y-1 rounded border p-2">
              <label>
                <input
                  type="checkbox"
                  disabled={!canWrite || busy}
                  checked={selected.includes(field)}
                  onChange={() => {
                    setSelected(toggle(selected, field));
                    if (values[field] === undefined)
                      setValues({
                        ...values,
                        [field]:
                          context.values[field] === null ? '' : display(context.values[field]),
                      });
                  }}
                />{' '}
                {labels[field]} 변경
              </label>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-sm">
                현재 값: {display(context.values[field])}
              </pre>
              {selected.includes(field) && (
                <>
                  <label className="block">
                    {labels[field]} 제안 값
                    <textarea
                      aria-label={`${labels[field]} 제안 값`}
                      className={inputClass}
                      disabled={!canWrite || busy}
                      value={values[field] ?? ''}
                      onChange={(e) => setValues({ ...values, [field]: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    {labels[field]} 변경 이유
                    <input
                      aria-label={`${labels[field]} 변경 이유`}
                      className={inputClass}
                      disabled={!canWrite || busy}
                      value={reasons[field] ?? ''}
                      onChange={(e) => setReasons({ ...reasons, [field]: e.target.value })}
                    />
                  </label>
                </>
              )}
            </div>
          ))}
          <h6 className="font-semibold">구조화 근거</h6>
          <p className="text-sm">
            기본정보 승인에는 확인된 상품 사실 근거가 필요합니다. 일반 전문자료를 제품 고유 사실로
            간주하지 마세요.
          </p>
          {evidence.map((item, index) => {
            const update = (patch: Partial<ProductCorrectionEvidence>) =>
              setEvidence((previous) =>
                previous.map((e) => (e.id === item.id ? { ...e, ...patch } : e)),
              );
            return (
              <fieldset
                key={item.id}
                className="space-y-2 rounded border p-2"
                disabled={!canWrite || busy}
              >
                <legend>근거 {index + 1}</legend>
                <label className="block">
                  자료 구분
                  <select
                    aria-label={`근거 ${index + 1} 구분`}
                    className={inputClass}
                    value={item.kind}
                    onChange={(e) =>
                      update({
                        kind: e.target.value as ProductCorrectionEvidence['kind'],
                      })
                    }
                  >
                    <option value="product-fact">상품 사실</option>
                    <option value="professional-reference">전문 참고자료</option>
                  </select>
                </label>
                <label className="block">
                  출처·자료 위치
                  <input
                    aria-label={`근거 ${index + 1} 출처`}
                    className={inputClass}
                    value={item.source}
                    onChange={(e) => update({ source: e.target.value })}
                  />
                </label>
                <label className="block">
                  확인일
                  <input
                    type="date"
                    aria-label={`근거 ${index + 1} 확인일`}
                    className={inputClass}
                    value={item.checkedOn}
                    onChange={(e) => update({ checkedOn: e.target.value })}
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={item.status === 'confirmed'}
                    onChange={(e) =>
                      update({
                        status: e.target.checked ? 'confirmed' : 'unconfirmed',
                      })
                    }
                  />{' '}
                  자료 확인 완료
                </label>
                <div>
                  관련 항목:{' '}
                  {fields.map((field) => (
                    <label key={field} className="mr-3 inline-block">
                      <input
                        type="checkbox"
                        checked={item.fields.includes(field)}
                        onChange={() => update({ fields: toggle(item.fields, field) })}
                      />
                      {labels[field]}
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => setEvidence(evidence.filter((e) => e.id !== item.id))}
                >
                  근거 {index + 1} 삭제
                </button>
              </fieldset>
            );
          })}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClass}
              disabled={!canWrite || busy || evidence.length >= 30}
              onClick={() =>
                setEvidence([
                  ...evidence,
                  {
                    id: crypto.randomUUID(),
                    kind: 'product-fact',
                    source: '',
                    checkedOn: '',
                    fields: [...selected],
                    status: 'unconfirmed',
                  },
                ])
              }
            >
              근거 추가
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={!canWrite || busy || !selected.length || !evidence.length}
              onClick={() => void save()}
            >
              새 변경안 저장 (미적용)
            </button>
          </div>
        </>
      )}
      {history.length > 0 && (
        <label className="block">
          변경안 이력 (최근 30개)
          <select
            aria-label="변경안 이력"
            className={inputClass}
            disabled={busy}
            value={proposal?.id ?? ''}
            onChange={(e) => {
              const item = history.find((p) => p.id === e.target.value);
              if (item) showProposal(item);
            }}
          >
            <option value="">선택하세요</option>
            {history.map((p) => (
              <option key={p.id} value={p.id}>
                {new Date(p.createdAt).toLocaleString()} · v{p.revision} ·{' '}
                {p.appliedAt ? '반영 완료' : p.reviewedAt ? '검토 완료·미반영' : '검토 대기'}
              </option>
            ))}
          </select>
        </label>
      )}
      {proposal && (
        <div className="space-y-3 rounded border p-3" aria-label="저장된 변경안 비교">
          <p>
            기준: {proposal.ruleSnapshot.title} v{proposal.ruleSnapshot.revision} · 변경안 v
            {proposal.revision}
          </p>
          {proposal.changes.map((change) => (
            <div key={change.field} className="space-y-1 border-b pb-2">
              <strong>{labels[change.field]}</strong>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words">
                변경 전: {display(change.before)}
                {'\n'}제안: {display(change.after)}
              </pre>
              <p>이유: {change.reason}</p>
              {proposal.evidence
                .filter((e) => change.evidenceIds.includes(e.id))
                .map((e) => (
                  <p key={e.id} className="break-words text-sm">
                    {e.kind === 'product-fact' ? '상품 사실' : '전문 참고'} · {e.source} ·{' '}
                    {e.checkedOn} · {e.status === 'confirmed' ? '확인 완료' : '미확인'}
                  </p>
                ))}
              <label>
                <input
                  type="checkbox"
                  disabled={!canWrite || busy || !!proposal.appliedAt}
                  checked={approved.includes(change.field)}
                  onChange={() => {
                    setApproved(toggle(approved, change.field));
                    setConfirmApply(false);
                  }}
                />
                {labels[change.field]} 승인 (미선택은 반려)
              </label>
              <p className="text-sm">
                저장된 판정:{' '}
                {change.decision === 'approved'
                  ? '승인'
                  : change.decision === 'rejected'
                    ? '반려'
                    : '대기'}
              </p>
            </div>
          ))}
          <label className="block">
            검토 의견
            <input
              aria-label="변경안 검토 의견"
              className={inputClass}
              disabled={!canWrite || busy || !!proposal.appliedAt}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <button
            type="button"
            className={buttonClass}
            disabled={!canWrite || busy || !note.trim() || !!proposal.appliedAt}
            onClick={() =>
              void execute(async () => {
                const result = await api.reviewProposal(
                  proposal,
                  proposal.changes.map((c) => ({
                    field: c.field,
                    decision: approved.includes(c.field) ? 'approved' : 'rejected',
                  })),
                  note,
                );
                if (active.current) {
                  remember(result);
                  setNotice('검토 결과를 저장했습니다. 원본에는 아직 반영되지 않았습니다.');
                }
              })
            }
          >
            승인·반려 결과 저장
          </button>
          {proposal.reviewedAt && !proposal.appliedAt && (
            <div className="space-y-2 rounded border p-2">
              <p>
                저장된 승인 항목 중 실제 반영할 항목을 선택하세요. 한 번 반영하면 이 변경안은
                종료되며 나머지 항목은 새 변경안으로 처리합니다.
              </p>
              {proposal.changes
                .filter((c) => c.decision === 'approved')
                .map((c) => (
                  <label key={c.field} className="mr-3 inline-block">
                    <input
                      type="checkbox"
                      disabled={!canWrite || busy}
                      checked={applyFields.includes(c.field)}
                      onChange={() => {
                        setApplyFields(toggle(applyFields, c.field));
                        setConfirmApply(false);
                      }}
                    />
                    {labels[c.field]} 실제 반영
                  </label>
                ))}
              <label className="block">
                <input
                  type="checkbox"
                  disabled={!canWrite || busy}
                  checked={confirmApply}
                  onChange={(e) => setConfirmApply(e.target.checked)}
                />{' '}
                선택 항목이 공통 상품 정보와 이를 읽는 서비스에 반영됨을 확인했습니다.
              </label>
              <button
                type="button"
                className={buttonClass}
                disabled={
                  !canWrite ||
                  busy ||
                  !confirmApply ||
                  !applyFields.length ||
                  proposal.changes.some(
                    (c) => approved.includes(c.field) !== (c.decision === 'approved'),
                  ) ||
                  note !== proposal.reviewNote
                }
                onClick={() =>
                  void execute(async () => {
                    const result = await api.applyProposal(proposal, applyFields);
                    if (active.current) {
                      remember(result);
                      setContext(null);
                      setNotice(
                        '선택 항목을 반영했습니다. 다른 변경은 최신 원본을 다시 불러와 작성하세요.',
                      );
                    }
                  })
                }
              >
                선택 항목 원본에 반영
              </button>
            </div>
          )}
          {proposal.appliedAt && (
            <p role="status">
              반영 완료: {new Date(proposal.appliedAt).toLocaleString()} ·{' '}
              {proposal.appliedFields?.map((f) => labels[f]).join(', ')} · 처리자{' '}
              {proposal.appliedBy}
            </p>
          )}
          <button
            type="button"
            className={buttonClass}
            disabled={busy}
            onClick={() =>
              void execute(async () => {
                const [result, failed] = await Promise.all([
                  api.proposalVersions(proposal.id),
                  api.proposalAttempts(proposal.id),
                ]);
                if (active.current) {
                  setVersions(result);
                  setAttempts(failed);
                }
              })
            }
          >
            변경안 저장·검토·반영 이력 보기
          </button>
          {attempts.map((attempt, index) => (
            <p key={index} className="text-sm">
              미반영 요청 · {new Date(attempt.at).toLocaleString()} ·{' '}
              {attempt.fields.map((f) => labels[f]).join(', ')} ·{' '}
              {attempt.code === 'PRODUCT_SOURCE_CHANGED' ? '원본 충돌' : '반영 차단·실패'} · 처리자{' '}
              {attempt.actor}
            </p>
          ))}
          {versions.map((v) => (
            <details key={v.revision}>
              <summary>
                v{v.revision} · {v.appliedAt ? '반영 완료' : v.reviewedAt ? '검토' : '초안'} ·{' '}
                {v.appliedBy ?? v.reviewedBy ?? v.createdBy}
              </summary>
              <p className="text-sm">
                {new Date(v.appliedAt ?? v.reviewedAt ?? v.createdAt).toLocaleString()} ·{' '}
                {v.reviewNote ?? '초안 저장'}
              </p>
              {v.changes.map((c) => (
                <div key={c.field}>
                  <strong>
                    {labels[c.field]} ·{' '}
                    {c.decision === 'approved'
                      ? '승인'
                      : c.decision === 'rejected'
                        ? '반려'
                        : '대기'}
                  </strong>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-sm">
                    변경 전: {display(c.before)}
                    {'\n'}제안: {display(c.after)}
                  </pre>
                </div>
              ))}
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
