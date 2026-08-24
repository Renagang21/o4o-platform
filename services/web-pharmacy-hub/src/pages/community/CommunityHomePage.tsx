/**
 * CommunityHomePage — Pharmacy-Hub 커뮤니티 홈 (canonical `/`)
 *
 * WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §4·§5·§13
 * WO-O4O-KPA-PHARMACYHUB-COMMUNITY-HOME-AND-NAV-CANONICAL-CONVERGENCE-V1 §8·§10·§12:
 *   KPA-Society 와 **같은 공통 컨테이너** `CommunityServiceHome`(@o4o/shared-space-ui) 을
 *   소비한다. 이 파일에는 PharmacyHub config(문구·카드·CTA·accent)와 data adapter 만 있다.
 *   KPA JSX 를 복제하지 않는다 — 두 서비스가 같은 컨테이너를 각자의 config·data 로 쓴다.
 *
 *   또한 이 화면이 서비스 루트(`/`)의 canonical 홈이 됐다. 기존 서비스 소개형 HomePage 는
 *   폐기하고, 그 화면이 갖고 있던 두 요소를 이 홈의 슬롯으로 옮겼다:
 *     - 가입 상태 안내 밴드 → latestHeaderSlot
 *     - 역할별 진입점 카드 → valueGuideSlot (KPA 와 같은 after-help 배치)
 *   `/community` 는 `/` 로 redirect 된다(기존 링크 보존 · 중복 홈 제거).
 *
 * - PH 는 Content 가 미구현이므로 해당 탭·카드·링크를 만들지 않는다
 *   (§4: placeholder 기능을 새로 만들지 않는다 / §13: dead route 금지).
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1 §12:
 *   자료실(/resources)은 이후 채택돼 실재하지만, "최신 활동" 탭은 추가하지 않는다.
 *   탭 데이터는 `/pharmacy-hub/home/latest` 가 공급하며 resource 타입을 다루지 않아
 *   backend 변경 없이는 항상 빈 탭이 된다(§14 신규 backend 0 / §4 placeholder 금지).
 */

import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CommunityServiceHome,
  LATEST_ACTIVITY_ACCENTS,
  AppEntrySection,
  type LatestActivityTab,
  type NoticeItem,
} from '@o4o/shared-space-ui';
import { homeApi } from '../../api/home';
import { fetchPharmacyHubForumPosts } from '../../services/forumApi';
import { BRAND, ROLES, ROLE_LABELS, satisfiesRole } from '../../config/service';
import { useAuth } from '../../contexts/AuthContext';
import { getServiceMembershipStatus } from '../../lib/membershipGate';

/** PH 에 실제 존재하는 공간만 탭으로 노출한다(콘텐츠/자료실/사이니지 제외). */
const LATEST_TABS: LatestActivityTab[] = [
  { key: 'all', label: '전체', shortcutHref: null, shortcutLabel: null },
  { key: 'forum', label: '포럼', shortcutHref: '/forum', shortcutLabel: '포럼 바로가기' },
  { key: 'course', label: '교육', shortcutHref: '/education', shortcutLabel: '교육 바로가기' },
];

/**
 * 역할별 진입점 — 추가 권한이 필요한 영역만 나열한다.
 * (약사 회원의 이용 범위인 커뮤니티·교육은 위 앱 진입 카드가 담당한다.)
 */
const ROLE_ENTRIES = [
  { to: '/store-owner', role: ROLES.storeOwner, desc: '공급 상품 주문 · 매장 콘텐츠 · 실행 자산(QR·POP·사이니지)' },
  { to: '/operator', role: ROLES.operator, desc: '가입·회원 운영 · 커뮤니티(포럼) 운영' },
];

export default function CommunityHomePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const membershipStatus = getServiceMembershipStatus(user);
  const roles: string[] = Array.isArray(user?.roles) ? (user!.roles as string[]) : [];

  /**
   * WO-O4O-PHARMACYHUB-FINAL-ROLE-ENTRY-AND-PRODUCTION-ADOPTION-CLOSURE-V1:
   *   로그인 사용자에게는 **보유 역할로 실제 진입 가능한 카드만** 노출한다(데드링크 0).
   *   비로그인 방문자에게는 서비스 안내 목적으로 전체 목록을 유지한다.
   */
  const roleEntries = isAuthenticated
    ? ROLE_ENTRIES.filter((e) => satisfiesRole(roles, e.role))
    : ROLE_ENTRIES;

  /** 공지 adapter — PH 의 공지 canonical 은 forum pinned post 다. 실패는 throw 한다. */
  const loadNotices = useCallback(async (): Promise<NoticeItem[]> => {
    const result = await fetchPharmacyHubForumPosts({ limit: 20, sortBy: 'latest' });
    if (!Array.isArray(result?.posts)) throw new Error('공지를 불러오지 못했습니다.');
    return result.posts
      .filter((post) => post.isPinned)
      .slice(0, 5)
      .map((post) => ({
        id: post.id,
        title: post.title,
        date: post.createdAt,
        href: `/forum/posts/${post.id}`,
        isPinned: true,
      }));
  }, []);

  /** 최신 활동 adapter — homeApi.getLatest 는 실패 시 이미 throw 한다. */
  const loadLatest = useCallback(
    (tab: string, limit: number) => homeApi.getLatest({ type: tab, limit }),
    [],
  );

  return (
    <CommunityServiceHome
      navigate={(path) => navigate(path)}
      data={{ loadNotices, loadLatest }}
      latestTabs={LATEST_TABS}
      latestAccent={LATEST_ACTIVITY_ACCENTS.emerald}
      heroSlot={
        <div className="border-b border-slate-200 bg-gradient-to-br from-teal-50 to-white px-4 py-10 md:py-14">
          <div className="mx-auto max-w-5xl">
            <span className="inline-block rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
              PharmacyHub 커뮤니티
            </span>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">
              {BRAND.tagline}
            </h1>
            <p className="mt-2 text-sm text-slate-600 md:text-base">
              포럼에서 정보를 나누고, 교육 콘텐츠로 매장 운영 역량을 키웁니다.
            </p>
          </div>
        </div>
      }
      /* 가입 상태 안내 — 폐기한 서비스 소개 홈에서 이관(진입점 손실 0). */
      latestHeaderSlot={
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
          {isAuthenticated ? (
            <p className="m-0">
              로그인 상태 · 서비스 가입 상태: <strong>{membershipStatus}</strong>
              {membershipStatus !== 'active' && (
                <>
                  {' · '}
                  <Link to="/join/status" className="text-teal-700 underline">
                    신청 상태 확인
                  </Link>
                </>
              )}
            </p>
          ) : (
            <p className="m-0">
              <Link to="/login" className="text-teal-700 underline">로그인</Link>
              {' '}후 글쓰기·교육 수강을 이용할 수 있습니다. 아직 회원이 아니라면{' '}
              <Link to="/join" className="text-teal-700 underline">가입 신청</Link>
              을 진행해 주세요.
            </p>
          )}
        </div>
      }
      noticesTitle="공지"
      noticesViewAllHref="/forum/posts"
      noticesRightSlot={
        <div className="flex-1 rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="m-0 text-base font-semibold text-slate-900">커뮤니티 이용 안내</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>· 포럼 글쓰기는 PharmacyHub 가입 승인 후 가능합니다.</li>
            <li>· 교육 콘텐츠는 PharmacyHub 에 등록된 강의만 표시됩니다.</li>
            <li>· 내가 쓴 글은 커뮤니티 메뉴의 [내 글]에서 확인할 수 있습니다.</li>
          </ul>
        </div>
      }
      appEntryCards={[
        { title: '포럼', description: '약국·공급자 정보 교류 게시판', href: '/forum' },
        { title: '교육', description: '매장 운영·상품 이해 교육 콘텐츠', href: '/education' },
        { title: '커뮤니티 검색', description: '커뮤니티 글을 한 번에 검색', href: '/community/search' },
        { title: '내 글', description: '내가 작성한 글 모아보기', href: '/forum/my-posts' },
        // WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1 §12
        //   공통 GlobalHeader 는 nav item 의 children 을 렌더하지 않는다(플랫폼 공통 제약).
        //   따라서 자료실의 실제 진입점은 이 커뮤니티 홈 카드와 footer 가 담당한다.
        { title: '자료실', description: '약국 운영에 활용할 자료를 모아보기', href: '/resources' },
      ]}
      /* KPA 와 같은 배치 계약 — 역할별 활용 안내는 진입 CTA 가 아니라 가이드 영역에 둔다. */
      valueGuidePlacement="after-help"
      valueGuideSlot={
        roleEntries.length > 0 ? (
          <AppEntrySection
            title="역할별 진입점"
            accentColor="#0d9488"
            cards={roleEntries.map((e) => ({
              title: ROLE_LABELS[e.role],
              description: e.desc,
              href: e.to,
            }))}
          />
        ) : undefined
      }
      cta={{
        title: 'PharmacyHub 커뮤니티에 참여하세요',
        description: '가입 승인 후 포럼 글쓰기와 교육 콘텐츠를 이용할 수 있습니다.',
        href: '/join',
        linkLabel: '가입 안내 보기',
      }}
      // WO-O4O-PHARMACYHUB-GUIDE-ADOPTION-V1
      // 공통 O4OHelpSection 의 기본 usageItems 는 href='#' 3개(데드 엔트리)다.
      // PharmacyHub 는 공통 Guide 를 채택했으므로 실제 매뉴얼 route 로 대체한다.
      help={{
        currentServiceKey: 'pharmacy-hub',
        usageItems: [
          { title: '서비스 소개', description: 'PharmacyHub 가 어떤 서비스인지 확인하세요', href: '/service-guide' },
          { title: '이용 가이드', description: '가입부터 매장 실행까지 이용 순서를 안내합니다', href: '/guide/intro' },
          { title: '기능별 이용 방법', description: '주문·매장 제품·콘텐츠·매장 실행 사용법을 봅니다', href: '/guide/features' },
        ],
      }}
    />
  );
}
