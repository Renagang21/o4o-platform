/**
 * AiReportPage - 서비스 운영자 AI/Context Asset 리포트
 *
 * Work Order: WO-AI-SERVICE-OPERATOR-REPORT-V1
 * Work Order: WO-AI-ASSET-QUALITY-LOOP-V1 (품질 인사이트 섹션 추가)
 *
 * GlucoseView 버전 - 혈당 관리/당뇨 특화 데이터
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
  Package,
  Users,
  Activity,
  Building2,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Send,
} from 'lucide-react';

// ===== 타입 정의 =====
type Period = '7d' | '30d' | '90d';

interface ContextAssetExposure {
  id: string;
  assetType: 'device' | 'pharmacy' | 'content' | 'guide';
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

// ===== Mock 데이터 (GlucoseView 특화) =====
const mockKpiData = {
  '7d': {
    totalAiResponses: 978,
    totalExposures: 2845,
    uniqueAssets: 112,
    avgExposurePerResponse: 2.91,
    trends: {
      responses: { change: 14.8, direction: 'up' as const },
      exposures: { change: 19.5, direction: 'up' as const },
      assets: { change: 7.3, direction: 'up' as const },
    },
  },
  '30d': {
    totalAiResponses: 4123,
    totalExposures: 12456,
    uniqueAssets: 198,
    avgExposurePerResponse: 3.02,
    trends: {
      responses: { change: 28.2, direction: 'up' as const },
      exposures: { change: 32.8, direction: 'up' as const },
      assets: { change: 12.4, direction: 'up' as const },
    },
  },
  '90d': {
    totalAiResponses: 12345,
    totalExposures: 38456,
    uniqueAssets: 287,
    avgExposurePerResponse: 3.12,
    trends: {
      responses: { change: 42.5, direction: 'up' as const },
      exposures: { change: 52.3, direction: 'up' as const },
      assets: { change: 21.8, direction: 'up' as const },
    },
  },
};

const mockExposureData: ContextAssetExposure[] = [
  {
    id: '1',
    assetType: 'device',
    assetName: '연속혈당측정기 G7',
    exposureCount: 534,
    uniqueUsers: 312,
    topReasons: ['사용법', '교정 방법', '오류 해결'],
    trend: 'up',
    trendPercent: 28.4,
  },
  {
    id: '2',
    assetType: 'content',
    assetName: '혈당 관리 기본 가이드',
    exposureCount: 456,
    uniqueUsers: 267,
    topReasons: ['정보 요청', '목표 설정', '식단 조절'],
    trend: 'up',
    trendPercent: 22.1,
  },
  {
    id: '3',
    assetType: 'pharmacy',
    assetName: '서울 강남 당뇨케어 약국',
    exposureCount: 389,
    uniqueUsers: 228,
    topReasons: ['위치 확인', '상담 예약', '재고 문의'],
    trend: 'up',
    trendPercent: 15.6,
  },
  {
    id: '4',
    assetType: 'guide',
    assetName: '인슐린 주사 가이드',
    exposureCount: 345,
    uniqueUsers: 198,
    topReasons: ['주사 방법', '보관법', '용량 조절'],
    trend: 'stable',
    trendPercent: 3.8,
  },
  {
    id: '5',
    assetType: 'device',
    assetName: '혈당측정기 프리스타일',
    exposureCount: 298,
    uniqueUsers: 176,
    topReasons: ['정확도', '스트립 호환', '앱 연동'],
    trend: 'up',
    trendPercent: 12.5,
  },
  {
    id: '6',
    assetType: 'content',
    assetName: '저혈당 대처법',
    exposureCount: 267,
    uniqueUsers: 156,
    topReasons: ['응급 처치', '증상 확인', '예방법'],
    trend: 'down',
    trendPercent: -4.2,
  },
  {
    id: '7',
    assetType: 'pharmacy',
    assetName: '부산 해운대 약국',
    exposureCount: 234,
    uniqueUsers: 134,
    topReasons: ['영업시간', '배송 가능', '상담 예약'],
    trend: 'stable',
    trendPercent: 1.8,
  },
  {
    id: '8',
    assetType: 'guide',
    assetName: '당뇨 식단 플래너',
    exposureCount: 198,
    uniqueUsers: 112,
    topReasons: ['식단 구성', '탄수화물 계산', '레시피'],
    trend: 'up',
    trendPercent: 9.7,
  },
];

const mockReasonData: ExposureReason[] = [
  { reason: '기기 사용법/문의', count: 1245, percentage: 43.7, color: '#10B981' },
  { reason: '혈당 관리 정보', count: 678, percentage: 23.8, color: '#3B82F6' },
  { reason: '약국/상담 문의', count: 456, percentage: 16.0, color: '#F59E0B' },
  { reason: '식단/운동 가이드', count: 289, percentage: 10.2, color: '#8B5CF6' },
  { reason: '응급 상황/대처', count: 134, percentage: 4.7, color: '#EF4444' },
  { reason: '기타', count: 43, percentage: 1.6, color: '#6B7280' },
];

const mockDailyTrend: DailyTrend[] = [
  { date: '01/09', totalExposures: 378, uniqueAssets: 67, aiResponses: 128 },
  { date: '01/10', totalExposures: 412, uniqueAssets: 74, aiResponses: 140 },
  { date: '01/11', totalExposures: 389, uniqueAssets: 70, aiResponses: 132 },
  { date: '01/12', totalExposures: 456, uniqueAssets: 82, aiResponses: 154 },
  { date: '01/13', totalExposures: 423, uniqueAssets: 76, aiResponses: 143 },
  { date: '01/14', totalExposures: 478, uniqueAssets: 86, aiResponses: 162 },
  { date: '01/15', totalExposures: 445, uniqueAssets: 80, aiResponses: 151 },
];

// ===== 품질 신호 Mock 데이터 (WO-AI-ASSET-QUALITY-LOOP-V1) =====
const mockQualitySignals: QualitySignal[] = [
  {
    id: 'qs-1',
    signalType: 'fallback_high',
    severity: 'high',
    title: 'Fallback 비율 높음',
    description: '최근 7일간 AI 응답 중 19%가 맥락 자산 없이 일반 응답으로 처리되었습니다.',
    metric: 'Fallback 비율: 19% (권장: 15% 이하)',
    suggestion: '혈당 측정, CGM 관련 Context Asset을 추가 등록하여 맥락 기반 응답률을 높이세요.',
    relatedAssets: ['연속혈당측정기', '혈당 관리'],
  },
  {
    id: 'qs-2',
    signalType: 'asset_concentration',
    severity: 'medium',
    title: '특정 Asset 과다 노출',
    description: '"연속혈당측정기 G7"이 전체 노출의 32%를 차지하고 있습니다.',
    metric: '상위 1개 Asset 집중도: 32% (권장: 20% 이하)',
    suggestion: '다른 혈당측정기 모델의 Asset 품질을 개선하거나 신규 등록을 검토하세요.',
    relatedAssets: ['연속혈당측정기 G7'],
  },
  {
    id: 'qs-3',
    signalType: 'asset_underutilized',
    severity: 'low',
    title: '저활용 Asset 발견',
    description: '등록된 112개 Asset 중 18개(16%)가 최근 30일간 노출되지 않았습니다.',
    metric: '미노출 Asset: 18개 (등록 대비 16%)',
    suggestion: '해당 Asset의 메타데이터와 연관 키워드를 점검하세요.',
    relatedAssets: ['혈당 기록앱 연동', '인슐린 펜 사용법', '저혈당 응급 키트'],
  },
];

// ===== 컴포넌트 =====

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
    teal: { bg: 'bg-teal-100', icon: 'text-teal-600' },
    green: { bg: 'bg-green-100', icon: 'text-green-600' },
    purple: { bg: 'bg-purple-100', icon: 'text-purple-600' },
    amber: { bg: 'bg-amber-100', icon: 'text-amber-600' },
  };

  const colors = colorClasses[color] || colorClasses.teal;

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

function AssetTypeIcon({ type }: { type: ContextAssetExposure['assetType'] }) {
  const iconMap = {
    device: { icon: Activity, color: 'text-teal-600 bg-teal-100' },
    pharmacy: { icon: Building2, color: 'text-green-600 bg-green-100' },
    content: { icon: FileText, color: 'text-purple-600 bg-purple-100' },
    guide: { icon: Package, color: 'text-amber-600 bg-amber-100' },
  };

  const { icon: Icon, color } = iconMap[type];

  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
      <Icon className="w-4 h-4" />
    </div>
  );
}

function getAssetTypeLabel(type: ContextAssetExposure['assetType']): string {
  const labels = {
    device: '기기',
    pharmacy: '약국',
    content: '콘텐츠',
    guide: '가이드',
  };
  return labels[type];
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

function DailyTrendChart({ data }: { data: DailyTrend[] }) {
  const maxExposures = Math.max(...data.map((d) => d.totalExposures));

  return (
    <div className="space-y-4">
      <div className="relative h-48 flex items-end gap-2 border-b border-slate-200 pb-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-teal-500 rounded-t-md transition-all duration-300 hover:bg-teal-600"
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
          <div className="w-3 h-3 rounded bg-teal-500" />
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
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
            className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            요청 전송
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== 메인 컴포넌트 =====
export default function AiReportPage() {
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/operator/glucoseview/applications" className="text-slate-500 hover:text-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="text-xl font-bold text-teal-600">GlucoseView</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 font-medium">운영자 AI 리포트</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link to="/operator/glucoseview/applications" className="text-sm text-slate-600 hover:text-teal-600">
              신청 관리
            </Link>
            <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
              메인으로
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">AI/Context Asset 리포트</h1>
            <p className="text-slate-500 mt-1">
              AI 응답에서 노출된 Context Asset 현황을 분석합니다
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="relative">
              <button
                onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-teal-300 transition-colors"
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
                        selectedPeriod === key ? 'bg-teal-50 text-teal-700' : 'text-slate-700'
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
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-teal-800">
              <strong>Context Asset</strong>은 AI 응답에 포함된 기기, 약국, 콘텐츠, 가이드 정보입니다.
              이 리포트를 통해 사용자가 어떤 정보를 많이 찾고 있는지 파악하고,
              서비스를 개선할 수 있습니다.
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
            color="teal"
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
            change={4.5}
            direction="up"
            icon={Users}
            color="amber"
          />
        </div>

        {/* Asset Type Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { type: 'device' as const, label: '기기', icon: Activity, color: 'teal' },
            { type: 'pharmacy' as const, label: '약국', icon: Building2, color: 'green' },
            { type: 'content' as const, label: '콘텐츠', icon: FileText, color: 'purple' },
            { type: 'guide' as const, label: '가이드', icon: Package, color: 'amber' },
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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">노출 사유 분포</h2>
              <p className="text-sm text-slate-500 mt-1">
                사용자가 어떤 맥락에서 Asset을 조회했는지 분석
              </p>
            </div>
            <div className="p-6">
              <ReasonBarChart data={mockReasonData} />
            </div>
          </div>

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
        <div className="bg-gradient-to-r from-teal-700 to-teal-600 rounded-2xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">운영자 인사이트</h3>
              <ul className="space-y-2 text-teal-100 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-300">•</span>
                  <span>
                    <strong className="text-white">"연속혈당측정기 G7"</strong>이 가장 많이 조회되고 있습니다.
                    관련 교육 콘텐츠와 FAQ를 강화하세요.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-300">•</span>
                  <span>
                    <strong className="text-white">"저혈당 대처법"</strong> 콘텐츠 조회가 감소 추세입니다.
                    시즌별 관리법 콘텐츠로 업데이트를 고려하세요.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-300">•</span>
                  <span>
                    "기기 사용법/문의"가 43.7%를 차지합니다.
                    비디오 가이드나 튜토리얼을 추가하면 사용자 만족도가 높아집니다.
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
      </main>
    </div>
  );
}
