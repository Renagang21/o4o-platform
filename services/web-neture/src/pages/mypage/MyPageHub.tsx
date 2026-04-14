/**
 * MyPageHub - 마이페이지 허브 (읽기 전용 요약 + 빠른 이동)
 *
 * WO-O4O-NETURE-MYPAGE-SPLIT-V1
 */

import { useNavigate } from 'react-router-dom';
import { User, Mail, Shield, UserCog, Settings, ChevronRight } from 'lucide-react';
import { useAuth, ROLE_LABELS, getNetureDashboardRoute } from '../../contexts';
import { useLoginModal } from '../../contexts/LoginModalContext';
import { MyPageLayout, QuickActionsSection } from '@o4o/account-ui';
import { Link } from 'react-router-dom';

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

  const activeRole = user.roles[0];
  const dashboardPath = getNetureDashboardRoute(user.roles);
  const roleLabel = ROLE_LABELS[activeRole] || '사용자';

  const handleLogout = async () => {
    await logout();
    navigate('/workspace');
  };

  return (
    <MyPageLayout title="마이페이지" subtitle="내 정보를 확인하고 관리할 수 있습니다">
      {/* Profile Summary (read-only) */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-white">{user.name?.charAt(0) || '?'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{user.name}</h2>
              <p className="text-primary-100 text-sm truncate">{user.email}</p>
              <div className="mt-2">
                <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white">
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-3">
          <InfoRow icon={<Mail className="w-4 h-4 text-gray-400" />} label="이메일" value={user.email} />
          <InfoRow icon={<Shield className="w-4 h-4 text-gray-400" />} label="역할" value={roleLabel} />
        </div>
      </div>

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

      {/* Quick Actions */}
      <QuickActionsSection
        dashboardPath={dashboardPath}
        showDashboard={activeRole !== 'user'}
        onLogout={handleLogout}
      />
    </MyPageLayout>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      {icon}
      <span className="text-xs text-gray-400 w-14">{label}</span>
      <span className="text-sm text-gray-700">{value}</span>
    </div>
  );
}
