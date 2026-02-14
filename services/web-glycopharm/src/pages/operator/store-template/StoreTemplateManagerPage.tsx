/**
 * Store Template Manager Page
 *
 * 운영자가 프랜차이즈 스토어의 Template 콘텐츠를 관리하는 페이지
 * - Hero 콘텐츠 관리
 * - Featured Products 관리
 * - Event/Notice 관리
 *
 * 운영자 콘텐츠는 모든 약국 스토어에 최우선으로 적용됨
 */

import { useState } from 'react';
import {
  Image,
  Package,
  Megaphone,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { HeroManagerTab } from './tabs/HeroManagerTab';
import { FeaturedProductsTab } from './tabs/FeaturedProductsTab';
import { EventNoticeTab } from './tabs/EventNoticeTab';

type TabType = 'hero' | 'featured' | 'event-notice';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ElementType;
  description: string;
  rule: string;
}

const TABS: TabConfig[] = [
  {
    id: 'hero',
    label: 'Hero 배너',
    icon: Image,
    description: '스토어 메인 배너 영역 콘텐츠',
    rule: '운영자 Hero는 모든 약국 스토어에 최우선으로 노출됩니다.',
  },
  {
    id: 'featured',
    label: 'Featured 상품',
    icon: Package,
    description: '추천 상품 영역 관리',
    rule: '운영자 지정 Featured 상품은 Market Trial 및 자동 추천보다 우선 노출됩니다.',
  },
  {
    id: 'event-notice',
    label: '공지/이벤트',
    icon: Megaphone,
    description: '스토어 공지 및 이벤트 관리',
    rule: '운영자 Event/Notice는 스토어에 항상 고정 노출됩니다.',
  },
];

export default function StoreTemplateManagerPage() {
  const [activeTab, setActiveTab] = useState<TabType>('hero');

  const currentTab = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Store Template Manager</h1>
        <p className="text-slate-500 text-sm">
          프랜차이즈 스토어의 운영자 콘텐츠를 관리합니다
        </p>
      </div>

      {/* 운영 규칙 알림 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-800">운영 규칙</p>
          <p className="text-sm text-amber-700 mt-1">
            이 페이지에서 관리하는 콘텐츠는 <strong>모든 약국 스토어</strong>에 자동 적용됩니다.
            운영자 콘텐츠는 약국 콘텐츠보다 항상 우선순위가 높습니다.
          </p>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b">
          <nav className="flex" aria-label="Tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
                    ${isActive
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* 탭 설명 및 규칙 */}
        <div className="px-6 py-4 bg-slate-50 border-b flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-800">{currentTab.description}</p>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Info className="w-3 h-3" />
              {currentTab.rule}
            </p>
          </div>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="p-6">
          {activeTab === 'hero' && <HeroManagerTab pharmacySlug="demo" />}
          {activeTab === 'featured' && <FeaturedProductsTab />}
          {activeTab === 'event-notice' && <EventNoticeTab />}
        </div>
      </div>
    </div>
  );
}
