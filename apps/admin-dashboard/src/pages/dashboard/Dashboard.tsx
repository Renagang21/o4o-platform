/**
 * Dashboard MVP Page
 * 대시보드 메인 페이지 - 모든 위젯을 통합하여 표시
 */

import { useState, memo } from 'react';
import { BarChart3 } from 'lucide-react';

// MVP 위젯 컴포넌트 import
import StatsOverview from './components/StatsOverview';
import EcommerceStats from './components/EcommerceStats';
import RealtimeStats from './components/RealtimeStats';
import RecentActivity from './components/RecentActivity';
import QuickActions from './components/QuickActions';
import SystemStatus from './components/SystemHealth';
import Charts from './components/Charts';
import AtAGlanceWidget from '@/components/dashboard/AtAGlanceWidget';
import ScreenOptions, { type ScreenOption } from '@/components/common/ScreenOptions';
import { useDashboardData } from './hooks/useDashboardData';
import { useDashboardStats } from '@/hooks/useDashboardStats';

const Dashboard = memo(() => {
  const { chartData, isLoading: chartsLoading, stats } = useDashboardData();
  const { isLoading: statsLoading } = useDashboardStats();
  
  // Screen Options state
  const [screenOptions, setScreenOptions] = useState<ScreenOption[]>([
    { id: 'stats', label: 'Statistics Overview', checked: true, type: 'checkbox' },
    { id: 'ecommerce', label: 'E-commerce Stats', checked: true, type: 'checkbox' },
    { id: 'realtime', label: 'Realtime Stats', checked: true, type: 'checkbox' },
    { id: 'activity', label: 'Recent Activity', checked: true, type: 'checkbox' },
    { id: 'charts', label: 'Charts', checked: true, type: 'checkbox' },
    { id: 'system', label: 'System Health', checked: true, type: 'checkbox' }
  ]);
  
  const [columnsPerPage, setColumnsPerPage] = useState(2);

  return (
    <div className="space-y-8">
      {/* Page Header with Screen Options */}
      <div className="relative">
        <ScreenOptions
          options={screenOptions}
          onOptionsChange={setScreenOptions}
          columnsPerPage={columnsPerPage}
          onColumnsChange={setColumnsPerPage}
        />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-modern-text-primary flex items-center">
              <BarChart3 className="w-8 h-8 mr-3 text-modern-primary" />
              대시보드
            </h1>
            <p className="text-modern-text-secondary mt-2">
              O4O 플랫폼의 모든 현황을 한눈에 확인하고 관리하세요
            </p>
          </div>
          <div className="text-sm text-modern-text-secondary">
            마지막 업데이트: 방금 전
          </div>
        </div>
      </div>
      
      {/* At a Glance Widget */}
      <section>
        <AtAGlanceWidget 
          stats={{
            posts: stats?.content?.publishedPages || 45,
            pages: stats?.content?.publishedPages || 12,
            comments: {
              total: 156,
              pending: 3
            },
            users: stats?.users?.total || 1234,
            products: stats?.products?.active || 156,
            views: stats?.content?.todayViews || 1567
          }}
        />
      </section>

      {/* E-commerce 통계 위젯 */}
      {screenOptions.find(opt => opt.id === 'ecommerce')?.checked && (
        <section>
          <EcommerceStats />
        </section>
      )}

      {/* 통합 개요 위젯 */}
      {screenOptions.find(opt => opt.id === 'stats')?.checked && (
        <section>
          <StatsOverview />
        </section>
      )}

      {/* 실시간 데이터 및 활동 그리드 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* 실시간 통계 */}
        <div className="xl:col-span-2">
          <RealtimeStats />
        </div>
        
        {/* 빠른 작업 */}
        <div>
          <QuickActions />
        </div>
      </div>

      {/* 최근 활동 및 시스템 상태 그리드 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* 최근 활동 */}
        <div>
          <RecentActivity />
        </div>
        
        {/* 시스템 상태 */}
        <div>
          <SystemStatus />
        </div>
      </div>

      {/* E-commerce Charts Section */}
      <section>
        <Charts 
          data={chartData} 
          isLoading={statsLoading || chartsLoading} 
        />
      </section>

      {/* Footer 정보 */}
      <div className="mt-12 pt-8 border-t border-wp-border-primary">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
          <div className="wp-card">
            <div className="wp-card-body text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">5</div>
              <div className="text-sm text-wp-text-secondary">활성 위젯</div>
            </div>
          </div>
          <div className="wp-card">
            <div className="wp-card-body text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">실시간</div>
              <div className="text-sm text-wp-text-secondary">데이터 업데이트</div>
            </div>
          </div>
          <div className="wp-card">
            <div className="wp-card-body text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">MSW</div>
              <div className="text-sm text-wp-text-secondary">모의 API 연동</div>
            </div>
          </div>
          <div className="wp-card">
            <div className="wp-card-body text-center">
              <div className="text-2xl font-bold text-orange-600 mb-1">MVP</div>
              <div className="text-sm text-wp-text-secondary">프로토타입 완성</div>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-6 text-xs text-wp-text-secondary">
          <p>
            📊 **Dashboard v2.0** - E-commerce Statistics, Sales Charts, Order Analytics 통합 완료
          </p>
          <p className="mt-1">
            🔄 실시간 데이터 연동 및 React Query 기반 상태 관리 적용
          </p>
        </div>
      </div>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;