/**
 * ChannelLayerSection - 채널 소유형 레이어 (KPI 대시보드)
 *
 * WO-PHARMACY-HUB-CHANNEL-LAYER-UI-V1
 * WO-PHARMACY-CHANNEL-KPI-STABILIZATION-V1 (KPI metrics + warnings)
 *
 * organization_channels 기반 채널 카드 + KPI 지표 표시.
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
    return null;
  }

  const pendingChannels = channels.filter(ch => ch.status === 'PENDING');
  const approvedChannels = channels.filter(ch => ch.status === 'APPROVED');
  const hasNoApproved = approvedChannels.length === 0;

  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={cardBase}>
        <div style={headerRow}>
          <h2 style={titleStyle}>판매 채널</h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            {approvedChannels.length}/{channels.length} 활성
          </span>
        </div>

        {/* Warning: no approved channels */}
        {hasNoApproved && (
          <div style={warningBanner}>
            승인된 채널이 없습니다. 채널 승인 후 상품 판매가 가능합니다.
          </div>
        )}

        {/* Warning: pending channels exist */}
        {!hasNoApproved && pendingChannels.length > 0 && (
          <div style={pendingBanner}>
            승인 대기 중인 채널이 {pendingChannels.length}개 있습니다:{' '}
            {pendingChannels.map(ch => CHANNEL_LABELS[ch.channelType]).join(', ')}
          </div>
        )}

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
  const isDisabled = channel.status === 'SUSPENDED' || channel.status === 'EXPIRED' || channel.status === 'TERMINATED';
  const isApproved = channel.status === 'APPROVED';

  return (
    <div
      style={{
        ...channelCardStyle,
        opacity: isDisabled ? 0.5 : 1,
        cursor: isDisabled ? 'default' : 'pointer',
      }}
      onClick={isDisabled ? undefined : onClick}
      onMouseEnter={(e) => { if (!isDisabled) e.currentTarget.style.borderColor = '#93c5fd'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
    >
      {/* Channel name + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
          {label}
        </span>
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

      {/* KPI metrics */}
      {isApproved ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            상품{' '}
            <strong style={{ color: '#0f172a' }}>{channel.visibleProductCount}</strong>
            <span style={{ color: '#94a3b8' }}> / {channel.totalProductCount}</span>
          </div>
          {channel.salesLimitConfiguredCount > 0 && (
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              한도 설정: {channel.salesLimitConfiguredCount}개
            </div>
          )}
        </div>
      ) : channel.status === 'EXPIRED' ? (
        <p style={{ margin: 0, fontSize: '12px', color: '#92400e' }}>
          채널 갱신이 필요합니다
        </p>
      ) : channel.status === 'REJECTED' ? (
        <p style={{ margin: 0, fontSize: '12px', color: '#991b1b' }}>
          승인이 거부되었습니다
        </p>
      ) : (
        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
          승인 대기 중
        </p>
      )}

      {/* Action link */}
      {!isDisabled && (
        <div style={{
          marginTop: '10px',
          fontSize: '12px',
          color: '#2563eb',
          fontWeight: 500,
        }}>
          관리하기 &rarr;
        </div>
      )}
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

const warningBanner: React.CSSProperties = {
  padding: '10px 14px',
  marginBottom: '16px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 500,
  backgroundColor: '#fef3c7',
  color: '#92400e',
  border: '1px solid #fde68a',
};

const pendingBanner: React.CSSProperties = {
  padding: '8px 14px',
  marginBottom: '16px',
  borderRadius: '8px',
  fontSize: '12px',
  backgroundColor: '#eff6ff',
  color: '#1e40af',
  border: '1px solid #bfdbfe',
};

const channelGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: '12px',
};

const channelCardStyle: React.CSSProperties = {
  padding: '16px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  transition: 'border-color 0.15s',
};
