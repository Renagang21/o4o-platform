/**
 * PharmacyDashboardPage - 내 매장관리 (운영 컨트롤 타워)
 *
 * WO-KPA-A-PAGE-ROLE-CLEANUP-V1
 * WO-KPA-A-DASHBOARD-OPERATIONAL-UPGRADE-V1
 * WO-KPA-A-B2B-SECTION-SIMPLIFICATION-V1
 *
 * Dashboard = "현재 상태 파악 → 문제 인지 → 바로 실행"
 *
 * [1] KPI 상단 고정
 * [2] 운영 신호 (Alert / Signal)
 * [3] B2B (도매 구매) — 단일 통합 블록
 * [4] B2C 상태 요약
 * [5] 노출 상태 요약
 * [6] 빠른 실행 버튼 (Quick Actions)
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../../contexts';
import { ContextGuard } from '../../components/common/ContextGuard';
import {
  fetchChannelOverview,
  fetchStoreHubOverview,
  type ChannelOverview,
  type ChannelStatus,
  type StoreHubOverview,
} from '../../api/storeHub';
import {
  getApplications,
  type ProductApplication,
} from '../../api/pharmacyProducts';

// ── Channel status display ──

const CHANNEL_STATUS_LABEL: Record<ChannelStatus, string> = {
  APPROVED: '활성',
  PENDING: '대기',
  REJECTED: '반려',
  SUSPENDED: '정지',
  EXPIRED: '만료',
  TERMINATED: '해지',
};

const CHANNEL_STATUS_STYLE: Record<ChannelStatus, { bg: string; color: string }> = {
  APPROVED: { bg: '#dcfce7', color: '#166534' },
  PENDING: { bg: '#fef3c7', color: '#92400e' },
  REJECTED: { bg: '#fecaca', color: '#991b1b' },
  SUSPENDED: { bg: '#f1f5f9', color: '#64748b' },
  EXPIRED: { bg: '#f1f5f9', color: '#64748b' },
  TERMINATED: { bg: '#f1f5f9', color: '#64748b' },
};

type LoadState = 'loading' | 'loaded' | 'error';

// ── Main Content ──

function PharmacyDashboardContent() {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [channels, setChannels] = useState<ChannelOverview[]>([]);
  const [overview, setOverview] = useState<StoreHubOverview | null>(null);
  const [applications, setApplications] = useState<ProductApplication[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchChannelOverview().catch(() => [] as ChannelOverview[]),
      fetchStoreHubOverview().catch(() => null),
      getApplications({ limit: 200 }).then(res => res.data).catch(() => [] as ProductApplication[]),
    ]).then(([ch, ov, apps]) => {
      if (cancelled) return;
      setChannels(ch);
      setOverview(ov);
      setApplications(apps);
      setLoadState('loaded');
    });
    return () => { cancelled = true; };
  }, []);

  // ── Derived data ──

  const approvedChannels = channels.filter(ch => ch.status === 'APPROVED');
  const pendingChannels = channels.filter(ch => ch.status === 'PENDING');
  const rejectedChannels = channels.filter(ch => ch.status === 'REJECTED');
  const b2cChannel = channels.find(ch => ch.channelType === 'B2C');

  const totalVisibleProducts = approvedChannels.reduce((sum, ch) => sum + ch.visibleProductCount, 0);
  const totalProducts = approvedChannels.reduce((sum, ch) => sum + ch.totalProductCount, 0);

  const contentCount = overview?.contents.totalSlotCount ?? 0;
  const signageContentCount = overview?.signage.pharmacy.contentCount ?? 0;
  const signageActiveCount = overview?.signage.pharmacy.activeCount ?? 0;

  // ── B2B 통합 집계 ──

  const pendingApps = applications.filter(a => a.status === 'pending').length;
  const approvedApps = applications.filter(a => a.status === 'approved').length;
  const rejectedApps = applications.filter(a => a.status === 'rejected').length;
  const glycopharmCount = overview?.products.glycopharm.totalCount ?? 0;
  const cosmeticsCount = overview?.products.cosmetics.listedCount ?? 0;
  const totalB2bProducts = glycopharmCount + cosmeticsCount;

  // ── Signals (조건 기반) ──

  const signals: Array<{ type: 'warning' | 'error' | 'info'; message: string }> = [];

  if (channels.length > 0 && approvedChannels.length === 0) {
    signals.push({ type: 'error', message: '승인된 채널이 없습니다. 채널 승인 후 상품 판매가 가능합니다' });
  }
  if (pendingChannels.length > 0) {
    signals.push({ type: 'warning', message: `승인 대기 중인 채널이 ${pendingChannels.length}개 있습니다` });
  }
  if (rejectedChannels.length > 0) {
    signals.push({ type: 'error', message: `반려된 채널이 ${rejectedChannels.length}개 있습니다. 재신청이 필요합니다` });
  }
  if (approvedChannels.length > 0 && totalVisibleProducts === 0) {
    signals.push({ type: 'warning', message: '노출되는 상품이 없습니다. 상품 등록이 필요합니다' });
  }
  if (signageContentCount === 0) {
    signals.push({ type: 'info', message: '사이니지 콘텐츠가 설정되지 않았습니다' });
  }

  // ── Loading ──

  if (loadState === 'loading') {
    return (
      <div style={S.page}>
        <div style={S.loadingCard}>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>운영 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <h1 style={S.headerTitle}>내 매장관리</h1>
        <p style={S.headerSub}>{currentOrganization.name}</p>
      </div>

      {/* [1] KPI 상단 블록 */}
      <section style={S.section}>
        <div style={S.kpiGrid}>
          <KpiCard label="활성 채널" value={`${approvedChannels.length}/${channels.length}`} />
          <KpiCard
            label="진열 상품"
            value={totalVisibleProducts}
            sub={totalProducts > 0 ? `/ ${totalProducts}` : undefined}
          />
          <KpiCard label="콘텐츠" value={contentCount} />
          <KpiCard
            label="사이니지"
            value={signageActiveCount}
            sub={signageContentCount > 0 ? `/ ${signageContentCount}` : undefined}
          />
          <KpiCard
            label="승인 대기"
            value={pendingChannels.length}
            alert={pendingChannels.length > 0}
          />
        </div>
      </section>

      {/* [2] 운영 신호 */}
      {signals.length > 0 && (
        <section style={S.section}>
          <h2 style={S.sectionTitle}>운영 신호</h2>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
            {signals.map((sig, i) => (
              <SignalCard key={i} type={sig.type} message={sig.message} />
            ))}
          </div>
        </section>
      )}

      {/* [3] B2B (도매 구매) */}
      <section style={S.section}>
        <h2 style={S.sectionTitle}>B2B (도매 구매)</h2>
        <div style={S.statusCard}>
          <StatusRow label="신청 건수" value={String(applications.length)} />
          <StatusRow
            label="승인 대기"
            value={String(pendingApps)}
            badge={pendingApps > 0 ? { bg: '#fef3c7', color: '#92400e' } : undefined}
          />
          <StatusRow label="승인 완료" value={String(approvedApps)} />
          {rejectedApps > 0 && (
            <StatusRow
              label="반려"
              value={String(rejectedApps)}
              badge={{ bg: '#fecaca', color: '#991b1b' }}
            />
          )}
          <StatusRow label="보유 상품" value={String(totalB2bProducts)} />
          <StatusRow label="진열 상품" value={String(cosmeticsCount)} />
        </div>
        <button
          onClick={() => navigate('/pharmacy/b2b')}
          style={S.b2bLink}
        >
          B2B 관리 &rarr;
        </button>
      </section>

      {/* [4] B2C 상태 요약 */}
      <section style={S.section}>
        <h2 style={S.sectionTitle}>B2C 현황</h2>
        <div style={S.statusCard}>
          <StatusRow
            label="채널 상태"
            value={b2cChannel ? CHANNEL_STATUS_LABEL[b2cChannel.status] : '미등록'}
            badge={b2cChannel ? CHANNEL_STATUS_STYLE[b2cChannel.status] : undefined}
          />
          <StatusRow
            label="진열 상품"
            value={
              b2cChannel?.status === 'APPROVED'
                ? `${b2cChannel.visibleProductCount} / ${b2cChannel.totalProductCount}`
                : '–'
            }
          />
          <StatusRow label="오늘 주문" value="–" note="준비 중" />
          <StatusRow label="배송 중" value="–" note="준비 중" />
        </div>
      </section>

      {/* [5] 노출 상태 요약 */}
      <section style={S.section}>
        <h2 style={S.sectionTitle}>노출 상태</h2>
        <div style={S.statusCard}>
          <ExposureRow
            label="홈 노출"
            active={b2cChannel?.status === 'APPROVED'}
            desc={b2cChannel?.status === 'APPROVED' ? 'B2C 채널 활성' : 'B2C 채널 미승인'}
          />
          <ExposureRow
            label="사이니지"
            active={signageActiveCount > 0}
            desc={signageActiveCount > 0 ? `${signageActiveCount}개 활성` : '미설정'}
          />
          <ExposureRow label="프로모션" active={false} desc="미설정" />
        </div>
      </section>

      {/* [6] 빠른 실행 */}
      <section>
        <h2 style={S.sectionTitle}>빠른 실행</h2>
        <div style={S.quickGrid}>
          <QuickBtn icon="🤝" label="B2B 관리" onClick={() => navigate('/pharmacy/b2b')} />
          <QuickBtn icon="📦" label="주문 관리" onClick={() => navigate('/pharmacy/sell')} />
          <QuickBtn icon="📡" label="노출 관리" onClick={() => navigate('/pharmacy/store')} />
          <QuickBtn icon="🗂️" label="자산 보기" onClick={() => navigate('/pharmacy/assets')} />
          <QuickBtn icon="⚙️" label="설정" onClick={() => navigate('/pharmacy/store')} />
        </div>
      </section>
    </div>
  );
}

// ── Sub-components ──

function KpiCard({ label, value, sub, alert }: {
  label: string;
  value: string | number;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div style={{
      ...S.kpiCard,
      borderColor: alert ? '#fbbf24' : '#e2e8f0',
    }}>
      <div style={{
        fontSize: '24px',
        fontWeight: 700,
        color: alert ? '#d97706' : '#0f172a',
      }}>
        {value}
        {sub && (
          <span style={{ fontSize: '14px', fontWeight: 400, color: '#94a3b8', marginLeft: '2px' }}>
            {sub}
          </span>
        )}
      </div>
      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

function SignalCard({ type, message }: { type: 'warning' | 'error' | 'info'; message: string }) {
  const config = {
    warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: '⚠️' },
    error: { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', icon: '🔴' },
    info: { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', icon: 'ℹ️' },
  }[type];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 16px',
      background: config.bg,
      border: `1px solid ${config.border}`,
      borderRadius: '8px',
    }}>
      <span style={{ fontSize: '16px', flexShrink: 0 }}>{config.icon}</span>
      <span style={{ fontSize: '13px', fontWeight: 500, color: config.color }}>{message}</span>
    </div>
  );
}

function StatusRow({ label, value, note, badge }: {
  label: string;
  value: string;
  note?: string;
  badge?: { bg: string; color: string };
}) {
  return (
    <div style={S.statusRow}>
      <span style={{ fontSize: '14px', color: '#64748b' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {badge ? (
          <span style={{
            padding: '2px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 600,
            background: badge.bg,
            color: badge.color,
          }}>
            {value}
          </span>
        ) : (
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: value === '–' ? '#cbd5e1' : '#0f172a',
          }}>
            {value}
          </span>
        )}
        {note && <span style={{ fontSize: '11px', color: '#94a3b8' }}>{note}</span>}
      </div>
    </div>
  );
}

function ExposureRow({ label, active, desc }: {
  label: string;
  active?: boolean;
  desc: string;
}) {
  return (
    <div style={S.statusRow}>
      <span style={{ fontSize: '14px', color: '#64748b' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: active ? '#22c55e' : '#cbd5e1',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: '13px', color: active ? '#166534' : '#94a3b8' }}>
          {desc}
        </span>
      </div>
    </div>
  );
}

function QuickBtn({ icon, label, onClick }: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={S.quickBtn}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
    >
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{label}</span>
    </button>
  );
}

// ── Export ──

export function PharmacyDashboardPage() {
  return (
    <ContextGuard requiredType="pharmacy" fallbackPath="/pharmacy">
      <PharmacyDashboardContent />
    </ContextGuard>
  );
}

// ── Styles ──

const S: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '32px 20px',
  },
  header: {
    marginBottom: '28px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e2e8f0',
  },
  headerTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
  },
  headerSub: {
    margin: '6px 0 0',
    fontSize: '14px',
    color: '#64748b',
  },
  loadingCard: {
    padding: '40px',
    textAlign: 'center',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#0f172a',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '12px',
  },
  kpiCard: {
    padding: '16px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    textAlign: 'center',
  },
  statusCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #f1f5f9',
  },
  b2bLink: {
    display: 'block',
    width: '100%',
    marginTop: '10px',
    padding: '8px 0',
    fontSize: '13px',
    fontWeight: 500,
    color: '#2563eb',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center',
  },
  quickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '10px',
  },
  quickBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '16px 12px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
};
