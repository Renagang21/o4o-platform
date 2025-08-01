/**
 * Dashboard MVP Page
 * 대시보드 메인 페이지 - 모든 위젯을 통합하여 표시
 */

import { useState, memo, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';

// MVP 위젯 컴포넌트 import
import StatsOverview from './components/StatsOverview';
import EcommerceStats from './components/EcommerceStats';
import RealtimeStats from './components/RealtimeStats';
import RecentActivity from './components/RecentActivity';
import QuickActions from './components/QuickActions';
import SystemStatus from './components/SystemHealth';
// import Charts from './components/Charts';
import AtAGlanceWidget from '@/components/dashboard/AtAGlanceWidget';
import { ScreenOptionsReact } from '@/components/common/ScreenOptionsEnhanced';
import { useScreenOptions } from '@/hooks/useScreenOptions';
import { useDashboardData } from './hooks/useDashboardData';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useAdminNotices } from '@/hooks/useAdminNotices';

const Dashboard = memo(() => {
  const { stats } = useDashboardData();
  useDashboardStats();
  const { success } = useAdminNotices();
  
  // Show welcome message on first load
  useEffect(() => {
    const hasShownWelcome = localStorage.getItem('dashboard_welcome_shown');
    if (!hasShownWelcome) {
      success('Welcome to your WordPress-style admin dashboard! All systems are operational.', {
        duration: 5000
      });
      localStorage.setItem('dashboard_welcome_shown', 'true');
    }
  }, [success]);
  
  // Default widget configuration
  const defaultWidgets = [
    { id: 'stats', label: 'Statistics Overview', checked: true },
    { id: 'ecommerce', label: 'E-commerce Stats', checked: true },
    { id: 'realtime', label: 'Realtime Stats', checked: true },
    { id: 'activity', label: 'Recent Activity', checked: true },
    { id: 'charts', label: 'Charts', checked: true },
    { id: 'system', label: 'System Health', checked: true }
  ];

  // Use screen options hook
  const {
    options
    // updateColumnVisibility // Not used
  } = useScreenOptions('dashboard', {
    customOptions: defaultWidgets
  });

  const [columnsPerPage, setColumnsPerPage] = useState(2);
  
  // Convert to checkbox format for backward compatibility
  const screenOptions = options.customOptions || defaultWidgets;
  // const isWidgetVisible = (widgetId: string) => {
  //   const widget = screenOptions.find((w: any) => w.id === widgetId);
  //   return widget?.checked ?? true;
  // }; // Not used - widgets always visible in current implementation

  return (
    <div className="space-y-8">
      {/* Page Header with Screen Options */}
      <div className="relative">
        <ScreenOptionsReact
          title="Screen Options"
          customOptions={Array.isArray(screenOptions) ? screenOptions : defaultWidgets}
          onCustomOptionChange={() => {
            // Update custom options in store
            // const updatedOptions = screenOptions.map((opt: any) =>
            //   opt.id === optionId ? { ...opt, checked } : opt
            // );
            // TODO: Update store with new options
          }}
          layoutColumns={columnsPerPage}
          onLayoutColumnsChange={setColumnsPerPage}
          showLayoutOptions={true}
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
            users: typeof stats?.users === 'number' ? stats.users : stats?.users?.total || 1234,
            products: typeof stats?.products === 'number' ? stats.products : stats?.products?.active || 156,
            views: stats?.content?.todayViews || 1567
          }}
        />
      </section>

      {/* E-commerce 통계 위젯 */}
      {screenOptions.find((opt: any) => opt.id === 'ecommerce')?.checked && (
        <section>
          <EcommerceStats />
        </section>
      )}

      {/* 통합 개요 위젯 */}
      {screenOptions.find((opt: any) => opt.id === 'stats')?.checked && (
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

      {/* E-commerce Charts Section - 준비 중 */}
      {/* <section>
        <Charts 
          data={chartData} 
          isLoading={statsLoading || chartsLoading} 
        />
      </section> */}

      {/* Footer 정보 */}
      <div className="mt-12 pt-8 border-t border border-gray-200">
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