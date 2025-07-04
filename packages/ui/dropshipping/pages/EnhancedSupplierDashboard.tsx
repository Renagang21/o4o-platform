import React, { useState } from 'react';
import { 
  Calendar,
  Download,
  Settings,
  RefreshCw,
  Filter,
  BarChart3,
  TrendingUp,
  Package,
  ShoppingCart,
  DollarSign,
  Truck
} from 'lucide-react';

// Import enhanced components
import { EnhancedStatCard } from '../ui/EnhancedStatCard';
import { SalesTrendChart } from '../charts/SalesTrendChart';
import { ProductPerformanceChart } from '../charts/ProductPerformanceChart';
import { RealTimeOrderWidget } from '../widgets/RealTimeOrderWidget';
import { InventoryAlertsWidget } from '../widgets/InventoryAlertsWidget';
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalButton } from '../ui/Modal';
import { ToastProvider, useSuccessToast, useInfoToast, useWarningToast } from '../ui/ToastNotification';
import { DashboardProvider, useDashboard, useDashboardData } from '../context/DashboardContext';

interface EnhancedSupplierDashboardProps {
  currentRole: string;
  activeMenu: string;
  onMenuChange: (menuId: string) => void;
}

// Dashboard content component (wrapped by providers)
const DashboardContent: React.FC<EnhancedSupplierDashboardProps> = ({ 
  currentRole, 
  activeMenu, 
  onMenuChange 
}) => {
  const [drillDownModal, setDrillDownModal] = useState<{
    isOpen: boolean;
    type: string;
    data: any;
  }>({ isOpen: false, type: '', data: null });

  const { refreshData } = useDashboard();
  const { salesData, categoryData, kpiData, isLoading, lastUpdated } = useDashboardData();
  
  // Toast notifications
  const showSuccess = useSuccessToast();
  const showInfo = useInfoToast();
  const showWarning = useWarningToast();

  // Mock data for enhanced features
  const enhancedKPIData = [
    {
      title: '총 상품 수',
      value: kpiData.totalProducts,
      icon: Package,
      change: kpiData.trends.products,
      color: 'blue' as const,
      subtitle: '지난 달 대비',
      sparklineData: Array.from({ length: 7 }, (_, i) => ({
        value: 1000 + Math.sin(i) * 100 + Math.random() * 50,
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString()
      })),
      targetProgress: {
        current: kpiData.totalProducts,
        target: 1500,
        label: '목표 달성률'
      },
      drillDownData: {
        title: '상품 현황',
        items: [
          { label: '활성 상품', value: 1089, change: 12.5, status: 'good' as const },
          { label: '품절 상품', value: 23, change: -15.2, status: 'warning' as const },
          { label: '신규 등록', value: 135, change: 45.8, status: 'good' as const },
          { label: '승인 대기', value: 8, change: -5.3, status: 'critical' as const }
        ]
      }
    },
    {
      title: '신규 주문',
      value: kpiData.newOrders,
      icon: ShoppingCart,
      change: kpiData.trends.orders,
      color: 'green' as const,
      subtitle: '이번 달 기준',
      sparklineData: Array.from({ length: 7 }, (_, i) => ({
        value: 2500 + Math.sin(i * 0.8) * 300 + Math.random() * 100,
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString()
      })),
      targetProgress: {
        current: kpiData.newOrders,
        target: 3000,
        label: '월 목표 달성률'
      },
      drillDownData: {
        title: '주문 분석',
        items: [
          { label: '일평균 주문', value: '96.4건', status: 'good' as const },
          { label: '평균 주문액', value: '₩28,500', change: 8.3, status: 'good' as const },
          { label: '긴급 주문', value: 12, change: -25.0, status: 'warning' as const },
          { label: '반품률', value: '2.1%', change: -0.5, status: 'good' as const }
        ]
      }
    },
    {
      title: '이번 달 매출',
      value: `₩${(kpiData.monthlySales / 1000000).toFixed(1)}M`,
      icon: DollarSign,
      change: kpiData.trends.sales,
      color: 'yellow' as const,
      subtitle: '목표 대비 87%',
      sparklineData: Array.from({ length: 7 }, (_, i) => ({
        value: 20000000 + Math.sin(i * 1.2) * 2000000 + Math.random() * 1000000,
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString()
      })),
      targetProgress: {
        current: kpiData.monthlySales,
        target: 32000000,
        label: '월 매출 목표'
      },
      drillDownData: {
        title: '매출 분석',
        items: [
          { label: '일평균 매출', value: '₩887K', change: 8.7, status: 'good' as const },
          { label: '전월 대비', value: '+8.7%', status: 'good' as const },
          { label: '전년 대비', value: '+23.4%', status: 'good' as const },
          { label: '마진율', value: '18.5%', change: 1.2, status: 'good' as const }
        ]
      }
    },
    {
      title: '배송 대기',
      value: kpiData.pendingShipments,
      icon: Truck,
      change: kpiData.trends.shipments,
      color: 'purple' as const,
      subtitle: '처리 필요',
      sparklineData: Array.from({ length: 7 }, (_, i) => ({
        value: 120 + Math.sin(i * 2) * 30 + Math.random() * 20,
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString()
      })),
      targetProgress: {
        current: 24 * 60 - (kpiData.pendingShipments * 8), // Remaining time in minutes
        target: 24 * 60,
        label: '24시간 내 처리 목표'
      },
      drillDownData: {
        title: '배송 현황',
        items: [
          { label: '긴급 배송', value: 8, status: 'critical' as const },
          { label: '일반 배송', value: 132, status: 'good' as const },
          { label: '지연 배송', value: 16, change: -12.5, status: 'warning' as const },
          { label: '평균 처리시간', value: '4.2시간', change: -0.8, status: 'good' as const }
        ]
      }
    }
  ];

  const handleKPIDrillDown = (type: string, data: any) => {
    if (type === '총 상품 수') {
      onMenuChange('products');
      showInfo('상품 관리로 이동', '상품 관리 페이지로 이동합니다.');
    } else if (type === '신규 주문') {
      onMenuChange('orders');
      showInfo('주문 관리로 이동', '주문 관리 페이지로 이동합니다.');
    } else {
      setDrillDownModal({ isOpen: true, type, data });
      showInfo('상세 정보 로드', `${type} 데이터를 분석하고 있습니다.`);
    }
  };

  const handleSalesPointClick = (data: any) => {
    showInfo('일별 상세 정보', `${data.date} 매출: ${data.sales.toLocaleString()}원`);
  };

  const handleCategoryClick = (category: any) => {
    showInfo('카테고리 상세', `${category.name} 카테고리 상품 목록을 표시합니다.`);
  };

  const handleRefresh = async () => {
    await refreshData();
    showSuccess('데이터 새로고침 완료', '모든 대시보드 데이터가 업데이트되었습니다.');
  };

  const handleExport = () => {
    showSuccess('데이터 내보내기', '보고서가 다운로드 폴더에 저장되었습니다.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              공급자 비즈니스 인텔리전스 💼
            </h1>
            <p className="text-gray-700 font-medium">
              실시간 데이터와 AI 분석으로 최적의 비즈니스 의사결정을 지원합니다.
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
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              보고서 내보내기
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="xl:col-span-2">
          <SalesTrendChart
            data={salesData}
            onPointClick={handleSalesPointClick}
            height={400}
          />
        </div>

        {/* Product Performance Chart */}
        <ProductPerformanceChart
          data={categoryData}
          onSegmentClick={handleCategoryClick}
        />

        {/* Real-time Widgets */}
        <div className="space-y-6">
          <RealTimeOrderWidget maxOrders={6} />
        </div>
      </div>

      {/* Additional Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <InventoryAlertsWidget maxItems={8} />
        </div>
        
        {/* Performance Summary */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">성과 요약</h3>
            <p className="text-sm text-gray-500 mt-1">오늘의 주요 지표</p>
          </div>
          <div className="p-6 space-y-4">
            {[
              {
                label: '베스트셀러',
                value: '무선 블루투스 이어폰',
                trend: '+156 판매',
                color: 'text-green-600'
              },
              {
                label: '급상승 카테고리',
                value: '전자기기',
                trend: '+23.4%',
                color: 'text-blue-600'
              },
              {
                label: '주의 필요 상품',
                value: 'USB-C 케이블',
                trend: '재고 부족',
                color: 'text-red-600'
              },
              {
                label: '신규 거래처',
                value: '3개 업체',
                trend: '이번 주',
                color: 'text-purple-600'
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
              { icon: Package, label: '상품 등록', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
              { icon: BarChart3, label: '재고 관리', color: 'bg-green-50 text-green-600 hover:bg-green-100' },
              { icon: TrendingUp, label: '매출 분석', color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
              { icon: ShoppingCart, label: '주문 처리', color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
              { icon: Truck, label: '배송 관리', color: 'bg-red-50 text-red-600 hover:bg-red-100' },
              { icon: Settings, label: '설정', color: 'bg-gray-50 text-gray-600 hover:bg-gray-100' }
            ].map((action, index) => (
              <button
                key={index}
                onClick={() => showInfo('기능 실행', `${action.label} 페이지로 이동합니다.`)}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl transition-all duration-200 hover:scale-105 ${action.color}`}
              >
                <action.icon className="w-6 h-6" />
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Drill-down Modal */}
      <Modal
        isOpen={drillDownModal.isOpen}
        onClose={() => setDrillDownModal({ isOpen: false, type: '', data: null })}
        title={`${drillDownModal.type} 상세 분석`}
        size="lg"
      >
        <ModalHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{drillDownModal.type}</h3>
              <p className="text-sm text-gray-500">상세 데이터 분석 및 인사이트</p>
            </div>
          </div>
        </ModalHeader>
        <ModalBody>
          {drillDownModal.data && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {drillDownModal.data.items.map((item: any, index: number) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">{item.label}</span>
                      {item.status && (
                        <div className={`w-2 h-2 rounded-full ${
                          item.status === 'good' ? 'bg-green-500' :
                          item.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                      )}
                    </div>
                    <div className="text-xl font-bold text-gray-900">{item.value}</div>
                    {item.change && (
                      <div className={`text-sm font-medium ${
                        item.change > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.change > 0 ? '+' : ''}{item.change}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">AI 인사이트</h4>
                <p className="text-blue-800 text-sm">
                  현재 데이터를 분석한 결과, 전반적인 성과가 목표 대비 양호한 상태입니다. 
                  특히 주문 증가율이 예상보다 높아 재고 관리에 주의가 필요합니다.
                </p>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <ModalButton 
            variant="secondary" 
            onClick={() => setDrillDownModal({ isOpen: false, type: '', data: null })}
          >
            닫기
          </ModalButton>
          <ModalButton 
            variant="primary"
            onClick={() => {
              showSuccess('보고서 생성', '상세 보고서가 생성되었습니다.');
              setDrillDownModal({ isOpen: false, type: '', data: null });
            }}
          >
            보고서 생성
          </ModalButton>
        </ModalFooter>
      </Modal>
    </div>
  );
};

// Main component with providers
export const EnhancedSupplierDashboard: React.FC<EnhancedSupplierDashboardProps> = (props) => {
  return (
    <ToastProvider position="top-right" maxToasts={3}>
      <DashboardProvider>
        <DashboardContent {...props} />
      </DashboardProvider>
    </ToastProvider>
  );
};