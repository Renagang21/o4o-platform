/**
 * MobilePharmacyPage — 약국 경영 모바일 허브
 *
 * WO-O4O-KPA-MOBILE-MENU-STRUCTURE-PHASE2-V1
 *
 * 모바일 하단 "약국 경영" 탭 진입 시 표시되는 허브 화면.
 * 상단 탭 구성: 약국 HUB | 내 약국
 * 기본 활성 탭: 내 약국 (KPA-Society 기준)
 * 탭 선택 시 해당 라우트로 이동 (기존 라우트 유지).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Store, ChevronRight } from 'lucide-react';

type Tab = 'hub' | 'my-store';

interface TabDef {
  key: Tab;
  label: string;
  route: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}

const TABS: TabDef[] = [
  {
    key: 'hub',
    label: '약국 HUB',
    route: '/store-hub',
    icon: <Building2 size={18} />,
    title: '약국 HUB',
    desc: '공동 콘텐츠·상품·이벤트 오퍼를 확인하고 내 매장에 적용하세요.',
  },
  {
    key: 'my-store',
    label: '내 약국',
    route: '/pharmacy',
    icon: <Store size={18} />,
    title: '내 약국 관리',
    desc: '약국 운영 현황, 마케팅, 채널 설정을 한 곳에서 관리하세요.',
  },
];

// KPA-Society 기본 활성 탭: 내 약국
const DEFAULT_TAB: Tab = 'my-store';

export function MobilePharmacyPage() {
  const [activeTab, setActiveTab] = useState<Tab>(DEFAULT_TAB);
  const navigate = useNavigate();

  const currentTab = TABS.find((t) => t.key === activeTab)!;

  function handleEnter() {
    navigate(currentTab.route);
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 64px - 56px)', backgroundColor: '#f8fafc' }}>
      {/* 상단 탭 바 */}
      <div style={tabBarStyle}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={activeTab === tab.key ? { ...tabBtnStyle, ...activeBtnStyle } : tabBtnStyle}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div style={{ padding: '32px 24px' }}>
        <div style={cardStyle}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
              {currentTab.title}
            </h2>
            <p style={{ fontSize: '0.9375rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
              {currentTab.desc}
            </p>
          </div>
          <button onClick={handleEnter} style={enterBtnStyle}>
            <span>입장하기</span>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* About·Contact 진입 링크 (내정보 하단 영역으로 안내) */}
        <p style={{ fontSize: '0.8125rem', color: '#94a3b8', textAlign: 'center', marginTop: 32 }}>
          서비스 소개 및 문의는{' '}
          <a href="/about" style={{ color: '#60a5fa', textDecoration: 'none' }}>About</a>
          {' / '}
          <a href="/contact" style={{ color: '#60a5fa', textDecoration: 'none' }}>Contact</a>
          에서 확인하세요.
        </p>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '2px solid #e2e8f0',
  backgroundColor: '#ffffff',
};

const tabBtnStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '14px 0',
  border: 'none',
  borderBottom: '2px solid transparent',
  marginBottom: -2,
  background: 'none',
  cursor: 'pointer',
  fontSize: '0.9375rem',
  fontWeight: 600,
  color: '#94a3b8',
};

const activeBtnStyle: React.CSSProperties = {
  color: '#2563eb',
  borderBottomColor: '#2563eb',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: '24px 20px',
};

const enterBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  width: '100%',
  padding: '12px 0',
  border: 'none',
  borderRadius: 8,
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '0.9375rem',
  fontWeight: 600,
  cursor: 'pointer',
};
