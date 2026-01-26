import { ChangeEvent, useState } from 'react';
import { TrendingUp, BarChart3, Calendar, Download, Users, Link, DollarSign, Target } from 'lucide-react';

interface PerformanceMetric {
  period: string;
  clicks: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
  averageOrderValue: number;
}

interface TopPerformer {
  id: string;
  name: string;
  type: string;
  clicks: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
  trend: 'up' | 'down' | 'stable';
}

interface ProductPerformance {
  id: string;
  name: string;
  clicks: number;
  conversions: number;
  revenue: number;
  partners: number;
}

const performanceData: PerformanceMetric[] = [
  { period: '2024-01', clicks: 42300, conversions: 1058, revenue: 31740000, conversionRate: 2.5, averageOrderValue: 30000 },
  { period: '2024-02', clicks: 48500, conversions: 1261, revenue: 37830000, conversionRate: 2.6, averageOrderValue: 30000 },
  { period: '2024-03', clicks: 55200, conversions: 1490, revenue: 44700000, conversionRate: 2.7, averageOrderValue: 30000 }
];

const topPerformers: TopPerformer[] = [
  {
    id: '1',
    name: '김인플루언서',
    type: '인플루언서',
    clicks: 15420,
    conversions: 462,
    revenue: 13860000,
    conversionRate: 3.0,
    trend: 'up'
  },
  {
    id: '4',
    name: '웰니스 샵',
    type: '비즈니스',
    clicks: 23580,
    conversions: 589,
    revenue: 17670000,
    conversionRate: 2.5,
    trend: 'stable'
  },
  {
    id: '2',
    name: '건강 블로그',
    type: '블로그',
    clicks: 8920,
    conversions: 267,
    revenue: 8010000,
    conversionRate: 2.99,
    trend: 'up'
  }
];

const productPerformance: ProductPerformance[] = [
  { id: '1', name: '프로바이오틱스 플러스', clicks: 12500, conversions: 375, revenue: 11250000, partners: 8 },
  { id: '2', name: '오메가3 프리미엄', clicks: 9800, conversions: 294, revenue: 8820000, partners: 6 },
  { id: '3', name: '멀티비타민 골드', clicks: 7300, conversions: 219, revenue: 6570000, partners: 5 },
  { id: '4', name: '콜라겐 부스터', clicks: 5200, conversions: 156, revenue: 4680000, partners: 4 }
];

const PartnerAnalytics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'conversions' | 'clicks'>('revenue');

  const currentMonth = performanceData[performanceData.length - 1];
  const previousMonth = performanceData[performanceData.length - 2];
  
  const growthRate = previousMonth ? 
    ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue * 100).toFixed(1) : 0;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-modern-success" />;
      case 'down':
        return <TrendingUp className="w-4 h-4 text-modern-danger transform rotate-180" />;
      default:
        return <div className="w-4 h-4 bg-modern-text-tertiary rounded-full" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-modern-primary" />
            파트너 성과 분석
          </h1>
          <p className="text-modern-text-secondary mt-1">
            파트너 마케팅의 성과를 분석하고 인사이트를 확인하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedPeriod}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
          >
            <option value="week">주간</option>
            <option value="month">월간</option>
            <option value="quarter">분기</option>
            <option value="year">연간</option>
          </select>
          <button className="px-4 py-2 bg-modern-primary text-white rounded-lg hover:bg-modern-primary-hover transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            보고서 다운로드
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="o4o-card">
          <div className="o4o-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">총 매출액</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  ₩{currentMonth.revenue.toLocaleString()}
                </p>
                <p className="text-xs text-modern-success mt-1">
                  +{growthRate}% 전월 대비
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-modern-accent opacity-20" />
            </div>
          </div>
        </div>
        <div className="o4o-card">
          <div className="o4o-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">총 클릭수</p>
                <p className="text-2xl font-bold text-modern-primary">
                  {currentMonth.clicks.toLocaleString()}
                </p>
                <p className="text-xs text-modern-success mt-1">
                  +13.8% 전월 대비
                </p>
              </div>
              <Link className="w-8 h-8 text-modern-primary opacity-20" />
            </div>
          </div>
        </div>
        <div className="o4o-card">
          <div className="o4o-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">전환율</p>
                <p className="text-2xl font-bold text-modern-success">
                  {currentMonth.conversionRate}%
                </p>
                <p className="text-xs text-modern-success mt-1">
                  +0.1%p 전월 대비
                </p>
              </div>
              <Target className="w-8 h-8 text-modern-success opacity-20" />
            </div>
          </div>
        </div>
        <div className="o4o-card">
          <div className="o4o-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">평균 주문액</p>
                <p className="text-2xl font-bold text-modern-warning">
                  ₩{currentMonth.averageOrderValue.toLocaleString()}
                </p>
                <p className="text-xs text-modern-text-secondary mt-1">
                  전월 동일
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-modern-warning opacity-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="o4o-card">
        <div className="o4o-card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">성과 추이</h2>
            <div className="flex bg-modern-bg-tertiary rounded-lg p-1">
              <button
                onClick={() => setSelectedMetric('revenue')}
                className={`px-4 py-1 rounded-md transition-colors ${
                  selectedMetric === 'revenue' 
                    ? 'bg-white text-modern-text-primary shadow-sm' 
                    : 'text-modern-text-secondary hover:text-modern-text-primary'
                }`}
              >
                매출
              </button>
              <button
                onClick={() => setSelectedMetric('conversions')}
                className={`px-4 py-1 rounded-md transition-colors ${
                  selectedMetric === 'conversions' 
                    ? 'bg-white text-modern-text-primary shadow-sm' 
                    : 'text-modern-text-secondary hover:text-modern-text-primary'
                }`}
              >
                전환
              </button>
              <button
                onClick={() => setSelectedMetric('clicks')}
                className={`px-4 py-1 rounded-md transition-colors ${
                  selectedMetric === 'clicks' 
                    ? 'bg-white text-modern-text-primary shadow-sm' 
                    : 'text-modern-text-secondary hover:text-modern-text-primary'
                }`}
              >
                클릭
              </button>
            </div>
          </div>
        </div>
        <div className="o4o-card-body">
          <div className="h-64 flex items-center justify-center text-modern-text-secondary">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>차트 컴포넌트가 여기에 표시됩니다</p>
              <p className="text-sm mt-1">Recharts 라이브러리 필요</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="o4o-card">
          <div className="o4o-card-header">
            <h2 className="text-lg font-semibold">상위 성과 파트너사</h2>
          </div>
          <div className="o4o-card-body">
            <div className="space-y-4">
              {topPerformers.map((performer, index) => (
                <div key={performer.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-modern-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-modern-text-primary">{performer.name}</p>
                      <p className="text-sm text-modern-text-secondary">{performer.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-modern-text-primary">
                        ₩{performer.revenue.toLocaleString()}
                      </p>
                      {getTrendIcon(performer.trend)}
                    </div>
                    <p className="text-sm text-modern-text-secondary">
                      {performer.conversions}건 | {performer.conversionRate}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Product Performance */}
        <div className="o4o-card">
          <div className="o4o-card-header">
            <h2 className="text-lg font-semibold">인기 파트너 상품</h2>
          </div>
          <div className="o4o-card-body">
            <div className="space-y-4">
              {productPerformance.map((product: any) => (
                <div key={product.id}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-modern-text-primary">{product.name}</p>
                    <p className="text-sm text-modern-text-secondary">
                      {product.partners}개 파트너사
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-modern-bg-tertiary rounded-full h-2">
                      <div
                        className="bg-modern-primary h-2 rounded-full transition-all"
                        style={{ width: `${(product.revenue / productPerformance[0].revenue) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-modern-text-primary w-24 text-right">
                      ₩{(product.revenue / 1000000).toFixed(1)}M
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-modern-text-secondary">
                    <span>{product.clicks.toLocaleString()} 클릭</span>
                    <span>{product.conversions} 전환</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="o4o-card">
        <div className="o4o-card-header">
          <h2 className="text-lg font-semibold">주요 인사이트</h2>
        </div>
        <div className="o4o-card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-modern-bg-tertiary rounded-lg">
              <Users className="w-8 h-8 text-modern-primary mx-auto mb-2" />
              <p className="text-3xl font-bold text-modern-text-primary mb-1">87%</p>
              <p className="text-sm text-modern-text-secondary">활성 파트너사 비율</p>
              <p className="text-xs text-modern-success mt-2">+5%p 증가</p>
            </div>
            <div className="text-center p-4 bg-modern-bg-tertiary rounded-lg">
              <Calendar className="w-8 h-8 text-modern-warning mx-auto mb-2" />
              <p className="text-3xl font-bold text-modern-text-primary mb-1">3.2일</p>
              <p className="text-sm text-modern-text-secondary">평균 전환 소요일</p>
              <p className="text-xs text-modern-success mt-2">0.3일 단축</p>
            </div>
            <div className="text-center p-4 bg-modern-bg-tertiary rounded-lg">
              <Target className="w-8 h-8 text-modern-success mx-auto mb-2" />
              <p className="text-3xl font-bold text-modern-text-primary mb-1">₩1.2억</p>
              <p className="text-sm text-modern-text-secondary">분기 목표 달성률</p>
              <p className="text-xs text-modern-success mt-2">82% 달성</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="o4o-card bg-blue-50 border-blue-200">
          <div className="o4o-card-header">
            <h3 className="text-lg font-semibold text-blue-900">최적화 제안</h3>
          </div>
          <div className="o4o-card-body">
            <div className="space-y-3">
              <div className="flex gap-3">
                <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">상위 성과자 지원 강화</p>
                  <p className="text-sm text-blue-700">
                    김인플루언서의 전환율이 3%로 평균보다 높습니다. 
                    전용 프로모션 제공을 고려하세요.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Target className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">저성과 파트너사 활성화</p>
                  <p className="text-sm text-blue-700">
                    30일 이상 비활성 파트너사에게 리텐션 캠페인을 진행하세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="o4o-card bg-green-50 border-green-200">
          <div className="o4o-card-header">
            <h3 className="text-lg font-semibold text-green-900">성장 기회</h3>
          </div>
          <div className="o4o-card-body">
            <div className="space-y-3">
              <div className="flex gap-3">
                <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">신규 카테고리 확장</p>
                  <p className="text-sm text-green-700">
                    뷰티/케어 카테고리의 파트너 성과가 높습니다. 
                    관련 상품군 확대를 검토하세요.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Users className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">마이크로 인플루언서 영입</p>
                  <p className="text-sm text-green-700">
                    팔로워 1-5만 규모의 인플루언서가 높은 전환율을 보입니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerAnalytics;