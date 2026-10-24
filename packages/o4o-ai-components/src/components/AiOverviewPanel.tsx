import { useEffect, useRef, useState } from 'react';

export interface AiOverviewData {
  summary: string;
  recommendedActions: string[];
  evidence: { collectedAt: string; metrics: Record<string, { label: string; value: number | null }> };
}
interface Props {
  scopeKey: string;
  load: () => Promise<AiOverviewData>;
  disabled?: boolean;
  errorMessage?: (error: unknown) => string;
}

/** Shared presentation only. Hosts supply authenticated transport and verify the returned scope. */
export function AiOverviewPanel(props: Readonly<Props>) {
  return <OverviewSession key={props.scopeKey} {...props} />;
}
function OverviewSession({ load, disabled, errorMessage }: Readonly<Props>) {
  const [result, setResult] = useState<AiOverviewData | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const active = useRef(true), locked = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const request = async () => {
    if (locked.current || disabled) return;
    locked.current = true; setBusy(true); setError(''); setResult(null);
    try {
      const data = await load();
      if (!data?.summary || !Array.isArray(data.recommendedActions) || !data.evidence?.metrics) throw new Error('INVALID_RESPONSE');
      if (active.current) setResult(data);
    } catch (cause) {
      if (active.current) setError(errorMessage?.(cause) ?? '현황 설명을 받지 못했습니다. 기존 화면에서 업무를 계속할 수 있습니다.');
    } finally { locked.current = false; if (active.current) setBusy(false); }
  };
  return <section aria-label="AI 현황 설명" style={{ margin: '1rem 0', padding: '1rem', border: '1px solid #cbd5e1', borderRadius: 12, minWidth: 0, overflowWrap: 'anywhere' }}>
    <button type="button" disabled={busy || disabled} onClick={() => void request()} style={{ minHeight: 44, padding: '0.5rem 1rem', borderRadius: 8 }}>
      {busy ? '현황 설명 준비 중…' : 'AI로 현재 현황 설명'}
    </button>
    {error && <p role="alert">{error}</p>}
    {result && <div style={{ marginTop: 12 }}>
      <p style={{ whiteSpace: 'pre-wrap' }}>{result.summary}</p>
      <ul>{result.recommendedActions.map((action, i) => <li key={`${i}:${action}`}>{action}</li>)}</ul>
      <p>조회 시각: {new Date(result.evidence.collectedAt).toLocaleString()}</p>
      <dl>{Object.entries(result.evidence.metrics).map(([key, metric]) => <div key={key} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><dt>{metric.label}</dt><dd>{metric.value === null ? '확인하지 못함' : `${metric.value.toLocaleString()}건`}</dd></div>)}</dl>
    </div>}
  </section>;
}
