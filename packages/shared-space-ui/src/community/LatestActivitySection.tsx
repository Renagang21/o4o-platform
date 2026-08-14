/**
 * LatestActivitySection — 커뮤니티 홈 "최신 활동(최신글)" 공통 View
 *
 * WO-O4O-COMMUNITY-HOME-LATEST-ACTIVITY-SECTION-COMMONIZATION-V1:
 * KPA-Society / K-Cosmetics / GlycoPharm 홈에 인라인으로 복제돼 있던 동일 섹션을
 * View 수준까지 공통화한다. 서비스 차이(accent · 탭 바로가기 경로 · 문구)는
 * 전부 props(config) 로 표현하며 `serviceType` 분기는 두지 않는다.
 *
 * 불변식:
 *  - 이 View 는 데이터를 가져오지 않는다(fetch/API client 의존 0). items/loading/loadError 는 주입.
 *  - react-router 를 직접 의존하지 않는다. 이동은 주입된 `navigate` 로 수행하고,
 *    마크업은 실제 `<a href>` 를 유지해 새 탭 열기/미들클릭/크롤러 접근성을 보존한다.
 *  - 4상태 계약: loading / loadError / empty / list 를 각각 구분해 렌더한다.
 *    조회 실패를 "등록된 글이 없습니다" 로 위장하지 않는다.
 */

import type { CSSProperties, MouseEvent, ReactNode } from 'react';

/* ─── 계약 ────────────────────────────────────────────────────────────── */

/** 홈 최신 활동 1건. 3서비스 backend `/home/latest` 가 동일 shape 을 반환한다. */
export interface LatestActivityItem {
  type: string;
  id: string;
  title: string;
  authorName?: string;
  createdAt: string;
  href: string;
}

export interface LatestActivityTab {
  key: string;
  label: string;
  /** 해당 공간 바로가기. null 이면 바로가기를 노출하지 않는다(전체 탭). */
  shortcutHref?: string | null;
  shortcutLabel?: string | null;
}

/** 탭 활성/hover/링크에 쓰는 accent class 묶음. tailwind JIT 를 위해 리터럴 class 를 유지한다. */
export interface LatestActivityAccent {
  /** 활성 탭 버튼 */
  tabActive: string;
  /** 목록 항목 hover 시 제목 색 (group-hover:*) */
  itemHoverText: string;
  /** 하단 탭 바로가기 링크 */
  shortcutLink: string;
}

export const LATEST_ACTIVITY_ACCENTS: Record<'blue' | 'pink' | 'emerald', LatestActivityAccent> = {
  blue: {
    tabActive: 'bg-blue-600 text-white',
    itemHoverText: 'group-hover:text-blue-600',
    shortcutLink: 'text-blue-600 hover:text-blue-700',
  },
  pink: {
    tabActive: 'bg-pink-600 text-white',
    itemHoverText: 'group-hover:text-pink-700',
    shortcutLink: 'text-pink-700 hover:text-pink-800',
  },
  emerald: {
    tabActive: 'bg-emerald-600 text-white',
    itemHoverText: 'group-hover:text-emerald-700',
    shortcutLink: 'text-emerald-700 hover:text-emerald-800',
  },
};

/** 활동 종류 배지. 서비스가 종류를 추가/재정의할 수 있도록 props 로 열어둔다. */
export const LATEST_ACTIVITY_BADGES: Record<string, { label: string; cls: string }> = {
  forum: { label: '포럼', cls: 'bg-blue-100 text-blue-700' },
  course: { label: '강의', cls: 'bg-purple-100 text-purple-700' },
  content: { label: '콘텐츠', cls: 'bg-emerald-100 text-emerald-700' },
  resource: { label: '자료실', cls: 'bg-amber-100 text-amber-700' },
  signage: { label: '사이니지', cls: 'bg-rose-100 text-rose-700' },
};

/** 홈 요약 성격의 기본 표시 개수. 서비스는 자체 값을 쓸 수 있다. */
export const LATEST_ACTIVITY_SUMMARY_LIMIT = 6;

/**
 * 공통 탭 구성. key/label/바로가기 문구는 3서비스가 동일하고, 일부 서비스는
 * 콘텐츠·사이니지 공간의 route 가 달라 override 로만 표현한다.
 */
export function buildLatestActivityTabs(
  overrides?: Partial<Record<'forum' | 'course' | 'content' | 'signage' | 'resource', string>>,
): LatestActivityTab[] {
  const href = (key: 'forum' | 'course' | 'content' | 'signage' | 'resource', fallback: string) =>
    overrides?.[key] ?? fallback;
  return [
    { key: 'all', label: '전체', shortcutHref: null, shortcutLabel: null },
    { key: 'forum', label: '포럼', shortcutHref: href('forum', '/forum'), shortcutLabel: '포럼 바로가기' },
    { key: 'course', label: '강의', shortcutHref: href('course', '/lms'), shortcutLabel: '강의 바로가기' },
    { key: 'content', label: '콘텐츠', shortcutHref: href('content', '/content'), shortcutLabel: '콘텐츠 바로가기' },
    { key: 'signage', label: '사이니지', shortcutHref: href('signage', '/signage'), shortcutLabel: '사이니지 바로가기' },
    { key: 'resource', label: '자료실', shortcutHref: href('resource', '/resources'), shortcutLabel: '자료실 바로가기' },
  ];
}

export interface LatestActivitySectionProps {
  /** 섹션 제목 (서비스별 정책 — 기본 '최신글') */
  title?: string;
  tabs: LatestActivityTab[];
  activeTab: string;
  onTabChange: (tab: string) => void;

  items: LatestActivityItem[];
  loading: boolean;
  /** 조회 실패 — empty(정상 0건) 와 구분한다. */
  loadError?: boolean;
  onRetry?: () => void;

  /** 이동 처리. 주입하지 않으면 앵커 기본 동작(전체 새로고침)으로 폴백한다. */
  navigate?: (path: string) => void;

  accent?: LatestActivityAccent;
  badges?: Record<string, { label: string; cls: string }>;

  emptyMessage?: string;
  errorTitle?: string;
  errorDescription?: string;
  retryLabel?: string;

  /** 제목 우측 등 서비스 고유 요소 */
  headerRightSlot?: ReactNode;
}

/* ─── 내부 primitive ──────────────────────────────────────────────────── */

/** 마크업은 `<a>`, 좌클릭만 가로채 주입된 navigate 로 SPA 이동한다. */
function SpaLink({
  href,
  navigate,
  className,
  children,
  style,
}: {
  href: string;
  navigate?: (path: string) => void;
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!navigate) return;
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(href);
  };
  return (
    <a href={href} onClick={onClick} className={className} style={style}>
      {children}
    </a>
  );
}

/** 인라인 SVG 스피너 — 아이콘 라이브러리 의존 없이 로딩 표현을 공통화한다. */
function Spinner() {
  return (
    <svg
      className="w-5 h-5 animate-spin text-slate-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

/* ─── View ────────────────────────────────────────────────────────────── */

export function LatestActivitySection({
  title = '최신글',
  tabs,
  activeTab,
  onTabChange,
  items,
  loading,
  loadError = false,
  onRetry,
  navigate,
  accent = LATEST_ACTIVITY_ACCENTS.blue,
  badges = LATEST_ACTIVITY_BADGES,
  emptyMessage = '등록된 글이 없습니다',
  errorTitle = '최신글을 불러오지 못했습니다',
  errorDescription = '잠시 후 다시 시도해 주세요.',
  retryLabel = '다시 시도',
  headerRightSlot,
}: LatestActivitySectionProps) {
  const currentTab = tabs.find((t) => t.key === activeTab);
  const hasTabShortcut = !loading && !loadError && items.length > 0 && !!currentTab?.shortcutHref;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-800 m-0">{title}</h2>
        {headerRightSlot}
      </div>

      {/* 탭 필터 */}
      <div className="flex gap-2 flex-wrap mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onTabChange(t.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === t.key ? accent.tabActive : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 목록 — 4상태(loading / error / empty / list) */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : loadError ? (
        <div className="text-center py-8">
          <p className="text-sm font-medium text-slate-800 m-0">{errorTitle}</p>
          {errorDescription && <p className="mt-1 text-sm text-slate-500 m-0">{errorDescription}</p>}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 px-3 py-1.5 rounded-md border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
            >
              {retryLabel}
            </button>
          )}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">{emptyMessage}</div>
      ) : (
        <div className="divide-y divide-slate-100 bg-white rounded-lg border border-slate-200 overflow-hidden">
          {items.map((item) => {
            const badge = badges[item.type];
            const date = new Date(item.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
            return (
              <SpaLink
                key={`${item.type}-${item.id}`}
                href={item.href}
                navigate={navigate}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors no-underline group"
              >
                <span
                  className={`shrink-0 inline-block px-2 py-0.5 text-xs font-semibold rounded ${
                    badge?.cls ?? 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {badge?.label ?? item.type}
                </span>
                <span
                  className={`flex-1 min-w-0 font-medium text-slate-800 truncate transition-colors ${accent.itemHoverText}`}
                >
                  {item.title}
                </span>
                {item.authorName && (
                  <span className="shrink-0 text-xs text-slate-400 hidden sm:block">{item.authorName}</span>
                )}
                <span className="shrink-0 text-xs text-slate-400">{date}</span>
              </SpaLink>
            );
          })}
        </div>
      )}

      {/* 탭별 바로가기 — 전체 탭은 요약 성격이므로 skip, 카테고리 탭만 해당 공간 바로가기 표시 */}
      {hasTabShortcut && (
        <div className="mt-3 flex justify-end">
          <SpaLink
            href={currentTab!.shortcutHref!}
            navigate={navigate}
            className={`text-sm font-semibold no-underline whitespace-nowrap ${accent.shortcutLink}`}
          >
            {currentTab!.shortcutLabel} →
          </SpaLink>
        </div>
      )}
    </div>
  );
}
