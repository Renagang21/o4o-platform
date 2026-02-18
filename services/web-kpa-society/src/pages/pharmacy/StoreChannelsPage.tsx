/**
 * StoreChannelsPage — 채널 상태 관리
 *
 * WO-STORE-ADMIN-CONSOLIDATION-V1
 *
 * 경로: /pharmacy/store/channels
 * 모든 판매 채널(B2C, TABLET, SIGNAGE, KIOSK)의 상태를 표시.
 * ChannelLayerSection 로직 기반, standalone 페이지 형태.
 */

import { useEffect, useState } from 'react';
import {
  fetchChannelOverview,
  type ChannelOverview,
  type ChannelStatus,
  type ChannelType,
} from '../../api/storeHub';

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

export function StoreChannelsPage() {
  const [channels, setChannels] = useState<ChannelOverview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChannelOverview()
      .then(setChannels)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const approvedCount = channels.filter((c) => c.status === 'APPROVED').length;

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '960px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
        채널 관리
      </h1>
      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
        {approvedCount}/{channels.length} 활성
      </p>

      {channels.length === 0 ? (
        <div style={styles.emptyCard}>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>등록된 채널이 없습니다.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {channels.map((ch) => {
            const label = CHANNEL_LABELS[ch.channelType] || ch.channelType;
            const st = STATUS_CONFIG[ch.status] || STATUS_CONFIG.PENDING;
            const isInactive = ch.status === 'SUSPENDED' || ch.status === 'EXPIRED' || ch.status === 'TERMINATED';

            return (
              <div key={ch.id} style={{ ...styles.card, opacity: isInactive ? 0.6 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>{label}</span>
                  <span style={{
                    padding: '2px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: st.bg,
                    color: st.color,
                  }}>
                    {st.label}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <Row label="상품 수" value={`${ch.visibleProductCount} / ${ch.totalProductCount}`} />
                  {ch.salesLimitConfiguredCount > 0 && (
                    <Row label="한도 설정" value={`${ch.salesLimitConfiguredCount}개`} />
                  )}
                  <Row label="채널 타입" value={ch.channelType} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ fontWeight: 500, color: '#1e293b' }}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '16px',
  },
  card: {
    padding: '20px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
  },
  emptyCard: {
    padding: '40px',
    textAlign: 'center',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
  },
};

export default StoreChannelsPage;
