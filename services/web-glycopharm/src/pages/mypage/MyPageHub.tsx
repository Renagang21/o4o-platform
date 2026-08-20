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
  ClipboardList,
} from 'lucide-react';
import {
  MyPageLayout,
  QuickActionsSection,
  RoleBadgeGroup,
  MyPageAuthRequired,
  MyPageUserSummary,
  MyPageEntryCardGrid,
  MyPageAppreciationCard,
  buildMembershipViewModel,
} from '@o4o/account-ui';
import { appreciationApi, type AppreciationSend } from '@/api/appreciation';
import { GLYCOPHARM_MYPAGE_NAV_ITEMS } from './navItems';
import { SERVICE_KEY, getServiceMembershipStatus } from '@/lib/membershipGate';

/**
 * WO-O4O-CROSS-SERVICE-MYPAGE-MEMBERSHIP-ROLE-STATUS-COMMONIZATION-V1 §9
 *
 * 역할 라벨 사전·우선순위는 서비스 소관. 해석 규칙(우선순위 기반)과 상태 표현은
 * 공통 계층(`buildMembershipViewModel`)을 쓴다.
 */
const roleLabels: Record<string, string> = {
  admin: '관리자',
  operator: '운영자',
  pharmacy: '약사',
  pharmacist: '약사',
  supplier: '공급자',
  partner: '파트너',
  consumer: '소비자',
};

const GLYCOPHARM_ROLE_PRIORITY = [
  'admin',
  'operator',
  'pharmacy',
  'pharmacist',
  'supplier',
  'partner',
  'consumer',
] as const;

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

  /**
   * 상태 축 교정 (WO-O4O-CROSS-SERVICE-MYPAGE-MEMBERSHIP-ROLE-STATUS-COMMONIZATION-V1):
   * 기존에는 Identity 축인 `users.status` 를 서비스 가입 상태로 표시해
   * (AuthContext 기본값 'approved') 실제 승인 상태와 어긋났다.
   * canonical 축인 `service_memberships.status` 로 정렬한다.
   */
  const membership = buildMembershipViewModel({
    status: getServiceMembershipStatus(user),
    roles: user.roles,
    roleLabels,
    rolePriority: GLYCOPHARM_ROLE_PRIORITY,
    roleFallback: user.roles[0] ?? '회원',
  });
  const displayName = (user.lastName && user.firstName) ? `${user.lastName}${user.firstName}` : user.name;
  // 이 서비스 membership 이 보유한 역할이 있으면 그것을 대표 라벨로 우선한다.
  const membershipRole = user.memberships?.find(m => m.serviceKey === SERVICE_KEY)?.role;
  const roleLabel = (membershipRole ? roleLabels[membershipRole] : undefined) ?? membership.roleLabel;
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
                {
                  key: 'status',
                  label: membership.statusLabel,
                  tone: membership.statusTone,
                  variant: 'soft' as const,
                },
              ]}
              size="md"
            />
          }
          infoRows={[
            { key: 'email', icon: <Mail className="w-4 h-4 text-gray-400" />, label: '이메일', value: user.email },
            { key: 'phone', icon: <Phone className="w-4 h-4 text-gray-400" />, label: '연락처', value: user.phone || '-' },
            { key: 'role', icon: <Building2 className="w-4 h-4 text-gray-400" />, label: '역할', value: roleLabel },
            { key: 'status', icon: <Shield className="w-4 h-4 text-gray-400" />, label: '상태', value: membership.statusLabel },
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

      {/* 감사 활동 — 공통 MyPageAppreciationCard
          (WO-O4O-CROSS-SERVICE-MYPAGE-HOME-HUB-COMMONIZATION-V1 §8)
          응답 파싱·합계 계산은 GlycoPharm 소관으로 남기고 표시만 위임한다. */}
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
        showDashboard={false}
        onLogout={logout}
      />
    </MyPageLayout>
  );
}
