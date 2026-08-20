/**
 * MyDashboardPage - 마이페이지 대시보드 (KPA-Society My Page Home)
 *
 * WO-KPA-A-MYPAGE-HUB-NAVIGATION-AND-CTA-ENHANCEMENT-V1
 * - MyPageNavigation 탭 네비게이션 추가
 * - 내 포럼 바로가기 추가, 작성 글 카드 링크 연결
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-HOME-HUB-COMMONIZATION-V1
 * - 손으로 만든 사용자 요약 카드 → 공통 `MyPageUserSummary` (Shell 의 userSummary 슬롯)
 * - 손으로 만든 최근 활동 카드 → 공통 `MyPageActivityFeed`
 * - 손으로 만든 감사 활동 카드 → 공통 `MyPageAppreciationCard`
 * - 손으로 만든 하단 바로가기 → 공통 `MyPageEntryCardGrid`
 * - 활동 요약 타일(수강/수료/수료증/작성 글/이벤트)은 KPA 고유 지표라
 *   `SERVICE_SPECIFIC` 으로 유지한다 (다른 4 서비스에 대응 화면 없음).
 *
 * 데이터 계약(mypageApi / appreciationApi)은 변경하지 않는다 — 표현만 공통화한다.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserCog, MessageSquare, GraduationCap, ScrollText, ClipboardList, Settings } from 'lucide-react';
import { Card } from '../../components/common';
import { MyPageLayout } from '../../layouts/MyPageLayout';
import {
  RoleBadgeGroup,
  MembershipStatusBadge,
  resolveRoleLabel,
  MyPageLoadingState,
  MyPageEmptyState,
  MyPageUserSummary,
  MyPageEntryCardGrid,
  MyPageActivityFeed,
  MyPageAppreciationCard,
} from '@o4o/account-ui';
import { getServiceMembershipStatus } from '../../lib/membershipGate';
import { ROLES } from '../../lib/role-constants';
import { KPA_ROLE_PRIORITY } from '../../config/dashboard';
import { mypageApi } from '../../api';
import { appreciationApi, type AppreciationSend } from '../../api/appreciation';
import { useAuth } from '../../contexts';
import { colors, typography } from '../../styles/theme';
import type { UserActivity } from '../../api/mypage';

/**
 * WO-O4O-CROSS-SERVICE-MYPAGE-MEMBERSHIP-ROLE-STATUS-COMMONIZATION-V1 §9
 *
 * 역할 라벨 사전·우선순위는 **서비스 소관**(각 서비스 role 체계가 다르다).
 * 해석 규칙만 공통 `resolveRoleLabel` 을 쓴다.
 *
 * production 검증에서 확인된 결함 교정: 기존 사전 키가 접두사 없는 `admin`/`officer`
 * 였는데 KPA 실제 role 문자열은 `kpa:admin` / `kpa:operator` 처럼 service-prefixed 다
 * (`lib/role-constants.ts` 가 SSOT). 그래서 kpa:admin 보유자에게도 '회원' 이 노출됐다.
 * role 체계 자체는 바꾸지 않고(§11), 사전 키를 canonical 값으로 맞추고 우선순위는
 * 로그인 redirect 와 같은 `KPA_ROLE_PRIORITY` 를 재사용한다. legacy 무접두 키는 남긴다.
 */
const KPA_ROLE_LABELS: Record<string, string> = {
  [ROLES.PLATFORM_SUPER_ADMIN]: '최고 관리자',
  [ROLES.KPA_ADMIN]: '관리자',
  [ROLES.KPA_OPERATOR]: '운영자',
  [ROLES.KPA_STORE_OWNER]: '약국 경영자',
  // legacy(무접두) 데이터 호환 — 표시 문자열은 종전과 동일하다.
  admin: '관리자',
  officer: '임원',
};
const KPA_MYPAGE_ROLE_PRIORITY = [...KPA_ROLE_PRIORITY, 'admin', 'officer'] as const;

interface DashboardSummary {
  enrolledCourses: number;
  completedCourses: number;
  certificates: number;
  forumPosts: number;
  groupbuyParticipations?: number;
  eventOfferParticipations?: number;
}

/**
 * 사용자 표시 이름 헬퍼
 * DB에 기본값 '운영자'가 설정되어 있으므로 name은 항상 존재
 */
function getUserDisplayName(user: any): string {
  if (!user) return '사용자';
  return user.name || '사용자';
}

/** 활동 타입 → 아이콘. 표시 전용 매핑이며 활동 모델은 그대로 둔다. */
const ACTIVITY_ICONS: Record<string, string> = {
  course_progress: '📚',
  forum_post: '💬',
  groupbuy: '🛒',
  certificate: '🎓',
};

/** 감사 대상 타입 → 라벨. 표시 전용 매핑. */
const APPRECIATION_TARGET_LABELS: Record<string, string> = {
  forum_post: '포럼',
  lms_course: '강의',
};

export function MyDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // WO-O4O-APPRECIATION-CULTURE-UI-PHASE1-V1
  const [receivedTotal, setReceivedTotal] = useState(0);
  const [sentTotal, setSentTotal] = useState(0);
  const [recentReceived, setRecentReceived] = useState<AppreciationSend[]>([]);
  const [recentSent, setRecentSent] = useState<AppreciationSend[]>([]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryRes, activitiesRes] = await Promise.all([
        mypageApi.getDashboardSummary(),
        mypageApi.getActivities({ limit: 5 }),
      ]);

      setSummary(summaryRes.data);
      setActivities(activitiesRes.data || []);

      // WO-O4O-APPRECIATION-CULTURE-UI-PHASE1-V1: 감사 활동 로드
      Promise.allSettled([
        appreciationApi.getMyReceived({ limit: 5 }),
        appreciationApi.getMySent({ limit: 5 }),
      ]).then(([recRes, sentRes]) => {
        if (recRes.status === 'fulfilled') {
          const items: AppreciationSend[] = (recRes.value.data as any) ?? [];
          setRecentReceived(items.slice(0, 5));
          setReceivedTotal(items.reduce((s, i) => s + i.amount, 0));
        }
        if (sentRes.status === 'fulfilled') {
          const items: AppreciationSend[] = (sentRes.value.data as any) ?? [];
          setRecentSent(items.slice(0, 5));
          setSentTotal(items.reduce((s, i) => s + i.amount, 0));
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      /* WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1:
         상태 화면도 Shell 안에서 렌더한다 (헤더·네비게이션 유실 금지). */
      <MyPageLayout title="마이페이지">
        <MyPageEmptyState
          icon="🔒"
          title="로그인이 필요합니다"
          description="마이페이지를 이용하려면 로그인해주세요."
        />
      </MyPageLayout>
    );
  }

  if (loading) {
    return (
      <MyPageLayout title="마이페이지">
        <MyPageLoadingState message="정보를 불러오는 중..." />
      </MyPageLayout>
    );
  }

  if (error) {
    return (
      <MyPageLayout title="마이페이지">
        <MyPageEmptyState
          icon="⚠️"
          title="오류가 발생했습니다"
          description={error}
          actionLabel="다시 시도"
          onAction={loadData}
        />
      </MyPageLayout>
    );
  }

  return (
    <MyPageLayout
      title="마이페이지"
      breadcrumb={[{ label: '홈', href: '/' }, { label: '마이페이지' }]}
      width="wide"
      userSummary={
        /* 사용자 요약 — 4 서비스 공통 카드. 배지 구성(소속 분회·역할)은 KPA 판정 그대로. */
        <MyPageUserSummary
          initial="👤"
          name={getUserDisplayName(user)}
          email={user.email}
          actionHref="/mypage/profile"
          badges={
            <div className="flex items-center gap-2 flex-wrap">
              <RoleBadgeGroup
                badges={[
                  ...((user as any).organizationId
                    ? [{ key: 'org', label: '🏢 소속 분회', tone: 'slate' as const, variant: 'soft' as const }]
                    : []),
                  {
                    key: 'role',
                    /* 역할 라벨 해석은 5 서비스 공통 규칙(우선순위 기반) — 배열 순서에 의존하지 않는다. */
                    label: resolveRoleLabel(user.roles, {
                      labels: KPA_ROLE_LABELS,
                      priority: KPA_MYPAGE_ROLE_PRIORITY,
                      fallback: '회원',
                    }),
                    tone: 'primary',
                    variant: 'solid',
                  },
                ]}
                size="md"
              />
              {/* 서비스 가입 상태 — service_memberships.status 축 (users.status 아님) */}
              <MembershipStatusBadge status={getServiceMembershipStatus(user)} size="md" />
            </div>
          }
        />
      }
    >
      {/* 활동 요약 카드 — KPA 고유 지표 (SERVICE_SPECIFIC) */}
      <div style={styles.summaryGrid}>
        <Link to={`/mypage/enrollments`} style={styles.summaryLink}>
          <Card padding="medium">
            <div style={styles.summaryItem}>
              <span style={styles.summaryIcon}>📚</span>
              <span style={styles.summaryValue}>{summary?.enrolledCourses || 0}</span>
              <span style={styles.summaryLabel}>수강 중 과정</span>
            </div>
          </Card>
        </Link>
        <Card padding="medium">
          <div style={styles.summaryItem}>
            <span style={styles.summaryIcon}>✅</span>
            <span style={styles.summaryValue}>{summary?.completedCourses || 0}</span>
            <span style={styles.summaryLabel}>수료 완료</span>
          </div>
        </Card>
        <Link to={`/mypage/certificates`} style={styles.summaryLink}>
          <Card padding="medium">
            <div style={styles.summaryItem}>
              <span style={styles.summaryIcon}>🎓</span>
              <span style={styles.summaryValue}>{summary?.certificates || 0}</span>
              <span style={styles.summaryLabel}>수료증</span>
            </div>
          </Card>
        </Link>
        <Link to={`/mypage/my-forums`} style={styles.summaryLink}>
          <Card padding="medium">
            <div style={styles.summaryItem}>
              <span style={styles.summaryIcon}>💬</span>
              <span style={styles.summaryValue}>{summary?.forumPosts || 0}</span>
              <span style={styles.summaryLabel}>작성 글</span>
            </div>
          </Card>
        </Link>
        {/* WO-O4O-MYPAGE-TIER1-DEAD-STUB-CLEANUP-V1:
            /event-offers/history route 미정의 dead link 였음. Card 만 유지 — 참여 수 표시.
            전용 이력 페이지 도입 시 별도 WO 로 link 재추가. */}
        <Card padding="medium">
          <div style={styles.summaryItem}>
            <span style={styles.summaryIcon}>🛒</span>
            <span style={styles.summaryValue}>{summary?.eventOfferParticipations || summary?.groupbuyParticipations || 0}</span>
            <span style={styles.summaryLabel}>이벤트</span>
          </div>
        </Card>
      </div>

      {/* Market Trial 위젯 제거 — WO-MARKET-TRIAL-CROSS-SERVICE-ENTRY-ONLY-MIGRATION-V1
          Market Trial 실행은 Neture로 통합됨. 진입은 커뮤니티 Home의 단일 배너로 일원화. */}

      {/* 최근 활동 — 공통 MyPageActivityFeed
          (WO-O4O-CROSS-SERVICE-MYPAGE-HOME-HUB-COMMONIZATION-V1 §8) */}
      <div style={{ marginTop: '24px' }}>
        <MyPageActivityFeed
          items={activities.map((activity, index) => ({
            key: String(index),
            icon: ACTIVITY_ICONS[activity.type],
            title: activity.title,
            description: activity.description,
            meta: new Date(activity.date).toLocaleDateString(),
          }))}
        />
      </div>

      {/* 내 감사 활동 — 공통 MyPageAppreciationCard
          (WO-O4O-APPRECIATION-CULTURE-UI-PHASE1-V1 표시 계약 보존:
           합계·목록이 모두 비면 카드 자체를 렌더하지 않는다) */}
      <MyPageAppreciationCard
        title="내 감사 활동"
        hideWhenEmpty
        receivedTotal={receivedTotal}
        sentTotal={sentTotal}
        receivedItems={recentReceived.map((r, i) => ({
          key: String(i),
          targetLabel: APPRECIATION_TARGET_LABELS[r.targetType] ?? '콘텐츠',
          message: r.message,
          amount: r.amount,
        }))}
        sentItems={recentSent.map((r, i) => ({
          key: String(i),
          targetLabel: APPRECIATION_TARGET_LABELS[r.targetType] ?? '콘텐츠',
          message: r.message,
          amount: r.amount,
        }))}
      />

      {/* 바로가기 — 공통 MyPageEntryCardGrid (4 서비스 동일 배치) */}
      <MyPageEntryCardGrid
        columns={3}
        items={[
          { key: 'profile', title: '프로필', href: '/mypage/profile', icon: <UserCog className="w-5 h-5" /> },
          { key: 'my-forums', title: '내 포럼', href: '/mypage/my-forums', icon: <MessageSquare className="w-5 h-5" /> },
          { key: 'certificates', title: '학습 결과', href: '/mypage/certificates', icon: <GraduationCap className="w-5 h-5" /> },
          { key: 'qualifications', title: '내 자격', href: '/mypage/qualifications', icon: <ScrollText className="w-5 h-5" /> },
          // WO-O4O-MYPAGE-MY-REQUESTS-HUB-CARD-ALIGNMENT-V1
          { key: 'my-requests', title: '내 신청', href: '/mypage/my-requests', icon: <ClipboardList className="w-5 h-5" /> },
          { key: 'settings', title: '설정', href: '/mypage/settings', icon: <Settings className="w-5 h-5" /> },
        ]}
      />
    </MyPageLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
  },
  summaryLink: {
    textDecoration: 'none',
    color: 'inherit',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '8px',
  },
  summaryIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  summaryValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: colors.neutral900,
  },
  summaryLabel: {
    ...typography.bodyS,
    color: colors.neutral500,
    marginTop: '4px',
  },
};
