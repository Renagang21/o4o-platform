/**
 * CommunityMainPage — GlycoPharm Community Main Page
 *
 * WO-O4O-GLYCOPHARM-MENU-HOME-KPA-CANONICAL-PORT-V1
 * WO-O4O-GLYCOPHARM-HOME-DESIGN-APPLY-V1: 데이터/관리 느낌 테마 적용
 *
 * 섹션 구조:
 * ├─ StatusHeroBlock              — 상태 요약형 헤더 (인라인)
 * ├─ 공지 / 약업신문 뉴스         — 2-column (좌: 공지, 우: placeholder)
 * ├─ AppEntrySection              — 서비스 바로가기 카드 5개 (shared)
 * ├─ CtaGuidanceSection           — CTA (shared)
 * └─ O4OHelpSection               — 이용 가이드 (shared)
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/api';
import {
  NewsNoticesSection,
  AppEntrySection,
  CtaGuidanceSection,
  O4OHelpSection,
  templates,
} from '@o4o/shared-space-ui';
import type { NoticeItem } from '@o4o/shared-space-ui';
import { PageSection, PageContainer, Card, useTemplate } from '@o4o/ui';

// ─── Inline SVG Icons ──────────────────────────────────────

const ForumIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const EducationIconSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const ContentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const SignageIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const ResourceLibraryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

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

// ─── Main Component ─────────────────────────────────────────

export default function CommunityMainPage() {
  const t = templates.glycopharm;
  const tpl = useTemplate();
  const [noticeItems, setNoticeItems] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = 'glyco-home-two-col-responsive';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @media (max-width: 768px) {
        .glyco-home-two-col { flex-direction: column !important; }
        .glyco-status-grid { flex-direction: column !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

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

  return (
    <div style={styles.page}>
      {/* 0. 상태 요약형 Hero (데이터/관리 느낌) */}
      <div style={heroStyles.wrapper} className={`${t.hero.bg} ${t.hero.border} ${t.hero.padding}`}>
        <PageContainer>
          <div style={heroStyles.inner}>
            <div style={heroStyles.titleGroup}>
              <span style={heroStyles.badge}>혈당 관리 플랫폼</span>
              <h1 style={heroStyles.title}>GlycoPharm 관리 현황</h1>
              <p style={heroStyles.subtitle}>약국 운영 · 혈당 케어 · 디지털 사이니지를 한 곳에서</p>
            </div>
            <div style={heroStyles.statusGrid} className="glyco-status-grid">
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

      {/* 1. 공지 / 약업신문 뉴스 (2-column) */}
      <PageSection>
        <PageContainer>
          <div style={twoColStyles.row} className="glyco-home-two-col">
            {/* Left: 공지사항 */}
            <div style={twoColStyles.col}>
              <NewsNoticesSection
                title="공지"
                items={noticeItems}
                loading={loading}
                viewAllHref="/forum"
                accentColor="var(--color-primary)"
                accentBg="var(--color-primary-light, #f0fdf4)"
              />
            </div>
            {/* Right: 약업신문 뉴스 Placeholder */}
            <div style={twoColStyles.col}>
              <div style={twoColStyles.placeholderHeader}>
                <h2 style={twoColStyles.placeholderTitle}>약업신문 뉴스</h2>
              </div>
              <Card style={twoColStyles.placeholderCard}>
                <NewspaperIcon />
                <p style={twoColStyles.placeholderText}>
                  이 영역은 약업신문 뉴스가 표시될 예정입니다.
                </p>
                <a
                  href="https://www.yakup.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={twoColStyles.placeholderLink}
                >
                  약업신문 바로가기 →
                </a>
              </Card>
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* 2. 서비스 바로가기 (shared) */}
      <PageSection>
        <PageContainer>
          <AppEntrySection
            accentColor="var(--color-primary)"
            cards={[
              { title: '포럼', description: '동료 약사와 질문·토론으로 전문성을 높이세요', href: '/forum', icon: <span className={`flex items-center justify-center shrink-0 ${tpl?.icon?.wrapper ?? ''} ${tpl?.icon?.icon ?? 'text-primary'}`}><ForumIcon /></span> },
              { title: '강의', description: '보수교육·세미나를 온라인으로 수강하세요', href: '/lms', icon: <span className={`flex items-center justify-center shrink-0 ${tpl?.icon?.wrapper ?? ''} ${tpl?.icon?.icon ?? 'text-primary'}`}><EducationIconSvg /></span> },
              { title: '콘텐츠', description: '플랫폼 콘텐츠를 검색하고 활용하세요', href: '/content', icon: <span className={`flex items-center justify-center shrink-0 ${tpl?.icon?.wrapper ?? ''} ${tpl?.icon?.icon ?? 'text-primary'}`}><ContentIcon /></span> },
              { title: '디지털 사이니지', description: '약국 디지털 미디어를 관리하세요', href: '/store/signage/library', icon: <span className={`flex items-center justify-center shrink-0 ${tpl?.icon?.wrapper ?? ''} ${tpl?.icon?.icon ?? 'text-primary'}`}><SignageIcon /></span> },
              { title: '자료실', description: '자료를 저장하고 AI 작업에 활용하세요', href: '/resources', icon: <span className={`flex items-center justify-center shrink-0 ${tpl?.icon?.wrapper ?? ''} ${tpl?.icon?.icon ?? 'text-primary'}`}><ResourceLibraryIcon /></span> },
            ]}
          />
        </PageContainer>
      </PageSection>

      {/* 3. CTA (shared) */}
      <PageSection>
        <PageContainer>
          <CtaGuidanceSection
            title="매장 운영에 도움이 필요하세요?"
            description="디지털 사이니지로 약국을 꾸며보세요"
            href="/store/signage/library"
            linkLabel="사이니지 보기 →"
            icon={<span className={`flex items-center justify-center shrink-0 ${tpl?.icon?.icon ?? 'text-primary'}`}><SignageIcon /></span>}
            accentColor="var(--color-primary)"
            accentBg="var(--color-primary-light, #f0fdf4)"
          />
        </PageContainer>
      </PageSection>

      {/* 4. O4O 도움 + 다른 서비스 (shared) */}
      <PageSection last>
        <PageContainer>
          <O4OHelpSection
            currentServiceKey="glycopharm"
            usageTitle="GlycoPharm 이용 가이드"
            usageItems={[
              {
                title: 'O4O 개요',
                description: 'O4O 서비스 구조와 GlycoPharm의 역할',
                href: '/guide/intro',
              },
              {
                title: '서비스 활용 방법',
                description: '상품, 콘텐츠, 고객 응대 기반 약국 운영 방식',
                href: '/guide/usage',
              },
              {
                title: '기능별 이용 방법',
                description: '커뮤니티, 콘텐츠, 자료실, 약국 운영 기능 구성',
                href: '/guide/features',
              },
            ]}
          />
        </PageContainer>
      </PageSection>
    </div>
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
  titleGroup: {
    flex: '1 1 220px',
  },
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
  statusGrid: {
    display: 'flex',
    gap: 12,
    flex: '0 0 auto',
    alignItems: 'stretch',
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

// ─── Two-column Styles ───────────────────────────────────────

const twoColStyles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    gap: 16,
  },
  col: {
    flex: 1,
    minWidth: 0,
  },
  placeholderHeader: {
    marginBottom: 12,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--color-text-primary, #1e293b)',
    margin: 0,
  },
  placeholderCard: {
    backgroundColor: 'var(--color-bg-primary, #ffffff)',
    /* borderRadius/shadow → Card 컴포넌트 template 자동 적용 */
    border: '1px solid var(--color-border-default, #e2e8f0)',
    padding: '36px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  placeholderText: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: 'var(--color-text-secondary, #475569)',
    margin: '12px 0',
    textAlign: 'center',
  },
  placeholderLink: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-primary, #16A34A)',
    textDecoration: 'none',
  },
};

// ─── Page Styles ─────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: 'var(--color-bg-secondary, #f8fafc)',
  },
};
