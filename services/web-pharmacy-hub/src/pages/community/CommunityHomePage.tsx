/**
 * CommunityHomePage — Pharmacy-Hub 커뮤니티 홈 (/community)
 *
 * WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §4·§5·§13
 *
 * - 기존 공통 자산(StandardHomeTemplate / LatestActivitySection)만으로 구성한다.
 * - PH 는 Content · Resources 가 미구현이므로 해당 탭·카드·링크를 만들지 않는다
 *   (§4: placeholder 기능을 새로 만들지 않는다 / §13: dead route 금지).
 * - 최신 활동은 공통 View 를 그대로 쓰고, 데이터만 `/pharmacy-hub/home/latest` 로 주입한다.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  StandardHomeTemplate,
  LatestActivitySection,
  LATEST_ACTIVITY_ACCENTS,
  LATEST_ACTIVITY_SUMMARY_LIMIT,
  type LatestActivityTab,
  type NoticeItem,
} from '@o4o/shared-space-ui';
import { homeApi, type LatestItem } from '../../api/home';
import { fetchPharmacyHubForumPosts } from '../../services/forumApi';

/** PH 에 실제 존재하는 공간만 탭으로 노출한다(콘텐츠/자료실/사이니지 제외). */
const LATEST_TABS: LatestActivityTab[] = [
  { key: 'all', label: '전체', shortcutHref: null, shortcutLabel: null },
  { key: 'forum', label: '포럼', shortcutHref: '/forum', shortcutLabel: '포럼 바로가기' },
  { key: 'course', label: '교육', shortcutHref: '/education', shortcutLabel: '교육 바로가기' },
];

export default function CommunityHomePage() {
  const navigate = useNavigate();

  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const [noticesError, setNoticesError] = useState(false);
  const [noticesReloadKey, setNoticesReloadKey] = useState(0);

  const [latestItems, setLatestItems] = useState<LatestItem[]>([]);
  const [latestTab, setLatestTab] = useState('all');
  const [latestLoading, setLatestLoading] = useState(true);
  const [latestError, setLatestError] = useState(false);
  const [latestReloadKey, setLatestReloadKey] = useState(0);

  const loadNotices = useCallback(async () => {
    setNoticesLoading(true);
    setNoticesError(false);
    try {
      const result = await fetchPharmacyHubForumPosts({ limit: 20, sortBy: 'latest' });
      setNotices(
        result.posts
          .filter((post) => post.isPinned)
          .slice(0, 5)
          .map((post) => ({
            id: post.id,
            title: post.title,
            date: post.createdAt,
            href: `/forum/posts/${post.id}`,
            isPinned: true,
          })),
      );
    } catch {
      setNotices([]);
      setNoticesError(true);
    } finally {
      setNoticesLoading(false);
    }
  }, []);

  useEffect(() => { void loadNotices(); }, [loadNotices, noticesReloadKey]);

  useEffect(() => {
    let cancelled = false;
    setLatestLoading(true);
    setLatestError(false);
    homeApi
      .getLatest({ type: latestTab, limit: LATEST_ACTIVITY_SUMMARY_LIMIT })
      .then((items) => { if (!cancelled) setLatestItems(items); })
      .catch(() => { if (!cancelled) { setLatestItems([]); setLatestError(true); } })
      .finally(() => { if (!cancelled) setLatestLoading(false); });
    return () => { cancelled = true; };
  }, [latestTab, latestReloadKey]);

  return (
    <StandardHomeTemplate
      heroSlot={
        <div className="border-b border-slate-200 bg-gradient-to-br from-teal-50 to-white px-4 py-10 md:py-14">
          <div className="mx-auto max-w-5xl">
            <span className="inline-block rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
              PharmacyHub 커뮤니티
            </span>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">
              약국과 공급자가 함께 쓰는 커뮤니티
            </h1>
            <p className="mt-2 text-sm text-slate-600 md:text-base">
              포럼에서 정보를 나누고, 교육 콘텐츠로 매장 운영 역량을 키웁니다.
            </p>
          </div>
        </div>
      }
      notices={notices}
      noticesLoading={noticesLoading}
      noticesTitle="공지"
      noticesError={noticesError}
      onNoticesRetry={() => setNoticesReloadKey((k) => k + 1)}
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
      latestSlot={
        <LatestActivitySection
          tabs={LATEST_TABS}
          items={latestItems}
          activeTab={latestTab}
          onTabChange={setLatestTab}
          loading={latestLoading}
          loadError={latestError}
          onRetry={() => setLatestReloadKey((k) => k + 1)}
          navigate={(path) => navigate(path)}
          accent={LATEST_ACTIVITY_ACCENTS.emerald}
        />
      }
      appEntryCards={[
        { title: '포럼', description: '약국·공급자 정보 교류 게시판', href: '/forum' },
        { title: '교육', description: '매장 운영·상품 이해 교육 콘텐츠', href: '/education' },
        { title: '커뮤니티 검색', description: '커뮤니티 글을 한 번에 검색', href: '/community/search' },
        { title: '내 글', description: '내가 작성한 글 모아보기', href: '/forum/my-posts' },
      ]}
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
