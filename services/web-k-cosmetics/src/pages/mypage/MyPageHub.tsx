/**
 * MyPageHub - 마이페이지 허브 (읽기 전용 요약 + 빠른 이동)
 *
 * WO-O4O-KCOSMETICS-MYPAGE-SPLIT-V1
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS, getKCosmeticsDashboardRoute } from '@/contexts/AuthContext';
import { Mail, Phone, Shield, BookOpen, Award, Coins, Gift, ClipboardList } from 'lucide-react';
import {
  MyPageLayout,
  QuickActionsSection,
  RoleBadge,
  MyPageAuthRequired,
  MyPageUserSummary,
  MyPageEntryCardGrid,
} from '@o4o/account-ui';
import { KCOS_MYPAGE_NAV_ITEMS } from './navItems';
import { appreciationApi, type AppreciationSend } from '@/api/appreciation';

export default function MyPageHub() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
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

  // WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1:
  // 손으로 만든 로그인 안내 카드를 공통 컴포넌트로 수렴하고, 안내 화면에서도
  // 헤더·네비게이션을 유지한다.
  if (!isAuthenticated || !user) {
    return (
      <MyPageLayout
        title="마이페이지"
        width="wide"
        breadcrumb={[{ label: '홈', href: '/' }, { label: '마이페이지' }]}
        navItems={KCOS_MYPAGE_NAV_ITEMS}
      >
        <MyPageAuthRequired actionLabel="로그인" onAction={() => navigate('/login')} />
      </MyPageLayout>
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
      userSummary={
        /* 공통 요약 카드 — 표시 항목(이메일/연락처/역할)은 그대로 보존한다. */
        <MyPageUserSummary
          initial={user.name?.charAt(0) || '?'}
          name={user.name}
          email={user.email}
          actionHref="/mypage/profile"
          badges={<RoleBadge label={roleLabel ?? '사용자'} tone="primary" variant="solid" size="md" />}
          infoRows={[
            { key: 'email', icon: <Mail className="w-4 h-4 text-gray-400" />, label: '이메일', value: user.email },
            { key: 'phone', icon: <Phone className="w-4 h-4 text-gray-400" />, label: '연락처', value: user.phone || '미등록' },
            { key: 'role', icon: <Shield className="w-4 h-4 text-gray-400" />, label: '역할', value: roleLabel ?? '사용자' },
          ]}
        />
      }
    >
      {/* 진입 카드 — 공통 MyPageEntryCardGrid (프로필/설정은 상단 탭·수정 버튼으로 일원화) */}
      <MyPageEntryCardGrid
        items={[
          // LMS MyPage (WO-O4O-KCOS-LMS-MYPAGE-CANONICAL-ALIGNMENT-V1)
          { key: 'enrollments', title: '내 수강', href: '/mypage/enrollments', icon: <BookOpen className="w-5 h-5" /> },
          { key: 'certificates', title: '학습 결과', href: '/mypage/certificates', icon: <Award className="w-5 h-5" /> },
          { key: 'credits', title: '내 크레딧', href: '/mypage/credits', icon: <Coins className="w-5 h-5" /> },
          // WO-O4O-MYPAGE-MY-REQUESTS-INBOX-GLYCO-KCOS-ROUTE-V1
          { key: 'my-requests', title: '내 신청', href: '/mypage/my-requests', icon: <ClipboardList className="w-5 h-5" /> },
        ]}
      />

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
