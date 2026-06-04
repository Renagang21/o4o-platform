/**
 * CommunityPage — Neture Home 허브
 *
 * WO-O4O-NETURE-COMMUNITY-PAGE-V1
 * WO-O4O-NETURE-COMMUNITY-HOME-V1: 데이터 기반 허브로 재구성
 * WO-O4O-NETURE-HOME-KPA-UI-STRUCTURE-ALIGNMENT-V1: KPA StandardHomeTemplate 구조 이식
 *
 * 섹션 구조:
 * ├─ Hero             — Neture O4O 플랫폼 정체성 + 3 CTA
 * ├─ 공지사항 / 포럼 최신글 — 2-column (좌: CMS 공지, 우: 포럼 최신글)
 * ├─ valueGuideSlot   — 내 역할로 시작하기 (공급자 / 파트너 협력 / Market Trial)
 * ├─ AppEntrySection  — 서비스 바로가기 (Market Trial / 포럼 / 콘텐츠 / 자료실)
 * ├─ CtaGuidanceSection — Market Trial CTA
 * └─ O4OHelpSection   — 이용 안내 / 매뉴얼
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Layers, Users, TrendingUp, FlaskConical } from 'lucide-react';
import { useTemplate } from '@o4o/ui';
import {
  StandardHomeTemplate,
  AppEntrySection,
  ForumIcon,
  ContentIcon,
  ResourcesIcon,
} from '@o4o/shared-space-ui';
import type { NoticeItem } from '@o4o/shared-space-ui';
import { cmsApi, type CmsContent } from '../lib/api/content';
import {
  fetchForumPosts,
  getAuthorName,
  type ForumPost,
} from '../services/forumApi';

// ─── 포럼 최신글 슬롯 (공지 우측 컬럼) ───────────────────────────────────────

interface ForumLatestSlotProps {
  posts: ForumPost[];
  loading: boolean;
}

function ForumLatestSlot({ posts, loading }: ForumLatestSlotProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-slate-800 m-0">포럼 최신글</h2>
        <Link
          to="/forum"
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 no-underline"
        >
          포럼 바로가기 →
        </Link>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden min-h-[200px]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">등록된 글이 없습니다</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/forum/post/${post.slug}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors no-underline group"
              >
                <span className="shrink-0 inline-block px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-700">
                  포럼
                </span>
                <span className="flex-1 min-w-0 text-sm font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                  {post.title}
                </span>
                <span className="shrink-0 text-xs text-slate-400 hidden sm:block">
                  {getAuthorName(post)}
                </span>
              </Link>
            ))}
          </div>
        )}
        <div className="px-4 py-2 border-t border-slate-100 text-right">
          <Link
            to="/forum"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 no-underline"
          >
            전체 포럼 보기 →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CommunityPage() {
  const tpl = useTemplate();
  const [notices, setNotices] = useState<CmsContent[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [forumLoading, setForumLoading] = useState(true);

  useEffect(() => {
    cmsApi
      .getContents({ type: 'notice', sort: 'latest', limit: 5 })
      .then((res) => setNotices(res.data))
      .catch(() => {})
      .finally(() => setNoticesLoading(false));

    fetchForumPosts({ limit: 6, sortBy: 'latest' })
      .then((res) => {
        if (res.data) setForumPosts(res.data);
      })
      .catch(() => {})
      .finally(() => setForumLoading(false));
  }, []);

  const noticeItems: NoticeItem[] = notices.map((n) => ({
    id: n.id,
    title: n.title,
    date: n.publishedAt || n.createdAt,
    isPinned: n.isPinned,
    href: `/notices/${n.id}`,
  }));

  const iconCls = `flex items-center justify-center shrink-0 ${tpl?.icon?.wrapper ?? ''} ${tpl?.icon?.icon ?? 'text-primary'}`;

  return (
    <StandardHomeTemplate
      heroSlot={<NetureHero />}

      notices={noticeItems}
      noticesLoading={noticesLoading}
      noticesTitle="공지사항"
      noticesAccentColor="var(--color-primary)"
      noticesViewAllHref="/notices"
      noticesRightSlot={
        <ForumLatestSlot posts={forumPosts} loading={forumLoading} />
      }

      valueGuideSlot={
        /* WO-O4O-NETURE-HOME-KPA-UI-STRUCTURE-ALIGNMENT-V1:
         * "내 역할로 시작하기" — 공급자·파트너·Market Trial 3 역할 카드.
         * 파트너 영역은 완성 기능이 아닌 협력 방향 안내 수준으로 표현. */
        <AppEntrySection
          title="내 역할로 시작하기"
          accentColor="var(--color-primary)"
          cards={[
            {
              title: '공급자로 참여하기',
              description:
                '제품·서비스를 O4O 플랫폼에 공급하고 Market Trial을 통해 유통 가능성을 검증합니다',
              href: '/supplier',
              icon: <span className={iconCls}><Layers size={24} /></span>,
            },
            {
              title: 'Market Trial 보기',
              description:
                '진행 중인 유통 참여형 펀딩을 확인하고 공급자·운영자·매장이 함께 참여합니다',
              href: '/market-trial',
              icon: <span className={iconCls}><TrendingUp size={24} /></span>,
            },
            {
              title: '파트너 협력 안내',
              description:
                '플랫폼 이용 규모가 형성된 이후 마케팅·유통·프로모션 협력을 단계적으로 활성화합니다',
              href: '/partner',
              icon: <span className={iconCls}><Users size={24} /></span>,
            },
          ]}
        />
      }

      appEntryCards={[
        {
          title: 'Market Trial',
          description: '진행 중인 유통 참여형 펀딩에 참여하세요',
          href: '/market-trial',
          icon: <span className={iconCls}><TrendingUp size={24} /></span>,
        },
        {
          title: '포럼',
          description: 'O4O 개념과 Neture 구조에 대한 질문·의견을 나눕니다',
          href: '/forum',
          icon: <span className={iconCls}><ForumIcon /></span>,
        },
        {
          title: '콘텐츠',
          description: '플랫폼 콘텐츠를 검색하고 활용하세요',
          href: '/content',
          icon: <span className={iconCls}><ContentIcon /></span>,
        },
        {
          title: '자료실',
          description: '자료를 저장하고 AI 작업에 활용하세요',
          href: '/resources',
          icon: <span className={iconCls}><ResourcesIcon /></span>,
        },
      ]}

      cta={{
        title: '유통 참여형 펀딩 (Market Trial)',
        description:
          'Neture가 운영하는 참여형 프로그램입니다. 공급자·운영자·매장이 함께 신제품 유통 가능성을 검증합니다',
        href: '/market-trial',
        linkLabel: 'Market Trial 보기 →',
        // WO-O4O-NETURE-HOME-ROLE-MARKET-TRIAL-ICON-ALIGNMENT-V1: emoji → lucide FlaskConical (Market Trial 표준)
        icon: <FlaskConical size={28} className="text-primary" />,
        accentColor: 'var(--color-primary)',
        accentBg: 'var(--color-primary-light, #eff6ff)',
        external: false,
      }}

      help={{
        currentServiceKey: 'neture',
        usageTitle: 'Neture 이용 안내',
        usageItems: [
          {
            title: 'Neture 소개',
            description: 'O4O 플랫폼 구조와 Neture의 역할을 알아보세요',
            href: '/guide/intro',
          },
          {
            title: '서비스 활용 방법',
            description: '공급자, Market Trial, 파트너 협력 방식을 안내합니다',
            href: '/guide/usage',
          },
          {
            title: '기능별 이용 방법',
            description: '포럼, 콘텐츠, 자료실, 공급자 기능 구성을 확인하세요',
            href: '/guide/features',
          },
        ],
      }}
    />
  );
}

// ─── Neture Hero ─────────────────────────────────────────────────────────────

function NetureHero() {
  return (
    <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white mb-16">
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-sm font-semibold text-white/70 tracking-widest uppercase mb-3">
          O4O 공급자 · 운영자 · 파트너 플랫폼
        </p>
        <h1 className="text-4xl font-bold mb-4">Neture</h1>
        <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto leading-relaxed">
          공급자가 제품을 공급하고, 운영자가 구성·실행하고,
          <br className="hidden sm:block" />
          매장이 고객에게 연결하는 O4O 협력 플랫폼입니다
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            to="/supplier"
            className="px-5 py-2.5 bg-white text-primary-700 font-semibold rounded-lg hover:bg-white/90 transition-colors no-underline text-sm"
          >
            공급자로 참여하기
          </Link>
          <Link
            to="/market-trial"
            className="px-5 py-2.5 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-400 border border-white/30 transition-colors no-underline text-sm"
          >
            Market Trial 보기
          </Link>
          <Link
            to="/guide"
            className="px-5 py-2.5 bg-transparent text-white font-semibold rounded-lg hover:bg-white/10 border border-white/40 transition-colors no-underline text-sm"
          >
            이용 안내 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
