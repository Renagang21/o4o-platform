/**
 * PharmacyDashboard - Cockpit 구조
 *
 * 약국 대시보드는 약국이 프랜차이즈 서비스를
 * 자신의 사업에 맞게 조합·활용·운영하는 조종석이다.
 *
 * 5개 블록:
 * 1. 약국 상태 헤더 (항상 최상단)
 * 2. 오늘의 운영 액션 (Cockpit Core)
 * 3. 프랜차이즈 서비스 활용 현황 (정체성 핵심)
 * 4. 나의 콘텐츠 작업 공간 (Content Workspace)
 * 5. 즉시 이동 (Quick Control)
 */

import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Store,
  ShoppingCart,
  Package,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Tv,
  FlaskConical,
  MessageSquare,
  Bookmark,
  Video,
  File,
  Link as LinkIcon,
  ArrowRight,
  ExternalLink,
  Settings,
  Eye,
  Loader2,
  Bell,
  Globe,
  Monitor,
  Tablet,
  Inbox,
  LogIn,
  ArrowLeft,
  Users,
  Activity,
  Heart,
} from 'lucide-react';
import { AiSummaryButton } from '@/components/ai';
import {
  pharmacyApi,
  type PharmacyStatus,
  type TodayActions,
  type FranchiseServices,
  type ContentWorkspace,
  type CareDashboardSummary,
} from '@/api/pharmacy';

// 스토어 상태 설정
const STORE_STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof Clock; bgColor: string; textColor: string }
> = {
  pending: { label: '신청 전', icon: Clock, bgColor: 'bg-slate-100', textColor: 'text-slate-600' },
  preparing: { label: '준비 중', icon: Clock, bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  active: { label: '판매 중', icon: CheckCircle, bgColor: 'bg-green-100', textColor: 'text-green-700' },
  suspended: { label: '일시 중단', icon: XCircle, bgColor: 'bg-red-100', textColor: 'text-red-700' },
};

// 신청 상태 설정
const APPLICATION_STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof Clock; bgColor: string; textColor: string }
> = {
  none: { label: '미신청', icon: Clock, bgColor: 'bg-slate-100', textColor: 'text-slate-600' },
  draft: { label: '작성 중', icon: FileText, bgColor: 'bg-slate-100', textColor: 'text-slate-600' },
  submitted: { label: '심사 대기', icon: Clock, bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  reviewing: { label: '심사 중', icon: Clock, bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  supplementing: { label: '보완 요청', icon: AlertTriangle, bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
  approved: { label: '승인됨', icon: CheckCircle, bgColor: 'bg-green-100', textColor: 'text-green-700' },
  rejected: { label: '반려됨', icon: XCircle, bgColor: 'bg-red-100', textColor: 'text-red-700' },
};

// 법정 정보 상태 설정
const LEGAL_STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof CheckCircle; bgColor: string; textColor: string }
> = {
  complete: { label: '정상', icon: CheckCircle, bgColor: 'bg-green-100', textColor: 'text-green-700' },
  incomplete: { label: '미완료', icon: AlertCircle, bgColor: 'bg-red-100', textColor: 'text-red-700' },
  needs_update: { label: '보완 필요', icon: AlertTriangle, bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
};

export default function PharmacyDashboard() {
  const navigate = useNavigate();
  const [pharmacyStatus, setPharmacyStatus] = useState<PharmacyStatus | null>(null);
  const [todayActions, setTodayActions] = useState<TodayActions | null>(null);
  const [franchiseServices, setFranchiseServices] = useState<FranchiseServices | null>(null);
  const [contentWorkspace, setContentWorkspace] = useState<ContentWorkspace | null>(null);
  const [careSummary, setCareSummary] = useState<CareDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresLogin, setRequiresLogin] = useState(false);

  useEffect(() => {
    const loadCockpitData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [statusRes, actionsRes, servicesRes, workspaceRes] = await Promise.all([
          pharmacyApi.getPharmacyStatus(),
          pharmacyApi.getTodayActions(),
          pharmacyApi.getFranchiseServices(),
          pharmacyApi.getContentWorkspace(),
        ]);

        if (statusRes.success && statusRes.data) {
          setPharmacyStatus(statusRes.data);
        }
        if (actionsRes.success && actionsRes.data) {
          setTodayActions(actionsRes.data);
        }
        if (servicesRes.success && servicesRes.data) {
          setFranchiseServices(servicesRes.data);
        }
        if (workspaceRes.success && workspaceRes.data) {
          setContentWorkspace(workspaceRes.data);
        }

        // Care summary — non-blocking, fail-silent
        pharmacyApi.getCareDashboardSummary()
          .then((data) => setCareSummary(data))
          .catch(() => { /* Care data unavailable — skip silently */ });
      } catch (err: any) {
        console.error('Cockpit load error:', err);
        // 401 에러 시 로그인 필요 상태로 설정
        if (err.status === 401) {
          setRequiresLogin(true);
        } else {
          // err.message가 객체일 수 있으므로 문자열로 변환
          const errorMessage = typeof err.message === 'string'
            ? err.message
            : (err.message?.message || '데이터를 불러오는데 실패했습니다.');
          setError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    loadCockpitData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (requiresLogin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-sm">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">로그인이 필요합니다</h2>
          <p className="text-slate-500 mb-6">
            약국 대시보드를 이용하시려면 먼저 로그인해 주세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              이전 화면으로
            </button>
            <NavLink
              to="/login"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
            >
              <LogIn className="w-5 h-5" />
              로그인하기
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">오류가 발생했습니다</h2>
        <p className="text-slate-500">{error}</p>
      </div>
    );
  }

  const storeConfig = STORE_STATUS_CONFIG[pharmacyStatus?.storeStatus || 'pending'];
  const appConfig = APPLICATION_STATUS_CONFIG[pharmacyStatus?.applicationStatus || 'none'];
  const legalConfig = LEGAL_STATUS_CONFIG[pharmacyStatus?.legalInfoStatus || 'incomplete'];
  const StoreIcon = storeConfig.icon;
  const AppIcon = appConfig.icon;
  const LegalIcon = legalConfig.icon;

  return (
    <div className="space-y-6">
      {/* ========================================= */}
      {/* Block 1: 약국 상태 헤더 (항상 최상단) */}
      {/* ========================================= */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* 약국명 & 스토어 링크 */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center">
              <Store className="w-7 h-7 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {pharmacyStatus?.pharmacyName || '내 약국'}
              </h1>
              {pharmacyStatus?.storeSlug && pharmacyStatus.storeStatus === 'active' && (
                <a
                  href={`/store/${pharmacyStatus.storeSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  내 스토어 보기
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="ml-4">
              <AiSummaryButton contextLabel="약국 운영 현황" />
            </div>
          </div>

          {/* 상태 배지들 */}
          <div className="flex flex-wrap items-center gap-3">
            {/* 스토어 상태 */}
            <NavLink
              to={pharmacyStatus?.applicationStatus === 'approved' ? '/pharmacy/settings' : '/pharmacy/store-apply'}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl ${storeConfig.bgColor} ${storeConfig.textColor} hover:opacity-80 transition-opacity`}
            >
              <StoreIcon className="w-4 h-4" />
              <span className="text-sm font-medium">스토어: {storeConfig.label}</span>
            </NavLink>

            {/* 판매 승인 상태 */}
            <NavLink
              to="/pharmacy/store-apply"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl ${appConfig.bgColor} ${appConfig.textColor} hover:opacity-80 transition-opacity`}
            >
              <AppIcon className="w-4 h-4" />
              <span className="text-sm font-medium">승인: {appConfig.label}</span>
            </NavLink>

            {/* 법정 정보 상태 */}
            <NavLink
              to="/pharmacy/store-apply"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl ${legalConfig.bgColor} ${legalConfig.textColor} hover:opacity-80 transition-opacity`}
            >
              <LegalIcon className="w-4 h-4" />
              <span className="text-sm font-medium">법정정보: {legalConfig.label}</span>
            </NavLink>
          </div>
        </div>

        {/* 주문 채널 상태 */}
        {pharmacyStatus?.orderChannelStatus && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-slate-600">주문 접수 채널</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Web 채널 (항상 ON) */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg">
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium">웹</span>
                <span className="text-xs">ON</span>
              </div>

              {/* Kiosk 채널 */}
              <NavLink
                to="/pharmacy/settings?tab=devices"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                  pharmacyStatus.orderChannelStatus.kiosk === 'approved'
                    ? 'bg-green-100 text-green-700'
                    : pharmacyStatus.orderChannelStatus.kiosk === 'requested'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-500'
                } hover:opacity-80 transition-opacity`}
              >
                <Monitor className="w-4 h-4" />
                <span className="text-sm font-medium">키오스크</span>
                <span className="text-xs">
                  {pharmacyStatus.orderChannelStatus.kiosk === 'approved'
                    ? 'ON'
                    : pharmacyStatus.orderChannelStatus.kiosk === 'requested'
                    ? '대기'
                    : 'OFF'}
                </span>
              </NavLink>

              {/* Tablet 채널 */}
              <NavLink
                to="/pharmacy/settings?tab=devices"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                  pharmacyStatus.orderChannelStatus.tablet === 'approved'
                    ? 'bg-green-100 text-green-700'
                    : pharmacyStatus.orderChannelStatus.tablet === 'requested'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-500'
                } hover:opacity-80 transition-opacity`}
              >
                <Tablet className="w-4 h-4" />
                <span className="text-sm font-medium">태블릿</span>
                <span className="text-xs">
                  {pharmacyStatus.orderChannelStatus.tablet === 'approved'
                    ? 'ON'
                    : pharmacyStatus.orderChannelStatus.tablet === 'requested'
                    ? '대기'
                    : 'OFF'}
                </span>
              </NavLink>
            </div>
          </div>
        )}

        {/* 보완 필요 알림 */}
        {pharmacyStatus?.legalInfoIssues && pharmacyStatus.legalInfoIssues.length > 0 && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-800">법정 정보 보완이 필요합니다</p>
                <ul className="mt-1 text-sm text-orange-700 list-disc list-inside">
                  {pharmacyStatus.legalInfoIssues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================= */}
      {/* Block 2: 오늘의 운영 액션 (Cockpit Core) */}
      {/* ========================================= */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">오늘의 운영</h2>
        {/* UX Trust Rules v1: 카드 배경 white, 아이콘 gray-500, border로 구분 */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {/* 오늘 주문 */}
          <NavLink
            to="/pharmacy/orders?filter=today"
            className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <ShoppingCart className="w-6 h-6 text-slate-500" />
              {(todayActions?.todayOrders || 0) > 0 && (
                <span className="w-6 h-6 bg-primary-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {todayActions?.todayOrders}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-slate-800">{todayActions?.todayOrders || 0}</p>
            <p className="text-sm text-slate-500">오늘 주문</p>
          </NavLink>

          {/* 접수 대기 (NEW - RECEIVED 처리 필요) */}
          <NavLink
            to="/pharmacy/orders?status=pending"
            className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <Inbox className="w-6 h-6 text-slate-500" />
              {(todayActions?.pendingReceiveOrders || 0) > 0 && (
                <span className="w-6 h-6 bg-primary-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {todayActions?.pendingReceiveOrders}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-slate-800">{todayActions?.pendingReceiveOrders || 0}</p>
            <p className="text-sm text-slate-500">접수 대기</p>
          </NavLink>

          {/* 처리 대기 */}
          <NavLink
            to="/pharmacy/orders?status=received"
            className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-6 h-6 text-slate-500" />
              {(todayActions?.pendingOrders || 0) > 0 && (
                <span className="w-6 h-6 bg-primary-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {todayActions?.pendingOrders}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-slate-800">{todayActions?.pendingOrders || 0}</p>
            <p className="text-sm text-slate-500">처리 대기</p>
          </NavLink>

          {/* 운영자 공지 */}
          <NavLink
            to="/pharmacy/notices"
            className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <Bell className="w-6 h-6 text-slate-500" />
              {(todayActions?.operatorNotices || 0) > 0 && (
                <span className="w-6 h-6 bg-primary-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {todayActions?.operatorNotices}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-slate-800">{todayActions?.operatorNotices || 0}</p>
            <p className="text-sm text-slate-500">운영자 공지</p>
          </NavLink>

          {/* 신청 알림 */}
          <NavLink
            to="/pharmacy/store-apply"
            className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-6 h-6 text-slate-500" />
              {(todayActions?.applicationAlerts || 0) > 0 && (
                <span className="w-6 h-6 bg-primary-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {todayActions?.applicationAlerts}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-slate-800">{todayActions?.applicationAlerts || 0}</p>
            <p className="text-sm text-slate-500">신청 알림</p>
          </NavLink>

          {/* 고객 요청 (Phase 1: Common Request) */}
          <NavLink
            to="/pharmacy/requests"
            className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <Users className="w-6 h-6 text-slate-500" />
              {(todayActions?.pendingRequests || 0) > 0 && (
                <span className="w-6 h-6 bg-primary-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {todayActions?.pendingRequests}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-slate-800">{todayActions?.pendingRequests || 0}</p>
            <p className="text-sm text-slate-500">고객 요청</p>
          </NavLink>
        </div>
      </div>

      {/* ========================================= */}
      {/* Block 3: 프랜차이즈 서비스 활용 현황 */}
      {/* ========================================= */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">프랜차이즈 서비스</h2>
        {/* UX Trust Rules v1: 아이콘 gray-500, 상태 뱃지 neutral */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* 디지털 사이니지 */}
          <NavLink
            to="/pharmacy/signage/my"
            className="p-5 border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                <Tv className="w-6 h-6 text-slate-500" />
              </div>
              {franchiseServices?.signage.enabled ? (
                <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                  사용 중
                </span>
              ) : (
                <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">
                  미사용
                </span>
              )}
            </div>
            <h3 className="font-semibold text-slate-800 group-hover:text-primary-600 transition-colors">
              디지털 사이니지
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {franchiseServices?.signage.enabled
                ? `${franchiseServices.signage.activeContents}개 콘텐츠 방영 중`
                : 'TV 홍보 영상 관리'}
            </p>
            <div className="mt-3 flex items-center text-sm text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
              바로가기 <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </NavLink>

          {/* Market Trial */}
          <NavLink
            to="/pharmacy/market-trial"
            className="p-5 border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                <FlaskConical className="w-6 h-6 text-slate-500" />
              </div>
              {franchiseServices?.marketTrial.enabled ? (
                <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                  참여 중
                </span>
              ) : (
                <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">
                  미참여
                </span>
              )}
            </div>
            <h3 className="font-semibold text-slate-800 group-hover:text-primary-600 transition-colors">
              Market Trial
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {franchiseServices?.marketTrial.enabled
                ? `${franchiseServices.marketTrial.activeTrials}개 Trial 참여 중`
                : '신제품 테스트 프로그램'}
            </p>
            <div className="mt-3 flex items-center text-sm text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
              바로가기 <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </NavLink>

          {/* 포럼 */}
          <NavLink
            to="/forum-ext"
            className="p-5 border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-slate-500" />
              </div>
              {franchiseServices?.forum.enabled ? (
                <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                  활동 중
                </span>
              ) : (
                <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">
                  미활동
                </span>
              )}
            </div>
            <h3 className="font-semibold text-slate-800 group-hover:text-primary-600 transition-colors">
              포럼
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {franchiseServices?.forum.enabled
                ? `개설 ${franchiseServices.forum.ownedForums}개 · 참여 ${franchiseServices.forum.joinedForums}개`
                : '약사 커뮤니티 참여'}
            </p>
            <div className="mt-3 flex items-center text-sm text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
              바로가기 <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </NavLink>
        </div>
      </div>

      {/* ========================================= */}
      {/* Block 4: 나의 콘텐츠 작업 공간 */}
      {/* ========================================= */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">나의 콘텐츠</h2>
          <NavLink
            to="/pharmacy/signage/library"
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            전체보기 <ArrowRight className="w-4 h-4" />
          </NavLink>
        </div>

        {/* UX Trust Rules v1: 콘텐츠 타입 아이콘 gray-500 */}
        {contentWorkspace && contentWorkspace.recentContents.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {contentWorkspace.recentContents.slice(0, 4).map((content) => (
              <div
                key={content.id}
                className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  {content.type === 'video' && <Video className="w-5 h-5 text-slate-500" />}
                  {content.type === 'document' && <File className="w-5 h-5 text-slate-500" />}
                  {content.type === 'link' && <LinkIcon className="w-5 h-5 text-slate-500" />}
                  <span className="text-xs text-slate-400">{content.source}</span>
                </div>
                <p className="text-sm font-medium text-slate-800 line-clamp-2">{content.title}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-xl">
            <Bookmark className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 mb-3">저장된 콘텐츠가 없습니다</p>
            <NavLink
              to="/pharmacy/signage/library"
              className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
            >
              콘텐츠 라이브러리 둘러보기 <ArrowRight className="w-4 h-4" />
            </NavLink>
          </div>
        )}

        {/* 콘텐츠 활용 버튼 - UX Trust Rules v1: 중립 색상 */}
        {contentWorkspace && contentWorkspace.savedContents > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
            <NavLink
              to="/pharmacy/signage/my"
              className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              사이니지로 보내기
            </NavLink>
            <NavLink
              to="/forum-ext"
              className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              포럼에 공유하기
            </NavLink>
          </div>
        )}
      </div>

      {/* ========================================= */}
      {/* Block 5: Care 환자 관리 요약 (GlucoseView 연동) */}
      {/* ========================================= */}
      {careSummary && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Care 환자 관리</h2>
            <a
              href={`${import.meta.env.VITE_GLUCOSEVIEW_URL || 'https://glucoseview.neture.co.kr'}/care/dashboard`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              상세 보기 <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-2xl font-bold text-slate-800">{careSummary.totalPatients}</p>
              <p className="text-sm text-slate-500">관리 환자</p>
            </div>
            <div className="p-4 bg-white border border-red-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-2xl font-bold text-red-600">{careSummary.highRiskCount}</p>
              <p className="text-sm text-red-500">고위험 환자</p>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-2xl font-bold text-slate-800">{careSummary.recentCoachingCount}</p>
              <p className="text-sm text-slate-500">최근 7일 상담</p>
            </div>
            <div className="p-4 bg-white border border-green-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <Heart className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600">{careSummary.improvingCount}</p>
              <p className="text-sm text-green-600">개선 환자</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* Block 6: 즉시 이동 (Quick Control) */}
      {/* ========================================= */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">빠른 이동</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <NavLink
            to={pharmacyStatus?.storeSlug ? `/store/${pharmacyStatus.storeSlug}` : '#'}
            target="_blank"
            className="p-4 bg-slate-50 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-colors text-center group"
          >
            <Eye className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
            <span className="text-sm font-medium">내 스토어 보기</span>
          </NavLink>
          <NavLink
            to="/pharmacy/products"
            className="p-4 bg-slate-50 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-colors text-center group"
          >
            <Package className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
            <span className="text-sm font-medium">상품/가격 관리</span>
          </NavLink>
          <NavLink
            to="/pharmacy/orders"
            className="p-4 bg-slate-50 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-colors text-center group"
          >
            <ShoppingCart className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
            <span className="text-sm font-medium">주문 관리</span>
          </NavLink>
          <NavLink
            to="/pharmacy/store-apply"
            className="p-4 bg-slate-50 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-colors text-center group"
          >
            <FileText className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
            <span className="text-sm font-medium">법정 정보 관리</span>
          </NavLink>
          <NavLink
            to="/pharmacy/settings"
            className="p-4 bg-slate-50 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-colors text-center group"
          >
            <Settings className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
            <span className="text-sm font-medium">매장 설정</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
}
