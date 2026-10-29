import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ActionQueueBlock } from '@o4o/operator-ux-core';
import { authClient } from '@o4o/auth-client';
import { centralTaskHref } from './central-operation-navigation';

interface Task { key: string; service: string; label: string; href: string; count: number | null; available: boolean }
interface Snapshot { tasks: Task[]; unreadCount: number | null; generatedAt: string }
export default function CentralOperationOverview({ roleKey }: { roleKey: string }) {
  const [snapshot, setSnapshot] = useState<{ scope: string; value: Snapshot } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const seq = ++sequence.current;
    setLoading(true);
    try {
      const response = await authClient.api.get('/operator/central-access/overview');
      const value = response.data?.data;
      if (!Array.isArray(value?.tasks)) throw new Error('INVALID_OVERVIEW_RESPONSE');
      if (sequence.current === seq) { setSnapshot({ scope: roleKey, value }); setError(''); }
    } catch {
      if (sequence.current === seq) setError('운영 알림을 불러오지 못했습니다. 표시된 대기 현황이 최신이 아닐 수 있습니다.');
    } finally {
      if (sequence.current === seq) setLoading(false);
    }
  }, [roleKey]);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    const focus = () => void load();
    window.addEventListener('focus', focus);
    return () => { sequence.current++; window.clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [load]);
  const current = snapshot?.scope === roleKey ? snapshot.value : null;
  const unavailable = current?.tasks.filter(task => !task.available) ?? [];
  const queue = (current?.tasks ?? []).filter(task => task.available && task.count !== null && task.count > 0).map(task => ({
    id: `${task.service}:${task.key}`, label: task.label, count: task.count!, link: centralTaskHref(task.service, task.href),
  }));
  return <section aria-label="통합 운영 알림" className="mb-6 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">운영 알림·처리 대기</h2>
      <button type="button" disabled={loading} className="rounded border bg-white px-3 py-2" onClick={() => void load()}>알림 새로고침</button>
    </div>
    {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3">{error}</p>}
    {!current && loading && <output>운영 대기 현황 확인 중…</output>}
    {current && <>
      <p className="text-sm text-slate-600">읽지 않은 알림: {current.unreadCount === null ? '조회 필요' : `${current.unreadCount}건`} · 대기 목록은 1분마다 갱신합니다.</p>
      {unavailable.length > 0 && <p role="alert" className="rounded border border-amber-200 bg-amber-50 p-3">일부 업무의 대기 현황을 조회하지 못했습니다: {unavailable.map(task => task.label).join(', ')}. 0건으로 처리하지 않았습니다.</p>}
      {(queue.length > 0 || unavailable.length === 0 && !error) && <ActionQueueBlock items={queue} />}
      {current.tasks.length > 0 && <details><summary className="cursor-pointer text-sm">전체 업무 대기 현황</summary><ul className="mt-2 grid gap-2 md:grid-cols-2">{current.tasks.map(task => <li key={`${task.service}:${task.key}`} className="rounded border bg-white px-3 py-2"><Link className="text-blue-700" to={centralTaskHref(task.service, task.href)}>{task.label}</Link> <span>{task.available ? `${task.count}건` : '조회 실패'}</span></li>)}</ul></details>}
    </>}
  </section>;
}
