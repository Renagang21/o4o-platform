/**
 * MyPageHub - 마이페이지 허브 (읽기 전용 요약 + 빠른 이동)
 *
 * WO-O4O-KCOSMETICS-MYPAGE-SPLIT-V1
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE_LABELS, getKCosmeticsDashboardRoute } from '@/contexts/AuthContext';
import { Mail, Phone, Shield, UserCog, Settings, ChevronRight, BookOpen, Award, Coins, Gift } from 'lucide-react';
import { MyPageLayout, QuickActionsSection, RoleBadge } from '@o4o/account-ui';
import { KCOS_MYPAGE_NAV_ITEMS } from './navItems';
import { appreciationApi, type AppreciationSend } from '@/api/appreciation';

export default function MyPageHub() {
  const { user, isAuthenticated, logout } = useAuth();
  const [receivedItems, setReceivedItems] = useState<AppreciationSend[]>([]);
  const [sentItems, setSentItems] = useState<AppreciationSend[]>([]);
  const [appreciationLoading, setAppreciationLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([
      appreciationApi.getMyReceived({ limit: 5 }),
      appreciationApi.getMySent({ limit: 5 }),
    ]).then(([recRes, sentRes]) => {
      if (recRes.status === 'fulfilled') {
        const d = recRes.value.data?.data ?? recRes.value.data;
        setReceivedItems(d?.items ?? []);
      }
      if (sentRes.status === 'fulfilled') {
        const d = sentRes.value.data?.data ?? sentRes.value.data;
        setSentItems(d?.items ?? []);
      }
    }).finally(() => setAppreciationLoading(false));
  }, [user]);

  const receivedTotal = receivedItems.reduce((s, i) => s + i.amount, 0);
  const sentTotal = sentItems.reduce((s, i) => s + i.amount, 0);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm w-full">
          <h1 className="text-lg font-semibold text-gray-900 mb-4">로그인이 필요합니다</h1>
          <Link
            to="/login"
            className="block w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors text-center"
          >
            로그인
          </Link>
        </div>
      </div>
    );
  }

  const dashboardPath = getKCosmeticsDashboardRoute(user.roles);
  const roleLabel = ROLE_LABELS[user.roles[0]];

  return (
    <MyPageLayout
      title="마이페이지"
      subtitle="내 정보를 확인하고 관리할 수 있습니다"
      navItems={KCOS_MYPAGE_NAV_ITEMS}
    >
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
                <RoleBadge label={roleLabel ?? '사용자'} tone="white-overlay" size="md" />
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-3">
          <InfoRow icon={<Mail className="w-4 h-4 text-gray-400" />} label="이메일" value={user.email} />
          <InfoRow icon={<Phone className="w-4 h-4 text-gray-400" />} label="연락처" value={user.phone || '미등록'} />
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
        {/* LMS MyPage (WO-O4O-KCOS-LMS-MYPAGE-CANONICAL-ALIGNMENT-V1) */}
        <Link
          to="/mypage/enrollments"
          className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
        >
          <BookOpen className="w-5 h-5 text-primary-500" />
          <span className="text-sm font-medium text-gray-700 flex-1">내 수강</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Link>
        <Link
          to="/mypage/certificates"
          className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
        >
          <Award className="w-5 h-5 text-primary-500" />
          <span className="text-sm font-medium text-gray-700 flex-1">학습 결과</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Link>
        <Link
          to="/mypage/credits"
          className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors col-span-2"
        >
          <Coins className="w-5 h-5 text-primary-500" />
          <span className="text-sm font-medium text-gray-700 flex-1">내 크레딧</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Link>
      </div>

      {/* Appreciation Activity Card */}
      {!appreciationLoading && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Gift className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-800">감사 활동</h3>
          </div>
          {receivedTotal === 0 && sentTotal === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-sm text-gray-400 mb-1">아직 받은 감사가 없습니다.</p>
              <p className="text-xs text-gray-300">좋은 글과 자료를 공유하면 감사 포인트를 받을 수 있습니다.</p>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-amber-50 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-amber-600 mb-1">받은 감사</p>
                  <p className="text-xl font-bold text-amber-800">{receivedTotal.toLocaleString()}P</p>
                  <p className="text-xs text-amber-500 mt-0.5">{receivedItems.length}건</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">보낸 감사</p>
                  <p className="text-xl font-bold text-gray-700">{sentTotal.toLocaleString()}P</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sentItems.length}건</p>
                </div>
              </div>
              {receivedItems.filter(r => r.message).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">최근 받은 감사 메시지</p>
                  <div className="space-y-2">
                    {receivedItems.filter(r => r.message).slice(0, 3).map((r, i) => (
                      <div key={i} className="flex justify-between items-center text-xs bg-amber-50 rounded-lg px-3 py-2">
                        <span className="italic text-amber-700 flex-1 mr-2 truncate">"{r.message}"</span>
                        <span className="font-semibold text-amber-600 whitespace-nowrap">+{r.amount}P</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <QuickActionsSection
        dashboardPath={dashboardPath}
        dashboardLabel="대시보드로 이동"
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
