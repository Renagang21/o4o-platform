/**
 * AiCostPage - 관리자 AI 비용 가시화 대시보드
 *
 * Work Order: WO-AI-COST-TOOLING-V1
 *
 * AI 운영 비용을 엔진별·서비스별·기간별로 가시화
 * - 비용 통제 도구 ❌
 * - 운영 판단/전략 의사결정 지원 도구 ⭕
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Server,
  Building2,
  Calendar,
  BarChart3,
  PieChart,
  Info,
  Package,
} from 'lucide-react';
import {
  type CostDashboardData,
  type ServiceCostData,
  type EngineCostData,
  getCostLevel,
  getCostLevelInfo,
  formatCost,
  formatPercent,
  ENGINE_PRICING_TABLE,
} from './aiCostConfig';

// ===== Mock 데이터 =====
const mockCostData: CostDashboardData = {
  summary: {
    totalRequests: 15420,
    totalCost: 18250.5,
    avgCostPerRequest: 1.18,
  },
  byService: [
    {
      serviceId: 'neture',
      serviceName: '네처 (Neture)',
      requests: 4520,
      cost: 5424.0,
      avgCost: 1.2,
      packageCompliance: 100,
    },
    {
      serviceId: 'k-cosmetics',
      serviceName: 'K-코스메틱',
      requests: 3890,
      cost: 4279.0,
      avgCost: 1.1,
      packageCompliance: 91,
    },
    {
      serviceId: 'glycopharm',
      serviceName: '글라이코팜',
      requests: 3210,
      cost: 4173.0,
      avgCost: 1.3,
      packageCompliance: 70,
    },
    {
      serviceId: 'glucoseview',
      serviceName: '글루코스뷰',
      requests: 2150,
      cost: 2365.0,
      avgCost: 1.1,
      packageCompliance: 80,
    },
    {
      serviceId: 'kpa-society',
      serviceName: 'KPA 약사회',
      requests: 1650,
      cost: 2009.5,
      avgCost: 1.22,
      packageCompliance: 100,
    },
  ],
  byEngine: [
    {
      engineId: 'gemini-2.5-flash',
      engineName: 'Gemini 2.5 Flash',
      requests: 8500,
      cost: 8500.0,
      percentage: 46.6,
    },
    {
      engineId: 'gemini-2.0-flash',
      engineName: 'Gemini 2.0 Flash',
      requests: 4200,
      cost: 2940.0,
      percentage: 16.1,
    },
    {
      engineId: 'gpt-4o-mini',
      engineName: 'GPT-4o Mini',
      requests: 1820,
      cost: 1456.0,
      percentage: 8.0,
    },
    {
      engineId: 'gemini-2.5-pro',
      engineName: 'Gemini 2.5 Pro',
      requests: 650,
      cost: 1950.0,
      percentage: 10.7,
    },
    {
      engineId: 'claude-3-sonnet',
      engineName: 'Claude 3 Sonnet',
      requests: 250,
      cost: 500.0,
      percentage: 2.7,
    },
  ],
  dailyTrend: [
    { date: '2026-01-10', requests: 2100, cost: 2520.0 },
    { date: '2026-01-11', requests: 2250, cost: 2700.0 },
    { date: '2026-01-12', requests: 1980, cost: 2376.0 },
    { date: '2026-01-13', requests: 2320, cost: 2784.0 },
    { date: '2026-01-14', requests: 2180, cost: 2616.0 },
    { date: '2026-01-15', requests: 2150, cost: 2580.0 },
    { date: '2026-01-16', requests: 2440, cost: 2674.5 },
  ],
  period: {
    start: '2026-01-10',
    end: '2026-01-16',
  },
};

// ===== 유틸 함수 =====
const formatNumber = (num: number) => num.toLocaleString('ko-KR');

const formatDateShort = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

// ===== 컴포넌트 =====

// 요약 카드
function SummaryCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  iconColor,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  subValue?: string;
  trend?: { value: number; isUp: boolean };
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              trend.isUp ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {trend.isUp ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trend.value}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
        {subValue && <div className="text-xs text-gray-400 mt-1">{subValue}</div>}
      </div>
    </div>
  );
}

// 서비스별 비용 테이블
function ServiceCostTable({ data }: { data: ServiceCostData[] }) {
  const sortedData = [...data].sort((a, b) => b.cost - a.cost);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-400" />
          서비스별 비용
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                서비스
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                요청 수
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                총 비용
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                평균 비용
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                패키지 준수율
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedData.map((service) => {
              const costLevel = getCostLevel(service.avgCost);
              const levelInfo = getCostLevelInfo(costLevel);
              return (
                <tr key={service.serviceId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{service.serviceName}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatNumber(service.requests)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatCost(service.cost)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${levelInfo.bgColor} ${levelInfo.color}`}
                    >
                      {formatCost(service.avgCost)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            service.packageCompliance >= 100
                              ? 'bg-green-500'
                              : service.packageCompliance >= 70
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(service.packageCompliance, 100)}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          service.packageCompliance >= 100
                            ? 'text-green-600'
                            : service.packageCompliance >= 70
                              ? 'text-amber-600'
                              : 'text-red-600'
                        }`}
                      >
                        {service.packageCompliance}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 엔진별 비용 분포
function EngineCostDistribution({ data }: { data: EngineCostData[] }) {
  const sortedData = [...data].sort((a, b) => b.percentage - a.percentage);
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-cyan-500',
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Server className="w-5 h-5 text-gray-400" />
          엔진별 비용 분포
        </h3>
      </div>
      <div className="p-4">
        {/* 비용 분포 바 */}
        <div className="h-4 rounded-full overflow-hidden flex mb-4">
          {sortedData.map((engine, idx) => (
            <div
              key={engine.engineId}
              className={`${colors[idx % colors.length]} transition-all`}
              style={{ width: `${engine.percentage}%` }}
              title={`${engine.engineName}: ${formatPercent(engine.percentage)}`}
            />
          ))}
        </div>

        {/* 범례 */}
        <div className="space-y-2">
          {sortedData.map((engine, idx) => (
            <div key={engine.engineId} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${colors[idx % colors.length]}`} />
                <span className="text-sm text-gray-700">{engine.engineName}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500">{formatNumber(engine.requests)}건</span>
                <span className="font-medium text-gray-900 w-16 text-right">
                  {formatCost(engine.cost)}
                </span>
                <span className="text-gray-600 w-12 text-right">
                  {formatPercent(engine.percentage)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 일별 추이 차트
function DailyTrendChart({ data }: { data: CostDashboardData['dailyTrend'] }) {
  const maxCost = Math.max(...data.map((d) => d.cost));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          일별 비용 추이
        </h3>
      </div>
      <div className="p-4">
        <div className="flex items-end justify-between gap-2 h-40">
          {data.map((day) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-xs text-gray-500 font-medium">{formatCost(day.cost)}</div>
              <div className="w-full bg-gray-100 rounded-t-sm relative" style={{ height: '120px' }}>
                <div
                  className="absolute bottom-0 left-0 right-0 bg-primary-500 rounded-t-sm transition-all"
                  style={{ height: `${(day.cost / maxCost) * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-400">{formatDateShort(day.date)}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">
              {formatCost(data.reduce((sum, d) => sum + d.cost, 0) / data.length)}
            </div>
            <div className="text-xs text-gray-500">일 평균 비용</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">
              {formatNumber(data.reduce((sum, d) => sum + d.requests, 0))}
            </div>
            <div className="text-xs text-gray-500">총 요청 수</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">{data.length}일</div>
            <div className="text-xs text-gray-500">집계 기간</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 엔진 단가 테이블
function EnginePricingTable() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-gray-400" />
          엔진 단가 기준표
        </h3>
        <span className="text-sm text-gray-500">{isExpanded ? '접기' : '펼치기'}</span>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="pt-4">
            <div className="flex items-center gap-2 mb-3 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
              <Info className="w-4 h-4" />
              <span>내부 기준 단가입니다. 실제 과금액과 다를 수 있습니다.</span>
            </div>
            <div className="space-y-2">
              {ENGINE_PRICING_TABLE.map((engine) => (
                <div
                  key={engine.engineId}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <div className="font-medium text-gray-900">{engine.engineName}</div>
                    <div className="text-xs text-gray-500">{engine.description}</div>
                  </div>
                  <div className="text-lg font-bold text-primary-600">{engine.unitCost}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== 메인 컴포넌트 =====
export default function AiCostPage() {
  const [data] = useState<CostDashboardData>(mockCostData);

  const avgCostLevel = getCostLevel(data.summary.avgCostPerRequest);
  const avgCostLevelInfo = getCostLevelInfo(avgCostLevel);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-xl font-bold text-primary-600">
                Neture
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-medium text-gray-600">AI 관리</span>
            </div>
            <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-700">
              대시보드
            </Link>
          </div>
        </div>
      </header>

      {/* Sub Navigation */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-6">
            <Link
              to="/admin/ai"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              대시보드
            </Link>
            <Link
              to="/admin/ai/engines"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              엔진 설정
            </Link>
            <Link
              to="/admin/ai/policy"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              사용 기준 설정
            </Link>
            <Link
              to="/admin/ai/asset-quality"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              품질 관리
            </Link>
            <Link
              to="/admin/ai/cost"
              className="py-4 px-1 border-b-2 border-primary-600 text-primary-600 font-medium text-sm"
            >
              비용 현황
            </Link>
            <Link
              to="/admin/ai/context-assets"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              Context Asset
            </Link>
            <Link
              to="/admin/ai/composition-rules"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              응답 규칙
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">AI 비용 현황</h1>
          <p className="text-gray-500 mt-1">
            {data.period.start} ~ {data.period.end} 기간의 AI 운영 비용을 확인합니다.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            icon={Activity}
            label="총 AI 요청"
            value={formatNumber(data.summary.totalRequests)}
            subValue="지난 7일"
            iconColor="bg-blue-100 text-blue-600"
          />
          <SummaryCard
            icon={DollarSign}
            label="총 비용"
            value={formatCost(data.summary.totalCost)}
            subValue="내부 기준 단위"
            trend={{ value: 5.2, isUp: true }}
            iconColor="bg-green-100 text-green-600"
          />
          <SummaryCard
            icon={BarChart3}
            label="평균 비용/요청"
            value={formatCost(data.summary.avgCostPerRequest)}
            subValue={avgCostLevelInfo.label}
            iconColor={`${avgCostLevelInfo.bgColor} ${avgCostLevelInfo.color}`}
          />
          <SummaryCard
            icon={Package}
            label="활성 엔진"
            value={`${data.byEngine.length}개`}
            subValue="사용 중인 AI 엔진"
            iconColor="bg-purple-100 text-purple-600"
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Service Cost Table - Full Width */}
          <div className="lg:col-span-2">
            <ServiceCostTable data={data.byService} />
          </div>

          {/* Engine Distribution */}
          <div className="lg:col-span-1">
            <EngineCostDistribution data={data.byEngine} />
          </div>
        </div>

        {/* Daily Trend & Engine Pricing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <DailyTrendChart data={data.dailyTrend} />
          <EnginePricingTable />
        </div>

        {/* Info Banners */}
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>비용 가시화 원칙</strong>: 이 대시보드는 비용 통제 도구가 아닌 운영 판단
              도구입니다. 패키지 준수율과 비용을 함께 확인하여 "이 품질에 이 비용이 적절한가"를
              판단하세요.
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <strong>비용 레벨 기준</strong>: 평균 비용 0.8 이하 = 낮음(녹색), 0.8~1.5 =
              보통(노랑), 1.5 이상 = 높음(빨강). 이는 상대적 지표이며 실제 과금과 다를 수 있습니다.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
