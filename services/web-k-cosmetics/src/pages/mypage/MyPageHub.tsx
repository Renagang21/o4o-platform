/**
 * MyPageHub - 마이페이지 허브 (읽기 전용 요약 + 빠른 이동)
 *
 * WO-O4O-KCOSMETICS-MYPAGE-SPLIT-V1
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE_LABELS, getKCosmeticsDashboardRoute } from '@/contexts/AuthContext';
import { Mail, Phone, Shield, BookOpen, Award, Coins, Gift, ClipboardList } from 'lucide-react';
import { MyPageLayout, QuickActionsSection, RoleBadge, MyPageHubCard } from '@o4o/account-ui';
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
      width="wide"
      breadcrumb={[{ label: '홈', href: '/' }, { label: '마이페이지' }]}
      navItems={KCOS_MYPAGE_NAV_ITEMS}
    >
      {/* Profile Summary Card — KPA-Society 정렬: 흰색 카드 + 좌측 아바타 + 정보 + 우측 수정 버튼 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <span className="text-3xl font-bold text-gray-400">{user.name?.charAt(0) || '?'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">{user.name}</h2>
            <p className="text-sm text-gray-500 truncate mt-0.5">{user.email}</p>
            <div className="mt-2">
              <RoleBadge label={roleLabel ?? '사용자'} tone="primary" variant="solid" size="md" />
            </div>
          </div>
          <Link
            to="/mypage/profile"
            className="flex-shrink-0 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            프로필 수정
          </Link>
        </div>
        {/* 상세 정보 — 새 흰색 카드 구조 안에서 재배치 (이메일/연락처/역할 보존) */}
        <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          <InfoRow icon={<Mail className="w-4 h-4 text-gray-400" />} label="이메일" value={user.email} />
          <InfoRow icon={<Phone className="w-4 h-4 text-gray-400" />} label="연락처" value={user.phone || '미등록'} />
          <InfoRow icon={<Shield className="w-4 h-4 text-gray-400" />} label="역할" value={roleLabel ?? '사용자'} />
        </div>
      </div>

      {/* Feature Cards — KPA 흰색 카드 그리드 정렬 (프로필/설정은 상단 탭·수정 버튼으로 일원화) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {/* LMS MyPage (WO-O4O-KCOS-LMS-MYPAGE-CANONICAL-ALIGNMENT-V1) */}
        <MyPageHubCard
          title="내 수강"
          href="/mypage/enrollments"
          icon={<BookOpen className="w-5 h-5" />}
        />
        <MyPageHubCard
          title="학습 결과"
          href="/mypage/certificates"
          icon={<Award className="w-5 h-5" />}
        />
        <MyPageHubCard
          title="내 크레딧"
          href="/mypage/credits"
          icon={<Coins className="w-5 h-5" />}
        />
        {/* WO-O4O-MYPAGE-MY-REQUESTS-INBOX-GLYCO-KCOS-ROUTE-V1 */}
        <MyPageHubCard
          title="내 신청"
          href="/mypage/my-requests"
          icon={<ClipboardList className="w-5 h-5" />}
        />
      </div>

      {/* Appreciation Activity Card */}
      {!appreciationLoading && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
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
