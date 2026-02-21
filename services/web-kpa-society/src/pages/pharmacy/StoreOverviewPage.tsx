/**
 * StoreOverviewPage — 매장 스토어 개요
 *
 * WO-STORE-ADMIN-CONSOLIDATION-V1
 *
 * 경로: /store
 * 채널 상태, 상품 수, 블로그, 태블릿 대기 등을 한 눈에 표시.
 * 각 카드 클릭 → 해당 서브페이지로 이동.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchChannelOverview,
  fetchStoreHubOverview,
  type ChannelOverview,
  type StoreHubOverview,
} from '../../api/storeHub';

const CHANNEL_LABEL: Record<string, string> = {
  B2C: 'B2C 몰',
  TABLET: '태블릿',
  SIGNAGE: '사이니지',
  KIOSK: '키오스크',
};

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  APPROVED: { text: '활성', color: '#22c55e' },
  PENDING: { text: '대기', color: '#eab308' },
  REJECTED: { text: '반려', color: '#ef4444' },
  SUSPENDED: { text: '중지', color: '#94a3b8' },
  EXPIRED: { text: '만료', color: '#94a3b8' },
  TERMINATED: { text: '종료', color: '#94a3b8' },
};

export function StoreOverviewPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<ChannelOverview[]>([]);
  const [overview, setOverview] = useState<StoreHubOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchChannelOverview().catch(() => []),
      fetchStoreHubOverview().catch(() => null),
    ]).then(([ch, ov]) => {
      setChannels(ch);
      setOverview(ov);
      setLoading(false);
    });
  }, []);

  const approvedCount = channels.filter((c) => c.status === 'APPROVED').length;
  const totalProducts = overview
    ? (overview.products.glycopharm?.totalCount || 0) + (overview.products.cosmetics?.listedCount || 0)
    : 0;

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '960px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
        매장 스토어
      </h1>
      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
        매장 운영 상태를 확인하고 관리하세요.
      </p>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <KpiCard
          label="활성 채널"
          value={`${approvedCount} / ${channels.length}`}
          sub="승인된 채널"
          onClick={() => navigate('/store/channels')}
        />
        <KpiCard
          label="진열 상품"
          value={`${totalProducts}개`}
          sub="B2C 상품 기준"
          onClick={() => navigate('/store/products/b2c')}
        />
        <KpiCard
          label="콘텐츠"
          value={`${overview?.contents.totalSlotCount || 0}개`}
          sub="등록된 콘텐츠 슬롯"
          onClick={() => navigate('/store/content')}
        />
      </div>

      {/* Channel Status */}
      <Section title="채널 상태" linkTo="/store/channels">
        {channels.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>등록된 채널이 없습니다.</p>
        ) : (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {channels.map((ch) => {
              const st = STATUS_LABEL[ch.status] || { text: ch.status, color: '#94a3b8' };
              return (
                <div key={ch.id} style={styles.channelChip}>
                  <span style={{ fontWeight: 600 }}>{CHANNEL_LABEL[ch.channelType] || ch.channelType}</span>
                  <span style={{ color: st.color, fontSize: '13px', fontWeight: 600 }}>{st.text}</span>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                    상품 {ch.visibleProductCount}/{ch.totalProductCount}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Quick Links */}
      <Section title="빠른 이동">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <QuickLink icon="🧱" label="레이아웃 편집" to="/store/settings/layout" />
          <QuickLink icon="🎨" label="템플릿 선택" to="/store/settings/template" />
          <QuickLink icon="📝" label="블로그 관리" to="/store/content/blog" />
          <QuickLink icon="📱" label="태블릿 요청" to="/store/channels/tablet" />
          <QuickLink icon="📡" label="채널 관리" to="/store/channels" />
          <QuickLink icon="⚙️" label="매장 설정" to="/store/settings" />
        </div>
      </Section>
    </div>
  );
}

// ── Sub-components ──

function KpiCard({ label, value, sub, onClick }: { label: string; value: string; sub: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={styles.kpiCard}>
      <div style={{ fontSize: '13px', color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', margin: '4px 0' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{sub}</div>
    </button>
  );
}

function Section({ title, linkTo, children }: { title: string; linkTo?: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <section style={styles.section}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>{title}</h2>
        {linkTo && (
          <button onClick={() => navigate(linkTo)} style={styles.linkBtn}>전체보기</button>
        )}
      </div>
      {children}
    </section>
  );
}

function QuickLink({ icon, label, to }: { icon: string; label: string; to: string }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(to)} style={styles.quickLink}>
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span style={{ fontSize: '14px', fontWeight: 500, color: '#334155' }}>{label}</span>
    </button>
  );
}

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
  kpiCard: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'left',
    cursor: 'pointer',
  },
  section: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
  },
  channelChip: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    minWidth: '120px',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    fontSize: '13px',
    cursor: 'pointer',
    padding: 0,
  },
  quickLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
  },
};

export default StoreOverviewPage;
