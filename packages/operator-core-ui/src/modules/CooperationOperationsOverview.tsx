import { useEffect, useState } from 'react';
import type { InboxClient } from './OperatorInbox';

export interface CooperationWorkArea {
  title: string;
  description: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}
interface WorkTask {
  key: string; label: string; count: number | null; oldest: string | null; available: boolean;
}
interface WorkSummary {
  name: string;
  contact: { pending: number; oldest: string | null; deliveryAttention: number };
  tasks: WorkTask[];
}
const panel = { background: '#fff', border: '1px solid #cbd5e1', borderRadius: 12, padding: 16, minWidth: 0, overflowWrap: 'anywhere' as const };
const linkStyle = { color: '#1d4ed8', textDecoration: 'underline', textUnderlineOffset: 3, minHeight: 36, display: 'inline-flex', alignItems: 'center' } as const;
const listStyle = { paddingInlineStart: 20, display: 'grid', gap: 6, marginBlock: 12 } as const;
const descriptionStyle = { color: '#475569', fontSize: 14, lineHeight: 1.65, marginBlock: 8 };
const oldest = (value: string | null) => value && !Number.isNaN(Date.parse(value))
  ? `가장 오래된 접수: ${new Date(value).toLocaleDateString('ko-KR')}` : '';

/** Presentation only. The host supplies account/scope and existing authorized destinations. */
export function CooperationOperationsOverview(props: Readonly<{
  client: InboxClient;
  endpoint: string;
  scopeKey: string;
  inboxHref: string;
  taskHref: (key: string) => string | undefined;
  areas: readonly CooperationWorkArea[];
}>) {
  return <ScopedOverview key={`${props.scopeKey}:${props.endpoint}`} {...props} />;
}

function ScopedOverview({ client, endpoint, inboxHref, taskHref, areas }: Parameters<typeof CooperationOperationsOverview>[0]) {
  const [summary, setSummary] = useState<WorkSummary | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    let pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      setLoading(true);
      try {
        const response = await client.get(`${endpoint}/manage`);
        const value = response.data.data as WorkSummary;
        if (!value || !Array.isArray(value.tasks) || !value.contact ||
          !Number.isFinite(value.contact.pending) || !Number.isFinite(value.contact.deliveryAttention)) throw new Error('Invalid summary');
        if (active) { setSummary(value); setError(false); }
      } catch {
        if (active) setError(true);
      } finally {
        pending = false;
        if (active) setLoading(false);
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 60_000);
    return () => { active = false; clearInterval(timer); };
  }, [client, endpoint, revision]);
  return <section aria-label="협업체 운영 홈" style={{ display: 'grid', gap: 16 }}>
    <div style={panel}>
      <h2 style={{ fontSize: 20, fontWeight: 600 }}>처리할 상황{summary ? ` · ${summary.name}` : ''}</h2>
      <p style={descriptionStyle}>실제 접수 기록의 대기 건입니다. 1분마다 갱신하며, 업무별 상태와 처리 권한은 각 관리 화면에서 확인합니다.</p>
      <button type="button" disabled={loading} onClick={() => setRevision(value => value + 1)} style={{ minHeight: 44, padding: '8px 12px', border: '1px solid #94a3b8', borderRadius: 6 }}>대기 건 새로고침</button>
      {loading && !summary && <p role="status">대기 건을 불러오고 있습니다…</p>}
      {error && <p role="alert">대기 건을 조회하지 못했습니다.{summary ? ' 이전 조회 결과입니다. 다시 조회해 주세요.' : ' 0건으로 판단하지 말고 다시 조회해 주세요.'}</p>}
      {summary && <ul style={listStyle}>
        <li><a style={linkStyle} href={inboxHref}>미처리 문의 {summary.contact.pending}건</a> · {oldest(summary.contact.oldest)}</li>
        <li><a style={linkStyle} href={inboxHref}>문의 알림 전달 확인 필요 {summary.contact.deliveryAttention}건</a></li>
        {summary.tasks.map(task => {
          const href = taskHref(task.key);
          const count = task.available && typeof task.count === 'number' && Number.isFinite(task.count) && task.count >= 0 ? `${task.count}건` : '조회 불가';
          return <li key={task.key}>
            {href ? <a style={linkStyle} href={href}>{task.label} {count}</a> : <span>{task.label} {count} · 문의함에서 처리 경로 확인</span>}
            {task.available && task.oldest && <span> · {oldest(task.oldest)}</span>}
          </li>;
        })}
      </ul>}
      <a style={linkStyle} href={inboxHref}>운영 알림·문의함 열기 →</a>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 12 }}>
      {areas.map(area => <section key={area.title} style={panel}>
        <h3 style={{ fontSize: 17, fontWeight: 600 }}>{area.title}</h3><p style={descriptionStyle}>{area.description}</p>
        <ul style={listStyle}>{area.links.map(link => <li key={link.href}><a style={linkStyle} href={link.href}>{link.label} →</a></li>)}</ul>
      </section>)}
    </div>
  </section>;
}
