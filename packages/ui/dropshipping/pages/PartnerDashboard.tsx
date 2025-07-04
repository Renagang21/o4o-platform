import React, { useState, useMemo } from 'react';
import { 
  DollarSign,
  Megaphone,
  Target,
  TrendingUp,
  Calendar,
  Download,
  RefreshCw,
  Eye,
  BarChart3,
  Award,
  Users,
  Clock,
  CheckCircle
} from 'lucide-react';
import { generatePartnerDashboardData, getCampaignStatusText, getCampaignStatusColor, getCommissionStatusText } from '../types/partner';
import { EnhancedStatCard } from '../ui/EnhancedStatCard';
import { StatusBadge } from '../ui/StatusBadge';
import { ToastProvider, useSuccessToast, useInfoToast } from '../ui/ToastNotification';

interface PartnerDashboardProps {
  currentRole: string;
  activeMenu: string;
  onMenuChange: (menuId: string) => void;
}

// Dashboard content component
const PartnerDashboardContent: React.FC<PartnerDashboardProps> = ({ 
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
  const dashboardData = useMemo(() => generatePartnerDashboardData(), []);

  // Enhanced KPI data with partner-specific metrics
  const enhancedKPIData = [
    {
      title: '총 커미션',
      value: `₩${(dashboardData.stats.totalCommission / 1000000).toFixed(1)}M`,
      icon: DollarSign,
      change: 18.5,
      color: 'green' as const,
      subtitle: '이번 달 기준',
      sparklineData: Array.from({ length: 7 }, (_, i) => ({
        value: 850000 + Math.sin(i * 1.2) * 200000 + Math.random() * 100000,
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString()
      })),
      targetProgress: {
        current: dashboardData.stats.totalCommission,
        target: 3000000,
        label: '월 목표 커미션'
      },
      drillDownData: {
        title: '커미션 분석',
        items: [
          { label: '승인 대기', value: dashboardData.stats.pendingCommission, status: 'warning' as const },
          { label: '지급 완료', value: dashboardData.stats.paidCommission, status: 'good' as const },
          { label: '평균 커미션', value: '₩4,850', change: 12.3, status: 'good' as const },
          { label: '최고 일매출', value: '₩89K', status: 'good' as const }
        ]
      }
    },
    {
      title: '활성 캠페인',
      value: dashboardData.stats.activeCampaigns,
      icon: Megaphone,
      change: 25.0,
      color: 'blue' as const,
      subtitle: '마케팅 중',
      sparklineData: Array.from({ length: 7 }, (_, i) => ({
        value: 8 + Math.sin(i * 0.8) * 2 + Math.random() * 1,
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString()
      })),
      targetProgress: {
        current: dashboardData.stats.activeCampaigns,
        target: 15,
        label: '목표 캠페인 수'
      },
      drillDownData: {
        title: '캠페인 현황',
        items: [
          { label: '진행중', value: dashboardData.stats.activeCampaigns, status: 'good' as const },
          { label: '일시정지', value: 2, status: 'warning' as const },
          { label: '승인대기', value: 1, status: 'warning' as const },
          { label: '완료', value: 8, change: 60.0, status: 'good' as const }
        ]
      }
    },
    {
      title: '총 전환',
      value: dashboardData.stats.totalConversions,
      icon: Target,
      change: 15.2,
      color: 'purple' as const,
      subtitle: '이번 달',
      sparklineData: Array.from({ length: 7 }, (_, i) => ({
        value: 180 + Math.sin(i * 1.5) * 30 + Math.random() * 20,
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString()
      })),
      targetProgress: {
        current: dashboardData.stats.totalConversions,
        target: 500,
        label: '월 전환 목표'
      },
      drillDownData: {
        title: '전환 분석',
        items: [
          { label: '일평균 전환', value: (dashboardData.stats.totalConversions / 30).toFixed(1), status: 'good' as const },
          { label: '전환율', value: `${dashboardData.stats.averageConversionRate.toFixed(1)}%`, change: 0.8, status: 'good' as const },
          { label: '최고 성과 상품', value: '무선 이어폰', status: 'good' as const },
          { label: '신규 고객 전환', value: '78%', change: 5.2, status: 'good' as const }
        ]
      }
    },
    {
      title: '평균 전환율',
      value: `${dashboardData.stats.averageConversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      change: 2.3,
      color: 'yellow' as const,
      subtitle: '업계 평균 대비',
      sparklineData: Array.from({ length: 7 }, (_, i) => ({
        value: 4.2 + Math.sin(i * 2) * 0.8 + Math.random() * 0.4,
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString()
      })),
      targetProgress: {
        current: dashboardData.stats.averageConversionRate,
        target: 6.0,
        label: '목표 전환율'
      },
      drillDownData: {
        title: '전환율 분석',
        items: [
          { label: '최고 전환율', value: '7.3%', status: 'good' as const },
          { label: '평균 전환율', value: `${dashboardData.stats.averageConversionRate.toFixed(1)}%`, change: 2.3, status: 'good' as const },
          { label: '모바일 전환율', value: '5.8%', change: 3.1, status: 'good' as const },
          { label: '데스크톱 전환율', value: '3.9%', change: 1.2, status: 'good' as const }
        ]
      }
    }
  ];

  const handleKPIDrillDown = (type: string, data: any) => {
    if (type === '활성 캠페인') {
      onMenuChange('marketing');
      showInfo('마케팅 관리로 이동', '캠페인 관리 페이지로 이동합니다.');
    } else if (type === '총 커미션') {
      onMenuChange('commission');
      showInfo('커미션 관리로 이동', '커미션 관리 페이지로 이동합니다.');
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
    showSuccess('성과 리포트 생성', '파트너 성과 리포트가 다운로드 폴더에 저장되었습니다.');
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
      <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 rounded-2xl p-6 border border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              파트너 성과 센터 📈
            </h1>
            <p className="text-gray-700 font-medium">
              마케팅 성과를 분석하고 커미션 수익을 극대화하세요.
            </p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span>실시간 동기화</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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
        {/* Performance Chart */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">성과 추이 (최근 30일)</h3>
                <p className="text-sm text-gray-500 mt-1">일별 전환 및 커미션 현황</p>
              </div>
              <BarChart3 className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-end justify-between gap-1">
              {dashboardData.performanceChart.slice(-14).map((data, index) => {
                const maxCommission = Math.max(...dashboardData.performanceChart.map(d => d.commission));
                const height = maxCommission > 0 ? (data.commission / maxCommission) * 100 : 0;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group">
                    <div className="relative w-full">
                      <div 
                        className="w-full bg-purple-500 rounded-t hover:bg-purple-600 transition-colors cursor-pointer"
                        style={{ height: `${height * 2.2}px` }}
                        title={`${formatDate(data.date)}: 전환 ${data.conversions}개, 커미션 ${formatCurrency(data.commission)}`}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-2 transform rotate-45 origin-left">
                      {new Date(data.date).getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm text-gray-600">
              <div>평균 전환율: {dashboardData.performanceChart.slice(-14).reduce((sum, d) => sum + d.conversionRate, 0) / 14}%</div>
              <div>총 전환: {dashboardData.performanceChart.slice(-14).reduce((sum, d) => sum + d.conversions, 0)}개</div>
              <div>총 커미션: {formatCurrency(dashboardData.performanceChart.slice(-14).reduce((sum, d) => sum + d.commission, 0))}</div>
            </div>
          </div>
        </div>

        {/* Recent Commissions Widget */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">최근 커미션</h3>
                <p className="text-sm text-gray-500 mt-1">최신 거래 내역</p>
              </div>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dashboardData.recentCommissions.slice(0, 5).map((commission) => (
                <div key={commission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {commission.productName}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {commission.campaignName}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatDate(commission.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-600">
                      {formatCurrency(commission.commissionAmount)}
                    </div>
                    <StatusBadge 
                      status={getCommissionStatusText(commission.status)} 
                      size="sm" 
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => onMenuChange('commission')}
                className="w-full text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                모든 커미션 보기 →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns and Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Campaigns */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">활성 캠페인</h3>
                <p className="text-sm text-gray-500 mt-1">현재 진행 중인 마케팅</p>
              </div>
              <Megaphone className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dashboardData.recentCampaigns.filter(c => c.status === 'active').slice(0, 4).map((campaign) => (
                <div key={campaign.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <img
                      src={campaign.productImage}
                      alt={campaign.productName}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {campaign.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {campaign.sellerName} • 커미션 {campaign.commissionRate}%
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-gray-600">전환: {campaign.totalConversions}개</span>
                      <span className="text-green-600 font-medium">{formatCurrency(campaign.totalCommission)}</span>
                    </div>
                  </div>
                  <StatusBadge 
                    status={getCampaignStatusText(campaign.status)} 
                    size="sm" 
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => onMenuChange('marketing')}
                className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                모든 캠페인 관리 →
              </button>
            </div>
          </div>
        </div>

        {/* Top Performing Products */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">성과 상위 상품</h3>
                <p className="text-sm text-gray-500 mt-1">커미션 기준 상위 4개</p>
              </div>
              <Award className="w-5 h-5 text-yellow-500" />
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dashboardData.topProducts.slice(0, 4).map((product, index) => (
                <div key={product.productId} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 text-yellow-600 rounded-full font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <img
                      src={product.productImage}
                      alt={product.productName}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {product.productName}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {product.sellerName} • 커미션 {product.commissionRate}%
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-gray-600">전환율: {((product.totalConversions / product.totalClicks) * 100).toFixed(1)}%</span>
                      <span className="text-green-600 font-medium">{formatCurrency(product.totalCommission)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => onMenuChange('analytics')}
                className="w-full text-sm text-yellow-600 hover:text-yellow-800 font-medium"
              >
                성과 분석 보기 →
              </button>
            </div>
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
              { icon: Megaphone, label: '캠페인 생성', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100', action: () => onMenuChange('marketing') },
              { icon: BarChart3, label: '성과 분석', color: 'bg-purple-50 text-purple-600 hover:bg-purple-100', action: () => onMenuChange('analytics') },
              { icon: DollarSign, label: '커미션 관리', color: 'bg-green-50 text-green-600 hover:bg-green-100', action: () => onMenuChange('commission') },
              { icon: Clock, label: '승인 대기', color: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100', action: () => showInfo('승인 대기', '승인 대기 중인 커미션을 확인합니다.') },
              { icon: CheckCircle, label: '지급 내역', color: 'bg-green-50 text-green-600 hover:bg-green-100', action: () => showInfo('지급 내역', '지급 완료된 커미션을 확인합니다.') },
              { icon: Users, label: '판매자 찾기', color: 'bg-gray-50 text-gray-600 hover:bg-gray-100', action: () => showInfo('판매자 찾기', '새로운 판매자와 협업 기회를 찾아보세요.') }
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
export const PartnerDashboard: React.FC<PartnerDashboardProps> = (props) => {
  return (
    <ToastProvider position="top-right" maxToasts={3}>
      <PartnerDashboardContent {...props} />
    </ToastProvider>
  );
};