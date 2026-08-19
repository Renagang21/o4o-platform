/**
 * MyPageHub - 마이페이지 허브 (읽기 전용 요약 + 빠른 이동)
 *
 * WO-O4O-KCOSMETICS-MYPAGE-SPLIT-V1
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS, getKCosmeticsDashboardRoute } from '@/contexts/AuthContext';
import { Mail, Phone, Shield, BookOpen, Award, Coins, ClipboardList } from 'lucide-react';
import {
  MyPageLayout,
  QuickActionsSection,
  RoleBadge,
  MyPageAuthRequired,
  MyPageUserSummary,
  MyPageEntryCardGrid,
  MyPageAppreciationCard,
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

      {/* 감사 활동 — 공통 MyPageAppreciationCard
          (WO-O4O-CROSS-SERVICE-MYPAGE-HOME-HUB-COMMONIZATION-V1 §8) */}
      {!appreciationLoading && (
        <MyPageAppreciationCard
          receivedTotal={receivedTotal}
          sentTotal={sentTotal}
          receivedCount={receivedItems.length}
          sentCount={sentItems.length}
          receivedItems={receivedItems.map((r, i) => ({ key: String(i), message: r.message, amount: r.amount }))}
        />
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
