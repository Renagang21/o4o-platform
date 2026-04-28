/**
 * MyPageHub - 마이페이지 활동 허브
 *
 * WO-O4O-NETURE-MYPAGE-SPLIT-V1
 * WO-MYPAGE-IA-RESTRUCTURE-V1
 *
 * 프로필 카드 중심 → 공급자 활동 허브로 전환.
 * 프로필 정보는 /mypage/profile에 집중, 여기서는 컴팩트 인사 + Quick Actions.
 */

import { useNavigate } from 'react-router-dom';
import {
  User,
  UserCog,
  Settings,
  ChevronRight,
  Plus,
  Package,
  ShoppingCart,
  FlaskConical,
  DollarSign,
  ArrowRight,
  BarChart3,
  Users,
} from 'lucide-react';
import { useAuth, getNetureDashboardRoute, getNetureRoleLabel } from '../../contexts';
import { useLoginModal } from '../../contexts/LoginModalContext';
import { MyPageLayout, QuickActionsSection } from '@o4o/account-ui';
import { Link } from 'react-router-dom';

// ─── Quick Action 정의 ─────────────────────────────────────────────────────

interface QuickAction {
  label: string;
  path: string;
  icon: typeof Package;
  color: string;
}

const SUPPLIER_ACTIONS: QuickAction[] = [
  { label: '상품 등록', path: '/supplier/products/new', icon: Plus, color: '#3b82f6' },
  { label: '상품 관리', path: '/supplier/products', icon: Package, color: '#6366f1' },
  { label: '주문 관리', path: '/supplier/orders', icon: ShoppingCart, color: '#0891b2' },
  { label: 'Market Trial', path: '/supplier/market-trial', icon: FlaskConical, color: '#8b5cf6' },
  { label: '정산 관리', path: '/account/supplier/settlements', icon: DollarSign, color: '#d97706' },
];

const PARTNER_ACTIONS: QuickAction[] = [
  { label: '파트너 대시보드', path: '/partner/dashboard', icon: BarChart3, color: '#3b82f6' },
  { label: '커미션 관리', path: '/supplier/partner-commissions', icon: DollarSign, color: '#059669' },
  { label: '콘텐츠 라이브러리', path: '/supplier/library', icon: Package, color: '#6366f1' },
  { label: '커뮤니티', path: '/supplier/forum', icon: Users, color: '#8b5cf6' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function MyPageHub() {
  const { user, isAuthenticated, logout } = useAuth();
  const { openLoginModal } = useLoginModal();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">로그인이 필요합니다</h1>
          <p className="text-sm text-gray-500 mb-6">마이페이지를 이용하려면 로그인해주세요.</p>
          <button
            onClick={() => openLoginModal('/mypage')}
            className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            로그인
          </button>
        </div>
      </div>
    );
  }

  const dashboardPath = getNetureDashboardRoute(user.roles);
  const roleLabel = getNetureRoleLabel(user.roles);
  // dashboardPath가 '/'이면 대시보드 대상 역할이 없음
  const hasDashboard = dashboardPath !== '/';

  const isSupplier = user.roles.some(
    (r: string) => r === 'neture:supplier' || r === 'supplier',
  );
  const isPartner = user.roles.some(
    (r: string) => r === 'neture:partner' || r === 'partner',
  );

  const quickActions = isSupplier
    ? SUPPLIER_ACTIONS
    : isPartner
      ? PARTNER_ACTIONS
      : [];

  const handleLogout = async () => {
    await logout();
    navigate('/workspace');
  };

  return (
    <MyPageLayout title="마이페이지" subtitle="주요 작업을 빠르게 시작하세요">
      {/* Compact Greeting Bar */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-base font-bold text-primary-700">
                {user.name?.charAt(0) || '?'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user.name}님, 안녕하세요
              </p>
              <span className="inline-block mt-0.5 px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs font-medium">
                {roleLabel}
              </span>
            </div>
          </div>
          <Link
            to="/mypage/profile"
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap flex-shrink-0"
          >
            프로필 보기
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Role-based Quick Actions */}
      {quickActions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">주요 작업</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.path}
                  to={action.path}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: action.color }}
                  >
                    <Icon size={16} color="#fff" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 flex-1 truncate">
                    {action.label}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link
          to="/mypage/profile"
          className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
        >
          <UserCog className="w-5 h-5 text-primary-500" />
          <span className="text-sm font-medium text-gray-700 flex-1">프로필 편집</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Link>
        <Link
          to="/mypage/settings"
          className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
        >
          <Settings className="w-5 h-5 text-primary-500" />
          <span className="text-sm font-medium text-gray-700 flex-1">설정</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Link>
      </div>

      {/* Quick Actions (Dashboard + Logout) */}
      <QuickActionsSection
        dashboardPath={dashboardPath}
        dashboardLabel={`${roleLabel} 대시보드`}
        showDashboard={hasDashboard}
        onLogout={handleLogout}
      />
    </MyPageLayout>
  );
}
