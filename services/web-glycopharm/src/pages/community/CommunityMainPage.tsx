/**
 * CommunityMainPage — GlycoPharm Community Main Page
 *
 * WO-O4O-GLYCOPHARM-MENU-HOME-KPA-CANONICAL-PORT-V1
 * WO-O4O-GLYCOPHARM-HOME-DESIGN-APPLY-V1: 데이터/관리 느낌 테마 적용
 * WO-O4O-STANDARD-HOME-TEMPLATE-V1: StandardHomeTemplate 적용
 *
 * 섹션 구조:
 * ├─ StatusHeroBlock              — 상태 요약형 헤더 (Glyco 전용, heroSlot)
 * ├─ 공지 / 약업신문 뉴스         — 2-column (좌: 공지, 우: placeholder)
 * ├─ AppEntrySection              — 서비스 바로가기 카드 5개 (shared)
 * ├─ CtaGuidanceSection           — CTA (shared)
 * └─ O4OHelpSection               — 이용 가이드 (shared)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/services/api';
import {
  StandardHomeTemplate,
  templates,
  ForumIcon,
  EducationIcon,
  ContentIcon,
  SignageIcon,
  ResourcesIcon,
} from '@o4o/shared-space-ui';
import type { NoticeItem } from '@o4o/shared-space-ui';
import { PageContainer, Card, useTemplate } from '@o4o/ui';
// WO-O4O-GLYCOPHARM-KCOS-HOME-LATEST-UI-ALIGNMENT-V1
import { homeApi } from '@/api/home';
import type { LatestItem } from '@/api/home';

// ─── 서비스 전용 아이콘 ─────────────────────────────────────
// ForumIcon, EducationIcon, ContentIcon, SignageIcon, ResourcesIcon → @o4o/shared-space-ui

const NewspaperIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
    <path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6z" />
  </svg>
);

const ActivityIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const StoreIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const CareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

// ─── Types ──────────────────────────────────────────────────

interface ForumPostRaw {
  id: string;
  title: string;
  category?: { name?: string } | null;
  createdAt: string;
}

// ─── 최신 활동 섹션 (WO-O4O-GLYCOPHARM-KCOS-HOME-LATEST-UI-ALIGNMENT-V1) ──
// KPA CommunityHomePage LatestActivitySection 패턴 mirror. emerald 테마.

const LATEST_SUMMARY_LIMIT = 6;

const LATEST_TABS = [
  { key: 'all',      label: '전체',     shortcutHref: null,                       shortcutLabel: null },
  { key: 'forum',    label: '포럼',     shortcutHref: '/forum',                   shortcutLabel: '포럼 바로가기' },
  { key: 'course',   label: '강의',     shortcutHref: '/lms',                     shortcutLabel: '강의 바로가기' },
  { key: 'content',  label: '콘텐츠',   shortcutHref: '/content',                 shortcutLabel: '콘텐츠 바로가기' },
  { key: 'signage',  label: '사이니지', shortcutHref: '/store/signage/library',   shortcutLabel: '사이니지 바로가기' },
  { key: 'resource', label: '자료실',   shortcutHref: '/resources',               shortcutLabel: '자료실 바로가기' },
] as const;

const LATEST_BADGE: Record<string, { label: string; cls: string }> = {
  forum:    { label: '포럼',     cls: 'bg-blue-100 text-blue-700' },
  course:   { label: '강의',     cls: 'bg-purple-100 text-purple-700' },
  content:  { label: '콘텐츠',   cls: 'bg-emerald-100 text-emerald-700' },
  resource: { label: '자료실',   cls: 'bg-amber-100 text-amber-700' },
  signage:  { label: '사이니지', cls: 'bg-rose-100 text-rose-700' },
};

interface LatestSectionProps {
  items: LatestItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  loading: boolean;
}

function LatestActivitySection({ items, activeTab, onTabChange, loading }: LatestSectionProps) {
  const currentTab = LATEST_TABS.find((t) => t.key === activeTab);
  const hasTabShortcut = !loading && items.length > 0 && currentTab?.shortcutHref;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-800 m-0">최신글</h2>
      </div>

      {/* 탭 필터 */}
      <div className="flex gap-2 flex-wrap mb-4">
        {LATEST_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === t.key
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">등록된 글이 없습니다</div>
      ) : (
        <div className="divide-y divide-slate-100 bg-white rounded-lg border border-slate-200 overflow-hidden">
          {items.map((item) => {
            const badge = LATEST_BADGE[item.type];
            const date = new Date(item.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
            return (
              <Link
                key={`${item.type}-${item.id}`}
                to={item.href}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors no-underline group"
              >
                <span className={`shrink-0 inline-block px-2 py-0.5 text-xs font-semibold rounded ${badge?.cls ?? 'bg-slate-100 text-slate-600'}`}>
                  {badge?.label ?? item.type}
                </span>
                <span className="flex-1 min-w-0 font-medium text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                  {item.title}
                </span>
                {item.authorName && (
                  <span className="shrink-0 text-xs text-slate-400 hidden sm:block">{item.authorName}</span>
                )}
                <span className="shrink-0 text-xs text-slate-400">{date}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* 탭별 바로가기 — 전체 탭은 요약 성격이므로 skip */}
      {hasTabShortcut && (
        <div className="mt-3 flex justify-end">
          <Link
            to={currentTab.shortcutHref!}
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 no-underline whitespace-nowrap"
          >
            {currentTab.shortcutLabel} →
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────

export default function CommunityMainPage() {
  const t = templates.glycopharm;
  const tpl = useTemplate();
  const [noticeItems, setNoticeItems] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  // WO-O4O-GLYCOPHARM-KCOS-HOME-LATEST-UI-ALIGNMENT-V1
  const [latestItems, setLatestItems] = useState<LatestItem[]>([]);
  const [latestTab, setLatestTab] = useState('all');
  const [latestLoading, setLatestLoading] = useState(true);

  const loadNotices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<ForumPostRaw[]>('/api/v1/glycopharm/forum/posts?limit=30');
      if (Array.isArray(res.data)) {
        const items: NoticeItem[] = res.data
          .filter((p) => p.category?.name === '공지')
          .slice(0, 5)
          .map((p) => ({ id: p.id, title: p.title, date: p.createdAt, href: `/forum/posts/${p.id}`, isPinned: true }));
        setNoticeItems(items);
      }
    } catch {
      setNoticeItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  // WO-O4O-GLYCOPHARM-KCOS-HOME-LATEST-UI-ALIGNMENT-V1
  useEffect(() => {
    setLatestLoading(true);
    homeApi.getLatest({ type: latestTab, limit: LATEST_SUMMARY_LIMIT })
      .then((res) => setLatestItems(res.data ?? []))
      .catch(() => setLatestItems([]))
      .finally(() => setLatestLoading(false));
  }, [latestTab]);

  const iconCls = `flex items-center justify-center shrink-0 ${tpl?.icon?.wrapper ?? ''} ${tpl?.icon?.icon ?? 'text-primary'}`;

  return (
    <StandardHomeTemplate
      heroSlot={
        <div style={heroStyles.wrapper} className={`${t.hero.bg} ${t.hero.border} ${t.hero.padding} mb-8 md:mb-16`}>
          <PageContainer>
            <div style={heroStyles.inner}>
              <div style={heroStyles.titleGroup}>
                <span style={heroStyles.badge}>혈당 관리 플랫폼</span>
                <h1 style={heroStyles.title}>GlycoPharm 관리 현황</h1>
                <p style={heroStyles.subtitle}>약국 운영 · 혈당 케어 · 디지털 사이니지를 한 곳에서</p>
              </div>
              <div className="flex flex-col md:flex-row gap-3 flex-shrink-0">
                <div style={heroStyles.statusCard}>
                  <span style={heroStyles.statusIcon}><StoreIcon /></span>
                  <div>
                    <p style={heroStyles.statusLabel}>매장 운영</p>
                    <p style={heroStyles.statusValue}>매장 관리</p>
                  </div>
                </div>
                <div style={heroStyles.statusCard}>
                  <span style={heroStyles.statusIcon}><CareIcon /></span>
                  <div>
                    <p style={heroStyles.statusLabel}>Care 서비스</p>
                    <p style={heroStyles.statusValue}>혈당 케어</p>
                  </div>
                </div>
                <div style={heroStyles.statusCard}>
                  <span style={heroStyles.statusIcon}><ActivityIcon /></span>
                  <div>
                    <p style={heroStyles.statusLabel}>최근 활동</p>
                    <p style={heroStyles.statusValue}>포럼 · 강의</p>
                  </div>
                </div>
              </div>
            </div>
          </PageContainer>
        </div>
      }
      notices={noticeItems}
      noticesLoading={loading}
      noticesViewAllHref="/forum"
      noticesAccentBg="var(--color-primary-light, #f0fdf4)"
      noticesRightSlot={
        <>
          <div style={placeholderStyles.header}>
            <h2 style={placeholderStyles.title}>약업신문 뉴스</h2>
          </div>
          <Card style={placeholderStyles.card}>
            <NewspaperIcon />
            <p style={placeholderStyles.text}>이 영역은 약업신문 뉴스가 표시될 예정입니다.</p>
            <a
              href="https://www.yakup.com"
              target="_blank"
              rel="noopener noreferrer"
              style={placeholderStyles.link}
            >
              약업신문 바로가기 →
            </a>
          </Card>
        </>
      }
      latestSlot={
        <LatestActivitySection
          items={latestItems}
          activeTab={latestTab}
          onTabChange={setLatestTab}
          loading={latestLoading}
        />
      }
      appEntryCards={[
        { title: '포럼', description: '동료 약사와 질문·토론으로 전문성을 높이세요', href: '/forum', icon: <span className={iconCls}><ForumIcon /></span> },
        { title: '강의', description: '보수교육·세미나를 온라인으로 수강하세요', href: '/lms', icon: <span className={iconCls}><EducationIcon /></span> },
        { title: '콘텐츠', description: '플랫폼 콘텐츠를 검색하고 활용하세요', href: '/content', icon: <span className={iconCls}><ContentIcon /></span> },
        { title: '디지털 사이니지', description: '약국 디지털 미디어를 관리하세요', href: '/store/signage/library', icon: <span className={iconCls}><SignageIcon size={24} /></span> },
        { title: '자료실', description: '자료를 저장하고 AI 작업에 활용하세요', href: '/resources', icon: <span className={iconCls}><ResourcesIcon /></span> },
      ]}
      cta={{
        title: '매장 운영에 도움이 필요하세요?',
        description: '디지털 사이니지로 약국을 꾸며보세요',
        href: '/store/signage/library',
        linkLabel: '사이니지 보기 →',
        icon: <span className={`flex items-center justify-center shrink-0 ${tpl?.icon?.icon ?? 'text-primary'}`}><SignageIcon size={24} /></span>,
        accentColor: 'var(--color-primary)',
        accentBg: 'var(--color-primary-light, #f0fdf4)',
      }}
      help={{
        currentServiceKey: 'glycopharm',
        usageTitle: 'GlycoPharm 이용 가이드',
        usageItems: [
          { title: 'O4O 개요', description: 'O4O 서비스 구조와 GlycoPharm의 역할', href: '/guide/intro' },
          { title: '서비스 활용 방법', description: '상품, 콘텐츠, 고객 응대 기반 약국 운영 방식', href: '/guide/usage' },
          { title: '기능별 이용 방법', description: '커뮤니티, 콘텐츠, 자료실, 약국 운영 기능 구성', href: '/guide/features' },
        ],
      }}
    />
  );
}

// ─── Hero Styles (상태 요약형 — 옅은 green tint) ────────────

const heroStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    /* bg/border/padding → template className (t.hero.bg/border/padding) */
  },
  inner: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 24,
    flexWrap: 'wrap',
  },
  titleGroup: { flex: '1 1 220px' },
  badge: {
    display: 'inline-block',
    backgroundColor: 'var(--color-primary, #16A34A)',
    color: 'white',
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 20,
    marginBottom: 10,
    letterSpacing: '0.03em',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--color-text-primary, #0f172a)',
    margin: '0 0 6px',
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--color-text-secondary, #475569)',
    margin: 0,
    lineHeight: 1.6,
  },
  statusCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'white',
    border: '1px solid var(--color-border-default, #e2e8f0)',
    borderLeft: '3px solid var(--color-primary, #16A34A)',
    borderRadius: 10,
    padding: '12px 16px',
    minWidth: 120,
  },
  statusIcon: {
    color: 'var(--color-primary, #16A34A)',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  statusLabel: {
    fontSize: 11,
    color: 'var(--color-text-tertiary, #64748b)',
    margin: '0 0 2px',
    fontWeight: 500,
  },
  statusValue: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--color-primary, #16A34A)',
    margin: 0,
  },
};

// ─── Notices Right Placeholder Styles ───────────────────────

const placeholderStyles: Record<string, React.CSSProperties> = {
  header: { marginBottom: 12 },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--color-text-primary, #1e293b)',
    margin: 0,
  },
  card: {
    backgroundColor: 'var(--color-bg-primary, #ffffff)',
    border: '1px solid var(--color-border-default, #e2e8f0)',
    padding: '36px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  text: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: 'var(--color-text-secondary, #475569)',
    margin: '12px 0',
    textAlign: 'center',
  },
  link: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-primary, #16A34A)',
    textDecoration: 'none',
  },
};
