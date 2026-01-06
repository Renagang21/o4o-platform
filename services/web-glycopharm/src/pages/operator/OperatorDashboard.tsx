/**
 * Operator Cockpit (WO-GP-OPERATOR-COCKPIT-V1)
 *
 * GlycoPharm 운영자 조종석
 * - 통계가 아닌 "현재 상태"를 보여주는 관제 화면
 * - 각 블록에서 바로 관리 UI로 점프 가능
 * - 숫자 + 상태 아이콘 + 점프 링크
 * - 그래프 없음, 상세 리스트 없음
 */

import { Link } from 'react-router-dom';
import {
  Activity,
  Building2,
  ShoppingBag,
  Monitor,
  Tablet,
  Smartphone,
  Image,
  Star,
  Bell,
  Beaker,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  FileText,
  ArrowUpRight,
} from 'lucide-react';

// ===== Mock Data =====
// 실제로는 API에서 가져옴

const SERVICE_STATUS = {
  activePharmacies: 2450,
  approvedStores: 187,
  warnings: 3,
  lastUpdated: '2024-01-15T14:30:00',
};

const STORE_STATUS = {
  pendingApprovals: 4,
  supplementRequests: 2,
  activeStores: 187,
  inactiveStores: 12,
};

const CHANNEL_STATUS = {
  web: { active: 156, pending: 8, inactive: 23 },
  kiosk: { active: 45, pending: 3, inactive: 12 },
  tablet: { active: 89, pending: 5, inactive: 15 },
};

const CONTENT_STATUS = {
  hero: { total: 8, active: 3 },
  featured: { total: 24, operatorPicked: 6 },
  eventNotice: { total: 15, active: 8 },
};

const TRIAL_STATUS = {
  activeTrials: 5,
  connectedPharmacies: 234,
  pendingConnections: 12,
};

const FORUM_STATUS = {
  open: 12,
  readonly: 3,
  closed: 5,
  totalPosts: 1245,
};

// ===== Status Badge Component =====
function StatusBadge({
  status,
  count,
}: {
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  count?: number;
}) {
  const colors = {
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    neutral: 'bg-slate-100 text-slate-600',
  };

  const icons = {
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle,
    info: Clock,
    neutral: Activity,
  };

  const Icon = icons[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}
    >
      <Icon className="w-3 h-3" />
      {count !== undefined && count}
    </span>
  );
}

// ===== Stat Item Component =====
function StatItem({
  label,
  value,
  subValue,
  status,
}: {
  label: string;
  value: number | string;
  subValue?: string;
  status?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-800">{value}</span>
        {subValue && <span className="text-xs text-slate-400">{subValue}</span>}
        {status && <StatusBadge status={status} />}
      </div>
    </div>
  );
}

// ===== Cockpit Block Component =====
function CockpitBlock({
  title,
  icon: Icon,
  iconColor,
  children,
  jumpTo,
  jumpLabel,
  alert,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
  jumpTo?: string;
  jumpLabel?: string;
  alert?: { type: 'warning' | 'error'; message: string };
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${iconColor} flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <h2 className="font-semibold text-slate-800">{title}</h2>
        </div>
        {jumpTo && (
          <Link
            to={jumpTo}
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 transition-colors"
          >
            {jumpLabel || '관리'}
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Alert (if any) */}
      {alert && (
        <div
          className={`px-4 py-2 text-sm flex items-center gap-2 ${
            alert.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          {alert.message}
        </div>
      )}

      {/* Content */}
      <div className="p-4">{children}</div>
    </div>
  );
}

// ===== Main Component =====
export default function OperatorDashboard() {
  const hasWarnings = SERVICE_STATUS.warnings > 0;
  const hasPendingApprovals = STORE_STATUS.pendingApprovals > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">운영자 Cockpit</h1>
          <p className="text-slate-500 text-sm">GlycoPharm 서비스 현황 관제</p>
        </div>
        <div className="text-xs text-slate-400">
          마지막 업데이트: {new Date(SERVICE_STATUS.lastUpdated).toLocaleString('ko-KR')}
        </div>
      </div>

      {/* Block 1: Service Status Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-6 h-6" />
          <h2 className="text-lg font-semibold">서비스 상태</h2>
          {hasWarnings && (
            <StatusBadge status="warning" count={SERVICE_STATUS.warnings} />
          )}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-3xl font-bold">{SERVICE_STATUS.activePharmacies.toLocaleString()}</p>
            <p className="text-primary-200 text-sm">활성 약국</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{SERVICE_STATUS.approvedStores}</p>
            <p className="text-primary-200 text-sm">승인된 스토어</p>
          </div>
          <div>
            <p className="text-3xl font-bold flex items-center gap-2">
              {SERVICE_STATUS.warnings}
              {hasWarnings && <AlertTriangle className="w-5 h-5 text-amber-300" />}
            </p>
            <p className="text-primary-200 text-sm">주의 항목</p>
          </div>
        </div>
      </div>

      {/* Grid: Blocks 2-6 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Block 2: Store Status */}
        <CockpitBlock
          title="스토어 상태"
          icon={ShoppingBag}
          iconColor="bg-emerald-500"
          jumpTo="/operator/store-approvals"
          jumpLabel="승인 관리"
          alert={
            hasPendingApprovals
              ? { type: 'warning', message: `승인 대기 ${STORE_STATUS.pendingApprovals}건` }
              : undefined
          }
        >
          <div className="space-y-1">
            <StatItem label="승인 대기" value={STORE_STATUS.pendingApprovals} status={hasPendingApprovals ? 'warning' : 'success'} />
            <StatItem label="보완 요청" value={STORE_STATUS.supplementRequests} status={STORE_STATUS.supplementRequests > 0 ? 'info' : 'neutral'} />
            <StatItem label="운영 중" value={STORE_STATUS.activeStores} />
            <StatItem label="비활성" value={STORE_STATUS.inactiveStores} />
          </div>
        </CockpitBlock>

        {/* Block 3: Channel Status */}
        <CockpitBlock
          title="채널 상태"
          icon={Monitor}
          iconColor="bg-blue-500"
        >
          <div className="space-y-3">
            {/* Web */}
            <div className="flex items-center gap-3">
              <Monitor className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600 w-12">Web</span>
              <div className="flex-1 flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                  {CHANNEL_STATUS.web.active} 활성
                </span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                  {CHANNEL_STATUS.web.pending} 대기
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                  {CHANNEL_STATUS.web.inactive} 비활성
                </span>
              </div>
            </div>
            {/* Kiosk */}
            <div className="flex items-center gap-3">
              <Tablet className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600 w-12">Kiosk</span>
              <div className="flex-1 flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                  {CHANNEL_STATUS.kiosk.active} 활성
                </span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                  {CHANNEL_STATUS.kiosk.pending} 대기
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                  {CHANNEL_STATUS.kiosk.inactive} 비활성
                </span>
              </div>
            </div>
            {/* Tablet */}
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600 w-12">Tablet</span>
              <div className="flex-1 flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                  {CHANNEL_STATUS.tablet.active} 활성
                </span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                  {CHANNEL_STATUS.tablet.pending} 대기
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                  {CHANNEL_STATUS.tablet.inactive} 비활성
                </span>
              </div>
            </div>
          </div>
        </CockpitBlock>

        {/* Block 4: Content Status */}
        <CockpitBlock
          title="콘텐츠 상태"
          icon={FileText}
          iconColor="bg-violet-500"
          jumpTo="/operator/store-template"
          jumpLabel="템플릿 관리"
        >
          <div className="space-y-3">
            {/* Hero */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">Hero</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                  {CONTENT_STATUS.hero.active} 활성
                </span>
                <span className="text-slate-400">/ {CONTENT_STATUS.hero.total}</span>
              </div>
            </div>
            {/* Featured */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">Featured</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                  {CONTENT_STATUS.featured.operatorPicked} 운영자 지정
                </span>
                <span className="text-slate-400">/ {CONTENT_STATUS.featured.total}</span>
              </div>
            </div>
            {/* Event/Notice */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">이벤트/공지</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                  {CONTENT_STATUS.eventNotice.active} 활성
                </span>
                <span className="text-slate-400">/ {CONTENT_STATUS.eventNotice.total}</span>
              </div>
            </div>
          </div>
        </CockpitBlock>

        {/* Block 5: Market Trial Status */}
        <CockpitBlock
          title="Market Trial"
          icon={Beaker}
          iconColor="bg-amber-500"
          jumpTo="/operator/market-trial"
          jumpLabel="Trial 관리"
        >
          <div className="space-y-1">
            <StatItem label="진행 중 Trial" value={TRIAL_STATUS.activeTrials} />
            <StatItem label="연결된 약국" value={TRIAL_STATUS.connectedPharmacies} />
            <StatItem
              label="연결 대기"
              value={TRIAL_STATUS.pendingConnections}
              status={TRIAL_STATUS.pendingConnections > 0 ? 'info' : 'neutral'}
            />
          </div>
        </CockpitBlock>

        {/* Block 6: Forum Status */}
        <CockpitBlock
          title="포럼 상태"
          icon={MessageSquare}
          iconColor="bg-rose-500"
          jumpTo="/operator/forum-management"
          jumpLabel="포럼 관리"
        >
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <p className="text-lg font-bold text-green-700">{FORUM_STATUS.open}</p>
              <p className="text-xs text-green-600">공개</p>
            </div>
            <div className="text-center p-2 bg-amber-50 rounded-lg">
              <p className="text-lg font-bold text-amber-700">{FORUM_STATUS.readonly}</p>
              <p className="text-xs text-amber-600">읽기전용</p>
            </div>
            <div className="text-center p-2 bg-slate-50 rounded-lg">
              <p className="text-lg font-bold text-slate-600">{FORUM_STATUS.closed}</p>
              <p className="text-xs text-slate-500">비공개</p>
            </div>
          </div>
          <div className="text-center text-sm text-slate-500">
            총 {FORUM_STATUS.totalPosts.toLocaleString()}개 게시물
          </div>
        </CockpitBlock>

        {/* Quick Jump Block */}
        <CockpitBlock
          title="빠른 이동"
          icon={ArrowUpRight}
          iconColor="bg-slate-500"
        >
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/operator/applications"
              className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg hover:bg-primary-50 hover:text-primary-700 transition-colors text-sm"
            >
              <Building2 className="w-4 h-4" />
              신청서 관리
            </Link>
            <Link
              to="/operator/forum-requests"
              className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg hover:bg-primary-50 hover:text-primary-700 transition-colors text-sm"
            >
              <FileText className="w-4 h-4" />
              포럼 요청
            </Link>
            <Link
              to="/operator/store-template"
              className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg hover:bg-primary-50 hover:text-primary-700 transition-colors text-sm"
            >
              <Image className="w-4 h-4" />
              템플릿 관리
            </Link>
            <Link
              to="/operator/store-approvals"
              className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg hover:bg-primary-50 hover:text-primary-700 transition-colors text-sm"
            >
              <CheckCircle className="w-4 h-4" />
              스토어 승인
            </Link>
          </div>
        </CockpitBlock>
      </div>
    </div>
  );
}
