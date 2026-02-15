/**
 * ChannelLayerSection - 채널 소유형 레이어 (읽기 전용)
 *
 * WO-PHARMACY-HUB-CHANNEL-LAYER-UI-V1
 *
 * organization_channels 기반 채널 카드 표시.
 * 주문/결제 기능 없음 — 읽기 전용 상태 표시만.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchChannelOverview,
  type ChannelOverview,
  type ChannelStatus,
  type ChannelType,
} from '../../../api/storeHub';

type WidgetState = 'loading' | 'loaded' | 'error';

const CHANNEL_LABELS: Record<ChannelType, string> = {
  B2C: '온라인 스토어',
  KIOSK: '키오스크',
  TABLET: '태블릿',
  SIGNAGE: '사이니지',
};

const STATUS_CONFIG: Record<ChannelStatus, { label: string; bg: string; color: string }> = {
  APPROVED:   { label: '승인됨',  bg: '#dcfce7', color: '#166534' },
  PENDING:    { label: '대기중',  bg: '#fef3c7', color: '#92400e' },
  REJECTED:   { label: '거부됨',  bg: '#fecaca', color: '#991b1b' },
  SUSPENDED:  { label: '정지됨',  bg: '#f1f5f9', color: '#64748b' },
  EXPIRED:    { label: '만료됨',  bg: '#f1f5f9', color: '#64748b' },
  TERMINATED: { label: '해지됨',  bg: '#f1f5f9', color: '#64748b' },
};

export function ChannelLayerSection() {
  const navigate = useNavigate();
  const [state, setState] = useState<WidgetState>('loading');
  const [channels, setChannels] = useState<ChannelOverview[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchChannelOverview()
      .then((data) => {
        if (cancelled) return;
        setChannels(data);
        setState('loaded');
      })
      .catch(() => {
        if (cancelled) return;
        setState('error');
      });
    return () => { cancelled = true; };
  }, []);

  if (state === 'loading') {
    return (
      <section style={{ marginBottom: '32px' }}>
        <div style={cardBase}>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>판매 채널 정보를 불러오는 중...</p>
        </div>
      </section>
    );
  }

  if (state === 'error') {
    return (
      <section style={{ marginBottom: '32px' }}>
        <div style={cardBase}>
          <h2 style={titleStyle}>판매 채널</h2>
          <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: '13px' }}>
            채널 정보를 불러오지 못했습니다.
          </p>
        </div>
      </section>
    );
  }

  if (channels.length === 0) {
    return null; // No channels registered — don't render empty section
  }

  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={cardBase}>
        <div style={headerRow}>
          <h2 style={titleStyle}>판매 채널</h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            {channels.length}개 채널
          </span>
        </div>

        <div style={channelGrid}>
          {channels.map((ch) => (
            <ChannelCard
              key={ch.id}
              channel={ch}
              onClick={() => navigate(`/pharmacy/sell?channel=${ch.channelType}`)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ChannelCard({
  channel,
  onClick,
}: {
  channel: ChannelOverview;
  onClick: () => void;
}) {
  const label = CHANNEL_LABELS[channel.channelType] || channel.channelType;
  const statusCfg = STATUS_CONFIG[channel.status] || STATUS_CONFIG.PENDING;

  return (
    <div
      style={channelCardStyle}
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#93c5fd'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
    >
      <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
        {label}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{
          display: 'inline-block',
          padding: '1px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 500,
          background: statusCfg.bg,
          color: statusCfg.color,
        }}>
          {statusCfg.label}
        </span>
      </div>

      <div style={{ fontSize: '13px', color: '#64748b' }}>
        노출 상품: <strong style={{ color: '#0f172a' }}>{channel.visibleProductCount}</strong>
      </div>

      <div style={{
        marginTop: '12px',
        fontSize: '12px',
        color: '#2563eb',
        fontWeight: 500,
      }}>
        관리하기 &rarr;
      </div>
    </div>
  );
}

// ── Styles ──

const cardBase: React.CSSProperties = {
  padding: '20px 24px',
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

const headerRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '16px',
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '18px',
  fontWeight: 600,
  color: '#0f172a',
};

const channelGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: '12px',
};

const channelCardStyle: React.CSSProperties = {
  padding: '16px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'border-color 0.15s',
};
