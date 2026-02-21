/**
 * StoreOverviewSection - 매장 현황 요약 위젯
 *
 * WO-PHARMACY-DASHBOARD-REALIGN-PHASEA1-V1
 *
 * Store Hub API 재사용, 단일 카드에 3개 숫자 배지.
 * 클릭 시 /pharmacy/assets으로 이동.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStoreHubOverview, type StoreHubOverview } from '../../../api/storeHub';

type WidgetState = 'loading' | 'loaded' | 'error';

export function StoreOverviewSection() {
  const navigate = useNavigate();
  const [state, setState] = useState<WidgetState>('loading');
  const [overview, setOverview] = useState<StoreHubOverview | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchStoreHubOverview()
      .then((data) => {
        if (cancelled) return;
        setOverview(data);
        setState('loaded');
      })
      .catch(() => {
        if (cancelled) return;
        setState('error');
      });
    return () => { cancelled = true; };
  }, []);

  // Error or loading — show minimal placeholder
  if (state === 'loading') {
    return (
      <section style={{ marginBottom: '32px' }}>
        <div style={cardBase}>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>매장 현황을 불러오는 중...</p>
        </div>
      </section>
    );
  }

  if (state === 'error' || !overview) {
    return (
      <section style={{ marginBottom: '32px' }}>
        <div
          style={{ ...cardBase, cursor: 'pointer' }}
          onClick={() => navigate('/pharmacy/assets')}
        >
          <div style={headerRow}>
            <h2 style={titleStyle}>매장 현황</h2>
            <span style={arrowStyle}>&rarr;</span>
          </div>
          <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: '13px' }}>
            데이터를 불러오지 못했습니다. 클릭하여 상세 보기
          </p>
        </div>
      </section>
    );
  }

  const productCount = overview.products.glycopharm.totalCount + overview.products.cosmetics.listedCount;
  const contentCount = overview.contents.totalSlotCount;
  const signageCount = overview.signage.pharmacy.contentCount;

  return (
    <section style={{ marginBottom: '32px' }}>
      <div
        style={{ ...cardBase, cursor: 'pointer' }}
        onClick={() => navigate('/pharmacy/assets')}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#93c5fd'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
      >
        <div style={headerRow}>
          <h2 style={titleStyle}>매장 현황</h2>
          <span style={arrowStyle}>상세 보기 &rarr;</span>
        </div>

        <div style={badgeGrid}>
          <BadgeItem label="상품" count={productCount} />
          <BadgeItem label="콘텐츠" count={contentCount} />
          <BadgeItem label="사이니지" count={signageCount} />
        </div>
      </div>
    </section>
  );
}

function BadgeItem({ label, count }: { label: string; count: number }) {
  const hasData = count > 0;
  return (
    <div style={badgeBox}>
      <div style={{ fontSize: '22px', fontWeight: 700, color: hasData ? '#0f172a' : '#cbd5e1' }}>
        {count}
      </div>
      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{label}</div>
      <span style={hasData ? connectedBadge : emptyBadge}>
        {hasData ? '연결됨' : '데이터 없음'}
      </span>
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
  transition: 'border-color 0.15s',
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

const arrowStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#2563eb',
  fontWeight: 500,
};

const badgeGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '16px',
};

const badgeBox: React.CSSProperties = {
  textAlign: 'center',
  padding: '12px 8px',
  background: '#f8fafc',
  borderRadius: '8px',
};

const connectedBadge: React.CSSProperties = {
  display: 'inline-block',
  marginTop: '6px',
  padding: '1px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 500,
  background: '#dcfce7',
  color: '#166534',
};

const emptyBadge: React.CSSProperties = {
  display: 'inline-block',
  marginTop: '6px',
  padding: '1px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 500,
  background: '#f1f5f9',
  color: '#94a3b8',
};
