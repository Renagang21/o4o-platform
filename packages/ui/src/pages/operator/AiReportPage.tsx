/**
 * AiReportPage - 공통 서비스 운영자 AI/Context Asset 리포트
 *
 * WO-O4O-AI-REPORT-PAGE-COMMONIZATION-V1
 *
 * 5개 서비스의 중복 구현을 1개 공통 컴포넌트로 통합.
 * 서비스별 차이는 config props로 주입.
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Eye,
  FileText,
  Calendar,
  ChevronDown,
  AlertCircle,
  Info,
  Users,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Send,
} from 'lucide-react';

import type {
  AiReportPageProps,
  AiReportTheme,
  Period,
  ContextAssetExposure,
  ExposureReason,
  DailyTrend,
  QualitySignal,
  AssetTypeDefinition,
} from './types';

// ===== Theme Map =====
// Tailwind은 동적 클래스 불가 → 정적 매핑

interface ThemeClasses {
  kpiPrimary: { bg: string; icon: string };
  chartBar: string;
  chartBarHover: string;
  chartLegend: string;
  infoBanner: { bg: string; border: string; icon: string; text: string };
  dropdown: { selected: string; hoverBorder: string };
  insight: { gradient: string; text: string };
  modal: { focusRing: string; submitBg: string; submitHover: string };
}

const THEME_MAP: Record<AiReportTheme, ThemeClasses> = {
  green: {
    kpiPrimary: { bg: 'bg-green-100', icon: 'text-green-600' },
    chartBar: 'bg-green-500',
    chartBarHover: 'hover:bg-green-600',
    chartLegend: 'bg-green-500',
    infoBanner: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', text: 'text-green-800' },
    dropdown: { selected: 'bg-green-50 text-green-700', hoverBorder: 'hover:border-green-300' },
    insight: { gradient: 'from-slate-800 to-slate-700', text: 'text-slate-300' },
    modal: { focusRing: 'focus:ring-green-500', submitBg: 'bg-green-600', submitHover: 'hover:bg-green-700' },
  },
  pink: {
    kpiPrimary: { bg: 'bg-pink-100', icon: 'text-pink-600' },
    chartBar: 'bg-pink-500',
    chartBarHover: 'hover:bg-pink-600',
    chartLegend: 'bg-pink-500',
    infoBanner: { bg: 'bg-pink-50', border: 'border-pink-200', icon: 'text-pink-600', text: 'text-pink-800' },
    dropdown: { selected: 'bg-pink-50 text-pink-700', hoverBorder: 'hover:border-pink-300' },
    insight: { gradient: 'from-pink-700 to-pink-600', text: 'text-pink-100' },
    modal: { focusRing: 'focus:ring-pink-500', submitBg: 'bg-pink-600', submitHover: 'hover:bg-pink-700' },
  },
  teal: {
    kpiPrimary: { bg: 'bg-teal-100', icon: 'text-teal-600' },
    chartBar: 'bg-teal-500',
    chartBarHover: 'hover:bg-teal-600',
    chartLegend: 'bg-teal-500',
    infoBanner: { bg: 'bg-teal-50', border: 'border-teal-200', icon: 'text-teal-600', text: 'text-teal-800' },
    dropdown: { selected: 'bg-teal-50 text-teal-700', hoverBorder: 'hover:border-teal-300' },
    insight: { gradient: 'from-teal-700 to-teal-600', text: 'text-teal-100' },
    modal: { focusRing: 'focus:ring-teal-500', submitBg: 'bg-teal-600', submitHover: 'hover:bg-teal-700' },
  },
};

// ===== Sub-components =====

function KpiCard({
  title,
  value,
  change,
  direction,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  change: number;
  direction: 'up' | 'down';
  icon: React.ElementType;
  color: { bg: string; icon: string };
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${color.bg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${color.icon}`} />
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${
            direction === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {direction === 'up' ? '+' : ''}{change.toFixed(1)}%
        </span>
      </div>
      <p className="text-3xl font-bold text-slate-800">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-sm text-slate-500 mt-1">{title}</p>
    </div>
  );
}

const KPI_COLORS = {
  green: { bg: 'bg-green-100', icon: 'text-green-600' },
  purple: { bg: 'bg-purple-100', icon: 'text-purple-600' },
  amber: { bg: 'bg-amber-100', icon: 'text-amber-600' },
};

function AssetTypeIcon({ type, assetTypes }: { type: string; assetTypes: AssetTypeDefinition[] }) {
  const def = assetTypes.find((a) => a.type === type);
  if (!def) return null;
  const Icon = def.icon;
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${def.iconColor}`}>
      <Icon className="w-4 h-4" />
    </div>
  );
}

function ReasonBarChart({ data }: { data: ExposureReason[] }) {
  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.reason} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-700 font-medium">{item.reason}</span>
            <span className="text-slate-500">
              {item.count.toLocaleString()} ({item.percentage}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all duration-500"
              style={{
                width: `${(item.count / maxCount) * 100}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DailyTrendChart({ data, theme }: { data: DailyTrend[]; theme: ThemeClasses }) {
  const maxExposures = Math.max(...data.map((d) => d.totalExposures));

  return (
    <div className="space-y-4">
      <div className="relative h-48 flex items-end gap-2 border-b border-slate-200 pb-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-full ${theme.chartBar} rounded-t-md transition-all duration-300 ${theme.chartBarHover}`}
              style={{
                height: `${(item.totalExposures / maxExposures) * 100}%`,
                minHeight: '4px',
              }}
              title={`${item.date}: ${item.totalExposures} 노출`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex-1 text-center text-xs text-slate-500">
            {item.date}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-6 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded ${theme.chartLegend}`} />
          <span>총 노출 수</span>
        </div>
      </div>
    </div>
  );
}

function QualitySignalCard({
  signal,
  onRequestImprovement,
}: {
  signal: QualitySignal;
  onRequestImprovement: (signalId: string) => void;
}) {
  const severityStyles = {
    high: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', badge: 'bg-red-100 text-red-700' },
    medium: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
    low: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  };
  const severityLabels = { high: '높음', medium: '보통', low: '낮음' };
  const styles = severityStyles[signal.severity];

  return (
    <div className={`${styles.bg} border ${styles.border} rounded-xl p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${styles.icon}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-slate-800">{signal.title}</h4>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles.badge}`}>
                심각도: {severityLabels[signal.severity]}
              </span>
            </div>
            <p className="text-sm text-slate-600 mb-2">{signal.description}</p>
            <p className="text-xs text-slate-500 font-mono bg-white/50 px-2 py-1 rounded inline-block">
              {signal.metric}
            </p>
            <div className="mt-3 p-3 bg-white/70 rounded-lg">
              <p className="text-sm text-slate-700">
                <strong className="text-slate-800">제안:</strong> {signal.suggestion}
              </p>
              {signal.relatedAssets && signal.relatedAssets.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {signal.relatedAssets.map((asset, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                      {asset}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => onRequestImprovement(signal.id)}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap"
        >
          <Send className="w-4 h-4" />
          개선 요청
        </button>
      </div>
    </div>
  );
}

function ImprovementRequestModal({
  isOpen,
  onClose,
  onSubmit,
  signalTitle,
  theme,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (memo: string) => void;
  signalTitle: string;
  theme: ThemeClasses;
}) {
  const [memo, setMemo] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit(memo);
    setMemo('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">개선 요청</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="mb-4">
          <p className="text-sm text-slate-600 mb-2">
            <strong>문제:</strong> {signalTitle}
          </p>
          <p className="text-xs text-slate-500">
            이 요청은 플랫폼 관리자에게 전달되어 Context Asset 개선에 활용됩니다.
          </p>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">메모 (선택)</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="추가로 전달할 내용이 있다면 작성해주세요..."
            className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 ${theme.modal.focusRing} focus:border-transparent`}
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">
            취소
          </button>
          <button
            onClick={handleSubmit}
            className={`px-4 py-2 ${theme.modal.submitBg} text-white text-sm font-medium rounded-lg ${theme.modal.submitHover} transition-colors`}
          >
            요청 전송
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Empty State =====

function EmptyState({ description }: { description?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-16 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Info className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">분석 데이터 준비 중</h3>
      <p className="text-slate-500 max-w-md mx-auto">
        {description ||
          'AI 응답 분석 인프라가 준비되면 KPI, Context Asset 노출 현황, 노출 사유 분포, 일별 트렌드, 품질 인사이트가 표시됩니다.'}
      </p>
    </div>
  );
}

// ===== Main Component =====

export function AiReportPage({ config }: AiReportPageProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('7d');
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const [isImprovementModalOpen, setIsImprovementModalOpen] = useState(false);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [submittedRequests, setSubmittedRequests] = useState<string[]>([]);

  const theme = THEME_MAP[config.theme];
  const kpiData = config.kpiData?.[selectedPeriod];
  const exposureData = config.exposureData || [];
  const reasonData = config.reasonData || [];
  const dailyTrendData = config.dailyTrendData || [];
  const qualitySignals = config.qualitySignals || [];
  const operatorInsights = config.operatorInsights || [];

  const periodLabels: Record<Period, string> = {
    '7d': '최근 7일',
    '30d': '최근 30일',
    '90d': '최근 90일',
  };

  const assetTypeSummary = useMemo(() => {
    return exposureData.reduce(
      (acc, item) => {
        acc[item.assetType] = (acc[item.assetType] || 0) + item.exposureCount;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [exposureData]);

  const handleRequestImprovement = (signalId: string) => {
    setSelectedSignalId(signalId);
    setIsImprovementModalOpen(true);
  };

  const handleSubmitImprovement = (memo: string) => {
    if (selectedSignalId) {
      console.log('개선 요청 전송:', { signalId: selectedSignalId, memo });
      setSubmittedRequests((prev) => [...prev, selectedSignalId]);
    }
  };

  const selectedSignal = qualitySignals.find((s) => s.id === selectedSignalId);

  // ===== Empty mode =====
  if (config.mode === 'empty') {
    const bannerTheme = THEME_MAP[config.theme] || THEME_MAP.green;
    return (
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">AI/Context Asset 리포트</h1>
          <p className="text-slate-500 mt-1">AI 응답에서 노출된 Context Asset 현황을 분석합니다</p>
        </div>
        <div className={`${bannerTheme.infoBanner.bg} border ${bannerTheme.infoBanner.border} rounded-xl p-4 flex items-start gap-3`}>
          <Info className={`w-5 h-5 ${bannerTheme.infoBanner.icon} flex-shrink-0 mt-0.5`} />
          <div>
            <p className={`text-sm ${bannerTheme.infoBanner.text}`}>{config.infoBannerText}</p>
          </div>
        </div>
        <EmptyState description={config.emptyStateDescription} />
      </div>
    );
  }

  // ===== Full report content =====
  const content = (
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">AI/Context Asset 리포트</h1>
          <p className="text-slate-500 mt-1">AI 응답에서 노출된 Context Asset 현황을 분석합니다</p>
        </div>
        <div className="flex items-center gap-3">
          {config.headerActions}
          <div className="relative">
            <button
              onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
              className={`flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg ${theme.dropdown.hoverBorder} transition-colors`}
            >
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">{periodLabels[selectedPeriod]}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            {isPeriodDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[140px]">
                {(Object.entries(periodLabels) as [Period, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedPeriod(key);
                      setIsPeriodDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg ${
                      selectedPeriod === key ? theme.dropdown.selected : 'text-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className={`${theme.infoBanner.bg} border ${theme.infoBanner.border} rounded-xl p-4 flex items-start gap-3`}>
        <Info className={`w-5 h-5 ${theme.infoBanner.icon} flex-shrink-0 mt-0.5`} />
        <div>
          <p className={`text-sm ${theme.infoBanner.text}`}>{config.infoBannerText}</p>
        </div>
      </div>

      {/* KPI Section */}
      {kpiData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="총 AI 응답"
            value={kpiData.totalAiResponses}
            change={kpiData.trends.responses.change}
            direction={kpiData.trends.responses.direction}
            icon={TrendingUp}
            color={theme.kpiPrimary}
          />
          <KpiCard
            title="총 노출 수"
            value={kpiData.totalExposures}
            change={kpiData.trends.exposures.change}
            direction={kpiData.trends.exposures.direction}
            icon={Eye}
            color={KPI_COLORS.green}
          />
          <KpiCard
            title="고유 Asset 수"
            value={kpiData.uniqueAssets}
            change={kpiData.trends.assets.change}
            direction={kpiData.trends.assets.direction}
            icon={FileText}
            color={KPI_COLORS.purple}
          />
          <KpiCard
            title="응답당 평균 노출"
            value={kpiData.avgExposurePerResponse.toFixed(2)}
            change={config.avgExposureChangePercent || 5.0}
            direction="up"
            icon={Users}
            color={KPI_COLORS.amber}
          />
        </div>
      )}

      {/* Asset Type Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {config.assetTypes.map((item) => (
          <div key={item.type} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <AssetTypeIcon type={item.type} assetTypes={config.assetTypes} />
              <div>
                <p className="text-xl font-bold text-slate-800">
                  {(assetTypeSummary[item.type] || 0).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">{item.label} 노출</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">노출 사유 분포</h2>
            <p className="text-sm text-slate-500 mt-1">고객이 어떤 맥락에서 Asset을 조회했는지 분석</p>
          </div>
          <div className="p-6">
            <ReasonBarChart data={reasonData} />
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">일별 트렌드</h2>
            <p className="text-sm text-slate-500 mt-1">일별 Context Asset 노출 추이</p>
          </div>
          <div className="p-6">
            <DailyTrendChart data={dailyTrendData} theme={theme} />
          </div>
        </div>
      </div>

      {/* Context Asset Exposure Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Context Asset 노출 현황</h2>
              <p className="text-sm text-slate-500 mt-1">노출 횟수 기준 상위 Asset 목록</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Asset</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">유형</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">노출 수</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">고유 사용자</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">주요 사유</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">추이</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {exposureData.map((item) => {
                const assetDef = config.assetTypes.find((a) => a.type === item.assetType);
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <AssetTypeIcon type={item.assetType} assetTypes={config.assetTypes} />
                        <span className="font-medium text-slate-800">{item.assetName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{assetDef?.label || item.assetType}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-slate-800">{item.exposureCount.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-slate-600">{item.uniqueUsers.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {item.topReasons.slice(0, 2).map((reason, idx) => (
                          <span key={idx} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`text-sm font-medium ${
                          item.trend === 'up' ? 'text-green-600' : item.trend === 'down' ? 'text-red-600' : 'text-slate-500'
                        }`}
                      >
                        {item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '→'}
                        {Math.abs(item.trendPercent).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operator Insights */}
      {operatorInsights.length > 0 && (
        <div className={`bg-gradient-to-r ${theme.insight.gradient} rounded-2xl p-6 text-white`}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">운영자 인사이트</h3>
              <ul className={`space-y-2 ${theme.insight.text} text-sm`}>
                {operatorInsights.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className={insight.bulletColor}>•</span>
                    <span>{insight.content}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Quality Insights */}
      {qualitySignals.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">품질 인사이트</h2>
                  <p className="text-sm text-slate-500">AI 응답 품질 개선이 필요한 신호를 감지했습니다</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {qualitySignals.filter((s) => s.severity === 'high').length > 0 && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                    높음 {qualitySignals.filter((s) => s.severity === 'high').length}
                  </span>
                )}
                {qualitySignals.filter((s) => s.severity === 'medium').length > 0 && (
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                    보통 {qualitySignals.filter((s) => s.severity === 'medium').length}
                  </span>
                )}
                {qualitySignals.filter((s) => s.severity === 'low').length > 0 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    낮음 {qualitySignals.filter((s) => s.severity === 'low').length}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {qualitySignals.map((signal) => (
              <div key={signal.id} className="relative">
                {submittedRequests.includes(signal.id) && (
                  <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center z-10">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">개선 요청이 전송되었습니다</span>
                    </div>
                  </div>
                )}
                <QualitySignalCard signal={signal} onRequestImprovement={handleRequestImprovement} />
              </div>
            ))}
          </div>
          <div className="px-6 pb-6">
            <div className="bg-slate-50 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-slate-600">
                <strong className="text-slate-700">품질 개선 루프</strong>: &quot;개선 요청&quot;을 클릭하면 플랫폼 관리자에게
                전달됩니다. 관리자가 Context Asset을 개선하면 다음 리포트에서 변화를 확인할 수 있습니다.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Improvement Request Modal */}
      <ImprovementRequestModal
        isOpen={isImprovementModalOpen}
        onClose={() => setIsImprovementModalOpen(false)}
        onSubmit={handleSubmitImprovement}
        signalTitle={selectedSignal?.title || ''}
        theme={theme}
      />
    </>
  );

  // ===== Layout: with or without header nav =====
  if (config.headerNav) {
    const nav = config.headerNav;
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={nav.backLink} className="text-slate-500 hover:text-slate-700">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <span className={`text-xl font-bold ${nav.serviceNameColor}`}>{nav.serviceName}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600 font-medium">운영자 AI 리포트</span>
            </div>
            <nav className="flex items-center gap-6">
              {nav.navLinks.map((link, idx) => (
                <Link key={idx} to={link.to} className={link.className || 'text-sm text-slate-600 hover:text-slate-700'}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">{content}</main>
      </div>
    );
  }

  return <div className="space-y-6">{content}</div>;
}
