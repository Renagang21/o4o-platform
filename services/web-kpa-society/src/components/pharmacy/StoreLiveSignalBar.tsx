/**
 * StoreLiveSignalBar — 매장 실시간 신호 바
 *
 * WO-O4O-STORE-LIVE-SIGNAL-LAYER-V1
 *
 * Polls /store-hub/live-signals every 5 seconds.
 * Shows active signal counts with navigation links.
 * Hidden when all signals are 0.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLiveSignals, type LiveSignals } from '../../api/storeHub';

const POLL_INTERVAL = 5_000; // 5 seconds

interface SignalDef {
  key: keyof LiveSignals;
  label: string;
  icon: string;
  link: string;
}

const SIGNAL_DEFS: SignalDef[] = [
  { key: 'newOrders', label: '새 주문', icon: '🔔', link: '/store/orders' },
  { key: 'pendingTabletRequests', label: '태블릿 요청', icon: '📱', link: '/store/tablet-requests' },
  { key: 'pendingSalesRequests', label: '판매 요청', icon: '🛒', link: '/store/orders' },
  { key: 'surveyRequests', label: '설문 요청', icon: '📝', link: '/store/orders' },
];

export function StoreLiveSignalBar() {
  const navigate = useNavigate();
  const [signals, setSignals] = useState<LiveSignals | null>(null);
  const [flash, setFlash] = useState(false);
  const prevTotalRef = useRef(0);

  const poll = useCallback(async () => {
    try {
      const data = await fetchLiveSignals();
      setSignals(data);

      const total = data.newOrders + data.pendingTabletRequests
        + data.pendingSalesRequests + data.surveyRequests;

      if (total > prevTotalRef.current && prevTotalRef.current >= 0) {
        setFlash(true);
        setTimeout(() => setFlash(false), 1200);
      }
      prevTotalRef.current = total;
    } catch {
      // silent — graceful degradation
    }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [poll]);

  if (!signals) return null;

  const activeSignals = SIGNAL_DEFS.filter(s => (signals[s.key] ?? 0) > 0);
  if (activeSignals.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 16px',
        marginBottom: '16px',
        borderRadius: '12px',
        background: flash ? '#fef2f2' : '#fff7ed',
        border: `1px solid ${flash ? '#fecaca' : '#fed7aa'}`,
        transition: 'background 0.3s, border-color 0.3s',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: '13px', fontWeight: 600, color: '#9a3412', whiteSpace: 'nowrap' }}>
        신호
      </span>

      {activeSignals.map((s) => (
        <button
          key={s.key}
          onClick={() => navigate(s.link)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '8px',
            border: 'none',
            background: flash ? '#fee2e2' : '#ffedd5',
            color: '#7c2d12',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          <span>{s.icon}</span>
          <span>{s.label}</span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '20px',
            height: '20px',
            borderRadius: '10px',
            background: '#dc2626',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            padding: '0 5px',
          }}>
            {signals[s.key]}
          </span>
        </button>
      ))}
    </div>
  );
}
