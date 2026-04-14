/**
 * MyPageHub - 마이페이지 허브 (읽기 전용 프로필 요약 + 빠른 이동)
 *
 * WO-O4O-GLYCOPHARM-MYPAGE-SPLIT-V1
 *
 * /mypage 진입 시 계정 요약 정보를 보여주고,
 * 프로필 편집(/mypage/profile), 설정(/mypage/settings)으로의 이동을 안내한다.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Mail,
  Phone,
  Building2,
  Shield,
  UserCog,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { MyPageLayout, QuickActionsSection } from '@o4o/account-ui';

const roleLabels: Record<string, string> = {
  admin: '관리자',
  operator: '운영자',
  pharmacy: '약사',
  pharmacist: '약사',
  customer: '당뇨인',
  supplier: '공급자',
  partner: '파트너',
  consumer: '소비자',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: '승인 대기', color: '#ca8a04' },
  approved: { label: '승인됨', color: '#16a34a' },
  active: { label: '승인됨', color: '#16a34a' },
  rejected: { label: '거부됨', color: '#dc2626' },
  suspended: { label: '정지됨', color: '#6b7280' },
};

export default function MyPageHub() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-slate-500">로그인이 필요합니다.</p>
      </div>
    );
  }

  const status = statusLabels[user.status] || statusLabels.pending;
  const displayName = (user.lastName && user.firstName) ? `${user.lastName}${user.firstName}` : user.name;
  const roleLabel = roleLabels[user.memberships?.find(m => m.serviceKey === 'glycopharm')?.role || ''] || roleLabels[user.roles[0]] || user.roles[0];
  const initial = user.lastName?.charAt(0) || user.name?.charAt(0) || '?';

  return (
    <MyPageLayout title="마이페이지">
      {/* Profile Summary Card (read-only) */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-white">{initial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{displayName}</h2>
              <p className="text-primary-100 text-sm truncate">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white">
                  {roleLabel}
                </span>
                {status.label && (
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: `${status.color}20`, color: status.color }}
                  >
                    {status.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-3">
          <InfoRow icon={<Mail className="w-4 h-4 text-gray-400" />} label="이메일" value={user.email} />
          <InfoRow icon={<Phone className="w-4 h-4 text-gray-400" />} label="연락처" value={user.phone || '-'} />
          <InfoRow icon={<Building2 className="w-4 h-4 text-gray-400" />} label="역할" value={roleLabel} />
          <InfoRow icon={<Shield className="w-4 h-4 text-gray-400" />} label="상태" value={status.label} />
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
        showDashboard={false}
        onLogout={logout}
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
