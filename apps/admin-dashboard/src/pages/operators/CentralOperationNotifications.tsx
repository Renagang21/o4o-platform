import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { NotificationBell, type NotificationItem } from '@o4o/account-ui';
import { centralTaskHref } from './central-operation-navigation';

type Item = NotificationItem & { serviceKey: string };
export default function CentralOperationNotifications({ scopeKey }: { scopeKey: string }) {
  const [snapshot, setSnapshot] = useState<{ scope: string; items: Item[]; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const sequence = useRef(0);
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
      if (seq === sequence.current) { setSnapshot({ scope: scopeKey, items: data.notifications, count: data.unreadCount }); setError(''); }
    } catch {
      if (seq === sequence.current) setError('운영 알림을 조회하지 못했습니다.');
    } finally { if (seq === sequence.current) setLoading(false); }
  }, [scopeKey]);
  useEffect(() => {
    lifecycle.current = { mounted: true, scope: scopeKey };
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    return () => { lifecycle.current.mounted = false; sequence.current++; window.clearInterval(timer); };
  }, [load]);
  const current = snapshot?.scope === scopeKey ? snapshot : null;
  const read = async (id: string) => {
    try { await authClient.api.post('/notifications/read', { notificationIds: [id] }); if (lifecycle.current.mounted && lifecycle.current.scope === scopeKey) await load(); }
    catch { if (lifecycle.current.mounted && lifecycle.current.scope === scopeKey) setError('알림의 읽음 상태를 저장하지 못했습니다. 다시 조회해 주세요.'); }
  };
  return <div className="flex items-center gap-2">
    <NotificationBell unreadCount={current?.count ?? 0} notifications={current?.items ?? []} loading={loading} onOpen={() => void load()} onMarkAsRead={id => void read(id)} onItemClick={item => {
      const currentItem = item as Item;
      const href = typeof currentItem.metadata?.targetUrl === 'string' ? currentItem.metadata.targetUrl : '/operator';
      const target = centralTaskHref(currentItem.serviceKey, href);
      if (target.startsWith('/')) navigate(target); else window.location.assign(target);
    }} ariaLabel="통합 운영 알림" emptyText={error ? '알림을 조회하지 못했습니다. 다시 열어 주세요.' : '새 운영 알림이 없습니다.'} />
    {error && <span role="alert" className="text-sm text-red-700">알림 조회·처리 확인 필요</span>}
  </div>;
}
