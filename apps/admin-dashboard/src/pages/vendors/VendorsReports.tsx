import { ChangeEvent, useState } from 'react';
import { FileCheck, TrendingUp, Calendar, Download, Package, ShoppingCart, DollarSign, BarChart3 } from 'lucide-react';

interface VendorReport {
  vendorId: string;
  vendorName: string;
  businessName: string;
  period: string;
  metrics: {
    totalSales: number;
    orderCount: number;
    averageOrderValue: number;
    productsSold: number;
    returnRate: number;
    customerSatisfaction: number;
  };
  topProducts: {
    id: string;
    name: string;
    sales: number;
    quantity: number;
  }[];
}

// Vendor reports - empty until API integration
const vendorReports: VendorReport[] = [];

// Category performance - empty until API integration
const categoryPerformance: Array<{ category: string; sales: number; percentage: number }> = [];

const VendorsReports = () => {
  const [selectedVendor, setSelectedVendor] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('2024-03');
  const [reportType, setReportType] = useState<'summary' | 'detailed'>('summary');

  const currentReport = selectedVendor === 'all'
    ? null
    : vendorReports.find((r: any) => r.vendorId === selectedVendor);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary flex items-center gap-2">
            <FileCheck className="w-8 h-8 text-modern-primary" />
            판매자 보고서
          </h1>
          <p className="text-modern-text-secondary mt-1">
            판매자별 성과를 분석하고 인사이트를 확인하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-modern-primary text-white rounded-lg hover:bg-modern-primary-hover transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            보고서 다운로드
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={selectedVendor}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedVendor(e.target.value)}
          className="px-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
        >
          <option value="all">전체 판매자</option>
          <option value="1">프리미엄 건강식품 (김판매)</option>
          <option value="2">오가닉 라이프 (이공급)</option>
        </select>
        <select
          value={selectedPeriod}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedPeriod(e.target.value)}
          className="px-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
        >
          <option value="2024-03">2024년 3월</option>
          <option value="2024-02">2024년 2월</option>
          <option value="2024-01">2024년 1월</option>
        </select>
        <div className="flex bg-modern-bg-tertiary rounded-lg p-1">
          <button
            onClick={() => setReportType('summary')}
            className={`px-4 py-1 rounded-md transition-colors ${
              reportType === 'summary' 
                ? 'bg-white text-modern-text-primary shadow-sm' 
                : 'text-modern-text-secondary hover:text-modern-text-primary'
            }`}
          >
            요약
          </button>
          <button
            onClick={() => setReportType('detailed')}
            className={`px-4 py-1 rounded-md transition-colors ${
              reportType === 'detailed' 
                ? 'bg-white text-modern-text-primary shadow-sm' 
                : 'text-modern-text-secondary hover:text-modern-text-primary'
            }`}
          >
            상세
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">총 매출액</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  ₩{selectedVendor === 'all' ? '23,500,000' : currentReport?.metrics.totalSales.toLocaleString()}
                </p>
                <p className="text-xs text-modern-success mt-1">+12.5% 전월 대비</p>
              </div>
              <DollarSign className="w-8 h-8 text-modern-accent opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">주문 수</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  {selectedVendor === 'all' ? '530' : currentReport?.metrics.orderCount}
                </p>
                <p className="text-xs text-modern-success mt-1">+8.2% 전월 대비</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-modern-primary opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">평균 주문액</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  ₩{selectedVendor === 'all' ? '44,340' : currentReport?.metrics.averageOrderValue.toLocaleString()}
                </p>
                <p className="text-xs text-modern-success mt-1">+3.7% 전월 대비</p>
              </div>
              <BarChart3 className="w-8 h-8 text-modern-warning opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">고객 만족도</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  {selectedVendor === 'all' ? '4.85' : currentReport?.metrics.customerSatisfaction}/5.0
                </p>
                <p className="text-xs text-modern-success mt-1">우수</p>
              </div>
              <TrendingUp className="w-8 h-8 text-modern-success opacity-20" />
            </div>
          </div>
        </div>
      </div>

      {reportType === 'summary' ? (
        <>
          {/* Sales Trend Chart */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h2 className="text-lg font-semibold">매출 추이</h2>
            </div>
            <div className="wp-card-body">
              <div className="h-64 flex items-center justify-center text-modern-text-secondary">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>차트 컴포넌트가 여기에 표시됩니다</p>
                  <p className="text-sm mt-1">Recharts 라이브러리 필요</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Products */}
          {currentReport && (
            <div className="wp-card">
              <div className="wp-card-header">
                <h2 className="text-lg font-semibold">인기 상품 TOP 3</h2>
              </div>
              <div className="wp-card-body">
                <div className="space-y-4">
                  {currentReport.topProducts.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between p-4 bg-modern-bg-tertiary rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-modern-primary text-white rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-modern-text-primary">{product.name}</p>
                          <p className="text-sm text-modern-text-secondary">{product.quantity}개 판매</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-modern-text-primary">₩{product.sales.toLocaleString()}</p>
                        <p className="text-sm text-modern-text-secondary">
                          {((product.sales / currentReport.metrics.totalSales) * 100).toFixed(1)}% 비중
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Detailed Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Performance */}
            <div className="wp-card">
              <div className="wp-card-header">
                <h2 className="text-lg font-semibold">카테고리별 성과</h2>
              </div>
              <div className="wp-card-body">
                <div className="space-y-3">
                  {categoryPerformance.map((category: any) => (
                    <div key={category.category}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-modern-text-primary">
                          {category.category}
                        </span>
                        <span className="text-sm text-modern-text-secondary">
                          {category.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-modern-bg-tertiary rounded-full h-2">
                        <div
                          className="bg-modern-primary h-2 rounded-full transition-all"
                          style={{ width: `${category.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-modern-text-secondary mt-1">
                        ₩{category.sales.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Performance Indicators */}
            <div className="wp-card">
              <div className="wp-card-header">
                <h2 className="text-lg font-semibold">성과 지표</h2>
              </div>
              <div className="wp-card-body">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-modern-bg-tertiary rounded-lg">
                    <Package className="w-8 h-8 text-modern-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold text-modern-text-primary">
                      {selectedVendor === 'all' ? '77' : currentReport?.metrics.productsSold}
                    </p>
                    <p className="text-sm text-modern-text-secondary">활성 상품</p>
                  </div>
                  <div className="text-center p-4 bg-modern-bg-tertiary rounded-lg">
                    <TrendingUp className="w-8 h-8 text-modern-success mx-auto mb-2" />
                    <p className="text-2xl font-bold text-modern-text-primary">
                      {selectedVendor === 'all' ? '2.2' : currentReport?.metrics.returnRate}%
                    </p>
                    <p className="text-sm text-modern-text-secondary">반품률</p>
                  </div>
                  <div className="text-center p-4 bg-modern-bg-tertiary rounded-lg">
                    <Calendar className="w-8 h-8 text-modern-warning mx-auto mb-2" />
                    <p className="text-2xl font-bold text-modern-text-primary">1.2일</p>
                    <p className="text-sm text-modern-text-secondary">평균 배송일</p>
                  </div>
                  <div className="text-center p-4 bg-modern-bg-tertiary rounded-lg">
                    <ShoppingCart className="w-8 h-8 text-modern-accent mx-auto mb-2" />
                    <p className="text-2xl font-bold text-modern-text-primary">87%</p>
                    <p className="text-sm text-modern-text-secondary">재구매율</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h2 className="text-lg font-semibold">추천 사항</h2>
            </div>
            <div className="wp-card-body">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <TrendingUp className="w-5 h-5 text-modern-success flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-modern-text-primary">베스트셀러 상품 재고 확대</p>
                    <p className="text-sm text-modern-text-secondary">
                      프로바이오틱스 플러스 제품의 재고를 20% 늘려 품절 방지를 권장합니다.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Package className="w-5 h-5 text-modern-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-modern-text-primary">신규 카테고리 진출 검토</p>
                    <p className="text-sm text-modern-text-secondary">
                      헬스케어 기기 카테고리 진출을 통해 매출 다각화를 고려해보세요.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <DollarSign className="w-5 h-5 text-modern-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-modern-text-primary">프로모션 효과 분석</p>
                    <p className="text-sm text-modern-text-secondary">
                      지난 달 진행한 할인 프로모션이 18% 매출 증가에 기여했습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VendorsReports;