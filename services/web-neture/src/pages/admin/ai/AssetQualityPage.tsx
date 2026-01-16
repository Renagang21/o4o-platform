/**
 * AssetQualityPage - 관리자 AI Context Asset 품질 관리 페이지
 *
 * Work Order: WO-AI-ASSET-QUALITY-LOOP-V1
 * Work Order: WO-AI-ASSET-PACKAGING-V1
 *
 * 서비스별 품질 신호 요약 및 개선 요청 관리
 * - 서비스 운영자가 신고한 품질 문제 목록
 * - 심각도별 분류
 * - 개선 액션 기록
 * - 서비스별 권장 패키지 기준 표시
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  FileText,
  MessageSquare,
  TrendingUp,
  Building2,
  Filter,
  RefreshCw,
  Check,
  X,
  Package,
  Info,
} from 'lucide-react';
import {
  AI_ASSET_PACKAGE_STANDARDS,
  calculatePackageCompliance,
  type AssetCount,
} from './aiAssetPackageStandards';

// ===== 타입 정의 =====
type QualitySignalSeverity = 'low' | 'medium' | 'high';
type QualitySignalType = 'fallback_high' | 'exposure_low' | 'asset_concentration' | 'asset_underutilized';
type RequestStatus = 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed';

interface ServiceQualitySummary {
  serviceId: string;
  serviceName: string;
  signalCounts: {
    high: number;
    medium: number;
    low: number;
  };
  pendingRequests: number;
  lastUpdated: string;
  currentAssets: AssetCount;
}

interface ImprovementRequest {
  id: string;
  serviceId: string;
  serviceName: string;
  signalType: QualitySignalType;
  signalTitle: string;
  severity: QualitySignalSeverity;
  description: string;
  operatorMemo: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  adminNote?: string;
}

// ===== Mock 데이터 =====
const mockServiceSummaries: ServiceQualitySummary[] = [
  {
    serviceId: 'neture',
    serviceName: '네처 (Neture)',
    signalCounts: { high: 1, medium: 2, low: 1 },
    pendingRequests: 2,
    lastUpdated: '2026-01-16T10:30:00Z',
    currentAssets: { brand: 4, product: 12, non_product: 6, content: 7 },
  },
  {
    serviceId: 'glycopharm',
    serviceName: '글라이코팜 (GlycoPharm)',
    signalCounts: { high: 1, medium: 1, low: 1 },
    pendingRequests: 1,
    lastUpdated: '2026-01-16T09:15:00Z',
    currentAssets: { brand: 2, product: 10, non_product: 8, content: 3 },
  },
  {
    serviceId: 'glucoseview',
    serviceName: '글루코스뷰 (GlucoseView)',
    signalCounts: { high: 1, medium: 1, low: 1 },
    pendingRequests: 0,
    lastUpdated: '2026-01-16T08:45:00Z',
    currentAssets: { brand: 2, product: 4, non_product: 8, content: 6 },
  },
  {
    serviceId: 'k-cosmetics',
    serviceName: 'K-코스메틱 (K-Cosmetics)',
    signalCounts: { high: 1, medium: 1, low: 1 },
    pendingRequests: 1,
    lastUpdated: '2026-01-15T18:20:00Z',
    currentAssets: { brand: 6, product: 25, non_product: 4, content: 2 },
  },
  {
    serviceId: 'kpa-society',
    serviceName: 'KPA 약사회 (KPA Society)',
    signalCounts: { high: 1, medium: 1, low: 1 },
    pendingRequests: 0,
    lastUpdated: '2026-01-15T16:00:00Z',
    currentAssets: { brand: 2, product: 12, non_product: 9, content: 6 },
  },
];

const mockImprovementRequests: ImprovementRequest[] = [
  {
    id: 'req-1',
    serviceId: 'neture',
    serviceName: '네처 (Neture)',
    signalType: 'fallback_high',
    signalTitle: 'Fallback 비율 높음',
    severity: 'high',
    description: '최근 7일간 AI 응답 중 23%가 맥락 자산 없이 일반 응답으로 처리되었습니다.',
    operatorMemo: '건강기능식품 카테고리 관련 문의가 많은데, Context Asset이 부족한 것 같습니다.',
    status: 'pending',
    createdAt: '2026-01-16T10:00:00Z',
    updatedAt: '2026-01-16T10:00:00Z',
  },
  {
    id: 'req-2',
    serviceId: 'neture',
    serviceName: '네처 (Neture)',
    signalType: 'asset_concentration',
    signalTitle: '특정 Asset 과다 노출',
    severity: 'medium',
    description: '"네처 프리미엄 멀티비타민"이 전체 노출의 35%를 차지하고 있습니다.',
    operatorMemo: '다른 비타민 제품들도 많이 노출되어야 할 것 같습니다. 특히 오메가3 제품군요.',
    status: 'pending',
    createdAt: '2026-01-15T15:30:00Z',
    updatedAt: '2026-01-15T15:30:00Z',
  },
  {
    id: 'req-3',
    serviceId: 'glycopharm',
    serviceName: '글라이코팜 (GlycoPharm)',
    signalType: 'fallback_high',
    signalTitle: 'Fallback 비율 높음',
    severity: 'high',
    description: '최근 7일간 AI 응답 중 21%가 맥락 자산 없이 일반 응답으로 처리되었습니다.',
    operatorMemo: '',
    status: 'acknowledged',
    createdAt: '2026-01-14T11:20:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
    adminNote: '건강기능식품 카테고리 Asset 추가 등록 예정',
  },
  {
    id: 'req-4',
    serviceId: 'k-cosmetics',
    serviceName: 'K-코스메틱 (K-Cosmetics)',
    signalType: 'asset_concentration',
    signalTitle: '특정 Asset 과다 노출',
    severity: 'high',
    description: '"수분크림 글로우 에디션"이 전체 노출의 38%를 차지하고 있습니다.',
    operatorMemo: '스킨케어 라인 전체가 고르게 노출되면 좋겠습니다.',
    status: 'in_progress',
    createdAt: '2026-01-13T14:00:00Z',
    updatedAt: '2026-01-16T08:30:00Z',
    adminNote: '스킨케어 카테고리 Asset 메타데이터 개선 작업 중',
  },
  {
    id: 'req-5',
    serviceId: 'neture',
    serviceName: '네처 (Neture)',
    signalType: 'asset_underutilized',
    signalTitle: '저활용 Asset 발견',
    severity: 'low',
    description: '등록된 156개 Asset 중 24개(15%)가 최근 30일간 노출되지 않았습니다.',
    operatorMemo: '',
    status: 'resolved',
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-01-14T16:00:00Z',
    adminNote: '미노출 Asset 24개 중 18개 메타데이터 개선 완료, 6개는 더 이상 판매하지 않는 제품으로 비활성화',
  },
];

// ===== 유틸 함수 =====
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getSignalTypeLabel = (type: QualitySignalType): string => {
  const labels: Record<QualitySignalType, string> = {
    fallback_high: 'Fallback 높음',
    exposure_low: '노출 부족',
    asset_concentration: 'Asset 집중',
    asset_underutilized: '저활용 Asset',
  };
  return labels[type];
};

const getStatusInfo = (status: RequestStatus) => {
  const info: Record<RequestStatus, { label: string; color: string; icon: typeof Clock }> = {
    pending: { label: '대기', color: 'bg-amber-100 text-amber-700', icon: Clock },
    acknowledged: { label: '확인됨', color: 'bg-blue-100 text-blue-700', icon: Check },
    in_progress: { label: '진행 중', color: 'bg-purple-100 text-purple-700', icon: RefreshCw },
    resolved: { label: '완료', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    dismissed: { label: '반려', color: 'bg-gray-100 text-gray-600', icon: X },
  };
  return info[status];
};

const getSeverityInfo = (severity: QualitySignalSeverity) => {
  const info: Record<QualitySignalSeverity, { label: string; color: string }> = {
    high: { label: '높음', color: 'bg-red-100 text-red-700' },
    medium: { label: '보통', color: 'bg-amber-100 text-amber-700' },
    low: { label: '낮음', color: 'bg-blue-100 text-blue-700' },
  };
  return info[severity];
};

// ===== 컴포넌트 =====

// 서비스 요약 카드
function ServiceSummaryCard({ service }: { service: ServiceQualitySummary }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalSignals = service.signalCounts.high + service.signalCounts.medium + service.signalCounts.low;

  // 패키지 준수율 계산
  const compliance = calculatePackageCompliance(service.serviceId, service.currentAssets);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-gray-400" />
          <div className="text-left">
            <div className="font-medium text-gray-900">{service.serviceName}</div>
            <div className="text-xs text-gray-500">마지막 업데이트: {formatDate(service.lastUpdated)}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Package Compliance */}
          {compliance && (
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              compliance.allRequirementsMet
                ? 'bg-green-100 text-green-700'
                : compliance.overallCompliancePercent >= 70
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
            }`}>
              패키지 {Math.round(compliance.overallCompliancePercent)}%
            </span>
          )}
          {/* Signal Counts */}
          <div className="flex items-center gap-2">
            {service.signalCounts.high > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                높음 {service.signalCounts.high}
              </span>
            )}
            {service.signalCounts.medium > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                보통 {service.signalCounts.medium}
              </span>
            )}
            {service.signalCounts.low > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                낮음 {service.signalCounts.low}
              </span>
            )}
          </div>
          {/* Pending Badge */}
          {service.pendingRequests > 0 && (
            <span className="px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
              대기 {service.pendingRequests}
            </span>
          )}
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {/* Package Compliance Detail */}
          {compliance && (
            <div className="pt-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">패키지 준수 현황</span>
                <span className={`ml-auto px-2 py-0.5 text-xs font-medium rounded-full ${
                  compliance.allRequirementsMet
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {compliance.totalCurrentAssets} / {compliance.totalMinAssets} Asset
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {compliance.requirements.map((req) => (
                  <div
                    key={req.type}
                    className={`p-2 rounded-lg text-center ${
                      req.isMet ? 'bg-green-50' : 'bg-amber-50'
                    }`}
                  >
                    <div className="text-xs text-gray-500 mb-1">{req.label}</div>
                    <div className={`text-sm font-bold ${req.isMet ? 'text-green-700' : 'text-amber-700'}`}>
                      {req.currentCount} / {req.minCount}
                    </div>
                    <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${req.isMet ? 'bg-green-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(req.compliancePercent, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{totalSignals}</div>
              <div className="text-xs text-gray-500">총 품질 신호</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">{service.pendingRequests}</div>
              <div className="text-xs text-gray-500">대기 중 요청</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {totalSignals > 0 ? Math.round(((totalSignals - service.signalCounts.high) / totalSignals) * 100) : 100}%
              </div>
              <div className="text-xs text-gray-500">양호 비율</div>
            </div>
          </div>
          <div className="mt-3 text-right">
            <Link
              to={`/admin/ai/asset-quality/${service.serviceId}`}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              상세 보기 →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// 개선 요청 카드
function ImprovementRequestCard({
  request,
  onUpdateStatus,
}: {
  request: ImprovementRequest;
  onUpdateStatus: (id: string, status: RequestStatus, note?: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [adminNote, setAdminNote] = useState(request.adminNote || '');
  const statusInfo = getStatusInfo(request.status);
  const severityInfo = getSeverityInfo(request.severity);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-start justify-between hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${severityInfo.color}`}>
              {severityInfo.label}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusInfo.color}`}>
              <StatusIcon className="w-3 h-3 inline mr-1" />
              {statusInfo.label}
            </span>
            <span className="text-xs text-gray-400">{request.serviceName}</span>
          </div>
          <div className="font-medium text-gray-900">{request.signalTitle}</div>
          <div className="text-sm text-gray-500 mt-1">{request.description}</div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-xs text-gray-400">{formatDate(request.createdAt)}</span>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="pt-4 space-y-4">
            {/* Operator Memo */}
            {request.operatorMemo && (
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-1">
                  <MessageSquare className="w-4 h-4" />
                  운영자 메모
                </div>
                <p className="text-sm text-blue-700">{request.operatorMemo}</p>
              </div>
            )}

            {/* Admin Note Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                관리자 노트
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="처리 내용이나 메모를 작성하세요..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={2}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                마지막 업데이트: {formatDate(request.updatedAt)}
              </div>
              <div className="flex items-center gap-2">
                {request.status === 'pending' && (
                  <>
                    <button
                      onClick={() => onUpdateStatus(request.id, 'acknowledged', adminNote)}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      확인
                    </button>
                    <button
                      onClick={() => onUpdateStatus(request.id, 'dismissed', adminNote)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      반려
                    </button>
                  </>
                )}
                {request.status === 'acknowledged' && (
                  <button
                    onClick={() => onUpdateStatus(request.id, 'in_progress', adminNote)}
                    className="px-3 py-1.5 bg-purple-100 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-200 transition-colors"
                  >
                    작업 시작
                  </button>
                )}
                {request.status === 'in_progress' && (
                  <button
                    onClick={() => onUpdateStatus(request.id, 'resolved', adminNote)}
                    className="px-3 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-lg hover:bg-green-200 transition-colors"
                  >
                    완료
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== 메인 컴포넌트 =====
export default function AssetQualityPage() {
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');
  const [requests, setRequests] = useState(mockImprovementRequests);

  const filteredRequests = requests.filter(
    (req) => statusFilter === 'all' || req.status === statusFilter
  );

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const inProgressCount = requests.filter((r) => r.status === 'in_progress').length;

  const handleUpdateStatus = (id: string, status: RequestStatus, note?: string) => {
    setRequests((prev) =>
      prev.map((req) =>
        req.id === id
          ? { ...req, status, adminNote: note, updatedAt: new Date().toISOString() }
          : req
      )
    );
    // TODO: API 호출로 상태 업데이트
    console.log('상태 업데이트:', { id, status, note });
  };

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
              className="py-4 px-1 border-b-2 border-primary-600 text-primary-600 font-medium text-sm"
            >
              품질 관리
            </Link>
            <Link
              to="/admin/ai/cost"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              비용 현황
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Context Asset 품질 관리</h1>
          <p className="text-gray-500 mt-1">
            서비스 운영자가 보고한 품질 신호를 확인하고 개선 작업을 관리합니다.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{pendingCount}</div>
                <div className="text-sm text-gray-500">대기 중</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{inProgressCount}</div>
                <div className="text-sm text-gray-500">진행 중</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {requests.filter((r) => r.status === 'resolved').length}
                </div>
                <div className="text-sm text-gray-500">완료</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{mockServiceSummaries.length}</div>
                <div className="text-sm text-gray-500">서비스</div>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Service Summaries */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-400" />
                서비스별 품질 현황
              </h2>
            </div>
            <div className="space-y-3">
              {mockServiceSummaries.map((service) => (
                <ServiceSummaryCard key={service.serviceId} service={service} />
              ))}
            </div>
          </div>

          {/* Improvement Requests */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                개선 요청 목록
              </h2>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as RequestStatus | 'all')}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">전체</option>
                  <option value="pending">대기 중</option>
                  <option value="acknowledged">확인됨</option>
                  <option value="in_progress">진행 중</option>
                  <option value="resolved">완료</option>
                  <option value="dismissed">반려</option>
                </select>
              </div>
            </div>
            <div className="space-y-3">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((request) => (
                  <ImprovementRequestCard
                    key={request.id}
                    request={request}
                    onUpdateStatus={handleUpdateStatus}
                  />
                ))
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
                  해당 조건의 요청이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Package Standards Reference */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-400" />
              서비스별 권장 패키지
            </h2>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Info className="w-3.5 h-3.5" />
              <span>권장 기준 (강제 아님)</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {AI_ASSET_PACKAGE_STANDARDS.map((pkg) => {
              const serviceSummary = mockServiceSummaries.find((s) => s.serviceId === pkg.serviceSlug);
              const compliance = serviceSummary
                ? calculatePackageCompliance(pkg.serviceSlug, serviceSummary.currentAssets)
                : null;

              return (
                <div key={pkg.serviceSlug} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{pkg.serviceName}</span>
                    {compliance && (
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        compliance.allRequirementsMet
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {Math.round(compliance.overallCompliancePercent)}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{pkg.description}</p>
                  <div className="space-y-1.5">
                    {pkg.requirements.map((req) => {
                      const currentCount = serviceSummary?.currentAssets[req.type] || 0;
                      const isMet = currentCount >= req.minCount;
                      return (
                        <div key={req.type} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">{req.label}</span>
                          <span className={`font-medium ${isMet ? 'text-green-600' : 'text-amber-600'}`}>
                            {currentCount} / {req.minCount}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500">총 권장</span>
                    <span className="text-sm font-bold text-gray-700">{pkg.totalMinAssets}개</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>품질 개선 루프</strong>: 서비스 운영자가 리포트에서 "개선 요청"을 클릭하면 이 페이지에 표시됩니다.
            요청을 처리하고 Context Asset을 개선하면, 운영자는 다음 리포트에서 개선 효과를 확인할 수 있습니다.
          </div>
        </div>
      </main>
    </div>
  );
}
