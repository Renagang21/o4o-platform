import React, { useState, useMemo } from 'react';
import { 
  Package,
  DollarSign,
  Users,
  TrendingUp,
  BarChart3,
  ShoppingCart,
  Calendar,
  Download,
  Settings,
  RefreshCw,
  Eye,
  Award,
  Target
} from 'lucide-react';
import { generateSellerDashboardData } from '../types/seller';
import { EnhancedStatCard } from '../ui/EnhancedStatCard';
import { ToastProvider, useSuccessToast, useInfoToast } from '../ui/ToastNotification';

interface SellerDashboardProps {
  currentRole: string;
  activeMenu: string;
  onMenuChange: (menuId: string) => void;
}

// Dashboard content component
const SellerDashboardContent: React.FC<SellerDashboardProps> = ({ 
  currentRole, 
  activeMenu, 
  onMenuChange 
}) => {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  
  // Toast notifications
  const showSuccess = useSuccessToast();
  const showInfo = useInfoToast();

  // Dashboard data
  const dashboardData = useMemo(() => generateSellerDashboardData(), []);

  // Enhanced KPI data with seller-specific metrics
  const enhancedKPIData = [
    {
      title: '내 상품 수',
      value: dashboardData.stats.totalProducts,
      icon: Package,
      change: 8.5,
      color: 'blue' as const,
      subtitle: '활성 판매 중',
      sparklineData: Array.from({ length: 7 }, (_, i) => ({
        value: 40 + Math.sin(i) * 5 + Math.random() * 3,
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString()
      })),
      targetProgress: {
        current: dashboardData.stats.totalProducts,
        target: 60,
        label: '목표 상품 수'
      },
      drillDownData: {
        title: '상품 현황',
        items: [
          { label: '인기 상품', value: 12, change: 25.0, status: 'good' as const },
          { label: '신규 등록', value: 8, change: 60.0, status: 'good' as const },
          { label: '재고 부족', value: 3, change: -33.3, status: 'warning' as const },
          { label: '비활성 상품', value: 2, change: -50.0, status: 'good' as const }
        ]
      }
    },
    {
      title: '이번 달 매출',
      value: `₩${(dashboardData.stats.monthlyRevenue / 1000000).toFixed(1)}M`,
      icon: DollarSign,
      change: 15.8,
      color: 'green' as const,
      subtitle: '목표 대비 94%',
      sparklineData: Array.from({ length: 7 }, (_, i) => ({
        value: 11000000 + Math.sin(i * 1.2) * 2000000 + Math.random() * 1000000,
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString()
      })),
      targetProgress: {
        current: dashboardData.stats.monthlyRevenue,
        target: 13300000,
        label: '월 매출 목표'
      },
      drillDownData: {
        title: '매출 분석',
        items: [
          { label: '일평균 매출', value: '₩403K', change: 15.8, status: 'good' as const },
          { label: '평균 마진율', value: `${dashboardData.stats.averageMargin}%`, change: 2.1, status: 'good' as const },
          { label: '전환율', value: `${dashboardData.stats.conversionRate}%`, change: 0.8, status: 'good' as const },
          { label: '주문 수', value: dashboardData.stats.totalOrders, change: 12.3, status: 'good' as const }
        ]
      }
    },
    {
      title: '활성 파트너',
      value: dashboardData.stats.activePartners,
      icon: Users,
      change: 12.5,
      color: 'purple' as const,
      subtitle: '마케팅 중',
      sparklineData: Array.from({ length: 7 }, (_, i) => ({
        value: 6 + Math.sin(i * 0.8) * 2 + Math.random() * 1,
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString()
      })),
      targetProgress: {
        current: dashboardData.stats.activePartners,
        target: 12,
        label: '목표 파트너 수'
      },
      drillDownData: {
        title: '파트너 성과',
        items: [
          { label: '우수 파트너', value: 3, status: 'good' as const },
          { label: '총 커미션', value: '₩2.7M', change: 23.4, status: 'good' as const },
          { label: '평균 전환율', value: '5.4%', change: 1.2, status: 'good' as const },
          { label: '신규 가입', value: 2, change: 100.0, status: 'good' as const }
        ]
      }
    },
    {
      title: '평균 마진율',
      value: `${dashboardData.stats.averageMargin.toFixed(1)}%`,
      icon: TrendingUp,
      change: 2.3,
      color: 'yellow' as const,
      subtitle: '업계 평균 대비',
      sparklineData: Array.from({ length: 7 }, (_, i) => ({
        value: 30 + Math.sin(i * 2) * 3 + Math.random() * 2,
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString()
      })),
      targetProgress: {
        current: dashboardData.stats.averageMargin,
        target: 40,
        label: '목표 마진율'
      },
      drillDownData: {
        title: '마진 분석',
        items: [
          { label: '고마진 상품', value: 18, change: 20.0, status: 'good' as const },
          { label: '평균 마진', value: `${dashboardData.stats.averageMargin}%`, change: 2.3, status: 'good' as const },
          { label: '최고 마진율', value: '58%', status: 'good' as const },
          { label: '마진 개선필요', value: 5, change: -28.6, status: 'warning' as const }
        ]
      }
    }
  ];

  const handleKPIDrillDown = (type: string, data: any) => {
    if (type === '내 상품 수') {
      // Navigate to seller's product management
      showInfo('상품 관리로 이동', '내 상품 관리 페이지로 이동합니다.');
    } else if (type === '활성 파트너') {
      onMenuChange('partners');
      showInfo('파트너 관리로 이동', '파트너 마케팅 페이지로 이동합니다.');
    } else {
      showInfo('상세 정보', `${type} 데이터를 분석하고 있습니다.`);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsLoading(false);
      showSuccess('데이터 새로고침', '모든 대시보드 데이터가 업데이트되었습니다.');
    }, 1000);
  };

  const handleExport = () => {
    showSuccess('리포트 생성', '판매자 성과 리포트가 다운로드 폴더에 저장되었습니다.');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-6 border border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              판매자 비즈니스 센터 🛒
            </h1>
            <p className="text-gray-700 font-medium">
              상품 판매와 파트너 마케팅을 통해 수익을 극대화하세요.
            </p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>실시간 동기화</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white text-green-700 border border-green-200 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              성과 리포트
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {enhancedKPIData.map((kpi, index) => (
          <EnhancedStatCard
            key={index}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            change={kpi.change}
            color={kpi.color}
            subtitle={kpi.subtitle}
            sparklineData={kpi.sparklineData}
            targetProgress={kpi.targetProgress}
            drillDownData={kpi.drillDownData}
            onDrillDown={() => handleKPIDrillDown(kpi.title, kpi.drillDownData)}
            loading={isLoading}
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Top Products Widget */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">인기 판매 상품</h3>
                <p className="text-sm text-gray-500 mt-1">매출 기준 상위 5개 상품</p>
              </div>
              <Award className="w-5 h-5 text-yellow-500" />
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dashboardData.topProducts.map((product, index) => (
                <div key={product.productId} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {product.productName}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      판매 {product.salesCount}개 • 마진 {formatCurrency(product.margin)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">
                      {formatCurrency(product.revenue)}
                    </div>
                    <div className="text-xs text-green-600">
                      마진율 {((product.margin / product.revenue) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Partner Performance Widget */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">파트너 성과</h3>
                <p className="text-sm text-gray-500 mt-1">상위 5개 파트너</p>
              </div>
              <Users className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dashboardData.partnerPerformance.slice(0, 5).map((partner) => (
                <div key={partner.partnerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {partner.partnerName}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      전환율 {partner.conversionRate}% • 상품 {partner.activeProducts}개
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-purple-600">
                      {formatCurrency(partner.totalCommission)}
                    </div>
                    <div className="text-xs text-gray-600">
                      {partner.totalSales}건
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => onMenuChange('partners')}
                className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                모든 파트너 보기 →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart and Performance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">매출 추이 (최근 30일)</h3>
                <p className="text-sm text-gray-500 mt-1">일별 매출 및 주문 현황</p>
              </div>
              <BarChart3 className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-end justify-between gap-1">
              {dashboardData.revenueChart.slice(-14).map((data, index) => {
                const maxRevenue = Math.max(...dashboardData.revenueChart.map(d => d.revenue));
                const height = (data.revenue / maxRevenue) * 100;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group">
                    <div className="relative w-full">
                      <div 
                        className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                        style={{ height: `${height * 2.2}px` }}
                        title={`${formatDate(data.date)}: ${formatCurrency(data.revenue)}`}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-2 transform rotate-45 origin-left">
                      {new Date(data.date).getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <div>최근 14일 평균: {formatCurrency(dashboardData.revenueChart.slice(-14).reduce((sum, d) => sum + d.revenue, 0) / 14)}</div>
              <div>총 주문: {dashboardData.revenueChart.slice(-14).reduce((sum, d) => sum + d.orders, 0)}건</div>
            </div>
          </div>
        </div>
        
        {/* Performance Summary */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">성과 요약</h3>
            <p className="text-sm text-gray-500 mt-1">주요 지표</p>
          </div>
          <div className="p-6 space-y-4">
            {[
              {
                label: '최고 성과 상품',
                value: dashboardData.topProducts[0]?.productName || 'N/A',
                trend: `+${dashboardData.topProducts[0]?.salesCount || 0} 판매`,
                color: 'text-green-600'
              },
              {
                label: '최우수 파트너',
                value: dashboardData.partnerPerformance[0]?.partnerName || 'N/A',
                trend: `전환율 ${dashboardData.partnerPerformance[0]?.conversionRate || 0}%`,
                color: 'text-purple-600'
              },
              {
                label: '월 매출 목표',
                value: '94% 달성',
                trend: '목표까지 ₩800K',
                color: 'text-blue-600'
              },
              {
                label: '평균 주문액',
                value: '₩43,600',
                trend: '+5.2% 증가',
                color: 'text-yellow-600'
              }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900">{item.label}</div>
                  <div className="text-lg font-bold text-gray-800">{item.value}</div>
                </div>
                <div className={`text-sm font-semibold ${item.color}`}>
                  {item.trend}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">빠른 작업</h3>
          <p className="text-sm text-gray-500 mt-1">자주 사용하는 기능들</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { icon: Package, label: '상품 선택', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100', action: () => onMenuChange('catalog') },
              { icon: Users, label: '파트너 관리', color: 'bg-purple-50 text-purple-600 hover:bg-purple-100', action: () => onMenuChange('partners') },
              { icon: TrendingUp, label: '매출 분석', color: 'bg-green-50 text-green-600 hover:bg-green-100', action: () => showInfo('매출 분석', '상세 분석 페이지로 이동합니다.') },
              { icon: DollarSign, label: '정산 관리', color: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100', action: () => onMenuChange('revenue') },
              { icon: BarChart3, label: '성과 리포트', color: 'bg-red-50 text-red-600 hover:bg-red-100', action: handleExport },
              { icon: Settings, label: '설정', color: 'bg-gray-50 text-gray-600 hover:bg-gray-100', action: () => showInfo('설정', '설정 페이지로 이동합니다.') }
            ].map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl transition-all duration-200 hover:scale-105 ${action.color}`}
              >
                <action.icon className="w-6 h-6" />
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main component with providers
export const SellerDashboard: React.FC<SellerDashboardProps> = (props) => {
  return (
    <ToastProvider position="top-right" maxToasts={3}>
      <SellerDashboardContent {...props} />
    </ToastProvider>
  );
};