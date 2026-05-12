/**
 * MobilePharmacyPage — GlycoPharm 모바일 약국 경영 허브
 *
 * WO-O4O-GLYCOPHARM-MENU-CANONICAL-ALIGN-V1
 *
 * 모바일 하단 "약국 경영" 탭 진입 시 표시되는 허브 페이지.
 * 상단 탭: 약국 HUB | 내 약국
 * 기본 활성 탭: 약국 HUB (GlycoPharm canonical — KPA는 내 약국이 기본)
 *
 * 탭 선택 시 해당 경로로 이동.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Store } from 'lucide-react';

type Tab = 'hub' | 'my-store';

interface TabDef {
  key: Tab;
  label: string;
  route: string;
  icon: React.ReactNode;
  description: string;
  actionLabel: string;
}

const TABS: TabDef[] = [
  {
    key: 'hub',
    label: '약국 HUB',
    route: '/store-hub',
    icon: <Building2 size={32} strokeWidth={1.5} />,
    description: '공급사 B2B 카탈로그, 콘텐츠 라이브러리, 약국 운영 자료를 한곳에서 확인하세요.',
    actionLabel: '약국 HUB 입장',
  },
  {
    key: 'my-store',
    label: '내 약국',
    route: '/store',
    icon: <Store size={32} strokeWidth={1.5} />,
    description: '내 약국 대시보드, 상품 관리, 사이니지, 주문 현황을 관리하세요.',
    actionLabel: '내 약국 입장',
  },
];

// GlycoPharm canonical: 약국 HUB가 기본 활성 탭
const DEFAULT_TAB: Tab = 'hub';

export default function MobilePharmacyPage() {
  const [activeTab, setActiveTab] = useState<Tab>(DEFAULT_TAB);
  const navigate = useNavigate();

  const current = TABS.find((t) => t.key === activeTab)!;

  return (
    <div style={pageStyle}>
      {/* 상단 탭 바 */}
      <div style={tabBarStyle}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={activeTab === tab.key ? { ...tabBtnStyle, ...tabBtnActiveStyle } : tabBtnStyle}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 카드 */}
      <div style={cardStyle}>
        <div style={iconWrapStyle}>{current.icon}</div>
        <h2 style={cardTitleStyle}>{current.label}</h2>
        <p style={cardDescStyle}>{current.description}</p>
        <button
          onClick={() => navigate(current.route)}
          style={actionBtnStyle}
        >
          {current.actionLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: '60vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '0 0 24px',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  width: '100%',
  borderBottom: '1px solid #e2e8f0',
  backgroundColor: '#fff',
};

const tabBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '14px 0',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontSize: 15,
  fontWeight: 500,
  color: '#94a3b8',
  borderBottom: '2px solid transparent',
};

const tabBtnActiveStyle: React.CSSProperties = {
  color: '#059669',
  borderBottom: '2px solid #059669',
  fontWeight: 700,
};

const cardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  padding: '40px 24px 32px',
  maxWidth: 360,
  width: '100%',
  gap: 12,
};

const iconWrapStyle: React.CSSProperties = {
  color: '#059669',
  marginBottom: 8,
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: '#1e293b',
  margin: 0,
};

const cardDescStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#64748b',
  lineHeight: 1.6,
  margin: 0,
};

const actionBtnStyle: React.CSSProperties = {
  marginTop: 16,
  padding: '12px 32px',
  backgroundColor: '#059669',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
};
