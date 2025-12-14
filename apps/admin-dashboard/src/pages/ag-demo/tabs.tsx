/**
 * AGTabs Demo Page
 *
 * Phase 7-C: Global Components Demo
 */

import React, { useState } from 'react';
import { AGTabs, AGTabItem } from '../../components/ag/AGTabs';

export default function TabsDemo() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabItems: AGTabItem[] = [
    {
      key: 'overview',
      label: '개요',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      content: (
        <div className="p-4 bg-white rounded-lg border">
          <h3 className="font-semibold text-gray-900 mb-2">개요 탭</h3>
          <p className="text-gray-600">
            이 탭은 전체 개요 정보를 표시합니다. AGTabs 컴포넌트는 다양한 탭 스타일과
            아이콘, 배지 등을 지원합니다.
          </p>
        </div>
      ),
    },
    {
      key: 'analytics',
      label: '분석',
      badge: 3,
      badgeColor: 'primary',
      content: (
        <div className="p-4 bg-white rounded-lg border">
          <h3 className="font-semibold text-gray-900 mb-2">분석 탭</h3>
          <p className="text-gray-600">
            분석 데이터를 표시하는 탭입니다. 숫자 배지가 표시되어 새로운 항목이나
            알림 개수를 나타낼 수 있습니다.
          </p>
        </div>
      ),
    },
    {
      key: 'reports',
      label: '리포트',
      badge: '신규',
      badgeColor: 'success',
      content: (
        <div className="p-4 bg-white rounded-lg border">
          <h3 className="font-semibold text-gray-900 mb-2">리포트 탭</h3>
          <p className="text-gray-600">
            리포트를 표시하는 탭입니다. 텍스트 배지도 지원됩니다.
          </p>
        </div>
      ),
    },
    {
      key: 'settings',
      label: '설정',
      content: (
        <div className="p-4 bg-white rounded-lg border">
          <h3 className="font-semibold text-gray-900 mb-2">설정 탭</h3>
          <p className="text-gray-600">
            설정 옵션을 표시하는 탭입니다.
          </p>
        </div>
      ),
    },
    {
      key: 'disabled',
      label: '비활성',
      disabled: true,
      content: <div>비활성 탭 콘텐츠</div>,
    },
  ];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AGTabs 데모</h1>
        <p className="text-gray-500 mt-1">탭 네비게이션 컴포넌트 데모 페이지</p>
      </div>

      {/* Line 스타일 (기본) */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Line 스타일 (기본)</h2>
        <AGTabs
          items={tabItems}
          activeKey={activeTab}
          onChange={setActiveTab}
          variant="line"
        />
      </section>

      {/* Pills 스타일 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Pills 스타일</h2>
        <AGTabs
          items={tabItems}
          defaultActiveKey="analytics"
          variant="pills"
        />
      </section>

      {/* Enclosed 스타일 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Enclosed 스타일</h2>
        <AGTabs
          items={tabItems}
          defaultActiveKey="reports"
          variant="enclosed"
        />
      </section>

      {/* Full Width */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">전체 너비</h2>
        <AGTabs
          items={tabItems.slice(0, 4)}
          defaultActiveKey="overview"
          variant="pills"
          fullWidth
        />
      </section>

      {/* Left Position */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">좌측 배치</h2>
        <div className="bg-gray-50 p-4 rounded-lg">
          <AGTabs
            items={tabItems.slice(0, 4)}
            defaultActiveKey="overview"
            position="left"
            variant="line"
          />
        </div>
      </section>

      {/* Size Variants */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">크기 변형</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500 mb-2">Small</p>
            <AGTabs
              items={tabItems.slice(0, 3)}
              defaultActiveKey="overview"
              size="sm"
            />
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">Medium (기본)</p>
            <AGTabs
              items={tabItems.slice(0, 3)}
              defaultActiveKey="overview"
              size="md"
            />
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">Large</p>
            <AGTabs
              items={tabItems.slice(0, 3)}
              defaultActiveKey="overview"
              size="lg"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
