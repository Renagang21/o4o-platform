import React from 'react';

export type VendorFilterTab = 'all' | 'today' | 'urgent' | 'incomplete';

interface VendorsPendingStatusTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  counts: {
    all: number;
    today: number;
    urgent: number;
    incomplete: number;
  };
}

export const VendorsPendingStatusTabs: React.FC<VendorsPendingStatusTabsProps> = ({
  activeTab,
  setActiveTab,
  counts
}) => {
  const tabs = [
    { key: 'all' as const, label: '전체', count: counts.all },
    { key: 'today' as const, label: '오늘 신청', count: counts.today },
    { key: 'urgent' as const, label: '긴급 처리', count: counts.urgent },
    { key: 'incomplete' as const, label: '서류 미비', count: counts.incomplete }
  ];

  return (
    <ul className="o4o-tabs">
      {tabs.map(tab => (
        <li key={tab.key} className={activeTab === tab.key ? 'active' : ''}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab(tab.key);
              sessionStorage.setItem('vendors-pending-active-tab', tab.key);
            }}
          >
            {tab.label} <span className="count">({tab.count})</span>
          </a>
        </li>
      ))}
    </ul>
  );
};