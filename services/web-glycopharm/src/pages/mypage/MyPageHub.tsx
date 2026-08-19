/**
 * MyPageHub - 마이페이지 허브 (읽기 전용 프로필 요약 + 빠른 이동)
 *
 * WO-O4O-GLYCOPHARM-MYPAGE-SPLIT-V1
 *
 * /mypage 진입 시 계정 요약 정보를 보여주고,
 * 프로필 편집(/mypage/profile), 설정(/mypage/settings)으로의 이동을 안내한다.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Mail,
  Phone,
  Building2,
  Shield,
  BookOpen,
  Award,
  Coins,
  Gift,
  ClipboardList,
} from 'lucide-react';
import {
  MyPageLayout,
  QuickActionsSection,
  RoleBadgeGroup,
  MyPageAuthRequired,
  MyPageUserSummary,
  MyPageEntryCardGrid,
} from '@o4o/account-ui';
import type { RoleBadgeTone } from '@o4o/account-ui';
import { appreciationApi, type AppreciationSend } from '@/api/appreciation';
import { GLYCOPHARM_MYPAGE_NAV_ITEMS } from './navItems';

const roleLabels: Record<string, string> = {
  admin: '관리자',
  operator: '운영자',
  pharmacy: '약사',
  pharmacist: '약사',
  supplier: '공급자',
  partner: '파트너',
  consumer: '소비자',
};

const statusLabels: Record<string, { label: string; tone: RoleBadgeTone }> = {
  pending: { label: '승인 대기', tone: 'amber' },
  approved: { label: '승인됨', tone: 'emerald' },
  active: { label: '승인됨', tone: 'emerald' },
  rejected: { label: '거부됨', tone: 'rose' },
  suspended: { label: '정지됨', tone: 'slate' },
};

export default function MyPageHub() {
  const { user, logout } = useAuth();
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
  // 서비스마다 다르게 손으로 만든 로그인 안내를 공통 컴포넌트로 수렴하고,
  // 안내 화면에서도 헤더·네비게이션을 유지한다.
  if (!user) {
    return (
      <MyPageLayout
        title="마이페이지"
        width="wide"
        breadcrumb={[{ label: '홈', href: '/' }, { label: '마이페이지' }]}
        navItems={GLYCOPHARM_MYPAGE_NAV_ITEMS}
      >
        <MyPageAuthRequired />
      </MyPageLayout>
    );
  }

  const status = statusLabels[user.status] || statusLabels.pending;
  const displayName = (user.lastName && user.firstName) ? `${user.lastName}${user.firstName}` : user.name;
  const roleLabel = roleLabels[user.memberships?.find(m => m.serviceKey === 'glycopharm')?.role || ''] || roleLabels[user.roles[0]] || user.roles[0];
  const initial = user.lastName?.charAt(0) || user.name?.charAt(0) || '?';

  return (
    <MyPageLayout
      title="마이페이지"
      width="wide"
      breadcrumb={[{ label: '홈', href: '/' }, { label: '마이페이지' }]}
      navItems={GLYCOPHARM_MYPAGE_NAV_ITEMS}
      userSummary={
        /* 공통 요약 카드 — 4 서비스에 복제돼 있던 마크업을 MyPageUserSummary 로 수렴.
           표시 항목(이메일/연락처/역할/상태)은 그대로 보존한다. */
        <MyPageUserSummary
          initial={initial}
          name={displayName}
          email={user.email}
          actionHref="/mypage/profile"
          badges={
            <RoleBadgeGroup
              badges={[
                { key: 'role', label: roleLabel, tone: 'primary', variant: 'solid' },
                ...(status.label
                  ? [{ key: 'status', label: status.label, tone: status.tone, variant: 'soft' as const }]
                  : []),
              ]}
              size="md"
            />
          }
          infoRows={[
            { key: 'email', icon: <Mail className="w-4 h-4 text-gray-400" />, label: '이메일', value: user.email },
            { key: 'phone', icon: <Phone className="w-4 h-4 text-gray-400" />, label: '연락처', value: user.phone || '-' },
            { key: 'role', icon: <Building2 className="w-4 h-4 text-gray-400" />, label: '역할', value: roleLabel },
            { key: 'status', icon: <Shield className="w-4 h-4 text-gray-400" />, label: '상태', value: status.label },
          ]}
        />
      }
    >
      {/* 진입 카드 — 공통 MyPageEntryCardGrid (프로필/설정은 상단 탭·수정 버튼으로 일원화) */}
      <MyPageEntryCardGrid
        items={[
          { key: 'enrollments', title: '내 강의', href: '/mypage/enrollments', icon: <BookOpen className="w-5 h-5" /> },
          { key: 'certificates', title: '수료증', href: '/mypage/certificates', icon: <Award className="w-5 h-5" /> },
          { key: 'credits', title: '크레딧 / 포인트', href: '/mypage/credits', icon: <Coins className="w-5 h-5" /> },
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
                      <div key={i} className="flex justify-between items-center text-xs text-gray-600 bg-amber-50 rounded-lg px-3 py-2">
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
        showDashboard={false}
        onLogout={logout}
      />
    </MyPageLayout>
  );
}
