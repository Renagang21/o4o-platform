/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Design Core Phase 2-A - Antigravity Dashboard PoC
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @purpose Antigravity 시안을 Design Core v1.0 컴포넌트만으로 구현 가능한지 검증
 * @status PoC (검증용) - 실제 서비스에 연결하지 않음
 * @date 2025-12-16
 *
 * 사용 컴포넌트:
 * - AGPageHeader: 페이지 헤더
 * - AGSection: 섹션 구분
 * - AGKPIBlock, AGKPIGrid: KPI 카드
 * - AGCard: 위젯 카드
 *
 * ⚠️ 이 파일은 PoC 전용이며, 라우트/메뉴에 등록되지 않습니다.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { AGPageHeader } from '../layout/AGPageHeader';
import { AGSection } from '../layout/AGSection';
import { AGKPIBlock, AGKPIGrid } from '../ag-components/AGKPIBlock';
import { AGCard } from '../ag-components/AGCard';

// ═══════════════════════════════════════════════════════════════════════════
// Dummy Data (정적 데이터 - API 연동 없음)
// ═══════════════════════════════════════════════════════════════════════════

const kpiData = [
  {
    title: '총 매출',
    value: '₩12,450,000',
    delta: '+12.5%',
    deltaLabel: '전월 대비',
    trend: 'up' as const,
    colorMode: 'positive' as const,
  },
  {
    title: '활성 사용자',
    value: '1,284',
    delta: '+8.2%',
    deltaLabel: '전월 대비',
    trend: 'up' as const,
    colorMode: 'positive' as const,
  },
  {
    title: '신규 주문',
    value: '342',
    delta: '-3.1%',
    deltaLabel: '전월 대비',
    trend: 'down' as const,
    colorMode: 'negative' as const,
  },
  {
    title: '평균 주문액',
    value: '₩36,400',
    delta: '0%',
    deltaLabel: '전월 대비',
    trend: 'stable' as const,
    colorMode: 'neutral' as const,
  },
];

const recentActivities = [
  { id: 1, action: '신규 주문 접수', user: '김철수', time: '5분 전' },
  { id: 2, action: '상품 등록', user: '이영희', time: '12분 전' },
  { id: 3, action: '회원 가입', user: '박민수', time: '25분 전' },
  { id: 4, action: '리뷰 작성', user: '정은지', time: '1시간 전' },
];

const notifications = [
  { id: 1, type: 'info', message: '시스템 점검 예정 (12/20 02:00-04:00)' },
  { id: 2, type: 'warning', message: '재고 부족 상품 3건' },
  { id: 3, type: 'success', message: '월간 매출 목표 달성' },
];

const pendingTasks = [
  { id: 1, task: '미승인 주문 검토', count: 5 },
  { id: 2, task: '미답변 문의', count: 12 },
  { id: 3, task: '반품 요청 처리', count: 3 },
];

// ═══════════════════════════════════════════════════════════════════════════
// PoC Component
// ═══════════════════════════════════════════════════════════════════════════

export function AntigravityDashboardPoC() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <AGPageHeader
        title="Dashboard Overview"
        description="플랫폼 운영 현황을 한눈에 확인하세요"
      />

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* KPI Summary Section */}
        <AGSection
          title="핵심 지표"
          description="실시간 운영 현황"
          spacing="md"
        >
          <AGKPIGrid columns={4}>
            {kpiData.map((kpi, index) => (
              <AGKPIBlock
                key={index}
                title={kpi.title}
                value={kpi.value}
                delta={kpi.delta}
                deltaLabel={kpi.deltaLabel}
                trend={kpi.trend}
                colorMode={kpi.colorMode}
              />
            ))}
          </AGKPIGrid>
        </AGSection>

        {/* Widgets Section */}
        <AGSection
          title="운영 현황"
          description="빠른 확인이 필요한 항목"
          spacing="lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Recent Activity Widget */}
            <AGCard
              header={
                <span className="text-sm font-semibold text-gray-900">
                  최근 활동
                </span>
              }
              padding="none"
            >
              <ul className="divide-y divide-gray-100">
                {recentActivities.map((activity) => (
                  <li key={activity.id} className="px-4 py-3">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {activity.action}
                        </p>
                        <p className="text-xs text-gray-500">{activity.user}</p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {activity.time}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </AGCard>

            {/* Notifications Widget */}
            <AGCard
              header={
                <span className="text-sm font-semibold text-gray-900">
                  알림
                </span>
              }
              padding="none"
            >
              <ul className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <li key={notification.id} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                          notification.type === 'info'
                            ? 'bg-blue-500'
                            : notification.type === 'warning'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                      />
                      <p className="text-sm text-gray-700">
                        {notification.message}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </AGCard>

            {/* Pending Tasks Widget */}
            <AGCard
              header={
                <span className="text-sm font-semibold text-gray-900">
                  대기 작업
                </span>
              }
              padding="none"
            >
              <ul className="divide-y divide-gray-100">
                {pendingTasks.map((task) => (
                  <li
                    key={task.id}
                    className="px-4 py-3 flex justify-between items-center"
                  >
                    <span className="text-sm text-gray-700">{task.task}</span>
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                      {task.count}
                    </span>
                  </li>
                ))}
              </ul>
            </AGCard>
          </div>
        </AGSection>
      </div>
    </div>
  );
}

// Default export
export default AntigravityDashboardPoC;

// ═══════════════════════════════════════════════════════════════════════════
// Design Core Phase 2-A PoC - End of File
// ═══════════════════════════════════════════════════════════════════════════
