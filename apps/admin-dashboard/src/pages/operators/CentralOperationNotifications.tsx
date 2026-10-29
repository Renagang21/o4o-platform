import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { NotificationBell, type NotificationItem } from '@o4o/account-ui';
import { DataTable, type ListColumnDef } from '@o4o/operator-ux-core';
import { ActionBar } from '@o4o/ui';
import { centralTaskHref } from './central-operation-navigation';
import { centralServiceLabel } from './central-operation-labels';

const CHANGED = 'central-operation-notifications-changed';
type Item = NotificationItem & { serviceKey: string };
export default function CentralOperationNotifications({ scopeKey, variant = 'bell' }: { scopeKey: string; variant?: 'bell' | 'panel' }) {
  const [snapshot, setSnapshot] = useState<{ scope: string; items: Item[]; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [unreadOnly, setUnreadOnly] = useState(true);
  const sequence = useRef(0);
  const lock = useRef(false);
  const lifecycle = useRef({ mounted: false, scope: scopeKey });
  const navigate = useNavigate();
  const load = useCallback(async () => {
    if (!lifecycle.current.mounted || lifecycle.current.scope !== scopeKey) return;
    const seq = ++sequence.current;
    setLoading(true);
    try {
      const response = await authClient.api.get('/operator/central-access/notifications');
      const data = response.data?.data;
      if (!Array.isArray(data?.notifications) || !Number.isSafeInteger(data?.unreadCount) || data.unreadCount < 0) throw new Error('INVALID_NOTIFICATION_LIST');
      if (seq === sequence.current) {
        setSnapshot({ scope: scopeKey, items: data.notifications, count: data.unreadCount });
        setSelected(previous => new Set([...previous].filter(id => data.notifications.some((item: Item) => item.id === id && !item.isRead))));
        setError('');
      }
    } catch {
      if (seq === sequence.current) setError('운영 알림을 조회하지 못했습니다. 이전 알림은 최신이 아닐 수 있습니다.');
    } finally { if (seq === sequence.current) setLoading(false); }
  }, [scopeKey]);
  useEffect(() => {
    lifecycle.current = { mounted: true, scope: scopeKey };
    setSelected(new Set()); setNotice('');
    void load();
    const refresh = () => void load();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    window.addEventListener(CHANGED, refresh);
    return () => { lifecycle.current.mounted = false; sequence.current++; window.clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener(CHANGED, refresh); };
  }, [load, scopeKey]);
  const current = snapshot?.scope === scopeKey ? snapshot : null;
  const rows = (current?.items ?? []).filter(item => !unreadOnly || !item.isRead);
  const selectedUnread = rows.filter(item => selected.has(item.id) && !item.isRead).map(item => item.id);
  const read = async (ids: string[]) => {
    const eligible = ids.filter(id => current?.items.some(item => item.id === id && !item.isRead));
    if (lock.current || !eligible.length) return;
    lock.current = true; setWriting(true); setNotice('');
    try {
      const response = await authClient.api.post('/notifications/read', { notificationIds: eligible });
      if (response.data?.success !== true) throw new Error('NOTIFICATION_READ_FAILED');
      if (lifecycle.current.mounted && lifecycle.current.scope === scopeKey) {
        setSelected(new Set()); setNotice(`${eligible.length}개 알림을 읽음으로 표시했습니다. 업무의 승인·처리 상태는 바뀌지 않습니다.`);
      }
      // The panel may unmount during navigation; surviving consumers still need a fresh query.
      window.dispatchEvent(new Event(CHANGED));
    } catch { if (lifecycle.current.mounted && lifecycle.current.scope === scopeKey) setError('알림의 읽음 상태를 저장하지 못했습니다. 다시 조회해 주세요.'); }
    finally { lock.current = false; if (lifecycle.current.mounted) setWriting(false); }
  };
  const open = (item: Item) => {
    if (!item.isRead) void read([item.id]);
    const href = typeof item.metadata?.targetUrl === 'string' ? item.metadata.targetUrl : '/operator';
    const target = centralTaskHref(item.serviceKey, href);
    if (target.startsWith('/')) navigate(target); else window.location.assign(target);
  };
  if (variant === 'bell') return <div className="flex items-center gap-2"><span className="text-sm text-slate-600">운영자 알림</span>
    <NotificationBell unreadCount={current?.count ?? 0} notifications={current?.items ?? []} loading={loading} onOpen={() => void load()} onMarkAsRead={id => void read([id])} onItemClick={item => {
      const row = item as Item;
      const href = typeof row.metadata?.targetUrl === 'string' ? row.metadata.targetUrl : '/operator';
      const target = centralTaskHref(row.serviceKey, href);
      if (target.startsWith('/')) navigate(target); else window.location.assign(target);
    }} ariaLabel="통합 운영 알림" emptyText={error ? '알림을 조회하지 못했습니다. 다시 열어 주세요.' : '새 운영 알림이 없습니다.'} />
    {error && <span role="alert" className="text-sm text-red-700">알림 조회·처리 확인 필요</span>}
  </div>;
  const columns: ListColumnDef<Item>[] = [
    { key: '_select', header: '', system: true, width: '44px', render: (_, item) => <input type="checkbox" aria-label={`${item.title} 알림 선택`} checked={selected.has(item.id)} disabled={writing || item.isRead} onClick={e => e.stopPropagation()} onChange={e => setSelected(previous => { const next = new Set(previous); if (e.target.checked) next.add(item.id); else next.delete(item.id); return next; })} /> },
    { key: 'title', header: '운영 알림', render: (_, item) => <button type="button" className="w-full whitespace-normal break-words text-left" onClick={() => open(item)}><span className={item.isRead ? 'text-slate-600' : 'font-semibold text-slate-900'}>{item.title}</span><span className={`ml-2 inline-block rounded-full px-2 py-0.5 text-xs ${item.isRead ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-800'}`}>{item.isRead ? '읽음' : '읽지 않음'}</span>{item.message && <p className="mt-1 line-clamp-2 break-words text-sm text-slate-500">{item.message}</p>}<p className="mt-1 text-xs text-slate-400">{centralServiceLabel(item.serviceKey)} · {new Date(item.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p></button> },
  ];
  return <section aria-label="운영자 알림 목록" className="mb-6 space-y-3 rounded-xl border bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">운영자 알림 <span className="text-blue-700">{current ? current.count : '—'}</span></h2><p className="mt-1 text-sm text-slate-500">내게 전달된 알림을 읽지 않음 우선으로 20건 표시합니다. 알림을 열면 해당 업무로 이동합니다.</p></div><button type="button" disabled={loading || writing} className="rounded border px-3 py-2 text-sm" onClick={() => void load()}>알림 새로고침</button></div>
    {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="text-sm text-blue-800">{notice}</p>}
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={unreadOnly} onChange={e => { setUnreadOnly(e.target.checked); setSelected(new Set()); }} />읽지 않은 알림만</label>
    <div className="[&>div>div]:flex-wrap"><ActionBar selectedCount={selectedUnread.length} onClearSelection={() => { if (!lock.current) setSelected(new Set()); }} actions={[{ key: 'read', label: '선택 알림 읽음', variant: 'primary', disabled: loading || writing || !!error, loading: writing, onClick: () => read(selectedUnread) }]} /></div>
    <DataTable className="[&_td]:px-3 [&_th]:px-3 [&_td]:whitespace-normal [&_th]:whitespace-normal" tableId="central-operation-notifications" columns={columns} data={rows} rowKey="id" loading={loading && !current} selectable selectedKeys={selected} onSelectionChange={keys => { if (!lock.current) setSelected(new Set([...keys].filter(id => rows.some(item => item.id === id && !item.isRead)))); }} emptyMessage={error ? '알림을 다시 조회해 주세요.' : unreadOnly ? '표시할 읽지 않은 알림이 없습니다.' : '운영 알림이 없습니다.'} />
  </section>;
}
