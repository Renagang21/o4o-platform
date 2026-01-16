/**
 * OperatorAiReportPage - 서비스 운영자 AI/Context Asset 리포트
 *
 * Work Order: WO-AI-SERVICE-OPERATOR-REPORT-V1
 * Work Order: WO-AI-ASSET-QUALITY-LOOP-V1 (품질 인사이트 섹션 추가)
 *
 * KPA Society 버전 - 약사회 특화 데이터
 */

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  Eye,
  FileText,
  Calendar,
  ChevronDown,
  AlertCircle,
  Info,
  Package,
  Users,
  GraduationCap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Send,
} from 'lucide-react';
import { AiSummaryButton } from '../../components/ai';

// ===== 타입 정의 =====
type Period = '7d' | '30d' | '90d';

interface ContextAssetExposure {
  id: string;
  assetType: 'course' | 'member' | 'document' | 'groupbuy';
  assetName: string;
  exposureCount: number;
  uniqueUsers: number;
  topReasons: string[];
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

interface ExposureReason {
  reason: string;
  count: number;
  percentage: number;
  color: string;
}

interface DailyTrend {
  date: string;
  totalExposures: number;
  uniqueAssets: number;
  aiResponses: number;
}

// ===== 품질 신호 타입 (WO-AI-ASSET-QUALITY-LOOP-V1) =====
type QualitySignalSeverity = 'low' | 'medium' | 'high';
type QualitySignalType = 'fallback_high' | 'exposure_low' | 'asset_concentration' | 'asset_underutilized';

interface QualitySignal {
  id: string;
  signalType: QualitySignalType;
  severity: QualitySignalSeverity;
  title: string;
  description: string;
  metric: string;
  suggestion: string;
  relatedAssets?: string[];
}

// ===== Mock 데이터 (KPA Society 특화) =====
const mockKpiData = {
  '7d': {
    totalAiResponses: 892,
    totalExposures: 2456,
    uniqueAssets: 89,
    avgExposurePerResponse: 2.75,
    trends: {
      responses: { change: 12.5, direction: 'up' as const },
      exposures: { change: 18.2, direction: 'up' as const },
      assets: { change: 6.8, direction: 'up' as const },
    },
  },
  '30d': {
    totalAiResponses: 3567,
    totalExposures: 10234,
    uniqueAssets: 156,
    avgExposurePerResponse: 2.87,
    trends: {
      responses: { change: 22.4, direction: 'up' as const },
      exposures: { change: 28.6, direction: 'up' as const },
      assets: { change: 15.2, direction: 'up' as const },
    },
  },
  '90d': {
    totalAiResponses: 10892,
    totalExposures: 32456,
    uniqueAssets: 234,
    avgExposurePerResponse: 2.98,
    trends: {
      responses: { change: 35.8, direction: 'up' as const },
      exposures: { change: 42.1, direction: 'up' as const },
      assets: { change: 28.4, direction: 'up' as const },
    },
  },
};

const mockExposureData: ContextAssetExposure[] = [
  {
    id: '1',
    assetType: 'course',
    assetName: '약물 상호작용 심화 과정',
    exposureCount: 412,
    uniqueUsers: 234,
    topReasons: ['강좌 문의', '수료증 발급', '학습 진도'],
    trend: 'up',
    trendPercent: 28.5,
  },
  {
    id: '2',
    assetType: 'document',
    assetName: '2024 약사법 개정안 안내',
    exposureCount: 356,
    uniqueUsers: 198,
    topReasons: ['법규 문의', '개정 내용', '시행일'],
    trend: 'up',
    trendPercent: 22.3,
  },
  {
    id: '3',
    assetType: 'groupbuy',
    assetName: '혈압계 B모델 공동구매',
    exposureCount: 289,
    uniqueUsers: 167,
    topReasons: ['참여 방법', '가격 문의', '배송 일정'],
    trend: 'up',
    trendPercent: 18.7,
  },
  {
    id: '4',
    assetType: 'course',
    assetName: '당뇨 관리 전문가 과정',
    exposureCount: 245,
    uniqueUsers: 145,
    topReasons: ['강좌 소개', '이수 조건', '평점'],
    trend: 'stable',
    trendPercent: 3.2,
  },
  {
    id: '5',
    assetType: 'member',
    assetName: '강남분회 약사 정보',
    exposureCount: 198,
    uniqueUsers: 112,
    topReasons: ['회원 검색', '연락처', '소속 확인'],
    trend: 'down',
    trendPercent: -5.8,
  },
  {
    id: '6',
    assetType: 'document',
    assetName: '건강기능식품 판매 가이드',
    exposureCount: 167,
    uniqueUsers: 98,
    topReasons: ['규정 확인', '판매 조건', '라벨링'],
    trend: 'up',
    trendPercent: 12.4,
  },
];

const mockReasonData: ExposureReason[] = [
  { reason: '교육/강좌 관련 문의', count: 892, percentage: 36.3, color: '#3B82F6' },
  { reason: '규정/법규 확인', count: 612, percentage: 24.9, color: '#10B981' },
  { reason: '공동구매 정보', count: 456, percentage: 18.6, color: '#8B5CF6' },
  { reason: '회원 정보 검색', count: 289, percentage: 11.8, color: '#F59E0B' },
  { reason: '자료실 문서', count: 156, percentage: 6.4, color: '#EC4899' },
  { reason: '기타', count: 51, percentage: 2.0, color: '#6B7280' },
];

const mockDailyTrend: DailyTrend[] = [
  { date: '01/09', totalExposures: 312, uniqueAssets: 45, aiResponses: 112 },
  { date: '01/10', totalExposures: 378, uniqueAssets: 52, aiResponses: 134 },
  { date: '01/11', totalExposures: 345, uniqueAssets: 48, aiResponses: 125 },
  { date: '01/12', totalExposures: 423, uniqueAssets: 58, aiResponses: 152 },
  { date: '01/13', totalExposures: 398, uniqueAssets: 55, aiResponses: 143 },
  { date: '01/14', totalExposures: 456, uniqueAssets: 62, aiResponses: 165 },
  { date: '01/15', totalExposures: 412, uniqueAssets: 56, aiResponses: 148 },
];

// ===== 품질 신호 Mock 데이터 (WO-AI-ASSET-QUALITY-LOOP-V1) =====
const mockQualitySignals: QualitySignal[] = [
  {
    id: 'qs-1',
    signalType: 'fallback_high',
    severity: 'medium',
    title: 'Fallback 비율 주의',
    description: '최근 7일간 AI 응답 중 17%가 맥락 자산 없이 일반 응답으로 처리되었습니다.',
    metric: 'Fallback 비율: 17% (권장: 15% 이하)',
    suggestion: '교육/강좌, 공동구매 관련 Context Asset을 추가 등록하세요.',
    relatedAssets: ['신규 강좌', '법규 안내'],
  },
  {
    id: 'qs-2',
    signalType: 'asset_concentration',
    severity: 'high',
    title: '특정 Asset 과다 노출',
    description: '"약물 상호작용 심화 과정"이 전체 노출의 36%를 차지하고 있습니다.',
    metric: '상위 1개 Asset 집중도: 36% (권장: 20% 이하)',
    suggestion: '다른 인기 강좌의 Asset 품질을 개선하거나 신규 강좌를 홍보하세요.',
    relatedAssets: ['약물 상호작용 심화 과정'],
  },
  {
    id: 'qs-3',
    signalType: 'asset_underutilized',
    severity: 'low',
    title: '저활용 Asset 발견',
    description: '등록된 89개 Asset 중 12개(13%)가 최근 30일간 노출되지 않았습니다.',
    metric: '미노출 Asset: 12개 (등록 대비 13%)',
    suggestion: '해당 Asset의 메타데이터와 연관 키워드를 점검하세요.',
    relatedAssets: ['2023 보수교육 자료', '지역분회 연락처', '과거 공동구매 안내'],
  },
];

// ===== 컴포넌트 =====

// KPI 카드
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
  color: string;
}) {
  const colorClasses: Record<string, { bg: string; icon: string }> = {
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    green: { bg: 'bg-green-100', icon: 'text-green-600' },
    purple: { bg: 'bg-purple-100', icon: 'text-purple-600' },
    amber: { bg: 'bg-amber-100', icon: 'text-amber-600' },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${colors.icon}`} />
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

// Asset Type Icon
function AssetTypeIcon({ type }: { type: ContextAssetExposure['assetType'] }) {
  const iconMap = {
    course: { icon: GraduationCap, color: 'text-blue-600 bg-blue-100' },
    member: { icon: Users, color: 'text-green-600 bg-green-100' },
    document: { icon: FileText, color: 'text-purple-600 bg-purple-100' },
    groupbuy: { icon: Package, color: 'text-amber-600 bg-amber-100' },
  };

  const { icon: Icon, color } = iconMap[type];

  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
      <Icon className="w-4 h-4" />
    </div>
  );
}

// Asset Type Label
function getAssetTypeLabel(type: ContextAssetExposure['assetType']): string {
  const labels = {
    course: '강좌',
    member: '회원',
    document: '문서',
    groupbuy: '공동구매',
  };
  return labels[type];
}

// Simple Bar Chart for Reasons
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

// Simple Line Chart for Daily Trend
function DailyTrendChart({ data }: { data: DailyTrend[] }) {
  const maxExposures = Math.max(...data.map((d) => d.totalExposures));

  return (
    <div className="space-y-4">
      {/* Chart Area */}
      <div className="relative h-48 flex items-end gap-2 border-b border-slate-200 pb-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-blue-500 rounded-t-md transition-all duration-300 hover:bg-blue-600"
              style={{
                height: `${(item.totalExposures / maxExposures) * 100}%`,
                minHeight: '4px',
              }}
              title={`${item.date}: ${item.totalExposures} 노출`}
            />
          </div>
        ))}
      </div>

      {/* X-axis Labels */}
      <div className="flex gap-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex-1 text-center text-xs text-slate-500">
            {item.date}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>총 노출 수</span>
        </div>
      </div>
    </div>
  );
}

// ===== 품질 신호 컴포넌트 (WO-AI-ASSET-QUALITY-LOOP-V1) =====

function QualitySignalCard({
  signal,
  onRequestImprovement,
}: {
  signal: QualitySignal;
  onRequestImprovement: (signalId: string) => void;
}) {
  const severityStyles = {
    high: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      badge: 'bg-red-100 text-red-700',
    },
    medium: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'text-amber-600',
      badge: 'bg-amber-100 text-amber-700',
    },
    low: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-700',
    },
  };

  const severityLabels = {
    high: '높음',
    medium: '보통',
    low: '낮음',
  };

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
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded"
                    >
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

// 개선 요청 모달
function ImprovementRequestModal({
  isOpen,
  onClose,
  onSubmit,
  signalTitle,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (memo: string) => void;
  signalTitle: string;
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
          <label className="block text-sm font-medium text-slate-700 mb-2">
            메모 (선택)
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="추가로 전달할 내용이 있다면 작성해주세요..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            요청 전송
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== 메인 컴포넌트 =====
export default function OperatorAiReportPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('7d');
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);

  // 품질 개선 요청 상태 (WO-AI-ASSET-QUALITY-LOOP-V1)
  const [isImprovementModalOpen, setIsImprovementModalOpen] = useState(false);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [submittedRequests, setSubmittedRequests] = useState<string[]>([]);

  const kpiData = mockKpiData[selectedPeriod];

  const periodLabels: Record<Period, string> = {
    '7d': '최근 7일',
    '30d': '최근 30일',
    '90d': '최근 90일',
  };

  // Asset type summary
  const assetTypeSummary = useMemo(() => {
    const summary = mockExposureData.reduce(
      (acc, item) => {
        acc[item.assetType] = (acc[item.assetType] || 0) + item.exposureCount;
        return acc;
      },
      {} as Record<string, number>
    );
    return summary;
  }, []);

  // 품질 개선 요청 핸들러 (WO-AI-ASSET-QUALITY-LOOP-V1)
  const handleRequestImprovement = (signalId: string) => {
    setSelectedSignalId(signalId);
    setIsImprovementModalOpen(true);
  };

  const handleSubmitImprovement = (memo: string) => {
    if (selectedSignalId) {
      // TODO: API 호출로 개선 요청 전송
      console.log('개선 요청 전송:', { signalId: selectedSignalId, memo });
      setSubmittedRequests((prev) => [...prev, selectedSignalId]);
    }
  };

  const selectedSignal = mockQualitySignals.find((s) => s.id === selectedSignalId);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">AI/Context Asset 리포트</h1>
          <p className="text-slate-500 mt-1">
            AI 응답에서 노출된 Context Asset 현황을 분석합니다
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AiSummaryButton contextLabel="AI 리포트 분석" />

          {/* Period Selector */}
          <div className="relative">
            <button
              onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
            >
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">
                {periodLabels[selectedPeriod]}
              </span>
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
                      selectedPeriod === key ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
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
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-800">
            <strong>Context Asset</strong>은 AI 응답에 포함된 강좌, 회원, 문서, 공동구매 정보입니다.
            이 리포트를 통해 회원들이 어떤 정보를 많이 찾고 있는지 파악하고,
            서비스 개선에 활용할 수 있습니다.
          </p>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="총 AI 응답"
          value={kpiData.totalAiResponses}
          change={kpiData.trends.responses.change}
          direction={kpiData.trends.responses.direction}
          icon={TrendingUp}
          color="blue"
        />
        <KpiCard
          title="총 노출 수"
          value={kpiData.totalExposures}
          change={kpiData.trends.exposures.change}
          direction={kpiData.trends.exposures.direction}
          icon={Eye}
          color="green"
        />
        <KpiCard
          title="고유 Asset 수"
          value={kpiData.uniqueAssets}
          change={kpiData.trends.assets.change}
          direction={kpiData.trends.assets.direction}
          icon={FileText}
          color="purple"
        />
        <KpiCard
          title="응답당 평균 노출"
          value={kpiData.avgExposurePerResponse.toFixed(2)}
          change={4.8}
          direction="up"
          icon={Users}
          color="amber"
        />
      </div>

      {/* Asset Type Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { type: 'course' as const, label: '강좌', icon: GraduationCap, color: 'blue' },
          { type: 'member' as const, label: '회원', icon: Users, color: 'green' },
          { type: 'document' as const, label: '문서', icon: FileText, color: 'purple' },
          { type: 'groupbuy' as const, label: '공동구매', icon: Package, color: 'amber' },
        ].map((item) => (
          <div
            key={item.type}
            className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <AssetTypeIcon type={item.type} />
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
        {/* Exposure Reason Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">노출 사유 분포</h2>
            <p className="text-sm text-slate-500 mt-1">
              회원이 어떤 맥락에서 Asset을 조회했는지 분석
            </p>
          </div>
          <div className="p-6">
            <ReasonBarChart data={mockReasonData} />
          </div>
        </div>

        {/* Daily Trend */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">일별 트렌드</h2>
            <p className="text-sm text-slate-500 mt-1">
              일별 Context Asset 노출 추이
            </p>
          </div>
          <div className="p-6">
            <DailyTrendChart data={mockDailyTrend} />
          </div>
        </div>
      </div>

      {/* Context Asset Exposure Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Context Asset 노출 현황</h2>
              <p className="text-sm text-slate-500 mt-1">
                노출 횟수 기준 상위 Asset 목록
              </p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Asset
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  유형
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  노출 수
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  고유 사용자
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  주요 사유
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  추이
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockExposureData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <AssetTypeIcon type={item.assetType} />
                      <span className="font-medium text-slate-800">{item.assetName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">
                      {getAssetTypeLabel(item.assetType)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-slate-800">
                      {item.exposureCount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-slate-600">{item.uniqueUsers.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.topReasons.slice(0, 2).map((reason, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`text-sm font-medium ${
                        item.trend === 'up'
                          ? 'text-green-600'
                          : item.trend === 'down'
                          ? 'text-red-600'
                          : 'text-slate-500'
                      }`}
                    >
                      {item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '→'}
                      {Math.abs(item.trendPercent).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Suggestions */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">운영자 인사이트</h3>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>
                  <strong className="text-white">"약물 상호작용 심화 과정"</strong>이 가장 많이 조회되고 있습니다.
                  관련 심화 강좌 개설을 검토해보세요.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                <span>
                  <strong className="text-white">"강남분회 약사 정보"</strong> 검색이 감소 추세입니다.
                  회원 정보 업데이트 상태를 확인하세요.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                <span>
                  "교육/강좌 관련 문의"가 36.3%를 차지합니다.
                  강좌 안내 페이지 개선으로 사용자 경험을 향상시킬 수 있습니다.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ===== 품질 인사이트 섹션 (WO-AI-ASSET-QUALITY-LOOP-V1) ===== */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">품질 인사이트</h2>
                <p className="text-sm text-slate-500">
                  AI 응답 품질 개선이 필요한 신호를 감지했습니다
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {mockQualitySignals.filter((s) => s.severity === 'high').length > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                  높음 {mockQualitySignals.filter((s) => s.severity === 'high').length}
                </span>
              )}
              {mockQualitySignals.filter((s) => s.severity === 'medium').length > 0 && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                  보통 {mockQualitySignals.filter((s) => s.severity === 'medium').length}
                </span>
              )}
              {mockQualitySignals.filter((s) => s.severity === 'low').length > 0 && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  낮음 {mockQualitySignals.filter((s) => s.severity === 'low').length}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {mockQualitySignals.map((signal) => (
            <div key={signal.id} className="relative">
              {submittedRequests.includes(signal.id) && (
                <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center z-10">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">개선 요청이 전송되었습니다</span>
                  </div>
                </div>
              )}
              <QualitySignalCard
                signal={signal}
                onRequestImprovement={handleRequestImprovement}
              />
            </div>
          ))}
        </div>

        {/* 품질 루프 안내 */}
        <div className="px-6 pb-6">
          <div className="bg-slate-50 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-600">
              <strong className="text-slate-700">품질 개선 루프</strong>: "개선 요청"을 클릭하면 플랫폼 관리자에게 전달됩니다.
              관리자가 Context Asset을 개선하면 다음 리포트에서 변화를 확인할 수 있습니다.
            </div>
          </div>
        </div>
      </div>

      {/* 개선 요청 모달 */}
      <ImprovementRequestModal
        isOpen={isImprovementModalOpen}
        onClose={() => setIsImprovementModalOpen(false)}
        onSubmit={handleSubmitImprovement}
        signalTitle={selectedSignal?.title || ''}
      />
    </div>
  );
}
